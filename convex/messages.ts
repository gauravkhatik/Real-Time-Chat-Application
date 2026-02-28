import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

type Ctx = MutationCtx | QueryCtx;

async function getClerkIdOrThrow(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) throw new Error("Unauthorized");
  return identity.subject as string;
}

async function getUserDocIdOrThrow(ctx: Ctx) {
  const clerkId = await getClerkIdOrThrow(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .first();
  if (!user) throw new Error("User profile not found");
  return { clerkId, userDocId: user._id };
}

async function assertConversationMember(
  ctx: Ctx,
  conversationId: Id<"conversations">
) {
  const { userDocId } = await getUserDocIdOrThrow(ctx);
  const conv = await ctx.db.get(conversationId);
  if (!conv) throw new Error("Conversation not found");
  if (!conv.participantIds?.includes(userDocId)) throw new Error("Forbidden");
  return conv;
}

// Send message
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    await assertConversationMember(ctx, args.conversationId);
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: clerkId,
      content: args.content,
      isDeleted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update conversation's updatedAt
    await ctx.db.patch(args.conversationId, { updatedAt: Date.now() });

    return await ctx.db.get(messageId);
  },
});

// Delete message (soft delete)
export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error("Message not found");
    await assertConversationMember(ctx, msg.conversationId);
    if (msg.senderId !== clerkId) throw new Error("Forbidden");
    await ctx.db.patch(args.messageId, {
      isDeleted: true,
      updatedAt: Date.now(),
    });

    return await ctx.db.get(args.messageId);
  },
});

// Get messages for conversation
export const getMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await assertConversationMember(ctx, args.conversationId);
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId_createdAt", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

// Get messages with reactions
export const getMessagesWithReactions = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await assertConversationMember(ctx, args.conversationId);
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_createdAt", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    return await Promise.all(
      messages.map(async (msg) => {
        const reactions = await ctx.db
          .query("reactions")
          .withIndex("by_messageId", (q) => q.eq("messageId", msg._id))
          .collect();

        // Group reactions by emoji
        const reactionMap = new Map<
          string,
          { emoji: string; count: number; userIds: string[] }
        >();
        reactions.forEach((reaction) => {
          const existing = reactionMap.get(reaction.emoji) || {
            emoji: reaction.emoji,
            count: 0,
            userIds: [],
          };
          existing.count++;
          existing.userIds.push(reaction.userId);
          reactionMap.set(reaction.emoji, existing);
        });

        return {
          ...msg,
          reactions: Array.from(reactionMap.values()),
        };
      })
    );
  },
});

// Subscribe to messages
export const subscribeToMessages = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await assertConversationMember(ctx, args.conversationId);
    return await ctx.db
      .query("messages")
      .withIndex("by_conversationId_createdAt", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
  },
});

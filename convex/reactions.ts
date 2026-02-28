import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢"];

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

async function assertCanAccessMessage(ctx: Ctx, messageId: Id<"messages">) {
  const { userDocId } = await getUserDocIdOrThrow(ctx);
  const msg = await ctx.db.get(messageId);
  if (!msg) throw new Error("Message not found");
  const conv = await ctx.db.get(msg.conversationId);
  if (!conv) throw new Error("Conversation not found");
  if (!conv.participantIds?.includes(userDocId)) throw new Error("Forbidden");
  return msg;
}

// Add or remove reaction
export const toggleReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    if (!ALLOWED_EMOJIS.includes(args.emoji)) {
      throw new Error("Invalid emoji");
    }
    await assertCanAccessMessage(ctx, args.messageId);

    const existing = await ctx.db
      .query("reactions")
      .withIndex("by_messageId_userId", (q) =>
        q.eq("messageId", args.messageId).eq("userId", clerkId)
      )
      .filter((q) => q.eq(q.field("emoji"), args.emoji))
      .first();

    if (existing) {
      // Remove reaction
      await ctx.db.delete(existing._id);
    } else {
      // Add reaction
      await ctx.db.insert("reactions", {
        messageId: args.messageId,
        userId: clerkId,
        emoji: args.emoji,
        createdAt: Date.now(),
      });
    }
  },
});

// Get reactions for message
export const getReactionsForMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, args) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("by_messageId", (q) => q.eq("messageId", args.messageId))
      .collect();

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

    return Array.from(reactionMap.values());
  },
});

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

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    lastReadMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    await assertConversationMember(ctx, args.conversationId);
    const existing = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", clerkId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastReadMessageId: args.lastReadMessageId,
        lastReadAt: Date.now(),
      });
    } else {
      await ctx.db.insert("readReceipts", {
        conversationId: args.conversationId,
        userId: clerkId,
        lastReadMessageId: args.lastReadMessageId,
        lastReadAt: Date.now(),
      });
    }
  },
});

// Get unread count for conversation
export const getUnreadCount = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    await assertConversationMember(ctx, args.conversationId);
    const readReceipt = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", clerkId)
      )
      .first();

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_createdAt", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    if (!readReceipt) {
      return allMessages.filter((m) => m.senderId !== clerkId).length;
    }

    const readIndex = allMessages.findIndex(
      (msg) => msg._id === readReceipt.lastReadMessageId
    );
    const unread = (readIndex >= 0 ? allMessages.slice(readIndex + 1) : allMessages).filter(
      (m) => m.senderId !== clerkId
    );
    return unread.length;
  },
});

// Get unread messages for conversation
export const getUnreadMessages = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    await assertConversationMember(ctx, args.conversationId);
    const readReceipt = await ctx.db
      .query("readReceipts")
      .withIndex("by_conversationId_userId", (q) =>
        q.eq("conversationId", args.conversationId).eq("userId", clerkId)
      )
      .first();

    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId_createdAt", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    if (!readReceipt) {
      return allMessages;
    }

    const readIndex = allMessages.findIndex(
      (msg) => msg._id === readReceipt.lastReadMessageId
    );
    return readIndex >= 0 ? allMessages.slice(readIndex + 1) : allMessages;
  },
});

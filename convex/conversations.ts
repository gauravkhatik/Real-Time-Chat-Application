import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = MutationCtx | QueryCtx;

async function getClerkIdOrThrow(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) throw new Error("Unauthorized");
  return identity.subject as string;
}

async function getCurrentUserOrThrow(ctx: Ctx) {
  const clerkId = await getClerkIdOrThrow(ctx);
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
    .first();
  if (!user) throw new Error("User profile not found");
  return { clerkId, userDoc: user };
}

function sortIds(ids: Array<Id<"users">>) {
  return [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Create or get one-on-one conversation (DM)
 */
export const createOrGetConversation = mutation({
  args: {
    otherUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userDoc } = await getCurrentUserOrThrow(ctx);
    const sortedIds = sortIds([userDoc._id, args.otherUserId]);

    // Find existing conversation
    const existing = await ctx.db
      .query("conversations")
      .filter((q) =>
        q.and(
          q.eq(q.field("isGroup"), false),
          q.eq(q.field("participantIds"), sortedIds)
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new conversation
    const newConvId = await ctx.db.insert("conversations", {
      participantIds: sortedIds,
      isGroup: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return newConvId;
  },
});

/**
 * Create group conversation
 */
export const createGroupConversation = mutation({
  args: {
    participantIds: v.array(v.id("users")),
    groupName: v.string(),
  },
  handler: async (ctx, args) => {
    const { userDoc } = await getCurrentUserOrThrow(ctx);
    const ids = sortIds(
      Array.from(new Set([userDoc._id, ...args.participantIds]))
    );
    const convId = await ctx.db.insert("conversations", {
      participantIds: ids,
      isGroup: true,
      groupName: args.groupName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return await ctx.db.get(convId);
  },
});

/**
 * Get conversations for a user
 */
export const getUserConversations = query({
  args: {},
  handler: async (ctx) => {
    const { clerkId, userDoc } = await getCurrentUserOrThrow(ctx);
    const all = await ctx.db.query("conversations").collect();
    const conversations = all.filter((c) => c.participantIds.includes(userDoc._id));

    // Sort by updatedAt DESC
    conversations.sort((a, b) => b.updatedAt - a.updatedAt);

    // Add last message
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await ctx.db
          .query("messages")
          .withIndex("by_conversationId_createdAt", (q) =>
            q.eq("conversationId", conv._id)
          )
          .order("desc")
          .first();

        const participants = await Promise.all(
          conv.participantIds.map((id) => ctx.db.get(id))
        );

        const otherNames = participants
          .filter((p) => p && p.clerkId !== clerkId)
          .map((p) => p!.name);

        const title = conv.isGroup
          ? conv.groupName ?? "Group"
          : otherNames[0] ?? "Direct Message";

        // Unread count (simple + correct for small scale)
        const readReceipt = await ctx.db
          .query("readReceipts")
          .withIndex("by_conversationId_userId", (q) =>
            q.eq("conversationId", conv._id).eq("userId", clerkId)
          )
          .first();

        const allMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversationId_createdAt", (q) =>
            q.eq("conversationId", conv._id)
          )
          .collect();

        let unreadCount = 0;
        if (!readReceipt) {
          unreadCount = allMessages.filter((m) => m.senderId !== clerkId).length;
        } else {
          const readIndex = allMessages.findIndex(
            (m) => m._id === readReceipt.lastReadMessageId
          );
          const after = readIndex >= 0 ? allMessages.slice(readIndex + 1) : allMessages;
          unreadCount = after.filter((m) => m.senderId !== clerkId).length;
        }

        return {
          ...conv,
          title,
          participants: participants.filter(Boolean),
          lastMessage,
          unreadCount,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get single conversation
 */
export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const { userDoc } = await getCurrentUserOrThrow(ctx);
    const conv = await ctx.db.get(args.conversationId);
    if (!conv) return null;
    if (!conv.participantIds.includes(userDoc._id)) throw new Error("Forbidden");
    return conv;
  },
});
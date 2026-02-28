import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const TYPING_TIMEOUT = 3000; // 3 seconds

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
  if (!conv.participantIds?.includes(userDocId)) {
    throw new Error("Forbidden");
  }
  return conv;
}

// Set typing indicator
export const setTypingIndicator = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    await assertConversationMember(ctx, args.conversationId);
    const existing = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .filter((q) => q.eq(q.field("userId"), clerkId))
      .first();

    const expiresAt = Date.now() + TYPING_TIMEOUT;

    if (existing) {
      await ctx.db.patch(existing._id, { expiresAt });
    } else {
      await ctx.db.insert("typingIndicators", {
        conversationId: args.conversationId,
        userId: clerkId,
        expiresAt,
      });
    }
  },
});

// Get typing indicators for conversation (enriched with user name)
export const getTypingIndicators = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    await assertConversationMember(ctx, args.conversationId);
    const now = Date.now();
    const indicators = await ctx.db
      .query("typingIndicators")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    const active = indicators.filter((indicator) => indicator.expiresAt > now);
    const users = await Promise.all(
      active.map(async (i) => {
        const u = await ctx.db
          .query("users")
          .withIndex("by_clerkId", (q) => q.eq("clerkId", i.userId))
          .first();
        return {
          userId: i.userId,
          name: u?.name ?? "Someone",
          expiresAt: i.expiresAt,
        };
      })
    );
    return users;
  },
});

// Set user status
export const setUserStatus = mutation({
  args: {
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    const existing = await ctx.db
      .query("userStatus")
      .withIndex("by_userId", (q) => q.eq("userId", clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        isOnline: args.isOnline,
        lastSeen: Date.now(),
      });
    } else {
      await ctx.db.insert("userStatus", {
        userId: clerkId,
        isOnline: args.isOnline,
        lastSeen: Date.now(),
      });
    }
  },
});

// Get user status
export const getUserStatus = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userStatus")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
  },
});

// Get all online users
export const getOnlineUsers = query({
  handler: async (ctx) => {
    return await ctx.db
      .query("userStatus")
      .filter((q) => q.eq(q.field("isOnline"), true))
      .collect();
  },
});

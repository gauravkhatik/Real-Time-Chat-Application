import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type Ctx = MutationCtx | QueryCtx;

async function getClerkIdOrThrow(ctx: Ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) throw new Error("Unauthorized");
  return identity.subject as string;
}

// Create or update user profile (based on authenticated user)
export const upsertUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        avatarUrl: args.avatarUrl,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      clerkId,
      email: args.email,
      name: args.name,
      avatarUrl: args.avatarUrl,
      createdAt: Date.now(),
    });
  },
});

export const getMe = query({
  args: {},
  handler: async (ctx) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", clerkId))
      .first();
  },
});

// Get all users except the current user
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    const users = await ctx.db.query("users").collect();
    return users
      .filter((user) => user.clerkId !== clerkId)
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Search users by name
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const clerkId = await getClerkIdOrThrow(ctx);
    const allUsers = await ctx.db.query("users").collect();
    const searchQuery = args.query.toLowerCase();

    return allUsers
      .filter(
        (user) =>
          user.clerkId !== clerkId &&
          user.name.toLowerCase().includes(searchQuery)
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Get user by clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

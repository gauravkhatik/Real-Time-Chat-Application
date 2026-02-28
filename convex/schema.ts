import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  conversations: defineTable({
  participantIds: v.array(v.id("users")), // 🔥 FIXED
  isGroup: v.boolean(),
  groupName: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_participants", ["participantIds"]),
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.string(), // Clerk user ID
    content: v.optional(v.string()),
    isDeleted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_conversationId_createdAt", ["conversationId", "createdAt"])
    .index("by_senderId", ["senderId"]),

  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.string(), // Clerk user ID
    emoji: v.string(),
    createdAt: v.number(),
  })
    .index("by_messageId", ["messageId"])
    .index("by_messageId_userId", ["messageId", "userId"]),

  typingIndicators: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(), // Clerk user ID
    expiresAt: v.number(),
  })
    .index("by_conversationId", ["conversationId"])
    .index("by_userId", ["userId"]),

  readReceipts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(), // Clerk user ID
    lastReadMessageId: v.id("messages"),
    lastReadAt: v.number(),
  })
    .index("by_conversationId_userId", ["conversationId", "userId"]),

  userStatus: defineTable({
    userId: v.string(), // Clerk user ID
    isOnline: v.boolean(),
    lastSeen: v.number(),
  })
    .index("by_userId", ["userId"]),
});

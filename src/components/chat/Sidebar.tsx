"use client";

import { useConvexAuth, useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { MessageCircle, Plus, User, Users } from "lucide-react";
import Image from "next/image";

interface SidebarProps {
  currentConversationId: Id<"conversations"> | null;
  onSelectConversation: (id: Id<"conversations">) => void;
  onNewDm: () => void;
  onNewGroup: () => void;
  onProfileClick: () => void;
}

export default function Sidebar({
  currentConversationId,
  onSelectConversation,
  onNewDm,
  onNewGroup,
  onProfileClick,
}: SidebarProps) {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const conversations = useQuery(
    api.conversations.getUserConversations,
    isAuthenticated ? {} : "skip"
  );

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            Messages
          </h1>
          <div className="flex gap-2">
            <button
              onClick={onNewDm}
              className="p-2 hover:bg-accent rounded-lg transition"
              title="New message"
            >
              <Plus className="w-5 h-5" />
            </button>
            <button
              onClick={onNewGroup}
              className="p-2 hover:bg-accent rounded-lg transition"
              title="New group"
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={onProfileClick}
              className="p-2 hover:bg-accent rounded-lg transition"
              title="View profile"
            >
              {user?.imageUrl ? (
                <div className="relative w-5 h-5">
                  <Image
                    src={user.imageUrl}
                    alt="Profile"
                    fill
                    className="rounded-full object-cover"
                  />
                </div>
              ) : (
                <User className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations && conversations.length > 0 ? (
          <div className="space-y-1 p-2">
            {conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => onSelectConversation(conv._id)}
                className={`w-full text-left p-3 rounded-lg transition ${
                  currentConversationId === conv._id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">
                      {conv.isGroup
                        ? `${conv.title} (${conv.participantIds.length})`
                        : conv.title}
                    </h3>
                    {conv.lastMessage && (
                      <p className="text-sm opacity-75 truncate">
                        {conv.lastMessage.isDeleted
                          ? "Message deleted"
                          : conv.lastMessage.content}
                      </p>
                    )}
                  </div>
                  {conv.unreadCount > 0 && (
                    <span
                      className={`ml-2 min-w-6 h-6 px-2 rounded-full text-xs font-bold flex items-center justify-center ${
                        currentConversationId === conv._id
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
            <p>No conversations yet</p>
            <button
              onClick={onNewDm}
              className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              Start a conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

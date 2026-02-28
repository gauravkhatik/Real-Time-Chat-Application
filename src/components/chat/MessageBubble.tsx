"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { Trash2, SmileIcon } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { formatMessageTime } from "@/lib/dateUtils";

interface MessageBubbleProps {
  message: Doc<"messages"> & {
    reactions?: Array<{ emoji: string; count: number; userIds: string[] }>;
  };
  isOwn: boolean;
}

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

export default function MessageBubble({
  message,
  isOwn,
}: MessageBubbleProps) {
  const { user } = useUser();
  const [showReactions, setShowReactions] = useState(false);

  const deleteMessage = useMutation(api.messages.deleteMessage);
  const toggleReaction = useMutation(api.reactions.toggleReaction);

  const handleDelete = async () => {
    await deleteMessage({ messageId: message._id });
  };

  const handleReaction = async (emoji: string) => {
    if (user) {
      await toggleReaction({
        messageId: message._id,
        emoji,
      });
    }
  };

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2`}>
      <div className="group relative">
        <div
          className={`max-w-xs px-4 py-2 rounded-lg ${
            isOwn
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-accent text-accent-foreground rounded-bl-none"
          }`}
        >
          {message.isDeleted ? (
            <p className="italic text-sm opacity-75">This message was deleted</p>
          ) : (
            <>
              <p className="break-words">{message.content}</p>
              <p className="text-xs opacity-75 mt-1">
                {formatMessageTime(message.createdAt)}
              </p>
            </>
          )}
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => handleReaction(reaction.emoji)}
                className="text-xs bg-accent px-2 py-1 rounded-full hover:bg-accent/80 transition"
              >
                {reaction.emoji} {reaction.count > 1 && reaction.count}
              </button>
            ))}
          </div>
        )}

        {/* Action buttons on hover */}
        {isOwn && (
          <div className="absolute -top-10 right-0 bg-card border border-border rounded-lg opacity-0 group-hover:opacity-100 transition flex gap-1 p-1">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 hover:bg-accent rounded transition"
              title="Add reaction"
            >
              <SmileIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-accent rounded transition text-destructive"
              title="Delete message"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Emoji picker on hover */}
        {!isOwn && (
          <div className="absolute -top-10 right-0 bg-card border border-border rounded-lg opacity-0 group-hover:opacity-100 transition flex gap-1 p-1">
            <button
              onClick={() => setShowReactions(!showReactions)}
              className="p-1 hover:bg-accent rounded transition"
              title="Add reaction"
            >
              <SmileIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Reaction picker */}
        {showReactions && (
          <div className="absolute -top-12 right-0 bg-card border border-border rounded-lg p-2 flex gap-1 z-10">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  handleReaction(emoji);
                  setShowReactions(false);
                }}
                className="text-lg hover:scale-125 transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

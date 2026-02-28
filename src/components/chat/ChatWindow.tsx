"use client";

import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { useConvexAuth } from "convex/react";

interface ChatWindowProps {
  conversationId: Id<"conversations"> | null;
  onBack: () => void;
  isMobile: boolean;
}

export default function ChatWindow({
  conversationId,
  onBack,
  isMobile,
}: ChatWindowProps) {
  const { user } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const [messageText, setMessageText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hasNewMessages, setHasNewMessages] = useState(false);
  const lastMessageCountRef = useRef<number>(0);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const lastFailedTextRef = useRef<string>("");

  // ✅ SAFE QUERIES (Prevents validator crash)
  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId && isAuthenticated ? { conversationId } : "skip"
  );

  const messages = useQuery(
    api.messages.getMessagesWithReactions,
    conversationId && isAuthenticated ? { conversationId } : "skip"
  );

  const typingIndicators = useQuery(
    api.status.getTypingIndicators,
    conversationId && isAuthenticated ? { conversationId } : "skip"
  );

  // ✅ Mutations
  const sendMessage = useMutation(api.messages.sendMessage);
  const setTypingIndicator = useMutation(api.status.setTypingIndicator);
  const markAsRead = useMutation(api.readReceipts.markMessagesAsRead);

  // ✅ Auto scroll
  const scrollToBottom = useCallback(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [autoScroll]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ✅ Track new messages while user is scrolled up
  useEffect(() => {
    const count = messages?.length ?? 0;
    const prev = lastMessageCountRef.current;
    lastMessageCountRef.current = count;
    if (count > prev && !autoScroll) {
      setHasNewMessages(true);
    }
    if (autoScroll) {
      setHasNewMessages(false);
    }
  }, [messages, autoScroll]);

  // ✅ Mark messages as read
  useEffect(() => {
    if (
      conversationId &&
      messages &&
      messages.length > 0 &&
      user
    ) {
      const lastMessage = messages[messages.length - 1];

      markAsRead({
        conversationId,
        lastReadMessageId: lastMessage._id,
      });
    }
  }, [messages, conversationId, user, markAsRead]);

  // ✅ Send message safely
  const handleSendMessage = async (overrideText?: string) => {
    if (!user || !conversationId) return;
    const text = (overrideText ?? messageText).trim();
    if (!text) return;

    try {
      setIsSending(true);
      setSendError(null);
      await sendMessage({
        conversationId,
        content: text,
      });

      setMessageText("");
    } catch (error) {
      console.error("Failed to send message:", error);
      lastFailedTextRef.current = text;
      setSendError("Failed to send. Check your connection and retry.");
    } finally {
      setIsSending(false);
    }
  };

  // ✅ Typing indicator
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setMessageText(e.target.value);

    if (!conversationId || !user) return;

    setTypingIndicator({
      conversationId,
    });
  };

  // ✅ Smart scroll logic
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } =
      e.currentTarget;

    const isNearBottom =
      scrollHeight - scrollTop - clientHeight < 100;

    setAutoScroll(isNearBottom);
  };

  const typingText = useMemo(() => {
    if (!typingIndicators || !user) return null;
    const others = typingIndicators.filter((t) => t.userId !== user.id);
    if (others.length === 0) return null;
    const names = Array.from(new Set(others.map((o) => o.name)));
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  }, [typingIndicators, user]);

  // ✅ If no conversation selected
  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Select a conversation
      </div>
    );
  }

  // ✅ Loading state
  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background h-full">
      {/* HEADER */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-accent rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex-1">
            <h2 className="font-semibold text-lg">
              {conversation.isGroup
                ? conversation.groupName
                : "Direct Message"}
            </h2>

            {conversation.isGroup && (
              <p className="text-sm text-muted-foreground">
                {conversation.participantIds.length} members
              </p>
            )}
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 relative">
        <div
          className="absolute inset-0 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
        >
        {messages && messages.length > 0 ? (
          messages.map((message) => (
            <MessageBubble
              key={message._id}
              message={message}
              isOwn={message.senderId === user?.id}
            />
          ))
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <p className="mb-2">No messages yet</p>
              <p className="text-sm">
                Start the conversation!
              </p>
            </div>
          </div>
        )}

        {/* Typing Indicator */}
        {typingText && <TypingIndicator text={typingText} />}

        <div ref={messagesEndRef} />
        </div>

        {!autoScroll && hasNewMessages && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            <button
              onClick={() => {
                setAutoScroll(true);
                setHasNewMessages(false);
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="pointer-events-auto px-3 py-2 rounded-full bg-primary text-primary-foreground shadow hover:bg-primary/90 transition"
            >
              ↓ New messages
            </button>
          </div>
        )}
      </div>

      {/* INPUT AREA */}
      <div className="p-4 border-t border-border bg-card">
        {sendError && (
          <div className="mb-2 text-sm text-destructive flex items-center justify-between gap-2">
            <span>{sendError}</span>
            <button
              onClick={() => handleSendMessage(lastFailedTextRef.current)}
              className="px-3 py-1 rounded-md border border-border hover:bg-accent transition"
            >
              Retry
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1 px-4 py-2 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!messageText.trim() || isSending}
            className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
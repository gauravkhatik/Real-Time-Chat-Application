"use client";

import { useMemo, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import Image from "next/image";
import { Search, ArrowLeft, Users, MessageCircle } from "lucide-react";

type Mode = "dm" | "group";

export default function NewConversation({
  mode,
  onCancel,
  onCreated,
}: {
  mode: Mode;
  onCancel: () => void;
  onCreated: (conversationId: Id<"conversations">) => void;
}) {
  const { isAuthenticated } = useConvexAuth();
  const users = useQuery(api.users.getAllUsers, isAuthenticated ? {} : "skip");
  const online = useQuery(
    api.status.getOnlineUsers,
    isAuthenticated ? {} : "skip"
  );
  const createOrGetConversation = useMutation(
    api.conversations.createOrGetConversation
  );
  const createGroupConversation = useMutation(
    api.conversations.createGroupConversation
  );

  const onlineSet = useMemo(() => {
    return new Set((online ?? []).filter((s) => s.isOnline).map((s) => s.userId));
  }, [online]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<Set<Id<"users">>>(new Set());
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const filtered = useMemo(() => {
    const list = users ?? [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.trim().toLowerCase();
    return list.filter((u) => u.name.toLowerCase().includes(q));
  }, [users, searchQuery]);

  const toggle = (id: Id<"users">) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (mode === "dm") {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  };

  const canCreate =
    mode === "dm"
      ? selected.size === 1
      : selected.size >= 2 && groupName.trim().length > 0;

  const handleCreate = async () => {
    setError(null);
    if (!canCreate) return;
    setIsCreating(true);
    try {
      if (mode === "dm") {
        const otherUserId = Array.from(selected)[0];
        const conversationId = await createOrGetConversation({ otherUserId });
        onCreated(conversationId);
      } else {
        const conversation = await createGroupConversation({
          participantIds: Array.from(selected),
          groupName: groupName.trim(),
        });
        if (!conversation) {
          throw new Error("Failed to create group conversation");
        }
        onCreated(conversation._id);
      }
    } catch (e) {
      console.error(e);
      setError("Failed to create conversation. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <button
            onClick={onCancel}
            className="p-2 hover:bg-accent rounded-lg transition"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-bold flex items-center gap-2">
            {mode === "group" ? (
              <>
                <Users className="w-5 h-5" /> New group
              </>
            ) : (
              <>
                <MessageCircle className="w-5 h-5" /> New message
              </>
            )}
          </h2>
        </div>

        {mode === "group" && (
          <div className="mb-3">
            <label className="text-sm text-muted-foreground">Group name</label>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="e.g. Project team"
              className="mt-1 w-full px-3 py-2 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-input border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        {mode === "group" && (
          <p className="text-xs text-muted-foreground mt-2">
            Select at least 2 people to create a group.
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length > 0 ? (
          <div className="space-y-1 p-2">
            {filtered.map((u) => {
              const isOnline = onlineSet.has(u.clerkId);
              const isSelected = selected.has(u._id);
              return (
                <button
                  key={u._id}
                  onClick={() => toggle(u._id)}
                  className={`w-full text-left p-3 rounded-lg transition flex items-center gap-3 ${
                    isSelected ? "bg-accent" : "hover:bg-accent"
                  }`}
                >
                  <div className="relative">
                    {u.avatarUrl ? (
                      <Image
                        src={u.avatarUrl}
                        alt={u.name}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${
                        isOnline ? "bg-green-500" : "bg-muted"
                      }`}
                      title={isOnline ? "Online" : "Offline"}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold truncate">{u.name}</h3>
                      <input
                        type={mode === "dm" ? "radio" : "checkbox"}
                        checked={isSelected}
                        readOnly
                        className="h-4 w-4"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {u.email}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <Search className="w-12 h-12 mb-2 opacity-50" />
            <p>{searchQuery ? "No users found" : "No users available"}</p>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-card">
        {error && (
          <p className="text-sm text-destructive mb-2">{error}</p>
        )}
        <button
          onClick={handleCreate}
          disabled={!canCreate || isCreating}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {mode === "group" ? "Create group" : "Start chat"}
        </button>
      </div>
    </div>
  );
}



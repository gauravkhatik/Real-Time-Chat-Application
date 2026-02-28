"use client";

import { useQuery } from "convex/react";
import { useState, useMemo } from "react";
import { api } from "../../../convex/_generated/api";
import { Search } from "lucide-react";
import Image from "next/image";

interface UserListProps {
  onSelectUser: (userId: string) => void;
}

export default function UserList({ onSelectUser }: UserListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const allUsers = useQuery(api.users.getAllUsers);

  const searchResults = useMemo(() => {
    if (!allUsers) return [];
    if (!searchQuery) return allUsers;

    return allUsers.filter((u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allUsers, searchQuery]);

  const handleSelectUser = (userId: string) => {
    onSelectUser(userId);
  };

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold mb-3">Select User</h2>
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
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto">
        {searchResults && searchResults.length > 0 ? (
          <div className="space-y-1 p-2">
            {searchResults.map((u) => (
              <button
                key={u._id}
                onClick={() => handleSelectUser(u.clerkId)}
                className="w-full text-left p-3 rounded-lg hover:bg-accent transition flex items-center gap-3"
              >
                {u.avatarUrl && (
                  <Image
                    src={u.avatarUrl}
                    alt={u.name}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{u.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {u.email}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <Search className="w-12 h-12 mb-2 opacity-50" />
            <p>
              {searchQuery ? "No users found" : "No users available"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

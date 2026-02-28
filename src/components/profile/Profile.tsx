"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { LogOut, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

interface ProfileProps {
  onBack?: () => void;
}

export default function Profile({ onBack }: ProfileProps) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const setUserStatus = useMutation(api.status.setUserStatus);

  const handleLogout = async () => {
    // best-effort presence update before token is gone
    try {
      await setUserStatus({ isOnline: false });
    } catch {}
    await signOut();
    router.push("/sign-in");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center gap-4">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-xl font-bold">Profile</h1>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-md mx-auto">
          {/* Avatar */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
              {user.imageUrl ? (
                <Image
                  src={user.imageUrl}
                  alt="Profile"
                  fill
                  className="rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-accent rounded-full flex items-center justify-center text-2xl font-bold">
                  {user.firstName?.charAt(0)?.toUpperCase() || "U"}
                </div>
              )}
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-6 bg-accent rounded-lg p-6">
            <div>
              <label className="text-sm text-muted-foreground">Full Name</label>
              <p className="text-lg font-semibold mt-1">
                {user.fullName || "User"}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Email</label>
              <p className="text-lg font-semibold mt-1">
                {user.emailAddresses[0]?.emailAddress || "No email"}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Username</label>
              <p className="text-lg font-semibold mt-1">
                {user.username || "No username"}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">User ID</label>
              <p className="text-sm font-mono mt-1 break-all text-xs">
                {user.id}
              </p>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Joined</label>
              <p className="text-lg font-semibold mt-1">
                {user.createdAt?.toLocaleDateString() || "Unknown"}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

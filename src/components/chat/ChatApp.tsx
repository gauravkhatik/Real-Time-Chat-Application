"use client";

import { useUser, useClerk, useAuth } from "@clerk/nextjs";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../convex/_generated/api";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import Profile from "../profile/Profile";
import { Id } from "../../../convex/_generated/dataModel";
import NewConversation from "./NewConversation";

function decodeJwtPayload(token: string): { iss?: string; aud?: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return { iss: payload.iss, aud: payload.aud };
  } catch {
    return null;
  }
}

export default function ChatApp() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { getToken } = useAuth();
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();
  const [jwtDebug, setJwtDebug] = useState<{ iss?: string; aud?: string } | "no-token" | "loading" | null>(null);

  const [currentConversationId, setCurrentConversationId] =
    useState<Id<"conversations"> | null>(null);

  const [isMobileView, setIsMobileView] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [leftPane, setLeftPane] = useState<"sidebar" | "newDm" | "newGroup">(
    "sidebar"
  );

  const upsertUser = useMutation(api.users.upsertUser);
  const setUserStatus = useMutation(api.status.setUserStatus);
  const me = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");

  // 🔥 Sync user to Convex (must complete before Sidebar queries run)
  useEffect(() => {
    if (!user || !isAuthenticated) return;

    upsertUser({
      email: user.emailAddresses[0]?.emailAddress || "",
      name: user.fullName || user.username || "User",
      avatarUrl: user.imageUrl,
    });

    setUserStatus({
      isOnline: true,
    });

    const markOffline = () => setUserStatus({ isOnline: false });
    const markOnline = () => setUserStatus({ isOnline: true });
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") markOffline();
      if (document.visibilityState === "visible") markOnline();
    };

    window.addEventListener("beforeunload", markOffline);
    window.addEventListener("pagehide", markOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", markOffline);
      window.removeEventListener("pagehide", markOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, upsertUser, setUserStatus]);

  // 🔥 Responsive handling
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Debug: fetch JWT payload when auth fails (to help fix iss/aud mismatch)
  useEffect(() => {
    if (isAuthenticated || isConvexAuthLoading || !user) return;
    let cancelled = false;
    setJwtDebug("loading");
    getToken({ template: "convex" })
      .then((token) => {
        if (cancelled) return;
        if (!token) {
          setJwtDebug("no-token");
          return;
        }
        const payload = decodeJwtPayload(token);
        setJwtDebug(payload ?? "no-token");
      })
      .catch(() => {
        if (!cancelled) setJwtDebug("no-token");
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isConvexAuthLoading, user, getToken]);

  if (!user) return null;

  if (isConvexAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading chat…
      </div>
    );
  }

  // Wait for user profile to exist in Convex before showing chat (avoids "User profile not found")
  if (isAuthenticated && !me) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Setting up your profile…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-bold mb-2">Convex auth not connected</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You’re signed in with Clerk, but Convex is not accepting the Clerk
            JWT yet.
          </p>
          <div className="text-sm space-y-2 mb-6">
            <p className="font-semibold">Fix checklist:</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>
                In Clerk, create a JWT template named{" "}
                <span className="font-mono">convex</span> with Audience{" "}
                <span className="font-mono">convex</span>. Easiest:{" "}
                <a
                  href="https://dashboard.clerk.com/apps/setup/convex"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  Activate Convex integration
                </a>{" "}
                or manually create at{" "}
                <a
                  href="https://dashboard.clerk.com/last-active?path=jwt-templates"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  JWT Templates
                </a>
                .
              </li>
              <li>
                Copy the <strong>Issuer URL</strong> from that template, then in{" "}
                <a
                  href="https://dashboard.convex.dev"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:no-underline"
                >
                  Convex Dashboard
                </a>{" "}
                → Settings → Environment Variables, set{" "}
                <span className="font-mono">CLERK_JWT_ISSUER_DOMAIN</span> to
                that URL (e.g.{" "}
                <span className="font-mono">
                  https://mutual-chow-85.clerk.accounts.dev
                </span>
                ).
              </li>
              <li>
                Restart: stop/start <span className="font-mono">npx convex dev</span>{" "}
                and refresh the browser.
              </li>
              <li>
                Sign out and sign in again below to get a fresh token.
              </li>
            </ul>
          </div>
          {jwtDebug && jwtDebug !== "loading" && (
            <div className="mb-6 rounded-md bg-muted p-3 text-xs font-mono">
              <p className="font-semibold text-foreground mb-1">Your JWT (for debugging):</p>
              {jwtDebug === "no-token" ? (
                <p className="text-destructive">
                  No &quot;convex&quot; template found. Create it in Clerk JWT Templates.
                </p>
              ) : (
                <>
                  <p><span className="text-muted-foreground">iss:</span> {jwtDebug.iss ?? "—"}</p>
                  <p><span className="text-muted-foreground">aud:</span> {jwtDebug.aud ?? "—"}</p>
                  <p className="text-muted-foreground mt-1">
                    Set CLERK_JWT_ISSUER_DOMAIN to the iss value. aud must be &quot;convex&quot;.
                  </p>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => signOut({ redirectUrl: window.location.href })}
            className="w-full py-2 px-4 rounded-md bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            Sign out and sign in again
          </button>
        </div>
      </div>
    );
  }

  if (showProfile) {
    return <Profile onBack={() => setShowProfile(false)} />;
  }

  return (
    <div className="flex h-screen bg-background">
      {(!isMobileView || !currentConversationId) && (
        <div className="w-full md:w-80 border-r border-border flex flex-col">
          {leftPane === "sidebar" ? (
            <Sidebar
              currentConversationId={currentConversationId}
              onSelectConversation={(id) => {
                setCurrentConversationId(id);
              }}
              onNewDm={() => setLeftPane("newDm")}
              onNewGroup={() => setLeftPane("newGroup")}
              onProfileClick={() => setShowProfile(true)}
            />
          ) : (
            <NewConversation
              mode={leftPane === "newGroup" ? "group" : "dm"}
              onCancel={() => setLeftPane("sidebar")}
              onCreated={(id) => {
                setCurrentConversationId(id);
                setLeftPane("sidebar");
              }}
            />
          )}
        </div>
      )}

      {currentConversationId ? (
        <ChatWindow
          conversationId={currentConversationId}
          onBack={() => {
            // mobile back to list
            setCurrentConversationId(null);
          }}
          isMobile={isMobileView}
        />
      ) : !isMobileView ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">
              Select a conversation
            </h2>
            <p>Start a new message or pick a conversation</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
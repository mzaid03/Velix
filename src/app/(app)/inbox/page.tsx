import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import StartChatForm from "./StartChatForm";

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
};

export default async function InboxPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // App layout already guards this, but keep it safe.
  if (!user) {
    return null;
  }

  // Backwards-compatible: if the unread migration hasn't been run yet,
  // conversation_members.last_read_at won't exist.
  let unreadSupported = true;
  let memberships: Array<{ conversation_id: string; last_read_at?: string | null }> = [];

  const { data: membershipsWithRead, error: membershipsWithReadError } =
    await supabase
      .from("conversation_members")
      .select("conversation_id,last_read_at")
      .eq("user_id", user.id);

  if (membershipsWithReadError) {
    unreadSupported = false;
    const { data: membershipsBasic } = await supabase
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", user.id);
    memberships = (membershipsBasic ?? []) as typeof memberships;
  } else {
    memberships = (membershipsWithRead ?? []) as typeof memberships;
  }

  const conversationIds = memberships.map((m) => m.conversation_id);
  const lastReadByConversation = new Map<string, string>();
  for (const m of memberships) {
    if (m.last_read_at) lastReadByConversation.set(m.conversation_id, m.last_read_at);
  }

  let items: Array<{
    conversationId: string;
    other?: Profile;
    lastMessageAt?: string | null;
    hasUnread?: boolean;
  }> = [];

  if (conversationIds.length) {
    const { data: otherMembers } = await supabase
      .from("conversation_members")
      .select("conversation_id,user_id")
      .in("conversation_id", conversationIds)
      .neq("user_id", user.id);

    const otherByConversation = new Map<string, string>();
    for (const row of otherMembers ?? []) {
      otherByConversation.set(row.conversation_id, row.user_id);
    }

    const otherUserIds = Array.from(new Set(otherByConversation.values()));

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,username,display_name,avatar_url")
      .in("id", otherUserIds);

    const profileById = new Map<string, Profile>();
    for (const p of profiles ?? []) profileById.set(p.id, p as Profile);

    const { data: conversations } = await supabase
      .from("conversations")
      .select("id,last_message_at")
      .in("id", conversationIds);

    const lastByConversation = new Map<string, string | null>();
    for (const c of conversations ?? []) {
      lastByConversation.set(c.id, c.last_message_at);
    }

    const { data: recentMessages } = await supabase
      .from("messages")
      .select("conversation_id,sender_id,created_at")
      .in("conversation_id", conversationIds)
      .order("created_at", { ascending: false })
      .limit(200);

    const latestByConversation = new Map<
      string,
      { sender_id: string; created_at: string }
    >();
    for (const msg of recentMessages ?? []) {
      if (!latestByConversation.has(msg.conversation_id)) {
        latestByConversation.set(msg.conversation_id, {
          sender_id: msg.sender_id,
          created_at: msg.created_at,
        });
      }
    }

    items = conversationIds.map((conversationId) => {
      const otherId = otherByConversation.get(conversationId);
      const latest = latestByConversation.get(conversationId);
      const lastRead = lastReadByConversation.get(conversationId);
      const hasUnread =
        unreadSupported &&
        Boolean(
          latest &&
            latest.sender_id !== user.id &&
            (!lastRead ||
              new Date(latest.created_at).getTime() >
                new Date(lastRead).getTime()),
        );
      return {
        conversationId,
        other: otherId ? profileById.get(otherId) : undefined,
        lastMessageAt: lastByConversation.get(conversationId) ?? null,
        hasUnread,
      };
    });

    items.sort((a, b) => {
      const at = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bt = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bt - at;
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-[320px_1fr]">
      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <StartChatForm />

        <div className="mt-6">
          <h2 className="text-sm font-semibold">Inbox</h2>
          <div className="mt-3 flex flex-col gap-2">
            {items.length ? (
              items.map((item) => (
                <Link
                  key={item.conversationId}
                  href={`/c/${item.conversationId}`}
                  className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                >
                  <div className="flex flex-col">
                    <span className={item.hasUnread ? "font-semibold" : "font-medium"}>
                      {item.other?.username ?? "(unknown)"}
                      {item.hasUnread ? (
                        <span className="ml-2 inline-flex items-center rounded-full bg-indigo-600/10 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                          New
                        </span>
                      ) : null}
                    </span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">
                      {item.lastMessageAt
                        ? new Date(item.lastMessageAt).toLocaleString()
                        : "No messages yet"}
                    </span>
                  </div>
                  <span className="text-zinc-500">→</span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                No conversations yet.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="hidden rounded-2xl border border-zinc-200 bg-white/80 p-6 text-sm text-zinc-600 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70 dark:text-zinc-400 md:block">
        Select a conversation to start chatting.
      </section>
    </div>
  );
}

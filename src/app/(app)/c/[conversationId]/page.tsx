import Link from "next/link";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

import ChatThread, { type Message } from "./ChatThread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .eq("conversation_id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) redirect("/inbox");

  const { data: otherMember } = await supabase
    .from("conversation_members")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .neq("user_id", user.id)
    .maybeSingle();

  const otherUserId = otherMember?.user_id;

  const { data: meProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  const { data: otherProfile } = otherUserId
    ? await supabase
        .from("profiles")
        .select("username")
        .eq("id", otherUserId)
        .maybeSingle()
    : { data: null };

  const { data: messages } = await supabase
    .from("messages")
    .select("id,conversation_id,sender_id,body,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/inbox"
            className="text-sm text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
          >
            ← Inbox
          </Link>
          <div className="text-sm font-semibold">
            {otherProfile?.username ?? "Chat"}
          </div>
        </div>
      </div>

      <ChatThread
        conversationId={conversationId}
        currentUserId={user.id}
        senderNames={{
          [user.id]: meProfile?.username ?? "Me",
          ...(otherUserId && otherProfile?.username
            ? { [otherUserId]: otherProfile.username }
            : {}),
        }}
        initialMessages={(messages ?? []) as Message[]}
      />
    </div>
  );
}

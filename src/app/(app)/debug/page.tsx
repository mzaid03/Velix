import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function DebugPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id,username")
    .eq("id", user.id)
    .maybeSingle();

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "get_or_create_direct_conversation",
    { other_user: user.id },
  );

  const { data: messagesProbe, error: messagesError } = await supabase
    .from("messages")
    .select("id")
    .limit(1);

  const { data: membersProbe, error: membersError } = await supabase
    .from("conversation_members")
    .select("conversation_id")
    .limit(1);

  return (
    <div className="space-y-6 text-sm">
      <div>
        <h1 className="text-lg font-semibold">Debug</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          If messaging doesn’t work, this page shows why.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="font-semibold">Auth</div>
        <div className="mt-2 space-y-1">
          <div>User id: {user.id}</div>
          <div>User error: {userError ? userError.message : "(none)"}</div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="font-semibold">Profile</div>
        <div className="mt-2 space-y-1">
          <div>
            Profile: {profile ? `${profile.username} (${profile.id})` : "(none)"}
          </div>
          <div>
            Profile error: {profileError ? profileError.message : "(none)"}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="font-semibold">DB probes</div>
        <div className="mt-2 space-y-1">
          <div>
            messages select: {messagesError ? messagesError.message : "ok"} (rows:
            {messagesProbe?.length ?? 0})
          </div>
          <div>
            conversation_members select: {membersError ? membersError.message : "ok"} (rows:
            {membersProbe?.length ?? 0})
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="font-semibold">RPC probe</div>
        <div className="mt-2 space-y-1">
          <div>
            get_or_create_direct_conversation(self):
            {rpcError ? rpcError.message : "ok"}
          </div>
          <div>Returned: {rpcData ? String(rpcData) : "(none)"}</div>
          <div className="text-zinc-600 dark:text-zinc-400">
            Note: calling with yourself should error with invalid_other_user.
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="font-semibold">What to look for</div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-600 dark:text-zinc-400">
          <li>
            If tables don’t exist, you’ll see “relation … does not exist” — run the SQL migration.
          </li>
          <li>
            If you see “permission denied”, re-run the migration (it includes GRANTs) and confirm RLS is enabled.
          </li>
        </ul>
      </section>
    </div>
  );
}

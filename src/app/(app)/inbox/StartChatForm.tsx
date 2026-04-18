"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeUsername, validateUsername } from "@/lib/username";

export default function StartChatForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const normalized = normalizeUsername(username);
    const validation = validateUsername(normalized);
    if (!validation.ok) {
      setPending(false);
      setError(validation.message);
      return;
    }

    const supabase = createSupabaseBrowserClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setPending(false);
      setError("Please log in again.");
      return;
    }

    const { data: other, error: otherError } = await supabase
      .from("profiles")
      .select("id,username")
      .eq("username", normalized)
      .maybeSingle();

    if (otherError) {
      setPending(false);
      setError(otherError.message);
      return;
    }

    if (!other) {
      setPending(false);
      setError("User not found.");
      return;
    }

    if (other.id === user.id) {
      setPending(false);
      setError("You can’t message yourself.");
      return;
    }

    const { data: conversationId, error: rpcError } = await supabase.rpc(
      "get_or_create_direct_conversation",
      { other_user: other.id },
    );

    if (rpcError || !conversationId) {
      setPending(false);
      setError(rpcError?.message ?? "Could not start conversation.");
      return;
    }

    setPending(false);
    router.push(`/c/${conversationId}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">New message</span>
        <div className="flex gap-2">
          <input
            className="h-10 flex-1 rounded-md border border-zinc-200 bg-transparent px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600"
            name="username"
            placeholder="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            type="submit"
            disabled={pending}
          >
            {pending ? "Starting…" : "Start"}
          </button>
        </div>
      </label>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </form>
  );
}

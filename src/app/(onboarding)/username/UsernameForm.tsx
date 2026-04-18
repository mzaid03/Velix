"use client";

import { useActionState } from "react";

import { setUsernameAction } from "@/lib/actions/profile";

export default function UsernameForm() {
  const [state, formAction, pending] = useActionState(setUsernameAction, {});

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Username</span>
        <input
          className="h-10 rounded-md border border-zinc-200 bg-transparent px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600"
          name="username"
          placeholder="your.name"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
        <span className="text-xs text-zinc-600 dark:text-zinc-400">
          3–20 chars, lowercase letters/numbers, “.” or “_”.
        </span>
      </label>

      {state.error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      ) : null}

      <button
        className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
        type="submit"
        disabled={pending}
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}

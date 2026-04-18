"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.session) {
      setInfo("Check your email to confirm your account, then log in.");
      return;
    }

    router.push("/username");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-tight">Sign up</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Create your account.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Email</span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-transparent px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Password</span>
          <input
            className="h-10 rounded-md border border-zinc-200 bg-transparent px-3 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
        </label>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        {info ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{info}</p>
        ) : null}

        <button
          className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
          type="submit"
          disabled={loading}
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link className="text-zinc-950 underline dark:text-zinc-50" href="/login">
          Log in
        </Link>
      </p>
    </div>
  );
}

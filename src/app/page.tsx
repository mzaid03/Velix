import Link from "next/link";

import ThemeToggle from "@/components/theme/ThemeToggle";

export default function Home() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-6 py-16 text-zinc-950 dark:from-zinc-950 dark:to-black dark:text-zinc-50">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-base font-semibold tracking-tight">Messaging</h1>
          <ThemeToggle />
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Sign in to start chatting.
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            href="/login"
          >
            Log in
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-transparent px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            href="/inbox"
          >
            Go to inbox
          </Link>
        </div>
      </main>
    </div>
  );
}

import { redirect } from "next/navigation";

import ThemeToggle from "@/components/theme/ThemeToggle";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.username) redirect("/inbox");

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-zinc-50 to-white px-6 py-16 text-zinc-950 dark:from-zinc-950 dark:to-black dark:text-zinc-50">
      <main className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
        <div className="mb-6 flex items-center justify-between">
          <div className="text-sm font-semibold tracking-tight">Pick a username</div>
          <ThemeToggle />
        </div>
        {children}
      </main>
    </div>
  );
}

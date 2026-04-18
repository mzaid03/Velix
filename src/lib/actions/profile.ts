"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeUsername, validateUsername } from "@/lib/username";

export type SetUsernameState = {
  error?: string;
};

export async function setUsernameAction(
  _prevState: SetUsernameState,
  formData: FormData,
): Promise<SetUsernameState> {
  const raw = String(formData.get("username") ?? "");
  const username = normalizeUsername(raw);

  const validation = validateUsername(username);
  if (!validation.ok) return { error: validation.message };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return { error: "Please log in again." };

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      username,
      display_name: username,
    },
    { onConflict: "id" },
  );

  if (error) {
    const message = error.code === "23505" ? "That username is taken." : error.message;
    return { error: message };
  }

  redirect("/inbox");
}

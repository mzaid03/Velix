"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeUsername, validateUsername } from "@/lib/username";

export type StartChatState = {
  error?: string;
};

export async function startChatAction(
  _prevState: StartChatState,
  formData: FormData,
): Promise<StartChatState> {
  const raw = String(formData.get("username") ?? "");
  const username = normalizeUsername(raw);

  const validation = validateUsername(username);
  if (!validation.ok) return { error: validation.message };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in again." };

  const { data: other, error: otherError } = await supabase
    .from("profiles")
    .select("id,username")
    .eq("username", username)
    .maybeSingle();

  if (otherError) return { error: otherError.message };
  if (!other) return { error: "User not found." };
  if (other.id === user.id) return { error: "You can’t message yourself." };

  const { data: conversationId, error: rpcError } = await supabase.rpc(
    "get_or_create_direct_conversation",
    { other_user: other.id },
  );

  if (rpcError) return { error: rpcError.message };
  if (!conversationId) return { error: "Could not start conversation." };

  redirect(`/c/${conversationId}`);
}

export type SendMessageState = {
  error?: string;
};

export async function sendMessageAction(
  _prevState: SendMessageState,
  formData: FormData,
): Promise<SendMessageState> {
  const conversationId = String(formData.get("conversationId") ?? "");
  if (!conversationId) return { error: "Missing conversation id." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message can’t be empty." };
  if (body.length > 2000) return { error: "Message is too long." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Please log in again." };

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body,
  });

  if (error) {
    console.error("sendMessageAction insert failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const extra = [error.code, error.details, error.hint]
      .filter(Boolean)
      .join(" | ");
    return { error: extra ? `${error.message} (${extra})` : error.message };
  }
  return {};
}

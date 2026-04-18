"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";

import { sendMessageAction } from "@/lib/actions/chat";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function ChatThread({
  conversationId,
  currentUserId,
  senderNames,
  initialMessages,
}: {
  conversationId: string;
  currentUserId: string;
  senderNames: Record<string, string>;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [sendState, sendFormAction, pending] = useActionState(sendMessageAction, {});

  const formRef = useRef<HTMLFormElement | null>(null);
  const didSubmitRef = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      // Ensure Realtime connection uses the authenticated session.
      await supabase.auth.getSession();
      if (cancelled) return;

      channel = supabase
        .channel(`messages:${conversationId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            const next = payload.new as Message;
            setMessages((prev) => {
              if (prev.some((m) => m.id === next.id)) return prev;
              return [...prev, next];
            });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    if (!didSubmitRef.current) return;
    if (pending) return;
    if (sendState.error) return;

    formRef.current?.reset();
    didSubmitRef.current = false;
  }, [pending, sendState.error]);

  return (
    <div className="flex h-[calc(100dvh-120px)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white/80 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-2">
          {messages.map((m) => {
            const mine = m.sender_id === currentUserId;
            const senderName = senderNames[m.sender_id] ?? "";
            return (
              <div
                key={m.id}
                className={
                  mine ? "flex w-full justify-end" : "flex w-full justify-start"
                }
              >
                <div
                  className={
                    mine
                      ? "max-w-[80%] rounded-2xl bg-indigo-600 px-3 py-2 text-sm text-white dark:bg-indigo-500"
                      : "max-w-[80%] rounded-2xl bg-zinc-100 px-3 py-2 text-sm text-zinc-950 dark:bg-zinc-900 dark:text-zinc-50"
                  }
                >
                  {!mine && senderName ? (
                    <div
                      className={
                        "mb-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300"
                      }
                    >
                      {senderName}
                    </div>
                  ) : null}
                  <div className="whitespace-pre-wrap break-words">{m.body}</div>
                  <div
                    className={
                      mine
                        ? "mt-1 text-[10px] text-white/70"
                        : "mt-1 text-[10px] text-zinc-500 dark:text-zinc-400"
                    }
                  >
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">
        <form
          ref={formRef}
          action={sendFormAction}
          onSubmit={() => {
            didSubmitRef.current = true;
          }}
          className="flex items-end gap-2"
        >
          <input type="hidden" name="conversationId" value={conversationId} />
          <textarea
            name="body"
            rows={1}
            className="min-h-10 flex-1 resize-none rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-800 dark:focus:border-zinc-600"
            placeholder="Message…"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                formRef.current?.requestSubmit();
              }
            }}
            required
          />
          <button
            className="inline-flex h-10 items-center justify-center rounded-md bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            type="submit"
            disabled={pending}
          >
            Send
          </button>
        </form>
        {sendState.error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">
            {sendState.error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

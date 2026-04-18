-- Unread message tracking (per user per conversation)

alter table public.conversation_members
add column if not exists last_read_at timestamptz not null default now();

-- Allow users to update their own membership row (for last_read_at)
drop policy if exists "conversation_members_update_own" on public.conversation_members;
create policy "conversation_members_update_own"
on public.conversation_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- Privileges (RLS still applies)
grant update on table public.conversation_members to authenticated;

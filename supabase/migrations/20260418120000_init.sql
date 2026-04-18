-- Messaging app schema + RLS (Supabase)

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username citext not null unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  constraint profiles_username_format check (
    username = lower(username)
    and username ~ '^[a-z0-9._]{3,20}$'
  )
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_message_at timestamptz
);

-- Enforces one direct (1:1) conversation per user pair.
create table if not exists public.direct_conversations (
  conversation_id uuid primary key references public.conversations (id) on delete cascade,
  user_low uuid not null references auth.users (id) on delete cascade,
  user_high uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint direct_conversations_user_order check (user_low < user_high),
  constraint direct_conversations_unique_pair unique (user_low, user_high)
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_length check (char_length(body) between 1 and 2000)
);

-- Indexes
create index if not exists profiles_username_idx on public.profiles (username);
create index if not exists conversation_members_user_id_idx on public.conversation_members (user_id, conversation_id);
create index if not exists messages_conversation_created_at_idx on public.messages (conversation_id, created_at desc);
create index if not exists conversations_last_message_at_idx on public.conversations (last_message_at desc nulls last);

-- Trigger: keep last_message_at updated
create or replace function public.set_conversation_last_message_at()
returns trigger
language plpgsql
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists trg_messages_set_last_message_at on public.messages;
create trigger trg_messages_set_last_message_at
after insert on public.messages
for each row
execute function public.set_conversation_last_message_at();

-- RPC: get or create a direct conversation between the current user and other_user
create or replace function public.get_or_create_direct_conversation(other_user uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  convo_id uuid;
  new_convo_id uuid;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;

  if other_user is null or other_user = me then
    raise exception 'invalid_other_user';
  end if;

  -- Deterministic ordering to enforce uniqueness.
  a := least(me, other_user);
  b := greatest(me, other_user);

  select dc.conversation_id
  into convo_id
  from public.direct_conversations dc
  where dc.user_low = a and dc.user_high = b;

  if convo_id is not null then
    return convo_id;
  end if;

  -- Create, handling concurrent creators.
  begin
    insert into public.conversations default values
    returning id into new_convo_id;

    insert into public.direct_conversations (conversation_id, user_low, user_high)
    values (new_convo_id, a, b);

    convo_id := new_convo_id;
  exception
    when unique_violation then
      -- Another request created it first.
      select dc.conversation_id
      into convo_id
      from public.direct_conversations dc
      where dc.user_low = a and dc.user_high = b;

      if convo_id is null then
        raise;
      end if;
  end;

  -- Ensure both users are members.
  insert into public.conversation_members (conversation_id, user_id)
  values (convo_id, me)
  on conflict do nothing;

  insert into public.conversation_members (conversation_id, user_id)
  values (convo_id, other_user)
  on conflict do nothing;

  return convo_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.direct_conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

-- profiles
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- conversations (read-only for users; created via RPC)
drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
on public.conversations
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.user_id = auth.uid()
  )
);

-- direct_conversations
drop policy if exists "direct_conversations_select_member" on public.direct_conversations;
create policy "direct_conversations_select_member"
on public.direct_conversations
for select
to authenticated
using (user_low = auth.uid() or user_high = auth.uid());

-- conversation_members
drop policy if exists "conversation_members_select_member" on public.conversation_members;
create policy "conversation_members_select_member"
on public.conversation_members
for select
to authenticated
using (
  exists (
    select 1
    from public.direct_conversations dc
    where dc.conversation_id = conversation_members.conversation_id
      and (dc.user_low = auth.uid() or dc.user_high = auth.uid())
  )
);

-- messages
drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
on public.messages
for select
to authenticated
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

drop policy if exists "messages_insert_own_member" on public.messages;
create policy "messages_insert_own_member"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = auth.uid()
  )
);

-- Realtime (needed for `postgres_changes` subscriptions)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- Privileges (RLS still applies)
grant usage on schema public to anon, authenticated;

grant select, insert, update on table public.profiles to authenticated;
grant select on table public.conversations to authenticated;
grant select on table public.direct_conversations to authenticated;
grant select on table public.conversation_members to authenticated;
grant select, insert on table public.messages to authenticated;

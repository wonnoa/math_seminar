-- Target: replace email-based permission checks with a single profiles table keyed by auth.users.id.
-- This migration is written in phases so it can be applied safely without immediately breaking the app.
-- Run section-by-section in Supabase SQL Editor, verifying after each phase.

-- ============================================================================
-- Phase 1. Create profiles and backfill from auth + current permission tables
-- ============================================================================

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  is_admin boolean not null default false,
  can_comment boolean not null default false,
  can_manage_member_card boolean not null default false,
  can_manage_notices boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(email))
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles
for select
to authenticated
using (user_id = auth.uid());

-- Backfill one row per auth user.
insert into public.profiles (user_id, email)
select u.id, lower(u.email)
from auth.users as u
where u.email is not null
on conflict (email) do update
set email = excluded.email,
    updated_at = now();

-- Merge legacy admin table into profiles.
update public.profiles as p
set is_admin = true,
    updated_at = now()
from public.admin_emails as a
where p.email = a.email;

-- Merge legacy permission table into profiles.
update public.profiles as p
set is_admin = p.is_admin or up.is_admin,
    can_comment = p.can_comment or up.can_comment,
    can_manage_member_card = p.can_manage_member_card or up.can_manage_member_card,
    can_manage_notices = p.can_manage_notices or up.can_manage_notices,
    updated_at = now()
from public.user_permissions as up
where p.email = up.email;

-- Inspect migrated permissions.
select
  email,
  is_admin,
  can_comment,
  can_manage_member_card,
  can_manage_notices
from public.profiles
order by email;

-- ============================================================================
-- Phase 2. Add user-id ownership columns and backfill existing data
-- ============================================================================

alter table public.session_block_comments
  add column if not exists author_user_id uuid references auth.users(id) on delete set null;

alter table public.member_cards
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null;

update public.session_block_comments as c
set author_user_id = p.user_id
from public.profiles as p
where c.author_user_id is null
  and lower(c.author_email) = p.email;

update public.member_cards as m
set owner_user_id = p.user_id
from public.profiles as p
where m.owner_user_id is null
  and lower(m.owner_email) = p.email;

select
  count(*) filter (where author_user_id is null) as comments_missing_owner,
  count(*) filter (where owner_user_id is null) as cards_missing_owner
from public.session_block_comments
cross join public.member_cards;

-- ============================================================================
-- Phase 3. Replace helper functions so they read from profiles via auth.uid()
-- Keep old function names to minimize frontend churn.
-- ============================================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and is_admin = true
  );
$$;

create or replace function public.can_comment()
returns boolean
language sql
stable
as $$
  select public.is_admin()
  or exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and can_comment = true
  );
$$;

create or replace function public.can_manage_member_card()
returns boolean
language sql
stable
as $$
  select public.is_admin()
  or exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and can_manage_member_card = true
  );
$$;

create or replace function public.can_manage_notices()
returns boolean
language sql
stable
as $$
  select public.is_admin()
  or exists (
    select 1
    from public.profiles
    where user_id = auth.uid()
      and can_manage_notices = true
  );
$$;

-- Single frontend-friendly RPC so the browser doesn't depend on table shape everywhere.
create or replace function public.get_my_permissions()
returns table (
  user_id uuid,
  email text,
  is_admin boolean,
  can_comment boolean,
  can_manage_member_card boolean,
  can_manage_notices boolean
)
language sql
stable
as $$
  select
    p.user_id,
    p.email,
    p.is_admin,
    (p.is_admin or p.can_comment) as can_comment,
    (p.is_admin or p.can_manage_member_card) as can_manage_member_card,
    (p.is_admin or p.can_manage_notices) as can_manage_notices
  from public.profiles as p
  where p.user_id = auth.uid()
  union all
  select
    auth.uid(),
    lower(coalesce(auth.jwt() ->> 'email', '')),
    false,
    false,
    false,
    false
  where not exists (
    select 1
    from public.profiles as p
    where p.user_id = auth.uid()
  )
  limit 1;
$$;

-- ============================================================================
-- Phase 4. Switch RLS to auth.uid()-based ownership checks
-- Run this only after frontend is reading from profiles/get_my_permissions().
-- ============================================================================

-- section_progress
drop policy if exists "section_progress_admin_write" on public.section_progress;
create policy "section_progress_admin_write"
on public.section_progress
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- session_notes
drop policy if exists "session_notes_admin_write" on public.session_notes;
create policy "session_notes_admin_write"
on public.session_notes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- session_block_comments
drop policy if exists "session_block_comments_insert" on public.session_block_comments;
drop policy if exists "session_block_comments_update_authorized" on public.session_block_comments;
drop policy if exists "session_block_comments_delete_authorized" on public.session_block_comments;
drop policy if exists "session_block_comments_delete_admin" on public.session_block_comments;

create policy "session_block_comments_insert"
on public.session_block_comments
for insert
to authenticated
with check (
  public.can_comment()
  and author_user_id = auth.uid()
);

create policy "session_block_comments_update_authorized"
on public.session_block_comments
for update
to authenticated
using (
  public.is_admin()
  or author_user_id = auth.uid()
)
with check (
  public.is_admin()
  or author_user_id = auth.uid()
);

create policy "session_block_comments_delete_authorized"
on public.session_block_comments
for delete
to authenticated
using (
  public.is_admin()
  or (
    author_user_id = auth.uid()
    and not exists (
      select 1
      from public.session_block_comments as child
      where child.parent_id = public.session_block_comments.id
    )
  )
);

-- member_cards
drop policy if exists "member_cards_insert_authorized" on public.member_cards;
drop policy if exists "member_cards_update_authorized" on public.member_cards;
drop policy if exists "member_cards_delete_authorized" on public.member_cards;

create policy "member_cards_insert_authorized"
on public.member_cards
for insert
to authenticated
with check (
  public.can_manage_member_card()
  and (
    public.is_admin()
    or owner_user_id = auth.uid()
  )
);

create policy "member_cards_update_authorized"
on public.member_cards
for update
to authenticated
using (
  public.is_admin()
  or owner_user_id = auth.uid()
)
with check (
  public.is_admin()
  or owner_user_id = auth.uid()
);

create policy "member_cards_delete_authorized"
on public.member_cards
for delete
to authenticated
using (
  public.is_admin()
  or owner_user_id = auth.uid()
);

-- session_notices
drop policy if exists "session_notices_manage_authorized" on public.session_notices;
create policy "session_notices_manage_authorized"
on public.session_notices
for all
to authenticated
using (public.can_manage_notices())
with check (public.can_manage_notices());

-- ============================================================================
-- Phase 5. Optional cleanup after production verification
-- Do NOT run this until the app has been stable on profiles for a while.
-- ============================================================================

-- drop table if exists public.admin_emails;
-- drop table if exists public.user_permissions;


create extension if not exists pgcrypto;

create table if not exists public.admin_emails (
  email text primary key,
  created_at timestamptz not null default now(),
  check (email = lower(email))
);

alter table public.admin_emails enable row level security;

create table if not exists public.user_permissions (
  email text primary key,
  is_admin boolean not null default false,
  can_comment boolean not null default false,
  can_manage_member_card boolean not null default false,
  can_manage_notices boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email = lower(email))
);

alter table public.user_permissions enable row level security;
alter table public.user_permissions
  add column if not exists can_manage_notices boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.admin_emails
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
  or exists (
    select 1
    from public.user_permissions
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
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
    from public.user_permissions
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
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
    from public.user_permissions
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
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
    from public.user_permissions
    where email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and can_manage_notices = true
  );
$$;

drop policy if exists "admin_emails_select_self" on public.admin_emails;
create policy "admin_emails_select_self"
on public.admin_emails
for select
to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

drop policy if exists "user_permissions_select_self" on public.user_permissions;
create policy "user_permissions_select_self"
on public.user_permissions
for select
to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

create table if not exists public.section_progress (
  section_key text primary key,
  status text not null check (status in ('not_started', 'in_progress', 'done')),
  updated_at timestamptz not null default now()
);

alter table public.section_progress enable row level security;

drop policy if exists "section_progress_public_read" on public.section_progress;
create policy "section_progress_public_read"
on public.section_progress
for select
to anon, authenticated
using (true);

drop policy if exists "section_progress_admin_write" on public.section_progress;
create policy "section_progress_admin_write"
on public.section_progress
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.session_notes (
  session_key text primary key,
  session_date date not null,
  title text not null default '',
  notes jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.session_notes enable row level security;

drop policy if exists "session_notes_public_read" on public.session_notes;
create policy "session_notes_public_read"
on public.session_notes
for select
to anon, authenticated
using (true);

drop policy if exists "session_notes_admin_write" on public.session_notes;
create policy "session_notes_admin_write"
on public.session_notes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create table if not exists public.session_block_comments (
  id uuid primary key default gen_random_uuid(),
  session_key text not null references public.session_notes(session_key) on delete cascade,
  block_id text not null,
  parent_id uuid references public.session_block_comments(id) on delete cascade,
  body text not null default '',
  author_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_block_comments enable row level security;

drop policy if exists "session_block_comments_public_read" on public.session_block_comments;
create policy "session_block_comments_public_read"
on public.session_block_comments
for select
to anon, authenticated
using (true);

drop policy if exists "session_block_comments_admin_write" on public.session_block_comments;
drop policy if exists "session_block_comments_insert" on public.session_block_comments;
create policy "session_block_comments_insert"
on public.session_block_comments
for insert
to authenticated
with check (
  public.can_comment()
  and author_email = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "session_block_comments_delete_admin" on public.session_block_comments;
drop policy if exists "session_block_comments_update_authorized" on public.session_block_comments;
create policy "session_block_comments_update_authorized"
on public.session_block_comments
for update
to authenticated
using (
  public.is_admin()
  or author_email = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.is_admin()
  or author_email = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "session_block_comments_delete_authorized" on public.session_block_comments;
create policy "session_block_comments_delete_authorized"
on public.session_block_comments
for delete
to authenticated
using (
  public.is_admin()
  or (
    author_email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and not exists (
      select 1
      from public.session_block_comments as child
      where child.parent_id = public.session_block_comments.id
    )
  )
);

create table if not exists public.member_cards (
  id uuid primary key default gen_random_uuid(),
  owner_email text not null default '',
  sort_order integer not null default 0,
  name text not null default '',
  description text not null default '',
  image_data text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.member_cards
  add column if not exists owner_email text not null default '';

alter table public.member_cards enable row level security;
create unique index if not exists member_cards_owner_email_unique
on public.member_cards (owner_email)
where owner_email <> '';

drop policy if exists "member_cards_public_read" on public.member_cards;
create policy "member_cards_public_read"
on public.member_cards
for select
to anon, authenticated
using (true);

drop policy if exists "member_cards_admin_write" on public.member_cards;
drop policy if exists "member_cards_insert_authorized" on public.member_cards;
create policy "member_cards_insert_authorized"
on public.member_cards
for insert
to authenticated
with check (
  public.can_manage_member_card()
  and (
    public.is_admin()
    or owner_email = lower(coalesce(auth.jwt() ->> 'email', ''))
  )
);

drop policy if exists "member_cards_update_authorized" on public.member_cards;
create policy "member_cards_update_authorized"
on public.member_cards
for update
to authenticated
using (
  public.is_admin()
  or owner_email = lower(coalesce(auth.jwt() ->> 'email', ''))
)
with check (
  public.is_admin()
  or owner_email = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "member_cards_delete_authorized" on public.member_cards;
create policy "member_cards_delete_authorized"
on public.member_cards
for delete
to authenticated
using (
  public.is_admin()
  or owner_email = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create table if not exists public.session_notices (
  id uuid primary key default gen_random_uuid(),
  notice_date date not null,
  title text not null default '',
  body text not null default '',
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_notices enable row level security;

drop policy if exists "session_notices_public_read" on public.session_notices;
create policy "session_notices_public_read"
on public.session_notices
for select
to anon, authenticated
using (true);

drop policy if exists "session_notices_admin_write" on public.session_notices;
drop policy if exists "session_notices_manage_authorized" on public.session_notices;
create policy "session_notices_manage_authorized"
on public.session_notices
for all
to authenticated
using (public.can_manage_notices())
with check (public.can_manage_notices());

-- 관리자 이메일을 한 줄 추가하세요.
-- 예시:
-- insert into public.admin_emails (email) values ('your-email@example.com');

-- 기능별 권한 예시:
-- insert into public.user_permissions (email, can_comment, can_manage_member_card)
-- values ('member@example.com', true, true)
-- on conflict (email) do update
-- set can_comment = excluded.can_comment,
--     can_manage_member_card = excluded.can_manage_member_card,
--     updated_at = now();
--
-- 공지사항 편집 허용:
-- insert into public.user_permissions (email, can_manage_notices)
-- values ('notice@example.com', true)
-- on conflict (email) do update
-- set can_manage_notices = true,
--     updated_at = now();
--
-- 댓글만 허용:
-- insert into public.user_permissions (email, can_comment)
-- values ('commenter@example.com', true)
-- on conflict (email) do update
-- set can_comment = true,
--     updated_at = now();
--
-- 멤버 카드만 허용:
-- insert into public.user_permissions (email, can_manage_member_card)
-- values ('membercard@example.com', true)
-- on conflict (email) do update
-- set can_manage_member_card = true,
--     updated_at = now();

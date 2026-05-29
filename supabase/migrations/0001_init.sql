-- 결(Gyeol) — 초기 스키마 + RLS
-- CLAUDE.md §5 데이터 모델을 따른다. 솔로 로그도 '멤버 1명인 공간'으로 통일.
-- Supabase SQL Editor에서 실행하거나 `supabase db push`로 적용한다.

-- ─────────────────────────────────────────────────────────
-- 테이블
-- ─────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '나',
  created_at   timestamptz not null default now()
);

create table if not exists public.spaces (
  id          uuid primary key,
  name        text not null,
  is_personal boolean not null default false,
  created_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table if not exists public.space_members (
  space_id  uuid not null references public.spaces (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  role      text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table if not exists public.fragments (
  id           uuid primary key,
  space_id     uuid not null references public.spaces (id) on delete cascade,
  author_id    uuid not null references auth.users (id) on delete cascade,
  type         text not null check (type in ('photo', 'video', 'text', 'voice')),
  media_path   text,
  text_content text,
  title        text not null default '',
  captured_at  timestamptz not null,
  day_date     date not null,
  backfilled   boolean not null default false,
  created_at   timestamptz not null default now()
);

create index if not exists fragments_space_day_idx
  on public.fragments (space_id, day_date);

create table if not exists public.invites (
  token       text primary key,
  space_id    uuid not null references public.spaces (id) on delete cascade,
  invited_by  uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  accepted_by uuid references auth.users (id) on delete set null
);

-- ─────────────────────────────────────────────────────────
-- 멤버십 헬퍼 (SECURITY DEFINER로 RLS 재귀 회피)
--   space_members 정책 안에서 space_members를 다시 조회하면 무한 재귀가 난다.
--   정의자 권한으로 RLS를 우회하는 함수로 막는다.
-- ─────────────────────────────────────────────────────────

create or replace function public.is_space_member(s uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1 from public.space_members
    where space_id = s and user_id = auth.uid()
  );
$$;

-- ─────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────

alter table public.profiles      enable row level security;
alter table public.spaces        enable row level security;
alter table public.space_members enable row level security;
alter table public.fragments     enable row level security;
alter table public.invites       enable row level security;

-- profiles: 본인 것만.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_insert_own on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- spaces: 멤버면 읽기. 생성은 본인이 owner. 수정·삭제는 owner(created_by)만.
create policy spaces_select_member on public.spaces
  for select using (public.is_space_member(id));
create policy spaces_insert_self on public.spaces
  for insert with check (created_by = auth.uid());
create policy spaces_update_owner on public.spaces
  for update using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy spaces_delete_owner on public.spaces
  for delete using (created_by = auth.uid());

-- space_members: 같은 공간 멤버면 읽기. 본인 행을 추가/삭제(가입·탈퇴),
--   공간 owner는 다른 멤버 행도 추가/삭제(초대 수락 처리·내보내기).
create policy members_select_member on public.space_members
  for select using (public.is_space_member(space_id));
create policy members_insert_self_or_owner on public.space_members
  for insert with check (
    user_id = auth.uid()
    or exists (select 1 from public.spaces s where s.id = space_id and s.created_by = auth.uid())
  );
create policy members_delete_self_or_owner on public.space_members
  for delete using (
    user_id = auth.uid()
    or exists (select 1 from public.spaces s where s.id = space_id and s.created_by = auth.uid())
  );

-- fragments: 속한 공간의 결만 읽고 쓴다. 작성은 본인(author_id) 강제.
--   (개인 공간은 멤버가 본인뿐이라 '본인만 접근'이 자동 보장된다.)
create policy fragments_select_member on public.fragments
  for select using (public.is_space_member(space_id));
create policy fragments_insert_author on public.fragments
  for insert with check (author_id = auth.uid() and public.is_space_member(space_id));
create policy fragments_update_member on public.fragments
  for update using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));
create policy fragments_delete_member on public.fragments
  for delete using (public.is_space_member(space_id));

-- invites: 같은 공간 멤버가 만들고 본다. (토큰으로 수락하는 흐름은 공유 단계에서 확장.)
create policy invites_select_member on public.invites
  for select using (public.is_space_member(space_id));
create policy invites_insert_member on public.invites
  for insert with check (invited_by = auth.uid() and public.is_space_member(space_id));
create policy invites_update_member on public.invites
  for update using (public.is_space_member(space_id))
  with check (public.is_space_member(space_id));

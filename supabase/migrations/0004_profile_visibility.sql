-- 결(Gyeol) — 공유 공간 멤버끼리 서로의 프로필(표시 이름) 읽기 허용
-- 기존 정책은 본인 프로필만 읽을 수 있어, 공유 공간에서 다른 멤버 이름이 빈 값으로 보였다.
-- 같은 공간을 공유하는 사용자에 한해 프로필 select를 허용한다.

create or replace function public.shares_space_with(other uuid)
  returns boolean
  language sql
  security definer
  stable
  set search_path = public
as $$
  select exists (
    select 1
    from public.space_members a
    join public.space_members b on a.space_id = b.space_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_visible on public.profiles;
create policy profiles_select_visible on public.profiles
  for select using (id = auth.uid() or public.shares_space_with(id));

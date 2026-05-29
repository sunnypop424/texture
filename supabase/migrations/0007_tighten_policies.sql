-- 결(Gyeol) — 보안 강화: 공유 공간 권한 범위 좁히기
-- (보안 점검 결과 반영. 솔로 격리는 그대로, 공유 공간의 과도한 권한을 제한한다.)

-- ── 1) fragments: 수정은 작성자만, 삭제는 작성자 또는 공간 owner ──
-- 기존엔 같은 공간 멤버면 남의 결도 수정·삭제 가능했다.
drop policy if exists fragments_update_member on public.fragments;
drop policy if exists fragments_delete_member on public.fragments;

create policy fragments_update_author on public.fragments
  for update using (author_id = auth.uid()) with check (author_id = auth.uid());

create policy fragments_delete_author_or_owner on public.fragments
  for delete using (
    author_id = auth.uid()
    or exists (select 1 from public.spaces s where s.id = space_id and s.created_by = auth.uid())
  );

-- ── 4) media: 덮어쓰기(수정) 정책 추가 ──
-- insert/select/delete만 있어 미디어 교체(upsert 덮어쓰기)가 막혀 있었다.
drop policy if exists media_update_member on storage.objects;
create policy media_update_member on storage.objects
  for update using (
    bucket_id = 'media' and public.is_space_member(((storage.foldername(name))[1])::uuid)
  ) with check (
    bucket_id = 'media' and public.is_space_member(((storage.foldername(name))[1])::uuid)
  );

-- ── 3) 멤버 직접 update 제거 + 이름 변경 전용 RPC ──
-- 본인 행 update를 열면 role을 'owner'로 셀프 변경할 수 있어, display_name만 바꾸는 RPC로 대체.
drop policy if exists members_update_self on public.space_members;

create or replace function public.set_member_name(target_space uuid, member_name text)
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  update public.space_members
    set display_name = nullif(member_name, '')
    where space_id = target_space and user_id = auth.uid();
end;
$$;
grant execute on function public.set_member_name(uuid, text) to anon, authenticated;

-- ── 6) invites: 만든 사람 또는 owner만 수정(낮은 위험, 함께 정리) ──
drop policy if exists invites_update_member on public.invites;
create policy invites_update_inviter_or_owner on public.invites
  for update using (
    invited_by = auth.uid()
    or exists (select 1 from public.spaces s where s.id = space_id and s.created_by = auth.uid())
  ) with check (
    invited_by = auth.uid()
    or exists (select 1 from public.spaces s where s.id = space_id and s.created_by = auth.uid())
  );

-- ── 5) 합류 RPC: 공유 공간 인원 상한(2–6명, §5) 서버에서 강제 ──
create or replace function public.accept_invite(invite_token text, member_name text default '')
  returns public.spaces
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  inv public.invites;
  sp  public.spaces;
  member_count int;
  already boolean;
begin
  select * into inv from public.invites where token = invite_token;
  if inv.token is null then
    raise exception 'invite_not_found';
  end if;
  if inv.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  select exists (
    select 1 from public.space_members where space_id = inv.space_id and user_id = auth.uid()
  ) into already;

  if not already then
    select count(*) into member_count from public.space_members where space_id = inv.space_id;
    if member_count >= 6 then
      raise exception 'space_full';
    end if;
  end if;

  insert into public.space_members (space_id, user_id, role, display_name)
  values (inv.space_id, auth.uid(), 'member', nullif(member_name, ''))
  on conflict (space_id, user_id)
    do update set display_name = coalesce(nullif(excluded.display_name, ''), public.space_members.display_name);

  update public.invites set accepted_by = auth.uid() where token = invite_token;

  select * into sp from public.spaces where id = inv.space_id;
  return sp;
end;
$$;
grant execute on function public.accept_invite(text, text) to anon, authenticated;

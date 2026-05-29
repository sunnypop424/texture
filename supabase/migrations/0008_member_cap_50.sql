-- 결(Gyeol) — 공유 공간 인원 상한을 50으로(사실상 비제한)
-- 가까운 소수 모델이라 실제론 적게 모이고, 미디어는 멤버별 첫 1회만 받고 캐시되므로
-- 비용 부담도 작다. 50은 남용 방지용 안전 천장.

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
    if member_count >= 50 then
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

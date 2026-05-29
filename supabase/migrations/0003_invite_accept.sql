-- 결(Gyeol) — 초대 수락 RPC
-- 비멤버는 RLS상 invites/spaces를 읽거나 space_members에 들어갈 수 없다. 토큰을 가진
-- 사람이 공간에 합류할 수 있도록, 정의자 권한으로 검증+합류를 처리하는 함수를 둔다.
-- (모든 공유는 비동기 — 합류 후 결은 기존 동기화(pull)로 채워진다.)

create or replace function public.accept_invite(invite_token text)
  returns public.spaces
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  inv public.invites;
  sp  public.spaces;
begin
  select * into inv from public.invites where token = invite_token;
  if inv.token is null then
    raise exception 'invite_not_found';
  end if;
  if inv.expires_at < now() then
    raise exception 'invite_expired';
  end if;

  -- 합류(이미 멤버면 무시).
  insert into public.space_members (space_id, user_id, role)
  values (inv.space_id, auth.uid(), 'member')
  on conflict (space_id, user_id) do nothing;

  -- 수락 표시(마지막 수락자 기록).
  update public.invites set accepted_by = auth.uid() where token = invite_token;

  select * into sp from public.spaces where id = inv.space_id;
  return sp;
end;
$$;

grant execute on function public.accept_invite(text) to anon, authenticated;

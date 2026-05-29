-- 결(Gyeol) — 공간별 멤버 표시 이름
-- 같은 사람이 공간마다 다른 이름을 쓸 수 있도록 space_members에 display_name을 둔다.
-- (전역 프로필 이름과 별개. 비어 있으면 프로필 이름으로 대체.)

alter table public.space_members add column if not exists display_name text;

-- 합류 RPC가 합류 시 이름을 함께 저장하도록 시그니처 확장.
drop function if exists public.accept_invite(text);

create or replace function public.accept_invite(invite_token text, member_name text default '')
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

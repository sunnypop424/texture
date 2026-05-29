-- 결(Gyeol) — 본인 멤버 행 수정 허용(공간별 이름 변경용)
-- 기존 space_members 정책은 select/insert/delete만 있어, 본인 표시 이름을 바꿀 수 없었다.

drop policy if exists members_update_self on public.space_members;
create policy members_update_self on public.space_members
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

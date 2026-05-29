-- 결(Gyeol) — 미디어 Storage 버킷 + RLS
-- 사진/영상 원본을 보관한다. 객체 경로 규약: {space_id}/{fragment_id}
-- 경로 첫 세그먼트(space_id)로 공간 멤버십을 검증한다.
-- 0001_init.sql 의 is_space_member() 헬퍼에 의존하므로 그 다음에 실행한다.

-- 비공개 버킷 생성(멱등).
insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

-- 같은 공간 멤버만 해당 공간 폴더의 객체를 읽고/올리고/지운다.
create policy media_select_member on storage.objects
  for select using (
    bucket_id = 'media'
    and public.is_space_member(((storage.foldername(name))[1])::uuid)
  );

create policy media_insert_member on storage.objects
  for insert with check (
    bucket_id = 'media'
    and public.is_space_member(((storage.foldername(name))[1])::uuid)
  );

create policy media_delete_member on storage.objects
  for delete using (
    bucket_id = 'media'
    and public.is_space_member(((storage.foldername(name))[1])::uuid)
  );

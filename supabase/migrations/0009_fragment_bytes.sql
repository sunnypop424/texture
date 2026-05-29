-- 결(Gyeol) — 결 미디어 바이트 크기(용량 집계용)
-- 공간별 누적 용량(무료 한도/Plus 판정, §14.2)을 미디어 다운로드 없이 합산하기 위해
-- 각 결에 원본 바이트를 저장한다. 미디어 없는 결은 null.

alter table public.fragments add column if not exists bytes bigint;

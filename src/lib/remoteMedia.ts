import { getSupabase } from './supabase';

const BUCKET = 'media';

/**
 * 미디어 원본(사진/영상 blob)을 Storage에 올린다.
 * 객체 경로 규약: {serverSpaceId}/{fragmentId} — 경로 첫 세그먼트로 멤버십을 검증한다.
 *
 * @returns 저장된 객체 경로(media_path). 실패 시 throw → 호출자(syncEngine)가
 *          해당 결을 미동기화로 남겨 다음 사이클에 재시도한다(미디어 없는 row 방지).
 */
export async function uploadMedia(
  serverSpaceId: string,
  fragmentId: string,
  blob: Blob,
): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('cloud disabled');

  const path = `${serverSpaceId}/${fragmentId}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    upsert: true, // 멱등 — 재시도 시 같은 경로 덮어쓰기 안전
    contentType: blob.type || 'application/octet-stream',
  });
  if (error) throw error;
  return path;
}

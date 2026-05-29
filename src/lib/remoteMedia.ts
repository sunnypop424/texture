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

/**
 * Storage에서 미디어 원본 blob을 받는다(내려받기용).
 * 받은 blob은 호출자가 mediaStore에 저장해 로컬 미디어처럼 다룬다(만료 없는 복원).
 * @returns blob, 실패 시 null.
 */
export async function downloadMedia(path: string): Promise<Blob | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

/** Storage에서 미디어 객체를 지운다(결 삭제 동기화용). 실패해도 조용히 넘어간다(best-effort). */
export async function deleteMedia(path: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // best-effort — 행 삭제가 본질, 객체는 나중에 정리돼도 무방
  }
}

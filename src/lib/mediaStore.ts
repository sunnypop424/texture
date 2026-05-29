import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

const PREFIX = 'gyeol:blob:';

// 같은 세션 동안 유효한 URL을 메모이즈 — 같은 fragment를 여러 컴포넌트가 참조해도 한 번만 createObjectURL.
const urlCache = new Map<string, string>();

export async function saveMedia(id: string, blob: Blob): Promise<string> {
  try {
    await idbSet(PREFIX + id, blob);
  } catch (err) {
    console.warn('mediaStore.saveMedia persist failed', err);
  }
  const existing = urlCache.get(id);
  if (existing) URL.revokeObjectURL(existing);
  const url = URL.createObjectURL(blob);
  urlCache.set(id, url);
  return url;
}

export async function loadMediaUrl(id: string): Promise<string | null> {
  const cached = urlCache.get(id);
  if (cached) return cached;
  try {
    const blob = await idbGet<Blob>(PREFIX + id);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  } catch (err) {
    console.warn('mediaStore.loadMediaUrl failed', err);
    return null;
  }
}

/** 백업 등 원본 데이터가 필요할 때 — URL이 아닌 원본 Blob을 그대로 돌려준다. */
export async function loadMediaBlob(id: string): Promise<Blob | null> {
  try {
    const blob = await idbGet<Blob>(PREFIX + id);
    return blob ?? null;
  } catch (err) {
    console.warn('mediaStore.loadMediaBlob failed', err);
    return null;
  }
}

export async function removeMedia(id: string): Promise<void> {
  const cached = urlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    urlCache.delete(id);
  }
  try {
    await idbDel(PREFIX + id);
  } catch (err) {
    console.warn('mediaStore.removeMedia failed', err);
  }
}

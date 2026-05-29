import { get as idbGet, set as idbSet, keys as idbKeys } from 'idb-keyval';
import type { Fragment } from '../types/fragment';
import type { Space } from '../types/space';

/**
 * 클라우드 백업 (현재는 IndexedDB로 시뮬레이션).
 * 추후 Supabase Storage/Postgres로 교체될 자리 — 인터페이스(push/pull/list)는 그대로 유지한다.
 * 미디어 원본은 data URL로 payload 안에 인라인된다(서버 업로드를 흉내).
 */
const PREFIX = 'gyeol:cloud-backup:';

export interface CloudBackup {
  backedUpAt: string;
  author: { id: string; displayName: string };
  space: Space;
  fragments: Fragment[];
}

export interface CloudBackupSummary {
  spaceId: string;
  spaceName: string;
  backedUpAt: string;
  count: number;
}

export async function pushBackup(payload: CloudBackup): Promise<void> {
  await idbSet(PREFIX + payload.space.id, payload);
}

export async function pullBackup(spaceId: string): Promise<CloudBackup | null> {
  const data = await idbGet<CloudBackup>(PREFIX + spaceId);
  return data ?? null;
}

/** 클라우드에 올라가 있는 백업들의 요약 목록 (최신순). */
export async function listBackups(): Promise<CloudBackupSummary[]> {
  const allKeys = await idbKeys();
  const backupKeys = allKeys.filter(
    (k): k is string => typeof k === 'string' && k.startsWith(PREFIX),
  );
  const summaries: CloudBackupSummary[] = [];
  for (const key of backupKeys) {
    const data = await idbGet<CloudBackup>(key);
    if (data?.space) {
      summaries.push({
        spaceId: data.space.id,
        spaceName: data.space.name,
        backedUpAt: data.backedUpAt,
        count: Array.isArray(data.fragments) ? data.fragments.length : 0,
      });
    }
  }
  return summaries.sort((a, b) => b.backedUpAt.localeCompare(a.backedUpAt));
}

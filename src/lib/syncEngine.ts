import { get as idbGet, set as idbSet } from 'idb-keyval';
import { getSupabase, isCloudEnabled } from './supabase';
import { ensureAnonymousSession } from './auth';
import { useFragmentStore } from './fragmentStore';
import { useSpaceStore } from './spaceStore';
import { PERSONAL_SPACE_ID } from '../data/initialSpaces';
import {
  toSpaceRow, toSpaceMemberRow, toFragmentRow,
  fromSpaceRow, fromSpaceMemberRow, fromFragmentRow,
  type SpaceRow, type SpaceMemberRow, type FragmentRow,
} from '../types/db';
import { uploadMedia, deleteMedia } from './remoteMedia';
import { loadMediaBlob } from './mediaStore';
import type { Fragment } from '../types/fragment';

/**
 * 오프라인 우선 동기화 엔진.
 *
 * 캡처는 항상 IndexedDB에 먼저 쓰이고(낙관적), 이 엔진이 배경에서 Supabase로
 * push한다. 캡처 경로는 이 엔진을 await하지 않는다(UI를 막지 않음).
 *
 * push 대상 판단은 in-memory pendingIds가 아니라 "서버에 올라간 id 집합"
 * (serverSyncedIds, IndexedDB 영속)을 기준으로 한다. 과거 mock 동기화가
 * pendingIds를 비워버렸어도, 클라우드를 처음 켰을 때 쌓여 있던 결을 빠짐없이
 * 올리기 위함이다. pendingIds는 UI 표시(보내는 중 점)용으로만 남는다.
 *
 * 모든 push는 upsert(클라이언트 UUID PK) → 멱등 → 재시도 안전.
 */

const SYNCED_KEY = 'gyeol:synced-frag-ids:v1';
const SYNCED_SPACES_KEY = 'gyeol:synced-space-ids:v1';
const DELETE_QUEUE_KEY = 'gyeol:pending-deletes:v1';
const UPDATE_QUEUE_KEY = 'gyeol:pending-updates:v1';

/** 서버에서 지워야 할 결. 로컬에서 비운 직후 적재되어 다음 flush에 처리된다. */
interface PendingDelete {
  id: string;
  spaceId: string; // 로컬 space id (flush에서 서버 id로 매핑)
  mediaPath?: string;
}

let running = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** 항목별 지수 백오프 상태. key: 'space:'+id 또는 fragment id. */
interface BackoffEntry {
  attempts: number;
  nextAt: number; // epoch ms — 이 시각 이후에만 재시도
}
const backoff = new Map<string, BackoffEntry>();
const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

function isBlocked(key: string): boolean {
  const e = backoff.get(key);
  return !!e && Date.now() < e.nextAt;
}

function recordFailure(key: string): void {
  const prev = backoff.get(key);
  const attempts = (prev?.attempts ?? 0) + 1;
  const delay = Math.min(BACKOFF_BASE_MS * 2 ** (attempts - 1), BACKOFF_MAX_MS);
  backoff.set(key, { attempts, nextAt: Date.now() + delay });
}

function clearFailure(key: string): void {
  backoff.delete(key);
}

/** online 복귀 시 모든 백오프를 즉시 해제 — 끊겼던 동안 쌓인 항목을 바로 재시도. */
export function resetBackoff(): void {
  backoff.clear();
}

async function loadIdSet(key: string): Promise<Set<string>> {
  try {
    const arr = await idbGet<string[]>(key);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

async function persistIdSet(key: string, ids: Set<string>): Promise<void> {
  try {
    await idbSet(key, Array.from(ids));
  } catch (err) {
    console.warn('동기화 상태 저장 실패', err);
  }
}

/**
 * 로컬 space id → 서버 id.
 *
 * 개인 공간은 사용자마다 정확히 하나이므로 서버 id를 사용자 uid로 고정한다.
 * 이렇게 하면 그 행은 항상 그 사용자 소유라 RLS 충돌·소유자 드리프트가 원천적으로
 * 불가능하고, 임의 id로 만든 옛 찌꺼기 행과도 절대 겹치지 않는다(매핑 테이블 불필요).
 * 공유 공간은 생성 시 이미 UUID라 자기 자신을 그대로 쓴다.
 */
function resolveServerSpaceId(localId: string, uid: string): string {
  return localId === PERSONAL_SPACE_ID ? uid : localId;
}

/**
 * RLS 환경에서는 upsert(ON CONFLICT DO UPDATE)가 UPDATE 정책 경로를 건드려 거부될 수
 * 있다(plain INSERT는 통과). 그래서 plain insert를 쓰되, 이미 있는 행(23505 중복)은
 * 성공으로 간주해 멱등성을 지킨다. 솔로 범위에선 행 내용이 거의 안 바뀌므로 충분하다.
 */
async function insertTolerant(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  table: string,
  rows: unknown,
): Promise<void> {
  const { error } = await supabase.from(table).insert(rows as never);
  if (error && error.code !== '23505') throw error; // 23505 = 중복 = 이미 동기화됨
}

async function loadDeleteQueue(): Promise<PendingDelete[]> {
  try {
    const q = await idbGet<PendingDelete[]>(DELETE_QUEUE_KEY);
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}

async function persistDeleteQueue(q: PendingDelete[]): Promise<void> {
  try {
    await idbSet(DELETE_QUEUE_KEY, q);
  } catch (err) {
    console.warn('삭제 대기열 저장 실패', err);
  }
}

/**
 * 로컬에서 비운 결을 서버에서도 지우도록 대기열에 넣는다. 캡처처럼 즉시 동작하고
 * 실제 삭제는 배경 flush에서 처리(오프라인이면 다음 온라인 때).
 */
export async function enqueueDelete(fragment: { id: string; spaceId: string; mediaPath?: string }): Promise<void> {
  if (!isCloudEnabled()) return;
  const q = await loadDeleteQueue();
  if (q.some((d) => d.id === fragment.id)) return;
  q.push({ id: fragment.id, spaceId: fragment.spaceId, mediaPath: fragment.mediaPath });
  await persistDeleteQueue(q);
  requestSync();
}

/**
 * 수정한 결을 서버에도 반영하도록 표시한다. 아직 안 올린 결이면 어차피 insert가 최신
 * 내용을 올리므로 무시된다(flush에서 정리).
 */
export async function enqueueUpdate(fragmentId: string): Promise<void> {
  if (!isCloudEnabled()) return;
  const q = await loadIdSet(UPDATE_QUEUE_KEY);
  q.add(fragmentId);
  await persistIdSet(UPDATE_QUEUE_KEY, q);
  requestSync();
}

/** 한 번의 동기화 사이클. 안전하게 중복 호출 가능(running 가드 + 멱등 upsert). */
export async function flush(): Promise<void> {
  if (!isCloudEnabled()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (running) return;
  running = true;
  try {
    const sessionUid = await ensureAnonymousSession();
    if (!sessionUid) return;
    const supabase = getSupabase();
    if (!supabase) return;

    // 서버가 실제로 보는 사용자(토큰의 sub) = auth.uid(). created_by/author_id를
    // 반드시 이 값에 맞춰야 RLS를 통과한다. 로컬에 저장된 소유자 id는 (익명 세션
    // 교체 등으로) 어긋날 수 있으므로 신뢰하지 않고, 토큰의 uid를 권위 있는 출처로 쓴다.
    let uid = sessionUid;
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) uid = userData.user.id;
    } catch {
      // 네트워크 문제 — 세션 uid로 진행(대개 동일).
    }

    // 1) 공간 + 멤버 insert. 개인 공간은 이 기기의 현재 사용자 소유로 강제한다(솔로 가정).
    const syncedSpaces = await loadIdSet(SYNCED_SPACES_KEY);
    let syncedSpacesDirty = false;
    const { spaces } = useSpaceStore.getState();
    for (const sp of spaces) {
      // 개인 공간은 항상 내 것. 공유 공간은 내가 만든 것만.
      const ownerUid = sp.isPersonal ? uid : sp.createdBy;
      if (ownerUid !== uid) continue;
      if (syncedSpaces.has(sp.id)) continue; // 이미 올린 공간은 건너뜀(409 재시도 방지)
      const key = `space:${sp.id}`;
      if (isBlocked(key)) continue;
      const sid = resolveServerSpaceId(sp.id, uid);
      try {
        await insertTolerant(supabase, 'spaces', toSpaceRow({ ...sp, createdBy: ownerUid }, sid));
        // 개인 공간 멤버는 현재 사용자 1명으로 강제(로컬 id 드리프트 무시).
        const members = sp.isPersonal
          ? sp.members.map((m) => ({ ...m, userId: uid }))
          : sp.members;
        const memberRows = members.map((m) => toSpaceMemberRow(sid, m));
        await insertTolerant(supabase, 'space_members', memberRows);
        syncedSpaces.add(sp.id);
        syncedSpacesDirty = true;
        clearFailure(key);
      } catch (err) {
        console.warn('공간 동기화 실패 — 재시도 예정', err);
        recordFailure(key);
      }
    }
    if (syncedSpacesDirty) await persistIdSet(SYNCED_SPACES_KEY, syncedSpaces);

    // 2) 아직 서버에 없는 내 결을 push. 미디어가 있으면 먼저 업로드.
    const synced = await loadIdSet(SYNCED_KEY);
    const updates = await loadIdSet(UPDATE_QUEUE_KEY); // insert가 처리하면 큐에서 빼기 위해 먼저 로드
    let updDirty = false;
    const { fragments } = useFragmentStore.getState();
    let syncedDirty = false;
    for (const f of fragments) {
      // 개인 공간 결은 author를 현재 사용자로 강제, 그 외엔 내가 쓴 것만.
      const authorId = f.spaceId === PERSONAL_SPACE_ID ? uid : f.authorId;
      if (authorId !== uid) continue;
      if (synced.has(f.id)) continue;
      if (isBlocked(f.id)) continue;
      const sid = resolveServerSpaceId(f.spaceId, uid);
      try {
        let mediaPath = f.mediaPath;
        if (f.hasLocalMedia && !mediaPath) {
          const blob = await loadMediaBlob(f.id);
          if (blob) {
            mediaPath = await uploadMedia(sid, f.id, blob);
            useFragmentStore.getState().update(f.id, { mediaPath });
          }
        }
        const row = toFragmentRow({ ...f, authorId, mediaPath }, sid);
        await insertTolerant(supabase, 'fragments', row);
        synced.add(f.id);
        syncedDirty = true;
        if (updates.delete(f.id)) updDirty = true; // insert가 최신 내용을 올렸으니 별도 update 불필요
        useFragmentStore.getState().markSynced(f.id); // UI '보내는 중' 표시 해제
        clearFailure(f.id);
      } catch (err) {
        console.warn('결 동기화 실패 — 재시도 예정', err);
        recordFailure(f.id);
      }
    }
    if (syncedDirty) await persistIdSet(SYNCED_KEY, synced);

    // 3) 비운 결을 서버에서 삭제.
    const deletes = await loadDeleteQueue();
    if (deletes.length > 0) {
      const remaining: PendingDelete[] = [];
      let syncedChanged = false;
      for (const d of deletes) {
        if (isBlocked(`del:${d.id}`)) {
          remaining.push(d);
          continue;
        }
        try {
          const { error } = await supabase.from('fragments').delete().eq('id', d.id);
          if (error) throw error;
          if (d.mediaPath) await deleteMedia(d.mediaPath);
          if (synced.delete(d.id)) syncedChanged = true;
          clearFailure(`del:${d.id}`);
        } catch (err) {
          console.warn('결 삭제 동기화 실패 — 재시도 예정', err);
          recordFailure(`del:${d.id}`);
          remaining.push(d);
        }
      }
      await persistDeleteQueue(remaining);
      if (syncedChanged) await persistIdSet(SYNCED_KEY, synced);
    }

    // 4) 수정된 결을 서버에 반영(2)에서 insert로 처리된 것은 이미 큐에서 빠짐).
    if (updates.size > 0) {
      const fragsNow = useFragmentStore.getState().fragments;
      for (const id of Array.from(updates)) {
        if (isBlocked(`upd:${id}`)) continue;
        const f = fragsNow.find((x) => x.id === id);
        // 사라졌거나, 아직 안 올렸거나(insert가 최신 반영), 내 결이 아니면 큐에서 제거.
        const authorId = f && f.spaceId === PERSONAL_SPACE_ID ? uid : f?.authorId;
        if (!f || !synced.has(f.id) || authorId !== uid) {
          updates.delete(id);
          updDirty = true;
          continue;
        }
        const sid = resolveServerSpaceId(f.spaceId, uid);
        try {
          let mediaPath = f.mediaPath;
          if (f.hasLocalMedia && !mediaPath) {
            // 미디어 교체됨 → 같은 경로에 새 원본 업로드(덮어쓰기).
            const blob = await loadMediaBlob(f.id);
            if (blob) {
              mediaPath = await uploadMedia(sid, f.id, blob);
              useFragmentStore.getState().update(f.id, { mediaPath });
            }
          } else if (!f.hasLocalMedia && mediaPath) {
            // 미디어 제거됨 → 서버 객체 삭제.
            await deleteMedia(mediaPath);
            mediaPath = undefined;
            useFragmentStore.getState().update(f.id, { mediaPath: undefined });
          }
          const row = toFragmentRow({ ...f, authorId, mediaPath }, sid);
          const { error } = await supabase.from('fragments').update(row).eq('id', f.id);
          if (error) throw error;
          updates.delete(id);
          updDirty = true;
          clearFailure(`upd:${id}`);
        } catch (err) {
          console.warn('결 수정 동기화 실패 — 재시도 예정', err);
          recordFailure(`upd:${id}`);
        }
      }
    }
    // insert가 큐에서 뺀 경우 / update가 처리한 경우 모두 반영.
    if (updDirty) await persistIdSet(UPDATE_QUEUE_KEY, updates);
  } finally {
    running = false;
  }
}

let pulling = false;

/**
 * 서버에서 내 공간·결을 가져와 로컬에 병합한다(내려받기).
 *
 * 새 기기·재설치 시 아카이브 복원의 핵심. 이미 로컬에 있는 결(같은 id)은 건너뛰어
 * 로컬 원본을 보존하고, 처음 보는 결만 추가한다. 미디어는 Storage에서 받아 로컬에
 * 저장해 만료 없는 원본으로 다룬다.
 */
export async function pullFromCloud(): Promise<void> {
  if (!isCloudEnabled()) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  if (pulling) return;
  pulling = true;
  try {
    const sessionUid = await ensureAnonymousSession();
    if (!sessionUid) return;
    const supabase = getSupabase();
    if (!supabase) return;
    let uid = sessionUid;
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user?.id) uid = userData.user.id;
    } catch {
      // 세션 uid로 진행
    }

    // 1) 공유 공간 가져오기 (개인 공간 id=uid는 로컬에 이미 있으니 건너뜀).
    const { data: spaceRows, error: spaceErr } = await supabase.from('spaces').select('*');
    if (spaceErr) throw spaceErr;
    const rows = (spaceRows ?? []) as SpaceRow[];
    for (const row of rows) {
      if (row.id === uid || row.is_personal) continue; // 개인 공간은 로컬 것 사용
      const { data: memberRows } = await supabase
        .from('space_members')
        .select('*')
        .eq('space_id', row.id);
      const mrows = (memberRows ?? []) as SpaceMemberRow[];
      // 멤버 표시 이름은 profiles에서 보강(공유 공간 멤버끼리는 서로 프로필을 볼 수 있음).
      const ids = mrows.map((m) => m.user_id);
      const nameById = new Map<string, string>();
      if (ids.length > 0) {
        const { data: profs } = await supabase.from('profiles').select('id, display_name').in('id', ids);
        for (const p of (profs ?? []) as { id: string; display_name: string }[]) {
          nameById.set(p.id, p.display_name);
        }
      }
      const members = mrows.map((m) => {
        const base = fromSpaceMemberRow(m); // 공간별 display_name 우선
        return { ...base, displayName: base.displayName || nameById.get(m.user_id) || '' };
      });
      useSpaceStore.getState().mergeRemoteSpace(fromSpaceRow(row, members));
    }

    // 2) 결 가져오기 — 처음 보는 것만 추가, 미디어는 받아서 로컬 저장.
    const { data: fragRows, error: fragErr } = await supabase.from('fragments').select('*');
    if (fragErr) throw fragErr;
    const existing = new Set(useFragmentStore.getState().fragments.map((f) => f.id));
    const synced = await loadIdSet(SYNCED_KEY);
    const serverFragIds = new Set<string>();
    const incoming: Fragment[] = [];
    for (const row of (fragRows ?? []) as FragmentRow[]) {
      serverFragIds.add(row.id);
      synced.add(row.id); // 서버에 있으니 동기화 완료로 표시
      if (existing.has(row.id)) continue; // 같은 기기 — 로컬 원본 보존
      const localSpaceId = row.space_id === uid ? PERSONAL_SPACE_ID : row.space_id;
      // 지연 로드 — 미디어는 지금 받지 않고 media_path만 보관. 화면에 보일 때
      // useMediaUrl이 받아 로컬에 저장한다(대역폭·비용 절감).
      const f = fromFragmentRow(row, localSpaceId);
      incoming.push(f);
    }
    if (incoming.length > 0) useFragmentStore.getState().importFragments(incoming);

    // 삭제 전파: 이전에 올렸던(synced) 결이 서버에 더 이상 없으면(다른 기기에서 비웠거나
    // 접근 권한을 잃음) 로컬에서도 제거한다. 아직 안 올린 로컬 결(synced 아님)은 건드리지 않음.
    for (const f of useFragmentStore.getState().fragments) {
      if (synced.has(f.id) && !serverFragIds.has(f.id)) {
        useFragmentStore.getState().remove(f.id);
        synced.delete(f.id);
      }
    }
    await persistIdSet(SYNCED_KEY, synced);

    // 가져온 공유 공간은 다시 push하지 않도록 동기화 완료로 표시.
    const syncedSpaces = await loadIdSet(SYNCED_SPACES_KEY);
    const serverSpaceIds = new Set(rows.map((r) => r.id));
    for (const row of rows) {
      if (row.id !== uid && !row.is_personal) syncedSpaces.add(row.id);
    }
    // 삭제 전파: 이전에 올렸던 공유 공간이 서버에서 사라지면(owner가 지웠거나 내가 빠짐)
    // 로컬에서도 제거. 그 공간의 결은 위 결 삭제 전파가 함께 정리한다.
    for (const sp of useSpaceStore.getState().spaces) {
      if (sp.isPersonal) continue;
      if (syncedSpaces.has(sp.id) && !serverSpaceIds.has(sp.id)) {
        useSpaceStore.getState().dropSpace(sp.id);
        syncedSpaces.delete(sp.id);
      }
    }
    await persistIdSet(SYNCED_SPACES_KEY, syncedSpaces);
  } catch (err) {
    console.warn('내려받기 실패 — 나중에 다시 시도', err);
  } finally {
    pulling = false;
  }
}

/** 짧게 debounce해서 flush를 호출 — 연속 트리거(캡처 연타 등)를 한 번으로 합친다. */
export function requestSync(): void {
  if (!isCloudEnabled()) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flush();
  }, 300);
}

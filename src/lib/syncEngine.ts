import { get as idbGet, set as idbSet } from 'idb-keyval';
import { getSupabase, isCloudEnabled } from './supabase';
import { ensureAnonymousSession } from './auth';
import { useFragmentStore } from './fragmentStore';
import { useSpaceStore } from './spaceStore';
import { PERSONAL_SPACE_ID } from '../data/initialSpaces';
import { toSpaceRow, toSpaceMemberRow, toFragmentRow } from '../types/db';
import { uploadMedia } from './remoteMedia';
import { loadMediaBlob } from './mediaStore';

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
        useFragmentStore.getState().markSynced(f.id); // UI '보내는 중' 표시 해제
        clearFailure(f.id);
      } catch (err) {
        console.warn('결 동기화 실패 — 재시도 예정', err);
        recordFailure(f.id);
      }
    }
    if (syncedDirty) await persistIdSet(SYNCED_KEY, synced);
  } finally {
    running = false;
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

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── idb-keyval: in-memory 백엔드(synced ids·space map이 flush 간 유지되도록) ──
const idb = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k: string) => idb.get(k)),
  set: vi.fn(async (k: string, v: unknown) => void idb.set(k, v)),
  del: vi.fn(async (k: string) => void idb.delete(k)),
  keys: vi.fn(async () => Array.from(idb.keys())),
}));

// ── supabase 클라이언트 mock — upsert 호출을 기록 ──
const UID = '11111111-1111-1111-1111-111111111111';
let upsertCalls: Array<{ table: string; rows: unknown }> = [];
let deleteCalls: Array<{ table: string; id: unknown }> = [];
let updateCalls: Array<{ table: string; row: unknown }> = [];
let failTables = new Set<string>();
const uploadSpy = vi.fn(async () => 'space/frag');
// 내려받기용 서버 테이블 데이터(테스트가 채움).
let tableRows: Record<string, Record<string, unknown>[]> = { spaces: [], space_members: [], fragments: [] };

vi.mock('./supabase', () => ({
  isCloudEnabled: () => true,
  getSupabase: () => ({
    auth: {
      getUser: async () => ({ data: { user: { id: UID } }, error: null }),
    },
    from: (table: string) => ({
      insert: async (rows: unknown) => {
        upsertCalls.push({ table, rows });
        return { error: failTables.has(table) ? { code: 'XXXXX', message: 'fail' } : null };
      },
      select: () => {
        const exec = (filters: Record<string, unknown>) => {
          let rows = tableRows[table] ?? [];
          for (const [col, val] of Object.entries(filters)) rows = rows.filter((r) => r[col] === val);
          return Promise.resolve({ data: rows, error: null });
        };
        const filters: Record<string, unknown> = {};
        return {
          eq: (col: string, val: unknown) => {
            filters[col] = val;
            return exec(filters);
          },
          in: async (_col: string, _vals: unknown[]) => ({ data: tableRows[table] ?? [], error: null }),
          then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => exec(filters).then(res, rej),
        };
      },
      delete: () => ({
        eq: async (_col: string, val: unknown) => {
          deleteCalls.push({ table, id: val });
          return { error: failTables.has(`${table}:delete`) ? { code: 'X', message: 'fail' } : null };
        },
      }),
      update: (row: unknown) => ({
        eq: async (_col: string, _val: unknown) => {
          updateCalls.push({ table, row });
          return { error: failTables.has(`${table}:update`) ? { code: 'X', message: 'fail' } : null };
        },
      }),
    }),
  }),
}));
vi.mock('./auth', () => ({ ensureAnonymousSession: async () => UID }));
vi.mock('./remoteMedia', () => ({
  uploadMedia: (...a: unknown[]) => uploadSpy(...(a as [])),
  downloadMedia: async () => new Blob(['x']),
}));
vi.mock('./mediaStore', () => ({
  loadMediaBlob: async () => new Blob(['x']),
  saveMedia: async () => 'blob:pulled',
}));

import { flush, pullFromCloud, enqueueDelete, enqueueUpdate, resetBackoff } from './syncEngine';
import { useFragmentStore } from './fragmentStore';
import { useSpaceStore } from './spaceStore';
import type { Fragment } from '../types/fragment';
import type { Space } from '../types/space';

function frag(id: string, patch: Partial<Fragment> = {}): Fragment {
  return {
    id, type: 'text', title: id,
    capturedAt: '2026-05-28T10:00:00', dayDate: '2026-05-28',
    spaceId: 'personal', authorId: UID, ...patch,
  };
}

const personalSpace: Space = {
  id: 'personal', name: '내 결', isPersonal: true, createdBy: UID,
  createdAt: '2026-05-20T00:00:00',
  members: [{ userId: UID, displayName: '나', role: 'owner', joinedAt: '2026-05-20T00:00:00' }],
};

beforeEach(() => {
  idb.clear();
  upsertCalls = [];
  deleteCalls = [];
  updateCalls = [];
  failTables = new Set();
  tableRows = { spaces: [], space_members: [], fragments: [] };
  uploadSpy.mockClear();
  resetBackoff();
  useSpaceStore.setState({
    spaces: [personalSpace], invites: [],
    activeSpaceId: 'personal', viewSpaceId: 'all', hydrated: true,
  });
  useFragmentStore.setState({ fragments: [], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
});

function fragmentUpserts() {
  return upsertCalls.filter((c) => c.table === 'fragments');
}

describe('flush', () => {
  it('내 결을 upsert하고 보내는 중 표시를 해제한다', async () => {
    useFragmentStore.setState({ fragments: [frag('a')], pendingIds: new Set(['a']), recentlyAddedId: null, hydrated: true });
    await flush();
    expect(fragmentUpserts()).toHaveLength(1);
    expect(useFragmentStore.getState().pendingIds.has('a')).toBe(false);
  });

  it("개인 공간 id를 사용자 uid로 고정해 올린다", async () => {
    useFragmentStore.setState({ fragments: [frag('a')], pendingIds: new Set(['a']), recentlyAddedId: null, hydrated: true });
    await flush();
    const row = fragmentUpserts()[0].rows as { space_id: string };
    expect(row.space_id).toBe(UID); // 'personal' → uid
    // 공간 행도 같은 id(uid) + created_by=uid 로 올라간다.
    const spaceRow = upsertCalls.find((c) => c.table === 'spaces')!.rows as { id: string; created_by: string };
    expect(spaceRow.id).toBe(UID);
    expect(spaceRow.created_by).toBe(UID);
  });

  it('이미 올라간 결은 다시 올리지 않는다', async () => {
    useFragmentStore.setState({ fragments: [frag('a')], pendingIds: new Set(['a']), recentlyAddedId: null, hydrated: true });
    await flush();
    await flush(); // 두 번째 사이클
    expect(fragmentUpserts()).toHaveLength(1);
  });

  it('공유 공간에서 타인이 작성한 결은 올리지 않는다', async () => {
    // 공유 공간(개인 공간이 아님)에서는 author 강제 치환을 하지 않으므로 타인 결은 건너뛴다.
    useFragmentStore.setState({
      fragments: [frag('a', { authorId: 'someone-else', spaceId: 'shared-1' })],
      pendingIds: new Set(), recentlyAddedId: null, hydrated: true,
    });
    await flush();
    expect(fragmentUpserts()).toHaveLength(0);
  });

  it('미디어가 있으면 먼저 업로드하고 media_path를 채운다', async () => {
    useFragmentStore.setState({ fragments: [frag('a', { type: 'photo', hasLocalMedia: true })], pendingIds: new Set(['a']), recentlyAddedId: null, hydrated: true });
    await flush();
    expect(uploadSpy).toHaveBeenCalledTimes(1);
    const row = fragmentUpserts()[0].rows as { media_path: string | null };
    expect(row.media_path).toBe('space/frag');
  });

  it('upsert 실패 시 보내는 중으로 남기고 즉시 재시도하지 않는다(백오프)', async () => {
    failTables = new Set(['fragments']);
    useFragmentStore.setState({ fragments: [frag('a')], pendingIds: new Set(['a']), recentlyAddedId: null, hydrated: true });
    await flush();
    expect(useFragmentStore.getState().pendingIds.has('a')).toBe(true);
    const firstTry = fragmentUpserts().length;
    await flush(); // 백오프로 막혀 재시도 안 함
    expect(fragmentUpserts().length).toBe(firstTry);
  });
});

function serverFrag(id: string, patch: Record<string, unknown> = {}) {
  return {
    id, space_id: UID, author_id: UID, type: 'text', media_path: null,
    text_content: null, title: id, captured_at: '2026-05-28T10:00:00',
    day_date: '2026-05-28', backfilled: false, ...patch,
  };
}

describe('pullFromCloud', () => {
  it('서버 결을 로컬에 추가하고 개인 공간(space_id=uid)을 personal로 매핑한다', async () => {
    tableRows.fragments = [serverFrag('srv-1', { title: '서버결' })];
    useFragmentStore.setState({ fragments: [], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    await pullFromCloud();
    const f = useFragmentStore.getState().fragments.find((x) => x.id === 'srv-1');
    expect(f).toBeTruthy();
    expect(f!.spaceId).toBe('personal');
  });

  it('이미 로컬에 있는 결은 서버 것으로 덮어쓰지 않는다(원본 보존)', async () => {
    tableRows.fragments = [serverFrag('a', { title: '서버판' })];
    useFragmentStore.setState({ fragments: [frag('a', { title: '로컬판' })], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    await pullFromCloud();
    expect(useFragmentStore.getState().fragments.find((x) => x.id === 'a')!.title).toBe('로컬판');
  });

  it('미디어는 지연 로드 — media_path만 보관하고 즉시 받지 않는다', async () => {
    tableRows.fragments = [serverFrag('m-1', { type: 'photo', media_path: `${UID}/m-1` })];
    useFragmentStore.setState({ fragments: [], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    await pullFromCloud();
    const f = useFragmentStore.getState().fragments.find((x) => x.id === 'm-1')!;
    expect(f.mediaPath).toBe(`${UID}/m-1`);
    expect(f.hasLocalMedia).toBeFalsy(); // 화면에 보일 때 useMediaUrl이 받음
  });

  it('삭제 전파: 올렸던 결이 서버에 없으면 로컬에서도 제거한다', async () => {
    // 'a'는 이전에 동기화됨(synced), 서버엔 없음 → 제거. 'b'는 서버에 있음 → 유지.
    idb.set('gyeol:synced-frag-ids:v1', ['a']);
    tableRows.fragments = [serverFrag('b')];
    useFragmentStore.setState({
      fragments: [frag('a'), frag('b')], pendingIds: new Set(), recentlyAddedId: null, hydrated: true,
    });
    await pullFromCloud();
    const ids = useFragmentStore.getState().fragments.map((f) => f.id);
    expect(ids).toContain('b');
    expect(ids).not.toContain('a');
  });

  it('삭제 전파: 아직 안 올린 로컬 결은 서버에 없어도 지우지 않는다', async () => {
    // 'c'는 synced 아님(오프라인 캡처) → 서버에 없어도 보존.
    tableRows.fragments = [];
    useFragmentStore.setState({
      fragments: [frag('c')], pendingIds: new Set(['c']), recentlyAddedId: null, hydrated: true,
    });
    await pullFromCloud();
    expect(useFragmentStore.getState().fragments.map((f) => f.id)).toContain('c');
  });
});

describe('enqueueDelete + flush', () => {
  it('대기열의 결을 서버에서 삭제한다', async () => {
    await enqueueDelete({ id: 'gone', spaceId: 'personal' });
    await flush();
    expect(deleteCalls.some((d) => d.table === 'fragments' && d.id === 'gone')).toBe(true);
  });

  it('삭제 실패 시 대기열에 남겨 재시도한다(백오프)', async () => {
    failTables = new Set(['fragments:delete']);
    await enqueueDelete({ id: 'gone', spaceId: 'personal' });
    await flush();
    const first = deleteCalls.length;
    await flush(); // 백오프로 막혀 재시도 안 함
    expect(deleteCalls.length).toBe(first);
  });
});

describe('enqueueUpdate + flush', () => {
  it('이미 올린 결의 수정을 서버에 반영한다', async () => {
    idb.set('gyeol:synced-frag-ids:v1', ['a']); // 이미 서버에 있음
    useFragmentStore.setState({
      fragments: [frag('a', { title: '고친 제목' })], pendingIds: new Set(), recentlyAddedId: null, hydrated: true,
    });
    await enqueueUpdate('a');
    await flush();
    const call = updateCalls.find((c) => c.table === 'fragments');
    expect(call).toBeTruthy();
    expect((call!.row as { title: string }).title).toBe('고친 제목');
  });

  it('아직 안 올린 결은 update 대신 insert가 처리한다', async () => {
    // synced 아님 → update 큐에서 제거되고, insert로 올라감.
    useFragmentStore.setState({
      fragments: [frag('b')], pendingIds: new Set(['b']), recentlyAddedId: null, hydrated: true,
    });
    await enqueueUpdate('b');
    await flush();
    expect(updateCalls.find((c) => c.table === 'fragments')).toBeUndefined();
    expect(fragmentUpserts().some((c) => (c.rows as { id: string }).id === 'b')).toBe(true);
  });
});

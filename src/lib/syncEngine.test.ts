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
let failTables = new Set<string>();
const uploadSpy = vi.fn(async () => 'space/frag');

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
    }),
  }),
}));
vi.mock('./auth', () => ({ ensureAnonymousSession: async () => UID }));
vi.mock('./remoteMedia', () => ({ uploadMedia: (...a: unknown[]) => uploadSpy(...(a as [])) }));
vi.mock('./mediaStore', () => ({ loadMediaBlob: async () => new Blob(['x']) }));

import { flush, resetBackoff } from './syncEngine';
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
  failTables = new Set();
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

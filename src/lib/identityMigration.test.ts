import { describe, it, expect, beforeEach, vi } from 'vitest';

// IndexedDB 영속화는 테스트 대상이 아니다 — 메모리 no-op으로 대체.
vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
  keys: vi.fn(async () => []),
}));

// node env엔 window/localStorage가 없으므로 최소 stub을 둔다.
const store = new Map<string, string>();
vi.stubGlobal('window', {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
});

import { useFragmentStore } from './fragmentStore';
import { useSpaceStore } from './spaceStore';
import { useIdentityStore } from './identity';
import { runIdentityMigration } from './identityMigration';
import type { Fragment } from '../types/fragment';
import type { Space } from '../types/space';

const UID = '11111111-1111-1111-1111-111111111111';

function frag(id: string, authorId: string): Fragment {
  return {
    id, type: 'text', title: id,
    capturedAt: '2026-05-28T10:00:00', dayDate: '2026-05-28',
    spaceId: 'personal', authorId,
  };
}

function space(id: string, createdBy: string): Space {
  return {
    id, name: id, isPersonal: id === 'personal', createdBy,
    createdAt: '2026-05-20T00:00:00',
    members: [{ userId: createdBy, displayName: '나', role: 'owner', joinedAt: '2026-05-20T00:00:00' }],
  };
}

beforeEach(() => {
  store.clear();
  useFragmentStore.setState({ fragments: [], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
  useSpaceStore.setState({
    spaces: [space('personal', 'me')], invites: [],
    activeSpaceId: 'personal', viewSpaceId: 'all', hydrated: true,
  });
  useIdentityStore.setState({ user: { id: 'me', displayName: '나' } } as never);
});

describe('remapAuthor', () => {
  it("'me' 결의 authorId만 uid로 바꾸고 개수를 반환한다", () => {
    useFragmentStore.setState({
      fragments: [frag('a', 'me'), frag('b', 'me'), frag('c', 'other')],
      pendingIds: new Set(), recentlyAddedId: null, hydrated: true,
    });
    const n = useFragmentStore.getState().remapAuthor('me', UID);
    expect(n).toBe(2);
    const byId = Object.fromEntries(useFragmentStore.getState().fragments.map((f) => [f.id, f.authorId]));
    expect(byId).toEqual({ a: UID, b: UID, c: 'other' });
  });
});

describe('remapUser', () => {
  it('createdBy·members.userId·invites.invitedBy를 uid로 바꾼다', () => {
    useSpaceStore.setState({
      spaces: [space('personal', 'me'), space('s2', 'other')],
      invites: [{ token: 't', spaceId: 's2', invitedBy: 'me', createdAt: '', expiresAt: '' }],
      activeSpaceId: 'personal', viewSpaceId: 'all', hydrated: true,
    });
    useSpaceStore.getState().remapUser('me', UID);
    const s = useSpaceStore.getState();
    const personal = s.spaces.find((sp) => sp.id === 'personal')!;
    expect(personal.createdBy).toBe(UID);
    expect(personal.members[0].userId).toBe(UID);
    expect(s.spaces.find((sp) => sp.id === 's2')!.createdBy).toBe('other');
    expect(s.invites[0].invitedBy).toBe(UID);
  });
});

describe('runIdentityMigration', () => {
  it("결·공간·정체성을 uid로 전환한다('me' → uid)", () => {
    useFragmentStore.setState({ fragments: [frag('a', 'me')], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    runIdentityMigration(UID);
    expect(useFragmentStore.getState().fragments[0].authorId).toBe(UID);
    expect(useSpaceStore.getState().spaces[0].createdBy).toBe(UID);
    expect(useIdentityStore.getState().user.id).toBe(UID);
  });

  it("다시 호출해도 멱등하며, 뒤늦게 남은 'me' 기록을 흡수한다(자가 치유)", () => {
    useFragmentStore.setState({ fragments: [frag('a', 'me')], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    runIdentityMigration(UID);
    // 이후 새로 생긴 'me' 결도 다음 호출에서 uid로 흡수.
    useFragmentStore.setState({ fragments: [frag('z', 'me')], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    runIdentityMigration(UID);
    expect(useFragmentStore.getState().fragments[0].authorId).toBe(UID);
  });

  it('익명 uid가 바뀌면 이전 uid에 묶인 기록도 새 uid로 재정렬한다', () => {
    const OLD = '22222222-2222-2222-2222-222222222222';
    useSpaceStore.setState({
      spaces: [space('personal', OLD)], invites: [],
      activeSpaceId: 'personal', viewSpaceId: 'all', hydrated: true,
    });
    useFragmentStore.setState({ fragments: [frag('a', OLD)], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    runIdentityMigration(UID);
    expect(useFragmentStore.getState().fragments[0].authorId).toBe(UID);
    expect(useSpaceStore.getState().spaces[0].createdBy).toBe(UID);
    expect(useSpaceStore.getState().spaces[0].members[0].userId).toBe(UID);
  });

  it("uid가 'me'면(클라우드 미설정) 아무 것도 하지 않는다", () => {
    useFragmentStore.setState({ fragments: [frag('a', 'me')], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    runIdentityMigration('me');
    expect(useFragmentStore.getState().fragments[0].authorId).toBe('me');
  });
});

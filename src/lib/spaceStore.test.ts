import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
  keys: vi.fn(async () => []),
}));

import { useSpaceStore } from './spaceStore';
import { useFragmentStore } from './fragmentStore';
import { PERSONAL_SPACE_ID } from '../data/initialSpaces';
import type { Space } from '../types/space';
import type { Fragment } from '../types/fragment';

const personal: Space = {
  id: PERSONAL_SPACE_ID,
  name: '내 결',
  isPersonal: true,
  createdBy: 'me',
  createdAt: '2026-05-20T00:00:00',
  members: [{ userId: 'me', displayName: '나', role: 'owner', joinedAt: '2026-05-20T00:00:00' }],
};

function shared(createdBy: string): Space {
  return {
    id: 's1',
    name: '민지 & 나',
    isPersonal: false,
    createdBy,
    createdAt: '2026-05-22T00:00:00',
    color: '#C9A14A',
    members: [
      { userId: 'me', displayName: '나', role: createdBy === 'me' ? 'owner' : 'member', joinedAt: '2026-05-22T00:00:00' },
      { userId: 'minji', displayName: '민지', role: createdBy === 'minji' ? 'owner' : 'member', joinedAt: '2026-05-22T00:00:00' },
    ],
  };
}

function frag(id: string, spaceId: string, authorId: string): Fragment {
  return {
    id,
    type: 'text',
    title: id,
    capturedAt: '2026-05-28T10:00:00',
    dayDate: '2026-05-28',
    spaceId,
    authorId,
  };
}

function seed(space: Space, fragments: Fragment[]) {
  useSpaceStore.setState({
    spaces: [personal, space],
    invites: [],
    activeSpaceId: PERSONAL_SPACE_ID,
    viewSpaceId: 'all',
    hydrated: true,
  });
  useFragmentStore.setState({
    fragments,
    pendingIds: new Set(),
    recentlyAddedId: null,
    hydrated: true,
  });
}

beforeEach(() => {
  useSpaceStore.setState({
    spaces: [personal],
    invites: [],
    activeSpaceId: PERSONAL_SPACE_ID,
    viewSpaceId: 'all',
    hydrated: true,
  });
  useFragmentStore.setState({ fragments: [], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
});

describe('createSpace', () => {
  it('나를 owner로 하는 공유 공간을 만들고 색을 배정한다', () => {
    const created = useSpaceStore.getState().createSpace('베프방');
    expect(created.isPersonal).toBe(false);
    expect(created.createdBy).toBe('me');
    expect(created.members).toHaveLength(1);
    expect(created.members[0].role).toBe('owner');
    expect(created.color).toBeTruthy();
    expect(useSpaceStore.getState().spaces.some((s) => s.id === created.id)).toBe(true);
  });
});

describe('importSpace', () => {
  it('없는 공간은 그대로 추가한다', () => {
    useSpaceStore.getState().importSpace(shared('minji'));
    expect(useSpaceStore.getState().spaces.some((s) => s.id === 's1')).toBe(true);
  });

  it('같은 id가 이미 있으면 기존 것을 보존한다', () => {
    seed(shared('me'), []);
    const before = useSpaceStore.getState().spaces.find((s) => s.id === 's1');
    useSpaceStore.getState().importSpace({ ...shared('me'), name: '덮어쓰기시도' });
    const after = useSpaceStore.getState().spaces.find((s) => s.id === 's1');
    expect(after).toBe(before);
    expect(after?.name).toBe('민지 & 나');
  });
});

describe('leaveSpace (비-owner)', () => {
  it('내 결은 개인으로 옮기고, 다른 멤버 결은 로컬에서 지우며, 공간을 목록에서 뺀다', () => {
    seed(shared('minji'), [
      frag('mine', 's1', 'me'),
      frag('theirs', 's1', 'minji'),
      frag('home', PERSONAL_SPACE_ID, 'me'),
    ]);

    useSpaceStore.getState().leaveSpace('s1');

    const frags = useFragmentStore.getState().fragments;
    expect(frags.find((f) => f.id === 'mine')?.spaceId).toBe(PERSONAL_SPACE_ID);
    expect(frags.find((f) => f.id === 'theirs')).toBeUndefined();
    expect(frags.find((f) => f.id === 'home')?.spaceId).toBe(PERSONAL_SPACE_ID);
    expect(useSpaceStore.getState().spaces.some((s) => s.id === 's1')).toBe(false);
  });
});

describe('closeSpace (owner)', () => {
  it('내 결은 개인으로, 다른 멤버 결은 제거하고 공간을 닫는다', () => {
    seed(shared('me'), [frag('mine', 's1', 'me'), frag('theirs', 's1', 'minji')]);

    useSpaceStore.getState().closeSpace('s1');

    const frags = useFragmentStore.getState().fragments;
    expect(frags.find((f) => f.id === 'mine')?.spaceId).toBe(PERSONAL_SPACE_ID);
    expect(frags.find((f) => f.id === 'theirs')).toBeUndefined();
    expect(useSpaceStore.getState().spaces.some((s) => s.id === 's1')).toBe(false);
  });

  it('owner가 아니면 아무 것도 하지 않는다', () => {
    seed(shared('minji'), [frag('theirs', 's1', 'minji')]);
    useSpaceStore.getState().closeSpace('s1');
    expect(useSpaceStore.getState().spaces.some((s) => s.id === 's1')).toBe(true);
  });
});

describe('removeMember (owner)', () => {
  it('대상 멤버를 빼고 그 멤버의 결을 로컬에서 제거한다', () => {
    seed(shared('me'), [frag('mine', 's1', 'me'), frag('theirs', 's1', 'minji')]);

    useSpaceStore.getState().removeMember('s1', 'minji');

    const space = useSpaceStore.getState().spaces.find((s) => s.id === 's1');
    expect(space?.members.some((m) => m.userId === 'minji')).toBe(false);
    const frags = useFragmentStore.getState().fragments;
    expect(frags.find((f) => f.id === 'theirs')).toBeUndefined();
    expect(frags.find((f) => f.id === 'mine')).toBeDefined();
  });

  it('자기 자신은 뺄 수 없다', () => {
    seed(shared('me'), []);
    useSpaceStore.getState().removeMember('s1', 'me');
    const space = useSpaceStore.getState().spaces.find((s) => s.id === 's1');
    expect(space?.members.some((m) => m.userId === 'me')).toBe(true);
  });
});

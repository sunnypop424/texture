import { describe, it, expect, beforeEach, vi } from 'vitest';

// IndexedDB 영속화는 테스트 대상이 아니다 — 메모리 no-op으로 대체.
vi.mock('idb-keyval', () => ({
  get: vi.fn(async () => undefined),
  set: vi.fn(async () => undefined),
  del: vi.fn(async () => undefined),
  keys: vi.fn(async () => []),
}));

import { useFragmentStore } from './fragmentStore';
import type { Fragment } from '../types/fragment';

function frag(id: string, patch: Partial<Fragment> = {}): Fragment {
  return {
    id,
    type: 'text',
    title: id,
    capturedAt: '2026-05-28T10:00:00',
    dayDate: '2026-05-28',
    spaceId: 'personal',
    authorId: 'me',
    ...patch,
  };
}

beforeEach(() => {
  useFragmentStore.setState({
    fragments: [],
    pendingIds: new Set(),
    recentlyAddedId: null,
    hydrated: true,
  });
});

describe('add', () => {
  it('맨 앞에 추가하고 기본적으로 pending에 넣는다', () => {
    useFragmentStore.getState().add(frag('a'));
    const s = useFragmentStore.getState();
    expect(s.fragments[0].id).toBe('a');
    expect(s.pendingIds.has('a')).toBe(true);
    expect(s.recentlyAddedId).toBe('a');
  });

  it('pending:false면 pending에 넣지 않는다', () => {
    useFragmentStore.getState().add(frag('b'), { pending: false });
    expect(useFragmentStore.getState().pendingIds.has('b')).toBe(false);
  });
});

describe('importFragments', () => {
  it('이미 있는 id는 건너뛰고 새 결만 추가하며 개수를 반환한다', () => {
    useFragmentStore.setState({ fragments: [frag('a')], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    const added = useFragmentStore.getState().importFragments([frag('a'), frag('b'), frag('c')]);
    expect(added).toBe(2);
    const ids = useFragmentStore.getState().fragments.map((f) => f.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('모두 중복이면 0을 반환하고 상태를 바꾸지 않는다', () => {
    useFragmentStore.setState({ fragments: [frag('a')], pendingIds: new Set(), recentlyAddedId: null, hydrated: true });
    const added = useFragmentStore.getState().importFragments([frag('a')]);
    expect(added).toBe(0);
    expect(useFragmentStore.getState().fragments).toHaveLength(1);
  });

  it('복원된 결은 pending으로 표시하지 않는다', () => {
    useFragmentStore.getState().importFragments([frag('x')]);
    expect(useFragmentStore.getState().pendingIds.has('x')).toBe(false);
  });
});

describe('remove', () => {
  it('해당 결과 pending 표시를 함께 제거한다', () => {
    useFragmentStore.getState().add(frag('a'));
    useFragmentStore.getState().remove('a');
    const s = useFragmentStore.getState();
    expect(s.fragments).toHaveLength(0);
    expect(s.pendingIds.has('a')).toBe(false);
  });
});

describe('markSynced', () => {
  it('pending에서 빼낸다', () => {
    useFragmentStore.getState().add(frag('a'));
    useFragmentStore.getState().markSynced('a');
    expect(useFragmentStore.getState().pendingIds.has('a')).toBe(false);
  });
});

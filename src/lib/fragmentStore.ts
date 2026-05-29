import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { PERSONAL_SPACE_ID } from '../data/initialSpaces';
import { loadMediaUrl, removeMedia } from './mediaStore';
import type { Fragment } from '../types/fragment';

// v3: 가상/시드 데이터를 전부 제거하며 이전 캐시(가짜 결 포함)를 폐기. 네임스페이스도 gyeol:로 통일.
const STORAGE_KEY = 'gyeol:fragments:v3';

interface FragmentStoreState {
  fragments: Fragment[];
  pendingIds: Set<string>;
  recentlyAddedId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (f: Fragment, options?: { pending?: boolean }) => void;
  /** 백업 복원용 — 이미 있는 id는 건너뛰고 새 결만 추가. 추가된 개수를 반환. */
  importFragments: (incoming: Fragment[]) => number;
  update: (id: string, patch: Partial<Omit<Fragment, 'id'>>) => void;
  remove: (id: string) => void;
  markSynced: (id: string) => void;
  /** 익명 세션 확보 시 'me'로 남긴 결의 authorId를 실제 uid로 일괄 치환. 변경 개수 반환. */
  remapAuthor: (oldId: string, newId: string) => number;
  clearRecent: () => void;
}

function persist(fragments: Fragment[]): void {
  void idbSet(STORAGE_KEY, fragments).catch((err) => {
    console.warn('fragment persist failed', err);
  });
}

function migrate(
  f: Fragment | (Omit<Fragment, 'spaceId' | 'authorId'> & { spaceId?: string; authorId?: string; hasLocalMedia?: boolean }),
): Fragment {
  const out = {
    ...f,
    spaceId: f.spaceId ?? PERSONAL_SPACE_ID,
    authorId: f.authorId ?? 'me',
  } as Fragment;
  // 이전 세션의 stale blob URL은 무효 — 비움
  if (out.thumbUrl && out.thumbUrl.startsWith('blob:') && !out.hasLocalMedia) {
    out.thumbUrl = undefined;
  }
  return out;
}

export const useFragmentStore = create<FragmentStoreState>((set, get) => ({
  fragments: [],
  pendingIds: new Set(),
  recentlyAddedId: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const stored = await idbGet<Fragment[]>(STORAGE_KEY);
      let fragments: Fragment[];

      if (stored && Array.isArray(stored) && stored.length > 0) {
        fragments = stored.map(migrate);
        const needsRepersist = stored.some(
          (f) => !f.spaceId || !f.authorId || (f.thumbUrl && f.thumbUrl.startsWith('blob:') && !f.hasLocalMedia),
        );
        if (needsRepersist) persist(fragments);
      } else {
        // 항상 빈 상태에서 시작 — 가상/시드 데이터 없음.
        fragments = [];
        persist(fragments);
      }

      // 로컬 미디어 보유 fragment들의 신선한 object URL 복원
      const withMedia = fragments.filter((f) => f.hasLocalMedia);
      if (withMedia.length > 0) {
        const results = await Promise.all(
          withMedia.map(async (f) => ({ id: f.id, url: await loadMediaUrl(f.id) })),
        );
        const urlMap = new Map(results.map((r) => [r.id, r.url] as const));
        fragments = fragments.map((f) => {
          if (!f.hasLocalMedia) return f;
          const url = urlMap.get(f.id);
          if (url) return { ...f, thumbUrl: url };
          return { ...f, hasLocalMedia: false, thumbUrl: undefined };
        });
      }

      set({ fragments, hydrated: true });
    } catch (err) {
      console.warn('hydrate failed', err);
      set({ fragments: [], hydrated: true });
    }
  },

  add: (f, options) => {
    set((s) => {
      const fragments = [f, ...s.fragments];
      const pendingIds = new Set(s.pendingIds);
      if (options?.pending !== false) pendingIds.add(f.id);
      persist(fragments);
      return { fragments, pendingIds, recentlyAddedId: f.id };
    });
  },

  importFragments: (incoming) => {
    const existing = new Set(get().fragments.map((f) => f.id));
    const fresh = incoming
      .filter((f) => f && f.id && !existing.has(f.id))
      .map(migrate);
    if (fresh.length === 0) return 0;
    set((s) => {
      const fragments = [...fresh, ...s.fragments];
      persist(fragments);
      return { fragments };
    });
    return fresh.length;
  },

  update: (id, patch) => {
    set((s) => {
      const fragments = s.fragments.map((f) => (f.id === id ? { ...f, ...patch } : f));
      persist(fragments);
      return { fragments };
    });
  },

  remove: (id) => {
    const removed = get().fragments.find((f) => f.id === id);
    set((s) => {
      const fragments = s.fragments.filter((f) => f.id !== id);
      const pendingIds = new Set(s.pendingIds);
      pendingIds.delete(id);
      persist(fragments);
      return { fragments, pendingIds };
    });
    if (removed?.hasLocalMedia) {
      void removeMedia(id);
    }
  },

  markSynced: (id) => {
    set((s) => {
      if (!s.pendingIds.has(id)) return s;
      const pendingIds = new Set(s.pendingIds);
      pendingIds.delete(id);
      return { pendingIds };
    });
  },

  remapAuthor: (oldId, newId) => {
    if (oldId === newId) return 0;
    let changed = 0;
    set((s) => {
      const fragments = s.fragments.map((f) => {
        if (f.authorId !== oldId) return f;
        changed += 1;
        return { ...f, authorId: newId };
      });
      if (changed === 0) return s;
      persist(fragments);
      return { fragments };
    });
    return changed;
  },

  clearRecent: () => set({ recentlyAddedId: null }),
}));

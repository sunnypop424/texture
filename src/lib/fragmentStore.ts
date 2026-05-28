import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import { initialFragments } from '../data/mockFragments';
import { PERSONAL_SPACE_ID } from '../data/initialSpaces';
import { loadMediaUrl, removeMedia } from './mediaStore';
import type { Fragment } from '../types/fragment';

const STORAGE_KEY = 'jogak:fragments:v1';

interface FragmentStoreState {
  fragments: Fragment[];
  pendingIds: Set<string>;
  recentlyAddedId: string | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  add: (f: Fragment, options?: { pending?: boolean }) => void;
  update: (id: string, patch: Partial<Omit<Fragment, 'id'>>) => void;
  remove: (id: string) => void;
  markSynced: (id: string) => void;
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
        fragments = initialFragments;
        persist(initialFragments);
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
      set({ fragments: initialFragments, hydrated: true });
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

  clearRecent: () => set({ recentlyAddedId: null }),
}));

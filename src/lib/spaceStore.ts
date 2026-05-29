import { create } from 'zustand';
import { get as idbGet, set as idbSet } from 'idb-keyval';
import {
  initialSpaces,
  PERSONAL_SPACE_ID,
  ALL_SPACES_ID,
  pickNextHue,
} from '../data/initialSpaces';
import { getCurrentUser } from './identity';
import { useFragmentStore } from './fragmentStore';
import type { Space, SpaceMember, Invite, User } from '../types/space';

// v2: 가상 공유 공간('민지 & 나')·가짜 Plus 시드를 제거하며 이전 캐시를 폐기.
const SPACES_KEY = 'gyeol:spaces:v2';
const INVITES_KEY = 'gyeol:invites:v2';
const ACTIVE_KEY = 'gyeol:active-space:v2';

function persistSpaces(spaces: Space[]): void {
  void idbSet(SPACES_KEY, spaces).catch((err) => console.warn('space persist failed', err));
}

function persistInvites(invites: Invite[]): void {
  void idbSet(INVITES_KEY, invites).catch((err) => console.warn('invite persist failed', err));
}

function persistActive(id: string): void {
  try {
    window.localStorage.setItem(ACTIVE_KEY, id);
  } catch {
    // ignore
  }
}

function readActive(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

function randomToken(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 10)
  );
}

interface SpaceStoreState {
  spaces: Space[];
  invites: Invite[];
  /** Today 페이지의 캡처 대상 공간 */
  activeSpaceId: string;
  /** Calendar/Lookback 의 회고 렌즈. ALL_SPACES_ID이면 '내가 작성한 결 전체' */
  viewSpaceId: string;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  setActiveSpace: (id: string) => void;
  setViewSpace: (id: string) => void;
  createSpace: (name: string) => Space;
  /** 백업 복원용 — 같은 id의 공간이 없을 때만 그대로 추가. 이미 있으면 기존 것을 보존. */
  importSpace: (space: Space) => void;
  updateMemberDisplayName: (userId: string, name: string) => void;
  joinSpace: (spaceId: string, user: User) => void;
  generateInvite: (spaceId: string) => Invite;
  acceptInvite: (token: string, user: User) => Space | null;
  getInvite: (token: string) => Invite | null;
  getActiveSpace: () => Space | null;
  /** 내가 이 공간을 떠남. 내 결은 personal로 이동, 다른 멤버 결은 로컬에서 제거(RLS 모사). owner면 closeSpace로 위임. */
  leaveSpace: (spaceId: string) => void;
  /** owner만 호출 가능. 공간 삭제 + 내 결 personal 이동 + 다른 멤버 결 로컬 제거 + 초대 무효화. */
  closeSpace: (spaceId: string) => void;
  /** owner만 호출 가능. 다른 멤버를 공간에서 뺌. 그 멤버 결은 로컬에서 제거(실제로는 그 디바이스에서 personal로 이동). */
  removeMember: (spaceId: string, userId: string) => void;
}

export const useSpaceStore = create<SpaceStoreState>((set, get) => ({
  spaces: [],
  invites: [],
  activeSpaceId: PERSONAL_SPACE_ID,
  viewSpaceId: ALL_SPACES_ID,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    try {
      const storedSpaces = await idbGet<Space[]>(SPACES_KEY);
      const storedInvites = await idbGet<Invite[]>(INVITES_KEY);
      const active = readActive() ?? PERSONAL_SPACE_ID;

      if (storedSpaces && Array.isArray(storedSpaces) && storedSpaces.length > 0) {
        const validActive = storedSpaces.some((s) => s.id === active)
          ? active
          : PERSONAL_SPACE_ID;
        // 마이그레이션: 색 없거나 중복인 공유 공간을 progressively 재할당
        const migrated: Space[] = [];
        let needsRepersist = false;
        for (const s of storedSpaces) {
          if (s.isPersonal) {
            migrated.push(s);
            continue;
          }
          const isDuplicate =
            !!s.color && migrated.some((m) => m.color === s.color);
          if (!s.color || isDuplicate) {
            needsRepersist = true;
            migrated.push({ ...s, color: pickNextHue(migrated) });
          } else {
            migrated.push(s);
          }
        }
        if (needsRepersist) persistSpaces(migrated);
        set({
          spaces: migrated,
          invites: storedInvites ?? [],
          activeSpaceId: validActive,
          hydrated: true,
        });
      } else {
        // 항상 개인 공간 하나로 시작 — 가상 공유 공간·플랜 없음.
        set({
          spaces: initialSpaces,
          invites: [],
          activeSpaceId: active,
          hydrated: true,
        });
        persistSpaces(initialSpaces);
      }
    } catch (err) {
      console.warn('space hydrate failed', err);
      set({
        spaces: initialSpaces,
        invites: [],
        activeSpaceId: PERSONAL_SPACE_ID,
        hydrated: true,
      });
    }
  },

  setActiveSpace: (id) => {
    set({ activeSpaceId: id });
    persistActive(id);
  },

  setViewSpace: (id) => {
    set({ viewSpaceId: id });
  },

  createSpace: (name) => {
    const me = getCurrentUser();
    const now = new Date().toISOString();
    const color = pickNextHue(get().spaces);
    const newSpace: Space = {
      id: `space-${Date.now()}`,
      name,
      isPersonal: false,
      createdBy: me.id,
      createdAt: now,
      color,
      members: [
        { userId: me.id, displayName: me.displayName, role: 'owner', joinedAt: now },
      ],
    };
    set((s) => {
      const spaces = [...s.spaces, newSpace];
      persistSpaces(spaces);
      return { spaces };
    });
    return newSpace;
  },

  importSpace: (space) => {
    if (!space || !space.id) return;
    set((s) => {
      if (s.spaces.some((sp) => sp.id === space.id)) return s;
      const spaces = [...s.spaces, space];
      persistSpaces(spaces);
      return { spaces };
    });
  },

  updateMemberDisplayName: (userId, name) => {
    set((s) => {
      let changed = false;
      const spaces = s.spaces.map((sp) => {
        const members = sp.members.map((m) => {
          if (m.userId !== userId || m.displayName === name) return m;
          changed = true;
          return { ...m, displayName: name };
        });
        return { ...sp, members };
      });
      if (!changed) return s;
      persistSpaces(spaces);
      return { spaces };
    });
  },

  joinSpace: (spaceId, user) => {
    set((s) => {
      const spaces = s.spaces.map((sp) => {
        if (sp.id !== spaceId) return sp;
        if (sp.members.some((m) => m.userId === user.id)) return sp;
        const newMember: SpaceMember = {
          userId: user.id,
          displayName: user.displayName,
          role: 'member',
          joinedAt: new Date().toISOString(),
        };
        return { ...sp, members: [...sp.members, newMember] };
      });
      persistSpaces(spaces);
      return { spaces };
    });
  },

  generateInvite: (spaceId) => {
    const me = getCurrentUser();
    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7일
    const invite: Invite = {
      token: randomToken(),
      spaceId,
      invitedBy: me.id,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    };
    set((s) => {
      const invites = [...s.invites, invite];
      persistInvites(invites);
      return { invites };
    });
    return invite;
  },

  acceptInvite: (token, user) => {
    const invite = get().invites.find((i) => i.token === token);
    if (!invite) return null;
    if (new Date(invite.expiresAt).getTime() < Date.now()) return null;
    const space = get().spaces.find((s) => s.id === invite.spaceId);
    if (!space) return null;

    set((s) => {
      const invites = s.invites.map((i) =>
        i.token === token ? { ...i, acceptedBy: user.id } : i,
      );
      persistInvites(invites);
      return { invites };
    });

    get().joinSpace(invite.spaceId, user);
    return space;
  },

  getInvite: (token) => get().invites.find((i) => i.token === token) ?? null,

  getActiveSpace: () => {
    const { spaces, activeSpaceId } = get();
    return spaces.find((s) => s.id === activeSpaceId) ?? null;
  },

  leaveSpace: (spaceId) => {
    const me = getCurrentUser();
    const space = get().spaces.find((s) => s.id === spaceId);
    if (!space || space.isPersonal) return;

    // Owner가 떠남 → 자동으로 공간 닫기
    if (space.createdBy === me.id) {
      get().closeSpace(spaceId);
      return;
    }

    const fragStore = useFragmentStore.getState();
    const inSpace = fragStore.fragments.filter((f) => f.spaceId === spaceId);
    // 내 결: personal로 이동
    for (const f of inSpace) {
      if (f.authorId === me.id) {
        fragStore.update(f.id, { spaceId: PERSONAL_SPACE_ID });
      } else {
        // 다른 멤버 결: 로컬에서 제거 (RLS — 더 이상 접근 권한 없음)
        fragStore.remove(f.id);
      }
    }

    // 공간 자체 제거 (떠난 뒤 더 이상 보이면 안 됨) + 그 공간 초대 무효화
    const spaces = get().spaces.filter((s) => s.id !== spaceId);
    const invites = get().invites.filter((i) => i.spaceId !== spaceId);
    set({ spaces, invites });
    persistSpaces(spaces);
    persistInvites(invites);

    if (get().activeSpaceId === spaceId) get().setActiveSpace(PERSONAL_SPACE_ID);
    if (get().viewSpaceId === spaceId) get().setViewSpace(ALL_SPACES_ID);
  },

  closeSpace: (spaceId) => {
    const me = getCurrentUser();
    const space = get().spaces.find((s) => s.id === spaceId);
    if (!space || space.isPersonal) return;
    if (space.createdBy !== me.id) return; // owner만

    const fragStore = useFragmentStore.getState();
    const inSpace = fragStore.fragments.filter((f) => f.spaceId === spaceId);
    for (const f of inSpace) {
      if (f.authorId === me.id) {
        fragStore.update(f.id, { spaceId: PERSONAL_SPACE_ID });
      } else {
        // mock 한계 — 실 백엔드에선 각 멤버 디바이스에서 personal로 이동
        fragStore.remove(f.id);
      }
    }

    const spaces = get().spaces.filter((s) => s.id !== spaceId);
    const invites = get().invites.filter((i) => i.spaceId !== spaceId);
    set({ spaces, invites });
    persistSpaces(spaces);
    persistInvites(invites);

    if (get().activeSpaceId === spaceId) get().setActiveSpace(PERSONAL_SPACE_ID);
    if (get().viewSpaceId === spaceId) get().setViewSpace(ALL_SPACES_ID);
  },

  removeMember: (spaceId, userId) => {
    const me = getCurrentUser();
    const space = get().spaces.find((s) => s.id === spaceId);
    if (!space || space.isPersonal) return;
    if (space.createdBy !== me.id) return; // owner만
    if (userId === me.id) return; // 자기 자신은 leaveSpace로

    // 빠진 멤버 결은 로컬에서 제거 (실 백엔드에선 그 디바이스에서 personal로 이동)
    const fragStore = useFragmentStore.getState();
    const theirs = fragStore.fragments.filter(
      (f) => f.spaceId === spaceId && f.authorId === userId,
    );
    for (const f of theirs) {
      fragStore.remove(f.id);
    }

    const updated: Space = {
      ...space,
      members: space.members.filter((m) => m.userId !== userId),
    };
    const spaces = get().spaces.map((s) => (s.id === spaceId ? updated : s));
    set({ spaces });
    persistSpaces(spaces);
  },
}));

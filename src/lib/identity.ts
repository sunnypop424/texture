import { create } from 'zustand';
import type { User } from '../types/space';

const KEY = 'gyeol:identity:v1';
const UID_KEY = 'gyeol:auth-uid:v1';

/** 인증 전(또는 클라우드 미설정) 임시 id. 익명 세션이 확보되면 실제 uid로 치환된다. */
export const LOCAL_USER_ID = 'me';

export const DEFAULT_USER: User = {
  id: LOCAL_USER_ID,
  displayName: '나',
};

function readUid(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(UID_KEY);
  } catch {
    return null;
  }
}

function readIdentity(): User {
  if (typeof window === 'undefined') return DEFAULT_USER;
  let displayName = DEFAULT_USER.displayName;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<User>;
      if (parsed && typeof parsed.displayName === 'string') {
        displayName = parsed.displayName;
      }
    }
  } catch {
    // ignore
  }
  // uid가 확보돼 있으면 그것을 정체성 id로 사용(없으면 'me' fallback).
  return { id: readUid() ?? LOCAL_USER_ID, displayName };
}

function writeIdentity(user: User): void {
  try {
    // displayName만 저장 — id는 UID_KEY가 별도로 관리한다.
    window.localStorage.setItem(KEY, JSON.stringify({ displayName: user.displayName }));
  } catch {
    // ignore (private mode, quota)
  }
}

function writeUid(uid: string): void {
  try {
    window.localStorage.setItem(UID_KEY, uid);
  } catch {
    // ignore
  }
}

interface IdentityState {
  user: User;
  setDisplayName: (name: string) => void;
  /** 익명 세션 uid를 확보했을 때 호출 — 정체성 id를 'me'에서 실제 uid로 전환. */
  setAuthUser: (uid: string) => void;
}

export const useIdentityStore = create<IdentityState>((set) => ({
  user: readIdentity(),
  setDisplayName: (name) => {
    set((s) => {
      const next: User = { ...s.user, displayName: name };
      writeIdentity(next);
      return { user: next };
    });
  },
  setAuthUser: (uid) => {
    set((s) => {
      if (s.user.id === uid) return s;
      writeUid(uid);
      return { user: { ...s.user, id: uid } };
    });
  },
}));

/**
 * Non-React 호출자(스토어 액션, 캡처 핸들러 등)를 위한 보조 함수.
 * 항상 store의 최신 값을 반환.
 */
export function getCurrentUser(): User {
  return useIdentityStore.getState().user;
}

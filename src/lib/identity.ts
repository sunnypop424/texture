import { create } from 'zustand';
import type { User } from '../types/space';

const KEY = 'gyeol:identity:v1';

export const DEFAULT_USER: User = {
  id: 'me',
  displayName: '나',
};

function readIdentity(): User {
  if (typeof window === 'undefined') return DEFAULT_USER;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_USER;
    const parsed = JSON.parse(raw) as Partial<User>;
    if (parsed && typeof parsed.id === 'string' && typeof parsed.displayName === 'string') {
      return { id: parsed.id, displayName: parsed.displayName };
    }
    return DEFAULT_USER;
  } catch {
    return DEFAULT_USER;
  }
}

function writeIdentity(user: User): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(user));
  } catch {
    // ignore (private mode, quota)
  }
}

interface IdentityState {
  user: User;
  setDisplayName: (name: string) => void;
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
}));

/**
 * Non-React 호출자(스토어 액션, 캡처 핸들러 등)를 위한 보조 함수.
 * 항상 store의 최신 값을 반환.
 */
export function getCurrentUser(): User {
  return useIdentityStore.getState().user;
}

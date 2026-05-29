import { create } from 'zustand';

/**
 * 전역 토스트 — 화면을 떠난 직후(예: 결을 비우고 뒤로 가기)에도 다독임이 남도록
 * 라우트 최상단(RootLayout)에서 한 번만 렌더한다. 페이지 지역 토스트와 달리
 * 네비게이션으로 컴포넌트가 사라져도 메시지가 유지된다.
 */
interface ToastState {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  clear: () => set({ message: null }),
}));

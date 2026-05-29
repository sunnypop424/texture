import { useEffect } from 'react';
import { useFragmentStore } from './fragmentStore';
import { useOnlineStatus } from './useOnlineStatus';
import { isCloudEnabled } from './supabase';
import { flush, requestSync, resetBackoff } from './syncEngine';

const POLL_MS = 30_000;

/**
 * 동기화 엔진을 앱 수명 동안 구동한다(이전의 useSyncSimulation 대체).
 *
 * 트리거: 부팅 직후 1회 · online 복귀 · 새 결/공간 추가(pendingIds 변화) ·
 * 긴 간격 폴링(놓친 항목 회수). 클라우드 미설정이면 아무 일도 하지 않아
 * 앱은 순수 로컬로 동작한다.
 */
export function useSync(): void {
  const online = useOnlineStatus();
  const pendingSize = useFragmentStore((s) => s.pendingIds.size);

  // 부팅 · online 복귀 · pending 변화 시 동기화 요청.
  useEffect(() => {
    if (!isCloudEnabled() || !online) return;
    resetBackoff(); // 끊겼다 돌아왔거나 새 결이 생겼으니 백오프 해제 후 즉시 시도
    requestSync();
  }, [online, pendingSize]);

  // 놓친 항목 회수용 폴링.
  useEffect(() => {
    if (!isCloudEnabled()) return;
    const iv = window.setInterval(() => {
      if (navigator.onLine) void flush();
    }, POLL_MS);
    return () => window.clearInterval(iv);
  }, []);
}

import { useEffect } from 'react';
import { useFragmentStore } from './fragmentStore';
import { useSpaceStore } from './spaceStore';
import { useOnlineStatus } from './useOnlineStatus';
import { isCloudEnabled } from './supabase';
import { flush, requestSync, resetBackoff, pullFromCloud } from './syncEngine';

const POLL_MS = 30_000;

/**
 * 동기화 엔진을 앱 수명 동안 구동한다(이전의 useSyncSimulation 대체).
 *
 * 올리기 트리거: 부팅 · online 복귀 · 새 결/공간(pendingIds 변화) · 긴 폴링.
 * 내려받기 트리거: 앱이 다시 보일 때(focus/visibility) · 공간 전환 시 — 비동기 공유라
 * "앱을 열거나 공간을 열 때" 최신을 반영한다.
 * 클라우드 미설정이면 아무 일도 하지 않아 앱은 순수 로컬로 동작한다.
 */
export function useSync(): void {
  const online = useOnlineStatus();
  const pendingSize = useFragmentStore((s) => s.pendingIds.size);
  const activeSpaceId = useSpaceStore((s) => s.activeSpaceId);

  // 올리기: 부팅 · online 복귀 · pending 변화.
  useEffect(() => {
    if (!isCloudEnabled() || !online) return;
    resetBackoff();
    requestSync();
  }, [online, pendingSize]);

  // 내려받기: 공간 전환 시 그 시점의 최신을 반영(부팅 시에도 1회).
  useEffect(() => {
    if (!isCloudEnabled()) return;
    void pullFromCloud();
  }, [activeSpaceId]);

  // 내려받기: 앱이 다시 보일 때(다른 탭/앱에서 돌아옴) 최신 반영.
  useEffect(() => {
    if (!isCloudEnabled()) return;
    const onVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void pullFromCloud();
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // 놓친 항목 회수용 폴링.
  useEffect(() => {
    if (!isCloudEnabled()) return;
    const iv = window.setInterval(() => {
      if (navigator.onLine) void flush();
    }, POLL_MS);
    return () => window.clearInterval(iv);
  }, []);
}

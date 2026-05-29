import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TabBar } from '../components/TabBar';
import { SoftBar } from '../components/SoftBar';
import { Toast } from '../components/Toast';
import { useToastStore } from '../lib/toastStore';
import { useFragmentStore } from '../lib/fragmentStore';
import { useSpaceStore } from '../lib/spaceStore';
import { useIdentityStore, getCurrentUser } from '../lib/identity';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { useSync } from '../lib/useSync';
import { requestSync } from '../lib/syncEngine';
import { isCloudEnabled } from '../lib/supabase';
import { ensureAnonymousSession, upsertProfile } from '../lib/auth';
import { runIdentityMigration } from '../lib/identityMigration';

export function RootLayout() {
  const hydrateFragments = useFragmentStore((s) => s.hydrate);
  const hydrateSpaces = useSpaceStore((s) => s.hydrate);
  const fragmentsReady = useFragmentStore((s) => s.hydrated);
  const spacesReady = useSpaceStore((s) => s.hydrated);
  const setAuthUser = useIdentityStore((s) => s.setAuthUser);
  const online = useOnlineStatus();
  useSync();

  useEffect(() => {
    void hydrateFragments();
    void hydrateSpaces();
  }, [hydrateFragments, hydrateSpaces]);

  // 배경에서 조용히 익명 세션 확보 → 'me'로 남긴 기록을 실제 uid로 전환.
  // UI를 막지 않는다(캡처는 인증과 무관하게 즉시 동작).
  useEffect(() => {
    if (!isCloudEnabled()) return;
    let cancelled = false;
    void (async () => {
      const uid = await ensureAnonymousSession();
      if (cancelled || !uid) return;
      setAuthUser(uid);
      runIdentityMigration(uid);
      void upsertProfile(uid, getCurrentUser().displayName);
      requestSync(); // uid로 전환된 과거 결을 바로 올린다
    })().catch((err) => {
      console.warn('초기 동기화 준비 실패 — 로컬로 계속', err);
    });
    return () => {
      cancelled = true;
    };
  }, [setAuthUser]);

  const ready = fragmentsReady && spacesReady;
  const toastMsg = useToastStore((s) => s.message);
  const clearToast = useToastStore((s) => s.clear);

  return (
    <>
      <div className="matte">
        <main className="card">
          <div className="card__body">
            {!online && <SoftBar />}
            {ready ? <Outlet /> : <div className="empty">불러오는 중…</div>}
          </div>
        </main>
      </div>
      <TabBar />
      {/* 화면 전환 후에도 살아남는 전역 다독임 (예: 결을 비우고 뒤로 갈 때) */}
      <Toast message={toastMsg} onDone={clearToast} />
    </>
  );
}

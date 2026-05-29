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
import { requestSync, pullFromCloud } from '../lib/syncEngine';
import { isCloudEnabled } from '../lib/supabase';
import { ensureAnonymousSession, upsertProfile, onAuthUserChange } from '../lib/auth';
import { runIdentityMigration } from '../lib/identityMigration';
import { syncReminder } from '../lib/notifications';

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
    void syncReminder(); // 앱 열 때 오늘 상태에 맞춰 알림 재예약(미등록 시에만)
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
      void pullFromCloud(); // 서버에 있는 내 아카이브를 내려받아 병합(새 기기 복원)
    })().catch((err) => {
      console.warn('초기 동기화 준비 실패 — 로컬로 계속', err);
    });
    return () => {
      cancelled = true;
    };
  }, [setAuthUser]);

  // 매직 링크 로그인 등으로 계정(uid)이 바뀌면 그 계정으로 전환 + 아카이브 내려받기.
  useEffect(() => {
    if (!isCloudEnabled()) return;
    return onAuthUserChange((uid) => {
      if (!uid || uid === useIdentityStore.getState().user.id) return;
      setAuthUser(uid);
      void pullFromCloud(); // 로그인한 계정의 결을 복원
      requestSync();
    });
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

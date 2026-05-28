import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { TabBar } from '../components/TabBar';
import { SoftBar } from '../components/SoftBar';
import { useFragmentStore } from '../lib/fragmentStore';
import { useSpaceStore } from '../lib/spaceStore';
import { useOnlineStatus } from '../lib/useOnlineStatus';
import { useSyncSimulation } from '../lib/useSyncSimulation';

export function RootLayout() {
  const hydrateFragments = useFragmentStore((s) => s.hydrate);
  const hydrateSpaces = useSpaceStore((s) => s.hydrate);
  const fragmentsReady = useFragmentStore((s) => s.hydrated);
  const spacesReady = useSpaceStore((s) => s.hydrated);
  const online = useOnlineStatus();
  useSyncSimulation();

  useEffect(() => {
    void hydrateFragments();
    void hydrateSpaces();
  }, [hydrateFragments, hydrateSpaces]);

  const ready = fragmentsReady && spacesReady;

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
    </>
  );
}

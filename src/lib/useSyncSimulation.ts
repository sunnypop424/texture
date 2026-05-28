import { useEffect } from 'react';
import { useFragmentStore } from './fragmentStore';
import { useOnlineStatus } from './useOnlineStatus';

/**
 * Mock sync. In a real Supabase implementation this would push pending fragments
 * to the server and clear the `pending` flag on success. For the scaffold we
 * simply mark each pending fragment as synced ~1.6s after it lands, while
 * online. When offline, fragments stay pending.
 */
export function useSyncSimulation(): void {
  const online = useOnlineStatus();

  useEffect(() => {
    if (!online) return;
    const id = window.setInterval(() => {
      const { pendingIds, markSynced } = useFragmentStore.getState();
      if (pendingIds.size === 0) return;
      // Sync up to a few per tick (mocked latency)
      const toSync = Array.from(pendingIds).slice(0, 3);
      toSync.forEach((fragmentId) => markSynced(fragmentId));
    }, 1600);
    return () => window.clearInterval(id);
  }, [online]);
}

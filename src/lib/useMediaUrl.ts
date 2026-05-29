import { useEffect, useState } from 'react';
import type { Fragment } from '../types/fragment';
import { loadMediaUrl, saveMedia } from './mediaStore';
import { downloadMedia } from './remoteMedia';
import { useFragmentStore } from './fragmentStore';

/**
 * 결의 미디어 표시 URL을 해결한다(지연 로드).
 *
 * - 로컬 표시 URL(thumbUrl)이 있으면 그대로.
 * - 로컬 blob만 있으면 object URL 복원.
 * - 클라우드에만 있으면(내려받기를 미뤄둔 상태) **이때 처음 다운로드**해서 로컬에 저장.
 *
 * 덕분에 새 기기 복원 시 모든 미디어를 한꺼번에 받지 않고, 화면에 보일 때만 받아
 * 대역폭(비용)을 아낀다. 한 번 받으면 store에 반영돼 다른 화면에서도 즉시 보인다.
 */
const inflight = new Map<string, Promise<string | null>>();

export function useMediaUrl(fragment: Fragment | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(fragment?.thumbUrl);

  const id = fragment?.id;
  const thumbUrl = fragment?.thumbUrl;
  const hasLocalMedia = fragment?.hasLocalMedia;
  const mediaPath = fragment?.mediaPath;

  useEffect(() => {
    let cancelled = false;
    if (!id) {
      setUrl(undefined);
      return;
    }
    if (thumbUrl) {
      setUrl(thumbUrl);
      return;
    }
    if (hasLocalMedia) {
      void loadMediaUrl(id).then((u) => {
        if (!cancelled && u) setUrl(u);
      });
      return;
    }
    if (mediaPath) {
      let p = inflight.get(id);
      if (!p) {
        p = (async () => {
          const blob = await downloadMedia(mediaPath);
          if (!blob) return null;
          const u = await saveMedia(id, blob);
          // store에 반영 → 같은 결을 보여주는 다른 화면도 자동으로 채워짐.
          useFragmentStore.getState().update(id, { hasLocalMedia: true, thumbUrl: u });
          return u;
        })();
        inflight.set(id, p);
        void p.finally(() => inflight.delete(id));
      }
      void p.then((u) => {
        if (!cancelled && u) setUrl(u);
      });
      return;
    }
    setUrl(undefined);
    return () => {
      cancelled = true;
    };
  }, [id, thumbUrl, hasLocalMedia, mediaPath]);

  return url;
}

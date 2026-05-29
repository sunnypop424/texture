import { Camera, Video, Mic, Quote } from 'lucide-react';
import { useSpaceStore } from '../lib/spaceStore';
import { parseDayKey } from '../lib/today';
import { useMediaUrl } from '../lib/useMediaUrl';
import type { Fragment } from '../types/fragment';

const ICON = { photo: Camera, video: Video, text: Quote, voice: Mic } as const;

interface YearAgoCardProps {
  fragment: Fragment;
}

export function YearAgoCard({ fragment }: YearAgoCardProps) {
  const Icon = ICON[fragment.type];
  const mediaUrl = useMediaUrl(fragment);
  const space = useSpaceStore((s) => s.spaces.find((sp) => sp.id === fragment.spaceId));
  const d = parseDayKey(fragment.dayDate);
  const meta = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  const spaceName = space && !space.isPersonal ? space.name : null;

  return (
    <section className="yearago">
      <div className="yearago__label">1년 전 오늘</div>
      <div className="yearago__row">
        <div className="yearago__thumb" aria-hidden>
          {mediaUrl ? (
            <img src={mediaUrl} alt="" />
          ) : (
            <Icon size={19} strokeWidth={1.5} />
          )}
        </div>
        <div className="yearago__body">
          <div className="yearago__caption">{fragment.title}</div>
          <div className="yearago__meta">
            {meta}
            {spaceName && <span> · {spaceName}</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

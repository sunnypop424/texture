import { Camera, Video, Mic, Quote } from 'lucide-react';
import { spaceTagFor } from '../lib/useSpaceColor';
import { useMediaUrl } from '../lib/useMediaUrl';
import type { Fragment } from '../types/fragment';
import type { Space } from '../types/space';

const WEEKDAYS_SHORT = ['일', '월', '화', '수', '목', '금', '토'];
const ICON = { photo: Camera, video: Video, text: Quote, voice: Mic } as const;

interface LookbackRowProps {
  date: Date;
  fragments: Fragment[];
  spaces?: Space[];
}

export function LookbackRow({ date, fragments, spaces = [] }: LookbackRowProps) {
  const single = fragments.length === 1 ? fragments[0] : null;

  return (
    <div className="lookback-row">
      <div className="lookback-row__date-col">
        <div className="lookback-row__date">
          {date.getMonth() + 1}/{date.getDate()}
        </div>
        <div className="lookback-row__weekday">{WEEKDAYS_SHORT[date.getDay()]}</div>
      </div>
      <div className="lookback-row__body">
        {single ? (
          <>
            <FragmentThumb fragment={single} spaces={spaces} />
            <div className="lookback-row__caption">{single.title}</div>
          </>
        ) : (
          fragments.map((f) => <FragmentThumb key={f.id} fragment={f} spaces={spaces} />)
        )}
      </div>
    </div>
  );
}

function FragmentThumb({ fragment, spaces }: { fragment: Fragment; spaces: Space[] }) {
  const Icon = ICON[fragment.type];
  const tag = spaceTagFor(spaces.find((s) => s.id === fragment.spaceId));
  const mediaUrl = useMediaUrl(fragment);
  return (
    <div className="lookback-row__thumb" aria-label={fragment.title}>
      {mediaUrl ? (
        <img src={mediaUrl} alt="" />
      ) : (
        <Icon size={20} strokeWidth={1.5} />
      )}
      {tag && (
        <span
          className="space-dot space-dot--corner"
          style={{ background: tag.color }}
          aria-hidden
        />
      )}
    </div>
  );
}

import { Camera, Video, PenLine, Mic } from 'lucide-react';
import type { MediaType } from '../types/fragment';

interface MediaToggleProps {
  onSelect: (type: MediaType) => void;
}

const ITEMS: { type: MediaType; label: string; Icon: typeof Camera; aria: string }[] = [
  { type: 'photo', label: '사진', Icon: Camera, aria: '사진 캡처' },
  { type: 'video', label: '영상', Icon: Video, aria: '영상 캡처' },
  { type: 'text', label: '글', Icon: PenLine, aria: '글 작성' },
  { type: 'voice', label: '음성', Icon: Mic, aria: '음성 녹음' },
];

export function MediaToggle({ onSelect }: MediaToggleProps) {
  return (
    <div className="media" role="group" aria-label="결 매체 선택">
      {ITEMS.map(({ type, label, Icon, aria }) => (
        <button
          key={type}
          className="media__item"
          onClick={() => onSelect(type)}
          aria-label={aria}
        >
          <span className="media__circle">
            <Icon size={20} strokeWidth={1.5} aria-hidden />
          </span>
          <span className="media__label">{label}</span>
        </button>
      ))}
    </div>
  );
}

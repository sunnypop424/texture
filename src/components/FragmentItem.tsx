import { useEffect, useState } from 'react';
import { Camera, Video, Mic, Quote } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSpaceStore } from '../lib/spaceStore';
import { spaceTagFor } from '../lib/useSpaceColor';
import type { Fragment } from '../types/fragment';

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? '오전' : '오후';
  const hh = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, '0');
  return `${ampm} ${hh}:${mm}`;
}

const ICON = {
  photo: Camera,
  video: Video,
  text: Quote,
  voice: Mic,
} as const;

interface FragmentItemProps {
  fragment: Fragment;
  pending?: boolean;
  appear?: boolean;
  onOpen?: (id: string) => void;
}

export function FragmentItem({ fragment, pending = false, appear = false, onOpen }: FragmentItemProps) {
  const Icon = ICON[fragment.type];
  const navigate = useNavigate();

  const spaces = useSpaceStore((s) => s.spaces);
  const activeId = useSpaceStore((s) => s.activeSpaceId);
  const activeSpace = spaces.find((s) => s.id === activeId);
  const showAuthor = !!activeSpace && !activeSpace.isPersonal;
  const authorName = activeSpace?.members.find((m) => m.userId === fragment.authorId)?.displayName;

  const fragmentSpace = spaces.find((s) => s.id === fragment.spaceId);
  const tag = spaceTagFor(fragmentSpace);

  const [appearing, setAppearing] = useState(appear);
  useEffect(() => {
    if (!appear) return;
    setAppearing(true);
    const t = window.setTimeout(() => setAppearing(false), 260);
    return () => window.clearTimeout(t);
  }, [appear]);

  const open = () => {
    if (onOpen) onOpen(fragment.id);
    else navigate(`/fragments/${fragment.id}`);
  };

  return (
    <div
      className={`fragment ${appearing ? 'ink-rise' : ''}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === 'Enter') open();
      }}
    >
      <div className="fragment__thumb" aria-hidden>
        {fragment.thumbUrl ? (
          <img src={fragment.thumbUrl} alt="" />
        ) : (
          <Icon size={18} strokeWidth={1.5} />
        )}
        {tag && (
          <span
            className="space-dot space-dot--corner space-dot--sm"
            style={{ background: tag.color }}
            aria-hidden
          />
        )}
      </div>
      <div className="fragment__body">
        <span className="fragment__title">{fragment.title}</span>
        <span className="fragment__meta">
          {fragment.backfilled ? '시간 미상' : formatTime(fragment.capturedAt)}
          {showAuthor && authorName && <span className="fragment__author"> · {authorName}</span>}
          {pending && <span className="fragment__pending"> · 저장 중</span>}
        </span>
      </div>
    </div>
  );
}

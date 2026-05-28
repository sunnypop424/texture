import { useState } from 'react';
import { ChevronDown, Layers, Users } from 'lucide-react';
import { useSpaceStore } from '../lib/spaceStore';
import { ALL_SPACES_ID } from '../data/initialSpaces';
import { SpaceSheet } from './SpaceSheet';
import { CreateSpaceSheet } from './CreateSpaceSheet';
import { InviteSheet } from './InviteSheet';
import { SpaceDetailSheet } from './SpaceDetailSheet';

interface SpaceChipProps {
  /**
   * 'capture' — Today (activeSpaceId, 캡처 대상)
   * 'view'    — Calendar/Lookback (viewSpaceId, 회고 렌즈. '전체' 옵션 포함)
   */
  mode?: 'capture' | 'view';
}

export function SpaceChip({ mode = 'capture' }: SpaceChipProps) {
  const spaces = useSpaceStore((s) => s.spaces);
  const currentId = useSpaceStore((s) =>
    mode === 'view' ? s.viewSpaceId : s.activeSpaceId,
  );

  const [listOpen, setListOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteSpaceId, setInviteSpaceId] = useState<string | null>(null);
  const [detailSpaceId, setDetailSpaceId] = useState<string | null>(null);

  const isAll = currentId === ALL_SPACES_ID;
  const active = isAll ? null : spaces.find((s) => s.id === currentId);

  const label = isAll ? '전체' : active?.name ?? '';
  const showMembers = !isAll && active && !active.isPersonal;
  const hue = active && !active.isPersonal ? active.color : undefined;

  const openInvite = (spaceId: string) => setInviteSpaceId(spaceId);
  const openManage = (spaceId: string) => {
    setListOpen(false);
    setDetailSpaceId(spaceId);
  };

  return (
    <>
      <button
        className="space-chip"
        onClick={() => setListOpen(true)}
        aria-label="공간 전환"
      >
        {isAll && (
          <Layers size={13} strokeWidth={1.75} aria-hidden className="space-chip__icon" />
        )}
        {hue && (
          <span
            className="space-chip__hue"
            style={{ background: hue }}
            aria-hidden
          />
        )}
        <span className="space-chip__name">{label}</span>
        {showMembers && (
          <>
            <Users size={12} strokeWidth={1.75} aria-hidden className="space-chip__icon" />
            <span className="space-chip__count">{active.members.length}</span>
          </>
        )}
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden className="space-chip__caret" />
      </button>

      <SpaceSheet
        open={listOpen}
        mode={mode}
        onClose={() => setListOpen(false)}
        onCreateNew={() => {
          setListOpen(false);
          setCreateOpen(true);
        }}
        onInvite={() => {
          setListOpen(false);
          if (active && !active.isPersonal) openInvite(active.id);
        }}
        onManage={openManage}
      />

      <CreateSpaceSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setCreateOpen(false)}
      />

      <InviteSheet
        open={!!inviteSpaceId}
        spaceId={inviteSpaceId ?? ''}
        onClose={() => setInviteSpaceId(null)}
      />

      <SpaceDetailSheet
        open={!!detailSpaceId}
        spaceId={detailSpaceId ?? ''}
        onClose={() => setDetailSpaceId(null)}
        onInvite={() => {
          if (detailSpaceId) openInvite(detailSpaceId);
          setDetailSpaceId(null);
        }}
      />
    </>
  );
}

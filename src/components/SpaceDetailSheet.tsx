import { useState } from 'react';
import { LogOut, Send, X as XIcon } from 'lucide-react';
import { Sheet } from './Sheet';
import { ConfirmSheet } from './ConfirmSheet';
import { useSpaceStore } from '../lib/spaceStore';
import { useIdentityStore } from '../lib/identity';
import { useFragmentStore } from '../lib/fragmentStore';

interface SpaceDetailSheetProps {
  open: boolean;
  spaceId: string;
  onClose: () => void;
  onInvite: () => void;
}

type ConfirmState =
  | { type: 'leave' }
  | { type: 'close' }
  | { type: 'remove'; userId: string; displayName: string };

export function SpaceDetailSheet({ open, spaceId, onClose, onInvite }: SpaceDetailSheetProps) {
  const space = useSpaceStore((s) => s.spaces.find((sp) => sp.id === spaceId));
  const me = useIdentityStore((s) => s.user);
  const leaveSpace = useSpaceStore((s) => s.leaveSpace);
  const closeSpace = useSpaceStore((s) => s.closeSpace);
  const removeMember = useSpaceStore((s) => s.removeMember);
  const fragments = useFragmentStore((s) => s.fragments);

  const [confirm, setConfirm] = useState<ConfirmState | null>(null);

  if (!space) {
    // 공간이 store에서 사라진 경우 (방금 닫음·떠남) — Sheet도 닫혀야 함
    if (open) return null;
    return null;
  }

  const isOwner = space.createdBy === me.id;
  const myCount = fragments.filter(
    (f) => f.spaceId === spaceId && f.authorId === me.id,
  ).length;

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === 'leave') leaveSpace(spaceId);
    else if (confirm.type === 'close') closeSpace(spaceId);
    else if (confirm.type === 'remove') removeMember(spaceId, confirm.userId);

    const shouldClose = confirm.type !== 'remove';
    setConfirm(null);
    if (shouldClose) onClose();
  };

  return (
    <>
      <Sheet open={open} title={space.name} onClose={onClose}>
        <section className="space-detail__section">
          <h3 className="space-detail__section-title">멤버 {space.members.length}</h3>
          <div className="member-list">
            {space.members.map((m) => {
              const isMe = m.userId === me.id;
              const isMemberOwner = m.userId === space.createdBy;
              const canRemove = isOwner && !isMe;
              return (
                <div key={m.userId} className="member-row">
                  <div className="member-row__avatar" aria-hidden>
                    {m.displayName.charAt(0) || '·'}
                  </div>
                  <div className="member-row__body">
                    <span className="member-row__name">
                      {m.displayName}
                      {isMe && <span className="member-row__me"> (나)</span>}
                    </span>
                    <span className="member-row__role">
                      {isMemberOwner ? '만든 사람' : '멤버'}
                    </span>
                  </div>
                  {canRemove && (
                    <button
                      className="member-row__action"
                      onClick={() =>
                        setConfirm({
                          type: 'remove',
                          userId: m.userId,
                          displayName: m.displayName,
                        })
                      }
                    >
                      빼기
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <div className="space-list__divider" />

        <button
          className="space-list__action"
          onClick={() => {
            onClose();
            onInvite();
          }}
        >
          <Send size={17} strokeWidth={1.5} aria-hidden />
          <span>이 공간에 초대하기</span>
        </button>

        <div className="space-list__divider" />

        {isOwner ? (
          <button
            className="space-list__action space-list__action--danger"
            onClick={() => setConfirm({ type: 'close' })}
          >
            <XIcon size={17} strokeWidth={1.5} aria-hidden />
            <span>이 공간 닫기</span>
          </button>
        ) : (
          <button
            className="space-list__action space-list__action--danger"
            onClick={() => setConfirm({ type: 'leave' })}
          >
            <LogOut size={17} strokeWidth={1.5} aria-hidden />
            <span>이 공간 떠나기</span>
          </button>
        )}
      </Sheet>

      <ConfirmSheet
        open={!!confirm}
        title={confirm ? titleFor(confirm) : ''}
        message={confirm ? messageFor(confirm, myCount) : ''}
        confirmLabel={confirm ? labelFor(confirm) : ''}
        destructive
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}

function titleFor(c: ConfirmState): string {
  if (c.type === 'leave') return '이 공간을 떠날까요?';
  if (c.type === 'close') return '이 공간을 닫을까요?';
  return `${c.displayName}님을 이 공간에서 뺄까요?`;
}

function messageFor(c: ConfirmState, myCount: number): string {
  if (c.type === 'leave') {
    return myCount > 0
      ? `지금까지 남긴 ${myCount}개의 결은 [내 결]로 옮겨 보관돼요.`
      : '이 공간을 떠나면 다시 들어오려면 새 초대가 필요해요.';
  }
  if (c.type === 'close') {
    return '공간이 닫히면 각 멤버에게 자기 결이 [내 결]로 보관돼요.';
  }
  return `${c.displayName}님은 더 이상 이 공간을 볼 수 없고, 남긴 결은 본인의 [내 결]로 옮겨져요.`;
}

function labelFor(c: ConfirmState): string {
  if (c.type === 'leave') return '떠나기';
  if (c.type === 'close') return '닫기';
  return '빼기';
}

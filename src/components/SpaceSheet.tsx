import { useNavigate } from 'react-router-dom';
import { Check, Layers, MoreHorizontal, Plus, Send, Settings, Users } from 'lucide-react';
import { Sheet } from './Sheet';
import { useSpaceStore } from '../lib/spaceStore';
import { ALL_SPACES_ID } from '../data/initialSpaces';

interface SpaceSheetProps {
  open: boolean;
  /** 'view' 모드일 때만 '전체' 행을 보여주고, 회고 렌즈(viewSpaceId)를 조작 */
  mode: 'capture' | 'view';
  onClose: () => void;
  onCreateNew: () => void;
  onInvite: () => void;
  onManage: (spaceId: string) => void;
}

export function SpaceSheet({
  open,
  mode,
  onClose,
  onCreateNew,
  onInvite,
  onManage,
}: SpaceSheetProps) {
  const navigate = useNavigate();
  const spaces = useSpaceStore((s) => s.spaces);
  const currentId = useSpaceStore((s) =>
    mode === 'view' ? s.viewSpaceId : s.activeSpaceId,
  );
  const setActive = useSpaceStore((s) => s.setActiveSpace);
  const setView = useSpaceStore((s) => s.setViewSpace);
  const set = mode === 'view' ? setView : setActive;

  const handleSwitch = (id: string) => {
    set(id);
    onClose();
  };

  const handleSettings = () => {
    onClose();
    navigate('/settings');
  };

  const active = spaces.find((s) => s.id === currentId);
  const isAllActive = currentId === ALL_SPACES_ID;
  const showInvite = !!active && !active.isPersonal && mode === 'capture';

  return (
    <Sheet open={open} title="공간" onClose={onClose}>
      <div className="space-list">
        {mode === 'view' && (
          <button
            className={`space-row__main ${isAllActive ? 'space-row__main--active' : ''}`}
            onClick={() => handleSwitch(ALL_SPACES_ID)}
          >
            <div className="space-row__body">
              <span className="space-row__name">
                <Layers
                  size={14}
                  strokeWidth={1.75}
                  aria-hidden
                  style={{ marginRight: 6, verticalAlign: -2 }}
                />
                전체
              </span>
              <span className="space-row__meta">내가 작성한 결 전체</span>
            </div>
            {isAllActive && <Check size={18} strokeWidth={1.75} aria-hidden />}
          </button>
        )}

        {spaces.map((s) => {
          const isActive = s.id === currentId;
          return (
            <div
              key={s.id}
              className={`space-row ${isActive ? 'space-row--active' : ''}`}
            >
              <button
                className="space-row__main"
                onClick={() => handleSwitch(s.id)}
              >
                {!s.isPersonal && s.color && (
                  <div
                    className="space-row__badge"
                    style={{ background: s.color }}
                    aria-hidden
                  >
                    {s.name.charAt(0)}
                  </div>
                )}
                <div className="space-row__body">
                  <span className="space-row__name">{s.name}</span>
                  <span className="space-row__meta">
                    {s.isPersonal ? (
                      '나만의 공간'
                    ) : (
                      <>
                        <Users size={12} strokeWidth={1.75} aria-hidden />
                        {s.members.length}명 · {s.members.map((m) => m.displayName).join(', ')}
                      </>
                    )}
                  </span>
                </div>
                {isActive && <Check size={18} strokeWidth={1.75} aria-hidden />}
              </button>
              {!s.isPersonal && (
                <button
                  className="space-row__manage"
                  onClick={(e) => {
                    e.stopPropagation();
                    onManage(s.id);
                  }}
                  aria-label="이 공간 설정"
                >
                  <MoreHorizontal size={16} strokeWidth={1.75} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-list__divider" />

      {showInvite && (
        <button className="space-list__action" onClick={onInvite}>
          <Send size={17} strokeWidth={1.5} aria-hidden />
          <span>이 공간에 초대하기</span>
        </button>
      )}
      <button className="space-list__action" onClick={onCreateNew}>
        <Plus size={17} strokeWidth={1.5} aria-hidden />
        <span>새 공유 공간</span>
      </button>

      <div className="space-list__divider" />

      <button className="space-list__action" onClick={handleSettings}>
        <Settings size={17} strokeWidth={1.5} aria-hidden />
        <span>설정</span>
      </button>
    </Sheet>
  );
}

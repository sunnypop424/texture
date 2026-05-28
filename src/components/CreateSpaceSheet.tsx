import { useEffect, useState } from 'react';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { useSpaceStore } from '../lib/spaceStore';

interface CreateSpaceSheetProps {
  open: boolean;
  onClose: () => void;
  onCreated: (spaceId: string) => void;
}

export function CreateSpaceSheet({ open, onClose, onCreated }: CreateSpaceSheetProps) {
  const [name, setName] = useState('');
  const createSpace = useSpaceStore((s) => s.createSpace);
  const setActive = useSpaceStore((s) => s.setActiveSpace);

  useEffect(() => {
    if (open) setName('');
  }, [open]);

  const canCreate = name.trim().length > 0;

  const handleCreate = () => {
    if (!canCreate) return;
    const space = createSpace(name.trim());
    setActive(space.id);
    onCreated(space.id);
  };

  return (
    <Sheet
      open={open}
      title="새 공유 공간"
      onClose={onClose}
      footer={
        <Button
          variant="primary"
          className="btn--block"
          onClick={handleCreate}
          disabled={!canCreate}
        >
          만들기
        </Button>
      }
    >
      <div className="create-space">
        <label className="create-space__field">
          <span className="create-space__label">공간 이름</span>
          <input
            type="text"
            className="create-space__input"
            placeholder="예) 우리 가족, 베프 셋"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            autoFocus
          />
        </label>
        <p className="create-space__hint">
          가까운 사람과 같은 페이지를 비동기로 함께 채우는 공간이에요. 만든 뒤 초대 링크를 전해주세요.
        </p>
      </div>
    </Sheet>
  );
}

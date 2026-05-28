import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Sheet } from './Sheet';
import { Button } from './Button';
import { useSpaceStore } from '../lib/spaceStore';

interface InviteSheetProps {
  open: boolean;
  spaceId: string;
  onClose: () => void;
}

export function InviteSheet({ open, spaceId, onClose }: InviteSheetProps) {
  const generate = useSpaceStore((s) => s.generateInvite);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && spaceId) {
      const inv = generate(spaceId);
      setToken(inv.token);
      setCopied(false);
    }
    if (!open) {
      setToken(null);
      setCopied(false);
    }
  }, [open, spaceId, generate]);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const url = token ? `${origin}/invite/${token}` : '';

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('clipboard write failed', err);
    }
  };

  return (
    <Sheet
      open={open}
      title="초대"
      onClose={onClose}
      footer={
        <Button
          variant="primary"
          className="btn--block"
          onClick={handleCopy}
          leadingIcon={
            copied ? (
              <Check size={16} strokeWidth={2} aria-hidden />
            ) : (
              <Copy size={16} strokeWidth={1.75} aria-hidden />
            )
          }
          disabled={!url}
        >
          {copied ? '복사됐어요' : '링크 복사'}
        </Button>
      }
    >
      <div className="invite">
        <p className="invite__line">이 페이지 같이 볼래?</p>
        <p className="invite__hint">
          링크를 복사해 가까운 사람에게 전해주세요. 받은 사람은 이 공간에서 함께 결을 남길 수 있어요.
        </p>
        <div className="invite__url-box">
          <span className="invite__url">{url || '링크 만드는 중…'}</span>
        </div>
      </div>
    </Sheet>
  );
}

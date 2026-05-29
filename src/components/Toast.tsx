import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

interface ToastProps {
  /** null이면 표시 안 함. 값이 있으면 잠깐 떴다가 사라진다. */
  message: string | null;
  onDone: () => void;
  duration?: number;
}

/** 캡처 직후 같은 순간에 뜨는 조용한 확인. 점수·연속기록이 아니라 한순간의 다독임. */
export function Toast({ message, onDone, duration = 1800 }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, duration);
    return () => window.clearTimeout(t);
    // onDone은 의도적으로 deps에서 제외 — 메시지가 바뀔 때만 타이머를 다시 건다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, duration]);

  if (!message) return null;

  return createPortal(
    <div className="toast" role="status" key={message}>
      <Check size={14} strokeWidth={2} aria-hidden />
      <span>{message}</span>
    </div>,
    document.body,
  );
}

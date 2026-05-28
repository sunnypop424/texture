import { Sheet } from './Sheet';
import { Button } from './Button';

interface ConfirmSheetProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmSheet({
  open,
  title,
  message,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <div className="confirm-sheet__actions">
          <Button variant="secondary" className="btn--block" onClick={onCancel}>
            그만두기
          </Button>
          <Button
            variant={destructive ? 'primary' : 'primary'}
            className="btn--block"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="confirm-sheet__message">{message}</p>
    </Sheet>
  );
}

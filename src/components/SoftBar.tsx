import { CloudOff } from 'lucide-react';

interface SoftBarProps {
  message?: string;
}

export function SoftBar({
  message = '지금은 연결이 약해요. 결은 안전하게 저장됐고, 잠시 뒤 동기화돼요.',
}: SoftBarProps) {
  return (
    <div className="softbar" role="status">
      <CloudOff size={14} strokeWidth={1.75} aria-hidden />
      <span>{message}</span>
    </div>
  );
}

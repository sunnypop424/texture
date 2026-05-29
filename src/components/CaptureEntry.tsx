interface CaptureEntryProps {
  onTap: () => void;
  label?: string;
}

export function CaptureEntry({ onTap, label = '오늘, 무엇이든 한 결 남겨요' }: CaptureEntryProps) {
  return (
    <button className="capture" onClick={onTap}>
      <span className="capture__hint">{label}</span>
    </button>
  );
}

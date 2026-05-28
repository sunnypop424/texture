interface CaptureEntryProps {
  onTap: () => void;
}

export function CaptureEntry({ onTap }: CaptureEntryProps) {
  return (
    <button className="capture" onClick={onTap}>
      <span className="capture__hint">오늘, 무엇이든 한 결 남겨요</span>
    </button>
  );
}

import { formatBytes } from '../lib/plan';

interface StorageBarProps {
  used: number;
  total: number;
  /** 한도 초과 시 보여줄 업그레이드 행동(없으면 버튼 숨김). */
  onUpgrade?: () => void;
}

/**
 * 공간의 클라우드 보관 용량 사용량 막대. 한도 초과 시 막다른 길이 아니라
 * "Plus로 더 담기" 가치 제안만 보여준다(§14.3). 과거 열람·복원은 늘 무료.
 */
export function StorageBar({ used, total, onUpgrade }: StorageBarProps) {
  const ratio = total > 0 ? Math.min(1, used / total) : 0;
  const over = used > total;
  const near = !over && ratio >= 0.8;

  return (
    <div className="storage">
      <div className="storage__head">
        <span className="storage__label">사진·영상 보관</span>
        <span className="storage__nums">
          {formatBytes(used)} <span className="storage__total">/ {formatBytes(total)}</span>
        </span>
      </div>
      <div className="storage__track">
        <div
          className="storage__fill"
          style={{ width: `${Math.max(ratio * 100, used > 0 ? 4 : 0)}%` }}
          data-state={over ? 'over' : near ? 'near' : undefined}
        />
      </div>
      {over ? (
        <button type="button" className="storage__cta" onClick={onUpgrade}>
          용량이 가득 찼어요 — Plus로 더 담을 수 있어요
        </button>
      ) : near ? (
        <p className="storage__hint">곧 가득 차요. 더 담으려면 Plus로 열 수 있어요.</p>
      ) : null}
    </div>
  );
}

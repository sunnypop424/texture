interface CalendarCellProps {
  date: Date;
  hasRecord: boolean;
  isToday: boolean;
  isOutsideMonth: boolean;
  /** dot 색 — 주어지면 mint 기본값 대신 사용 (공간 식별용) */
  dotColor?: string;
  onSelect?: (date: Date) => void;
}

export function CalendarCell({
  date,
  hasRecord,
  isToday,
  isOutsideMonth,
  dotColor,
  onSelect,
}: CalendarCellProps) {
  const classes = [
    'cell',
    isOutsideMonth ? 'cell--outside' : '',
    isToday ? 'cell--today' : '',
  ]
    .filter(Boolean)
    .join(' ');
  const aria = `${date.getMonth() + 1}월 ${date.getDate()}일, ${hasRecord ? '기록 있음' : '기록 없음'}`;
  return (
    <div
      className={classes}
      role={isOutsideMonth ? undefined : 'button'}
      tabIndex={isOutsideMonth ? -1 : 0}
      aria-label={aria}
      onClick={() => !isOutsideMonth && onSelect?.(date)}
      onKeyDown={(e) => {
        if (!isOutsideMonth && e.key === 'Enter') onSelect?.(date);
      }}
    >
      <div>{date.getDate()}</div>
      <div
        className={`cell__dot ${hasRecord && !isOutsideMonth ? '' : 'cell__dot--empty'}`}
        style={hasRecord && dotColor ? { background: dotColor } : undefined}
        aria-hidden
      />
    </div>
  );
}

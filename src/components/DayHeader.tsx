const WEEKDAYS = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

interface DayHeaderProps {
  date: Date;
  showTodayTag?: boolean;
}

export function DayHeader({ date, showTodayTag = false }: DayHeaderProps) {
  const weekday = WEEKDAYS[date.getDay()];
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return (
    <header>
      <div className="day-header__weekday">
        {weekday}
        {showTodayTag && <span className="day-header__tag"> · 오늘</span>}
      </div>
      <h1 className="day-header__date">
        {month}월 {day}일
      </h1>
    </header>
  );
}

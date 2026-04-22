'use client';

const C = {
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
};

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

interface DayDot {
  date: Date;
  count: number;
}

interface Props {
  taskDueDates?: Date[];
}

export function WeekStrip({ taskDueDates = [] }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());

  const days: DayDot[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const count = taskDueDates.filter((td) => {
      const t = new Date(td);
      t.setHours(0, 0, 0, 0);
      return t.getTime() === d.getTime();
    }).length;
    return { date: d, count };
  });

  return (
    <div
      className="rounded-2xl p-3 flex justify-between"
      style={{ background: C.cream, border: `1px solid ${C.beige}` }}
    >
      {days.map(({ date, count }) => {
        const isToday = date.getTime() === today.getTime();
        const isPast = date < today;
        return (
          <div key={date.toISOString()} className="flex flex-col items-center gap-1 flex-1">
            <span
              className="text-xs"
              style={{ color: isPast ? C.ink300 : C.ink500 }}
            >
              {DAYS_KO[date.getDay()]}
            </span>
            <div
              className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium"
              style={{
                background: isToday ? C.mustard : 'transparent',
                color: isToday ? '#fff' : isPast ? C.ink300 : C.ink900,
              }}
            >
              {date.getDate()}
            </div>
            <div className="h-1.5 flex gap-0.5 items-center">
              {count > 0 && Array.from({ length: Math.min(count, 3) }, (_, k) => (
                <div
                  key={k}
                  className="w-1 h-1 rounded-full"
                  style={{ background: isToday ? C.mustard : C.ink300 }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

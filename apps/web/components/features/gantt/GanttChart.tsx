'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import type { Task } from '@mda/shared';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
  coral:   '#EB8B7C',
  peach:   '#F4A587',
};

const ROW_H = 36;
const PRIORITY_COLOR: Record<string, string> = {
  urgent: C.coral,
  high:   C.peach,
  normal: C.mustard,
  low:    C.mint,
};

type ZoomLevel = 'day' | 'week';
type StatusFilter = 'all' | 'active' | 'done';

const ZOOM_DAY_W: Record<ZoomLevel, number> = { day: 28, week: 14 };

interface Props {
  tasks: Task[];
  title?: string;
  onTaskClick?: (task: Task) => void;
}

export function GanttChart({ tasks, title, onTaskClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [labelW, setLabelW] = useState(160);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry!.contentRect.width;
      setLabelW(w < 400 ? 100 : w < 600 ? 130 : 160);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const DAY_W = ZOOM_DAY_W[zoom];

  const filteredTasks = useMemo(() => {
    if (statusFilter === 'all') return tasks;
    if (statusFilter === 'done') return tasks.filter((t) => t.status === 'done');
    return tasks.filter((t) => t.status !== 'done');
  }, [tasks, statusFilter]);

  const { minDate, days } = useMemo(() => {
    const dates: Date[] = [];
    tasks.forEach((t) => {
      if (t.due_date) {
        const d = t.due_date as unknown as { toDate?: () => Date };
        dates.push(d?.toDate?.() ?? new Date(t.due_date as unknown as string));
      }
      if (t.start_date) {
        const d = t.start_date as unknown as { toDate?: () => Date };
        dates.push(d?.toDate?.() ?? new Date(t.start_date as unknown as string));
      }
    });
    const now = new Date(); now.setHours(0, 0, 0, 0);
    if (dates.length === 0) {
      const end = new Date(now); end.setDate(end.getDate() + 29);
      return buildDays(now, end);
    }
    const sorted = dates.map(startOf).sort((a, b) => a.getTime() - b.getTime());
    const min = new Date(sorted[0]!); min.setDate(min.getDate() - 3);
    const max = new Date(sorted[sorted.length - 1]!); max.setDate(max.getDate() + 7);
    return buildDays(min, max);
  }, [tasks]);

  function buildDays(start: Date, end: Date) {
    const daysArr: Date[] = [];
    const cur = new Date(start);
    while (cur <= end) { daysArr.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    return { minDate: start, days: daysArr };
  }

  function startOf(d: Date) {
    const r = new Date(d); r.setHours(0, 0, 0, 0); return r;
  }

  function dayIndex(d: Date): number {
    return Math.floor((startOf(d).getTime() - minDate.getTime()) / 86400000);
  }

  const today = startOf(new Date());
  const todayIdx = dayIndex(today);
  const totalW = days.length * DAY_W;

  const monthGroups = useMemo(() => {
    const groups: { label: string; startDay: number; count: number }[] = [];
    let curMonth = -1, curStart = 0;
    days.forEach((d, i) => {
      const m = d.getMonth();
      if (m !== curMonth) {
        if (curMonth !== -1) {
          const labelDay = days[curStart];
          if (labelDay) groups.push({ label: formatMonth(labelDay), startDay: curStart, count: i - curStart });
        }
        curMonth = m; curStart = i;
      }
    });
    const lastDay = days[curStart];
    if (lastDay) groups.push({ label: formatMonth(lastDay), startDay: curStart, count: days.length - curStart });
    return groups;
  }, [days]);

  function formatMonth(d: Date) {
    return d.toLocaleDateString('ko-KR', { month: 'short', year: '2-digit' });
  }

  const grouped = useMemo(() => {
    const sectionMap = new Map<string, Task[]>();
    const noSection: Task[] = [];
    filteredTasks.forEach((t) => {
      if (t.section_id) {
        if (!sectionMap.has(t.section_id)) sectionMap.set(t.section_id, []);
        sectionMap.get(t.section_id)!.push(t);
      } else {
        noSection.push(t);
      }
    });
    const result: { sectionId: string | null; label: string; tasks: Task[] }[] = [];
    if (noSection.length > 0) result.push({ sectionId: null, label: '섹션 없음', tasks: noSection });
    sectionMap.forEach((taskArr, sectionId) => {
      result.push({ sectionId, label: `섹션 ${sectionId.slice(0, 6)}`, tasks: taskArr });
    });
    return result;
  }, [filteredTasks]);

  function taskBar(task: Task) {
    let startIdx: number | null = null;
    let endIdx: number | null = null;
    if (task.start_date) {
      const d = task.start_date as unknown as { toDate?: () => Date };
      startIdx = dayIndex(d?.toDate?.() ?? new Date(task.start_date as unknown as string));
    }
    if (task.due_date) {
      const d = task.due_date as unknown as { toDate?: () => Date };
      endIdx = dayIndex(d?.toDate?.() ?? new Date(task.due_date as unknown as string));
    }
    return { startIdx, endIdx };
  }

  const isOverdue = (task: Task) => {
    if (task.status === 'done' || !task.due_date) return false;
    const d = task.due_date as unknown as { toDate?: () => Date };
    return startOf(d?.toDate?.() ?? new Date(task.due_date as unknown as string)) < today;
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-2xl mb-2">📊</p>
        <p className="text-sm" style={{ color: C.ink300 }}>태스크가 없습니다</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="rounded-2xl overflow-hidden" style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
      {/* 툴바 */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 flex-wrap" style={{ borderBottom: `1px solid ${C.beige}` }}>
        <p className="text-sm font-semibold truncate" style={{ color: C.ink900 }}>{title ?? '간트 차트'}</p>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.beige}` }}>
            {([['all', '전체'], ['active', '진행'], ['done', '완료']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                className="px-2 py-1 text-xs font-medium"
                style={{ background: statusFilter === v ? C.mustard : C.cream, color: statusFilter === v ? '#fff' : C.ink500 }}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${C.beige}` }}>
            {([['day', '일'], ['week', '축']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setZoom(v)}
                className="px-2 py-1 text-xs font-medium"
                style={{ background: zoom === v ? C.mustard : C.cream, color: zoom === v ? '#fff' : C.ink500 }}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto" ref={scrollRef}>
        <div style={{ minWidth: labelW + totalW }}>
          {/* 헤더 — 월 */}
          <div className="flex" style={{ background: C.cream, borderBottom: `1px solid ${C.beige}` }}>
            <div style={{ width: labelW, flexShrink: 0 }} />
            <div className="flex" style={{ width: totalW }}>
              {monthGroups.map((g) => (
                <div key={g.startDay} className="text-xs font-medium flex items-center px-1.5"
                  style={{ width: g.count * DAY_W, color: C.ink500, borderLeft: `1px solid ${C.beige}`, height: 22, flexShrink: 0 }}>
                  {g.label}
                </div>
              ))}
            </div>
          </div>

          {/* 헤더 — 일 */}
          <div className="flex" style={{ background: C.cream, borderBottom: `1px solid ${C.beige}` }}>
            <div style={{ width: labelW, flexShrink: 0 }} />
            <div className="flex" style={{ width: totalW }}>
              {days.map((d, i) => {
                const isToday = i === todayIdx;
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <div key={i} className="flex items-center justify-center text-xs flex-shrink-0"
                    style={{
                      width: DAY_W, height: 20,
                      color: isToday ? C.mustard : isWeekend ? C.ink300 : C.ink500,
                      fontWeight: isToday ? 700 : 400,
                      borderLeft: `1px solid ${C.beige}`,
                      background: isToday ? C.mustard + '10' : 'transparent',
                      fontSize: zoom === 'week' ? 9 : 10,
                    }}>
                    {zoom === 'week' ? (d.getDate() % 7 === 0 || i === 0 ? d.getDate() : '') : d.getDate()}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 섹션 그룹 */}
          {grouped.map(({ sectionId, label, tasks: groupTasks }) => (
            <div key={sectionId ?? '__none'}>
              {grouped.length > 1 && (
                <div className="flex items-center"
                  style={{ height: 22, background: C.beige, borderBottom: `1px solid ${C.beige}` }}>
                  <div style={{ width: labelW, flexShrink: 0 }}>
                    <span className="text-[10px] font-semibold px-2 uppercase tracking-wider" style={{ color: C.ink500 }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ width: totalW, height: 22 }} />
                </div>
              )}

              {groupTasks.map((task) => {
                const { startIdx, endIdx } = taskBar(task);
                const done = task.status === 'done';
                const overdue = isOverdue(task);
                const barColor = overdue ? C.coral : done ? C.mint : (PRIORITY_COLOR[task.priority ?? 'normal'] ?? C.mustard);
                const barStart = startIdx ?? endIdx;
                const barEnd = endIdx ?? startIdx;
                const barLeft = barStart !== null ? barStart * DAY_W : null;
                const barWidth = barStart !== null && barEnd !== null
                  ? Math.max((barEnd - barStart + 1) * DAY_W, DAY_W)
                  : DAY_W;

                return (
                  <div key={task.id}
                    className="flex items-center relative"
                    style={{
                      height: ROW_H,
                      borderBottom: `1px solid ${C.beige}`,
                      background: hovered === task.id ? C.beige + '60' : 'transparent',
                      cursor: onTaskClick ? 'pointer' : 'default',
                    }}
                    onMouseEnter={() => setHovered(task.id)}
                    onMouseLeave={() => setHovered(null)}
                    onTouchStart={() => setHovered(task.id)}
                    onTouchEnd={() => setHovered(null)}
                    onClick={() => onTaskClick?.(task)}
                  >
                    {/* 레이블 */}
                    <div className="flex items-center gap-1 px-2 flex-shrink-0" style={{ width: labelW }} title={task.title}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: barColor }} />
                      <span className="text-xs truncate"
                        style={{
                          color: done ? C.ink300 : overdue ? C.coral : C.ink900,
                          textDecoration: done ? 'line-through' : 'none',
                          maxWidth: labelW - 24,
                        }}>
                        {overdue && !done && '⚠ '}{task.title}
                      </span>
                    </div>

                    {/* 간트 바 */}
                    <div className="relative flex-shrink-0" style={{ width: totalW, height: ROW_H }}>
                      {days.map((d, i) =>
                        (d.getDay() === 0 || d.getDay() === 6) ? (
                          <div key={i} className="absolute inset-y-0"
                            style={{ left: i * DAY_W, width: DAY_W, background: C.beige + '40' }} />
                        ) : null,
                      )}
                      {todayIdx >= 0 && todayIdx < days.length && (
                        <div className="absolute inset-y-0 z-10"
                          style={{ left: todayIdx * DAY_W + DAY_W / 2, width: 1.5, background: C.mustard + '80' }} />
                      )}
                      {barLeft !== null && (
                        <div className="absolute top-1/2 rounded-full"
                          style={{
                            left: barLeft + 2, width: barWidth - 4, height: 12,
                            transform: 'translateY(-50%)',
                            background: barColor + (done ? '60' : 'CC'),
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-3 px-3 py-2 flex-wrap" style={{ borderTop: `1px solid ${C.beige}` }}>
        {Object.entries(PRIORITY_COLOR).map(([p, c]) => (
          <div key={p} className="flex items-center gap-1">
            <div className="w-3 h-2 rounded-full" style={{ background: c }} />
            <span className="text-xs" style={{ color: C.ink300 }}>
              {p === 'urgent' ? '긴급' : p === 'high' ? '높음' : p === 'normal' ? '보통' : '낮음'}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-full" style={{ background: C.mint }} />
          <span className="text-xs" style={{ color: C.ink300 }}>완료</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded-full" style={{ background: C.coral }} />
          <span className="text-xs" style={{ color: C.ink300 }}>초과</span>
        </div>
      </div>
    </div>
  );
}

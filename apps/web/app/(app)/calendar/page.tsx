'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useMonthTasks } from '../../../lib/hooks/useMonthTasks';
import { useTodayTasks } from '../../../lib/hooks/useTasks';
import { AppShell } from '../../../components/layout/AppShell';
import type { Task } from '@mda/shared';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink700:  '#4A453E',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
  coral:   '#EB8B7C',
  lavender:'#B5A7D4',
  blue:    '#7B9FEB',
};

const DAYS_KO   = ['일', '월', '화', '수', '목', '금', '토'];
const MONTHS_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const PRIORITY_COLOR: Record<string, string> = {
  low: C.ink300, normal: C.ink500, high: C.mustard, urgent: C.coral,
};

type ViewMode = 'month' | 'week';

export default function CalendarPage() {
  const { user, teamId, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user || !teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.ivory }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <AppShell>
      <CalendarContent teamId={teamId} userId={user.uid} />
    </AppShell>
  );
}

function CalendarContent({ teamId, userId }: { teamId: string; userId: string }) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewMode,  setViewMode]  = useState<ViewMode>('month');
  const [weekBase,  setWeekBase]  = useState(() => {
    const d = new Date(today); d.setDate(d.getDate() - d.getDay()); return d;
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(today);
  const [addingTitle,  setAddingTitle]  = useState('');
  const [adding, setAdding] = useState(false);

  const { getTasksForDate, loading } = useMonthTasks(teamId, userId, viewYear, viewMonth);
  const { createTask, toggleTask, deleteTask } = useTodayTasks(teamId, userId);

  function prevPeriod() {
    if (viewMode === 'month') {
      if (viewMonth === 0) { setViewYear(y => y-1); setViewMonth(11); }
      else setViewMonth(m => m-1);
    } else {
      setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate()-7); return n; });
    }
  }
  function nextPeriod() {
    if (viewMode === 'month') {
      if (viewMonth === 11) { setViewYear(y => y+1); setViewMonth(0); }
      else setViewMonth(m => m+1);
    } else {
      setWeekBase(d => { const n = new Date(d); n.setDate(n.getDate()+7); return n; });
    }
  }
  function goToday() {
    setViewYear(today.getFullYear()); setViewMonth(today.getMonth());
    const d = new Date(today); d.setDate(d.getDate() - d.getDay()); setWeekBase(d);
    setSelectedDate(today);
  }

  // 월간 셀
  const monthCells: (Date | null)[] = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (Date | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [viewYear, viewMonth]);

  // 주간 셀
  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => { const d = new Date(weekBase); d.setDate(d.getDate()+i); return d; }),
    [weekBase],
  );

  const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  async function handleAddTask() {
    if (!addingTitle.trim() || !selectedDate) return;
    setAdding(true);
    try {
      await createTask({ title: addingTitle.trim(), due_date: selectedDate });
      setAddingTitle('');
    } finally {
      setAdding(false);
    }
  }

  const periodLabel = viewMode === 'month'
    ? `${viewYear}년 ${MONTHS_KO[viewMonth]}`
    : `${weekBase.getMonth()+1}월 ${weekBase.getDate()}일 주`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>📅 {periodLabel}</h2>
        <div className="flex items-center gap-2">
          {/* 뷰 토글 */}
          <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${C.beige}` }}>
            {(['month', 'week'] as ViewMode[]).map((m) => (
              <button key={m} onClick={() => setViewMode(m)}
                className="px-3 py-1 text-xs font-medium"
                style={{ background: viewMode === m ? C.mustard : C.cream, color: viewMode === m ? '#fff' : C.ink500 }}>
                {m === 'month' ? '월' : '주'}
              </button>
            ))}
          </div>
          <button onClick={prevPeriod} className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{ background: C.cream, color: C.ink500 }}>‹</button>
          <button onClick={goToday} className="px-2.5 h-8 rounded-xl text-xs"
            style={{ background: C.cream, color: C.ink500 }}>오늘</button>
          <button onClick={nextPeriod} className="w-8 h-8 rounded-xl flex items-center justify-center text-lg"
            style={{ background: C.cream, color: C.ink500 }}>›</button>
        </div>
      </div>

      {/* 월간 뷰 */}
      {viewMode === 'month' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.beige}` }}>
          <div className="grid grid-cols-7" style={{ background: C.cream }}>
            {DAYS_KO.map((d, i) => (
              <div key={d} className="py-2 text-center text-xs font-medium"
                style={{ color: i===0 ? C.coral : i===6 ? C.blue : C.ink500 }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y" style={{ background: C.ivory, borderColor: C.beige }}>
            {monthCells.map((date, i) => {
              if (!date) return <div key={`e-${i}`} className="h-16" style={{ background: C.cream + '80' }} />;
              const isToday    = date.getTime() === today.getTime();
              const isSelected = selectedDate?.getTime() === date.getTime();
              const dayTasks   = getTasksForDate(date);
              const doneAll    = dayTasks.length > 0 && dayTasks.every(t => t.status === 'done');
              const hasUrgent  = dayTasks.some(t => t.priority === 'urgent' && t.status !== 'done');
              const dow = date.getDay();
              return (
                <div key={date.toISOString()}
                  className="h-16 p-1 flex flex-col items-center gap-0.5 cursor-pointer"
                  style={{ background: isSelected ? C.mustard+'18' : 'transparent', borderColor: C.beige }}
                  onClick={() => setSelectedDate(isSelected ? null : date)}>
                  <div className="w-7 h-7 flex items-center justify-center rounded-full text-sm"
                    style={{
                      background: isToday ? C.mustard : isSelected ? C.mustard+'30' : 'transparent',
                      color: isToday ? '#fff' : dow===0 ? C.coral : dow===6 ? C.blue : C.ink900,
                      fontWeight: isToday ? 700 : 400,
                    }}>
                    {date.getDate()}
                  </div>
                  {dayTasks.length > 0 && (
                    <div className="flex gap-0.5 flex-wrap justify-center">
                      {dayTasks.slice(0,4).map((t, k) => (
                        <div key={k} className="w-1.5 h-1.5 rounded-full"
                          style={{ background: t.status==='done' ? C.ink300 : hasUrgent ? C.coral : C.mustard }} />
                      ))}
                    </div>
                  )}
                  {dayTasks.length > 0 && (
                    <span className="text-xs leading-none" style={{ color: doneAll ? C.mint : C.ink300 }}>
                      {dayTasks.length}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 주간 뷰 */}
      {viewMode === 'week' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.beige}` }}>
          <div className="grid grid-cols-7" style={{ background: C.cream }}>
            {weekDays.map((d, i) => {
              const isToday = d.getTime() === today.getTime();
              const isSelected = selectedDate?.getTime() === d.getTime();
              const dayTasks = getTasksForDate(d);
              return (
                <div key={i}
                  className="py-3 flex flex-col items-center gap-1 cursor-pointer"
                  style={{ background: isSelected ? C.mustard+'18' : 'transparent' }}
                  onClick={() => setSelectedDate(isSelected ? null : d)}>
                  <span className="text-xs" style={{ color: d.getDay()===0 ? C.coral : d.getDay()===6 ? C.blue : C.ink300 }}>
                    {DAYS_KO[d.getDay()]}
                  </span>
                  <div className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium"
                    style={{
                      background: isToday ? C.mustard : 'transparent',
                      color: isToday ? '#fff' : C.ink900,
                    }}>
                    {d.getDate()}
                  </div>
                  <div className="flex gap-0.5">
                    {dayTasks.slice(0,3).map((t, k) => (
                      <div key={k} className="w-1.5 h-1.5 rounded-full"
                        style={{ background: t.status==='done' ? C.ink300 : C.mustard }} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {/* 주간 태스크 타임라인 */}
          <div className="divide-y" style={{ borderColor: C.beige }}>
            {weekDays.map((d, i) => {
              const dayTasks = getTasksForDate(d);
              if (dayTasks.length === 0) return null;
              const isToday = d.getTime() === today.getTime();
              return (
                <div key={i} className="px-4 py-2 flex gap-3 items-start">
                  <span className="text-xs w-8 flex-shrink-0 mt-0.5 font-medium"
                    style={{ color: isToday ? C.mustard : C.ink300 }}>
                    {d.getDate()}일
                  </span>
                  <div className="flex-1 flex flex-col gap-1">
                    {dayTasks.map((t) => (
                      <div key={t.id} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: t.status==='done' ? C.ink300 : PRIORITY_COLOR[t.priority] ?? C.mustard }} />
                        <span className="text-xs flex-1" style={{ color: t.status==='done' ? C.ink300 : C.ink900, textDecoration: t.status==='done' ? 'line-through' : 'none' }}>
                          {t.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 선택된 날짜 패널 */}
      {selectedDate && (
        <div className="flex flex-col gap-3 rounded-2xl p-4"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold" style={{ color: C.ink900 }}>
              {selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
            <span className="text-xs" style={{ color: C.ink300 }}>
              {selectedTasks.length}개 태스크
            </span>
          </div>

          {/* 태스크 목록 */}
          {selectedTasks.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {selectedTasks.map((task) => {
                const isDone = task.status === 'done';
                return (
                  <div key={task.id}
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2"
                    style={{ background: C.ivory, border: `1px solid ${C.beige}`, opacity: isDone ? 0.6 : 1 }}>
                    <button
                      onClick={() => toggleTask(task.id, task.status)}
                      className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ border: `1.5px solid ${isDone ? C.mustard : C.ink300}`, background: isDone ? C.mustard : 'transparent' }}>
                      {isDone && <span className="text-white text-xs leading-none">✓</span>}
                    </button>
                    <span className="flex-1 text-sm" style={{ color: isDone ? C.ink300 : C.ink900, textDecoration: isDone ? 'line-through' : 'none' }}>
                      {task.title}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {task.recurrence && task.recurrence.frequency !== 'none' && (
                        <span className="text-xs" style={{ color: C.ink300 }} title="반복">🔁</span>
                      )}
                      {task.priority !== 'normal' && (
                        <span className="text-xs px-1.5 py-0.5 rounded-md"
                          style={{ background: PRIORITY_COLOR[task.priority]+'20', color: PRIORITY_COLOR[task.priority] }}>
                          {task.priority === 'urgent' ? '긴급' : task.priority === 'high' ? '높음' : '낮음'}
                        </span>
                      )}
                      <button onClick={() => deleteTask(task.id)} className="text-xs" style={{ color: C.ink300 }}>×</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 빠른 태스크 추가 */}
          <div className="flex gap-2">
            <input
              value={addingTitle}
              onChange={(e) => setAddingTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="+ 이 날 태스크 추가..."
              className="flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }}
            />
            <button
              onClick={handleAddTask}
              disabled={!addingTitle.trim() || adding}
              className="px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: C.mustard, color: '#fff', opacity: adding ? 0.7 : 1 }}>
              {adding ? '...' : '추가'}
            </button>
          </div>
        </div>
      )}

      {/* 월간 요약 */}
      {!loading && viewMode === 'month' && (
        <MonthSummary year={viewYear} month={viewMonth} getTasksForDate={getTasksForDate} />
      )}
    </div>
  );
}

function MonthSummary({
  year, month, getTasksForDate,
}: {
  year: number; month: number;
  getTasksForDate: (d: Date) => Task[];
}) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let total = 0, done = 0, urgent = 0;
  for (let i = 1; i <= daysInMonth; i++) {
    const ts = getTasksForDate(new Date(year, month, i));
    total  += ts.length;
    done   += ts.filter(t => t.status === 'done').length;
    urgent += ts.filter(t => t.priority === 'urgent' && t.status !== 'done').length;
  }
  if (total === 0) return null;
  const rate = Math.round((done / total) * 100);
  return (
    <div className="grid grid-cols-3 gap-3">
      {[
        { label: '이번 달 태스크', value: total, color: C.ink500 },
        { label: '완료율',         value: `${rate}%`, color: C.mint },
        { label: '긴급 미완료',    value: urgent,     color: urgent > 0 ? C.coral : C.ink300 },
      ].map(({ label, value, color }) => (
        <div key={label} className="rounded-2xl p-3 text-center"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
          <p className="text-xl font-bold" style={{ color }}>{value}</p>
          <p className="text-xs mt-0.5" style={{ color: C.ink300 }}>{label}</p>
        </div>
      ))}
    </div>
  );
}

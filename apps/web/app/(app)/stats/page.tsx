'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTodayTasks } from '../../../lib/hooks/useTasks';
import { useJournalEntries } from '../../../lib/hooks/useJournal';
import { useProjects } from '../../../lib/hooks/useProjects';
import { AppShell } from '../../../components/layout/AppShell';
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
  lavender:'#B5A7D4',
};

export default function StatsPage() {
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
      <StatsContent teamId={teamId} userId={user.uid} />
    </AppShell>
  );
}

const EMOTION_SCORE: Record<string, number> = {
  excited: 5, joy: 5, proud: 4, grateful: 4, calm: 3, neutral: 3,
  anxious: 2, tired: 2, sad: 1, angry: 0,
};
const EMOTION_COLOR: Record<string, string> = {
  excited: '#D4A547', joy: '#D4A547', proud: '#B5A7D4', grateful: '#B5A7D4',
  calm: '#8FBFA9', neutral: '#ADA598', anxious: '#EB8B7C', tired: '#ADA598',
  sad: '#7C9EC5', angry: '#EB8B7C',
};

function StatsContent({ teamId, userId }: { teamId: string; userId: string }) {
  const { tasks } = useTodayTasks(teamId, userId);
  const { entries: journals } = useJournalEntries(teamId, userId);
  const { projects } = useProjects(teamId);
  const [trendRange, setTrendRange] = useState<7 | 14 | 30>(7);

  const stats = useMemo(() => {
    const done = tasks.filter((t) => t.status === 'done').length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const urgent = tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = tasks.filter((t) => {
      if (t.status === 'done' || !t.due_date) return false;
      const d = t.due_date as unknown as { toDate?: () => Date };
      const date = d?.toDate?.() ?? new Date(t.due_date as unknown as string);
      date.setHours(0, 0, 0, 0);
      return date < today;
    }).length;

    const activeProjects = projects.filter((p) => p.status === 'active').length;
    const completedProjects = projects.filter((p) => p.status === 'completed').length;

    const emotionCounts = journals.reduce<Record<string, number>>((acc, j) => {
      if (j.emotion) acc[j.emotion] = (acc[j.emotion] ?? 0) + 1;
      return acc;
    }, {});
    const topEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

    const priorityDist: { label: string; value: number; color: string }[] = [
      { label: '긴급', value: tasks.filter((t) => t.priority === 'urgent').length, color: C.coral },
      { label: '높음', value: tasks.filter((t) => t.priority === 'high').length, color: C.mustard },
      { label: '보통', value: tasks.filter((t) => t.priority === 'normal').length, color: C.lavender },
      { label: '낮음', value: tasks.filter((t) => t.priority === 'low').length, color: C.ink300 },
    ].filter((d) => d.value > 0);

    return {
      done, total, completionRate, urgent, overdue,
      activeProjects, completedProjects, topEmotion,
      journalCount: journals.length,
      priorityDist, emotionCounts,
    };
  }, [tasks, journals, projects]);

  // 날짜별 감정 트렌드 (최근 N일)
  const emotionTrend = useMemo(() => {
    const days: { dateStr: string; label: string; emotion: string | null; score: number }[] = [];
    for (let i = trendRange - 1; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = i === 0 ? '오늘' : i === 1 ? '어제' :
        `${d.getMonth() + 1}/${d.getDate()}`;
      const dayJournals = journals.filter((j) => {
        if (!j.created_at || !j.emotion) return false;
        return j.created_at.toISOString().slice(0, 10) === dateStr;
      });
      let emotion: string | null = null;
      let score = -1;
      if (dayJournals.length > 0) {
        const best = dayJournals.reduce((prev, cur) => {
          const ps = EMOTION_SCORE[prev.emotion ?? ''] ?? 3;
          const cs = EMOTION_SCORE[cur.emotion ?? ''] ?? 3;
          return cs > ps ? cur : prev;
        });
        emotion = best.emotion;
        score = EMOTION_SCORE[emotion ?? ''] ?? 3;
      }
      days.push({ dateStr, label, emotion, score });
    }
    return days;
  }, [journals, trendRange]);

  const avgMoodScore = useMemo(() => {
    const scored = emotionTrend.filter((d) => d.score >= 0);
    if (scored.length === 0) return null;
    return (scored.reduce((s, d) => s + d.score, 0) / scored.length).toFixed(1);
  }, [emotionTrend]);

  const emotionDistArr = useMemo(() =>
    Object.entries(stats.emotionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
  , [stats.emotionCounts]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>통계 📊</h2>

      {/* 오늘 완료율 */}
      <StatCard title="오늘 완료율">
        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold" style={{ color: C.mustard }}>
            {stats.completionRate}%
          </span>
          <span className="text-sm mb-1" style={{ color: C.ink500 }}>
            {stats.done} / {stats.total}개 완료
          </span>
        </div>
        <ProgressBar value={stats.completionRate} color={C.mustard} />
      </StatCard>

      {/* 주요 지표 그리드 */}
      <div className="grid grid-cols-2 gap-3">
        <MiniStat emoji="⚠️" label="기한 초과" value={stats.overdue} color={C.coral} />
        <MiniStat emoji="🔥" label="긴급 태스크" value={stats.urgent} color={C.coral} />
        <MiniStat emoji="🗂️" label="진행 중 프로젝트" value={stats.activeProjects} color={C.mustard} />
        <MiniStat emoji="✅" label="완료한 프로젝트" value={stats.completedProjects} color={C.mint} />
        <MiniStat emoji="📓" label="일기 항목" value={stats.journalCount} color={C.lavender} />
        <MiniStat
          emoji={stats.topEmotion ? EMOTION_EMOJI[stats.topEmotion[0]] ?? '😐' : '😐'}
          label="주요 감정"
          value={stats.topEmotion ? EMOTION_KO[stats.topEmotion[0]] ?? stats.topEmotion[0] : '-'}
          color={C.lavender}
          isText
        />
      </div>

      {/* 감정 트렌드 (F-046) */}
      {journals.length > 0 && (
        <StatCard title="감정 트렌드">
          <div className="flex items-center justify-between mb-1">
            {avgMoodScore && (
              <span className="text-xs" style={{ color: C.ink500 }}>
                평균 기분 점수: <strong style={{ color: C.mustard }}>{avgMoodScore} / 5</strong>
              </span>
            )}
            <div className="flex gap-1 ml-auto">
              {([7, 14, 30] as const).map((n) => (
                <button key={n} onClick={() => setTrendRange(n)}
                  className="text-xs px-2 py-0.5 rounded-lg"
                  style={{
                    background: trendRange === n ? C.mustard : C.beige,
                    color: trendRange === n ? '#fff' : C.ink500,
                  }}>
                  {n}일
                </button>
              ))}
            </div>
          </div>
          {/* 바 차트 */}
          <div className="flex items-end gap-1 h-20 mt-1">
            {emotionTrend.map((day) => {
              const h = day.score >= 0 ? Math.round(((day.score + 1) / 6) * 100) : 0;
              const color = day.emotion ? (EMOTION_COLOR[day.emotion] ?? C.ink300) : C.beige;
              return (
                <div key={day.dateStr} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                  <div className="relative group w-full flex justify-center">
                    {day.emotion && (
                      <div className="absolute -top-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap px-1 rounded"
                        style={{ background: C.cream, color: C.ink900 }}>
                        {EMOTION_EMOJI[day.emotion]}{EMOTION_KO[day.emotion] ?? day.emotion}
                      </div>
                    )}
                    <div
                      className="w-full rounded-t-sm transition-all"
                      style={{
                        height: `${h}%`,
                        minHeight: day.score >= 0 ? 4 : 0,
                        background: color,
                        opacity: day.score >= 0 ? 1 : 0.15,
                      }}
                    />
                  </div>
                  <span className="text-[9px] truncate w-full text-center" style={{ color: C.ink300 }}>
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* 이모지 범례 */}
          {emotionDistArr.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2" style={{ borderTop: `1px solid ${C.beige}` }}>
              {emotionDistArr.map(([emo, cnt]) => (
                <span key={emo} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: (EMOTION_COLOR[emo] ?? C.ink300) + '22', color: C.ink900 }}>
                  {EMOTION_EMOJI[emo] ?? '😐'} {EMOTION_KO[emo] ?? emo} <strong>{cnt}</strong>
                </span>
              ))}
            </div>
          )}
        </StatCard>
      )}

      {/* 우선순위 분포 */}
      {stats.priorityDist.length > 0 && (
        <StatCard title="우선순위 분포">
          <div className="flex flex-col gap-2">
            {stats.priorityDist.map((d) => (
              <div key={d.label} className="flex items-center gap-2">
                <span className="text-xs w-8 text-right" style={{ color: d.color }}>{d.label}</span>
                <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: C.beige }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${stats.total > 0 ? Math.round((d.value / stats.total) * 100) : 0}%`,
                      background: d.color,
                    }}
                  />
                </div>
                <span className="text-xs w-4" style={{ color: C.ink300 }}>{d.value}</span>
              </div>
            ))}
          </div>
        </StatCard>
      )}

      {/* 활동 히트맵 */}
      <StatCard title="활동 히트맵 (최근 12주)">
        <ActivityHeatmap tasks={tasks} />
      </StatCard>

      {/* 빈 상태 */}
      {stats.total === 0 && journals.length === 0 && (
        <div className="text-center py-8">
          <p className="text-3xl mb-3">📭</p>
          <p className="text-sm" style={{ color: C.ink300 }}>태스크나 일기를 추가하면 통계가 표시됩니다</p>
        </div>
      )}
    </div>
  );
}

function ActivityHeatmap({ tasks }: { tasks: Task[] }) {
  const WEEKS = 12;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 날짜별 완료 태스크 수 집계
  const countByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status !== 'done' || !t.completed_at) continue;
      const d = t.completed_at as unknown as { toDate?: () => Date };
      const date = d?.toDate?.() ?? new Date(t.completed_at as unknown as string);
      const key = date.toISOString().split('T')[0]!;
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [tasks]);

  const maxCount = Math.max(1, ...Object.values(countByDate));

  const cellColor = (count: number) => {
    if (count === 0) return C.beige;
    const intensity = count / maxCount;
    if (intensity < 0.25) return '#E9DFC9';
    if (intensity < 0.5)  return '#D4C89E';
    if (intensity < 0.75) return '#D4A547';
    return '#B8861F';
  };

  // 오늘부터 과거 WEEKS*7일 그리드 생성 (일요일 정렬)
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - (WEEKS * 7 - 1));

  const grid: { date: string; count: number }[][] = Array.from({ length: 7 }, () => []);
  for (let i = 0; i < WEEKS * 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().split('T')[0]!;
    const dow = d.getDay(); // 0=일 ~ 6=토
    grid[dow]!.push({ date: key, count: countByDate[key] ?? 0 });
  }

  const DOW_LABELS = ['일', '', '화', '', '목', '', '토'];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 items-start">
        {/* 요일 레이블 */}
        <div className="flex flex-col gap-0.5 pt-5">
          {DOW_LABELS.map((l, i) => (
            <div key={i} className="text-[9px] w-3 text-right leading-none"
              style={{ height: 12, color: C.ink300 }}>{l}</div>
          ))}
        </div>
        {/* 그리드 */}
        <div className="flex gap-0.5">
          {Array.from({ length: WEEKS }).map((_, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-0.5">
              {Array.from({ length: 7 }).map((_, dow) => {
                const cell = grid[dow]?.[weekIdx];
                if (!cell) return <div key={dow} style={{ width: 12, height: 12 }} />;
                return (
                  <div
                    key={dow}
                    className="rounded-sm transition-colors"
                    style={{ width: 12, height: 12, background: cellColor(cell.count) }}
                    title={`${cell.date}: ${cell.count}개 완료`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2 justify-end">
        <span className="text-[9px]" style={{ color: C.ink300 }}>적음</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <div key={v} className="rounded-sm" style={{ width: 10, height: 10, background: cellColor(v * maxCount) }} />
        ))}
        <span className="text-[9px]" style={{ color: C.ink300 }}>많음</span>
      </div>
    </div>
  );
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
      <p className="text-xs font-medium uppercase tracking-wide" style={{ color: C.ink500 }}>{title}</p>
      {children}
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: C.beige }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
    </div>
  );
}

function MiniStat({
  emoji, label, value, color, isText,
}: {
  emoji: string; label: string; value: number | string; color: string; isText?: boolean;
}) {
  return (
    <div className="rounded-2xl p-3 flex flex-col gap-1"
      style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
      <span className="text-xl">{emoji}</span>
      <span className={isText ? 'text-base font-semibold' : 'text-2xl font-bold'}
        style={{ color }}>
        {value}
      </span>
      <span className="text-xs" style={{ color: C.ink500 }}>{label}</span>
    </div>
  );
}

const EMOTION_EMOJI: Record<string, string> = {
  joy: '😄', calm: '😌', excited: '🤩', grateful: '🙏',
  anxious: '😰', sad: '😢', tired: '😴', neutral: '😐', angry: '😠', proud: '😤',
};

const EMOTION_KO: Record<string, string> = {
  joy: '기쁨', calm: '평온', excited: '흥분', grateful: '감사',
  anxious: '불안', sad: '슬픔', tired: '피곤', neutral: '보통', angry: '화남', proud: '자랑스러움',
};

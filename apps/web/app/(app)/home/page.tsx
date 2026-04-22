'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTodayTasks } from '../../../lib/hooks/useTasks';
import { useProjects } from '../../../lib/hooks/useProjects';
import { useJournalEntries } from '../../../lib/hooks/useJournal';
import { SmartInput } from '../../../components/features/input/SmartInput';
import { TaskList } from '../../../components/features/tasks/TaskList';
import { TaskFilterBar } from '../../../components/features/tasks/TaskFilterBar';
import type { TaskFilter } from '../../../components/features/tasks/TaskFilterBar';
import { EveningReportCard } from '../../../components/features/report/EveningReportCard';
import { WeekStrip } from '../../../components/features/calendar/WeekStrip';
import { OnboardingModal } from '../../../components/features/onboarding/OnboardingModal';
import { TeamActivityFeed } from '../../../components/features/feed/TeamActivityFeed';
import { StandupCard } from '../../../components/features/report/StandupCard';
import { AppShell } from '../../../components/layout/AppShell';
import type { Task } from '@mda/shared';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  mustard: '#D4A547',
  red:     '#EB8B7C',
};

export default function HomePage() {
  const { user, teamId, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user || !teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.ivory }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <AppShell>
      <HomeContent user={user} teamId={teamId} />
    </AppShell>
  );
}

function HomeContent({
  user,
  teamId,
}: {
  user: { displayName: string | null; uid: string };
  teamId: string;
}) {
  const { tasks, loading, toggleTask, updateTask, deleteTask, bulkComplete, bulkDelete } = useTodayTasks(teamId, user.uid);
  const { projects, loading: projectsLoading } = useProjects(teamId);
  const { entries: journals } = useJournalEntries(teamId, user.uid);
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [shareInitialText, setShareInitialText] = useState<string | undefined>();

  // F-007: Web Share Target — sessionStorage에서 공유 텍스트 수신
  useEffect(() => {
    const shared = sessionStorage.getItem('share_target_text');
    if (shared) {
      setShareInitialText(shared);
      sessionStorage.removeItem('share_target_text');
    }
  }, []);

  const showOnboarding = !projectsLoading && projects.length === 0;
  const firstName = user.displayName?.split(' ')[0] ?? '사용자';
  const activeProjectNames = projects.filter((p) => p.status === 'active').map((p) => p.title);
  const todayTaskTitles = tasks.slice(0, 10).map((t) => t.title);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'done') return false;
    if (!t.due_date) return false;
    const d = t.due_date as unknown as { toDate?: () => Date };
    const date = d?.toDate?.() ?? new Date(t.due_date as unknown as string);
    date.setHours(0, 0, 0, 0);
    return date < today;
  });

  const filteredTasks = useMemo(() => {
    switch (filter) {
      case 'todo':    return tasks.filter((t) => t.status !== 'done');
      case 'done':    return tasks.filter((t) => t.status === 'done');
      case 'urgent':  return tasks.filter((t) => t.priority === 'urgent' && t.status !== 'done');
      case 'overdue': return overdueTasks;
      default:        return tasks;
    }
  }, [tasks, filter, overdueTasks]);

  const dueDates = tasks.flatMap((t): Date[] => {
    if (!t.due_date) return [];
    const d = t.due_date as unknown as { toDate?: () => Date };
    return [d?.toDate?.() ?? new Date(t.due_date as unknown as string)];
  });

  return (
    <>
      {showOnboarding && (
        <OnboardingModal teamId={teamId} userId={user.uid} userName={user.displayName} />
      )}
      <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-4">
        {/* 헤더 */}
        <div>
          <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>
            안녕하세요, {firstName}님 👋
          </h2>
          <p className="text-sm mt-1" style={{ color: C.ink500 }}>
            {new Date().toLocaleDateString('ko-KR', {
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
            })}
          </p>
        </div>

        {/* 기한 초과 경고 */}
        {overdueTasks.length > 0 && (
          <div
            className="rounded-2xl px-4 py-3 flex items-center gap-2"
            style={{ background: C.red + '15', border: `1px solid ${C.red}30` }}
          >
            <span>⚠️</span>
            <p className="text-sm" style={{ color: C.red }}>
              기한이 지난 태스크 {overdueTasks.length}개가 있습니다
            </p>
            <button
              onClick={() => setFilter('overdue')}
              className="ml-auto text-xs font-medium"
              style={{ color: C.red }}
            >
              보기
            </button>
          </div>
        )}

        <div style={{ height: 1, background: C.beige }} />

        {/* 주간 캘린더 */}
        <WeekStrip taskDueDates={dueDates} />

        {/* AI 스마트 입력 */}
        <SmartInput
          teamId={teamId}
          userId={user.uid}
          activeProjectNames={activeProjectNames}
          todayTaskTitles={todayTaskTitles}
          initialText={shareInitialText}
        />

        {/* 스탠드업 (F-106) */}
        <StandupCard
          yesterdayDone={tasks.filter((t) => t.status === 'done').map((t) => ({ title: t.title }))}
          todayTasks={tasks.filter((t) => t.status !== 'done').map((t) => ({ title: t.title, priority: t.priority }))}
          userName={user.displayName ?? undefined}
        />

        {/* 이브닝 리포트 */}
        <EveningReportCard tasks={tasks} journals={journals} />

        {/* 태스크 필터 + 목록 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide" style={{ color: C.ink500 }}>
              태스크
            </p>
            <span className="text-xs" style={{ color: C.ink500 }}>
              {tasks.filter((t) => t.status === 'done').length}/{tasks.length} 완료
            </span>
          </div>
          <TaskFilterBar active={filter} onChange={setFilter} />
          <TaskList
            tasks={filteredTasks}
            loading={loading}
            onToggle={toggleTask}
            onUpdate={updateTask}
            onDelete={deleteTask}
            onBulkComplete={bulkComplete}
            onBulkDelete={bulkDelete}
            teamId={teamId}
            userId={user.uid}
          />
        </div>

        {/* 팀 활동 피드 (F-105) */}
        <div className="rounded-2xl p-4"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
          <p className="text-xs font-medium uppercase tracking-wide mb-3" style={{ color: C.ink500 }}>
            팀 활동
          </p>
          <TeamActivityFeed teamId={teamId} maxItems={10} />
        </div>
      </div>
    </>
  );
}

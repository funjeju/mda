'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../lib/auth/AuthContext';
import { useTodayTasks } from '../../../lib/hooks/useTasks';
import { AppShell } from '../../../components/layout/AppShell';
import { TaskList } from '../../../components/features/tasks/TaskList';
import { TaskFilterBar } from '../../../components/features/tasks/TaskFilterBar';
import type { TaskFilter } from '../../../components/features/tasks/TaskFilterBar';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
};

export default function TodoPage() {
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
      <TodoContent teamId={teamId} userId={user.uid} />
    </AppShell>
  );
}

function TodoContent({ teamId, userId }: { teamId: string; userId: string }) {
  const { tasks, loading, toggleTask, updateTask, deleteTask, bulkComplete, bulkDelete } = useTodayTasks(teamId, userId);
  const [filter, setFilter] = useState<TaskFilter>('all');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdueTasks = tasks.filter((t) => {
    if (t.status === 'done' || !t.due_date) return false;
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

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const totalCount = tasks.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>투두 리스트 ✅</h2>
          <p className="text-sm mt-0.5" style={{ color: C.ink500 }}>
            {doneCount}/{totalCount}개 완료
          </p>
        </div>
        {/* 완료율 프로그레스 */}
        {totalCount > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: C.beige }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${Math.round((doneCount / totalCount) * 100)}%`, background: C.mustard }}
              />
            </div>
            <span className="text-xs font-medium" style={{ color: C.mustard }}>
              {Math.round((doneCount / totalCount) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* 필터 바 */}
      <TaskFilterBar
        active={filter}
        onChange={setFilter}
      />

      {/* 태스크 목록 */}
      <TaskList
        tasks={filteredTasks}
        loading={loading}
        teamId={teamId}
        userId={userId}
        onToggle={toggleTask}
        onUpdate={updateTask}
        onDelete={deleteTask}
        onBulkComplete={bulkComplete}
        onBulkDelete={bulkDelete}
      />

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-4xl mb-3">✨</p>
          <p className="text-sm" style={{ color: C.ink300 }}>
            {filter === 'done' ? '완료한 태스크가 없습니다' :
             filter === 'urgent' ? '긴급 태스크가 없습니다' :
             filter === 'overdue' ? '기한 초과 태스크가 없습니다' :
             '태스크가 없습니다'}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../../../lib/auth/AuthContext';
import { useSections, useProjects } from '../../../../../../lib/hooks/useProjects';
import { useSectionTasks } from '../../../../../../lib/hooks/useSectionTasks';
import { useProjectProgress } from '../../../../../../lib/hooks/useProjectProgress';
import { TaskDetailPanel } from '../../../../../../components/features/tasks/TaskDetailPanel';
import { AppShell } from '../../../../../../components/layout/AppShell';
import type { Task } from '@mda/shared';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  red:     '#EB8B7C',
};

const PRIORITY_COLOR: Record<string, string> = {
  low: '#ADA598', normal: '#7C756B', high: '#D4A547', urgent: '#EB8B7C',
};

const STATUS_LABEL: Record<string, string> = {
  todo: '할 일', in_progress: '진행 중', blocked: '블로킹', done: '완료', cancelled: '취소',
};

export default function SectionDetailPage({
  params,
}: {
  params: Promise<{ projectId: string; sectionId: string }>;
}) {
  const { projectId, sectionId } = use(params);
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
      <SectionContent
        projectId={projectId}
        sectionId={sectionId}
        teamId={teamId}
        userId={user.uid}
      />
    </AppShell>
  );
}

function SectionContent({
  projectId, sectionId, teamId, userId,
}: {
  projectId: string;
  sectionId: string;
  teamId: string;
  userId: string;
}) {
  const router = useRouter();
  const { projects } = useProjects(teamId);
  const { sections } = useSections(teamId, projectId);
  const { tasks, loading, createTask, toggleTask, updateTask, deleteTask } = useSectionTasks(teamId, projectId, sectionId);

  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useProjectProgress(teamId, projectId, sections);

  const project = projects.find((p) => p.id === projectId);
  const section = sections.find((s) => s.id === sectionId);

  async function handleAdd() {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createTask(newTitle.trim(), userId);
      setNewTitle('');
    } finally {
      setAdding(false);
    }
  }

  const todoTasks = tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: C.ink500 }}>
        <button onClick={() => router.push('/projects')} className="hover:underline">프로젝트</button>
        <span>/</span>
        <button onClick={() => router.push(`/projects/${projectId}`)} className="hover:underline">
          {project?.emoji} {project?.title}
        </button>
        <span>/</span>
        <span style={{ color: C.ink900 }}>{section?.emoji} {section?.title}</span>
      </div>

      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: C.ink900 }}>
          {section?.emoji} {section?.title ?? '섹션'}
        </h1>
        {section && (
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: C.beige }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${tasks.length > 0 ? Math.round((doneTasks.length / tasks.length) * 100) : 0}%`,
                  background: C.mustard,
                }}
              />
            </div>
            <span className="text-xs" style={{ color: C.ink300 }}>
              {doneTasks.length}/{tasks.length} 완료
            </span>
          </div>
        )}
      </div>

      {/* 태스크 추가 */}
      <div
        className="flex gap-2 rounded-2xl px-4 py-3"
        style={{ background: C.cream, border: `1px solid ${C.beige}` }}
      >
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="태스크 추가..."
          className="flex-1 text-sm outline-none bg-transparent"
          style={{ color: C.ink900 }}
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim() || adding}
          className="text-xs font-semibold px-3 py-1.5 rounded-xl"
          style={{ background: C.mustard, color: '#fff' }}
        >
          {adding ? '...' : '추가'}
        </button>
      </div>

      {/* 태스크 목록 */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-sm" style={{ color: C.ink300 }}>태스크를 추가해보세요</p>
        </div>
      ) : (
        <>
          {todoTasks.length > 0 && (
            <div className="flex flex-col gap-2">
              {todoTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} onClick={setSelectedTask} />
              ))}
            </div>
          )}

          {doneTasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wide" style={{ color: C.ink300 }}>
                완료됨 ({doneTasks.length})
              </p>
              {doneTasks.map((task) => (
                <TaskRow key={task.id} task={task} onToggle={toggleTask} onClick={setSelectedTask} />
              ))}
            </div>
          )}
        </>
      )}

      {/* 태스크 상세 패널 */}
      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          teamId={teamId}
          userId={userId}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onClick,
}: {
  task: Task;
  onToggle: (id: string, status: Task['status']) => void;
  onClick: (task: Task) => void;
}) {
  const isDone = task.status === 'done';
  const priorityColor = PRIORITY_COLOR[task.priority] ?? C.ink300;
  const dueDate = task.due_date
    ? (() => {
        const d = task.due_date as unknown as { toDate?: () => Date };
        return d?.toDate?.() ?? new Date(task.due_date as unknown as string);
      })()
    : null;
  const isOverdue = dueDate && dueDate < new Date() && !isDone;

  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-4 py-3 cursor-pointer group"
      style={{ background: C.cream, border: `1px solid ${C.beige}`, opacity: isDone ? 0.6 : 1 }}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(task.id, task.status); }}
        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
        style={{
          border: `1.5px solid ${isDone ? C.mustard : C.ink300}`,
          background: isDone ? C.mustard : 'transparent',
        }}
      >
        {isDone && <span className="text-white text-xs leading-none">✓</span>}
      </button>

      <div className="flex-1 min-w-0" onClick={() => onClick(task)}>
        <p
          className="text-sm"
          style={{
            color: isDone ? C.ink300 : C.ink900,
            textDecoration: isDone ? 'line-through' : 'none',
          }}
        >
          {task.emoji ? `${task.emoji} ` : ''}{task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.priority !== 'normal' && (
            <span className="text-xs" style={{ color: priorityColor }}>{task.priority === 'urgent' ? '긴급' : task.priority === 'high' ? '높음' : '낮음'}</span>
          )}
          {dueDate && (
            <span className="text-xs" style={{ color: isOverdue ? C.red : C.ink300 }}>
              📅 {dueDate.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
            </span>
          )}
          {task.checklist && task.checklist.length > 0 && (
            <span className="text-xs" style={{ color: C.ink300 }}>
              ☑ {task.checklist.filter((c) => c.completed).length}/{task.checklist.length}
            </span>
          )}
          {task.has_sub_project && (
            <span className="text-xs" style={{ color: C.mustard }}>🗂️</span>
          )}
        </div>
      </div>

      <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: C.ink300 }}>›</span>
    </div>
  );
}

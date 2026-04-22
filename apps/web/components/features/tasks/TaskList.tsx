'use client';

import { useState } from 'react';
import type { Task } from '@mda/shared';
import { Skeleton } from '@/components/ui/skeleton';
import { TaskDetailPanel } from './TaskDetailPanel';

const C = {
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink100:  '#E8E3D7',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  coral:   '#EB8B7C',
  peach:   '#F4A587',
  mint:    '#8FBFA9',
};

interface Props {
  tasks: Task[];
  loading: boolean;
  onToggle: (taskId: string, status: Task['status']) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  onUpdate?: (taskId: string, data: Partial<Task>) => Promise<void>;
  onBulkComplete?: (ids: string[]) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  teamId?: string;
  userId?: string;
}

export function TaskList({
  tasks, loading, onToggle, onDelete, onUpdate,
  onBulkComplete, onBulkDelete, teamId, userId,
}: Props) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function enterSelectMode() {
    setSelectMode(true);
    setSelected(new Set());
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  function selectAll() {
    if (selected.size === tasks.length) setSelected(new Set());
    else setSelected(new Set(tasks.map((t) => t.id)));
  }

  async function handleBulkComplete() {
    if (selected.size === 0 || !onBulkComplete) return;
    setBulkLoading(true);
    try {
      await onBulkComplete(Array.from(selected));
      exitSelectMode();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkDelete() {
    if (selected.size === 0 || !onBulkDelete) return;
    setBulkLoading(true);
    try {
      await onBulkDelete(Array.from(selected));
      exitSelectMode();
    } finally {
      setBulkLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" style={{ background: C.beige }} />
        ))}
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.beige}` }}>
          <span className="text-sm font-medium" style={{ color: C.ink900 }}>오늘의 할 일</span>
          <div className="flex items-center gap-2">
            {tasks.length > 0 && (
              <span className="text-xs" style={{ color: C.ink500 }}>
                {doneCount}/{tasks.length} 완료
              </span>
            )}
            {tasks.length > 0 && !selectMode && (
              <button
                onClick={enterSelectMode}
                className="text-xs px-2 py-0.5 rounded-lg"
                style={{ color: C.ink500, border: `1px solid ${C.beige}` }}
              >
                선택
              </button>
            )}
            {selectMode && (
              <button onClick={exitSelectMode} className="text-xs" style={{ color: C.ink300 }}>
                취소
              </button>
            )}
          </div>
        </div>

        {/* 벌크 액션 툴바 */}
        {selectMode && (
          <div
            className="px-5 py-3 flex items-center gap-2"
            style={{ background: C.mustard + '10', borderBottom: `1px solid ${C.beige}` }}
          >
            <button
              onClick={selectAll}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ border: `1px solid ${C.beige}`, color: C.ink500, background: C.cream }}
            >
              {selected.size === tasks.length ? '전체 해제' : '전체 선택'}
            </button>
            <span className="text-xs flex-1" style={{ color: C.ink500 }}>
              {selected.size > 0 ? `${selected.size}개 선택됨` : '태스크를 선택하세요'}
            </span>
            {selected.size > 0 && (
              <>
                {onBulkComplete && (
                  <button
                    onClick={handleBulkComplete}
                    disabled={bulkLoading}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: C.mint, color: '#fff' }}
                  >
                    {bulkLoading ? '...' : '✓ 완료'}
                  </button>
                )}
                {onBulkDelete && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkLoading}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium"
                    style={{ background: C.coral, color: '#fff' }}
                  >
                    {bulkLoading ? '...' : '× 삭제'}
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-3xl mb-2">🌱</p>
            <p className="text-sm" style={{ color: C.ink500 }}>할 일을 추가해보세요</p>
          </div>
        ) : (
          <ul>
            {tasks.map((task, idx) => (
              <li key={task.id} style={idx < tasks.length - 1 ? { borderBottom: `1px solid ${C.ink100}` } : {}}>
                <TaskItem
                  task={task}
                  onToggle={onToggle}
                  onDelete={onDelete}
                  onClick={!selectMode && onUpdate ? setSelectedTask : undefined}
                  selectMode={selectMode}
                  selected={selected.has(task.id)}
                  onSelect={() => toggleSelect(task.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedTask && onUpdate && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={onUpdate}
          onDelete={onDelete}
          teamId={teamId}
          userId={userId}
        />
      )}
    </>
  );
}

function TaskItem({
  task, onToggle, onDelete, onClick,
  selectMode, selected, onSelect,
}: {
  task: Task;
  onToggle: (id: string, status: Task['status']) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClick?: (task: Task) => void;
  selectMode?: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const isDone = task.status === 'done';
  const [justCompleted, setJustCompleted] = useState(false);

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isDone) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 700);
    }
    await onToggle(task.id, task.status);
  }

  return (
    <div
      className="flex items-center gap-3 px-5 py-3 group transition-all cursor-pointer"
      style={{
        background: selected ? C.mustard + '10' : justCompleted ? C.mint + '20' : 'transparent',
        transition: 'background 0.3s ease',
      }}
      onMouseEnter={(e) => { if (!selected && !justCompleted) e.currentTarget.style.background = C.beige + '60'; }}
      onMouseLeave={(e) => { if (!selected && !justCompleted) e.currentTarget.style.background = 'transparent'; }}
      onClick={() => {
        if (selectMode) { onSelect?.(); return; }
        onClick?.(task);
      }}
    >
      {selectMode ? (
        <div
          className="w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center"
          style={selected
            ? { background: C.mustard, borderColor: C.mustard }
            : { background: 'transparent', borderColor: C.beige }
          }
        >
          {selected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      ) : (
        <button
          onClick={handleToggle}
          className="w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all"
          style={isDone
            ? { background: C.mustard, borderColor: C.mustard, transform: justCompleted ? 'scale(1.3)' : 'scale(1)' }
            : { background: 'transparent', borderColor: C.beige, transform: 'scale(1)' }
          }
        >
          {isDone && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      )}

      <span
        className="flex-1 text-sm"
        style={{ color: isDone ? C.ink300 : C.ink900, textDecoration: isDone ? 'line-through' : 'none' }}
      >
        {task.title}
      </span>

      {task.recurrence && task.recurrence.frequency !== 'none' && (
        <span className="text-xs" title={`반복: ${task.recurrence.frequency}`} style={{ color: C.ink300 }}>🔁</span>
      )}
      {task.priority === 'urgent' && !isDone && (
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: C.coral + '20', color: C.coral }}>긴급</span>
      )}
      {task.priority === 'high' && !isDone && (
        <span className="text-xs font-medium px-1.5 py-0.5 rounded-md" style={{ background: C.peach + '20', color: C.peach }}>높음</span>
      )}

      {!selectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          className="opacity-0 group-hover:opacity-100 text-lg leading-none transition-opacity"
          style={{ color: C.ink300 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = C.coral)}
          onMouseLeave={(e) => (e.currentTarget.style.color = C.ink300)}
        >
          ×
        </button>
      )}
    </div>
  );
}

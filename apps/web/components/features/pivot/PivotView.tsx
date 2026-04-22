'use client';

import { useMemo, useState } from 'react';
import type { Task, Section } from '@mda/shared';

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
};

export type PivotAxis = 'section' | 'assignee' | 'time';

const AXIS_OPTIONS: { value: PivotAxis; label: string; icon: string }[] = [
  { value: 'section',  label: '섹션별',   icon: '🔷' },
  { value: 'assignee', label: '담당자별',  icon: '👤' },
  { value: 'time',     label: '시간대별',  icon: '⏰' },
];

const TIME_BLOCK_LABEL: Record<string, string> = {
  morning:     '🌅 오전',
  afternoon:   '☀️ 오후',
  evening:     '🌆 저녁',
  night:       '🌙 밤',
  unscheduled: '📌 미배정',
};

const STATUS_COLOR: Record<string, string> = {
  todo:        C.ink300,
  in_progress: C.mustard,
  blocked:     C.coral,
  done:        C.mint,
};

interface Props {
  tasks: Task[];
  sections: Section[];
  members?: { user_id: string; display_name?: string | null; email?: string | null }[];
  onTaskClick?: (task: Task) => void;
}

export function PivotView({ tasks, sections, members = [], onTaskClick }: Props) {
  const [axis, setAxis] = useState<PivotAxis>('section');

  const groups = useMemo(() => {
    if (axis === 'section') {
      const sectionMap = new Map(sections.map((s) => [s.id, s]));
      const grouped = new Map<string, { label: string; emoji: string; tasks: Task[] }>();

      for (const task of tasks) {
        const key = task.section_id ?? '__none__';
        if (!grouped.has(key)) {
          const sec = task.section_id ? sectionMap.get(task.section_id) : undefined;
          grouped.set(key, {
            label: sec?.title ?? '섹션 없음',
            emoji: sec?.emoji ?? '📋',
            tasks: [],
          });
        }
        grouped.get(key)!.tasks.push(task);
      }
      return [...grouped.entries()].sort(([a], [b]) => {
        if (a === '__none__') return 1;
        if (b === '__none__') return -1;
        return 0;
      });
    }

    if (axis === 'assignee') {
      const memberMap = new Map(members.map((m) => [m.user_id, m.display_name ?? m.email ?? m.user_id]));
      const grouped = new Map<string, { label: string; emoji: string; tasks: Task[] }>();

      for (const task of tasks) {
        const key = task.assignee_id ?? '__none__';
        if (!grouped.has(key)) {
          const name = task.assignee_id ? (memberMap.get(task.assignee_id) ?? task.assignee_id.slice(0, 8)) : '미배정';
          grouped.set(key, { label: name, emoji: task.assignee_id ? '👤' : '—', tasks: [] });
        }
        grouped.get(key)!.tasks.push(task);
      }
      return [...grouped.entries()].sort(([a], [b]) => {
        if (a === '__none__') return 1;
        if (b === '__none__') return -1;
        return 0;
      });
    }

    // axis === 'time'
    const order = ['morning', 'afternoon', 'evening', 'night', 'unscheduled'];
    const grouped = new Map<string, { label: string; emoji: string; tasks: Task[] }>();

    for (const task of tasks) {
      const key = task.time_block ?? 'unscheduled';
      if (!grouped.has(key)) {
        const meta = TIME_BLOCK_LABEL[key] ?? '📌 기타';
        const [emoji, ...rest] = meta.split(' ');
        grouped.set(key, { label: rest.join(' '), emoji: emoji ?? '📌', tasks: [] });
      }
      grouped.get(key)!.tasks.push(task);
    }
    return order
      .filter((k) => grouped.has(k))
      .map((k) => [k, grouped.get(k)!] as [string, { label: string; emoji: string; tasks: Task[] }]);
  }, [axis, tasks, sections, members]);

  const activeTasks = tasks.filter((t) => t.status !== 'done').length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;

  return (
    <div className="flex flex-col gap-4">
      {/* 축 전환 + 통계 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex rounded-xl overflow-hidden" style={{ border: `1px solid ${C.beige}`, width: 'fit-content' }}>
          {AXIS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setAxis(opt.value)}
              className="px-3 py-1.5 text-xs font-medium"
              style={{
                background: axis === opt.value ? C.mustard : C.cream,
                color: axis === opt.value ? '#fff' : C.ink500,
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: C.ink300 }}>
          {doneTasks}/{tasks.length} 완료 · 진행중 {activeTasks}
        </p>
      </div>

      {/* 그룹 카드 */}
      <div className="flex flex-col gap-3">
        {groups.map(([key, group]) => (
          <GroupCard
            key={key}
            label={group.label}
            emoji={group.emoji}
            tasks={group.tasks}
            onTaskClick={onTaskClick}
          />
        ))}
        {groups.length === 0 && (
          <p className="text-sm text-center py-8" style={{ color: C.ink300 }}>태스크가 없습니다</p>
        )}
      </div>
    </div>
  );
}

function GroupCard({
  label, emoji, tasks, onTaskClick,
}: {
  label: string;
  emoji: string;
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const done = tasks.filter((t) => t.status === 'done').length;
  const pct = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.beige}` }}>
      {/* 그룹 헤더 */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center gap-2 px-4 py-3 text-left"
        style={{ background: C.cream }}
      >
        <span className="text-base">{emoji}</span>
        <span className="flex-1 text-sm font-medium" style={{ color: C.ink900 }}>{label}</span>
        <span className="text-xs" style={{ color: C.ink300 }}>{done}/{tasks.length}</span>
        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: C.beige }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: C.mustard }} />
        </div>
        <span className="text-xs" style={{ color: C.ink300 }}>{collapsed ? '▼' : '▲'}</span>
      </button>

      {/* 태스크 목록 */}
      {!collapsed && (
        <div className="flex flex-col divide-y" style={{ borderTop: `1px solid ${C.beige}` }}>
          {tasks.map((task) => (
            <button
              key={task.id}
              onClick={() => onTaskClick?.(task)}
              className="flex items-center gap-3 px-4 py-2.5 text-left hover:opacity-80 transition-opacity"
              style={{ background: C.ivory }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: STATUS_COLOR[task.status] ?? C.ink300 }}
              />
              <span className="flex-1 text-sm truncate" style={{
                color: task.status === 'done' ? C.ink300 : C.ink900,
                textDecoration: task.status === 'done' ? 'line-through' : 'none',
              }}>
                {task.emoji ? `${task.emoji} ` : ''}{task.title}
              </span>
              {task.priority === 'urgent' && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-lg" style={{ background: C.coral + '20', color: C.coral }}>긴급</span>
              )}
              {task.due_date && (
                <span className="text-[10px]" style={{ color: C.ink300 }}>
                  {(() => {
                    const d = task.due_date as unknown as { toDate?: () => Date };
                    const date = d?.toDate?.() ?? new Date(task.due_date as unknown as string);
                    return `${date.getMonth() + 1}/${date.getDate()}`;
                  })()}
                </span>
              )}
            </button>
          ))}
          {tasks.length === 0 && (
            <p className="px-4 py-3 text-xs" style={{ color: C.ink300 }}>태스크 없음</p>
          )}
        </div>
      )}
    </div>
  );
}

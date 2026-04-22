'use client';

const C = {
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
};

export type TaskFilter = 'all' | 'todo' | 'done' | 'urgent' | 'overdue';

const FILTERS: { value: TaskFilter; label: string }[] = [
  { value: 'all',    label: '전체' },
  { value: 'todo',   label: '할 일' },
  { value: 'done',   label: '완료' },
  { value: 'urgent', label: '긴급' },
  { value: 'overdue',label: '기한 초과' },
];

interface Props {
  active: TaskFilter;
  onChange: (f: TaskFilter) => void;
}

export function TaskFilterBar({ active, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-xl font-medium transition-colors"
          style={{
            background: active === f.value ? C.mustard : C.cream,
            color: active === f.value ? '#fff' : C.ink500,
            border: `1px solid ${active === f.value ? C.mustard : C.beige}`,
          }}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

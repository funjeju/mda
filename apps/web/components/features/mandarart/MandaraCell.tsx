'use client';

import type { Section, Project } from '@mda/shared';

const C = {
  cream:    '#F6F1E7',
  beige:    '#E9DFC9',
  ink900:   '#2D2A26',
  ink700:   '#4A453E',
  ink500:   '#7C756B',
  ink300:   '#ADA598',
  ink100:   '#E8E3D7',
  mustard:  '#D4A547',
  mint:     '#8FBFA9',
  coral:    '#EB8B7C',
  peach:    '#F4A587',
  lavender: '#B5A7D4',
  ivory:    '#FDFBF7',
};

const STATUS_COLORS: Record<Section['status'], string> = {
  pending:   C.ink100,
  active:    C.mustard,
  completed: C.mint,
};

// ─── Center Cell (Project) ───────────────────────────────────

interface CenterCellProps {
  project: Project;
  size: number;
  onClick?: () => void;
}

export function MandaraCenterCell({ project, size, onClick }: CenterCellProps) {
  const progress = project.progress_percent ?? 0;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1 rounded-xl transition-all active:scale-95"
      style={{
        width: size,
        height: size,
        background: C.mustard,
        border: `2px solid ${C.mustard}`,
        boxShadow: `0 2px 12px ${C.mustard}40`,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      {project.emoji && (
        <span style={{ fontSize: size * 0.22, lineHeight: 1 }}>{project.emoji}</span>
      )}
      <span
        className="font-semibold text-center leading-tight px-1"
        style={{
          fontSize: size * 0.13,
          color: '#fff',
          maxWidth: '90%',
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}
      >
        {project.title}
      </span>
      {progress > 0 && (
        <div
          className="rounded-full overflow-hidden"
          style={{ width: '60%', height: 3, background: 'rgba(255,255,255,0.3)' }}
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${progress}%`, background: '#fff' }}
          />
        </div>
      )}
    </button>
  );
}

// ─── Section Cell ────────────────────────────────────────────

interface SectionCellProps {
  section: Section | null;
  position: number;
  size: number;
  onClick?: (section: Section | null, position: number) => void;
}

export function MandaraSectionCell({ section, position, size, onClick }: SectionCellProps) {
  const isEmpty = !section;
  const progress = section?.progress_percent ?? 0;
  const statusColor = section ? STATUS_COLORS[section.status] : C.ink100;

  return (
    <button
      onClick={() => onClick?.(section, position)}
      className="flex flex-col items-start justify-between rounded-xl transition-all active:scale-95 group"
      style={{
        width: size,
        height: size,
        background: isEmpty ? C.ivory : C.cream,
        border: `1.5px solid ${isEmpty ? C.ink100 : C.beige}`,
        padding: size * 0.1,
        cursor: 'pointer',
      }}
    >
      {isEmpty ? (
        <div className="flex items-center justify-center w-full h-full">
          <span style={{ fontSize: size * 0.22, color: C.ink300 }}>+</span>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-1 w-full">
            {section.emoji && (
              <span style={{ fontSize: size * 0.18, lineHeight: 1, flexShrink: 0 }}>
                {section.emoji}
              </span>
            )}
            <span
              className="font-medium leading-tight"
              style={{
                fontSize: size * 0.12,
                color: C.ink900,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                wordBreak: 'break-all',
              }}
            >
              {section.title}
            </span>
          </div>

          <div className="w-full flex flex-col gap-1">
            {progress > 0 && (
              <div
                className="rounded-full overflow-hidden"
                style={{ width: '100%', height: 2.5, background: C.ink100 }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progress}%`, background: statusColor }}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <div
                  className="rounded-full"
                  style={{ width: 6, height: 6, background: statusColor, flexShrink: 0 }}
                />
                {section.sub_project_id && (
                  <span style={{ fontSize: size * 0.12, lineHeight: 1 }} title="서브 프로젝트">🔗</span>
                )}
              </div>
              {section.tasks_total > 0 && (
                <span style={{ fontSize: size * 0.1, color: C.ink500 }}>
                  {section.tasks_completed}/{section.tasks_total}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </button>
  );
}

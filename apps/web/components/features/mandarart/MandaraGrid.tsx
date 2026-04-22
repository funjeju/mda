'use client';

import type { Project, Section } from '@mda/shared';
import { MandaraCenterCell, MandaraSectionCell } from './MandaraCell';

/**
 * 3x3 만다라트 그리드
 *
 * 레이아웃:
 *  [0][1][2]
 *  [7][C][3]
 *  [6][5][4]
 */

const POSITION_TO_GRID: Record<number, [number, number]> = {
  0: [0, 0],
  1: [0, 1],
  2: [0, 2],
  3: [1, 2],
  4: [2, 2],
  5: [2, 1],
  6: [2, 0],
  7: [1, 0],
};

interface MandaraGridProps {
  project: Project;
  sections: Section[];
  cellSize?: number;
  gap?: number;
  onCellClick?: (section: Section | null, position: number) => void;
  onProjectClick?: () => void;
}

export function MandaraGrid({
  project,
  sections,
  cellSize = 96,
  gap = 6,
  onCellClick,
  onProjectClick,
}: MandaraGridProps) {
  const totalSize = cellSize * 3 + gap * 2;

  const sectionByPosition = Object.fromEntries(
    sections.map((s) => [s.position, s]),
  );

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(3, ${cellSize}px)`,
        gridTemplateRows: `repeat(3, ${cellSize}px)`,
        gap,
        width: totalSize,
        height: totalSize,
      }}
    >
      {/* 8개 섹션 셀 (position 0~7) */}
      {Array.from({ length: 8 }, (_, i) => {
        const [row, col] = POSITION_TO_GRID[i]!;
        const section = sectionByPosition[i] ?? null;

        return (
          <div
            key={i}
            style={{ gridRow: row + 1, gridColumn: col + 1 }}
          >
            <MandaraSectionCell
              section={section}
              position={i}
              size={cellSize}
              onClick={onCellClick}
            />
          </div>
        );
      })}

      {/* 중심 셀 (row 2, col 2 = grid row 2, col 2) */}
      <div style={{ gridRow: 2, gridColumn: 2 }}>
        <MandaraCenterCell
          project={project}
          size={cellSize}
          onClick={onProjectClick}
        />
      </div>
    </div>
  );
}

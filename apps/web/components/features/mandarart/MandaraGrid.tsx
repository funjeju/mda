'use client';

import { useRef, useEffect, useState } from 'react';
import type { Project, Section } from '@mda/shared';
import { MandaraCenterCell, MandaraSectionCell } from './MandaraCell';

const POSITION_TO_GRID: Record<number, [number, number]> = {
  0: [0, 0], 1: [0, 1], 2: [0, 2],
  3: [1, 2], 4: [2, 2], 5: [2, 1],
  6: [2, 0], 7: [1, 0],
};

interface MandaraGridProps {
  project: Project;
  sections: Section[];
  onCellClick?: (section: Section | null, position: number) => void;
  onProjectClick?: () => void;
}

export function MandaraGrid({ project, sections, onCellClick, onProjectClick }: MandaraGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(96);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const w = entry!.contentRect.width;
      const gap = w < 360 ? 4 : 6;
      const size = Math.floor((w - gap * 2) / 3);
      setCellSize(Math.max(72, Math.min(size, 140)));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const gap = cellSize < 90 ? 4 : 6;
  const sectionByPosition = Object.fromEntries(sections.map((s) => [s.position, s]));

  return (
    <div ref={containerRef} className="w-full">
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(3, ${cellSize}px)`,
          gridTemplateRows: `repeat(3, ${cellSize}px)`,
          gap,
          margin: '0 auto',
          width: cellSize * 3 + gap * 2,
        }}
      >
        {Array.from({ length: 8 }, (_, i) => {
          const [row, col] = POSITION_TO_GRID[i]!;
          const section = sectionByPosition[i] ?? null;
          return (
            <div key={i} style={{ gridRow: row + 1, gridColumn: col + 1 }}>
              <MandaraSectionCell section={section} position={i} size={cellSize} onClick={onCellClick} />
            </div>
          );
        })}
        <div style={{ gridRow: 2, gridColumn: 2 }}>
          <MandaraCenterCell project={project} size={cellSize} onClick={onProjectClick} />
        </div>
      </div>
    </div>
  );
}

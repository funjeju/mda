import type { Timestamp } from './base';
import type { BaseEntity } from './base';

export type ViewMode = 'list' | 'mandarart' | 'calendar' | 'gantt';
export type PivotAxis = 'section' | 'assignee' | 'time';

export interface ProjectTheme {
  primary_color: string;
  accent_color: string;
  pattern: string | null;
  cell_style: 'soft' | 'bold' | 'minimal';
}

export interface Project extends BaseEntity {
  title: string;
  description: string;
  emoji: string | null;
  color: string | null;

  parent_task_id: string | null;

  status: 'planning' | 'active' | 'paused' | 'completed' | 'archived';

  start_date: Timestamp | null;
  target_date: Timestamp | null;
  completed_at: Timestamp | null;

  progress_percent: number;
  sections_total: number;
  sections_completed: number;
  tasks_total: number;
  tasks_completed: number;

  members: string[];
  owner_id: string;

  theme: ProjectTheme | null;

  ai_generated: boolean;
  ai_context: string | null;

  default_view_mode: ViewMode;
  default_pivot_axis: PivotAxis;
}

export interface Section extends BaseEntity {
  project_id: string;

  title: string;
  description: string;
  emoji: string | null;
  color: string | null;

  position: number;

  progress_percent: number;
  tasks_total: number;
  tasks_completed: number;

  status: 'pending' | 'active' | 'completed';

  // 재귀 만다라트: 이 섹션을 하위 프로젝트로 드릴다운
  sub_project_id: string | null;
}

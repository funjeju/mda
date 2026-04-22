import type { Timestamp } from './base';
import type { BaseEntity } from './base';

export interface Deliverable {
  id: string;
  title: string;
  url: string | null;
  type: 'file' | 'link' | 'note';
  completed: boolean;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
  path: string;
}

export interface TaskDecoration {
  emoji: string | null;
  sticker_id: string | null;
  border_color: string | null;
  background_color: string | null;
  background_pattern: string | null;
}

export interface TaskReminder {
  id: string;
  offset_minutes: number;
  intensity: 'gentle' | 'normal' | 'strong';
  sent_at: Timestamp | null;
}

export type RecurrenceFrequency = 'none' | 'daily' | 'weekly' | 'monthly' | 'weekdays';

export interface TaskRecurrence {
  frequency: RecurrenceFrequency;
  interval: number;          // 매 N일/주/월
  days_of_week?: number[];   // 0=일, 1=월, ... (weekly 시)
  day_of_month?: number;     // 1-31 (monthly 시)
  end_date?: string | null;  // ISO 날짜, null이면 무기한
}

export interface Task extends BaseEntity {
  project_id: string | null;
  section_id: string | null;

  title: string;
  description: string;
  emoji: string | null;

  position: number | null;

  assignee_id: string | null;
  assignee_name: string | null;

  due_date: Timestamp | null;
  due_time: string | null;
  start_date: Timestamp | null;
  duration_minutes: number | null;

  time_block: 'morning' | 'afternoon' | 'evening' | 'night' | 'unscheduled' | null;

  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
  completed_at: Timestamp | null;

  priority: 'low' | 'normal' | 'high' | 'urgent';

  deliverables: Deliverable[];
  checklist: ChecklistItem[];
  attachments: TaskAttachment[];

  depends_on: string[];
  blocks: string[];

  has_sub_project: boolean;
  sub_project_id: string | null;

  ai_generated: boolean;
  ai_confidence: number | null;
  ai_source_entry_id: string | null;

  external_id: string | null;
  external_source: 'google_calendar' | 'notion' | 'github' | 'gmail' | null;

  decoration: TaskDecoration | null;

  reminders: TaskReminder[];
  recurrence: TaskRecurrence | null;
}

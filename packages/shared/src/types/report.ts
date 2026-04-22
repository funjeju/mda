import type { Timestamp } from './base';
import type { BaseEntity } from './base';
import type { Emotion } from './journal';

export interface DailyReport extends BaseEntity {
  report_date: Timestamp;
  generated_at: Timestamp;

  business: {
    completed_tasks: string[];
    in_progress_tasks: string[];
    newly_added_tasks: string[];
    tomorrow_tasks: string[];
    project_progress: Array<{
      project_id: string;
      progress_delta: number;
    }>;
    highlights: string[];
  };

  journal: {
    entry_ids: string[];
    emotion_timeline: Array<{
      time: string;
      emotion: Emotion;
    }>;
    one_liner: string | null;
    met_contacts: string[];
    thoughts: string[];
  };

  reminders: Array<{
    target_date: Timestamp;
    description: string;
  }>;

  viewed_at: Timestamp | null;
  edits: Record<string, unknown> | null;

  source_entry_ids: string[];
}

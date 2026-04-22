import type { Timestamp } from './base';
import type { BaseEntity } from './base';

export type NotificationCategory =
  | 'task_due'
  | 'task_reminder'
  | 'project_milestone'
  | 'daily_report_ready'
  | 'contact_reminder'
  | 'team_activity'
  | 'ai_suggestion'
  | 'system';

export interface Notification extends BaseEntity {
  user_id: string;

  title: string;
  body: string;
  icon: string | null;

  category: NotificationCategory;
  intensity: 'gentle' | 'normal' | 'strong';

  linked_entity_type: 'task' | 'project' | 'report' | 'contact' | null;
  linked_entity_id: string | null;

  action_type: 'open' | 'complete' | 'snooze' | 'none';
  action_payload: Record<string, unknown> | null;

  scheduled_for: Timestamp;
  sent_at: Timestamp | null;
  delivery_channel: 'push' | 'email' | 'inapp';

  read_at: Timestamp | null;
  acted_at: Timestamp | null;
  dismissed_at: Timestamp | null;
}

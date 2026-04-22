import type { Timestamp } from './base';
import type { BaseEntity } from './base';

export interface ContactContext {
  date: Timestamp;
  context: string;
  source_entry_id: string;
}

export interface ContactReminder {
  id: string;
  target_date: Timestamp;
  reason: string;
  status: 'pending' | 'fired' | 'dismissed';
}

export interface PersonContact extends BaseEntity {
  name: string;
  alternate_names: string[];

  relationship: string;
  tags: string[];

  email: string | null;
  phone: string | null;

  linked_user_id: string | null;

  first_mentioned_at: Timestamp;
  last_mentioned_at: Timestamp;
  mention_count: number;

  recent_contexts: ContactContext[];
  reminders: ContactReminder[];

  ai_summary: string | null;

  avatar_url: string | null;
  emoji: string | null;
  color: string | null;
}

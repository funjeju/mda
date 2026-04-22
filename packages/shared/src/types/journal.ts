import type { Timestamp } from './base';
import type { BaseEntity } from './base';

export type Emotion =
  | 'joy' | 'calm' | 'excited'
  | 'anxious' | 'sad' | 'angry'
  | 'tired' | 'grateful' | 'proud'
  | 'neutral';

export interface JournalEntry extends BaseEntity {
  entry_date: Timestamp;

  content: string;
  raw_segments: string[];

  emotion: Emotion | null;
  emotion_intensity: number;

  mentioned_contact_ids: string[];

  location_name: string | null;
  location: { lat: number; lng: number } | null;

  tags: string[];

  source_entry_ids: string[];

  sticker_ids: string[];
  background_color: string | null;
  photo_urls: string[];

  is_private: boolean;
}

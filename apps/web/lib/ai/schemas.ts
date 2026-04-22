import { z } from 'zod';

export const IntentEnum = z.enum([
  'task_creation',
  'task_update',
  'project_creation',
  'schedule',
  'journal_emotion',
  'journal_event',
  'contact_mention',
  'reminder_set',
  'question',
  'noise',
]);
export type Intent = z.infer<typeof IntentEnum>;

export const SegmentSchema = z.object({
  segment: z.string(),
  intent: IntentEnum,
  confidence: z.number().min(0).max(1),
  proposed_action: z.enum(['create', 'update', 'link', 'none']),
  proposed_data: z.object({
    title: z.string().optional(),
    date: z.string().nullable().optional(),
    time: z.string().nullable().optional(),
    time_block: z.string().nullable().optional(),
    people: z.array(z.string()).optional(),
    emotion: z.string().nullable().optional(),
    priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
    project_hint: z.string().nullable().optional(),
    project_name: z.string().nullable().optional(),
  }),
});
export type Segment = z.infer<typeof SegmentSchema>;

export const ClassificationResultSchema = z.object({
  segments: z.array(SegmentSchema),
  overall_mood: z.enum(['positive', 'neutral', 'negative']),
  urgency: z.enum(['low', 'normal', 'high']),
});
export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

export interface ClassifyRequest {
  text: string;
  context?: {
    active_projects?: string[];
    today_tasks?: string[];
    timezone?: string;
    frequent_intents?: string[];
    preferred_projects?: string[];
  };
}

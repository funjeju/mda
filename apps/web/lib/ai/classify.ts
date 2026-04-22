import type { ClassificationResult, ClassifyRequest } from './schemas';
import { fetchWithAuth } from '../auth/fetchWithAuth';

export const AI_AUTO_THRESHOLD    = 0.85; // 자동 처리
export const AI_SUGGEST_THRESHOLD = 0.60; // 제안 후 승인

export async function classifyEntry(req: ClassifyRequest): Promise<ClassificationResult> {
  const res = await fetchWithAuth('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<ClassificationResult>;
}

export function intentLabel(intent: string): string {
  const MAP: Record<string, string> = {
    task_creation:    '✅ 태스크',
    task_update:      '✏️ 태스크 수정',
    project_creation: '🗂️ 프로젝트',
    schedule:         '📅 일정',
    journal_emotion:  '💬 감정 일기',
    journal_event:    '📓 일기',
    contact_mention:  '👥 연락처',
    reminder_set:     '🔔 리마인더',
    question:         '❓ 질문',
    noise:            '—',
  };
  return MAP[intent] ?? intent;
}

export function intentColor(intent: string): string {
  const MAP: Record<string, string> = {
    task_creation:    '#D4A547',
    task_update:      '#D4A547',
    project_creation: '#8FBFA9',
    schedule:         '#B5A7D4',
    journal_emotion:  '#F4A587',
    journal_event:    '#D4A5B5',
    contact_mention:  '#D4A5B5',
    reminder_set:     '#EB8B7C',
    question:         '#ADA598',
    noise:            '#E8E3D7',
  };
  return MAP[intent] ?? '#ADA598';
}

import type { TaskRecurrence } from '@mda/shared';

export function nextDueDate(current: Date, rec: TaskRecurrence): Date {
  const next = new Date(current);
  const interval = rec.interval ?? 1;

  switch (rec.frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;

    case 'weekdays': {
      next.setDate(next.getDate() + 1);
      // 주말이면 월요일로 스킵
      while (next.getDay() === 0 || next.getDay() === 6) {
        next.setDate(next.getDate() + 1);
      }
      break;
    }

    case 'weekly':
      next.setDate(next.getDate() + 7 * interval);
      break;

    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;

    default:
      return next;
  }

  // end_date 초과 시 null 반환 대신 그냥 반환 (호출자가 판단)
  return next;
}

export function isRecurrenceExpired(next: Date, rec: TaskRecurrence): boolean {
  if (!rec.end_date) return false;
  const end = new Date(rec.end_date);
  return next > end;
}

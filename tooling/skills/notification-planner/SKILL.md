---
name: notification-planner
description: 알림 스케줄링·강도·맥락 조정. 태스크 due 자동 생성, 3단계 강도, 묶음, DND. 알림 관련 작업 시 로드한다.
---

# Notification Planner

## 스케줄 규칙 (태스크 생성 시 자동)

```typescript
function planNotifications(task: Task): ScheduledNotification[] {
  const notifs: ScheduledNotification[] = [];
  if (!task.due_date) return notifs;

  // 24시간 전 (항상)
  notifs.push({ offset: -24 * 60, intensity: 'gentle', category: 'task_reminder' });

  // 2시간 전 (priority >= normal)
  if (task.priority !== 'low') {
    notifs.push({ offset: -120, intensity: 'gentle', category: 'task_reminder' });
  }

  // 30분 전 (priority >= high)
  if (task.priority === 'high' || task.priority === 'urgent') {
    notifs.push({ offset: -30, intensity: 'normal', category: 'task_due' });
  }

  // 정각
  const atDueIntensity = task.priority === 'urgent' ? 'strong' : 'normal';
  notifs.push({ offset: 0, intensity: atDueIntensity, category: 'task_due' });

  return notifs;
}
```

## 3단계 강도

| 강도 | 동작 | 사용 조건 |
|------|------|-----------|
| `gentle` | 배지만, 소리/진동 없음 | 사전 리마인드, 저녁 보고서 |
| `normal` | 표준 푸시 (소리+진동 1회) | 일반 마감, 팀 알림 |
| `strong` | 지속 진동, 잠금화면 켜짐, 10분 후 재시도 | urgent + 사용자 옵트인 |

## 맥락 조정

```typescript
function adjustForContext(notif: Notification, ctx: UserContext): Notification | null {
  if (ctx.inQuietHours && notif.intensity !== 'strong') {
    return { ...notif, deferToMorning: true };
  }
  if (ctx.inMeeting) {
    return { ...notif, deferUntilMeetingEnd: true };
  }
  if (ctx.isMoving) {
    return { ...notif, preferAudio: true };
  }
  if (ctx.lowBattery && notif.priority < 'high') {
    return null; // 억제
  }
  if (ctx.isSleeping) {
    return null; // 억제
  }
  return notif;
}
```

## 피로 관리

```typescript
const DAILY_CAPS: Record<Persona, number> = {
  light: 5,
  medium: 8,
  heavy: 15,
};

// 15분 이내 3개 이상 → 묶음 알림
function clusterNotifications(pending: Notification[]): Notification[] {
  // 15분 윈도우 내 알림 묶기
  // 3개 이상이면 "앞으로 1시간 안에 3개의 일정이 있어요" 로 합침
}
```

## 카테고리별 기본 강도

| 카테고리 | 기본 강도 |
|----------|-----------|
| `task_due` | 맥락 기반 |
| `task_reminder` | gentle |
| `project_milestone` | normal (축하) |
| `daily_report_ready` | gentle |
| `contact_reminder` | gentle |
| `team_activity` | gentle |
| `confirmation_needed` | normal |
| `payment_failed` | normal |

## 죄책감 금지 표현

```
❌ "아직 안 하셨나요?"
❌ "또 미루셨네요"
❌ "⚠️ 긴급!"
❌ "이번엔 진짜?"

✅ "준비됐나요?"
✅ "30분 후 일정이에요"
✅ "일정 시간이에요"
✅ "오늘 치과 예약 있어요"
```

## 자주 하는 실수

- ❌ Quiet hours 무시하고 strong 알림 전송
- ❌ priority 상관없이 동일 강도 적용
- ❌ 묶음 로직 미적용 (동시 3개 발사)
- ❌ 일일 상한 체크 안 함

## 관련 문서

- `spec/08_NOTIFICATION_SYSTEM.md` — 전체 알림 스펙
- `apps/web/app/api/notifications/` — 알림 API

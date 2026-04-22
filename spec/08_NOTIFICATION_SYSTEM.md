# 08. 알림 시스템

"치밀하되 불안하지 않게"의 핵심 엔진. 사용자에게 신호를 주되 죄책감을 유발하지 않는다.

---

## 8.1 알림 철학

### 3대 원칙

1. **맥락 기반 강도** — 회의 중엔 조용, 마감 임박엔 강
2. **죄책감 없는 메시지** — "또 안 했네요" 금지, "준비됐나요?" 수준
3. **사용자 제어권** — 강도·시간대·카테고리를 세분 제어

### 금지 사항

- 죄책감 유발 표현 ("아직 안 하셨나요", "미뤄졌어요")
- 과한 이모지 나열
- 자극적 긴급성 ("⚠️ 긴급!")
- 조롱조 ("이번엔 진짜?")

### 권장 톤

- 다정한 친구 (선 안 넘는)
- 담백한 사실 전달
- 축하는 크게, 리마인드는 작게

---

## 8.2 알림 카테고리

| 카테고리 | 설명 | 기본 강도 |
|----------|------|-----------|
| `task_due` | 태스크 마감 | 맥락 기반 |
| `task_reminder` | 태스크 사전 알림 | gentle |
| `project_milestone` | 프로젝트 단계 달성 | normal (축하) |
| `daily_report_ready` | 저녁 보고서 준비 | gentle |
| `contact_reminder` | 관계 리마인드 | gentle |
| `team_activity` | 팀원 활동 | gentle |
| `ai_suggestion` | AI 제안 | gentle |
| `confirmation_needed` | 사용자 확인 요청 | normal |
| `system` | 시스템 메시지 | normal |

---

## 8.3 알림 강도 (Intensity)

### 3단계 강도

#### 🤫 Gentle (부드러운)

- 배지만 업데이트
- 소리/진동 없음
- 잠금화면 표시 없음 (설정 따라)
- 예: "저녁 보고서가 준비됐어요"

#### 🔔 Normal (일반)

- 표준 푸시 알림
- 소리/진동 1회
- 잠금화면 표시
- 예: "30분 후 치과 예약이에요"

#### 📣 Strong (강한)

- 푸시 + 지속 진동
- 화면 잠겨있어도 켜짐
- 반복 알림 (10분 후 재시도)
- 예: "지금 회의 시작 시간입니다"
- **사용자가 옵트인해야만 가능**

---

## 8.4 맥락 감지 (Context Awareness)

### 감지 요소

| 맥락 | 감지 방법 |
|------|-----------|
| Quiet hours | 사용자 설정 시간대 |
| In meeting | Calendar 이벤트 + Focus 모드 |
| Moving | CoreMotion / Activity API |
| Low battery | OS battery level |
| Sleep | Health API + 시간대 |
| At location | 위치 ("집에 도착") |

### 맥락별 조정

```python
def adjust_for_context(notification, context):
    if context.in_quiet_hours:
        if notification.intensity == 'strong' and not notification.is_urgent:
            notification.intensity = 'gentle'
            notification.defer_to_morning()
    
    if context.in_meeting:
        notification.defer_until_meeting_ends()
    
    if context.is_moving:
        notification.prefer_audio = True  # Siri 읽어주기
    
    if context.low_battery:
        # 중요도 높은 것만
        if notification.priority < 'high':
            return None
    
    if context.is_sleeping:
        return None
    
    return notification
```

---

## 8.5 알림 스케줄링 엔진

### 구조

```
[Task 생성/수정]
    ↓
[NotificationPlanner]
    ↓
규칙 적용:
  - due_date 기준 offset
  - priority 기반 강도
  - 사용자 기본 설정
  - 반복 여부
    ↓
[Firestore: notifications 컬렉션에 scheduled_for 추가]
    ↓
[Cloud Function 크론 (분 단위)]
    ↓
[시간 도달 시 맥락 체크]
    ↓
[조정 후 전송 or 지연 or 취소]
    ↓
[FCM (iOS: APNs, Android: FCM) 전송]
    ↓
[Delivery 로그]
```

### 알림 규칙 (태스크별 기본)

태스크 생성 시 AI가 자동으로 알림 설정:

```python
def plan_notifications(task):
    notifications = []
    
    if task.due_date:
        # 24시간 전
        notifications.append({
            'offset_minutes': -24 * 60,
            'intensity': 'gentle',
            'category': 'task_reminder',
        })
        # 2시간 전 (if priority >= normal)
        if task.priority >= 'normal':
            notifications.append({
                'offset_minutes': -120,
                'intensity': 'gentle',
                'category': 'task_reminder',
            })
        # 30분 전 (if priority >= high)
        if task.priority >= 'high':
            notifications.append({
                'offset_minutes': -30,
                'intensity': 'normal',
                'category': 'task_due',
            })
        # 정각
        notifications.append({
            'offset_minutes': 0,
            'intensity': 'normal' if task.priority < 'urgent' else 'strong',
            'category': 'task_due',
        })
    
    return notifications
```

---

## 8.6 메시지 생성

### AI 기반 메시지 작성

알림 전송 직전 Gemini가 상황 맞춤 메시지 생성:

```python
NOTIFICATION_MESSAGE_PROMPT = """
태스크 알림 메시지를 작성해라.

태스크: {task_title}
남은 시간: {time_until_due}
우선순위: {priority}
담당자: {assignee}
프로젝트: {project}
사용자 페르소나: {persona}
사용자 현재 상태: {context}

출력 JSON:
{
  "title": "알림 제목 (20자 이내)",
  "body": "본문 (40자 이내)",
  "icon": "이모지",
  "action_label": "액션 버튼 텍스트 (옵션)"
}

톤 규칙:
- Light 페르소나: 다정, 이모지 사용
- Heavy 페르소나: 간결, 이모지 최소
- 죄책감 금지
- 실행 유도만

예시:
gentle: 
  { title: "📚 오늘 독서 시간", body: "30분 후 일정이에요", icon: "📚" }
normal:
  { title: "팀 회의 30분 전", body: "준비됐나요?", icon: "👥" }
strong:
  { title: "지금 시작해야 해요", body: "마감까지 15분 남음", icon: "⏰" }
"""
```

### 템플릿 Fallback

AI 실패 시 사전 정의 템플릿:

```python
TEMPLATES = {
    'task_reminder_gentle': "{emoji} {task_title} 일정이에요",
    'task_due_normal': "{emoji} {task_title}, {time_remaining} 남음",
    'daily_report': "📖 오늘의 하루 정리가 준비됐어요",
    'project_milestone': "🎉 {project_title}의 {section}을 완성했어요!",
    'contact_reminder': "💌 {contact_name}에게 연락하기로 했어요",
}
```

---

## 8.7 피로 관리 (Fatigue Prevention)

### 일일 알림 상한

사용자별 설정:

```
Light 페르소나 기본: 일 5개
Medium 페르소나 기본: 일 8개
Heavy 페르소나 기본: 일 15개

상한 도달 시:
- 낮은 priority 알림은 묶음 ("3개의 알림")
- 다음 날로 이월 (optional)
```

### Cluster (묶음 알림)

연속 알림이 피로를 유발하므로:

```python
def cluster_notifications(pending: List[Notification]):
    # 15분 이내 연속된 알림 묶기
    clusters = []
    current_cluster = []
    
    for notif in sorted(pending, key=lambda x: x.scheduled_for):
        if not current_cluster:
            current_cluster.append(notif)
        elif (notif.scheduled_for - current_cluster[-1].scheduled_for).minutes <= 15:
            current_cluster.append(notif)
        else:
            clusters.append(current_cluster)
            current_cluster = [notif]
    
    if current_cluster:
        clusters.append(current_cluster)
    
    # 묶음이 3개 이상이면 하나로 합침
    for cluster in clusters:
        if len(cluster) >= 3:
            combined = combine_into_summary(cluster)
            # 예: "앞으로 1시간 안에 3개의 일정이 있어요"
```

### 응답 기반 적응

- 사용자가 계속 dismiss하는 알림 → 다음번 intensity 낮춤
- 오랫동안 앱 안 열면 → "조용히 기다릴게요" 모드
- 피드백 학습 (Phase 3)

---

## 8.8 Smart Scheduling

### 최적 시간 추천

사용자의 앱 활용 패턴 학습:

```python
def find_best_notification_time(user, category):
    # 과거 30일 데이터
    history = get_notification_history(user, category)
    
    # 각 시간대별 응답률
    response_rates = calculate_hourly_response_rates(history)
    
    # 상위 3개 시간대
    best_hours = sorted(response_rates.items(), key=lambda x: -x[1])[:3]
    
    return best_hours
```

예: "보고서 리마인드는 오전 9시에 가장 반응 좋음"

### 적응형 지연

```python
def adaptive_defer(notification, user_context):
    # 중요도 낮은 알림은 "다음 자연스러운 시점"으로 지연
    if notification.priority == 'low':
        next_app_open_estimate = predict_next_app_open(user_context)
        if next_app_open_estimate < 2_hours:
            # 어차피 곧 열 거니까 푸시 안 보냄
            return 'deferred_to_inapp'
    
    return 'send_now'
```

---

## 8.9 인앱 알림 (In-App)

푸시와 별개로 앱 내 알림 센터:

```
┌─────────────────────────────┐
│ 🔔 알림 (3개 새로)           │
├─────────────────────────────┤
│ 🤖 "임+2명" 이름 확인해주세요│
│ 📖 저녁 보고서 준비됨        │
│ 🎉 Q1 리포팅 섹션 완성!     │
└─────────────────────────────┘
```

각 항목 탭 → 관련 화면 이동.

---

## 8.10 Do Not Disturb

### 자동 DND

- Calendar에서 "회의" 이벤트 중
- Focus 모드 활성 (iOS)
- 수면 시간 (Health)
- 운전 중 (CarPlay/Android Auto)

### 수동 DND

사용자 토글:

```
[🌙 방해 금지 모드] 
 ├── 오늘 종일
 ├── 2시간 동안
 ├── 이 일정 동안
 └── 사용자 설정 시간
```

DND 중 알림은 큐에 보관, 해제 시 요약 표시.

---

## 8.11 특수 알림: 저녁 보고서

매일 21:00 (사용자 설정 가능):

```
┌─────────────────────────────┐
│ 📖 오늘의 하루 정리이 왔어요  │
│                              │
│ 3개 태스크 완료,             │
│ 2개 새로 추가됨              │
│                              │
│ [보기] [나중에]              │
└─────────────────────────────┘
```

### 조건부 생성

- 오늘 입력이 하나도 없으면 → 생성 안 함 (빈 보고서 방지)
- 사용자가 수동으로 "지금 정리" 요청 가능

---

## 8.12 특수 알림: 팀 활동

팀원의 활동이 사용자에게 영향을 줄 때:

```
👥 민수님이 당신을 태스크 담당자로 지정했어요
   "Q1 보고서 작성" - 금요일까지
   [확인] [위임]

👥 수진님이 "디자인 리뷰"를 완료했어요
   → 다음 태스크 진행 가능

👥 팀장님이 프로젝트 "Q2 출시" 만들고 당신 초대
   [참여] [거절]
```

팀원 활동은 기본 gentle, 사용자가 담당인 경우만 normal.

---

## 8.13 이메일/Slack 알림 (Phase 2+)

### 이메일

- 저녁 보고서 이메일 전송 (선택)
- 주간 요약 (일요일 저녁)
- 팀 초대

### Slack

- 팀 플랜 전용
- 채널에 MDA 봇 추가
- "/mda today" 등 slash command

---

## 8.14 사용자 설정 UI

```
설정 > 알림

🔔 전체 알림         [ON]

카테고리별:
📅 일정 알림         [모두]
📊 프로젝트          [일부]
📖 저녁 보고서       [켬]
👥 팀 활동           [일부]
💬 AI 제안           [끔]

시간대:
🌙 조용 시간         [22:00 ~ 07:00]
☀️ 집중 시간         [없음]

강도:
일일 최대 알림       [8개]
강한 알림 허용       [긴급만]

소리:
태스크 완료          [부드러운 차임]
보고서 도착          [종소리]

[고급 설정]
```

---

## 8.15 디버깅 & 로깅

### 알림 로그

```typescript
interface NotificationLog {
  id: string;
  user_id: string;
  category: string;
  intensity: string;
  
  scheduled_for: Timestamp;
  sent_at: Timestamp | null;
  context_at_send: UserContext;
  
  deferred_count: number;
  defer_reasons: string[];
  
  delivery_status: 'sent' | 'failed' | 'cancelled';
  
  // User interaction
  opened_at: Timestamp | null;
  acted_at: Timestamp | null;
  dismissed_at: Timestamp | null;
  time_to_action_seconds: number | null;
}
```

개발자용 대시보드:
- 일일 전송량
- 응답률 (카테고리별)
- 피로도 지표 (연속 dismiss 비율)

---

## 8.16 구현 스택

### 기술

- **FCM (Firebase Cloud Messaging)**: 모든 푸시 전송 허브
- **APNs**: iOS (FCM 경유)
- **Android**: FCM 직접
- **Web Push**: Service Worker (웹 앱)
- **Cloud Functions**: 스케줄러 및 라우팅

### Expo 모바일

- `expo-notifications` for 푸시
- `expo-task-manager` for 백그라운드 처리
- `expo-device` for 디바이스 식별

---

## 8.17 Phase 1 구현 체크리스트

- [ ] 태스크 due_date 기반 자동 알림
- [ ] 3단계 강도 구현
- [ ] Quiet hours 지원
- [ ] 저녁 보고서 알림
- [ ] 사용자 확인 요청 알림
- [ ] 기본 사용자 설정 UI

## Phase 2

- [ ] 맥락 감지 (meeting, location)
- [ ] AI 메시지 생성
- [ ] 묶음 알림
- [ ] 팀 활동 알림
- [ ] 적응형 지연

## Phase 3

- [ ] 학습 기반 최적 시간
- [ ] 이메일 알림
- [ ] Slack 통합
- [ ] 웨어러블 알림 (Watch/Wear)
- [ ] 강한 알림 (wake screen)

# 04. AI 에이전트 스펙

AI 에이전트의 행동·프롬프트·판단 로직을 정의한다.

---

## 4.1 AI 에이전트의 역할

MDA의 AI는 **도구가 아니라 에이전트**다. 다음 네 가지 역할을 수행한다:

1. **입력 수용자 (Receiver)** — 사용자의 모든 입력을 받아들임 (음성·텍스트·파일·외부 연동)
2. **분류자 (Classifier)** — 의도를 파악해 업무/일기/관계/질문으로 분기
3. **구조화자 (Structurer)** — 러프한 입력을 데이터 모델에 맞춰 구조화
4. **동반자 (Companion)** — 저녁 보고서, 회고, 격려, 리마인드 제공

---

## 4.2 Gemini 모델 선택

| 용도 | 모델 | 이유 |
|------|------|------|
| 분류·구조화 (실시간) | `gemini-2.0-flash-lite` | 빠르고 저렴, JSON 출력 안정적 |
| 복잡 분해 (프로젝트 생성) | `gemini-2.0-flash` | 깊이 있는 추론 |
| 저녁 보고서 | `gemini-2.0-flash` | 긴 컨텍스트 처리 |
| 이미지/파일 이해 | `gemini-2.0-flash` (멀티모달) | 이미지·PDF 이해 |
| 음성 → 텍스트 | Whisper API 또는 네이티브 STT | 한국어 안정성 |

**Fallback 정책**: Gemini 장애 시 Claude API (Sonnet) 사용. 이중화.

---

## 4.3 의도 분류 (Intent Classification)

### 입력 → 분류 파이프라인

```
[Raw Input: "내일 오후 3시 치과, 금요일 보고서 제출, 오늘 기분 좋음"]
          ↓
[Segment Parser]  — 문장 단위로 파편 분리
          ↓
[Intent Classifier] — 각 파편에 intent 부여
          ↓
[
  { segment: "내일 오후 3시 치과", intent: "schedule" },
  { segment: "금요일 보고서 제출", intent: "task_creation" },
  { segment: "오늘 기분 좋음", intent: "journal_emotion" }
]
          ↓
[Entity Extractor] — 각 intent에 맞는 필드 추출
          ↓
[Context Matcher] — 기존 프로젝트·태스크·연락처와 매칭
          ↓
[Confidence Scorer] — 매칭 확신도 계산
          ↓
[Action Proposer] — 생성/업데이트/연결 제안
```

### Intent 카테고리 (상세)

| Intent | 설명 | 예시 |
|--------|------|------|
| `task_creation` | 새 태스크 | "보고서 작성해야 해" |
| `task_update` | 기존 태스크 수정 | "그 회의 금요일로 옮겨줘" |
| `project_creation` | 새 프로젝트 | "제주 미션북 프로젝트 시작" |
| `schedule` | 일정 (시간 있음) | "내일 3시 치과" |
| `journal_emotion` | 감정 표현 | "오늘 기분 좋음" |
| `journal_event` | 일상 이벤트 | "카페에서 민수 만남" |
| `contact_mention` | 사람 언급 | "민수랑 다음주에 만나야 해" |
| `reminder_set` | 리마인드 요청 | "2주 뒤에 연락해봐야 해" |
| `question` | AI에게 질문 | "이번 주 뭐 해야 했더라" |
| `noise` | 무의미한 발화 | "음... 어..." |

### 프롬프트 (의도 분류)

```python
INTENT_CLASSIFIER_PROMPT = """
너는 사용자의 일상 입력을 분석하는 AI다.

사용자 입력을 문장 단위로 나누고, 각 문장의 의도를 다음 카테고리 중 하나로 분류해라:

- task_creation: 새로 해야 할 일
- task_update: 기존 일 수정
- project_creation: 큰 프로젝트 시작
- schedule: 시간 정해진 일정
- journal_emotion: 감정 표현
- journal_event: 일상 이벤트
- contact_mention: 사람 언급
- reminder_set: 나중 알림 요청
- question: AI에게 질문
- noise: 무의미한 발화

출력은 반드시 다음 JSON 스키마를 따른다:

{
  "segments": [
    {
      "original_text": "원문 그대로",
      "intent": "카테고리",
      "confidence": 0.0-1.0,
      "extracted_entities": {
        "date": "ISO date 또는 null",
        "time": "HH:MM 또는 null",
        "people": ["이름"],
        "location": "장소 또는 null",
        "emotion": "감정 키워드 또는 null",
        "action": "동작 키워드 또는 null"
      }
    }
  ],
  "overall_mood": "전체 입력의 분위기 (positive/neutral/negative)",
  "urgency": "전체 긴급도 (low/normal/high)"
}

다음은 사용자의 기존 컨텍스트다:
- 활성 프로젝트: {active_projects}
- 최근 언급된 사람: {recent_contacts}
- 오늘 이미 등록된 태스크: {today_tasks}
- 현재 시각: {current_time}
- 사용자 타임존: {timezone}

사용자 입력:
{user_input}
"""
```

### 출력 JSON 스키마 검증

```typescript
// Zod schema
const SegmentSchema = z.object({
  original_text: z.string(),
  intent: z.enum([
    'task_creation', 'task_update', 'project_creation',
    'schedule', 'journal_emotion', 'journal_event',
    'contact_mention', 'reminder_set', 'question', 'noise'
  ]),
  confidence: z.number().min(0).max(1),
  extracted_entities: z.object({
    date: z.string().nullable(),
    time: z.string().nullable(),
    people: z.array(z.string()),
    location: z.string().nullable(),
    emotion: z.string().nullable(),
    action: z.string().nullable(),
  })
});

const ClassificationResultSchema = z.object({
  segments: z.array(SegmentSchema),
  overall_mood: z.enum(['positive', 'neutral', 'negative']),
  urgency: z.enum(['low', 'normal', 'high']),
});
```

### 실패 시 Fallback

- JSON 파싱 실패 → 재시도 (최대 2회)
- 2회 실패 → Claude API로 fallback
- 모두 실패 → 원본 보존 + "분류 실패" 상태로 저장, 사용자 확인

---

## 4.4 Context Matcher (매칭)

의도가 `task_creation`, `project_creation` 등으로 분류되면, 기존 엔터티와 매칭 시도:

### 매칭 알고리즘

1. **시맨틱 유사도**: Gemini embedding으로 벡터 유사도 계산
2. **키워드 매칭**: 제목·설명·태그 단순 매칭
3. **시간 근접성**: 비슷한 시간대 태스크는 같은 프로젝트일 확률
4. **담당자 일치**: 언급된 사람이 담당자로 있는지

### 확신도 계산

```typescript
function calculateMatchConfidence(
  segment: Segment,
  candidate: Project | Task
): number {
  const semanticScore = cosineSimilarity(segment.embedding, candidate.embedding);
  const keywordScore = keywordOverlap(segment.text, candidate.title);
  const timeScore = timeProximity(segment.date, candidate.date);
  const contextScore = contextOverlap(segment.people, candidate.members);
  
  return weightedAverage([
    { score: semanticScore, weight: 0.4 },
    { score: keywordScore, weight: 0.3 },
    { score: timeScore, weight: 0.2 },
    { score: contextScore, weight: 0.1 },
  ]);
}
```

### 확신도에 따른 분기

| 확신도 | 액션 |
|--------|------|
| ≥ 0.9 | 자동 연결, 사용자 알림 ("Q1 마케팅에 추가함") |
| 0.7 - 0.9 | 제안, 사용자 1탭 승인 |
| 0.5 - 0.7 | 여러 후보 제시, 사용자 선택 |
| < 0.5 | 독립 태스크로 생성, 나중에 재검토 |

---

## 4.5 프로젝트 분해 (Project Decomposition)

사용자가 자연어로 프로젝트를 설명하면, AI가 만다라트 구조로 분해.

### 입력 예시

> "제주 미션북이라는 책 만들기 프로젝트야. 6개월 정도 걸릴 거고, 가족과 함께 해. 
> 기획, 제주 답사, 사진 촬영, 글쓰기, 편집, 출판 단계가 있을 것 같아."

### AI 분해 프롬프트

```python
PROJECT_DECOMPOSITION_PROMPT = """
너는 프로젝트 매니저 AI다. 사용자가 설명한 프로젝트를 다음 규칙에 따라 분해해라.

규칙:
1. 최상위 프로젝트를 명확히 정의
2. 3~8개의 섹션으로 분해 (8개 초과 금지)
3. 각 섹션에 3~8개의 태스크 제안
4. 각 태스크에는 예상 일정, 예상 소요 시간, 산출물 포함
5. 확실하지 않은 정보는 null로 두고 `needs_clarification` 플래그

출력 JSON 스키마:

{
  "project": {
    "title": "프로젝트명",
    "description": "상세 설명",
    "target_date": "ISO date 또는 null",
    "estimated_duration_months": 숫자,
    "members_needed": ["역할"],
    "success_criteria": "성공 기준"
  },
  "sections": [
    {
      "title": "섹션명",
      "description": "섹션 목적",
      "emoji": "적절한 이모지",
      "order": 0,
      "estimated_duration_weeks": 숫자,
      "tasks": [
        {
          "title": "태스크명",
          "description": "상세",
          "estimated_hours": 숫자,
          "due_offset_days": "프로젝트 시작 기준 며칠째",
          "priority": "low/normal/high",
          "deliverables": ["산출물"],
          "needs_clarification": true/false,
          "clarification_questions": ["질문"]
        }
      ]
    }
  ],
  "questions_for_user": [
    "사용자에게 물어봐야 할 핵심 질문 (최대 3개)"
  ],
  "initial_confidence": 0.0-1.0
}

사용자 설명: {user_description}
사용자 컨텍스트: {user_context}
"""
```

### 분해 후 대화 플로우

1. AI가 러프한 만다라트 차트 생성
2. `questions_for_user` 1~2개만 먼저 사용자에게 질문
3. 답변 반영해 업데이트
4. 사용자 "더 물어볼 것 있어?" → 남은 질문
5. 사용자 만족 → 프로젝트 확정

### 한 번에 많이 묻지 않기 원칙

**금지**: 5개 질문 한 번에 쏘기  
**권장**: 가장 중요한 1~2개 질문만, 나머지는 "검토 필요" 플래그

---

## 4.6 일기 처리 (Journal Processing)

`journal_emotion`, `journal_event`로 분류된 세그먼트는 일기 엔터티로 처리.

### 감정 추출

```python
EMOTION_EXTRACTOR_PROMPT = """
다음 텍스트에서 감정 정보를 추출해라.

출력:
{
  "primary_emotion": "joy/calm/excited/anxious/sad/angry/tired/grateful/proud/neutral",
  "intensity": 0-10,
  "secondary_emotions": ["보조 감정"],
  "context": "감정의 원인으로 추정되는 상황",
  "is_concerning": true/false
}

텍스트: {text}

주의:
- 단순 푸념인지, 실제 위기 신호인지 구분
- `is_concerning`이 true면 해당 내용은 따로 플래그
"""
```

### 안전 장치

**자해·자살 시그널 감지**:
- 감지되면 `is_concerning: true` + 즉시 사용자에게 지원 리소스 안내
- 이 경우 일상 기능(태스크 생성 등) 일시 중단하고 공감 응답 우선

```
AI 응답 예:
"오늘 힘드셨나 봐요. 혼자 감당하기 어려우시면 
자살예방상담전화 ☎ 1393 에 연락해보세요. 
저는 제가 도울 수 있는 것만 하겠지만, 전문가의 도움이 더 필요해 보여요."
```

### 일기 엔트리 생성

```typescript
{
  entry_date: new Date(),
  content: 원문_또는_정제된_버전,
  emotion: 'tired',
  emotion_intensity: 6,
  mentioned_contact_ids: [matched_contacts],
  tags: ['가족', '일상'],
  is_private: true, // 기본값
  source_entry_ids: [daily_entry_id]
}
```

---

## 4.7 저녁 보고서 생성 (Daily Synthesis)

### 트리거

매일 `user_settings.daily_report_time` (기본 21:00) 자동 실행.

### 입력 자료

- 오늘의 모든 DailyEntry
- 오늘 완료/수정된 Task
- 오늘 생성된 JournalEntry
- 오늘 언급된 PersonContact
- 외부 연동 데이터 (Calendar 이벤트 등)

### 생성 프롬프트

```python
DAILY_REPORT_PROMPT = """
너는 사용자의 하루를 요약하는 AI다. 다음 데이터를 바탕으로 저녁 보고서를 생성해라.

입력 데이터:
- 오늘의 입력: {entries}
- 완료된 태스크: {completed_tasks}
- 진행 중 태스크: {in_progress_tasks}
- 일기 항목: {journal_entries}
- 만난 사람: {mentioned_contacts}
- 캘린더 이벤트: {calendar_events}

생성 규칙:
1. 비즈니스 섹션: 사실 기반, 간결, 성취 중심
2. 일기 섹션: 공감적, 따뜻, 판단 없음
3. 한 줄 요약: 오늘의 핵심 (15자 이내)
4. 내일 예정: 3개 이하로 우선순위 고정
5. 리마인드: 주의할 것 1-3개

출력 JSON:
{
  "one_liner": "오늘의 한 줄",
  "business": {
    "highlights": ["주요 성취 1-3"],
    "progress_notes": "프로젝트 진행 코멘트"
  },
  "journal": {
    "emotional_arc": "감정 흐름 설명",
    "reflective_question": "내일을 위한 질문 (optional)"
  },
  "tomorrow_preview": ["내일 우선순위 1-3"],
  "reminders": ["알림 1-3"]
}

톤: 다정하지만 과하지 않게. 전문가 친구처럼.
"""
```

### 보고서 표시

사용자에게 푸시 알림: "오늘의 하루가 정리됐어요 📖"

앱에서 보고서 열면:
- 한 줄 요약 (큰 글씨)
- 비즈니스 섹션 (펼침 가능)
- 일기 섹션 (펼침 가능)
- 원본 드릴다운 버튼 (각 항목에서 음성 재생 가능)
- 수정 버튼

---

## 4.8 확인 UX (Confirmation UX)

### 원칙

- 한 번에 1-2개 질문만
- 질문은 명확하고 단답 가능해야
- 탭 1회로 승인 가능
- 스킵 가능 (나중에 저녁 보고서에서 재검토)

### 확인 카드 패턴

```
┌─────────────────────────────┐
│ 🤔 이거 맞나요?              │
│                              │
│ "보고서 제출"을              │
│ → Q1 마케팅 프로젝트          │
│    > 리포팅 섹션              │
│    > 금요일까지               │
│                              │
│ [✅ 맞아요]  [❌ 다른 곳에]   │
│ [🔄 나중에 물어봐]           │
└─────────────────────────────┘
```

### 복수 질문 UX

여러 질문이 쌓이면:

```
┌─────────────────────────────┐
│ 3개 확인이 필요해요          │
│ 지금 할까요? 저녁에 할까요?  │
│                              │
│ [지금 확인 (30초)]           │
│ [저녁 보고서에서]            │
└─────────────────────────────┘
```

---

## 4.9 알림 판단 (Notification Decision)

AI가 알림을 보낼지 말지 판단하는 로직.

### 입력 조건

- Task의 due_date
- 사용자의 current activity (조용 시간, 외출 중 등)
- 이미 보낸 알림 수 (하루 기준)
- 사용자의 응답 패턴 (앱 열기 빈도)

### 판단 로직

```python
def should_notify(task, user_context, today_notifications):
    # Hard limits
    if today_notifications.count >= user.notification_cap:
        return False
    
    if user_context.is_quiet_hours():
        if task.priority != 'urgent':
            return False
    
    if user_context.is_in_meeting:
        return False  # 회의 끝날 때까지 지연
    
    # Time-based
    minutes_until_due = (task.due_date - now).minutes
    
    if minutes_until_due <= 15:
        return 'strong'
    elif minutes_until_due <= 60:
        return 'normal'
    elif minutes_until_due <= 180:
        return 'gentle' if task.priority != 'low' else False
    
    return False
```

### 맥락 기반 메시지 톤

```python
NOTIFICATION_MESSAGE_PROMPT = """
태스크 알림 메시지를 작성해라. 톤: 다정하지만 과하지 않게.

태스크: {task}
사용자 상태: {context}
페르소나: {persona}
강도: {intensity}

출력: 알림 제목 + 본문 (각 30자 이내)

예시:
- gentle: "오후 3시 치과 예약 있어요 ☺️"
- normal: "30분 후 치과 예약이에요"  
- strong: "치과 예약 시간입니다 ⏰"

죄책감 유발 금지. "아직 안 하셨나요?" 같은 표현 금지.
"""
```

---

## 4.10 AI 에이전트 컨텍스트 관리

### 사용자 컨텍스트 구성

매 AI 호출 시 다음 정보를 시스템 프롬프트에 포함:

```typescript
interface UserContext {
  user_profile: {
    persona: 'light' | 'medium' | 'heavy';
    timezone: string;
    language: 'ko' | 'en';
    current_local_time: string;
  };
  
  active_projects: Array<{
    id: string;
    title: string;
    sections: string[];
    members: string[];
  }>;
  
  recent_tasks: Array<{
    id: string;
    title: string;
    status: string;
  }>; // 최근 7일, 최대 30개
  
  recent_contacts: Array<{
    id: string;
    name: string;
    last_mention: string;
  }>; // 최근 30일, 최대 20개
  
  today_tasks: Array<{
    id: string;
    title: string;
    due_time: string | null;
  }>;
  
  integrations_active: string[]; // ['google_calendar', 'notion']
  
  preferences: {
    default_confirmation_level: 'minimal' | 'normal' | 'strict';
    tone: 'formal' | 'casual' | 'friendly';
  };
}
```

### 컨텍스트 크기 관리

- 최대 토큰 예산: 8k (응답 포함 16k)
- 초과 시 우선순위 삭제: noise > 오래된 컨텍스트 > 최근 컨텍스트
- 대화 세션에서는 요약 기법 사용 (10턴마다 요약)

---

## 4.11 대화 세션 (Conversational Session)

사용자가 지속 대화를 원할 때.

### 세션 엔터티

```typescript
interface ConversationSession {
  id: string;
  user_id: string;
  started_at: Timestamp;
  ended_at: Timestamp | null;
  
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Timestamp;
    created_entities: string[]; // 생성된 entity IDs
  }>;
  
  summary: string | null; // 10턴 이상 시 요약
  
  purpose: 'project_planning' | 'daily_review' | 'general' | null;
}
```

### 대화 규칙

1. 세션 시작 시 사용자 컨텍스트 로드
2. 5턴마다 자동 저장
3. 10턴 이상 시 이전 대화 요약
4. 종료 조건: 사용자 명시적 종료, 30분 비활성, 앱 닫힘

---

## 4.12 품질 관리

### AI 응답 품질 모니터링

- 모든 AI 호출 로깅
- 사용자의 수정률 추적 (높으면 프롬프트 개선 필요)
- A/B 테스트 가능한 구조

### Fallback 체인

```
1차: Gemini 2.0 Flash Lite
  ↓ (실패/타임아웃)
2차: Gemini 2.0 Flash
  ↓ (실패)
3차: Claude Sonnet (Anthropic API)
  ↓ (실패)
최종: 원본 보존 + 사용자 수동 처리
```

### 비용 관리

- 사용자별 월간 토큰 quota
- Free: 100k 토큰/월
- Plus: 1M 토큰/월
- Team: 5M 토큰/월/사용자
- 초과 시 절제 모드 (분류만, 분해 제한)

---

## 4.13 프롬프트 버전 관리

모든 프롬프트는 `packages/shared/prompts/` 에 버전 관리:

```
/prompts
  /v1
    intent_classifier.md
    project_decomposer.md
    daily_synthesis.md
    ...
  /v2
    ...
```

변경 시:
1. 새 버전 생성 (v2)
2. A/B 테스트 (5% 트래픽)
3. 성과 측정
4. 전환 또는 롤백

---

## 4.14 프롬프트 예시 모음

상세한 프롬프트 예시는 `17_SKILLS_SPEC.md`의 `gemini-prompt-engineering` Skill 참조.

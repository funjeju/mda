# 17. Skill 스펙

자체 제작 Skill 명세. Claude Code가 MDA 개발 시 로드할 지식 모듈.

---

## 17.1 Skill이란?

Anthropic의 Skill 시스템: Claude가 특정 도메인에서 전문 지식을 로드해 더 정확하게 작동하게 하는 모듈.

각 Skill은 `SKILL.md` 파일 + 관련 리소스로 구성. 트리거에 맞는 Skill이 자동 로드된다.

---

## 17.2 MDA 프로젝트 Skill 목록

| Skill | 목적 | Phase |
|-------|------|-------|
| `mda-domain-knowledge` | MDA 고유 개념·용어·결정 | 1 |
| `gemini-prompt-engineering` | Gemini 최적 프롬프트 | 1 |
| `firestore-schema-guardian` | 스키마 준수 검증 | 1 |
| `ui-component-library` | 디자인 시스템 컴포넌트 | 1 |
| `korean-nlp-helper` | 한국어 처리 | 1 |
| `mandarart-renderer` | 만다라트 뷰 구현 | 1 |
| `voice-input-pipeline` | 음성 입력 파이프라인 | 1 |
| `evening-report-composer` | 저녁 보고서 생성 | 1 |
| `notification-planner` | 알림 스케줄링 | 2 |
| `team-collaboration-patterns` | 협업 기능 | 2 |
| `integration-adapter` | 외부 연동 공통 | 2 |
| `stripe-billing-flows` | Stripe 결제 | 2 |

---

## 17.3 `mda-domain-knowledge`

```markdown
---
name: mda-domain-knowledge
description: MDA(마이 데일리 에이전트) 프로덕트의 핵심 개념·용어·설계 결정을 참조한다. 만다라트·Dual Asset·페르소나·저녁 보고서 등 MDA 고유 개념을 다룰 때 이 Skill을 로드한다.
---

# MDA Domain Knowledge

## 북극성
"나의 하루를 — 라이프든 비즈니스든 — 가장 스마트하고 편리하게,
치밀하고 불안하지 않게 요약하고 관리해주는 솔루션"

## 10대 결정
1. 이름: MDA
2. 타겟: Light/Medium/Heavy
3. 범위: Phase 1+2+3
4. 플랫폼: 웹+iOS+Android
5. 프라이버시: Firebase 기본, E2E 업그레이드 가능
6. 협업: Phase 1부터
7. 연동: Calendar+Notion+Gmail+Photos+Location+Health
8. 수익: Freemium + B2B
9. 디자인: 웜 톤 + 스티커 다꾸
10. 개발: Claude Code 주도

## 핵심 개념
- **만다라트**: 3x3 재귀 (Project→Section→Task, 최대 8개)
- **다축 피벗**: 섹션/팀/시간 축 전환
- **멀티 뷰**: 투두/만다라트/캘린더/간트
- **Dual Asset**: 업무/일기 이중 분기
- **독립 vs 프로젝트 태스크**: project_id optional
- **저녁 보고서**: 매일 자동 생성
- **3버튼 위젯**: 🎙️/✏️/📎
- **페르소나**: Light/Medium/Heavy
- **다꾸**: 커스터마이징

## 페르소나 요약
- Light: 27세 마케터 · 독립 태스크 · 다꾸 강조
- Medium: 34세 프리랜서 · 프로젝트+일상
- Heavy: 41세 PM · 팀+간트+대시보드

## 금지
- 북극성 어기는 기능
- 치밀vs불안 균형 깨기
- 사용자에 메타 작업 부담
- 죄책감 유발 알림
- 일기를 업무와 혼합 저장

## 관련 문서
- 00_MASTER.md · 01_PRODUCT_VISION.md · 02_CORE_CONCEPTS.md
```

---

## 17.4 `gemini-prompt-engineering`

```markdown
---
name: gemini-prompt-engineering
description: Google Gemini API 최적 프롬프트 패턴. JSON 강제 출력, 한국어 처리, 구조화된 분류, Fallback. Gemini 호출 코드 작성 시 로드한다.
---

# Gemini Prompt Engineering

## 1. JSON 강제 출력

```typescript
import { SchemaType } from '@google/generative-ai';

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    intent: { type: SchemaType.STRING, enum: [...] },
    confidence: { type: SchemaType.NUMBER },
  },
  required: ['intent', 'confidence'],
};

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: schema,
  },
});
```

## 2. 시스템 프롬프트 템플릿
```
너는 {역할}이다.
역할 설명: {책임}
출력: {JSON 스키마 명시}
규칙: {1. 2. 3.}
예시: {입력→출력}
사용자 컨텍스트: {context}
```

## 3. 한국어 처리
- 시스템 프롬프트 한국어로 작성 (성능↑)
- 날짜 사전 명시 ("오늘/내일/다음주")
- 존댓말 톤 일관
- 업계 용어 사전

## 4. 확신도 패턴
- confidence < 0.7 시 needs_clarification: true
- alternatives 배열로 대안 확신도

## 5. Temperature
- 분류·구조화: 0.2~0.3
- 보고서 요약: 0.5~0.7
- 자유 대화: 0.7~0.9

## 6. Fallback 체인
```typescript
flash-lite → flash → claude sonnet
```

## 7. 재시도
- exponential backoff
- 최대 2회
- 최종 실패 시 원본 보존

## 8. 토큰 관리
- Input: 6k
- Output: 2k
- 초과 시 컨텍스트 압축

## 자주 하는 실수
- ❌ 스키마 없이 "JSON으로"만
- ❌ 예시 없는 복잡 분류
- ❌ 한국어/영어 혼용
- ❌ Fallback 없는 단일 의존
```

---

## 17.5 `firestore-schema-guardian`

```markdown
---
name: firestore-schema-guardian
description: MDA Firestore 스키마 준수 검증. 03_DATA_MODEL.md의 스키마와 컬렉션 구조를 참조하며, 필드 추가·변경 시 영향을 검증한다. Firestore 코드 작성 시 로드한다.
---

# Firestore Schema Guardian

## 필수 원칙
1. BaseEntity 상속 (id, team_id, created_at, updated_at, created_by, deleted_at, metadata)
2. Team 단위 논리 분리
3. 독립 태스크는 tasks_independent
4. Soft delete 전용
5. 새 필드는 optional + default

## 스키마 변경 체크리스트
- [ ] Zod 스키마 업데이트
- [ ] TypeScript 타입 업데이트
- [ ] Security Rules 업데이트
- [ ] Composite Index 필요 여부
- [ ] 마이그레이션 필요?
- [ ] 하위 호환?
- [ ] 03_DATA_MODEL.md 업데이트

## 컬렉션 경로
```
✅ teams/{teamId}/projects/{projectId}/tasks/{taskId}
✅ teams/{teamId}/tasks_independent/{taskId}
✅ users/{userId}/private/settings
❌ tasks/{taskId}  (team_id 없음)
```

## 쿼리 원칙
- team_id where 필수
- deleted_at == null 필터
- Composite Index 사전 정의

## Rules 패턴
```javascript
allow read: if isMember(teamId);
allow write: if hasRole(teamId, ['owner', 'admin', 'member']);

// is_private 일기는 본인만
allow read: if resource.data.is_private
  ? request.auth.uid == resource.data.created_by
  : isMember(teamId);
```

## 자주 하는 실수
- ❌ team_id 없이 쿼리
- ❌ deleted_at 필터 누락
- ❌ Rules 업데이트 누락
- ❌ denormalized 필드 동기화 안 함
```

---

## 17.6 `ui-component-library`

```markdown
---
name: ui-component-library
description: 07_DESIGN_SYSTEM.md 기반 UI 컴포넌트 생성. 웜 톤 컬러, 라운드 코너, 다꾸 시스템, Light/Heavy 변형. React 컴포넌트 작성 시 로드한다.
---

# UI Component Library

## 토큰 사용 원칙
- raw hex 금지 (bg-[#F6F1E7] ❌)
- semantic token 사용 (bg-cream, text-ink-900, bg-mustard)
- 8px 그리드 간격
- 라운드: rounded-md (버튼), rounded-xl (카드), rounded-lg (셀)

## 컴포넌트 패턴
```tsx
import { cn } from '@/lib/utils';

export function Button({ variant = 'primary', size = 'md', className, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-md transition',
        {
          'bg-mustard text-ivory hover:bg-mustard/90': variant === 'primary',
          'border border-beige hover:bg-cream': variant === 'secondary',
          'hover:bg-cream/50': variant === 'ghost',
          'bg-coral text-white': variant === 'danger',
        },
        {
          'h-8 px-3 text-sm': size === 'sm',
          'h-10 px-4 text-base': size === 'md',
          'h-12 px-6 text-lg': size === 'lg',
        },
        className
      )}
      {...props}
    />
  );
}
```

## 페르소나 변형
```tsx
function Cell({ task, persona }) {
  const isLight = persona === 'light';
  return (
    <div className={cn(
      'p-4 bg-cream',
      isLight ? 'rounded-xl shadow-warm-sm' : 'rounded-md shadow-sm'
    )}>{/* ... */}</div>
  );
}
```

## 접근성
- 모든 interactive에 aria-label
- 키보드 내비게이션 (tabIndex)
- 색상만으로 정보 전달 금지

## 자주 하는 실수
- ❌ hex 하드코딩
- ❌ style 인라인
- ❌ 접근성 속성 누락
- ❌ Heavy에 과도한 장식
```

---

## 17.7 `korean-nlp-helper`

```markdown
---
name: korean-nlp-helper
description: 한국어 NLP 헬퍼. 날짜 표현, 감정 키워드, 인명 추출, 존댓말. 한국어 입력 파싱·생성 시 로드한다.
---

# Korean NLP Helper

## 날짜 사전
| 표현 | 의미 |
|---|---|
| 오늘 | today |
| 내일 | +1 day |
| 모레 | +2 days |
| 글피 | +3 days |
| 다음주 | next Monday |
| 다다음주 | +2 weeks |
| 이번주 X요일 | this week's X |
| 월말 | end of month |
| 다음달 초 | start of next month |
| 연말 | end of year |

## 시간 표현
- 새벽: 03-06 / 아침: 06-09 / 점심: 12 / 저녁: 18-21 / 밤: 21-24

## 감정 키워드
```typescript
const EMOTION_KEYWORDS = {
  joy: ['기쁘', '좋', '행복', '즐거', '신나', '뿌듯', '만족'],
  calm: ['평온', '차분', '고요', '안정', '편안'],
  anxious: ['불안', '걱정', '초조', '긴장'],
  sad: ['슬프', '우울', '눈물', '외로'],
  angry: ['화나', '짜증', '분노', '열받'],
  tired: ['피곤', '지쳐', '힘들', '무기력'],
  grateful: ['감사', '고마운', '덕분'],
  proud: ['자랑', '뿌듯', '해냈'],
};
```

## 인명 추출 휴리스틱
- 한글 2~4자
- 호칭 접미: 씨, 님, 형, 누나, 오빠, 언니, 선배
- 영문 이름: PascalCase

## 존댓말 톤
알림·보고서는 항상 존댓말:
- ❌ "보고서 써" → ✅ "보고서 작성할 시간이에요"
- ❌ "완료됐다" → ✅ "완료됐어요"

## 자주 하는 실수
- ❌ "다음주" = +7 days (틀림, 다음주 월요일)
- ❌ 한 글자로 감정 판정 ("화" → angry)
- ❌ 존댓말 섞임
- ❌ 띄어쓰기 무시
```

---

## 17.8 `mandarart-renderer`

```markdown
---
name: mandarart-renderer
description: 만다라트(3x3 재귀 격자) UI 구현. 셀 레이아웃, 재귀 진입 애니메이션, 피벗 전환. 만다라트 관련 컴포넌트 작성 시 로드한다.
---

# Mandarart Renderer

## 셀 인덱스 → 위치
```
0: top-left    1: top-center    2: top-right
7: mid-left    C: center        3: mid-right
6: bot-left    5: bot-center    4: bot-right
```
시계 방향 0→4.

## 기본 레이아웃
```tsx
export function MandaraGrid({ center, cells }) {
  const positions = [
    cells[0], cells[1], cells[2],
    cells[7], center,    cells[3],
    cells[6], cells[5], cells[4],
  ];
  return (
    <div className="grid grid-cols-3 gap-2 aspect-square">
      {positions.map((cell, i) => (
        <MandaraCell key={cell?.id ?? `empty-${i}`} data={cell} isCenter={i === 4} />
      ))}
    </div>
  );
}
```

## 재귀 진입 애니메이션
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={currentLevel}
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 1.2 }}
    transition={{ duration: 0.4 }}
  >
    <MandaraGrid {...props} />
  </motion.div>
</AnimatePresence>
```

## 피벗 전환
같은 데이터, 셀 라벨만 변경.
```tsx
function useMandaraPivot(tasks, axis) {
  return useMemo(() => {
    switch (axis) {
      case 'section':  return groupBy(tasks, 'section_id').map(sectionToCell);
      case 'assignee': return groupBy(tasks, 'assignee_id').map(assigneeToCell);
      case 'time':     return groupByTimeBlock(tasks).map(timeToCell);
    }
  }, [tasks, axis]);
}
```

## 반응형
- 모바일: 전체 화면 3x3
- 태블릿: 500x500
- 데스크톱: 700x700 중앙

## 접근성
- 각 셀 role="button", aria-label
- 화살표 키로 이동, Enter 진입

## 자주 하는 실수
- ❌ 셀 인덱스 순서 틀림
- ❌ 8개 초과 허용
- ❌ 진행률 계산 오류
- ❌ 애니메이션 과함 (2초 넘으면 지루)
```

---

## 17.9 `voice-input-pipeline`

```markdown
---
name: voice-input-pipeline
description: 음성 녹음→STT→AI 분류→Entity 생성 전체 파이프라인. Whisper API, 네이티브 STT, Gemini 조합. 음성 입력 기능 구현 시 로드한다.
---

# Voice Input Pipeline

## 흐름
1. 녹음 (Expo Audio / MediaRecorder)
2. Firebase Storage 업로드
3. Recording entity 생성
4. STT 선택 (30s 미만: 네이티브, 이상: Whisper)
5. Transcript → DailyEntry
6. Gemini 분류
7. Entity 생성
8. 푸시 알림

## STT 선택
```typescript
async function transcribe(audio) {
  if (audio.duration < 30) {
    try {
      const r = await nativeSTT(audio);
      if (r.confidence > 0.85) return r;
    } catch {}
  }
  try {
    return await whisperAPI(audio, { language: 'ko' });
  } catch {
    return await geminiAudioTranscribe(audio);
  }
}
```

## 레이턴시 목표
- 녹음 시작: < 500ms
- STT (30s): < 5s
- 분류: < 2s
- Entity 생성: < 1s
- 총: < 10s

## 실패 대응
- 네트워크 끊김: 로컬 큐
- STT 실패: Fallback 체인
- AI 실패: 원본 보존 + 수동 처리 안내

## 한국어 특수
- Whisper 호출 시 language: 'ko' 명시
- 시간 표현 사전 전처리 (korean-nlp-helper)

## 자주 하는 실수
- ❌ STT 품질 체크 없이 사용
- ❌ 오프라인 큐 미구현
- ❌ 긴 녹음 청킹 누락
```

---

## 17.10 `evening-report-composer`

```markdown
---
name: evening-report-composer
description: 저녁 보고서 생성 파이프라인. 데이터 수집, Gemini 프롬프트, 렌더링, 편집. 저녁 보고서 작업 시 로드한다.
---

# Evening Report Composer

## 트리거
- 사용자 설정 시간 (기본 21:00)
- 수동 요청
- 조건: 오늘 입력 3개 이상

## 데이터 수집
```typescript
async function collectTodayData(userId) {
  const [entries, tasks, journals, contacts, events] = await Promise.all([
    getDailyEntries(userId, today),
    getCompletedTasks(userId, today),
    getJournalEntries(userId, today),
    getMentionedContacts(userId, today),
    getCalendarEvents(userId, today),
  ]);
  return { entries, tasks, journals, contacts, events };
}
```

## Gemini 호출
- model: gemini-2.0-flash
- temperature: 0.5 (약간의 창의성)
- JSON 출력 강제
- 시스템 프롬프트: 04_AI_AGENT_SPEC 4.7 참조

## 톤 규칙
- 공감적, 따뜻, 판단 없음
- 한 줄 요약 15자 이내
- 내일 예정 3개 이하
- 죄책감 금지
- 전문가 친구 같은 담담함

## 조건부 생성
- 입력 3개 미만 → "조용한 하루였어요" 미니 요약
- 빈 보고서 강제 금지

## 편집 플로우
- 항목 탭 → 이동/수정/삭제
- 원본 드릴다운 (음성 재생)
- 편집 이력 저장

## 자주 하는 실수
- ❌ 빈 날 보고서 강제 생성
- ❌ 판단·조언 삽입
- ❌ 일기 민감 내용 과도 노출
```

---

## 17.11 `notification-planner` (Phase 2)

```markdown
---
name: notification-planner
description: 알림 스케줄링·강도·맥락 조정. 태스크 due 자동 생성, 3단계 강도, 묶음, DND. 알림 관련 작업 시 로드한다.
---

# Notification Planner

## 스케줄 규칙
Task 생성/수정 시 자동:
- -24h: gentle
- -2h: if priority >= normal
- -30m: if priority >= high
- 0m: normal ~ strong

## 강도 분기
| 조건 | 강도 |
|---|---|
| 15분 이내 + urgent | strong |
| 15분 이내 | normal |
| 1시간 이내 | gentle |
| 3시간 이내 + priority | gentle |

## 맥락 조정
- Quiet hours: urgent 외 지연
- In meeting: 지연
- Moving: prefer_audio
- Low battery: priority >= high만
- Sleeping: 억제

## 피로 방지
- 일일 상한 (Light 5/Medium 8/Heavy 15)
- 15분 이내 3개 묶음
- 연속 dismiss 시 다음번 강도 감소

## 죄책감 금지
- ❌ "또 안 하셨네요"
- ❌ "미뤄졌어요"
- ✅ "준비됐나요?"
- ✅ "일정 시간이에요"

## 자주 하는 실수
- ❌ quiet hours 무시
- ❌ priority 상관없이 동일 강도
- ❌ 묶음 미적용
```

---

## 17.12 `team-collaboration-patterns` (Phase 2)

```markdown
---
name: team-collaboration-patterns
description: 팀 협업 공통 패턴. 초대, 권한, 담당자, 댓글, 피드. 협업 기능 작업 시 로드한다.
---

# Team Collaboration Patterns

## 권한 체크
```typescript
export function canEditProject(user, project) {
  const member = getTeamMember(user.id, project.team_id);
  if (!member) return false;
  if (['owner', 'admin'].includes(member.role)) return true;
  if (project.owner_id === user.id) return true;
  return false;
}
```

## 매트릭스
| 액션 | Owner | Admin | Member | Viewer |
|---|---|---|---|---|
| 팀 삭제 | ✓ | | | |
| 멤버 초대 | ✓ | ✓ | | |
| 프로젝트 생성 | ✓ | ✓ | ✓ | |
| 태스크 생성 | ✓ | ✓ | ✓ | |
| 태스크 완료 | ✓ | ✓ | 담당자 | |
| 읽기 | ✓ | ✓ | ✓ | ✓ |

## 담당자 배정
- 생성 시 자동 지정 AI 힌트
- 드래그로 이동
- 권한: 배정자·Admin·Owner만

## 댓글 & 멘션
- @ 자동완성
- 멘션 시 푸시 알림
- 1단계 중첩 답글

## 팀 피드
- 타임라인 형태
- 필터 (나 관련/프로젝트별/팀원별)

## 자주 하는 실수
- ❌ team_id 없이 권한 체크
- ❌ project-level override 무시
- ❌ 일기를 팀원에 노출
- ❌ viewer에 쓰기 허용
```

---

## 17.13 `integration-adapter` (Phase 2)

```markdown
---
name: integration-adapter
description: 외부 서비스 연동 공통 패턴. OAuth, 토큰 갱신, Webhook, 에러 처리. Calendar·Notion·Gmail 등 연동 작업 시 로드한다.
---

# Integration Adapter

## OAuth 플로우
```
설정 > 연동 > [서비스] 연결
→ OAuth URL redirect
→ 사용자 승인
→ code → tokens 교환 (Cloud Function)
→ 암호화 저장
→ Integration entity 생성
→ 첫 동기화
```

## 토큰 관리
- access_token: KMS 암호화
- refresh_token: KMS 암호화
- 만료 시 자동 갱신
- 갱신 실패 → 사용자 재인증 알림

## 공통 Adapter 인터페이스
```typescript
interface IntegrationAdapter {
  provider: IntegrationProvider;
  connect(userId: string): Promise<AuthURL>;
  handleCallback(code: string): Promise<Integration>;
  sync(integration: Integration): Promise<SyncResult>;
  disconnect(integration: Integration): Promise<void>;
}
```

## Rate Limit 대응
- exponential backoff
- 24h 재시도 실패 → 사용자 알림

## Webhook vs Polling
- Webhook 가능: Google Calendar, Notion, GitHub
- Polling: Gmail (15분 주기)
- Fallback: Webhook 실패 시 Polling

## 동기화 방향 원칙
- Calendar: 일방향 IN 기본, 양방향 선택
- Notion: 임포트/익스포트 일회성만 (양방향 금지)
- Gmail: 읽기 전용
- Health: 읽기 전용

## 자주 하는 실수
- ❌ 양방향 동기화 충돌 미처리
- ❌ 토큰 클라이언트 노출
- ❌ Rate limit 무시
- ❌ 사용자 비동의 데이터 수집
```

---

## 17.14 `stripe-billing-flows` (Phase 2)

```markdown
---
name: stripe-billing-flows
description: Stripe 결제 플로우. Checkout, Webhook, 구독 상태 동기화, seat 관리. 결제 기능 작업 시 로드한다.
---

# Stripe Billing Flows

## Checkout Session 생성
```typescript
const session = await stripe.checkout.sessions.create({
  customer: user.stripe_customer_id,
  line_items: [{ price: PLUS_PRICE_ID, quantity: 1 }],
  mode: 'subscription',
  success_url: `${origin}/settings/billing?success=1`,
  cancel_url: `${origin}/settings/billing?cancel=1`,
});
```

## Webhook 이벤트 핸들링
```typescript
// /api/webhooks/stripe
switch (event.type) {
  case 'checkout.session.completed':
    await activateSubscription(event.data.object);
    break;
  case 'customer.subscription.updated':
    await updateSubscription(event.data.object);
    break;
  case 'customer.subscription.deleted':
    await cancelSubscription(event.data.object);
    break;
  case 'invoice.payment_failed':
    await handlePaymentFailed(event.data.object);
    break;
}
```

## 구독 상태 필드
```typescript
interface UserSubscription {
  tier: 'free' | 'plus' | 'team' | 'business';
  status: 'active' | 'past_due' | 'canceled' | 'paused';
  stripe_customer_id: string;
  stripe_subscription_id: string;
  current_period_end: Timestamp;
  cancel_at: Timestamp | null;
  seat_count: number;
}
```

## Firestore Rules 연동
```javascript
function hasTier(tier) {
  let user = get(/databases/$(database)/documents/users/$(request.auth.uid));
  let tiers = ['free', 'plus', 'team', 'business'];
  return tiers.indexOf(user.data.subscription_tier) >= tiers.indexOf(tier);
}

allow write: if hasTier('plus');
```

## Seat 관리 (Team)
- 초대 시 seat_count 자동 증가
- 제거 시 다음 청구 주기에 반영
- Pro-rated 청구 (Stripe 자동)

## 한국 결제 고려
- Stripe Tax로 부가세 10%
- 세금계산서 발행 (Business)
- 월 ₩9,900 심리 가격

## 결제 실패 대응
- 3회 재시도 (1일, 3일, 7일)
- 7일 이후 Free 다운그레이드
- 데이터 30일 보존
- 30일 경과 시 읽기만

## 취소 방지 UX
- 일시 정지 옵션 (1~3개월)
- 50% 할인 제안
- 사용 통계 기반 개인화 메시지

## 자주 하는 실수
- ❌ Webhook signature 검증 누락
- ❌ 구독 상태 race condition
- ❌ Firebase Custom Claims 갱신 누락
- ❌ 환불·취소 플로우 미구현
```

---

## 17.15 Skill 생성 & 관리

### 디렉토리 구조
```
/tooling/skills
  /mda-domain-knowledge
    SKILL.md
    resources/
      terminology.md
      decisions.md
  /gemini-prompt-engineering
    SKILL.md
    examples/
      intent_classifier.ts
      project_decomposer.ts
  /firestore-schema-guardian
    SKILL.md
    schemas/
  ...
```

### 각 Skill의 품질 기준
- description 명확 (언제 로드할지 즉시 판단 가능)
- frontmatter 정확
- 300~800 줄 (너무 길면 비효율)
- 예시 포함
- "자주 하는 실수" 섹션
- 관련 MD 문서 링크

### Skill 업데이트
- 프로덕트 결정 변경 시 해당 Skill 즉시 업데이트
- 버전 관리 (git)
- 변경 시 Claude Code에 notify

### Skill 작성 원칙
1. **실행 가능한 예시** — 복붙 가능한 코드
2. **결정과 근거** — "왜 이렇게 하는지"
3. **금지 패턴 명시** — 흔한 실수 예방
4. **외부 문서 링크** — 깊은 참조 가능

---

## 17.16 Claude Code의 Skill 사용 규칙

- 작업 시작 시 관련 Skill 자동 감지 후 로드
- Skill 내용과 작업이 충돌하면 제작자에게 확인
- Skill이 불충분하면 제작자에게 보완 요청
- 자의적으로 Skill 내용 무시 금지

---

## 17.17 구현 우선순위

### Phase 1 (최우선)
- [ ] mda-domain-knowledge
- [ ] gemini-prompt-engineering
- [ ] firestore-schema-guardian
- [ ] ui-component-library
- [ ] korean-nlp-helper

### Phase 1 (보조)
- [ ] mandarart-renderer
- [ ] voice-input-pipeline
- [ ] evening-report-composer

### Phase 2
- [ ] notification-planner
- [ ] team-collaboration-patterns
- [ ] integration-adapter
- [ ] stripe-billing-flows

### Phase 3 (도메인 확장 시)
- [ ] mda-edu-specific
- [ ] mda-creator-specific

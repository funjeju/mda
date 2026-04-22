# 16. Claude Code 개발 가이드

이 문서는 **Claude Code에게 주는 지시서**다. Claude Code는 이 프로젝트에서 작업할 때 반드시 이 가이드를 따른다.

---

## 16.1 제작자의 역할 & Claude Code의 역할

### 제작자 (펀제주)

- 디렉터 / 아키텍트
- 비전·우선순위·의사결정
- 최종 검증
- 예외적 복잡 이슈 해결

### Claude Code

- 실행자 / 엔지니어
- MD 문서 기반 구현
- 테스트 작성
- 리팩토링 제안
- 진행 상황 업데이트

### 협업 방식

```
제작자: "14_PHASE_ROADMAP Week 5-6의 Gemini 통합 해줘"
  ↓
Claude Code: 
  1. 04_AI_AGENT_SPEC.md 전체 읽기
  2. 13_TECH_STACK.md의 Gemini 섹션 읽기
  3. 현재 구현 상태 확인
  4. 구현 계획 제시 → 제작자 승인
  5. 구현 + 테스트
  6. 16_CLAUDE_CODE_GUIDE의 체크리스트 업데이트
```

---

## 16.2 매 작업 전 필수 체크

### 1단계: 컨텍스트 로드

```
[필수 읽기]
- 00_MASTER.md (매번)
- 해당 작업 도메인 MD (전체)
- 16_CLAUDE_CODE_GUIDE.md (이 문서)
- 17_SKILLS_SPEC.md (관련 Skill)

[조건부 읽기]
- 테스트 작성 시: 관련 테스트 패턴 문서
- 디자인 작업 시: 07_DESIGN_SYSTEM.md
- 데이터 작업 시: 03_DATA_MODEL.md 해당 섹션
```

### 2단계: 북극성 확인

> "나의 하루를 — 라이프든 비즈니스든 — 가장 스마트하고 편리하게, 치밀하고 불안하지 않게 요약하고 관리해주는 솔루션"

이 문장에 부합하는지 확인. 어긋나면 제작자에게 질문.

### 3단계: 의존성 확인

- 이 기능이 다른 기능에 의존하는지
- 선행 구현이 완료됐는지
- 미완료 시 제작자에게 순서 확인

### 4단계: 구현 계획 제시

```
📋 구현 계획
목표: [무엇을]
범위: [어디까지]
의존: [무엇이 필요]
접근: [어떻게]
산출물: [무엇을 만들 것]
예상 시간: [얼마나]
위험: [잠재 이슈]

[승인 대기]
```

---

## 16.3 코드 품질 규칙

### TypeScript 엄격 모드

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true
  }
}
```

### 명명 규칙

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수·함수 | camelCase | `taskList`, `createTask` |
| 타입·인터페이스 | PascalCase | `Task`, `TaskStatus` |
| 상수 | UPPER_SNAKE | `MAX_TOKENS` |
| 컴포넌트 | PascalCase | `MandaraCell` |
| 파일 (컴포넌트) | PascalCase | `MandaraCell.tsx` |
| 파일 (유틸) | camelCase | `dateParser.ts` |
| 파일 (타입) | kebab-case | `task-types.ts` |
| Firestore 필드 | snake_case | `due_date`, `team_id` |
| API 엔드포인트 | kebab-case | `/api/process-entry` |

### 함수 원칙

```typescript
/**
 * 사용자 입력을 AI로 분류하고 엔터티를 생성한다.
 * 
 * @param entry - 분류할 DailyEntry
 * @param context - 사용자 컨텍스트
 * @returns 생성된 엔터티 IDs
 * @throws {ValidationError} 입력이 유효하지 않을 때
 * @throws {AIProcessingError} AI 호출 실패 시
 */
async function processDailyEntry(
  entry: DailyEntry,
  context: UserContext
): Promise<ProcessingResult> {
  // 1. 입력 검증
  const validated = validateEntry(entry);
  
  // 2. AI 분류
  const classifications = await classifyIntent(validated, context);
  
  // 3. 엔터티 생성
  const created = await createEntities(classifications);
  
  // 4. 저장
  await saveResults(entry.id, created);
  
  return { success: true, created };
}
```

- **단일 책임** (Single Responsibility)
- **짧게** (30줄 이내 권장)
- **순수 함수 지향** (사이드 이펙트 최소)
- **JSDoc** (공개 함수 필수)

### 에러 처리

```typescript
// ❌ 나쁨
async function fetchTask(id: string) {
  const doc = await getDoc(ref);
  return doc.data(); // undefined 가능성
}

// ✅ 좋음
async function fetchTask(id: string): Promise<Task | null> {
  try {
    const doc = await getDoc(taskRef(id));
    if (!doc.exists()) return null;
    return TaskSchema.parse(doc.data());
  } catch (error) {
    logger.error('Failed to fetch task', { id, error });
    throw new TaskFetchError(id, error);
  }
}
```

### 매직 넘버 금지

```typescript
// ❌
if (tokens > 100000) { /* ... */ }

// ✅
const FREE_TIER_MONTHLY_TOKEN_LIMIT = 100_000;
if (tokens > FREE_TIER_MONTHLY_TOKEN_LIMIT) { /* ... */ }
```

---

## 16.4 디렉토리 구조 규칙

### 앱별 표준

```
/apps/web/src
  /app                    # Next.js App Router
    /(marketing)
    /(auth)
    /(app)
  /components
    /ui                   # 재사용 UI (shadcn)
    /features             # 기능별 컴포넌트
      /tasks
      /projects
      /journal
    /layouts
  /hooks                  # 공통 훅
  /lib                    # 유틸
  /types                  # 앱 전용 타입
  /styles

/apps/mobile/app
  /(tabs)
  /project
  /task
  ...
/apps/mobile/src
  /components
  /hooks
  /native-modules
  ...

/packages/shared/src
  /types                  # 공통 타입
  /schemas                # Zod 스키마
  /utils
  /constants
  /enums
```

### 규칙

- 파일 하나에 컴포넌트 하나 (export default)
- 1000 줄 이상 파일 금지 (쪼개기)
- import 순서: React → 외부 → 내부 → 상대 → 스타일

---

## 16.5 테스트 규칙

### 필수 테스트 대상

- 모든 유틸 함수
- 비즈니스 로직 (shared)
- Cloud Functions
- 중요 컴포넌트 (Button, MandaraCell 등)
- 통합: 주요 플로우

### 테스트 우선순위

```
Critical (must have):
- AI 분류 로직
- 데이터 변환
- 인증·권한
- 결제 플로우

Important (should have):
- UI 컴포넌트
- 라우팅
- 폼 검증

Nice to have:
- 애니메이션
- 스타일
```

### 테스트 패턴

```typescript
// dateParser.test.ts
describe('parseKoreanDate', () => {
  describe('상대적 날짜', () => {
    it('"내일"을 다음 날로 파싱', () => {
      const today = new Date('2026-04-21');
      const result = parseKoreanDate('내일', { now: today });
      expect(result).toEqual(new Date('2026-04-22'));
    });
    
    it('"다음주 금요일"을 다음 주 금요일로 파싱', () => {
      // ...
    });
  });
  
  describe('엣지 케이스', () => {
    it('빈 문자열 시 null 반환', () => {
      expect(parseKoreanDate('')).toBeNull();
    });
    
    it('모호한 표현 시 null 반환', () => {
      expect(parseKoreanDate('언젠가')).toBeNull();
    });
  });
});
```

---

## 16.6 커밋 & PR 규칙

### 커밋 메시지

Conventional Commits:

```
feat: 음성 입력 Whisper 통합
fix: 만다라트 셀 렌더링 버그
docs: 04_AI_AGENT_SPEC 프롬프트 섹션 업데이트
refactor: processEntry 함수 분리
test: dateParser 테스트 추가
chore: 의존성 업데이트
perf: 태스크 리스트 쿼리 최적화
```

### PR 사이즈

- < 300 줄 변경 (권장)
- > 500 줄은 쪼개기 시도
- 하나의 PR = 하나의 목적

### PR 템플릿

```markdown
## 변경 사항
- [무엇을 했는지]

## 이유
- [왜 했는지]

## 영향
- [어디에 영향이 있는지]

## 테스트
- [어떻게 검증했는지]

## 체크리스트
- [ ] MD 문서 준수
- [ ] 테스트 추가
- [ ] 문서 업데이트
- [ ] 성능 영향 고려
- [ ] 보안 영향 고려
```

### 리뷰

- 제작자(펀제주)가 최종 승인
- Claude Code가 자체 리뷰 후 제출
- CI 통과 필수

---

## 16.7 MCP 활용

### 설정된 MCP 서버

Claude Code는 다음 MCP를 통해 작업한다:

| MCP | 용도 |
|-----|------|
| **Firebase MCP** | Firestore 스키마·Rules 검증 |
| **GitHub MCP** | 커밋·PR·이슈 |
| **Figma MCP** | 디자인 파일 참조 |
| **Vercel MCP** | 배포 상태 |
| **Stripe MCP** | 결제 설정 (Phase 2+) |

### MCP 사용 예

```
제작자: "새 Cloud Function 만들 때 Firebase Rules도 업데이트해줘"

Claude Code:
1. [Firebase MCP] 현재 Rules 조회
2. 새 엔터티 접근 규칙 추가
3. 로컬 에뮬레이터로 테스트
4. [Firebase MCP] 배포
```

---

## 16.8 Skill 활용

자체 제작 Skill (상세는 `17_SKILLS_SPEC.md`):

### `mda-domain-knowledge`

- MDA의 핵심 개념·용어·결정 전문 지식
- "만다라트", "Dual Asset", "페르소나" 관련 작업 시 참조

### `gemini-prompt-engineering`

- Gemini 최적 프롬프트 패턴
- JSON 강제 출력 노하우
- 한국어 특수 처리

### `firestore-schema-guardian`

- 03_DATA_MODEL.md 준수 검증
- 스키마 변경 시 마이그레이션 체크

### `ui-component-library`

- 07_DESIGN_SYSTEM.md 기반 컴포넌트 생성
- 디자인 토큰 강제

### `korean-nlp-helper`

- 한국어 날짜·시간 파싱
- 한국어 감정 키워드
- 한국어 명명 규칙

---

## 16.9 버그 리포트 & 이슈 처리

### 버그 발견 시

```
1. 재현 단계 확인
2. 관련 MD 문서 확인 (설계와 어긋나는지)
3. 기존 테스트에 누락 있는지
4. 수정 + 회귀 테스트 추가
5. 이슈 → PR 연결
```

### 우선순위

- **P0** (치명적): 데이터 손실·보안·크래시 → 즉시 중단하고 수정
- **P1** (높음): 핵심 기능 작동 안 함 → 1일 내
- **P2** (중간): 특정 상황 문제 → 1주 내
- **P3** (낮음): 개선 사항 → 다음 Phase

---

## 16.10 리팩토링 가이드

### 타이밍

- 기능 추가하기 어려워졌을 때
- 같은 패턴 3번 반복 시 (Rule of Three)
- 버그 수정 시 주변 코드
- Phase 종료 시 전용 주간

### 원칙

- Test first (리팩토링 전 테스트 확보)
- Small steps (작은 변경 여러 번)
- Preserve behavior (외부 동작 보존)
- Measure (성능 등 지표 확인)

### 하지 말 것

- 기능 추가 + 리팩토링 동시
- 이해 못한 코드 리팩토링
- 테스트 없는 리팩토링

---

## 16.11 성능 최적화 가이드

### 기본 원칙

**"Measure first, optimize second"**

### 자주 보는 이슈

1. **React 불필요한 재렌더** → `memo`, `useMemo`, `useCallback`
2. **Firestore N+1** → 배치 쿼리, denormalization
3. **큰 번들** → Dynamic import
4. **큰 이미지** → Next/Image, Expo Image 최적화
5. **긴 초기 로드** → Code splitting, prefetch

### 측정

- Lighthouse (웹)
- React DevTools Profiler
- Firebase Performance
- 사용자 중심 지표 (LCP, FID, CLS)

---

## 16.12 보안 체크리스트

매 PR마다:

- [ ] API 키 하드코딩 없음
- [ ] 환경 변수는 `.env` + gitignore
- [ ] 사용자 입력 검증 (XSS 방지)
- [ ] SQL/NoSQL Injection 방지 (Firestore는 기본 안전)
- [ ] Firestore Rules 검증
- [ ] 토큰 클라이언트 노출 없음
- [ ] HTTPS 강제
- [ ] CSRF 방지 (Next.js는 기본)

---

## 16.13 접근성 체크리스트

- [ ] 모든 인터랙티브 요소에 aria-label
- [ ] 키보드 내비게이션 가능
- [ ] 포커스 표시
- [ ] 색상만으로 정보 전달 안 함
- [ ] 대비 4.5:1 이상
- [ ] 이미지에 alt
- [ ] Dynamic Type 지원 (모바일)

---

## 16.14 국제화 (i18n) 준비

Phase 1은 한국어만. Phase 3에 영어.

### 현재 지켜야 할 것

```typescript
// ❌
<Text>태스크를 완료했어요</Text>

// ✅
import { t } from '@/i18n';
<Text>{t('task.completed')}</Text>
```

모든 UI 문자열은 i18n 키로 관리.

---

## 16.15 AI 호출 가이드

### Gemini 호출

```typescript
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: IntentClassificationSchema,
    maxOutputTokens: 2048,
    temperature: 0.3,
  },
  systemInstruction: SYSTEM_PROMPT,
});

const result = await model.generateContent(userInput);
const parsed = IntentClassificationSchema.parse(
  JSON.parse(result.response.text())
);
```

### 규칙

- **항상 JSON 강제**
- **항상 Zod 검증**
- **타임아웃 설정** (5초)
- **재시도 로직** (최대 2회)
- **Fallback** (Claude)
- **비용 추적** (사용자별 quota)

---

## 16.16 Firestore 작업 가이드

### 쿼리 최적화

```typescript
// ❌ 필요 이상 가져옴
const all = await getDocs(tasksCol);
const mine = all.docs.filter(d => d.data().assignee_id === userId);

// ✅ Firestore에서 필터링
const mine = await getDocs(
  query(tasksCol, where('assignee_id', '==', userId))
);
```

### 배치 쓰기

```typescript
const batch = writeBatch(db);
tasks.forEach(task => {
  batch.update(taskRef(task.id), { status: 'done' });
});
await batch.commit();
```

### 트랜잭션

```typescript
await runTransaction(db, async (transaction) => {
  const projectDoc = await transaction.get(projectRef);
  transaction.update(projectRef, {
    tasks_completed: projectDoc.data().tasks_completed + 1,
  });
});
```

---

## 16.17 디버깅 가이드

### 우선순위

1. **console.log에 의존하지 말기** — 구조화된 로거 사용
2. **재현 먼저** — 버그 재현 없이 수정 시작 금지
3. **가장 작은 실패 사례** — 최소 재현 케이스 만들기
4. **rubber duck** — 코드를 말로 설명해보기
5. **한 번에 하나씩 변경** — 여러 곳 동시에 건드리지 않기

### 로거

```typescript
import { logger } from '@/lib/logger';

logger.info('Processing entry', { entryId, userId });
logger.warn('AI confidence low', { confidence, threshold });
logger.error('Failed to process', { error, entryId });
```

개발: console, 운영: Sentry.

---

## 16.18 문서 업데이트

Claude Code가 구현 후:

### 필수 업데이트

- `00_MASTER.md` 현재 상태 체크리스트
- 기능 MD의 "구현 우선순위 체크리스트"
- `16_CLAUDE_CODE_GUIDE.md`의 "현재 구현 상태"
- 새 컴포넌트·함수에 JSDoc

### 옵션 업데이트

- ADR 작성 (중요 결정 시)
- CHANGELOG.md (사용자용)
- README.md (개발자용)

---

## 16.19 현재 구현 상태 (Live Document)

### Phase 1 진행률 (2026-04-22 기준)

- [x] 모노레포 셋업 (Turborepo, apps/web, packages/shared, packages/prompts)
- [x] Firebase 설정 (Admin SDK, Firestore Rules, FCM Service Worker)
- [x] 기본 인증 (verifyUser, Google OAuth)
- [x] 타이핑 입력 (DailyEntry API)
- [x] AI 의도 분류 (Gemini 2.0 Flash Lite 통합)
- [x] 태스크 생성 (v1 API, Slack 연동 포함)
- [x] 저녁 보고서 생성 (Cloud Function Cron)
- [ ] 음성 녹음 (모바일 전용, Phase 1.5)
- [ ] 위젯 (iOS) — 모바일 앱 완성 후
- [ ] 위젯 (Android) — 모바일 앱 완성 후
- [x] 만다라트 뷰 (ProjectMandaraView 컴포넌트)
- [x] 디자인 1차 적용 (웜 톤 토큰, shadcn 기반)

### Skills 시스템 (2026-04-22 신규)

- [x] `/tooling/skills/mda-domain-knowledge/SKILL.md`
- [x] `/tooling/skills/gemini-prompt-engineering/SKILL.md`
- [x] `/tooling/skills/firestore-schema-guardian/SKILL.md`
- [x] `/tooling/skills/ui-component-library/SKILL.md`
- [x] `/tooling/skills/korean-nlp-helper/SKILL.md`
- [x] `/tooling/skills/mandarart-renderer/SKILL.md`
- [x] `/tooling/skills/voice-input-pipeline/SKILL.md`
- [x] `/tooling/skills/evening-report-composer/SKILL.md`
- [x] `/tooling/skills/notification-planner/SKILL.md`
- [x] `/tooling/skills/team-collaboration-patterns/SKILL.md`
- [x] `/tooling/skills/integration-adapter/SKILL.md`
- [x] `/tooling/skills/stripe-billing-flows/SKILL.md`

Claude Code가 작업 완료 시 여기를 업데이트.

---

## 16.20 "Claude Code, 시작하기 전 체크"

작업 시작 전 Claude Code는 다음을 확인한다:

- [ ] 00_MASTER.md 읽음
- [ ] 작업 도메인 MD 읽음
- [ ] 17_SKILLS_SPEC.md 관련 Skill 확인
- [ ] 현재 구현 상태 파악
- [ ] 의존성 확인
- [ ] 구현 계획 제작자에게 공유
- [ ] 승인 받음

작업 후:

- [ ] 코드 + 테스트 작성
- [ ] 자체 리뷰
- [ ] 문서 업데이트
- [ ] 커밋 메시지 규칙 준수
- [ ] PR 생성
- [ ] CI 통과 확인

---

## 16.21 Claude Code가 절대 하지 말 것

1. **북극성 문장을 어기는 기능 추가**
2. **MD 문서에 없는 필드 임의 추가** (제작자 승인 없이)
3. **테스트 없이 머지**
4. **API 키 커밋**
5. **production DB 직접 수정** (마이그레이션 없이)
6. **보안 경고 무시**
7. **Deprecated 기능 그대로 사용** (마이그레이션 필요)
8. **사용자 데이터 로깅** (PII)
9. **라이선스 불분명 코드 사용**
10. **기능 추가 + 리팩토링 동시**

---

## 16.22 소통 스타일

### Claude Code → 제작자

- 한국어로 소통
- 기술 용어는 설명 없이 사용 가능 (제작자 이해)
- 간결·명확
- 불확실 시 반드시 질문
- 큰 결정은 승인 요청

### 질문 패턴

```
❓ 확인 필요:
[구체적 질문]

배경: [왜 이 질문인지]
제안: [Claude Code의 의견]
선택지:
A) [옵션 1]
B) [옵션 2]

어떻게 진행할까요?
```

---

## 16.23 예상 실패 모드 & 대응

### 모드 1: 요구사항 모호

```
대응: 가정 명시 + 확인 요청
"이 태스크에 자동 담당자 지정을 하려고 하는데, 
기본은 누구로 할까요? 생성자 본인? 팀장? 미배정?"
```

### 모드 2: 여러 접근 가능

```
대응: 3개 이하 옵션 비교
"A) Zustand 전역 스토어 / B) React Context / C) URL 파라미터
이 경우는 A가 적합해 보입니다. 진행할까요?"
```

### 모드 3: 기존 코드와 충돌

```
대응: 충돌 명확히 설명 + 해결 방안
"현재 tasksCollection이 프로젝트 하위에 있는데, 
독립 태스크 지원하려면 별도 컬렉션이 필요합니다.
[A] 마이그레이션 [B] 이중 저장 [C] 새 구조"
```

---

## 16.24 북극성 리마인더

작업이 길어지거나 복잡해지면 Claude Code는 잠시 멈추고 북극성 문장을 다시 읽는다:

> **"나의 하루를 — 라이프든 비즈니스든 — 가장 스마트하고 편리하게, 치밀하고 불안하지 않게 요약하고 관리해주는 솔루션"**

지금 만드는 것이 이 문장에 부합하는지 자문. 아니면 제작자에게 확인.

# MDA (My Daily Agent) — MASTER

> 이 문서는 MDA 프로덕트의 **최상위 설계 문서**이며, Claude Code가 매 작업 전 참조해야 하는 북극성이다.

---

## 한 문장 정의 (North Star)

> **"나의 하루를 — 라이프든 비즈니스든 — 가장 스마트하고 편리하게, 치밀하고 불안하지 않게 요약하고 관리해주는 솔루션"**

이 문장은 모든 기능 판단의 최종 기준이다. 기능 추가/삭제/우선순위 결정 시 이 문장에 비춰 판단한다.

---

## 핵심 확정 사항 (불변)

| 항목 | 결정 |
|------|------|
| 프로덕트명 | 마이 데일리 에이전트 (MDA, My Daily Agent) |
| 타겟 | Light / Medium / Heavy 3 페르소나 전부 |
| 초기 폴리싱 기준 | 제작자 본인 |
| 개발 범위 | Phase 1 + 2 + 3 전부 설계 |
| 플랫폼 | 웹 + iOS + Android 동시 |
| 프라이버시 | Firebase 기본 보안 (E2E 업그레이드 가능 구조) |
| 협업 | Phase 1부터 포함 (1인 팀 포함) |
| 외부 연동 | Calendar + Notion + Gmail + 사진/위치/건강 (Phase 1) |
| 수익 모델 | 하이브리드 (개인 Freemium + B2B Team) |
| 디자인 톤 | 웜 톤 + 귀여운 스티커 다꾸 (라이트), 조용한 웜(헤비) |
| 개발 체제 | Claude Code 주도 + MCP + Skill + MD 문서 |

---

## 8대 설계 축

모든 기능은 다음 8축 중 하나 이상에 속한다.

1. **구조적 분해** — 만다라트 3단계 재귀 (프로젝트 → 섹션 → 태스크)
2. **다축 피벗** — 시간/팀/섹션을 동일한 시각 언어로 관통
3. **듀얼 페르소나 + 멀티 뷰 전환** — 라이트/헤비, 투두/만다라트/캘린더/간트
4. **앱+웹 듀얼 플랫폼** — 위젯 필수, 모노레포 구조
5. **Claude Code 주도 개발** — MD 정밀도가 개발 속도 결정
6. **MCP/Skill로 약점 보강** — Figma·Firebase·GitHub 등 연동
7. **Frictionless 입력** — 음성/필기/업로드 3버튼 위젯
8. **Dual Asset Branching** — 업무/일기 자동 분기 + 저녁 보고서

---

## 문서 인덱스

### 전략 & 비전
- `01_PRODUCT_VISION.md` — 비전·철학·8축·페르소나
- `02_CORE_CONCEPTS.md` — 만다라트·다축 피벗·듀얼 자산

### 설계
- `03_DATA_MODEL.md` — Firestore 스키마·타입
- `04_AI_AGENT_SPEC.md` — 의도 분류·프로젝트 분해·프롬프트
- `05_INPUT_SYSTEM.md` — 음성/대화/업로드/위젯/통화녹음
- `06_UI_UX_SPEC.md` — 뷰 전환·페르소나별 시나리오
- `07_DESIGN_SYSTEM.md` — 톤·토큰·다꾸 시스템
- `08_NOTIFICATION_SYSTEM.md` — 알림 강도·맥락 기반
- `09_DAILY_REPORT_JOURNAL.md` — 저녁 보고서·일기·관계 관리
- `10_COLLABORATION.md` — 팀·권한·담당자 배정
- `11_EXTERNAL_INTEGRATIONS.md` — 외부 연동 전체

### 실행
- `12_PLATFORM_STRATEGY.md` — 웹/iOS/Android 분업
- `13_TECH_STACK.md` — 모노레포·스택·아키텍처
- `14_PHASE_ROADMAP.md` — Phase 1/2/3 분배
- `15_MONETIZATION.md` — 티어·Stripe·B2B
- `16_CLAUDE_CODE_GUIDE.md` — 개발 운영·MCP·Skill
- `17_SKILLS_SPEC.md` — 자체 제작 Skill 명세

### 개발 추적 (Claude Code 운영)
- `feature.md` — 확정 기능 목록 (상태: 🔴미착수/🟡진행/🟢완료/⏸보류)
- `todo.md` — 현재 할 일 및 백로그 (스프린트 단위 갱신)
- `history.md` — 이슈·결정·해결 기록 (날짜 역순)

---

## Claude Code 운영 원칙

Claude Code가 이 프로젝트에서 작업할 때 반드시 따르는 규칙:

### 1. 매 작업 전 체크리스트
- [ ] `00_MASTER.md` 재확인 — 북극성 문장에 부합하는지
- [ ] 해당 도메인 MD 문서 확인 — 스펙 준수 여부
- [ ] `16_CLAUDE_CODE_GUIDE.md`의 현재 구현 상태 체크리스트 업데이트
- [ ] 의존 관계 확인 — 선행 작업이 완료됐는지

### 2. 작업 흐름
1. 작업 대상 기능의 MD 문서를 **전체 읽기** (발췌 금지)
2. 현재 구현 상태 확인
3. 구현 전 설계 검토 메시지로 사용자에게 확인 요청
4. 구현 후 테스트 코드 함께 작성
5. 구현 상태 체크리스트 업데이트

### 3. 금지 사항
- 북극성 문장과 충돌하는 기능 임의 추가
- MD에 없는 필드를 데이터 모델에 임의 추가
- 의존 관계 무시한 선행 구현
- 테스트 없는 구현
- 매직 넘버·하드코딩

### 4. 품질 기준
- TypeScript strict mode
- 모든 공개 함수에 JSDoc
- 단일 책임 원칙
- 에러 처리 명시적 (try-catch 또는 Result 타입)

---

## 데이터 모델 핵심 원칙 (요약)

상세는 `03_DATA_MODEL.md` 참조.

1. **User**는 항상 **Team**에 속한다 (개인도 "1인 팀")
2. **Task**의 `project_id`는 선택 — 독립 태스크 지원
3. 모든 엔터티는 `created_at`, `updated_at`, `owner_id`, `team_id` 공통 필드
4. 삭제는 soft delete (`deleted_at`)
5. Firestore 컬렉션은 team 단위로 논리 분리
6. 실시간 동기화는 기본, 오프라인 캐시 지원

---

## AI 에이전트 핵심 원칙 (요약)

상세는 `04_AI_AGENT_SPEC.md` 참조.

1. **항상 의도 분류 먼저** — 업무/일기/관계/질문/파일
2. **구조화된 출력 강제** — JSON 스키마 기반
3. **확신도 기반 분기** — 자동 처리 / 제안 / 확인 요청
4. **한 번에 1~2개만 확인** — 질문 폭탄 금지
5. **원본 보존** — 언제든 원본 음성·텍스트로 복귀 가능
6. **맥락 활용** — 사용자의 기존 프로젝트·페르소나·시간대 반영

---

## 디자인 철학 (요약)

상세는 `07_DESIGN_SYSTEM.md` 참조.

1. **표면은 심플, 백엔드는 정밀** — 사용자는 3버튼, AI는 수십 단계 파이프라인
2. **Frictionless 입력** — 2탭 이내 어디서든 기록 가능
3. **뷰는 자유** — 같은 데이터를 보는 방법은 사용자가 선택
4. **감정적 소유감** — 다꾸 요소는 필수 (리텐션의 핵심)
5. **치밀하되 불안하지 않게** — 알림은 신호일 뿐, 죄책감 유발 금지

---

## 현재 상태 (2026-04-22 기준)

| 단계 | 상태 |
|------|------|
| 설계 문서 작성 | ✅ 완료 (00~17 전체) |
| 디자인 시스템 정의 | ✅ 완료 |
| 모노레포 초기화 | ✅ 완료 (Turborepo, apps/web, packages/shared, packages/prompts) |
| Firebase 설정 | ✅ 완료 (Admin SDK, Firestore Rules, FCM) |
| 기본 인증 | ✅ 완료 (Google OAuth, verifyUser) |
| Phase 1 웹 앱 개발 | 🟡 진행 중 |

### Phase 1 주요 완료 항목

- [x] 모노레포 구조 (Turborepo)
- [x] Firestore Security Rules (역할 기반 접근 제어)
- [x] Next.js 앱 라우터 기본 구조
- [x] 프로젝트/섹션/태스크 CRUD API
- [x] AI 입력 처리 파이프라인 (Gemini 분류)
- [x] 저녁 보고서 생성 (Cloud Function)
- [x] FCM 푸시 알림 (Service Worker 포함)
- [x] Stripe 결제 통합 (Checkout + Webhook)
- [x] 이메일 초대 (Resend)
- [x] 팀 협업 기능 (초대, 역할, 담당자)
- [x] Slack 연동 (Webhook + Slash Command)
- [x] 보안 헤더 (X-Frame-Options 등)
- [x] 팀 활동 피드 컴포넌트
- [x] Skills 시스템 (`/tooling/skills/` 12개)

### 운영 인프라 (사용자 액션 필요)

- [ ] Firebase 환경 분리 (dev/staging/prod)
- [ ] Firestore Rules 배포 (`firebase deploy --only firestore:rules`)
- [ ] RESEND_API_KEY 발급 및 환경변수 설정
- [ ] STRIPE_SECRET_KEY 발급 및 환경변수 설정
- [ ] Vercel 배포 (도메인 연결)
- [ ] NEXT_PUBLIC_APP_URL 환경변수 설정

---

## 버전 이력

| 버전 | 날짜 | 변경 사항 |
|------|------|-----------|
| 0.1 | 2026-04-21 | 최초 작성 — 10대 결정 사항 확정 |
| 0.2 | 2026-04-22 | Phase 1 웹 앱 주요 기능 구현 완료, 현재 상태 업데이트 |

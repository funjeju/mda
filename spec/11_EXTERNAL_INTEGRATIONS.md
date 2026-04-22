# 11. 외부 연동 (External Integrations)

MDA의 가치를 배가시키는 외부 서비스 연동. Phase 1부터 핵심 연동 지원.

---

## 11.1 연동 전략

### 원칙

1. **옵션이지 강제 아님** — 모든 연동은 선택
2. **단방향 기본, 양방향 신중** — 데이터 손실 방지
3. **범위 최소** — 필요한 권한만 요청
4. **투명성** — 어떤 데이터 어떻게 쓰는지 명시
5. **철회 용이** — 언제든 연결 해제 가능

### 연동 대상 (Phase별)

| 연동 | Phase | 우선순위 |
|------|-------|---------|
| Google Calendar | 1 | 매우 높음 |
| Notion | 1 | 높음 |
| Gmail | 1 | 높음 |
| Google Photos | 1 | 중간 |
| Apple Health / Google Fit | 1 | 중간 |
| 위치 서비스 | 1 | 중간 |
| Slack | 2 | 중간 |
| GitHub | 2 | 낮음 |
| Jira | 2 | 중간 |
| Spotify | 3 | 낮음 |

---

## 11.2 OAuth 아키텍처

### 공통 플로우

```
[사용자가 설정 > 연동 > Google Calendar 연결 탭]
    ↓
[OAuth 인증 페이지로 리다이렉트]
    ↓
[사용자 권한 부여]
    ↓
[Redirect back with code]
    ↓
[Cloud Function: code → tokens 교환]
    ↓
[Firebase Storage: 토큰 암호화 저장]
    ↓
[Integration entity 생성]
    ↓
[첫 동기화 시작]
```

### 토큰 관리

- `access_token`: 암호화 (KMS) 저장
- `refresh_token`: 암호화 저장
- 만료 시 자동 갱신 (Cloud Function)
- 갱신 실패 시 사용자에게 재인증 요청

---

## 11.3 Google Calendar

### 권한 범위

- `https://www.googleapis.com/auth/calendar.readonly` (기본)
- `https://www.googleapis.com/auth/calendar.events` (양방향 선택 시)

### 동기화 방향

**기본 (일방향 IN)**:
- Google Calendar → MDA (Task 자동 생성 아님, 맥락 자료)

**선택 (양방향)**:
- MDA Task with due_date → Google Calendar 이벤트

### 활용 시나리오

#### 1. 저녁 보고서 맥락

```
"오늘 뭐 했더라?" 
→ Google Calendar 이벤트 + MDA 입력 종합
→ "오후 2시 민수와 카페 미팅 하셨네요"
```

#### 2. 시간 충돌 감지

사용자가 "내일 3시 치과"라고 하면:
- Google Calendar 3시 확인
- 이미 이벤트 있으면 경고
- "기존 '팀 미팅'과 겹쳐요. 확인해주세요"

#### 3. 맥락 기반 알림

회의 끝나는 시간 인지 → 다음 태스크 알림 조정:
"15:00 미팅 끝나면 → 15:10에 알림"

#### 4. 내일 미리보기

저녁 보고서에 내일의 캘린더 이벤트 포함:
"내일 09:00 팀 스탠드업, 14:00 디자인 리뷰"

### 동기화 기술

- Google Calendar API v3
- Webhook (Push notifications) — 실시간
- Fallback: 15분 주기 폴링

### UI

```
설정 > 연동 > Google Calendar
┌─────────────────────────────┐
│ ✓ 연결됨                     │
│ funjeju@gmail.com           │
│                              │
│ 동기화 중인 캘린더:          │
│ ✓ 기본 캘린더               │
│ ✓ 팀 캘린더                 │
│ ✗ 가족 캘린더               │
│                              │
│ 동기화 방향:                │
│ ● IN만 (캘린더 → MDA)       │
│ ○ 양방향                    │
│                              │
│ [마지막 동기화: 1분 전]     │
│ [즉시 동기화] [연결 해제]   │
└─────────────────────────────┘
```

---

## 11.4 Notion

### 원칙 (중요)

**일방향 임포트/익스포트만 지원**. 양방향 동기화 안 함.

**이유**:
- Notion 스키마가 매우 자유로워 일관성 유지 불가
- 충돌 해결 복잡 (last-write-wins 만으로 부족)
- 사용자 데이터 손실 리스크

### 지원 시나리오

#### 1. Notion → MDA 임포트 (Phase 1)

```
설정 > 연동 > Notion > 임포트
  ↓
[Notion 페이지 선택]
  ↓
[매핑 설정]
  - Notion "Tasks DB" → MDA Project or Standalone Tasks
  - 속성 매핑 (Title, Due Date, Status, Assignee)
  ↓
[임포트 실행]
  ↓
[일회성 복사. 이후 Notion 변경은 반영 안 됨]
```

#### 2. MDA → Notion 익스포트 (Phase 2)

저녁 보고서·프로젝트 현황을 Notion 페이지로 내보내기:
- 마크다운 변환
- Notion API로 페이지 생성
- 일회성 (지속 동기화 아님)

### 기술

- Notion API (공식)
- 페이지네이션 처리 (대량 데이터)
- Rate limit 존중

### UI

```
설정 > 연동 > Notion

[새 임포트]
페이지/DB 선택: [선택...]
매핑 미리보기:
  Notion "이름" → MDA "제목"
  Notion "마감일" → MDA "due_date"
  Notion "상태" → MDA "status"
  
[시작]

[임포트 기록]
- 4/21: "Tasks" DB (23개 import)
- 4/15: "Project Q2" (페이지 import)
```

---

## 11.5 Gmail

### 권한

- `https://www.googleapis.com/auth/gmail.readonly` (기본)
- 또는 `gmail.metadata` (메타만, 본문 안 읽음)

### 활용

#### 1. 업무 맥락 추가

저녁 보고서에 오늘 받은 주요 이메일:
- 발신자
- 제목 (본문은 옵션)
- 읽음/답장 여부

"오늘 민수님에게 프로젝트 관련 메일 받으셨네요"

#### 2. 태스크 자동 제안

VIP 발신자나 키워드 있는 메일 감지:
```
"긴급 리뷰 부탁" 이메일 받음
  ↓
MDA가 감지
  ↓
사용자에게 제안: "이메일에서 태스크 만들까요?"
  ↓
승인 → 태스크 생성 (이메일 링크 포함)
```

**자동 생성은 하지 않음** (사용자 놀람 방지).

#### 3. 저녁 보고서 활용

```
📧 오늘의 주요 메일 (3)
- 09:15 클라이언트 A: "계약서 초안"
- 14:22 민수: "회의 후속 조치"
- 16:05 팀장: "분기 평가"
```

### 프라이버시 주의

- 메일 본문은 기본 저장 안 함
- 제목과 발신자만 메타로 보관
- 사용자가 명시적으로 태스크 생성 시만 본문 참조

---

## 11.6 Google Photos / 사진 앱

### 권한

- `photoslibrary.readonly`
- iOS: `Photos.read` (제한된 접근)

### 활용

#### 1. 일기 맥락

사용자가 "오늘 카페에 갔어"라고 하면:
- 오늘 촬영된 사진 중 위치가 카페인 것 찾기
- 일기에 사진 자동 첨부 제안
- "이 사진 일기에 추가할까요?"

#### 2. 하루 회고

저녁 보고서에:
- 오늘 찍은 사진 3~5장 (사용자 승인 시)
- 위치 기반 "오늘 다녀온 곳"

#### 3. 기억 환기

"작년 오늘" 기능:
- Google Photos의 "Memory" 유사
- 일기에 자동 연결

### 프라이버시

- 사진 자체는 Google에 남고, MDA는 메타(시간·위치)만 보관
- 사용자가 명시적으로 일기에 첨부 시만 복사

---

## 11.7 위치 서비스

### 권한

- iOS: `NSLocationWhenInUseUsageDescription`
- Android: `ACCESS_COARSE_LOCATION` (정밀도는 낮게)

### 활용

#### 1. 맥락 인지

- "집에 도착"·"사무실 도착" 자동 감지
- 알림 조정 (집에선 업무 알림 조용)
- 일기 위치 자동 입력

#### 2. 지오펜싱

사용자가 "사무실 가면 A 태스크 리마인드"라고 하면:
- 사무실 위치 지오펜스 설정
- 도착 시 알림

#### 3. 이동 감지

- CoreMotion / Activity Recognition
- 걷기·이동 중엔 음성 알림 선호
- 운전 중엔 조용

### 프라이버시 원칙

- 위치는 로컬 우선 (서버 전송 최소)
- 맥락 태그만 저장 ("집", "사무실") — 정확한 좌표 아님
- 사용자가 언제든 끌 수 있음

---

## 11.8 건강 데이터 (Apple Health / Google Fit)

### 권한

- Apple Health: `HKQuantityType` (수면, 걸음)
- Google Fit: `fitness.activity.read`

### 활용

#### 1. 컨디션 맥락

저녁 보고서:
```
😴 오늘의 컨디션
수면: 6시간 12분 (평소보다 부족)
걸음: 8,420보 (목표 달성!)
```

#### 2. AI 인사이트

"수면 적은 날은 태스크 완료율 20% 낮음" 같은 패턴.

#### 3. 건강 관련 태스크 제안

사용자가 "오늘 운동 안 했네"라고 하면:
- 걸음 수 확인
- "8000보 넘으셨어요. 충분해요" 피드백

### 프라이버시

- 건강 데이터는 특수 민감 정보
- UserPrivate에 저장
- 팀원에게 절대 노출 안 함

---

## 11.9 Slack

**Phase 2**.

### 활용

#### 1. 팀 플랜 Slack 봇

Slack 워크스페이스에 MDA 봇 추가:
- `/mda today` → 오늘의 내 태스크
- `/mda create 보고서` → 태스크 생성
- `/mda report` → 저녁 보고서
- 멘션 시 응답

#### 2. 알림 리라우팅

MDA 알림을 Slack DM으로 (선택):
- 모바일 대신 데스크톱 Slack으로

#### 3. 대화 캡처

특정 메시지를 MDA로 보내기:
- Slack 메시지 우클릭 > MDA에 저장
- 태스크/메모로 변환

---

## 11.10 GitHub (Phase 2)

### 개발자 페르소나

개발 팀용. 옵션.

### 활용

- Issue → MDA Task 자동 생성
- PR 리뷰 요청 → 알림
- 커밋 메시지로 태스크 완료 ("close #123")

### 기술

- GitHub Webhooks
- OAuth App

---

## 11.11 Jira (Phase 2)

엔터프라이즈 고객용.

### 활용

- Jira Issue → MDA Task (담당자 매핑)
- MDA에서 Jira 상태 변경
- 주간 리포트에 Jira 데이터 포함

---

## 11.12 Spotify (Phase 3)

### 활용 (감성 기능)

- 일기 쓸 때 "그때 듣던 노래" 자동 연결
- 월간 리포트에 "이 달의 사운드트랙"
- 집중 모드 때 플레이리스트 추천

순전히 감성 + 다꾸 확장.

---

## 11.13 Zapier / Make.com (Phase 3)

### MDA as Trigger/Action

Zapier/Make 통합으로 MDA를 워크플로우의 한 노드로:
- 트리거: 태스크 완료, 보고서 생성 등
- 액션: 태스크 생성, 일기 추가 등

이로써 수많은 앱과 간접 연동 가능.

---

## 11.14 연동 관리 UI

### 설정 > 연동

```
┌─────────────────────────────┐
│ 🔌 연동 관리                 │
├─────────────────────────────┤
│                              │
│ ✓ Google Calendar            │
│   funjeju@gmail.com         │
│   [설정] [연결 해제]        │
│                              │
│ ✓ Notion                     │
│   import 모드               │
│   [새 임포트] [기록]        │
│                              │
│ ✓ Gmail                      │
│   제목만 읽기 모드           │
│   [설정] [연결 해제]        │
│                              │
│ ○ Slack                      │
│   [연결하기]                 │
│                              │
│ ○ GitHub                     │
│   [연결하기]                 │
│                              │
└─────────────────────────────┘
```

### 각 연동별 상세

- 계정 정보
- 권한 범위
- 동기화 상태
- 마지막 동기화 시각
- 로그 / 오류
- 즉시 동기화
- 연결 해제

---

## 11.15 연동 오류 처리

### 토큰 만료

```
┌─────────────────────────────┐
│ ⚠️ Google Calendar 재인증   │
│ 연결이 만료됐어요.           │
│ 다시 로그인해주세요.         │
│ [로그인]                     │
└─────────────────────────────┘
```

### Rate Limit

- 지수 백오프 재시도
- 사용자에게 "잠시 후 재시도" 표시
- 24시간 내 재시도 실패 시 사용자 알림

### 데이터 충돌

- 동시 편집 시 last-write-wins
- 충돌 로그 보관
- 사용자가 롤백 요청 가능

---

## 11.16 개인정보 & 규제

### 데이터 처리 방식 공개

각 연동의 프라이버시 페이지:
- 무슨 데이터를 받는지
- 어떻게 저장하는지
- 어디에 쓰는지
- 얼마나 보관하는지
- 삭제 시 무엇이 사라지는지

### GDPR / K-PIPA 대응

- 연동 해제 시 관련 데이터 삭제
- 데이터 내보내기 요청 지원
- 처리 근거 명시 (동의)

---

## 11.17 MCP(Model Context Protocol) 연동 (Claude Code 개발용)

**주의**: 이 섹션은 **개발팀이 Claude Code로 MDA를 개발할 때** 사용하는 MCP다. 프로덕트 사용자 대상 아님.

### Claude Code가 사용할 MCP 서버

- Firebase MCP — 스키마 검증
- GitHub MCP — 커밋·PR
- Figma MCP — 디자인 참조
- 커스텀 MDA MCP — 프로젝트 컨텍스트

상세는 `16_CLAUDE_CODE_GUIDE.md` 및 `17_SKILLS_SPEC.md`.

---

## 11.18 구현 우선순위

### Phase 1

- [ ] OAuth 프레임워크
- [ ] Google Calendar (일방향 IN)
- [ ] Notion 임포트
- [ ] Gmail (메타데이터)
- [ ] Google Photos 기본
- [ ] 위치 서비스 기본
- [ ] 건강 데이터 기본

### Phase 2

- [ ] Calendar 양방향
- [ ] Notion 익스포트
- [ ] Gmail 본문 (태스크 생성 시)
- [ ] 위치 지오펜스
- [ ] Slack 봇
- [ ] GitHub
- [ ] Jira

### Phase 3

- [ ] Spotify
- [ ] Zapier/Make
- [ ] 커스텀 Webhook
- [ ] SAML SSO (엔터프라이즈)

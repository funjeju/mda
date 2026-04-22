# 05. 입력 시스템 (Input System)

사용자의 모든 입력 경로와 처리 파이프라인을 정의한다.

---

## 5.1 입력 채널 전체 맵

```
┌─────────────────────────────────────────────────┐
│                  INPUT CHANNELS                  │
├─────────────────────────────────────────────────┤
│                                                  │
│  Active Input (사용자 의도)                       │
│  ├── 3버튼 위젯                                   │
│  │   ├── 🎙️ 녹음                                 │
│  │   ├── ✏️ 필기                                 │
│  │   └── 📎 업로드                                │
│  │                                               │
│  ├── 앱 내 대화창                                 │
│  ├── 타이핑 입력                                  │
│  ├── 공유 시트 (OS Share)                         │
│  ├── Siri / Google Assistant                    │
│  └── Apple Watch / Wear OS                      │
│                                                  │
│  Passive Context (자동 수집)                      │
│  ├── Google Calendar 이벤트                      │
│  ├── Gmail 제목                                  │
│  ├── 사진 메타데이터                              │
│  ├── 위치 이력                                    │
│  └── 건강 데이터                                  │
│                                                  │
└─────────────────────────────────────────────────┘
                    ↓
            [ 통합 처리 파이프라인 ]
```

---

## 5.2 Frictionless 3버튼 위젯

### 원칙

- **2탭 이내 입력 완료**
- **앱 풀스크린 안 열기** (최소 시트만)
- **결과는 백그라운드**
- **실패해도 원본 보존**

### 위젯 디자인

```
┌────────────────────────────────┐
│                                │
│    🎙️      ✏️      📎         │
│   녹음    필기    업로드        │
│                                │
│    오늘 기록 3개               │
└────────────────────────────────┘
```

### 버튼별 동작

#### 🎙️ 녹음 버튼

```
위젯 탭
  ↓
[즉시 녹음 시작] — 시스템 오버레이 표시
  ↓
사용자 발화 (최대 5분, 설정 가능)
  ↓
[탭 또는 자동 감지로 종료]
  ↓
[백그라운드 업로드 + STT]
  ↓
[처리 완료 푸시 알림] "3건 인식, 확인해주세요"
```

**구현 요점**:
- iOS: App Intents + Live Activity로 녹음 중 표시
- Android: Glance Widget + Foreground Service
- 네트워크 없어도 녹음 → 로컬 저장 → 연결 시 업로드

#### ✏️ 필기 버튼

```
위젯 탭
  ↓
[최소 입력 시트] — 앱 안 열림
┌─────────────────────┐
│  오늘 할 일을 적어요  │
│  [             ]   │
│                    │
│  [저장]  [음성으로] │
└─────────────────────┘
  ↓
[저장]
  ↓
[백그라운드 AI 처리]
```

#### 📎 업로드 버튼

```
위젯 탭
  ↓
[OS 파일 선택기] — 사진/문서/녹음 파일
  ↓
[선택 완료]
  ↓
[백그라운드 업로드 + AI 처리]
  ↓
[처리 완료 알림]
```

### 위젯 플랫폼별 구현

| 플랫폼 | 기술 |
|--------|------|
| iOS 홈화면/잠금화면 | WidgetKit + App Intents |
| Android 홈화면 | Glance API |
| Android 잠금화면 | Android 12+ Notification-based |
| Apple Watch | WatchOS Complication + App |
| Wear OS | Wear OS Tile |

---

## 5.3 음성 입력 파이프라인

### 전체 플로우

```
[녹음 시작]
   ↓
[오디오 캡처] — 44.1kHz, m4a (iOS) / aac (Android)
   ↓
[로컬 저장] — Recording entity 생성
   ↓
[네트워크 가능 시 업로드]
   ↓
[STT 선택 로직]
   ├── iOS: 30초 미만 → 네이티브 STT
   │       30초 이상 → Whisper API
   ├── Android: 네이티브 STT (삼성/Google STT) 시도
   │            실패 시 Whisper
   └── 결과 품질 낮으면 Whisper로 재처리
   ↓
[Gemini로 전달]
   ↓
[의도 분류 + 구조화]
   ↓
[Entity 생성/업데이트]
   ↓
[사용자 알림]
```

### STT 전략 상세

```typescript
async function transcribe(audio: Audio): Promise<Transcript> {
  const duration = audio.duration_seconds;
  const platform = getCurrentPlatform();
  
  // 1차: 네이티브 STT (빠름, 무료)
  if (duration < 30) {
    try {
      const result = await nativeSTT(audio);
      if (result.confidence > 0.85) return result;
    } catch {}
  }
  
  // 2차: Whisper API (정확, 유료)
  try {
    const result = await whisperAPI(audio, { language: 'ko' });
    return result;
  } catch (e) {
    // 3차: Gemini audio mode (멀티모달)
    return await geminiAudioTranscribe(audio);
  }
}
```

### 한국어 날짜 파싱

Gemini의 한국어 날짜 표현 이해를 보조하기 위해 전처리:

```typescript
// 한국어 날짜 표현 사전
const DATE_EXPRESSIONS = {
  "오늘": () => today(),
  "내일": () => tomorrow(),
  "모레": () => dayAfterTomorrow(),
  "다음주": () => nextWeek(),
  "다다음주": () => twoWeeksFromNow(),
  "이번주 금요일": () => thisFriday(),
  "다음달 말": () => endOfNextMonth(),
  "월말": () => endOfThisMonth(),
  // ...
};

function preprocessKoreanDates(text: string): ParsedDates {
  const dates: ParsedDates = [];
  for (const [expr, resolver] of Object.entries(DATE_EXPRESSIONS)) {
    if (text.includes(expr)) {
      dates.push({
        expression: expr,
        resolved: resolver(),
      });
    }
  }
  return dates;
}
```

### 레이턴시 목표

| 단계 | 목표 | 최대 |
|------|------|------|
| 녹음 시작 지연 | < 500ms | 1s |
| STT (30초 녹음) | < 3s | 5s |
| 의도 분류 | < 2s | 4s |
| Entity 생성 | < 1s | 2s |
| 알림 도달 | < 1s | 3s |

사용자 체감 총 대기: 5~10초 이내.

### 긴 녹음 처리

5분 이상 녹음:
- 청킹: 60초 단위로 분할
- 병렬 STT
- 순차 concat
- 단일 Gemini 호출 (전체 맥락 유지)

---

## 5.4 타이핑/필기 입력

### 앱 내 입력

메인 탭에 **상시 노출 입력창**:

```
┌─────────────────────────────┐
│  뭐든 적어주세요...          │
│                              │
│  [🎙️] [✏️] [📎] [엔터로 저장]│
└─────────────────────────────┘
```

엔터 시 즉시 AI 처리 시작. 사용자는 다른 작업 가능.

### 입력 모드

- **일반 텍스트**: 그대로 AI에 전달
- **명령어 모드 (`/`)**:
  - `/task 보고서 쓰기` → 바로 task 생성
  - `/project 새 프로젝트` → 프로젝트 생성 대화 시작
  - `/find 회의` → 검색

### 자동 저장

- 3초마다 draft 저장
- 네트워크 끊겨도 로컬 큐
- 연결 복구 시 자동 전송

---

## 5.5 파일 업로드

### 지원 파일 타입

| 타입 | 확장자 | 처리 |
|------|--------|------|
| 이미지 | jpg, png, heic | Gemini Vision → 텍스트/맥락 추출 |
| PDF | pdf | 텍스트 추출 + Gemini 요약 |
| 문서 | docx, txt, md | 텍스트 추출 + 분석 |
| 오디오 | m4a, mp3, wav, aac | STT → 처리 |
| 비디오 | mp4, mov | 오디오 추출 → STT |
| 스프레드시트 | xlsx, csv | 데이터 구조화 |

### 파일 처리 파이프라인

```
[파일 업로드]
   ↓
[Firebase Storage 저장]
   ↓
[Attachment entity 생성]
   ↓
[MIME 타입 감지]
   ↓
[타입별 처리기]
   ├── 이미지 → Gemini Vision
   ├── PDF → 텍스트 추출 → Gemini
   ├── 오디오 → STT → Gemini
   └── 문서 → 추출 → Gemini
   ↓
[의도 분류 파이프라인에 합류]
```

### 사진 업로드의 특수 처리

사진에는 EXIF 정보가 있어 추가 맥락 제공:
- 촬영 시간 → entered_at으로 사용
- GPS → location 자동 설정
- 카메라 설정 → metadata 보관

사진 자체의 내용도 Gemini Vision으로 이해:
- "음식 사진" → journal_event
- "영수증" → 지출 기록 or task
- "화이트보드" → 회의 내용 추출
- "스크린샷" → UI 텍스트 추출

---

## 5.6 공유 시트 통합 (OS Share Sheet)

### iOS

Share Extension으로 MDA가 공유 옵션에 등장:

```
Safari에서 기사 읽다가
  ↓
[공유 버튼] → [MDA]
  ↓
[최소 시트] "이 기사 뭐로 저장할까요?"
  ↓
[태스크] [일기] [프로젝트 자료] [그냥 저장]
  ↓
[선택] → 자동 처리
```

### Android

Intent Filter로 동일한 UX:
- 갤럭시 통화 녹음 파일을 MDA로 공유
- 카톡 대화를 MDA로 공유
- 사진을 MDA로 공유

### 공유 처리 로직

```typescript
async function handleSharedContent(shared: SharedIntent) {
  const input: DailyEntry = {
    input_type: detectType(shared),
    source: 'share_sheet',
    raw_text: shared.text ?? null,
    attachment_ids: await uploadAttachments(shared.files),
    device: getCurrentDevice(),
    entered_at: new Date(),
    // ...
  };
  
  return await processDailyEntry(input);
}
```

---

## 5.7 통화 녹음 임포트

### Android (갤럭시 우선)

갤럭시는 기본 전화 앱이 통화 녹음을 `/Call/` 폴더에 저장.

**지원 방식**: 사용자가 통화 종료 후 녹음 파일을 공유 시트로 MDA에 전송.

```
통화 종료
  ↓
갤럭시 전화 앱에서 녹음 확인
  ↓
[공유] → [MDA]
  ↓
MDA가 STT + 요약
  ↓
"누구와 무슨 내용으로 통화하셨나요?" 확인
  ↓
Task/Journal/Contact 자동 생성
```

### iOS

Apple 기본으로는 불가. SKT 에이닷, LG U+ 익시오 사용자:

- 이들 앱에서 공유 시트로 MDA에 녹음 전송 가능
- MDA는 m4a/mp3 파일 수신해 처리

### 원칙

- MDA가 직접 통화를 녹음하지 않음 (법적·정책적 불가)
- **사용자가 이미 녹음한 파일을 던져주면 처리**
- 프라이버시 메시지: "MDA는 통화를 엿듣지 않습니다"

---

## 5.8 Siri / Google Assistant 단축어

### iOS Siri Shortcuts

```
"MDA에 추가해줘"
"시리야, 오늘 일정 물어봐줘"
"MDA에 '내일 3시 치과' 추가"
```

App Intents로 구현:
- `AddToMDAIntent` — 텍스트를 MDA에 추가
- `GetTodayScheduleIntent` — 오늘 일정 조회
- `StartRecordingIntent` — 녹음 시작

### Google Assistant App Actions

Android에서 동일한 기능:
- 음성으로 MDA 호출
- 백그라운드에서 처리

---

## 5.9 대화창 (Conversational Input)

### 일반 입력창 vs 대화창

| 구분 | 일반 입력창 | 대화창 |
|------|-------------|--------|
| 목적 | 단발 기록 | 지속 대화 |
| 맥락 | 단일 입력 | 세션 전체 유지 |
| AI 응답 | 분류 결과만 | 대화형 응답 |
| 사용 시점 | 수시 | 프로젝트 설계, 회고 시 |

### 대화 시작 방식

- 앱 내 "대화" 탭
- 복잡한 프로젝트 생성 시 자동 전환
- 저녁 회고 시 AI가 먼저 질문

### 세션 관리

- 세션 시작 시 사용자 컨텍스트 로드
- 각 턴마다 메시지 저장
- 5턴마다 자동 저장
- 10턴 이상 시 요약 생성
- 30분 비활성 시 자동 종료

### 저녁 회고 대화

```
21:00 자동 트리거:
AI: "오늘 어떠셨어요? 혹시 추가로 기록하고 싶은 일이 있나요?"

User: "아, 낮에 민수랑 통화했는데 나중에 미팅 잡아야 될 거 같아."

AI: "민수님과 미팅이군요. 언제쯤이 좋으실까요?"

User: "다음주 수요일 오후쯤."

AI: "네, '다음주 수요일 오후 민수님 미팅'으로 태스크 추가해두고, 
     이틀 전에 리마인드 드릴게요."

User: "좋아. 그리고 오늘 좀 피곤했어."

AI: "오늘 피곤하셨군요. 일기에 남겨둘게요.
     저녁 보고서는 준비되는 대로 알려드릴게요."
```

---

## 5.10 외부 연동 입력 (Passive Context)

상세는 `11_EXTERNAL_INTEGRATIONS.md`.

요약:
- Google Calendar 이벤트 → Task 자동 생성 (선택)
- Gmail 제목 → 업무 맥락 추가 (선택)
- Google Photos 메타데이터 → 일기 맥락
- 위치 이력 → "오늘 다녀온 곳" 인식
- Apple Health / Google Fit → 컨디션 맥락

### 활용 원칙

- **자동 Task 생성은 하지 않음** (사용자 놀람 방지)
- 저녁 보고서 생성 시 참고 자료로만 사용
- 사용자가 "어제 어디 다녀왔지?" 같은 질문에 활용

---

## 5.11 입력 처리 상태 머신

```
[created]
   ↓
[pending] — 큐에 들어감
   ↓
[processing] — AI 처리 중
   ↓
   ├─→ [processed] — AI 처리 완료, 사용자 확인 대기
   │     ↓
   │     ├─→ [confirmed] — 사용자 승인
   │     └─→ [modified] — 사용자 수정 후 승인
   │
   └─→ [failed] — AI 처리 실패
         ↓
         [retry_pending] 또는 [manual_required]
```

### 상태별 처리

- **pending**: 네트워크 끊김 / 대기 큐
- **processing**: UI에 "처리 중" 표시
- **processed**: 사용자에게 확인 카드 푸시
- **confirmed**: 최종 저장, 알림 종료
- **failed**: 원본 보존, 3회 재시도 후 수동 처리 안내

---

## 5.12 오프라인 지원

### 오프라인 가능 동작

- 모든 입력 (녹음·타이핑·업로드)
- 로컬 저장
- 네트워크 복구 시 자동 동기화

### 오프라인 UI

```
상단에 상태 표시: "오프라인 — 3건 대기 중"
연결 복구: 자동 전송 시작 → "3건 동기화됨"
```

### 구현

- Firestore 오프라인 캐시
- Custom queue for files (IndexedDB on web, SQLite on mobile)
- 재시도 로직 (exponential backoff)

---

## 5.13 입력 분석 대시보드 (사용자용)

설정 > 입력 통계:

- 이번 달 입력 수
- 입력 타입 분포 (음성/필기/업로드/대화)
- 평균 처리 시간
- 수정률 (AI가 틀린 비율)
- 가장 활발한 시간대

---

## 5.14 구현 체크리스트

Phase 1 구현 순서:

- [ ] 타이핑 입력 + 기본 AI 분류
- [ ] 파일 업로드 + 이미지/PDF 처리
- [ ] 음성 녹음 (앱 내)
- [ ] STT 통합 (Whisper)
- [ ] 공유 시트 (Android → iOS)
- [ ] 위젯 (Android → iOS)
- [ ] Siri / Google Assistant 단축어

Phase 2:
- [ ] 대화 세션
- [ ] 외부 연동 (Calendar, Notion)
- [ ] 통화 녹음 임포트 최적화

Phase 3:
- [ ] Watch / Wear 앱
- [ ] 외부 연동 확장 (Gmail, Photos, Health, Location)
- [ ] 고급 파일 처리 (비디오, 스프레드시트)

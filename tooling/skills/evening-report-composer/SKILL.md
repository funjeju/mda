---
name: evening-report-composer
description: 저녁 보고서 생성 파이프라인. 데이터 수집, Gemini 프롬프트, 렌더링, 편집 플로우. 저녁 보고서 관련 작업 시 로드한다.
---

# Evening Report Composer

## 트리거 조건

| 조건 | 처리 |
|------|------|
| 기본 시간 (21:00) | 자동 생성 |
| 오늘 입력 3개 이상 | 정상 보고서 |
| 오늘 입력 1~2개 | "조용한 하루였어요" 미니 요약 |
| 오늘 입력 없음 | 보고서 생성 안 함 (빈 보고서 강제 금지) |
| 수동 요청 | 즉시 생성 |

## 데이터 수집

```typescript
async function collectTodayData(teamId: string, userId: string): Promise<TodayData> {
  const today = startOfDay(new Date());
  const tomorrow = endOfDay(new Date());

  const [entries, completedTasks, journals, contacts, events] = await Promise.all([
    getDailyEntries(teamId, { from: today, to: tomorrow }),
    getCompletedTasks(teamId, userId, { from: today, to: tomorrow }),
    getJournalEntries(teamId, userId, { from: today, to: tomorrow }),
    getMentionedContacts(teamId, userId, { from: today, to: tomorrow }),
    getCalendarEvents(userId, { from: today, to: tomorrow }),
  ]);

  return { entries, completedTasks, journals, contacts, events };
}
```

## Gemini 호출 설정

```typescript
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash',      // Flash Lite 아님 (긴 컨텍스트)
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: DailyReportSchema,
    maxOutputTokens: 4096,
    temperature: 0.5,              // 창의성 약간 허용
  },
  systemInstruction: DAILY_REPORT_SYSTEM_PROMPT,
});
```

## 출력 스키마

```typescript
interface DailyReportOutput {
  one_liner: string;               // 15자 이내
  business: {
    highlights: string[];          // 1~3개
    progress_notes: string;
  };
  journal: {
    emotional_arc: string;
    reflective_question: string | null;
  };
  tomorrow_preview: string[];      // 3개 이하
  reminders: string[];             // 1~3개
}
```

## 톤 규칙

- 공감적, 따뜻, 판단 없음
- 한 줄 요약 15자 이내
- 내일 예정 3개 이하
- 죄책감 표현 절대 금지
- 전문가 친구 같은 담담함

## Firestore 저장

```typescript
await db.collection(`teams/${teamId}/daily_reports`).add({
  report_date: Timestamp.fromDate(today),
  one_liner: result.one_liner,
  business: result.business,
  journal: result.journal,
  tomorrow_preview: result.tomorrow_preview,
  reminders: result.reminders,
  source_entry_ids: entries.map(e => e.id),
  created_by: userId,
  created_at: FieldValue.serverTimestamp(),
  updated_at: FieldValue.serverTimestamp(),
  deleted_at: null,
  team_id: teamId,
  metadata: {},
});
```

## 편집 플로우

```
보고서 항목 길게 누름 (Long Press)
  ↓
컨텍스트 메뉴:
  [이동] — 다른 섹션/프로젝트로 재분류
  [수정] — 텍스트 직접 편집
  [삭제] — 잘못 인식된 항목 제거
  [원본 보기] — 어떤 입력에서 왔는지 (음성 재생 포함)
```

## 푸시 알림

```typescript
await sendPushNotification(userId, {
  title: '📖 오늘의 하루 정리가 왔어요',
  body: `${completedTasks.length}개 완료, 내일 ${tomorrowPreview.length}개 예정`,
  data: { type: 'daily_report', report_id: reportId },
});
```

## 자주 하는 실수

- ❌ 빈 날 보고서 강제 생성 (입력 없어도 생성)
- ❌ 판단·조언 삽입 ("이 부분을 개선하세요")
- ❌ 일기 민감 내용 과도 노출 (팀원에게 보여지면 안 됨)
- ❌ Gemini Flash Lite 사용 (긴 컨텍스트는 Flash 이상)
- ❌ 한 줄 요약 15자 초과

## 관련 문서

- `spec/04_AI_AGENT_SPEC.md` — 저녁 보고서 프롬프트 (4.7)
- `spec/09_DAILY_REPORT_JOURNAL.md` — 보고서 상세 스펙
- `apps/web/app/api/daily-report/` — API Route

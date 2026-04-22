---
name: korean-nlp-helper
description: 한국어 NLP 헬퍼. 날짜 표현, 감정 키워드, 인명 추출, 존댓말 톤. 한국어 입력 파싱·생성 시 로드한다.
---

# Korean NLP Helper

## 날짜 사전

| 표현 | 의미 | 주의 |
|------|------|------|
| 오늘 | today | |
| 내일 | +1 day | |
| 모레 | +2 days | |
| 글피 | +3 days | |
| 다음주 | **next week's Monday** | +7일 아님 |
| 다다음주 | +2 weeks Monday | |
| 이번주 X요일 | this week's X | 과거 X면 다음주 |
| 다음주 X요일 | next week's X | |
| 월말 | end of current month | |
| 다음달 초 | start of next month (1~5일) | |
| 연말 | end of year (12월 말) | |
| 주말 | this Saturday + Sunday | |
| 평일 | weekday (월~금) | |

## 시간 표현

| 표현 | 시간대 |
|------|--------|
| 새벽 | 03:00~06:00 |
| 아침 | 06:00~09:00 |
| 오전 | 09:00~12:00 |
| 점심 | 12:00~13:00 |
| 오후 | 13:00~18:00 |
| 저녁 | 18:00~21:00 |
| 밤 | 21:00~24:00 |

## 감정 키워드 사전

```typescript
export const EMOTION_KEYWORDS = {
  joy:      ['기쁘', '좋', '행복', '즐거', '신나', '뿌듯', '만족', '웃음'],
  calm:     ['평온', '차분', '고요', '안정', '편안', '여유'],
  excited:  ['설레', '기대', '흥분', '두근'],
  anxious:  ['불안', '걱정', '초조', '긴장', '두렵', '무섭'],
  sad:      ['슬프', '우울', '눈물', '외로', '쓸쓸', '허전'],
  angry:    ['화나', '짜증', '분노', '열받', '답답'],
  tired:    ['피곤', '지쳐', '힘들', '무기력', '탈진'],
  grateful: ['감사', '고마운', '덕분', '감동'],
  proud:    ['자랑', '뿌듯', '해냈', '성취'],
  neutral:  [], // 기본값
} as const;

export function detectEmotion(text: string): keyof typeof EMOTION_KEYWORDS {
  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    if (keywords.some(kw => text.includes(kw))) {
      return emotion as keyof typeof EMOTION_KEYWORDS;
    }
  }
  return 'neutral';
}
```

## 인명 추출 휴리스틱

```typescript
// 한글 이름 패턴
const KOREAN_NAME_PATTERN = /([가-힣]{2,4})(씨|님|형|누나|오빠|언니|선배|후배|대표|팀장|사장)?/g;

// 호칭 제거 후 이름 추출
function extractPersonName(text: string): string[] {
  const matches = [...text.matchAll(KOREAN_NAME_PATTERN)];
  return matches
    .map(m => m[1]!)   // 호칭 제외 이름만
    .filter(name => name.length >= 2);
}

// 영문 이름: PascalCase
const ENGLISH_NAME_PATTERN = /\b[A-Z][a-z]+\b/g;
```

## 위기 신호 감지

```typescript
const CONCERNING_PATTERNS = [
  /죽고\s*싶/,
  /살기\s*싫/,
  /사라지고\s*싶/,
  /희망\s*없/,
  /더\s*이상\s*못/,
  /끝내고\s*싶/,
];

export function isConcerning(text: string): boolean {
  return CONCERNING_PATTERNS.some(p => p.test(text));
}

// 감지 시 즉시 지원 리소스 제공
export const CRISIS_RESPONSE = `
오늘 힘드셨나 봐요. 혼자 감당하기 어려울 때는 전문가의 도움을 받는 것도 좋아요.

· 자살예방상담전화: ☎ 1393 (24시간)
· 청소년전화: ☎ 1388
· 정신건강위기상담: ☎ 1577-0199

저는 할 수 있는 만큼 들어드릴게요.
`;
```

## 존댓말 톤 규칙

알림·보고서·AI 응답은 항상 존댓말:

```
❌ "보고서 써"          → ✅ "보고서 작성할 시간이에요"
❌ "완료됐다"           → ✅ "완료됐어요"
❌ "아직 안 했나요"     → ✅ "준비됐나요?"
❌ "미뤄졌어요"         → ✅ "일정이 있어요"
```

## 자주 하는 실수

- ❌ "다음주" = +7 days (틀림, 다음주 월요일)
- ❌ 한 글자로 감정 판정 ("화" → angry로 처리하지 말 것)
- ❌ 존댓말 섞임 (반말·존댓말 혼용)
- ❌ 띄어쓰기 엄격 적용 ("짜증나" vs "짜증 나") — 둘 다 매칭
- ❌ 맥락 없이 위기 신호 오판 (과장 표현 구분 필요)

## 관련 문서

- `spec/04_AI_AGENT_SPEC.md` — AI 분류 파이프라인
- `spec/09_DAILY_REPORT_JOURNAL.md` — 감정 분석 상세

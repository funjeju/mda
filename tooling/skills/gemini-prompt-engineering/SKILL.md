---
name: gemini-prompt-engineering
description: Google Gemini API 최적 프롬프트 패턴. JSON 강제 출력, 한국어 처리, 구조화된 분류, Fallback 체인. Gemini 호출 코드 작성 시 로드한다.
---

# Gemini Prompt Engineering

## 1. JSON 강제 출력

```typescript
import { SchemaType } from '@google/generative-ai';

const schema = {
  type: SchemaType.OBJECT,
  properties: {
    intent: { type: SchemaType.STRING, enum: ['task_creation', 'schedule', 'journal_emotion', 'noise'] },
    confidence: { type: SchemaType.NUMBER },
    segments: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.OBJECT, properties: { text: { type: SchemaType.STRING } } }
    }
  },
  required: ['intent', 'confidence'],
};

const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-flash-lite',
  generationConfig: {
    responseMimeType: 'application/json',
    responseSchema: schema,
    maxOutputTokens: 2048,
    temperature: 0.3,
  },
  systemInstruction: SYSTEM_PROMPT,
});

const result = await model.generateContent(userInput);
const parsed = MyZodSchema.parse(JSON.parse(result.response.text()));
```

## 2. 모델 선택

| 용도 | 모델 | 이유 |
|------|------|------|
| 분류·구조화 (실시간) | `gemini-2.0-flash-lite` | 빠르고 저렴 |
| 복잡 분해 (프로젝트) | `gemini-2.0-flash` | 깊은 추론 |
| 저녁 보고서 | `gemini-2.0-flash` | 긴 컨텍스트 |
| 멀티모달 (이미지/PDF) | `gemini-2.0-flash` | 비전 지원 |

## 3. 시스템 프롬프트 템플릿

```
너는 {역할}이다.
역할 설명: {책임과 한계}
출력: 반드시 다음 JSON 스키마를 따른다: {스키마}
규칙:
  1. {규칙 1}
  2. {규칙 2}
예시:
  입력: "{예시 입력}"
  출력: {예시 JSON}
사용자 컨텍스트: {dynamic context}
사용자 입력: {user_input}
```

## 4. 한국어 처리

- 시스템 프롬프트 한국어로 작성 (성능 유의미하게 향상)
- 날짜 표현 사전 명시 (오늘/내일/다음주 = 한국 기준)
- 존댓말 톤 일관성 명시
- 업계/한국어 특수 용어 사전 포함

## 5. 확신도 패턴

```typescript
// confidence < 0.7이면 사용자 확인 요청
// alternatives 배열로 대안 제시
{
  intent: 'task_creation',
  confidence: 0.65,
  needs_clarification: true,
  alternatives: [
    { intent: 'schedule', confidence: 0.3 }
  ]
}
```

## 6. Temperature 가이드

| 작업 유형 | Temperature |
|----------|-------------|
| 분류·구조화 | 0.2~0.3 |
| 보고서 요약 | 0.5~0.7 |
| 자유 대화·격려 | 0.7~0.9 |

## 7. Fallback 체인

```typescript
async function callAI(prompt: string): Promise<string> {
  // 1차: Gemini Flash Lite
  try {
    return await callGeminiFlashLite(prompt);
  } catch (e1) {
    console.warn('Flash Lite failed, trying Flash');
    // 2차: Gemini Flash
    try {
      return await callGeminiFlash(prompt);
    } catch (e2) {
      console.warn('Flash failed, trying Claude');
      // 3차: Claude Sonnet
      return await callClaudeSonnet(prompt);
    }
  }
}
```

## 8. 재시도 로직

```typescript
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === maxAttempts - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // exponential backoff
    }
  }
  throw new Error('unreachable');
}
```

## 9. 토큰 관리

- Input: 6k 토큰 예산
- Output: 2k 토큰 예산
- 컨텍스트 초과 시: noise 제거 → 오래된 컨텍스트 제거 → 요약 기법
- 사용자별 월간 quota 추적

## 자주 하는 실수

- ❌ 스키마 없이 "JSON으로 출력해줘"만 — 구조화된 schema 필수
- ❌ 예시 없는 복잡 분류 — few-shot 예시 포함
- ❌ 한국어/영어 혼용 프롬프트 — 한 언어로 통일
- ❌ Fallback 없는 단일 Gemini 의존
- ❌ Zod 검증 누락 — 항상 파싱 후 검증
- ❌ 타임아웃 미설정 — 5초 AbortSignal 사용

## 관련 문서

- `spec/04_AI_AGENT_SPEC.md` — 프롬프트 전체 목록
- `packages/prompts/` — 버전 관리된 프롬프트

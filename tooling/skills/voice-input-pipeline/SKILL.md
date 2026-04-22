---
name: voice-input-pipeline
description: 음성 녹음→STT→AI 분류→Entity 생성 전체 파이프라인. Whisper API, 네이티브 STT, Gemini 조합. 음성 입력 기능 구현 시 로드한다.
---

# Voice Input Pipeline

## 전체 흐름

```
1. 녹음 (Expo Audio / MediaRecorder API)
2. Firebase Storage 업로드
3. Recording entity 생성 (Firestore)
4. STT 선택 (30s 미만: 네이티브, 이상: Whisper)
5. Transcript → DailyEntry 생성
6. Gemini 의도 분류
7. Entity 생성 (Task / JournalEntry / Contact)
8. 사용자 확인 UI (확신도 0.7 미만 시)
9. 푸시 알림 ("X개 항목이 정리됐어요")
```

## STT 선택 로직

```typescript
async function transcribe(audio: AudioFile): Promise<string> {
  // 30초 미만: 네이티브 STT 우선
  if (audio.duration < 30) {
    try {
      const result = await nativeSTT(audio);
      if (result.confidence > 0.85) return result.transcript;
    } catch {
      // 네이티브 실패 시 Whisper로 폴백
    }
  }
  // 30초 이상 or 네이티브 실패: Whisper API
  try {
    return await whisperAPI(audio, { language: 'ko' });
  } catch {
    // Whisper 실패 시 Gemini 오디오 이해
    return await geminiAudioTranscribe(audio);
  }
}
```

## 레이턴시 목표

| 단계 | 목표 |
|------|------|
| 녹음 시작 | < 500ms |
| STT (30s 음성) | < 5s |
| Gemini 분류 | < 2s |
| Entity 생성 | < 1s |
| **전체** | **< 10s** |

## 오프라인 대응

```typescript
// 네트워크 없을 때 로컬 큐에 보관
const offlineQueue = {
  async enqueue(audio: AudioFile): Promise<void> {
    await AsyncStorage.setItem(
      `offline_audio_${Date.now()}`,
      JSON.stringify({ path: audio.localPath, created_at: new Date() })
    );
  },
  async flush(): Promise<void> {
    // 네트워크 복구 시 순차 처리
  }
};
```

## Whisper API 호출

```typescript
async function whisperAPI(audio: AudioFile, opts: { language: string }): Promise<string> {
  const formData = new FormData();
  formData.append('file', await fetch(audio.uri).then(r => r.blob()), 'audio.m4a');
  formData.append('model', 'whisper-1');
  formData.append('language', opts.language);

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: formData,
  });

  const { text } = await response.json();
  return text;
}
```

## 긴 녹음 청킹

30분 이상 녹음은 5분 단위로 청킹:

```typescript
async function transcribeLong(audio: AudioFile): Promise<string> {
  const chunks = await splitAudio(audio, { chunkDuration: 300 }); // 5분
  const transcripts = await Promise.all(chunks.map(c => whisperAPI(c, { language: 'ko' })));
  return transcripts.join(' ');
}
```

## 자주 하는 실수

- ❌ STT 품질(confidence) 체크 없이 사용 — 낮은 신뢰도 결과 그대로 사용
- ❌ 오프라인 큐 미구현 — 네트워크 없을 때 음성 데이터 소실
- ❌ 긴 녹음 청킹 누락 — Whisper 25MB 제한 초과
- ❌ Whisper 호출 시 `language: 'ko'` 누락 — 자동감지보다 명시가 정확도 높음
- ❌ Recording entity 미생성 — 원본 보존 규칙 위반

## 관련 문서

- `spec/05_INPUT_SYSTEM.md` — 입력 시스템 전체
- `apps/web/app/api/voice/` — STT API Route
- `apps/mobile/src/hooks/useVoiceRecorder.ts` — 모바일 녹음 훅

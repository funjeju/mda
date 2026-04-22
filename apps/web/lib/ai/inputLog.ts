import { addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { inputLogsCol, inputLogDoc } from '../firestore/collections';
import type { ClassificationResult } from './schemas';

export type InputLogType = 'text' | 'voice';

export interface InputLog {
  id: string;
  type: InputLogType;
  raw_text: string;
  audio_url: string | null;
  transcript: string | null;
  ai_result: ClassificationResult | null;
  processed: boolean;
  created_at: Date | null;
  created_by: string;
}

/**
 * 원본 입력을 AI 처리 전에 Firestore에 먼저 저장한다.
 * AI 처리 실패해도 원문은 보존된다.
 */
export async function saveInputLog(
  teamId: string,
  userId: string,
  type: InputLogType,
  rawText: string,
  opts?: { audioUrl?: string; transcript?: string },
): Promise<string> {
  const ref = await addDoc(inputLogsCol(teamId), {
    type,
    raw_text: rawText,
    audio_url: opts?.audioUrl ?? null,
    transcript: opts?.transcript ?? null,
    ai_result: null,
    processed: false,
    created_at: serverTimestamp(),
    created_by: userId,
    deleted_at: null,
  });
  return ref.id;
}

/**
 * AI 처리 완료 후 결과를 로그에 업데이트한다.
 */
export async function updateInputLogResult(
  teamId: string,
  logId: string,
  result: ClassificationResult | null,
  processed = true,
): Promise<void> {
  await updateDoc(inputLogDoc(teamId, logId), {
    ai_result: result ? JSON.parse(JSON.stringify(result)) : null,
    processed,
  });
}

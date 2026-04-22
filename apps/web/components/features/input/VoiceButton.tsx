'use client';

import { useState, useRef, useCallback } from 'react';
import { saveInputLog, updateInputLogResult } from '@/lib/ai/inputLog';
import { fetchWithAuth } from '@/lib/auth/fetchWithAuth';

// F-010: 오디오 파일 직접 업로드 → STT
export function AudioFileImporter({
  onTranscript,
  disabled,
  teamId,
  userId,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  teamId?: string;
  userId?: string;
}) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/webm', 'audio/x-m4a'];
    if (!allowedTypes.some((t) => file.type.startsWith('audio/') || file.name.match(/\.(mp3|mp4|wav|m4a|ogg|webm|aac)$/i))) {
      setError('오디오 파일만 지원합니다 (MP3, M4A, WAV 등)');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('25MB 이하 파일만 지원합니다');
      return;
    }

    setProcessing(true);
    setError(null);

    const form = new FormData();
    form.append('file', file);

    try {
      const res = await fetchWithAuth('/api/transcribe', { method: 'POST', body: form });
      if (!res.ok) throw new Error('STT 실패');
      const data = await res.json() as { text?: string; error?: string };
      const transcript = data.text ?? null;

      if (!transcript) { setError('텍스트 변환 실패'); return; }

      if (teamId && userId) {
        const logId = await saveInputLog(teamId, userId, 'voice', transcript, { transcript, source: 'file_import', filename: file.name });
        await updateInputLogResult(teamId, logId, null, false);
      }

      onTranscript(transcript);
    } catch {
      setError('파일 처리 중 오류가 발생했습니다');
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || processing}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
        style={{ background: processing ? '#ADA598' + '40' : '#ADA598' + '40', border: '2px solid transparent' }}
        title="오디오 파일 임포트"
      >
        {processing ? (
          <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: '#7C756B', borderTopColor: 'transparent' }} />
        ) : (
          <span className="text-sm">📂</span>
        )}
      </button>
      {error && <p className="text-xs" style={{ color: '#EB8B7C' }}>{error}</p>}
    </div>
  );
}

const C = {
  mustard: '#D4A547',
  ink300:  '#ADA598',
  ink500:  '#7C756B',
};

interface Props {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  teamId?: string;
  userId?: string;
}

type RecordState = 'idle' | 'recording' | 'processing';

export function VoiceButton({ onTranscript, disabled, teamId, userId }: Props) {
  const [state, setState] = useState<RecordState>('idle');
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState('processing');

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], 'voice.webm', { type: mimeType });
        const form = new FormData();
        form.append('file', file);

        let transcript: string | null = null;
        let logId: string | null = null;

        try {
          const res = await fetchWithAuth('/api/transcribe', { method: 'POST', body: form });
          if (!res.ok) throw new Error('Transcription failed');
          const data = (await res.json()) as { text?: string; error?: string };
          transcript = data.text ?? null;

          // 음성 원본 로그 저장 (transcript만, audio_url은 Storage 미연동 시 null)
          if (teamId && userId && transcript) {
            logId = await saveInputLog(teamId, userId, 'voice', transcript, {
              transcript,
            });
            // 음성은 AI 분류 전 단계 — processed=false
            await updateInputLogResult(teamId, logId, null, false);
          }

          if (transcript) onTranscript(transcript);
          else setError('음성 인식 실패');
        } catch {
          setError('음성 인식에 실패했습니다');
        } finally {
          setState('idle');
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setState('recording');
    } catch {
      setError('마이크 권한이 필요합니다');
      setState('idle');
    }
  }, [onTranscript, teamId, userId]);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  }, []);

  const handleClick = () => {
    if (state === 'recording') stopRecording();
    else if (state === 'idle') startRecording();
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
        style={{
          background: isRecording ? '#EB8B7C' : isProcessing ? C.ink300 : C.ink300 + '40',
          border: isRecording ? '2px solid #EB8B7C' : '2px solid transparent',
          transform: isRecording ? 'scale(1.1)' : 'scale(1)',
          animation: isRecording ? 'pulse 1.5s infinite' : 'none',
        }}
        title={isRecording ? '녹음 중단' : '음성 입력'}
      >
        {isProcessing ? (
          <div
            className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
            style={{ borderColor: C.ink500, borderTopColor: 'transparent' }}
          />
        ) : (
          <span className="text-sm">{isRecording ? '⏹' : '🎙️'}</span>
        )}
      </button>
      {error && (
        <p className="text-xs" style={{ color: '#EB8B7C' }}>{error}</p>
      )}
    </div>
  );
}

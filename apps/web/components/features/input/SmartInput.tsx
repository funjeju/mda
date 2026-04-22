'use client';

import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { classifyEntry, intentLabel, intentColor, AI_AUTO_THRESHOLD, AI_SUGGEST_THRESHOLD } from '@/lib/ai/classify';
import { createEntityFromSegment, saveDailyEntry } from '@/lib/ai/createEntities';
import { saveInputLog, updateInputLogResult } from '@/lib/ai/inputLog';
import { useEmbeddingMatch } from '@/lib/ai/useEmbeddingMatch';
import { fetchPersonalizationHints } from '@/lib/ai/personalization';
import type { PersonalizationHints } from '@/lib/ai/personalization';
import type { ClassificationResult, Segment } from '@/lib/ai/schemas';
import { Button } from '@/components/ui/button';
import { VoiceButton, AudioFileImporter } from './VoiceButton';

const C = {
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  ink100:  '#E8E3D7',
  mustard: '#D4A547',
  ivory:   '#FDFBF7',
};

type Phase = 'idle' | 'classifying' | 'reviewing' | 'saving';

interface Props {
  teamId: string;
  userId: string;
  activeProjectNames?: string[];
  todayTaskTitles?: string[];
  onDone?: () => void;
  initialText?: string;
}

export function SmartInput({ teamId, userId, activeProjectNames = [], todayTaskTitles = [], onDone, initialText }: Props) {
  const [text, setText] = useState(initialText ?? '');
  const [phase, setPhase] = useState<Phase>('idle');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ClassificationResult | null>(null);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [currentLogId, setCurrentLogId] = useState<string | null>(null);
  const { matches, match, clear } = useEmbeddingMatch();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hints, setHints] = useState<PersonalizationHints | null>(null);

  // F-048: 개인화 힌트 로드 (마운트 시 1회)
  useEffect(() => {
    fetchPersonalizationHints(teamId, userId).then(setHints).catch(() => {});
  }, [teamId, userId]);

  // F-007: 외부에서 initialText 변경 시 반영
  useEffect(() => {
    if (initialText) setText(initialText);
  }, [initialText]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim() || activeProjectNames.length === 0) { clear(); return; }
    debounceRef.current = setTimeout(() => {
      const candidates = activeProjectNames.map((name, i) => ({ id: String(i), title: name, type: 'project' as const }));
      match(text.trim(), candidates, 3);
    }, 600);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [text, activeProjectNames]);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || phase !== 'idle') return;

    setPhase('classifying');

    // 원본 입력 먼저 보존 — AI 처리 결과와 무관하게 영구 저장
    const logId = await saveInputLog(teamId, userId, 'text', trimmed);
    setCurrentLogId(logId);

    try {
      const res = await classifyEntry({
        text: trimmed,
        context: {
          active_projects: activeProjectNames,
          today_tasks: todayTaskTitles,
          timezone: 'Asia/Seoul',
          // F-048: 개인화 힌트 주입
          ...(hints && {
            frequent_intents: hints.frequent_intents,
            preferred_projects: hints.common_project_names,
          }),
        },
      });

      // noise만 있으면 그냥 저장
      const meaningful = res.segments.filter((s) => s.intent !== 'noise');
      if (meaningful.length === 0) {
        await updateInputLogResult(teamId, logId, res);
        await handleDirectSave(trimmed);
        return;
      }

      // 전부 고확신도면 바로 처리
      const allAuto = meaningful.every((s) => s.confidence >= AI_AUTO_THRESHOLD);
      if (allAuto) {
        await updateInputLogResult(teamId, logId, res);
        await handleAutoCreate(trimmed, res);
        return;
      }

      // 리뷰 단계로 — AI 결과 저장 (아직 processed=false)
      await updateInputLogResult(teamId, logId, res, false);
      setResult(res);
      setPhase('reviewing');
    } catch (err) {
      console.error(err);
      // AI 실패해도 원본은 이미 보존됨
      await updateInputLogResult(teamId, logId, null, false);
      await handleDirectSave(trimmed);
    }
  }

  async function handleAutoCreate(rawText: string, res: ClassificationResult) {
    setSaving(true);
    setPhase('saving');
    const taskIds: string[] = [];
    const journalIds: string[] = [];

    for (const seg of res.segments) {
      if (seg.intent === 'noise') continue;
      const created = await createEntityFromSegment(seg, teamId, userId);
      if (created?.type === 'task') taskIds.push(created.id);
      if (created?.type === 'journal') journalIds.push(created.id);
    }

    await saveDailyEntry(rawText, teamId, userId, { taskIds, journalIds });
    toast.success(`${taskIds.length + journalIds.length}개 항목이 자동으로 저장됐습니다`);
    reset();
    onDone?.();
  }

  async function handleConfirmAll() {
    if (!result) return;
    setSaving(true);
    const taskIds: string[] = [];
    const journalIds: string[] = [];

    for (let i = 0; i < result.segments.length; i++) {
      if (dismissed.has(i)) continue;
      const seg = result.segments[i]!;
      if (seg.intent === 'noise') continue;
      const created = await createEntityFromSegment(seg, teamId, userId);
      if (created?.type === 'task') taskIds.push(created.id);
      if (created?.type === 'journal') journalIds.push(created.id);
    }

    await saveDailyEntry(text.trim(), teamId, userId, { taskIds, journalIds });
    // 사용자가 확인한 항목으로 로그 업데이트
    if (currentLogId) await updateInputLogResult(teamId, currentLogId, result, true);
    toast.success(`${taskIds.length + journalIds.length}개 항목이 저장됐습니다`);
    reset();
    onDone?.();
  }

  async function handleDirectSave(rawText: string) {
    // AI 없이 단순 태스크 1개 생성
    const { addDoc, serverTimestamp } = await import('firebase/firestore');
    const { independentTasksCol } = await import('@/lib/firestore/collections');
    const { v4: uuidv4 } = await import('uuid');
    const id = uuidv4();
    await addDoc(independentTasksCol(teamId), {
      id, team_id: teamId, project_id: null, section_id: null,
      title: rawText, description: '', emoji: null, position: null,
      assignee_id: userId, assignee_name: null, due_date: null, due_time: null,
      start_date: null, duration_minutes: null, time_block: null,
      status: 'todo', completed_at: null, priority: 'normal',
      deliverables: [], checklist: [], attachments: [], depends_on: [], blocks: [],
      has_sub_project: false, sub_project_id: null, ai_generated: false,
      ai_confidence: null, ai_source_entry_id: null, decoration: null, reminders: [],
      recurrence: null, external_id: null, external_source: null,
      created_at: serverTimestamp(), updated_at: serverTimestamp(),
      created_by: userId, deleted_at: null, metadata: {},
    });
    toast.success('태스크가 저장됐습니다');
    reset();
    onDone?.();
  }

  function reset() {
    setText('');
    setResult(null);
    setDismissed(new Set());
    setPhase('idle');
    setSaving(false);
    setCurrentLogId(null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* 입력창 */}
      <div
        className="rounded-2xl p-4"
        style={{ background: C.cream, border: `1px solid ${C.beige}` }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            phase === 'classifying'
              ? 'AI가 분석 중입니다...'
              : '오늘 할 일, 일정, 기분을 자유롭게 입력하세요\n예: "오후 3시 치과, 보고서 작성, 오늘 기분 좋음"'
          }
          disabled={phase !== 'idle'}
          className="w-full resize-none outline-none text-sm leading-relaxed min-h-[80px] bg-transparent"
          style={{ color: C.ink900 }}
        />
        {/* 임베딩 매칭 프로젝트 제안 */}
        {matches.length > 0 && phase === 'idle' && text.trim() && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            <span className="text-xs" style={{ color: C.ink300 }}>관련 프로젝트:</span>
            {matches.map((m) => (
              <button
                key={m.id}
                onClick={() => setText((prev) => `[${m.title}] ${prev}`)}
                className="text-xs px-2 py-0.5 rounded-full transition-colors"
                style={{ background: C.beige, color: C.ink500 }}
              >
                {m.title} <span style={{ color: C.ink300 }}>{Math.round(m.score * 100)}%</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${C.beige}` }}>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: C.ink300 }}>
              {phase === 'classifying' ? '🤖 AI 분석 중...' : 'Cmd+Enter'}
            </span>
            <VoiceButton
              onTranscript={(t) => setText((prev) => prev ? `${prev} ${t}` : t)}
              disabled={phase !== 'idle'}
              teamId={teamId}
              userId={userId}
            />
            <AudioFileImporter
              onTranscript={(t) => setText((prev) => prev ? `${prev} ${t}` : t)}
              disabled={phase !== 'idle'}
              teamId={teamId}
              userId={userId}
            />
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!text.trim() || phase !== 'idle'}
            style={{ background: C.mustard, color: '#fff', border: 'none' }}
          >
            {phase === 'classifying' ? '분석 중...' : '입력'}
          </Button>
        </div>
      </div>

      {/* AI 분류 결과 리뷰 */}
      {phase === 'reviewing' && result && (
        <div
          className="rounded-2xl p-4 flex flex-col gap-3"
          style={{ background: C.cream, border: `1px solid ${C.beige}` }}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium" style={{ color: C.ink900 }}>
              🤖 AI 분류 결과
            </p>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: C.beige, color: C.ink500 }}>
              {result.overall_mood === 'positive' ? '😊' : result.overall_mood === 'negative' ? '😔' : '😐'} {result.urgency === 'high' ? '긴급' : ''}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {result.segments.map((seg, i) => (
              <SegmentCard
                key={i}
                segment={seg}
                dismissed={dismissed.has(i)}
                onDismiss={() => setDismissed((prev) => new Set([...prev, i]))}
                onRestore={() => setDismissed((prev) => { const s = new Set(prev); s.delete(i); return s; })}
              />
            ))}
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={reset} style={{ color: C.ink500 }}>
              취소
            </Button>
            <Button size="sm" onClick={handleConfirmAll}
              disabled={saving}
              style={{ background: C.mustard, color: '#fff', border: 'none' }}>
              {saving ? '저장 중...' : '확인 저장'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SegmentCard({
  segment,
  dismissed,
  onDismiss,
  onRestore,
}: {
  segment: Segment;
  dismissed: boolean;
  onDismiss: () => void;
  onRestore: () => void;
}) {
  const color = intentColor(segment.intent);
  const label = intentLabel(segment.intent);
  const isNoise = segment.intent === 'noise';
  const isLowConfidence = segment.confidence < AI_SUGGEST_THRESHOLD;

  return (
    <div
      className="flex items-start gap-3 rounded-xl p-3 transition-all"
      style={{
        background: dismissed ? '#F0EDE8' : C.ivory,
        border: `1px solid ${C.ink100}`,
        opacity: dismissed ? 0.5 : 1,
      }}
    >
      {/* 인텐트 뱃지 */}
      <div
        className="flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full mt-0.5"
        style={{ background: color + '25', color }}
      >
        {label}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: dismissed ? C.ink300 : C.ink900 }}>
          {segment.proposed_data.title ?? segment.segment}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {segment.proposed_data.date && (
            <span className="text-xs" style={{ color: C.ink500 }}>📅 {segment.proposed_data.date}</span>
          )}
          {segment.proposed_data.time && (
            <span className="text-xs" style={{ color: C.ink500 }}>🕐 {segment.proposed_data.time}</span>
          )}
          {isLowConfidence && !isNoise && (
            <span className="text-xs" style={{ color: '#EB8B7C' }}>
              확신도 낮음 ({Math.round(segment.confidence * 100)}%)
            </span>
          )}
        </div>
      </div>

      {!isNoise && (
        dismissed ? (
          <button onClick={onRestore} className="text-xs flex-shrink-0" style={{ color: C.mustard }}>
            복원
          </button>
        ) : (
          <button onClick={onDismiss} className="text-xs flex-shrink-0" style={{ color: C.ink300 }}>
            제외
          </button>
        )
      )}
    </div>
  );
}

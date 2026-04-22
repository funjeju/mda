'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Task, ChecklistItem, RecurrenceFrequency, TaskRecurrence, TaskAttachment } from '@mda/shared';
import { v4 as uuidv4 } from 'uuid';
import { createSubProject } from '../../../lib/firestore/createSubProject';
import { useTeamMembers } from '../../../lib/hooks/useTeam';
import { StickerButton } from '../stickers/StickerPicker';
import { CommentThread } from '../comments/CommentThread';
import { FileUploader } from '../attachments/FileUploader';
import { requestGoogleToken } from '../../../lib/auth/requestGoogleToken';
import { fetchWithAuth } from '../../../lib/auth/fetchWithAuth';

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string; icon: string }[] = [
  { value: 'none',     label: '반복 없음', icon: '—'  },
  { value: 'daily',    label: '매일',     icon: '📅' },
  { value: 'weekdays', label: '평일마다',  icon: '🗓️' },
  { value: 'weekly',   label: '매주',     icon: '🔁' },
  { value: 'monthly',  label: '매월',     icon: '📆' },
];

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  red:     '#EB8B7C',
};

const PRIORITY_OPTIONS: { value: Task['priority']; label: string; color: string }[] = [
  { value: 'low',    label: '낮음',   color: '#ADA598' },
  { value: 'normal', label: '보통',   color: '#7C756B' },
  { value: 'high',   label: '높음',   color: '#D4A547' },
  { value: 'urgent', label: '긴급',   color: '#EB8B7C' },
];

const STATUS_OPTIONS: { value: Task['status']; label: string }[] = [
  { value: 'todo',        label: '할 일' },
  { value: 'in_progress', label: '진행 중' },
  { value: 'blocked',     label: '블로킹' },
  { value: 'done',        label: '완료' },
];

interface Props {
  task: Task | null;
  onClose: () => void;
  onUpdate: (taskId: string, data: Partial<Task>) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
  teamId?: string;
  userId?: string;
}

export function TaskDetailPanel({ task, onClose, onUpdate, onDelete, teamId, userId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('normal');
  const [status, setStatus] = useState<Task['status']>('todo');
  const [dueDate, setDueDate] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newCheckItem, setNewCheckItem] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>('none');
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [expandingSubProject, setExpandingSubProject] = useState(false);
  const [saving, setSaving] = useState(false);
  const { members } = useTeamMembers(teamId ?? '');

  useEffect(() => {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? '');
    setPriority(task.priority);
    setStatus(task.status);
    setChecklist(task.checklist ?? []);
    setRecurrence((task.recurrence?.frequency) ?? 'none');
    setAssigneeId(task.assignee_id ?? null);
    setEmoji(task.emoji ?? null);
    setAttachments(task.attachments ?? []);
    if (task.due_date) {
      const d = task.due_date as unknown as { toDate?: () => Date };
      const date = d?.toDate?.() ?? new Date(task.due_date as unknown as string);
      setDueDate(date.toISOString().split('T')[0] ?? '');
    } else {
      setDueDate('');
    }
  }, [task]);

  if (!task) return null;

  async function handleSave() {
    if (!task) return;
    setSaving(true);
    try {
      const recurrenceData: TaskRecurrence | null =
        recurrence === 'none' ? null : { frequency: recurrence, interval: 1 };
      await onUpdate(task.id, {
        title: title.trim() || task.title,
        description,
        priority,
        status,
        due_date: dueDate ? new Date(dueDate) as unknown as Task['due_date'] : null,
        checklist,
        attachments,
        recurrence: recurrenceData,
        assignee_id: assigneeId,
        emoji,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function addCheckItem() {
    if (!newCheckItem.trim()) return;
    setChecklist((prev) => [...prev, { id: uuidv4(), text: newCheckItem.trim(), completed: false }]);
    setNewCheckItem('');
  }

  function toggleCheckItem(id: string) {
    setChecklist((prev) => prev.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item,
    ));
  }

  function removeCheckItem(id: string) {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
  }

  const doneCount = checklist.filter((c) => c.completed).length;

  // F-113: MDA → Google Calendar 내보내기
  async function handleExportToCalendar() {
    if (!task) return;
    try {
      const accessToken = await requestGoogleToken('https://www.googleapis.com/auth/calendar.events');

      const dueDateRaw = task.due_date as unknown as { toDate?: () => Date } | string | null;
      const dueStr = typeof dueDateRaw === 'string' ? dueDateRaw
        : (dueDateRaw as { toDate?: () => Date })?.toDate?.()?.toISOString().split('T')[0]
        ?? undefined;

      const res = await fetchWithAuth('/api/integrations/google-calendar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken,
          task: {
            id: task.id,
            title: task.title,
            description: task.description,
            due_date: dueStr,
            due_time: task.due_time,
            duration_minutes: task.duration_minutes,
          },
        }),
      });
      const data = await res.json() as { success?: boolean; link?: string; error?: string };
      if (data.success && data.link) {
        window.open(data.link, '_blank');
      } else {
        alert(data.error ?? '내보내기 실패');
      }
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(45,42,38,0.3)' }}
        onClick={onClose}
      />

      {/* 패널 */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md flex flex-col overflow-hidden"
        style={{ background: C.ivory, borderLeft: `1px solid ${C.beige}` }}
      >
        {/* 헤더 */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${C.beige}` }}
        >
          <h3 className="font-semibold text-sm" style={{ color: C.ink900 }}>태스크 상세</h3>
          <div className="flex gap-2">
            <button
              onClick={() => void handleExportToCalendar()}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ color: C.ink500, background: C.cream }}
              title="Google Calendar에 추가"
            >
              📅
            </button>
            <button
              onClick={async () => {
                if (!confirm('태스크를 삭제할까요?')) return;
                await onDelete(task.id);
                onClose();
              }}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ color: C.red }}
            >
              삭제
            </button>
            <button
              onClick={onClose}
              className="text-lg leading-none"
              style={{ color: C.ink300 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* 본문 스크롤 */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
          {/* 제목 + 스티커 */}
          <div className="flex items-center gap-2">
            <StickerButton value={emoji} onChange={setEmoji} size="md" />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-base font-medium outline-none bg-transparent"
              style={{ color: C.ink900 }}
              placeholder="태스크 제목"
            />
          </div>

          {/* 상태 + 우선순위 */}
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatus(s.value)}
                className="text-xs px-3 py-1.5 rounded-xl font-medium transition-colors"
                style={{
                  background: status === s.value ? C.mustard : C.cream,
                  color: status === s.value ? '#fff' : C.ink500,
                  border: `1px solid ${status === s.value ? C.mustard : C.beige}`,
                }}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2 flex-wrap">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className="text-xs px-3 py-1.5 rounded-xl font-medium transition-colors"
                style={{
                  background: priority === p.value ? p.color + '25' : C.cream,
                  color: priority === p.value ? p.color : C.ink500,
                  border: `1px solid ${priority === p.value ? p.color : C.beige}`,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 마감일 */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: C.ink500 }}>마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink900 }}
            />
          </div>

          {/* 담당자 (F-102) */}
          {members.length > 0 && (
            <div>
              <label className="text-xs font-medium block mb-2" style={{ color: C.ink500 }}>담당자</label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setAssigneeId(null)}
                  className="text-xs px-2.5 py-1.5 rounded-xl font-medium transition-colors"
                  style={{
                    background: assigneeId === null ? C.mustard + '20' : C.cream,
                    color: assigneeId === null ? C.mustard : C.ink500,
                    border: `1px solid ${assigneeId === null ? C.mustard : C.beige}`,
                  }}
                >
                  미배정
                </button>
                {members.map((m) => {
                  const label = m.display_name ?? m.email ?? m.user_id;
                  const initials = label.slice(0, 2).toUpperCase();
                  const isSelected = assigneeId === m.user_id;
                  return (
                    <button
                      key={m.user_id}
                      onClick={() => setAssigneeId(isSelected ? null : m.user_id)}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl font-medium transition-colors"
                      style={{
                        background: isSelected ? C.mustard + '20' : C.cream,
                        color: isSelected ? C.mustard : C.ink500,
                        border: `1px solid ${isSelected ? C.mustard : C.beige}`,
                      }}
                    >
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                        style={{ background: isSelected ? C.mustard : C.beige, color: isSelected ? '#fff' : C.ink500 }}
                      >
                        {initials}
                      </span>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 반복 */}
          <div>
            <label className="text-xs font-medium block mb-2" style={{ color: C.ink500 }}>반복</label>
            <div className="flex gap-1.5 flex-wrap">
              {RECURRENCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRecurrence(opt.value)}
                  className="text-xs px-3 py-1.5 rounded-xl font-medium transition-colors"
                  style={{
                    background: recurrence === opt.value ? C.mustard + '20' : C.cream,
                    color: recurrence === opt.value ? C.mustard : C.ink500,
                    border: `1px solid ${recurrence === opt.value ? C.mustard : C.beige}`,
                  }}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 메모 */}
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: C.ink500 }}>메모</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none resize-none"
              style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink900 }}
              placeholder="메모를 입력하세요"
            />
          </div>

          {/* 체크리스트 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: C.ink500 }}>
                체크리스트 {checklist.length > 0 && `(${doneCount}/${checklist.length})`}
              </label>
            </div>

            {checklist.length > 0 && (
              <div
                className="rounded-xl overflow-hidden mb-2"
                style={{ border: `1px solid ${C.beige}` }}
              >
                {checklist.length > 0 && (
                  <div
                    className="h-1"
                    style={{ background: C.beige }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${checklist.length > 0 ? Math.round((doneCount / checklist.length) * 100) : 0}%`,
                        background: C.mustard,
                      }}
                    />
                  </div>
                )}
                {checklist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-3 py-2"
                    style={{ borderTop: `1px solid ${C.beige}` }}
                  >
                    <button
                      onClick={() => toggleCheckItem(item.id)}
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        border: `1.5px solid ${item.completed ? C.mustard : C.ink300}`,
                        background: item.completed ? C.mustard : 'transparent',
                      }}
                    >
                      {item.completed && <span className="text-white text-xs leading-none">✓</span>}
                    </button>
                    <span
                      className="flex-1 text-sm"
                      style={{
                        color: item.completed ? C.ink300 : C.ink900,
                        textDecoration: item.completed ? 'line-through' : 'none',
                      }}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => removeCheckItem(item.id)}
                      className="text-xs"
                      style={{ color: C.ink300 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className="flex gap-2 rounded-xl px-3 py-2"
              style={{ background: C.cream, border: `1px solid ${C.beige}` }}
            >
              <input
                value={newCheckItem}
                onChange={(e) => setNewCheckItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addCheckItem()}
                placeholder="항목 추가..."
                className="flex-1 text-sm outline-none bg-transparent"
                style={{ color: C.ink900 }}
              />
              <button
                onClick={addCheckItem}
                disabled={!newCheckItem.trim()}
                className="text-xs font-medium"
                style={{ color: C.mustard }}
              >
                추가
              </button>
            </div>
          </div>

          {/* 첨부파일 (F-006) */}
          {teamId && (
            <FileUploader
              teamId={teamId}
              entityId={task.id}
              entityType="task"
              attachments={attachments}
              onAdd={(att) => setAttachments((prev) => [...prev, att])}
              onRemove={(path) => setAttachments((prev) => prev.filter((a) => a.path !== path))}
            />
          )}

          {/* 댓글 (F-104) */}
          {teamId && userId && (
            <CommentThread
              teamId={teamId}
              taskId={task.id}
              userId={userId}
              userName={members.find((m) => m.user_id === userId)?.display_name ?? userId.slice(0, 8)}
              members={members}
            />
          )}
        </div>

        {/* 저장 버튼 */}
        <div
          className="px-5 py-4 flex flex-col gap-2"
          style={{ borderTop: `1px solid ${C.beige}` }}
        >
          {/* 서브 프로젝트 확장 */}
          {teamId && userId && (
            task?.has_sub_project && task.sub_project_id ? (
              <button
                onClick={() => { onClose(); router.push(`/projects/${task.sub_project_id}`); }}
                className="w-full py-2 rounded-2xl text-sm font-medium"
                style={{ background: C.beige, color: C.ink900 }}
              >
                🗂️ 서브 프로젝트 열기 →
              </button>
            ) : (
              <button
                onClick={async () => {
                  if (!task || !teamId || !userId) return;
                  if (!confirm(`"${task.title}"을 서브 프로젝트로 확장할까요?`)) return;
                  setExpandingSubProject(true);
                  try {
                    const newId = await createSubProject({
                      taskId: task.id,
                      taskTitle: task.title,
                      taskEmoji: task.emoji,
                      teamId,
                      userId,
                      projectId: task.project_id ?? undefined,
                    });
                    onClose();
                    router.push(`/projects/${newId}`);
                  } finally {
                    setExpandingSubProject(false);
                  }
                }}
                disabled={expandingSubProject}
                className="w-full py-2 rounded-2xl text-sm font-medium"
                style={{ background: C.beige, color: C.ink500 }}
              >
                {expandingSubProject ? '생성 중...' : '🗺️ 서브 프로젝트로 확장'}
              </button>
            )
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded-2xl text-sm font-semibold"
            style={{ background: C.mustard, color: '#fff' }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </>
  );
}

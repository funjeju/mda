import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Audio } from 'expo-av';
import { v4 as uuidv4 } from 'uuid';
import { db, auth } from '../lib/firebase';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
  coral:   '#EB8B7C',
  lavender:'#B5A7D4',
};

const DAYS_KO = ['일', '월', '화', '수', '목', '금', '토'];

// Vercel 배포 URL 또는 로컬 개발 서버
const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const INTENT_LABEL: Record<string, string> = {
  task_creation: '태스크',
  schedule: '일정',
  journal_emotion: '감정 일기',
  journal_event: '이벤트 일기',
  project_creation: '프로젝트',
  reminder_set: '리마인더',
  contact_mention: '연락처',
  question: '질문',
};

const INTENT_EMOJI: Record<string, string> = {
  task_creation: '✅',
  schedule: '📅',
  journal_emotion: '💭',
  journal_event: '📝',
  project_creation: '🗂️',
  reminder_set: '🔔',
  contact_mention: '👤',
  question: '❓',
};

const INTENT_COLOR: Record<string, string> = {
  task_creation: C.mustard,
  schedule: C.mint,
  journal_emotion: C.lavender,
  journal_event: C.lavender,
  project_creation: C.coral,
  reminder_set: C.mustard,
  contact_mention: C.mint,
};

interface Segment {
  intent: string;
  segment: string;
  confidence: number;
  proposed_data: Record<string, unknown>;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

export function HomeScreen() {
  const [inputText, setInputText] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [classifying, setClassifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [reviewVisible, setReviewVisible] = useState(false);

  // 음성 녹음 (F-026)
  const [recordState, setRecordState] = useState<'idle' | 'recording' | 'processing'>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);

  const today = new Date();
  const todayLabel = today.toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'long',
  });

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.uid);
      setTeamId(user.uid);
    });
  }, []);

  useEffect(() => {
    if (!teamId || !userId) return;
    const q = query(
      collection(db, 'teams', teamId, 'tasks_independent'),
      where('deleted_at', '==', null),
      where('created_by', '==', userId),
      orderBy('created_at', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title ?? '',
        status: d.data().status ?? 'todo',
        priority: d.data().priority ?? 'normal',
      })));
      setLoading(false);
    });
  }, [teamId, userId]);

  // 원본 입력 로그 저장 (AI 처리와 무관하게 원문 보존)
  async function saveInputLog(rawText: string, type: 'text' | 'voice' = 'text'): Promise<string> {
    if (!teamId || !userId) return '';
    const ref = await addDoc(collection(db, 'teams', teamId, 'input_logs'), {
      type,
      raw_text: rawText,
      audio_url: null,
      transcript: type === 'voice' ? rawText : null,
      ai_result: null,
      processed: false,
      created_at: serverTimestamp(),
      created_by: userId,
      deleted_at: null,
    });
    return ref.id;
  }

  // 음성 녹음 시작/중지 (F-026)
  async function handleVoiceToggle() {
    if (recordState === 'recording') {
      // 녹음 중지 및 처리
      setRecordState('processing');
      try {
        await recordingRef.current?.stopAndUnloadAsync();
        const uri = recordingRef.current?.getURI();
        recordingRef.current = null;

        if (!uri || !teamId || !userId) { setRecordState('idle'); return; }

        const startMs = Date.now();
        // 서버에 STT 요청
        const form = new FormData();
        form.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' } as unknown as Blob);

        let transcript: string | null = null;
        try {
          const res = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: form });
          if (res.ok) {
            const data = await res.json() as { text?: string };
            transcript = data.text ?? null;
          }
        } catch { /* STT 실패 — 로그는 남김 */ }

        const durationMs = Date.now() - startMs;

        // Firestore에 녹음 로그 저장 (audio_url은 Storage 없이 null)
        await addDoc(collection(db, 'teams', teamId, 'input_logs'), {
          type: 'voice',
          raw_text: transcript ?? '[음성 인식 실패]',
          audio_url: null,
          transcript,
          duration_ms: durationMs,
          ai_result: null,
          processed: false,
          created_at: serverTimestamp(),
          created_by: userId,
          deleted_at: null,
        });

        if (transcript) {
          setInputText((prev) => prev ? `${prev}\n${transcript}` : transcript!);
        } else {
          Alert.alert('음성 인식 실패', '다시 시도해 주세요.');
        }
      } finally {
        setRecordState('idle');
      }
    } else {
      // 녹음 시작
      try {
        const { granted } = await Audio.requestPermissionsAsync();
        if (!granted) { Alert.alert('마이크 권한이 필요합니다'); return; }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );
        recordingRef.current = recording;
        setRecordState('recording');
      } catch {
        Alert.alert('녹음을 시작할 수 없습니다');
      }
    }
  }

  // 직접 태스크 추가
  async function handleDirectAdd() {
    const trimmed = inputText.trim();
    if (!trimmed || !teamId || !userId) return;
    setSaving(true);
    // 원본 보존
    await saveInputLog(trimmed, 'text');
    try {
      const now = serverTimestamp();
      await addDoc(collection(db, 'teams', teamId, 'tasks_independent'), {
        id: uuidv4(),
        team_id: teamId,
        project_id: null, section_id: null,
        title: trimmed, description: '',
        emoji: null, position: null,
        assignee_id: userId, assignee_name: null,
        due_date: null, due_time: null,
        start_date: null, duration_minutes: null, time_block: null,
        status: 'todo', completed_at: null,
        priority: 'normal',
        deliverables: [], checklist: [], attachments: [],
        depends_on: [], blocks: [],
        has_sub_project: false, sub_project_id: null,
        ai_generated: false, ai_confidence: null, ai_source_entry_id: null,
        decoration: null, reminders: [], recurrence: null,
        created_at: now, updated_at: now,
        created_by: userId, deleted_at: null, metadata: {},
      });
      setInputText('');
    } finally {
      setSaving(false);
    }
  }

  // AI 분류 호출
  async function handleAIClassify() {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    setClassifying(true);
    // 원본 보존 — AI 분류 전에 먼저 저장
    const logId = await saveInputLog(trimmed, 'text');
    try {
      const res = await fetch(`${API_BASE}/api/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) throw new Error('분류 실패');
      const data = await res.json() as { segments?: Segment[] };
      const validSegments = (data.segments ?? []).filter(
        (s) => s.intent !== 'noise' && s.intent !== 'question',
      );
      // AI 결과를 로그에 업데이트
      if (logId && teamId) {
        await updateDoc(doc(db, 'teams', teamId, 'input_logs', logId), {
          ai_result: data,
          processed: validSegments.length === 0,
        });
      }
      if (validSegments.length === 0) {
        await handleDirectAdd();
        return;
      }
      setSegments(validSegments);
      setReviewVisible(true);
    } catch {
      Alert.alert('AI 분류 실패', '직접 태스크로 추가할게요');
      await handleDirectAdd();
    } finally {
      setClassifying(false);
    }
  }

  // 확인 후 저장
  async function handleConfirm(approved: Segment[]) {
    if (!teamId || !userId) return;
    setSaving(true);
    try {
      for (const seg of approved) {
        await createEntityFromSegment(seg, teamId, userId);
      }
      setInputText('');
      setSegments([]);
      setReviewVisible(false);
    } finally {
      setSaving(false);
    }
  }

  async function createEntityFromSegment(seg: Segment, tid: string, uid: string) {
    const now = serverTimestamp();
    const d = seg.proposed_data;
    if (seg.intent === 'task_creation' || seg.intent === 'schedule') {
      await addDoc(collection(db, 'teams', tid, 'tasks_independent'), {
        id: uuidv4(), team_id: tid,
        project_id: null, section_id: null,
        title: (d.title as string) ?? seg.segment,
        description: '', emoji: null, position: null,
        assignee_id: uid, assignee_name: null,
        due_date: d.date ? new Date(d.date as string) : null,
        due_time: (d.time as string) ?? null,
        start_date: null, duration_minutes: null, time_block: null,
        status: 'todo', completed_at: null,
        priority: (d.priority as string) ?? 'normal',
        deliverables: [], checklist: [], attachments: [],
        depends_on: [], blocks: [],
        has_sub_project: false, sub_project_id: null,
        ai_generated: true, ai_confidence: seg.confidence, ai_source_entry_id: null,
        decoration: null, reminders: [], recurrence: null,
        created_at: now, updated_at: now,
        created_by: uid, deleted_at: null, metadata: {},
      });
    } else if (seg.intent === 'journal_emotion' || seg.intent === 'journal_event') {
      await addDoc(collection(db, 'teams', tid, 'journal_entries'), {
        id: uuidv4(), team_id: tid,
        content: seg.segment,
        emotion: (d.emotion as string) ?? null,
        mood: seg.intent === 'journal_emotion' ? 'emotional' : 'event',
        is_private: true, tags: [],
        linked_task_ids: [], linked_project_ids: [],
        ai_generated: true, ai_confidence: seg.confidence,
        created_at: now, updated_at: now,
        created_by: uid, deleted_at: null, metadata: {},
      });
    }
  }

  async function toggleTask(taskId: string, currentStatus: string) {
    if (!teamId) return;
    const isDone = currentStatus === 'done';
    const ref = doc(db, 'teams', teamId, 'tasks_independent', taskId);
    await updateDoc(ref, {
      status: isDone ? 'todo' : 'done',
      completed_at: isDone ? null : serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }

  const todoTasks = tasks.filter((t) => t.status !== 'done');
  const doneTasks = tasks.filter((t) => t.status === 'done');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ivory }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.greeting, { color: C.ink900 }]}>안녕하세요 👋</Text>
          <Text style={[styles.dateLabel, { color: C.ink500 }]}>{todayLabel}</Text>

          {/* 주간 캘린더 */}
          <View style={[styles.weekStrip, { backgroundColor: C.cream, borderColor: C.beige }]}>
            {weekDays.map((d, i) => {
              const isToday = d.toDateString() === today.toDateString();
              return (
                <View key={i} style={styles.dayCell}>
                  <Text style={[styles.dayName, { color: C.ink300 }]}>{DAYS_KO[d.getDay()]}</Text>
                  <View style={[styles.dayCircle, isToday && { backgroundColor: C.mustard }]}>
                    <Text style={[styles.dayNum, { color: isToday ? '#fff' : C.ink500 }]}>
                      {d.getDate()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* AI SmartInput */}
          <View style={[styles.inputCard, { backgroundColor: C.cream, borderColor: C.beige }]}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="할 일, 일정, 감정을 자유롭게 입력하세요"
              placeholderTextColor={C.ink300}
              style={[styles.input, { color: C.ink900 }]}
              multiline
            />
            <View style={[styles.inputFooter, { borderTopColor: C.beige }]}>
              {/* 음성 녹음 버튼 (F-026) */}
              <TouchableOpacity
                style={[styles.voiceBtn, {
                  backgroundColor: recordState === 'recording' ? C.coral : C.beige,
                }]}
                onPress={handleVoiceToggle}
                disabled={recordState === 'processing'}
                activeOpacity={0.8}
              >
                {recordState === 'processing'
                  ? <ActivityIndicator color={C.ink500} size="small" />
                  : <Text style={{ fontSize: 16 }}>{recordState === 'recording' ? '⏹' : '🎙️'}</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.directBtn, { borderColor: C.beige }]}
                onPress={handleDirectAdd}
                disabled={!inputText.trim() || saving || classifying}
                activeOpacity={0.8}
              >
                <Text style={[styles.directText, { color: C.ink500 }]}>태스크 추가</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.aiBtn, { backgroundColor: C.mustard }]}
                onPress={handleAIClassify}
                disabled={!inputText.trim() || saving || classifying}
                activeOpacity={0.8}
              >
                {classifying
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.aiBtnText}>✨ AI 분류</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* 태스크 목록 */}
          {loading ? (
            <ActivityIndicator color={C.mustard} style={{ marginTop: 20 }} />
          ) : (
            <>
              {todoTasks.length > 0 && (
                <View style={styles.taskSection}>
                  <Text style={[styles.sectionTitle, { color: C.ink500 }]}>
                    할 일 ({todoTasks.length})
                  </Text>
                  {todoTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={toggleTask} />
                  ))}
                </View>
              )}

              {doneTasks.length > 0 && (
                <View style={styles.taskSection}>
                  <Text style={[styles.sectionTitle, { color: C.ink300 }]}>
                    완료됨 ({doneTasks.length})
                  </Text>
                  {doneTasks.map((task) => (
                    <TaskRow key={task.id} task={task} onToggle={toggleTask} />
                  ))}
                </View>
              )}

              {tasks.length === 0 && (
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>🌱</Text>
                  <Text style={[styles.emptyText, { color: C.ink500 }]}>할 일을 추가해보세요</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AI 분류 결과 확인 모달 */}
      <Modal
        visible={reviewVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewVisible(false)}
      >
        <ReviewSheet
          segments={segments}
          onConfirm={handleConfirm}
          onCancel={() => setReviewVisible(false)}
          saving={saving}
        />
      </Modal>
    </SafeAreaView>
  );
}

function ReviewSheet({
  segments, onConfirm, onCancel, saving,
}: {
  segments: Segment[];
  onConfirm: (segs: Segment[]) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [approved, setApproved] = useState<Set<number>>(
    new Set(segments.map((_, i) => i)),
  );

  const toggle = (i: number) => {
    setApproved((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <View style={sheet.overlay}>
      <View style={[sheet.container, { backgroundColor: C.ivory }]}>
        <View style={[sheet.handle, { backgroundColor: C.beige }]} />
        <Text style={[sheet.title, { color: C.ink900 }]}>AI 분류 결과 ✨</Text>
        <Text style={[sheet.subtitle, { color: C.ink500 }]}>저장할 항목을 선택하세요</Text>

        <ScrollView style={{ maxHeight: 360 }}>
          {segments.map((seg, i) => {
            const isOn = approved.has(i);
            const color = INTENT_COLOR[seg.intent] ?? C.ink300;
            return (
              <TouchableOpacity
                key={i}
                style={[
                  sheet.segItem,
                  { backgroundColor: C.cream, borderColor: isOn ? color : C.beige },
                ]}
                onPress={() => toggle(i)}
                activeOpacity={0.8}
              >
                <View style={[sheet.segHeader]}>
                  <View style={[sheet.badge, { backgroundColor: color + '20' }]}>
                    <Text style={[sheet.badgeText, { color }]}>
                      {INTENT_EMOJI[seg.intent]} {INTENT_LABEL[seg.intent] ?? seg.intent}
                    </Text>
                  </View>
                  <Text style={[sheet.confidence, { color: C.ink300 }]}>
                    {Math.round(seg.confidence * 100)}%
                  </Text>
                  <View style={[sheet.checkbox, { borderColor: isOn ? color : C.ink300 }, isOn && { backgroundColor: color }]}>
                    {isOn && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
                  </View>
                </View>
                <Text style={[sheet.segText, { color: C.ink900 }]} numberOfLines={2}>
                  {seg.segment}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={sheet.actions}>
          <TouchableOpacity
            style={[sheet.cancelBtn, { borderColor: C.beige }]}
            onPress={onCancel}
          >
            <Text style={{ color: C.ink500, fontSize: 14 }}>취소</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[sheet.confirmBtn, { backgroundColor: C.mustard }]}
            onPress={() => onConfirm(segments.filter((_, i) => approved.has(i)))}
            disabled={saving || approved.size === 0}
          >
            {saving
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>
                  저장 ({approved.size})
                </Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function TaskRow({ task, onToggle }: { task: Task; onToggle: (id: string, status: string) => void }) {
  const isDone = task.status === 'done';
  return (
    <TouchableOpacity
      style={[styles.taskRow, { backgroundColor: C.cream, borderColor: C.beige, opacity: isDone ? 0.6 : 1 }]}
      onPress={() => onToggle(task.id, task.status)}
      activeOpacity={0.7}
    >
      <View style={[
        styles.checkbox,
        { borderColor: isDone ? C.mustard : C.ink300 },
        isDone && { backgroundColor: C.mustard },
      ]}>
        {isDone && <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>}
      </View>
      <Text style={[
        styles.taskTitle,
        { color: isDone ? C.ink300 : C.ink900 },
        isDone && { textDecorationLine: 'line-through' },
      ]}>
        {task.title}
      </Text>
      {task.priority === 'urgent' && !isDone && (
        <Text style={[styles.badge, { color: C.coral }]}>긴급</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16 },
  greeting: { fontSize: 22, fontWeight: '700' },
  dateLabel: { fontSize: 13, marginTop: -8 },
  weekStrip: {
    flexDirection: 'row', justifyContent: 'space-between',
    borderRadius: 16, padding: 12, borderWidth: 1,
  },
  dayCell: { alignItems: 'center', gap: 4, flex: 1 },
  dayName: { fontSize: 10 },
  dayCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  dayNum: { fontSize: 13, fontWeight: '500' },
  inputCard: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  input: { fontSize: 14, lineHeight: 22, minHeight: 60 },
  inputFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 8, paddingTop: 10, borderTopWidth: 1,
  },
  voiceBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  directBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  directText: { fontSize: 13 },
  aiBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
    minWidth: 80, alignItems: 'center',
  },
  aiBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  taskSection: { gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, borderWidth: 1,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  taskTitle: { fontSize: 14, flex: 1 },
  badge: { fontSize: 11, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 13 },
});

const sheet = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(45,42,38,0.4)',
  },
  container: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, gap: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 4,
  },
  title: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: -4 },
  segItem: {
    borderRadius: 14, borderWidth: 1.5,
    padding: 12, marginBottom: 8, gap: 6,
  },
  segHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  confidence: { flex: 1, fontSize: 11, textAlign: 'right' },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  segText: { fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
    alignItems: 'center',
  },
  confirmBtn: {
    flex: 2, paddingVertical: 12, borderRadius: 14,
    alignItems: 'center',
  },
});

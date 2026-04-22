import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
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
};

const EMOTION_OPTIONS = [
  { key: 'joy',      emoji: '😄', label: '기쁨' },
  { key: 'calm',     emoji: '😌', label: '평온' },
  { key: 'excited',  emoji: '🤩', label: '설렘' },
  { key: 'grateful', emoji: '🙏', label: '감사' },
  { key: 'anxious',  emoji: '😰', label: '불안' },
  { key: 'sad',      emoji: '😢', label: '슬픔' },
  { key: 'tired',    emoji: '😴', label: '피곤' },
  { key: 'neutral',  emoji: '😐', label: '보통' },
];

const EMOTION_EMOJI: Record<string, string> = Object.fromEntries(
  EMOTION_OPTIONS.map((e) => [e.key, e.emoji]),
);

interface JournalEntry {
  id: string;
  content: string;
  emotion: string | null;
  created_at: Date | null;
}

export function JournalScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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
      collection(db, 'teams', teamId, 'journal_entries'),
      where('deleted_at', '==', null),
      where('created_by', '==', userId),
      orderBy('created_at', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({
        id: d.id,
        content: d.data().content ?? '',
        emotion: d.data().emotion ?? null,
        created_at: d.data().created_at?.toDate?.() ?? null,
      })));
      setLoading(false);
    });
  }, [teamId, userId]);

  const handleSave = useCallback(async () => {
    if (!inputText.trim() || !teamId || !userId) return;
    setSaving(true);
    try {
      const now = serverTimestamp();
      await addDoc(collection(db, 'teams', teamId, 'journal_entries'), {
        id: uuidv4(),
        team_id: teamId,
        content: inputText.trim(),
        emotion: selectedEmotion ?? null,
        mood: selectedEmotion ? 'emotional' : 'event',
        is_private: true,
        tags: [],
        linked_task_ids: [],
        linked_project_ids: [],
        ai_generated: false,
        ai_confidence: null,
        created_at: now,
        updated_at: now,
        created_by: userId,
        deleted_at: null,
        metadata: {},
      });
      setInputText('');
      setSelectedEmotion(null);
    } finally {
      setSaving(false);
    }
  }, [inputText, selectedEmotion, teamId, userId]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ivory }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: C.ink900 }]}>일기장 📓</Text>
          <Text style={[styles.subtitle, { color: C.ink500 }]}>감정·기억을 자유롭게 기록하세요</Text>

          {/* 감정 선택 */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.emotionScroll}>
            {EMOTION_OPTIONS.map((e) => (
              <TouchableOpacity
                key={e.key}
                style={[
                  styles.emotionBtn,
                  { borderColor: selectedEmotion === e.key ? C.mustard : C.beige },
                  selectedEmotion === e.key && { backgroundColor: C.mustard + '18' },
                ]}
                onPress={() => setSelectedEmotion(selectedEmotion === e.key ? null : e.key)}
              >
                <Text style={styles.emotionEmoji}>{e.emoji}</Text>
                <Text style={[styles.emotionLabel, { color: selectedEmotion === e.key ? C.mustard : C.ink500 }]}>
                  {e.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* 입력창 */}
          <View style={[styles.inputCard, { backgroundColor: C.cream, borderColor: C.beige }]}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="오늘 어떤 일이 있었나요?"
              placeholderTextColor={C.ink300}
              style={[styles.input, { color: C.ink900 }]}
              multiline
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: inputText.trim() ? C.mustard : C.beige }]}
              onPress={handleSave}
              disabled={!inputText.trim() || saving}
              activeOpacity={0.8}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={[styles.saveBtnText, { color: inputText.trim() ? '#fff' : C.ink300 }]}>저장</Text>}
            </TouchableOpacity>
          </View>

          {/* 일기 목록 */}
          {loading ? (
            <ActivityIndicator color={C.mustard} style={{ marginTop: 20 }} />
          ) : entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>📭</Text>
              <Text style={[styles.emptyText, { color: C.ink300 }]}>아직 일기가 없습니다</Text>
            </View>
          ) : (
            entries.map((entry) => (
              <View
                key={entry.id}
                style={[styles.entryCard, { backgroundColor: C.cream, borderColor: C.beige }]}
              >
                <Text style={styles.entryEmoji}>
                  {entry.emotion ? (EMOTION_EMOJI[entry.emotion] ?? '💬') : '💬'}
                </Text>
                <View style={styles.entryBody}>
                  <Text style={[styles.entryContent, { color: C.ink900 }]}>{entry.content}</Text>
                  {entry.created_at && (
                    <Text style={[styles.entryTime, { color: C.ink300 }]}>
                      {entry.created_at.toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  )}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 14 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: -8 },
  emotionScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  emotionBtn: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 14, borderWidth: 1.5, marginRight: 8, gap: 2,
  },
  emotionEmoji: { fontSize: 22 },
  emotionLabel: { fontSize: 10, fontWeight: '500' },
  inputCard: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  input: { fontSize: 14, lineHeight: 22, minHeight: 80 },
  saveBtn: { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 13 },
  entryCard: {
    flexDirection: 'row', gap: 12, borderRadius: 16, padding: 14, borderWidth: 1,
  },
  entryEmoji: { fontSize: 24, marginTop: 2 },
  entryBody: { flex: 1, gap: 4 },
  entryContent: { fontSize: 14, lineHeight: 20 },
  entryTime: { fontSize: 11 },
});

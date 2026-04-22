import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
  ActivityIndicator, TextInput,
} from 'react-native';
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { v4 as uuidv4 } from 'uuid';
import { db, auth } from '../lib/firebase';
import { ProjectDetailScreen } from './ProjectDetailScreen';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
};

interface Project {
  id: string;
  title: string;
  emoji: string | null;
  status: string;
  progress_percent: number;
  sections_completed: number;
  sections_total: number;
}

export function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newEmoji, setNewEmoji] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.uid);
      setTeamId(user.uid);
    });
  }, []);

  useEffect(() => {
    if (!teamId) return;
    const q = query(
      collection(db, 'teams', teamId, 'projects'),
      where('deleted_at', '==', null),
      orderBy('created_at', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title ?? '',
        emoji: d.data().emoji ?? null,
        status: d.data().status ?? 'active',
        progress_percent: d.data().progress_percent ?? 0,
        sections_completed: d.data().sections_completed ?? 0,
        sections_total: d.data().sections_total ?? 0,
      })));
      setLoading(false);
    });
  }, [teamId]);

  async function handleCreate() {
    if (!newTitle.trim() || !teamId || !userId) return;
    setCreating(true);
    try {
      const now = serverTimestamp();
      await addDoc(collection(db, 'teams', teamId, 'projects'), {
        id: uuidv4(),
        team_id: teamId,
        title: newTitle.trim(),
        description: '',
        emoji: newEmoji || null,
        color: null,
        parent_task_id: null,
        status: 'active',
        start_date: null,
        target_date: null,
        completed_at: null,
        progress_percent: 0,
        sections_total: 0,
        sections_completed: 0,
        tasks_total: 0,
        tasks_completed: 0,
        members: [userId],
        owner_id: userId,
        theme: null,
        ai_generated: false,
        ai_context: null,
        default_view_mode: 'mandarart',
        default_pivot_axis: 'section',
        created_at: now,
        updated_at: now,
        created_by: userId,
        deleted_at: null,
        metadata: {},
      });
      setNewTitle('');
      setNewEmoji('');
      setShowNew(false);
    } finally {
      setCreating(false);
    }
  }

  if (selectedProject && teamId) {
    return (
      <ProjectDetailScreen
        project={selectedProject}
        teamId={teamId}
        onBack={() => setSelectedProject(null)}
      />
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ivory }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, { color: C.ink900 }]}>프로젝트</Text>
            <Text style={[styles.subtitle, { color: C.ink500 }]}>만다라트로 목표를 구조화하세요</Text>
          </View>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: C.mustard }]}
            onPress={() => setShowNew(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.newBtnText}>+ 새 프로젝트</Text>
          </TouchableOpacity>
        </View>

        {showNew && (
          <View style={[styles.newCard, { backgroundColor: C.cream, borderColor: C.beige }]}>
            <View style={styles.newRow}>
              <TextInput
                value={newEmoji}
                onChangeText={setNewEmoji}
                placeholder="🎯"
                style={[styles.emojiInput, { borderColor: C.beige, color: C.ink900 }]}
                maxLength={2}
              />
              <TextInput
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="프로젝트 이름"
                style={[styles.titleInput, { color: C.ink900 }]}
                autoFocus
              />
            </View>
            <View style={styles.newActions}>
              <TouchableOpacity onPress={() => setShowNew(false)}>
                <Text style={{ color: C.ink500, fontSize: 14 }}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreate}
                disabled={!newTitle.trim() || creating}
                style={[styles.createBtn, { backgroundColor: newTitle.trim() ? C.mustard : C.beige }]}
              >
                <Text style={{ color: newTitle.trim() ? '#fff' : C.ink300, fontSize: 13, fontWeight: '600' }}>
                  {creating ? '...' : '만들기'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={C.mustard} style={{ marginTop: 40 }} />
        ) : projects.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={[styles.emptyText, { color: C.ink500 }]}>첫 프로젝트를 만들어보세요</Text>
          </View>
        ) : (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} onPress={() => setSelectedProject(project)} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProjectCard({ project, onPress }: { project: Project; onPress: () => void }) {
  const statusColor = project.status === 'completed' ? C.mint : C.mustard;
  return (
    <TouchableOpacity
      style={[styles.projectCard, { backgroundColor: C.cream, borderColor: C.beige }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text style={styles.projectEmoji}>{project.emoji ?? '🎯'}</Text>
      <View style={styles.projectInfo}>
        <View style={styles.projectTitleRow}>
          <Text style={[styles.projectTitle, { color: C.ink900 }]}>{project.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {project.status === 'completed' ? '완료' : '진행 중'}
            </Text>
          </View>
        </View>
        <View style={styles.progressRow}>
          <View style={[styles.progressBar, { backgroundColor: C.beige }]}>
            <View style={[styles.progressFill, {
              width: `${project.progress_percent}%` as `${number}%`,
              backgroundColor: C.mustard,
            }]} />
          </View>
          <Text style={[styles.progressText, { color: C.ink300 }]}>{project.progress_percent}%</Text>
        </View>
        {project.sections_total > 0 && (
          <Text style={[styles.sectionCount, { color: C.ink300 }]}>
            섹션 {project.sections_completed}/{project.sections_total}
          </Text>
        )}
      </View>
      <Text style={[styles.chevron, { color: C.ink300 }]}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 13, marginTop: 2 },
  newBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  newBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  newCard: { borderRadius: 16, padding: 14, borderWidth: 1, gap: 10 },
  newRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  emojiInput: { width: 44, height: 44, textAlign: 'center', fontSize: 20, borderWidth: 1, borderRadius: 10 },
  titleInput: { flex: 1, fontSize: 14 },
  newActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 12 },
  createBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyEmoji: { fontSize: 48 },
  emptyText: { fontSize: 14 },
  projectCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  projectEmoji: { fontSize: 24 },
  projectInfo: { flex: 1, gap: 4 },
  projectTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  projectTitle: { fontSize: 14, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '500' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressBar: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: { fontSize: 11, width: 28, textAlign: 'right' },
  sectionCount: { fontSize: 11 },
  chevron: { fontSize: 20 },
});

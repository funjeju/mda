import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import {
  collection, query, where, orderBy, onSnapshot,
  doc, updateDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

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

interface Section {
  id: string;
  title: string;
  description: string | null;
  status: string;
  position: number;
  tasks_total: number;
  tasks_completed: number;
}

interface Props {
  project: Project;
  teamId: string;
  onBack: () => void;
}

export function ProjectDetailScreen({ project, teamId, onBack }: Props) {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'teams', teamId, 'projects', project.id, 'sections'),
      where('deleted_at', '==', null),
      orderBy('position', 'asc'),
    );
    return onSnapshot(q, (snap) => {
      setSections(snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title ?? '',
        description: d.data().description ?? null,
        status: d.data().status ?? 'active',
        position: d.data().position ?? 0,
        tasks_total: d.data().tasks_total ?? 0,
        tasks_completed: d.data().tasks_completed ?? 0,
      })));
      setLoading(false);
    });
  }, [teamId, project.id]);

  async function toggleSectionStatus(sectionId: string, currentStatus: string) {
    const ref = doc(db, 'teams', teamId, 'projects', project.id, 'sections', sectionId);
    await updateDoc(ref, {
      status: currentStatus === 'completed' ? 'active' : 'completed',
      updated_at: serverTimestamp(),
    });
  }

  const completedCount = sections.filter((s) => s.status === 'completed').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ivory }}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={{ fontSize: 20, color: C.ink900 }}>‹</Text>
          <Text style={{ fontSize: 14, color: C.ink500 }}>프로젝트</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* 프로젝트 정보 */}
        <View style={[styles.projectCard, { backgroundColor: C.cream, borderColor: C.beige }]}>
          <Text style={styles.projectEmoji}>{project.emoji ?? '🎯'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.projectTitle, { color: C.ink900 }]}>{project.title}</Text>
            <View style={[styles.progressRow, { marginTop: 6 }]}>
              <View style={[styles.progressBar, { backgroundColor: C.beige, flex: 1 }]}>
                <View style={[styles.progressFill, {
                  width: `${project.progress_percent}%` as `${number}%`,
                  backgroundColor: project.status === 'completed' ? C.mint : C.mustard,
                }]} />
              </View>
              <Text style={{ fontSize: 11, color: C.ink300, marginLeft: 8 }}>{project.progress_percent}%</Text>
            </View>
            {project.sections_total > 0 && (
              <Text style={{ fontSize: 11, color: C.ink300, marginTop: 2 }}>
                섹션 {completedCount}/{sections.length}
              </Text>
            )}
          </View>
        </View>

        {/* 섹션 목록 */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionLabel, { color: C.ink300 }]}>
            만다라트 섹션 ({sections.length})
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={C.mustard} style={{ marginTop: 20 }} />
        ) : sections.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ fontSize: 36 }}>🌐</Text>
            <Text style={{ fontSize: 13, color: C.ink300, marginTop: 8 }}>
              아직 섹션이 없습니다
            </Text>
            <Text style={{ fontSize: 11, color: C.ink300, marginTop: 4 }}>
              웹에서 만다라트 섹션을 추가해보세요
            </Text>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            {sections.map((section) => {
              const isDone = section.status === 'completed';
              const progress = section.tasks_total > 0
                ? Math.round((section.tasks_completed / section.tasks_total) * 100)
                : isDone ? 100 : 0;
              return (
                <TouchableOpacity
                  key={section.id}
                  style={[styles.sectionCard, {
                    backgroundColor: C.cream,
                    borderColor: isDone ? C.mint : C.beige,
                    borderLeftWidth: 3,
                    borderLeftColor: isDone ? C.mint : C.mustard,
                  }]}
                  onPress={() => toggleSectionStatus(section.id, section.status)}
                  activeOpacity={0.8}
                >
                  <View style={styles.sectionLeft}>
                    <View style={[styles.sectionCheck, {
                      backgroundColor: isDone ? C.mint : 'transparent',
                      borderColor: isDone ? C.mint : C.beige,
                    }]}>
                      {isDone && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sectionTitle, {
                        color: isDone ? C.ink300 : C.ink900,
                        textDecorationLine: isDone ? 'line-through' : 'none',
                      }]}>
                        {section.title}
                      </Text>
                      {section.description && (
                        <Text style={{ fontSize: 11, color: C.ink300, marginTop: 2 }} numberOfLines={1}>
                          {section.description}
                        </Text>
                      )}
                      {section.tasks_total > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <View style={[styles.progressBar, { flex: 1, backgroundColor: C.beige }]}>
                            <View style={[styles.progressFill, {
                              width: `${progress}%` as `${number}%`,
                              backgroundColor: isDone ? C.mint : C.mustard,
                            }]} />
                          </View>
                          <Text style={{ fontSize: 10, color: C.ink300 }}>
                            {section.tasks_completed}/{section.tasks_total}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E9DFC9',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scroll: { padding: 16, gap: 12 },
  projectCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, padding: 16, borderWidth: 1,
  },
  projectEmoji: { fontSize: 28 },
  projectTitle: { fontSize: 16, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressBar: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  sectionHeader: { marginTop: 4 },
  sectionLabel: {
    fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5,
  },
  empty: { alignItems: 'center', paddingVertical: 40 },
  sectionCard: {
    borderRadius: 12, padding: 12, borderWidth: 1,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  sectionCheck: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, marginTop: 1,
  },
  sectionTitle: { fontSize: 13, fontWeight: '500' },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, ActivityIndicator,
} from 'react-native';
import {
  collection, query, where, orderBy, getDocs, limit,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  coral:   '#EB8B7C',
  mint:    '#8FBFA9',
  lavender:'#B5A7D4',
};

type ResultType = 'task' | 'project' | 'journal';

interface SearchResult {
  id: string;
  type: ResultType;
  title: string;
  subtitle?: string;
}

const TYPE_META: Record<ResultType, { label: string; icon: string; color: string }> = {
  task:    { label: '태스크', icon: '✅', color: C.mustard },
  project: { label: '프로젝트', icon: '🗂️', color: C.mint },
  journal: { label: '일기', icon: '📓', color: C.lavender },
};

function highlight(text: string, keyword: string): string {
  if (!keyword.trim()) return text;
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return text;
  return text; // React Native doesn't support JSX from here; just return plain text
}

export function SearchScreen() {
  const [teamId, setTeamId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<ResultType | 'all'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      if (user) setTeamId(user.uid);
    });
  }, []);

  const doSearch = useCallback(
    async (kw: string) => {
      if (!teamId || !kw.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const kl = kw.toLowerCase();
        const [taskSnap, projSnap, journalSnap] = await Promise.all([
          getDocs(query(
            collection(db, 'teams', teamId, 'tasks'),
            where('deleted_at', '==', null),
            orderBy('created_at', 'desc'),
            limit(50),
          )),
          getDocs(query(
            collection(db, 'teams', teamId, 'projects'),
            where('deleted_at', '==', null),
            orderBy('created_at', 'desc'),
            limit(20),
          )),
          getDocs(query(
            collection(db, 'teams', teamId, 'journal_entries'),
            where('deleted_at', '==', null),
            orderBy('created_at', 'desc'),
            limit(50),
          )),
        ]);

        const taskResults: SearchResult[] = taskSnap.docs
          .filter((d) => (d.data().title ?? '').toLowerCase().includes(kl))
          .map((d) => ({
            id: d.id, type: 'task',
            title: d.data().title ?? '',
            subtitle: d.data().status === 'done' ? '완료됨' : '진행 중',
          }));

        const projResults: SearchResult[] = projSnap.docs
          .filter((d) => (d.data().title ?? '').toLowerCase().includes(kl))
          .map((d) => ({
            id: d.id, type: 'project',
            title: `${d.data().emoji ?? ''} ${d.data().title ?? ''}`.trim(),
            subtitle: d.data().status === 'completed' ? '완료됨' : '진행 중',
          }));

        const journalResults: SearchResult[] = journalSnap.docs
          .filter((d) => (d.data().content ?? '').toLowerCase().includes(kl))
          .map((d) => ({
            id: d.id, type: 'journal',
            title: (d.data().content ?? '').slice(0, 60) + ((d.data().content ?? '').length > 60 ? '...' : ''),
            subtitle: d.data().emotion ?? undefined,
          }));

        setResults([...taskResults, ...projResults, ...journalResults]);
      } finally {
        setLoading(false);
      }
    },
    [teamId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyword.trim()) {
        doSearch(keyword);
      } else {
        setResults([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [keyword, doSearch]);

  function saveRecentSearch(kw: string) {
    if (!kw.trim()) return;
    setRecentSearches((prev) => {
      const next = [kw, ...prev.filter((s) => s !== kw)].slice(0, 8);
      return next;
    });
  }

  const filtered = filterType === 'all' ? results : results.filter((r) => r.type === filterType);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ivory }}>
      {/* 검색창 */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          onSubmitEditing={() => saveRecentSearch(keyword)}
          placeholder="태스크, 프로젝트, 일기 검색..."
          placeholderTextColor={C.ink300}
          style={[styles.searchInput, { color: C.ink900 }]}
          autoFocus
          returnKeyType="search"
        />
        {keyword.length > 0 && (
          <TouchableOpacity onPress={() => setKeyword('')}>
            <Text style={{ fontSize: 18, color: C.ink300 }}>×</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 필터 탭 */}
      {results.length > 0 && (
        <View style={styles.filterRow}>
          {(['all', 'task', 'project', 'journal'] as const).map((t) => {
            const label = t === 'all'
              ? `전체 (${results.length})`
              : `${TYPE_META[t].icon} ${TYPE_META[t].label} (${results.filter(r => r.type === t).length})`;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setFilterType(t)}
                style={[
                  styles.filterChip,
                  { backgroundColor: filterType === t ? C.mustard : C.cream, borderColor: filterType === t ? C.mustard : C.beige },
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: '500', color: filterType === t ? '#fff' : C.ink500 }}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
        {/* 로딩 */}
        {loading && (
          <View style={{ paddingVertical: 32, alignItems: 'center' }}>
            <ActivityIndicator color={C.mustard} />
          </View>
        )}

        {/* 결과 없음 */}
        {!loading && keyword.trim() && filtered.length === 0 && (
          <View style={{ paddingVertical: 48, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 36 }}>🔍</Text>
            <Text style={{ fontSize: 14, color: C.ink300 }}>"{keyword}"에 대한 결과가 없습니다</Text>
          </View>
        )}

        {/* 최근 검색어 */}
        {!keyword.trim() && recentSearches.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.ink300, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                최근 검색
              </Text>
              <TouchableOpacity onPress={() => setRecentSearches([])}>
                <Text style={{ fontSize: 11, color: C.ink300 }}>전체 삭제</Text>
              </TouchableOpacity>
            </View>
            {recentSearches.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => setKeyword(s)}
                style={[styles.recentItem, { backgroundColor: C.cream, borderColor: C.beige }]}
              >
                <Text style={{ fontSize: 13, color: C.ink500 }}>🕐  {s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* 빈 상태 */}
        {!keyword.trim() && recentSearches.length === 0 && (
          <View style={{ paddingVertical: 48, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 36 }}>🔍</Text>
            <Text style={{ fontSize: 14, color: C.ink300 }}>태스크, 프로젝트, 일기를 검색하세요</Text>
          </View>
        )}

        {/* 검색 결과 */}
        {!loading && filtered.map((item) => {
          const meta = TYPE_META[item.type];
          return (
            <View
              key={`${item.type}-${item.id}`}
              style={[styles.resultItem, { backgroundColor: C.cream, borderColor: C.beige }]}
            >
              <View style={[styles.typeIcon, { backgroundColor: meta.color + '20' }]}>
                <Text style={{ fontSize: 16 }}>{meta.icon}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontSize: 13, fontWeight: '500', color: C.ink900 }} numberOfLines={2}>
                  {item.title}
                </Text>
                {item.subtitle && (
                  <Text style={{ fontSize: 11, color: C.ink300 }}>{item.subtitle}</Text>
                )}
              </View>
              <View style={[styles.typeBadge, { backgroundColor: meta.color + '20' }]}>
                <Text style={{ fontSize: 10, color: meta.color, fontWeight: '500' }}>{meta.label}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 14, backgroundColor: '#F6F1E7', borderWidth: 1, borderColor: '#E9DFC9',
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 14 },
  filterRow: {
    flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingBottom: 8, flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1,
  },
  recentItem: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  resultItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  typeIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
});

'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, query, orderBy, limit, collection } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

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

type ActivityType =
  | 'task_completed'
  | 'task_created'
  | 'project_created'
  | 'section_completed'
  | 'journal_added'
  | 'member_joined';

interface Activity {
  id: string;
  type: ActivityType;
  actor_id: string;
  actor_name: string;
  target_title: string;
  target_id?: string;
  created_at: Date | null;
}

const TYPE_META: Record<ActivityType, { emoji: string; color: string; verb: string }> = {
  task_completed:    { emoji: '✅', color: C.mint,     verb: '완료했습니다' },
  task_created:      { emoji: '📌', color: C.mustard,  verb: '추가했습니다' },
  project_created:   { emoji: '🗂️', color: C.coral,    verb: '프로젝트를 만들었습니다' },
  section_completed: { emoji: '🔷', color: C.lavender, verb: '섹션을 완료했습니다' },
  journal_added:     { emoji: '📓', color: C.lavender, verb: '일기를 작성했습니다' },
  member_joined:     { emoji: '👋', color: C.mint,     verb: '팀에 합류했습니다' },
};

// 실시간 활동 생성 유틸
export async function logActivity(
  teamId: string,
  type: ActivityType,
  actorId: string,
  actorName: string,
  targetTitle: string,
  targetId?: string,
) {
  const { addDoc, serverTimestamp } = await import('firebase/firestore');
  await addDoc(collection(db, 'teams', teamId, 'activity_feed'), {
    type, actor_id: actorId, actor_name: actorName,
    target_title: targetTitle, target_id: targetId ?? null,
    created_at: serverTimestamp(),
  });
}

interface Props {
  teamId: string;
  maxItems?: number;
}

export function TeamActivityFeed({ teamId, maxItems = 20 }: Props) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'teams', teamId, 'activity_feed'),
      orderBy('created_at', 'desc'),
      limit(maxItems),
    );
    return onSnapshot(q, (snap) => {
      setActivities(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: data.type as ActivityType,
            actor_id: data.actor_id ?? '',
            actor_name: data.actor_name ?? '?',
            target_title: data.target_title ?? '',
            target_id: data.target_id ?? undefined,
            created_at: data.created_at?.toDate?.() ?? null,
          };
        }),
      );
      setLoading(false);
    });
  }, [teamId, maxItems]);

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <div className="w-5 h-5 border-2 rounded-full animate-spin"
          style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-2xl mb-2">🌱</p>
        <p className="text-xs" style={{ color: C.ink300 }}>팀 활동이 없습니다</p>
      </div>
    );
  }

  // 날짜별 그룹화
  const grouped: { label: string; items: Activity[] }[] = [];
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const dateMap = new Map<string, Activity[]>();
  activities.forEach((a) => {
    const date = a.created_at ?? new Date(0);
    const d = new Date(date); d.setHours(0,0,0,0);
    let label: string;
    if (d.getTime() === today.getTime()) label = '오늘';
    else if (d.getTime() === yesterday.getTime()) label = '어제';
    else label = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
    if (!dateMap.has(label)) dateMap.set(label, []);
    dateMap.get(label)!.push(a);
  });
  dateMap.forEach((items, label) => grouped.push({ label, items }));

  return (
    <div className="flex flex-col gap-4">
      {grouped.map(({ label, items }) => (
        <div key={label}>
          <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: C.ink300 }}>
            {label}
          </p>
          <div className="flex flex-col gap-1">
            {items.map((activity) => {
              const meta = TYPE_META[activity.type] ?? { emoji: '•', color: C.ink300, verb: '' };
              const timeStr = activity.created_at
                ? activity.created_at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                : '';
              const initials = activity.actor_name.slice(0, 2).toUpperCase();

              return (
                <div key={activity.id} className="flex items-start gap-2.5 py-1.5">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                    style={{ background: meta.color + '25', color: meta.color }}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed" style={{ color: C.ink900 }}>
                      <span className="font-semibold">{activity.actor_name}</span>
                      {' '}<span style={{ color: C.ink500 }}>{meta.verb}</span>
                      {activity.target_title && (
                        <> —{' '}
                          <span
                            className="font-medium"
                            style={{ color: meta.color }}
                          >
                            {meta.emoji} {activity.target_title}
                          </span>
                        </>
                      )}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: C.ink300 }}>{timeStr}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

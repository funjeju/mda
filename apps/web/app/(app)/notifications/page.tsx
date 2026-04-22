'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, query, orderBy, limit, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth/AuthContext';
import { notificationsCol, notificationDoc } from '../../../lib/firestore/collections';
import { AppShell } from '../../../components/layout/AppShell';

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

type NotifType = 'task_done' | 'ai_classified' | 'ai_summary' | 'invite' | 'mention' | 'reminder' | 'system' | 'calendar_reminder';

interface NotifDoc {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  read: boolean;
  created_at: Date | null;
  link?: string | null;
}

const TYPE_META: Record<NotifType, { icon: string; color: string }> = {
  task_done:     { icon: '✅', color: C.mint },
  ai_classified: { icon: '🤖', color: C.lavender },
  ai_summary:    { icon: '📊', color: C.mustard },
  invite:        { icon: '🤝', color: C.coral },
  mention:       { icon: '@',  color: C.mustard },
  reminder:          { icon: '⏰', color: C.coral },
  system:            { icon: '🔔', color: C.ink300 },
  calendar_reminder: { icon: '📅', color: C.mustard },
};

export default function NotificationsPage() {
  const { user, teamId, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user || !teamId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.ivory }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <AppShell>
      <NotificationsContent userId={user.uid} />
    </AppShell>
  );
}

function NotificationsContent({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<NotifDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);

  useEffect(() => {
    const q = query(
      notificationsCol(userId),
      orderBy('created_at', 'desc'),
      limit(60),
    );
    return onSnapshot(q, (snap) => {
      setNotifications(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            type: (data.type ?? 'system') as NotifType,
            title: data.title ?? '',
            body: data.body ?? '',
            read: data.read ?? false,
            created_at: data.created_at?.toDate?.() ?? null,
            link: data.link ?? null,
          };
        }),
      );
      setLoading(false);
    });
  }, [userId]);

  async function markRead(id: string) {
    const ref = notificationDoc(userId, id);
    await updateDoc(ref, { read: true });
  }

  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) => {
      batch.update(notificationDoc(userId, n.id), { read: true });
    });
    await batch.commit();
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filtered = filterUnread ? notifications.filter((n) => !n.read) : notifications;

  // 날짜 그룹
  const grouped = groupByDate(filtered);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>알림 🔔</h2>
          <p className="text-sm mt-0.5" style={{ color: C.ink500 }}>
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}개` : '모두 읽었습니다'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs px-3 py-1.5 rounded-xl"
              style={{ border: `1px solid ${C.beige}`, color: C.ink500 }}
            >
              모두 읽음
            </button>
          )}
          <button
            onClick={() => setFilterUnread(!filterUnread)}
            className="text-xs px-3 py-1.5 rounded-xl font-medium"
            style={{
              background: filterUnread ? C.mustard : C.cream,
              color: filterUnread ? '#fff' : C.ink500,
              border: `1px solid ${filterUnread ? C.mustard : C.beige}`,
            }}
          >
            {filterUnread ? '전체 보기' : '안 읽은 것만'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔕</p>
          <p className="text-sm" style={{ color: C.ink300 }}>
            {filterUnread ? '읽지 않은 알림이 없습니다' : '아직 알림이 없습니다'}
          </p>
          <p className="text-xs mt-1" style={{ color: C.ink300 }}>
            AI 분류, 태스크 완료, 팀 초대 등 알림이 여기에 표시됩니다
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(({ dateLabel, items }) => (
            <div key={dateLabel}>
              <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: C.ink300 }}>
                {dateLabel}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((n) => (
                  <NotifCard
                    key={n.id}
                    notif={n}
                    onRead={() => markRead(n.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotifCard({ notif, onRead }: { notif: NotifDoc; onRead: () => void }) {
  const meta = TYPE_META[notif.type] ?? TYPE_META.system;
  const router = useRouter();

  function handleClick() {
    if (!notif.read) onRead();
    if (notif.link) router.push(notif.link);
  }

  return (
    <div
      className="flex gap-3 rounded-2xl px-4 py-3 cursor-pointer transition-colors"
      style={{
        background: notif.read ? C.cream : C.mustard + '08',
        border: `1px solid ${notif.read ? C.beige : C.mustard + '40'}`,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.mustard + '60')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = notif.read ? C.beige : C.mustard + '40')}
      onClick={handleClick}
    >
      {/* 아이콘 */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
        style={{ background: meta.color + '20' }}
      >
        {meta.icon}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-snug" style={{ color: C.ink900 }}>
            {notif.title}
          </p>
          {!notif.read && (
            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: C.mustard }} />
          )}
        </div>
        {notif.body && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: C.ink500 }}>
            {notif.body}
          </p>
        )}
        {notif.created_at && (
          <p className="text-xs mt-1" style={{ color: C.ink300 }}>
            {notif.created_at.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  );
}

function groupByDate(items: NotifDoc[]) {
  const map = new Map<string, NotifDoc[]>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const item of items) {
    let label: string;
    if (!item.created_at) {
      label = '날짜 불명';
    } else {
      const d = new Date(item.created_at);
      d.setHours(0, 0, 0, 0);
      if (d.getTime() === today.getTime()) label = '오늘';
      else if (d.getTime() === yesterday.getTime()) label = '어제';
      else label = item.created_at.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
    }
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(item);
  }
  return Array.from(map.entries()).map(([dateLabel, items]) => ({ dateLabel, items }));
}

'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: Date;
  metadata?: Record<string, unknown>;
}

export function useNotifications(userId: string) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const col = collection(db, 'users', userId, 'notifications');
    const q = query(col, orderBy('created_at', 'desc'), limit(30));

    const unsub = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          type: data['type'] ?? 'general',
          title: data['title'] ?? '',
          body: data['body'] ?? '',
          read: data['read'] ?? false,
          created_at: data['created_at']?.toDate?.() ?? new Date(),
          metadata: data['metadata'],
        };
      }));
      setLoading(false);
    });

    return unsub;
  }, [userId]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAsRead(notifId: string) {
    await updateDoc(doc(db, 'users', userId, 'notifications', notifId), { read: true });
  }

  async function markAllAsRead() {
    const unread = notifications.filter((n) => !n.read);
    await Promise.all(unread.map((n) => markAsRead(n.id)));
  }

  return { notifications, loading, unreadCount, markAsRead, markAllAsRead };
}

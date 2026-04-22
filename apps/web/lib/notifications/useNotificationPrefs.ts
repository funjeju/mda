'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export type BatchMode = 'immediate' | 'hourly' | 'thrice';

export interface NotificationPrefs {
  dnd_enabled: boolean;
  dnd_start: number;  // 0-23 hour
  dnd_end: number;    // 0-23 hour
  batch_mode: BatchMode;
  task_due: boolean;
  evening_report: boolean;
  team_activity: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  dnd_enabled: false,
  dnd_start: 22,
  dnd_end: 8,
  batch_mode: 'immediate',
  task_due: true,
  evening_report: true,
  team_activity: true,
};

export function useNotificationPrefs(userId: string) {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    getDoc(doc(db, 'users', userId, 'settings', 'notification_prefs')).then((snap) => {
      if (snap.exists()) {
        setPrefs({ ...DEFAULT_PREFS, ...(snap.data() as Partial<NotificationPrefs>) });
      }
      setLoading(false);
    });
  }, [userId]);

  const save = useCallback(async (updates: Partial<NotificationPrefs>) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    await setDoc(
      doc(db, 'users', userId, 'settings', 'notification_prefs'),
      { ...next, updated_at: serverTimestamp() },
      { merge: true },
    );
  }, [userId, prefs]);

  return { prefs, loading, save };
}

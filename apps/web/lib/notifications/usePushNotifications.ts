'use client';

import { useState, useCallback } from 'react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

async function sendSwConfig(reg: ServiceWorkerRegistration): Promise<void> {
  const config = {
    apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const sw = reg.active ?? await new Promise<ServiceWorker>((resolve) => {
    const worker = reg.installing ?? reg.waiting;
    if (!worker) return;
    worker.addEventListener('statechange', function handler() {
      if (worker.state === 'activated') {
        worker.removeEventListener('statechange', handler);
        resolve(worker);
      }
    });
  });

  sw?.postMessage({ type: 'FIREBASE_CONFIG', config });
}

async function getFcmToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const { getMessaging, getToken } = await import('firebase/messaging');
  const { firebaseApp } = await import('../firebase/config');

  const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await sendSwConfig(reg);

  const messaging = getMessaging(firebaseApp);
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: reg });
  return token ?? null;
}

export function usePushNotifications(userId: string) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');

  const enable = useCallback(async () => {
    setStatus('requesting');
    try {
      const token = await getFcmToken();
      if (!token) {
        setStatus('denied');
        return;
      }
      await setDoc(
        doc(db, 'users', userId, 'fcm_tokens', token),
        {
          token,
          platform: 'web',
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true },
      );
      setStatus('granted');
    } catch {
      setStatus('denied');
    }
  }, [userId]);

  return { status, enable };
}

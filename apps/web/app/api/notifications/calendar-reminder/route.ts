import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// F-091: 캘린더 기반 알림 — Vercel Cron이 매 5분 GET으로 호출
// Google Calendar 이벤트 35분 이내 시작 → FCM 푸시

interface CalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  location?: string;
  description?: string;
}

async function fetchUpcomingEvents(accessToken: string, windowMinutes = 35): Promise<CalendarEvent[]> {
  const now = new Date();
  const future = new Date(now.getTime() + windowMinutes * 60 * 1000);

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
    `?timeMin=${encodeURIComponent(now.toISOString())}` +
    `&timeMax=${encodeURIComponent(future.toISOString())}` +
    `&singleEvents=true&orderBy=startTime&maxResults=10`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) return [];
  const data = await res.json() as { items?: CalendarEvent[] };
  return data.items ?? [];
}

async function processUser(userId: string, accessToken: string): Promise<number> {
  const events = await fetchUpcomingEvents(accessToken, 35);
  const now = new Date();
  let sent = 0;

  for (const ev of events) {
    const startStr = ev.start.dateTime ?? ev.start.date;
    if (!startStr) continue;
    const startTime = new Date(startStr);
    const minutesUntil = (startTime.getTime() - now.getTime()) / 60000;

    if (minutesUntil < 25 || minutesUntil > 35) continue;

    const sentKey = `calendar_reminder:${userId}:${ev.id}`;
    const alreadySent = await adminDb.collection('notification_sent_log').doc(sentKey).get();
    if (alreadySent.exists) continue;

    const tokensSnap = await adminDb.collection('users').doc(userId).collection('fcm_tokens').get();
    const fcmTokens = tokensSnap.docs.map((d) => d.id);

    const minuteStr = Math.round(minutesUntil);
    const title = `📅 ${ev.summary}`;
    const body = `${minuteStr}분 후 시작${ev.location ? ` — ${ev.location}` : ''}`;

    // FCM Admin SDK로 발송 (FCM_SERVER_KEY 불필요)
    if (fcmTokens.length > 0) {
      try {
        await adminMessaging.sendEachForMulticast({
          tokens: fcmTokens,
          notification: { title, body },
          data: { type: 'calendar_reminder' },
        });
        sent += fcmTokens.length;
      } catch { /* 토큰 만료 등 FCM 오류 무시 */ }
    }

    // Firestore 알림 기록
    await adminDb.collection('users').doc(userId).collection('notifications').add({
      type: 'calendar_reminder',
      title,
      body,
      read: false,
      created_at: FieldValue.serverTimestamp(),
      metadata: { event_id: ev.id, start: startStr },
    });

    // 중복 발송 방지 로그 (TTL: 1시간)
    await adminDb.collection('notification_sent_log').doc(sentKey).set({
      sent_at: FieldValue.serverTimestamp(),
      expires_at: new Date(Date.now() + 60 * 60 * 1000),
    });
  }

  return sent;
}

export async function GET(req: NextRequest) {
  // Vercel Cron은 Authorization: Bearer {CRON_SECRET} 헤더를 자동 추가
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  let usersProcessed = 0;
  let totalSent = 0;

  // google_calendar 연동을 마친 사용자 중 accessToken이 유효한 경우만 처리
  // Admin SDK는 Security Rules를 우회하여 직접 조회
  const settingsSnap = await adminDb
    .collectionGroup('settings')
    .where('google_calendar.token_expires_at', '>', now)
    .get();

  for (const doc of settingsSnap.docs) {
    const data = doc.data();
    const gcal = data['google_calendar'] as {
      access_token?: string;
      token_expires_at?: { toDate: () => Date };
    } | undefined;
    if (!gcal?.access_token) continue;

    // path: users/{userId}/settings/integrations
    const userId = doc.ref.parent.parent?.id;
    if (!userId) continue;

    try {
      const sent = await processUser(userId, gcal.access_token);
      totalSent += sent;
      usersProcessed++;
    } catch { /* 개별 사용자 오류는 다음 사용자에 영향 없음 */ }
  }

  return NextResponse.json({ usersProcessed, totalSent });
}

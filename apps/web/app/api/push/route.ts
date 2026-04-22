import { NextRequest, NextResponse } from 'next/server';
import { adminMessaging, adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface PushRequest {
  userId: string;
  title: string;
  body: string;
  type?: 'task_done' | 'ai_classified' | 'ai_summary' | 'invite' | 'mention' | 'reminder' | 'system' | 'calendar_reminder';
  link?: string;
  data?: Record<string, string>;
}

export async function POST(req: NextRequest) {
  // 내부 API — Authorization 헤더 또는 서버 사이드 전용
  const authHeader = req.headers.get('authorization');
  const serverSecret = process.env.INTERNAL_API_SECRET;
  if (serverSecret && authHeader !== `Bearer ${serverSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: PushRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, title, body: msgBody, type = 'system', link, data } = body;
  if (!userId || !title || !msgBody) {
    return NextResponse.json({ error: 'userId, title, body are required' }, { status: 400 });
  }

  // 1. Firestore에 알림 문서 저장 (알림 센터 표시용)
  const notifRef = adminDb.collection('users').doc(userId).collection('notifications').doc();
  await notifRef.set({
    type,
    title,
    body: msgBody,
    link: link ?? null,
    read: false,
    created_at: FieldValue.serverTimestamp(),
  });

  // 2. 사용자 FCM 토큰 + 알림 설정 조회
  const [fcmTokensSnap, prefsSnap] = await Promise.all([
    adminDb.collection('users').doc(userId).collection('fcm_tokens').get(),
    adminDb.collection('users').doc(userId).collection('settings').doc('notification_prefs').get(),
  ]);
  const fcmTokens = fcmTokensSnap.docs.map((d) => d.data()['token'] as string).filter(Boolean);

  // DND 체크 (F-093)
  if (prefsSnap.exists()) {
    const p = prefsSnap.data() as {
      dnd_enabled?: boolean; dnd_start?: number; dnd_end?: number;
      task_due?: boolean; evening_report?: boolean; team_activity?: boolean;
    };
    if (p.dnd_enabled) {
      const nowHour = new Date().getHours();
      const start = p.dnd_start ?? 22;
      const end   = p.dnd_end   ?? 8;
      const inDnd = start > end
        ? nowHour >= start || nowHour < end    // 자정 넘어가는 구간
        : nowHour >= start && nowHour < end;
      if (inDnd) {
        return NextResponse.json({ success: true, delivered: false, reason: 'dnd_active' });
      }
    }
    // 알림 유형 필터
    if (type === 'reminder' && p.task_due === false) {
      return NextResponse.json({ success: true, delivered: false, reason: 'type_disabled' });
    }
    if (type === 'ai_summary' && p.evening_report === false) {
      return NextResponse.json({ success: true, delivered: false, reason: 'type_disabled' });
    }
    if ((type === 'task_done' || type === 'mention') && p.team_activity === false) {
      return NextResponse.json({ success: true, delivered: false, reason: 'type_disabled' });
    }
  }

  if (fcmTokens.length === 0) {
    return NextResponse.json({ success: true, delivered: false, reason: 'no_fcm_token' });
  }

  // 3. FCM 메시지 발송 (멀티캐스트)
  try {
    const response = await adminMessaging.sendEachForMulticast({
      tokens: fcmTokens,
      notification: { title, body: msgBody },
      data: {
        type,
        link: link ?? '',
        notifId: notifRef.id,
        ...data,
      },
      android: {
        notification: {
          channelId: 'mda_default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    });

    // 만료된 토큰 제거
    const batch = adminDb.batch();
    let expiredCount = 0;
    response.responses.forEach((r, i) => {
      const errCode = r.error?.code ?? '';
      if (
        errCode === 'messaging/registration-token-not-registered' ||
        errCode === 'messaging/invalid-registration-token'
      ) {
        batch.delete(
          adminDb.collection('users').doc(userId).collection('fcm_tokens').doc(fcmTokens[i]!),
        );
        expiredCount++;
      }
    });
    if (expiredCount > 0) await batch.commit();

    return NextResponse.json({
      success: true,
      delivered: response.successCount > 0,
      successCount: response.successCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[push] FCM send failed:', message);
    return NextResponse.json({ success: true, delivered: false, reason: 'fcm_error', error: message });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// F-131: Stripe Webhook 처리
// STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET 환경변수 필요

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  let Stripe: typeof import('stripe').default;
  try {
    Stripe = (await import('stripe')).default;
  } catch {
    return NextResponse.json({ error: 'stripe 패키지 미설치' }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2026-03-25.dahlia' });
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') ?? '';

  let event: import('stripe').Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error('[billing/webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as import('stripe').Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      const tier   = session.metadata?.tier ?? 'plus';
      if (userId) {
        await adminDb.collection('users').doc(userId)
          .collection('settings').doc('subscription').set({
            tier,
            stripe_customer_id: session.customer ?? null,
            stripe_subscription_id: session.subscription ?? null,
            cancel_at_period_end: false,
            current_period_end: null,
            updated_at: FieldValue.serverTimestamp(),
          }, { merge: true });
      }
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as import('stripe').Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        await adminDb.collection('users').doc(userId)
          .collection('settings').doc('subscription').set({
            tier: sub.metadata?.tier ?? 'plus',
            cancel_at_period_end: sub.cancel_at_period_end,
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
            updated_at: FieldValue.serverTimestamp(),
          }, { merge: true });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as import('stripe').Stripe.Subscription;
      const userId = sub.metadata?.userId;
      if (userId) {
        await adminDb.collection('users').doc(userId)
          .collection('settings').doc('subscription').set({
            tier: 'free',
            stripe_subscription_id: null,
            cancel_at_period_end: false,
            current_period_end: null,
            updated_at: FieldValue.serverTimestamp(),
          }, { merge: true });
      }
      break;
    }

    // F-131: 결제 실패 — past_due 상태로 표시 + 인앱 알림
    // Stripe가 1일/3일/7일 자동 재시도. 최종 실패 시 subscription.deleted 발생.
    case 'invoice.payment_failed': {
      const invoice = event.data.object as import('stripe').Stripe.Invoice;
      const customerId = invoice.customer as string | null;
      if (!customerId) break;

      // customer_id로 userId 찾기
      const settingsSnap = await adminDb
        .collectionGroup('settings')
        .where('stripe_customer_id', '==', customerId)
        .limit(1)
        .get();

      if (settingsSnap.empty) break;

      const settingDoc = settingsSnap.docs[0]!;
      // path: users/{userId}/settings/subscription
      const userId = settingDoc.ref.parent.parent?.id;
      if (!userId) break;

      const attemptCount = (invoice as { attempt_count?: number }).attempt_count ?? 1;

      await adminDb.collection('users').doc(userId)
        .collection('settings').doc('subscription').set({
          status: 'past_due',
          payment_failed_at: FieldValue.serverTimestamp(),
          payment_attempt_count: attemptCount,
          updated_at: FieldValue.serverTimestamp(),
        }, { merge: true });

      // 인앱 알림 생성
      await adminDb.collection('users').doc(userId)
        .collection('notifications').add({
          type: 'payment_failed',
          title: '결제에 실패했어요',
          body: `결제 수단을 확인해주세요. (${attemptCount}회 시도)`,
          read: false,
          created_at: FieldValue.serverTimestamp(),
        });

      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

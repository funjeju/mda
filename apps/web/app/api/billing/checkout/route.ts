import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-131: Stripe Checkout Session 생성
// STRIPE_SECRET_KEY 환경변수 필요

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:checkout`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 });
  }

  const { priceId, tier } = await req.json() as {
    priceId: string;
    tier: 'plus' | 'team';
  };
  const userId = uid;

  if (!priceId || !tier) {
    return NextResponse.json({ error: 'priceId, tier 필수' }, { status: 400 });
  }

  // 기존 Stripe Customer ID 조회
  const userDoc = await adminDb.collection('users').doc(userId).get();
  const existingCustomerId: string | null = userDoc.data()?.stripe_customer_id ?? null;

  // Stripe API 호출 (dynamic import — stripe 패키지 optional)
  let Stripe: typeof import('stripe').default;
  try {
    Stripe = (await import('stripe')).default;
  } catch {
    return NextResponse.json({ error: 'stripe 패키지 미설치 (npm install stripe)' }, { status: 503 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-01-27.acacia' });

  const origin = req.headers.get('origin') ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer: existingCustomerId ?? undefined,
    customer_email: existingCustomerId ? undefined : userDoc.data()?.email,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/settings?upgraded=1`,
    cancel_url:  `${origin}/settings`,
    metadata: { userId, tier },
    subscription_data: {
      metadata: { userId, tier },
    },
  });

  // Customer ID 저장 (없던 경우)
  if (!existingCustomerId && session.customer) {
    await adminDb.collection('users').doc(userId).set(
      { stripe_customer_id: session.customer },
      { merge: true },
    );
  }

  return NextResponse.json({ url: session.url });
}

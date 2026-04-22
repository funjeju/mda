---
name: stripe-billing-flows
description: Stripe 결제 플로우. Checkout Session, Webhook 처리, 구독 상태 동기화, seat 관리, 결제 실패 대응. 결제 기능 작업 시 로드한다.
---

# Stripe Billing Flows

## Checkout Session 생성

```typescript
// POST /api/billing/checkout
const session = await stripe.checkout.sessions.create({
  customer: user.stripe_customer_id ?? undefined,
  customer_email: user.stripe_customer_id ? undefined : user.email,
  line_items: [{ price: PLUS_PRICE_ID, quantity: 1 }],
  mode: 'subscription',
  metadata: { userId: user.id, tier: 'plus' },
  success_url: `${origin}/settings/billing?success=1`,
  cancel_url: `${origin}/settings/billing?cancel=1`,
  subscription_data: {
    metadata: { userId: user.id, tier: 'plus' },
  },
});
```

## Webhook 이벤트 처리

```typescript
// POST /api/billing/webhook
// Signature 검증 필수!
const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

switch (event.type) {
  case 'checkout.session.completed':
    // tier 활성화, stripe_customer_id 저장
    break;
  case 'customer.subscription.updated':
    // tier 변경, cancel_at_period_end, current_period_end 업데이트
    break;
  case 'customer.subscription.deleted':
    // tier → 'free', stripe_subscription_id → null
    break;
  case 'invoice.payment_failed':
    // status → 'past_due', 인앱 알림 생성
    // Stripe가 1일/3일/7일 자동 재시도
    // 최종 실패 시 subscription.deleted 발생 → free 다운그레이드
    break;
}
```

## Firestore 구독 상태

```typescript
// users/{userId}/settings/subscription
interface UserSubscription {
  tier: 'free' | 'plus' | 'team' | 'business';
  status: 'active' | 'past_due' | 'canceled' | 'paused';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: Timestamp | null;
  cancel_at: Timestamp | null;
  seat_count: number;
  payment_failed_at: Timestamp | null;
  payment_attempt_count: number;
}
```

## 결제 실패 대응 (스펙 15.13)

```
invoice.payment_failed 수신
  ↓
status → 'past_due'
  ↓
인앱 알림: "결제 수단을 확인해주세요"
  ↓
Stripe 자동 재시도: 1일 후, 3일 후, 7일 후
  ↓
7일 이후 모두 실패 → customer.subscription.deleted
  ↓
tier → 'free'
  ↓
데이터 30일 보존
  ↓
30일 경과 시 읽기만 가능
```

## 가격 ID (환경변수)

```bash
STRIPE_PLUS_PRICE_ID=price_xxx
STRIPE_TEAM_PRICE_ID=price_yyy
STRIPE_WEBHOOK_SECRET=whsec_zzz
STRIPE_SECRET_KEY=sk_live_xxx
```

## Customer Portal (구독 관리)

```typescript
const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${origin}/settings/billing`,
});
redirect(portalSession.url);
```

## 팀 Seat 관리

```typescript
// 팀원 초대 시 seat_count 자동 증가
// 제거 시 다음 청구 주기에 반영 (Stripe pro-rated)
// 관리자 콘솔에서 seat 조정
```

## 취소 방지 UX

```
설정 > 구독 > 취소
  ↓
"사용 통계 기반" 유지 이유 제시
  ↓
선택지:
  [계속 사용]
  [50% 할인 받기]  ← coupon 생성
  [1~3개월 일시 정지]
  [그래도 취소]
```

## 자주 하는 실수

- ❌ Webhook signature 검증 누락 (`constructEvent` 없이 처리)
- ❌ 구독 상태 race condition (Webhook과 클라이언트 동시 업데이트)
- ❌ Firebase Custom Claims 갱신 누락 (tier 변경 후 Firestore Rules 미반영)
- ❌ `invoice.payment_failed` 핸들러 없음 — past_due 상태 누락
- ❌ 환불·취소 플로우 미구현
- ❌ metadata.userId 없이 구독 생성 (Webhook에서 userId 찾기 불가)

## 관련 문서

- `spec/15_MONETIZATION.md` — 수익 모델 전체
- `apps/web/app/api/billing/` — Checkout + Webhook
- `apps/web/app/(app)/settings/billing/` — UI

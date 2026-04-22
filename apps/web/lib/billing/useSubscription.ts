'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

export type PlanTier = 'free' | 'plus' | 'team' | 'business';

export interface Subscription {
  tier: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: Date | null;
  cancel_at_period_end: boolean;
}

const DEFAULT_SUB: Subscription = {
  tier: 'free',
  stripe_customer_id: null,
  stripe_subscription_id: null,
  current_period_end: null,
  cancel_at_period_end: false,
};

// 티어별 제한
export const PLAN_LIMITS: Record<PlanTier, {
  projects: number;
  tasks_per_project: number;
  ai_classifications_per_day: number;
  file_uploads_per_month: number;
  team_members: number;
  sticker_packs: number;
}> = {
  free:     { projects: 3,  tasks_per_project: 30,  ai_classifications_per_day: 20,  file_uploads_per_month: 5,   team_members: 1,  sticker_packs: 3  },
  plus:     { projects: 20, tasks_per_project: 200, ai_classifications_per_day: 200, file_uploads_per_month: 50,  team_members: 1,  sticker_packs: 12 },
  team:     { projects: 50, tasks_per_project: 500, ai_classifications_per_day: 500, file_uploads_per_month: 200, team_members: 15, sticker_packs: 12 },
  business: { projects: -1, tasks_per_project: -1,  ai_classifications_per_day: -1,  file_uploads_per_month: -1,  team_members: -1, sticker_packs: 12 },
};

export const PLAN_FEATURES: Record<PlanTier, string[]> = {
  free:     ['기본 태스크 관리', 'AI 분류 하루 20회', '3개 프로젝트'],
  plus:     ['20개 프로젝트', 'AI 분류 하루 200회', '파일 업로드 50회/월', '커스텀 스티커'],
  team:     ['50개 프로젝트', '팀 최대 15명', 'AI 분류 하루 500회', '팀 협업 기능 전체'],
  business: ['무제한 프로젝트', '무제한 팀원', 'SAML SSO', '우선 지원', '커스텀 계약', 'API 전체 접근'],
};

export const PLAN_PRICE: Record<PlanTier, string> = {
  free:     '무료',
  plus:     '₩9,900/월',
  team:     '₩29,900/월',
  business: '문의',
};

export const STRIPE_PRICE_IDS: Partial<Record<PlanTier, string>> = {
  plus:     process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID ?? 'price_plus',
  team:     process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID ?? 'price_team',
  // business: 영업팀 문의
};

export function useSubscription(userId: string) {
  const [subscription, setSubscription] = useState<Subscription>(DEFAULT_SUB);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    return onSnapshot(
      doc(db, 'users', userId, 'settings', 'subscription'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setSubscription({
            tier: (data['tier'] as PlanTier) ?? 'free',
            stripe_customer_id: data['stripe_customer_id'] ?? null,
            stripe_subscription_id: data['stripe_subscription_id'] ?? null,
            current_period_end: data['current_period_end']?.toDate?.() ?? null,
            cancel_at_period_end: data['cancel_at_period_end'] ?? false,
          });
        }
        setLoading(false);
      },
    );
  }, [userId]);

  const limits = PLAN_LIMITS[subscription.tier];

  function isLimitReached(feature: keyof typeof limits, currentCount: number): boolean {
    const limit = limits[feature];
    return limit !== -1 && currentCount >= limit;
  }

  return { subscription, loading, limits, isLimitReached };
}

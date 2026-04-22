'use client';

import type { PlanTier } from '../../../lib/billing/useSubscription';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  mint:    '#8FBFA9',
};

interface Props {
  feature: string;
  currentTier: PlanTier;
  requiredTier: PlanTier;
  compact?: boolean;
  onUpgrade?: () => void;
}

const TIER_LABEL: Record<PlanTier, string> = {
  free: 'Free',
  plus: 'Plus',
  team: 'Team',
  business: 'Business',
};

const TIER_PRICE: Record<PlanTier, string> = {
  free: '무료',
  plus: '₩9,900/월',
  team: '₩6,600/인/월',
  business: '문의',
};

export function UpgradePrompt({ feature, currentTier, requiredTier, compact = false, onUpgrade }: Props) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: C.mustard + '12', border: `1px solid ${C.mustard}30` }}>
        <span className="text-sm">👑</span>
        <p className="text-xs flex-1" style={{ color: C.ink500 }}>
          <strong style={{ color: C.mustard }}>{TIER_LABEL[requiredTier]}</strong> 플랜에서 {feature} 사용 가능
        </p>
        <button
          onClick={onUpgrade}
          className="text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0"
          style={{ background: C.mustard, color: '#fff' }}
        >
          업그레이드
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-4 text-center"
      style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
      <div>
        <span className="text-3xl">👑</span>
        <h3 className="text-base font-semibold mt-2" style={{ color: C.ink900 }}>
          {TIER_LABEL[requiredTier]} 플랜이 필요합니다
        </h3>
        <p className="text-sm mt-1" style={{ color: C.ink500 }}>
          {feature}은 {TIER_LABEL[currentTier]} 플랜에서는 사용할 수 없습니다
        </p>
      </div>

      <div className="rounded-xl p-3" style={{ background: C.mustard + '12', border: `1px solid ${C.mustard}30` }}>
        <p className="text-lg font-bold" style={{ color: C.mustard }}>{TIER_PRICE[requiredTier]}</p>
        <p className="text-xs mt-0.5" style={{ color: C.ink500 }}>
          {TIER_LABEL[requiredTier]} 플랜으로 시작하기
        </p>
      </div>

      <button
        onClick={onUpgrade}
        className="w-full py-2.5 rounded-2xl text-sm font-semibold"
        style={{ background: C.mustard, color: '#fff' }}
      >
        {TIER_LABEL[requiredTier]}로 업그레이드 →
      </button>
      <p className="text-xs" style={{ color: C.ink300 }}>언제든 취소 가능 · 30일 환불 보장</p>
    </div>
  );
}

// 인라인 제한 배너
export function LimitBanner({ feature, used, limit, onUpgrade }: {
  feature: string;
  used: number;
  limit: number;
  onUpgrade?: () => void;
}) {
  const pct = Math.min(Math.round((used / limit) * 100), 100);
  const isWarning = pct >= 80;
  const isExhausted = pct >= 100;

  return (
    <div className="rounded-xl px-3 py-2 flex items-center gap-3"
      style={{
        background: isExhausted ? C.mustard + '15' : C.cream,
        border: `1px solid ${isExhausted ? C.mustard + '40' : C.beige}`,
      }}>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs" style={{ color: C.ink500 }}>{feature}</p>
          <p className="text-xs font-medium" style={{ color: isWarning ? C.mustard : C.ink300 }}>
            {used}/{limit}
          </p>
        </div>
        <div className="h-1 rounded-full overflow-hidden" style={{ background: C.beige }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: isWarning ? C.mustard : C.mint }} />
        </div>
      </div>
      {isExhausted && onUpgrade && (
        <button onClick={onUpgrade} className="text-xs px-2 py-1 rounded-lg font-medium flex-shrink-0"
          style={{ background: C.mustard, color: '#fff' }}>
          업그레이드
        </button>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { CustomStickerUploader } from './CustomStickerUploader';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
};

// 팩별 tier 정의 (F-134)
export type PackTier = 'free' | 'plus';
export const PACK_TIER: Record<string, PackTier> = {
  goals: 'free', tasks: 'free', time: 'free',
  work: 'plus', people: 'plus', nature: 'plus', mood: 'plus', special: 'plus',
  spring: 'plus', summer: 'plus', autumn: 'plus', winter: 'plus',
  // 프리미엄 팩
  food: 'plus', travel: 'plus', sport: 'plus', art: 'plus',
};

// 기본 스티커팩 (F-085)
export const STICKER_PACKS: { id: string; label: string; stickers: string[]; tier?: PackTier }[] = [
  {
    id: 'goals',
    label: '🎯 목표',
    stickers: ['🎯', '🏆', '🥇', '🏅', '🌟', '⭐', '💫', '✨', '🔥', '💪'],
  },
  {
    id: 'tasks',
    label: '✅ 할 일',
    stickers: ['✅', '📌', '📍', '🔖', '📎', '🗂️', '📁', '🗃️', '📋', '📝'],
  },
  {
    id: 'time',
    label: '⏰ 시간',
    stickers: ['⏰', '⏱️', '🕐', '📅', '🗓️', '⌛', '⏳', '🔔', '⚡', '🚀'],
  },
  {
    id: 'work',
    label: '💼 업무',
    stickers: ['💼', '💻', '🖥️', '⌨️', '🖱️', '📊', '📈', '📉', '💡', '🔍'],
  },
  {
    id: 'people',
    label: '👥 사람',
    stickers: ['👥', '🤝', '💬', '📣', '📢', '🙋', '👋', '🫂', '❤️', '🫶'],
  },
  {
    id: 'nature',
    label: '🌿 자연',
    stickers: ['🌿', '🌱', '🌲', '🍀', '🌸', '🌺', '🌻', '🍂', '🌊', '☀️'],
  },
  {
    id: 'mood',
    label: '😊 감정',
    stickers: ['😊', '🥳', '🎉', '💪', '🤔', '😴', '😤', '🥰', '😎', '🙃'],
  },
  {
    id: 'special',
    label: '💎 특별',
    stickers: ['💎', '👑', '🎸', '🎨', '📸', '🎬', '🎮', '🎲', '🧩', '🔮'],
  },
  // F-086: 계절 스티커팩
  {
    id: 'spring',
    label: '🌸 봄',
    stickers: ['🌸', '🌺', '🌼', '🌻', '🌷', '🐣', '🦋', '🌈', '☔', '🌱'],
  },
  {
    id: 'summer',
    label: '☀️ 여름',
    stickers: ['☀️', '🏖️', '🌊', '🍉', '🍦', '⛱️', '🌴', '🦀', '🐚', '🎆'],
  },
  {
    id: 'autumn',
    label: '🍂 가을',
    stickers: ['🍂', '🍁', '🎃', '🌾', '🍄', '🦔', '🌰', '🍎', '🍇', '🌙'],
  },
  {
    id: 'winter',
    label: '❄️ 겨울',
    stickers: ['❄️', '⛄', '🎄', '🎁', '🎅', '🦌', '☃️', '🧣', '🏔️', '🕯️'],
  },
  // F-134: 프리미엄 팩 (Plus 이상)
  {
    id: 'food',
    label: '🍕 음식 ✨',
    stickers: ['🍕', '🍜', '🍣', '🍔', '🥗', '🍰', '☕', '🧋', '🍱', '🥐'],
  },
  {
    id: 'travel',
    label: '✈️ 여행 ✨',
    stickers: ['✈️', '🗺️', '🏝️', '🗼', '🏰', '⛰️', '🚂', '🛳️', '🎡', '🌍'],
  },
  {
    id: 'sport',
    label: '⚽ 스포츠 ✨',
    stickers: ['⚽', '🏀', '🎾', '🏊', '🚴', '🏋️', '🧘', '⛷️', '🏄', '🥊'],
  },
  {
    id: 'art',
    label: '🎨 예술 ✨',
    stickers: ['🎨', '🎭', '🎪', '🎬', '🎵', '🎸', '📸', '✍️', '🖌️', '🎻'],
  },
];

export const ALL_STICKERS = STICKER_PACKS.flatMap((p) => p.stickers);

interface Props {
  value?: string | null;
  onChange: (sticker: string | null) => void;
  onClose?: () => void;
  placeholder?: string;
  userTier?: PackTier;
  teamId?: string;
  userId?: string;
}

export function StickerPicker({ value, onChange, onClose, placeholder = '스티커', userTier = 'free', teamId, userId }: Props) {
  const [activePack, setActivePack] = useState(STICKER_PACKS[0]!.id);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState<'builtin' | 'custom'>('builtin');

  const currentPack = STICKER_PACKS.find((p) => p.id === activePack) ?? STICKER_PACKS[0]!;
  const isPackLocked = (packId: string) =>
    userTier === 'free' && (PACK_TIER[packId] ?? 'free') === 'plus';
  const displayStickers = search
    ? ALL_STICKERS.filter((s) => s.includes(search))
    : currentPack.stickers;
  const currentPackLocked = isPackLocked(currentPack.id);

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: C.ivory, border: `1px solid ${C.beige}`, width: 280 }}>
      {/* 헤더 */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: `1px solid ${C.beige}` }}>
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold" style={{ color: C.ink500 }}>{placeholder}</p>
          {teamId && userId && (
            <div className="flex gap-1">
              {(['builtin', 'custom'] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)}
                  className="text-[10px] px-1.5 py-0.5 rounded-lg transition-colors"
                  style={{ background: mode === m ? C.mustard : C.cream, color: mode === m ? '#fff' : C.ink300 }}>
                  {m === 'builtin' ? '기본' : '커스텀'}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {value && (
            <button onClick={() => onChange(null)} className="text-xs px-2 py-0.5 rounded-lg"
              style={{ background: C.beige, color: C.ink500 }}>지우기</button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-sm" style={{ color: C.ink300 }}>×</button>
          )}
        </div>
      </div>

      {/* 커스텀 스티커 모드 */}
      {mode === 'custom' && teamId && userId && (
        <div className="p-3">
          <CustomStickerUploader
            teamId={teamId}
            userId={userId}
            onSelect={(url) => { onChange(url); onClose?.(); }}
          />
        </div>
      )}

      {/* 기본 스티커 모드 */}
      {mode === 'builtin' && (
        <>
          {/* 검색 */}
          <div className="px-3 py-2" style={{ borderBottom: `1px solid ${C.beige}` }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="이모지 검색..."
              className="w-full text-xs outline-none bg-transparent"
              style={{ color: C.ink900 }}
            />
          </div>

          {/* 팩 탭 */}
          {!search && (
            <div className="flex overflow-x-auto gap-1 px-2 py-1.5" style={{ borderBottom: `1px solid ${C.beige}` }}>
              {STICKER_PACKS.map((pack) => {
                const locked = isPackLocked(pack.id);
                return (
                  <button
                    key={pack.id}
                    onClick={() => setActivePack(pack.id)}
                    className="text-xs px-2 py-1 rounded-xl whitespace-nowrap flex-shrink-0 transition-colors"
                    style={{
                      background: activePack === pack.id ? C.mustard : C.cream,
                      color: activePack === pack.id ? '#fff' : locked ? C.ink300 : C.ink500,
                      opacity: locked ? 0.7 : 1,
                    }}
                  >
                    {pack.label}{locked ? ' 🔒' : ''}
                  </button>
                );
              })}
            </div>
          )}

          {/* 스티커 그리드 */}
          <div className="relative">
            <div className="grid grid-cols-5 gap-1 p-3" style={{ maxHeight: 180, overflowY: 'auto' }}>
              {displayStickers.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { if (!currentPackLocked) { onChange(s); onClose?.(); } }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all hover:scale-110"
                  style={{
                    background: value === s ? C.mustard + '25' : C.cream,
                    border: `1.5px solid ${value === s ? C.mustard : 'transparent'}`,
                    opacity: currentPackLocked ? 0.4 : 1,
                  }}
                  title={s}
                >
                  {s}
                </button>
              ))}
              {displayStickers.length === 0 && (
                <p className="col-span-5 text-xs text-center py-4" style={{ color: C.ink300 }}>
                  결과가 없습니다
                </p>
              )}
            </div>
            {/* 잠금 오버레이 */}
            {currentPackLocked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-b-2xl"
                style={{ background: 'rgba(253,251,247,0.85)' }}>
                <span className="text-2xl">👑</span>
                <p className="text-xs font-semibold" style={{ color: C.mustard }}>Plus 플랜에서 사용 가능</p>
                <p className="text-[10px]" style={{ color: C.ink300 }}>설정 &gt; 플랜에서 업그레이드</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// 인라인 스티커 트리거 버튼
export function StickerButton({
  value,
  onChange,
  size = 'md',
}: {
  value?: string | null;
  onChange: (s: string | null) => void;
  size?: 'sm' | 'md';
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-xl transition-all hover:opacity-80"
        style={{
          width: size === 'sm' ? 28 : 36,
          height: size === 'sm' ? 28 : 36,
          fontSize: size === 'sm' ? 14 : 20,
          background: C.cream,
          border: `1px solid ${C.beige}`,
        }}
        title="스티커 선택"
      >
        {value ?? '🏷️'}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50">
            <StickerPicker
              value={value}
              onChange={(s) => { onChange(s); setOpen(false); }}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  );
}

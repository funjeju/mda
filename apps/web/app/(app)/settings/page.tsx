'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '../../../lib/firebase';
import { useAuth } from '../../../lib/auth/AuthContext';
import { usePushNotifications } from '../../../lib/notifications/usePushNotifications';
import { useNotificationPrefs } from '../../../lib/notifications/useNotificationPrefs';
import { useSubscription, PLAN_LIMITS } from '../../../lib/billing/useSubscription';
import { useTheme, COLOR_THEMES } from '../../../lib/theme/ThemeProvider';
import { useTeamMembers, useTeamInvites } from '../../../lib/hooks/useTeam';
import { AppShell } from '../../../components/layout/AppShell';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { membersCol } from '../../../lib/firestore/collections';
import { requestGoogleToken } from '../../../lib/auth/requestGoogleToken';
import { fetchWithAuth } from '../../../lib/auth/fetchWithAuth';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  red:     '#EB8B7C',
};

export default function SettingsPage() {
  const { user, teamId, loading, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user || !teamId) return null;

  return (
    <AppShell>
      <SettingsContent user={user} teamId={teamId} />
    </AppShell>
  );
}

interface TeamItem {
  id: string;
  name: string;
  type: string;
  icon: string | null;
}

function useMyTeams(userId: string) {
  const [teams, setTeams] = useState<TeamItem[]>([]);
  useEffect(() => {
    // 사용자가 멤버로 속한 팀 ID 목록 → 팀 문서 조회
    // 간단한 접근: members 컬렉션에서 userId로 검색 (Firestore collectionGroup)
    // 현재 구조상 팀마다 members/{userId} 형태이므로 collectionGroup 사용
    import('firebase/firestore').then(({ doc, getDoc }) => {
      getDoc(doc(db, 'users', userId)).then((snap) => {
        if (!snap.exists) return;
        const data = snap.data();
        const teamIds: string[] = [];
        if (data['primary_team_id']) teamIds.push(data['primary_team_id'] as string);
        if (data['current_team_id'] && data['current_team_id'] !== data['primary_team_id']) {
          teamIds.push(data['current_team_id'] as string);
        }
        Promise.all(
          teamIds.map((tid) =>
            getDoc(doc(db, 'teams', tid)).then((ts) => ({
              id: tid,
              name: (ts.data()?.['name'] as string) ?? tid,
              type: (ts.data()?.['type'] as string) ?? 'personal',
              icon: (ts.data()?.['icon'] as string | null) ?? null,
            })),
          ),
        ).then(setTeams);
      });
    });
  }, [userId]);
  return teams;
}

function SettingsContent({
  user, teamId,
}: {
  user: { displayName: string | null; email: string | null; uid: string; photoURL: string | null };
  teamId: string;
}) {
  const { status, enable } = usePushNotifications(user.uid);
  const { prefs, save: savePrefs } = useNotificationPrefs(user.uid);
  const { subscription } = useSubscription(user.uid);
  const { signOut, switchTeam } = useAuth();
  const { darkMode, toggle, colorTheme, setColorTheme } = useTheme();
  const { members } = useTeamMembers(teamId);
  const { invites, deleteInvite } = useTeamInvites(teamId);
  const myTeams = useMyTeams(user.uid);
  const [inviting, setInviting] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');
  const [switching, setSwitching] = useState(false);
  const [emailInvite, setEmailInvite] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<'sent' | 'copied' | null>(null);
  const initials = (user.displayName ?? user.email ?? '?').slice(0, 2).toUpperCase();

  async function handleCreateInvite() {
    setInviting(true);
    try {
      const res = await fetchWithAuth('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, role: 'member' }),
      });
      const data = await res.json() as { code?: string };
      if (data.code) {
        const link = `${window.location.origin}/invite/${data.code}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        setCopiedCode(data.code);
        setTimeout(() => setCopiedCode(''), 3000);
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleEmailInvite() {
    if (!emailInvite.trim()) return;
    setEmailSending(true);
    setEmailResult(null);
    try {
      // 초대 코드 생성
      const createRes = await fetchWithAuth('/api/invite/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, role: 'member' }),
      });
      const createData = await createRes.json() as { code?: string };
      if (!createData.code) return;

      const link = `${window.location.origin}/invite/${createData.code}`;
      const teamName = myTeams.find((t) => t.id === teamId)?.name ?? '팀';
      const senderName = user.displayName ?? user.email ?? '팀원';

      const res = await fetchWithAuth('/api/invite/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteLink: link, recipientEmail: emailInvite.trim(), senderName, teamName }),
      });
      const data = await res.json() as { sent: boolean; link?: string };
      if (data.sent) {
        setEmailResult('sent');
      } else {
        // RESEND 미설정 — 링크를 클립보드에 복사
        if (data.link) await navigator.clipboard.writeText(data.link).catch(() => {});
        setEmailResult('copied');
      }
      setEmailInvite('');
      setTimeout(() => setEmailResult(null), 4000);
    } finally {
      setEmailSending(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <h2 className="text-xl font-semibold" style={{ color: C.ink900 }}>설정 ⚙️</h2>

      {/* 프로필 */}
      <Section title="프로필">
        <div className="flex items-center gap-4 py-2">
          <Avatar className="w-12 h-12">
            <AvatarImage src={user.photoURL ?? undefined} />
            <AvatarFallback style={{ background: C.beige, color: C.ink500 }}>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm" style={{ color: C.ink900 }}>
              {user.displayName ?? '이름 없음'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: C.ink500 }}>{user.email}</p>
          </div>
        </div>
      </Section>

      {/* 화면 */}
      <Section title="화면">
        <SettingRow label="다크 모드" description="어두운 테마로 전환합니다">
          <button
            onClick={toggle}
            className="w-12 h-6 rounded-full relative transition-colors"
            style={{ background: darkMode === 'dark' ? C.mustard : C.beige }}
            aria-label="다크 모드 토글"
          >
            <span
              className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
              style={{
                background: '#fff',
                left: darkMode === 'dark' ? '26px' : '2px',
              }}
            />
          </button>
        </SettingRow>
        {/* 색상 테마 */}
        <div className="px-4 py-3 flex flex-col gap-3">
          <div>
            <p className="text-sm" style={{ color: '#2D2A26' }}>색상 테마</p>
            <p className="text-xs mt-0.5" style={{ color: '#ADA598' }}>앱 전체 색상 팔레트를 변경합니다</p>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {COLOR_THEMES.map((t) => {
              const isActive = colorTheme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setColorTheme(t.id)}
                  className="flex flex-col items-center gap-1.5 rounded-xl py-2 px-1 transition-all"
                  style={{
                    border: `2px solid ${isActive ? C.mustard : C.beige}`,
                    background: isActive ? C.mustard + '10' : C.ivory,
                  }}
                >
                  {/* 색상 미리보기 */}
                  <div className="flex rounded-lg overflow-hidden w-10 h-6 border"
                    style={{ borderColor: C.beige }}>
                    {t.preview.map((color, i) => (
                      <div key={i} className="flex-1" style={{ background: color }} />
                    ))}
                  </div>
                  <span className="text-xs leading-tight text-center" style={{ color: isActive ? C.mustard : C.ink500 }}>
                    {t.emoji} {t.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      {/* 알림 */}
      <Section title="알림">
        <SettingRow label="푸시 알림" description="태스크 마감, 리마인더 알림을 받습니다">
          {status === 'granted' ? (
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: '#8FBFA920', color: '#8FBFA9' }}>
              활성화됨
            </span>
          ) : status === 'denied' ? (
            <span className="text-xs" style={{ color: C.red }}>거부됨</span>
          ) : (
            <button onClick={enable} disabled={status === 'requesting'}
              className="text-xs px-3 py-1.5 rounded-xl font-medium"
              style={{ background: C.mustard, color: '#fff' }}>
              {status === 'requesting' ? '요청 중...' : '활성화'}
            </button>
          )}
        </SettingRow>

        {/* 묶음 알림 (F-092) */}
        <div className="px-4 py-3 flex flex-col gap-2">
          <div>
            <p className="text-sm" style={{ color: C.ink900 }}>알림 묶음 방식</p>
            <p className="text-xs mt-0.5" style={{ color: C.ink300 }}>덜 중요한 알림을 모아서 보냅니다</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              ['immediate', '즉시'],
              ['hourly', '1시간 묶음'],
              ['thrice', '하루 3번'],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => void savePrefs({ batch_mode: val })}
                className="text-xs px-3 py-1.5 rounded-xl font-medium transition-colors"
                style={{
                  background: prefs.batch_mode === val ? C.mustard : C.cream,
                  color: prefs.batch_mode === val ? '#fff' : C.ink500,
                  border: `1px solid ${prefs.batch_mode === val ? C.mustard : C.beige}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* DND (F-093) */}
        <SettingRow label="방해 금지 (DND)" description="지정 시간대엔 알림을 차단합니다">
          <button
            onClick={() => void savePrefs({ dnd_enabled: !prefs.dnd_enabled })}
            className="w-12 h-6 rounded-full relative transition-colors flex-shrink-0"
            style={{ background: prefs.dnd_enabled ? C.mustard : C.beige }}
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full transition-all"
              style={{ background: '#fff', left: prefs.dnd_enabled ? '26px' : '2px' }} />
          </button>
        </SettingRow>
        {prefs.dnd_enabled && (
          <div className="px-4 py-3 flex items-center gap-3">
            <p className="text-xs flex-shrink-0" style={{ color: C.ink500 }}>🌙</p>
            <select
              value={prefs.dnd_start}
              onChange={(e) => void savePrefs({ dnd_start: Number(e.target.value) })}
              className="text-xs rounded-lg px-2 py-1.5 outline-none"
              style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
            <span className="text-xs" style={{ color: C.ink300 }}>~</span>
            <select
              value={prefs.dnd_end}
              onChange={(e) => void savePrefs({ dnd_end: Number(e.target.value) })}
              className="text-xs rounded-lg px-2 py-1.5 outline-none"
              style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }}
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
              ))}
            </select>
            <p className="text-xs flex-shrink-0" style={{ color: C.ink500 }}>☀️</p>
          </div>
        )}

        {/* 알림 유형 */}
        <div className="px-4 py-3 flex flex-col gap-2">
          <p className="text-xs font-medium" style={{ color: C.ink300 }}>알림 유형</p>
          {([
            ['task_due', '태스크 마감 알림'],
            ['evening_report', '저녁 보고서'],
            ['team_activity', '팀 활동'],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <p className="text-xs" style={{ color: C.ink500 }}>{label}</p>
              <button
                onClick={() => void savePrefs({ [key]: !prefs[key] })}
                className="w-9 h-5 rounded-full relative transition-colors flex-shrink-0"
                style={{ background: prefs[key] ? C.mustard : C.beige }}
              >
                <span className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
                  style={{ background: '#fff', left: prefs[key] ? '20px' : '2px' }} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* 팀 멤버 */}
      <Section title="팀 멤버">
        {members.map((m) => {
          const memberInitials = ((m.display_name ?? m.email ?? '?')).slice(0, 2).toUpperCase();
          const roleLabel = m.role === 'owner' ? '오너' : m.role === 'admin' ? '관리자' : '멤버';
          return (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ background: C.beige, color: C.ink500 }}>
                {memberInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: C.ink900 }}>
                  {m.display_name ?? m.email ?? m.user_id}
                </p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: m.role === 'owner' ? C.mustard + '20' : C.beige, color: m.role === 'owner' ? C.mustard : C.ink500 }}>
                {roleLabel}
              </span>
            </div>
          );
        })}
        <div className="px-4 py-3 flex flex-col gap-2">
          {/* 이메일 초대 (F-100) */}
          <div className="flex gap-2">
            <input
              type="email"
              value={emailInvite}
              onChange={(e) => setEmailInvite(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleEmailInvite(); }}
              placeholder="초대할 이메일 주소"
              className="flex-1 text-sm outline-none rounded-xl px-3 py-2"
              style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }}
            />
            <button
              onClick={() => void handleEmailInvite()}
              disabled={!emailInvite.trim() || emailSending}
              className="text-sm px-3 py-2 rounded-xl font-medium flex-shrink-0"
              style={{ background: C.mustard, color: '#fff', opacity: (!emailInvite.trim() || emailSending) ? 0.5 : 1 }}
            >
              {emailSending ? '...' : '📧 초대'}
            </button>
          </div>
          {emailResult === 'sent' && (
            <p className="text-xs text-center" style={{ color: '#8FBFA9' }}>✓ 초대 이메일을 발송했습니다</p>
          )}
          {emailResult === 'copied' && (
            <p className="text-xs text-center" style={{ color: C.mustard }}>📋 초대 링크를 클립보드에 복사했습니다</p>
          )}
          <button
            onClick={handleCreateInvite}
            disabled={inviting}
            className="text-sm px-4 py-2 rounded-xl font-medium w-full"
            style={{ background: C.beige, color: C.ink500, opacity: inviting ? 0.7 : 1 }}
          >
            {inviting ? '생성 중...' : '🔗 링크만 생성 & 복사'}
          </button>
          {copiedCode && (
            <p className="text-xs text-center" style={{ color: '#8FBFA9' }}>
              ✓ 클립보드에 복사됨 — 7일간 유효
            </p>
          )}
          {invites.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              {invites.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between text-xs"
                  style={{ color: C.ink500 }}>
                  <span className="font-mono">{inv.code}</span>
                  <span>사용 {inv.used_count}/{inv.max_uses}</span>
                  <button onClick={() => deleteInvite(inv.id)} style={{ color: C.red }}>삭제</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* 팀 전환 */}
      {myTeams.length > 1 && (
        <Section title="팀 전환">
          {myTeams.map((team) => {
            const isActive = team.id === teamId;
            return (
              <div key={team.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                    style={{ background: isActive ? C.mustard + '20' : C.beige }}>
                    {team.icon ?? (team.type === 'personal' ? '👤' : '👥')}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: C.ink900 }}>{team.name}</p>
                    <p className="text-xs" style={{ color: C.ink300 }}>
                      {team.type === 'personal' ? '개인 팀' : '공유 팀'}
                    </p>
                  </div>
                </div>
                {isActive ? (
                  <span className="text-xs px-2 py-1 rounded-full"
                    style={{ background: C.mustard + '20', color: C.mustard }}>현재 팀</span>
                ) : (
                  <button
                    onClick={async () => {
                      setSwitching(true);
                      await switchTeam(team.id);
                      setSwitching(false);
                      window.location.href = '/home';
                    }}
                    disabled={switching}
                    className="text-xs px-3 py-1.5 rounded-xl font-medium"
                    style={{ border: `1px solid ${C.mustard}`, color: C.mustard }}
                  >
                    {switching ? '...' : '전환'}
                  </button>
                )}
              </div>
            );
          })}
        </Section>
      )}

      {/* 플랜 & 구독 (F-130) */}
      <Section title="플랜">
        <div className="px-4 py-4 flex flex-col gap-3">
          {/* 현재 플랜 */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: C.ink900 }}>
                {subscription.tier === 'free' ? 'Free 플랜' :
                 subscription.tier === 'plus' ? 'Plus 플랜 ✨' :
                 subscription.tier === 'team' ? 'Team 플랜 👥' : 'Business 플랜 🏢'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: C.ink300 }}>
                {subscription.tier === 'free' ? '무료 · 기본 기능 포함' :
                 subscription.current_period_end
                   ? `${subscription.current_period_end.toLocaleDateString('ko-KR')} 갱신`
                   : '활성 구독'}
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full font-medium"
              style={{
                background: subscription.tier === 'free' ? C.beige : C.mustard + '20',
                color: subscription.tier === 'free' ? C.ink500 : C.mustard,
              }}>
              {subscription.tier.toUpperCase()}
            </span>
          </div>

          {/* Free 티어 제한 현황 */}
          {subscription.tier === 'free' && (
            <div className="flex flex-col gap-1.5">
              {([
                ['프로젝트', PLAN_LIMITS.free.projects],
                ['일일 AI 분류', PLAN_LIMITS.free.ai_classifications_per_day],
                ['월 파일 업로드', PLAN_LIMITS.free.file_uploads_per_month],
              ] as const).map(([label, limit]) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: C.ink500 }}>{label}</p>
                  <p className="text-xs" style={{ color: C.ink300 }}>최대 {limit}개</p>
                </div>
              ))}
            </div>
          )}

          {/* 업그레이드 CTA */}
          {(subscription.tier === 'free' || subscription.tier === 'plus') && (
            <div className="flex flex-col gap-2">
              {subscription.tier === 'free' && (
                <div className="rounded-xl p-3 flex flex-col gap-2"
                  style={{ background: C.mustard + '10', border: `1px solid ${C.mustard}30` }}>
                  <p className="text-xs font-semibold" style={{ color: C.mustard }}>Plus 플랜 — ₩9,900/월</p>
                  <ul className="text-xs flex flex-col gap-1" style={{ color: C.ink500 }}>
                    <li>✓ 프로젝트 20개, 일일 AI 200회</li>
                    <li>✓ 파일 업로드 50개/월</li>
                    <li>✓ 스티커팩 전체 해금</li>
                  </ul>
                  <button
                    className="text-xs py-1.5 rounded-xl font-semibold"
                    style={{ background: C.mustard, color: '#fff' }}
                    onClick={async () => {
                      const priceId = process.env.NEXT_PUBLIC_STRIPE_PLUS_PRICE_ID;
                      if (!priceId) { alert('결제 시스템 준비 중입니다'); return; }
                      const res = await fetchWithAuth('/api/billing/checkout', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ priceId, tier: 'plus' }),
                      });
                      const data = await res.json() as { url?: string; error?: string };
                      if (data.url) window.location.href = data.url;
                    }}
                  >
                    Plus 업그레이드 →
                  </button>
                </div>
              )}
              <div className="rounded-xl p-3 flex flex-col gap-2"
                style={{ background: '#F0F7F2', border: '1px solid #C5DFD0' }}>
                <p className="text-xs font-semibold" style={{ color: '#3D7A55' }}>Team 플랜 — ₩29,900/월</p>
                <ul className="text-xs flex flex-col gap-1" style={{ color: C.ink500 }}>
                  <li>✓ 팀원 최대 15명</li>
                  <li>✓ 프로젝트 50개, AI 500회/일</li>
                  <li>✓ 협업 기능 전체 + 스탠드업</li>
                </ul>
                <button
                  className="text-xs py-1.5 rounded-xl font-semibold"
                  style={{ background: '#3D7A55', color: '#fff' }}
                  onClick={async () => {
                    const priceId = process.env.NEXT_PUBLIC_STRIPE_TEAM_PRICE_ID;
                    if (!priceId) { alert('결제 시스템 준비 중입니다'); return; }
                    const res = await fetchWithAuth('/api/billing/checkout', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ priceId, tier: 'team' }),
                    });
                    const data = await res.json() as { url?: string; error?: string };
                    if (data.url) window.location.href = data.url;
                  }}
                >
                  Team 업그레이드 →
                </button>
              </div>
              <div className="rounded-xl p-3 flex flex-col gap-2"
                style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
                <p className="text-xs font-semibold" style={{ color: C.ink900 }}>Business 플랜 — 문의</p>
                <ul className="text-xs flex flex-col gap-1" style={{ color: C.ink500 }}>
                  <li>✓ 무제한 프로젝트 · 팀원</li>
                  <li>✓ SAML SSO 지원 (F-107)</li>
                  <li>✓ 우선 지원 · 커스텀 계약</li>
                </ul>
                <a
                  href="mailto:naggu1999@gmail.com?subject=MDA Business 플랜 문의"
                  className="text-xs py-1.5 rounded-xl font-semibold text-center"
                  style={{ background: C.ink900, color: C.ivory }}
                >
                  영업팀 문의 →
                </a>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* 외부 연동 (F-110, F-112, F-113) */}
      <Section title="외부 연동">
        <GoogleCalendarSync userId={user.uid} teamId={teamId} />
        <GmailImport userId={user.uid} teamId={teamId} />
        <NotionImport userId={user.uid} teamId={teamId} />
        <GitHubImport userId={user.uid} teamId={teamId} />
        <GoogleFitSync userId={user.uid} />
        <SlackConnect userId={user.uid} />
      </Section>

      {/* AI 설정 안내 */}
      <Section title="AI 연동">
        <SettingRow label="Gemini API 키" description="서버 환경변수 GEMINI_API_KEY에 설정하세요">
          <span className="text-xs" style={{ color: C.ink300 }}>.env.local</span>
        </SettingRow>
        <SettingRow label="OpenAI Whisper" description="음성 인식용 API 키. OPENAI_API_KEY에 설정하세요">
          <span className="text-xs" style={{ color: C.ink300 }}>.env.local</span>
        </SettingRow>
      </Section>

      {/* API 키 (F-117) */}
      <Section title="API 키">
        <ApiKeyManager />
      </Section>

      {/* 데이터 내보내기 */}
      <Section title="데이터 내보내기">
        <DataExporter userId={user.uid} teamId={teamId} />
      </Section>

      {/* 계정 */}
      <Section title="계정">
        <button
          onClick={signOut}
          className="w-full text-left py-2 text-sm font-medium"
          style={{ color: C.red }}
        >
          로그아웃
        </button>
      </Section>
    </div>
  );
}

// F-110: Google Calendar 동기화
function GoogleCalendarSync({ userId, teamId }: { userId: string; teamId: string }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const token = await requestGoogleToken('https://www.googleapis.com/auth/calendar.readonly');

      const res = await fetchWithAuth('/api/integrations/google-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, accessToken: token }),
      });
      const data = await res.json() as { imported?: number; total?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? '동기화 실패');
      setResult({ imported: data.imported ?? 0, total: data.total ?? 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: C.ink900 }}>📅 Google Calendar</p>
        <p className="text-xs mt-0.5" style={{ color: C.ink300 }}>
          {result ? `${result.imported}개 임포트 (총 ${result.total}개)` :
           error ? error :
           '30일 이내 일정을 태스크로 가져옵니다'}
        </p>
      </div>
      <button
        onClick={() => void handleSync()}
        disabled={syncing}
        className="text-xs px-3 py-1.5 rounded-xl font-medium flex-shrink-0"
        style={{ background: syncing ? C.beige : C.mustard, color: syncing ? C.ink300 : '#fff' }}
      >
        {syncing ? '동기화 중...' : '가져오기'}
      </button>
    </div>
  );
}

// F-112: Gmail 메타데이터 임포트
function GmailImport({ userId, teamId }: { userId: string; teamId: string }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const token = await requestGoogleToken('https://www.googleapis.com/auth/gmail.readonly');

      const res = await fetchWithAuth('/api/integrations/gmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: token, teamId }),
      });
      const data = await res.json() as { imported?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? '임포트 실패');
      setResult({ imported: data.imported ?? 0 });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: C.ink900 }}>📧 Gmail</p>
        <p className="text-xs mt-0.5" style={{ color: C.ink300 }}>
          {result ? `${result.imported}개 읽지 않은 메일을 태스크로 변환` :
           error ? error :
           '읽지 않은 중요 이메일을 태스크로 가져옵니다'}
        </p>
      </div>
      <button
        onClick={() => void handleImport()}
        disabled={importing}
        className="text-xs px-3 py-1.5 rounded-xl font-medium flex-shrink-0"
        style={{ background: importing ? C.beige : C.mustard, color: importing ? C.ink300 : '#fff' }}
      >
        {importing ? '가져오는 중...' : '가져오기'}
      </button>
    </div>
  );
}

// F-111: Notion 임포트
function NotionImport({ userId, teamId }: { userId: string; teamId: string }) {
  const [token, setToken] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleImport() {
    if (!token.trim()) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetchWithAuth('/api/integrations/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, notionToken: token.trim() }),
      });
      const data = await res.json() as { imported?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? '임포트 실패');
      setResult({ imported: data.imported ?? 0 });
      setOpen(false);
      setToken('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: C.ink900 }}>📝 Notion 임포트</p>
          <p className="text-xs mt-0.5" style={{ color: C.ink300 }}>
            {result ? `${result.imported}개 페이지 임포트 완료` : 'Notion 페이지를 태스크/노트로 가져옵니다'}
          </p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-xl font-medium flex-shrink-0"
          style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink500 }}
        >
          {open ? '닫기' : '설정'}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-xs" style={{ color: C.ink300 }}>
            Notion Integration Token (ntn_으로 시작)
          </p>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ntn_xxxxxxx..."
            className="text-xs rounded-xl px-3 py-2 outline-none"
            style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }}
          />
          {error && <p className="text-xs" style={{ color: C.red }}>{error}</p>}
          <button
            onClick={() => void handleImport()}
            disabled={!token.trim() || importing}
            className="text-xs py-2 rounded-xl font-medium"
            style={{ background: C.mustard, color: '#fff', opacity: (!token.trim() || importing) ? 0.6 : 1 }}
          >
            {importing ? '임포트 중...' : 'Notion 임포트 시작'}
          </button>
        </div>
      )}
    </div>
  );
}

// 데이터 내보내기
function DataExporter({ userId, teamId }: { userId: string; teamId: string }) {
  const [exporting, setExporting] = useState(false);

  async function handleExport(type: string, format: 'json' | 'csv') {
    setExporting(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const idToken = await getAuth().currentUser?.getIdToken();
      if (!idToken) { alert('로그인이 필요합니다'); return; }

      const url = `/api/export?teamId=${teamId}&type=${type}&format=${format}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
      if (!res.ok) { alert('내보내기 실패'); return; }

      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `mda-${type}-export.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      setExporting(false);
    }
  }

  const items = [
    { type: 'all',      label: '전체 데이터',     icon: '📦', formats: ['json'] as const },
    { type: 'tasks',    label: '태스크',           icon: '✅', formats: ['json', 'csv'] as const },
    { type: 'journal',  label: '일기',             icon: '📓', formats: ['json', 'csv'] as const },
    { type: 'projects', label: '프로젝트',          icon: '🗂️', formats: ['json', 'csv'] as const },
  ];

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.type} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>{item.icon}</span>
            <p className="text-sm" style={{ color: C.ink900 }}>{item.label}</p>
          </div>
          <div className="flex gap-1.5">
            {item.formats.map((fmt) => (
              <button
                key={fmt}
                onClick={() => void handleExport(item.type, fmt)}
                disabled={exporting}
                className="text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{ background: C.beige, color: C.ink500 }}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      ))}
      {exporting && (
        <p className="text-xs text-center" style={{ color: C.ink300 }}>내보내는 중...</p>
      )}
    </div>
  );
}

// F-117: API 키 관리
function ApiKeyManager() {
  const [keys, setKeys] = useState<{ id: string; name: string; key_preview: string; created_at?: string; last_used_at?: string | null }[]>([]);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [keyName, setKeyName] = useState('');
  const [loading, setLoading] = useState(false);

  async function loadKeys() {
    const res = await fetchWithAuth('/api/v1/keys');
    if (res.ok) {
      const data = await res.json() as { keys: typeof keys };
      setKeys(data.keys);
    }
  }

  useEffect(() => { void loadKeys(); }, []);

  async function handleCreate() {
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: keyName.trim() || undefined }),
      });
      const data = await res.json() as { key?: string };
      if (data.key) { setNewKey(data.key); setKeyName(''); await loadKeys(); }
    } finally { setLoading(false); }
  }

  async function handleDelete(keyId: string) {
    await fetchWithAuth('/api/v1/keys', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyId }),
    });
    await loadKeys();
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-3">
      <p className="text-xs" style={{ color: C.ink300 }}>
        외부 앱에서 MDA API를 호출할 수 있는 키입니다. 키는 생성 시 1회만 표시됩니다.
      </p>

      {/* 새 키 표시 */}
      {newKey && (
        <div className="rounded-xl px-3 py-2 flex flex-col gap-1.5"
          style={{ background: C.mustard + '12', border: `1px solid ${C.mustard}30` }}>
          <p className="text-xs font-semibold" style={{ color: C.mustard }}>새 API 키 (지금만 표시됩니다)</p>
          <div className="flex items-center gap-2">
            <code className="text-xs flex-1 break-all" style={{ color: C.ink900 }}>{newKey}</code>
            <button onClick={() => { void navigator.clipboard.writeText(newKey); setNewKey(null); }}
              className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
              style={{ background: C.mustard, color: '#fff' }}>복사 후 닫기</button>
          </div>
        </div>
      )}

      {/* 기존 키 목록 */}
      {keys.map((k) => (
        <div key={k.id} className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: C.ink900 }}>{k.name}</p>
            <p className="text-[10px]" style={{ color: C.ink300 }}>
              {k.key_preview} · {k.last_used_at ? `마지막 사용: ${new Date(k.last_used_at).toLocaleDateString('ko-KR')}` : '미사용'}
            </p>
          </div>
          <button onClick={() => void handleDelete(k.id)} className="text-xs flex-shrink-0" style={{ color: C.red }}>삭제</button>
        </div>
      ))}

      {/* 새 키 생성 */}
      <div className="flex gap-2">
        <input value={keyName} onChange={(e) => setKeyName(e.target.value)}
          placeholder="키 이름 (선택)"
          className="flex-1 text-xs rounded-xl px-3 py-2 outline-none"
          style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }} />
        <button onClick={() => void handleCreate()} disabled={loading}
          className="text-xs px-3 py-2 rounded-xl font-medium flex-shrink-0"
          style={{ background: C.mustard, color: '#fff', opacity: loading ? 0.6 : 1 }}>
          {loading ? '...' : '+ 발급'}
        </button>
      </div>
    </div>
  );
}

// F-114 (웹 버전): Google Fit 동기화
function GoogleFitSync({ userId }: { userId: string }) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<{ totalSteps: number; avgSteps: number; days: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const accessToken = await requestGoogleToken('https://www.googleapis.com/auth/fitness.activity.read');

      const res = await fetchWithAuth('/api/integrations/google-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken, days: 7 }),
      });
      const data = await res.json() as { summary?: { totalSteps: number; avgSteps: number; days: number }; error?: string };
      if (!res.ok) throw new Error(data.error ?? '동기화 실패');
      setResult(data.summary ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: C.ink900 }}>🏃 Google Fit</p>
        <p className="text-xs mt-0.5" style={{ color: C.ink300 }}>
          {result
            ? `7일 총 ${result.totalSteps.toLocaleString()}걸음 (평균 ${result.avgSteps.toLocaleString()}걸음/일)`
            : error ? error
            : '최근 7일 걸음 수 · 칼로리 조회'}
        </p>
      </div>
      <button
        onClick={() => void handleSync()}
        disabled={syncing}
        className="text-xs px-3 py-1.5 rounded-xl font-medium flex-shrink-0"
        style={{ background: syncing ? C.beige : C.mustard, color: syncing ? C.ink300 : '#fff' }}
      >
        {syncing ? '조회 중...' : '동기화'}
      </button>
    </div>
  );
}

// F-115: Slack 연동
function SlackConnect({ userId }: { userId: string }) {
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSave() {
    if (!webhookUrl.trim()) return;
    setSaving(true);
    try {
      const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../../lib/firebase');
      await setDoc(
        doc(db, 'users', userId, 'settings', 'integrations'),
        { slack_webhook_url: webhookUrl.trim(), slack_updated_at: serverTimestamp() },
        { merge: true },
      );
      setSaved(true);
      setOpen(false);
      setWebhookUrl('');
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  }

  async function handleTest() {
    const { doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../../../lib/firebase');
    const snap = await getDoc(doc(db, 'users', userId, 'settings', 'integrations'));
    const url = snap.data()?.['slack_webhook_url'] as string | undefined;
    if (!url) { alert('먼저 Webhook URL을 저장해주세요'); return; }
    const res = await fetchWithAuth('/api/integrations/slack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl: url, text: '🎉 MDA ↔ Slack 연결 테스트 성공!' }),
    });
    if (res.ok) alert('Slack 메시지 발송 성공!');
    else alert('발송 실패. Webhook URL을 확인해주세요.');
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: C.ink900 }}>💬 Slack</p>
          <p className="text-xs mt-0.5" style={{ color: C.ink300 }}>
            {saved ? '✓ 저장됨' : '/mda 명령어로 태스크 생성 · 저녁 보고서 자동 발송'}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void handleTest()}
            className="text-xs px-2 py-1.5 rounded-xl flex-shrink-0"
            style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink500 }}>
            테스트
          </button>
          <button onClick={() => setOpen((v) => !v)}
            className="text-xs px-3 py-1.5 rounded-xl font-medium flex-shrink-0"
            style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink500 }}>
            {open ? '닫기' : '설정'}
          </button>
        </div>
      </div>
      {open && (
        <div className="flex flex-col gap-2 pt-1">
          <p className="text-xs" style={{ color: C.ink300 }}>Incoming Webhook URL</p>
          <input type="password" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://hooks.slack.com/services/..."
            className="text-xs rounded-xl px-3 py-2 outline-none"
            style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }} />
          <button onClick={() => void handleSave()} disabled={!webhookUrl.trim() || saving}
            className="text-xs py-2 rounded-xl font-medium"
            style={{ background: C.mustard, color: '#fff', opacity: (!webhookUrl.trim() || saving) ? 0.6 : 1 }}>
            {saving ? '저장 중...' : 'Webhook URL 저장'}
          </button>
        </div>
      )}
    </div>
  );
}

// F-116: GitHub 연동
function GitHubImport({ userId, teamId }: { userId: string; teamId: string }) {
  const [token, setToken] = useState('');
  const [repo, setRepo] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleImport() {
    if (!token.trim() || !repo.trim()) return;
    setImporting(true); setError(null); setResult(null);
    try {
      const res = await fetchWithAuth('/api/integrations/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, githubToken: token.trim(), repo: repo.trim() }),
      });
      const data = await res.json() as { imported?: number; total?: number; error?: string };
      if (!res.ok) throw new Error(data.error ?? '임포트 실패');
      setResult({ imported: data.imported ?? 0, total: data.total ?? 0 });
      setOpen(false); setToken('');
    } catch (e) { setError((e as Error).message); }
    finally { setImporting(false); }
  }

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: C.ink900 }}>🐙 GitHub Issues</p>
          <p className="text-xs mt-0.5" style={{ color: C.ink300 }}>
            {result ? `${result.imported}개 임포트 (총 ${result.total}개)` : '오픈 이슈를 태스크로 가져옵니다'}
          </p>
        </div>
        <button onClick={() => setOpen((v) => !v)}
          className="text-xs px-3 py-1.5 rounded-xl font-medium flex-shrink-0"
          style={{ background: C.cream, border: `1px solid ${C.beige}`, color: C.ink500 }}>
          {open ? '닫기' : '설정'}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-2 pt-1">
          <input type="text" value={repo} onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repository"
            className="text-xs rounded-xl px-3 py-2 outline-none"
            style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }} />
          <input type="password" value={token} onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_personal_access_token"
            className="text-xs rounded-xl px-3 py-2 outline-none"
            style={{ background: C.ivory, border: `1px solid ${C.beige}`, color: C.ink900 }} />
          {error && <p className="text-xs" style={{ color: C.red }}>{error}</p>}
          <button onClick={() => void handleImport()} disabled={!token.trim() || !repo.trim() || importing}
            className="text-xs py-2 rounded-xl font-medium"
            style={{ background: C.mustard, color: '#fff', opacity: (!token.trim() || !repo.trim() || importing) ? 0.6 : 1 }}>
            {importing ? '임포트 중...' : 'GitHub 이슈 가져오기'}
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide mb-2" style={{ color: C.ink300 }}>
        {title}
      </p>
      <div
        className="rounded-2xl overflow-hidden divide-y"
        style={{ background: C.cream, border: `1px solid ${C.beige}`, borderColor: C.beige }}
      >
        {children}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: '#2D2A26' }}>{label}</p>
        {description && (
          <p className="text-xs mt-0.5" style={{ color: '#ADA598' }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

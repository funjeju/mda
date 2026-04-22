'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth/AuthContext';

const C = {
  ivory:   '#FDFBF7',
  cream:   '#F6F1E7',
  beige:   '#E9DFC9',
  ink900:  '#2D2A26',
  ink500:  '#7C756B',
  ink300:  '#ADA598',
  mustard: '#D4A547',
  red:     '#EB8B7C',
  green:   '#3D7A55',
};

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/home');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: C.ivory }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: C.mustard, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: C.ivory, color: C.ink900 }}>

      {/* 네비게이션 */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗒️</span>
          <span className="font-bold text-lg tracking-tight">My Daily Agent</span>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          style={{ background: C.mustard, color: '#fff' }}
        >
          로그인
        </button>
      </nav>

      {/* 히어로 */}
      <section className="flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-3xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-6"
          style={{ background: C.mustard + '18', color: C.mustard, border: `1px solid ${C.mustard}30` }}>
          ✦ AI 기반 일정·프로젝트 관리
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight mb-5"
          style={{ color: C.ink900 }}>
          말하면 정리되는<br />
          <span style={{ color: C.mustard }}>나의 하루 에이전트</span>
        </h1>
        <p className="text-base sm:text-lg leading-relaxed mb-8 max-w-xl"
          style={{ color: C.ink500 }}>
          음성·텍스트로 할 일을 던지면 AI가 분류하고,
          프로젝트에 배치하고, 만다라트로 시각화합니다.
          생각을 행동으로 바꾸는 가장 빠른 방법.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="text-base font-semibold px-8 py-3.5 rounded-2xl transition-all hover:opacity-90 active:scale-95"
          style={{ background: C.mustard, color: '#fff', boxShadow: `0 4px 20px ${C.mustard}50` }}
        >
          무료로 시작하기 →
        </button>
        <p className="text-xs mt-3" style={{ color: C.ink300 }}>Google 계정으로 30초 만에</p>
      </section>

      {/* 앱 UI 목업 */}
      <section className="px-6 max-w-4xl mx-auto w-full mb-20">
        <div className="rounded-3xl overflow-hidden"
          style={{ border: `1px solid ${C.beige}`, boxShadow: '0 8px 48px rgba(45,42,38,0.08)' }}>
          {/* 목업 헤더 */}
          <div className="flex items-center gap-1.5 px-4 py-3" style={{ background: C.cream, borderBottom: `1px solid ${C.beige}` }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#EB8B7C' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: C.mustard }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#8FBFA9' }} />
            <span className="ml-3 text-xs" style={{ color: C.ink300 }}>mda — 만다라트 뷰</span>
          </div>
          {/* 만다라트 목업 */}
          <div className="p-6" style={{ background: C.ivory }}>
            <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
              {[
                { label: '리서치', emoji: '🔍', done: 3, total: 5 },
                { label: '기획', emoji: '📋', done: 2, total: 4 },
                { label: '디자인', emoji: '🎨', done: 1, total: 6 },
                { label: '개발', emoji: '💻', done: 4, total: 8 },
                { label: '앱 런칭', emoji: '🚀', center: true },
                { label: '마케팅', emoji: '📣', done: 0, total: 3 },
                { label: '테스트', emoji: '🧪', done: 2, total: 3 },
                { label: '배포', emoji: '🌐', done: 1, total: 4 },
                { label: '피드백', emoji: '💬', done: 0, total: 2 },
              ].map((cell, i) => (
                <div key={i}
                  className="rounded-xl p-3 flex flex-col items-center justify-center gap-1 aspect-square"
                  style={{
                    background: cell.center ? C.mustard : C.cream,
                    border: `1px solid ${cell.center ? C.mustard : C.beige}`,
                  }}>
                  <span className="text-lg">{cell.emoji}</span>
                  <p className="text-xs font-medium text-center leading-tight"
                    style={{ color: cell.center ? '#fff' : C.ink900 }}>
                    {cell.label}
                  </p>
                  {!cell.center && (
                    <p className="text-[10px]" style={{ color: C.ink300 }}>
                      {cell.done}/{cell.total}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 작동 방식 */}
      <section className="px-6 max-w-4xl mx-auto w-full mb-20">
        <h2 className="text-2xl font-bold text-center mb-3" style={{ color: C.ink900 }}>
          이렇게 작동합니다
        </h2>
        <p className="text-sm text-center mb-10" style={{ color: C.ink500 }}>
          3단계로 생각이 프로젝트가 됩니다
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '01',
              icon: '🎙️',
              title: '말하거나 입력',
              desc: '음성, 텍스트, 파일 어떤 방식으로든 할 일을 던지세요. AI가 알아서 해석합니다.',
            },
            {
              step: '02',
              icon: '🤖',
              title: 'AI가 분류·배치',
              desc: '일상인지 업무인지 파악하고, 관련 프로젝트에 자동 배치합니다. 모르면 물어봅니다.',
            },
            {
              step: '03',
              icon: '🗺️',
              title: '만다라트로 시각화',
              desc: '프로젝트가 8개 섹션으로 펼쳐지고, 간트·캘린더와 실시간 연동됩니다.',
            },
          ].map((item) => (
            <div key={item.step}
              className="rounded-2xl p-6 flex flex-col gap-3"
              style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: C.mustard + '20', color: C.mustard }}>
                  {item.step}
                </span>
                <span className="text-2xl">{item.icon}</span>
              </div>
              <p className="font-semibold text-sm" style={{ color: C.ink900 }}>{item.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: C.ink500 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 핵심 기능 */}
      <section className="px-6 max-w-4xl mx-auto w-full mb-20">
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: C.ink900 }}>
          핵심 기능
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: '🧿', title: '만다라트 구조', desc: '프로젝트 → 8섹션 → 태스크로 무제한 뎁스. 섹션 안에 또 서브 프로젝트를 만들 수 있습니다.' },
            { icon: '📊', title: '간트 · 캘린더 연동', desc: '태스크의 마감일이 간트 타임라인과 주간 캘린더에 자동 반영됩니다.' },
            { icon: '👥', title: '담당자 & 마감일', desc: '섹션과 태스크 모두 담당자 지정, 마감일 설정이 가능합니다.' },
            { icon: '🎙️', title: '다중 입력', desc: '음성 녹음, 텍스트, 오디오 파일 업로드, Gmail·Notion·GitHub 임포트.' },
            { icon: '⚡', title: 'AI 자동 분류', desc: 'Gemini + Claude 이중 AI. 신뢰도 높으면 자동 처리, 애매하면 확인 요청.' },
            { icon: '🔔', title: '알림 & 리포트', desc: '마감 알림, 저녁 보고서, DND 설정. 팀 활동 알림도 지원합니다.' },
          ].map((f) => (
            <div key={f.title}
              className="rounded-2xl p-5 flex gap-4"
              style={{ background: C.cream, border: `1px solid ${C.beige}` }}>
              <span className="text-2xl flex-shrink-0 mt-0.5">{f.icon}</span>
              <div>
                <p className="font-semibold text-sm mb-1" style={{ color: C.ink900 }}>{f.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: C.ink500 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 플랜 */}
      <section className="px-6 max-w-4xl mx-auto w-full mb-20">
        <h2 className="text-2xl font-bold text-center mb-10" style={{ color: C.ink900 }}>
          플랜
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              name: 'Free',
              price: '무료',
              color: C.ink500,
              features: ['프로젝트 3개', 'AI 분류 20회/일', '팀원 1명'],
            },
            {
              name: 'Plus',
              price: '₩9,900/월',
              color: C.mustard,
              highlight: true,
              features: ['프로젝트 20개', 'AI 분류 200회/일', '파일 업로드 50개/월', '커스텀 스티커'],
            },
            {
              name: 'Team',
              price: '₩29,900/월',
              color: C.green,
              features: ['프로젝트 50개', '팀원 최대 15명', 'AI 분류 500회/일', '팀 협업 전체'],
            },
          ].map((plan) => (
            <div key={plan.name}
              className="rounded-2xl p-6 flex flex-col gap-4"
              style={{
                background: plan.highlight ? plan.color + '10' : C.cream,
                border: `1px solid ${plan.highlight ? plan.color + '40' : C.beige}`,
              }}>
              <div>
                <p className="font-bold text-base" style={{ color: plan.color }}>{plan.name}</p>
                <p className="text-xl font-bold mt-1" style={{ color: C.ink900 }}>{plan.price}</p>
              </div>
              <ul className="flex flex-col gap-1.5">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs flex items-center gap-2" style={{ color: C.ink500 }}>
                    <span style={{ color: plan.color }}>✓</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="px-6 py-16 text-center"
        style={{ background: C.cream, borderTop: `1px solid ${C.beige}` }}>
        <h2 className="text-2xl font-bold mb-3" style={{ color: C.ink900 }}>
          지금 바로 시작해보세요
        </h2>
        <p className="text-sm mb-6" style={{ color: C.ink500 }}>
          무료 플랜으로 충분히 써보고 결정하세요
        </p>
        <button
          onClick={() => router.push('/login')}
          className="text-base font-semibold px-8 py-3.5 rounded-2xl transition-all hover:opacity-90 active:scale-95"
          style={{ background: C.mustard, color: '#fff' }}
        >
          Google로 무료 시작 →
        </button>
      </section>

      {/* 푸터 */}
      <footer className="px-6 py-6 text-center" style={{ borderTop: `1px solid ${C.beige}` }}>
        <p className="text-xs" style={{ color: C.ink300 }}>
          © 2025 My Daily Agent · <a href="mailto:naggu1999@gmail.com" style={{ color: C.ink300 }}>문의</a>
        </p>
      </footer>

    </div>
  );
}

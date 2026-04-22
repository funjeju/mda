import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-100: 이메일 초대 발송
// RESEND_API_KEY 환경변수 필요 (https://resend.com)

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:invite-email`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { inviteLink, recipientEmail, senderName, teamName } = await req.json() as {
    inviteLink: string;
    recipientEmail: string;
    senderName: string;
    teamName: string;
  };

  if (!inviteLink || !recipientEmail) {
    return NextResponse.json({ error: 'inviteLink, recipientEmail 필수' }, { status: 400 });
  }

  // HTML injection 방지
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const safeSender = esc(senderName ?? '');
  const safeTeam   = esc(teamName ?? '');

  // inviteLink는 앱 도메인 내부 경로만 허용
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';
  const safeLink = inviteLink.startsWith(origin) ? inviteLink : origin;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // API 키 없으면 링크만 반환 (클라이언트가 클립보드에 복사)
    return NextResponse.json({ sent: false, reason: 'RESEND_API_KEY not set', link: safeLink });
  }

  const html = `
<!DOCTYPE html>
<html lang="ko">
<body style="font-family:'Apple SD Gothic Neo',sans-serif;background:#FDFBF7;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:#F6F1E7;border-radius:20px;padding:36px;">
    <h1 style="font-size:24px;color:#2D2A26;margin:0 0 8px;">🗒️ MDA</h1>
    <p style="color:#7C756B;font-size:14px;margin:0 0 24px;">My Daily Agent</p>
    <hr style="border:none;border-top:1px solid #E9DFC9;margin:0 0 24px;"/>
    <p style="color:#2D2A26;font-size:16px;line-height:1.6;margin:0 0 16px;">
      <strong>${safeSender}</strong>님이 <strong>${safeTeam}</strong> 팀에 초대했습니다.
    </p>
    <p style="color:#7C756B;font-size:14px;line-height:1.6;margin:0 0 24px;">
      MDA는 할 일·일정·감정을 자유롭게 입력하면 AI가 자동으로 분류하는 스마트 생산성 앱입니다.
    </p>
    <a href="${safeLink}"
      style="display:inline-block;background:#D4A547;color:#fff;text-decoration:none;
             padding:14px 28px;border-radius:12px;font-size:15px;font-weight:600;">
      초대 수락하기 →
    </a>
    <p style="color:#ADA598;font-size:12px;margin:24px 0 0;">
      이 링크는 7일간 유효합니다. 원하지 않는 경우 무시해 주세요.
    </p>
  </div>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'MDA <noreply@mda.app>',
        to: [recipientEmail],
        subject: `${safeSender}님이 ${safeTeam} 팀에 초대했습니다`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('[invite/email] Resend error:', err);
      return NextResponse.json({ sent: false, reason: err, link: inviteLink });
    }

    return NextResponse.json({ sent: true });
  } catch (e) {
    return NextResponse.json({ sent: false, reason: (e as Error).message, link: inviteLink });
  }
}

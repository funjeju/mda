import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT_STANDUP } from '@mda/prompts';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    yesterday: { type: 'string' },
    today:     { type: 'string' },
    blocker:   { type: 'string' },
    highlight: { type: 'string' },
    greeting:  { type: 'string' },
  },
  required: ['yesterday', 'today', 'highlight', 'greeting'],
} as const;

const StandupSchema = z.object({
  yesterday: z.string(),
  today:     z.string(),
  blocker:   z.string().nullable().optional(),
  highlight: z.string(),
  greeting:  z.string(),
});

export type StandupReport = z.infer<typeof StandupSchema>;

interface StandupRequest {
  yesterdayDone: { title: string }[];
  todayTasks:    { title: string; priority: string }[];
  userName?: string;
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:standup`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const body = (await req.json()) as StandupRequest;

  const userPrompt = `
사용자: ${body.userName ?? '사용자'}

어제 완료한 태스크 (${body.yesterdayDone.length}개):
${body.yesterdayDone.map((t) => `- ${t.title}`).join('\n') || '없음'}

오늘 예정된 태스크 (${body.todayTasks.length}개):
${body.todayTasks.map((t) => `- [${t.priority}] ${t.title}`).join('\n') || '없음'}
`.trim();

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey !== '여기에_Gemini_API_키_입력') {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-lite',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA as never,
          temperature: 0.6,
          maxOutputTokens: 512,
        },
        systemInstruction: SYSTEM_PROMPT_STANDUP,
      });
      const result = await model.generateContent(userPrompt);
      const parsed = StandupSchema.parse(JSON.parse(result.response.text()));
      return NextResponse.json(parsed);
    } catch (err) {
      console.error('[standup] Gemini error, falling back to Claude:', err);
    }
  }

  const claudeKey = process.env.ANTHROPIC_API_KEY;
  if (!claudeKey) {
    return NextResponse.json({ error: 'No AI API key configured' }, { status: 503 });
  }

  try {
    const client = new Anthropic({ apiKey: claudeKey });
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT_STANDUP + '\n\nJSON만 출력하세요.',
      messages: [{ role: 'user', content: userPrompt }],
    });
    const text = msg.content[0]?.type === 'text' ? msg.content[0].text : '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const parsed = StandupSchema.parse(JSON.parse(jsonMatch[0]));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[standup] Claude error:', err);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
  }
}

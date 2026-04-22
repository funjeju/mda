import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { SYSTEM_PROMPT_EVENING_REPORT } from '@mda/prompts';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    summary:    { type: 'string' },
    done_count: { type: 'number' },
    todo_count: { type: 'number' },
    mood:       { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    emoji:      { type: 'string' },
  },
  required: ['summary', 'done_count', 'todo_count', 'mood', 'emoji'],
} as const;

const ReportSchema = z.object({
  summary:    z.string(),
  done_count: z.number(),
  todo_count: z.number(),
  mood:       z.enum(['positive', 'neutral', 'negative']),
  emoji:      z.string(),
});

export type EveningReport = z.infer<typeof ReportSchema>;

interface ReportRequest {
  tasks: { title: string; status: string }[];
  journals: { content: string; emotion: string | null }[];
  date?: string;
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:evening-report`, 5, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const apiKey = geminiKey;

  if ((!geminiKey || geminiKey === '여기에_Gemini_API_키_입력') && !claudeKey) {
    return NextResponse.json({ error: 'No AI API key configured' }, { status: 503 });
  }

  const body = (await req.json()) as ReportRequest;

  const doneTasks = body.tasks.filter((t) => t.status === 'done');
  const todoTasks = body.tasks.filter((t) => t.status !== 'done');

  const userPrompt = `
날짜: ${body.date ?? new Date().toLocaleDateString('ko-KR')}

완료한 태스크 (${doneTasks.length}개):
${doneTasks.map((t) => `- ${t.title}`).join('\n') || '없음'}

미완료 태스크 (${todoTasks.length}개):
${todoTasks.map((t) => `- ${t.title}`).join('\n') || '없음'}

오늘 일기 (${body.journals.length}개):
${body.journals.map((j) => `- [${j.emotion ?? '감정없음'}] ${j.content}`).join('\n') || '없음'}
`.trim();

  let raw: string | null = null;

  // 1차: Gemini
  if (apiKey && apiKey !== '여기에_Gemini_API_키_입력') {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash-lite',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA as never,
          temperature: 0.5,
          maxOutputTokens: 512,
        },
        systemInstruction: SYSTEM_PROMPT_EVENING_REPORT,
      });
      const result = await model.generateContent(userPrompt);
      raw = result.response.text();
    } catch (err) {
      console.warn('[evening-report] Gemini failed, trying Claude:', err);
    }
  }

  // 2차: Claude fallback
  if (raw === null) {
    if (!claudeKey) {
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }
    try {
      const client = new Anthropic({ apiKey: claudeKey });
      const msg = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        temperature: 0.5,
        system: `${SYSTEM_PROMPT_EVENING_REPORT}\n\nJSON만 출력하세요: {"summary":"...","done_count":0,"todo_count":0,"mood":"positive|neutral|negative","emoji":"✨"}`,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const block = msg.content[0];
      if (block?.type === 'text') {
        const match = block.text.match(/\{[\s\S]*\}/);
        raw = match?.[0] ?? null;
      }
    } catch (err) {
      console.error('[evening-report] Claude failed:', err);
      return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
    }
  }

  if (raw === null) {
    return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });
  }

  try {
    const parsed = ReportSchema.parse(JSON.parse(raw));
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('[evening-report] Schema validation failed:', err, raw);
    return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
  }
}

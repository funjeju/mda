import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

const SectionsSchema = z.object({
  sections: z.array(z.object({
    title: z.string(),
    description: z.string(),
    emoji: z.string(),
  })).min(3).max(8),
  project_emoji: z.string(),
  summary: z.string(),
});

const GEMINI_SCHEMA = {
  type: 'object',
  properties: {
    sections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title:       { type: 'string' },
          description: { type: 'string' },
          emoji:       { type: 'string' },
        },
        required: ['title', 'description', 'emoji'],
      },
    },
    project_emoji: { type: 'string' },
    summary:       { type: 'string' },
  },
  required: ['sections', 'project_emoji', 'summary'],
} as const;

const SYSTEM_PROMPT = `당신은 만다라트(Mandala Art) 목표 분해 전문가입니다.
사용자가 입력한 프로젝트 목표를 분석하여 8개의 핵심 실행 영역으로 분해합니다.

## 만다라트 원칙
- 중심 목표를 달성하기 위한 8개의 독립적이고 상호보완적인 핵심 영역을 도출합니다
- 각 영역은 구체적이고 실행 가능해야 합니다
- 한국어로 작성하며, 짧고 명확한 제목을 사용합니다
- 이모지는 각 영역의 성격을 직관적으로 표현합니다
- 섹션은 정확히 8개여야 합니다`;

async function generateWithGemini(goal: string, context?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: GEMINI_SCHEMA as never,
      temperature: 0.7,
      maxOutputTokens: 1024,
    },
    systemInstruction: SYSTEM_PROMPT,
  });
  const prompt = `목표: ${goal}${context ? `\n맥락: ${context}` : ''}`;
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function generateWithClaude(goal: string, context?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    temperature: 0.7,
    system: `${SYSTEM_PROMPT}

반드시 아래 JSON 형식으로만 응답하세요:
{"sections":[{"title":"섹션명","description":"한 줄 설명","emoji":"🎯"},...],"project_emoji":"🗂️","summary":"프로젝트 한 줄 요약"}
sections는 반드시 8개여야 합니다.`,
    messages: [{ role: 'user', content: `목표: ${goal}${context ? `\n맥락: ${context}` : ''}` }],
  });
  const block = message.content[0];
  if (!block || block.type !== 'text') throw new Error('Unexpected response');
  return block.text;
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:ai-sections`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { goal, context } = await req.json() as { goal: string; context?: string };
  if (!goal?.trim()) {
    return NextResponse.json({ error: 'goal is required' }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;

  let raw: string | null = null;

  if (geminiKey && geminiKey !== '여기에_Gemini_API_키_입력') {
    try { raw = await generateWithGemini(goal, context); } catch (e) {
      console.warn('[ai-sections] Gemini failed:', e);
    }
  }
  if (!raw && claudeKey) {
    try { raw = await generateWithClaude(goal, context); } catch (e) {
      console.error('[ai-sections] Claude failed:', e);
    }
  }

  if (!raw) return NextResponse.json({ error: 'AI generation failed' }, { status: 502 });

  try {
    const parsed = SectionsSchema.parse(JSON.parse(raw));
    return NextResponse.json(parsed);
  } catch (e) {
    console.error('[ai-sections] parse failed:', e, raw);
    return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
  }
}

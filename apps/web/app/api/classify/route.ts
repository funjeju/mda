import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { ClassificationResultSchema, type ClassifyRequest } from '@/lib/ai/schemas';
import { SYSTEM_PROMPT_INTENT_CLASSIFICATION } from '@mda/prompts';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          segment:         { type: 'string' },
          intent:          { type: 'string', enum: ['task_creation','task_update','project_creation','schedule','journal_emotion','journal_event','contact_mention','reminder_set','question','noise'] },
          confidence:      { type: 'number' },
          proposed_action: { type: 'string', enum: ['create','update','link','none'] },
          proposed_data: {
            type: 'object',
            properties: {
              title:        { type: 'string' },
              date:         { type: 'string' },
              time:         { type: 'string' },
              people:       { type: 'array', items: { type: 'string' } },
              emotion:      { type: 'string' },
              priority:     { type: 'string', enum: ['low','normal','high','urgent'] },
              project_hint: { type: 'string' },
            },
          },
        },
        required: ['segment', 'intent', 'confidence', 'proposed_action', 'proposed_data'],
      },
    },
    overall_mood: { type: 'string', enum: ['positive','neutral','negative'] },
    urgency:      { type: 'string', enum: ['low','normal','high'] },
  },
  required: ['segments', 'overall_mood', 'urgency'],
} as const;

function buildUserPrompt(body: ClassifyRequest): string {
  const ctx = body.context ?? {};
  const lines = [
    `현재 시각: ${new Date().toLocaleString('ko-KR', { timeZone: ctx.timezone ?? 'Asia/Seoul' })}`,
    `활성 프로젝트: ${(ctx.active_projects ?? []).join(', ') || '없음'}`,
    `오늘 등록된 태스크: ${(ctx.today_tasks ?? []).join(', ') || '없음'}`,
  ];
  if (ctx.frequent_intents?.length) {
    lines.push(`자주 사용하는 의도: ${ctx.frequent_intents.join(', ')}`);
  }
  if (ctx.preferred_projects?.length) {
    lines.push(`선호 프로젝트: ${ctx.preferred_projects.join(', ')}`);
  }
  lines.push('', '사용자 입력:', body.text);
  return lines.join('\n').trim();
}

async function classifyWithGemini(userPrompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA as never,
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
    systemInstruction: SYSTEM_PROMPT_INTENT_CLASSIFICATION,
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}

async function classifyWithClaude(userPrompt: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    temperature: 0.2,
    system: `${SYSTEM_PROMPT_INTENT_CLASSIFICATION}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요:
{"segments":[{"segment":"...","intent":"task_creation|task_update|project_creation|schedule|journal_emotion|journal_event|contact_mention|reminder_set|question|noise","confidence":0.95,"proposed_action":"create|update|link|none","proposed_data":{"title":"...","date":null,"time":null,"people":[],"emotion":null,"priority":"normal","project_hint":null}}],"overall_mood":"positive|neutral|negative","urgency":"low|normal|high"}`,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const block = message.content[0];
  if (!block || block.type !== 'text') throw new Error('Unexpected response type');
  return block.text;
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:classify`, 20, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;

  if ((!geminiKey || geminiKey === '여기에_Gemini_API_키_입력') && !claudeKey) {
    return NextResponse.json({ error: 'No AI API key configured' }, { status: 503 });
  }

  const body = (await req.json()) as ClassifyRequest;
  if (!body.text?.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const userPrompt = buildUserPrompt(body);
  let raw: string | null = null;
  let usedFallback = false;

  // 1차: Gemini
  if (geminiKey && geminiKey !== '여기에_Gemini_API_키_입력') {
    try {
      raw = await classifyWithGemini(userPrompt);
    } catch (err) {
      console.warn('[classify] Gemini failed, trying Claude fallback:', err);
    }
  }

  // 2차: Claude fallback
  if (raw === null && claudeKey) {
    try {
      raw = await classifyWithClaude(userPrompt);
      usedFallback = true;
    } catch (err) {
      console.error('[classify] Claude fallback also failed:', err);
      return NextResponse.json({ error: 'AI classification failed' }, { status: 502 });
    }
  }

  if (raw === null) {
    return NextResponse.json({ error: 'AI classification failed' }, { status: 502 });
  }

  try {
    const parsed = ClassificationResultSchema.parse(JSON.parse(raw));
    return NextResponse.json({ ...parsed, _fallback: usedFallback });
  } catch (err) {
    console.error('[classify] Schema validation failed:', err, raw);
    return NextResponse.json({ error: 'Invalid AI response' }, { status: 502 });
  }
}

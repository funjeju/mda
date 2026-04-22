import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `당신은 따뜻하고 공감 능력이 뛰어난 AI 회고 동반자입니다.
사용자가 하루를 돌아보고 감정을 정리할 수 있도록 도와줍니다.

## 대화 원칙
- 판단하지 않고 먼저 공감하세요
- 짧고 따뜻한 한국어로 응답하세요 (2-4문장)
- 열린 질문으로 더 깊이 탐색하도록 유도하세요
- 사용자가 스스로 인사이트를 발견하도록 안내하세요
- 과도한 조언은 삼가고, 경청과 반영에 집중하세요
- 이모지를 적절히 활용해 친근하게 표현하세요

## 회고 흐름
처음엔 오늘 있었던 일을 물어보고, 이후 감정→원인→배움→내일 계획 순서로 자연스럽게 이어가세요.`;

async function chatWithGemini(messages: ChatMessage[], context?: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash-lite',
    generationConfig: { temperature: 0.85, maxOutputTokens: 512 },
    systemInstruction: SYSTEM_PROMPT + (context ? `\n\n## 오늘의 컨텍스트\n${context}` : ''),
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({ history });
  const last = messages[messages.length - 1];
  if (!last) throw new Error('No messages');
  const result = await chat.sendMessage(last.content);
  return result.response.text();
}

async function chatWithClaude(messages: ChatMessage[], context?: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    temperature: 0.85,
    system: SYSTEM_PROMPT + (context ? `\n\n## 오늘의 컨텍스트\n${context}` : ''),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  const block = message.content[0];
  if (!block || block.type !== 'text') throw new Error('Unexpected response');
  return block.text;
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:ai-companion`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const { messages, context } = await req.json() as {
    messages: ChatMessage[];
    context?: string;
  };

  if (!messages?.length) {
    return NextResponse.json({ error: 'messages required' }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const claudeKey = process.env.ANTHROPIC_API_KEY;
  let reply: string | null = null;

  if (geminiKey && geminiKey !== '여기에_Gemini_API_키_입력') {
    try { reply = await chatWithGemini(messages, context); } catch (e) {
      console.warn('[ai-companion] Gemini failed:', e);
    }
  }
  if (!reply && claudeKey) {
    try { reply = await chatWithClaude(messages, context); } catch (e) {
      console.error('[ai-companion] Claude failed:', e);
    }
  }

  if (!reply) {
    return NextResponse.json({ error: 'AI unavailable' }, { status: 502 });
  }

  return NextResponse.json({ reply });
}

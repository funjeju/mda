import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:transcribe`, 10, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not configured' }, { status: 503 });
  }

  const formData = await req.formData();
  const file = formData.get('file') as File | null;
  if (!file) {
    return NextResponse.json({ error: 'No audio file' }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey });

  try {
    const transcription = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'ko',
      response_format: 'json',
    });
    return NextResponse.json({ text: transcription.text });
  } catch (err) {
    console.error('[transcribe] Whisper error:', err);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { verifyUser } from '@/lib/auth/verifyUser';
import { rateLimit } from '@/lib/auth/rateLimit';

// F-045: 맥락 기반 임베딩 매칭
// 입력 텍스트 → embedding → 기존 태스크/프로젝트와 코사인 유사도 비교

interface MatchCandidate {
  id: string;
  title: string;
  type: 'task' | 'project' | 'section';
}

interface MatchResult extends MatchCandidate {
  score: number;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-10);
}

async function getEmbedding(genAI: GoogleGenerativeAI, text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export async function POST(req: NextRequest) {
  const uid = await verifyUser(req);
  if (!uid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!rateLimit(`${uid}:ai-match`, 30, 60_000)) {
    return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 503 });
  }

  const { query, candidates, topK = 3 } = await req.json() as {
    query: string;
    candidates: MatchCandidate[];
    topK?: number;
  };

  if (!query || !candidates?.length) {
    return NextResponse.json({ matches: [] });
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // 쿼리 + 후보 임베딩 병렬 계산
  const [queryVec, ...candidateVecs] = await Promise.all([
    getEmbedding(genAI, query),
    ...candidates.map((c) => getEmbedding(genAI, `${c.type}: ${c.title}`)),
  ]);

  const results: MatchResult[] = candidates.map((c, i) => ({
    ...c,
    score: cosineSimilarity(queryVec, candidateVecs[i]!),
  }));

  results.sort((a, b) => b.score - a.score);

  return NextResponse.json({ matches: results.slice(0, topK) });
}

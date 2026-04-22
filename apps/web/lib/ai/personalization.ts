'use client';

import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { ClassificationResult } from './schemas';

export interface PersonalizationHints {
  frequent_intents: string[];      // 자주 쓰는 intent 순위
  preferred_time_blocks: string[]; // 자주 입력하는 time_block
  common_project_names: string[];  // 자주 언급되는 프로젝트
  avg_confidence: number;          // 평균 확신도 (낮으면 리뷰 필요)
}

/**
 * 최근 input_logs에서 개인화 힌트 도출
 * — 최근 30개 processed 로그에서 통계 계산
 */
export async function fetchPersonalizationHints(
  teamId: string,
  userId: string,
): Promise<PersonalizationHints> {
  const col = collection(db, 'teams', teamId, 'input_logs');
  const q = query(
    col,
    where('created_by', '==', userId),
    where('processed', '==', true),
    orderBy('created_at', 'desc'),
    limit(30),
  );

  const snap = await getDocs(q);
  const intentCounts: Record<string, number> = {};
  const timeBlockCounts: Record<string, number> = {};
  const projectNameCounts: Record<string, number> = {};
  let totalConfidence = 0;
  let confidenceCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data() as { ai_result?: ClassificationResult };
    const res = data.ai_result;
    if (!res) continue;

    for (const seg of res.segments ?? []) {
      if (seg.intent === 'noise') continue;
      intentCounts[seg.intent] = (intentCounts[seg.intent] ?? 0) + 1;
      totalConfidence += seg.confidence;
      confidenceCount++;

      if (seg.proposed_data?.time_block) {
        const tb = seg.proposed_data.time_block;
        timeBlockCounts[tb] = (timeBlockCounts[tb] ?? 0) + 1;
      }
      if (seg.proposed_data?.project_name) {
        const pn = seg.proposed_data.project_name;
        projectNameCounts[pn] = (projectNameCounts[pn] ?? 0) + 1;
      }
    }
  }

  const sortByCount = (map: Record<string, number>) =>
    Object.entries(map).sort((a, b) => b[1] - a[1]).map(([k]) => k);

  return {
    frequent_intents:    sortByCount(intentCounts).slice(0, 3),
    preferred_time_blocks: sortByCount(timeBlockCounts).slice(0, 2),
    common_project_names:  sortByCount(projectNameCounts).slice(0, 5),
    avg_confidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0.8,
  };
}

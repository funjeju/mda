'use client';

import { useState, useCallback } from 'react';
import { fetchWithAuth } from '../auth/fetchWithAuth';

export interface MatchCandidate {
  id: string;
  title: string;
  type: 'task' | 'project' | 'section';
}

export interface MatchResult extends MatchCandidate {
  score: number;
}

export function useEmbeddingMatch() {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const match = useCallback(async (query: string, candidates: MatchCandidate[], topK = 3) => {
    if (!query || candidates.length === 0) { setMatches([]); return []; }
    setLoading(true);
    try {
      const res = await fetchWithAuth('/api/ai-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, candidates, topK }),
      });
      if (!res.ok) return [];
      const data = await res.json() as { matches: MatchResult[] };
      setMatches(data.matches);
      return data.matches;
    } catch {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const clear = useCallback(() => setMatches([]), []);

  return { matches, loading, match, clear };
}

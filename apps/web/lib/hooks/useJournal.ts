'use client';

import { useEffect, useState } from 'react';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { journalEntriesCol } from '../firestore/collections';

export interface JournalEntryDoc {
  id: string;
  team_id: string;
  content: string;
  emotion: string | null;
  mood: 'emotional' | 'event' | string;
  is_private: boolean;
  tags: string[];
  ai_generated: boolean;
  ai_confidence: number | null;
  created_at: Date | null;
  created_by: string;
}

export function useJournalEntries(teamId: string, userId: string) {
  const [entries, setEntries] = useState<JournalEntryDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      journalEntriesCol(teamId),
      where('deleted_at', '==', null),
      where('created_by', '==', userId),
      orderBy('created_at', 'desc'),
    );

    const unsub = onSnapshot(q, (snap) => {
      setEntries(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            team_id: data.team_id,
            content: data.content ?? '',
            emotion: data.emotion ?? null,
            mood: data.mood ?? 'event',
            is_private: data.is_private ?? true,
            tags: data.tags ?? [],
            ai_generated: data.ai_generated ?? false,
            ai_confidence: data.ai_confidence ?? null,
            created_at: data.created_at?.toDate?.() ?? null,
            created_by: data.created_by,
          } as JournalEntryDoc;
        }),
      );
      setLoading(false);
    });

    return unsub;
  }, [teamId, userId]);

  return { entries, loading };
}

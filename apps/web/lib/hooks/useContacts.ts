'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  onSnapshot, addDoc, updateDoc, doc,
  serverTimestamp, query, where, orderBy,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { personContactsCol } from '../firestore/collections';

export interface ContactDoc {
  id: string;
  name: string;
  relationship: string;
  tags: string[];
  email: string | null;
  phone: string | null;
  mention_count: number;
  ai_summary: string | null;
  avatar_url: string | null;
  emoji: string | null;
  last_mentioned_at: Date | null;
  created_at: Date | null;
}

export function useContacts(teamId: string, userId: string) {
  const [contacts, setContacts] = useState<ContactDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      personContactsCol(teamId),
      where('deleted_at', '==', null),
      where('created_by', '==', userId),
      orderBy('last_mentioned_at', 'desc'),
    );
    return onSnapshot(q, (snap) => {
      setContacts(snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name ?? '',
          relationship: data.relationship ?? '',
          tags: data.tags ?? [],
          email: data.email ?? null,
          phone: data.phone ?? null,
          mention_count: data.mention_count ?? 0,
          ai_summary: data.ai_summary ?? null,
          avatar_url: data.avatar_url ?? null,
          emoji: data.emoji ?? null,
          last_mentioned_at: data.last_mentioned_at?.toDate?.() ?? null,
          created_at: data.created_at?.toDate?.() ?? null,
        } as ContactDoc;
      }));
      setLoading(false);
    });
  }, [teamId, userId]);

  const createContact = useCallback(
    async (name: string, relationship: string) => {
      const now = serverTimestamp();
      await addDoc(personContactsCol(teamId), {
        id: uuidv4(),
        team_id: teamId,
        name: name.trim(),
        alternate_names: [],
        relationship: relationship.trim(),
        tags: [],
        email: null,
        phone: null,
        linked_user_id: null,
        first_mentioned_at: now,
        last_mentioned_at: now,
        mention_count: 0,
        recent_contexts: [],
        reminders: [],
        ai_summary: null,
        avatar_url: null,
        emoji: null,
        color: null,
        created_at: now,
        updated_at: now,
        created_by: userId,
        deleted_at: null,
        metadata: {},
      });
    },
    [teamId, userId],
  );

  const updateContact = useCallback(
    async (contactId: string, data: Partial<Pick<ContactDoc, 'name' | 'relationship' | 'email' | 'phone' | 'emoji'>>) => {
      const ref = doc(personContactsCol(teamId), contactId);
      await updateDoc(ref, { ...data, updated_at: serverTimestamp() });
    },
    [teamId],
  );

  const deleteContact = useCallback(
    async (contactId: string) => {
      const ref = doc(personContactsCol(teamId), contactId);
      await updateDoc(ref, { deleted_at: serverTimestamp(), updated_at: serverTimestamp() });
    },
    [teamId],
  );

  return { contacts, loading, createContact, updateContact, deleteContact };
}

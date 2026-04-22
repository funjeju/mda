import { useState, useEffect } from 'react';
import {
  onSnapshot,
  getDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { membersCol, teamInvitesCol, teamInviteDoc, userDoc } from '../firestore/collections';

export interface TeamMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: unknown;
  display_name?: string;
  email?: string;
  avatar_url?: string | null;
}

export interface TeamInvite {
  id: string;
  code: string;
  team_id: string;
  created_by: string;
  expires_at: Date;
  max_uses: number;
  used_count: number;
  role: 'admin' | 'member';
  created_at: unknown;
}

export function useTeamMembers(teamId: string) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teamId) return;
    const q = query(membersCol(teamId), where('deleted_at', '==', null));
    return onSnapshot(q, async (snap) => {
      const raw = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeamMember));
      // 유저 프로필 병합
      const enriched = await Promise.all(
        raw.map(async (m) => {
          try {
            const userRef = await getDoc(userDoc(m.user_id));
            if (userRef.exists()) {
              const u = userRef.data()!;
              return { ...m, display_name: u['display_name'], email: u['email'], avatar_url: u['avatar_url'] };
            }
          } catch {
            // 접근 권한 없으면 기본값 사용
          }
          return m;
        }),
      );
      setMembers(enriched);
      setLoading(false);
    });
  }, [teamId]);

  return { members, loading };
}

export function useTeamInvites(teamId: string) {
  const [invites, setInvites] = useState<TeamInvite[]>([]);

  useEffect(() => {
    if (!teamId) return;
    return onSnapshot(teamInvitesCol(teamId), (snap) => {
      const now = new Date();
      setInvites(
        snap.docs
          .map((d) => {
            const data = d.data();
            return {
              id: d.id,
              ...data,
              expires_at: data['expires_at']?.toDate?.() ?? new Date(),
            } as TeamInvite;
          })
          .filter((inv) => inv.expires_at > now),
      );
    });
  }, [teamId]);

  async function deleteInvite(inviteId: string) {
    await deleteDoc(teamInviteDoc(teamId, inviteId));
  }

  return { invites, deleteInvite };
}


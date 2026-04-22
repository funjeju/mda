'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth } from '../firebase';
import { initUserIfNeeded } from '../firestore/initUser';
import { userDoc } from '../firestore/collections';

interface AuthContextValue {
  user: User | null;
  teamId: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchTeam: (newTeamId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // 이미 존재하는 경우 current_team_id 사용 (팀 전환 후에도 유지)
        const snap = await getDoc(userDoc(firebaseUser.uid));
        if (snap.exists) {
          const data = snap.data();
          setTeamId((data['current_team_id'] ?? data['primary_team_id']) as string);
        } else {
          const tid = await initUserIfNeeded(firebaseUser);
          setTeamId(tid);
        }
      } else {
        setTeamId(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function switchTeam(newTeamId: string) {
    if (!user) return;
    await updateDoc(userDoc(user.uid), {
      current_team_id: newTeamId,
      updated_at: serverTimestamp(),
    });
    setTeamId(newTeamId);
  }

  return (
    <AuthContext.Provider value={{ user, teamId, loading, signInWithGoogle, signOut, switchTeam }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

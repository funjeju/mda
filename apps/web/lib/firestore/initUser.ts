import {
  getDoc,
  setDoc,
  serverTimestamp,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../firebase';
import { userDoc, teamDoc, membersCol, userSettingsDoc } from './collections';
import { DEFAULT_DAILY_REPORT_TIME, DEFAULT_TIMEZONE } from '@mda/shared';
import type { User as FirebaseAuthUser } from 'firebase/auth';

/**
 * 최초 로그인 시 User + 개인 Team + TeamMember + UserSettings를 Firestore에 생성한다.
 * 이미 존재하면 아무것도 하지 않는다.
 * @returns 사용자의 primary_team_id
 */
export async function initUserIfNeeded(firebaseUser: FirebaseAuthUser): Promise<string> {
  const userRef = userDoc(firebaseUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return snap.data()['primary_team_id'] as string;
  }

  const teamId = uuidv4();
  const now = serverTimestamp();
  const batch = writeBatch(db);

  batch.set(userRef, {
    id: firebaseUser.uid,
    team_id: teamId,
    email: firebaseUser.email ?? '',
    display_name: firebaseUser.displayName ?? '',
    avatar_url: firebaseUser.photoURL ?? null,
    persona: 'medium',
    onboarding_completed: false,
    primary_team_id: teamId,
    current_team_id: teamId,
    timezone: DEFAULT_TIMEZONE,
    language: 'ko',
    default_view_mode: 'list',
    subscription_tier: 'free',
    subscription_expires_at: null,
    notification_enabled: true,
    quiet_hours: null,
    created_at: now,
    updated_at: now,
    created_by: firebaseUser.uid,
    deleted_at: null,
    metadata: {},
  });

  batch.set(teamDoc(teamId), {
    id: teamId,
    team_id: teamId,
    name: `${firebaseUser.displayName ?? '나'}의 팀`,
    type: 'personal',
    owner_id: firebaseUser.uid,
    member_count: 1,
    subscription_tier: 'free',
    seat_limit: 1,
    icon: null,
    color: null,
    default_project_theme: null,
    created_at: now,
    updated_at: now,
    created_by: firebaseUser.uid,
    deleted_at: null,
    metadata: {},
  });

  const memberRef = doc(membersCol(teamId), firebaseUser.uid);
  batch.set(memberRef, {
    id: firebaseUser.uid,
    team_id: teamId,
    user_id: firebaseUser.uid,
    role: 'owner',
    joined_at: now,
    last_active_at: now,
    is_assignable: true,
    created_at: now,
    updated_at: now,
    created_by: firebaseUser.uid,
    deleted_at: null,
    metadata: {},
  });

  batch.set(userSettingsDoc(firebaseUser.uid), {
    theme_mode: 'light',
    persona_override: null,
    ai_confirmation_level: 'normal',
    ai_language_style: 'friendly',
    notification_rules: [],
    daily_report_time: DEFAULT_DAILY_REPORT_TIME,
    daily_report_enabled: true,
    journal_visibility_default: 'private',
    location_tracking: false,
    auto_delete_recordings_days: null,
  });

  await batch.commit();
  return teamId;
}

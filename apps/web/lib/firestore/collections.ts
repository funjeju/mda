import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../firebase';

// 컬렉션 레퍼런스 팩토리 (타입 안전)
export const usersCol = () =>
  collection(db, 'users') as CollectionReference;

export const userDoc = (userId: string) =>
  doc(db, 'users', userId) as DocumentReference;

export const teamsCol = () =>
  collection(db, 'teams') as CollectionReference;

export const teamDoc = (teamId: string) =>
  doc(db, 'teams', teamId) as DocumentReference;

export const membersCol = (teamId: string) =>
  collection(db, 'teams', teamId, 'members') as CollectionReference;

export const projectsCol = (teamId: string) =>
  collection(db, 'teams', teamId, 'projects') as CollectionReference;

export const projectDoc = (teamId: string, projectId: string) =>
  doc(db, 'teams', teamId, 'projects', projectId) as DocumentReference;

export const sectionsCol = (teamId: string, projectId: string) =>
  collection(db, 'teams', teamId, 'projects', projectId, 'sections') as CollectionReference;

export const sectionDoc = (teamId: string, projectId: string, sectionId: string) =>
  doc(db, 'teams', teamId, 'projects', projectId, 'sections', sectionId) as DocumentReference;

export const tasksCol = (teamId: string, projectId: string) =>
  collection(db, 'teams', teamId, 'projects', projectId, 'tasks') as CollectionReference;

export const independentTasksCol = (teamId: string) =>
  collection(db, 'teams', teamId, 'tasks_independent') as CollectionReference;

export const independentTaskDoc = (teamId: string, taskId: string) =>
  doc(db, 'teams', teamId, 'tasks_independent', taskId) as DocumentReference;

export const dailyEntriesCol = (teamId: string) =>
  collection(db, 'teams', teamId, 'daily_entries') as CollectionReference;

export const journalEntriesCol = (teamId: string) =>
  collection(db, 'teams', teamId, 'journal_entries') as CollectionReference;

export const dailyReportsCol = (teamId: string) =>
  collection(db, 'teams', teamId, 'daily_reports') as CollectionReference;

export const personContactsCol = (teamId: string) =>
  collection(db, 'teams', teamId, 'person_contacts') as CollectionReference;

export const userSettingsDoc = (userId: string) =>
  doc(db, 'users', userId, 'private', 'settings') as DocumentReference;

export const userDecorationsDoc = (userId: string) =>
  doc(db, 'users', userId, 'private', 'decorations') as DocumentReference;

export const teamInvitesCol = (teamId: string) =>
  collection(db, 'teams', teamId, 'invites') as CollectionReference;

export const teamInviteDoc = (teamId: string, inviteId: string) =>
  doc(db, 'teams', teamId, 'invites', inviteId) as DocumentReference;

export const notificationsCol = (userId: string) =>
  collection(db, 'users', userId, 'notifications') as CollectionReference;

export const notificationDoc = (userId: string, notifId: string) =>
  doc(db, 'users', userId, 'notifications', notifId) as DocumentReference;

// 원본 입력 로그 (타이핑/음성 원문 영구 보존)
export const inputLogsCol = (teamId: string) =>
  collection(db, 'teams', teamId, 'input_logs') as CollectionReference;

export const inputLogDoc = (teamId: string, logId: string) =>
  doc(db, 'teams', teamId, 'input_logs', logId) as DocumentReference;

// 댓글 (태스크/섹션에 달 수 있는 범용 댓글)
export const taskCommentsCol = (teamId: string, taskId: string) =>
  collection(db, 'teams', teamId, 'tasks_independent', taskId, 'comments') as CollectionReference;

export const projectTaskCommentsCol = (teamId: string, projectId: string, taskId: string) =>
  collection(db, 'teams', teamId, 'projects', projectId, 'tasks', taskId, 'comments') as CollectionReference;

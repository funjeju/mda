import type {
  FirestoreDataConverter,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import type { Task, DailyEntry, User, Team, Project, Section } from '@mda/shared';

function makeConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T) => data,
    fromFirestore: (snap: QueryDocumentSnapshot) =>
      ({ id: snap.id, ...snap.data() }) as unknown as T,
  };
}

export const taskConverter = makeConverter<Task>();
export const dailyEntryConverter = makeConverter<DailyEntry>();
export const userConverter = makeConverter<User>();
export const teamConverter = makeConverter<Team>();
export const projectConverter = makeConverter<Project>();
export const sectionConverter = makeConverter<Section>();

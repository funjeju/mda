/** Firebase Timestamp 호환 타입 (firebase 패키지 직접 의존 없이 사용) */
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
  toDate(): Date;
  toMillis(): number;
}

export interface BaseEntity {
  id: string;
  team_id: string;
  created_at: Timestamp;
  updated_at: Timestamp;
  created_by: string;
  deleted_at: Timestamp | null;
  metadata: Record<string, unknown>;
}

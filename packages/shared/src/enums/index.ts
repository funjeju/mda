export const TaskStatus = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  DONE: 'done',
  CANCELLED: 'cancelled',
} as const;

export const Priority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const Persona = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
} as const;

export const SubscriptionTier = {
  FREE: 'free',
  PLUS: 'plus',
  TEAM: 'team',
  BUSINESS: 'business',
} as const;

export const TeamRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;

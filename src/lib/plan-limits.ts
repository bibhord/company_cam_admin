export const PLAN_LIMITS = {
  trial:  { photos: 500,  members: 3,  projects: 10,   durationDays: 30  },
  basic:  { photos: 2500, members: 5,  projects: null, durationDays: null },
  pro:    { photos: null, members: 15, projects: null, durationDays: null },
} as const;

export type Plan = keyof typeof PLAN_LIMITS;

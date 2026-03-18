import type { Workout } from '../domain/workout';
import type { WorkoutSession } from '../domain/session';

type RawWorkout = Omit<Workout, 'createdAt' | 'updatedAt' | 'lastUsedAt'> & {
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
};

type RawSession = Omit<WorkoutSession, 'startedAt' | 'endedAt'> & {
  startedAt: string;
  endedAt?: string;
};

export function serializeWorkout(workout: Workout): RawWorkout {
  return {
    ...workout,
    createdAt: workout.createdAt.toISOString(),
    updatedAt: workout.updatedAt.toISOString(),
    lastUsedAt: workout.lastUsedAt?.toISOString(),
  };
}

export function deserializeWorkout(workout: RawWorkout): Workout {
  return {
    ...workout,
    createdAt: new Date(workout.createdAt),
    updatedAt: new Date(workout.updatedAt),
    lastUsedAt: workout.lastUsedAt ? new Date(workout.lastUsedAt) : undefined,
  };
}

export function serializeSession(session: WorkoutSession): RawSession {
  return {
    ...session,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString(),
  };
}

export function deserializeSession(session: RawSession): WorkoutSession {
  return {
    ...session,
    startedAt: new Date(session.startedAt),
    endedAt: session.endedAt ? new Date(session.endedAt) : undefined,
  };
}

import type { Workout } from '../domain/workout';
import type { WorkoutSession } from '../domain/session';
import { normalizeUsername } from '../auth/username';
import type { ImportRequest } from '../backend/contracts';
import { db, clearLegacyData } from './db';
import { requestJson } from './httpClient';
import { serializeSession, serializeWorkout } from './serializers';

const MIGRATION_SENTINEL_KEY = 'workout-timer.migration';

type MigrationSentinelStatus = 'pending' | 'conflict' | 'completed';

interface MigrationSentinel {
  claimedUsername: string;
  status: MigrationSentinelStatus;
}

interface LegacyData {
  workouts: Workout[];
  sessions: WorkoutSession[];
}

export interface MigrationDeps {
  getLegacyData: () => Promise<LegacyData>;
  importUserData: (username: string, payload: LegacyData) => Promise<void>;
  clearLegacyData: () => Promise<void>;
  getSentinel: () => MigrationSentinel | null;
  setSentinel: (value: MigrationSentinel) => void;
  clearSentinel: () => void;
}

export type MigrationResult =
  | { status: 'idle' | 'cancelled' | 'imported' }
  | { status: 'conflict' | 'blocked' | 'failed'; message: string };

export class MigrationError extends Error {
  readonly reason: 'conflict' | 'blocked' | 'failed';

  constructor(
    message: string,
    reason: 'conflict' | 'blocked' | 'failed'
  ) {
    super(message);
    this.reason = reason;
  }
}

export async function migrateLegacyData(
  options: {
    username: string;
    confirmOwnership: (username: string) => Promise<boolean>;
  },
  deps: MigrationDeps = defaultMigrationDeps
): Promise<MigrationResult> {
  const username = normalizeUsername(options.username);
  const legacyData = await deps.getLegacyData();

  if (legacyData.workouts.length === 0 && legacyData.sessions.length === 0) {
    deps.clearSentinel();
    return { status: 'idle' };
  }

  const sentinel = deps.getSentinel();

  if (!sentinel) {
    const confirmed = await options.confirmOwnership(username);
    if (!confirmed) {
      return { status: 'cancelled' };
    }

    deps.setSentinel({
      claimedUsername: username,
      status: 'pending',
    });
  } else if (sentinel.claimedUsername !== username) {
    return {
      status: 'blocked',
      message: `Legacy data is already claimed by ${sentinel.claimedUsername}. Clear the migration claim to retry.`,
    };
  }

  try {
    await deps.importUserData(username, legacyData);
    await deps.clearLegacyData();
    deps.clearSentinel();
    return { status: 'imported' };
  } catch (error) {
    if (error instanceof MigrationError && error.reason === 'conflict') {
      deps.setSentinel({
        claimedUsername: username,
        status: 'conflict',
      });

      return {
        status: 'conflict',
        message: 'Server data already exists for this username. Local data was kept.',
      };
    }

    return {
      status: 'failed',
      message: error instanceof Error ? error.message : 'Migration failed',
    };
  }
}

export function resetMigrationClaim(): void {
  defaultMigrationDeps.clearSentinel();
}

async function getLegacyData(): Promise<LegacyData> {
  const storedWorkouts = await db.workouts.toArray();
  const workouts = await Promise.all(
    storedWorkouts.map(async (workout) => ({
      ...workout,
      blocks: await db.blocks.where('workoutId').equals(workout.id).sortBy('order'),
    }))
  );

  const sessions = await db.sessions.toArray();

  return {
    workouts,
    sessions,
  };
}

function getSentinel(): MigrationSentinel | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(MIGRATION_SENTINEL_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as MigrationSentinel;
  } catch {
    return null;
  }
}

function setSentinel(value: MigrationSentinel): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(MIGRATION_SENTINEL_KEY, JSON.stringify(value));
}

function clearSentinel(): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.removeItem(MIGRATION_SENTINEL_KEY);
}

async function importUserData(username: string, payload: LegacyData): Promise<void> {
  try {
    await requestJson<{ ok: boolean }>(
      `/api/users/${encodeURIComponent(username)}/import`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workouts: payload.workouts.map(serializeWorkout),
          sessions: payload.sessions.map(serializeSession),
        } satisfies ImportRequest),
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'IMPORT_CONFLICT') {
      throw new MigrationError(error.message, 'conflict');
    }

    throw error;
  }
}

const defaultMigrationDeps: MigrationDeps = {
  getLegacyData,
  importUserData,
  clearLegacyData,
  getSentinel,
  setSentinel,
  clearSentinel,
};

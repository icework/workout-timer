import { describe, expect, it } from 'vitest';
import type { Workout } from '../domain/workout';
import type { WorkoutSession } from '../domain/session';
import { MigrationError, migrateLegacyData } from './migration';

function createWorkout(): Workout {
  return {
    id: 'workout-1',
    title: 'Morning Routine',
    blocks: [],
    estimatedDurationSec: 300,
    createdAt: new Date('2026-03-18T08:00:00.000Z'),
    updatedAt: new Date('2026-03-18T08:00:00.000Z'),
    isDeleted: false,
  };
}

function createSession(): WorkoutSession {
  return {
    id: 'session-1',
    workoutId: 'workout-1',
    workoutSnapshotTitle: 'Morning Routine',
    startedAt: new Date('2026-03-18T08:00:00.000Z'),
    elapsedDurationSec: 300,
    status: 'completed',
    completedBlocks: 1,
    completedRepeats: 1,
    totalBlocks: 1,
    totalRepeats: 1,
    endedAt: new Date('2026-03-18T08:05:00.000Z'),
  };
}

function createDeps() {
  const state = {
    sentinel: null as { claimedUsername: string; status: 'pending' | 'conflict' | 'completed' } | null,
    cleared: false,
    imported: [] as Array<{
      username: string;
      workouts: Workout[];
      sessions: WorkoutSession[];
    }>,
  };

  return {
    state,
    deps: {
      getLegacyData: async () => ({
        workouts: [createWorkout()],
        sessions: [createSession()],
      }),
      importUserData: async (
        username: string,
        payload: { workouts: Workout[]; sessions: WorkoutSession[] }
      ) => {
        state.imported.push({ username, ...payload });
      },
      clearLegacyData: async () => {
        state.cleared = true;
      },
      getSentinel: () => state.sentinel,
      setSentinel: (value: { claimedUsername: string; status: 'pending' | 'conflict' | 'completed' }) => {
        state.sentinel = value;
      },
      clearSentinel: () => {
        state.sentinel = null;
      },
    },
  };
}

describe('migrateLegacyData', () => {
  it('imports legacy dexie data only after ownership confirmation', async () => {
    const { deps, state } = createDeps();

    const result = await migrateLegacyData(
      {
        username: 'alice',
        confirmOwnership: async () => true,
      },
      deps
    );

    expect(result.status).toBe('imported');
    expect(state.imported).toEqual([
      expect.objectContaining({
        username: 'alice',
      }),
    ]);
    expect(state.cleared).toBe(true);
    expect(state.sentinel).toBeNull();
  });

  it('keeps legacy data when server import conflicts', async () => {
    const { deps, state } = createDeps();
    deps.importUserData = async () => {
      throw new MigrationError('IMPORT_CONFLICT', 'conflict');
    };

    const result = await migrateLegacyData(
      {
        username: 'alice',
        confirmOwnership: async () => true,
      },
      deps
    );

    expect(result.status).toBe('conflict');
    expect(state.cleared).toBe(false);
    expect(state.sentinel).toEqual({
      claimedUsername: 'alice',
      status: 'conflict',
    });
  });
});

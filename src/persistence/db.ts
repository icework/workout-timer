import Dexie, { type Table } from 'dexie';
import type { Workout, ExerciseBlock } from '../domain/workout';
import type { WorkoutSession } from '../domain/session';

// ============================================================================
// Local Profile Type
// ============================================================================

export interface LocalProfile {
  id: string; // singleton 'default'
  schemaVersion: number;
  preferences: {
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  };
}

// ============================================================================
// Database Definition
// ============================================================================

class WorkoutTimerDB extends Dexie {
  workouts!: Table<Workout>;
  blocks!: Table<ExerciseBlock>;
  sessions!: Table<WorkoutSession>;
  profile!: Table<LocalProfile>;

  constructor() {
    super('WorkoutTimerDB');

    this.version(1).stores({
      workouts: 'id, createdAt, updatedAt, lastUsedAt, isDeleted',
      blocks: 'id, workoutId, order',
      sessions: 'id, workoutId, startedAt, status',
      profile: 'id',
    });
  }
}

export const db = new WorkoutTimerDB();

export async function clearLegacyData(): Promise<void> {
  await db.transaction('rw', [db.workouts, db.blocks, db.sessions], async () => {
    await db.blocks.clear();
    await db.workouts.clear();
    await db.sessions.clear();
  });
}

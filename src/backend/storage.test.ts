import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import type { Workout } from '../domain/workout';
import { createJsonStorage } from './storage';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true }))
  );
});

function createWorkout(id: string): Workout {
  return {
    id,
    title: `Workout ${id}`,
    blocks: [],
    estimatedDurationSec: 0,
    createdAt: new Date('2026-03-18T08:00:00.000Z'),
    updatedAt: new Date('2026-03-18T08:00:00.000Z'),
    isDeleted: false,
  };
}

async function createStorage() {
  const dir = await mkdtemp(join(tmpdir(), 'workout-storage-'));
  tempDirs.push(dir);
  return createJsonStorage(join(dir, 'storage.json'));
}

describe('createJsonStorage', () => {
  it('creates a user bucket on login', async () => {
    const storage = await createStorage();

    await storage.ensureUser('Alice');

    await expect(storage.read()).resolves.toMatchObject({
      users: {
        alice: {
          workouts: [],
          sessions: [],
        },
      },
    });
  });

  it('serializes writes to avoid lost updates', async () => {
    const storage = await createStorage();

    await Promise.all([
      storage.upsertWorkout('alice', createWorkout('a')),
      storage.upsertWorkout('alice', createWorkout('b')),
    ]);

    await expect(storage.getWorkouts('alice')).resolves.toEqual([
      expect.objectContaining({ id: 'a' }),
      expect.objectContaining({ id: 'b' }),
    ]);
  });

  it('returns only non-deleted workouts for a user', async () => {
    const storage = await createStorage();

    await storage.upsertWorkout('alice', {
      ...createWorkout('a'),
      isDeleted: true,
    });

    await expect(storage.getWorkouts('alice')).resolves.toEqual([]);
  });

  it('rejects import when the target bucket already has session data', async () => {
    const storage = await createStorage();

    await storage.upsertSession('alice', {
      id: 'session-1',
      workoutId: 'workout-1',
    });

    await expect(
      storage.importUserData('alice', {
        workouts: [createWorkout('a')],
        sessions: [],
      })
    ).rejects.toThrow('IMPORT_CONFLICT');
  });
});

import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Workout } from '../domain/workout';
import { normalizeUsername } from '../auth/username';

export interface StoredSession {
  id: string;
  [key: string]: unknown;
}

export type StoredWorkout = Workout;

export interface UserBucket {
  workouts: StoredWorkout[];
  sessions: StoredSession[];
}

export interface StorageFile {
  users: Record<string, UserBucket>;
}

const EMPTY_STORAGE: StorageFile = {
  users: {},
};

export function createJsonStorage(filePath: string) {
  let writeQueue = Promise.resolve();

  async function ensureFile(): Promise<void> {
    try {
      await access(filePath);
    } catch {
      await mkdir(dirname(filePath), { recursive: true });
      await writeStorage(EMPTY_STORAGE);
    }
  }

  async function readStorage(): Promise<StorageFile> {
    await ensureFile();
    const content = await readFile(filePath, 'utf8');

    if (!content.trim()) {
      return structuredClone(EMPTY_STORAGE);
    }

    return JSON.parse(content) as StorageFile;
  }

  async function writeStorage(data: StorageFile): Promise<void> {
    const tempPath = `${filePath}.tmp`;
    const payload = `${JSON.stringify(data, null, 2)}\n`;
    await writeFile(tempPath, payload, 'utf8');
    await rename(tempPath, filePath);
  }

  function queueWrite<T>(operation: () => Promise<T>): Promise<T> {
    const result = writeQueue.then(operation);
    writeQueue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }

  function getOrCreateUser(data: StorageFile, username: string): UserBucket {
    const normalized = normalizeUsername(username);
    if (!data.users[normalized]) {
      data.users[normalized] = {
        workouts: [],
        sessions: [],
      };
    }
    return data.users[normalized];
  }

  return {
    async read(): Promise<StorageFile> {
      return readStorage();
    },

    async ensureUser(username: string): Promise<void> {
      await queueWrite(async () => {
        const data = await readStorage();
        getOrCreateUser(data, username);
        await writeStorage(data);
      });
    },

    async upsertWorkout(username: string, workout: StoredWorkout): Promise<void> {
      await queueWrite(async () => {
        const data = await readStorage();
        const user = getOrCreateUser(data, username);
        const index = user.workouts.findIndex((item) => item.id === workout.id);

        if (index >= 0) {
          user.workouts[index] = workout;
        } else {
          user.workouts.push(workout);
        }

        await writeStorage(data);
      });
    },

    async getWorkouts(username: string): Promise<StoredWorkout[]> {
      const data = await readStorage();
      const user = getOrCreateUser(data, username);
      return user.workouts;
    },
  };
}

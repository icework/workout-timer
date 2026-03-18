import { randomUUID } from 'node:crypto';
import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { Workout } from '../domain/workout.ts';
import { normalizeUsername } from '../auth/username.ts';

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

export class StorageError extends Error {
  readonly code: 'INVALID_STORAGE' | 'NOT_FOUND' | 'IMPORT_CONFLICT';

  constructor(
    message: string,
    code: 'INVALID_STORAGE' | 'NOT_FOUND' | 'IMPORT_CONFLICT'
  ) {
    super(message);
    this.code = code;
  }
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

    try {
      return JSON.parse(content) as StorageFile;
    } catch {
      throw new StorageError('Storage JSON is malformed', 'INVALID_STORAGE');
    }
  }

  async function writeStorage(data: StorageFile): Promise<void> {
    const tempPath = `${filePath}.${randomUUID()}.tmp`;
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

  function getExistingUser(data: StorageFile, username: string): UserBucket {
    const normalized = normalizeUsername(username);
    const user = data.users[normalized];

    if (!user) {
      throw new StorageError(`Unknown user: ${normalized}`, 'NOT_FOUND');
    }

    return user;
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
      const user = getExistingUser(data, username);
      return user.workouts.filter((workout) => !workout.isDeleted);
    },

    async softDeleteWorkout(username: string, workoutId: string): Promise<void> {
      await queueWrite(async () => {
        const data = await readStorage();
        const user = getExistingUser(data, username);
        const workout = user.workouts.find((item) => item.id === workoutId);

        if (!workout) {
          throw new StorageError(`Unknown workout: ${workoutId}`, 'NOT_FOUND');
        }

        workout.isDeleted = true;
        workout.updatedAt = new Date() as Workout['updatedAt'];
        await writeStorage(data);
      });
    },

    async upsertSession(username: string, session: StoredSession): Promise<void> {
      await queueWrite(async () => {
        const data = await readStorage();
        const user = getOrCreateUser(data, username);
        const index = user.sessions.findIndex((item) => item.id === session.id);

        if (index >= 0) {
          user.sessions[index] = session;
        } else {
          user.sessions.push(session);
        }

        await writeStorage(data);
      });
    },

    async getSessions(username: string): Promise<StoredSession[]> {
      const data = await readStorage();
      const user = getExistingUser(data, username);
      return user.sessions;
    },

    async importUserData(
      username: string,
      payload: { workouts: StoredWorkout[]; sessions: StoredSession[] }
    ): Promise<void> {
      await queueWrite(async () => {
        const data = await readStorage();
        const user = getOrCreateUser(data, username);

        if (user.workouts.length > 0 || user.sessions.length > 0) {
          throw new StorageError('IMPORT_CONFLICT', 'IMPORT_CONFLICT');
        }

        user.workouts = payload.workouts;
        user.sessions = payload.sessions;
        await writeStorage(data);
      });
    },
  };
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Workout } from '../domain/workout';

vi.mock('../persistence/sessionRepo', () => ({
  sessionRepo: {
    getAll: vi.fn(),
    getByWorkoutId: vi.fn(),
    getById: vi.fn(),
    save: vi.fn(async () => {}),
  },
}));

vi.mock('../persistence/workoutRepo', () => ({
  workoutRepo: {
    getAll: vi.fn(),
    getById: vi.fn(),
    save: vi.fn(async () => {}),
    softDelete: vi.fn(async () => {}),
    deleteBlock: vi.fn(async () => {}),
  },
}));

import { sessionRepo } from '../persistence/sessionRepo';
import { workoutRepo } from '../persistence/workoutRepo';
import { useSessionStore } from './sessionStore';
import { useWorkoutStore } from './workoutStore';

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function createWorkout(): Workout {
  return {
    id: 'workout-1',
    title: 'Morning Routine',
    blocks: [],
    estimatedDurationSec: 180,
    createdAt: new Date('2026-03-18T08:00:00.000Z'),
    updatedAt: new Date('2026-03-18T08:00:00.000Z'),
    isDeleted: false,
  };
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

describe('useSessionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const workout = createWorkout();

    useSessionStore.setState({
      sessions: [],
      stats: null,
      isLoading: false,
    });

    useWorkoutStore.setState({
      workouts: [workout],
      currentWorkout: workout,
      isLoading: false,
    });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('marks the workout as used when a session starts', async () => {
    const workout = useWorkoutStore.getState().workouts[0];

    const session = await useSessionStore.getState().createSession(workout);
    await Promise.resolve();

    const updatedWorkout = useWorkoutStore.getState().workouts[0];
    const currentWorkout = useWorkoutStore.getState().currentWorkout;

    expect(sessionRepo.save).toHaveBeenCalledWith(session);
    expect(workoutRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: workout.id,
        lastUsedAt: session.startedAt,
      })
    );
    expect(workoutRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        updatedAt: workout.updatedAt,
      })
    );
    expect(updatedWorkout.lastUsedAt?.getTime()).toBe(session.startedAt.getTime());
    expect(currentWorkout?.lastUsedAt?.getTime()).toBe(session.startedAt.getTime());
    expect(updatedWorkout.updatedAt.getTime()).toBe(workout.updatedAt.getTime());
  });

  it('still starts the session if persisting last used metadata fails', async () => {
    const workout = useWorkoutStore.getState().workouts[0];
    vi.mocked(workoutRepo.save).mockRejectedValueOnce(new Error('workout write failed'));

    const session = await useSessionStore.getState().createSession(workout);
    await Promise.resolve();

    expect(sessionRepo.save).toHaveBeenCalledWith(session);
    expect(useSessionStore.getState().sessions).toEqual([session]);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to update workout last used time:',
      expect.any(Error)
    );
  });

  it('can persist last used metadata even when the workout list is not loaded', async () => {
    const workout = createWorkout();

    useWorkoutStore.setState({
      workouts: [],
      currentWorkout: null,
      isLoading: false,
    });

    const session = await useSessionStore.getState().createSession(workout);

    expect(sessionRepo.save).toHaveBeenCalledWith(session);
    expect(workoutRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: workout.id,
        lastUsedAt: session.startedAt,
        updatedAt: workout.updatedAt,
      })
    );
    expect(useSessionStore.getState().sessions).toEqual([session]);
  });

  it('resolves session start before the last-used metadata write finishes', async () => {
    const workout = useWorkoutStore.getState().workouts[0];
    const deferred = createDeferred<void>();
    vi.mocked(workoutRepo.save).mockImplementationOnce(() => deferred.promise);

    const createSessionPromise = useSessionStore.getState().createSession(workout);
    let resolved = false;
    void createSessionPromise.then(() => {
      resolved = true;
    });

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(resolved).toBe(true);

    deferred.resolve(undefined);
    await createSessionPromise;
  });
});

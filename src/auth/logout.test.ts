import { beforeEach, describe, expect, it, vi } from 'vitest';
import { performLogout } from './logout';
import { useAuthStore } from '../stores/authStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useSessionStore } from '../stores/sessionStore';
import { useTimerStore } from '../stores/timerStore';

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage());

  useAuthStore.setState({
    username: 'alice',
    isAuthenticated: true,
    isLoading: false,
    error: null,
  });
  useWorkoutStore.setState({
    workouts: [
      {
        id: 'workout-1',
        title: 'Morning Routine',
        blocks: [],
        estimatedDurationSec: 300,
        createdAt: new Date('2026-03-18T08:00:00.000Z'),
        updatedAt: new Date('2026-03-18T08:00:00.000Z'),
        isDeleted: false,
      },
    ],
    currentWorkout: null,
    isLoading: false,
  });
  useSessionStore.setState({
    sessions: [
      {
        id: 'session-1',
        workoutId: 'workout-1',
        workoutSnapshotTitle: 'Morning Routine',
        startedAt: new Date('2026-03-18T08:00:00.000Z'),
        endedAt: new Date('2026-03-18T08:05:00.000Z'),
        elapsedDurationSec: 300,
        status: 'completed',
        completedBlocks: 1,
        completedRepeats: 1,
        totalBlocks: 1,
        totalRepeats: 1,
      },
    ],
    stats: {
      totalWorkoutsCreated: 1,
      totalSessionsCompleted: 1,
      totalMinutesCompleted: 5,
      mostUsedWorkout: { id: 'workout-1', title: 'Morning Routine', count: 1 },
      averageSessionLengthMin: 5,
      completionRate: 1,
    },
    isLoading: false,
  });
  useTimerStore.setState({
    state: {
      phase: 'exercise',
      remainingSec: 20,
      currentBlockIndex: 0,
      currentRepeat: 1,
      currentPhaseIndex: 0,
      isPaused: false,
      isRunning: true,
    },
    sequence: {
      phases: [],
      totalDurationSec: 0,
    },
    sessionId: 'session-1',
    workout: {
      id: 'workout-1',
      title: 'Morning Routine',
      blocks: [],
      estimatedDurationSec: 300,
      createdAt: new Date('2026-03-18T08:00:00.000Z'),
      updatedAt: new Date('2026-03-18T08:00:00.000Z'),
      isDeleted: false,
    },
    isCompleting: false,
  });

  localStorage.setItem('workout-timer.username', 'alice');
  localStorage.setItem(
    'workout-timer.migration',
    JSON.stringify({ claimedUsername: 'alice', status: 'pending' })
  );
});

describe('performLogout', () => {
  it('clears auth, local app state, and migration keys', () => {
    performLogout();

    expect(useAuthStore.getState().username).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useWorkoutStore.getState().workouts).toEqual([]);
    expect(useWorkoutStore.getState().currentWorkout).toBeNull();
    expect(useSessionStore.getState().sessions).toEqual([]);
    expect(useSessionStore.getState().stats).toBeNull();
    expect(useTimerStore.getState().state).toBeNull();
    expect(localStorage.getItem('workout-timer.username')).toBeNull();
    expect(localStorage.getItem('workout-timer.migration')).toBeNull();
  });
});

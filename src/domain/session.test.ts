import { describe, it, expect } from 'vitest';
import {
  createSession,
  completeSession,
  abandonSession,
  computeStats,
} from './session';
import type { WorkoutSession } from './session';
import type { Workout, ExerciseBlock } from './workout';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'workout-1',
    title: 'Test Workout',
    blocks: [],
    estimatedDurationSec: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    isDeleted: false,
    ...overrides,
  };
}

function createTestBlock(overrides: Partial<ExerciseBlock> = {}): ExerciseBlock {
  return {
    id: 'block-1',
    workoutId: 'workout-1',
    order: 0,
    name: 'Push-ups',
    exerciseDurationSec: 30,
    restDurationSec: 10,
    repeatCount: 1,
    ...overrides,
  };
}

function createTestSession(overrides: Partial<WorkoutSession> = {}): WorkoutSession {
  return {
    id: 'session-1',
    workoutId: 'workout-1',
    workoutSnapshotTitle: 'Test Workout',
    startedAt: new Date('2024-01-01T10:00:00'),
    elapsedDurationSec: 0,
    status: 'in_progress',
    completedBlocks: 0,
    completedRepeats: 0,
    totalBlocks: 2,
    totalRepeats: 4,
    ...overrides,
  };
}

// ============================================================================
// createSession Tests
// ============================================================================

describe('createSession', () => {
  it('creates a session with correct initial values', () => {
    const workout = createTestWorkout({
      id: 'w-123',
      title: 'Morning Routine',
      blocks: [
        createTestBlock({ repeatCount: 2 }),
        createTestBlock({ id: 'block-2', repeatCount: 3 }),
      ],
    });

    const session = createSession(workout);

    expect(session.id).toBeDefined();
    expect(session.id.length).toBeGreaterThan(0);
    expect(session.workoutId).toBe('w-123');
    expect(session.workoutSnapshotTitle).toBe('Morning Routine');
    expect(session.startedAt).toBeInstanceOf(Date);
    expect(session.endedAt).toBeUndefined();
    expect(session.elapsedDurationSec).toBe(0);
    expect(session.status).toBe('in_progress');
    expect(session.completedBlocks).toBe(0);
    expect(session.completedRepeats).toBe(0);
    expect(session.totalBlocks).toBe(2);
    expect(session.totalRepeats).toBe(5); // 2 + 3
  });

  it('generates unique session IDs', () => {
    const workout = createTestWorkout();
    const session1 = createSession(workout);
    const session2 = createSession(workout);

    expect(session1.id).not.toBe(session2.id);
  });

  it('handles workout with no blocks', () => {
    const workout = createTestWorkout({ blocks: [] });
    const session = createSession(workout);

    expect(session.totalBlocks).toBe(0);
    expect(session.totalRepeats).toBe(0);
  });

  it('snapshots workout title at creation time', () => {
    const workout = createTestWorkout({ title: 'Original Title' });
    const session = createSession(workout);

    // Even if workout title changes later, session keeps the snapshot
    expect(session.workoutSnapshotTitle).toBe('Original Title');
  });
});

// ============================================================================
// completeSession Tests
// ============================================================================

describe('completeSession', () => {
  it('marks session as completed with progress', () => {
    const session = createTestSession({
      totalBlocks: 3,
      totalRepeats: 6,
    });

    const completed = completeSession(session, 3, 6);

    expect(completed.status).toBe('completed');
    expect(completed.completedBlocks).toBe(3);
    expect(completed.completedRepeats).toBe(6);
    expect(completed.endedAt).toBeInstanceOf(Date);
  });

  it('preserves original session data', () => {
    const session = createTestSession({
      workoutId: 'w-123',
      workoutSnapshotTitle: 'My Workout',
      startedAt: new Date('2024-01-01T10:00:00'),
    });

    const completed = completeSession(session, 2, 4);

    expect(completed.workoutId).toBe('w-123');
    expect(completed.workoutSnapshotTitle).toBe('My Workout');
    expect(completed.startedAt).toEqual(new Date('2024-01-01T10:00:00'));
  });

  it('does not mutate original session', () => {
    const session = createTestSession();
    const completed = completeSession(session, 2, 4);

    expect(session.status).toBe('in_progress');
    expect(session.completedBlocks).toBe(0);
    expect(completed.status).toBe('completed');
  });

  it('updates elapsed duration when provided', () => {
    const session = createTestSession({ elapsedDurationSec: 100 });
    const completed = completeSession(session, 2, 4, 300);

    expect(completed.elapsedDurationSec).toBe(300);
  });

  it('keeps existing elapsed duration when not provided', () => {
    const session = createTestSession({ elapsedDurationSec: 150 });
    const completed = completeSession(session, 2, 4);

    expect(completed.elapsedDurationSec).toBe(150);
  });
});

// ============================================================================
// abandonSession Tests
// ============================================================================

describe('abandonSession', () => {
  it('marks session as abandoned with progress', () => {
    const session = createTestSession({
      totalBlocks: 3,
      totalRepeats: 6,
    });

    const abandoned = abandonSession(session, 1, 2);

    expect(abandoned.status).toBe('abandoned');
    expect(abandoned.completedBlocks).toBe(1);
    expect(abandoned.completedRepeats).toBe(2);
    expect(abandoned.endedAt).toBeInstanceOf(Date);
  });

  it('preserves original session data', () => {
    const session = createTestSession({
      workoutId: 'w-456',
      workoutSnapshotTitle: 'Evening Routine',
    });

    const abandoned = abandonSession(session, 1, 2);

    expect(abandoned.workoutId).toBe('w-456');
    expect(abandoned.workoutSnapshotTitle).toBe('Evening Routine');
  });

  it('does not mutate original session', () => {
    const session = createTestSession();
    const abandoned = abandonSession(session, 1, 2);

    expect(session.status).toBe('in_progress');
    expect(abandoned.status).toBe('abandoned');
  });

  it('updates elapsed duration when provided', () => {
    const session = createTestSession({ elapsedDurationSec: 50 });
    const abandoned = abandonSession(session, 1, 2, 120);

    expect(abandoned.elapsedDurationSec).toBe(120);
  });

  it('keeps existing elapsed duration when not provided', () => {
    const session = createTestSession({ elapsedDurationSec: 75 });
    const abandoned = abandonSession(session, 1, 2);

    expect(abandoned.elapsedDurationSec).toBe(75);
  });
});

// ============================================================================
// computeStats Tests
// ============================================================================

describe('computeStats', () => {
  describe('totalWorkoutsCreated', () => {
    it('counts non-deleted workouts', () => {
      const workouts = [
        createTestWorkout({ id: 'w1', isDeleted: false }),
        createTestWorkout({ id: 'w2', isDeleted: false }),
        createTestWorkout({ id: 'w3', isDeleted: true }),
      ];

      const stats = computeStats([], workouts);

      expect(stats.totalWorkoutsCreated).toBe(2);
    });

    it('returns 0 when all workouts are deleted', () => {
      const workouts = [
        createTestWorkout({ id: 'w1', isDeleted: true }),
        createTestWorkout({ id: 'w2', isDeleted: true }),
      ];

      const stats = computeStats([], workouts);

      expect(stats.totalWorkoutsCreated).toBe(0);
    });

    it('returns 0 for empty workouts array', () => {
      const stats = computeStats([], []);

      expect(stats.totalWorkoutsCreated).toBe(0);
    });
  });

  describe('totalSessionsCompleted', () => {
    it('counts only completed sessions', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'completed' }),
        createTestSession({ id: 's2', status: 'completed' }),
        createTestSession({ id: 's3', status: 'abandoned' }),
        createTestSession({ id: 's4', status: 'in_progress' }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.totalSessionsCompleted).toBe(2);
    });

    it('returns 0 when no sessions are completed', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'abandoned' }),
        createTestSession({ id: 's2', status: 'in_progress' }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.totalSessionsCompleted).toBe(0);
    });
  });

  describe('totalMinutesCompleted', () => {
    it('sums elapsed duration of completed sessions in minutes', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'completed', elapsedDurationSec: 120 }), // 2 min
        createTestSession({ id: 's2', status: 'completed', elapsedDurationSec: 180 }), // 3 min
        createTestSession({ id: 's3', status: 'abandoned', elapsedDurationSec: 60 }), // not counted
      ];

      const stats = computeStats(sessions, []);

      expect(stats.totalMinutesCompleted).toBe(5);
    });

    it('rounds to nearest minute', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'completed', elapsedDurationSec: 90 }), // 1.5 min
      ];

      const stats = computeStats(sessions, []);

      expect(stats.totalMinutesCompleted).toBe(2); // rounds up
    });

    it('returns 0 when no completed sessions', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'abandoned', elapsedDurationSec: 300 }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.totalMinutesCompleted).toBe(0);
    });
  });

  describe('averageSessionLengthMin', () => {
    it('calculates average of completed sessions', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'completed', elapsedDurationSec: 300 }), // 5 min
        createTestSession({ id: 's2', status: 'completed', elapsedDurationSec: 600 }), // 10 min
        createTestSession({ id: 's3', status: 'abandoned', elapsedDurationSec: 60 }), // not counted
      ];

      const stats = computeStats(sessions, []);

      expect(stats.averageSessionLengthMin).toBe(7.5); // (5 + 10) / 2
    });

    it('returns 0 when no completed sessions', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'abandoned' }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.averageSessionLengthMin).toBe(0);
    });

    it('rounds to one decimal place', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'completed', elapsedDurationSec: 100 }), // 1.67 min
        createTestSession({ id: 's2', status: 'completed', elapsedDurationSec: 200 }), // 3.33 min
      ];

      const stats = computeStats(sessions, []);

      // (100 + 200) / 2 / 60 = 2.5
      expect(stats.averageSessionLengthMin).toBe(2.5);
    });
  });

  describe('completionRate', () => {
    it('calculates ratio of completed to total sessions', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'completed' }),
        createTestSession({ id: 's2', status: 'completed' }),
        createTestSession({ id: 's3', status: 'abandoned' }),
        createTestSession({ id: 's4', status: 'in_progress' }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.completionRate).toBe(0.5); // 2/4
    });

    it('returns 0 when no sessions', () => {
      const stats = computeStats([], []);

      expect(stats.completionRate).toBe(0);
    });

    it('returns 1 when all sessions completed', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'completed' }),
        createTestSession({ id: 's2', status: 'completed' }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.completionRate).toBe(1);
    });

    it('rounds to two decimal places', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'completed' }),
        createTestSession({ id: 's2', status: 'abandoned' }),
        createTestSession({ id: 's3', status: 'abandoned' }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.completionRate).toBe(0.33); // 1/3 rounded
    });
  });

  describe('mostUsedWorkout', () => {
    it('finds workout with most completed sessions', () => {
      const sessions = [
        createTestSession({ id: 's1', workoutId: 'w1', workoutSnapshotTitle: 'Workout A', status: 'completed' }),
        createTestSession({ id: 's2', workoutId: 'w1', workoutSnapshotTitle: 'Workout A', status: 'completed' }),
        createTestSession({ id: 's3', workoutId: 'w2', workoutSnapshotTitle: 'Workout B', status: 'completed' }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.mostUsedWorkout).toEqual({
        id: 'w1',
        title: 'Workout A',
        count: 2,
      });
    });

    it('returns null when no completed sessions', () => {
      const sessions = [
        createTestSession({ id: 's1', status: 'abandoned' }),
        createTestSession({ id: 's2', status: 'in_progress' }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.mostUsedWorkout).toBeNull();
    });

    it('returns null for empty sessions array', () => {
      const stats = computeStats([], []);

      expect(stats.mostUsedWorkout).toBeNull();
    });

    it('uses snapshot title from session, not current workout title', () => {
      const sessions = [
        createTestSession({
          id: 's1',
          workoutId: 'w1',
          workoutSnapshotTitle: 'Old Title',
          status: 'completed',
        }),
      ];
      const workouts = [
        createTestWorkout({ id: 'w1', title: 'New Title' }),
      ];

      const stats = computeStats(sessions, workouts);

      expect(stats.mostUsedWorkout?.title).toBe('Old Title');
    });

    it('ignores abandoned sessions when finding most used', () => {
      const sessions = [
        createTestSession({ id: 's1', workoutId: 'w1', workoutSnapshotTitle: 'Workout A', status: 'abandoned' }),
        createTestSession({ id: 's2', workoutId: 'w1', workoutSnapshotTitle: 'Workout A', status: 'abandoned' }),
        createTestSession({ id: 's3', workoutId: 'w2', workoutSnapshotTitle: 'Workout B', status: 'completed' }),
      ];

      const stats = computeStats(sessions, []);

      expect(stats.mostUsedWorkout).toEqual({
        id: 'w2',
        title: 'Workout B',
        count: 1,
      });
    });
  });

  describe('full stats calculation', () => {
    it('calculates all stats correctly for realistic data', () => {
      const workouts = [
        createTestWorkout({ id: 'w1', title: 'Morning Routine', isDeleted: false }),
        createTestWorkout({ id: 'w2', title: 'Evening Stretch', isDeleted: false }),
        createTestWorkout({ id: 'w3', title: 'Deleted Workout', isDeleted: true }),
      ];

      const sessions = [
        createTestSession({
          id: 's1',
          workoutId: 'w1',
          workoutSnapshotTitle: 'Morning Routine',
          status: 'completed',
          elapsedDurationSec: 600, // 10 min
        }),
        createTestSession({
          id: 's2',
          workoutId: 'w1',
          workoutSnapshotTitle: 'Morning Routine',
          status: 'completed',
          elapsedDurationSec: 720, // 12 min
        }),
        createTestSession({
          id: 's3',
          workoutId: 'w2',
          workoutSnapshotTitle: 'Evening Stretch',
          status: 'completed',
          elapsedDurationSec: 300, // 5 min
        }),
        createTestSession({
          id: 's4',
          workoutId: 'w1',
          workoutSnapshotTitle: 'Morning Routine',
          status: 'abandoned',
          elapsedDurationSec: 180,
        }),
      ];

      const stats = computeStats(sessions, workouts);

      expect(stats.totalWorkoutsCreated).toBe(2);
      expect(stats.totalSessionsCompleted).toBe(3);
      expect(stats.totalMinutesCompleted).toBe(27); // (600 + 720 + 300) / 60 = 27
      expect(stats.mostUsedWorkout).toEqual({
        id: 'w1',
        title: 'Morning Routine',
        count: 2,
      });
      expect(stats.averageSessionLengthMin).toBe(9); // (600 + 720 + 300) / 3 / 60 = 9
      expect(stats.completionRate).toBe(0.75); // 3/4
    });
  });
});

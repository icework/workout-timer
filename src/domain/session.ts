import { v4 as uuidv4 } from 'uuid';
import type { Workout } from './workout';

// ============================================================================
// Types
// ============================================================================

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutSnapshotTitle: string; // frozen at session start
  startedAt: Date;
  endedAt?: Date;
  elapsedDurationSec: number;
  status: SessionStatus;
  completedBlocks: number;
  completedRepeats: number;
  totalBlocks: number; // snapshot for stats
  totalRepeats: number; // snapshot for stats
}

export interface ComputedStats {
  totalWorkoutsCreated: number;
  totalSessionsCompleted: number;
  totalMinutesCompleted: number;
  mostUsedWorkout: { id: string; title: string; count: number } | null;
  averageSessionLengthMin: number;
  completionRate: number; // completed / total started
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates total repeats across all blocks in a workout.
 */
function calculateTotalRepeats(workout: Workout): number {
  return workout.blocks.reduce((sum, block) => sum + block.repeatCount, 0);
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new workout session.
 * Snapshots the workout title and totals at session start.
 */
export function createSession(workout: Workout): WorkoutSession {
  return {
    id: uuidv4(),
    workoutId: workout.id,
    workoutSnapshotTitle: workout.title,
    startedAt: new Date(),
    elapsedDurationSec: 0,
    status: 'in_progress',
    completedBlocks: 0,
    completedRepeats: 0,
    totalBlocks: workout.blocks.length,
    totalRepeats: calculateTotalRepeats(workout),
  };
}

// ============================================================================
// Session State Transitions
// ============================================================================

/**
 * Marks a session as completed.
 * Records the final progress and end time.
 */
export function completeSession(
  session: WorkoutSession,
  completedBlocks: number,
  completedRepeats: number,
  elapsedDurationSec?: number
): WorkoutSession {
  return {
    ...session,
    status: 'completed',
    endedAt: new Date(),
    completedBlocks,
    completedRepeats,
    elapsedDurationSec: elapsedDurationSec ?? session.elapsedDurationSec,
  };
}

/**
 * Marks a session as abandoned.
 * Records the progress at the time of abandonment.
 */
export function abandonSession(
  session: WorkoutSession,
  completedBlocks: number,
  completedRepeats: number,
  elapsedDurationSec?: number
): WorkoutSession {
  return {
    ...session,
    status: 'abandoned',
    endedAt: new Date(),
    completedBlocks,
    completedRepeats,
    elapsedDurationSec: elapsedDurationSec ?? session.elapsedDurationSec,
  };
}

// ============================================================================
// Stats Calculation
// ============================================================================

/**
 * Computes aggregate statistics from sessions and workouts.
 *
 * - totalWorkoutsCreated: count of non-deleted workouts
 * - totalSessionsCompleted: count of sessions with status 'completed'
 * - totalMinutesCompleted: sum of elapsedDurationSec for completed sessions, in minutes
 * - mostUsedWorkout: workout with most completed sessions (null if none)
 * - averageSessionLengthMin: average duration of completed sessions in minutes
 * - completionRate: completed sessions / total sessions (0 if no sessions)
 */
export function computeStats(
  sessions: WorkoutSession[],
  workouts: Workout[]
): ComputedStats {
  // Count non-deleted workouts
  const totalWorkoutsCreated = workouts.filter((w) => !w.isDeleted).length;

  // Filter completed sessions
  const completedSessions = sessions.filter((s) => s.status === 'completed');
  const totalSessionsCompleted = completedSessions.length;

  // Calculate total minutes completed
  const totalSecondsCompleted = completedSessions.reduce(
    (sum, s) => sum + s.elapsedDurationSec,
    0
  );
  const totalMinutesCompleted = Math.round(totalSecondsCompleted / 60);

  // Calculate average session length
  const averageSessionLengthMin =
    totalSessionsCompleted > 0
      ? Math.round((totalSecondsCompleted / totalSessionsCompleted / 60) * 10) / 10
      : 0;

  // Calculate completion rate
  const totalSessions = sessions.length;
  const completionRate =
    totalSessions > 0
      ? Math.round((totalSessionsCompleted / totalSessions) * 100) / 100
      : 0;

  // Find most used workout (by completed sessions)
  const workoutUsageMap = new Map<string, { title: string; count: number }>();

  for (const session of completedSessions) {
    const existing = workoutUsageMap.get(session.workoutId);
    if (existing) {
      existing.count++;
    } else {
      workoutUsageMap.set(session.workoutId, {
        title: session.workoutSnapshotTitle,
        count: 1,
      });
    }
  }

  let mostUsedWorkout: ComputedStats['mostUsedWorkout'] = null;
  let maxCount = 0;

  for (const [id, data] of workoutUsageMap) {
    if (data.count > maxCount) {
      maxCount = data.count;
      mostUsedWorkout = { id, title: data.title, count: data.count };
    }
  }

  return {
    totalWorkoutsCreated,
    totalSessionsCompleted,
    totalMinutesCompleted,
    mostUsedWorkout,
    averageSessionLengthMin,
    completionRate,
  };
}

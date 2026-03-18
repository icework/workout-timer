import { describe, expect, it } from 'vitest';
import { deserializeWorkout, deserializeSession } from './serializers';

describe('deserializeWorkout', () => {
  it('deserializes workout dates from the api response', () => {
    const workout = deserializeWorkout({
      id: 'workout-1',
      title: 'Morning Routine',
      blocks: [],
      estimatedDurationSec: 300,
      createdAt: '2026-03-18T08:00:00.000Z',
      updatedAt: '2026-03-18T08:05:00.000Z',
      lastUsedAt: '2026-03-18T08:10:00.000Z',
      isDeleted: false,
    });

    expect(workout.createdAt).toBeInstanceOf(Date);
    expect(workout.updatedAt).toBeInstanceOf(Date);
    expect(workout.lastUsedAt).toBeInstanceOf(Date);
  });
});

describe('deserializeSession', () => {
  it('deserializes session dates from the api response', () => {
    const session = deserializeSession({
      id: 'session-1',
      workoutId: 'workout-1',
      workoutSnapshotTitle: 'Morning Routine',
      startedAt: '2026-03-18T08:00:00.000Z',
      endedAt: '2026-03-18T08:10:00.000Z',
      elapsedDurationSec: 600,
      status: 'completed',
      completedBlocks: 4,
      completedRepeats: 8,
      totalBlocks: 4,
      totalRepeats: 8,
    });

    expect(session.startedAt).toBeInstanceOf(Date);
    expect(session.endedAt).toBeInstanceOf(Date);
  });
});

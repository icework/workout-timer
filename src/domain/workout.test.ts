import { describe, it, expect } from 'vitest';
import {
  calculateWorkoutDuration,
  validateBlock,
  validateWorkout,
  createWorkout,
  createBlock,
  updateWorkoutDuration,
} from './workout';
import type { ExerciseBlock, Workout } from './workout';

describe('calculateWorkoutDuration', () => {
  it('returns 0 for empty blocks array', () => {
    expect(calculateWorkoutDuration([])).toBe(0);
  });

  it('calculates duration for single block with 1 repeat', () => {
    const blocks: ExerciseBlock[] = [
      {
        id: '1',
        workoutId: 'w1',
        order: 0,
        name: 'Push-ups',
        exerciseDurationSec: 30,
        restDurationSec: 10,
        repeatCount: 1,
      },
    ];
    // Single block, single repeat: no trailing rest
    expect(calculateWorkoutDuration(blocks)).toBe(30);
  });

  it('calculates duration for single block with multiple repeats', () => {
    const blocks: ExerciseBlock[] = [
      {
        id: '1',
        workoutId: 'w1',
        order: 0,
        name: 'Push-ups',
        exerciseDurationSec: 30,
        restDurationSec: 10,
        repeatCount: 3,
      },
    ];
    // 3 repeats: (30+10) + (30+10) + 30 = 110
    expect(calculateWorkoutDuration(blocks)).toBe(110);
  });

  it('calculates duration for multiple blocks', () => {
    const blocks: ExerciseBlock[] = [
      {
        id: '1',
        workoutId: 'w1',
        order: 0,
        name: 'Push-ups',
        exerciseDurationSec: 30,
        restDurationSec: 10,
        repeatCount: 2,
      },
      {
        id: '2',
        workoutId: 'w1',
        order: 1,
        name: 'Squats',
        exerciseDurationSec: 45,
        restDurationSec: 15,
        repeatCount: 1,
      },
    ];
    // Block 1: (30+10) + (30+10) = 80
    // Block 2: 45 (no trailing rest)
    // Total: 125
    expect(calculateWorkoutDuration(blocks)).toBe(125);
  });

  it('handles blocks with zero rest duration', () => {
    const blocks: ExerciseBlock[] = [
      {
        id: '1',
        workoutId: 'w1',
        order: 0,
        name: 'Push-ups',
        exerciseDurationSec: 30,
        restDurationSec: 0,
        repeatCount: 2,
      },
    ];
    // (30+0) + 30 = 60
    expect(calculateWorkoutDuration(blocks)).toBe(60);
  });

  it('matches the spec example', () => {
    // From spec:
    // Block 1: 30s exercise, 10s rest, repeat 2x
    // Block 2: 45s exercise, 0s rest, repeat 1x
    // [exercise-30s] → [rest-10s] → [exercise-30s] → [rest-10s] → [exercise-45s]
    const blocks: ExerciseBlock[] = [
      {
        id: '1',
        workoutId: 'w1',
        order: 0,
        name: 'Block 1',
        exerciseDurationSec: 30,
        restDurationSec: 10,
        repeatCount: 2,
      },
      {
        id: '2',
        workoutId: 'w1',
        order: 1,
        name: 'Block 2',
        exerciseDurationSec: 45,
        restDurationSec: 0,
        repeatCount: 1,
      },
    ];
    // (30+10) + (30+10) + 45 = 125
    expect(calculateWorkoutDuration(blocks)).toBe(125);
  });
});

describe('validateBlock', () => {
  it('validates a valid block', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 30,
      restDurationSec: 10,
      repeatCount: 3,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('requires name', () => {
    const result = validateBlock({
      exerciseDurationSec: 30,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'name',
      message: 'Name is required',
    });
  });

  it('rejects empty name', () => {
    const result = validateBlock({
      name: '   ',
      exerciseDurationSec: 30,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'name',
      message: 'Name cannot be empty',
    });
  });

  it('rejects name over 100 characters', () => {
    const result = validateBlock({
      name: 'a'.repeat(101),
      exerciseDurationSec: 30,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'name',
      message: 'Name must be 100 characters or less',
    });
  });

  it('requires exerciseDurationSec', () => {
    const result = validateBlock({
      name: 'Push-ups',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'exerciseDurationSec',
      message: 'Exercise duration is required',
    });
  });

  it('rejects exerciseDurationSec <= 0', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'exerciseDurationSec',
      message: 'Exercise duration must be greater than 0',
    });
  });

  it('rejects exerciseDurationSec > 3600', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 3601,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'exerciseDurationSec',
      message: 'Exercise duration must be 1 hour or less',
    });
  });

  it('rejects non-integer exerciseDurationSec', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 30.5,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'exerciseDurationSec',
      message: 'Exercise duration must be a whole number',
    });
  });

  it('rejects negative restDurationSec', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 30,
      restDurationSec: -5,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'restDurationSec',
      message: 'Rest duration cannot be negative',
    });
  });

  it('allows zero restDurationSec', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 30,
      restDurationSec: 0,
    });
    expect(result.valid).toBe(true);
  });

  it('rejects repeatCount < 1', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 30,
      repeatCount: 0,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'repeatCount',
      message: 'Repeat count must be at least 1',
    });
  });

  it('rejects repeatCount > 100', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 30,
      repeatCount: 101,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'repeatCount',
      message: 'Repeat count must be 100 or less',
    });
  });

  it('rejects negative order', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 30,
      order: -1,
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'order',
      message: 'Order cannot be negative',
    });
  });

  it('rejects notes over 500 characters', () => {
    const result = validateBlock({
      name: 'Push-ups',
      exerciseDurationSec: 30,
      notes: 'a'.repeat(501),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'notes',
      message: 'Notes must be 500 characters or less',
    });
  });
});

describe('validateWorkout', () => {
  it('validates a valid workout', () => {
    const result = validateWorkout({
      title: 'Morning Routine',
      description: 'A quick morning workout',
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('requires title', () => {
    const result = validateWorkout({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'title',
      message: 'Title is required',
    });
  });

  it('rejects empty title', () => {
    const result = validateWorkout({
      title: '   ',
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'title',
      message: 'Title cannot be empty',
    });
  });

  it('rejects title over 100 characters', () => {
    const result = validateWorkout({
      title: 'a'.repeat(101),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'title',
      message: 'Title must be 100 characters or less',
    });
  });

  it('rejects description over 500 characters', () => {
    const result = validateWorkout({
      title: 'Test',
      description: 'a'.repeat(501),
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'description',
      message: 'Description must be 500 characters or less',
    });
  });

  it('validates blocks within workout', () => {
    const result = validateWorkout({
      title: 'Test',
      blocks: [
        {
          id: '1',
          workoutId: 'w1',
          order: 0,
          name: '',
          exerciseDurationSec: 30,
          restDurationSec: 10,
          repeatCount: 1,
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'blocks[0].name',
      message: 'Name cannot be empty',
    });
  });

  it('validates multiple blocks with errors', () => {
    const result = validateWorkout({
      title: 'Test',
      blocks: [
        {
          id: '1',
          workoutId: 'w1',
          order: 0,
          name: 'Valid',
          exerciseDurationSec: 30,
          restDurationSec: 10,
          repeatCount: 1,
        },
        {
          id: '2',
          workoutId: 'w1',
          order: 1,
          name: '',
          exerciseDurationSec: -5,
          restDurationSec: 10,
          repeatCount: 1,
        },
      ],
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.field.startsWith('blocks[1]'))).toBe(true);
  });
});

describe('createWorkout', () => {
  it('creates a workout with default values', () => {
    const workout = createWorkout('Morning Routine');

    expect(workout.title).toBe('Morning Routine');
    expect(workout.id).toBeDefined();
    expect(workout.id.length).toBeGreaterThan(0);
    expect(workout.blocks).toEqual([]);
    expect(workout.estimatedDurationSec).toBe(0);
    expect(workout.createdAt).toBeInstanceOf(Date);
    expect(workout.updatedAt).toBeInstanceOf(Date);
    expect(workout.isDeleted).toBe(false);
    expect(workout.description).toBeUndefined();
    expect(workout.lastUsedAt).toBeUndefined();
  });

  it('trims the title', () => {
    const workout = createWorkout('  Morning Routine  ');
    expect(workout.title).toBe('Morning Routine');
  });

  it('generates unique IDs', () => {
    const workout1 = createWorkout('Workout 1');
    const workout2 = createWorkout('Workout 2');
    expect(workout1.id).not.toBe(workout2.id);
  });
});

describe('createBlock', () => {
  it('creates a block with default values', () => {
    const block = createBlock('workout-123', 'Push-ups', 30);

    expect(block.workoutId).toBe('workout-123');
    expect(block.name).toBe('Push-ups');
    expect(block.exerciseDurationSec).toBe(30);
    expect(block.id).toBeDefined();
    expect(block.id.length).toBeGreaterThan(0);
    expect(block.order).toBe(0);
    expect(block.restDurationSec).toBe(0);
    expect(block.repeatCount).toBe(1);
    expect(block.notes).toBeUndefined();
    expect(block.imageUrl).toBeUndefined();
  });

  it('trims the name', () => {
    const block = createBlock('w1', '  Push-ups  ', 30);
    expect(block.name).toBe('Push-ups');
  });

  it('generates unique IDs', () => {
    const block1 = createBlock('w1', 'Block 1', 30);
    const block2 = createBlock('w1', 'Block 2', 30);
    expect(block1.id).not.toBe(block2.id);
  });
});

describe('updateWorkoutDuration', () => {
  it('updates estimatedDurationSec based on blocks', () => {
    const workout: Workout = {
      id: 'w1',
      title: 'Test',
      blocks: [
        {
          id: '1',
          workoutId: 'w1',
          order: 0,
          name: 'Push-ups',
          exerciseDurationSec: 30,
          restDurationSec: 10,
          repeatCount: 2,
        },
      ],
      estimatedDurationSec: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      isDeleted: false,
    };

    const updated = updateWorkoutDuration(workout);

    // (30+10) + 30 = 70
    expect(updated.estimatedDurationSec).toBe(70);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(workout.updatedAt.getTime());
  });

  it('does not mutate the original workout', () => {
    const workout: Workout = {
      id: 'w1',
      title: 'Test',
      blocks: [],
      estimatedDurationSec: 100,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      isDeleted: false,
    };

    const updated = updateWorkoutDuration(workout);

    expect(workout.estimatedDurationSec).toBe(100);
    expect(updated.estimatedDurationSec).toBe(0);
  });
});

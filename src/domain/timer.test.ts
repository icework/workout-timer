import { describe, it, expect } from 'vitest';
import type { Workout, ExerciseBlock } from './workout';
import {
  buildSequence,
  createInitialTimerState,
  tick,
  skip,
  goBack,
  pause,
  resume,
  getCurrentPhase,
  getNextPhase,
  getElapsedTime,
  getProgress,
  getCompletionStats,
} from './timer';
import type { TimerSequence, TimerState } from './timer';

// ============================================================================
// Test Helpers
// ============================================================================

function createTestWorkout(blocks: Partial<ExerciseBlock>[]): Workout {
  return {
    id: 'test-workout',
    title: 'Test Workout',
    blocks: blocks.map((b, i) => ({
      id: `block-${i}`,
      workoutId: 'test-workout',
      order: i,
      name: b.name ?? `Block ${i + 1}`,
      exerciseDurationSec: b.exerciseDurationSec ?? 30,
      restDurationSec: b.restDurationSec ?? 10,
      repeatCount: b.repeatCount ?? 1,
    })),
    estimatedDurationSec: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };
}

// ============================================================================
// buildSequence Tests
// ============================================================================

describe('buildSequence', () => {
  it('returns empty sequence for workout with no blocks', () => {
    const workout = createTestWorkout([]);
    const sequence = buildSequence(workout);

    expect(sequence.phases).toHaveLength(0);
    expect(sequence.totalDurationSec).toBe(0);
  });

  it('builds sequence for single block with 1 repeat', () => {
    const workout = createTestWorkout([
      { name: 'Push-ups', exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);

    // Single block, single repeat: just exercise, no trailing rest
    expect(sequence.phases).toHaveLength(1);
    expect(sequence.phases[0]).toEqual({
      type: 'exercise',
      blockIndex: 0,
      blockName: 'Push-ups',
      repeat: 1,
      durationSec: 30,
    });
    expect(sequence.totalDurationSec).toBe(30);
  });

  it('builds sequence for single block with multiple repeats', () => {
    const workout = createTestWorkout([
      { name: 'Push-ups', exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 3 },
    ]);
    const sequence = buildSequence(workout);

    // 3 repeats: exercise, rest, exercise, rest, exercise (no trailing rest)
    expect(sequence.phases).toHaveLength(5);
    expect(sequence.phases[0]).toMatchObject({ type: 'exercise', repeat: 1 });
    expect(sequence.phases[1]).toMatchObject({ type: 'rest', repeat: 1 });
    expect(sequence.phases[2]).toMatchObject({ type: 'exercise', repeat: 2 });
    expect(sequence.phases[3]).toMatchObject({ type: 'rest', repeat: 2 });
    expect(sequence.phases[4]).toMatchObject({ type: 'exercise', repeat: 3 });
    // (30+10) + (30+10) + 30 = 110
    expect(sequence.totalDurationSec).toBe(110);
  });

  it('builds sequence matching the spec example', () => {
    // From spec:
    // Block 1: 30s exercise, 10s rest, repeat 2x
    // Block 2: 45s exercise, 0s rest, repeat 1x
    // [exercise-30s] → [rest-10s] → [exercise-30s] → [rest-10s] → [exercise-45s]
    const workout = createTestWorkout([
      { name: 'Block 1', exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 2 },
      { name: 'Block 2', exerciseDurationSec: 45, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);

    expect(sequence.phases).toHaveLength(5);
    expect(sequence.phases[0]).toEqual({
      type: 'exercise',
      blockIndex: 0,
      blockName: 'Block 1',
      repeat: 1,
      durationSec: 30,
    });
    expect(sequence.phases[1]).toEqual({
      type: 'rest',
      blockIndex: 0,
      blockName: 'Block 1',
      repeat: 1,
      durationSec: 10,
    });
    expect(sequence.phases[2]).toEqual({
      type: 'exercise',
      blockIndex: 0,
      blockName: 'Block 1',
      repeat: 2,
      durationSec: 30,
    });
    expect(sequence.phases[3]).toEqual({
      type: 'rest',
      blockIndex: 0,
      blockName: 'Block 1',
      repeat: 2,
      durationSec: 10,
    });
    expect(sequence.phases[4]).toEqual({
      type: 'exercise',
      blockIndex: 1,
      blockName: 'Block 2',
      repeat: 1,
      durationSec: 45,
    });
    // (30+10) + (30+10) + 45 = 125
    expect(sequence.totalDurationSec).toBe(125);
  });

  it('skips rest phases with 0 duration', () => {
    const workout = createTestWorkout([
      { name: 'Block 1', exerciseDurationSec: 30, restDurationSec: 0, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);

    // No rest phases since restDurationSec is 0
    expect(sequence.phases).toHaveLength(2);
    expect(sequence.phases[0]).toMatchObject({ type: 'exercise', repeat: 1 });
    expect(sequence.phases[1]).toMatchObject({ type: 'exercise', repeat: 2 });
    expect(sequence.totalDurationSec).toBe(60);
  });

  it('includes rest between blocks', () => {
    const workout = createTestWorkout([
      { name: 'Block 1', exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
      { name: 'Block 2', exerciseDurationSec: 45, restDurationSec: 15, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);

    // Block 1 exercise, Block 1 rest (between blocks), Block 2 exercise (no trailing rest)
    expect(sequence.phases).toHaveLength(3);
    expect(sequence.phases[0]).toMatchObject({ type: 'exercise', blockIndex: 0 });
    expect(sequence.phases[1]).toMatchObject({ type: 'rest', blockIndex: 0 });
    expect(sequence.phases[2]).toMatchObject({ type: 'exercise', blockIndex: 1 });
    // 30 + 10 + 45 = 85
    expect(sequence.totalDurationSec).toBe(85);
  });
});

// ============================================================================
// createInitialTimerState Tests
// ============================================================================

describe('createInitialTimerState', () => {
  it('returns finished state for empty sequence', () => {
    const sequence: TimerSequence = { phases: [], totalDurationSec: 0 };
    const state = createInitialTimerState(sequence);

    expect(state.phase).toBe('finished');
    expect(state.remainingSec).toBe(0);
    expect(state.isRunning).toBe(false);
  });

  it('initializes to first phase', () => {
    const workout = createTestWorkout([
      { name: 'Push-ups', exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    expect(state.phase).toBe('exercise');
    expect(state.remainingSec).toBe(30);
    expect(state.currentBlockIndex).toBe(0);
    expect(state.currentRepeat).toBe(1);
    expect(state.isPaused).toBe(false);
    expect(state.isRunning).toBe(true);
    expect(state.currentPhaseIndex).toBe(0);
  });
});

// ============================================================================
// tick Tests
// ============================================================================

describe('tick', () => {
  it('decrements remaining time', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    const newState = tick(state, sequence, 1000); // 1 second

    expect(newState.remainingSec).toBe(29);
    expect(newState.phase).toBe('exercise');
  });

  it('handles fractional seconds', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    const newState = tick(state, sequence, 500); // 0.5 seconds

    expect(newState.remainingSec).toBe(29.5);
  });

  it('transitions to next phase when time runs out', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);

    // Tick past the first exercise phase
    state = tick(state, sequence, 30000); // 30 seconds

    expect(state.phase).toBe('rest');
    expect(state.remainingSec).toBe(10);
    expect(state.currentPhaseIndex).toBe(1);
  });

  it('carries over excess time to next phase', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);

    // Tick 32 seconds (2 seconds into rest phase)
    state = tick(state, sequence, 32000);

    expect(state.phase).toBe('rest');
    expect(state.remainingSec).toBe(8);
  });

  it('can skip multiple phases in one tick', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 5, restDurationSec: 5, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);

    // Tick 12 seconds (should be in second exercise phase)
    state = tick(state, sequence, 12000);

    expect(state.phase).toBe('exercise');
    expect(state.currentPhaseIndex).toBe(2);
    expect(state.remainingSec).toBe(3); // 5 - 2 = 3
  });

  it('finishes when all phases complete', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 10, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);

    state = tick(state, sequence, 10000);

    expect(state.phase).toBe('finished');
    expect(state.remainingSec).toBe(0);
    expect(state.isRunning).toBe(false);
  });

  it('does not tick when paused', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = pause(state);

    const newState = tick(state, sequence, 5000);

    expect(newState.remainingSec).toBe(30); // unchanged
  });

  it('does not tick when not running', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = { ...state, isRunning: false };

    const newState = tick(state, sequence, 5000);

    expect(newState.remainingSec).toBe(30); // unchanged
  });

  it('does not tick when already finished', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 10, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 10000); // finish

    const newState = tick(state, sequence, 5000);

    expect(newState.phase).toBe('finished');
    expect(newState.remainingSec).toBe(0);
  });
});

// ============================================================================
// skip Tests
// ============================================================================

describe('skip', () => {
  it('skips to next phase', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);

    state = skip(state, sequence);

    expect(state.phase).toBe('rest');
    expect(state.remainingSec).toBe(10);
    expect(state.currentPhaseIndex).toBe(1);
  });

  it('finishes when skipping past last phase', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);

    state = skip(state, sequence);

    expect(state.phase).toBe('finished');
    expect(state.isRunning).toBe(false);
  });

  it('does nothing when already finished', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 10, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 10000); // finish

    const newState = skip(state, sequence);

    expect(newState).toEqual(state);
  });

  it('does nothing when not running', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = { ...state, isRunning: false };

    const newState = skip(state, sequence);

    expect(newState).toEqual(state);
  });
});

// ============================================================================
// goBack Tests
// ============================================================================

describe('goBack', () => {
  it('restarts current phase when in progress', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 15000); // 15 seconds in

    state = goBack(state, sequence);

    expect(state.phase).toBe('exercise');
    expect(state.remainingSec).toBe(30); // restarted
    expect(state.currentPhaseIndex).toBe(0);
  });

  it('goes to previous phase when at start of current phase', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = skip(state, sequence); // move to rest phase

    // At start of rest phase (100% remaining)
    state = goBack(state, sequence);

    expect(state.phase).toBe('exercise');
    expect(state.remainingSec).toBe(30);
    expect(state.currentPhaseIndex).toBe(0);
  });

  it('restarts current phase when less than 90% remaining', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = skip(state, sequence); // move to rest phase
    state = tick(state, sequence, 2000); // 2 seconds into rest (80% remaining)

    state = goBack(state, sequence);

    expect(state.phase).toBe('rest');
    expect(state.remainingSec).toBe(10); // restarted rest phase
    expect(state.currentPhaseIndex).toBe(1);
  });

  it('does nothing at first phase when at start', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    const newState = goBack(state, sequence);

    // Should restart current phase (which is already at start)
    expect(newState.remainingSec).toBe(30);
    expect(newState.currentPhaseIndex).toBe(0);
  });

  it('does nothing when not running', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = { ...state, isRunning: false };

    const newState = goBack(state, sequence);

    expect(newState).toEqual(state);
  });

  it('does nothing when finished', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 10, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 10000); // finish

    const newState = goBack(state, sequence);

    expect(newState).toEqual(state);
  });
});

// ============================================================================
// pause/resume Tests
// ============================================================================

describe('pause', () => {
  it('sets isPaused to true', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    const newState = pause(state);

    expect(newState.isPaused).toBe(true);
    expect(newState.isRunning).toBe(true); // still running, just paused
  });

  it('does nothing when not running', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = { ...state, isRunning: false };

    const newState = pause(state);

    expect(newState).toEqual(state);
  });

  it('does nothing when finished', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 10, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 10000); // finish

    const newState = pause(state);

    expect(newState).toEqual(state);
  });
});

describe('resume', () => {
  it('sets isPaused to false', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = pause(state);

    state = resume(state);

    expect(state.isPaused).toBe(false);
  });

  it('does nothing when not paused', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    const newState = resume(state);

    expect(newState).toEqual(state);
  });

  it('does nothing when not running', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = { ...state, isRunning: false, isPaused: true };

    const newState = resume(state);

    expect(newState).toEqual(state);
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('getCurrentPhase', () => {
  it('returns current phase', () => {
    const workout = createTestWorkout([
      { name: 'Push-ups', exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    const phase = getCurrentPhase(state, sequence);

    expect(phase).toEqual({
      type: 'exercise',
      blockIndex: 0,
      blockName: 'Push-ups',
      repeat: 1,
      durationSec: 30,
    });
  });

  it('returns null when finished', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 10, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 10000); // finish

    const phase = getCurrentPhase(state, sequence);

    expect(phase).toBeNull();
  });
});

describe('getNextPhase', () => {
  it('returns next phase', () => {
    const workout = createTestWorkout([
      { name: 'Push-ups', exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    const phase = getNextPhase(state, sequence);

    expect(phase).toMatchObject({
      type: 'rest',
      blockIndex: 0,
      repeat: 1,
    });
  });

  it('returns null when on last phase', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    const phase = getNextPhase(state, sequence);

    expect(phase).toBeNull();
  });
});

describe('getElapsedTime', () => {
  it('returns 0 at start', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    expect(getElapsedTime(state, sequence)).toBe(0);
  });

  it('returns elapsed time within phase', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 10000); // 10 seconds

    expect(getElapsedTime(state, sequence)).toBe(10);
  });

  it('returns elapsed time across phases', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 35000); // 35 seconds (30 exercise + 5 rest)

    expect(getElapsedTime(state, sequence)).toBe(35);
  });

  it('returns 0 for empty sequence', () => {
    const sequence: TimerSequence = { phases: [], totalDurationSec: 0 };
    const state: TimerState = {
      phase: 'finished',
      remainingSec: 0,
      currentBlockIndex: 0,
      currentRepeat: 1,
      isPaused: false,
      isRunning: false,
      currentPhaseIndex: 0,
    };

    expect(getElapsedTime(state, sequence)).toBe(0);
  });
});

describe('getProgress', () => {
  it('returns 0 at start', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    expect(getProgress(state, sequence)).toBe(0);
  });

  it('returns 50 at halfway', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 20, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 10000); // 10 seconds

    expect(getProgress(state, sequence)).toBe(50);
  });

  it('returns 100 for empty sequence', () => {
    const sequence: TimerSequence = { phases: [], totalDurationSec: 0 };
    const state: TimerState = {
      phase: 'finished',
      remainingSec: 0,
      currentBlockIndex: 0,
      currentRepeat: 1,
      isPaused: false,
      isRunning: false,
      currentPhaseIndex: 0,
    };

    expect(getProgress(state, sequence)).toBe(100);
  });
});

describe('getCompletionStats', () => {
  it('returns zeros at start', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 30, restDurationSec: 10, repeatCount: 2 },
    ]);
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    const stats = getCompletionStats(state, sequence, workout.blocks);

    expect(stats.completedBlocks).toBe(0);
    expect(stats.completedRepeats).toBe(0);
  });

  it('counts completed repeats', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 10, restDurationSec: 5, repeatCount: 3 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    // Complete first exercise and rest, now in second exercise
    state = tick(state, sequence, 15000);

    const stats = getCompletionStats(state, sequence, workout.blocks);

    expect(stats.completedRepeats).toBe(1);
    expect(stats.completedBlocks).toBe(0); // block not fully complete
  });

  it('counts completed blocks', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 10, restDurationSec: 5, repeatCount: 2 },
      { exerciseDurationSec: 20, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    // Complete block 1 (10+5+10+5 = 30), now in block 2
    state = tick(state, sequence, 30000);

    const stats = getCompletionStats(state, sequence, workout.blocks);

    expect(stats.completedBlocks).toBe(1);
    expect(stats.completedRepeats).toBe(2);
  });

  it('returns full counts when finished', () => {
    const workout = createTestWorkout([
      { exerciseDurationSec: 10, restDurationSec: 5, repeatCount: 2 },
      { exerciseDurationSec: 20, restDurationSec: 0, repeatCount: 1 },
    ]);
    const sequence = buildSequence(workout);
    let state = createInitialTimerState(sequence);
    state = tick(state, sequence, 50000); // finish everything

    const stats = getCompletionStats(state, sequence, workout.blocks);

    expect(stats.completedBlocks).toBe(2);
    expect(stats.completedRepeats).toBe(3); // 2 + 1
  });
});

import type { Workout, ExerciseBlock } from './workout';

// ============================================================================
// Types
// ============================================================================

export type TimerPhase = 'exercise' | 'rest' | 'finished';

export interface TimerState {
  phase: TimerPhase;
  remainingSec: number;
  currentBlockIndex: number;
  currentRepeat: number; // 1-based
  isPaused: boolean;
  isRunning: boolean;
  /** Index into the sequence.phases array */
  currentPhaseIndex: number;
}

export interface TimerSequence {
  phases: SequencePhase[];
  totalDurationSec: number;
}

export interface SequencePhase {
  type: 'exercise' | 'rest';
  blockIndex: number;
  blockName: string;
  repeat: number; // 1-based
  durationSec: number;
}

// ============================================================================
// Sequence Building
// ============================================================================

/**
 * Flattens workout blocks into a linear sequence of phases.
 *
 * Sequencing rules:
 * - Rest phases run between repeats and between blocks
 * - Only the final repeat of the final block skips trailing rest
 *
 * Example:
 *   Block 1: 30s exercise, 10s rest, 2 repeats
 *   Block 2: 45s exercise, 0s rest, 1 repeat
 *
 *   Result: [exercise-30s] → [rest-10s] → [exercise-30s] → [rest-10s] → [exercise-45s]
 */
export function buildSequence(workout: Workout): TimerSequence {
  const phases: SequencePhase[] = [];
  const blocks = workout.blocks;

  if (blocks.length === 0) {
    return { phases: [], totalDurationSec: 0 };
  }

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = blocks[blockIndex];
    const isLastBlock = blockIndex === blocks.length - 1;

    for (let repeat = 1; repeat <= block.repeatCount; repeat++) {
      const isLastRepeat = repeat === block.repeatCount;
      const isVeryLast = isLastBlock && isLastRepeat;

      // Add exercise phase
      phases.push({
        type: 'exercise',
        blockIndex,
        blockName: block.name,
        repeat,
        durationSec: block.exerciseDurationSec,
      });

      // Add rest phase unless it's the very last repeat of the very last block
      // Also skip if rest duration is 0
      if (!isVeryLast && block.restDurationSec > 0) {
        phases.push({
          type: 'rest',
          blockIndex,
          blockName: block.name,
          repeat,
          durationSec: block.restDurationSec,
        });
      }
    }
  }

  const totalDurationSec = phases.reduce((sum, p) => sum + p.durationSec, 0);

  return { phases, totalDurationSec };
}

// ============================================================================
// Timer State Initialization
// ============================================================================

/**
 * Creates the initial timer state for a sequence.
 */
export function createInitialTimerState(sequence: TimerSequence): TimerState {
  if (sequence.phases.length === 0) {
    return {
      phase: 'finished',
      remainingSec: 0,
      currentBlockIndex: 0,
      currentRepeat: 1,
      isPaused: false,
      isRunning: false,
      currentPhaseIndex: 0,
    };
  }

  const firstPhase = sequence.phases[0];
  return {
    phase: firstPhase.type,
    remainingSec: firstPhase.durationSec,
    currentBlockIndex: firstPhase.blockIndex,
    currentRepeat: firstPhase.repeat,
    isPaused: false,
    isRunning: true,
    currentPhaseIndex: 0,
  };
}

// ============================================================================
// Timer Operations (Pure Functions)
// ============================================================================

/**
 * Advances the timer by the given elapsed time.
 * Handles phase transitions when time runs out.
 *
 * @param state Current timer state
 * @param sequence The workout sequence
 * @param elapsedMs Elapsed time in milliseconds since last tick
 * @returns New timer state
 */
export function tick(
  state: TimerState,
  sequence: TimerSequence,
  elapsedMs: number
): TimerState {
  // Don't tick if paused, not running, or already finished
  if (state.isPaused || !state.isRunning || state.phase === 'finished') {
    return state;
  }

  const elapsedSec = elapsedMs / 1000;
  let newRemaining = state.remainingSec - elapsedSec;
  let currentPhaseIndex = state.currentPhaseIndex;

  // Handle phase transitions when time runs out
  while (newRemaining <= 0 && currentPhaseIndex < sequence.phases.length - 1) {
    // Move to next phase
    currentPhaseIndex++;
    const nextPhase = sequence.phases[currentPhaseIndex];
    // Carry over any negative time to the next phase
    newRemaining = nextPhase.durationSec + newRemaining;
  }

  // Check if we've finished all phases
  if (currentPhaseIndex >= sequence.phases.length - 1 && newRemaining <= 0) {
    return {
      ...state,
      phase: 'finished',
      remainingSec: 0,
      isRunning: false,
      currentPhaseIndex: sequence.phases.length,
    };
  }

  const currentPhase = sequence.phases[currentPhaseIndex];
  return {
    ...state,
    phase: currentPhase.type,
    remainingSec: Math.max(0, newRemaining),
    currentBlockIndex: currentPhase.blockIndex,
    currentRepeat: currentPhase.repeat,
    currentPhaseIndex,
  };
}

/**
 * Skips to the next phase in the sequence.
 */
export function skip(state: TimerState, sequence: TimerSequence): TimerState {
  // Can't skip if already finished or not running
  if (state.phase === 'finished' || !state.isRunning) {
    return state;
  }

  const nextPhaseIndex = state.currentPhaseIndex + 1;

  // Check if we've reached the end
  if (nextPhaseIndex >= sequence.phases.length) {
    return {
      ...state,
      phase: 'finished',
      remainingSec: 0,
      isRunning: false,
      currentPhaseIndex: sequence.phases.length,
    };
  }

  const nextPhase = sequence.phases[nextPhaseIndex];
  return {
    ...state,
    phase: nextPhase.type,
    remainingSec: nextPhase.durationSec,
    currentBlockIndex: nextPhase.blockIndex,
    currentRepeat: nextPhase.repeat,
    currentPhaseIndex: nextPhaseIndex,
  };
}

/**
 * Goes back to the start of the current phase, or to the previous phase
 * if already at the start of the current phase.
 *
 * "At the start" is defined as having more than 90% of the phase duration remaining.
 */
export function goBack(state: TimerState, sequence: TimerSequence): TimerState {
  // Can't go back if not running or already finished
  if (!state.isRunning || state.phase === 'finished') {
    return state;
  }

  if (sequence.phases.length === 0) {
    return state;
  }

  const currentPhase = sequence.phases[state.currentPhaseIndex];
  const percentRemaining = state.remainingSec / currentPhase.durationSec;

  // If we're near the start of the current phase (>90% remaining), go to previous phase
  if (percentRemaining > 0.9 && state.currentPhaseIndex > 0) {
    const prevPhaseIndex = state.currentPhaseIndex - 1;
    const prevPhase = sequence.phases[prevPhaseIndex];
    return {
      ...state,
      phase: prevPhase.type,
      remainingSec: prevPhase.durationSec,
      currentBlockIndex: prevPhase.blockIndex,
      currentRepeat: prevPhase.repeat,
      currentPhaseIndex: prevPhaseIndex,
    };
  }

  // Otherwise, restart the current phase
  return {
    ...state,
    remainingSec: currentPhase.durationSec,
  };
}

/**
 * Pauses the timer.
 */
export function pause(state: TimerState): TimerState {
  if (!state.isRunning || state.phase === 'finished') {
    return state;
  }
  return {
    ...state,
    isPaused: true,
  };
}

/**
 * Resumes the timer from a paused state.
 */
export function resume(state: TimerState): TimerState {
  if (!state.isRunning || state.phase === 'finished' || !state.isPaused) {
    return state;
  }
  return {
    ...state,
    isPaused: false,
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the current phase details from the sequence.
 */
export function getCurrentPhase(
  state: TimerState,
  sequence: TimerSequence
): SequencePhase | null {
  if (state.phase === 'finished' || state.currentPhaseIndex >= sequence.phases.length) {
    return null;
  }
  return sequence.phases[state.currentPhaseIndex];
}

/**
 * Gets the next phase details from the sequence.
 */
export function getNextPhase(
  state: TimerState,
  sequence: TimerSequence
): SequencePhase | null {
  const nextIndex = state.currentPhaseIndex + 1;
  if (nextIndex >= sequence.phases.length) {
    return null;
  }
  return sequence.phases[nextIndex];
}

/**
 * Calculates the total elapsed time in the workout.
 */
export function getElapsedTime(state: TimerState, sequence: TimerSequence): number {
  if (sequence.phases.length === 0) {
    return 0;
  }

  let elapsed = 0;

  // Sum up all completed phases
  for (let i = 0; i < state.currentPhaseIndex; i++) {
    elapsed += sequence.phases[i].durationSec;
  }

  // Add elapsed time in current phase
  if (state.currentPhaseIndex < sequence.phases.length) {
    const currentPhase = sequence.phases[state.currentPhaseIndex];
    elapsed += currentPhase.durationSec - state.remainingSec;
  }

  return elapsed;
}

/**
 * Calculates progress as a percentage (0-100).
 */
export function getProgress(state: TimerState, sequence: TimerSequence): number {
  if (sequence.totalDurationSec === 0) {
    return 100;
  }
  const elapsed = getElapsedTime(state, sequence);
  return Math.min(100, (elapsed / sequence.totalDurationSec) * 100);
}

/**
 * Gets completion stats for session tracking.
 */
export function getCompletionStats(
  state: TimerState,
  sequence: TimerSequence,
  blocks: ExerciseBlock[]
): { completedBlocks: number; completedRepeats: number } {
  if (state.phase === 'finished') {
    // All blocks and repeats completed
    const totalRepeats = blocks.reduce((sum, b) => sum + b.repeatCount, 0);
    return {
      completedBlocks: blocks.length,
      completedRepeats: totalRepeats,
    };
  }

  // Count completed phases
  let completedBlocks = 0;
  let completedRepeats = 0;
  const seenBlocks = new Set<number>();

  for (let i = 0; i < state.currentPhaseIndex; i++) {
    const phase = sequence.phases[i];
    if (phase.type === 'exercise') {
      completedRepeats++;
      seenBlocks.add(phase.blockIndex);
    }
  }

  // A block is "completed" if all its repeats are done
  for (const blockIndex of seenBlocks) {
    const block = blocks[blockIndex];
    const blockRepeatsCompleted = sequence.phases
      .slice(0, state.currentPhaseIndex)
      .filter((p) => p.type === 'exercise' && p.blockIndex === blockIndex).length;

    if (blockRepeatsCompleted >= block.repeatCount) {
      completedBlocks++;
    }
  }

  return { completedBlocks, completedRepeats };
}

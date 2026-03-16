import { create } from 'zustand';
import type { Workout } from '../domain/workout';
import type { TimerState, TimerSequence } from '../domain/timer';
import {
  buildSequence,
  createInitialTimerState,
  tick as tickDomain,
  skip as skipDomain,
  goBack as goBackDomain,
  pause as pauseDomain,
  resume as resumeDomain,
  getCompletionStats,
  getElapsedTime,
} from '../domain/timer';
import { useSessionStore } from './sessionStore';

// ============================================================================
// Types
// ============================================================================

interface TimerStore {
  state: TimerState | null;
  sequence: TimerSequence | null;
  sessionId: string | null;
  workout: Workout | null;
  isCompleting: boolean; // Guard against double completion

  // Actions
  startWorkout: (workout: Workout) => Promise<void>;
  tick: (elapsedMs: number) => void;
  pause: () => void;
  resume: () => void;
  skip: () => void;
  goBack: () => void;
  endEarly: () => Promise<void>;
  complete: () => Promise<void>;
  reset: () => void;
}

// ============================================================================
// Store
// ============================================================================

export const useTimerStore = create<TimerStore>((set, get) => ({
  state: null,
  sequence: null,
  sessionId: null,
  workout: null,
  isCompleting: false,

  startWorkout: async (workout) => {
    // Build the sequence from workout blocks
    const sequence = buildSequence(workout);
    const state = createInitialTimerState(sequence);

    // Create a session to track this workout
    const session = await useSessionStore.getState().createSession(workout);

    set({
      state,
      sequence,
      sessionId: session.id,
      workout,
    });
  },

  tick: (elapsedMs) => {
    const { state, sequence, isCompleting } = get();
    if (!state || !sequence || isCompleting) return;

    const newState = tickDomain(state, sequence, elapsedMs);
    set({ state: newState });

    // Auto-complete when finished
    if (newState.phase === 'finished' && state.phase !== 'finished') {
      get().complete();
    }
  },

  pause: () => {
    const { state } = get();
    if (!state) return;

    const newState = pauseDomain(state);
    set({ state: newState });
  },

  resume: () => {
    const { state } = get();
    if (!state) return;

    const newState = resumeDomain(state);
    set({ state: newState });
  },

  skip: () => {
    const { state, sequence, isCompleting } = get();
    if (!state || !sequence || isCompleting) return;

    const newState = skipDomain(state, sequence);
    set({ state: newState });

    // Auto-complete when finished
    if (newState.phase === 'finished' && state.phase !== 'finished') {
      get().complete();
    }
  },

  goBack: () => {
    const { state, sequence } = get();
    if (!state || !sequence) return;

    const newState = goBackDomain(state, sequence);
    set({ state: newState });
  },

  endEarly: async () => {
    const { state, sequence, sessionId, workout } = get();
    if (!state || !sequence || !sessionId || !workout) return;

    const { completedBlocks, completedRepeats } = getCompletionStats(
      state,
      sequence,
      workout.blocks
    );
    const elapsedDurationSec = Math.round(getElapsedTime(state, sequence));

    await useSessionStore.getState().updateSession(sessionId, {
      status: 'abandoned',
      endedAt: new Date(),
      elapsedDurationSec,
      completedBlocks,
      completedRepeats,
    });

    // Reset timer state
    set({
      state: null,
      sequence: null,
      sessionId: null,
      workout: null,
    });
  },

  complete: async () => {
    const { state, sequence, sessionId, workout, isCompleting } = get();
    if (!sessionId || !workout || isCompleting) return;

    // Set guard to prevent double completion
    set({ isCompleting: true });

    // Use full workout stats if finished, otherwise calculate partial
    let completedBlocks: number;
    let completedRepeats: number;
    let elapsedDurationSec: number;

    if (state && sequence) {
      const stats = getCompletionStats(state, sequence, workout.blocks);
      completedBlocks = stats.completedBlocks;
      completedRepeats = stats.completedRepeats;
      elapsedDurationSec = Math.round(getElapsedTime(state, sequence));
    } else {
      // Fallback: assume full completion
      completedBlocks = workout.blocks.length;
      completedRepeats = workout.blocks.reduce((sum, b) => sum + b.repeatCount, 0);
      elapsedDurationSec = workout.estimatedDurationSec;
    }

    await useSessionStore.getState().updateSession(sessionId, {
      status: 'completed',
      endedAt: new Date(),
      elapsedDurationSec,
      completedBlocks,
      completedRepeats,
    });
  },

  reset: () => {
    set({
      state: null,
      sequence: null,
      sessionId: null,
      workout: null,
      isCompleting: false,
    });
  },
}));

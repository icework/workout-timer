import { create } from 'zustand';
import type { WorkoutSession, ComputedStats } from '../domain/session';
import type { Workout } from '../domain/workout';
import {
  createSession as createSessionDomain,
  computeStats as computeStatsDomain,
} from '../domain/session';
import { sessionRepo } from '../persistence/sessionRepo';
import { useWorkoutStore } from './workoutStore';

// ============================================================================
// Types
// ============================================================================

interface SessionStore {
  sessions: WorkoutSession[];
  stats: ComputedStats | null;
  isLoading: boolean;

  // Actions
  loadSessions: () => Promise<void>;
  createSession: (workout: Workout) => Promise<WorkoutSession>;
  updateSession: (id: string, updates: Partial<WorkoutSession>) => Promise<void>;
  computeStats: () => ComputedStats;
}

// ============================================================================
// Store
// ============================================================================

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  stats: null,
  isLoading: false,

  loadSessions: async () => {
    set({ isLoading: true });
    try {
      const sessions = await sessionRepo.getAll();
      set({ sessions, isLoading: false });
    } catch (error) {
      console.error('Failed to load sessions:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  createSession: async (workout) => {
    const session = createSessionDomain(workout);
    await sessionRepo.save(session);

    set((state) => ({
      sessions: [...state.sessions, session],
    }));

    void useWorkoutStore
      .getState()
      .markWorkoutUsed(workout, session.startedAt)
      .catch((error) => {
        console.error('Failed to update workout last used time:', error);
      });

    return session;
  },

  updateSession: async (id, updates) => {
    const { sessions } = get();
    const session = sessions.find((s) => s.id === id);
    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    const updatedSession: WorkoutSession = {
      ...session,
      ...updates,
    };

    await sessionRepo.save(updatedSession);

    set({
      sessions: sessions.map((s) => (s.id === id ? updatedSession : s)),
    });
  },

  computeStats: () => {
    const { sessions } = get();
    const workouts = useWorkoutStore.getState().workouts;
    const stats = computeStatsDomain(sessions, workouts);
    set({ stats });
    return stats;
  },
}));

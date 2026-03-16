import { db } from './db';
import type { WorkoutSession } from '../domain/session';

// ============================================================================
// Session Repository
// ============================================================================

/**
 * Repository for workout session persistence operations.
 * Uses Dexie.js for IndexedDB access.
 */
export const sessionRepo = {
  /**
   * Gets all workout sessions.
   */
  async getAll(): Promise<WorkoutSession[]> {
    return db.sessions.toArray();
  },

  /**
   * Gets all sessions for a specific workout.
   */
  async getByWorkoutId(workoutId: string): Promise<WorkoutSession[]> {
    return db.sessions.where('workoutId').equals(workoutId).toArray();
  },

  /**
   * Gets a single session by ID.
   * Returns undefined if not found.
   */
  async getById(id: string): Promise<WorkoutSession | undefined> {
    return db.sessions.get(id);
  },

  /**
   * Saves or updates a session.
   */
  async save(session: WorkoutSession): Promise<void> {
    await db.sessions.put(session);
  },
};

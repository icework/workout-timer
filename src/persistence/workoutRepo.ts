import type { Workout } from '../domain/workout';
import type { WorkoutsResponse } from '../backend/contracts';
import { useAuthStore } from '../stores/authStore';
import { requestJson } from './httpClient';
import { deserializeWorkout, serializeWorkout } from './serializers';

// ============================================================================
// Workout Repository
// ============================================================================

/**
 * Repository for workout and block persistence operations.
 * Uses the backend JSON API for persistence.
 */
export const workoutRepo = {
  /**
   * Gets all workouts for the authenticated user.
   */
  async getAll(): Promise<Workout[]> {
    const username = requireUsername();
    const response = await requestJson<WorkoutsResponse<ReturnType<typeof serializeWorkout>>>(
      `/api/users/${encodeURIComponent(username)}/workouts`
    );
    return response.workouts.map(deserializeWorkout);
  },

  /**
   * Gets a single workout by ID with its blocks attached.
   * Returns undefined if not found or if soft-deleted.
   */
  async getById(id: string): Promise<Workout | undefined> {
    const workouts = await this.getAll();
    return workouts.find((workout) => workout.id === id);
  },

  /**
   * Saves a workout.
   */
  async save(workout: Workout): Promise<void> {
    const username = requireUsername();
    await requestJson<{ ok: boolean }>(
      `/api/users/${encodeURIComponent(username)}/workouts/${encodeURIComponent(workout.id)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serializeWorkout(workout)),
      }
    );
  },

  /**
   * Soft deletes a workout by setting isDeleted flag.
   * Preserves workout for session history.
   */
  async softDelete(id: string): Promise<void> {
    const username = requireUsername();
    await requestJson<{ ok: boolean }>(
      `/api/users/${encodeURIComponent(username)}/workouts/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
      }
    );
  },

  /**
   * Legacy method retained for compatibility with existing store code.
   */
  async deleteBlock(_blockId: string): Promise<void> {
    return Promise.resolve();
  },
};

function requireUsername(): string {
  const username = useAuthStore.getState().username;

  if (!username) {
    throw new Error('You must be logged in to access workouts');
  }

  return username;
}

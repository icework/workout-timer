import type { WorkoutSession } from '../domain/session';
import type { SessionsResponse } from '../backend/contracts';
import { useAuthStore } from '../stores/authStore';
import { requestJson } from './httpClient';
import { deserializeSession, serializeSession } from './serializers';

// ============================================================================
// Session Repository
// ============================================================================

/**
 * Repository for workout session persistence operations.
 * Uses the backend JSON API for persistence.
 */
export const sessionRepo = {
  /**
   * Gets all workout sessions.
   */
  async getAll(): Promise<WorkoutSession[]> {
    const username = requireUsername();
    const response = await requestJson<SessionsResponse<ReturnType<typeof serializeSession>>>(
      `/api/users/${encodeURIComponent(username)}/sessions`
    );
    return response.sessions.map(deserializeSession);
  },

  /**
   * Gets all sessions for a specific workout.
   */
  async getByWorkoutId(workoutId: string): Promise<WorkoutSession[]> {
    const sessions = await this.getAll();
    return sessions.filter((session) => session.workoutId === workoutId);
  },

  /**
   * Gets a single session by ID.
   * Returns undefined if not found.
   */
  async getById(id: string): Promise<WorkoutSession | undefined> {
    const sessions = await this.getAll();
    return sessions.find((session) => session.id === id);
  },

  /**
   * Saves or updates a session.
   */
  async save(session: WorkoutSession): Promise<void> {
    const username = requireUsername();
    await requestJson<{ ok: boolean }>(
      `/api/users/${encodeURIComponent(username)}/sessions/${encodeURIComponent(session.id)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serializeSession(session)),
      }
    );
  },
};

function requireUsername(): string {
  const username = useAuthStore.getState().username;

  if (!username) {
    throw new Error('You must be logged in to access sessions');
  }

  return username;
}

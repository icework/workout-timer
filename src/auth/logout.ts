import { resetMigrationClaim } from '../persistence/migration';
import { useAuthStore } from '../stores/authStore';
import { useSessionStore } from '../stores/sessionStore';
import { useTimerStore } from '../stores/timerStore';
import { useWorkoutStore } from '../stores/workoutStore';

export function performLogout(): void {
  useTimerStore.getState().reset();

  useWorkoutStore.setState({
    workouts: [],
    currentWorkout: null,
    isLoading: false,
  });

  useSessionStore.setState({
    sessions: [],
    stats: null,
    isLoading: false,
  });

  resetMigrationClaim();
  useAuthStore.getState().logout();
}

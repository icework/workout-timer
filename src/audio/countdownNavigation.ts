import { primeCountdownAudio } from './countdownSound';

export function navigateToWorkoutRun(
  navigate: (path: string) => void,
  workoutId: string
): void {
  try {
    primeCountdownAudio();
  } catch (error) {
    console.error('Failed to prime countdown audio:', error);
  }

  navigate(`/workout/${workoutId}/run`);
}

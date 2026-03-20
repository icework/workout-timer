import { ensureCountdownAudioContext, primeCountdownAudio } from './countdownSound';

export function prepareCountdownAudioForStart(): void {
  try {
    ensureCountdownAudioContext();
  } catch (error) {
    console.error('Failed to prepare countdown audio:', error);
  }
}

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

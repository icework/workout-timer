import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./countdownSound', () => ({
  primeCountdownAudio: vi.fn(),
  ensureCountdownAudioContext: vi.fn(),
}));

import { ensureCountdownAudioContext, primeCountdownAudio } from './countdownSound';
import { navigateToWorkoutRun, prepareCountdownAudioForStart } from './countdownNavigation';

describe('navigateToWorkoutRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('primes countdown audio before navigating to the timer screen', () => {
    const navigate = vi.fn();

    navigateToWorkoutRun(navigate, 'workout-1');

    expect(primeCountdownAudio).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/workout/workout-1/run');
    expect(
      vi.mocked(primeCountdownAudio).mock.invocationCallOrder[0]
    ).toBeLessThan(navigate.mock.invocationCallOrder[0]);
  });

  it('still navigates when audio priming throws', () => {
    const navigate = vi.fn();
    vi.mocked(primeCountdownAudio).mockImplementationOnce(() => {
      throw new Error('audio unavailable');
    });

    expect(() => navigateToWorkoutRun(navigate, 'workout-1')).not.toThrow();
    expect(navigate).toHaveBeenCalledWith('/workout/workout-1/run');
  });

  it('pre-creates the audio context for start entry screens', () => {
    prepareCountdownAudioForStart();

    expect(ensureCountdownAudioContext).toHaveBeenCalledTimes(1);
  });

  it('swallows errors while pre-creating the audio context', () => {
    vi.mocked(ensureCountdownAudioContext).mockImplementationOnce(() => {
      throw new Error('prewarm failed');
    });

    expect(() => prepareCountdownAudioForStart()).not.toThrow();
  });
});

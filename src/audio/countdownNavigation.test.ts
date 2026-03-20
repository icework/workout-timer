import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./countdownSound', () => ({
  primeCountdownAudio: vi.fn(),
}));

import { primeCountdownAudio } from './countdownSound';
import { navigateToWorkoutRun } from './countdownNavigation';

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
});

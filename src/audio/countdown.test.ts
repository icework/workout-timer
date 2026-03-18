import { describe, expect, it } from 'vitest';
import { getCountdownSeconds } from './countdown';

describe('getCountdownSeconds', () => {
  it('fires the 3-second cue when a new phase starts with 3 seconds showing', () => {
    expect(
      getCountdownSeconds({
        currentRemainingSec: 3,
      })
    ).toEqual([3]);
  });

  it('fires each crossed countdown second once when a large tick skips ahead', () => {
    expect(
      getCountdownSeconds({
        previousRemainingSec: 3.2,
        currentRemainingSec: 0.9,
      })
    ).toEqual([3, 2, 1]);
  });

  it('does not repeat seconds that already played in the current phase', () => {
    expect(
      getCountdownSeconds({
        previousRemainingSec: 2.1,
        currentRemainingSec: 0.9,
        alreadyPlayed: [2],
      })
    ).toEqual([1]);
  });

  it('suppresses all countdown sounds when sound is disabled', () => {
    expect(
      getCountdownSeconds({
        previousRemainingSec: 3.2,
        currentRemainingSec: 0.9,
        soundEnabled: false,
      })
    ).toEqual([]);
  });
});

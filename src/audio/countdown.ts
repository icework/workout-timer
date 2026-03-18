const COUNTDOWN_SECONDS = [3, 2, 1] as const;

interface GetCountdownSecondsOptions {
  previousRemainingSec?: number;
  currentRemainingSec: number;
  alreadyPlayed?: number[];
  soundEnabled?: boolean;
}

/**
 * Returns the countdown seconds whose displayed values were crossed on this update.
 * Uses the displayed integer countdown (Math.ceil) so audio stays aligned with the UI timer.
 */
export function getCountdownSeconds({
  previousRemainingSec,
  currentRemainingSec,
  alreadyPlayed = [],
  soundEnabled = true,
}: GetCountdownSecondsOptions): number[] {
  if (!soundEnabled || currentRemainingSec <= 0) {
    return [];
  }

  const currentDisplaySec = Math.ceil(currentRemainingSec);
  const previousDisplaySec =
    previousRemainingSec === undefined
      ? currentDisplaySec + 1
      : Math.ceil(previousRemainingSec);

  return COUNTDOWN_SECONDS.filter(
    (second) =>
      previousDisplaySec > second &&
      currentDisplaySec <= second &&
      !alreadyPlayed.includes(second)
  );
}

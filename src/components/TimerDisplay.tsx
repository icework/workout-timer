interface TimerDisplayProps {
  remainingSec: number;
  phase: 'exercise' | 'rest' | 'finished';
  blockName: string;
  currentRepeat: number;
  totalRepeats: number;
  progress: number; // 0-1
}

/**
 * Formats seconds as MM:SS string.
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Large timer display component for the workout runner screen.
 * Shows countdown timer, current phase, block name, repeat count, and progress.
 */
export function TimerDisplay({
  remainingSec,
  phase,
  blockName,
  currentRepeat,
  totalRepeats,
  progress,
}: TimerDisplayProps) {
  const phaseConfig = {
    exercise: {
      label: 'Exercise',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600',
      timerColor: 'text-green-700',
      progressColor: 'bg-green-500',
    },
    rest: {
      label: 'Rest',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      timerColor: 'text-blue-700',
      progressColor: 'bg-blue-500',
    },
    finished: {
      label: 'Finished',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-600',
      timerColor: 'text-gray-700',
      progressColor: 'bg-gray-500',
    },
  };

  const config = phaseConfig[phase];

  return (
    <div
      className={`flex flex-col items-center justify-center p-6 rounded-2xl ${config.bgColor}`}
      role="timer"
      aria-live="polite"
      aria-label={`${phase} phase, ${formatTime(remainingSec)} remaining`}
    >
      {/* Phase indicator */}
      <span
        className={`text-lg font-semibold uppercase tracking-wide ${config.textColor}`}
      >
        {config.label}
      </span>

      {/* Large countdown timer */}
      <time
        className={`text-[80px] leading-none font-bold tabular-nums ${config.timerColor}`}
        dateTime={`PT${remainingSec}S`}
      >
        {formatTime(remainingSec)}
      </time>

      {/* Block name */}
      <h2 className="mt-4 text-xl font-medium text-gray-900 text-center">
        {blockName}
      </h2>

      {/* Repeat indicator */}
      {totalRepeats > 1 && (
        <span className="mt-1 text-sm text-gray-500">
          Rep {currentRepeat} of {totalRepeats}
        </span>
      )}

      {/* Progress bar */}
      <div className="w-full mt-6">
        <div
          className="h-2 bg-gray-200 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Workout progress"
        >
          <div
            className={`h-full ${config.progressColor} transition-all duration-300 ease-out`}
            style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
          />
        </div>
        <span className="block mt-1 text-xs text-gray-500 text-center">
          {Math.round(progress * 100)}% complete
        </span>
      </div>
    </div>
  );
}

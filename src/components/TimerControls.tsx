interface TimerControlsProps {
  isPaused: boolean;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onBack: () => void;
  onEndEarly: () => void;
}

/**
 * Timer controls component for the workout runner screen.
 * Provides large, touch-friendly buttons for pause/resume, skip, back, and end early.
 * All touch targets are minimum 44x44px per mobile-first design spec.
 */
export function TimerControls({
  isPaused,
  onPause,
  onResume,
  onSkip,
  onBack,
  onEndEarly,
}: TimerControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Primary controls row */}
      <div className="flex items-center justify-center gap-4">
        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors"
          aria-label="Go to previous phase"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path d="M9.195 18.44c1.25.713 2.805-.19 2.805-1.629v-2.34l6.945 3.968c1.25.714 2.805-.188 2.805-1.628V8.69c0-1.44-1.555-2.342-2.805-1.628L12 11.03v-2.34c0-1.44-1.555-2.343-2.805-1.629l-7.108 4.062c-1.26.72-1.26 2.536 0 3.256l7.108 4.061z" />
          </svg>
        </button>

        {/* Pause/Resume button - larger primary action */}
        <button
          type="button"
          onClick={isPaused ? onResume : onPause}
          className="flex items-center justify-center w-20 h-20 rounded-full bg-green-500 text-white active:bg-green-600 transition-colors shadow-lg"
          aria-label={isPaused ? 'Resume workout' : 'Pause workout'}
        >
          {isPaused ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-10 h-10"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-10 h-10"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </button>

        {/* Skip button */}
        <button
          type="button"
          onClick={onSkip}
          className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 text-gray-700 active:bg-gray-200 transition-colors"
          aria-label="Skip to next phase"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path d="M5.055 7.06c-1.25-.714-2.805.189-2.805 1.628v8.123c0 1.44 1.555 2.342 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.342 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.346 12 7.25 12 8.69v2.34L5.055 7.06z" />
          </svg>
        </button>
      </div>

      {/* End early button - secondary action */}
      <button
        type="button"
        onClick={onEndEarly}
        className="flex items-center justify-center gap-2 w-full h-12 rounded-lg bg-red-50 text-red-600 active:bg-red-100 transition-colors"
        aria-label="End workout early"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-5"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z"
            clipRule="evenodd"
          />
        </svg>
        <span className="font-medium">End Early</span>
      </button>
    </div>
  );
}

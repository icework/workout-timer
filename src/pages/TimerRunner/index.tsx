import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTimerStore } from '../../stores/timerStore';
import { useWorkoutStore } from '../../stores/workoutStore';
import { TimerDisplay } from '../../components/TimerDisplay';
import { TimerControls } from '../../components/TimerControls';
import { getProgress, getCurrentPhase } from '../../domain/timer';
import { getCountdownSeconds } from '../../audio/countdown';
import { createCountdownSoundPlayer, ensureCountdownAudioContext, primeCountdownAudio } from '../../audio/countdownSound';
import { profileRepo } from '../../persistence/profileRepo';
import { requestWakeLock, releaseWakeLock, reacquireWakeLock } from '../../utils/screenWakeLock';

const TICK_INTERVAL_MS = 100;

/**
 * Timer runner page - the main workout execution screen.
 *
 * Features:
 * - Runs setInterval to call timerStore.tick() every 100ms
 * - Uses performance.now() for drift correction
 * - Handles browser backgrounding via visibilitychange event
 * - Navigates to completion page when finished
 */
export function TimerRunner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Store state
  const {
    state: timerState,
    sequence,
    workout: timerWorkout,
    startWorkout,
    tick,
    pause,
    resume,
    skip,
    goBack,
    endEarly,
  } = useTimerStore();

  // Use selectors for data to prevent unnecessary re-renders
  const workouts = useWorkoutStore((state) => state.workouts);
  const loadWorkouts = useWorkoutStore((state) => state.loadWorkouts);

  // Refs for interval management and drift correction
  const intervalRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const countdownPhaseIndexRef = useRef<number | null>(null);
  const countdownRemainingRef = useRef<number | null>(null);
  const playedCountdownSecondsRef = useRef<number[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdownSoundPlayer] = useState(() => createCountdownSoundPlayer());

  // Find workout by ID
  const workout = workouts.find((w) => w.id === id) || timerWorkout;

  // Pre-create AudioContext on mount so iOS has time to initialise the audio
  // route before the first beep is scheduled (same pattern as WorkoutDetail).
  useEffect(() => {
    ensureCountdownAudioContext();
  }, []);

  // Initialize workout on mount
  useEffect(() => {
    async function init() {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      // Load workouts if not already loaded
      if (workouts.length === 0) {
        await loadWorkouts();
      }
    }
    init();
  }, [workouts.length, loadWorkouts]);

  useEffect(() => {
    let isMounted = true;

    async function loadPreferences() {
      try {
        const preferences = await profileRepo.getPreferences();
        if (isMounted) {
          setSoundEnabled(preferences.soundEnabled);
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    }

    loadPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  // Start workout when we have the workout data and no timer is running
  useEffect(() => {
    async function start() {
      if (!id || !workout || timerState) return;

      // Only start if we have blocks
      if (workout.blocks.length === 0) {
        navigate(`/workout/${id}`);
        return;
      }

      await startWorkout(workout);
      lastTickTimeRef.current = performance.now();
    }
    start();
  }, [id, workout, timerState, startWorkout, navigate]);

  // Handle workout completion - navigate to completion page
  useEffect(() => {
    if (timerState?.phase === 'finished' && id) {
      // Small delay to show "Finished" state before navigating
      const timeout = setTimeout(() => {
        navigate(`/workout/${id}/complete`);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [timerState?.phase, id, navigate]);

  // Tick function with drift correction
  const performTick = useCallback(() => {
    const now = performance.now();
    const elapsed = now - lastTickTimeRef.current;
    lastTickTimeRef.current = now;
    tick(elapsed);
  }, [tick]);

  // Set up interval for timer ticks
  useEffect(() => {
    if (!timerState || timerState.isPaused || timerState.phase === 'finished') {
      // Clear interval when paused or finished
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start interval if not already running
    if (intervalRef.current === null) {
      lastTickTimeRef.current = performance.now();
      intervalRef.current = window.setInterval(performTick, TICK_INTERVAL_MS);
    }

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState?.isPaused, timerState?.phase, timerState, performTick]);

  // Handle browser backgrounding with visibilitychange
  // Also handles screen wake lock re-acquisition (wake lock auto-releases on background)
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) {
        // Tab is hidden - pause the interval but keep tracking time
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        // Wake lock is automatically released by the browser when hidden
        // No explicit release needed here
      } else {
        // Tab is visible again - calculate elapsed time and catch up
        if (timerState && !timerState.isPaused && timerState.phase !== 'finished') {
          const now = performance.now();
          const elapsed = now - lastTickTimeRef.current;
          lastTickTimeRef.current = now;

          // Apply the elapsed time to catch up
          tick(elapsed);

          // Restart the interval
          intervalRef.current = window.setInterval(performTick, TICK_INTERVAL_MS);
        }
        // Re-acquire wake lock when tab becomes visible again
        void reacquireWakeLock();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [timerState, tick, performTick]);

  // Acquire/release screen wake lock based on workout state
  useEffect(() => {
    if (!timerState) return;

    if (!timerState.isPaused && timerState.phase !== 'finished') {
      // Workout is actively running — acquire wake lock
      void requestWakeLock();
    } else {
      // Workout is paused or finished — release wake lock
      void releaseWakeLock();
    }
  }, [timerState?.isPaused, timerState?.phase, timerState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
      void countdownSoundPlayer.cleanup();
      void releaseWakeLock();
    };
  }, [countdownSoundPlayer]);

  useEffect(() => {
    if (!timerState || timerState.phase === 'finished') {
      countdownPhaseIndexRef.current = null;
      countdownRemainingRef.current = null;
      playedCountdownSecondsRef.current = [];
      return;
    }

    const previousPhaseIndex = countdownPhaseIndexRef.current;
    const previousRemainingSec = countdownRemainingRef.current;
    const isNewPhase = previousPhaseIndex !== timerState.currentPhaseIndex;
    const isPhaseRestart =
      previousRemainingSec !== null && timerState.remainingSec > previousRemainingSec;

    if (isNewPhase || isPhaseRestart) {
      playedCountdownSecondsRef.current = [];
    }

    const countdownSeconds = getCountdownSeconds({
      previousRemainingSec: isNewPhase || isPhaseRestart ? undefined : previousRemainingSec ?? undefined,
      currentRemainingSec: timerState.remainingSec,
      alreadyPlayed: playedCountdownSecondsRef.current,
      soundEnabled,
    });

    if (countdownSeconds.length > 0) {
      playedCountdownSecondsRef.current = [
        ...playedCountdownSecondsRef.current,
        ...countdownSeconds,
      ];
      void countdownSoundPlayer.playBeeps(countdownSeconds);
    }

    countdownPhaseIndexRef.current = timerState.currentPhaseIndex;
    countdownRemainingRef.current = timerState.remainingSec;
  }, [countdownSoundPlayer, soundEnabled, timerState]);

  // Handle end early
  const handleEndEarly = useCallback(async () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    await endEarly();
    if (id) {
      navigate(`/workout/${id}`);
    }
  }, [endEarly, id, navigate]);

  const handleResume = useCallback(() => {
    primeCountdownAudio();
    resume();
  }, [resume]);

  // Handle back navigation (abandon workout)
  const handleBackToWorkout = useCallback(async () => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    await endEarly();
    if (id) {
      navigate(`/workout/${id}`);
    }
  }, [endEarly, id, navigate]);

  // Loading state
  if (!workout) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading workout...</div>
      </div>
    );
  }

  // No blocks state
  if (workout.blocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <p className="text-gray-600 mb-4">This workout has no exercises.</p>
        <button
          onClick={() => navigate(`/workout/${id}`)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Timer not initialized yet
  if (!timerState || !sequence) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Starting workout...</div>
      </div>
    );
  }

  // Get current phase info
  const currentPhase = getCurrentPhase(timerState, sequence);
  const progress = getProgress(timerState, sequence) / 100; // Convert to 0-1

  // Get block info for display
  const currentBlock = workout.blocks[timerState.currentBlockIndex];
  const blockName = currentPhase?.blockName || currentBlock?.name || 'Workout';
  const totalRepeats = currentBlock?.repeatCount || 1;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50" onClickCapture={primeCountdownAudio}>
      {/* Header with back button */}
      <header className="flex items-center p-4 bg-white border-b border-gray-200">
        <button
          onClick={handleBackToWorkout}
          className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-gray-600 active:bg-gray-100"
          aria-label="End workout and go back"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path
              fillRule="evenodd"
              d="M7.72 12.53a.75.75 0 010-1.06l7.5-7.5a.75.75 0 111.06 1.06L9.31 12l6.97 6.97a.75.75 0 11-1.06 1.06l-7.5-7.5z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <h1 className="flex-1 text-lg font-semibold text-gray-900 text-center pr-10">
          {workout.title}
        </h1>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col justify-center p-4 pb-8">
        {/* Timer display */}
        <div className="mb-8">
          <TimerDisplay
            remainingSec={Math.ceil(timerState.remainingSec)}
            phase={timerState.phase}
            blockName={blockName}
            currentRepeat={timerState.currentRepeat}
            totalRepeats={totalRepeats}
            progress={progress}
          />
        </div>

        {/* Up next indicator */}
        {timerState.phase !== 'finished' && sequence.phases.length > timerState.currentPhaseIndex + 1 && (
          <div className="mb-6 text-center">
            <span className="text-sm text-gray-500">
              Up next:{' '}
              <span className="font-medium text-gray-700">
                {sequence.phases[timerState.currentPhaseIndex + 1].type === 'exercise'
                  ? sequence.phases[timerState.currentPhaseIndex + 1].blockName
                  : 'Rest'}
              </span>
            </span>
          </div>
        )}

        {/* Timer controls */}
        {timerState.phase !== 'finished' && (
          <TimerControls
            isPaused={timerState.isPaused}
            onPause={pause}
            onResume={handleResume}
            onSkip={skip}
            onBack={goBack}
            onEndEarly={handleEndEarly}
          />
        )}

        {/* Finished state */}
        {timerState.phase === 'finished' && (
          <div className="text-center">
            <p className="text-lg text-gray-600">Great job! Redirecting...</p>
          </div>
        )}
      </main>
    </div>
  );
}

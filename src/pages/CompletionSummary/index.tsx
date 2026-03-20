import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { navigateToWorkoutRun } from '../../audio/countdownNavigation';
import { useSessionStore } from '../../stores/sessionStore';
import { useTimerStore } from '../../stores/timerStore';
import { formatTime } from '../../utils/format';
import type { WorkoutSession } from '../../domain/session';

/**
 * Completion summary page - shows workout results after completion or abandonment.
 *
 * Features:
 * - Shows workout title
 * - Shows completion status (Completed vs Abandoned)
 * - Shows elapsed time
 * - Shows blocks/repeats completed
 * - "Done" button returns to workout library
 * - "Start Again" button to repeat the workout
 */
export function CompletionSummary() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { sessions, loadSessions } = useSessionStore();
  const { reset: resetTimer, sessionId: currentSessionId } = useTimerStore();

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load sessions and find the most recent one for this workout
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        // Load sessions if not already loaded
        if (sessions.length === 0) {
          await loadSessions();
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [loadSessions, sessions.length]);

  // Find the session once sessions are loaded
  useEffect(() => {
    if (!id || sessions.length === 0) return;

    // First try to find by current session ID from timer store
    if (currentSessionId) {
      const currentSession = sessions.find((s) => s.id === currentSessionId);
      if (currentSession) {
        setSession(currentSession);
        return;
      }
    }

    // Fallback: find the most recent completed/abandoned session for this workout
    const workoutSessions = sessions
      .filter((s) => s.workoutId === id && s.status !== 'in_progress')
      .sort((a, b) => {
        const aTime = a.endedAt ? new Date(a.endedAt).getTime() : 0;
        const bTime = b.endedAt ? new Date(b.endedAt).getTime() : 0;
        return bTime - aTime;
      });

    if (workoutSessions.length > 0) {
      setSession(workoutSessions[0]);
    }
  }, [id, sessions, currentSessionId]);

  // Handle "Done" button - go to workout library
  const handleDone = () => {
    resetTimer();
    navigate('/');
  };

  // Handle "Start Again" button - restart the workout
  const handleStartAgain = () => {
    resetTimer();
    if (id) {
      navigateToWorkoutRun(navigate, id);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  // No session found
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <p className="text-gray-600 mb-4">No workout session found.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg font-medium"
        >
          Go to Library
        </button>
      </div>
    );
  }

  const isCompleted = session.status === 'completed';
  const statusText = isCompleted ? 'Completed' : 'Ended Early';
  const statusColor = isCompleted ? 'text-green-600' : 'text-orange-500';
  const statusBgColor = isCompleted ? 'bg-green-50' : 'bg-orange-50';

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <header className="p-4 bg-white border-b border-gray-200">
        <h1 className="text-lg font-semibold text-gray-900 text-center">
          Workout Summary
        </h1>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col p-4">
        {/* Status badge */}
        <div className="flex justify-center mb-6">
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${statusBgColor} ${statusColor}`}
          >
            {statusText}
          </span>
        </div>

        {/* Workout title */}
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
          {session.workoutSnapshotTitle}
        </h2>

        {/* Stats cards */}
        <div className="space-y-4 mb-8">
          {/* Elapsed time */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Time</span>
              <span className="text-xl font-semibold text-gray-900">
                {formatTime(session.elapsedDurationSec)}
              </span>
            </div>
          </div>

          {/* Blocks completed */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Blocks</span>
              <span className="text-xl font-semibold text-gray-900">
                {session.completedBlocks} of {session.totalBlocks}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{
                  width: `${session.totalBlocks > 0 ? (session.completedBlocks / session.totalBlocks) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          {/* Repeats completed */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Repeats</span>
              <span className="text-xl font-semibold text-gray-900">
                {session.completedRepeats} of {session.totalRepeats}
              </span>
            </div>
            {/* Progress bar */}
            <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{
                  width: `${session.totalRepeats > 0 ? (session.completedRepeats / session.totalRepeats) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={handleStartAgain}
            className="w-full py-4 bg-blue-500 text-white rounded-xl font-semibold text-lg active:bg-blue-600 transition-colors"
          >
            Start Again
          </button>
          <button
            onClick={handleDone}
            className="w-full py-4 bg-gray-100 text-gray-700 rounded-xl font-semibold text-lg active:bg-gray-200 transition-colors"
          >
            Done
          </button>
        </div>
      </main>
    </div>
  );
}

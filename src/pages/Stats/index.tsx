import { useEffect } from 'react';
import { performLogout } from '../../auth/logout';
import { AccountMenu } from '../../components';
import { useAuthStore } from '../../stores/authStore';
import { useSessionStore } from '../../stores/sessionStore';
import { useWorkoutStore } from '../../stores/workoutStore';

/**
 * Formats minutes as a human-readable duration string.
 * Examples: "0 min", "45 min", "1 hr 30 min", "2 hr"
 */
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins > 0) {
    return `${hours} hr ${mins} min`;
  }
  return `${hours} hr`;
}

/**
 * Formats a completion rate (0-1) as a percentage string.
 */
function formatPercentage(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
}

function StatCard({ label, value, sublabel }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-gray-400">{sublabel}</p>}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">No stats yet</h2>
      <p className="text-gray-500 max-w-xs">
        Complete your first workout to start tracking your progress.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-gray-500">Loading stats...</p>
    </div>
  );
}

/**
 * Stats dashboard page - shows workout statistics.
 * Features:
 * - Total workouts created
 * - Total sessions completed
 * - Total time exercised
 * - Most used workout
 * - Average session length
 * - Completion rate
 * - Empty state when no sessions exist
 */
export function Stats() {
  const username = useAuthStore((state) => state.username);
  const { sessions, stats, isLoading, loadSessions, computeStats } = useSessionStore();

  // Use selectors for data to prevent unnecessary re-renders
  const workouts = useWorkoutStore((state) => state.workouts);
  const loadWorkouts = useWorkoutStore((state) => state.loadWorkouts);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([loadSessions(), loadWorkouts()]);
    };
    loadData();
  }, [loadSessions, loadWorkouts]);

  // Compute stats when sessions or workouts change
  useEffect(() => {
    if (sessions.length > 0 || workouts.length > 0) {
      computeStats();
    }
  }, [sessions, workouts, computeStats]);

  const hasData = sessions.length > 0 || (stats && stats.totalWorkoutsCreated > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Stats</h1>
          {username && <AccountMenu username={username} onLogout={performLogout} />}
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {isLoading ? (
          <LoadingState />
        ) : !hasData ? (
          <EmptyState />
        ) : stats ? (
          <div className="space-y-4">
            {/* Primary stats */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Workouts Created"
                value={stats.totalWorkoutsCreated}
              />
              <StatCard
                label="Sessions Completed"
                value={stats.totalSessionsCompleted}
              />
            </div>

            {/* Time stats */}
            <StatCard
              label="Total Time Exercised"
              value={formatMinutes(stats.totalMinutesCompleted)}
            />

            {/* Most used workout */}
            {stats.mostUsedWorkout && (
              <StatCard
                label="Most Used Workout"
                value={stats.mostUsedWorkout.title}
                sublabel={`${stats.mostUsedWorkout.count} ${stats.mostUsedWorkout.count === 1 ? 'session' : 'sessions'}`}
              />
            )}

            {/* Secondary stats */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Avg Session Length"
                value={`${stats.averageSessionLengthMin} min`}
              />
              <StatCard
                label="Completion Rate"
                value={formatPercentage(stats.completionRate)}
                sublabel="completed vs started"
              />
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

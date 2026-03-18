import { useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../../stores/workoutStore';
import { BlockCard } from '../../components';
import { formatDuration } from '../../utils/format';
import { unlockCountdownAudio } from '../../audio/countdownSound';

/**
 * Workout detail page showing a read-only view of a workout before starting.
 * Displays workout info, blocks, and provides Start/Edit actions.
 */
export function WorkoutDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use selectors for data to prevent unnecessary re-renders
  const workouts = useWorkoutStore((state) => state.workouts);
  const isLoading = useWorkoutStore((state) => state.isLoading);
  const loadWorkouts = useWorkoutStore((state) => state.loadWorkouts);

  useEffect(() => {
    if (workouts.length === 0) {
      loadWorkouts();
    }
  }, [workouts.length, loadWorkouts]);

  const workout = workouts.find((w) => w.id === id);
  const handleStartWorkout = useCallback(() => {
    void unlockCountdownAudio();
    navigate(`/workout/${id}/run`);
  }, [id, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <div className="text-gray-500">Workout not found</div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-700"
        >
          Back to Library
        </button>
      </div>
    );
  }

  const sortedBlocks = [...workout.blocks].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Back to library"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 truncate">{workout.title}</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate(`/workout/${id}/edit`)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100"
            aria-label="Edit workout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Workout Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {formatDuration(workout.estimatedDurationSec)}
            </span>
            <span className="text-gray-300">|</span>
            <span>{workout.blocks.length} {workout.blocks.length === 1 ? 'block' : 'blocks'}</span>
          </div>

          {workout.description && (
            <p className="mt-3 text-gray-700">{workout.description}</p>
          )}
        </div>

        {/* Blocks List */}
        {sortedBlocks.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              Exercises
            </h2>
            {sortedBlocks.map((block) => (
              <BlockCard key={block.id} block={block} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No exercises added yet.
            <button
              type="button"
              onClick={() => navigate(`/workout/${id}/edit`)}
              className="block mx-auto mt-2 text-blue-600 hover:text-blue-700"
            >
              Add exercises
            </button>
          </div>
        )}
      </div>

      {/* Start Button */}
      {sortedBlocks.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-8">
          <button
            type="button"
            onClick={handleStartWorkout}
            className="w-full py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold rounded-xl shadow-lg transition-colors"
          >
            Start Workout
          </button>
        </div>
      )}
    </div>
  );
}

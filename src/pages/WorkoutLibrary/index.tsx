import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../../stores/workoutStore';
import { formatDuration, formatLastUsed } from '../../utils/format';
import type { Workout } from '../../domain/workout';

interface WorkoutCardProps {
  workout: Workout;
  onOpen: () => void;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function WorkoutCard({
  workout,
  onOpen,
  onStart,
  onEdit,
  onDelete,
  onDuplicate,
}: WorkoutCardProps) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex-1 min-w-0 text-left rounded-lg hover:bg-gray-50 active:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label={`Open ${workout.title} details`}
        >
          <div className="pr-2">
            <h3 className="font-semibold text-gray-900 truncate">{workout.title}</h3>
            <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
              <span>{formatDuration(workout.estimatedDurationSec)}</span>
              <span className="text-gray-300">|</span>
              <span>{formatLastUsed(workout.lastUsedAt)}</span>
            </div>
            {workout.description && (
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">{workout.description}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              {workout.blocks.length} {workout.blocks.length === 1 ? 'block' : 'blocks'}
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setShowActions(!showActions)}
          className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 active:bg-gray-200"
          aria-label="More actions"
          aria-expanded={showActions}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </div>

      {/* Action buttons row */}
      <div className="border-t border-gray-100 px-4 py-3 flex gap-2">
        <button
          type="button"
          onClick={onStart}
          className="flex-1 h-11 flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Start
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="h-11 px-4 flex items-center justify-center rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100"
        >
          Edit
        </button>
      </div>

      {/* Expanded actions menu */}
      {showActions && (
        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50 flex gap-2">
          <button
            type="button"
            onClick={() => {
              onDuplicate();
              setShowActions(false);
            }}
            className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Delete "${workout.title}"? This cannot be undone.`)) {
                onDelete();
              }
              setShowActions(false);
            }}
            className="flex-1 h-10 flex items-center justify-center gap-2 rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

export function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">No workouts yet</h2>
      <p className="text-gray-500 mb-6 max-w-xs">
        Create your first workout to start timing your exercises.
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="h-12 px-6 flex items-center justify-center gap-2 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Create Workout
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-gray-500">Loading workouts...</p>
    </div>
  );
}

/**
 * Workout Library page - the home screen showing all workouts.
 * Features:
 * - List of workout cards with title, duration, last used
 * - Create workout button
 * - Card actions: Start, Edit, Delete, Duplicate
 * - Empty state when no workouts exist
 * - Loading state while fetching
 */
export function WorkoutLibrary() {
  const navigate = useNavigate();

  // Use selectors for data that changes frequently to prevent unnecessary re-renders
  const workouts = useWorkoutStore((state) => state.workouts);
  const isLoading = useWorkoutStore((state) => state.isLoading);
  const loadWorkouts = useWorkoutStore((state) => state.loadWorkouts);
  const deleteWorkout = useWorkoutStore((state) => state.deleteWorkout);
  const duplicateWorkout = useWorkoutStore((state) => state.duplicateWorkout);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const handleCreate = () => {
    navigate('/workout/new');
  };

  const handleStart = (workoutId: string) => {
    navigate(`/workout/${workoutId}/run`);
  };

  const handleOpen = (workoutId: string) => {
    navigate(`/workout/${workoutId}`);
  };

  const handleEdit = (workoutId: string) => {
    navigate(`/workout/${workoutId}/edit`);
  };

  const handleDelete = async (workoutId: string) => {
    try {
      await deleteWorkout(workoutId);
    } catch (error) {
      console.error('Failed to delete workout:', error);
    }
  };

  const handleDuplicate = async (workoutId: string) => {
    try {
      await duplicateWorkout(workoutId);
    } catch (error) {
      console.error('Failed to duplicate workout:', error);
    }
  };

  // Sort workouts: most recently used first, then by creation date
  const sortedWorkouts = [...workouts].sort((a, b) => {
    if (a.lastUsedAt && b.lastUsedAt) {
      return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
    }
    if (a.lastUsedAt) return -1;
    if (b.lastUsedAt) return 1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Workouts</h1>
          {workouts.length > 0 && (
            <button
              type="button"
              onClick={handleCreate}
              className="h-10 px-4 flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              New
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="p-4">
        {isLoading ? (
          <LoadingState />
        ) : workouts.length === 0 ? (
          <EmptyState onCreate={handleCreate} />
        ) : (
          <div className="space-y-4">
            {sortedWorkouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                onOpen={() => handleOpen(workout.id)}
                onStart={() => handleStart(workout.id)}
                onEdit={() => handleEdit(workout.id)}
                onDelete={() => handleDelete(workout.id)}
                onDuplicate={() => handleDuplicate(workout.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

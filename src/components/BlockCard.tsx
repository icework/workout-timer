import type { ExerciseBlock } from '../domain/workout';

interface BlockCardProps {
  block: ExerciseBlock;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Formats seconds as MM:SS string.
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Displays an exercise block's information.
 * Shows block name, exercise duration, rest duration, and repeat count.
 * Optionally displays an image and edit/delete actions.
 */
export function BlockCard({ block, onEdit, onDelete }: BlockCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <div className="flex gap-4">
        {block.imageUrl && (
          <div className="flex-shrink-0">
            <img
              src={block.imageUrl}
              alt={block.name}
              className="w-16 h-16 rounded-lg object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{block.name}</h3>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <span className="text-green-600">●</span>
              {formatDuration(block.exerciseDurationSec)}
            </span>

            {block.restDurationSec > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-blue-600">●</span>
                {formatDuration(block.restDurationSec)} rest
              </span>
            )}

            {block.repeatCount > 1 && (
              <span className="flex items-center gap-1">
                <span className="text-purple-600">×</span>
                {block.repeatCount}
              </span>
            )}
          </div>

          {block.notes && (
            <p className="mt-2 text-sm text-gray-500 line-clamp-2">
              {block.notes}
            </p>
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="flex flex-col gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200"
                aria-label={`Edit ${block.name}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="w-11 h-11 flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 active:bg-red-100"
                aria-label={`Delete ${block.name}`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

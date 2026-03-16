import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkoutStore } from '../../stores/workoutStore';
import { BlockCard, DurationInput } from '../../components';
import type { ExerciseBlock } from '../../domain/workout';

interface BlockFormData {
  name: string;
  exerciseDurationSec: number;
  restDurationSec: number;
  repeatCount: number;
}

const defaultBlockForm: BlockFormData = {
  name: '',
  exerciseDurationSec: 30,
  restDurationSec: 10,
  repeatCount: 1,
};

/**
 * Block form component for adding/editing exercise blocks.
 * Displayed inline below the block list.
 */
function BlockForm({
  initialData,
  onSave,
  onCancel,
}: {
  initialData?: BlockFormData;
  onSave: (data: BlockFormData) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<BlockFormData>(initialData ?? defaultBlockForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) {
      newErrors.name = 'Name is required';
    }
    if (form.exerciseDurationSec <= 0) {
      newErrors.exerciseDurationSec = 'Exercise duration must be greater than 0';
    }
    if (form.repeatCount < 1) {
      newErrors.repeatCount = 'Repeat count must be at least 1';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({ ...form, name: form.name.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-4">
        {initialData ? 'Edit Block' : 'Add Block'}
      </h3>

      <div className="space-y-4">
        {/* Name input */}
        <div>
          <label htmlFor="block-name" className="block text-sm font-medium text-gray-700 mb-1">
            Exercise Name
          </label>
          <input
            id="block-name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g., Push-ups, Squats"
            className={`w-full h-11 px-3 rounded-lg border ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>

        {/* Exercise duration */}
        <div>
          <DurationInput
            label="Exercise Duration"
            value={form.exerciseDurationSec}
            onChange={(value) => setForm({ ...form, exerciseDurationSec: value })}
            min={1}
          />
          {errors.exerciseDurationSec && (
            <p className="mt-1 text-sm text-red-500">{errors.exerciseDurationSec}</p>
          )}
        </div>

        {/* Rest duration */}
        <div>
          <DurationInput
            label="Rest Duration"
            value={form.restDurationSec}
            onChange={(value) => setForm({ ...form, restDurationSec: value })}
            min={0}
          />
        </div>

        {/* Repeat count */}
        <div>
          <label htmlFor="repeat-count" className="block text-sm font-medium text-gray-700 mb-1">
            Repeat Count
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setForm({ ...form, repeatCount: Math.max(1, form.repeatCount - 1) })}
              disabled={form.repeatCount <= 1}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 text-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed active:bg-gray-200"
              aria-label="Decrease repeat count"
            >
              −
            </button>
            <input
              id="repeat-count"
              type="number"
              value={form.repeatCount}
              onChange={(e) =>
                setForm({ ...form, repeatCount: Math.max(1, parseInt(e.target.value, 10) || 1) })
              }
              min={1}
              max={100}
              className="w-16 h-11 text-center text-lg font-mono bg-white border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setForm({ ...form, repeatCount: Math.min(100, form.repeatCount + 1) })}
              disabled={form.repeatCount >= 100}
              className="w-11 h-11 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 text-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed active:bg-gray-200"
              aria-label="Increase repeat count"
            >
              +
            </button>
          </div>
          {errors.repeatCount && <p className="mt-1 text-sm text-red-500">{errors.repeatCount}</p>}
        </div>
      </div>

      {/* Form actions */}
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 h-11 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 h-11 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800"
        >
          {initialData ? 'Update' : 'Add'}
        </button>
      </div>
    </form>
  );
}

/**
 * Extended BlockCard with move up/down buttons for reordering.
 */
function ReorderableBlockCard({
  block,
  index,
  total,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  block: ExerciseBlock;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="flex gap-2 items-start">
      {/* Reorder buttons */}
      <div className="flex flex-col gap-1 pt-2">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={index === 0}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`Move ${block.name} up`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={index === total - 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`Move ${block.name} down`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Block card */}
      <div className="flex-1">
        <BlockCard block={block} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </div>
  );
}

/**
 * Workout Builder page for creating and editing workouts.
 * Routes:
 * - /workout/new - Create new workout
 * - /workout/:id/edit - Edit existing workout
 */
export function WorkoutBuilder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const {
    loadWorkouts,
    createWorkout,
    updateWorkout,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
  } = useWorkoutStore();

  // Use selectors for data to prevent unnecessary re-renders
  const workouts = useWorkoutStore((state) => state.workouts);
  const isLoading = useWorkoutStore((state) => state.isLoading);

  // Local form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [blocks, setBlocks] = useState<ExerciseBlock[]>([]);
  const [workoutId, setWorkoutId] = useState<string | null>(null);

  // Block form state
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [editingBlockIndex, setEditingBlockIndex] = useState<number | null>(null);

  // Form validation
  const [titleError, setTitleError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Load workout data for edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadWorkouts();
    }
  }, [id, isEditMode, loadWorkouts]);

  // Update blocks when workouts change (for edit mode)
  useEffect(() => {
    if (isEditMode && id) {
      const workout = workouts.find((w) => w.id === id);
      if (workout) {
        setTitle(workout.title);
        setDescription(workout.description ?? '');
        setBlocks([...workout.blocks]);
        setWorkoutId(workout.id);
      }
    }
  }, [workouts, id, isEditMode]);

  const handleSave = async () => {
    // Validate title
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError('');
    setIsSaving(true);

    try {
      if (isEditMode && workoutId) {
        // Update existing workout
        await updateWorkout(workoutId, {
          title: title.trim(),
          description: description.trim() || undefined,
          blocks,
        });
        navigate(`/workout/${workoutId}`);
      } else {
        // Create new workout
        const newWorkout = await createWorkout(title.trim());
        setWorkoutId(newWorkout.id);

        // Update description if provided
        if (description.trim()) {
          await updateWorkout(newWorkout.id, { description: description.trim() });
        }

        // Add blocks
        for (const block of blocks) {
          await addBlock(newWorkout.id, {
            name: block.name,
            exerciseDurationSec: block.exerciseDurationSec,
            restDurationSec: block.restDurationSec,
            repeatCount: block.repeatCount,
          });
        }

        navigate(`/workout/${newWorkout.id}`);
      }
    } catch (error) {
      console.error('Failed to save workout:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddBlock = (data: BlockFormData) => {
    if (isEditMode && workoutId) {
      // In edit mode, add directly to store
      addBlock(workoutId, data);
    } else {
      // In create mode, add to local state
      const newBlock: ExerciseBlock = {
        id: `temp-${Date.now()}`,
        workoutId: workoutId ?? 'temp',
        order: blocks.length,
        ...data,
      };
      setBlocks([...blocks, newBlock]);
    }
    setShowBlockForm(false);
  };

  const handleEditBlock = (index: number, data: BlockFormData) => {
    const block = blocks[index];
    if (isEditMode && workoutId) {
      // In edit mode, update directly in store
      updateBlock(block.id, data);
    } else {
      // In create mode, update local state
      const updatedBlocks = [...blocks];
      updatedBlocks[index] = { ...block, ...data };
      setBlocks(updatedBlocks);
    }
    setEditingBlockIndex(null);
  };

  const handleDeleteBlock = (index: number) => {
    const block = blocks[index];
    if (window.confirm(`Delete "${block.name}"?`)) {
      if (isEditMode && workoutId) {
        // In edit mode, remove from store
        removeBlock(block.id);
      } else {
        // In create mode, remove from local state
        const updatedBlocks = blocks.filter((_, i) => i !== index);
        setBlocks(updatedBlocks.map((b, i) => ({ ...b, order: i })));
      }
    }
  };

  const handleMoveBlock = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    [newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]];
    const reorderedBlocks = newBlocks.map((b, i) => ({ ...b, order: i }));

    if (isEditMode && workoutId) {
      // In edit mode, reorder in store
      reorderBlocks(workoutId, reorderedBlocks.map((b) => b.id));
    } else {
      // In create mode, update local state
      setBlocks(reorderedBlocks);
    }
  };

  const handleCancel = () => {
    if (isEditMode && workoutId) {
      navigate(`/workout/${workoutId}`);
    } else {
      navigate('/');
    }
  };

  if (isLoading && isEditMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className="h-10 px-3 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            aria-label="Cancel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">
            {isEditMode ? 'Edit Workout' : 'New Workout'}
          </h1>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-10 px-4 flex items-center justify-center rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 space-y-6">
        {/* Title input */}
        <div>
          <label htmlFor="workout-title" className="block text-sm font-medium text-gray-700 mb-1">
            Workout Title
          </label>
          <input
            id="workout-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (titleError) setTitleError('');
            }}
            placeholder="e.g., Morning HIIT, Full Body Strength"
            className={`w-full h-12 px-4 rounded-xl border ${
              titleError ? 'border-red-500' : 'border-gray-300'
            } focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg`}
          />
          {titleError && <p className="mt-1 text-sm text-red-500">{titleError}</p>}
        </div>

        {/* Description input */}
        <div>
          <label htmlFor="workout-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="workout-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add notes about this workout..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Blocks section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-gray-700">
              Exercise Blocks ({blocks.length})
            </h2>
          </div>

          {/* Block list */}
          {blocks.length > 0 && (
            <div className="space-y-3 mb-4">
              {blocks.map((block, index) =>
                editingBlockIndex === index ? (
                  <BlockForm
                    key={block.id}
                    initialData={{
                      name: block.name,
                      exerciseDurationSec: block.exerciseDurationSec,
                      restDurationSec: block.restDurationSec,
                      repeatCount: block.repeatCount,
                    }}
                    onSave={(data) => handleEditBlock(index, data)}
                    onCancel={() => setEditingBlockIndex(null)}
                  />
                ) : (
                  <ReorderableBlockCard
                    key={block.id}
                    block={block}
                    index={index}
                    total={blocks.length}
                    onEdit={() => setEditingBlockIndex(index)}
                    onDelete={() => handleDeleteBlock(index)}
                    onMoveUp={() => handleMoveBlock(index, 'up')}
                    onMoveDown={() => handleMoveBlock(index, 'down')}
                  />
                )
              )}
            </div>
          )}

          {/* Block form or add button */}
          {showBlockForm ? (
            <BlockForm onSave={handleAddBlock} onCancel={() => setShowBlockForm(false)} />
          ) : (
            <button
              type="button"
              onClick={() => setShowBlockForm(true)}
              className="w-full h-14 flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 font-medium hover:border-blue-400 hover:text-blue-600 active:bg-blue-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Block
            </button>
          )}
        </div>

        {/* Empty state hint */}
        {blocks.length === 0 && !showBlockForm && (
          <p className="text-center text-gray-500 text-sm">
            Add exercise blocks to build your workout routine.
          </p>
        )}
      </main>
    </div>
  );
}

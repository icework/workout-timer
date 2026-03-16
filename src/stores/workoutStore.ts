import { create } from 'zustand';
import type { Workout, ExerciseBlock } from '../domain/workout';
import {
  createWorkout as createWorkoutDomain,
  createBlock,
  updateWorkoutDuration,
} from '../domain/workout';
import { workoutRepo } from '../persistence/workoutRepo';

// ============================================================================
// Types
// ============================================================================

interface WorkoutStore {
  workouts: Workout[];
  currentWorkout: Workout | null;
  isLoading: boolean;

  // Actions
  loadWorkouts: () => Promise<void>;
  setCurrentWorkout: (workout: Workout | null) => void;
  createWorkout: (title: string) => Promise<Workout>;
  updateWorkout: (id: string, updates: Partial<Workout>) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>; // soft delete
  duplicateWorkout: (id: string) => Promise<Workout>;
  addBlock: (
    workoutId: string,
    block: Omit<ExerciseBlock, 'id' | 'workoutId' | 'order'>
  ) => Promise<void>;
  updateBlock: (blockId: string, updates: Partial<ExerciseBlock>) => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  reorderBlocks: (workoutId: string, blockIds: string[]) => Promise<void>;
}

// ============================================================================
// Store
// ============================================================================

export const useWorkoutStore = create<WorkoutStore>((set, get) => ({
  workouts: [],
  currentWorkout: null,
  isLoading: false,

  loadWorkouts: async () => {
    set({ isLoading: true });
    try {
      const workouts = await workoutRepo.getAll();
      set({ workouts, isLoading: false });
    } catch (error) {
      console.error('Failed to load workouts:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  setCurrentWorkout: (workout) => {
    set({ currentWorkout: workout });
  },

  createWorkout: async (title) => {
    const workout = createWorkoutDomain(title);
    await workoutRepo.save(workout);
    set((state) => ({
      workouts: [...state.workouts, workout],
    }));
    return workout;
  },

  updateWorkout: async (id, updates) => {
    const { workouts, currentWorkout } = get();
    const workout = workouts.find((w) => w.id === id);
    if (!workout) {
      throw new Error(`Workout not found: ${id}`);
    }

    const updatedWorkout: Workout = {
      ...workout,
      ...updates,
      updatedAt: new Date(),
    };

    // Recalculate duration if blocks changed
    const finalWorkout = updates.blocks
      ? updateWorkoutDuration(updatedWorkout)
      : updatedWorkout;

    await workoutRepo.save(finalWorkout);

    set({
      workouts: workouts.map((w) => (w.id === id ? finalWorkout : w)),
      currentWorkout: currentWorkout?.id === id ? finalWorkout : currentWorkout,
    });
  },

  deleteWorkout: async (id) => {
    await workoutRepo.softDelete(id);
    const { currentWorkout } = get();
    set((state) => ({
      workouts: state.workouts.filter((w) => w.id !== id),
      currentWorkout: currentWorkout?.id === id ? null : currentWorkout,
    }));
  },

  duplicateWorkout: async (id) => {
    const { workouts } = get();
    const original = workouts.find((w) => w.id === id);
    if (!original) {
      throw new Error(`Workout not found: ${id}`);
    }

    // Create new workout with copied title
    const newWorkout = createWorkoutDomain(`${original.title} (Copy)`);
    newWorkout.description = original.description;

    // Copy blocks with new IDs
    newWorkout.blocks = original.blocks.map((block, index) => ({
      ...createBlock(newWorkout.id, block.name, block.exerciseDurationSec),
      order: index,
      restDurationSec: block.restDurationSec,
      repeatCount: block.repeatCount,
      notes: block.notes,
      imageUrl: block.imageUrl,
    }));

    // Update duration
    const finalWorkout = updateWorkoutDuration(newWorkout);

    await workoutRepo.save(finalWorkout);
    set((state) => ({
      workouts: [...state.workouts, finalWorkout],
    }));

    return finalWorkout;
  },

  addBlock: async (workoutId, blockData) => {
    const { workouts, currentWorkout } = get();
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) {
      throw new Error(`Workout not found: ${workoutId}`);
    }

    // Create new block with proper order
    const newBlock = createBlock(workoutId, blockData.name, blockData.exerciseDurationSec);
    newBlock.order = workout.blocks.length;
    newBlock.restDurationSec = blockData.restDurationSec ?? 0;
    newBlock.repeatCount = blockData.repeatCount ?? 1;
    newBlock.notes = blockData.notes;
    newBlock.imageUrl = blockData.imageUrl;

    const updatedWorkout: Workout = {
      ...workout,
      blocks: [...workout.blocks, newBlock],
    };

    const finalWorkout = updateWorkoutDuration(updatedWorkout);
    await workoutRepo.save(finalWorkout);

    set({
      workouts: workouts.map((w) => (w.id === workoutId ? finalWorkout : w)),
      currentWorkout: currentWorkout?.id === workoutId ? finalWorkout : currentWorkout,
    });
  },

  updateBlock: async (blockId, updates) => {
    const { workouts, currentWorkout } = get();

    // Find workout containing this block
    const workout = workouts.find((w) => w.blocks.some((b) => b.id === blockId));
    if (!workout) {
      throw new Error(`Block not found: ${blockId}`);
    }

    const updatedBlocks = workout.blocks.map((block) =>
      block.id === blockId ? { ...block, ...updates } : block
    );

    const updatedWorkout: Workout = {
      ...workout,
      blocks: updatedBlocks,
    };

    const finalWorkout = updateWorkoutDuration(updatedWorkout);
    await workoutRepo.save(finalWorkout);

    set({
      workouts: workouts.map((w) => (w.id === workout.id ? finalWorkout : w)),
      currentWorkout: currentWorkout?.id === workout.id ? finalWorkout : currentWorkout,
    });
  },

  removeBlock: async (blockId) => {
    const { workouts, currentWorkout } = get();

    // Find workout containing this block
    const workout = workouts.find((w) => w.blocks.some((b) => b.id === blockId));
    if (!workout) {
      throw new Error(`Block not found: ${blockId}`);
    }

    // Remove block and reorder remaining blocks
    const updatedBlocks = workout.blocks
      .filter((b) => b.id !== blockId)
      .map((block, index) => ({ ...block, order: index }));

    const updatedWorkout: Workout = {
      ...workout,
      blocks: updatedBlocks,
    };

    const finalWorkout = updateWorkoutDuration(updatedWorkout);
    await workoutRepo.save(finalWorkout);

    set({
      workouts: workouts.map((w) => (w.id === workout.id ? finalWorkout : w)),
      currentWorkout: currentWorkout?.id === workout.id ? finalWorkout : currentWorkout,
    });
  },

  reorderBlocks: async (workoutId, blockIds) => {
    const { workouts, currentWorkout } = get();
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) {
      throw new Error(`Workout not found: ${workoutId}`);
    }

    // Create a map for quick lookup
    const blockMap = new Map(workout.blocks.map((b) => [b.id, b]));

    // Reorder blocks according to blockIds array
    const reorderedBlocks = blockIds
      .map((id, index) => {
        const block = blockMap.get(id);
        if (!block) {
          throw new Error(`Block not found: ${id}`);
        }
        return { ...block, order: index };
      });

    const updatedWorkout: Workout = {
      ...workout,
      blocks: reorderedBlocks,
    };

    const finalWorkout = updateWorkoutDuration(updatedWorkout);
    await workoutRepo.save(finalWorkout);

    set({
      workouts: workouts.map((w) => (w.id === workoutId ? finalWorkout : w)),
      currentWorkout: currentWorkout?.id === workoutId ? finalWorkout : currentWorkout,
    });
  },
}));

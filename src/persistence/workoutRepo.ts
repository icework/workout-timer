import { db } from './db';
import type { Workout } from '../domain/workout';

// ============================================================================
// Workout Repository
// ============================================================================

/**
 * Repository for workout and block persistence operations.
 * Uses Dexie.js for IndexedDB access.
 */
export const workoutRepo = {
  /**
   * Gets all non-deleted workouts with their blocks attached.
   */
  async getAll(): Promise<Workout[]> {
    // Filter non-deleted workouts (isDeleted is boolean false)
    const allWorkouts = await db.workouts.toArray();
    const workouts = allWorkouts.filter((w) => !w.isDeleted);

    // Attach blocks to each workout
    for (const w of workouts) {
      w.blocks = await db.blocks.where('workoutId').equals(w.id).sortBy('order');
    }

    return workouts;
  },

  /**
   * Gets a single workout by ID with its blocks attached.
   * Returns undefined if not found or if soft-deleted.
   */
  async getById(id: string): Promise<Workout | undefined> {
    const workout = await db.workouts.get(id);

    if (!workout || workout.isDeleted) {
      return undefined;
    }

    // Attach blocks
    workout.blocks = await db.blocks.where('workoutId').equals(id).sortBy('order');

    return workout;
  },

  /**
   * Saves a workout and its blocks.
   * Uses a transaction to ensure atomicity.
   * Cleans up orphan blocks that were removed from the workout.
   */
  async save(workout: Workout): Promise<void> {
    await db.transaction('rw', [db.workouts, db.blocks], async () => {
      // Save workout (without blocks array for storage)
      const { blocks, ...workoutData } = workout;
      await db.workouts.put(workoutData as Workout);

      // Delete blocks no longer in the workout
      const existingBlocks = await db.blocks
        .where('workoutId')
        .equals(workout.id)
        .toArray();
      const newBlockIds = new Set(blocks.map((b) => b.id));
      for (const existing of existingBlocks) {
        if (!newBlockIds.has(existing.id)) {
          await db.blocks.delete(existing.id);
        }
      }

      // Upsert current blocks
      for (const block of blocks) {
        await db.blocks.put(block);
      }
    });
  },

  /**
   * Soft deletes a workout by setting isDeleted flag.
   * Preserves workout for session history.
   */
  async softDelete(id: string): Promise<void> {
    await db.workouts.update(id, { isDeleted: true, updatedAt: new Date() });
  },

  /**
   * Deletes a block from the database.
   */
  async deleteBlock(blockId: string): Promise<void> {
    await db.blocks.delete(blockId);
  },
};

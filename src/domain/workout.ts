import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// Types
// ============================================================================

export interface Workout {
  id: string;
  title: string;
  description?: string;
  blocks: ExerciseBlock[];
  estimatedDurationSec: number; // derived from blocks
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date;
  isDeleted: boolean; // soft delete for session preservation
}

export interface ExerciseBlock {
  id: string;
  workoutId: string;
  order: number;
  name: string;
  exerciseDurationSec: number; // must be > 0
  restDurationSec: number; // can be 0
  repeatCount: number; // must be >= 1
  notes?: string;
  imageUrl?: string; // base64 data URL or blob URL
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// Duration Calculation
// ============================================================================

/**
 * Calculates total workout duration from blocks.
 *
 * For each block:
 *   - Each repeat has: exerciseDuration + restDuration
 *   - Exception: the final repeat of the final block skips trailing rest
 *
 * Example:
 *   Block 1: 30s exercise, 10s rest, 2 repeats
 *   Block 2: 45s exercise, 0s rest, 1 repeat
 *
 *   Total = (30+10) + (30+10) + (45) = 125s
 *   Note: Block 2's rest is 0, so no trailing rest anyway
 */
export function calculateWorkoutDuration(blocks: ExerciseBlock[]): number {
  if (blocks.length === 0) {
    return 0;
  }

  let totalDuration = 0;

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
    const block = blocks[blockIndex];
    const isLastBlock = blockIndex === blocks.length - 1;

    for (let repeat = 1; repeat <= block.repeatCount; repeat++) {
      const isLastRepeat = repeat === block.repeatCount;
      const isVeryLast = isLastBlock && isLastRepeat;

      totalDuration += block.exerciseDurationSec;

      // Add rest unless it's the very last repeat of the very last block
      if (!isVeryLast) {
        totalDuration += block.restDurationSec;
      }
    }
  }

  return totalDuration;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates an exercise block's fields.
 */
export function validateBlock(block: Partial<ExerciseBlock>): ValidationResult {
  const errors: ValidationError[] = [];

  // Name validation
  if (block.name === undefined || block.name === null) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (typeof block.name !== 'string') {
    errors.push({ field: 'name', message: 'Name must be a string' });
  } else if (block.name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name cannot be empty' });
  } else if (block.name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be 100 characters or less' });
  }

  // Exercise duration validation
  if (block.exerciseDurationSec === undefined || block.exerciseDurationSec === null) {
    errors.push({ field: 'exerciseDurationSec', message: 'Exercise duration is required' });
  } else if (typeof block.exerciseDurationSec !== 'number') {
    errors.push({ field: 'exerciseDurationSec', message: 'Exercise duration must be a number' });
  } else if (!Number.isInteger(block.exerciseDurationSec)) {
    errors.push({ field: 'exerciseDurationSec', message: 'Exercise duration must be a whole number' });
  } else if (block.exerciseDurationSec <= 0) {
    errors.push({ field: 'exerciseDurationSec', message: 'Exercise duration must be greater than 0' });
  } else if (block.exerciseDurationSec > 3600) {
    errors.push({ field: 'exerciseDurationSec', message: 'Exercise duration must be 1 hour or less' });
  }

  // Rest duration validation
  if (block.restDurationSec !== undefined && block.restDurationSec !== null) {
    if (typeof block.restDurationSec !== 'number') {
      errors.push({ field: 'restDurationSec', message: 'Rest duration must be a number' });
    } else if (!Number.isInteger(block.restDurationSec)) {
      errors.push({ field: 'restDurationSec', message: 'Rest duration must be a whole number' });
    } else if (block.restDurationSec < 0) {
      errors.push({ field: 'restDurationSec', message: 'Rest duration cannot be negative' });
    } else if (block.restDurationSec > 3600) {
      errors.push({ field: 'restDurationSec', message: 'Rest duration must be 1 hour or less' });
    }
  }

  // Repeat count validation
  if (block.repeatCount !== undefined && block.repeatCount !== null) {
    if (typeof block.repeatCount !== 'number') {
      errors.push({ field: 'repeatCount', message: 'Repeat count must be a number' });
    } else if (!Number.isInteger(block.repeatCount)) {
      errors.push({ field: 'repeatCount', message: 'Repeat count must be a whole number' });
    } else if (block.repeatCount < 1) {
      errors.push({ field: 'repeatCount', message: 'Repeat count must be at least 1' });
    } else if (block.repeatCount > 100) {
      errors.push({ field: 'repeatCount', message: 'Repeat count must be 100 or less' });
    }
  }

  // Order validation (if provided)
  if (block.order !== undefined && block.order !== null) {
    if (typeof block.order !== 'number') {
      errors.push({ field: 'order', message: 'Order must be a number' });
    } else if (!Number.isInteger(block.order)) {
      errors.push({ field: 'order', message: 'Order must be a whole number' });
    } else if (block.order < 0) {
      errors.push({ field: 'order', message: 'Order cannot be negative' });
    }
  }

  // Notes validation (optional)
  if (block.notes !== undefined && block.notes !== null) {
    if (typeof block.notes !== 'string') {
      errors.push({ field: 'notes', message: 'Notes must be a string' });
    } else if (block.notes.length > 500) {
      errors.push({ field: 'notes', message: 'Notes must be 500 characters or less' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates a workout's fields.
 */
export function validateWorkout(workout: Partial<Workout>): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation
  if (workout.title === undefined || workout.title === null) {
    errors.push({ field: 'title', message: 'Title is required' });
  } else if (typeof workout.title !== 'string') {
    errors.push({ field: 'title', message: 'Title must be a string' });
  } else if (workout.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title cannot be empty' });
  } else if (workout.title.length > 100) {
    errors.push({ field: 'title', message: 'Title must be 100 characters or less' });
  }

  // Description validation (optional)
  if (workout.description !== undefined && workout.description !== null) {
    if (typeof workout.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string' });
    } else if (workout.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must be 500 characters or less' });
    }
  }

  // Blocks validation
  if (workout.blocks !== undefined && workout.blocks !== null) {
    if (!Array.isArray(workout.blocks)) {
      errors.push({ field: 'blocks', message: 'Blocks must be an array' });
    } else {
      // Validate each block
      workout.blocks.forEach((block, index) => {
        const blockResult = validateBlock(block);
        blockResult.errors.forEach((error) => {
          errors.push({
            field: `blocks[${index}].${error.field}`,
            message: error.message,
          });
        });
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new workout with default values.
 */
export function createWorkout(title: string): Workout {
  const now = new Date();
  return {
    id: uuidv4(),
    title: title.trim(),
    blocks: [],
    estimatedDurationSec: 0,
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };
}

/**
 * Creates a new exercise block with default values.
 */
export function createBlock(
  workoutId: string,
  name: string,
  exerciseDurationSec: number
): ExerciseBlock {
  return {
    id: uuidv4(),
    workoutId,
    order: 0, // caller should set appropriate order
    name: name.trim(),
    exerciseDurationSec,
    restDurationSec: 0,
    repeatCount: 1,
  };
}

/**
 * Recalculates and updates the estimated duration of a workout based on its blocks.
 * Returns a new workout object with updated estimatedDurationSec and updatedAt.
 */
export function updateWorkoutDuration(workout: Workout): Workout {
  return {
    ...workout,
    estimatedDurationSec: calculateWorkoutDuration(workout.blocks),
    updatedAt: new Date(),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function validateLoginPayload(
  value: unknown
): value is { username: string } {
  return isRecord(value) && typeof value.username === 'string';
}

export function validateWorkoutPayload(
  value: unknown,
  expectedId?: string
): value is { id: string; title: string; blocks: unknown[] } {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return false;
  }

  if (expectedId !== undefined && value.id !== expectedId) {
    return false;
  }

  return typeof value.title === 'string' && Array.isArray(value.blocks);
}

export function validateSessionPayload(
  value: unknown,
  expectedId?: string
): value is { id: string; workoutId: string; status: string } {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return false;
  }

  if (expectedId !== undefined && value.id !== expectedId) {
    return false;
  }

  return (
    typeof value.workoutId === 'string' && typeof value.status === 'string'
  );
}

export function validateImportPayload(
  value: unknown
): value is {
  workouts: Array<{ id: string; title: string; blocks: unknown[] }>;
  sessions: Array<{ id: string; workoutId: string; status: string }>;
} {
  if (
    !isRecord(value) ||
    !Array.isArray(value.workouts) ||
    !Array.isArray(value.sessions)
  ) {
    return false;
  }

  return (
    value.workouts.every((workout) => validateWorkoutPayload(workout)) &&
    value.sessions.every((session) => validateSessionPayload(session))
  );
}

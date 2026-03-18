import { describe, expect, it } from 'vitest';
import { validateImportPayload, validateLoginPayload } from './apiValidation';

describe('validateLoginPayload', () => {
  it('accepts a payload with a string username', () => {
    expect(validateLoginPayload({ username: 'Alice' })).toBe(true);
  });

  it('rejects payloads with non-string usernames', () => {
    expect(validateLoginPayload({ username: 42 })).toBe(false);
    expect(validateLoginPayload({ username: true })).toBe(false);
    expect(validateLoginPayload({ username: null })).toBe(false);
    expect(validateLoginPayload({ username: ['alice'] })).toBe(false);
    expect(validateLoginPayload({ username: { value: 'alice' } })).toBe(false);
  });

  it('rejects payloads missing username', () => {
    expect(validateLoginPayload({})).toBe(false);
  });
});

describe('validateImportPayload', () => {
  const validWorkout = { id: 'workout-1', title: 'Leg Day', blocks: [] };
  const validSession = {
    id: 'session-1',
    workoutId: 'workout-1',
    status: 'completed',
  };

  it('accepts a well-formed import payload', () => {
    expect(
      validateImportPayload({
        workouts: [validWorkout],
        sessions: [validSession],
      })
    ).toBe(true);
  });

  it('rejects malformed top-level shape', () => {
    expect(validateImportPayload(null)).toBe(false);
    expect(validateImportPayload({ workouts: {}, sessions: [] })).toBe(false);
    expect(validateImportPayload({ workouts: [], sessions: {} })).toBe(false);
  });

  it('rejects malformed workout records', () => {
    expect(
      validateImportPayload({
        workouts: [{ id: 123, title: 'Leg Day', blocks: [] }],
        sessions: [validSession],
      })
    ).toBe(false);

    expect(
      validateImportPayload({
        workouts: [{ id: 'workout-1', title: 123, blocks: [] }],
        sessions: [validSession],
      })
    ).toBe(false);

    expect(
      validateImportPayload({
        workouts: [{ id: 'workout-1', title: 'Leg Day', blocks: 'nope' }],
        sessions: [validSession],
      })
    ).toBe(false);
  });

  it('rejects malformed session records', () => {
    expect(
      validateImportPayload({
        workouts: [validWorkout],
        sessions: [{ id: 'session-1', workoutId: 99, status: 'completed' }],
      })
    ).toBe(false);

    expect(
      validateImportPayload({
        workouts: [validWorkout],
        sessions: [{ id: 'session-1', workoutId: 'workout-1', status: 99 }],
      })
    ).toBe(false);
  });
});

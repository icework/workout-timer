export function normalizeUsername(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error('Username is required');
  }

  return normalized;
}

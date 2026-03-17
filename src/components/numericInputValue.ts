interface NormalizeNumericInputOptions {
  min?: number;
  max?: number;
  fallbackValue?: number;
}

export function normalizeNumericInput(
  rawValue: string,
  { min = 0, max = Number.MAX_SAFE_INTEGER, fallbackValue = min }: NormalizeNumericInputOptions
): number {
  const digitsOnly = rawValue.replace(/\D/g, '');
  const parsedValue = digitsOnly === '' ? fallbackValue : Number.parseInt(digitsOnly, 10);

  return Math.min(Math.max(parsedValue, min), max);
}

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { NumericInput } from './NumericInput';
import { normalizeNumericInput } from './numericInputValue';

describe('NumericInput', () => {
  it('renders as a text input configured for numeric keyboards', () => {
    const markup = renderToStaticMarkup(
      <NumericInput value={30} onChange={() => {}} aria-label="Minutes" />
    );

    expect(markup).toContain('type="text"');
    expect(markup).toContain('inputMode="numeric"');
    expect(markup).toContain('pattern="[0-9]*"');
  });

  it('strips non-digits and clamps values to the configured range', () => {
    expect(
      normalizeNumericInput('150 reps', { min: 1, max: 100, fallbackValue: 1 })
    ).toBe(100);
  });
});

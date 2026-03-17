import type { ComponentPropsWithoutRef } from 'react';
import { normalizeNumericInput } from './numericInputValue';

interface NumericInputProps
  extends Omit<ComponentPropsWithoutRef<'input'>, 'type' | 'value' | 'onChange' | 'inputMode'> {
  value: string | number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  fallbackValue?: number;
}

export function NumericInput({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  fallbackValue = min,
  ...props
}: NumericInputProps) {
  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={(event) =>
        onChange(
          normalizeNumericInput(event.target.value, {
            min,
            max,
            fallbackValue,
          })
        )
      }
    />
  );
}

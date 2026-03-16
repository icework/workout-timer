interface DurationInputProps {
  value: number; // seconds
  onChange: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number; // increment/decrement step in seconds
}

/**
 * Duration input component with MM:SS format display and +/- buttons.
 * Supports direct input and increment/decrement by step (default 5 seconds).
 */
export function DurationInput({
  value,
  onChange,
  label,
  min = 0,
  max = 3600,
  step = 5,
}: DurationInputProps) {
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  const handleIncrement = () => {
    const newValue = Math.min(value + step, max);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(value - step, min);
    onChange(newValue);
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMinutes = parseInt(e.target.value, 10) || 0;
    const newValue = Math.min(Math.max(newMinutes * 60 + seconds, min), max);
    onChange(newValue);
  };

  const handleSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newSeconds = parseInt(e.target.value, 10) || 0;
    // Clamp seconds to 0-59
    newSeconds = Math.min(Math.max(newSeconds, 0), 59);
    const newValue = Math.min(Math.max(minutes * 60 + newSeconds, min), max);
    onChange(newValue);
  };

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 text-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed active:bg-gray-200"
          aria-label={`Decrease by ${step} seconds`}
        >
          −
        </button>

        <div className="flex items-center gap-1 bg-white border border-gray-300 rounded-lg px-3 py-2">
          <input
            type="number"
            value={minutes}
            onChange={handleMinutesChange}
            min={0}
            max={Math.floor(max / 60)}
            className="w-10 text-center text-lg font-mono bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Minutes"
          />
          <span className="text-lg font-mono text-gray-500">:</span>
          <input
            type="number"
            value={seconds.toString().padStart(2, '0')}
            onChange={handleSecondsChange}
            min={0}
            max={59}
            className="w-10 text-center text-lg font-mono bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Seconds"
          />
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-11 h-11 flex items-center justify-center rounded-lg bg-gray-100 text-gray-700 text-xl font-bold disabled:opacity-40 disabled:cursor-not-allowed active:bg-gray-200"
          aria-label={`Increase by ${step} seconds`}
        >
          +
        </button>
      </div>
    </div>
  );
}

'use client';

type ButtonGroupOption<T extends string> = {
  value: T;
  label: string;
};

type ButtonGroupProps<T extends string> = {
  options: readonly ButtonGroupOption<T>[] | readonly T[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
  className?: string;
};

function normalizeOptions<T extends string>(options: readonly ButtonGroupOption<T>[] | readonly T[]) {
  return options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option
  );
}

export function ButtonGroup<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: ButtonGroupProps<T>) {
  const normalized = normalizeOptions(options);

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? (
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-ash-500">{label}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {normalized.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded border px-3 py-1.5 text-sm font-medium ${
                active
                  ? 'border-brand-500/50 bg-brand-900/30 text-brand-400'
                  : 'border-ink-600 bg-ink-800 text-ash-300 hover:border-ink-500 hover:text-ash-50'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-ink-3">{label}</p>
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
                  ? 'border-ink bg-ink text-paper'
                  : 'border-rule bg-surface-2 text-ink-2 hover:border-ink hover:text-ink'
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

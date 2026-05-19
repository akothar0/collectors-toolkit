export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label?: string;
}) {
  const percent = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-center justify-between text-sm text-ash-400">
          <span>{label}</span>
          <span className="tabular-nums font-medium text-ash-200">
            {value}/{max} ({percent}%)
          </span>
        </div>
      ) : null}
      <div className="h-1.5 overflow-hidden rounded-full bg-ink-700">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${percent}%`, transition: 'width 300ms ease-out' }}
        />
      </div>
    </div>
  );
}

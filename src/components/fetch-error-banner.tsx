'use client';

export function FetchErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-rose-800 bg-rose-950 px-4 py-3 text-sm text-rose-400">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-9 rounded border border-rose-800 px-4 py-1.5 text-sm font-medium text-rose-400 hover:border-rose-700 hover:text-rose-300"
      >
        Retry
      </button>
    </div>
  );
}

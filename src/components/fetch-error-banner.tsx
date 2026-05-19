'use client';

export function FetchErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="min-h-11 rounded-full border border-rose-300 bg-white px-4 py-2 font-medium text-rose-800 hover:bg-rose-100"
      >
        Retry
      </button>
    </div>
  );
}

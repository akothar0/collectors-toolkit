'use client';

export function FetchErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-negative/30 bg-negative/5 px-4 py-3">
      <p className="text-[13px] text-negative">{message}</p>
      <button type="button" onClick={onRetry}
        className="rounded border border-negative/30 px-3 py-1.5 font-mono text-[11px] text-negative hover:bg-negative/10">
        Retry
      </button>
    </div>
  );
}

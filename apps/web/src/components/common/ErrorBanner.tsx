"use client";

type Props = {
  readonly message: string;
  readonly onRetry?: () => void;
};

export default function ErrorBanner({ message, onRetry }: Props) {
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-3 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
    >
      <span>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-semibold uppercase tracking-wide underline"
        >
          Retry
        </button>
      )}
    </div>
  );
}

"use client";

export default function ReviewTableSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="h-6 w-1/4 animate-pulse rounded bg-muted" />
      {[...Array(5)].map((_, index) => (
        <div key={index} className="h-12 w-full animate-pulse rounded bg-muted" />
      ))}
    </div>
  );
}

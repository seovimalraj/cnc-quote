"use client";

type Props = {
  readonly title: string;
  readonly description?: string;
};

export default function EmptyState({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded border border-dashed border-muted-foreground/30 bg-muted/40 py-16 text-center text-muted-foreground">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground/80">{description}</p>}
    </div>
  );
}

const COLOR_CLASSES = {
  level1: "bg-level-1-bg text-level-1",
  level2: "bg-level-2-bg text-level-2",
  level3: "bg-level-3-bg text-level-3",
  level4: "bg-level-4-bg text-level-4",
  level5: "bg-level-5-bg text-level-5",
  primary: "bg-primary-bg text-primary",
  info: "bg-info-bg text-info",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  muted: "bg-surface-hover text-muted",
  faint: "bg-faint-bg text-faint",
} as const;

export type BadgeColor = keyof typeof COLOR_CLASSES;

export function Badge({
  children,
  color,
}: {
  children: React.ReactNode;
  color: BadgeColor;
}) {
  return (
    <span
      // w-fit keeps this hugging its text even when a flex-col parent (the
      // grid course/library cards, for instance) defaults to align-items:
      // stretch — inline-flex alone only controls the badge's own children,
      // not how the badge itself is sized within its parent flex container.
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_CLASSES[color]}`}
    >
      {children}
    </span>
  );
}

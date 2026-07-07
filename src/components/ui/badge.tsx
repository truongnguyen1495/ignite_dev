const COLOR_CLASSES = {
  level1: "bg-level-1-bg text-level-1",
  level2: "bg-level-2-bg text-level-2",
  level3: "bg-level-3-bg text-level-3",
  level4: "bg-level-4-bg text-level-4",
  level5: "bg-level-5-bg text-level-5",
  success: "bg-success-bg text-success",
  danger: "bg-danger-bg text-danger",
  muted: "bg-surface-hover text-muted",
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
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${COLOR_CLASSES[color]}`}
    >
      {children}
    </span>
  );
}

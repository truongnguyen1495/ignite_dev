// Single source of truth for the lucky-wheel's segment palette — imported by
// both the student-facing wheel (dashboard/my-group/spin-wheel.tsx) and the
// admin editor's color swatches (admin/minigame/rewards-editor.tsx) so the
// two can never drift out of sync the way two hand-copied arrays would.
//
// All six are light hues, same rule as --primary/--info/--success in
// globals.css: dark navy (--ink/--primary-foreground) text sits on top of
// every one, never white. Ordered warm/cool/warm/cool/warm/cool so two
// colors from the same family are never adjacent on the wheel — gold and
// the deep-gold accent used to sit next to each other and were hard to tell
// apart at a glance.
export const SPIN_WHEEL_SEGMENT_COLORS = [
  "#e3b52d", // gold (--primary)
  "#17a9e8", // cyan (--info)
  "#f28a5c", // coral
  "#22c55e", // green (--success)
  "#f06fa8", // magenta
  "#a385f5", // violet
] as const;

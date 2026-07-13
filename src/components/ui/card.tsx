import type { ComponentPropsWithoutRef } from "react";

const PADDING_CLASSES = {
  md: "rounded-xl p-6",
  lg: "rounded-2xl p-8",
} as const;

export type CardProps = ComponentPropsWithoutRef<"div"> & {
  padding?: keyof typeof PADDING_CLASSES;
};

export function Card({ padding = "md", className = "", children, ...props }: CardProps) {
  return (
    <div className={`border border-primary/40 bg-surface ${PADDING_CLASSES[padding]} ${className}`} {...props}>
      {children}
    </div>
  );
}

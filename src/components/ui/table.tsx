import type { ComponentPropsWithoutRef } from "react";

export function Table({ className = "", children, ...props }: ComponentPropsWithoutRef<"table">) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full min-w-full divide-y divide-border text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

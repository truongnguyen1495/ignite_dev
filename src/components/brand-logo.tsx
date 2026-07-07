import { Zap } from "lucide-react";

export function BrandLogo({ subtitle }: { subtitle?: string }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Zap className="h-4 w-4" />
        </span>
        <span className="text-lg font-bold text-foreground">
          LMS <span className="text-primary">IGNITE</span>
        </span>
      </div>
      {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
    </div>
  );
}

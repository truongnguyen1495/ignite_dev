import Link from "next/link";
import { Lock } from "lucide-react";
import type { Level } from "@prisma/client";
import { LEVEL_LABELS } from "@/lib/levels";
import { LevelBadge } from "@/components/ui/level-badge";
import { Button } from "@/components/ui/button";

// Shared across all 4 bespoke landing pages when the viewer fails
// canViewProduct() — deliberately not styled to match any one landing
// page's bespoke look, since it stands in for whichever of the 4 was
// requested. isLoggedIn distinguishes "chưa đăng nhập" from "đăng nhập
// nhưng chưa đủ cấp"; minLevel/currentLevel are only meaningful in the
// latter case (null minLevel means the product is only individually
// granted, with no level rule at all).
export function ProductLockedNotice({
  isLoggedIn,
  minLevel,
  currentLevel,
}: {
  isLoggedIn: boolean;
  minLevel: Level | null;
  currentLevel?: Level;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 bg-background px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-bg text-primary">
        <Lock className="h-6 w-6" />
      </div>

      {isLoggedIn ? (
        <>
          <h1 className="max-w-md text-xl font-bold text-foreground">
            {minLevel
              ? `Sản phẩm này dành cho học viên từ ${LEVEL_LABELS[minLevel]} trở lên`
              : "Bạn chưa được cấp quyền xem sản phẩm này"}
          </h1>
          {minLevel && <LevelBadge level={minLevel} full />}
          {currentLevel && (
            <p className="text-sm text-muted">
              Cấp hiện tại của bạn: {LEVEL_LABELS[currentLevel]}
            </p>
          )}
          <Link href="/dashboard/level-up" className="mt-2">
            <Button variant="secondary">Xem lộ trình lên cấp</Button>
          </Link>
        </>
      ) : (
        <>
          <h1 className="max-w-md text-xl font-bold text-foreground">
            Vui lòng đăng nhập để xem sản phẩm này
          </h1>
          <p className="max-w-sm text-sm text-muted">Sản phẩm này chỉ hiển thị cho học viên đã đăng nhập.</p>
          <Link href="/login" className="mt-2">
            <Button>Đăng nhập</Button>
          </Link>
        </>
      )}
    </div>
  );
}

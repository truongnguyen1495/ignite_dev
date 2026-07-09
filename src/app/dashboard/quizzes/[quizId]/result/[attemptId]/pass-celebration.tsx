"use client";

import { useEffect } from "react";
import { useCelebrate } from "@/components/ui/toast";

export function PassCelebration({ scorePercent }: { scorePercent: number }) {
  const celebrate = useCelebrate();

  useEffect(() => {
    celebrate({ title: "Chúc mừng, bạn đã đạt!", description: `Điểm số: ${scorePercent}%` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

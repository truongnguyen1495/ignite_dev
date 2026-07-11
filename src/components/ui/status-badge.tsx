import type { AccountStatus } from "@prisma/client";
import { Badge } from "./badge";

export function StatusBadge({ status }: { status: AccountStatus }) {
  if (status === "ACTIVE") {
    return <Badge color="primary">Hoạt động</Badge>;
  }
  return <Badge color="faint">Đã khóa</Badge>;
}

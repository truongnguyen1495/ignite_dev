import type { AccountStatus } from "@prisma/client";
import { Badge } from "./badge";

export function StatusBadge({ status }: { status: AccountStatus }) {
  return status === "ACTIVE" ? (
    <Badge color="primary">Hoạt động</Badge>
  ) : (
    <Badge color="faint">Đã khóa</Badge>
  );
}

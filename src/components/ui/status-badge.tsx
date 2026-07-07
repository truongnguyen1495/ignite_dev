import type { AccountStatus } from "@prisma/client";
import { Badge } from "./badge";

export function StatusBadge({ status }: { status: AccountStatus }) {
  return status === "ACTIVE" ? (
    <Badge color="success">Hoạt động</Badge>
  ) : (
    <Badge color="danger">Đã khóa</Badge>
  );
}

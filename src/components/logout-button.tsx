import { LogOut } from "lucide-react";
import { signOut } from "@/lib/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:border-danger/30 hover:text-danger"
      >
        <LogOut className="h-4 w-4" />
        Đăng xuất
      </button>
    </form>
  );
}

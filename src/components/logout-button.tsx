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
        title="Đăng xuất"
        className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:border-danger/30 hover:text-danger sm:px-3"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Đăng xuất</span>
      </button>
    </form>
  );
}

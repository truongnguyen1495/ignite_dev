import Link from "next/link";
import { requireActiveSuperAdmin } from "@/lib/access";
import { LogoutButton } from "@/components/logout-button";

const NAV_ITEMS = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/students", label: "Học viên" },
  { href: "/admin/lessons", label: "Bài học" },
  { href: "/admin/results", label: "Kết quả" },
  { href: "/admin/level-up-requests", label: "Yêu cầu lên cấp" },
  { href: "/admin/settings", label: "Cài đặt" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireActiveSuperAdmin();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <span className="font-semibold">LMS Nội Bộ · Admin</span>
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500">{admin.name}</span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

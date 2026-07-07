import Link from "next/link";
import { requireActiveStudent } from "@/lib/access";
import { LEVEL_LABELS } from "@/lib/levels";
import { LogoutButton } from "@/components/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await requireActiveStudent();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="font-semibold">
              LMS Nội Bộ
            </Link>
            <Link href="/dashboard/level-up" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              Xin lên cấp
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-zinc-500">
              {student.name} · {LEVEL_LABELS[student.grantedLevel]}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

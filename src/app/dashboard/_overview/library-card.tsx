import Link from "next/link";
import { Library } from "lucide-react";
import type { User } from "@prisma/client";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { getOverviewLibrary } from "@/lib/overview";
import { CardHead, CoverThumb, EmptyState, OverviewCard, plural } from "./ui";

type Copy = Dictionary["dashboardOverviewPage"];

export async function LibraryCard({ student, copy }: { student: User; copy: Copy }) {
  const items = await getOverviewLibrary(student);

  return (
    <OverviewCard>
      <CardHead title={copy.libraryTitle} action={{ href: "/dashboard/library", label: copy.libraryViewAll }} />

      {items.length === 0 ? (
        <EmptyState icon={<Library className="h-4 w-4" aria-hidden="true" />} body={copy.libraryEmptyBody} />
      ) : (
        <ul className="flex flex-col gap-3.5">
          {items.map((item, index) => (
            <li key={item.id}>
              <Link href={`/dashboard/library/${item.id}`} className="group flex items-center gap-3">
                <CoverThumb url={item.coverImageUrl} alt="" tone={index + 1} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-medium text-foreground group-hover:text-primary-hover">
                    {item.title}
                  </b>
                  <span className="mt-0.5 block truncate font-mono text-[10.5px] tabular-nums text-muted">
                    {item.source === "owned" ? copy.libraryOwned : copy.libraryJustUnlocked}
                    {item.pageCount
                      ? ` · ${item.pageCount} ${plural(item.pageCount, copy.unitPageOne, copy.unitPageMany)}`
                      : item.author
                        ? ` · ${item.author}`
                        : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </OverviewCard>
  );
}

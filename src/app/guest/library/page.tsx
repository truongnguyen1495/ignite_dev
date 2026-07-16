import { getGuestLibraryItems } from "@/lib/guest-library";
import { GuestLibraryList } from "./library-list";

// See src/app/guest/courses/page.tsx — forces per-request rendering instead
// of a build-time static snapshot of the (admin-toggleable) guest flags.
export const dynamic = "force-dynamic";

export default async function GuestLibraryPage() {
  const items = await getGuestLibraryItems();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Thư viện</h1>
      </div>

      <GuestLibraryList items={items} />
    </div>
  );
}

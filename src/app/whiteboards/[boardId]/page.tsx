import { redirect } from "next/navigation";
import { requireAnyActiveAccount } from "@/lib/access";

// The neutral "anyone with the link" share target (see the general-access
// section of share-dialog.tsx) — a board's real edit/view UI lives at
// /admin/whiteboards/{id} or /dashboard/whiteboards/{id} depending on who's
// looking, so a single copyable link can't point at either directly
// without breaking for the other audience. This route does the bare
// minimum: figure out which section THIS user's own account belongs in and
// redirect there, same role split requireRole already uses elsewhere in
// access.ts. It does NOT itself check board access — the target page's own
// requireWhiteboardAccess is still the real gate (owner/named grant/general
// access), this is just traffic-directing. An unauthenticated visitor hits
// the same requireSession()-driven /login redirect any other protected page
// would (via requireAnyActiveAccount).
export default async function WhiteboardLinkRedirectPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;
  const user = await requireAnyActiveAccount();
  redirect(user.role === "STUDENT" ? `/dashboard/whiteboards/${boardId}` : `/admin/whiteboards/${boardId}`);
}

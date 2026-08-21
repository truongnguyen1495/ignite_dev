import { redirect } from "next/navigation";

/**
 * The overview shipped, and it took /dashboard itself rather than this url.
 *
 * The route stays as a redirect instead of being deleted: this address was
 * live for the whole time the feature sat behind a "sắp ra mắt" page, it is
 * in the sidebar's history and in anyone's bookmarks, and the point of that
 * convention (see ComingSoon in src/components/ui/coming-soon.tsx) was that
 * shipping a feature would never break a link someone had already saved.
 */
export default function Page() {
  redirect("/dashboard");
}

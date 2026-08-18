import { StudentLibraryView } from "../library-view";

// Static sibling of /dashboard/library/[itemId] — a static segment wins over
// the dynamic one, and a library item id is a cuid so it can never be "sach".
export default async function LibraryBooksPage() {
  return <StudentLibraryView type="BOOK" />;
}

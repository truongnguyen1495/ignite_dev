import { StudentLibraryView } from "./library-view";

export default async function StudentLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const { denied } = await searchParams;
  return <StudentLibraryView denied={!!denied} />;
}

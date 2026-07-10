import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const LIBRARY_FILES_BUCKET = "library-files";

// Unlike lesson-images, this bucket is private: books/documents are gated by
// per-student grants, per-level grants, or (for the guest preview only) a
// server-generated truncated copy — never a public URL. Every read goes
// through our own route handlers, which download via the service-role
// client regardless of the bucket's public flag.
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(LIBRARY_FILES_BUCKET, {
    public: false,
    fileSizeLimit: "50MB",
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function uploadLibraryFile(bytes: Uint8Array | Buffer, path: string): Promise<void> {
  await ensureBucketExists();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from(LIBRARY_FILES_BUCKET)
    .upload(path, bytes, { contentType: "application/pdf", upsert: true });
  if (error) {
    throw error;
  }
}

export async function downloadLibraryFile(path: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(LIBRARY_FILES_BUCKET).download(path);
  if (error) {
    throw error;
  }
  return Buffer.from(await data.arrayBuffer());
}

export async function deleteLibraryFile(path: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.from(LIBRARY_FILES_BUCKET).remove([path]);
  if (error) {
    throw error;
  }
}

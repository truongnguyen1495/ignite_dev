import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BOOK_VIDEO_BUCKET = "book-video";

// Same lazy-create convention as library-audio-storage.ts's ensureBucketExists.
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(BOOK_VIDEO_BUCKET, {
    public: true,
    fileSizeLimit: "50MB",
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function uploadBookVideo(file: File): Promise<string> {
  await ensureBucketExists();
  const supabase = getSupabaseAdmin();

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BOOK_VIDEO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BOOK_VIDEO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const BOOK_AUDIO_BUCKET = "book-audio";

// Same lazy-create convention as supabase-storage.ts's uploadLessonImage —
// createBucket errors when it already exists, treated as success so repeated
// calls stay safe.
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(BOOK_AUDIO_BUCKET, {
    public: true,
    fileSizeLimit: "15MB",
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function uploadBookAudio(file: File): Promise<string> {
  await ensureBucketExists();
  const supabase = getSupabaseAdmin();

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BOOK_AUDIO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(BOOK_AUDIO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

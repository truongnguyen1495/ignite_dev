import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const LESSON_IMAGES_BUCKET = "lesson-images";

// The bucket is created lazily on first use rather than requiring a manual
// dashboard step — createBucket errors when it already exists, which we
// treat as success so repeated calls stay safe.
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(LESSON_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function uploadLessonImage(file: File): Promise<string> {
  await ensureBucketExists();
  const supabase = getSupabaseAdmin();

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(LESSON_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(LESSON_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

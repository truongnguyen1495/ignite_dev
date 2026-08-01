import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const WHITEBOARD_IMAGE_BUCKET = "whiteboard-images";

// The bucket is created lazily on first use rather than requiring a manual
// dashboard step — createBucket errors when it already exists, which we
// treat as success so repeated calls stay safe (same convention as
// src/lib/supabase-storage.ts's uploadLessonImage).
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(WHITEBOARD_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function uploadWhiteboardImage(file: File): Promise<string> {
  await ensureBucketExists();
  const supabase = getSupabaseAdmin();

  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(WHITEBOARD_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(WHITEBOARD_IMAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

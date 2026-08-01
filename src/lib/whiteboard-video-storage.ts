import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const WHITEBOARD_VIDEO_BUCKET = "whiteboard-video";

// The bucket allows up to 50MB at the Supabase Storage level, but the actual
// upload route (/api/admin/upload-whiteboard-video) caps requests at 4MB —
// Vercel's serverless function body-size limit, not a bug here. A longer
// video should use a YouTube link instead of a direct upload.
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(WHITEBOARD_VIDEO_BUCKET, {
    public: true,
    fileSizeLimit: "50MB",
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function uploadWhiteboardVideo(file: File): Promise<string> {
  await ensureBucketExists();
  const supabase = getSupabaseAdmin();

  const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(WHITEBOARD_VIDEO_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(WHITEBOARD_VIDEO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const AVATARS_BUCKET = "avatars";

// The bucket is created lazily on first use, same convention as
// src/lib/supabase-storage.ts's lesson-images bucket — createBucket errors
// when it already exists, treated as success so repeated calls stay safe.
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(AVATARS_BUCKET, {
    public: true,
    fileSizeLimit: "5MB",
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

// Called with an already-cropped JPEG blob (see AvatarCropInput, which
// exports a 512x512 circle-cropped canvas client-side) — path is scoped to
// the uploading user's own id so a stale/overwritten avatar never collides
// with another user's file.
export async function uploadUserAvatar(userId: string, file: File): Promise<string> {
  await ensureBucketExists();
  const supabase = getSupabaseAdmin();

  const path = `${userId}/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { contentType: "image/jpeg", upsert: false });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

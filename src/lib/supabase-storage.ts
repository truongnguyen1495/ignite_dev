import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const LESSON_IMAGES_BUCKET = "lesson-images";

const globalForSupabase = globalThis as unknown as {
  supabaseAdmin: SupabaseClient | undefined;
};

function getSupabaseAdmin() {
  if (globalForSupabase.supabaseAdmin) return globalForSupabase.supabaseAdmin;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set to upload images.");
  }

  const client = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  globalForSupabase.supabaseAdmin = client;
  return client;
}

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

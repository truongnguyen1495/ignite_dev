import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const CHAT_ATTACHMENTS_BUCKET = "chat-attachments";

// Private, same convention as library-files: chat attachments are gated by
// thread membership (userCanAccessChatThread), never a public URL — every
// read goes through /api/chat/attachments/[messageId].
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(CHAT_ATTACHMENTS_BUCKET, {
    public: false,
    fileSizeLimit: "10MB",
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function uploadChatAttachment(
  bytes: Uint8Array | Buffer,
  path: string,
  contentType: string
): Promise<void> {
  await ensureBucketExists();
  const supabase = getSupabaseAdmin();

  const { error } = await supabase.storage
    .from(CHAT_ATTACHMENTS_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) {
    throw error;
  }
}

export async function downloadChatAttachment(path: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(CHAT_ATTACHMENTS_BUCKET).download(path);
  if (error) {
    throw error;
  }
  return Buffer.from(await data.arrayBuffer());
}

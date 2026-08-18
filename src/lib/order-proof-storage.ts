import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const ORDER_PROOFS_BUCKET = "order-payment-proofs";

// Private, same convention as chat-attachments and library-files: a payment
// proof is a screenshot of the company's own bank notification, so it is
// never reachable by URL — every read goes through
// /api/admin/orders/[orderId]/proof, which re-checks MANAGE_ORDERS.
async function ensureBucketExists() {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage.createBucket(ORDER_PROOFS_BUCKET, {
    public: false,
    fileSizeLimit: "10MB",
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function uploadOrderProof(
  bytes: Uint8Array | Buffer,
  path: string,
  contentType: string
): Promise<void> {
  await ensureBucketExists();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.storage
    .from(ORDER_PROOFS_BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) {
    throw error;
  }
}

export async function downloadOrderProof(path: string): Promise<Buffer> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(ORDER_PROOFS_BUCKET).download(path);
  if (error) {
    throw error;
  }
  return Buffer.from(await data.arrayBuffer());
}

/**
 * Removes an uploaded proof that never made it onto an order — the confirm
 * raced a cancel, say. Failure is logged rather than thrown: an orphaned
 * image in a private bucket is untidy, but it must not turn a successful
 * payment confirmation into an error the admin sees.
 */
export async function deleteOrderProof(path: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage.from(ORDER_PROOFS_BUCKET).remove([path]);
    if (error) throw error;
  } catch (error) {
    console.error("deleteOrderProof: failed to remove orphaned proof", path, error);
  }
}

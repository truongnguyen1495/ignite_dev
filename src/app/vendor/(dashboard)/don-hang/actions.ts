"use server";

import { revalidatePath } from "next/cache";
import { requireVendorAccountAccess } from "@/lib/access";
import { confirmVendorShipment } from "@/lib/vendor-commission";

/**
 * Thin wrapper around confirmVendorShipment — the vendorId ALWAYS comes from
 * the caller's own requireVendorAccountAccess(), never from a client-passed
 * argument, so this can never be used to confirm shipment on another
 * vendor's order line (confirmVendorShipment's own where clause double-checks
 * this too, but the id must still originate here, not from the form).
 */
export async function confirmVendorShipmentAction(orderItemId: string): Promise<{ error?: string }> {
  const { vendor } = await requireVendorAccountAccess();
  const result = await confirmVendorShipment(orderItemId, vendor.id);
  if (!result.error) {
    revalidatePath("/vendor");
    revalidatePath("/vendor/don-hang");
  }
  return result;
}

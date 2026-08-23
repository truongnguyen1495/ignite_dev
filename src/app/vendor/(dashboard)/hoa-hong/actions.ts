"use server";

import { revalidatePath } from "next/cache";
import { requireVendorAccountAccess } from "@/lib/access";
import { requestVendorPayout } from "@/lib/vendor-commission";

// vendorId always comes from requireVendorAccountAccess() — see the same
// note on /vendor/don-hang/actions.ts's confirmVendorShipmentAction.
export async function requestVendorPayoutAction(): Promise<{ error?: string }> {
  const { vendor } = await requireVendorAccountAccess();
  const result = await requestVendorPayout(vendor.id);
  if (!result.error) {
    revalidatePath("/vendor/hoa-hong");
    revalidatePath("/vendor");
  }
  return result;
}

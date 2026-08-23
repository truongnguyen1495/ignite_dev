import { test } from "node:test";
import assert from "node:assert/strict";
import { isVendorActive, resolveCommissionPercent, slugifyShopName, splitCommission } from "./vendor";

test("slugifyShopName — strips diacritics and non-url characters", async (t) => {
  await t.test("Vietnamese shop name", () => {
    assert.equal(slugifyShopName("Gốm Bát Tràng An"), "gom-bat-trang-an");
  });
  await t.test("đ/Đ is not stripped by NFD normalization alone", () => {
    assert.equal(slugifyShopName("Đồ Gỗ Đông Á"), "do-go-dong-a");
  });
  await t.test("collapses repeated separators and trims edges", () => {
    assert.equal(slugifyShopName("  Mộc -- Trà & An  "), "moc-tra-an");
  });
  await t.test("empty/only-symbols input falls back to a safe default", () => {
    assert.equal(slugifyShopName("!!!"), "gian-hang");
  });
});

test("splitCommission — platform/vendor split always sums back to gross, rounds down to the platform", async (t) => {
  await t.test("even split", () => {
    assert.deepEqual(splitCommission(1000, 20), { platformAmount: 200, vendorAmount: 800 });
  });
  await t.test("rounds the platform's cut down, not the vendor's", () => {
    // 850.000 * 20% = 170.000 exactly, no rounding needed at this figure —
    // use a price that actually forces truncation instead.
    const { platformAmount, vendorAmount } = splitCommission(999, 33);
    assert.equal(platformAmount + vendorAmount, 999);
    assert.equal(platformAmount, Math.floor((999 * 33) / 100));
  });
  await t.test("0% keeps everything with the vendor", () => {
    assert.deepEqual(splitCommission(500000, 0), { platformAmount: 0, vendorAmount: 500000 });
  });
  await t.test("100% keeps everything with the platform", () => {
    assert.deepEqual(splitCommission(500000, 100), { platformAmount: 500000, vendorAmount: 0 });
  });
});

test("resolveCommissionPercent — override wins, falls back to platform default", async (t) => {
  await t.test("vendor override present", () => {
    assert.equal(resolveCommissionPercent({ commissionPercentOverride: 15 }, 20), 15);
  });
  await t.test("no override", () => {
    assert.equal(resolveCommissionPercent({ commissionPercentOverride: null }, 20), 20);
  });
});

test("isVendorActive — every one of the three gates independently hides the vendor", async (t) => {
  const base = { applicationStatus: "APPROVED" as const, pausedAt: null, suspendedAt: null };
  await t.test("null vendor is never active", () => {
    assert.equal(isVendorActive(null), false);
  });
  await t.test("approved, not paused, not suspended -> active", () => {
    assert.equal(isVendorActive(base), true);
  });
  await t.test("still PENDING application -> not active", () => {
    assert.equal(isVendorActive({ ...base, applicationStatus: "PENDING" }), false);
  });
  await t.test("REJECTED application -> not active", () => {
    assert.equal(isVendorActive({ ...base, applicationStatus: "REJECTED" }), false);
  });
  await t.test("self-paused -> not active", () => {
    assert.equal(isVendorActive({ ...base, pausedAt: new Date() }), false);
  });
  await t.test("admin-suspended -> not active", () => {
    assert.equal(isVendorActive({ ...base, suspendedAt: new Date() }), false);
  });
});

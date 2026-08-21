import { test } from "node:test";
import assert from "node:assert/strict";
import { computeShippingFee, countPhysicalUnits, unitsUntilFreeShipping } from "./shipping";
import { composeAddressLine, findUnitNames, normalizeForSearch } from "./address";
// The directory module itself is `server-only` and throws under the test
// runner, so the data is read straight from the file it wraps — which is
// what these assertions are actually about.
import units from "@/data/vn-administrative-units.json";

const POLICY = { fee: 25_000, freeFromItems: 2 };

test("countPhysicalUnits — counts units in the parcel, not lines", async (t) => {
  await t.test("adds quantities across product lines", () => {
    assert.equal(
      countPhysicalUnits([
        { kind: "PRODUCT", quantity: 2 },
        { kind: "PRODUCT", quantity: 1 },
      ]),
      3
    );
  });
  await t.test("ignores courses and books — nothing of theirs ships", () => {
    assert.equal(
      countPhysicalUnits([
        { kind: "COURSE", quantity: 1 },
        { kind: "LIBRARY_ITEM", quantity: 1 },
      ]),
      0
    );
  });
});

test("computeShippingFee", async (t) => {
  await t.test("a digital-only order is never charged delivery", () => {
    assert.equal(computeShippingFee(POLICY, 0), 0);
  });
  await t.test("below the threshold pays the flat fee", () => {
    assert.equal(computeShippingFee(POLICY, 1), 25_000);
  });
  await t.test("at the threshold ships free", () => {
    assert.equal(computeShippingFee(POLICY, 2), 0);
  });
  await t.test("above the threshold still ships free", () => {
    assert.equal(computeShippingFee(POLICY, 9), 0);
  });
  await t.test("freeFromItems = 0 turns the offer off entirely", () => {
    assert.equal(computeShippingFee({ fee: 25_000, freeFromItems: 0 }, 99), 25_000);
  });
  await t.test("a negative fee an admin typed can never become a discount", () => {
    assert.equal(computeShippingFee({ fee: -5_000, freeFromItems: 0 }, 1), 0);
  });
});

test("unitsUntilFreeShipping — how many more to add", async (t) => {
  await t.test("one short of the threshold", () => {
    assert.equal(unitsUntilFreeShipping(POLICY, 1), 1);
  });
  await t.test("nothing to nudge about once it is reached", () => {
    assert.equal(unitsUntilFreeShipping(POLICY, 2), 0);
  });
  await t.test("nothing to nudge about with no physical items", () => {
    assert.equal(unitsUntilFreeShipping(POLICY, 0), 0);
  });
  await t.test("nothing to nudge about when the offer is off", () => {
    assert.equal(unitsUntilFreeShipping({ fee: 25_000, freeFromItems: 0 }, 1), 0);
  });
});

test("composeAddressLine — envelope order, no empty commas", async (t) => {
  await t.test("street, ward, province", () => {
    assert.equal(
      composeAddressLine({
        street: "497 Phạm Văn Tuân",
        wardName: "Phường An Hải",
        provinceName: "Thành phố Đà Nẵng",
      }),
      "497 Phạm Văn Tuân, Phường An Hải, Thành phố Đà Nẵng"
    );
  });
  await t.test("a blank street doesn't leave a dangling comma", () => {
    assert.equal(
      composeAddressLine({ street: "  ", wardName: "Phường An Hải", provinceName: "Thành phố Đà Nẵng" }),
      "Phường An Hải, Thành phố Đà Nẵng"
    );
  });
});

test("normalizeForSearch — typing without diacritics still finds the place", async (t) => {
  await t.test("strips tone marks", () => {
    assert.equal(normalizeForSearch("Thành phố Đà Nẵng"), "thanh pho da nang");
  });
  await t.test("đ folds to d", () => {
    assert.equal(normalizeForSearch("Đặc khu Hoàng Sa"), "dac khu hoang sa");
  });
  await t.test("what a buyer types matches what they meant", () => {
    assert.ok(normalizeForSearch("Thành phố Đà Nẵng").includes(normalizeForSearch("da nang")));
  });
});

test("administrative directory data", async (t) => {
  await t.test("the 2025 two-level structure: 34 tỉnh/thành", () => {
    assert.equal(units.length, 34);
  });
  await t.test("every province has wards under it", () => {
    for (const province of units) {
      assert.ok(province.wards.length > 0, `${province.name} has no wards`);
    }
  });
  await t.test("codes are unique and zero-padded to the official width", () => {
    const provinceCodes = new Set<string>();
    const wardCodes = new Set<string>();
    for (const province of units) {
      assert.match(province.code, /^\d{2}$/, `${province.name} has code ${province.code}`);
      assert.ok(!provinceCodes.has(province.code), `duplicate province code ${province.code}`);
      provinceCodes.add(province.code);
      for (const ward of province.wards) {
        assert.match(ward.code, /^\d{5}$/, `${ward.name} has code ${ward.code}`);
        assert.ok(!wardCodes.has(ward.code), `duplicate ward code ${ward.code}`);
        wardCodes.add(ward.code);
      }
    }
  });
});

test("findUnitNames — a ward only counts inside its own province", async (t) => {
  const daNang = units.find((entry) => entry.name.includes("Đà Nẵng"))!;
  const haNoi = units.find((entry) => entry.name.includes("Hà Nội"))!;

  await t.test("a real pair resolves to the directory's own names", () => {
    const ward = daNang.wards[0];
    assert.deepEqual(findUnitNames(daNang, ward.code), {
      provinceName: daNang.name,
      wardName: ward.name,
    });
  });
  await t.test("a ward borrowed from another province is refused", () => {
    assert.equal(findUnitNames(daNang, haNoi.wards[0].code), null);
  });
  await t.test("an unknown province is refused", () => {
    assert.equal(findUnitNames(undefined, daNang.wards[0].code), null);
  });
  await t.test("an invented ward code is refused", () => {
    assert.equal(findUnitNames(daNang, "00000"), null);
  });
});

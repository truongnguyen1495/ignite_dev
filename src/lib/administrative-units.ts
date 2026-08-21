import "server-only";

import units from "@/data/vn-administrative-units.json";
import { findUnitNames, type AdministrativeUnit } from "@/lib/address";

/**
 * Vietnam's administrative units, two levels deep: tỉnh/thành → phường/xã.
 *
 * Shipped as a JSON file inside the repo rather than fetched from a
 * directory API at request time. The list changes when the National
 * Assembly says it does — a handful of times a decade — so paying a network
 * round trip (and inheriting somebody else's uptime) on every checkout to
 * re-learn something that stable would be a bad trade: a directory API
 * having a bad day would take the checkout screen down with it.
 *
 * The data is the 2025 two-level structure — 34 tỉnh/thành and 3.321
 * phường/xã, with the old quận/huyện level gone — sorted by Vietnamese
 * collation at build time (see the generator note in the JSON's sibling
 * commit), so nothing here has to sort 3.321 names per request.
 *
 * `server-only` on purpose: this module is ~145 KB of JSON. The province
 * list (34 entries) is small enough to hand to the browser as props, and
 * wards are fetched one province at a time from /api/dia-gioi/[code] — but
 * an accidental `import` from a Client Component would quietly push the
 * whole file into the client bundle, so make that a build error instead.
 */
export type Province = AdministrativeUnit;
export type Ward = AdministrativeUnit;

type ProvinceRecord = Province & { wards: Ward[] };

const PROVINCES: ProvinceRecord[] = units;

// Built once per server process, not per request: findIndex over 34 entries
// is cheap, but the ward lookup below would otherwise be a linear scan of
// 3.321 names on every address the app validates or renders.
const BY_PROVINCE = new Map(PROVINCES.map((province) => [province.code, province]));

// The wards array minus the wards — what the checkout form actually needs.
// Frozen and computed once so a caller can hand it straight to a Client
// Component without copying.
const PROVINCE_OPTIONS: readonly Province[] = PROVINCES.map(({ code, name }) => ({ code, name }));

/** All 34 tỉnh/thành, already in Vietnamese alphabetical order. */
export function listProvinces(): readonly Province[] {
  return PROVINCE_OPTIONS;
}

/**
 * The phường/xã of one province, or null when the code isn't one of the 34
 * — which is the same answer as "we don't ship there", so callers can treat
 * an unknown province as a validation failure without a second lookup.
 */
export function listWards(provinceCode: string): readonly Ward[] | null {
  return BY_PROVINCE.get(provinceCode)?.wards ?? null;
}

/**
 * Turns the two codes a form submits into the names they stand for, or null
 * if either doesn't exist (or the ward isn't in that province — a made-up
 * pairing must not resolve).
 *
 * Everything that writes an address goes through here rather than trusting
 * names posted alongside the codes: the names are what a courier reads and
 * what an admin sees, so they come from this file, never from the request.
 */
export function resolveAdministrativeUnit(
  provinceCode: string,
  wardCode: string
): { provinceName: string; wardName: string } | null {
  return findUnitNames(BY_PROVINCE.get(provinceCode), wardCode);
}

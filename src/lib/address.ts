/**
 * Address helpers shared by the server (which writes addresses) and the
 * browser (which types them). Deliberately free of `server-only` and of any
 * import of the 145 KB administrative-units JSON — everything here is pure
 * string work over values the caller already has.
 */

/**
 * One entry of the administrative directory — a tỉnh/thành or a phường/xã.
 * Declared here, in the client-safe module, so a Client Component can name
 * the shape without importing the server-only data file it comes from.
 */
export type AdministrativeUnit = { code: string; name: string };

/** A tỉnh/thành together with the phường/xã under it. */
export type ProvinceWithWards = AdministrativeUnit & { wards: readonly AdministrativeUnit[] };

/**
 * The rule that keeps a made-up address off an order: a ward only resolves
 * inside the province it actually belongs to, so "Phường Hải Châu, Thành
 * phố Hà Nội" is refused even though both halves exist somewhere.
 *
 * Lives here, in the client-safe module, purely so it can be tested — the
 * directory itself is `server-only` and cannot be imported by a test
 * runner. The server module owns the lookup (a Map) and hands the province
 * it found to this.
 */
export function findUnitNames(
  province: ProvinceWithWards | undefined,
  wardCode: string
): { provinceName: string; wardName: string } | null {
  if (!province) return null;
  const ward = province.wards.find((entry) => entry.code === wardCode);
  if (!ward) return null;
  return { provinceName: province.name, wardName: ward.name };
}

export type AddressParts = {
  street: string;
  wardName: string;
  provinceName: string;
};

/**
 * The one canonical way an address is turned into a line of text: house
 * number and street first, then phường/xã, then tỉnh/thành — the order a
 * Vietnamese envelope is written in, and the order a courier reads.
 *
 * Every writer goes through this rather than formatting inline, so the
 * address on the checkout screen, on the order, in the admin list and on a
 * shipping label are the same string and not four dialects of it.
 */
export function composeAddressLine({ street, wardName, provinceName }: AddressParts): string {
  return [street.trim(), wardName, provinceName].filter(Boolean).join(", ");
}

/**
 * Folds a Vietnamese string down to plain ASCII lowercase so the
 * province/ward pickers match what people actually type: "da nang" has to
 * find "Thành phố Đà Nẵng", and "hoang sa" has to find "Đặc khu Hoàng Sa".
 *
 * NFD splits a letter from its tone/diacritic marks so the combining marks
 * can be stripped as a range; đ/Đ is the one Vietnamese letter that does
 * NOT decompose (its stroke is part of the glyph, not a combining mark), so
 * it gets replaced by hand.
 */
export function normalizeForSearch(value: string): string {
  let out = "";
  for (const char of value.normalize("NFD")) {
    const code = char.codePointAt(0)!;
    // U+0300–U+036F is the Combining Diacritical Marks block — every
    // Vietnamese tone mark and vowel modifier NFD just split off. Dropped by
    // code point rather than by a regex range so the source stays readable
    // ASCII instead of a character class made of invisible marks.
    if (code >= 0x0300 && code <= 0x036f) continue;
    out += char === "đ" ? "d" : char === "Đ" ? "D" : char;
  }
  return out.toLowerCase().trim();
}

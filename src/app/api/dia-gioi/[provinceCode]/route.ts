import { NextResponse } from "next/server";
import { listWards } from "@/lib/administrative-units";

// The phường/xã of one tỉnh/thành, for the checkout address picker.
//
// Split out as a route instead of being handed to the form with the
// provinces: all 3.321 wards are ~145 KB of JSON, and a buyer only ever
// needs the ~100 belonging to the one province they picked. The province
// list itself (34 entries) still arrives as props, so the form renders
// complete on first paint and this is only ever hit after a real choice.
//
// Public and unauthenticated on purpose — it's the national administrative
// directory, the same list on every government form, so there is nothing
// here to gate. It also touches no database, which is why it can be polled
// freely without competing for the connection_limit=1 pool.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ provinceCode: string }> }
) {
  const { provinceCode } = await params;
  const wards = listWards(provinceCode);
  if (!wards) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(
    { wards },
    {
      // The list changes when the National Assembly redraws boundaries, so
      // a day of browser caching costs nothing and saves a round trip on
      // every repeat checkout. immutable is deliberately NOT used: this
      // must be able to go stale within a day of a deploy that ships new
      // boundaries, and a hard-pinned year would outlive the data.
      headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" },
    }
  );
}

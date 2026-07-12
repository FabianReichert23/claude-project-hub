import { NextRequest, NextResponse } from "next/server";

// GET list endpoints default to compact rows (no long text fields) — the common case
// is getting an overview, not reading every description. ?expand=full includes the
// given long fields for every item.
function wantsExpand(req: NextRequest): boolean {
  return req.nextUrl.searchParams.get("expand") === "full";
}

export function leanList(
  req: NextRequest,
  rows: Record<string, unknown>[],
  longFields: string[]
): NextResponse {
  if (wantsExpand(req)) return NextResponse.json(rows);
  const stripped = rows.map((row) => {
    const lean = { ...row };
    for (const field of longFields) delete lean[field];
    return lean;
  });
  return NextResponse.json(stripped);
}

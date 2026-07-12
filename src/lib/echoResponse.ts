import { NextRequest, NextResponse } from "next/server";

// POST/PATCH default to a lean { id, created_at?, updated_at? } body instead of echoing
// back fields the caller already sent in the request. ?echo=full opts into the full row.
function leanRow(row: Record<string, unknown>): Record<string, unknown> {
  const lean: Record<string, unknown> = { id: row.id };
  if ("created_at" in row) lean.created_at = row.created_at;
  if ("updated_at" in row) lean.updated_at = row.updated_at;
  return lean;
}

function wantsFull(req: NextRequest): boolean {
  return req.nextUrl.searchParams.get("echo") === "full";
}

export function echo(
  req: NextRequest,
  row: Record<string, unknown>,
  init?: { status?: number }
): NextResponse {
  return NextResponse.json(wantsFull(req) ? row : leanRow(row), init);
}

export function echoList(
  req: NextRequest,
  rows: Record<string, unknown>[],
  init?: { status?: number }
): NextResponse {
  return NextResponse.json(wantsFull(req) ? rows : rows.map(leanRow), init);
}

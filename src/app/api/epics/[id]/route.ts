import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Epic } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.prepare("SELECT * FROM epics WHERE id = ?").get(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const existing = db.prepare("SELECT * FROM epics WHERE id = ?").get(id) as Epic | undefined;
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const name = body.name ?? existing.name;
  const implemented =
    body.implemented !== undefined ? (body.implemented ? 1 : 0) : existing.implemented;

  db.prepare(
    "UPDATE epics SET name = ?, implemented = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(name, implemented, id);

  const updated = db.prepare("SELECT * FROM epics WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  db.prepare("DELETE FROM epics WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

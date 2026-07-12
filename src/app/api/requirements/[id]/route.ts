import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Requirement } from "@/lib/types";
import { echo } from "@/lib/echoResponse";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.prepare("SELECT * FROM requirements WHERE id = ?").get(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const existing = db.prepare("SELECT * FROM requirements WHERE id = ?").get(id) as
    | Requirement
    | undefined;
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const title = body.title ?? existing.title;
  const description = body.description ?? existing.description;
  const priority = body.priority ?? existing.priority;
  const status = body.status ?? existing.status;
  const type = body.type ?? existing.type;
  if (type !== "requirement" && type !== "bug") {
    return NextResponse.json({ error: "type must be 'requirement' or 'bug'" }, { status: 400 });
  }
  const implemented =
    body.implemented !== undefined ? (body.implemented ? 1 : 0) : existing.implemented;
  const epic_id = "epic_id" in body ? body.epic_id : existing.epic_id;

  db.prepare(
    "UPDATE requirements SET title = ?, description = ?, priority = ?, status = ?, type = ?, implemented = ?, epic_id = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(title, description, priority, status, type, implemented, epic_id, id);

  const updated = db.prepare("SELECT * FROM requirements WHERE id = ?").get(id) as Record<
    string,
    unknown
  >;
  return echo(req, updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  db.prepare("DELETE FROM requirements WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

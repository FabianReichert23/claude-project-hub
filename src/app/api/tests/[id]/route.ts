import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { TestCase } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const row = db.prepare("SELECT * FROM tests WHERE id = ?").get(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const existing = db.prepare("SELECT * FROM tests WHERE id = ?").get(id) as TestCase | undefined;
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const title = body.title ?? existing.title;
  const description = body.description ?? existing.description;
  const steps = body.steps ?? existing.steps;
  const expected_result = body.expected_result ?? existing.expected_result;
  const status = body.status ?? existing.status;
  const requirement_id =
    body.requirement_id !== undefined ? body.requirement_id : existing.requirement_id;

  db.prepare(
    `UPDATE tests SET title = ?, description = ?, steps = ?, expected_result = ?, status = ?, requirement_id = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(title, description, steps, expected_result, status, requirement_id, id);

  const updated = db.prepare("SELECT * FROM tests WHERE id = ?").get(id);
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  db.prepare("DELETE FROM tests WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

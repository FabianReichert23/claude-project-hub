import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { echo } from "@/lib/echoResponse";
import { leanList } from "@/lib/leanList";

type Params = { params: Promise<{ id: string }> };

const FILTER_COLUMNS = ["status", "epic_id", "type", "implemented"] as const;

export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const conditions = ["project_id = ?"];
  const args: unknown[] = [id];
  for (const column of FILTER_COLUMNS) {
    const value = req.nextUrl.searchParams.get(column);
    if (value !== null) {
      conditions.push(`${column} = ?`);
      args.push(value);
    }
  }
  const rows = db
    .prepare(`SELECT * FROM requirements WHERE ${conditions.join(" AND ")} ORDER BY created_at DESC`)
    .all(...args) as Record<string, unknown>[];
  return leanList(req, rows, ["description"]);
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const {
    title,
    description = "",
    priority = "medium",
    status = "draft",
    type = "requirement",
    implemented = 0,
    epic_id = null,
  } = body;
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  if (type !== "requirement" && type !== "bug") {
    return NextResponse.json({ error: "type must be 'requirement' or 'bug'" }, { status: 400 });
  }

  const result = db
    .prepare(
      "INSERT INTO requirements (project_id, epic_id, title, description, priority, status, type, implemented) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    )
    .run(id, epic_id, title, description, priority, status, type, implemented ? 1 : 0);

  const row = db
    .prepare("SELECT * FROM requirements WHERE id = ?")
    .get(result.lastInsertRowid) as Record<string, unknown>;
  return echo(req, row, { status: 201 });
}

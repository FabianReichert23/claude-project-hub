import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET() {
  const projects = db
    .prepare("SELECT * FROM projects ORDER BY updated_at DESC")
    .all();
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, description = "" } = body;
  if (!name || typeof name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const result = db
      .prepare("INSERT INTO projects (name, description) VALUES (?, ?)")
      .run(name, description);
    const project = db
      .prepare("SELECT * FROM projects WHERE id = ?")
      .get(result.lastInsertRowid);
    return NextResponse.json(project, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 409 });
  }
}

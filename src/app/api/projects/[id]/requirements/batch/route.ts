import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

type BatchItem = {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  implemented?: number | boolean;
  epic_id?: number | null;
};

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const items: BatchItem[] = body.items;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
  }
  const invalidIndex = items.findIndex((item) => !item.title);
  if (invalidIndex !== -1) {
    return NextResponse.json(
      { error: `title is required (item index ${invalidIndex})` },
      { status: 400 }
    );
  }

  const insert = db.prepare(
    "INSERT INTO requirements (project_id, epic_id, title, description, priority, status, implemented) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const select = db.prepare("SELECT * FROM requirements WHERE id = ?");

  const insertAll = db.transaction((rows: BatchItem[]) => {
    return rows.map((item) => {
      const result = insert.run(
        id,
        item.epic_id ?? null,
        item.title,
        item.description ?? "",
        item.priority ?? "medium",
        item.status ?? "draft",
        item.implemented ? 1 : 0
      );
      return select.get(result.lastInsertRowid);
    });
  });

  const created = insertAll(items);
  return NextResponse.json(created, { status: 201 });
}

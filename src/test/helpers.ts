import db from "@/lib/db";

const TABLES = ["comments", "tests", "worklog_entries", "requirements", "epics", "projects"];

export function resetDb(): void {
  for (const table of TABLES) db.exec(`DELETE FROM ${table}`);
}

export function seedProject(name = "Test Project"): number {
  const result = db.prepare("INSERT INTO projects (name) VALUES (?)").run(name);
  return Number(result.lastInsertRowid);
}

export function seedEpic(projectId: number, name = "Test Epic"): number {
  const result = db
    .prepare("INSERT INTO epics (project_id, name) VALUES (?, ?)")
    .run(projectId, name);
  return Number(result.lastInsertRowid);
}

export function params(id: number | string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: String(id) }) };
}

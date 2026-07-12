import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE } from "./route";
import { params, resetDb, seedEpic, seedProject } from "@/test/helpers";
import db from "@/lib/db";

let projectId: number;
let epicId: number;
let reqId: number;

beforeEach(() => {
  resetDb();
  projectId = seedProject();
  epicId = seedEpic(projectId);
  const result = db
    .prepare("INSERT INTO requirements (project_id, epic_id, title) VALUES (?, ?, ?)")
    .run(projectId, epicId, "Req A");
  reqId = Number(result.lastInsertRowid);
});

describe("DELETE /api/epics/[id]", () => {
  it("sets epic_id to NULL on requirements instead of deleting them (ON DELETE SET NULL)", async () => {
    await DELETE(
      new NextRequest(`http://localhost/api/epics/${epicId}`, { method: "DELETE" }),
      params(epicId)
    );

    const epic = db.prepare("SELECT * FROM epics WHERE id = ?").get(epicId);
    expect(epic).toBeUndefined();

    const requirement = db.prepare("SELECT * FROM requirements WHERE id = ?").get(reqId) as {
      epic_id: number | null;
    };
    expect(requirement).toBeDefined();
    expect(requirement.epic_id).toBeNull();
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { DELETE, GET, PATCH } from "./route";
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
    .prepare(
      "INSERT INTO requirements (project_id, epic_id, title) VALUES (?, ?, ?)"
    )
    .run(projectId, epicId, "Req A");
  reqId = Number(result.lastInsertRowid);
});

describe("GET /api/requirements/[id]", () => {
  it("returns 404 for an unknown id", async () => {
    const res = await GET(new NextRequest("http://localhost/api/requirements/999999"), params(999999));
    expect(res.status).toBe(404);
  });

  it("returns the full requirement row", async () => {
    const res = await GET(
      new NextRequest(`http://localhost/api/requirements/${reqId}`),
      params(reqId)
    );
    const body = await res.json();
    expect(body.title).toBe("Req A");
    expect(body.epic_id).toBe(epicId);
  });
});

describe("PATCH /api/requirements/[id]", () => {
  it("updates only the given fields, keeping the rest unchanged", async () => {
    const res = await PATCH(
      new NextRequest(`http://localhost/api/requirements/${reqId}?echo=full`, {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      }),
      params(reqId)
    );
    const body = await res.json();
    expect(body.status).toBe("done");
    expect(body.title).toBe("Req A");
    expect(body.epic_id).toBe(epicId);
  });

  it("clears epic_id when explicitly set to null (not just omitted)", async () => {
    const res = await PATCH(
      new NextRequest(`http://localhost/api/requirements/${reqId}?echo=full`, {
        method: "PATCH",
        body: JSON.stringify({ epic_id: null }),
      }),
      params(reqId)
    );
    const body = await res.json();
    expect(body.epic_id).toBeNull();
  });

  it("keeps the existing epic_id when the field is omitted entirely", async () => {
    const res = await PATCH(
      new NextRequest(`http://localhost/api/requirements/${reqId}?echo=full`, {
        method: "PATCH",
        body: JSON.stringify({ title: "Req A renamed" }),
      }),
      params(reqId)
    );
    const body = await res.json();
    expect(body.epic_id).toBe(epicId);
  });

  it("rejects an invalid type with 400", async () => {
    const res = await PATCH(
      new NextRequest(`http://localhost/api/requirements/${reqId}`, {
        method: "PATCH",
        body: JSON.stringify({ type: "feature" }),
      }),
      params(reqId)
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown id", async () => {
    const res = await PATCH(
      new NextRequest("http://localhost/api/requirements/999999", {
        method: "PATCH",
        body: JSON.stringify({ status: "done" }),
      }),
      params(999999)
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/requirements/[id]", () => {
  it("removes the requirement", async () => {
    await DELETE(
      new NextRequest(`http://localhost/api/requirements/${reqId}`, { method: "DELETE" }),
      params(reqId)
    );
    const row = db.prepare("SELECT * FROM requirements WHERE id = ?").get(reqId);
    expect(row).toBeUndefined();
  });
});

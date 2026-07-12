import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";
import { params, resetDb, seedProject } from "@/test/helpers";
import db from "@/lib/db";

let projectId: number;

beforeEach(() => {
  resetDb();
  projectId = seedProject();
});

function batchRequest(items: unknown[], query = "") {
  return new NextRequest(
    `http://localhost/api/projects/${projectId}/requirements/batch${query}`,
    { method: "POST", body: JSON.stringify({ items }) }
  );
}

describe("POST /api/projects/[id]/requirements/batch", () => {
  it("creates all items in one call", async () => {
    const res = await POST(
      batchRequest([{ title: "A" }, { title: "B" }, { title: "C" }]),
      params(projectId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveLength(3);
    const count = db
      .prepare("SELECT COUNT(*) as n FROM requirements WHERE project_id = ?")
      .get(projectId) as { n: number };
    expect(count.n).toBe(3);
  });

  it("rejects an empty items array with 400", async () => {
    const res = await POST(batchRequest([]), params(projectId));
    expect(res.status).toBe(400);
  });

  it("rejects more than 500 items with 400 and creates nothing", async () => {
    const items = Array.from({ length: 501 }, (_, i) => ({ title: `Req ${i}` }));
    const res = await POST(batchRequest(items), params(projectId));
    expect(res.status).toBe(400);
    const count = db
      .prepare("SELECT COUNT(*) as n FROM requirements WHERE project_id = ?")
      .get(projectId) as { n: number };
    expect(count.n).toBe(0);
  });

  it("accepts exactly 500 items", async () => {
    const items = Array.from({ length: 500 }, (_, i) => ({ title: `Req ${i}` }));
    const res = await POST(batchRequest(items), params(projectId));
    expect(res.status).toBe(201);
  });

  it("rolls back the whole batch when one item is invalid (all-or-nothing)", async () => {
    const res = await POST(
      batchRequest([{ title: "Valid" }, { title: "" }, { title: "Also valid" }]),
      params(projectId)
    );
    expect(res.status).toBe(400);
    const count = db
      .prepare("SELECT COUNT(*) as n FROM requirements WHERE project_id = ?")
      .get(projectId) as { n: number };
    expect(count.n).toBe(0);
  });

  it("rolls back the whole batch when one item has an invalid type", async () => {
    const res = await POST(
      batchRequest([{ title: "Valid" }, { title: "Bad type", type: "feature" }]),
      params(projectId)
    );
    expect(res.status).toBe(400);
    const count = db
      .prepare("SELECT COUNT(*) as n FROM requirements WHERE project_id = ?")
      .get(projectId) as { n: number };
    expect(count.n).toBe(0);
  });

  it("rolls back the whole batch on a foreign-key violation (unknown epic_id)", async () => {
    await expect(
      POST(
        batchRequest([{ title: "Valid" }, { title: "Bad epic", epic_id: 999999 }]),
        params(projectId)
      )
    ).rejects.toThrow();
    const count = db
      .prepare("SELECT COUNT(*) as n FROM requirements WHERE project_id = ?")
      .get(projectId) as { n: number };
    expect(count.n).toBe(0);
  });

  it("returns lean rows by default, full rows with ?echo=full", async () => {
    const res = await POST(batchRequest([{ title: "A", priority: "high" }], "?echo=full"), params(projectId));
    const body = await res.json();
    expect(body[0].priority).toBe("high");
  });
});

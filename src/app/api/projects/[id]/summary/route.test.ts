import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { params, resetDb, seedProject } from "@/test/helpers";

let projectId: number;

beforeEach(() => {
  resetDb();
  projectId = seedProject();
});

describe("GET /api/projects/[id]/summary", () => {
  it("returns zeroed aggregates and empty lists for a project with no data", async () => {
    const res = await GET(
      new NextRequest(`http://localhost/api/projects/${projectId}/summary`),
      params(projectId)
    );
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.epics).toEqual([]);
    expect(body.architecture).toEqual([]);
    expect(body.requirements).toEqual({
      total: 0,
      implemented: 0,
      without_epic: 0,
      by_status: { draft: 0, approved: 0, in_progress: 0, done: 0, rejected: 0 },
    });
    expect(body.tests).toEqual({
      total: 0,
      by_status: { pending: 0, pass: 0, fail: 0, blocked: 0 },
    });
  });

  it("returns 404 for an unknown project id", async () => {
    const res = await GET(
      new NextRequest("http://localhost/api/projects/999999/summary"),
      params(999999)
    );
    expect(res.status).toBe(404);
  });
});

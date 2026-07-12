import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { params, resetDb, seedEpic, seedProject } from "@/test/helpers";
import db from "@/lib/db";

let projectId: number;

beforeEach(() => {
  resetDb();
  projectId = seedProject();
});

function seedRequirement(epicId: number | null = null): number {
  const result = db
    .prepare("INSERT INTO requirements (project_id, epic_id, title) VALUES (?, ?, ?)")
    .run(projectId, epicId, "Req");
  return Number(result.lastInsertRowid);
}

describe("GET /api/projects/[id]/tests", () => {
  it("returns tests without long text fields by default", async () => {
    await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/tests`, {
        method: "POST",
        body: JSON.stringify({ title: "Test A", description: "long", steps: "long", expected_result: "long" }),
      }),
      params(projectId)
    );

    const res = await GET(new NextRequest(`http://localhost/api/projects/${projectId}/tests`), params(projectId));
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).not.toHaveProperty("description");
  });

  it("filters by status", async () => {
    await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/tests`, {
        method: "POST",
        body: JSON.stringify({ title: "Passing", status: "pass" }),
      }),
      params(projectId)
    );
    await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/tests`, {
        method: "POST",
        body: JSON.stringify({ title: "Failing", status: "fail" }),
      }),
      params(projectId)
    );

    const res = await GET(
      new NextRequest(`http://localhost/api/projects/${projectId}/tests?status=fail`),
      params(projectId)
    );
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Failing");
  });

  it("filters by epic_id via the linked requirement", async () => {
    const epicId = seedEpic(projectId);
    const reqInEpic = seedRequirement(epicId);
    const reqOutsideEpic = seedRequirement(null);
    await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/tests`, {
        method: "POST",
        body: JSON.stringify({ title: "In epic", requirement_id: reqInEpic }),
      }),
      params(projectId)
    );
    await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/tests`, {
        method: "POST",
        body: JSON.stringify({ title: "Outside epic", requirement_id: reqOutsideEpic }),
      }),
      params(projectId)
    );
    await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/tests`, {
        method: "POST",
        body: JSON.stringify({ title: "Unlinked" }),
      }),
      params(projectId)
    );

    const res = await GET(
      new NextRequest(`http://localhost/api/projects/${projectId}/tests?epic_id=${epicId}`),
      params(projectId)
    );
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("In epic");
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";
import { params, resetDb, seedProject } from "@/test/helpers";

let projectId: number;

beforeEach(() => {
  resetDb();
  projectId = seedProject();
});

describe("GET /api/projects/[id]/requirements", () => {
  it("returns requirements without the description field by default", async () => {
    await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements`, {
        method: "POST",
        body: JSON.stringify({ title: "Req A", description: "long text" }),
      }),
      params(projectId)
    );

    const res = await GET(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements`),
      params(projectId)
    );
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Req A");
    expect(body[0]).not.toHaveProperty("description");
  });

  it("includes the description field with ?expand=full", async () => {
    await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements`, {
        method: "POST",
        body: JSON.stringify({ title: "Req A", description: "long text" }),
      }),
      params(projectId)
    );

    const res = await GET(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements?expand=full`),
      params(projectId)
    );
    const body = await res.json();
    expect(body[0].description).toBe("long text");
  });

  it("only returns requirements of the given project", async () => {
    const otherProjectId = seedProject("Other Project");
    await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements`, {
        method: "POST",
        body: JSON.stringify({ title: "Mine" }),
      }),
      params(projectId)
    );
    await POST(
      new NextRequest(`http://localhost/api/projects/${otherProjectId}/requirements`, {
        method: "POST",
        body: JSON.stringify({ title: "Not mine" }),
      }),
      params(otherProjectId)
    );

    const res = await GET(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements`),
      params(projectId)
    );
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("Mine");
  });
});

describe("POST /api/projects/[id]/requirements", () => {
  it("creates a requirement with defaults for omitted fields", async () => {
    const res = await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements`, {
        method: "POST",
        body: JSON.stringify({ title: "Req A" }),
      }),
      params(projectId)
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).not.toHaveProperty("priority");
  });

  it("rejects a missing title with 400", async () => {
    const res = await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
      params(projectId)
    );
    expect(res.status).toBe(400);
  });

  it("rejects an invalid type with 400", async () => {
    const res = await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements`, {
        method: "POST",
        body: JSON.stringify({ title: "Req A", type: "feature" }),
      }),
      params(projectId)
    );
    expect(res.status).toBe(400);
  });

  it("returns the full row with ?echo=full", async () => {
    const res = await POST(
      new NextRequest(`http://localhost/api/projects/${projectId}/requirements?echo=full`, {
        method: "POST",
        body: JSON.stringify({ title: "Req A", priority: "high" }),
      }),
      params(projectId)
    );
    const body = await res.json();
    expect(body.title).toBe("Req A");
    expect(body.priority).toBe("high");
  });
});

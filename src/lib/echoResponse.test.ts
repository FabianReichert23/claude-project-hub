import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { echo, echoList } from "./echoResponse";

const row = { id: 1, title: "A", description: "long", created_at: "t1", updated_at: "t2" };

describe("echo", () => {
  it("returns only id/created_at/updated_at by default", async () => {
    const req = new NextRequest("http://localhost/api/requirements/1", { method: "PATCH" });
    const res = echo(req, row);
    const body = await res.json();
    expect(body).toEqual({ id: 1, created_at: "t1", updated_at: "t2" });
  });

  it("returns the full row with ?echo=full", async () => {
    const req = new NextRequest("http://localhost/api/requirements/1?echo=full", {
      method: "PATCH",
    });
    const res = echo(req, row);
    const body = await res.json();
    expect(body).toEqual(row);
  });

  it("passes through the given status", async () => {
    const req = new NextRequest("http://localhost/api/requirements", { method: "POST" });
    const res = echo(req, row, { status: 201 });
    expect(res.status).toBe(201);
  });

  it("omits created_at/updated_at when absent on the row", async () => {
    const req = new NextRequest("http://localhost/api/requirements/1", { method: "PATCH" });
    const res = echo(req, { id: 5, title: "no timestamps" });
    const body = await res.json();
    expect(body).toEqual({ id: 5 });
  });
});

describe("echoList", () => {
  it("leans every row by default", async () => {
    const req = new NextRequest("http://localhost/api/requirements/batch", { method: "POST" });
    const res = echoList(req, [row, { ...row, id: 2 }]);
    const body = await res.json();
    expect(body).toEqual([
      { id: 1, created_at: "t1", updated_at: "t2" },
      { id: 2, created_at: "t1", updated_at: "t2" },
    ]);
  });

  it("returns full rows with ?echo=full", async () => {
    const req = new NextRequest("http://localhost/api/requirements/batch?echo=full", {
      method: "POST",
    });
    const res = echoList(req, [row]);
    const body = await res.json();
    expect(body).toEqual([row]);
  });
});

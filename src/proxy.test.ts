import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const URL = "http://example.com/api/requirements";

describe("proxy", () => {
  it("lets non-state-changing methods (GET) through unconditionally", () => {
    const req = new NextRequest(URL, {
      method: "GET",
      headers: { origin: "http://evil.com", host: "example.com" },
    });
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("allows a state-changing request with no Origin header (curl, MCP)", () => {
    const req = new NextRequest(URL, { method: "POST", headers: { host: "example.com" } });
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("allows a same-origin POST", () => {
    const req = new NextRequest(URL, {
      method: "POST",
      headers: { origin: "http://example.com", host: "example.com" },
    });
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("rejects a cross-origin POST with 403", async () => {
    const req = new NextRequest(URL, {
      method: "POST",
      headers: { origin: "http://evil.com", host: "example.com" },
    });
    const res = proxy(req);
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "cross-origin request rejected" });
  });

  it("rejects a malformed Origin header with 403", async () => {
    const req = new NextRequest(URL, {
      method: "DELETE",
      headers: { origin: "not-a-url", host: "example.com" },
    });
    const res = proxy(req);
    expect(res.status).toBe(403);
  });

  it("allows a state-changing request within the 2MB body limit", () => {
    const req = new NextRequest(URL, {
      method: "PATCH",
      headers: { host: "example.com", "content-length": String(2 * 1024 * 1024) },
    });
    const res = proxy(req);
    expect(res.status).toBe(200);
  });

  it("rejects a request body over 2MB with 413", async () => {
    const req = new NextRequest(URL, {
      method: "POST",
      headers: { host: "example.com", "content-length": String(2 * 1024 * 1024 + 1) },
    });
    const res = proxy(req);
    expect(res.status).toBe(413);
    expect(await res.json()).toEqual({ error: "request body too large" });
  });
});

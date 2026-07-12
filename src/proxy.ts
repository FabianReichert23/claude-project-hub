import { NextRequest, NextResponse } from "next/server";

// Next.js 16 renamed "middleware" to "proxy" (this fork's convention, not the
// upstream default at training time — see AGENTS.md) but the behavior is the same:
// runs before every matched request, ahead of the route handlers.

const STATE_CHANGING_METHODS = new Set(["POST", "PATCH", "DELETE"]);
const MAX_BODY_BYTES = 2 * 1024 * 1024; // 2 MB — generous for JSON payloads this app sends

// No authentication exists (local single-user tool by design, see Design-Entscheidungen),
// so a same-origin check is the pragmatic CSRF defense: browsers always send Origin on
// cross-origin state-changing requests and it can't be spoofed by page JS. Non-browser
// callers (curl, the MCP server) don't send Origin at all and are left untouched.
function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  if (!STATE_CHANGING_METHODS.has(req.method)) return NextResponse.next();

  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "cross-origin request rejected" }, { status: 403 });
  }

  const contentLength = req.headers.get("content-length");
  if (contentLength && Number(contentLength) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "request body too large" }, { status: 413 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};

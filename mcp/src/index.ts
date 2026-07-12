#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE_URL = process.env.HUB_BASE_URL ?? "http://localhost:3000";

class HubApiError extends Error {}

async function callApi(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error ?? res.statusText;
    throw new HubApiError(`Hub API ${res.status}: ${message}`);
  }
  return body;
}

// Drops undefined keys so PATCH bodies only send fields the caller actually set,
// while preserving explicit `null` (e.g. to clear epic_id/requirement_id).
function compact(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function errorResult(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

const server = new McpServer({ name: "claude-project-hub", version: "0.1.0" });

function tool<Args extends z.ZodRawShape>(
  name: string,
  description: string,
  inputSchema: Args,
  handler: (args: { [K in keyof Args]: z.infer<Args[K]> }) => Promise<unknown>
) {
  // Overload resolution on the SDK's generic, overloaded `tool()` breaks down when
  // wrapped in our own generic helper, so bypass it here; call sites stay fully typed.
  (server.tool as (...args: unknown[]) => void)(name, description, inputSchema, async (args: unknown) => {
    try {
      return jsonResult(await handler(args as { [K in keyof Args]: z.infer<Args[K]> }));
    } catch (err) {
      return errorResult(err);
    }
  });
}

const priority = z.enum(["low", "medium", "high", "critical"]);
const reqStatus = z.enum(["draft", "approved", "in_progress", "done", "rejected"]);
const testStatus = z.enum(["pending", "pass", "fail", "blocked"]);

// --- Projects ---

tool("list_projects", "List all projects in the Hub.", {}, () => callApi("/api/projects"));

tool(
  "create_project",
  "Create a new project in the Hub.",
  { name: z.string(), description: z.string().optional() },
  ({ name, description }) =>
    callApi("/api/projects", { method: "POST", body: JSON.stringify(compact({ name, description })) })
);

tool(
  "get_project_summary",
  "Get an aggregated overview of a project: epics with progress, requirement/test status counts, architecture doc titles. Call this first to orient in a project instead of fetching each resource separately.",
  { project_id: z.number() },
  ({ project_id }) => callApi(`/api/projects/${project_id}/summary`)
);

// --- Epics ---

tool("list_epics", "List epics of a project.", { project_id: z.number() }, ({ project_id }) =>
  callApi(`/api/projects/${project_id}/epics`)
);

tool(
  "create_epic",
  "Create an epic to group requirements under.",
  { project_id: z.number(), name: z.string(), implemented: z.union([z.literal(0), z.literal(1)]).optional() },
  ({ project_id, name, implemented }) =>
    callApi(`/api/projects/${project_id}/epics`, {
      method: "POST",
      body: JSON.stringify(compact({ name, implemented })),
    })
);

tool(
  "update_epic",
  "Update an epic's name or implemented flag.",
  { id: z.number(), name: z.string().optional(), implemented: z.union([z.literal(0), z.literal(1)]).optional() },
  ({ id, ...rest }) => callApi(`/api/epics/${id}`, { method: "PATCH", body: JSON.stringify(compact(rest)) })
);

// --- Requirements ---

tool("list_requirements", "List requirements of a project.", { project_id: z.number() }, ({ project_id }) =>
  callApi(`/api/projects/${project_id}/requirements`)
);

tool(
  "create_requirement",
  "Create a single requirement. For several at once, use create_requirements_batch instead.",
  {
    project_id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    priority: priority.optional(),
    status: reqStatus.optional(),
    implemented: z.union([z.literal(0), z.literal(1)]).optional(),
    epic_id: z.number().optional(),
  },
  ({ project_id, ...rest }) =>
    callApi(`/api/projects/${project_id}/requirements`, { method: "POST", body: JSON.stringify(compact(rest)) })
);

const requirementItem = z.object({
  title: z.string(),
  description: z.string().optional(),
  priority: priority.optional(),
  status: reqStatus.optional(),
  implemented: z.union([z.literal(0), z.literal(1)]).optional(),
  epic_id: z.number().optional(),
});

tool(
  "create_requirements_batch",
  "Create multiple requirements in one call, all-or-nothing (rolled back together if any item is invalid).",
  { project_id: z.number(), items: z.array(requirementItem) },
  ({ project_id, items }) =>
    callApi(`/api/projects/${project_id}/requirements/batch`, {
      method: "POST",
      body: JSON.stringify({ items }),
    })
);

tool(
  "update_requirement",
  "Update a requirement. Pass epic_id: null to clear its epic assignment.",
  {
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    priority: priority.optional(),
    status: reqStatus.optional(),
    implemented: z.union([z.literal(0), z.literal(1)]).optional(),
    epic_id: z.union([z.number(), z.null()]).optional(),
  },
  ({ id, ...rest }) => callApi(`/api/requirements/${id}`, { method: "PATCH", body: JSON.stringify(compact(rest)) })
);

// --- Architecture docs ---

tool("list_architecture", "List architecture documents of a project (includes full content).", { project_id: z.number() }, ({
  project_id,
}) => callApi(`/api/projects/${project_id}/architecture`));

tool(
  "create_architecture_doc",
  "Create an architecture document (Markdown content, ```mermaid blocks render as diagrams).",
  { project_id: z.number(), title: z.string(), content: z.string().optional() },
  ({ project_id, ...rest }) =>
    callApi(`/api/projects/${project_id}/architecture`, { method: "POST", body: JSON.stringify(compact(rest)) })
);

tool(
  "update_architecture_doc",
  "Update an architecture document's title or content.",
  { id: z.number(), title: z.string().optional(), content: z.string().optional() },
  ({ id, ...rest }) => callApi(`/api/architecture/${id}`, { method: "PATCH", body: JSON.stringify(compact(rest)) })
);

// --- Tests ---

tool("list_tests", "List tests of a project.", { project_id: z.number() }, ({ project_id }) =>
  callApi(`/api/projects/${project_id}/tests`)
);

tool(
  "create_test",
  "Create a test case, optionally linked to a requirement.",
  {
    project_id: z.number(),
    title: z.string(),
    description: z.string().optional(),
    steps: z.string().optional(),
    expected_result: z.string().optional(),
    status: testStatus.optional(),
    requirement_id: z.number().optional(),
  },
  ({ project_id, ...rest }) =>
    callApi(`/api/projects/${project_id}/tests`, { method: "POST", body: JSON.stringify(compact(rest)) })
);

tool(
  "update_test",
  "Update a test case. Pass requirement_id: null to unlink it from its requirement.",
  {
    id: z.number(),
    title: z.string().optional(),
    description: z.string().optional(),
    steps: z.string().optional(),
    expected_result: z.string().optional(),
    status: testStatus.optional(),
    requirement_id: z.union([z.number(), z.null()]).optional(),
  },
  ({ id, ...rest }) => callApi(`/api/tests/${id}`, { method: "PATCH", body: JSON.stringify(compact(rest)) })
);

// --- Worklog ---

tool(
  "list_worklog",
  "List worklog (session-handoff) entries of a project, newest first. Call at session start with limit 1 to see where the last session left off.",
  { project_id: z.number(), limit: z.number().optional() },
  ({ project_id, limit }) =>
    callApi(`/api/projects/${project_id}/worklog${limit ? `?limit=${limit}` : ""}`)
);

tool(
  "add_worklog_entry",
  "Append a session-handoff worklog entry (Markdown, 3-8 lines: what was done incl. requirement IDs, what's open, recommended next step). Append-only, no editing.",
  { project_id: z.number(), content: z.string() },
  ({ project_id, content }) =>
    callApi(`/api/projects/${project_id}/worklog`, { method: "POST", body: JSON.stringify({ content }) })
);

const transport = new StdioServerTransport();
await server.connect(transport);

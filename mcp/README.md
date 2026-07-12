# claude-project-hub-mcp

A thin [MCP](https://modelcontextprotocol.io/) server that exposes the Claude Project Hub REST API as typed tools, so Claude can read/write requirements, architecture docs, tests, and worklog entries without going through `curl` in a Bash tool call.

It does not talk to the database directly — every tool call forwards to the same REST API (`/api/*`) that the web UI uses. The Hub's Next.js dev server must be running (`npm run dev` in the repo root, default `http://localhost:3000`).

## Setup

```bash
cd mcp
npm install
npm run build
```

This produces `dist/index.js` (a stdio MCP server).

### Register with Claude Code

From the repo root:

```bash
claude mcp add claude-project-hub -- node mcp/dist/index.js
```

Or, if the Hub runs on a non-default port/host, set `HUB_BASE_URL`:

```bash
claude mcp add claude-project-hub --env HUB_BASE_URL=http://localhost:3000 -- node mcp/dist/index.js
```

Verify with `claude mcp list` / `/mcp` inside a Claude Code session. After adding, the tools below are available directly — no REST prompt boilerplate needed at session start.

## Tools

One tool per REST operation actually used in the Claude workflow (see root `CLAUDE.md`/session instructions). Destructive `DELETE` endpoints are intentionally **not** exposed as tools — deletions stay in the web UI, which asks for confirmation.

| Tool | REST equivalent |
|---|---|
| `list_projects` | `GET /api/projects` |
| `create_project` | `POST /api/projects` |
| `get_project_summary` | `GET /api/projects/:id/summary` |
| `list_epics` / `create_epic` / `update_epic` | `/api/projects/:id/epics`, `/api/epics/:id` |
| `list_requirements` / `create_requirement` / `create_requirements_batch` / `update_requirement` | `/api/projects/:id/requirements[/batch]`, `/api/requirements/:id` |
| `list_architecture` / `create_architecture_doc` / `update_architecture_doc` | `/api/projects/:id/architecture`, `/api/architecture/:id` |
| `list_tests` / `create_test` / `update_test` | `/api/projects/:id/tests`, `/api/tests/:id` |
| `list_worklog` / `add_worklog_entry` | `/api/projects/:id/worklog` |

Nullable foreign keys (`epic_id` on requirements, `requirement_id` on tests) follow the same convention as the REST API: omit the field to leave it unchanged, pass `null` to explicitly clear it.

`create_*`/`update_*` tools return the REST API's default lean response — `{ id, created_at?, updated_at? }`, not the full object — since the caller already knows the fields it just sent. The tools don't currently expose `?echo=full`; call the REST endpoint directly (see root README) for the rare case where the full row is needed.

`list_architecture` is lean by default too (no `content` field) — pass `expand: true` to get full content (forwards to `?expand=full`). `list_requirements`/`list_tests` don't expose an equivalent `expand` param yet; use the REST endpoint directly if the full row is needed there.

## Development

```bash
npm run dev   # tsc --watch
```

Re-run `claude mcp` registration (or restart the Claude Code session) after rebuilding, since the server is a compiled stdio binary, not hot-reloaded.

# Claude Project Hub

A small web app for managing **requirements**, **architecture documents**, and **tests** for your Claude projects — with a REST API that Claude (or any other tool) can read and write directly.

## Stack

- [Next.js 16](https://nextjs.org/) (App Router, TypeScript, Tailwind CSS)
- SQLite via [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3) (file: `data/hub.sqlite`, created automatically on first run)
- REST API under `/api/*`

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- npm (comes with Node.js)

### Install & run

```bash
git clone https://github.com/<your-username>/claude-project-hub.git
cd claude-project-hub
npm install
npm run dev
```

The app is now running at [http://localhost:3000](http://localhost:3000). The SQLite database is created automatically at `data/hub.sqlite` on first start — no extra setup required.

### Production build

```bash
npm run build
npm start
```

### Other scripts

```bash
npm run lint   # run ESLint
```

## Data model

- **Project** — name, description
- **Epic** — belongs to a project: name, `implemented` (checkbox to mark the whole epic as done, independent of its requirements' individual status). Used to group requirements.
- **Requirement** — belongs to a project, optionally to an epic: title, description, priority (`low|medium|high|critical`), status (`draft|approved|in_progress|done|rejected`), type (`requirement|bug`, defaults to `requirement`), `implemented` (checkbox, independent of status)
- **Comment** — belongs to a requirement: free text, timestamped
- **ArchitectureDoc** — belongs to a project: title, Markdown content (rendered; ` ```mermaid ` code blocks are additionally rendered as diagrams)
- **TestCase** — belongs to a project, optionally linked to a requirement: title, steps, expected result, status (`pending|pass|fail|blocked`)
- **WorklogEntry** — belongs to a project: Markdown content, timestamped, append-only (no editing). Session-handoff notes: Claude reads the latest entry at session start and writes a new one at session end, so the next session doesn't have to reconstruct context.

## MCP server (recommended for Claude Code)

Instead of Claude calling the REST API via `curl`/Bash on every turn, `mcp/` contains a small [MCP](https://modelcontextprotocol.io/) server that exposes the same operations as typed tools — one-time setup, no per-call shell overhead, no Windows/curl encoding issues. See [`mcp/README.md`](./mcp/README.md) for setup (`claude mcp add ...`). The REST API below still needs to run underneath it (`npm run dev`), and remains available directly for the web UI or non-Claude tools.

## Recommended workflow with Claude

The homepage (`/`) has a copyable "session-start prompt": paste it at the start of a Claude Code session in *any* other repo, and Claude will use this Hub throughout that session — orienting itself via the summary/worklog endpoints, filing a requirement before building a feature, keeping architecture docs in sync, and leaving a worklog entry at the end. This repo tracks itself the same way (project id 3 in a fresh instance); its own requirements/architecture/tests are a live example of the workflow, and its Coding Conventions doc includes a rule of thumb for keeping requirement descriptions short by referencing existing docs instead of restating them.

## REST API (for Claude or other tools)

All endpoints accept/return JSON.

### Response format for POST/PATCH

Mutating endpoints (`POST`/`PATCH`) return a lean body by default — `{ id, created_at?, updated_at? }` (only the fields the table actually has; append-only tables like `comments`/`worklog_entries` have no `updated_at`) — instead of echoing back fields the caller just sent. Append `?echo=full` to get the complete row (or array of rows, for the batch endpoint) instead, e.g. `POST /api/projects/1/requirements?echo=full`.

### Response format for GET lists

List endpoints (`requirements`, `tests`, `architecture`) omit long text fields (`description`/`steps`/`expected_result`/`content`) by default — the common case is browsing an overview, not reading every entry in full. Append `?expand=full` to get the complete rows instead, e.g. `GET /api/projects/1/requirements?expand=full`. Single-item `GET` endpoints (e.g. `/api/requirements/:id`) always return the full row regardless.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/projects` | List all projects |
| POST | `/api/projects` | Create a project `{ name, description? }` |
| GET/PATCH/DELETE | `/api/projects/:id` | Single project |
| GET | `/api/projects/:id/summary` | Aggregated project overview in one call: project info, epics with progress, requirement/test status counts, architecture doc titles (no content). Intended for Claude to quickly get oriented in a project. |
| GET | `/api/projects/:id/epics` | Epics of a project |
| POST | `/api/projects/:id/epics` | Create an epic `{ name, implemented? }` |
| GET/PATCH/DELETE | `/api/epics/:id` | Single epic (PATCH accepts `{ name?, implemented? }`). Deleting an epic keeps its requirements, only clears their `epic_id`. |
| GET | `/api/projects/:id/requirements` | Requirements of a project |
| POST | `/api/projects/:id/requirements` | Create a requirement `{ title, description?, priority?, status?, type?, implemented?, epic_id? }` (`type` is `requirement\|bug`, defaults to `requirement`) |
| POST | `/api/projects/:id/requirements/batch` | Create multiple requirements at once `{ items: [{ title, description?, priority?, status?, type?, implemented?, epic_id? }, ...] }`. All-or-nothing: if any item is invalid or the insert fails, nothing is persisted. Returns an array of created requirements. |
| GET/PATCH/DELETE | `/api/requirements/:id` | Single requirement (PATCH also accepts `{ implemented: 0\|1, epic_id: number\|null, type: "requirement"\|"bug" }`) |
| GET | `/api/requirements/:id/comments` | Comments of a requirement |
| POST | `/api/requirements/:id/comments` | Create a comment `{ content }` |
| DELETE | `/api/comments/:id` | Delete a comment |
| GET | `/api/projects/:id/architecture` | Architecture docs of a project |
| POST | `/api/projects/:id/architecture` | Create a doc `{ title, content? }` |
| GET/PATCH/DELETE | `/api/architecture/:id` | Single document |
| GET | `/api/projects/:id/worklog` | Worklog entries, newest first (`?limit=N`, default 5) |
| POST | `/api/projects/:id/worklog` | Create a worklog entry `{ content }` (append-only, no PATCH) |
| DELETE | `/api/worklog/:id` | Delete a worklog entry |
| GET | `/api/projects/:id/tests` | Tests of a project |
| POST | `/api/projects/:id/tests` | Create a test `{ title, description?, steps?, expected_result?, status?, requirement_id? }` |
| GET/PATCH/DELETE | `/api/tests/:id` | Single test |
| GET | `/api/projects/:id/export` | Full backup of a project as JSON (epics, requirements + comments, architecture docs, tests, worklog) — always returns every field, unaffected by the `?expand=full` convention above. |
| POST | `/api/projects/import` | Re-create a project from an export (new ID, old id-based relations remapped, timestamps preserved). All-or-nothing; `409` if a project with that name already exists. |

### Examples

```bash
# Create a project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project","description":"Short description"}'

# Create a requirement
curl -X POST http://localhost:3000/api/projects/1/requirements \
  -H "Content-Type: application/json" \
  -d '{"title":"Login flow","priority":"high"}'

# Create multiple requirements in one call
curl -X POST http://localhost:3000/api/projects/1/requirements/batch \
  -H "Content-Type: application/json" \
  -d '{"items":[{"title":"Login flow","priority":"high"},{"title":"Logout flow"}]}'

# Get a quick overview of a project (e.g. for Claude to orient itself)
curl http://localhost:3000/api/projects/1/summary

# Update an architecture document
curl -X PATCH http://localhost:3000/api/architecture/1 \
  -H "Content-Type: application/json" \
  -d '{"content":"New architecture text..."}'

# Create a bug report as a categorized requirement
curl -X POST http://localhost:3000/api/projects/1/requirements \
  -H "Content-Type: application/json" \
  -d '{"title":"Crash on empty title","type":"bug","priority":"critical"}'

# Get the full row back instead of the default lean { id, created_at, updated_at }
curl -X POST "http://localhost:3000/api/projects/1/requirements?echo=full" \
  -H "Content-Type: application/json" \
  -d '{"title":"Login flow","priority":"high"}'

# Get a requirement list with description included instead of the default lean fields
curl "http://localhost:3000/api/projects/1/requirements?expand=full"

# Back up a project, then restore it as a new project elsewhere
curl http://localhost:3000/api/projects/1/export > project-1-backup.json
curl -X POST http://localhost:3000/api/projects/import \
  -H "Content-Type: application/json" \
  --data-binary @project-1-backup.json
```

For Claude to access a running project, the dev server (`npm run dev`) needs to be running — Claude then simply calls the endpoints above over HTTP to read or update requirements, architecture, or tests.

## License

[MIT](./LICENSE)

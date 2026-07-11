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
- **Requirement** — belongs to a project, optionally to an epic: title, description, priority (`low|medium|high|critical`), status (`draft|approved|in_progress|done|rejected`), `implemented` (checkbox, independent of status)
- **Comment** — belongs to a requirement: free text, timestamped
- **ArchitectureDoc** — belongs to a project: title, Markdown content (rendered; ` ```mermaid ` code blocks are additionally rendered as diagrams)
- **TestCase** — belongs to a project, optionally linked to a requirement: title, steps, expected result, status (`pending|pass|fail|blocked`)

## REST API (for Claude or other tools)

All endpoints accept/return JSON.

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
| POST | `/api/projects/:id/requirements` | Create a requirement `{ title, description?, priority?, status?, implemented?, epic_id? }` |
| POST | `/api/projects/:id/requirements/batch` | Create multiple requirements at once `{ items: [{ title, description?, priority?, status?, implemented?, epic_id? }, ...] }`. All-or-nothing: if any item is invalid or the insert fails, nothing is persisted. Returns an array of created requirements. |
| GET/PATCH/DELETE | `/api/requirements/:id` | Single requirement (PATCH also accepts `{ implemented: 0\|1, epic_id: number\|null }`) |
| GET | `/api/requirements/:id/comments` | Comments of a requirement |
| POST | `/api/requirements/:id/comments` | Create a comment `{ content }` |
| DELETE | `/api/comments/:id` | Delete a comment |
| GET | `/api/projects/:id/architecture` | Architecture docs of a project |
| POST | `/api/projects/:id/architecture` | Create a doc `{ title, content? }` |
| GET/PATCH/DELETE | `/api/architecture/:id` | Single document |
| GET | `/api/projects/:id/tests` | Tests of a project |
| POST | `/api/projects/:id/tests` | Create a test `{ title, description?, steps?, expected_result?, status?, requirement_id? }` |
| GET/PATCH/DELETE | `/api/tests/:id` | Single test |

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
```

For Claude to access a running project, the dev server (`npm run dev`) needs to be running — Claude then simply calls the endpoints above over HTTP to read or update requirements, architecture, or tests.

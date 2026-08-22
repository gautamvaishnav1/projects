# Software World Backend — Implementation Plan (24h Hackathon MVP)

AI-powered "Software World": turn any GitHub JS/TS repository into a validated 3D-ready
architecture graph, then let users ask questions about it while an animated character walks
through the architecture. Backend only.

## 1. Golden Demo Flow (must work end-to-end)

```
GitHub repo URL
  → github.service      (repo info + tarball download/extract to temp dir)
  → file-scanner        (only .js/.jsx/.ts/.tsx; ignore junk dirs & files)
  → babel.parser        (source code → AST — Babel does ONLY this)
  → ast-analyzer.ts     (traverse AST → OUR OWN compact JSON per file)
  → metadata.builder    (merge per-file facts → compact ProjectMetadata JSON)
  → ai.architect        (LLM receives ONLY the compact JSON, never ASTs;
                         returns Architecture JSON)
  → architecture.validator (strict validation + normalization, stable IDs)
  → MongoDB (Analysis doc) → REST + Socket.IO → frontend (Three.js)
User asks question
  → chat.service        (component-ID-validated answer + graph path)
  → Socket.IO character:move / character:explain (semantic IDs only,
    coordinates/animation are frontend's job)
```

## 2. Structure — hybrid feature-based modular monolith

```
src/
├── server.ts / app.ts          # bootstrap + express assembly
├── config/env.ts               # typed, validated env vars
├── shared/                     # cross-cutting: errors, middleware, utils, types
├── infrastructure/
│   ├── database/               # mongoose connection
│   ├── github/                 # GitHub API client (fetch), tarball extraction
│   ├── llm/                    # OpenAI-compatible chat-completions client
│   └── realtime/               # io singleton + emit helpers
└── modules/
    ├── auth/         # register/login/me, bcrypt, JWT
    ├── projects/     # CRUD + ownership
    ├── repository/   # URL parsing, file scanning rules
    ├── parser/       # babel.parser, ast-analyzer, fallback-extractor, metadata.builder
    ├── analysis/     # models, pipeline orchestrator, architecture validator, endpoints
    ├── ai/           # architect prompt+validation, chat Q&A + graph pathfinding
    └── realtime/     # socket auth, rooms, analysis:* / character:* events
tests/              # vitest unit tests (no network/db needed for core logic)
```

## 3. Data contracts

**ProjectMetadata** (compact JSON sent to AI — NEVER the raw AST):
`project{name,repo,branch}, stats{files,parsed,failed,fallback,routes,...},
dependencies{}, devDependencies{}, files[{path,lines,role}],
imports[], exports[], functions[], classes[], routes[{method,path,handler,file}],
controllers[], services[], models[{name,file,fields[]}], authIndicators{}`

Route example produced by ast-analyzer from `router.post("/login", loginUser)`:
```json
{ "method": "POST", "path": "/login", "handler": "loginUser", "file": "src/routes/auth.routes.ts" }
```

**Architecture** (validated AI output):
```json
{
  "components": [ { "id": "auth-routes", "name": "Auth Routes", "type": "routes",
                    "description": "...", "files": ["src/routes/auth.routes.ts"] } ],
  "connections": [ { "from": "auth-routes", "to": "auth-controller", "label": "delegates to" } ]
}
```

**Chat response**:
```json
{ "answer": "...", "targetComponent": "auth",
  "path": ["frontend","auth","database"], "relatedComponents": ["frontend","auth","database"] }
```

## 4. Fault-tolerance strategy

1. Each file parsed independently in try/catch — one bad file never stops analysis.
2. Scanner ignores: node_modules, .git, dist, build, coverage, cache dirs, .next/.nuxt/out/vendor.
3. Skips generated/binary/minified/huge files (`.min.*`, `.d.ts`, `*.bundle.*`, NUL-byte check,
   >256 KB, absurdly long lines, max-file cap).
4. Per-file Babel failure → lightweight regex `fallback-extractor` still records imports/
   functions/routes so the file contributes signal.
5. AI output validated with zod; invalid/dangling connections dropped, IDs normalized to stable
   kebab-case; retry once; if LLM unavailable/invalid → deterministic heuristic architect keeps
   the demo alive offline.

## 5. API surface (v1)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/v1/auth/register | – | create user |
| POST | /api/v1/auth/login | – | JWT |
| GET  | /api/v1/auth/me | JWT | profile |
| POST | /api/v1/projects | JWT | create project (github url) |
| GET  | /api/v1/projects | JWT | list own projects |
| GET  | /api/v1/projects/:id | JWT | detail incl. latest analysis id |
| DELETE | /api/v1/projects/:id | JWT | delete (ownership enforced) |
| POST | /api/v1/projects/:id/analyze | JWT | run pipeline (async, socket events) |
| GET  | /api/v1/projects/:id/architecture | JWT | latest validated architecture |
| GET  | /api/v1/analyses/:id | JWT | full analysis (metadata+architecture) |
| GET  | /api/v1/analyses/:id/status | JWT | lightweight polling fallback |
| POST | /api/v1/projects/:id/chat | JWT | ask question about architecture |
| GET  | /health | – | liveness + db state |

## 6. Socket.IO contract

Rooms: `project:{projectId}`, join via `project:join` (JWT handshake + ownership check).

Server→client: `analysis:started`, `analysis:progress {step,current,total}`,
`analysis:completed`, `analysis:failed`, `character:move`, `character:explain`.
Client→server: `project:join`, `character:move {projectId,toComponentId}`,
`character:explain {projectId,path}`.

Backend sends **only semantic component IDs / paths**; the frontend owns coordinates,
camera and animation. After a successful chat the server also emits
`character:explain` with the returned path so the character can walk it.

## 7. Security & ops

bcrypt password hashing · JWT bearer auth on every private route · zod body/query validation ·
Helmet · CORS allow-list · global + strict rate limiting (auth & AI endpoints) · centralized
error middleware (no stack leaks in prod) · request logging with duration · env validation at
boot · health endpoint · ownership checks on every project-scoped resource.

Explicitly OUT of scope: microservices, k8s, billing, complex RBAC, websockets scaling adapters.

## 8. Build order (24h)

| Hour | Deliverable |
|---|---|
| H0–2 | Scaffold, config, shared layer, DB connect, health |
| H2–4 | Auth + Projects modules (JWT, bcrypt, ownership) |
| H4–7 | GitHub service + file scanner |
| H7–12 | Babel parser + ast-analyzer + fallback extractor + metadata builder (the core IP) |
| H12–15 | Analysis pipeline + architecture validator + Mongo persistence |
| H15–17 | AI architect (prompt, validation, heuristic fallback) |
| H17–19 | Chat service + graph pathfinding |
| H19–21 | Socket.IO realtime (analysis:* + character:*) |
| H21–23 | Tests, README, .env.example, API examples, hardening |
| H23–24 | End-to-end rehearsal against a real public repo |

## 9. Verification checklist

- `npm install && npm run dev` boots clean with zero env beyond PORT/MONGO_URI.
- `npm test` green: JS/TS parsing, route extraction (`POST /login → loginUser`),
  parser-failure fallback, scanner ignore rules, metadata build, architecture validation,
  chat pathfinding/component validation.
- Full demo works WITHOUT an LLM key (heuristic mode) and WITH one (OpenAI-compatible).
- One broken file in repo never fails the whole analysis.

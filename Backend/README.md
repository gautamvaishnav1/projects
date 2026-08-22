# Software World — Backend

AI-powered backend for **Software World**: point it at a public GitHub JS/TS repository and get back a **pre-laid-out 3D city** describing its architecture — districts, buildings, roads and all — plus an AI guide that answers questions like _"How does authentication work?"_ and walks an animated character through the semantic path on your frontend's map.

```
GitHub URL ──▶ GitHub service (tarball download/extract)
          ──▶ file scanner (.js/.jsx/.ts/.tsx only, junk ignored)
          ──▶ Babel parser   (source ➜ AST, nothing else)
          ──▶ ast-analyzer   (AST ➜ compact ProjectMetadata JSON)
          ──▶ AI architect   (LLM w/ strict JSON schema + deterministic fallback)
          ──▶ city builder   (architecture ➜ districts · positions · visuals · roads · diff)
          ──▶ MongoDB  ──▶ REST + Socket.IO ──▶ your 3D frontend
```

## Highlights

- 🏙️ **Zero-math frontend**: `/architecture` returns components with district, position, size and visual hints already computed — spawn the city directly in Three.js / React Three Fiber.
- 🤖 **LLM optional**: without any API key everything runs in deterministic heuristic mode (offline demo safe). Add any OpenAI-compatible key (`OpenAI`, `Groq`, `OpenRouter`, `Ollama`…) to upgrade quality.
- 🔐 **Full auth**: email/password + JWT, email OTP verification (with `devCode` fallback when SMTP is unset), Google & GitHub OAuth.
- 🛡️ **Hallucination guard**: every component id emitted by chat or socket events is validated against the stored architecture before it reaches the frontend.
- 🧪 **259 tests** across 24 files — pure-unit, mocked IO, no DB/network needed for core logic.
- 📡 **Realtime**: async analysis pipeline streams progress over Socket.IO with REST polling as fallback.

## Quick start

Prerequisites: **Node ≥ 18**, a running **MongoDB** (local or Atlas).

```bash
npm install
copy .env.example .env        # Windows  (Linux/macOS: cp .env.example .env)
npm run dev                   # http://localhost:5000
```

Health check:

```bash
curl http://localhost:5000/health
```

Notes:

- Only `MONGO_URI` usually needs attention; sensible defaults otherwise.
- `GITHUB_TOKEN` recommended — raises GitHub rate limit from ~60 to 5,000 req/h.
- No SMTP? OTP codes are printed to the console **and** returned as `devCode` in API responses (dev mode).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | tsx watch — hot-reload dev server |
| `npm run build` | type-safe production build to `dist/` |
| `npm start` | run the built server |
| `npm test` | vitest suite (259 tests, no DB/network required) |
| `npm run test:watch` | vitest in watch mode |
| `npm run typecheck` | strict TS check including tests |

## Environment variables

See [.env.example](.env.example) for the full annotated list.

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | HTTP port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/software-world` | database |
| `JWT_SECRET` | dev-only value | **change in production** |
| `CORS_ORIGINS` | `*` | comma-separated allowed origins |
| `GITHUB_TOKEN` | – | optional, avoids rate limits |
| `LLM_BASE_URL` / `LLM_API_KEY` / `LLM_MODEL` | OpenAI / empty / `gpt-5.6` | empty key ⇒ heuristic mode |
| `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET` | – | optional OAuth login |
| `SMTP_*`, `MAIL_FROM` | – | optional real OTP emails |

## Project structure

```
src/
├── server.ts / app.ts            # bootstrap + express assembly (helmet/cors/rate-limit/json)
├── config/env.ts                 # typed env config
├── shared/
│   ├── utils/                    # ApiError, JWT sign/verify, asyncHandler, logger
│   ├── middleware/               # requireAuth (JWT), zod validate(), rate limiters
│   └── errors/                   # centralized error handler (mongoose/zod/dup-key aware)
├── infrastructure/
│   ├── database/                 # mongoose connection
│   ├── github/                   # repo info + tarball download/extract
│   ├── llm/                      # OpenAI-compatible client + robust JSON extraction
│   ├── mailer/                   # nodemailer + dev-mode OTP fallback
│   └── realtime/                 # io singleton
└── modules/
    ├── auth/         # register/login/me · bcrypt · OTP issue/consume · OAuth
    ├── projects/     # CRUD + ownership checks
    ├── repository/   # GitHub URL parsing · file scanner
    ├── parser/       # babel.parser → ast-analyzer → fallback-extractor → metadata.builder
    ├── analysis/     # pipeline orchestrator · city persistence · endpoints
    ├── ai/           # architect (LLM+heuristic) · chat Q&A · graph pathfinding · city.builder
    └── realtime/     # socket.io JWT handshake · rooms · analysis:* / character:*
tests/              # 24 vitest files (unit + mocked services + fixture repo pipeline)
docs/               # API examples, workflow diagrams, sample payloads
scripts/            # local helper scripts (TRY_IT_LOCAL.ps1, db lister, route verifier)
JSON.md             # full request/response JSON reference for every endpoint
```

### The golden rule of this codebase

**Babel only converts source → AST.** All meaning is extracted by our own
`ast-analyzer.ts` into compact JSON (imports, exports, functions, classes, Express
routes, Mongoose models, auth indicators). Raw ASTs never leave the parser module;
the AI receives only trimmed metadata and must return strictly schema-validated JSON,
normalized to stable kebab-case ids with dangling connections dropped.

## REST API (v1)

| Method | Path | Auth | Body → Result |
|---|---|---|---|
| POST | `/api/v1/auth/register` | – | `{name?, email, password}` → user + JWT (+OTP) |
| POST | `/api/v1/auth/login` | – | `{email, password}` → user + JWT |
| POST | `/api/v1/auth/verify-otp` | – | `{email, code}` → verified |
| POST | `/api/v1/auth/resend-otp` | – | `{email, purpose?}` → new code (1/min) |
| POST | `/api/v1/auth/forgot-password` | – | `{email}` → reset code sent |
| POST | `/api/v1/auth/reset-password` | – | `{email, code, newPassword}` → user + JWT |
| GET/POST | `/api/v1/auth/google` | –/– | OAuth redirect / `{credential}` (ID token) |
| GET/POST | `/api/v1/auth/github` | –/– | OAuth redirect / `{code}` |
| GET | `/api/v1/auth/me` | JWT | current profile |
| POST | `/api/v1/projects` | JWT | `{name, description?, repoUrl}` |
| GET | `/api/v1/projects` | JWT | list own projects |
| GET / DELETE | `/api/v1/projects/:id` | JWT | detail / delete |
| POST | `/api/v1/projects/:id/analyze` | JWT | starts pipeline → `202 {analysisId, socketRoom}` |
| GET | `/api/v1/projects/:id/architecture` | JWT | latest completed **3D city world** |
| GET | `/api/v1/analyses/:id` | JWT | full analysis doc (metadata + architecture) |
| GET | `/api/v1/analyses/:id/status` | JWT | polling fallback |
| POST | `/api/v1/projects/:id/chat` | JWT | `{question}` → answer + target + path |

➡️ Complete request/response payloads for every endpoint: [JSON.md](JSON.md)

## The 3D city world

The architecture endpoint returns more than a graph — it returns a **city**:

- **Districts** cluster components by role (`frontend-district`, `backend-district`, `data-district`, `external-district`, `core-district`) with fixed slots and colors.
- **Buildings** (components) carry `position`, `size` (non-overlapping AABB), `buildingStyle`, glow colors, `importance` (1–10) and `complexity` (5–95) derived from real code metrics.
- **Roads** (connections) are typed — `http | storage | auth-flow | external-api | internal | dependency` — each with `weight` (20–95), traffic volume, protocol label and a curved 3-point path from source to target building.
- **Telemetry**: `analysis:completed` includes `stats.healthScore` (0–100) and `stats.bottlenecks` for city-health overlays.
- **Change tracking**: re-analyzes diff against the previous run (new/removed connections, affected components).

Coordinates, camera and animation belong entirely to the frontend — the backend sends semantic ids and hints only.

## Socket.IO

```javascript
const socket = io("http://localhost:5000", { auth: { token: "<jwt>" } });
socket.emit("project:join", { projectId }, (ack) => {/* {ok:true, room} */});
```

Server → client: `analysis:started`, `analysis:progress` (step + percent),
`analysis:completed` (stats incl. `healthScore`/`bottlenecks` + mini-map), `analysis:failed`.

Client → server:

```javascript
// NEW: multi-hop walk (invalid ids stripped server-side)
socket.emit("character:move",
  { projectId, path: ["frontend","auth-routes","auth-controller"], triggeredBy: "chat" },
  (ack) => console.log(ack)); // { ok:true, path:[...] }

// legacy single-hop still supported
socket.emit("character:move", { projectId, toComponentId: "frontend" });

socket.emit("character:explain", { projectId, path: ["frontend","user-model"] });
```

Broadcasts always carry the validated `path[]`, `triggeredBy` (`chat | user_click | telemetry`) and `requestedBy`.

## Fault tolerance

- Every file parses independently — one bad file never stops an analysis (regex fallback extractor records what Babel couldn't).
- Scanner skips `node_modules`, `.git`, `dist`, minified/`.d.ts`/generated/binary/oversized files.
- LLM failures degrade gracefully: schema validation → corrective retry → deterministic heuristic architect.
- Duplicate-key, cast and validation errors map to precise 4xx responses centrally.

## Tests

```bash
npm test          # 259 tests / 24 files
npm run typecheck # strict TS across src + tests
```

Coverage spans: shared utils (JWT round-trip/tampering, ApiError factories), all middleware (auth, zod validation, central error mapping), repo-URL parsing matrix, file-scanner rules on real temp dirs, Babel parsing per file type, metadata caps + auth-indicator detection, prompt budgets/truncation, architecture normalization edge cases, heuristic architect synthesis rules, chat service (heuristic + mocked LLM branches), LLM client JSON extraction + fetch stubbing, mailer modes, and the full OTP lifecycle against an in-memory model mock.

Live socket check against a running server (needs a registered user + analyzed project):

```bash
node tests/smoke-socket.mjs <projectId>
# verifies project:join acks, invalid-id rejection, ghost stripping on multi-hop moves
```

## Verified end-to-end (2026-08-22)

Against real repositories with zero LLM keys (heuristic mode):
`expressjs/express` → 141 files parsed, 400 routes, ~3.5 s;
`hagopj13/node-express-mongoose-boilerplate` → 45 components and the question
_"How does authentication work?"_ returned a validated walk through
`auth-routes → auth-middleware` with related components attached.

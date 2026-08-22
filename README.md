# 🏙 CodeCity AI

**CodeCity AI** turns any GitHub JavaScript/TypeScript repository into an interactive, animated **3D isometric city** — every file becomes a building, every dependency a road, every API route a glowing pipeline. Explore your architecture like a city, ask an AI architect questions about it, and watch a character walk through your codebase.

> Hackathon MVP built as a monorepo: 3D web frontend + AI analysis backend + standalone analyzer & auth microservices.

---

## ✨ Features

- 🔍 **Repo → City**: Clone/download any public GitHub repo and get a validated, 3D-ready CityJSON architecture graph
- 🧠 **AI Architect**: LLM-powered architecture reasoning (OpenAI-compatible APIs) with deterministic heuristic fallback when no key is set
- 💬 **AI Chat**: Ask questions about your architecture ("where is auth handled?") and get component-validated answers + graph paths
- 🌆 **3D World**: React Three Fiber scene with buildings, districts, neon roads, traffic particles, underground pipelines & ocean plane
- 🎮 **HUD & Controls**: Camera rig, command palette (`Ctrl+K`), building inspector, telemetry cards
- ⚡ **Realtime**: Socket.IO events for live analysis progress & character movement/explanations
- 🔐 **Auth**: Register/login with JWT, email OTP verification, Google & GitHub OAuth
- 🧪 **Tested**: Vitest unit test suite covering parser, auth, chat, city builder, middleware & more

---

## 🗂 Monorepo Structure

```
projects/
├── package.json            # Root runner — boots all services together
├── frontend/               # React 19 + Vite + Three.js 3D world (port 5173)
├── Backend/                # Express 5 + TS + Mongo + Socket.IO core API (port 5000)
├── analyzer/               # Standalone repo→CityJSON microservice (port 8787)
├── auth-server/            # Standalone JWT auth microservice (port 8788)
└── server-city.log         # Dev server log
```

### Package overview

| Package | Name | Stack | Port | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `frontend/` | `frontend` | React 19, Vite 8, Three.js / R3F, Tailwind CSS 4, Zustand, Motion, Lucide | 5173 | 3D isometric city UI, HUD, auth modal, command palette |
| `Backend/` | `software-world-backend` | Node ≥18, Express 5, TypeScript, Mongoose 9, Socket.IO, Zod, Helmet | 5000 | Full pipeline: GitHub fetch → AST parse → metadata → AI architect → REST + realtime |
| `analyzer/` | `codecity-analyzer` | Node ESM, Express, Babel parser/traverse, tar | 8787 | Lightweight `POST /api/analyze`: repo URL or local path → CityJSON |
| `auth-server/` | `codecity-auth` | Node ESM, Express, bcryptjs, jsonwebtoken, nodemailer | 8788 | File-backed users, OTP email verification, OAuth start/callback |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js ≥ 18**
- A **MongoDB** instance (local or Atlas) for the main backend
- *(Optional)* GitHub token, OpenAI-compatible API key, SMTP creds, OAuth apps — see `.env.example`

### 1. Install everything

```bash
# from the repo root
npm install                 # root dev tooling (concurrently)
npm run install:all         # installs deps in auth-server, analyzer & frontend
cd Backend && npm install   # backend has its own lockfile
```

### 2. Configure environment

```bash
cp Backend/.env.example Backend/.env
```

Key variables (see [`Backend/.env.example`](Backend/.env.example)):

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Backend port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/software-world` |
| `JWT_SECRET` | Long random string | – |
| `GITHUB_TOKEN` | Raises rate limit 60 → 5000/h | empty |
| `LLM_API_KEY` | Empty = deterministic heuristic mode (no external calls) | empty |
| `LLM_BASE_URL` / `LLM_MODEL` | Any OpenAI-compatible endpoint | OpenAI / `gpt-5.6` |
| `GOOGLE_*` / `GITHUB_*` | OAuth client credentials | empty |
| `SMTP_*` | OTP emails; empty = codes returned as `devCode` in dev | empty |

### 3. Run everything at once

```bash
npm run dev     # AUTH + ANALYZER + WEB via concurrently (color-coded logs)
npm start       # same, production mode
```

Or run each service individually:

```bash
# Terminal 1 — main backend (http://localhost:5000)
cd Backend && npm run dev

# Terminal 2 — analyzer (http://localhost:8787)
cd analyzer && npm run dev

# Terminal 3 — auth microservice (http://localhost:8788)
cd auth-server && npm run dev

# Terminal 4 — web (http://localhost:5173)
cd frontend && npm run dev
```

---

## 🔄 How It Works (Golden Demo Flow)

```
GitHub repo URL
  → github.service        # repo info + tarball download/extract
  → file-scanner          # only .js/.jsx/.ts/.tsx; junk dirs ignored
  → babel.parser          # source → AST (Babel only parses)
  → ast-analyzer          # AST → compact per-file JSON facts
  → metadata.builder      # merge into compact ProjectMetadata
  → ai.architect          # LLM gets ONLY compact JSON (never raw ASTs)
  → architecture.validator# strict validation + normalization, stable IDs
  → MongoDB Analysis doc  → REST + Socket.IO → frontend (Three.js)

User asks a question
  → chat.service          # component-ID-validated answer + graph path
  → Socket.IO character:* # move/explain events; animation stays frontend-side
```

---

## 📡 API Summary

Full inventory with sample bodies: [`Backend/docs/API_ENDPOINTS.json`](Backend/docs/API_ENDPOINTS.json) · workflow guide: [`Backend/docs/API_WORKFLOW.md`](Backend/docs/API_WORKFLOW.md)

### Main backend (`http://localhost:5000`) — 23 endpoints

| Group | Endpoints |
| :--- | :--- |
| Health | `GET /health` |
| Auth `/api/v1/auth/*` | register · verify-otp · resend-otp · login · forgot-password · reset-password · google/github OAuth start+callback |
| Projects `/api/v1/projects/*` | CRUD + ownership (JWT required) |
| Analysis `/api/v1/analysis/*` | start repo analysis, fetch architecture graph |
| AI `/api/v1/ai/*` | architect (repo → Architecture JSON), chat (Q&A + pathfinding) |
| Realtime | Socket.IO: `analysis:*`, `character:move`, `character:explain` |

### Analyzer (`http://localhost:8787`)

```bash
curl -X POST http://localhost:8787/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/owner/repo"}'
# → CityJSON { ...city, _meta: { source, stats } }
# also accepts {"localPath": "C:/path/to/repo"} · max 2 concurrent jobs
```

### Auth microservice (`http://localhost:8788`)

`POST /api/auth/register` · `login` · `verify-otp` · `resend-otp` · `GET /api/auth/me` · `GET /api/auth/oauth/:provider/start` (+ Google/GitHub callbacks). Users stored JSON-file backed in `data/users.json`; OTPs hashed (SHA-256), 10-min expiry.

---

## 🖥 Frontend Highlights

```
frontend/src/
├── three/           # CityScene, Buildings, Traffic, Connections,
│                    # Infrastructure, CameraRig (react-three-fiber)
├── components/      # AuthModal, CommandPalette (Ctrl+K), ui primitives & effects
├── pages/Landing.tsx
├── lib/             # city.ts, layout.ts, windows.ts, auth.ts helpers
├── store/useCity.ts # Zustand store
└── types.ts         # shared CityJSON types
```

- **Cyberpunk aesthetic**: glassmorphism HUD, neon glows, postprocessing effects
- `_legacy_src/` contains the earlier Redux Toolkit implementation kept for reference (documented in [`frontend/documentation.md`](frontend/documentation.md))

## 🧪 Backend Testing & Quality

```bash
cd Backend
npm run typecheck    # strict TS check
npm test             # vitest run (25+ suites, no network/db needed)
npm run build        # tsc → dist/
```

Covered areas: babel parsing, AST analyzer, fallback extractor, metadata/city builders, architecture schema validation, LLM client, prompts, chat service, graph pathfinding, auth (JWT/OTP/OAuth), mailer, middlewares (auth/error/validate/rate-limit), repo URL utils, file scanner.

## 🐳 Docker

A `Dockerfile` is provided for the backend:

```bash
cd Backend
docker build -t software-world-backend .
docker run --env-file .env -p 5000:5000 software-world-backend
```

---

## 📁 Key Docs

| Doc | Contents |
| :--- | :--- |
| [`Backend/IMPLEMENTATION_PLAN.md`](Backend/IMPLEMENTATION_PLAN.md) | Architecture decisions & data contracts |
| [`Backend/docs/API_ENDPOINTS.json`](Backend/docs/API_ENDPOINTS.json) | All 23 requests w/ bodies & statuses |
| [`Backend/docs/API_EXAMPLES.md`](Backend/docs/API_EXAMPLES.md) | cURL walkthroughs |
| [`Backend/docs/EXAMPLE_FULLSTACK_ARCHITECTURE.json`](Backend/docs/EXAMPLE_FULLSTACK_ARCHITECTURE.json) | Sample Architecture JSON output |
| [`frontend/documentation.md`](frontend/documentation.md) | Legacy frontend architecture reference |

---

## 🤝 Contributing

1. Fork & branch: `git checkout -b feat/my-feature`
2. Commit with clear messages
3. Run `npm run typecheck && npm test` in `Backend/` and `npm run lint` in `frontend/` before opening a PR

## 📄 License

MIT © CodeCity AI team

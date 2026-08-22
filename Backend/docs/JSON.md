# JSON Contract — Frontend Integration Guide

Base URL: `http://localhost:5000`
All responses use: `{ "success": true|false, ... }` · private routes need header
`Authorization: Bearer <JWT>`

---

## 1. Auth

### Flow overview
- **Manual signup:** `register` → OTP emailed (`devCode` returned when SMTP not configured) → `verify-otp` → JWT.
- **Login:** only verified accounts; unverified logins get `403 needsVerification:true` and a fresh code is auto-sent.
- **Forgot password:** `forgot-password` → OTP → `reset-password`.
- **OAuth:** Google (ID-token POST or redirect flow) and GitHub (redirect flow or code POST).
- OTPs are hashed (SHA-256) in MongoDB (`otps` collection), expire in 10 min, max 5 wrong
  attempts, resend cooldown 60 s. All inputs zod-validated.

### POST `/api/v1/auth/register`
```json { "name": "Demo", "email": "demo@example.com", "password": "supersecret123" }
```
Password rules: min 8 chars, at least one letter AND one number.
Response `201`:
```json
{ "success": true,
  "message": "Verification code sent to demo@example.com. It expires in 10 minutes.",
  "devCode": "166539" }   // ONLY present when SMTP_HOST is not configured (dev mode)
```
Errors: `409` if already verified account exists · `400` validation.

### POST `/api/v1/auth/verify-otp`
```json { "email": "demo@example.com", "code": "166539" }   // exactly 6 digits
```
Response `200`: `{ "success": true, "data": { "user": {...}, "token": "eyJ..." } }`
Errors: `400` wrong code (with attempts left) / expired / no active code.

### POST `/api/v1/auth/resend-otp`
```json { "email": "demo@example.com", "purpose": "register" }   // purpose optional, default register
```
Response `200`: `{ "success": true, "message": "New verification code sent...", "devCode"? }`
Errors: `429` within 60s cooldown · `400` already verified · `404` unknown email.

### POST `/api/v1/auth/login`
```json { "email": "demo@example.com", "password": "supersecret123" }
```
Response `200`: `{ "success": true, "data": { "user": {...}, "token": "eyJ..." } }`
Response `403` (unverified):
```json
{ "success": false,
  "message": "Please verify your email first — we sent you a fresh code.",
  "details": { "needsVerification": true, "email": "demo@example.com", "devCode": "308977" } }
```

### POST `/api/v1/auth/forgot-password`
```json { "email": "demo@example.com" }
```
Response `200` (same answer whether or not the account exists — anti-enumeration):
```json
{ "success": true, "message": "If that account exists, a reset code has been sent.", "devCode"? }
```

### POST `/api/v1/auth/reset-password`
```json { "email": "demo@example.com", "code": "308977", "newPassword": "newpass9x" }
```
Response `200`: `{ "success": true, "data": { "message": "Password updated. You can now log in." } }`

### OAuth — Google

Option A (SPA button): load Google Identity Services, then
`POST /api/v1/auth/google` with `{ "credential": "<GOOGLE_ID_TOKEN>" }`
→ Response `200`: `{ "success": true, "data": { "user": {...}, "token": "<APP_JWT>" } }`

Option B (redirect flow): point the browser at
`GET /api/v1/auth/google` → consent → callback redirects to
`${FRONTEND_URL}/auth/success?token=<APP_JWT>&email=...&name=...`
(failure → `${FRONTEND_URL}/auth?error=<message>`).

Setup: set `GOOGLE_CLIENT_ID` (+ secret for option B) in `.env`; redirect URI
`http://localhost:5000/api/v1/auth/google/callback`. Unset → clear config error.

### OAuth — GitHub

Redirect flow: browser → `GET /api/v1/auth/github` → consent → callback → same
`/auth/success?token=...` redirect as above.
SPA flow: capture `?code=` yourself then `POST /api/v1/auth/github` with `{ "code": "..." }`.

Setup: create app at https://github.com/settings/developers, set `GITHUB_CLIENT_ID/SECRET`,
callback `http://localhost:5000/api/v1/auth/github/callback`.

OAuth users are created `isVerified: true`, `provider: "google"|"github"`; logging in via
OAuth with the email of an existing local account links them automatically.

### User object shape (everywhere)
```json
{ "id": "...", "email": "...", "name": "...", "provider": "local|google|github",
  "avatarUrl": null, "isVerified": true }
```

### GET `/api/v1/auth/me`
Response `200`:
```json
{ "success": true, "data": { "user": { "id": "...", "email": "...", "name": "..." } } }
```

---

## 2. Projects (posting a GitHub repository URL)

### POST `/api/v1/projects`   ← **this is where you submit the GitHub repo URL**
Headers: `Authorization: Bearer <token>`
Request body:
```json
{
  "name": "My Repo",
  "description": "optional text",
  "repoUrl": "https://github.com/hagopj13/node-express-mongoose-boilerplate"
}
```
Accepted URL forms: `https://github.com/owner/repo`, `…/owner/repo.git`,
`git@github.com:owner/repo.git`, `https://github.com/owner/repo/tree/branch`.
Response `201`:
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "6a89a1b6ed27e14152cf46ee",
      "name": "My Repo",
      "description": "",
      "repoUrl": "https://github.com/hagopj13/node-express-mongoose-boilerplate",
      "lastAnalysisId": null,
      "createdAt": "2026-08-22T13:18:46.891Z"
    }
  }
}
```
Errors: `409` duplicate URL for your account, `400` not a GitHub URL.

### GET `/api/v1/projects`
Response `200`:
```json
{ "success": true, "data": { "projects": [ { "_id": "...", "name": "...", "repoUrl": "...", "lastAnalysis": null, "createdAt": "..." } ] } }
```

### GET `/api/v1/projects/:id`
Response `200`:
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "...", "name": "...", "description": "", "repoUrl": "...",
      "lastAnalysisId": "6a89a070ed27e14152cf46ed or null",
      "createdAt": "...", "updatedAt": "..."
    }
  }
}
```

### DELETE `/api/v1/projects/:id`
Response `200`: `{ "success": true, "message": "Project deleted" }`

---

## 3. Analysis pipeline (GitHub URL → architecture)

### POST `/api/v1/projects/:id/analyze`
No body. Response `202` (returns instantly; progress streams over Socket.IO):
```json
{
  "success": true,
  "message": "Analysis started",
  "data": {
    "analysisId": "6a89a070ed27e14152cf46ed",
    "projectId": "6a89a019ed27e14152cf46ec",
    "socketRoom": "project:6a89a019ed27e14152cf46ec"
  }
}
```
`409` if an analysis is already running for this project.

### GET `/api/v1/analyses/:analysisId/status` (polling fallback)
```json
{ "success": true, "data": { "id": "...", "status": "running|completed|failed", "durationMs": null, "error": null } }
```

### GET `/api/v1/projects/:id/architecture`  ← **the main payload for the 3D frontend**
Response `200`:
```json
{
  "success": true,
  "data": {
    "analysisId": "6a89a1d5ed27e14152cf46ef",
    "repoInfo": { "fullName": "hagopj13/node-express-mongoose-boilerplate", "defaultBranch": "master", "primaryLanguage": "JavaScript", "stars": 4900 },
    "stats": { "filesConsidered": 60, "filesParsedBabel": 59, "filesFallback": 1, "totalRoutes": 25, "totalModels": 6, "aiEngine": "llm" },
    "architecture": {
      "components": [
        {
          "id": "auth-routes",
          "name": "Auth Routes",
          "type": "routes",
          "description": "HTTP endpoints for authentication.",
          "files": ["src/routes/auth.routes.ts"]
        },
        { "id": "user-model", "name": "User Model", "type": "model", "description": "...", "files": ["src/models/user.model.ts"] }
      ],
      "connections": [
        { "from": "auth-routes", "to": "auth-controller", "label": "delegates to" },
        { "from": "user-model", "to": "mongodb-database", "label": "persists to" }
      ]
    }
  }
}
```
Rules the frontend can rely on:
- `components[].type` ∈ `frontend | routes | controller | service | model | database | middleware | auth | integration | config | external | other`
- `id`s are stable kebab-case slugs, unique within one analysis
- every `connection.from/to` always references an existing component `id`

### GET `/api/v1/analyses/:id` (full detail)
Same as architecture plus `metadata` (compact code facts: routes, models, functions…) and
`failures[]` ({file,error,strategy} for files that needed fallback). No raw ASTs ever.

---

## 4. AI Chat

### POST `/api/v1/projects/:id/chat`
Request body:
```json
{ "question": "How does authentication work?" }
```
Response `200`:
```json
{
  "success": true,
  "data": {
    "answer": "Authentication starts at auth-routes which delegate to the auth controller...",
    "targetComponent": "auth-middleware",
    "path": ["frontend", "app-routes", "auth-middleware"],
    "relatedComponents": ["app-routes", "auth-routes", "user-model"]
  }
}
```
`targetComponent` may be `null`; every id in `path` / `relatedComponents` is guaranteed to
exist in that project's latest stored architecture. A successful chat also emits
`character:explain` on the project's socket room.

---

## 5. Socket.IO (port 5000, same server)

Connect:
```js
import { io } from "socket.io-client";
const socket = io("http://localhost:5000", { auth: { token: "<JWT>" } });
socket.emit("project:join", { projectId }, (ack) => console.log(ack)); // { ok:true, room:"project:<id>" }
```

Server → client events (payloads):

```jsonc
// analysis:started
{ "analysisId": "...", "projectId": "...", "repoUrl": "https://github.com/..." }

// analysis:progress
{ "analysisId": "...", "projectId": "...", "step": "github|scan|parse|ai|save", "percent": 42, "current": 30, "total": 60, "message": "Parsing files 30/60" }

// analysis:completed
{ "analysisId": "...", "projectId": "...",
  "stats": { "filesConsidered": 141, "filesParsedBabel": 141, "filesFallback": 0, "routes": 400, "models": 0, "durationMs": 3521 },
  "architecture": { "componentCount": 20, "connectionCount": 18, "components": [ { "id": "frontend", "name": "Frontend App", "type": "frontend" } ] },
  "engine": "llm" }

// analysis:failed
{ "analysisId": "...", "projectId": "...", "error": "GitHub repository not found (or private without a token)" }

// character:move  (semantic ids ONLY — frontend computes coordinates/animation)
{ "projectId": "...", "fromComponentId": null, "toComponentId": "auth-routes", "requestedBy": "<userId>" }

// character:explain (emitted after chat answers too)
{ "projectId": "...", "path": ["frontend", "app-routes", "auth-middleware"], "targetComponent": "auth-middleware", "question": "How does authentication work?" }
```

Client → server:
```js
socket.emit("character:move",   { projectId, fromComponentId: null, toComponentId: "auth-routes" });
socket.emit("character:explain",{ projectId, path: ["frontend","auth-routes"] });
// ack: { ok:true } | { ok:false, error:"Forbidden"|"Unknown component \"x\" ..." }
```

---

## 6. Error format (all endpoints)

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [{ "field": "email", "message": "Must be a valid email" }]
}
```

| Status | Meaning |
|---|---|
| 400 | validation / malformed JSON |
| 401 | missing/expired JWT |
| 403 | resource belongs to another user |
| 404 | unknown route/project/analysis |
| 409 | duplicate email/project URL, or analysis already running |
| 422 | AI output failed validation (auto-retried/fallback first) |
| 429 | rate limit |
| 502 | GitHub or LLM upstream failure |

## 7. Health

`GET /health` → `{ "success": true, "status": "ok", "db": "connected", "uptimeSeconds": 123 }`

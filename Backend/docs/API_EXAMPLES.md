# API Examples (curl + socket.io-client)

Base URL: `http://localhost:5000`
All private routes need: `-H "Authorization: Bearer <TOKEN>"`

## 1. Register / Login

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Demo","email":"demo@example.com","password":"supersecret123"}'

curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"supersecret123"}'
# -> { "success": true, "data": { "user": {...}, "token": "eyJhbGci..." } }
```

```bash
TOKEN=eyJhbGci...   # from login response
```

## 2. Create a project

```bash
curl -X POST http://localhost:5000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Express Demo","description":"hackathon demo repo","repoUrl":"https://github.com/expressjs/express"}'
# -> { "data": { "project": { "id": "66f...", ... } } }
PROJECT_ID=66f...
```

List / detail:

```bash
curl http://localhost:5000/api/v1/projects -H "Authorization: Bearer $TOKEN"
curl http://localhost:5000/api/v1/projects/$PROJECT_ID -H "Authorization: Bearer $TOKEN"
```

## 3. Analyze the repository (async + Socket.IO progress)

```bash
curl -X POST http://localhost:5000/api/v1/projects/$PROJECT_ID/analyze \
  -H "Authorization: Bearer $TOKEN"
# 202 -> { "data": { "analysisId": "670...", "socketRoom": "project:<projectId>" } }
ANALYSIS_ID=670...
```

Watch it live:

```js
import { io } from "socket.io-client";
const socket = io("http://localhost:5000", { auth: { token } });

socket.emit("project:join", { projectId }, (res) => console.log("joined", res));

["analysis:started","analysis:progress","analysis:completed","analysis:failed"]
  .forEach(ev => socket.on(ev, p => console.log(ev, p)));

// character events (semantic ids only — frontend maps them to 3D coordinates)
socket.on("character:move",   p => console.log("move to", p.toComponentId));
socket.on("character:explain",p => console.log("explain walk", p.path));

// ask the server to walk the character somewhere
socket.emit("character:move", { projectId, fromComponentId:"frontend", toComponentId:"auth-routes" });
```

Poll instead of sockets (fallback):

```bash
curl http://localhost:5000/api/v1/analyses/$ANALYSIS_ID/status -H "Authorization: Bearer $TOKEN"
```

## 4. Get the validated architecture

```bash
curl http://localhost:5000/api/v1/projects/$PROJECT_ID/architecture -H "Authorization: Bearer $TOKEN"
```

```json
{
  "success": true,
  "data": {
    "analysisId": "670...",
    "architecture": {
      "components": [
        { "id": "auth-routes", "name": "Auth Routes", "type": "routes",
          "description": "...", "files": ["src/routes/auth.routes.ts"] }
      ],
      "connections": [
        { "from": "auth-routes", "to": "auth-controller", "label": "delegates to" }
      ]
    }
  }
}
```

Full analysis incl. compact ProjectMetadata (no ASTs):

```bash
curl http://localhost:5000/api/v1/analyses/$ANALYSIS_ID -H "Authorization: Bearer $TOKEN"
```

## 5. Ask the AI about the architecture

```bash
curl -X POST http://localhost:5000/api/v1/projects/$PROJECT_ID/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"question":"How does authentication work?"}'
```

```json
{
  "success": true,
  "data": {
    "answer": "Authentication starts at auth-routes, which delegate to the auth controller...",
    "targetComponent": "auth-routes",
    "path": ["frontend", "auth-routes", "auth-controller", "user-model"],
    "relatedComponents": ["auth-controller", "user-model", "mongodb-database"]
  }
}
```

Every emitted component id is validated against the stored architecture — a successful chat
also emits `character:explain` to the project room so the character walks the returned path.

## 6. Health

```bash
curl http://localhost:5000/health
```

## Error shape

```json
{ "success": false, "message": "Validation failed", "details": [{ "field": "email", "message": "Must be a valid email" }] }
```

| Status | Meaning |
|---|---|
| 400 | validation error |
| 401 | missing/expired JWT |
| 403 | not your resource |
| 404 | unknown route/resource |
| 409 | duplicate (email, project URL) or analysis already running |
| 422 | AI output failed strict validation |
| 429 | rate limited |
| 502 | GitHub or LLM upstream failure |

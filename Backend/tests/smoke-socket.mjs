import { io } from "socket.io-client";

const BASE = "http://localhost:5000";
const PROJECT_ID = process.argv[2];

const login = await fetch(`${BASE}/api/v1/auth/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "demo@example.com", password: "supersecret123" })
}).then((r) => r.json());
const token = login.data.token;

const socket = io(BASE, { auth: { token } });

const received = [];
socket.on("character:move", (p) => {
  received.push({ event: "character:move", ...p });
});
socket.on("character:explain", (p) => {
  received.push({ event: "character:explain", ...p });
});

const emitAck = (event, payload) =>
  new Promise((resolve) => {
    socket.timeout(5000).emit(event, payload, (err, res) => resolve({ err: err?.message, res }));
  });

await new Promise((r) => socket.on("connect", r));
console.log("CONNECTED as", login.data.user.email);

const join = await emitAck("project:join", { projectId: PROJECT_ID });
console.log("JOIN:", JSON.stringify(join.res));

// 1. valid single-hop move (legacy shape) -> broadcast keeps toComponentId compat
await emitAck("character:move", { projectId: PROJECT_ID, toComponentId: "frontend" });
await new Promise((r) => setTimeout(r, 300));

// 2. invalid move -> server must reject with no-valid-ids error
const bad = await emitAck("character:move", { projectId: PROJECT_ID, toComponentId: "not-a-real-component" });
console.log("INVALID MOVE ACK:", JSON.stringify(bad.res));

// 3. explain walk with one invalid id mixed in -> only valid ids relayed
const explain = await emitAck("character:explain", {
  projectId: PROJECT_ID,
  path: ["frontend", "ghost-id", "server-app"]
});
console.log("EXPLAIN ACK:", JSON.stringify(explain.res));
await new Promise((r) => setTimeout(r, 300));

// 4. NEW: multi-hop move with a hallucinated id -> ghost stripped, path relayed
const multi = await emitAck("character:move", {
  projectId: PROJECT_ID,
  path: ["frontend", "ghost-id", "server-app"],
  triggeredBy: "chat"
});
console.log("MULTI-HOP MOVE ACK:", JSON.stringify(multi.res));
await new Promise((r) => setTimeout(r, 300));

console.log("BROADCASTS RECEIVED:", JSON.stringify(received, null, 1));

const ok =
  join.res?.ok === true &&
  bad.res?.ok === false &&
  explain.res?.ok === true &&
  explain.res.path.join(",") === "frontend,server-app" &&
  multi.res?.ok === true &&
  multi.res.path.join(",") === "frontend,server-app" &&
  received.some((r) => r.event === "character:move" && r.toComponentId === "frontend") &&
  received.some(
    (r) =>
      r.event === "character:move" &&
      Array.isArray(r.path) &&
      r.path.join(",") === "frontend,server-app" &&
      r.triggeredBy === "chat"
  ) &&
  received.some((r) => r.event === "character:explain" && r.path.join(",") === "frontend,server-app");

console.log(ok ? "SOCKET SMOKE TEST: PASS" : "SOCKET SMOKE TEST: FAIL");
process.exit(ok ? 0 : 1);

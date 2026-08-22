import { analyzeRepo } from "../src/city.js";

const dir = process.argv[2] || "C:\\Users\\rahul\\AppData\\Local\\Temp\\opencode\\fixture-mern";
const { city, stats } = await analyzeRepo(dir, "Fixture Shop");

console.log("=== STATS ===");
console.log(JSON.stringify(stats));

console.log("\n=== PROJECT ===");
console.log(city.project.stack);

console.log("\n=== DISTRICTS ===");
for (const d of city.districts) {
  console.log(`[${d.stack}] ${d.name} (${d.id})`);
  for (const b of d.buildings) {
    console.log(`   ${b.kind.padEnd(10)} ${b.name.padEnd(22)} ${String(b.loc).padStart(4)} loc  [${b.health}] fns:${b.functions.length}`);
  }
}

console.log("\n=== EDGES ===");
const label = (id) => id;
for (const e of city.edges) console.log(`${e.kind.padEnd(7)} ${label(e.from)} -> ${e.to}`);

console.log("\n=== FLOWS ===");
for (const [k, v] of Object.entries(city.flows)) console.log(`${k}: ${v.join(" → ")}`);

// ── contract assertions ──
let fails = 0;
const need = (cond, msg) => { if (!cond) { console.error("❌ " + msg); fails++; } };
const KINDS = new Set(["page", "component", "context", "route", "controller", "service", "middleware", "model", "api"]);
const STACKS = new Set(["frontend", "backend", "database", "external"]);

need(city.districts.length >= 5, "expected ≥5 districts");
need(city.edges.some((e) => e.kind === "import"), "expected import edges");
need(city.edges.some((e) => e.kind === "query"), "expected query edges (imports of models)");
need(city.edges.some((e) => e.kind === "http"), "expected http edges (fetch→routes)");
need(city.edges.some((e) => e.to.startsWith("ext-")), "expected external SDK building");
need(Object.keys(city.flows).length >= 2, "expected ≥2 auto-detected flows");

for (const d of city.districts) {
  need(STACKS.has(d.stack), `bad stack ${d.stack}`);
  need(d.buildings.length > 0, `empty district ${d.id}`);
  for (const b of d.buildings) {
    need(KINDS.has(b.kind), `bad kind ${b.kind} on ${b.id}`);
    need(typeof b.loc === "number", "loc missing");
    need(["ok", "warn", "error"].includes(b.health), `bad health ${b.health}`);
    need(Array.isArray(b.functions), "functions array missing");
  }
}

// login flow should traverse page → route → controller/service → model
const login = city.flows["login"];
if (login) {
  const kinds = login.map((id) => {
    for (const d of city.districts) { const b = d.buildings.find((x) => x.id === id); if (b) return b; }
    return {};
  });
  need(kinds.some((b) => b.kind === "route"), "login flow misses route");
  need(kinds.some((b) => b.kind === "controller" || b.kind === "service"), "login flow misses controller/service");
  need(kinds.some((b) => b.kind === "model"), "login flow misses model");
} else {
  need(false, "no login flow detected");
}

console.log(fails === 0 ? "\nCONTRACT OK ✅" : `\nCONTRACT FAILURES: ${fails}`);
process.exit(fails ? 1 : 0);

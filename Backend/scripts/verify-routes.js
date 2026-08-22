const fs = require("fs");

// Extract routes exactly as Express registers them
function routesFrom(file, mount) {
  const src = fs.readFileSync(file, "utf8");
  const out = [];
  for (const m of src.matchAll(/router\.(get|post|delete)\("([^"]*)"/g)) {
    out.push({ method: m[1].toUpperCase(), path: mount + m[2] });
  }
  return out;
}

const all = [
  ...routesFrom("src/modules/auth/auth.routes.ts", "/api/v1/auth"),
  ...routesFrom("src/modules/projects/project.routes.ts", "/api/v1/projects"),
  ...routesFrom("src/modules/analysis/analysis.routes.ts", "/api/v1"),
  ...routesFrom("src/modules/ai/ai.routes.ts", "/api/v1"),
  { method: "GET", path: "/health" }
];

all.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method));
console.log("TOTAL REGISTERED ROUTES:", all.length);
for (const r of all) console.log(`${r.method.padEnd(6)} ${r.path}`);

// Cross-check against the JSON doc handed to frontend
const doc = JSON.parse(fs.readFileSync("docs/API_ENDPOINTS.json", "utf8"));
const documented = [];
for (const [group, list] of Object.entries(doc.groups)) {
  for (const e of list) documented.push({ group, name: e.name, method: e.method, path: e.path });
}
console.log("\nDOCUMENTED IN docs/API_ENDPOINTS.json:", documented.length);

const key = (r) =>
  `${r.method} ${r.path.replace(/:projectId|:analysisId/, ":id").replace(/\/+$/, "") || "/"}`;
const regSet = new Set(all.map(key).map((k) => k.replace(/:(?!\d)\w+/g, ":x")));
const docSet = new Set(
  documented.map((d) => `${d.method} ${d.path.replace(/:(?!\d)\w+/g, ":x").replace(/\/+$/, "") || "/"}`)
);

const missing = [...regSet].filter((r) => !docSet.has(r));
const extra = [...docSet].filter((r) => !regSet.has(r));
console.log("\nMATCH:", missing.length === 0 && extra.length === 0 ? "PERFECT ✔ (every registered route is documented)" : "MISMATCH");
if (missing.length) console.log("Undocumented:", missing);
if (extra.length) console.log("Extra in doc:", extra);

import { readFile } from "node:fs/promises";
import path from "node:path";
import { walkCode } from "./walk.js";
import { extractFacts } from "./extract.js";
import { classify, districtFor, slug } from "./classify.js";

const EXT_CANDIDATES = ["", ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs"];
const STACK_ORDER = { frontend: 0, backend: 1, database: 2, external: 3 };

function norm(p) {
  return p.replace(/\\/g, "/").replace(/^\.\//, "").toLowerCase();
}

export async function analyzeRepo(dir, projectName) {
  const files = await walkCode(dir);
  const records = [];

  for (const f of files) {
    let code = "";
    try {
      code = await readFile(f.abs, "utf8");
    } catch {
      continue;
    }
    const facts = extractFacts(code);
    const loc = code.split("\n").length;
    const { stack, kind } = classify(f.rel, facts);
    records.push({ rel: norm(f.rel), abs: f.abs, facts, loc, stack, kind });
  }

  // ── buildings ──
  const usedIds = new Set();
  const buildings = records.map((r) => {
    const baseName = path.posix.basename(r.rel);
    let id = slug(r.rel.replace(/\.[^.]+$/, "")) || slug(baseName);
    while (usedIds.has(id)) id += "-x";
    usedIds.add(id);
    r.id = id;

    let health = "ok";
    if (r.facts.parseError) health = "warn";
    if (r.loc > 380) health = "error";
    else if (r.loc > 220) health = "warn";

    return {
      id,
      name: baseName,
      kind: r.kind,
      loc: r.loc,
      health,
      functions: r.facts.functions.slice(0, 12),
      relPath: r.rel,
      stack: r.stack,
    };
  });
  const byId = new Map(buildings.map((b) => [b.id, b]));
  const byRel = new Map(records.map((r) => [r.rel, r]));

  // ── import-resolution index (extensionless candidates → record) ──
  const resolveIndex = new Map();
  for (const r of records) {
    const noExt = r.rel.replace(/\.[^.]+$/, "");
    for (const cand of [
      r.rel,
      noExt,
      ...EXT_CANDIDATES.slice(1).map((e) => noExt + e),
      ...["/index.js", "/index.jsx", "/index.ts", "/index.tsx"].map((e) => noExt + e),
    ]) {
      if (!resolveIndex.has(norm(cand))) resolveIndex.set(norm(cand), r);
    }
  }
  function resolveImport(fromRel, source) {
    if (!source || !source.startsWith(".")) return null;
    const joined = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), source));
    return resolveIndex.get(norm(joined)) ?? null;
  }

  // ── edges ──
  const edgeKey = new Set();
  const edges = [];
  const addEdge = (from, to, kind) => {
    if (!from || !to || from === to) return;
    const key = `${from}|${to}`;
    if (edgeKey.has(key)) return;
    edgeKey.add(key);
    edges.push({ from, to, kind });
  };

  // import edges (+ model targets upgraded to query)
  for (const r of records) {
    for (const imp of r.facts.imports) {
      const target = resolveImport(r.rel, imp.source);
      if (!target) continue;
      const kind = target.kind === "model" ? "query" : "import";
      addEdge(r.id, target.id, kind);
    }
  }

  // effective backend routes (mount-aware): server mounts routers at prefixes
  const routeIndex = []; // {buildingId, path}
  for (const r of records) {
    if (r.stack !== "backend") continue;
    for (const rt of r.facts.routes) routeIndex.push({ buildingId: r.id, path: rt.path });
    for (const m of r.facts.mounts) {
      // find which file exports localName
      const imp = r.facts.imports.find((i) => i.names.includes(m.localName));
      const target = imp ? resolveImport(r.rel, imp.source) : null;
      if (!target || target.stack === "frontend") continue;
      for (const rt of target.facts.routes) {
        routeIndex.push({ buildingId: target.id, path: joinPaths(m.prefix, rt.path) });
      }
    }
  }

  // http edges: frontend httpCalls matched against route paths
  const segsOf = (p) => p.split("?")[0].split("/").filter(Boolean);
  function matchRoute(callUrl) {
    const raw = callUrl.startsWith("http") ? safeUrlPathname(callUrl) : callUrl.split("?")[0];
    if (!raw) return null;
    // compare FULL segment lists — mount prefixes are already folded into route paths
    const cs = segsOf(raw);
    for (const r of routeIndex) {
      const rs = segsOf(r.path);
      if (rs.length !== cs.length) continue;
      const ok = rs.every((seg, i) => seg.startsWith(":") || seg === cs[i]);
      if (ok) return r;
    }
    return null;
  }

  for (const r of records) {
    if (r.stack === "database" && r.kind === "model") continue;
    for (const url of r.facts.httpCalls) {
      const hit = matchRoute(url);
      if (hit) addEdge(r.id, hit.buildingId, "http");
    }
    // SDK usage → external service buildings
    for (const sdkLabel of r.facts.sdkImports) {
      const extId = `ext-${slug(sdkLabel)}`;
      addEdge(r.id, extId, "http");
    }
  }

  // ── external district buildings ──
  const sdkLabels = new Map(); // label -> using count
  for (const r of records) {
    for (const l of r.facts.sdkImports) sdkLabels.set(l, (sdkLabels.get(l) ?? 0) + 1);
  }
  for (const [label] of sdkLabels) {
    buildings.push({
      id: `ext-${slug(label)}`,
      name: label,
      kind: "api",
      loc: 50,
      health: "ok",
      functions: [{ name: "request", args: "payload", returns: "external response", purpose: `third-party ${label} integration` }],
    });
  }

  // ── districts ──
  const districtMap = new Map();
  for (const b of buildings) {
    const d =
      b.kind === "api"
        ? { id: "external-services", name: "External Services", stack: "external" }
        : districtFor(b.relPath ?? "", b.stack, b.kind);
    if (!districtMap.has(d.id)) districtMap.set(d.id, { id: d.id, name: d.name, stack: d.stack, buildings: [] });
    districtMap.get(d.id).buildings.push(stripInternal(b));
  }
  const districts = [...districtMap.values()]
    .sort((a, b2) => STACK_ORDER[a.stack] - STACK_ORDER[b2.stack] || a.name.localeCompare(b2.name))
    .map((d) => ({ ...d, buildings: d.buildings.sort((x, y) => y.loc - x.loc) }));

  // ── flows: auto-detect login / payment / cart style chains ──
  const outgoing = new Map();
  for (const e of edges) {
    if (!outgoing.has(e.from)) outgoing.set(e.from, []);
    outgoing.get(e.from).push(e);
  }
  function chainFrom(routeBuildingId, seen = new Set(), depth = 0) {
    if (!routeBuildingId || seen.has(routeBuildingId) || depth > 4) return [];
    seen.add(routeBuildingId);
    const chain = [routeBuildingId];
    const nextEdges = outgoing.get(routeBuildingId) ?? [];
    const priority = ["controller", "service", "middleware", "model"];
    for (const wantKind of priority) {
      for (const e of nextEdges) {
        const t = byId.get(e.to);
        if (t && t.kind === wantKind) chain.push(...chainFrom(e.to, seen, depth + 1));
      }
    }
    return [...new Set(chain)];
  }

  const routesWithMeta = routeIndex.map((ri) => ({ ...ri, rec: byRel.get(buildingRel(ri.buildingId)) }));
  function buildingRel(id) {
    return records.find((r) => r.id === id)?.rel;
  }
  const flows = {};
  const FLOW_HINTS = [
    ["login", /login|signin|session|token/i],
    ["payment", /payment|checkout|pay|order|billing/i],
    ["cart", /cart|basket/i],
    ["signup", /signup|register|user/i],
  ];
  const usedFlows = new Set();
  for (const [flowName, re] of FLOW_HINTS) {
    for (const ri of routesWithMeta) {
      if (!re.test(ri.path)) continue;
      // find a frontend caller via http edge
      const caller = edges.find((e) => e.kind === "http" && e.to === ri.buildingId)?.from;
      const rest = chainFrom(ri.buildingId);
      if (rest.length >= 1) {
        flows[usedFlows.has(flowName) ? `${flowName}-${ri.buildingId}` : flowName] = [
          ...(caller ? [caller] : []),
          ...rest.filter((id) => id !== caller),
        ].slice(0, 7);
        usedFlows.add(flowName);
        break;
      }
    }
  }

  // project stack naming
  const hasModel = buildings.some((b) => b.kind === "model");
  const hasReact = buildings.some((b) => /\.(jsx|tsx)$/i.test(b.name));
  const hasExpress = records.some((r) => r.facts.usesExpress);
  const stackName = hasModel && hasExpress && hasReact ? "MERN" : hasExpress ? "Node.js" : hasReact ? "React" : "JavaScript";

  return {
    city: {
      project: { name: projectName || "Unknown Repo", stack: stackName },
      districts,
      edges,
      flows,
    },
    stats: {
      files: buildings.length,
      lines: buildings.reduce((a, b) => a + b.loc, 0),
      districts: districts.length,
      edges: edges.length,
      scannedRecords: records.length,
    },
  };
}

function joinPaths(a, b) {
  if (!a) return b;
  const left = a.endsWith("/") ? a.slice(0, -1) : a;
  const right = b.startsWith("/") ? b : `/${b}`;
  return `${left}${right}`;
}

function safeUrlPathname(u) {
  try {
    return new URL(u).pathname;
  } catch {
    return u;
  }
}

function stripInternal(b) {
  const { relPath, stack, ...rest } = b;
  return rest;
}

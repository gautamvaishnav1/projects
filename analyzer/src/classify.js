import path from "node:path";

const FRONTEND_DIRS = /(^|\/)(components|pages|views|screens|containers|contexts|hooks|store|stores|redux|features|app|client)\//i;
const BACKEND_DIRS = /(^|\/)(server|backend|api|routes|controllers|middleware|services|models|config|db|database|helpers|utils)\//i;
const MODEL_DIR = /(^|\/)models?\//i;
const ROUTE_DIR = /(^|\/)routes?\//i;
const CTRL_DIR = /(^|\/)controllers?\//i;
const MW_DIR = /(^|\/)middleware\//i;
const SVC_DIR = /(^|\/)services?\//i;
const PAGE_DIR = /(^|\/)(pages|views|screens)\//i;
const CTX_HINT = /context/i;

/** Decide stack ("frontend"|"backend"|"database") and building kind for a file. */
export function classify(relPath, facts) {
  const p = relPath.replace(/\\/g, "/");
  const ext = path.extname(p).toLowerCase();
  const base = path.basename(p);
  const isTSXorJSX = ext === ".jsx" || ext === ".tsx";

  // explicit model dir wins → database stack
  if (MODEL_DIR.test(p) || (facts.modelNames.length > 0 && !isTSXorJSX)) {
    return { stack: "database", kind: "model" };
  }

  let stack;
  if (isTSXorJSX || FRONTEND_DIRS.test(p)) stack = "frontend";
  else if (BACKEND_DIRS.test(p) && !FRONTEND_DIRS.test(p)) stack = "backend";
  else if (/^src\//.test(p) && !BACKEND_DIRS.test(p)) stack = "frontend";
  else stack = facts.hasJSX ? "frontend" : facts.usesExpress || facts.usesMongoose ? "backend" : "backend";

  // root entry files with express are backend
  if (facts.usesExpress && /^(server|app|index)\.(js|mjs|ts)$/i.test(base)) stack = "backend";

  let kind;
  if (stack === "database") kind = "model";
  else if (MW_DIR.test(p) || /middleware/i.test(base)) kind = "middleware";
  else if (ROUTE_DIR.test(p) || (facts.routes.length > 0 && stack === "backend")) kind = "route";
  else if (CTRL_DIR.test(p) || /controller/i.test(base)) kind = "controller";
  else if (SVC_DIR.test(p) || /service/i.test(base)) kind = "service";
  else if (CTX_HINT.test(base) || facts.hasCreateContext) kind = "context";
  else if (PAGE_DIR.test(p) || /^(App|main|index|_app|layout)\.(jsx|tsx|js|ts)$/i.test(base)) kind = "page";
  else if (stack === "frontend") kind = facts.hasJSX ? "component" : "page";
  else kind = facts.routes.length > 0 ? "route" : facts.exportCount > 0 ? "service" : "controller";

  return { stack, kind };
}

/** Feature/district name from a frontend or backend path. */
export function districtFor(relPath, stack, kind) {
  const p = relPath.replace(/\\/g, "/");
  const segs = p.split("/");

  if (stack === "database") return { id: "data-stores", name: "Data Stores", stack };
  if (kind === "api") return { id: "external-services", name: "External Services", stack: "external" };

  if (stack === "backend") {
    if (ROUTE_DIR.test(p)) return { id: "be-routes", name: "Routes", stack };
    if (CTRL_DIR.test(p)) return { id: "be-controllers", name: "Controllers", stack };
    if (MW_DIR.test(p)) return { id: "be-middleware", name: "Middleware", stack };
    if (SVC_DIR.test(p)) return { id: "be-services", name: "Services", stack };
    if (/(^|\/)(config|db|database)\//i.test(p)) return { id: "be-config", name: "Config & DB", stack };
    return { id: "be-core", name: "Core Server", stack };
  }

  // frontend feature extraction
  const srcIdx = segs.indexOf("src");
  const afterSrc = srcIdx >= 0 ? segs.slice(srcIdx + 1) : segs.slice(0, -1);
  const wellKnown = ["pages", "views", "screens", "components", "containers", "contexts", "context", "hooks", "store", "stores", "redux", "features"];
  let feature = null;
  for (const s of afterSrc.slice(0, -1)) {
    if (!wellKnown.includes(s.toLowerCase())) { feature = s; break; }
  }
  const parent = afterSrc.length > 1 ? afterSrc[afterSrc.length - 2] : "";
  const parentLc = parent.toLowerCase();
  if (!feature && parentLc === "components") return { id: "fe-shared-ui", name: "Shared UI", stack };
  if (!feature && ["pages", "views", "screens"].includes(parentLc)) return { id: "fe-pages", name: "Pages", stack };
  if (feature) {
    const id = `fe-${slug(feature)}`;
    return { id, name: titleCase(feature), stack };
  }
  if (CTX_HINT.test(p) || kind === "context") return { id: "fe-state", name: "State & Context", stack };
  return { id: "fe-app-shell", name: "App Shell", stack };
}

export function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
export function titleCase(s) {
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

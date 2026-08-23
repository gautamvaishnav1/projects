import type { ProjectMetadata } from "../parser/parser.types";
import { chatCompletion, extractJson, llmConfigured } from "../../infrastructure/llm/llm.client";
import { ApiError } from "../../shared/utils/api-error";
import { logger } from "../../shared/utils/logger";
import {
  ARCHITECT_SYSTEM_PROMPT,
  architectUserPrompt,
  compactMetadataForPrompt
} from "./ai.prompts";
import { isArchitectureLike, normalizeArchitecture, parseRawArchitecture } from "../analysis/architecture.schema";
import type { Architecture } from "../analysis/analysis.types";

/**
 * ProjectMetadata -> validated Architecture.
 * Tries the LLM (compact JSON in, strict JSON out, validated + normalized).
 * Falls back to a deterministic heuristic architect so the demo always works,
 * even with zero API keys — one bad LLM response never kills an analysis.
 */
export async function generateArchitecture(metadata: ProjectMetadata): Promise<{
  architecture: Architecture;
  engine: "llm" | "heuristic";
}> {
  if (llmConfigured()) {
    try {
      const architecture = await generateWithLlm(metadata);
      return { architecture, engine: "llm" };
    } catch (err) {
      logger.warn("LLM architect failed, falling back to heuristic mode", {
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }
  return { architecture: generateHeuristic(metadata), engine: "heuristic" };
}

async function generateWithLlm(metadata: ProjectMetadata): Promise<Architecture> {
  const content = await chatCompletion(
    [
      { role: "system", content: ARCHITECT_SYSTEM_PROMPT },
      { role: "user", content: architectUserPrompt(compactMetadataForPrompt(metadata)) }
    ],
    0.15
  );

  let parsed: unknown;
  try {
    parsed = extractJson(content);
  } catch (err) {
    throw ApiError.unprocessable("Could not parse AI response as JSON", {
      raw: content.slice(0, 200)
    });
  }

  // retry once with a corrective nudge when shape is wrong
  if (!isArchitectureLike(parsed)) {
    const retry = await chatCompletion(
      [
        { role: "system", content: ARCHITECT_SYSTEM_PROMPT },
        { role: "user", content: architectUserPrompt(compactMetadataForPrompt(metadata)) },
        { role: "assistant", content: content.slice(0, 4000) },
        {
          role: "user",
          content:
            'Your previous reply was not valid per the schema. Reply again with ONLY the JSON object having "components" and "connections".'
        }
      ],
      0
    );
    parsed = extractJson(retry);
  }

  return normalizeArchitecture(parseRawArchitecture(parsed));
}

/* ------------------------------------------------------------------ */
/* Deterministic heuristic architect (offline fallback)                */
/* ------------------------------------------------------------------ */

/**
 * Builds a full multi-building city from ProjectMetadata alone:
 *  1. strong signals first (routes → controllers, services, models + DB,
 *     auth middleware, external SDK integrations);
 *  2. every remaining scanned file is grouped by feature directory,
 *     typed by dominant role and added as its own building — so ANY repo,
 *     including libraries with zero HTTP signals, renders a whole city;
 *  3. oversized feature groups split into per-file buildings;
 *  4. deterministic ordering + capped fan-out keep output byte-stable.
 */
export function generateHeuristic(m: ProjectMetadata): Architecture {
  interface Node {
    id: string;
    name: string;
    type: string;
    description: string;
    files: string[];
  }
  const components = new Map<string, Node>();
  const connections: Architecture["connections"] = [];
  /** file paths already represented by a signal-based component */
  const claimed = new Set<string>();

  const add = (id: string, name: string, type: string, description: string, files: string[] = []): string => {
    const existing = components.get(id);
    if (existing) {
      for (const f of files) if (!existing.files.includes(f)) existing.files.push(f);
      return id;
    }
    components.set(id, { id, name, type, description, files });
    for (const f of files) claimed.add(f);
    return id;
  };

  const link = (from: string | null, to: string, label: string) => {
    if (!from || !components.has(from) || !components.has(to)) return;
    if (!connections.some((c) => c.from === from && c.to === to && c.label === label)) {
      connections.push({ from, to, label });
    }
  };

  /* ---------------- shared helpers ---------------- */

  /** feature key for a file path: its directory (src/-style prefixes ignored) */
  const featureOfPath = (filePath: string): string => {
    const parts = filePath.replace(/\\/g, "/").split("/");
    const stem = (parts[parts.length - 1] ?? "").replace(/\.(m|c)?(jsx?|tsx?)$/i, "");
    let base = 0;
    if (parts.length > 1 && /^(src|lib|source|app|js|ts)$/i.test(parts[0])) base = 1;
    const dir = parts.length - 1 > base ? parts[parts.length - 2] : stem;
    return slug(dir.toLowerCase()) || "core";
  };

  const fileStem = (filePath: string): string =>
    (filePath.replace(/\\/g, "/").split("/").pop() ?? "file").replace(/\.(m|c)?(jsx?|tsx?)$/i, "");

  /* ---------------- 1a. entry point ---------------- */
  const entryFile = m.files.find((f) => f.role === "entry");
  const serverId = add(
    "server-app",
    "Express Server",
    "config",
    `Application entry point wiring middleware and mounting routers${
      entryFile ? ` (${entryFile.path})` : ""
    }.`,
    entryFile ? [entryFile.path] : []
  );

  /* ---------------- 1b. routes → controllers ---------------- */
  const routeControllerIds = new Map<string, string>();
  for (const route of m.routes.slice(0, 120)) {
    const feature = featureOfPath(route.file);
    const routesId = add(
      `${feature}-routes`,
      `${cap(feature)} Routes`,
      "routes",
      `HTTP endpoints for ${feature} (${route.method} ${route.path}, ...).`,
      [route.file]
    );
    link(serverId, routesId, "mounts");

    const controllerEntry = m.controllers.find((c) => c.name === route.handler);
    const controllerId = add(
      `${feature}-controller`,
      `${cap(feature)} Controller`,
      "controller",
      `Handles ${feature} requests (e.g. ${route.handler}).`,
      controllerEntry ? [route.file, controllerEntry.file] : [route.file]
    );
    routeControllerIds.set(feature, controllerId);
    link(routesId, controllerId, "delegates to");

    const guarded = /auth|protect|verify/i.test(route.handler);
    if (guarded || m.authIndicators.jwtLibraryUsed) {
      const authId = add(
        "auth-middleware",
        "Auth Middleware",
        "auth",
        "Validates JWTs / sessions before protected handlers run.",
        []
      );
      link(routesId, authId, "guards");
    }
  }

  /* ---------------- 1c. services ---------------- */
  for (const svc of m.services.slice(0, 30)) {
    const feature = featureOfPath(svc.file);
    const svcId = add(
      `${slug(svc.name)}-svc`,
      cap(svc.name),
      "service",
      `Business logic for ${feature}.`,
      [svc.file]
    );
    const ctrl = routeControllerIds.get(feature);
    if (ctrl) link(ctrl, svcId, "calls");
  }

  /* ---------------- 1d. models + database ---------------- */
  for (const model of m.models.slice(0, 25)) {
    const modelId = add(
      `${slug(model.name)}-model`,
      `${cap(model.name)} Model`,
      "model",
      `Mongoose model "${model.name}"${model.collection ? ` (collection: ${model.collection})` : ""}${
        model.fields.length ? `, fields: ${model.fields.slice(0, 8).join(", ")}` : ""
      }.`,
      [model.file]
    );
    const owningService =
      m.services.find((s) => s.file === model.file) ??
      m.services.find((s) => featureOfPath(s.file) === featureOfPath(model.file));
    const dbId = add(
      "mongodb-database",
      "MongoDB Database",
      "database",
      "Persistence layer storing documents via Mongoose."
    );
    if (owningService) link(`${slug(owningService.name)}-svc`, modelId, "uses");
    link(modelId, dbId, "persists to");
  }

  /* ---------------- 1e. external integrations ---------------- */
  const externalDeps = Object.keys(m.dependencies).filter((d) =>
    /^(axios|node-fetch|got|stripe|openai|@google\/generativeai|twilio|aws-sdk|nodemailer|firebase)/i.test(d)
  );
  if (externalDeps.length > 0) {
    const extId = add(
      "external-services",
      "External Services",
      "integration",
      `Third-party APIs/SDKs used directly: ${externalDeps.slice(0, 6).join(", ")}.`
    );
    for (const [, comp] of components) {
      if (comp.type === "service") link(comp.id, extId, "integrates with");
    }
  }

  /* ---------------- 2. file-driven skyline ----------------
     Every unclaimed scanned file becomes its OWN building (one file =
     one building), typed by its detected role so files land in the
     right district (frontend / backend / data / core). */
  const isTestPath = (p: string): boolean =>
    /(^|\/)(tests?|__tests__|spec)(\/|$)/i.test(p.replace(/\\/g, "/")) ||
    /\.(test|spec)\.(m|c)?(jsx?|tsx?)$/i.test(p);

  const typeForRole = (role: string): string => {
    if (role === "component") return "frontend";
    if (role === "model") return "model";
    if (role === "routes") return "routes";
    if (role === "controller") return "controller";
    if (role === "middleware") return "middleware";
    if (role === "config" || role === "entry") return "config";
    if (role === "service") return "service";
    return "utility";
  };

  // largest files first; cap keeps monorepos sane
  const MAX_FILE_BUILDINGS = 60;
  const candidates = m.files
    .filter((f) => !isTestPath(f.path) && !claimed.has(f.path))
    .sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path))
    .slice(0, MAX_FILE_BUILDINGS);

  const builtFileIds: Array<{ id: string; type: string }> = [];
  const usedIds = new Set<string>();
  for (const f of candidates) {
    const feature = featureOfPath(f.path);
    const stem = slug(fileStem(f.path)) || "file";
    // index.js lives in ten dirs — keep ids/names unique
    let n = 2;
    let id = `${feature}-${stem}`;
    while (usedIds.has(id)) id = `${feature}-${stem}-${n++}`;
    usedIds.add(id);
    const name = cap(stem);
    const compId = add(
      id,
      name,
      typeForRole(f.role),
      `\`${f.path}\` (${f.lines} LOC) — ${feature} module.`,
      [f.path]
    );
    builtFileIds.push({ id: compId, type: typeForRole(f.role) });
  }

  /* ---------------- 3. wiring ---------------- */
  const frontendFiles = builtFileIds.filter((b) => b.type === "frontend");
  const backendFiles = builtFileIds.filter(
    (b) => !["frontend", "utility", "model"].includes(b.type)
  );
  const dataFiles = builtFileIds.filter((b) => b.type === "model");

  // client files talk to the server
  for (const fe of frontendFiles.slice(0, 12)) {
    link(fe.id, serverId, "sends requests");
  }
  // server mounts backend modules (fan-out capped for tidy streets)
  for (const be of backendFiles.slice(0, 12)) {
    link(serverId, be.id, "uses");
  }
  // data modules persist into the database node
  if (components.has("mongodb-database")) {
    for (const dg of dataFiles.slice(0, 10)) link(dg.id, "mongodb-database", "persists to");
  }

  /* ---------------- never-empty / never-disconnected ---------------- */
  if (components.size <= 1) {
    add(
      "core-codebase",
      "Core Codebase",
      "other",
      "No strong backend signals detected; showing the scanned code as a single component."
    );
  }

  if (connections.length === 0 && components.size > 1) {
    const ids = [...components.keys()];
    for (let i = 0; i < ids.length - 1; i++) {
      connections.push({ from: ids[i], to: ids[i + 1], label: "relates to" });
    }
  }

  return {
    components: [...components.values()],
    connections
  };
}

function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "core"
  );
}

function cap(input: string): string {
  const clean = input.replace(/[-_]/g, " ").trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

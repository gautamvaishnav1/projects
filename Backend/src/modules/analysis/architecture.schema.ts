import { z } from "zod";
import { ApiError } from "../../shared/utils/api-error";
import type { Architecture, ArchitectureComponent, ArchitectureConnection } from "./analysis.types";

/** Raw shape we demand from the LLM. */
const rawComponentSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  description: z.string().optional(),
  files: z.array(z.string()).optional()
});

const rawArchitectureSchema = z.object({
  components: z.array(rawComponentSchema).min(1),
  connections: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
        label: z.string().optional()
      })
    )
    .default([])
});

export interface RawArchitectureInput {
  components: Array<{
    id?: string;
    name: string;
    type: string;
    description?: string;
    files?: string[];
  }>;
  connections: Array<{ from: string; to: string; label?: string }>;
}

export function isArchitectureLike(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.components);
}

export function parseRawArchitecture(value: unknown): RawArchitectureInput {
  const result = rawArchitectureSchema.safeParse(value);
  if (!result.success) {
    throw ApiError.unprocessable("AI returned an invalid architecture structure", {
      issues: result.error.issues.slice(0, 8).map((i) => ({
        path: i.path.join("."),
        message: i.message
      }))
    });
  }
  return result.data as unknown as RawArchitectureInput;
}

export function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "component";
}

/**
 * Normalizes AI output into a strict, frontend-safe architecture:
 * - stable kebab-case ids (regenerated when missing/duplicated)
 * - connections filtered to reference existing component ids only
 */
export function normalizeArchitecture(raw: RawArchitectureInput): Architecture {
  const used = new Set<string>();
  const idByOriginal = new Map<string, string>();
  const components: ArchitectureComponent[] = [];
  let counter = 0;

  for (const c of raw.components) {
    let id = slugify(c.id ?? c.name ?? "");
    while (used.has(id)) {
      counter++;
      id = `${id}-${counter}`;
    }
    used.add(id);
    if (c.id) idByOriginal.set(c.id, id);
    idByOriginal.set(c.name, id);

    components.push({
      id,
      name: c.name.trim().slice(0, 120),
      type: slugify(c.type).replace(/-/g, "_"),
      description: (c.description ?? "").trim().slice(0, 500) || undefined,
      files: Array.isArray(c.files) ? c.files.slice(0, 12).map((f) => f.replace(/\\/g, "/")) : []
    });
  }

  // second pass: remap connection endpoints that referenced pre-normalized ids/names
  const resolveEndpoint = (endpoint: string): string | null => {
    if (used.has(endpoint)) return endpoint;
    const remapped = idByOriginal.get(endpoint);
    if (remapped && used.has(remapped)) return remapped;
    const fuzzy = slugify(endpoint);
    if (used.has(fuzzy)) return fuzzy;
    return null;
  };

  const seenConnections = new Set<string>();
  const connections: ArchitectureConnection[] = [];
  for (const conn of raw.connections) {
    const from = resolveEndpoint(conn.from);
    const to = resolveEndpoint(conn.to);
    if (!from || !to || from === to) continue; // dangling/self references dropped
    const key = `${from}->${to}:${conn.label ?? ""}`;
    if (seenConnections.has(key)) continue;
    seenConnections.add(key);
    connections.push({ from, to, label: (conn.label ?? "").slice(0, 80) || "uses" });
  }

  return { components: components.slice(0, 60), connections };
}

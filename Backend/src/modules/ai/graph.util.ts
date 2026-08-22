import type { Architecture } from "../analysis/analysis.types";

export interface GraphWalkResult {
  targetComponent: string | null;
  path: string[];
  relatedComponents: string[];
}

function adjacency(architecture: Architecture): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const c of architecture.components) map.set(c.id, []);
  for (const conn of architecture.connections) {
    if (!map.has(conn.from)) map.set(conn.from, []);
    if (!map.has(conn.to)) map.set(conn.to, []);
    if (!map.get(conn.from)!.includes(conn.to)) map.get(conn.from)!.push(conn.to);
    // undirected second edge so paths can walk upstream too
    if (!map.get(conn.to)!.includes(conn.from)) map.get(conn.to)!.push(conn.from);
  }
  return map;
}

/** BFS shortest walk between two component ids (semantic only — frontend maps it to 3D). */
export function findPath(
  architecture: Architecture,
  startId: string,
  goalId: string
): string[] {
  if (!hasComponent(architecture, startId) || !hasComponent(architecture, goalId)) return [];
  const adj = adjacency(architecture);
  const queue: string[][] = [[startId]];
  const visited = new Set([startId]);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = current[current.length - 1];
    if (node === goalId) return current;
    for (const next of adj.get(node) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...current, next]);
      }
    }
  }
  return [];
}

export function hasComponent(architecture: Architecture | undefined | null, id: string): boolean {
  if (!architecture) return false;
  return architecture.components.some((c) => c.id === id);
}

/**
 * Picks the component that best matches a free-text question.
 * Scoring: exact id/name match > word overlaps in name/description/files/type.
 */
export function pickComponentForQuestion(
  architecture: Architecture,
  question: string,
  metadata?: { routes?: Array<{ handler: string; file: string }>; models?: Array<{ name: string; file: string }> }
): string | null {
  const q = question.toLowerCase();
  const qWords = new Set(q.split(/[^a-z0-9]+/).filter((w) => w.length > 2));

  let best: { id: string; score: number } | null = null;

  for (const comp of architecture.components) {
    let score = 0;
    const idLower = comp.id.toLowerCase();
    const nameLower = comp.name.toLowerCase();
    const typeLower = (comp.type ?? "").toLowerCase();
    const descLower = (comp.description ?? "").toLowerCase();

    if (q.includes(idLower)) score += 10;
    if (qWords.has(idLower.replace(/-/g, ""))) score += 6;
    for (const w of idLower.split("-")) if (w.length > 2 && q.includes(w)) score += 3;
    if (qWords.has(nameLower)) score += 5;
    for (const w of nameLower.split(/\s+/)) if (w.length > 2 && q.includes(w)) score += 2;
    for (const w of qWords) if (descLower.includes(w)) score += 1;
    if (q.includes(typeLower)) score += 2;

    // metadata signals: route handlers / model names matching the question
    for (const r of metadata?.routes ?? []) {
      if (r.handler.toLowerCase().includes(idLower.split("-")[0])) score += 1;
    }
    for (const model of metadata?.models ?? []) {
      const modelName = model.name.toLowerCase().replace(/-/g, "");
      if (
        (qWords.has(modelName) || q.includes(modelName)) &&
        (comp.files ?? []).some((f) => f === model.file)
      )
        score += 4;
    }

    if (score > (best?.score ?? 0)) best = { id: comp.id, score };
  }

  return best && best.score >= 3 ? best.id : null;
}

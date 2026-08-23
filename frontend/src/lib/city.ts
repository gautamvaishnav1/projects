import { useMemo } from "react";
import { buildLayout } from "./layout";
import { useCity } from "../store/useCity";
import type { CityJSON, Kind, Stack, BuildingNode } from "../types";

/* ── Backend architecture payload → CityJSON adapter ────────────── */

export interface BackendComponent {
  id: string;
  name: string;
  type: string;
  description?: string;
  district: string;
  files?: Array<{ path: string; lines: number; functions?: string[] }>;
  visual?: { complexity?: number; importance?: number };
  dependencies?: { imports?: string[]; uses?: string[] };
}

export interface BackendConnection {
  id: string;
  from: string;
  to: string;
  type?: string;
}

export interface BackendArchitecture {
  analysisId: string;
  projectId: string;
  repoInfo?: { fullName?: string; name?: string; defaultBranch?: string; techStack?: { languages?: string[] } | null } | null;
  stats?: { aiEngine?: string; filesParsedBabel?: number; scannedFiles?: number; bottlenecks?: string[] } | null;
  districts?: Array<{ id: string; name: string }>;
  architecture: { components: BackendComponent[]; connections: BackendConnection[] };
}

const DISTRICT_STACK: Record<string, Stack> = {
  "frontend-district": "frontend",
  "backend-district": "backend",
  "data-district": "database",
  "external-district": "external",
  "core-district": "backend",
};

function kindFor(type: string): Kind {
  if (type === "frontend") return "page";
  if (type === "routes") return "route";
  if (type === "controller") return "controller";
  if (type === "service") return "service";
  if (type === "middleware" || type === "auth") return "middleware";
  if (type === "model" || type === "database") return "model";
  return "api";
}

function edgeKind(type: string | undefined): "http" | "query" | "import" {
  if (type === "storage") return "query";
  if (!type || type === "internal" || type === "dependency") return "import";
  return "http"; // http · auth-flow · external-api
}

/** Converts the validated CityWorld payload from
 *  GET /api/v1/projects/:id/architecture into the renderer's CityJSON.
 *  Every analysis signal the backend computed (complexity, importance,
 *  bottlenecks, files, functions, npm imports) flows through to the 3D city. */
export function architectureToCity(data: BackendArchitecture): CityJSON {
  const components = data.architecture.components ?? [];
  const bottleneckIds = new Set(data.stats?.bottlenecks ?? []);
  const districts = (data.districts ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    stack: DISTRICT_STACK[d.id] ?? "backend",
    buildings: components
      .filter((c) => c.district === d.id)
      .map((c) => {
        const fileLines = (c.files ?? []).reduce((a, f) => a + (f.lines ?? 0), 0);
        // hotspot ranking mirrors the backend: explicit bottleneck list first,
        // then the same complexity >= 60 threshold
        const complexity = c.visual?.complexity;
        const health: BuildingNode["health"] = bottleneckIds.has(c.id)
          ? "error"
          : (complexity ?? 0) >= 60
            ? "warn"
            : "ok";
        return {
          id: c.id,
          name: c.name,
          kind: kindFor(c.type),
          loc: fileLines,
          health,
          functions: Array.from(new Set((c.files ?? []).flatMap((f) => f.functions ?? [])))
            .slice(0, 12)
            .map((name) => ({ name, args: "", returns: "—", purpose: c.description ?? "" })),
          description: c.description,
          complexity,
          importance: c.visual?.importance,
          filesCount: (c.files ?? []).length || undefined,
          imports: c.dependencies?.imports,
        };
      }),
  }));

  return {
    project: {
      name: data.repoInfo?.fullName ?? data.repoInfo?.name ?? data.projectId,
      stack: data.repoInfo?.techStack?.languages?.join(" · ") || "javascript / typescript",
    },
    districts,
    edges: (data.architecture.connections ?? []).map((c) => ({
      from: c.from,
      to: c.to,
      kind: edgeKind(c.type),
    })),
    flows: {},
  };
}

/** Layout derived reactively from the active CityJSON in the store. */
export function useCityLayout() {
  const city = useCity((s) => s.city);
  return useMemo(() => buildLayout(city), [city]);
}

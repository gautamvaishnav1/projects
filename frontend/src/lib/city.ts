import { useMemo } from "react";
import { buildLayout } from "./layout";
import { useCity } from "../store/useCity";
import type { CityJSON, Kind, Stack } from "../types";

/* ── Backend architecture payload → CityJSON adapter ────────────── */

interface BackendComponent {
  id: string;
  name: string;
  type: string;
  description?: string;
  district: string;
  files?: Array<{ path: string; lines: number; functions?: string[] }>;
}

interface BackendConnection {
  id: string;
  from: string;
  to: string;
  type?: string;
}

interface BackendArchitecture {
  analysisId: string;
  projectId: string;
  repoInfo?: { fullName?: string; name?: string; defaultBranch?: string; techStack?: { languages?: string[] } | null } | null;
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
 *  GET /api/v1/projects/:id/architecture into the renderer's CityJSON. */
export function architectureToCity(data: BackendArchitecture): CityJSON {
  const components = data.architecture.components ?? [];
  const districts = (data.districts ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    stack: DISTRICT_STACK[d.id] ?? "backend",
    buildings: components
      .filter((c) => c.district === d.id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        kind: kindFor(c.type),
        loc: (c.files ?? []).reduce((a, f) => a + (f.lines ?? 0), 0),
        health: "ok" as const,
        functions: Array.from(new Set((c.files ?? []).flatMap((f) => f.functions ?? [])))
          .slice(0, 12)
          .map((name) => ({ name, args: "", returns: "—", purpose: c.description ?? "" })),
      })),
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

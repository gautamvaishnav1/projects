/**
 * Validated AI output shape. Component ids are stable kebab-case slugs;
 * connections only ever reference existing component ids.
 */
export interface ArchitectureComponent {
  id: string;
  name: string;
  type: string; // e.g. frontend | routes | controller | service | model | database | middleware | auth | external | config | utility | other
  description?: string;
  files?: string[];
}

export interface ArchitectureConnection {
  from: string;
  to: string;
  label?: string;
}

export interface Architecture {
  components: ArchitectureComponent[];
  connections: ArchitectureConnection[];
}

/* ------------------------------------------------------------------ */
/* 3D city world (enriched architecture for the frontend renderer)     */
/* ------------------------------------------------------------------ */

export interface Position3 {
  x: number;
  y: number;
  z: number;
}

export interface Size3 {
  width: number;
  height: number;
  depth: number;
}

export interface District {
  id: string;
  name: string;
  position: Position3;
  bounds: { width: number; depth: number };
  color: string;
}

export interface FileMeta {
  path: string;
  size: number; // bytes
  lines: number;
  functions: string[];
  lastModified: string | null;
}

export interface ComponentVisual {
  primaryColor: string;
  glowColor: string;
  buildingStyle: "modern" | "tower" | "block" | "gate" | "datacenter" | "antenna" | "lowrise";
  importance: number; // 1..10
  complexity: number; // 0..100
}

/** Static analysis cannot measure runtime traffic yet - values stay zeroed. */
export interface ComponentMetrics {
  requestCount: number;
  avgLatencyMs: number;
  errorRate: number;
  lastActivity: string | null;
  health: "healthy";
}

export interface ComponentDeps {
  /** npm packages imported by this component's files */
  imports: string[];
  /** ids of components this one points at */
  uses: string[];
}

export interface CityComponent {
  id: string;
  name: string;
  type: string;
  description?: string;
  district: string;
  floor: number;
  parent: string | null;
  children: string[];
  belongsTo: string[];
  position: Position3;
  size: Size3;
  visual: ComponentVisual;
  files: FileMeta[];
  metrics: ComponentMetrics;
  dependencies: ComponentDeps;
}

export type ConnectionType =
  | "http"
  | "auth-flow"
  | "storage"
  | "external-api"
  | "internal"
  | "dependency";

export type TrafficVolume = "low" | "medium" | "high";

export interface CityConnection {
  id: string;
  from: string;
  to: string;
  label: string;
  type: ConnectionType;
  direction: "unidirectional" | "bidirectional";
  weight: number; // 20..95
  trafficVolume: TrafficVolume;
  protocol: string;
  latencyMs: number; // 0 until runtime telemetry exists
  status: "healthy";
  path: Position3[]; // [from.position, mid, to.position]
  pathType: "curved";
  elevation: "ground" | "bridge";
  visual: { color: string; width: number; glowIntensity: number };
}

export interface RuntimeDependency {
  name: string;
  version: string;
  usedBy: string[]; // component ids
  hasVulnerabilities: boolean;
  lastUpdated: string | null;
}

export interface TechStack {
  languages: string[];
  frontend: string[];
  backend: string[];
  database: string[];
  authentication: string[];
  tooling: string[];
}

export interface ChangeTracking {
  lastAnalyzed: string | null;
  filesChanged: number;
  componentsAffected: string[];
  newConnections: number;
  removedConnections: number;
  previousAnalysisId: string | null;
}

export interface CityWorld {
  districts: District[];
  architecture: {
    components: CityComponent[];
    connections: CityConnection[];
  };
  dependencies: {
    runtime: RuntimeDependency[];
    dev: string[];
  };
  techStack: TechStack;
  changes: ChangeTracking;
}

export const ANALYSIS_STATUS = ["running", "completed", "failed"] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUS)[number];

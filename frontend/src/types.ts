export type Stack = "frontend" | "backend" | "database" | "external";
export type Kind =
  | "page"
  | "component"
  | "context"
  | "route"
  | "controller"
  | "service"
  | "middleware"
  | "model"
  | "api";

export interface FunctionNode {
  name: string;
  args: string;
  returns: string;
  purpose: string;
}

export interface BuildingNode {
  id: string;
  name: string;
  kind: Kind;
  loc: number;
  health: "ok" | "warn" | "error";
  functions: FunctionNode[];
  /* rich backend analysis — present on cities built from real repo JSON */
  description?: string;
  /** 0-100 relative code complexity (backend visual.complexity) */
  complexity?: number;
  /** 0-10 architectural importance (connection degree) */
  importance?: number;
  filesCount?: number;
  /** npm packages these files import */
  imports?: string[];
}

export interface DistrictNode {
  id: string;
  name: string;
  stack: Stack;
  buildings: BuildingNode[];
}

export interface EdgeNode {
  from: string;
  to: string;
  kind: "http" | "query" | "import";
}

export interface CityJSON {
  project: { name: string; stack: string };
  districts: DistrictNode[];
  edges: EdgeNode[];
  flows: Record<string, string[]>;
}

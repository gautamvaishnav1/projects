/**
 * Data contracts produced by the parser module.
 * Babel converts source -> AST; ast-analyzer turns the AST into these compact
 * JSON structures. Raw ASTs NEVER leave this module.
 */

export type FileRole =
  | "entry"
  | "routes"
  | "controller"
  | "service"
  | "model"
  | "middleware"
  | "config"
  | "test"
  | "component"
  | "other";

export interface ImportFact {
  file: string;
  source: string;
  specifiers: string[];
}

export interface ExportFact {
  file: string;
  names: string[];
  kind: "named" | "default" | "module";
}

export interface FunctionFact {
  name: string;
  file: string;
  line: number;
  params: string[];
  isAsync: boolean;
  exported: boolean;
  kind: "function" | "arrow" | "method";
}

export interface ClassFact {
  name: string;
  file: string;
  line: number;
  extends: string | null;
  methods: string[];
  exported: boolean;
}

export interface RouteFact {
  /** HTTP method, or MOUNT when a router/app is mounted, or USE for app.use middleware. */
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS" | "USE" | "ALL" | "MOUNT";
  path: string;
  handler: string;
  file: string;
}

export interface ModelFact {
  name: string;
  file: string;
  collection: string | null;
  fields: string[];
}

export interface ComponentFact {
  name: string;
  file: string;
  kind: "controller" | "service";
  type: "function" | "class" | "file";
  routeCount?: number;
}

export interface AuthIndicators {
  jwtLibraryUsed: boolean;
  passwordHashingUsed: boolean;
  passportUsed: boolean;
  sessionUsed: boolean;
  oauthUsed: boolean;
  authMiddlewareDetected: boolean;
  evidence: string[];
}

export interface FileFacts {
  path: string;
  lines: number;
  bytes: number;
  role: FileRole;
  imports: ImportFact[];
  exports: ExportFact[];
  functions: FunctionFact[];
  classes: ClassFact[];
  routes: RouteFact[];
  models: ModelFact[];
  controllers: ComponentFact[];
  services: ComponentFact[];
  authEvidence: string[];
  parse: {
    ok: boolean;
    strategy: "babel" | "fallback";
    durationMs: number;
    error?: string;
  };
}

export interface ProjectStats {
  filesConsidered: number;
  filesParsedBabel: number;
  filesFallback: number;
  filesFailed: number;
  totalFunctions: number;
  totalClasses: number;
  totalRoutes: number;
  totalModels: number;
  durationMs: number;
}

/** The complete, compact JSON we persist and (trimmed) send to the AI. */
export interface ProjectMetadata {
  generatedAt: string;
  project: {
    name: string;
    repo: string; // owner/name
    branch?: string;
    description?: string;
    primaryLanguage?: string;
  };
  stats: ProjectStats;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  files: Array<{ path: string; bytes: number; lines: number; role: FileRole }>;
  imports: ImportFact[];
  exports: ExportFact[];
  functions: FunctionFact[];
  classes: ClassFact[];
  routes: RouteFact[];
  controllers: ComponentFact[];
  services: ComponentFact[];
  models: ModelFact[];
  authIndicators: AuthIndicators;
}

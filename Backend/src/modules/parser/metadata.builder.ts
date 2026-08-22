import type {
  AuthIndicators,
  ClassFact,
  FileFacts,
  FunctionFact,
  ProjectMetadata,
  ProjectStats
} from "./parser.types";

export interface RepoInfoLite {
  name: string;
  repo: string; // owner/name
  branch?: string;
  description?: string;
  primaryLanguage?: string;
}

const CAPS = {
  functions: 600,
  classes: 250,
  imports: 800,
  exports: 800,
  routes: 400,
  models: 120
};

function buildAuthIndicators(
  dependencies: Record<string, string>,
  evidence: string[]
): AuthIndicators {
  const depNames = Object.keys(dependencies);
  const all = [...depNames, ...evidence].join(" ").toLowerCase();
  const has = (pattern: RegExp | string): boolean =>
    typeof pattern === "string" ? all.includes(pattern) : pattern.test(all);

  return {
    jwtLibraryUsed:
      has(/\b(jsonwebtoken|jwt-simple|jose|njwt)\b/) || has(/jwt\.sign|jwt\.verify/),
    passwordHashingUsed: has(/\b(bcryptjs?|argon2?)\b/) || has(/bcrypt\.hash|bcrypt\.compare|scrypt\(|pbkdf2\(/),
    passportUsed: has(/passport/) && !has("passport-js-fake"),
    sessionUsed: has(/(express-session|cookie-session|connect-redis)/) || has(/req\.session\b/),
    oauthUsed: has(/oauth|google-auth-library|openid-client|@auth0\//),
    authMiddlewareDetected: has(/middleware "/) || /authmiddleware|requireauth|verifytoken/i.test(all),
    evidence: evidence.slice(0, 40)
  };
}

/**
 * Merges per-file facts into the single compact ProjectMetadata JSON that we
 * persist and hand to the AI. Raw ASTs never appear anywhere in this shape.
 */
export function buildProjectMetadata(
  repo: RepoInfoLite,
  facts: FileFacts[],
  deps: { dependencies: Record<string, string>; devDependencies: Record<string, string> },
  durationMs: number
): ProjectMetadata {
  const functions: FunctionFact[] = [];
  const classes: ClassFact[] = [];
  const imports: ProjectMetadata["imports"] = [];
  const exports: ProjectMetadata["exports"] = [];
  const routes: ProjectMetadata["routes"] = [];
  const models: ProjectMetadata["models"] = [];
  const controllers: ProjectMetadata["controllers"] = [];
  const services: ProjectMetadata["services"] = [];

  for (const f of facts) {
    for (const x of f.functions) if (functions.length < CAPS.functions) functions.push(x);
    for (const x of f.classes) if (classes.length < CAPS.classes) classes.push(x);
    for (const x of f.imports) if (imports.length < CAPS.imports) imports.push(x);
    for (const x of f.exports) if (exports.length < CAPS.exports) exports.push(x);
    for (const x of f.routes) if (routes.length < CAPS.routes) routes.push(x);
    for (const x of f.models) if (models.length < CAPS.models) models.push(x);
    controllers.push(...f.controllers);
    services.push(...f.services);
  }

  const stats: ProjectStats = {
    filesConsidered: facts.length,
    filesParsedBabel: facts.filter((f) => f.parse.strategy === "babel").length,
    filesFallback: facts.filter((f) => f.parse.strategy === "fallback").length,
    filesFailed: facts.filter((f) => !f.parse.ok).length,
    totalFunctions: functions.length,
    totalClasses: classes.length,
    totalRoutes: routes.length,
    totalModels: models.length,
    durationMs
  };

  return {
    generatedAt: new Date().toISOString(),
    project: {
      name: repo.name,
      repo: repo.repo,
      branch: repo.branch,
      description: repo.description,
      primaryLanguage: repo.primaryLanguage
    },
    stats,
    dependencies: deps.dependencies,
    devDependencies: deps.devDependencies,
    files: facts.map((f) => ({ path: f.path, bytes: f.bytes, lines: f.lines, role: f.role })),
    imports,
    exports,
    functions,
    classes,
    routes,
    controllers,
    services,
    models,
    authIndicators: buildAuthIndicators(deps.dependencies, facts.flatMap((f) => f.authEvidence))
  };
}

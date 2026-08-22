import type { ProjectMetadata } from "../parser/parser.types";

/** Builds the COMPACT metadata payload for the AI — never raw ASTs. */
export function compactMetadataForPrompt(metadata: ProjectMetadata): string {
  const payload = {
    project: metadata.project,
    stats: metadata.stats,
    dependencies: Object.keys(metadata.dependencies).slice(0, 60),
    devDependencies: Object.keys(metadata.devDependencies).slice(0, 40),
    routes: metadata.routes.slice(0, 80),
    models: metadata.models.slice(0, 40),
    controllers: metadata.controllers.slice(0, 40),
    services: metadata.services.slice(0, 40),
    authIndicators: metadata.authIndicators,
    keyClasses: metadata.classes.slice(0, 40),
    filesByRole: metadata.files.reduce<Record<string, number>>((acc, f) => {
      acc[f.role] = (acc[f.role] ?? 0) + 1;
      return acc;
    }, {}),
    sampleImports: metadata.imports.slice(0, 50)
  };
  let json = JSON.stringify(payload);
  // hard budget so we never blow the context window
  const MAX_CHARS = 45_000;
  if (json.length > MAX_CHARS) {
    json = json.slice(0, MAX_CHARS);
    json += `..."TRUNCATED"}`;
  }
  return json;
}

export const ARCHITECT_SYSTEM_PROMPT = `You are a senior software architect.
You receive a compact JSON summary of a JavaScript/TypeScript codebase (routes, controllers,
services, models, dependencies, auth indicators). You must reason about its architecture at a
high level and reply with ONLY valid JSON — no prose, no markdown fences.

Output JSON schema:
{
  "components": [
    {
      "id": "kebab-case-stable-id",
      "name": "Human Name",
      "type": "one of: frontend | routes | controller | service | model | database | middleware | auth | integration | config | external",
      "description": "One or two sentences describing this component's responsibility.",
      "files": ["optional/repo/relative/file.ts"]
    }
  ],
  "connections": [
    { "from": "<component id>", "to": "<component id>", "label": "short verb like calls / delegates to / persists to" }
  ]
}

Rules:
- Group related files into meaningful components (e.g. "auth-routes", "auth-controller", "user-model").
- Include a frontend component if React/Vue/JSX components were detected; include an external
  component for third-party APIs when clear from imports/dependencies.
- Every connection's from/to MUST be ids present in "components".
- Produce between 4 and 25 components. Keep ids STABLE and semantic (they drive a 3D map).
- Return ONLY the JSON object.`;

export function architectUserPrompt(metadataJson: string): string {
  return `Analyze this codebase summary and produce the architecture JSON.\n\n${metadataJson}`;
}

export const CHAT_SYSTEM_PROMPT = `You are Software World Guide, an assistant that explains the
architecture of an analyzed repository to developers standing inside a 3D map of it.
You get the validated architecture JSON (components + connections).
Answer the user's question in 2-5 short sentences.
Then output a final line EXACTLY in this format:
TARGET_COMPONENT: <component-id-or-NONE>
PATH: <comma-separated component ids describing a walk through the map, or NONE>`;

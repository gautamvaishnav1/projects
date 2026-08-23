import { http, ROOT_BASE, unwrap, type ApiEnvelope } from "./http";
import type { BackendArchitecture } from "./city";

/* ── Single typed gateway to the Express backend ──────────────────
 * Every frontend request flows through here (REST, via axios) or
 * lib/socket.ts (realtime). Backend envelope: { success, message?, data? }
 */

export interface ProjectDTO {
  id: string;
  name: string;
  description?: string;
  repoUrl: string;
  lastAnalysisId: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChatAnswer {
  answer: string;
  targetComponent: string | null;
  path: string[];
  relatedComponents: string[];
}

/* ── health (sits outside /api/v1) ──────────────────────────────── */

export async function getHealth(): Promise<{ status: string; db: string }> {
  const envelope = await http.get<ApiEnvelope<{ status: string; db: string }>>(`${ROOT_BASE}/health`);
  return { status: envelope.data.data?.status ?? "ok", db: envelope.data.data?.db ?? "unknown" };
}

/* ── projects ───────────────────────────────────────────────────── */

export async function listProjects(): Promise<ProjectDTO[]> {
  const data = await unwrap<{ projects: ProjectDTO[] }>(http.get("/projects"));
  return data.projects ?? [];
}

export interface CreateProjectResult {
  project: ProjectDTO;
  /** True when a project for this GitHub URL already existed — no 409, just an explanation. */
  alreadyExists: boolean;
  /** Human-readable explanation from the backend (why no new project was created). */
  message?: string;
}

export async function createProject(name: string, repoUrl: string): Promise<CreateProjectResult> {
  const res = await http.post<ApiEnvelope<{ project: ProjectDTO; alreadyExists?: boolean }>>(
    "/projects",
    { name, repoUrl },
  );
  const project = res.data.data?.project as ProjectDTO | undefined;
  if (!project) throw new Error(res.data.message ?? "Project creation failed");
  return { project, alreadyExists: Boolean(res.data.data?.alreadyExists), message: res.data.message };
}

export async function deleteProject(id: string): Promise<void> {
  await http.delete(`/projects/${id}`);
}

/* ── analysis pipeline ──────────────────────────────────────────── */

export async function startAnalysis(projectId: string): Promise<string> {
  const data = await unwrap<{ analysisId: string }>(
    http.post(`/projects/${projectId}/analyze`),
  );
  return data.analysisId;
}

export type AnalysisStatus = "queued" | "running" | "completed" | "failed";

export async function getAnalysisStatus(analysisId: string): Promise<{
  status: AnalysisStatus;
  progress?: number;
  error?: string | null;
}> {
  return unwrap(http.get(`/analyses/${analysisId}/status`));
}

/** Validated CityWorld payload served by the backend. */
export type { BackendArchitecture };

export async function getArchitecture(projectId: string): Promise<BackendArchitecture> {
  return unwrap(http.get(`/projects/${projectId}/architecture`));
}

/* ── AI chat guide ──────────────────────────────────────────────── */

export async function askChat(projectId: string, question: string): Promise<ChatAnswer> {
  return unwrap(http.post(`/projects/${projectId}/chat`, { question }));
}

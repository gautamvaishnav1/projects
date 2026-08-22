import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import { ApiError } from "../../shared/utils/api-error";
import * as analysisService from "./analysis.service";

export const start = asyncHandler(async (req: Request, res: Response) => {
  const project = await analysisService.getOwnedProject(String(req.params.id), req.user!.id);
  const { analysisId } = await analysisService.startAnalysis(project, req.user!.id);
  res.status(202).json({
    success: true,
    message: "Analysis started",
    data: {
      analysisId,
      projectId: project._id.toString(),
      socketRoom: `project:${project._id.toString()}`
    }
  });
});

export const getAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const doc = await analysisService.getOwnedAnalysis(String(req.params.id), req.user!.id);
  res.status(200).json({ success: true, data: serialize(doc) });
});

export const getStatus = asyncHandler(async (req: Request, res: Response) => {
  const doc = await analysisService.getOwnedAnalysis(String(req.params.id), req.user!.id);
  res.status(200).json({
    success: true,
    data: {
      id: doc._id.toString(),
      status: doc.status,
      durationMs: doc.durationMs,
      error: doc.error ?? null
    }
  });
});

/** GET /projects/:id/architecture — latest validated architecture for the frontend. */
export const getArchitecture = asyncHandler(async (req: Request, res: Response) => {
  const doc = await analysisService.getLatestCompletedForProject(
    String(req.params.id),
    req.user!.id
  );
  if (!doc?.architecture) {
    throw ApiError.notFound(
      "No completed architecture yet. POST /api/v1/projects/:id/analyze first."
    );
  }
  res.status(200).json({
    success: true,
    data: {
      analysisId: doc._id.toString(),
      projectId: String(doc.project),
      repoInfo: doc.repoInfo
        ? { ...doc.repoInfo, techStack: doc.techStack ?? null }
        : null,
      stats: { ...(doc.stats ?? {}), totalComponents: doc.architecture?.components.length ?? 0, totalConnections: doc.architecture?.connections.length ?? 0 },
      districts: doc.districts ?? [],
      architecture: doc.architecture,
      dependencies: doc.dependencies ?? { runtime: [], dev: [] },
      changes: doc.changes ?? null
    }
  });
});

function serialize(doc: NonNullable<Awaited<ReturnType<typeof analysisService.getOwnedAnalysis>>>) {
  return {
    id: doc._id.toString(),
    projectId: String(doc.project),
    status: doc.status,
    repoInfo: doc.repoInfo ?? null,
    stats: doc.stats ?? null,
    failures: doc.failures ?? [],
    error: doc.error ?? null,
    durationMs: doc.durationMs ?? null,
    createdAt: doc.createdAt,
    completedAt: doc.completedAt ?? null,
    metadata: doc.metadata ?? null, // compact ProjectMetadata JSON (no ASTs)
    architecture: doc.architecture ?? null // validated Architecture JSON
  };
}

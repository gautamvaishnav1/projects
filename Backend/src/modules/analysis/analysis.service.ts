import { ApiError } from "../../shared/utils/api-error";
import type { AnalysisDocument } from "./analysis.model";
import { AnalysisModel } from "./analysis.model";
import type { ProjectDocument } from "../projects/project.model";
import { ProjectModel } from "../projects/project.model";
import type { StartAnalysisResult } from "./analysis.pipeline";

export async function getOwnedProject(projectId: string, userId: string): Promise<ProjectDocument> {
  const project = await ProjectModel.findById(projectId);
  if (!project) throw ApiError.notFound("Project not found");
  if (String(project.owner) !== String(userId)) {
    throw ApiError.forbidden("You do not own this project");
  }
  return project;
}

export async function startAnalysis(
  project: ProjectDocument,
  userId: string
): Promise<StartAnalysisResult> {
  const { startAnalysis: run } = await import("./analysis.pipeline");
  return run(project, userId);
}

export async function getOwnedAnalysis(
  analysisId: string,
  userId: string
): Promise<AnalysisDocument> {
  if (!analysisId || analysisId.length < 12) throw ApiError.notFound("Analysis not found");
  const doc = await AnalysisModel.findById(analysisId);
  if (!doc) throw ApiError.notFound("Analysis not found");
  if (String(doc.requestedBy) !== String(userId)) {
    throw ApiError.forbidden("You do not own this analysis");
  }
  return doc;
}

export async function getLatestCompletedForProject(
  projectId: string,
  userId: string
): Promise<AnalysisDocument | null> {
  const project = await getOwnedProject(projectId, userId);
  const doc = await AnalysisModel.findOne({ project: project._id, status: "completed" })
    .sort({ createdAt: -1 })
    .limit(1);
  return doc;
}

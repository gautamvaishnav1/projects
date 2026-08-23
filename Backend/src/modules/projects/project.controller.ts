import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import * as projectService from "./project.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const { project, existed } = await projectService.createProject(req.user!.id, req.body as never);
  if (existed) {
    res.status(200).json({
      success: true,
      message:
        `This GitHub repository (${project.repoUrl}) is already saved as your project ` +
        `"${project.name}". No new project was created — open it from your projects list to view or run an analysis.`,
      data: { project, alreadyExists: true }
    });
    return;
  }
  res.status(201).json({ success: true, data: { project } });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const projects = await projectService.listProjects(req.user!.id);
  res.status(200).json({ success: true, data: { projects } });
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const project = await projectService.getOwnedProject(String(req.params.id), req.user!.id);
  res.status(200).json({
    success: true,
    data: {
      project: {
        id: project._id.toString(),
        name: project.name,
        description: project.description ?? "",
        repoUrl: project.repoUrl,
        lastAnalysisId: project.lastAnalysis?.toString() ?? null,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      }
    }
  });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await projectService.deleteProject(String(req.params.id), req.user!.id);
  res.status(200).json({ success: true, message: "Project deleted" });
});

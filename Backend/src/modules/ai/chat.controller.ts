import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/async-handler";
import * as chatService from "./chat.service";
import * as analysisService from "../analysis/analysis.service";
import { ApiError } from "../../shared/utils/api-error";

/**
 * POST /api/v1/projects/:id/chat
 * Body: { "question": "How does authentication work?" }
 * -> {
 *      "answer": "...",
 *      "targetComponent": "auth-middleware",
 *      "path": ["frontend", "auth-middleware", "user-model"],
 *      "relatedComponents": ["frontend", "user-model"]
 *    }
 * All component ids are validated against the stored architecture.
 */
export const chat = asyncHandler(async (req: Request, res: Response) => {
  const question = (req.body as { question?: string }).question?.trim();
  if (!question) throw ApiError.badRequest('"question" is required');

  const project = await analysisService.getOwnedProject(String(req.params.id), req.user!.id);
  const latest = await analysisService.getLatestCompletedForProject(
    project._id.toString(),
    req.user!.id
  );
  if (!latest?.architecture) {
    throw ApiError.notFound("No completed architecture for this project yet — run an analysis first");
  }

  const result = await chatService.answerQuestion(
    { architecture: latest.architecture, metadata: (latest.metadata as never) ?? null },
    question
  );

  // Let every client in the room walk the character along the returned path.
  try {
    const { tryIO } = await import("../../infrastructure/realtime/io");
    tryIO()
      ?.to(`project:${project._id.toString()}`)
      .emit("character:explain", {
        projectId: project._id.toString(),
        question,
        targetComponent: result.targetComponent,
        path: result.path,
        relatedComponents: result.relatedComponents
      });
  } catch {
    /* socket optional */
  }

  res.status(200).json({ success: true, data: result });
});

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import { aiLimiter } from "../../shared/middleware/rate-limiter.middleware";
import { start, getAnalysis, getStatus, getArchitecture } from "./analysis.controller";

const router = Router();
const idParam = z.object({ id: z.string().min(1) });

router.use(requireAuth);

// POST /api/v1/projects/:id/analyze
router.post("/projects/:id/analyze", aiLimiter, validate({ params: idParam }), start);

// GET /api/v1/analyses/:id and /api/v1/analyses/:id/status
router.get("/analyses/:id", validate({ params: idParam }), getAnalysis);
router.get("/analyses/:id/status", validate({ params: idParam }), getStatus);

// GET /api/v1/projects/:id/architecture
router.get("/projects/:id/architecture", validate({ params: idParam }), getArchitecture);

export default router;

import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import { aiLimiter } from "../../shared/middleware/rate-limiter.middleware";
import { chat } from "./chat.controller";

const router = Router();
const idParam = z.object({ id: z.string().min(1) });
const body = z.object({ question: z.string().trim().min(2).max(500) });

router.use(requireAuth);

// POST /api/v1/projects/:id/chat
router.post("/projects/:id/chat", aiLimiter, validate({ params: idParam, body }), chat);

export default router;

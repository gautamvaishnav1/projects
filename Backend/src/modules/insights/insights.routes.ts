import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../shared/middleware/auth.middleware";
import { validate } from "../../shared/middleware/validate.middleware";
import { aiLimiter } from "../../shared/middleware/rate-limiter.middleware";
import { buildingInsight, improvementGuide } from "./insights.controller";

const router = Router();

const buildingSchema = z.object({
  building: z.object({
    id: z.string(),
    name: z.string(),
    kind: z.string(),
    loc: z.number().nonnegative().optional(),
    health: z.string().optional(),
    district: z.string().optional(),
    stack: z.string().optional(),
  }),
  connections: z
    .array(z.object({ from: z.string(), to: z.string(), kind: z.string().optional() }))
    .max(60)
    .optional(),
});

const guideSchema = z.object({
  stats: z.object({ buildings: z.number(), districts: z.number() }).optional(),
  hotspots: z
    .array(z.object({ id: z.string(), name: z.string(), kind: z.string(), loc: z.number(), health: z.string().optional() }))
    .max(30)
    .optional(),
  broken: z.array(z.object({ id: z.string(), name: z.string(), health: z.string().optional() })).max(40).optional(),
});

router.use(requireAuth);
router.post("/insights/building", aiLimiter, validate({ body: buildingSchema }), buildingInsight);
router.post("/insights/improvements", aiLimiter, validate({ body: guideSchema }), improvementGuide);

export default router;

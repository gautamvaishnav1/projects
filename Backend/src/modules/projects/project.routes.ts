import { Router } from "express";
import { z } from "zod";
import { create, list, getOne, remove } from "./project.controller";
import { validate } from "../../shared/middleware/validate.middleware";
import { requireAuth } from "../../shared/middleware/auth.middleware";
import { createProjectSchema } from "./project.validation";

const router = Router();
const idParam = z.object({ id: z.string().min(1) });

router.use(requireAuth);
router.post("/", validate({ body: createProjectSchema }), create);
router.get("/", list);
router.get("/:id", validate({ params: idParam }), getOne);
router.delete("/:id", validate({ params: idParam }), remove);

export default router;

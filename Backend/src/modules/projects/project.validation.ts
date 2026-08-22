import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
  repoUrl: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .regex(/github\.com/i, "Only GitHub repositories are supported in this MVP")
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

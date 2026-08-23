import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
  repoUrl: z
    .string()
    .trim()
    .refine(
      (v) =>
        (/^https?:\/\//i.test(v) && /github\.com/i.test(v)) || v.startsWith("demo://"),
      "Must be a GitHub repository URL (or demo:// for the bundled demo)"
    ),
  source: z.enum(["github", "demo"]).optional().default("github")
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

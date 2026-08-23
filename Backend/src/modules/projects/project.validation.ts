import { z } from "zod";

/** Accepts bare pasted forms like "github.com/owner/repo" or "www.github.com/owner/repo". */
const normalizeUrl = z.preprocess((v) => {
  if (typeof v === "string" && v.trim() && !/^https?:\/\//i.test(v.trim())) {
    return `https://${v.trim()}`;
  }
  return v;
}, z.string().trim());

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional().default(""),
  repoUrl: normalizeUrl
    .pipe(
      z
        .string()
        .url("Must be a valid URL")
        .regex(/github\.com/i, "Only GitHub repositories are supported in this MVP")
    )
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

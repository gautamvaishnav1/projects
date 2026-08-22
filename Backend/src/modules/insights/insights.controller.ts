import type { Response, NextFunction } from "express";
import { chatCompletion } from "../../infrastructure/llm/llm.client";
import { logger } from "../../shared/utils/logger";

/**
 * POST /api/v1/insights/building — deep analysis of ONE city building:
 * what it does, how its connections behave, risks, and better patterns.
 */
export async function buildingInsight(req: any & { user?: { id: string } }, res: Response, _next?: NextFunction) {
  const { building, connections = [] } = req.body as {
    building: { id: string; name: string; kind: string; loc?: number; health?: string; district?: string; stack?: string };
    connections?: Array<{ from: string; to: string; kind?: string }>;
  };
  try {
    const system =
      "You are a senior software architect explaining one file of a codebase to its developer. " +
      "The file appears as a 'building' in a 3D city visualization. Be concrete and technical. " +
      "Answer in under 180 words using this structure:\n" +
      "WHAT IT DOES — one or two sentences.\n" +
      "CONNECTIONS — how data flows through it given the callers/callees listed.\n" +
      "RISKS — failure modes, especially if health is not ok.\n" +
      "BETTER WAY — one actionable improvement (pattern, split, cache, guard).";

    const user =
      `Building: ${building.name} (${building.kind}, ${building.loc ?? "?"} LOC, health=${building.health ?? "ok"})\n` +
      `District: ${building.district ?? "?"} · stack: ${building.stack ?? "?"}\n` +
      `Connections: ${connections.map((c) => `${c.from} -> ${c.to}${c.kind ? ` [${c.kind}]` : ""}`).join("; ") || "none extracted"}\n` +
      `Explain this building.`;

    let analysis: string;
    try {
      analysis = await chatCompletion(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        0.3,
      );
    } catch {
      // LLM unavailable → deterministic fallback so the panel still teaches something
      const callers = connections.length;
      analysis =
        `WHAT IT DOOES — ${building.name} is the ${building.kind} of the ${building.district ?? "core"} district (~${building.loc ?? "?"} LOC).\n` +
        `CONNECTIONS — ${callers} link(s) touch this building.\n` +
        `RISKS — health is ${building.health ?? "ok"}${building.health && building.health !== "ok" ? ": treat this as a live incident." : "; watch its size and coupling."}\n` +
        `BETTER WAY — add tests around its public surface and keep it under ~300 LOC.`;
      analysis = analysis.replace("DOOES", "DOES");
      logger.warn("insights: LLM failed for building insight — used heuristic fallback");
    }
    res.status(200).json({ success: true, data: { analysis } });
  } catch (err) {
    logger.error("insights.buildingInsight failed", err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, message: "insight generation failed" });
  }
}

/**
 * POST /api/v1/insights/improvements — repo-wide improvement guide:
 * broken code fixes, refactors, better patterns, architecture moves.
 */
export async function improvementGuide(req: any & { user?: { id: string } }, res: Response) {
  const { stats, hotspots = [], broken = [] } = req.body as {
    stats?: { buildings: number; districts: number };
    hotspots?: Array<{ id: string; name: string; kind: string; loc: number; health?: string }>;
    broken?: Array<{ id: string; name: string; health?: string }>;
  };
  try {
    const system =
      "You are a principal engineer performing a codebase review from a city-model summary. " +
      "Produce an IMPROVEMENT GUIDE in markdown with these sections:\n" +
      "## Fix first (broken or risky)\n## Refactor (size & coupling)\n## Better patterns\n## Architecture moves\n" +
      "Every bullet must name the exact file/building and a concrete action. Under 350 words total.";

    const user =
      `City: ${stats?.buildings ?? "?"} buildings / ${stats?.districts ?? "?"} districts.\n` +
      `Broken: ${broken.map((b) => `${b.name} (${b.health})`).join(", ") || "none reported"}.\n` +
      `Biggest files: ${hotspots.map((h) => `${h.name} ${h.loc}LOC ${h.health ?? ""}`).join(", ")}.`;

    let guide: string;
    try {
      guide = await chatCompletion(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        0.35,
      );
    } catch {
      guide =
        `## Fix first\n` +
        (broken.length
          ? broken.map((b) => `- **${b.name}** — health \`${b.health}\`: reproduce, wrap with error handling, add a regression test.`).join("\n")
          : "- No broken buildings reported; keep the test suite green.") +
        `\n## Refactor\n` +
        hotspots.slice(0, 3).map((h) => `- **${h.name}** (${h.loc} LOC) — split by responsibility; extract pure helpers.`).join("\n") +
        `\n## Better patterns\n- Introduce a shared validation/schema layer at district boundaries.\n- Cache expensive queries behind the service layer.\n` +
        `\n## Architecture moves\n- Add a queue between controllers and slow external calls.\n- Define module boundaries along district lines.`;
      logger.warn("insights: LLM failed for improvement guide — used heuristic fallback");
    }
    res.status(200).json({ success: true, data: { guide } });
  } catch (err) {
    logger.error("insights.improvementGuide failed", err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, message: "guide generation failed" });
  }
}

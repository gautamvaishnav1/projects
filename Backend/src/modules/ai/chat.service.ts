import type { Architecture } from "../analysis/analysis.types";
import type { ProjectMetadata } from "../parser/parser.types";
import { chatCompletion, llmConfigured } from "../../infrastructure/llm/llm.client";
import { logger } from "../../shared/utils/logger";
import { CHAT_SYSTEM_PROMPT } from "./ai.prompts";
import { findPath, hasComponent, pickComponentForQuestion } from "./graph.util";

export interface ChatAnswer {
  answer: string;
  targetComponent: string | null;
  /** Semantic walk through the map — the frontend maps these ids to 3D positions. */
  path: string[];
  relatedComponents: string[];
}

export interface ChatContext {
  architecture: Architecture;
  metadata?: ProjectMetadata | null;
}

/**
 * Answers "How does authentication work?" style questions.
 * Component ids in the response are ALWAYS validated against the stored
 * architecture — we never emit an id that is not part of it.
 */
export async function answerQuestion(context: ChatContext, question: string): Promise<ChatAnswer> {
  const heuristic = heuristicAnswer(context, question);

  if (!llmConfigured()) return heuristic;

  try {
    const archSummary = JSON.stringify({
      components: context.architecture.components,
      connections: context.architecture.connections
    });
    const reply = await chatCompletion(
      [
        { role: "system", content: CHAT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Architecture:\n${archSummary}\n\nQuestion: ${question}`
        }
      ],
      0.3
    );

    const parsed = parseLlmChatReply(reply);
    // Validate every emitted id against the stored architecture; drop bad ones.
    const validPath = parsed.pathIds.filter((id) => hasComponent(context.architecture, id));
    const target =
      parsed.targetId && hasComponent(context.architecture, parsed.targetId)
        ? parsed.targetId
        : heuristic.targetComponent;

    let path = validPath.length > 0 ? validPath : heuristic.path;
    if (target && !path.includes(target)) {
      // stitch a walk ending at the validated target
      const anchor = path[0] ?? context.architecture.components[0]?.id ?? "";
      const stitched = anchor ? [...path, ...findPath(context.architecture, anchor, target).slice(1)] : [];
      path = stitched.length > 0 ? stitched : heuristic.path;
    }

    return {
      answer: parsed.answer.trim() || heuristic.answer,
      targetComponent: target,
      path,
      relatedComponents: unique([...path.filter((id) => id !== target), ...(target ? neighborsOf(context.architecture, target) : [])]).filter((id) =>
        hasComponent(context.architecture, id)
      )
    };
  } catch (err) {
    logger.warn("LLM chat failed, using heuristic answer", {
      error: err instanceof Error ? err.message : String(err)
    });
    return heuristic;
  }
}

/* ---------------- deterministic fallback ---------------- */

function heuristicAnswer(context: ChatContext, question: string): ChatAnswer {
  const { architecture } = context;
  if (architecture.components.length === 0) {
    return {
      answer: "This project has no analyzed components yet. Run an analysis first.",
      targetComponent: null,
      path: [],
      relatedComponents: []
    };
  }

  const target = pickComponentForQuestion(architecture, question, {
    routes: context.metadata?.routes,
    models: context.metadata?.models
  });

  const entryCandidates = ["frontend", "server-app"];
  const start =
    entryCandidates.find((id) => hasComponent(architecture, id)) ?? architecture.components[0].id;

  const path = target && target !== start ? findPath(architecture, start, target) : [start];
  const finalPath = path.length > 0 ? path : [target ?? start];

  const related = unique([
    ...(target ? neighborsOf(architecture, target) : []),
    ...finalPath.filter((id) => id !== target)
  ]).filter((id) => hasComponent(architecture, id));

  let answer: string;
  if (target) {
    const comp = architecture.components.find((c) => c.id === target)!;
    const outgoing = architecture.connections.filter((c) => c.from === target);
    const incoming = architecture.connections.filter((c) => c.to === target);
    const parts = [comp.description || `${comp.name} (${comp.type})`];
    if (outgoing.length > 0) {
      parts.push(
        `It ${outgoing
          .slice(0, 3)
          .map((c) => `${c.label} ${nameOf(architecture, c.to)}`)
          .join(", ")}.`
      );
    }
    if (incoming.length > 0) {
      parts.push(`It receives ${incoming.map((c) => c.label).join(" / ")} from upstream components.`);
    }
    const evidence = evidenceFromMetadata(context.metadata, question, target);
    if (evidence) parts.push(evidence);
    answer = parts.join(" ");
  } else {
    answer = `I could not match "${question}" to a specific component. The codebase maps to ${architecture.components.length} components such as ${architecture.components
      .slice(0, 4)
      .map((c) => nameOf(architecture, c.id))
      .join(", ")}. Try asking about one of those.`;
  }

  return {
    answer,
    targetComponent: target,
    path: finalPath.filter((id) => hasComponent(architecture, id)),
    relatedComponents: related.slice(0, 8)
  };
}

function evidenceFromMetadata(metadata: ProjectMetadata | null | undefined, question: string, target: string): string | null {
  if (!metadata) return null;
  const q = question.toLowerCase();
  const comp = metadata.models.find((m) => m.name.toLowerCase().replace(/-/g, "") === target.replace(/-/g, ""));
  if (/auth|login|token|password/.test(q) && metadata.authIndicators.jwtLibraryUsed) {
    const ev = metadata.authIndicators.evidence.find((e) => e.startsWith("jwt"));
    return `Auth signals detected in this repo: ${ev ?? "JWT usage"}${
      metadata.authIndicators.passwordHashingUsed ? ", password hashing" : ""
    }.`;
  }
  if (/data|database|model|schema|store/.test(q) && comp) {
    return `The ${comp.name} model stores ${comp.fields.slice(0, 6).join(", ") || "documents"}.`;
  }
  return null;
}

function neighborsOf(architecture: Architecture, id: string): string[] {
  const out: string[] = [];
  for (const c of architecture.connections) {
    if (c.from === id) out.push(c.to);
    else if (c.to === id) out.push(c.from);
  }
  return out;
}

function nameOf(architecture: Architecture, id: string): string {
  return architecture.components.find((c) => c.id === id)?.name ?? id;
}

function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/** Parses the structured tail lines (TARGET_COMPONENT / PATH) from an LLM chat reply. */
export function parseLlmChatReply(reply: string): {
  answer: string;
  targetId: string | null;
  pathIds: string[];
} {
  const lines = reply.split("\n").map((l) => l.trim());
  let targetId: string | null = null;
  let pathIds: string[] = [];
  const contentLines: string[] = [];

  for (const line of lines) {
    const targetMatch = line.match(/^TARGET_COMPONENT:\s*(.+)$/i);
    const pathMatch = line.match(/^PATH:\s*(.+)$/i);
    if (targetMatch) {
      const v = targetMatch[1].trim();
      targetId = v && v.toUpperCase() !== "NONE" ? v : null;
    } else if (pathMatch) {
      const v = pathMatch[1].trim();
      pathIds =
        v && v.toUpperCase() !== "NONE"
          ? v
              .split(/[,>]+/)
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
    } else if (line.length > 0) {
      contentLines.push(line);
    }
  }

  return { answer: contentLines.join("\n"), targetId, pathIds };
}

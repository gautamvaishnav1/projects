import { ApiError } from "../../shared/utils/api-error";
import { env } from "../../config/env";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export const llmConfigured = (): boolean => Boolean(env.llmApiKey);

/**
 * Minimal OpenAI-compatible chat completion client (works with OpenAI,
 * Groq, OpenRouter, Ollama, LM Studio... anything speaking /chat/completions).
 */
export async function chatCompletion(messages: ChatMessage[], temperature = 0.2): Promise<string> {
  if (!env.llmApiKey) {
    throw ApiError.internal("LLM_API_KEY is not configured");
  }
  let res: Response;
  try {
    res = await fetch(`${env.llmBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.llmApiKey}`
      },
      body: JSON.stringify({
        model: env.llmModel,
        messages,
        temperature
      }),
      signal: AbortSignal.timeout(env.llmTimeoutMs)
    });
  } catch (err) {
    throw ApiError.badGateway(
      `LLM request failed (${env.llmBaseUrl})`,
      err instanceof Error ? err.message : undefined
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw ApiError.badGateway(`LLM API error (${res.status})`, body.slice(0, 300));
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw ApiError.badGateway("LLM returned an empty response");
  return content;
}

/**
 * Robustly extracts the first JSON object/array from an LLM reply that may
 * contain prose or markdown fences around the JSON.
 */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();

  // direct parse
  try {
    return JSON.parse(trimmed);
  } catch {
    /* fall through */
  }

  // fenced block ```json ... ```
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* fall through */
    }
  }

  // first balanced { ... } scan
  const start = trimmed.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in LLM output");
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return JSON.parse(trimmed.slice(start, i + 1));
      }
    }
  }
  throw new Error("Unbalanced JSON in LLM output");
}

import { parse, type ParserPlugin } from "@babel/parser";

/**
 * Single responsibility: source code -> Babel AST. Nothing else.
 * All semantic extraction lives in ast-analyzer.ts.
 */
export interface ParsedFile {
  ast: ReturnType<typeof parse>;
}

const BASE_OPTIONS = {
  sourceType: "unambiguous" as const,
  allowReturnOutsideFunction: true,
  allowAwaitOutsideFunction: true,
  allowUndeclaredExports: true,
  attachComment: false,
  errorRecovery: false
};

function pluginsForFile(filePath: string): ParserPlugin[] {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".tsx")) return ["typescript", "jsx"];
  if (lower.endsWith(".ts")) return ["typescript"];
  // .js / .jsx / .mjs / .cjs — assume JSX possible (React projects).
  return ["jsx"];
}

/** Parses JS/JSX/TS/TSX source into a Babel AST. Throws on unrecoverable syntax errors. */
export function parseSource(code: string, filePath: string): ParsedFile {
  const plugins = pluginsForFile(filePath);
  try {
    return { ast: parse(code, { ...BASE_OPTIONS, plugins }) };
  } catch (firstError) {
    // Retry without TS/JSX plugins for exotic files (e.g. .ts containing only flow-ish code).
    if (plugins.length > 0) {
      try {
        return { ast: parse(code, { ...BASE_OPTIONS, plugins: [] }) };
      } catch {
        throw firstError;
      }
    }
    throw firstError;
  }
}

import { describe, expect, it } from "vitest";
import { parseSource } from "../src/modules/parser/babel.parser";

describe("parseSource", () => {
  it("parses TypeScript with interfaces, types and generics (.ts)", () => {
    const code = `
      interface User { id: string; age?: number }
      type Users = Array<User>;
      function first<T>(items: T[]): T | undefined { return items[0]; }
      const u: User = { id: "u1" };
    `;
    const { ast } = parseSource(code, "src/types/user.ts");
    expect(ast.program.body.length).toBeGreaterThan(0);
  });

  it("parses TSX with JSX + TypeScript (.tsx)", () => {
    const code = `
      export default function App({ name }: { name: string }) {
        return <div className="app">Hello {name}</div>;
      }
    `;
    const { ast } = parseSource(code, "src/App.tsx");
    expect(ast.program.body).toHaveLength(1);
  });

  it("parses plain JavaScript with JSX in .js files", () => {
    const code = `const el = <button onClick={() => alert(1)}>Click</button>;`;
    const { ast } = parseSource(code, "public/app.js");
    expect(ast.program.body).toHaveLength(1);
  });

  it("parses JSX in .jsx files", () => {
    const code = `function Card(){ return <p>card</p>; }`;
    const { ast } = parseSource(code, "src/Card.jsx");
    expect(ast.program.body).toHaveLength(1);
  });

  it("supports modern JS syntax (optional chaining, nullish, class fields)", () => {
    const code = `
      class Store { state = {}; #hidden = 1; }
      const v = obj?.deep?.value ?? "fallback";
    `;
    expect(() => parseSource(code, "src/store.js")).not.toThrow();
  });

  it("handles ESM and CommonJS via unambiguous sourceType", () => {
    expect(() => parseSource(`const fs = require("fs");`, "a.cjs")).not.toThrow();
    expect(() => parseSource(`import fs from "fs"; export default fs;`, "b.mjs")).not.toThrow();
  });

  it("allows top-level await", () => {
    expect(() => parseSource(`const data = await fetch("/api");`, "src/boot.mjs")).not.toThrow();
  });

  it("throws on unrecoverable syntax errors", () => {
    expect(() => parseSource(`const x = ;`, "broken.ts")).toThrow();
    expect(() => parseSource(`function {{{`, "broken.js")).toThrow();
  });

  it("produces a File AST with program node", () => {
    const { ast } = parseSource(`export const answer = 42;`, "answer.ts");
    expect(ast.type).toBe("File");
    expect(ast.program.type).toBe("Program");
  });
});

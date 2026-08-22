import { describe, expect, it } from "vitest";
import { parseSource } from "../src/modules/parser/babel.parser";
import { analyzeAST } from "../src/modules/parser/ast-analyzer";

function analyze(code: string, file = "src/sample.js") {
  const { ast } = parseSource(code, file);
  return analyzeAST(ast, file, code);
}

describe("babel parsing (JS + TS)", () => {
  it("parses plain modern JavaScript", () => {
    const facts = analyze(
      `import express from "express";
       const app = express();
       app.get("/ping", (req, res) => res.json({ ok: true }));
       export default app;`,
      "src/server.js"
    );
    expect(facts.parse.ok).toBe(true);
    expect(facts.parse.strategy).toBe("babel");
    expect(facts.imports[0].source).toBe("express");
  });

  it("parses TypeScript with interfaces, generics and decorators-free classes", () => {
    const facts = analyze(
      `import mongoose, { Schema, model } from "mongoose";

       interface IUser { email: string; passwordHash: string; }
       const userSchema = new Schema<IUser>({ email: String, passwordHash: String });
       const User = mongoose.model<IUser>("User", userSchema);

       export class UserService {
         async findByEmail(email: string): Promise<IUser | null> {
           return User.findOne({ email });
         }
         create(data: Partial<IUser>) {}
       }

       export default User;`,
      "src/models/user.model.ts"
    );
    expect(facts.parse.strategy).toBe("babel");
    expect(facts.role).toBe("model");
    expect(facts.classes.map((c) => c.name)).toContain("UserService");
    expect(facts.models).toHaveLength(1);
    expect(facts.models[0]).toMatchObject({ name: "User", collection: null });
    expect(facts.models[0].fields).toEqual(expect.arrayContaining(["email", "passwordHash"]));
    const svc = facts.classes.find((c) => c.name === "UserService")!;
    expect(svc.methods).toEqual(expect.arrayContaining(["findByEmail", "create"]));
    expect(
      facts.exports.some((e) => e.kind === "default" && e.names.includes("User"))
    ).toBe(true);
  });

  it("detects JSX and marks role as component", () => {
    const facts = analyze(
      `import React from "react";
       export function Header() {
         return <header className="top"><h1>Hello</h1></header>;
       }`,
      "src/components/Header.tsx"
    );
    expect(facts.role).toBe("component");
  });
});

describe("route extraction (the golden example)", () => {
  it('converts router.post("/login", loginUser) into the compact route JSON', () => {
    const facts = analyze(
      `import { Router } from "express";
       import { loginUser } from "../controllers/auth.controller";
       const router = Router();
       router.post("/login", loginUser);
       export default router;`,
      "src/routes/auth.routes.ts"
    );

    expect(facts.routes).toHaveLength(1);
    expect(facts.routes[0]).toEqual({
      method: "POST",
      path: "/login",
      handler: "loginUser",
      file: "src/routes/auth.routes.ts"
    });
  });

  it("expands mounted routers with prefixes", () => {
    const facts = analyze(
      `import express from "express";
       import { Router } from "express";
       const apiRouter = Router();
       apiRouter.get("/users", listUsers);
       const app = express();
       app.use("/api/v1", apiRouter);`,
      "src/app.js"
    );
    expect(facts.routes).toContainEqual({
      method: "GET",
      path: "/api/v1/users",
      handler: "listUsers",
      file: "src/app.js"
    });
  });

  it("handles chained router.route() calls and middleware arrays", () => {
    const facts = analyze(
      `const router = Router();
       router.route("/users").get(listUsers).post(createUser);
       router.delete("/users/:id", requireAuth, removeUser);`,
      "src/routes/users.routes.ts"
    );
    expect(facts.routes).toContainEqual(
      expect.objectContaining({ method: "GET", path: "/users", handler: "listUsers" })
    );
    expect(facts.routes).toContainEqual(
      expect.objectContaining({ method: "POST", path: "/users", handler: "createUser" })
    );
    const del = facts.routes.find((r) => r.method === "DELETE")!;
    expect(del.handler).toContain("requireAuth");
    expect(del.handler).toContain("removeUser");
  });

  it("collects auth evidence from jwt/bcrypt usage", () => {
    const facts = analyze(
      `import jwt from "jsonwebtoken";
       import bcrypt from "bcryptjs";
       export async function loginUser(req, res) {
         const user = await db.query(req.body.email);
         if (!bcrypt.compareSync(req.body.password, user.passwordHash)) throw new Error("nope");
         return jwt.sign({ id: user.id }, process.env.JWT_SECRET);
       }`,
      "src/controllers/auth.controller.ts"
    );
    expect(facts.authEvidence.join("\n")).toMatch(/jwt library/i);
    expect(facts.authEvidence.join("\n")).toMatch(/password hashing/i);
    expect(facts.authEvidence.join("\n")).toMatch(/jwt\.sign\(\)/i);
    expect(facts.role).toBe("controller");
    expect(facts.controllers.length).toBeGreaterThan(0);
  });
});

describe("imports / exports / functions / CJS", () => {
  it("records named/default imports and module.exports", () => {
    const facts = analyze(
      `const express = require("express");
       const { Router } = require("express");

       function health(_req, _res) {}

       module.exports = { health };`,
      "routes/legacy.routes.js"
    );
    expect(facts.imports.map((i) => i.source)).toEqual(["express", "express"]);
    expect(facts.imports[1].specifiers).toContain("Router");
    expect(facts.functions.map((f) => f.name)).toContain("health");
    expect(facts.exports[0]).toEqual({
      file: "routes/legacy.routes.js",
      names: ["health"],
      kind: "module"
    });
    expect(facts.role).toBe("routes");
  });
});

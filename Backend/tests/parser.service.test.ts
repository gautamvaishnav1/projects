import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseRepository } from "../src/modules/parser/parser.service";
import { parseGitHubUrl } from "../src/modules/repository/repo-url.util";
import { scanRepository } from "../src/modules/repository/file-scanner";

let repoDir: string;

beforeAll(() => {
  repoDir = fs.mkdtempSync(path.join(os.tmpdir(), "sw-fixture-"));
  const write = (rel: string, content: string | Buffer) => {
    const abs = path.join(repoDir, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content);
  };

  write(
    "package.json",
    JSON.stringify({
      name: "fixture-api",
      dependencies: { express: "^4.0.0", mongoose: "^8.0.0", jsonwebtoken: "^9.0.0" }
    })
  );
  write(
    "src/server.js",
    `const app = require('./app');
     app.listen(3000);`
  );
  write(
    "src/app.js",
    `const express = require("express");
     const authRoutes = require("./routes/auth.routes");
     const app = express();
     app.use(express.json());
     app.use("/api/v1", authRoutes);
     module.exports = app;`
  );
  write(
    "src/routes/auth.routes.ts",
    `import { Router } from "express";
     import { loginUser } from "../controllers/auth.controller";
     const router = Router();
     router.post("/login", loginUser);
     export default router;`
  );
  write(
    "src/controllers/auth.controller.ts",
    `import jwt from "jsonwebtoken";
     import bcrypt from "bcryptjs";
     import { User } from "../models/user.model";

     export async function loginUser(req, res) {
       const user = await User.findOne({ email: req.body.email });
       if (!user || !bcrypt.compareSync(req.body.password, user.passwordHash)) {
         return res.status(401).json({ message: "invalid credentials" });
       }
       return res.json({ token: jwt.sign({ id: user.id }, "secret") });
     }`
  );
  write(
    "src/models/user.model.ts",
    `import mongoose from "mongoose";
     const userSchema = new mongoose.Schema({ email: String, passwordHash: String });
     export const User = mongoose.model("User", userSchema);`
  );
  // junk that must be ignored
  write("node_modules/left-pad/index.js", "module.exports = () => 1;");
  write("dist/bundle.js", "console.log('built output');");
  write("coverage/report.js", "var x = 1;");
  write(".git/hooks/pre-commit.js", "#!/usr/bin/env node");
  write("public/app.min.js", "var a=1;var b=2;"); // minified -> skipped
  // a genuinely broken file that must NOT stop the run
  write("src/legacy/old-stuff.js", "function broken( {\n  this is not valid javascript at all <<<>>>");
});

afterAll(() => {
  fs.rmSync(repoDir, { recursive: true, force: true });
});

describe("full analysis pipeline (scanner + babel + fallback)", () => {
  it("scans only relevant files and ignores junk dirs", () => {
    const scan = scanRepository(repoDir);
    const rels = scan.files.map((f) => f.relPath);

    expect(rels.some((r) => r.startsWith("node_modules/"))).toBe(false);
    expect(rels.some((r) => r.startsWith("dist/"))).toBe(false);
    expect(rels.some((r) => r.startsWith("coverage/"))).toBe(false);
    expect(rels.some((r) => r.startsWith(".git/"))).toBe(false);
    expect(rels.some((r) => r.includes(".min."))).toBe(false);
    expect(rels).toContain("src/routes/auth.routes.ts");

    for (const ignored of ["node_modules", "dist", "coverage"]) {
      expect(scan.ignoredDirsHit).toContain(ignored);
    }
  });

  it("parses good files with babel, survives the broken file via fallback, builds metadata", () => {
    const outcome = parseRepository(repoDir, {
      name: "fixture-api",
      repo: "acme/fixture-api"
    });

    const { metadata } = outcome;
    expect(metadata.stats.filesConsidered).toBeGreaterThanOrEqual(5);
    expect(metadata.stats.filesParsedBabel).toBeGreaterThanOrEqual(4);
    expect(metadata.stats.filesFallback).toBeGreaterThanOrEqual(1); // old-stuff.js

    // the golden route made it through with composed mount prefix
    expect(metadata.routes).toContainEqual(
      expect.objectContaining({ method: "POST", handler: "loginUser" })
    );
    expect(metadata.routes.find((r) => r.path === "/login")).toBeTruthy();

    expect(metadata.models.map((m) => m.name)).toContain("User");
    expect(metadata.models[0].fields).toEqual(expect.arrayContaining(["email", "passwordHash"]));

    // dependencies came from package.json
    expect(metadata.dependencies.express).toBe("^4.0.0");

    // auth indicators detected
    expect(metadata.authIndicators.jwtLibraryUsed).toBe(true);
    expect(metadata.authIndicators.passwordHashingUsed).toBe(true);

    // failure report references the broken file but nothing else failed hard
    const fallbackFailure = outcome.failures.find((f) => f.strategy === "fallback");
    expect(fallbackFailure?.file).toContain("old-stuff.js");
  });
});

describe("repo url parsing", () => {
  it("accepts common GitHub URL shapes", () => {
    expect(parseGitHubUrl("https://github.com/acme/api")).toEqual({ owner: "acme", repo: "api" });
    expect(parseGitHubUrl("https://www.github.com/acme/api.git/")).toEqual({
      owner: "acme",
      repo: "api"
    });
    expect(parseGitHubUrl("git@github.com:acme/api.git")).toEqual({ owner: "acme", repo: "api" });
    const tree = parseGitHubUrl("https://github.com/acme/api/tree/develop/packages/server");
    expect(tree.owner).toBe("acme");
    expect(tree.repo).toBe("api");
    expect(tree.branch).toBe("develop/packages/server");
  });

  it("rejects non-github or malformed urls", () => {
    expect(() => parseGitHubUrl("https://gitlab.com/a/b")).toThrow();
    expect(() => parseGitHubUrl("https://github.com/only-owner")).toThrow();
  });
});

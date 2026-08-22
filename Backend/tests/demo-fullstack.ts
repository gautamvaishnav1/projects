/**
 * Demo: builds a tiny FULL-STACK fixture repo (frontend + backend + external
 * integrations), runs the real pipeline (scanner -> Babel -> analyzer ->
 * metadata -> heuristic architect) and prints the exact JSON the frontend
 * engineer receives from GET /projects/:id/architecture.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseRepository } from "../src/modules/parser/parser.service";
import { generateHeuristic } from "../src/modules/ai/architect.service";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "sw-fullstack-"));
const write = (rel: string, content: string) => {
  const abs = path.join(root, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
};

write("package.json", JSON.stringify({
  dependencies: {
    express: "^4", mongoose: "^8", jsonwebtoken: "^9", bcryptjs: "^3",
    react: "^18", axios: "^1", stripe: "^14"
  }
}));
write("server.js", `const app = require("./src/app");
app.listen(5000);`);
write("src/app.js", `const express = require("express");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/users.routes");
const app = express();
app.use(express.json());
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
module.exports = app;`);
write("src/routes/auth.routes.ts", `import { Router } from "express";
const router = Router();
router.post("/register", register);
router.post("/login", loginUser);
export default router;`);
write("src/routes/users.routes.ts", `import { Router } from "express";
const router = Router();
router.get("/me", getProfile);
router.put("/me", updateProfile);
export default router;`);
write("src/controllers/auth.controller.ts", `import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
export async function loginUser(req, res) {
  const ok = bcrypt.compareSync(req.body.password, "hash");
  return res.json({ token: jwt.sign({ id: 1 }, "s") });
}
export function register(req, res) { return res.json({ ok: true }); }`);
write("src/controllers/users.controller.ts", `export function getProfile(req, res) { return res.json(req.user); }
export function updateProfile(req, res) { return res.json({ updated: true }); }`);
write("src/services/user.service.ts", `import { User } from "../models/user.model";
export class UserService {
  async findByEmail(email: string) { return User.findOne({ email }); }
  async create(data: any) { return User.create(data); }
}`);
write("src/models/user.model.ts", `import mongoose from "mongoose";
const userSchema = new mongoose.Schema({ email: String, passwordHash: String, avatarUrl: String });
export const User = mongoose.model("User", userSchema);`);
write("src/integrations/payments.service.ts", `import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_KEY!);
export async function charge(amountCents: number) {
  return stripe.paymentIntents.create({ amount: amountCents, currency: "usd" });
}`);
write("client/src/App.tsx", `import React from "react";
import { LoginForm } from "./components/LoginForm";
export default function App() {
  return <div className="app"><LoginForm /></div>;
}`);
write("client/src/components/LoginForm.tsx", `import React, { useState } from "react";
import axios from "axios";
export function LoginForm() {
  const [email, setEmail] = useState("");
  const submit = async () => { await axios.post("/api/v1/auth/login", { email }); };
  return <form onSubmit={submit}><input value={email} onChange={(e) => setEmail(e.target.value)} /><button>Login</button></form>;
}`);

// ---- run the REAL pipeline ----
const outcome = parseRepository(root, { name: "acme-fullstack", repo: "acme/fullstack-app" });
const architecture = generateHeuristic(outcome.metadata);

console.log("=== METADATA STATS ===");
console.log(JSON.stringify(outcome.metadata.stats, null, 2));
console.log("\n=== ARCHITECTURE (what GET /projects/:id/architecture returns) ===");
console.log(JSON.stringify(architecture, null, 2));

fs.rmSync(root, { recursive: true, force: true });

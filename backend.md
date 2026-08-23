# Backend Issues & Improvement Plan

> Full audit of `Backend/` (Express + TypeScript + Mongoose + Socket.IO)
> Grouped by severity. Every issue cites exact file + line numbers.

---

## 🔴 CRITICAL

### C1. Auth bypass — full account takeover via `verify-otp`
- **File:** `src/modules/auth/auth.service.ts:82-84`
```ts
if (user.isVerified) {
  return { user: toPublicUser(user), token: issueTokenFor(user) };
}
await consumeOtp(email, "register", code); // only reached for UNverified users
```
- The early return fires **before** `consumeOtp`. Any attacker who knows a verified user's email sends `POST /api/v1/auth/verify-otp {"email":"victim@x.com","code":"000000"}` (any 6 digits pass `auth.validation.ts:16`) and receives a valid JWT for that user.
- **Fix:** reject already-verified accounts instead of issuing a token.

### C2. Repository parsing blocks the Node.js event loop end-to-end
- **Files:** `src/modules/parser/parser.service.ts:51-108` (sync `for` loop: `fs.readFileSync` :55, Babel `parseSource` :81, `analyzeAST` :84); `src/modules/repository/file-scanner.ts:90-141` (recursive sync `readdirSync`/`statSync`); invoked at `src/modules/analysis/analysis.pipeline.ts:107`
- Up to `MAX_REPO_FILES`=1500 × 256 KB parsed in one blocking stretch → HTTP + Socket.IO freeze during analysis (trivial DoS). Progress events queued inside the loop (`analysis.pipeline.ts:113-119`) all flush at the end, defeating the realtime feature.
- **Fix:** move parsing to worker threads; use async fs APIs.

### C3. Entire repo tarball buffered into memory, no size cap
- **File:** `src/infrastructure/github/github.service.ts:116-122`
```ts
buffer = Buffer.from(await res.arrayBuffer());
```
- No Content-Length check / streaming / max-bytes → multi-GB repo ⇒ OOM. Related: `fs.writeFileSync(tarPath, buffer)` at :138 stalls the loop again.
- **Fix:** stream to disk with a byte cap; check Content-Length first.

### C4. Forgeable JWTs when `JWT_SECRET` unset
- **File:** `src/config/env.ts:23` — `jwtSecret ?? "dev-only-secret-change-me"`
- Startup proceeds with a public constant; `logger.secretWarning()` (:33-36) merely warns in prod. Same silent-fallback pattern for `mongoUri` (:22) and `corsOrigins ["*"]` (:25).
- **Fix:** zod env schema, fail-fast on boot when `NODE_ENV=production`; require secret ≥ 32 chars.

### C5. CORS wildcard `*` combined with `credentials: true`
- **Files:** `src/config/env.ts:25`, `src/app.ts:21-29`, `src/server.ts:18-26` (same logic for Socket.IO)
- When origins include `"*"`, any origin is allowed with credentials — any site can make credentialed cross-origin requests. `.env.example:14` documents `CORS_ORIGINS=*`, encouraging it.
- **Fix:** explicit origin list required in prod; never combine `*` with credentials.

### C6. OAuth account takeover via silent email-based linking
- **File:** `src/modules/auth/auth.service.ts:163-197`
- `loginOrCreateFromOAuth` links Google/GitHub identity to an existing **local** account on email match alone (:174), sets `isVerified = true` (:195), mints a token (:199). Whoever controls that email at the provider takes over the pre-existing local account.
- **Fix:** require email verification / confirmation step before linking; don't silently upgrade providers (:188-190).

---

## 🟠 HIGH

### H1. JWT delivered in redirect URL query string
- `src/modules/auth/auth.controller.ts:101-102` — token leaks into browser history, proxies, access logs.
- **Fix:** one-time auth code exchange or short-lived code + httpOnly cookie.

### H2. OTP attempt counter racy + unsalted hash
- `src/modules/auth/otp.service.ts:72-84` — non-atomic read-modify-write (`record.attempts += 1; save()`); parallel guesses undercount, defeating `MAX_ATTEMPTS = 5`. Hash is plain `sha256(email:purpose:code)` (:10-12), no pepper — DB leak ⇒ offline brute force of 10⁶ space.
- **Fix:** atomic `$inc` with `maxAttempts` guard in the update filter; add HMAC pepper.

### H3. Analysis one-at-a-time guard is racy, memory-only, unrecoverable
- `src/modules/analysis/analysis.pipeline.ts:24, 39-52` — check-then-add across an await ⇒ two concurrent POSTs both run. `Set` is per-process (breaks multi-instance) and lost on restart ⇒ docs stuck `status:"running"` forever, no stale-run sweep.
- **Fix:** atomic Mongo transition (`findOneAndUpdate({status:"pending"}, {status:"running"})`) as the lock; startup sweep for stale runs.

### H4. GitHub token persisted to disk; cleanup can silently fail
- `src/infrastructure/github/github.service.ts:177-179` — token embedded in clone URL ⇒ stored in `<tmp>/repo/.git/config`. `cleanedUp()` (:162-168) swallows all errors.
- **Fix:** use token header/API download instead of URL embedding; log cleanup failures; temp dir per run with deferred cleanup.

### H5. Rate limiting: per-IP MemoryStore + unconditional `trust proxy`
- `src/shared/middleware/rate-limiter.middleware.ts:12-17, 19-42`; `src/app.ts:16` (`trust proxy = 1` hardcoded)
- Behind non-sanitizing proxy or direct access, `X-Forwarded-For` rotates limits; instances don't share counters.
- **Fix:** Redis store in prod; configurable proxy hops; keyed by user ID where authenticated.

### H6. Prod-without-SMTP bricks registration/reset; failures lied about
- `src/infrastructure/mailer/mailer.service.ts:31-38` — no SMTP ⇒ can't deliver codes in prod ⇒ users permanently unverified.
- `src/modules/auth/auth.service.ts:116, 135` — `.catch(() => ({ delivered: true }))` claims "we sent you a fresh code" even when `issueOtp` failed (e.g., cooldown error).
- **Fix:** fail fast if SMTP unset in prod; propagate real delivery status.

### H7. Weak `repoUrl` validation + duplicate-check TOCTOU race
- `src/modules/projects/project.validation.ts:10`, `project.model.ts:21-24` — `regex(/github\.com/i)` matches anywhere (`https://evil.com/?github.com` passes). Duplicate prevention is check-then-create at `project.service.ts:10-16` with `.catch(() => null)` swallowing DB errors and a **non-unique** compound index (`project.model.ts:32`).
- **Fix:** proper host validation up front; unique compound index + handle E11000.

### H8. Unbounded socket payloads + per-event DB hits
- `src/modules/realtime/socket.server.ts:86-138, 140-167`
- Every `character:move` / `character:explain` runs ownership + architecture queries (2 Mongo hits) unthrottled; `payload.path` length unbounded then broadcast room-wide. Scripted client ⇒ DB/broadcast flood.
- **Fix:** throttle per socket, cap payload size, cache ownership in socket session data.

---

## 🟡 MEDIUM

### Reusability / duplication
| # | Issue | Locations |
|---|---|---|
| M1 | `getOwnedProject` implemented twice, already diverged (length guard in one only) | `project.service.ts:31-44` vs `analysis.service.ts:8-15`; again at `socket.server.ts:32-36` |
| M2 | "Latest completed analysis" query triplicated | `analysis.service.ts:43-45`, `socket.server.ts:42-45`, `analysis.pipeline.ts:130-137` |
| M3 | `slug()` vs `slugify()` near-duplicates | `architect.service.ts:257-265` vs `architecture.schema.ts:57-65` |
| M4 | Manual re-validation duplicating zod | `chat.controller.ts:19-20` vs `ai.routes.ts:10` |
| M5 | bcrypt cost `10` hardcoded 3× | `auth.service.ts:56, 62, 151` |
| M6 | "try LLM → warn → fallback" orchestration duplicated | `architect.service.ts:23-34` vs `chat.service.ts:29-77` |
| M7 | Socket emit helper re-implemented inline (own dynamic import + bare catch) | `analysis.pipeline.ts:15-21` vs `chat.controller.ts:37-50` |
| M8 | Socket module re-implements service-layer queries | `socket.server.ts:32-51` |

### Bugs / correctness
- **M9** Dead expression: `let email = ghUser.login ? undefined : undefined;` — `oauth.service.ts:185`
- **M10** Unguarded `JSON.parse` of decoded Google id_token payload → raw 500 instead of 502 — `oauth.service.ts:129-135`
- **M11** Deprecated Google `tokeninfo` endpoint; checks `aud` but not `iss`/expiry — `oauth.service.ts:26-55`
- **M12** Config bypass: reads `process.env.PUBLIC_BASE_URL` directly and `GOOGLE_CLIENT_SECRET ?? ""` outside env.ts; `googleCodeProfile` never checks Google is configured — `oauth.service.ts:73-76, 112, :147`
- **M13** `extractJson` throws plain Errors (not ApiError) ⇒ surfaces as 500 — `llm.client.ts:80, 97, 101`
- **M14** Prompt truncation fabricates invalid JSON: `json.slice(0, 45_000) + '..."TRUNCATED"}'` — `ai.prompts.ts:22-28`
- **M15** Chat prompt embeds full architecture JSON unbounded — `chat.service.ts:32-35`
- **M16** `resendOtpSchema` accepts `purpose` field service ignores (always `"register"`) — `auth.validation.ts:34-37` vs `auth.service.ts:92-102`
- **M17** `catch (err)` declared, never used — `architect.service.ts:48`
- **M18** OAuth state cookie lacks `Secure` flag — `auth.controller.ts:60`
- **M19** Branch interpolated into codeload URL unencoded — `github.service.ts:112`
- **M20** Chat endpoint fetches project twice (ownership re-run inside second query) — `chat.controller.ts:22-26` + `analysis.service.ts:42`
- **M21** `computeChanges` counts added/removed *components* as `filesChanged` — `city.builder.ts:484-486`

### Architecture
- **M22** Six dynamic `await import(...)` dodging layer/circular-import problems — `project.service.ts:49`, `analysis.pipeline.ts:192`, `analysis.service.ts:21`, `socket.server.ts:33, 41`, `chat.controller.ts:38`
- **M23** Business orchestration in controllers — `chat.controller.ts:18-52`; response shaping duplicated inline across three handlers — `analysis.controller.ts:20-36, 39-64, 66-81`
- **M24** Inconsistent module structure: `ai` module has no validation/model files; parser-domain code lives in `repository/file-scanner.ts`; realtime split across two places with mutable global singleton — `infrastructure/realtime/io.ts:3-16`
- **M25** Two routers mounted on same prefix `/api/v1`, order-dependent matching — `app.ts:67-68`
- **M26** Deterministic builder throws 500 against its own output (`assertCityWorld` → ApiError.internal) — invariant belongs at construction — `city.builder.ts:512-575`

### Performance
- **M27** No pagination on project list — hard `limit(100)` — `project.service.ts:20`, `project.routes.ts:13`
- **M28** Missing compound index `{project, status, createdAt}` for hottest query — `analysis.model.ts:38-75`
- **M29** Six raw `Mixed` fields risk 16 MB BSON cap; whole blob shipped by every get — `analysis.model.ts:55-61`, `analysis.controller.ts:57-63, 79`
- **M30** O(n²) hot loops: `components.find` per component — `city.builder.ts:265-269, 372-374`; two full Babel traverses per file — `ast-analyzer.ts:666-700`
- **M31** Full-buffer download + sync write — `github.service.ts:122, 138`

### Type safety
- **M32** Explicit `any`: visitor type + `visitFunction` — `ast-analyzer.ts:16, 361-362`
- **M33** `as never` casts discarding zod-inferred types — `auth.controller.ts:16, 35`, `project.controller.ts:6`, `chat.controller.ts:32`
- **M34** Unsafe/double casts — `ast-analyzer.ts:19-20`, `architecture.schema.ts:54`, `analysis.pipeline.ts:179`, `user.model.ts:51`, `project.model.ts:38`
- **M35** `req.user!` non-null assertions throughout controllers — `project.controller.ts`, `analysis.controller.ts`, `chat.controller.ts:22,25`, `auth.controller.ts:136`

### Config
- **M36** Hand-rolled env with silent fallbacks for every secret/URL; no fail-fast gate — `config/env.ts:6-9, 19-44`; `PUBLIC_BASE_URL` not centralized — `oauth.service.ts:73-76`

---

## 🟢 LOW

- **L1–L6** Minor naming/dead-code nits across services (see inline TODOs).
- **L7** `@types/nodemailer` in runtime `dependencies` instead of devDependencies; v8 typings against nodemailer v9 — `package.json:24, 33`
- **L8** ESLint referenced but absent: `// eslint-disable-next-line no-console` in `src/shared/utils/logger.ts:20-24`, `src/app.ts:38`, but no ESLint config/devDependency exists — disables are dead weight, nothing enforces lint.
- **L9** Fictional default model name `gpt-5.6` — `config/env.ts:30`, `.env.example:28`

---

## ✅ Done well (keep as-is)
- `otp.model.ts:29-30` — unique `(email,purpose)` index + TTL index: correct design
- `otp.service.ts:14-19` — `crypto.timingSafeEqual` used properly for OTP comparison
- `github.service.ts:200-201` — token redaction in thrown error messages
- `error.middleware.ts:22-40, 53` — clean error taxonomy; stack traces stripped in prod
- `validate.middleware.ts` — parsed values written back onto `req`
- Parser fault-tolerance chain (Babel → analyzer → regex fallback) is sound *except* for blocking execution (C2)
- `city.builder.ts` determinism discipline (rounding, sorting, self-validation) is good engineering, just needs splitting into modules

---

## Refactoring plan (reusability)

1. **One ownership guard everywhere** — collapse `getOwnedProject` ×2 + `assertOwnsProject` into single `projectOwnershipService.assertOwned(projectId, userId)` under `modules/projects/`.
2. **Single latest-completed-analysis accessor** — `analysisService.findLatestCompletedForProject(projectId)`; back with `{project, status, createdAt}` index (M28).
3. **Type-preserving `validate()` middleware** — attach parsed output to `req.validated`; delete all `as never` casts (M33).
4. **Centralize password hashing** — export `hashPassword(pw)` / `BCRYPT_ROUNDS` from one auth util.
5. **Extract `withLlmFallback()` orchestrator** — generic wrapper replaces duplication in architect + chat services; one place to add retries/circuit-breaking.
6. **Split `city.builder.ts` (582 lines)** → `district.layout.ts`, `tech.detect.ts`, `connection.style.ts`, `changes.diff.ts`, `validation.ts`.
7. **Split `ast-analyzer.ts` (~800 lines)** along existing comment banners → `role.detector.ts`, `route.extractor.ts`, `mongoose.extractor.ts`, `module.graph.ts`.
8. **Kill dynamic imports** by fixing dependency direction; reserve dynamic import only for heavy pipeline entry.
9. **One realtime emit utility** — promote `emitToProject` to `infrastructure/realtime/io.ts`; reuse in chat controller.
10. **Zod env validation, fail-fast** — mandatory secrets in prod, explicit CORS origins, centralized `PUBLIC_BASE_URL`.

---

## Priority fix order

1. **C1** — auth bypass (one-line logic fix, highest impact)
2. **C3/C2** — tarball size cap + worker-thread parsing (DoS class)
3. **C4/C5** — zod env gate + explicit CORS
4. **C6/H1/H2** — OAuth linking confirmation, token out of URL, atomic OTP attempts
5. H3–H8, then refactoring items 1–3 (smallest effort, largest dedup payoff)

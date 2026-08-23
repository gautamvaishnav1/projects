# Frontend Lint Issues Report

> Generated: 2026-08-23 · Command: `npm run lint` (`eslint .`) · **47 problems: 45 errors, 2 warnings**

All checks that pass: `tsc -b` typecheck ✅ · `vite build` ✅ (bundle 1.67 MB, chunk-size warning only).
This document lists every ESLint error/warning with location, cause, and suggested fix.

---

## Summary by rule

| Rule | Count | Severity | Category |
| :--- | ---: | :--- | :--- |
| `@typescript-eslint/no-explicit-any` | 20 | error | Typing |
| `react-hooks/purity` | 10 | error | React Compiler (impure render) |
| `react-hooks/immutability` | 7 | error | React Compiler (mutation) |
| `react-hooks/refs` | 3 | error | React Compiler (ref misuse) |
| `react-refresh/only-export-components` | 3 | error | Fast Refresh |
| `react-hooks/set-state-in-effect` | 1 | error | React Compiler |
| `prefer-const` | 1 | error | Style (auto-fixable) |
| `react-hooks/exhaustive-deps` | 2 | warning | Hooks deps |

## Summary by file

| File | Errors | Warnings |
| :--- | ---: | ---: |
| `src/three/People.tsx` | 14 | 1 |
| `src/three/Atmosphere.tsx` | 13 | 0 |
| `src/three/Traffic.tsx` | 6 | 0 |
| `src/pages/landing/ui.tsx` | 4 | 0 |
| `src/three/Precipitation.tsx` | 3 | 0 |
| `src/three/Wet.tsx` | 3 | 0 |
| `src/components/AuthModal.tsx` | 1 | 0 |
| `src/three/Lightning.tsx` | 1 | 0 |
| `src/ui/HUD.tsx` | 0 | 1 |

---

## 1. `src/components/AuthModal.tsx`

### [E] 59:7 — `react-hooks/immutability`
```ts
window.location.href = oauthStartUrl(provider);
```
**Why:** Assigning to a value defined outside the component is treated as an illegal mutation.
**Fix:** Use `window.location.assign(oauthStartUrl(provider))`.

---

## 2. `src/pages/landing/ui.tsx`

### [E] 5:17, 26:17, 43:17 — `react-refresh/only-export-components` (×3)
Files export constants/helpers alongside components, which breaks HMR fast-refresh boundaries.
**Fix:** Move shared constants/functions into a separate module (e.g. `ui.constants.ts`) and import them.

### [E] 299:7 — `react-hooks/set-state-in-effect`
```ts
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  staticAll.current = true;
  setN(TT_LINES.length);   // ← setState called synchronously in effect body
  return;
}
```
**Why:** Synchronous setState inside an effect causes cascading renders.
**Fix:** Derive the value during render instead (e.g. initialize state lazily via `useState(() => reduced ? TT_LINES.length : N)`), or move the call into the animation/timer callback already present in the effect.

---

## 3. `src/three/Atmosphere.tsx`

### [E] 12:27, 49:15, 75:51 — `no-explicit-any` (×3)
**Fix:** Replace `any` with proper Three.js types (`THREE.Object3D`, `THREE.FogExp2`, custom event payload types).

### [E] 25:71/106/129/163/191 — `react-hooks/purity` (×5)
```ts
const clouds = useMemo(() => Array.from({ length: 9 }, () => ({
  x: (Math.random() - .5) * 260, y: 53 + Math.random() * 5, ...
})), []);
```
**Why:** `Math.random()` during render makes output non-deterministic across re-renders.
**Fix:** Generate positions outside render (module-level seeded generator, e.g. mulberry32) or memoize once via a lazy ref pattern; a seeded PRNG keeps visuals stable and satisfies the compiler.

### [E] 27:12 — `react-hooks/immutability`
The `useFrame((_, dt) => {...})` callback mutates `scene`, hook results (`cloudMat`, `shadowMat`) and calls setState (`setRainLevel`). R3F's frame loop legitimately mutates objects, but the React Compiler can't prove safety.
**Fix:** Wrap mutating logic so values come from refs created inside the same effect/hook, or suppress per-line with `// eslint-disable-next-line react-hooks/immutability` plus a comment documenting R3F's imperative contract.

### [E] 48:66 — `react-hooks/immutability`
```ts
const fog = scene.fog as THREE.FogExp2; fog.color.copy(tmp); fog.density = ...
```
**Fix:** Same as above — treat as intentional R3F imperative mutation; annotate/suppress.

### [E] 49:6 — `react-hooks/immutability`
```ts
(scene as any).environmentIntensity = 0.1 + day * 0.7;
```
**Fix:** Type the scene via module augmentation instead of `as any`, then keep under immutability suppression.

### [E] 56:5, 57:5 — `react-hooks/immutability` (×2)
```ts
cloudMat.opacity = 0.16 + ENV.cloud * 0.25;
shadowMat.opacity = ENV.cloud * 0.2 + ENV.wet * 0.08;
```
**Fix:** Hold materials in `useRef` and mutate through `.current` inside `useFrame` (refs are exempt), or suppress as intentional.

---

## 4. `src/three/Lightning.tsx`

### [E] 24:37 — `react-hooks/refs`
```ts
const strikeRef = useRef(strike); strikeRef.current = strike;   // write during render
```
**Fix:** Move the assignment into an effect:
```ts
useEffect(() => { strikeRef.current = strike; });
```

---

## 5. `src/three/People.tsx`

### [E] 21:25, 35:74, 62:45, 73:25, 77:86, 91:25, 109:34, 121:51/67/81, 123:38/54 — `no-explicit-any` (×12)
Largest single source of errors. GLTF/animation-map payloads are untyped.
**Fix:** Define narrow types for the loaded model parts (`THREE.Group`, `THREE.AnimationAction`, skeleton bone names) or use `satisfies`/generics on the drei loader result.

### [E] 35:57 — `react-hooks/immutability`
```ts
if (clip && actions[clip]) { actions[clip].play(); (actions[clip] as any).timeScale = 1; }
```
**Fix:** Call `play()`/set `timeScale` from a `useEffect` (side effects belong there), not inside `useMemo`. This also removes the need for the `as any` cast.

### [E] 72:9 — `prefer-const` (auto-fixable)
`let outfit` is never reassigned → change to `const`. Fixed by `eslint --fix`.

### [W] 83:6 — `react-hooks/exhaustive-deps`
`useMemo` missing dependency `seed`.
**Fix:** Add `seed` to the dependency array (positions should regenerate when seed changes).

---

## 6. `src/three/Precipitation.tsx`

### [E] 9:114/152/184 — `react-hooks/purity` (×3)
```ts
const mk = (n: number) => { const a = new Float32Array(n*3);
  for (...) { a[i] = (Math.random()-.5)*230; a[i+1] = Math.random()*60; a[i+2] = (Math.random()-.5)*230; } return a; };
const rPos = useMemo(() => mk(2200), []), sPos = useMemo(() => mk(1400), []);
```
**Why:** Helper calling `Math.random()` invoked from render.
**Fix:** Move `mk` to a module-scope function (outside the component). Module-level pure-ish helpers are still flagged only when called during render — the cleanest pass is a seeded PRNG helper at module scope, then call it inside the existing `useMemo`s.

---

## 7. `src/three/Traffic.tsx`

### [E] 28:16 & 28:17 — `react-hooks/refs` (×2)
```ts
const done = useRef(false);
if (color && !done.current) {        // read+branch on ref during render
  cloned.traverse(...); done.current = true;
}
```
**Why:** Reading/branching on `ref.current` during render.
**Fix:** Convert to state-free one-time init via lazy `useState` initializer, or perform the traverse in a `useEffect` guarded by the same condition:
```ts
useEffect(() => {
  if (!color || done.current) return;
  done.current = true;
  cloned.traverse(...);
}, [color, cloned]);
```

### [E] 19:57/82, 29:25, 57:65 — `no-explicit-any` (×4)
**Fix:** Type traversal callbacks as `THREE.Object3D` and narrow with `instanceof THREE.Mesh`.

---

## 8. `src/three/Wet.tsx`

### [E] 13:24 — `no-explicit-any`
**Fix:** Replace with concrete layout type import.

### [E] 18:70 & 18:162 — `react-hooks/purity` (×2)
```ts
const puddles = useMemo(() => {
  L.roads.forEach((r) => { for (let i = 0; i < 3; i++) {
    const t = Math.random(), ..., off = (Math.random()-.5) * r.w * .6; ...
```
**Fix:** Seeded PRNG (module scope) replacing both `Math.random()` calls, keeping determinism per layout `L`.

---

## 9. `src/ui/HUD.tsx`

### [W] 454:6 — `react-hooks/exhaustive-deps`
`useEffect` missing deps `LAYOUT.buildings` and `LAYOUT.districts`.
**Fix:** Add them to the dep array if `LAYOUT` can change; if it is a true module constant, add an inline comment or destructure once to satisfy the linter without runtime cost.

---

## Recommended fix strategy (in order)

1. **Quick wins (auto/mechanical):** `prefer-const` (`--fix`), `window.location.assign()`, move `strikeRef` write into effect, fix both `exhaustive-deps` warnings → clears ~5 problems.
2. **Typing sweep (~20 errors):** replace `any` in People/Traffic/Wet/Atmosphere with Three.js types — no behavior change, biggest single-rule reduction.
3. **Purity (~10 errors):** introduce one small seeded PRNG util (e.g. `lib/rng.ts`, mulberry32) and use it in Atmosphere/Precipitation/Wet — also makes visuals deterministic across reloads.
4. **Immutability/refs (~10 errors):** move side effects out of `useMemo`/render into `useEffect`/`useFrame` where possible; for genuine R3F imperative mutations (scene/fog/materials in frame loop), document intent and use targeted line-level disables — this is the accepted pattern for react-three-fiber codebases running the React Compiler lint rules.
5. **Fast refresh (3 errors):** extract constants from `landing/ui.tsx` into its own module.

After steps 1–3 the error count drops from **45 → ~10**, all confined to documented R3F imperative patterns.

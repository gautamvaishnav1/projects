# 🏙 CodeCity AI

Your codebase as a living 3D neon city. Files are buildings (height = LOC), districts are app layers,
roads carry request traffic, underground pipes are DB queries — and a follow-cam rides a request
through the whole stack. Built for hackathon demos.

**Stack:** Vite · React 19 · TypeScript · react-three-fiber v9 · drei · postprocessing bloom · zustand · Tailwind v4

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

## 30-second demo script

1. Page loads → cinematic fly-in over the city.
2. Hit **RUN LOGIN** → follow-cam rides a car from `Login.jsx` across the bridge into backend services → database.
3. Toggle **🟡/🔴 latency** → cars slow down and recolor citywide.
4. Hit **FAIL PAYMENT** → payment car stops mid-route, red beacon + roadblock appears on `paymentController.js`,
   a notification flies you to the culprit when clicked.
5. Click any building → inspector shows functions; click a function → AI-style plain-English explanation.
6. Press **U** → ground fades, glowing query pipes reveal which service reads/writes which collection.
7. Press **K** → toggle the connection arcs (HTTP cyan / imports violet / queries green).

## Controls

| Input | Action |
|---|---|
| Drag / scroll | Orbit & zoom |
| `/` | Focus search |
| `Enter` | Run login flow |
| `T` / `U` / `K` / `F` | Traffic / underground pipes / links / follow-cam |
| `Esc` | Deselect |

## Architecture

```
src/
  data/sampleCity.ts    CityJSON contract (districts → buildings → functions, edges, flows)
  lib/layout.ts         deterministic grid layout: zones, ring roads, highways, bridge, trees
  lib/city.ts           built LAYOUT singleton
  lib/windows.ts        procedural emissive window textures per building
  store/useCity.ts      zustand: selection, camera focus, sim state (latency/failure), toasts
  three/
    CityScene.tsx       Canvas, lights, stars/moon/grid, bloom composer
    Buildings.tsx       district plates + window-lit buildings (beacon towers, chimneys)
    Infrastructure.tsx  roads, bridge, animated water river, instanced decor, pipes
    Connections.tsx     bezier arcs per CityJSON edge + traveling packets on select
    Traffic.tsx         cars on CatmullRom flows, pedestrians, failure scenario props
    CameraRig.tsx       intro flyover, fly-to focus, follow-cam
  ui/HUD.tsx            search, district nav chips, telemetry, inspector, legend, shortcuts
```

The static `CityJSON` in `data/` stands in for the analyzer's output — wiring the live SDK only
replaces the data source; nothing in the 3D layer changes.

> Legacy first-prototype sources are preserved in `_legacy_src/` (excluded from build/lint).

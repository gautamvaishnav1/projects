# CodeCity AI 3D World — Documentation & Architecture

## 1. System Overview

**CodeCity AI 3D World** is a cyberpunk SaaS component that transforms software system architecture into an interactive 3D isometric visual city, built entirely in **TypeScript + React + Redux Toolkit**.

### Core Highlights:
- **3-Section Layout**: Left Sidebar (280px), Top Bar (60px), Center Canvas (full viewport)
- **All features live inside `src/`** — Hybrid architecture where `src/app/` mirrors Next.js App Router conventions while remaining fully Vite-compatible
- **Redux Toolkit State**: `authSlice` + `citySlice` for all reactive state
- **Pure TypeScript**: Zero `.js` / `.jsx` files — all `.ts` / `.tsx`

---

## 2. Hybrid Folder Structure (Everything inside `src/`)

```
frontend/
├── src/                            ← ALL source code lives here
│   │
│   ├── app/                        ← Next.js App Router convention (hybrid)
│   │   └── world/
│   │       └── page.tsx            ← /app/world/page — Main 3D World SaaS Page
│   │
│   ├── components/                 ← All reusable React components
│   │   ├── AuthPortal.tsx          ← Cyberpunk auth gate (GitHub/Google/OTP)
│   │   ├── Building.tsx            ← 3D Isometric Building (SVG geometry, 3 faces)
│   │   ├── District.tsx            ← District zone (neon border, Framer Motion zoom)
│   │   ├── FilterBar.tsx           ← Sidebar filter buttons + search input
│   │   ├── Header.tsx              ← Top 60px navigation bar
│   │   ├── IsometricBuilding.tsx   ← Legacy isometric building (kept for reference)
│   │   ├── IsometricCityMap.tsx    ← Legacy city map canvas (kept for reference)
│   │   ├── LeftSidebar.tsx         ← Legacy 280px sidebar (kept for reference)
│   │   ├── RightDrawer.tsx         ← Building inspector slide-over panel
│   │   ├── TelemetryCard.tsx       ← Neon glassmorphism telemetry card
│   │   └── UndergroundPipelines.tsx ← Subterranean data pipeline layer
│   │
│   ├── store/                      ← Redux Toolkit state management
│   │   ├── authSlice.ts            ← Auth state (user, OTP, isAuthenticated)
│   │   ├── citySlice.ts            ← City state (repo, selectedNode, transform, filters)
│   │   └── index.ts                ← Store root + typed hooks
│   │
│   ├── data/
│   │   └── mockRepoData.ts         ← Mock repo dataset + ISLAND_SECTORS config
│   │
│   ├── types/
│   │   └── codecity.ts             ← Shared TypeScript interfaces & types
│   │
│   ├── App.tsx                     ← Root app (AuthPortal gate → CodeCity3DWorldPage)
│   ├── index.css                   ← Tailwind + cyberpunk custom CSS utilities
│   └── main.tsx                    ← React DOM entry point
│
├── documentation.md
├── index.html
├── package.json
├── tsconfig.app.json
└── vite.config.ts
```

> **Hybrid Approach**: `src/app/world/page.tsx` follows the Next.js App Router file-system routing convention. When migrating to Next.js, move `src/app/` → root `app/` and all imports resolve identically. No rewrites needed.

---

## 3. Component Reference

| File | Role | Key Props |
| :--- | :--- | :--- |
| `src/app/world/page.tsx` | Full 3-section SaaS page (Top Bar, Left Sidebar, Center Canvas + inspector) | Redux dispatchers via `useAppDispatch` |
| `src/components/District.tsx` | District zone with neon SVG border, header badge, Framer Motion click zoom | `sector`, `nodes`, `selectedNode`, `onSelectNode`, `onDistrictClick` |
| `src/components/Building.tsx` | 3D SVG isometric building — top/left/right faces, antenna, risk alert badge | `node`, `isSelected`, `onSelectNode` |
| `src/components/TelemetryCard.tsx` | Glassmorphism stat card with per-color neon border glow | `title`, `value`, `subtext`, `icon`, `glowColor`, `riskAlert` |
| `src/components/FilterBar.tsx` | District filter pill buttons + search bar | `selectedSector`, `onSelectSector`, `searchQuery`, `onSearchChange`, `sectorCounts` |
| `src/components/UndergroundPipelines.tsx` | Animated SVG subterranean data conduits | `visible` |
| `src/components/RightDrawer.tsx` | Building inspector slide-over (code preview, AI insights) | `node`, `edges`, `onClose` |
| `src/components/AuthPortal.tsx` | Cyberpunk auth gate with GitHub/Google/Email+OTP flows | Redux `authSlice` |

---

## 4. Redux Slices

### `src/store/authSlice.ts`
| Field | Type | Description |
| :--- | :--- | :--- |
| `user` | `UserProfile \| null` | `{ id, name, email, avatar, provider }` — defaults to `gautamvaishnav0305` |
| `isAuthenticated` | `boolean` | Gates the 3D world view (defaults `true`) |
| `otpCode` | `string[6]` | 6-digit PIN input array |
| `otpTimeRemaining` | `number` | 60s countdown timer |
| `step` | `'form' \| 'otp'` | Auth flow step |

### `src/store/citySlice.ts`
| Field | Type | Description |
| :--- | :--- | :--- |
| `currentRepo` | `RepoDataset` | Active repo + all nodes/edges/stats |
| `selectedNode` | `CityNode \| null` | Currently selected building |
| `transform` | `MapViewTransform` | `{ zoom, panX, panY, rotateX, rotateZ, isTopDown, showPipelines, showTraffic }` |
| `filters` | `FilterState` | `{ selectedSector, securityFilter, searchQuery }` |

---

## 5. Visual Spec — 8 District Zones

| District | Neon Border | Buildings |
| :--- | :--- | :--- |
| FRONTEND DISTRICT | `#00F0FF` cyan | `App.tsx`, `Hooks.ts`, `Components.tsx` |
| BACKEND DISTRICT | `#A855F7` purple | `authController.js`, `routes.ts`, `services.ts` |
| DATABASE CITADEL | `#00FF88` green | `UsersSilo`, `ProductsSilo` (cylindrical) |
| AUTHENTICATION FORT | `#FFB800` amber | `AuthFortCastle` (medieval battlements) |
| INFRASTRUCTURE CORE | `#3B82F6` blue | `DockerGrid` |
| MONITORING CENTER | `#06B6D4` cyan | `SatelliteRadar` |
| EXTERNAL SERVICES | `#FB7185` red | Mountain + highway tunnel |
| FILE SYSTEM DEPOT | `#FEF08A` yellow | Storage hangar vault |

**Central API Gateway Hub**: Purple ring `#A855F7` + 6 dashed neon highway roads connecting all districts with floating label overlays (`Verify JWT Fort`, `Query User Silo`, `Invalidate Cache`, `Docker Deploy`).

**Subterranean Layer**: DATA PIPELINE (cyan) · CACHE LAYER (amber) · EVENT QUEUE (purple) · NETWORK LAYER (green)

---

## 6. Scale Roadmap (Post-MVP)

1. **Next.js Migration**: Move `src/app/` → root `app/` — zero import rewrites
2. **Multi-Repo Mode**: Split-screen 3D comparison between envs
3. **WebGL Renderer**: Three.js mode for repos >10,000 files
4. **Live WebSocket Sync**: Real-time building height updates on git push
5. **CI/CD Visualization**: Build status and test coverage on district rooftops

---

## 7. Build & Dev Commands

```bash
# Development server
npm run dev

# Production build
npm run build
```

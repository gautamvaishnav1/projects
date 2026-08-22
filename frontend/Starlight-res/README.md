# Starlight-res — CodeCity AI Asset Library

All 3D assets for **CODECITY AI** ("Turn code into a world you can explore").
**1,250 GLB models validated ✅ · all free licenses (CC0 / CC-BY) + procedurally generated · zero paid assets.**

---

## 📁 Structure

```
Starlight-res/
├── buildings/
│   ├── commercial/     41 GLB + textures   offices, shops  → 🏢 Building (file)
│   └── suburban/       40 GLB + textures   houses          → small modules
├── industrial/         25 GLB + textures   chimneys! tanks → 🏭 Factory (service)
│                                            warehouses    → 📦 DB collection
├── roads/              95 GLB + textures   straights, curves,
│                       intersections, bridges, traffic lights,
│                       construction barriers (!) → 🛣 Road / ⚠ blocked road
├── vehicles/           50 GLB              taxi, ambulance, tractor…
│                                            → 🚗 Car (HTTP request)
├── characters/         18 GLB              blocky people   → 🚶 Users/devs
├── nature/             329 GLTF            trees, rocks, water tiles → decor
├── models/threejs-examples/  7 GLB         animated people, ferrari, world
├── models/generated/   47 GLB ✨ procedural PBR models built by this repo's
│                       generator — API spire, hero bridge, latency cars…
├── hdri/               2 HDR               sky environments
├── textures/           8 JPG (1k)          asphalt/grass/concrete diffuse+normal
├── preview.html        orbit-viewer for models/generated/
├── _tools/generator/   Node model factory (three.js GLTFExporter)
├── _packs/zips/        original download archives (safe to delete later)
└── _packs/extracted/   full unzipped packs incl. FBX/OBJ variants
```

## 🎯 CodeCity element → asset mapping

| Element | Use | Files |
|---|---|---|
| 🏢 Building = file | height ∝ LOC | `buildings/commercial/building-a…u.glb`, `buildings/suburban/*.glb` |
| 🏭 Factory = service | pink tint | `industrial/building-*.glb` + `industrial/chimney-*.glb` |
| 📦 Warehouse = DB | wide green metal | `industrial/detail-tank.glb`, big industrial buildings |
| 🗼 External API | cyan glass spire | tallest commercial towers (`building-e` etc.) |
| 🟥 Failing module | red emissive material swap | any building + error state |
| 🛣 Road = dependency | grid tiles | `roads/road-straight/bend/curve/intersection*.glb` |
| 🌉 Bridge = FE↔BE over river | | `roads/road-bridge.glb`, `roads/bridge-pillar*.glb`, or `nature/bridge_*_stone.glb` |
| 🚧 Blocked road (FAIL PAYMENT) | | `roads/construction-barrier.glb`, `construction-fence.glb`, `road-sign-warning.glb` |
| 🚗 Car = HTTP request | color = latency | `vehicles/taxi.glb`, `ambulance.glb`… or `models/threejs-examples/ferrari.glb` |
| 🚶 People = users | walk sidewalks | `models/threejs-examples/Soldier.glb` / `Xbot.glb` (**animated: idle/walk/run**), `characters/*.glb` (static blocky) |
| ⚡ Lightning / 🌧 rain | procedural shaders | no asset needed (Bloom + particles) |
| 🌦 Sky = system health | HDRI swap | `hdri/venice_sunset_1k.hdr` (healthy) ↔ `hdri/dikhololo_night_1k.hdr` (incident/night) |
| Ground | planes + texture | `textures/asphalt_diff_1k.jpg` (+ normal), `grass_diffuse_1k.jpg`, `concrete_diff_1k.jpg` |

## 🛠 Generated models (procedural, PBR)

Built headlessly with three.js + GLTFExporter — no textures, pure PBR materials
(metalness/roughness variation, emissive accents, transparent glass) → small fast files.
**Conventions:** ground = `y=0` · units ≈ meters · vehicles face **+Z** · CodeCity color language enforced (pink=service · green=DB · cyan=API · red=error).

| Tier | Models |
|---|---|
| Landmarks | `tower-api` (glass spire+antenna) · `bridge-hero` (suspension+cables+hangers) · `data-center-cube` · `broadcast-mast` · `crane-construction` |
| Buildings | `factory-service` (pink, chimneys) · `warehouse-db` (green, dock doors) · `office-tower-a/b/c` · `server-farm` |
| Request fleet | `car-request-fast/mid/slow/pending` (latency colors) · `car-idle` · `delivery-truck` · `bus` · `ambulance` · `tow-truck` · `news-helicopter` |
| Street | `lamp-single/double` · `traffic-light` · `bus-stop` · `bench` · `hydrant` · `trash-bin` · `mailbox` · `phone-booth` · `kiosk` · `fountain` |
| Micro props | `cone-cluster` · `road-barrier` · `warning-sign` · `bollard` · `manhole` · `rooftop-ac` · `water-tank` · `fire-escape` · `satellite-dish` · `antenna-whip` · `billboard` · `planter` · `crates-stack` · `server-rack` · `transformer-box` |

Regenerate / extend:

```bash
cd _tools/generator && npm i && node generate.mjs   # writes models/generated/*.glb + manifest.json
```

Add a model: write a builder fn in `builders/t*.mjs`, register it in `generate.mjs`.

Preview locally (ES modules need a server):

```bash
cd Starlight-res && npx serve .    # then open http://localhost:3000/preview.html
```

Runtime-only effects (stay as R3F shaders on purpose): rain 🌧 · lightning flash ⚡ · river water 🌊 · window flicker.

## 🔑 R3F quick start

```tsx
import { useGLTF } from '@react-three/drei'

// static building — put in /public/models/
const building = useGLTF('/models/buildings/commercial/building-e.glb')

// animated pedestrian (clips: idle, run, TPose)
const { scenes, animations } = useGLTF('/models/soldier.glb')
```

Notes:
- **GLB is the format to use everywhere** (every pack ships it). FBX/OBJ copies live in `_packs/extracted/` if ever needed.
- Kenney city-kit GLBs use a shared texture atlas — keep the `.png` files next to the models.
- `nature/` uses camelCase GLTF+bin+textures (three.js GLTFLoader handles it fine; keep files together).
- `Soldier.glb`/`Xbot.glb` need `@draco` not required — plain GLB, but `LittlestTokyo.glb` is **DRACO-compressed** (needs DRACOLoader).
- Scale tip: Kenney city kits share a common grid so buildings + roads snap together cleanly.

## 📜 Licenses

| Source | License | Where |
|---|---|---|
| Kenney (city kits, car kit, blocky chars, nature) | **CC0** (public domain) | `LICENSE-kenney.txt` per folder |
| three.js example models | CC-BY (attribution to original authors, see repo `examples/models` README) | Soldier by mixamo/quaternius port, Ferrari by vinceeno, LittlestTokyo by Glen Fox, birds by mirada |
| Poly Haven HDRIs + textures | **CC0** | polyhaven.org |
| `models/generated/*` + generator code | yours — no license needed | built by `_tools/generator` |

Attribution suggestion for your hackathon page:
> Models: Kenney.nl (CC0) · Poly Haven (CC0) · three.js examples (CC-BY) · CodeCity procedural set

## ✅ Validation

All `.glb` files JSON-chunk validated programmatically (2026-08-22): 1,203 downloaded + 47 generated = **1,250 OK / 0 bad**.

import type { CityJSON, Stack, Kind, BuildingNode, DistrictNode } from "../types";

export interface LaidBuilding extends BuildingNode {
  pos: [number, number, number];
  h: number;
  color: string;
  stack: Stack;
  districtId: string;
  districtName: string;
}
export interface LaidDistrict extends DistrictNode {
  center: [number, number];
}
export interface RoadSeg {
  a: [number, number];
  b: [number, number];
  w: number;
  kind: "road" | "highway" | "bridge";
}
export interface Dash {
  p: [number, number];
  rot: number;
}
/** 3D waypoint chain (x, y, z) a car follows; y lifts it onto the bridge deck. */
export type Waypoint = [number, number, number];
export interface CityLayout {
  buildings: LaidBuilding[];
  districts: LaidDistrict[];
  roads: RoadSeg[];
  bridges: number[];
  trees: [number, number][];
  lamps: [number, number][];
  people: { a: [number, number]; b: [number, number] }[];
  pipes: RoadSeg[];
  dashes: Dash[];
  flowPaths: Record<string, Waypoint[]>;
  byId: Map<string, LaidBuilding>;
}

export const KIND_COLOR: Record<Kind, string> = {
  page: "#38bdf8",
  component: "#7dd3fc",
  context: "#818cf8",
  route: "#fbbf24",
  controller: "#fb923c",
  service: "#f472b6",
  middleware: "#facc15",
  model: "#34d399",
  api: "#22d3ee",
};

const ZONE: Record<Stack, [number, number]> = {
  frontend: [-42, -8],
  backend: [42, -8],
  database: [0, 56],
  external: [0, 94],
};

const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ─── lane helpers ────────────────────────────────────────────────────────────
const ROAD_Y = 0.18;
const BRIDGE_Y = 0.96;
/** right-hand-traffic: shift every leg of the polyline sideways by `off` */
function lane(pts: Waypoint[], off = 0.75): Waypoint[] {
  const rights: [number, number][] = [];
  const shifted: Waypoint[][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const dx = b[0] - a[0];
    const dz = b[2] - a[2];
    const len = Math.hypot(dx, dz) || 1;
    // right-hand normal in XZ
    rights.push([(-dz / len) * off, (dx / len) * off]);
    shifted.push([
      [a[0] + rights[i][0], a[1], a[2] + rights[i][1]],
      [b[0] + rights[i][0], b[1], b[2] + rights[i][1]],
    ]);
  }
  const out: Waypoint[] = [shifted[0][0]];
  for (let i = 1; i < shifted.length; i++) {
    const prevEnd = shifted[i - 1][1];
    const curStart = shifted[i][0];
    out.push([(prevEnd[0] + curStart[0]) / 2, prevEnd[1], (prevEnd[2] + curStart[2]) / 2]);
  }
  out.push(shifted[shifted.length - 1][1]);
  return out;
}

const P = (x: number, z: number, y: number = ROAD_Y): Waypoint => [x, y, z];

export function buildLayout(city: CityJSON): CityLayout {
  const rnd = mulberry(1337);
  const buildings: LaidBuilding[] = [];
  const districts: LaidDistrict[] = [];
  const roads: RoadSeg[] = [];
  const trees: [number, number][] = [];
  const lamps: [number, number][] = [];
  const people: { a: [number, number]; b: [number, number] }[] = [];
  const pipes: RoadSeg[] = [];
  const dashes: Dash[] = [];
  const counters: Record<string, number> = {};

  city.districts.forEach((d) => {
    const [zx, zz] = ZONE[d.stack];
    const i = (counters[d.stack] = (counters[d.stack] ?? -1) + 1);
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = d.stack === "database" || d.stack === "external" ? zx : zx + (col - 0.5) * 26;
    const cz =
      d.stack === "database" || d.stack === "external"
        ? zz
        : zz + (row - 0.5) * 24 + (i > 3 ? 24 : 0);
    districts.push({ ...d, center: [cx, cz] });

    d.buildings.forEach((b, bi) => {
      let x: number, z: number;
      if (d.stack === "database") {
        x = (bi - (d.buildings.length - 1) / 2) * 8;
        z = 0;
      } else {
        x = ((bi % 3) - 1) * 6.5;
        z = (Math.floor(bi / 3) - 0.5) * 7;
      }
      // height = size (LOC) modulated by code complexity, so a hot file
      // visibly towers over its neighbours even at equal line count
      const cpx = (b.complexity ?? 25) / 100;
      const h = 2 + Math.min(9, b.loc / 25) * (0.65 + cpx);
      buildings.push({
        ...b,
        pos: [cx + x, 0, cz + z],
        h,
        color: b.health === "ok" ? KIND_COLOR[b.kind] : "#e30613",
        stack: d.stack,
        districtId: d.id,
        districtName: d.name,
      });
    });

    if (d.stack !== "database") {
      const R = 11;
      const D = 9; // ring road
      roads.push(
        { a: [cx - R, cz - D], b: [cx + R, cz - D], w: 2.5, kind: "road" },
        { a: [cx - R, cz + D], b: [cx + R, cz + D], w: 2.5, kind: "road" },
        { a: [cx - R, cz - D], b: [cx - R, cz + D], w: 2.5, kind: "road" },
        { a: [cx + R, cz - D], b: [cx + R, cz + D], w: 2.5, kind: "road" },
      );
      // pedestrians walk the sidewalk OUTSIDE the ring road
      people.push({ a: [cx - R - 1.6, cz + D + 1.6], b: [cx + R + 1.6, cz + D + 1.6] });
      lamps.push([cx - R, cz - D], [cx + R, cz + D]);
      for (let t = 0; t < 6; t++) trees.push([cx - R + rnd() * 2 * R, cz - D - 2.5 - rnd() * 2]);
    }
  });

  // ── arterial network (every district connects to it via a gate stub) ──
  const highways: RoadSeg[] = [
    // west & east avenues (the two N-S spines)
    { a: [-42, -29], b: [-42, 52], w: 5, kind: "highway" },
    { a: [42, -29], b: [42, 44], w: 5, kind: "highway" },
    // east-west trunk through the bridge
    { a: [-42, -8], b: [-6, -8], w: 5, kind: "highway" },
    { a: [6, -8], b: [42, -8], w: 5, kind: "highway" },
    { a: [-6, -8], b: [6, -8], w: 5, kind: "bridge" }, // formal span (deck drawn separately)
    // database platform ramps + external spur
    { a: [24, 54], b: [42, 44], w: 5, kind: "highway" },
    { a: [-42, 44], b: [-24, 54], w: 5, kind: "highway" },
    { a: [0, 61], b: [0, 85], w: 5, kind: "highway" },
  ];
  roads.push(...highways);
  // data-stores frontage alley (cars cruise this lane behind the collections)
  roads.push({ a: [-19, 61], b: [19, 61], w: 2.5, kind: "road" });
  // ramp feet connecting the diagonals down to the alley
  roads.push(
    { a: [24, 54], b: [19, 61], w: 2.5, kind: "road" },
    { a: [-24, 54], b: [-19, 61], w: 2.5, kind: "road" },
  );

  // gate stubs: ring edge midpoint → nearest avenue
  const gateStubs: { a: [number, number]; b: [number, number] }[] = [
    { a: [-44, -20], b: [-42, -20] },
    { a: [-44, 4], b: [-42, 4] },
    { a: [-44, 52], b: [-42, 52] },
    { a: [-40, -20], b: [-42, -20] },
    { a: [-40, 4], b: [-42, 4] },
    { a: [40, -20], b: [42, -20] },
    { a: [40, 4], b: [42, 4] },
    { a: [44, -20], b: [42, -20] },
    { a: [44, 4], b: [42, 4] },
  ];
  gateStubs.forEach((s) => roads.push({ ...s, w: 2.5, kind: "road" }));

  // dashed centre-line markings on arterials (skipped over the bridge span)
  highways.forEach((seg) => {
    const dx = seg.b[0] - seg.a[0];
    const dz = seg.b[1] - seg.a[1];
    const len = Math.hypot(dx, dz);
    const n = Math.max(1, Math.floor(len / 4.5));
    const rot = -Math.atan2(dz, dx);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const mx = seg.a[0] + dx * t;
      const mz = seg.a[1] + dz * t;
      // skip the river gap (bridge has its own deck)
      if (mz === -8 && Math.abs(mx) < 6.5) continue;
      dashes.push({ p: [mx, mz], rot });
    }
  });

  // ── underground pipes = query edges ──
  city.edges
    .filter((e) => e.kind === "query")
    .forEach((e) => {
      const a = buildings.find((b) => b.id === e.from)!;
      const b = buildings.find((x) => x.id === e.to)!;
      if (!a || !b) return;
      pipes.push({ a: [a.pos[0], a.pos[2]], b: [b.pos[0], b.pos[2]], w: 1, kind: "road" });
    });

  // ── vehicle lanes: routes follow streets, not building centers ──
  const bridgeEast = (): Waypoint[] => [
    P(-7.5, -8),
    P(-6, -8, BRIDGE_Y),
    P(6, -8, BRIDGE_Y),
    P(7.5, -8),
  ];

  const loginRaw: Waypoint[] = [
    P(-61.5, -27),              // fe-login door, roll south to the ring
    P(-61.5, -29),
    P(-44, -29),                // east along the ring south edge
    P(-44, -20),                // ring corner → gate
    P(-42, -20),                // west avenue
    P(-42, -8),                 // trunk junction
    ...bridgeEast(),
    P(42, -8),
    P(42, -20),                 // east avenue down to the Routes gate
    P(40, -20),
    P(40, -23.5),               // Routes curb (authRoutes.js)
    P(40, -20),
    P(42, -20),
    P(42, -8),
    P(42, 4),                   // north up the east avenue
    P(40, 4),                   // Services gate
    P(40, 0.5),                 // Services curb (authService.js)
    P(40, 4),
    P(42, 4),
    P(42, 44),                  // long haul north
    P(24, 54),                  // database ramp
    P(19, 61),                  // frontage alley
    P(0, 61),
    P(-16, 61),
    P(-16, 60),                 // curb at users
  ];

  const paymentRaw: Waypoint[] = [
    P(-35.5, 2),                // fe-payment door
    P(-40, 2),                  // west to the ring edge
    P(-40, 4),
    P(-42, 4),                  // Payment gate → west avenue
    P(-42, -8),                 // down the west avenue
    ...bridgeEast(),
    P(42, -8),
    P(42, -20),
    P(40, -20),
    P(40, -23.5),               // Routes curb (paymentRoutes.js)
    P(40, -20),
    P(42, -20),                 // cross the avenue
    P(44, -20),
    P(44, -23.5),               // Controllers curb (paymentController.js)
    P(44, -20),
    P(42, -20),
    P(42, 4),                   // north to Services gate
    P(40, 4),
    P(40, 0.5),                 // Services curb (paymentService.js)
    P(40, 4),
    P(42, 4),
    P(42, 44),                  // long haul: avenue → platform ramp → spur
    P(24, 54),
    P(19, 61),
    P(0, 61),
    P(0, 66),
    P(0, 85),
    P(-3.5, 88),
    P(-6.5, 89.5),              // Stripe API tower curb
    P(-3.5, 88),
    P(0, 85),
    P(0, 61),                   // back down the spur
    P(16, 61),                  // east along the frontage
    P(16, 60),                  // payments collection
  ];

  const cartRaw: Waypoint[] = [
    P(-35.5, -22),              // fe-cart door
    P(-40, -22),
    P(-40, -20),                // Cart gate
    P(-42, -20),
    P(-42, -8),
    ...bridgeEast(),
    P(42, -8),
    P(42, -20),
    P(40, -20),
    P(40, -23.5),               // Routes curb (cartRoutes.js)
    P(40, -20),
    P(42, -20),
    P(44, -20),
    P(44, -23.5),               // Controllers curb (cartController.js)
    P(44, -20),
    P(42, -20),
    P(42, 4),
    P(42, 44),
    P(24, 54),
    P(19, 61),
    P(0, 61),
    P(0, 60),                   // carts collection
  ];

  const flowPaths: Record<string, Waypoint[]> = {
    login: lane(loginRaw),
    payment: lane(paymentRaw),
    cart: lane(cartRaw),
  };

  const byId = new Map(buildings.map((b) => [b.id, b]));
  return { buildings, districts, roads, bridges: [-8], trees, lamps, people, pipes, dashes, flowPaths, byId };
}


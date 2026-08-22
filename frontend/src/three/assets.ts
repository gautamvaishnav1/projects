import { useGLTF } from "@react-three/drei";

/** Starlight-res asset library — every path is served from /public/models. */

const range = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i));
const az = (n: number, pre: string, suf = ".glb") => range(n, (i) => `${pre}${String.fromCharCode(97 + i)}${suf}`);

// ─── buildings ───
// commercial a–n: offices/towers + 5 skyscrapers. suburban building-type a–u: small houses.
// industrial building a–t: factories/warehouses. Counts match the synced library exactly.
export const COMMERCIAL = [...az(14, "/models/buildings/building-"), ...range(5, (i) => `/models/buildings/building-skyscraper-${String.fromCharCode(97 + i)}.glb`)];
export const SKYSCRAPERS = COMMERCIAL.slice(14);
export const SUBURBAN = az(21, "/models/buildings/building-type-");
export const INDUSTRIAL = az(20, "/models/industrial/building-");
// ─── industrial extras ───
export const CHIMNEYS = ["/models/industrial/chimney-small.glb", "/models/industrial/chimney-basic.glb", "/models/industrial/chimney-medium.glb", "/models/industrial/chimney-large.glb"];
export const TANKS = ["/models/industrial/detail-tank.glb"];

// ─── vehicles (latency → model) ───
export const VEHICLE_FAST = ["/models/vehicles/race-future.glb", "/models/vehicles/sedan-sports.glb", "/models/vehicles/hatchback-sports.glb", "/models/vehicles/race.glb"];
export const VEHICLE_MED = ["/models/vehicles/taxi.glb", "/models/vehicles/sedan.glb", "/models/vehicles/suv.glb", "/models/vehicles/van.glb", "/models/vehicles/suv-luxury.glb", "/models/vehicles/delivery.glb"];
export const VEHICLE_SLOW = ["/models/vehicles/truck.glb", "/models/vehicles/garbage-truck.glb", "/models/vehicles/tractor.glb", "/models/vehicles/truck-flat.glb", "/models/vehicles/box.glb"];
export const VEHICLE_HERO = "/models/vehicles/ferrari.glb";
export const VEHICLE_EMERGENCY = ["/models/vehicles/police.glb", "/models/vehicles/ambulance.glb", "/models/vehicles/firetruck.glb"];

// ─── people ───
export const SOLDIER = "/models/animated/Soldier.glb"; // clips: Idle/Walk/Run/TPose
export const XBOT = "/models/animated/Xbot.glb";
export const CHARACTERS = az(18, "/models/characters/character-");

// ─── nature — full Kenney nature-kit (329 models) ───
const N = (p: string) => `/models/nature/${p}.glb`;
export const TREES_DECIDUOUS = ["tree_default", "tree_oak", "tree_fat"].flatMap((b) =>
  b === "tree_fat" ? [N(b), N(`${b}_darkh`), N(`${b}_fall`)] : [N(b), N(`${b}_dark`), N(`${b}_fall`)]);
export const TREES_CONIFER = ["tree_cone", "tree_cone_dark", "tree_detailed", "tree_detailed_dark",
  ...range(6, (i) => `tree_pineRound${String.fromCharCode(65 + i)}`),
  "tree_pineDefaultA", "tree_pineDefaultB", "tree_pineTallA", "tree_pineTallA_detailed",
  ...range(4, (i) => `tree_pineSmall${String.fromCharCode(65 + i)}`)].map(N);
export const TREES_PALM = ["tree_palm", "tree_palmShort", "tree_palmTall", "tree_palmBend", "tree_palmDetailedShort", "tree_palmDetailedTall"].map(N);
export const TREES_BLOCKY = ["tree_blocks", "tree_blocks_dark", "tree_blocks_fall"].map(N);
export const TREES = [...TREES_DECIDUOUS, ...TREES_CONIFER, ...TREES_PALM, ...TREES_BLOCKY];
const rocks = (p: string) => ["largeA", "largeB", "largeC", "largeD", "largeE", "largeF", "smallA", "smallB", "smallC", "smallD", "smallE", "smallF", "smallFlatA", "smallFlatB", "smallFlatC", "smallG", "smallH", "smallI", "smallTopA", "smallTopB", "tallA", "tallB", "tallC", "tallD", "tallE", "tallF", "tallG", "tallH", "tallI", "tallJ"].map((s) => N(`${p}${s}`));
export const ROCKS = [...rocks("rock_"), ...rocks("stone_")];
export const BUSHES_PLANTS = ["plant_bush", "plant_bushDetailed", "plant_bushLarge", "plant_bushSmall", "grass", "grass_large", "grass_leafs", "grass_leafsLarge"].map(N);

// ─── custom street props (models/generated) ───
export const PROP = {
  bench: "/models/props/bench.glb",
  billboard: "/models/props/billboard.glb",
  bollard: "/models/props/bollard.glb",
  busStop: "/models/props/bus-stop.glb",
  fountain: "/models/props/fountain.glb",
  hydrant: "/models/props/hydrant.glb",
  kiosk: "/models/props/kiosk.glb",
  lampDouble: "/models/props/lamp-double.glb",
  lampSingle: "/models/props/lamp-single.glb",
  mailbox: "/models/props/mailbox.glb",
  manhole: "/models/props/manhole.glb",
  phoneBooth: "/models/props/phone-booth.glb",
  planter: "/models/props/planter.glb",
  trafficLight: "/models/props/traffic-light.glb",
  trashBin: "/models/props/trash-bin.glb",
  warningSign: "/models/props/warning-sign.glb",
} as const;

// ─── roads / props ───
export const BRIDGE = "/models/roads/road-bridge.glb";
export const BARRIER = "/models/roads/construction-barrier.glb";
export const FENCE = "/models/roads/construction-fence.glb";
export const CONE = "/models/roads/construction-cone.glb";
export const SIGN_WARNING = "/models/roads/road-sign-warning.glb";
export const STREET_LIGHT = "/models/roads/light-curved.glb";
export const POWER_POLE = "/models/roads/electricity-pole.glb";

// ─── hdri ───
export const HDRI_DAY = "/models/hdri/venice_sunset_1k.hdr";
export const HDRI_NIGHT = "/models/hdri/dikhololo_night_1k.hdr";

/** deterministic pick so a building always gets the same model */
export const pick = <T,>(arr: T[], seed: number): T => arr[Math.abs(Math.floor(seed)) % arr.length];

/** preload the hot set once — buildings/vehicles/people/trees; HDRI loads via Environment */
export function preloadAll() {
  [
    ...COMMERCIAL, ...SUBURBAN, ...INDUSTRIAL, ...CHIMNEYS, ...TANKS,
    ...VEHICLE_FAST, ...VEHICLE_MED, ...VEHICLE_SLOW, VEHICLE_HERO, ...VEHICLE_EMERGENCY,
    SOLDIER, XBOT, ...CHARACTERS,
    BRIDGE, BARRIER, FENCE, CONE, SIGN_WARNING, STREET_LIGHT, POWER_POLE,
    ...Object.values(PROP),
  ].forEach((u) => useGLTF.preload(u));
}

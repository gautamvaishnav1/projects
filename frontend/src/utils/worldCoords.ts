/**
 * worldCoords.ts
 * Converts the existing SVG-based ISLAND_SECTORS / CityNode grid positions
 * into Three.js 3D world coordinates.
 *
 * Convention:
 *  - SVG center (480, 380) → Three.js origin (0, 0, 0)
 *  - SVG X → Three.js X
 *  - SVG Y → Three.js Z  (SVG down = world "into screen")
 *  - Three.js Y = elevation (islands sit above ocean)
 *
 * SCALE: 1 SVG unit = 1/60 Three.js world unit
 * This puts the full ~1080×840 SVG into ≈ 18×14 world units — comfortable to look at.
 */

export const WORLD_SCALE = 1 / 60;

/** SVG canvas center (the API Gateway Hub position) */
export const SVG_CENTER_X = 480;
export const SVG_CENTER_Y = 380;

/** Vertical layers */
export const OCEAN_Y      = -0.55;   // water surface
export const ISLAND_Y     = 0.0;     // top surface of island platform
export const ISLAND_DEPTH = 0.55;    // thickness of island box (goes downward)

/**
 * Convert a raw SVG (x, y) to Three.js world [x, y, z].
 * y is always the island top-surface level.
 */
export function svgToWorld(svgX: number, svgY: number): [number, number, number] {
  return [
    (svgX - SVG_CENTER_X) * WORLD_SCALE,
    ISLAND_Y,
    (svgY - SVG_CENTER_Y) * WORLD_SCALE,
  ];
}

/**
 * Convert an SVG node position (absolute SVG coords) to a Three.js world
 * [x, y, z] — same as svgToWorld but named clearly for node positions.
 */
export function nodeToWorld(svgX: number, svgY: number): [number, number, number] {
  return svgToWorld(svgX, svgY);
}

/**
 * Convert an SVG width/height to Three.js world width/depth.
 */
export function svgSizeToWorld(svgW: number, svgH: number): [number, number] {
  return [svgW * WORLD_SCALE, svgH * WORLD_SCALE];
}

/**
 * Map lines-of-code to a 3D building height (Three.js Y units).
 * Min: 0.5 units  |  Max: 3.5 units
 */
export function linesToHeight(lines: number): number {
  const MIN_H  = 0.5;
  const MAX_H  = 3.5;
  const MAX_LINES = 400;
  const ratio = Math.min(lines / MAX_LINES, 1);
  return MIN_H + ratio * (MAX_H - MIN_H);
}

/**
 * Map a risk/complexity to a neon alert colour.
 */
export function riskToColor(security: string): string {
  const s = security.toLowerCase();
  if (s.includes('critical'))      return '#ef4444';
  if (s.includes('risk') || s.includes('warning')) return '#f59e0b';
  return '#00FF88'; // clean
}

/** Palette lookup: district id → neon accent colour */
export const DISTRICT_COLORS: Record<string, string> = {
  frontend : '#06b6d4',
  backend  : '#c084fc',
  database : '#34d399',
  auth     : '#fbbf24',
  infra    : '#60a5fa',
  service  : '#06b6d4',
  external : '#fb7185',
  depot    : '#fef08a',
};

/** Lucide icon name per district (matched in CityBuilding) */
export const DISTRICT_ICONS: Record<string, string> = {
  frontend : 'Layout',
  backend  : 'Server',
  database : 'Database',
  auth     : 'ShieldCheck',
  infra    : 'Cpu',
  service  : 'Activity',
  external : 'Globe',
  depot    : 'Archive',
};

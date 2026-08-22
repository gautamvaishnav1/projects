import * as THREE from 'three';

export const C = {
  servicePink: 0xff5fa2,
  servicePinkDark: 0xd94b88,
  dbGreen: 0x35c26f,
  dbGreenDark: 0x27955a,
  apiCyan: 0x37d3e8,
  errorRed: 0xe8443a,
  fastGreen: 0x39d353,
  midAmber: 0xffb020,
  slowRed: 0xe8443a,
  pendingBlue: 0x3a7bd5,
  idleGrey: 0xcfd6db,
  steelDark: 0x33383d,
  steelMid: 0x7d858c,
  steelLight: 0xaab2b9,
  concrete: 0x9b9b93,
  concreteDark: 0x6f6f68,
  asphalt: 0x2e3033,
  white: 0xf2f4f5,
  offWhite: 0xdde2e5,
  black: 0x17191b,
  rubber: 0x1c1e20,
  yellowWork: 0xffc21f,
  orangeCone: 0xff7a1a,
  glassTint: 0xbfeaf5,
  woodWarm: 0xb98a4e,
  leafGreen: 0x4e9e45,
};

const cache = new Map();

function makeStd(color, o = {}) {
  const key = JSON.stringify(['s', color, o]);
  if (cache.has(key)) return cache.get(key);
  const opacity = o.opacity ?? 1;
  const m = new THREE.MeshStandardMaterial({
    color,
    metalness: o.metalness ?? 0.05,
    roughness: o.roughness ?? 0.75,
    emissive: o.emissive ?? 0x000000,
    emissiveIntensity: o.emissiveIntensity ?? 1,
    transparent: opacity < 1,
    opacity,
  });
  cache.set(key, m);
  return m;
}

export const mat = {
  std: makeStd,
  paint: (c, roughness = 0.55) => makeStd(c, { roughness }),
  metal: (c = C.steelMid, roughness = 0.35) => makeStd(c, { roughness, metalness: 0.85 }),
  chrome: () => makeStd(0xd8dde1, { roughness: 0.12, metalness: 1 }),
  glass: (c = C.glassTint) => makeStd(c, { opacity: 0.38, roughness: 0.12, metalness: 0.25 }),
  glassDark: () => makeStd(0x20262b, { opacity: 0.72, roughness: 0.1, metalness: 0.4 }),
  water: () => makeStd(C.apiCyan, { opacity: 0.5, roughness: 0.05, metalness: 0.1 }),
  glow: (c, intensity = 1.8) => makeStd(c, { emissive: c, emissiveIntensity: intensity }),
  rubber: () => makeStd(C.rubber, { roughness: 0.95 }),
  concrete: (c = C.concrete) => makeStd(c, { roughness: 0.9 }),
  asphalt: (c = C.asphalt) => makeStd(c, { roughness: 0.95 }),
  black: () => makeStd(C.black, { roughness: 0.6 }),
  wood: () => makeStd(C.woodWarm, { roughness: 0.8 }),
};

export function box(w, h, d, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  return mesh;
}

export function cyl(rt, rb, h, seg, m, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
  mesh.position.set(x, y, z);
  return mesh;
}

export function sph(r, m, seg = 14, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, Math.round(seg / 2))), m);
  mesh.position.set(x, y, z);
  return mesh;
}

export function torus(r, tubeR, m, x = 0, y = 0, z = 0, rotX = 0) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, tubeR, 10, 28), m);
  mesh.position.set(x, y, z);
  if (rotX) mesh.rotation.x = rotX;
  return mesh;
}

export function tubeAlong(points, radius, m, tubularSegments = 48) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, tubularSegments, radius, 8, false), m);
  return { mesh, curve };
}

export function group(...children) {
  const g = new THREE.Group();
  for (const c of children) g.add(c);
  return g;
}

export function at(mesh, x, y, z) {
  mesh.position.set(x, y, z);
  return mesh;
}

export function rot(mesh, rx = 0, ry = 0, rz = 0) {
  mesh.rotation.set(rx, ry, rz);
  return mesh;
}

export function wheelSet(g, positions, radius, width) {
  const tireM = mat.rubber();
  const hubM = mat.chrome();
  for (const [x, , z] of positions) {
    const tire = cyl(radius, radius, width, 18, tireM, x, radius, z);
    tire.rotation.x = Math.PI / 2;
    const hub = cyl(radius * 0.55, radius * 0.55, width + 0.04, 12, hubM, x, radius, z);
    hub.rotation.x = Math.PI / 2;
    g.add(tire, hub);
  }
}

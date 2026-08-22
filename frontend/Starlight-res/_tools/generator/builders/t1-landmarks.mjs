import * as THREE from 'three';
import { C, mat, box, cyl, sph, torus, tubeAlong, group, at, rot, wheelSet } from '../palette.mjs';

export function towerApi() {
  const g = group();
  g.add(box(18, 1.2, 18, mat.concrete(), 0, 0.6, 0));
  g.add(box(16, 5, 16, mat.paint(0x87909a, 0.6), 0, 1.2, 0));
  for (const [x, z] of [[-7.4, -7.4], [7.4, -7.4], [-7.4, 7.4], [7.4, 7.4]]) {
    g.add(box(0.9, 5, 0.9, mat.metal(C.steelDark), x, 1.2, z));
  }
  const glassM = mat.glass(C.apiCyan);
  const coreM = makeStdCore();
  g.add(at(box(11.6, 20, 11.6, glassM), 0, 6.2 + 10, 0));
  g.add(at(box(9.4, 17, 9.4, glassM), 0, 26.2 + 8.5, 0));
  g.add(at(box(6.6, 12, 6.6, glassM), 0, 43.2 + 6, 0));
  for (const [w, y] of [[12.2, 26.2], [10, 43.2]]) {
    g.add(box(w, 0.55, w, mat.metal(), 0, y, 0));
    g.add(box(w * 0.99, 0.3, w * 0.99, mat.metal(C.steelLight), 0, y + 0.55, 0));
  }
  g.add(box(13, 0.8, 13, mat.metal(C.steelDark), 0, 6.2, 0));
  g.add(box(7.2, 0.8, 7.2, mat.metal(C.steelDark), 0, 55.2, 0));
  g.add(cyl(0.45, 0.45, 13, 10, mat.metal(), 0, 56 + 6.5, 0));
  for (const r of [1.6, 3.2, 4.8]) {
    g.add(torus(r, 0.08, mat.metal(), 0, 58 + r * 0.9, 0));
  }
  const tip = at(sph(0.85, mat.glow(C.apiCyan, 3)), 0, 69 + 0.6, 0);
  g.add(tip);
  g.add(at(torus(1.25, 0.07, mat.glow(C.apiCyan, 2.2), 0, 68.6, 0)));
  return g;

  function makeStdCore() {
    return mat.std(0x0c222b, { opacity: 0.85 });
  }
}

export function bridgeHero() {
  const g = group();
  const deckY = 12;
  const span = 74;
  g.add(box(span, 1.4, 11, mat.asphalt(), 0, deckY - 1.4 / 2, 0));
  g.add(box(span, 0.22, 11.4, mat.metal(C.steelDark), 0, deckY - 1.4, 0));
  for (let i = -8; i <= 8; i++) {
    g.add(box(2.2, 0.06, 0.35, mat.paint(0xe8e8e2, 0.6), i * 4.2, deckY + 0.02, 0));
  }
  for (const zs of [-5.2, 5.2]) {
    g.add(box(span, 0.5, 0.28, mat.metal(C.steelDark), 0, deckY + 0.55, zs));
    let x = -span / 2 + 1;
    while (x < span / 2) {
      g.add(box(0.28, 0.95, 0.28, mat.metal(), x, deckY + 0.15, zs));
      x += 2.6;
    }
  }
  for (const tx of [-19, 19]) {
    for (const tz of [-4.4, 4.4]) {
      g.add(box(1.6, 30, 1.6, mat.concrete(C.offWhite), tx, 15, tz));
      g.add(box(3, 1.2, 3, mat.concrete(C.concreteDark), tx, 0.6, tz));
      g.add(box(1.6, 1.4, 10.4, mat.concrete(C.offWhite), tx, 27.4, 0));
      g.add(box(1.6, 1.1, 9.4, mat.concrete(C.concreteDark), tx, 20.5, 0));
    }
  }
  const cableM = mat.metal(0x565d64, 0.3);
  const topY = 29.4;
  for (const zs of [-4.4, 4.4]) {
    const pts = [
      [-span / 2 - 2, 2, zs],
      [-(span / 2) + 1, 14, zs],
      [-19, topY, zs],
      [0, deckY + 2.6, zs],
      [19, topY, zs],
      [(span / 2) - 1, 14, zs],
      [span / 2 + 2, 2, zs],
    ];
    const { curve } = tubeAlong(pts, 0.28, cableM, 72);
    g.children.push();
    const tubeMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.28, 8, false), cableM);
    g.add(tubeMesh);
    for (let x = -16; x <= 16; x += 3.2) {
      if (Math.abs(x) < 1.5) continue;
      const t = (x + span / 2) / span;
      const p = curve.getPointAt(Math.min(Math.max(t, 0.001), 0.999));
      const h = Math.max(p.y - (deckY + 0.4), 0.01);
      g.add(cyl(0.06, 0.06, h, 6, cableM, x, deckY + 0.4 + h / 2, zs));
    }
  }
  for (const px of [-19, 19]) {
    g.add(box(2.2, deckY - 1.4, 2.2, mat.concrete(C.concreteDark), px, (deckY - 1.4) / 2, 0));
  }
  for (const ex of [-span / 2 + 1, span / 2 - 1]) {
    g.add(box(2.4, deckY - 1.4, 8, mat.concrete(C.concreteDark), ex, (deckY - 1.4) / 2, 0));
  }
  return g;
}

export function dataCenterCube() {
  const g = group();
  const S = 18;
  g.add(box(S + 2, 1, S + 2, mat.concrete(C.concreteDark), 0, 0.5, 0));
  const wallGlass = mat.std(0x101d24, { opacity: 0.92, roughness: 0.25, metalness: 0.5 });
  g.add(box(S, S, S, wallGlass, 0, 1 + S / 2, 0));
  const trim = mat.paint(C.dbGreen, 0.4);
  const edgeLen = S;
  const half = S / 2;
  const posts = [];
  for (const sx of [-half, half]) for (const sz of [-half, half]) posts.push([sx, sz]);
  for (const [px, pz] of posts) {
    g.add(box(0.7, S, 0.7, trim, px, 1 + S / 2, pz));
  }
  for (const yEdge of [1, 1 + S]) {
    g.add(box(edgeLen + 0.7, 0.7, 0.7, trim, 0, yEdge, -half));
    g.add(box(edgeLen + 0.7, 0.7, 0.7, trim, 0, yEdge, half));
    g.add(box(0.7, 0.7, edgeLen + 0.7, trim, -half, yEdge, 0));
    g.add(box(0.7, 0.7, edgeLen + 0.7, trim, half, yEdge, 0));
  }
  for (let lvl = 0; lvl < 4; lvl++) {
    const y = 2.4 + lvl * (S - 3) / 4;
    g.add(box(S - 1.6, 0.32, 0.1, mat.glow(C.dbGreen, 2.4), 0, y, half + 0.02));
    g.add(box(S - 1.6, 0.32, 0.1, mat.glow(C.dbGreen, 2.4), 0, y, -half - 0.02));
    g.add(box(0.1, 0.32, S - 1.6, mat.glow(C.dbGreen, 2.4), half + 0.02, y, 0));
    g.add(box(0.1, 0.32, S - 1.6, mat.glow(C.dbGreen, 2.4), -half - 0.02, y, 0));
  }
  for (let i = 0; i < 4; i++) {
    const vx = -S / 4 + (i % 2) * (S / 2);
    const vz = -S / 4 + (i > 1 ? S / 2 : 0);
    g.add(box(3, 1.1, 3, mat.metal(C.steelDark), vx, 1 + S + 0.55, vz));
    g.add(rot(cyl(1.05, 1.05, 0.3, 18, mat.std(0x0a0d10), vx, 1 + S + 1.2, vz)));
  }
  g.add(box(5, 0.5, 3, mat.metal(C.steelMid), 0, 1 + 3.2, half + 1.4));
  g.add(box(2.6, 3, 0.25, mat.glow(C.dbGreen, 1.4), 0, 2.6, half + 0.06));
  return g;
}

export function broadcastMast() {
  const g = group();
  g.add(box(6, 0.8, 6, mat.concrete(C.concreteDark), 0, 0.4, 0));
  g.add(box(4.4, 1.2, 4.4, mat.metal(C.steelDark), 0, 1.4, 0));
  let y = 2;
  const segH = 9;
  const radii = [1.5, 1.2, 0.9, 0.62];
  for (let s = 0; s < 4; s++) {
    const rTop = radii[s];
    const rBot = s === 0 ? 1.8 : radii[s - 1];
    g.add(cyl(rTop, rBot, segH, 8, mat.metal(0x8a9096, 0.45), 0, y + segH / 2, 0));
    g.add(torus((rTop + rBot) / 2, 0.07, mat.metal(C.steelDark), 0, y + segH, 0));
    if (s % 2 === 1) {
      g.add(box(rBot * 3.2, 0.16, rBot * 3.2, mat.paint(C.midAmber, 0.5), 0, y + segH * 0.55, 0));
    }
    y += segH;
  }
  g.add(cyl(0.16, 0.16, 7, 8, mat.metal(), 0, y + 3.5, 0));
  g.add(at(sph(0.42, mat.glow(C.errorRed, 3)), 0, y + 7.3, 0));
  g.add(at(sph(0.34, mat.glow(C.errorRed, 2.4)), 0, y * 0.55, 0));
  for (const az of [0, Math.PI / 2]) {
    const dish = at(
      rot(
        (() => {
          const d = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 3), mat.paint(0xe4e7ea, 0.4));
          return d;
        })(),
        Math.PI / 2.4
      ),
      Math.cos(az) * 2.1,
      14,
      Math.sin(az) * 2.1
    );
    dish.rotation.y = -az;
    g.add(dish);
    g.add(cyl(0.09, 0.09, 2, 6, mat.metal(), Math.cos(az) * 1.2, 14.6, Math.sin(az) * 1.2));
  }
  return g;
}

export function craneConstruction() {
  const g = group();
  const yellowM = mat.paint(C.yellowWork, 0.45);
  const darkM = mat.metal(C.steelDark);
  g.add(box(7, 0.6, 7, mat.concrete(C.concreteDark), 0, 0.3, 0));
  for (const [x, z] of [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]]) {
    g.add(box(0.5, 1.4, 0.5, darkM, x, 0.6, z));
  }
  const mastH = 24;
  const segs = 8;
  const segH = mastH / segs;
  for (let i = 0; i < segs; i++) {
    const y = 2 + i * segH;
    for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
      g.add(box(0.22, segH, 0.22, yellowM, x, y + segH / 2, z));
    }
    g.add(box(2.04, 0.14, 0.14, yellowM, 0, y + segH, 0.9));
    g.add(box(2.04, 0.14, 0.14, yellowM, 0, y + segH, -0.9));
    g.add(box(0.14, 0.14, 2.04, yellowM, 0.9, y + segH, 0));
    g.add(box(0.14, 0.14, 2.04, yellowM, -0.9, y + segH, 0));
  }
  g.add(box(2.4, 2.2, 2.4, yellowM, 0, 2 + mastH, 0));
  g.add(box(2.2, 1.6, 2.2, mat.glassDark(), 0, 2 + mastH, -1.9));
  const jibY = 2 + mastH + 1.1;
  const jibLen = 22;
  const truss = (len) => {
    const t = group();
    for (let i = 0; i <= len / 2; i += 2) {
      t.add(box(0.16, 0.16, 1.6, yellowM, i, 0, 0.8));
      t.add(box(0.16, 0.16, 1.6, yellowM, i, 0, -0.8));
    }
    t.add(box(len, 0.16, 0.16, yellowM, len / 2, 0, 0.8));
    t.add(box(len, 0.16, 0.16, yellowM, len / 2, 0, -0.8));
    t.add(box(len, 0.16, 1.76, yellowM, len / 2, 0.75, 0));
    return t;
  };
  const jib = at(truss(jibLen), jibLen / 2, jibY, 0);
  g.add(jib);
  const cjib = rot(truss(7), 0, Math.PI);
  cjib.position.set(-3.5, jibY, 0);
  g.add(cjib);
  g.add(box(1.8, 1.4, 1.8, darkM, -5, jibY - 0.7, 0));
  g.add(at(sph(0.5, mat.glow(C.errorRed, 2.5)), jibLen + 0.6, jibY + 0.4, 0));
  const tieM = mat.metal(0x5a6067, 0.3);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, jibY + 3.4, 0),
    new THREE.Vector3(jibLen * 0.62, jibY + 1.4, 0),
    new THREE.Vector3(jibLen, jibY + 0.6, 0),
  ]), 24, 0.07, 6, false), tieM));
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, jibY + 3.4, 0),
    new THREE.Vector3(-3, jibY + 1.2, 0),
    new THREE.Vector3(-6.6, jibY + 0.5, 0),
  ]), 24, 0.07, 6, false), tieM));
  g.add(box(0.5, 1.6, 0.5, darkM, 0, jibY + 2.6, 0));
  const trolleyX = 14;
  g.add(box(0.9, 0.5, 1.6, darkM, trolleyX, jibY - 0.35, 0));
  const hookDrop = 9;
  g.add(cyl(0.05, 0.05, hookDrop, 6, tieM, trolleyX, jibY - 0.6 - hookDrop / 2, 0));
  g.add(box(0.7, 0.9, 0.5, yellowM, trolleyX, jibY - 0.6 - hookDrop - 0.45, 0));
  return g;
}

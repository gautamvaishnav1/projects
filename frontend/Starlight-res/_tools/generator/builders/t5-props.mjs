import * as THREE from 'three';
import { C, mat, box, cyl, sph, torus, group, at, rot } from '../palette.mjs';

export function coneCluster() {
  const g = group();
  for (const [x, z, r] of [[-0.9, 0.2, 1], [0.7, -0.4, 0.85], [0.2, 0.8, 0.75]]) {
    g.add(box(1.3 * r, 0.06, 1.3 * r, mat.paint(0xd4551f, 0.6), x, 0.03, z));
    const cone = cyl(0.03 * r + 0.02, 0.42 * r, 1.15 * r, 12, mat.paint(C.orangeCone, 0.5), x, 0.06 + 0.575 * r, z);
    g.add(cone);
    g.add(cyl(0.24 * r, 0.28 * r, 0.16 * r * 2, 12, mat.paint(0xf0ede6, 0.55), x, 0.06 + 0.62 * r, z));
  }
  return g;
}

export function roadBarrier() {
  const g = group();
  const whiteM = mat.paint(0xeef0f2, 0.55);
  g.add(box(2.4, 0.25, 1.1, whiteM, 0, 0.125, 0));
  g.add(box(2.4, 0.85, 0.35, whiteM, 0, 0.25 + 0.425, 0));
  g.add(box(2.44, 0.22, 0.39, mat.glow(C.errorRed, 0.9), 0, 0.72, 0));
  g.add(box(2.44, 0.14, 0.39, mat.std(0x22262a), 0, 0.98, 0));
  g.add(at(rot(box(2.42, 0.3, 0.37, mat.paint(C.midAmber, 0.5)), 0, 0, 0), 0, 1.18, 0));
  return g;
}

export function warningSign() {
  const g = group();
  const poleM = mat.metal(0x8b9196);
  g.add(cyl(0.05, 0.07, 2.6, 8, poleM, 0, 1.3, 0));
  const diamond = at(rot(box(1.05, 1.05, 0.08, mat.paint(0xffd23e, 0.5)), Math.PI / 2), 0, 0, 0);
  diamond.position.set(0, 2.9, 0);
  diamond.rotation.z = Math.PI / 4;
  diamond.rotation.y = 0;
  g.add(diamond);
  const inner = at(rot(box(0.82, 0.82, 0.09, mat.std(0x14161a)), 0, 0, 0), 0, 2.9, 0.005);
  inner.rotation.z = Math.PI / 4;
  g.add(inner);
  const core = at(rot(box(0.58, 0.58, 0.1, mat.glow(0xffd23e, 1.2), ), Math.PI / 2, 0, 0), 0, 2.9, 0.01);
  core.rotation.z = Math.PI / 4;
  g.add(core);
  g.add(box(0.12, 0.34, 0.12, mat.std(0x14161a), 0, 2.98, 0.06));
  g.add(box(0.12, 0.1, 0.12, mat.std(0x14161a), 0, 2.56, 0.06));
  return g;
}

export function bollard() {
  const g = group();
  g.add(cyl(0.19, 0.23, 0.08, 12, mat.metal(0x4c5257), 0, 0.04, 0));
  g.add(cyl(0.13, 0.16, 0.95, 12, mat.paint(0x3a4046, 0.5), 0, 0.55, 0));
  g.add(sph(0.13, mat.chrome(), 10, 0, 1.05, 0));
  g.add(cyl(0.135, 0.135, 0.14, 12, mat.glow(0xfff3cf, 0.7), 0, 0.78, 0));
  return g;
}

export function manhole() {
  const g = group();
  g.add(cyl(0.62, 0.66, 0.06, 20, mat.concrete(C.concreteDark), 0, 0.03, 0));
  g.add(torus(0.52, 0.06, mat.metal(0x565d64, 0.5), 0, 0.075, 0, Math.PI / 2));
  g.add(cyl(0.52, 0.52, 0.05, 20, mat.std(0x23262a), 0, 0.07, 0));
  for (let i = 0; i < 2; i++) {
    g.add(box(0.9, 0.03, 0.08, mat.metal(0x565d64, 0.5), 0, 0.1, i === 0 ? 0 : 0));
  }
  return g;
}

export function rooftopAC() {
  const g = group();
  const bodyM = mat.metal(0xb9bfc5, 0.5);
  g.add(box(2.2, 1.3, 2.2, bodyM, 0, 0.65, 0));
  g.add(box(2.3, 0.12, 2.3, mat.metal(C.steelDark), 0, 1.36, 0));
  for (const fx of [-0.55, 0.55]) {
    g.add(torus(0.42, 0.05, mat.metal(C.steelDark), fx, 1.05, 1.11, 0));
    g.add(rot(at(cyl(0.38, 0.38, 0.05, 16, mat.std(0x101315)), 0, 0, 0)).translateX(fx).translateY(1.05).translateZ(1.11));
    g.add(box(0.1, 0.7, 0.1, mat.metal(C.steelLight), fx, 1.05, 1.13));
  }
  g.add(cyl(0.12, 0.12, 1.6, 8, mat.metal(C.steelLight), 0.9, 0.8, -1.25));
  g.add(rot(at(cyl(0.12, 0.12, 0.7, 8, mat.metal(C.steelLight), 0, 0, 0), ), 0, 0, Math.PI / 2));
  const elbow = g.children[g.children.length - 1];
  elbow.position.set(0.2, 1.68, -1.25);
  g.add(elbow);
  return g;
}

export function waterTank() {
  const g = group();
  const tankM = mat.paint(0x8d99a2, 0.6);
  for (const [x, z] of [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]]) {
    g.add(box(0.16, 2.2, 0.16, mat.metal(C.steelDark), x, 1.1, z));
  }
  g.add(box(2.3, 0.12, 2.3, mat.metal(C.steelDark), 0, 2.26, 0));
  g.add(cyl(1.15, 1.15, 2.2, 18, tankM, 0, 2.32 + 1.1, 0));
  g.add(torus(1.16, 0.05, mat.metal(C.steelMid, 0.45), 0, 3.5, 0, Math.PI / 2));
  g.add(torus(1.16, 0.05, mat.metal(C.steelMid, 0.45), 0, 4.4, 0, Math.PI / 2));
  g.add(cyl(0.02, 1.15, 0.7, 18, mat.paint(0x767f88, 0.6), 0, 5.62 + 0.35, 0));
  g.add(sph(0.14, mat.metal(), 8, 0, 5.62 + 0.72, 0));
  for (let r = 0; r < 5; r++) {
    g.add(box(0.5, 0.05, 0.05, mat.metal(C.steelLight), 1.28, 2.5 + r * 0.45, 0));
  }
  g.add(box(0.05, 2.3, 0.05, mat.metal(C.steelLight), 1.05, 3.65, 0.22));
  g.add(box(0.05, 2.3, 0.05, mat.metal(C.steelLight), 1.05, 3.65, -0.22));
  return g;
}

export function fireEscape() {
  const g = group();
  const ironM = mat.paint(0x33383d, 0.6);
  for (const lvl of [0, 1]) {
    const y = lvl === 0 ? 1.2 : 4.4;
    g.add(box(3.4, 0.1, 1.5, ironM, 0, y, 0));
    for (let i = 0; i <= 6; i++) {
      g.add(box(0.06, 0.9, 0.06, ironM, -1.55 + i * 0.53, y + 0.55, -0.7));
    }
    g.add(box(3.4, 0.07, 0.07, ironM, 0, y + 1, -0.7));
    g.add(box(3.4, 0.07, 0.07, ironM, 0, y + 0.55, -0.7));
    g.add(box(3.2, 0.06, 0.9, mat.std(0x4a5056), 0, y + 0.06, 0.1));
  }
  const stair = at(rot(box(0.9, 0.09, 3, ironM), -0.62), 0, 0, 0);
  stair.position.set(0, 2.86, 0.15);
  g.add(stair);
  for (let i = 0; i < 5; i++) {
    g.add(at(rot(box(0.85, 0.04, 0.24, ironM), -0.62), 0, 2.1 + i * 0.52, -0.75 + i * 0.48));
  }
  for (const bx of [-1.6, 1.6]) {
    g.add(rot(at(box(0.08, 1.2, 0.08, ironM), 0, 0, 0), 0, 0, bx > 0 ? -0.3 : 0.3)).children;
  }
  g.add(rot(at(box(0.08, 2.2, 0.08, ironM), 0, 0, 0), 0, 0, 0.28));
  const brace = g.children[g.children.length - 1];
  brace.position.set(-1.7, 2.9, 0.6);
  g.add(brace);
  const brace2 = rot(at(box(0.08, 2.2, 0.08, ironM), 0, 0, 0), 0, 0, -0.28);
  brace2.position.set(1.7, 2.9, 0.6);
  g.add(brace2);
  return g;
}

export function satelliteDish() {
  const g = group();
  g.add(cyl(0.3, 0.4, 0.3, 12, mat.concrete(C.concreteDark), 0, 0.15, 0));
  g.add(cyl(0.14, 0.14, 1.6, 10, mat.metal(0xb9bfc5, 0.4), 0, 1.05, 0));
  const joint = at(sph(0.2, mat.metal(C.steelDark), 10), 0, 1.95, 0);
  g.add(joint);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(1.35, 22, 14, 0, Math.PI * 2, 0, Math.PI / 2.6), mat.paint(0xe8ebef, 0.35));
  dish.rotation.x = Math.PI / 1.55;
  dish.scale.z = 0.45;
  dish.position.set(0, 2.6, 0.35);
  g.add(dish);
  g.add(cyl(0.05, 0.05, 1.5, 8, mat.metal(C.steelLight), 0, 2.75, 0.95));
  g.add(at(rot(cyl(0.09, 0.09, 0.4, 8, mat.std(0x14171a)), Math.PI / 2), 0, 2.75, 1.7));
  g.add(box(0.08, 0.5, 0.08, mat.metal(C.steelLight), 0, 2.35, 1.15));
  return g;
}

export function antennaWhip() {
  const g = group();
  g.add(cyl(0.22, 0.3, 0.2, 10, mat.metal(C.steelDark), 0, 0.1, 0));
  g.add(cyl(0.06, 0.1, 3.2, 8, mat.metal(0xcfd4d9, 0.35), 0, 1.8, 0));
  for (let i = 0; i < 3; i++) {
    const y = 1.6 + i * 0.7;
    const len = 0.7 - i * 0.15;
    for (const s of [1, -1]) {
      g.add(rot(at(cyl(0.02, 0.02, len, 6, mat.metal(C.steelLight, 0.4), 0, 0, 0), ), 0, 0, (Math.PI / 2) * s));
      const dip = g.children[g.children.length - 1];
      dip.position.set((len / 2) * s, y, 0);
      dip.rotation.x = Math.PI / 2;
    }
  }
  g.add(at(sph(0.07, mat.glow(C.errorRed, 2.4)), 0, 3.5, 0));
  return g;
}

export function billboard() {
  const g = group();
  const steelM = mat.metal(0x565d64, 0.45);
  for (const x of [-2.6, 2.6]) {
    g.add(cyl(0.18, 0.22, 7.4, 12, steelM, x, 3.7, 0));
  }
  g.add(box(7, 0.3, 0.5, steelM, 0, 7.5, 0));
  g.add(box(7.4, 4, 0.24, mat.paint(0x22262a, 0.6), 0, 9.6, -0.1));
  g.add(box(6.9, 3.5, 0.1, mat.glow(C.apiCyan, 1.5), 0, 9.6, 0.08));
  g.add(box(7.4, 0.3, 0.3, mat.metal(C.steelDark), 0, 11.75, 0));
  g.add(box(0.5, 0.5, 0.5, mat.metal(C.steelDark), 3, 7.75, 0));
  g.add(at(sph(0.09, mat.glow(C.fastGreen, 2)), 3.31, 8.15, 0));
  return g;
}

export function planter() {
  const g = group();
  const rimM = mat.concrete(0x8e8e86);
  g.add(box(1.7, 0.65, 1.7, rimM, 0, 0.325, 0));
  g.add(box(1.78, 0.12, 1.78, mat.concrete(0x77776f), 0, 0.71, 0));
  g.add(box(1.5, 0.1, 1.5, mat.paint(0x4a3b2a, 0.9), 0, 0.77, 0));
  g.add(sph(0.5, mat.std(C.leafGreen, { roughness: 0.9 }), 12, 0, 1.05, 0));
  g.add(sph(0.34, mat.std(0x5cb053, { roughness: 0.9 }), 10, 0.3, 1.3, 0.15));
  g.add(sph(0.28, mat.std(0x479140, { roughness: 0.9 }), 10, -0.28, 1.28, -0.12));
  return g;
}

export function cratesStack() {
  const g = group();
  const woodM = mat.wood();
  const edgeM = mat.paint(0x8a6740, 0.75);
  const crate = (s, x, y, z, ry) => {
    const c = group(
      box(s, s, s, woodM, 0, s / 2, 0)
    );
    for (const off of [-s / 2 + 0.05, s / 2 - 0.05]) {
      c.add(box(s, 0.06, 0.06, edgeM, 0, off + s / 2, off));
      void off;
    }
    c.add(box(s + 0.04, 0.07, s + 0.04, edgeM, 0, s - 0.03, 0));
    c.rotation.y = ry;
    c.position.set(x, y, z);
    return c;
  };
  g.add(crate(1.2, 0, 0, 0, 0.1));
  g.add(crate(1.2, 1.35, 0, 0.3, -0.25));
  g.add(crate(1.2, 0.5, 1.21, 0.15, 0.4));
  g.add(crate(0.9, 1.5, 0, -1.1, 0.5));
  g.add(crate(0.7, -0.9, 0, 1, 0.8));
  return g;
}

export function serverRack() {
  const g = group();
  g.add(box(1.4, 0.15, 1.9, mat.metal(C.steelDark), 0, 0.075, 0));
  const bodyM = mat.paint(0x1c2024, 0.55);
  g.add(box(1.3, 3.4, 1.8, bodyM, 0, 0.15 + 1.7, 0));
  for (let u = 0; u < 12; u++) {
    const y = 0.45 + u * 0.27;
    g.add(box(1.16, 0.2, 0.06, mat.std(u % 3 === 0 ? 0x2a3138 : 0x22272c), 0, y, 0.93));
    if (u % 3 !== 2) {
      g.add(box(0.1, 0.05, 0.02, mat.glow(u % 2 === 0 ? C.fastGreen : C.apiCyan, 3), -0.45 + (u % 4) * 0.3, y, 0.97));
    }
    if (u % 4 === 1) {
      g.add(box(0.7, 0.08, 0.02, mat.std(0x111417), 0.2, y + 0.04, 0.97));
    }
  }
  g.add(box(1.34, 0.08, 1.84, mat.metal(C.steelMid), 0, 3.59, 0));
  for (const x of [-0.68, 0.68]) {
    for (const z of [0.92, -0.92]) {
      g.add(box(0.06, 0.5, 0.06, mat.metal(C.steelMid, 0.4), x, 3.85, z));
    }
  }
  return g;
}

export function transformerBox() {
  const g = group();
  const greenM = mat.paint(0x3f6e52, 0.55);
  g.add(cyl(1.5, 1.6, 0.18, 16, mat.asphalt(), 0, 0.09, 0));
  g.add(box(2.6, 2.2, 2, greenM, 0, 0.18 + 1.1, 0));
  g.add(box(2.7, 0.18, 2.1, mat.paint(0x31573f, 0.6), 0, 2.38 + 0.09, 0));
  for (let i = 0; i < 7; i++) {
    g.add(box(0.1, 1.9, 2.02, mat.paint(0x365f46, 0.6), -1.05 + i * 0.35, 0.18 + 1.05, 0));
  }
  g.add(box(0.9, 0.6, 0.06, mat.glow(C.midAmber, 1.1), 0, 1.5, 1.03));
  for (const [ix, iz] of [[-0.8, -0.5], [0.8, -0.5]]) {
    for (let s = 0; s < 3; s++) {
      g.add(rot(cyl(0.09, 0.12, 0.3, 8, mat.paint(0xb9bec4, 0.4), ix, 2.56 + 0.15 + s * 0.32, iz)));
    }
    g.add(cyl(0.05, 0.05, 0.5, 6, mat.metal(C.steelLight), ix, 3.6, iz));
  }
  return g;
}

import * as THREE from 'three';
import { C, mat, box, cyl, sph, torus, tubeAlong, group, at, rot } from '../palette.mjs';

export function lampSingle() {
  const g = group();
  const poleM = mat.metal(C.steelDark);
  g.add(cyl(0.34, 0.42, 0.3, 12, poleM, 0, 0.15, 0));
  g.add(cyl(0.14, 0.2, 6.4, 10, poleM, 0, 3.5, 0));
  const { mesh } = tubeAlong([[0, 6.7, 0], [0.4, 7, -0.5], [1.1, 7.05, -1]], 0.11, poleM, 20);
  g.add(mesh);
  g.add(box(1.15, 0.22, 0.55, mat.metal(C.steelMid), 1.35, 6.95, -1.25));
  g.add(box(0.9, 0.08, 0.38, mat.glow(0xffedc2, 2.8), 1.35, 6.82, -1.25));
  return g;
}

export function lampDouble() {
  const g = group();
  const poleM = mat.metal(C.steelDark);
  g.add(cyl(0.36, 0.46, 0.32, 12, poleM, 0, 0.16, 0));
  g.add(cyl(0.15, 0.22, 7, 10, poleM, 0, 3.8, 0));
  for (const dir of [1, -1]) {
    const arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 7.2, 0),
      new THREE.Vector3(dir * 0.7, 7.45, 0),
      new THREE.Vector3(dir * 1.7, 7.35, 0),
    ]), 18, 0.11, 8, false), poleM);
    g.add(arm);
    g.add(box(1.15, 0.22, 0.55, mat.metal(C.steelMid), dir * 2.05, 7.28, 0));
    g.add(box(0.9, 0.08, 0.38, mat.glow(0xffedc2, 2.8), dir * 2.05, 7.15, 0));
  }
  return g;
}

export function trafficLight() {
  const g = group();
  const poleM = mat.metal(0x4c5257);
  g.add(cyl(0.3, 0.38, 0.26, 12, poleM, 0, 0.13, 0));
  g.add(cyl(0.13, 0.17, 4.6, 10, poleM, 0, 2.55, 0));
  const arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 4.85, 0), new THREE.Vector3(-0.9, 4.92, 0), new THREE.Vector3(-1.9, 4.85, 0),
  ]), 16, 0.09, 8, false), poleM);
  g.add(arm);
  g.add(box(0.52, 1.5, 0.44, mat.paint(0x22262a, 0.6), -2.15, 4.1, 0));
  for (let i = 0; i < 3; i++) {
    const c = [C.errorRed, C.midAmber, C.fastGreen][i];
    g.add(at(rot(cyl(0.16, 0.16, 0.06, 14, mat.glow(c, 2.6)), Math.PI / 2), -2.15, 4.95 - i * 0.48, 0.23));
  }
  g.add(box(0.56, 1.54, 0.1, mat.paint(0x17191b, 0.7), -2.15, 4.1, -0.24));
  return g;
}

export function busStop() {
  const g = group();
  const frameM = mat.metal(0x495057);
  for (const x of [-2.2, 2.2]) {
    g.add(box(0.14, 2.9, 0.14, frameM, x, 1.45, -1));
    g.add(box(0.14, 2.9, 0.14, frameM, x * 0.72, 1.45, 1));
  }
  const roof = at(rot(box(5.4, 0.12, 2.8, mat.paint(0x39404a, 0.5)), 0, 0, 0), 0, 0, 0);
  roof.rotation.x = 0.07;
  roof.position.set(0, 3.02, 0);
  g.add(roof);
  g.add(box(5, 2.2, 0.1, mat.glass(0xaadcec), 0, 1.75, -1.05));
  g.add(box(0.1, 2.2, 2, mat.glass(0xaadcec), -2.2, 1.75, 0.05));
  const seatM = mat.paint(0x8b6f47, 0.7);
  g.add(box(4, 0.14, 0.6, seatM, 0, 0.62, -0.62));
  g.add(rot(at(box(4, 0.5, 0.12, seatM), 0, 0.95, -0.88)));
  for (const bx of [-1.7, 1.7]) {
    g.add(box(0.1, 0.55, 0.5, frameM, bx, 0.32, -0.62));
  }
  g.add(cyl(0.07, 0.07, 3.2, 8, frameM, 3, 1.6, 0.6));
  g.add(box(0.9, 0.7, 0.08, mat.glow(C.apiCyan, 1.6), 3, 2.75, 0.6));
  return g;
}

export function bench() {
  const g = group();
  const woodM = mat.wood();
  const legM = mat.metal(0x4c5257);
  for (const x of [-1.05, 1.05]) {
    g.add(box(0.12, 0.45, 0.55, legM, x, 0.225, 0.12));
    g.add(box(0.12, 0.5, 0.12, legM, x, 0.62, -0.24));
  }
  for (let i = 0; i < 3; i++) {
    g.add(box(2.5, 0.06, 0.14, woodM, 0, 0.46 + i * 0.005, -0.06 + i * 0.19));
  }
  for (let i = 0; i < 2; i++) {
    g.add(rot(at(box(0.14, 0.5, 0.06, woodM), 0, 0, 0), 0.42), );
    const back = g.children[g.children.length - 1];
    back.position.set(0, 0.82 + i * 0.22, -0.31 + i * 0.03);
    back.rotation.x = 0.42;
  }
  return g;
}

export function hydrant() {
  const g = group();
  const redM = mat.paint(0xd23b34, 0.45);
  g.add(cyl(0.34, 0.4, 0.16, 12, redM, 0, 0.08, 0));
  g.add(cyl(0.26, 0.3, 0.75, 12, redM, 0, 0.53, 0));
  g.add(sph(0.27, redM, 14, 0, 0.98, 0));
  g.add(cyl(0.1, 0.1, 0.18, 8, mat.paint(0xf0d64e, 0.35), 0, 1.18, 0));
  for (const a of [0, Math.PI]) {
    const cap = at(rot(cyl(0.13, 0.13, 0.16, 10, mat.paint(0xe8ebee, 0.4)), Math.PI / 2), Math.cos(a) * 0.33, 0.78, 0);
    cap.rotation.z = a;
    g.add(cap);
  }
  return g;
}

export function trashBin() {
  const g = group();
  const bodyM = mat.paint(0x3d5e43, 0.65);
  g.add(cyl(0.42, 0.34, 1.05, 14, bodyM, 0, 0.585, 0));
  g.add(torus(0.41, 0.04, mat.paint(0x2c4531, 0.6), 0, 0.85, 0, Math.PI / 2));
  g.add(cyl(0.46, 0.46, 0.1, 14, mat.paint(0x2c4531, 0.6), 0, 1.16, 0));
  g.add(rot(at(box(0.5, 0.05, 0.34, mat.std(0x14171a)), 0, 0, 0), -0.5)).children;
  const flap = g.children[g.children.length - 1];
  flap.position.set(0.1, 1.26, 0.28);
  flap.rotation.x = -0.55;
  g.add(flap);
  g.add(cyl(0.44, 0.5, 0.1, 14, mat.concrete(C.concreteDark), 0, 0.05, 0));
  return g;
}

export function mailbox() {
  const g = group();
  const blueM = mat.paint(0x2f5fd0, 0.4);
  for (const x of [-0.3, 0.3]) {
    g.add(box(0.09, 0.85, 0.09, mat.metal(0x4c5257), x, 0.425, 0));
  }
  g.add(box(0.95, 0.55, 0.6, blueM, 0, 0.85 + 0.275, 0));
  const dome = cyl(0.3, 0.3, 0.95, 14, blueM, 0, 1.4, 0);
  dome.rotation.z = Math.PI / 2;
  g.add(dome);
  g.add(box(0.5, 0.05, 0.05, mat.std(0x14171a), 0.12, 1.28, 0.31));
  g.add(at(sph(0.05, mat.chrome(), 8), -0.38, 1.15, 0.3));
  g.add(box(0.08, 0.3, 0.08, mat.chrome(), 0.42, 1.12, 0.28));
  return g;
}

export function phoneBooth() {
  const g = group();
  const frameM = mat.paint(0xc23b34, 0.5);
  const W = 1, D = 1, H = 2.4;
  g.add(box(W + 0.1, 0.14, D + 0.1, frameM, 0, 0.07, 0));
  g.add(box(W + 0.1, 0.16, D + 0.1, frameM, 0, H, 0));
  for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) {
    g.add(box(0.09, H, 0.09, frameM, x, H / 2, z));
  }
  g.add(box(W - 0.05, H - 0.3, 0.06, mat.glass(0xbfe4ef), 0, H / 2 + 0.05, -D / 2));
  g.add(box(W - 0.05, H - 0.3, 0.06, mat.glass(0xbfe4ef), 0, H / 2 + 0.05, D / 2));
  g.add(box(0.06, H - 0.3, D - 0.05, mat.glass(0xbfe4ef), -W / 2, H / 2 + 0.05, 0));
  g.add(box(0.3, 0.5, 0.22, mat.std(0x181b1e), -0.25, 1, -0.15));
  g.add(box(W - 0.05, 0.3, 0.06, mat.glow(0xfff1cf, 1.6), 0, H - 0.42, D / 2 - 0.01));
  return g;
}

export function kiosk() {
  const g = group();
  g.add(box(3.4, 0.3, 2.6, mat.asphalt(), 0, 0.15, 0));
  const bodyM = mat.paint(0x2e5e50, 0.6);
  g.add(box(3.2, 2.3, 2.4, bodyM, 0, 0.3 + 1.15, 0));
  g.add(box(2.4, 1, 0.12, mat.std(0x11181a), 0, 1.5, 1.21));
  g.add(box(3.2, 0.16, 2.5, mat.paint(0x24473d, 0.6), 0, 2.68, 0));
  for (let i = 0; i < 6; i++) {
    const c = i % 2 === 0 ? 0xd8453e : 0xf0ede6;
    const stripe = box(0.56, 0.1, 1, mat.paint(c, 0.6), -1.4 + i * 0.56, 3.02, 0.55);
    stripe.rotation.x = -0.35;
    g.add(stripe);
  }
  g.add(box(2.2, 0.6, 0.12, mat.glow(C.midAmber, 1.7), 0, 2.15, 1.24));
  g.add(box(0.7, 1.1, 0.5, mat.metal(C.steelLight), 1.9, 0.55, 0.6));
  return g;
}

export function fountain() {
  const g = group();
  const stoneM = mat.concrete(0xa9aa9e);
  g.add(cyl(3.4, 3.6, 0.5, 28, stoneM, 0, 0.25, 0));
  g.add(torus(3.15, 0.3, stoneM, 0, 0.72, 0, Math.PI / 2));
  g.add(cyl(3, 3, 0.12, 28, mat.water(), 0, 0.78, 0));
  g.add(cyl(0.5, 0.7, 1.3, 12, stoneM, 0, 1.3, 0));
  g.add(cyl(1.5, 1.1, 0.3, 20, stoneM, 0, 2.05, 0));
  g.add(torus(1.45, 0.14, stoneM, 0, 2.22, 0, Math.PI / 2));
  g.add(cyl(1.3, 1.3, 0.08, 20, mat.water(), 0, 2.12, 0));
  g.add(cyl(0.16, 0.16, 0.9, 10, stoneM, 0, 2.6, 0));
  g.add(sph(0.22, mat.water(), 10, 0, 3.1, 0));
  g.add(cyl(0.05, 0.14, 0.5, 8, mat.water(), 0, 3.3, 0));
  return g;
}

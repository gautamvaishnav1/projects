import * as THREE from 'three';
import { C, mat, box, cyl, sph, torus, group, at, rot, wheelSet } from '../palette.mjs';

function sedan(bodyColor, signColor) {
  const g = group();
  const bodyM = mat.paint(bodyColor, 0.35);
  const glassM = mat.glassDark();
  const lower = box(1.9, 0.62, 4.4, bodyM, 0, 0.42);
  lower.geometry = new THREE.BoxGeometry(1.9, 0.62, 4.4);
  g.add(lower);
  const hood = box(1.86, 0.3, 1.15, bodyM, 0, 1.02, 1.55);
  const trunk = box(1.86, 0.3, 1.05, bodyM, 0, 1.02, -1.6);
  const cabin = rot(at(box(1.7, 0.72, 2.2, glassM), 0, 1.36, -0.25));
  cabin.scale.set(1, 1, 0.94);
  const roof = box(1.55, 0.14, 1.95, bodyM, 0, 1.76, -0.25);
  g.add(hood, trunk, cabin, roof);
  wheelSet(g, [[-0.95, 0, 1.42], [0.95, 0, 1.42], [-0.95, 0, -1.45], [0.95, 0, -1.45]], 0.38, 0.26);
  g.add(box(0.5, 0.16, 0.08, mat.glow(0xfff6d8, 2.5), -0.62, 0.95, 2.19));
  g.add(box(0.5, 0.16, 0.08, mat.glow(0xfff6d8, 2.5), 0.62, 0.95, 2.19));
  g.add(box(0.52, 0.13, 0.08, mat.glow(C.errorRed, 2.2), -0.6, 0.98, -2.21));
  g.add(box(0.52, 0.13, 0.08, mat.glow(C.errorRed, 2.2), 0.6, 0.98, -2.21));
  if (signColor !== null) {
    g.add(box(0.78, 0.24, 0.42, mat.glow(signColor, 2.4), 0, 1.93, -0.25));
    g.add(box(0.84, 0.07, 0.48, mat.black(), 0, 1.82, -0.25));
  }
  return g;
}

export function carFast() { return sedan(C.fastGreen, C.fastGreen); }
export function carMid() { return sedan(C.midAmber, C.midAmber); }
export function carSlow() { return sedan(C.slowRed, C.slowRed); }
export function carPending() { return sedan(C.pendingBlue, C.pendingBlue); }
export function carIdle() { return sedan(C.idleGrey, null); }

export function deliveryTruck() {
  const g = group();
  const cabM = mat.paint(0xe9edf0, 0.4);
  g.add(cabM === undefined ? null : box(2.3, 1.9, 2, cabM, 0, 0.65, 2.6));
  g.add(box(2.32, 0.5, 2.05, mat.paint(0xb9c0c6, 0.5), 0, 0.5, 2.6));
  g.add(rot(at(box(2.1, 0.8, 0.12, mat.glassDark()), 0, 1.75, 3.58)));
  g.add(box(2.34, 0.16, 2.1, mat.paint(0x8f969c, 0.5), 0, 2.56, 2.6));
  const cargo = box(2.5, 2.6, 5.6, mat.paint(0xf4f6f7, 0.6), 0, 0.85, -0.8);
  g.add(cargo);
  g.add(box(2.54, 0.5, 5.64, mat.glow(C.dbGreen, 1.5), 0, 1.7, -0.8).translateY(-0.25));
  g.add(box(2.56, 0.18, 5.66, mat.metal(C.steelMid), 0, 0.85 + 0.09, -0.8));
  g.add(box(2.56, 0.18, 5.66, mat.metal(C.steelMid), 0, 0.85 + 2.51, -0.8));
  wheelSet(g, [[-1.1, 0, 2.7], [1.1, 0, 2.7], [-1.15, 0, -1.6], [1.15, 0, -1.6], [-1.15, 0, -2.6], [1.15, 0, -2.6]], 0.52, 0.34);
  g.add(box(0.6, 0.18, 0.08, mat.glow(0xfff6d8, 2.5), -0.7, 1.05, 3.62));
  g.add(box(0.6, 0.18, 0.08, mat.glow(0xfff6d8, 2.5), 0.7, 1.05, 3.62));
  return g;
}

export function bus() {
  const g = group();
  const L = 10.5, W = 2.5, H = 2.9;
  const bodyM = mat.paint(0x2f7fd4, 0.45);
  g.add(box(W, H - 0.55, L, bodyM, 0, 0.55 + (H - 0.55) / 2, 0));
  g.add(box(W + 0.06, 0.28, L + 0.04, mat.paint(0x22629f, 0.5), 0, 0.62, 0));
  const winM = mat.glass(0xaadcec);
  let z = -L / 2 + 1.1;
  while (z < L / 2 - 1) {
    g.add(box(W + 0.06, 1, 1.5, winM, 0, H - 1.05, z));
    z += 1.9;
  }
  g.add(rot(at(box(W - 0.2, 1.05, 0.14, winM), 0, H - 1.02, L / 2 - 0.02)));
  g.add(box(W - 0.5, 0.34, 1.6, mat.glow(0xffe9a8, 1.8), 0, 0.92, L / 2 + 0.02));
  g.add(box(1.4, 0.3, 0.1, mat.glow(C.midAmber, 1.6), 0, H - 0.35, L / 2 - 0.35));
  wheelSet(g, [[-1.18, 0, 3.3], [1.18, 0, 3.3], [-1.18, 0, -3.1], [1.18, 0, -3.1], [-1.18, 0, -4.3], [1.18, 0, -4.3]], 0.5, 0.32);
  return g;
}

export function ambulance() {
  const g = group();
  const whiteM = mat.paint(0xf4f6f7, 0.4);
  g.add(box(2.4, 2.5, 5.4, whiteM, 0, 0.6 + 1.25, -0.3));
  g.add(box(2.44, 0.55, 5.44, mat.paint(C.errorRed, 0.45), 0, 1.35, -0.3));
  g.add(box(2.2, 0.9, 0.16, mat.glassDark(), 0, 1.9, 2.42));
  g.add(box(2.46, 1.9, 1.9, whiteM, 0, 0.6 + 0.95, 2.5));
  g.add(rot(at(box(2, 0.75, 0.14, mat.glassDark()), 0, 1.85, 3.47)));
  g.add(box(2.5, 0.3, 0.5, mat.paint(C.errorRed, 0.4), 0, 3.15, -0.3));
  g.add(box(0.55, 0.2, 0.3, mat.glow(0xff4040, 3), -0.6, 3.4, -0.3));
  g.add(box(0.55, 0.2, 0.3, mat.glow(0x4d8dff, 3), 0.6, 3.4, -0.3));
  g.add(box(0.9, 0.5, 0.08, mat.std(0xd7dde1), 0, 2.1, -3.03));
  wheelSet(g, [[-1.12, 0, 1.7], [1.12, 0, 1.7], [-1.12, 0, -2], [1.12, 0, -2]], 0.46, 0.3);
  return g;
}

export function towTruck() {
  const g = group();
  const yellowM = mat.paint(0xf2b21f, 0.45);
  g.add(box(2.2, 1.5, 2.2, yellowM, 0, 0.62, 2.2));
  g.add(rot(at(box(1.9, 0.7, 0.14, mat.glassDark()), 0, 1.55, 3.28)));
  g.add(box(2.24, 0.2, 2.24, mat.paint(0xc99517, 0.5), 0, 2.14, 2.2));
  const bed = at(rot(box(2.2, 0.24, 5.2, mat.metal(C.steelDark)), 0.12), 0, 1.35, -1.35);
  g.add(bed);
  for (let i = 0; i < 4; i++) {
    g.add(at(rot(box(2.24, 0.1, 0.3, mat.paint(0x8b9096)), 0.12), 0, 1.42, -3.6 + i * 1.15));
  }
  const boom = rot(at(cyl(0.14, 0.18, 3.6, 10, yellowM, -0.7, 2.5, -3.4), ), -0.7, 0, 0.25);
  g.add(boom);
  g.add(at(sph(0.3, mat.metal(C.steelLight), 10), -1.35, 1.7, -4.9));
  g.add(box(1.5, 0.26, 0.5, mat.glow(C.midAmber, 2.6), 0, 2.34, 2.2));
  wheelSet(g, [[-1.05, 0, 2.3], [1.05, 0, 2.3], [-1.08, 0, -2.4], [1.08, 0, -2.4]], 0.46, 0.3);
  return g;
}

export function newsHelicopter() {
  const g = group();
  const bodyM = mat.paint(0x27435e, 0.4);
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(1.15, 2.6, 8, 16), bodyM);
  fus.rotation.x = Math.PI / 2;
  fus.position.y = 1.9;
  g.add(fus);
  const nose = at(sph(0.85, mat.glass(0x9fc9dd), 16), 0, 1.95, 2.05);
  nose.scale.set(0.9, 0.85, 1);
  g.add(nose);
  g.add(box(0.5, 1.5, 3.4, bodyM, 0, 2.35, -3));
  const fin = at(rot(box(0.16, 1.5, 0.9, mat.paint(0xdfe3e6, 0.45))), 0, 0, 0);
  fin.position.set(0, 3.4, -4.5);
  g.add(fin);
  g.add(box(0.12, 0.7, 0.5, mat.paint(0xdfe3e6, 0.45), 0.28, 3.55, -4.5));
  const mast = cyl(0.16, 0.16, 0.6, 8, mat.metal(C.steelDark), 0, 3.2, 0.2);
  g.add(mast);
  const bladeM = mat.paint(0x30353a, 0.5);
  g.add(box(11, 0.07, 0.5, bladeM, 0, 3.52, 0.2));
  g.add(box(0.5, 0.07, 11, bladeM, 0, 3.52, 0.2));
  g.add(at(sph(0.28, mat.glow(C.errorRed, 2.4)), 0, 3.62, 0.2));
  const tailRotorHub = at(sph(0.16, mat.metal(C.steelDark), 8), 0.42, 3.55, -4.5);
  g.add(tailRotorHub);
  g.add(box(0.1, 2.4, 0.28, bladeM, 0.42, 3.55, -4.5));
  for (const sx of [-0.95, 0.95]) {
    g.add(box(0.16, 0.9, 2.6, mat.paint(0x394046, 0.4), sx * 1.6, 0.45, -0.2));
    g.add(box(0.2, 0.16, 4.4, mat.metal(C.steelDark), sx * 1.6, 0.08, -0.2));
    g.add(box(0.14, 0.5, 0.14, mat.metal(C.steelDark), sx * 1.6, 0.16, 0.9));
  }
  g.add(at(sph(0.42, mat.glass(C.apiCyan), 14), 0, 1.05, 1.5));
  g.add(box(0.7, 0.3, 0.4, mat.glow(C.midAmber, 1.8), 0.9, 1.6, -1.4));
  return g;
}

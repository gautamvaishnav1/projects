import * as THREE from 'three';
import { C, mat, box, cyl, sph, torus, group, at, rot } from '../palette.mjs';

export function factoryService() {
  const g = group();
  const pinkM = mat.paint(C.servicePink, 0.6);
  const pinkDark = mat.paint(C.servicePinkDark, 0.65);
  g.add(box(26, 1, 16, mat.concrete(C.concreteDark), 0, 0.5, 0));
  g.add(box(24, 8.5, 14, pinkM, 0, 1 + 4.25, 0));
  g.add(box(24.4, 0.7, 14.4, pinkDark, 0, 9.5 + 0.35, 0));
  for (const sx of [-8, -2.7, 2.7]) {
    g.add(box(3.6, 0.5, 10.5, mat.glass(C.glassTint), sx, 10.55 + 0.25, -1.5));
    g.add(box(3.6, 1.4, 0.4, pinkM, sx, 10.55 + 0.95, -6.6));
    g.add(box(3.6, 1.4, 0.4, pinkM, sx, 10.55 + 0.95, 3.6));
  }
  for (let i = -2; i <= 2; i++) {
    g.add(box(0.15, 2.6, 3, mat.std(0x3a222e), i * 4.6, 2.2, 7.05));
  }
  g.add(box(4.6, 4.2, 0.35, mat.metal(C.steelDark), 8.5, 1 + 2.1, 7.08));
  for (let i = 0; i < 5; i++) {
    g.add(box(4.7, 0.12, 0.12, mat.paint(0xdadfe3), 8.5, 1.6 + i * 0.75, 7.28));
  }
  for (const cx of [-17, -13]) {
    g.add(cyl(1.15, 1.35, 15, 14, pinkM, cx, 1 + 7.5, -4));
    g.add(cyl(1.28, 1.28, 1.1, 14, mat.paint(0xe8ebee), cx, 13.4, -4));
    g.add(cyl(1.22, 1.22, 1.1, 14, mat.paint(0xe8ebee), cx, 11.6, -4));
    g.add(torus(1.18, 0.09, pinkDark, cx, 9.4, -4, Math.PI / 2));
    g.add(at(sph(1.16, mat.std(0xbfc6cc, { opacity: 0.85 })), cx, 16.6, -4));
    g.add(at(sph(0.8, mat.std(0xcdd3d8, { opacity: 0.7 })), cx + 0.5, 17.8, -4));
  }
  const pipeM = mat.metal(C.steelMid);
  for (let i = 0; i < 3; i++) {
    const p = rot(cyl(0.32, 0.32, 20, 10, pipeM, 0, 2.6 + i * 0.9, -8.6), Math.PI / 2);
    g.add(p);
  }
  for (const px of [-9, -3, 3, 9]) {
    g.add(box(0.3, 3.4, 1.2, pipeM, px, 1.7, -8.6));
  }
  g.add(box(6, 4, 5, pinkM, -19, 1 + 2, 4));
  g.add(box(6.3, 0.4, 5.3, pinkDark, -19, 5.2, 4));
  return g;
}

export function warehouseDb() {
  const g = group();
  const greenM = mat.paint(C.dbGreen, 0.55);
  const greenDark = mat.paint(C.dbGreenDark, 0.6);
  g.add(box(42, 1, 20, mat.asphalt(), 0, 0.5, 0));
  g.add(box(40, 8.5, 18, greenM, 0, 1 + 4.25, 0));
  g.add(box(40.6, 0.8, 18.6, greenDark, 0, 9.5 + 0.4, 0));
  for (const dz of [-5, 0, 5]) {
    g.add(box(0.35, 5.5, 3.6, mat.metal(C.steelDark), 20.1, 1 + 2.75, dz));
    for (let i = 0; i < 7; i++) {
      g.add(box(0.42, 0.14, 3.5, mat.paint(0x4a5056), 20.12, 1.4 + i * 0.78, dz));
    }
    g.add(box(1.4, 0.5, 4, mat.concrete(C.concreteDark), 21, 1.25, dz));
  }
  for (let i = -1; i <= 1; i += 2) {
    g.add(box(0.2, 2.4, 12, mat.std(0x123326), -20.06, 3.6, i * 0.01));
  }
  g.add(box(10, 1.6, 0.4, mat.glow(C.dbGreen, 1.6), -8, 6.6, 9.15));
  for (const rx of [-12, -4, 4]) {
    g.add(box(2.6, 1, 2.6, mat.metal(C.steelMid), rx, 10.3 + 0.5, -3));
    g.add(rot(cyl(0.9, 0.9, 0.24, 16, mat.std(0x0a0d10), rx, 10.3 + 1.1, -3)));
  }
  for (let lvl = 0; lvl < 3; lvl++) {
    for (let i = 0; i < 2; i++) {
      const bx = 26.5 + i * 2.3;
      const bz = 3.5 + lvl * 0.15;
      g.add(rot(box(2.1, 2.1, 2.1, mat.wood(), bx, 1 + 1.05 + lvl * 2.15, bz - lvl * 0.6), 0, 0, 0, ), );
    }
  }
  g.add(box(3.4, 2.6, 2.2, mat.metal(C.steelLight), 30.5, 1 + 1.3, -4));
  return g;
}

export function officeTowerA() {
  const g = group();
  g.add(box(17, 1.2, 17, mat.concrete(), 0, 0.6, 0));
  g.add(box(15, 5, 15, mat.paint(0x7c848c, 0.5), 0, 1.2 + 2.5, 0));
  for (let i = -1; i <= 1; i += 2) {
    g.add(box(6, 3.2, 0.3, mat.glassDark(), i * 3.4, 2.4, 7.56));
  }
  const H = 38;
  const glassM = mat.glass(0x9fdcec);
  g.add(at(box(13, H, 13, glassM), 0, 6.2 + H / 2, 0));
  let y = 6.2;
  while (y < 6.2 + H) {
    g.add(box(13.5, 0.34, 13.5, mat.metal(C.steelLight), 0, y, 0));
    y += 3.1;
  }
  for (const [x, z] of [[-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5]]) {
    g.add(box(0.8, H, 0.8, mat.metal(C.steelDark), x, 6.2 + H / 2, z));
  }
  g.add(box(14, 1, 14, mat.metal(C.steelDark), 0, 6.2 + H + 0.5, 0));
  g.add(box(4, 2.2, 3, mat.metal(C.steelMid), -3, 6.2 + H + 1.5, -2));
  g.add(box(2.4, 3.4, 2.4, mat.metal(C.steelMid), 4, 6.2 + H + 2.2, 2.5));
  return g;
}

export function officeTowerB() {
  const g = group();
  const wallM = mat.paint(0xcfd4d8, 0.7);
  const winGlow = mat.std(0xfff3cf, { emissive: 0xffe9b8, emissiveIntensity: 0.85 });
  g.add(box(20, 1, 20, mat.concrete(), 0, 0.5, 0));
  g.add(box(18, 16, 18, wallM, 0, 1 + 8, 0));
  g.add(box(13, 11, 13, wallM, 0, 17 + 5.5, 0));
  g.add(box(8, 7, 8, wallM, 0, 28 + 3.5, 0));
  let y = 2.6;
  for (let t = 0; t < 3; t++) {
    const w = [18, 13, 8][t];
    const rows = [5, 3, 2][t];
    const baseY = [1, 17, 28][t];
    for (let r = 0; r < rows; r++) {
      const wy = baseY + 1.8 + r * 3;
      for (const side of [[w + 0.2, 0.2, 0, w / 2 + 0.05], [w + 0.2, 0.2, 0, -w / 2 - 0.05]]) {
        void side;
      }
      g.add(box(w - 1, 1.5, 0.24, winGlow, 0, wy, w / 2 + 0.02));
      g.add(box(w - 1, 1.5, 0.24, winGlow, 0, wy, -w / 2 - 0.02));
      g.add(box(0.24, 1.5, w - 1, winGlow, w / 2 + 0.02, wy, 0));
      g.add(box(0.24, 1.5, w - 1, winGlow, -w / 2 - 0.02, wy, 0));
    }
    if (t < 2) g.add(box(w, 0.9, w, mat.concrete(C.concreteDark), 0, baseY + [16, 11][t] + 0.45, 0));
    void y;
  }
  g.add(box(3, 2, 3, mat.metal(C.steelMid), 1.5, 35 + 1, -1.5));
  g.add(cyl(0.14, 0.14, 4, 6, mat.metal(), -2, 35 + 2, 2));
  return g;
}

export function officeTowerC() {
  const g = group();
  g.add(cyl(9.5, 9.5, 1.2, 24, mat.concrete(), 0, 0.6, 0));
  g.add(cyl(8.5, 8.5, 4.5, 24, mat.paint(0x79818a, 0.55), 0, 1.2 + 2.25, 0));
  const H = 30;
  const glassM = mat.glass(C.apiCyan);
  g.add(cyl(6.8, 6.8, H, 24, glassM, 0, 5.7 + H / 2, 0));
  g.add(cyl(7.15, 7.15, 0.4, 24, mat.metal(C.steelLight), 0, 5.7 + H / 2, 0));
  for (let i = 0; i < 9; i++) {
    g.add(cyl(7, 7, 0.3, 24, mat.metal(C.steelLight), 0, 7.2 + i * 3.2, 0));
  }
  g.add(cyl(7.4, 7.4, 0.9, 24, mat.metal(C.steelDark), 0, 5.7 + H + 0.45, 0));
  g.add(cyl(6.4, 6.4, 0.5, 24, mat.paint(0x565d64, 0.6), 0, 5.7 + H + 1.1, 0));
  for (const a of [0, 1.1, 2.2, 3.3]) {
    g.add(box(1.6, 0.14, 0.14, mat.paint(0xe8e8e2, 0.6), Math.cos(a) * 3, 5.7 + H + 1.42, Math.sin(a) * 3));
  }
  g.add(cyl(0.2, 0.2, 3.4, 8, mat.metal(), 0, 5.7 + H + 1.4, 0));
  g.add(at(sph(0.3, mat.glow(C.errorRed, 2.6)), 0, 5.7 + H + 3.2, 0));
  return g;
}

export function serverFarm() {
  const g = group();
  g.add(box(34, 1, 14, mat.asphalt(), 0, 0.5, 0));
  g.add(box(32, 6, 12, mat.paint(0xdfe3e6, 0.65), 0, 1 + 3, 0));
  g.add(box(32.4, 0.5, 12.4, mat.metal(C.steelMid), 0, 7 + 0.25, 0));
  let lx = -15;
  while (lx < 15) {
    g.add(box(1.6, 2.2, 0.2, mat.std(0x272b2f), lx, 3.4, 6.06));
    lx += 2.4;
  }
  g.add(box(31, 0.18, 0.14, mat.glow(C.fastGreen, 2), 0, 1.7, 6.12));
  for (const fx of [-10, -3.4, 3.4, 10]) {
    g.add(rot(torus(1.15, 0.16, mat.metal(C.steelDark), fx, 7.75, -2), Math.PI / 2));
    g.add(rot(cyl(0.95, 0.95, 0.2, 16, mat.std(0x101315), fx, 7.75, -2)));
    g.add(box(0.24, 1.7, 0.24, mat.metal(C.steelLight), fx, 7.75, -2));
  }
  g.add(box(4, 3.2, 0.3, mat.glassDark(), 14.5, 1 + 1.6, 6.1));
  g.add(box(5, 0.4, 2.4, mat.metal(C.steelMid), 14.5, 4.4, 6.8));
  return g;
}

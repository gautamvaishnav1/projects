import * as THREE from "three";

/**
 * Procedural window-grid texture for one building.
 * Walls are the (darkened) base color; windows are randomly lit warm or unlit dark.
 * Used as both `map` and `emissiveMap` — dark walls barely emit, lit windows glow.
 */
export function makeWindowTexture(
  baseColor: string,
  cols: number,
  rows: number,
  seed: number,
): THREE.CanvasTexture {
  const cell = 16;
  const pad = 3;
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, cols) * cell;
  canvas.height = Math.max(2, rows) * cell;
  const ctx = canvas.getContext("2d")!;

  const wall = new THREE.Color(baseColor).multiplyScalar(0.38);
  ctx.fillStyle = `#${wall.getHexString()}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // deterministic PRNG per building
  let s = seed | 0 || 1;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = rnd() < 0.55;
      if (!lit) continue;
      // warm white with slight variance
      const v = 200 + Math.floor(rnd() * 55);
      ctx.fillStyle = rnd() < 0.12 ? `rgb(140, ${v - 60}, 255)` : `rgb(${v}, ${Math.floor(v * 0.86)}, 150)`;
      ctx.fillRect(c * cell + pad, r * cell + pad, cell - pad * 2, cell - pad * 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

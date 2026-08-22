import * as THREE from "three";
const cnv = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
let seed = 42; const R = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
const tex = (c: HTMLCanvasElement, rx = 1, ry = 1) => {
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry); t.anisotropy = 8; t.colorSpace = THREE.SRGBColorSpace; return t;
};

export function facadeTexture(base: string, style: "concrete" | "brick" | "glass" | "metal", lit = 0.5) {
  const w = 128, h = 256, c = cnv(w, h), g = c.getContext("2d")!;
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + R() * 0.05})`; g.fillRect(R() * w, R() * h, 2, 2); }
  if (style === "brick") { g.strokeStyle = "rgba(0,0,0,.28)"; for (let y = 0; y < h; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let y = 0; y < h; y += 8) for (let x = ((y / 8) % 2) * 8; x < w; x += 16) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 8); g.stroke(); } }
  if (style === "metal") { g.fillStyle = "rgba(0,0,0,.2)"; for (let y = 0; y < h; y += 10) g.fillRect(0, y, w, 3); }
  const litC = cnv(w, h), lg = litC.getContext("2d")!; lg.fillStyle = "#000"; lg.fillRect(0, 0, w, h);
  const cols = 4, rows = 8, ww = w / cols, wh = h / rows;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const x = q * ww + ww * 0.22, y = r * wh + wh * 0.2, iw = ww * 0.56, ih = wh * 0.6, isLit = R() < lit;
    g.fillStyle = style === "glass" ? (isLit ? "rgba(180,230,255,.9)" : "rgba(18,38,66,.9)") : isLit ? "#ffe9a8" : "#0d1420";
    g.fillRect(x, y, iw, ih); g.strokeStyle = "rgba(0,0,0,.5)"; g.strokeRect(x, y, iw, ih);
    if (isLit) { lg.fillStyle = "#fff"; lg.fillRect(x, y, iw, ih); }
  }
  if (style === "glass") { g.fillStyle = "rgba(255,255,255,.09)"; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h); }
  return { map: tex(c), emissive: tex(litC) };
}
export function roofTexture() { const c = cnv(128, 128), g = c.getContext("2d")!; g.fillStyle = "#39404e"; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,255,255,${0.03 + R() * 0.05})`; g.fillRect(R() * 128, R() * 128, 1.5, 1.5); } g.fillStyle = "#252b37"; g.fillRect(84, 84, 28, 20); g.fillRect(16, 20, 20, 14); return tex(c); }
export function asphaltTexture(dashed: boolean) { const c = cnv(128, 128), g = c.getContext("2d")!; g.fillStyle = "#22262d"; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 1600; i++) { g.fillStyle = `rgba(255,255,255,${0.02 + R() * 0.05})`; g.fillRect(R() * 128, R() * 128, 1.6, 1.6); } if (dashed) { g.fillStyle = "#d9a441"; for (let y = 8; y < 128; y += 32) g.fillRect(62, y, 5, 16); } else { g.fillStyle = "rgba(255,255,255,.4)"; g.fillRect(2, 0, 3, 128); g.fillRect(123, 0, 3, 128); } return tex(c); }
export function grassTexture() { const c = cnv(256, 256), g = c.getContext("2d")!; g.fillStyle = "#16281c"; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 5200; i++) { const s = R(); g.fillStyle = `rgba(${30 + s * 40},${80 + s * 60},${40 + s * 30},.25)`; g.fillRect(R() * 256, R() * 256, 2, 2); } return tex(c, 70, 70); }
export function sidewalkTexture() { const c = cnv(128, 128), g = c.getContext("2d")!; g.fillStyle = "#454d5e"; g.fillRect(0, 0, 128, 128); g.strokeStyle = "rgba(0,0,0,.35)"; for (let i = 0; i <= 128; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); } for (let i = 0; i < 500; i++) { g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(R() * 128, R() * 128, 1.5, 1.5); } return tex(c, 3, 2.5); }

export function softCircle() { const c = cnv(64, 64), g = c.getContext("2d")!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }

// ─── photo-based PBR textures from Starlight-res/textures ───
const diskLoader = new THREE.TextureLoader();
const diskTex = (url: string, srgb: boolean, rx: number, ry: number) => {
  const t = diskLoader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry); t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
export function groundTextures() {
  return {
    map: diskTex("/models/textures/grass_diffuse_1k.jpg", true, 64, 64),
    normalMap: diskTex("/models/textures/grass_normal_1k.jpg", false, 64, 64),
  };
}
export function concreteTextures(rx = 6, ry = 3.4) {
  return {
    map: diskTex("/models/textures/concrete_diff_1k.jpg", true, rx, ry),
    normalMap: diskTex("/models/textures/concrete_nor_gl_1k.jpg", false, rx, ry),
  };
}


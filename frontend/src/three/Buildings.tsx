import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Edges, Billboard, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { LaidBuilding, LaidDistrict } from "../lib/layout";
import type { Kind } from "../types";
import { useCity } from "../store/useCity";
import { ENV } from "./env";
import { facadeTexture, roofTexture, sidewalkTexture } from "./textures";
import { SKYSCRAPERS, CHIMNEYS, TANKS, pick } from "./assets";

/** kind → facade recipe */
const STYLE: Record<Kind, { base: string; style: "concrete" | "brick" | "glass" | "metal"; lit: number }> = {
  page: { base: "#3d4f6b", style: "glass", lit: 0.7 },
  component: { base: "#425573", style: "glass", lit: 0.6 },
  context: { base: "#4d5665", style: "concrete", lit: 0.5 },
  route: { base: "#6b4a3a", style: "brick", lit: 0.45 },
  controller: { base: "#59616f", style: "concrete", lit: 0.55 },
  service: { base: "#4a5361", style: "metal", lit: 0.6 },
  middleware: { base: "#5d5347", style: "brick", lit: 0.5 },
  model: { base: "#46505c", style: "metal", lit: 0.4 },
  api: { base: "#2c4a68", style: "glass", lit: 0.75 },
};
const FOOTPRINT: Record<Kind, number> = {
  page: 4.2, component: 4.2, context: 4.6, route: 3.6, controller: 5,
  service: 5, middleware: 3.6, model: 6.4, api: 3,
};

// ─── module-level shared materials (built once per page load) ───────────────
const SIDEWALK = sidewalkTexture();
const ROOF = new THREE.MeshStandardMaterial({ map: roofTexture(), roughness: 0.95 });
const PLINTH = new THREE.MeshStandardMaterial({ map: SIDEWALK, roughness: 1 });
const NIGHT_MATS: THREE.MeshStandardMaterial[] = [];
const facadeCache = new Map<Kind, THREE.MeshStandardMaterial[]>();

function facadeMats(kind: Kind): THREE.MeshStandardMaterial[] {
  let m = facadeCache.get(kind);
  if (!m) {
    const r = STYLE[kind];
    const f = facadeTexture(r.base, r.style, r.lit);
    const side = new THREE.MeshStandardMaterial({
      map: f.map,
      emissiveMap: f.emissive,
      emissive: new THREE.Color(r.style === "glass" ? "#bfe3ff" : "#ffdfae"),
      emissiveIntensity: 0.5,
      roughness: 0.85,
      metalness: r.style === "metal" ? 0.35 : 0.05,
    });
    NIGHT_MATS.push(side);
    // boxGeometry face order: +x, -x, +y(top), -y(bottom), +z, -z
    m = [side, side, ROOF, side, side, side];
    facadeCache.set(kind, m);
  }
  return m;
}

/** drives every registered facade's window glow from the clock */
export function NightMaterials() {
  useFrame(() => {
    const e = 0.15 + ENV.night * 1.5;
    for (const m of NIGHT_MATS) m.emissiveIntensity = e;
  });
  return null;
}

function GltfBuilding({ url, h, fp }: { url: string; h: number; fp: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  // normalize height: measure bbox, scale so building is `h` tall and fits `fp` wide
  const box = useMemo(() => new THREE.Box3().setFromObject(cloned), [cloned]);
  const rawH = Math.max(0.01, box.max.y - box.min.y);
  const rawW = Math.max(0.01, box.max.x - box.min.x, box.max.z - box.min.z);
  const s = h / rawH;
  return <primitive object={cloned} scale={[Math.min(s, (fp * 1.9) / rawW), s, Math.min(s, (fp * 1.9) / rawW)]} />;
}

export function District({ d }: { d: LaidDistrict }) {
  const slab = d.stack === "database" ? [46, 14] : [24, 20];
  return (
    <group position={[d.center[0], 0, d.center[1]]}>
      <mesh position={[0, 0.25, 0]} receiveShadow material={PLINTH}>
        <boxGeometry args={[slab[0], 0.5, slab[1]]} />
      </mesh>
      <Billboard position={[0, d.stack === "database" ? 3 : 12, -slab[1] / 2 + 1]}>
        <Text fontSize={2} color="#dbeafe" anchorX="center" outlineWidth={0.1} outlineColor="#000" letterSpacing={0.15}>
          {d.name.toUpperCase()}
        </Text>
      </Billboard>
    </group>
  );
}

export function Building({ b }: { b: LaidBuilding }) {
  const selected = useCity((s) => s.selectedId === b.id);
  const select = useCity((s) => s.select); const setFocus = useCity((s) => s.setFocus);
  const [hover, setHover] = useState(false);
  const ring = useRef<THREE.MeshBasicMaterial>(null!);
  useFrame(({ clock }) => { if (ring.current) ring.current.opacity = 0.5 + Math.sin(clock.elapsedTime * 5) * 0.3; });

  const warehouse = b.kind === "model", tower = b.kind === "api";
  const h = warehouse ? b.h * 0.55 : tower ? b.h * 1.35 : b.h;
  const fp = FOOTPRINT[b.kind];
  const mats = facadeMats(b.kind);

  return (
    <group position={b.pos}>
      <group
        onClick={(e) => { e.stopPropagation(); select(b.id); setFocus(b.pos[0], b.pos[2]); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      >
        {tower ? (
          <GltfBuilding url={pick(SKYSCRAPERS, b.pos[0] * 31 + b.pos[2])} h={h} fp={fp} />
        ) : (
          <mesh position={[0, h / 2, 0]} castShadow receiveShadow material={mats}>
            <boxGeometry args={[fp, h, fp]} />
          </mesh>
        )}
        {(hover || selected) && (
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[fp * 1.05, h * 1.02, fp * 1.05]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        )}
      </group>
      {/* invisible click proxy — reliable hit target regardless of visuals */}
      {!hover && !selected && (
        <mesh position={[0, h / 2, 0]} visible={false}>
          <boxGeometry args={[fp, h, fp]} />
          <meshBasicMaterial />
        </mesh>
      )}
      {(hover || selected) && (
        <Edges color={b.health === "ok" ? "#22d3ee" : "#f87171"}>
          <boxGeometry args={[fp * 1.02, h * 1.02, fp * 1.02]} />
        </Edges>
      )}
      {warehouse && <GltfBuilding url={pick(TANKS, b.pos[0])} h={h * 0.35} fp={fp * 0.5} />}
      {(b.kind === "service" || b.kind === "controller") && <GltfBuilding url={pick(CHIMNEYS, b.pos[2])} h={h * 0.8} fp={1.2} />}
      {tower && <mesh position={[0, h + 1.6, 0]}><cylinderGeometry args={[0.06, 0.06, 2.2, 6]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} /></mesh>}
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.62, 0]}>
          <ringGeometry args={[3.2, 3.9, 40]} /><meshBasicMaterial ref={ring} color="#22d3ee" transparent depthWrite={false} />
        </mesh>)}
      {hover && (
        <Html center distanceFactor={55} position={[0, h + 1.6, 0]} style={{ pointerEvents: "none" }}>
          <div className="px-2 py-1 rounded-lg glass text-xs whitespace-nowrap border border-cyan-400/30">
            {b.name} · {b.kind} · {b.loc} LOC
          </div>
        </Html>
      )}
      {selected && (
        <Billboard position={[0, h + 3.2, 0]}>
          <Text fontSize={1.4} color="#fff" anchorX="center" outlineWidth={0.08} outlineColor="#000">{b.name}</Text>
        </Billboard>
      )}
    </group>
  );
}

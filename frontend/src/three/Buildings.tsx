import { useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Edges, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { LaidBuilding, LaidDistrict } from "../lib/layout";
import { useCity } from "../store/useCity";
import { sidewalkTexture } from "./textures";
import type { Kind } from "../types";
import { COMMERCIAL, SKYSCRAPERS, SUBURBAN, INDUSTRIAL, CHIMNEYS, TANKS, pick } from "./assets";

/** kind → which GLB family + footprint */
const FAMILY: Record<Kind, "commercial" | "suburban" | "industrial"> = {
  page: "commercial", component: "commercial", context: "commercial",
  route: "suburban", controller: "industrial", service: "industrial",
  middleware: "suburban", model: "industrial", api: "commercial",
};
const FOOTPRINT: Record<Kind, number> = {
  page: 4.2, component: 4.2, context: 4.6, route: 3.6, controller: 5,
  service: 5, middleware: 3.6, model: 6.4, api: 3,
};

const BAD_TINT = { warn: "#b45309", error: "#7f1d1d" };

function GltfBuilding({ url, h, fp, tint }: { url: string; h: number; fp: number; tint?: string }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const tinted = useRef(false);
  if (tint && !tinted.current) {
    cloned.traverse((o: any) => {
      if (o.isMesh) {
        o.material = o.material.clone();
        o.material.color = new THREE.Color(tint).lerp(new THREE.Color("#ffffff"), 0.25);
        o.material.emissive = new THREE.Color(tint);
        o.material.emissiveIntensity = 0.35;
      }
    });
    tinted.current = true;
  }
  // normalize height: measure bbox, scale so building is `h` tall and fits `fp` wide
  const box = useMemo(() => new THREE.Box3().setFromObject(cloned), [cloned]);
  const rawH = Math.max(0.01, box.max.y - box.min.y);
  const rawW = Math.max(0.01, box.max.x - box.min.x, box.max.z - box.min.z);
  const s = h / rawH;
  return <primitive object={cloned} scale={[Math.min(s, (fp * 1.9) / rawW), s, Math.min(s, (fp * 1.9) / rawW)]} />;
}

export function NightMaterials() { return null; }

export function District({ d }: { d: LaidDistrict }) {
  const slab = d.stack === "database" ? [46, 14] : [24, 20];
  return (
    <group position={[d.center[0], 0, d.center[1]]}>
      <mesh position={[0, 0.25, 0]} receiveShadow>
        <boxGeometry args={[slab[0], 0.5, slab[1]]} />
        <meshStandardMaterial map={useMemo(() => sidewalkTexture(), [])} />
      </mesh>
      <Text position={[0, d.stack === "database" ? 3 : 12, -slab[1] / 2 + 1]} fontSize={2} color="#dbeafe" anchorX="center" outlineWidth={0.1} outlineColor="#000" letterSpacing={0.15}>{d.name.toUpperCase()}</Text>
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
  const family = FAMILY[b.kind];
  const url = useMemo(() => {
    if (tower) return pick(SKYSCRAPERS, b.pos[0] * 31 + b.pos[2]); // external APIs live in the skyscrapers
    if (family === "commercial") return pick(COMMERCIAL, b.pos[0] * 31 + b.pos[2]);
    if (family === "suburban") return pick(SUBURBAN, b.pos[0] * 17 + b.pos[2]);
    return pick(INDUSTRIAL, b.pos[0] * 13 + b.pos[2]);
  }, [family, tower, b.pos[0], b.pos[2]]);
  const tint = b.health !== "ok" ? BAD_TINT[b.health] : undefined;

  return (
    <group position={b.pos}>
      <group
        onClick={(e) => { e.stopPropagation(); select(b.id); setFocus(b.pos[0], b.pos[2]); }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = "auto"; }}
      >
        <GltfBuilding url={url} h={h} fp={fp} tint={tint} />
        {(hover || selected) && (
          <mesh position={[0, h / 2, 0]}>
            <boxGeometry args={[fp * 1.05, h * 1.02, fp * 1.05]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        )}
      </group>
      {/* invisible click proxy — reliable hit target regardless of GLB internals */}
      {!hover && !selected && (
        <mesh position={[0, h / 2, 0]} visible={false}>
          <boxGeometry args={[fp, h, fp]} />
          <meshBasicMaterial />
        </mesh>
      )}
      {(hover || selected) && <Edges color="#22d3ee"><boxGeometry args={[fp * 1.02, h * 1.02, fp * 1.02]} /></Edges>}
      {warehouse && <GltfBuilding url={pick(TANKS, b.pos[0])} h={h * 0.35} fp={fp * 0.5} />}
      {(b.kind === "service" || b.kind === "controller") && <GltfBuilding url={pick(CHIMNEYS, b.pos[2])} h={h * 0.8} fp={1.2} />}
      {tower && <mesh position={[0, h + 1.6, 0]}><cylinderGeometry args={[0.06, 0.06, 2.2, 6]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} /></mesh>}
      {selected && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.62, 0]}>
          <ringGeometry args={[3.2, 3.9, 40]} /><meshBasicMaterial ref={ring} color="#22d3ee" transparent depthWrite={false} />
        </mesh>)}
      {(hover || selected) && <Text position={[0, h + 3.2, 0]} fontSize={1.4} color="#fff" anchorX="center" outlineWidth={0.08} outlineColor="#000">{b.name}</Text>}
    </group>
  );
}

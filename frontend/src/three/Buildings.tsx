import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Edges } from "@react-three/drei";
import * as THREE from "three";
import { makeWindowTexture } from "../lib/windows";
import type { LaidBuilding, LaidDistrict } from "../lib/layout";
import type { Stack } from "../types";
import { useCity } from "../store/useCity";

const STACK_COLOR: Record<Stack, string> = {
  frontend: "#1d4ed8",
  backend: "#b45309",
  database: "#047857",
  external: "#0e7490",
};

export function District({ d }: { d: LaidDistrict }) {
  if (d.stack === "database") {
    return (
      <group position={[d.center[0], 0, d.center[1]]}>
        <mesh position={[0, 0.06, 0]} receiveShadow>
          <boxGeometry args={[46, 0.12, 14]} />
          <meshStandardMaterial color="#052e2b" />
        </mesh>
        <Text position={[0, 3, -8]} fontSize={2.2} color="#6ee7b7" anchorX="center" outlineWidth={0.1} outlineColor="#000">
          {d.name.toUpperCase()}
        </Text>
      </group>
    );
  }
  return (
    <group position={[d.center[0], 0, d.center[1]]}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <boxGeometry args={[24, 0.12, 20]} />
        <meshStandardMaterial color={STACK_COLOR[d.stack]} transparent opacity={0.25} />
      </mesh>
      <Text position={[0, 12, -9]} fontSize={2} color="#e2e8f0" anchorX="center" outlineWidth={0.1} outlineColor="#000">
        {d.name.toUpperCase()}
      </Text>
    </group>
  );
}

const seedOf = (id: string) =>
  id.split("").reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) | 0, 7) >>> 16;

export function Building({ b }: { b: LaidBuilding }) {
  const selected = useCity((s) => s.selectedId === b.id);
  const select = useCity((s) => s.select);
  const setFocus = useCity((s) => s.setFocus);
  const [hover, setHover] = useState(false);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const beacon = useRef<THREE.MeshStandardMaterial>(null);

  const base =
    b.health === "error" ? "#ef4444" : b.health === "warn" ? "#f59e0b" : b.color;
  const warehouse = b.kind === "model";
  const tower = b.kind === "api";
  const h = warehouse ? b.h * 0.5 : b.h;

  // window facade texture (also used as emissive map so lit windows glow)
  const tex = useMemo(() => {
    const w = warehouse ? 6 : tower ? 2.5 : 4;
    const cols = Math.max(2, Math.round(w / 1.3));
    const rows = Math.max(2, Math.round(h / 1.4));
    return makeWindowTexture(base, cols, rows, seedOf(b.id) || 12345);
  }, [base, h, warehouse, tower, b.id]);
  useEffect(() => () => tex.dispose(), [tex]);

  const wallMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 0.45,
        roughness: 0.85,
        metalness: 0,
      }),
    [tex],
  );
  const roofMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#141d31", roughness: 0.95 }),
    [],
  );
  useEffect(
    () => () => {
      wallMat.dispose();
      roofMat.dispose();
    },
    [wallMat, roofMat],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (mat.current) {
      mat.current.emissiveIntensity = selected
        ? 0.95 + Math.sin(t * 5) * 0.3
        : hover
          ? 0.85
          : b.health !== "ok"
            ? 0.65 + Math.sin(t * 3) * 0.15
            : 0.45;
    }
    if (beacon.current && tower) {
      beacon.current.emissiveIntensity = 0.5 + Math.max(0, Math.sin(t * 3.2)) * 1.6;
    }
  });

  return (
    <group position={b.pos}>
      <mesh
        position={[0, h / 2 + 0.12, 0]}
        castShadow
        material={[wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]}
        onClick={(e) => {
          e.stopPropagation();
          select(b.id);
          setFocus(b.pos[0], b.pos[2]);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={warehouse ? [6, h, 6] : tower ? [2.5, h * 1.4, 2.5] : [4, h, 4]} />
        {(hover || selected) && <Edges color="#22d3ee" />}
      </mesh>
      {/* api towers get a blinking beacon mast */}
      {tower && (
        <>
          <mesh position={[0, h * 1.4 + 1.2, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 2, 6]} />
            <meshStandardMaterial color="#164e63" />
          </mesh>
          <mesh position={[0, h * 1.4 + 2.2, 0]}>
            <sphereGeometry args={[0.22, 8, 8]} />
            <meshStandardMaterial ref={beacon} color="#ff5d5d" emissive="#ef4444" />
          </mesh>
        </>
      )}
      {b.kind === "service" && (
        <mesh position={[1.2, h + 0.8, 1.2]}>
          <cylinderGeometry args={[0.4, 0.5, 1.6, 8]} />
          <meshStandardMaterial color="#94a3b8" />
        </mesh>
      )}
      {(hover || selected) && (
        <Text position={[0, h + 3, 0]} fontSize={1.4} color="#fff" anchorX="center" outlineWidth={0.08} outlineColor="#000">
          {b.name}
        </Text>
      )}
    </group>
  );
}

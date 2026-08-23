import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { CityLayout } from "../lib/layout";
import { useCity } from "../store/useCity";
import { ENV, WIND } from "./env";

/**
 * Ambient rotating props + the cinematic Showcase orbit — the "world is alive"
 * layer. Everything here spins/drifts continuously but is purely decorative:
 * no state writes, no pointer handlers, one shared useFrame per group.
 * Deterministic placement (seeded PRNG) so reloads look identical.
 */

const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ─── wind turbines — west + south lawns, clear of roads/suburb ──────────────
const TURBINES: { p: [number, number]; s: number }[] = [
  { p: [-118, -30], s: 1.15 },
  { p: [-108, -52], s: 0.9 },
  { p: [-126, -8], s: 1.0 },
  { p: [96, 78], s: 1.05 },
  { p: [116, 62], s: 0.85 },
];
const BLADE_R = 7.2; // world units at scale 1

function Turbine({ x, z, s }: { x: number; z: number; s: number }) {
  const hub = useRef<THREE.Group>(null!);
  useFrame((_, dt) => {
    // turbines LOVE wind — spin speed tracks the weather's wind level
    hub.current.rotation.z -= Math.min(dt, 0.05) * (0.7 + 2.3 * Math.min(1, WIND.value));
  });
  return (
    <group position={[x, 0, z]} scale={s}>
      <mesh position={[0, 11, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.85, 22, 10]} />
        <meshStandardMaterial color="#eef2f6" roughness={0.55} />
      </mesh>
      <group ref={hub} position={[0, 22, 0.4]}>
        <mesh>
          <sphereGeometry args={[0.75, 12, 12]} />
          <meshStandardMaterial color="#dbe3ea" roughness={0.4} />
        </mesh>
        {[0, 1, 2].map((i) => (
          // blade pivots around the hub: offset half-length along local +Y
          <group key={i} rotation-z={(i * Math.PI * 2) / 3}>
            <mesh position={[0, BLADE_R / 2, 0]}>
              <boxGeometry args={[1.15, BLADE_R, 0.18]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.5} />
            </mesh>
          </group>
        ))}
      </group>
      {/* blinking aviation beacon on the nacelle */}
      <Beacon />
    </group>
  );
}

function Beacon() {
  const m = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    m.current.emissiveIntensity = Math.sin(clock.elapsedTime * 2.4) > 0.4 ? 2.2 : 0.08;
  });
  return (
    <mesh position={[0, 23, -0.55]}>
      <sphereGeometry args={[0.28, 8, 8]} />
      <meshStandardMaterial ref={m} color="#ff3b3b" emissive="#ff3b3b" emissiveIntensity={0.08} />
    </mesh>
  );
}

// ─── rooftop props: AC fans + slowly sweeping radar dishes ──────────────────
const FAN_MAT = new THREE.MeshStandardMaterial({ color: "#9aa4af", roughness: 0.6, metalness: 0.35 });
const DISH_MAT = new THREE.MeshStandardMaterial({ color: "#e2e8ee", roughness: 0.5, metalness: 0.2 });

function RooftopFan({ h, fp }: { h: number; fp: number }) {
  const blades = useRef<THREE.Group>(null!);
  const r = fp * 0.24;
  useFrame((_, dt) => { blades.current.rotation.y += Math.min(dt, 0.05) * 6; });
  return (
    <group position={[fp * 0.24, h + r * 0.6 + 0.06, -fp * 0.24]}>
      <mesh material={FAN_MAT}>
        <cylinderGeometry args={[r * 1.12, r * 1.2, 0.16, 14]} />
      </mesh>
      <group ref={blades} position={[0, 0.16, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation-y={(i * Math.PI) / 2}>
            <boxGeometry args={[r * 2, 0.05, r * 0.42]} />
            <meshStandardMaterial color="#c3ccd5" roughness={0.5} metalness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function RadarDish({ x, z, h }: { x: number; z: number; h: number }) {
  const dish = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    dish.current.rotation.y = clock.elapsedTime * 0.35;
    dish.current.rotation.x = -0.5 + Math.sin(clock.elapsedTime * 0.22) * 0.25;
  });
  return (
    <group position={[x, h, z]}>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.09, 0.13, 1, 8]} />
        <meshStandardMaterial color="#8b95a1" roughness={0.6} />
      </mesh>
      <group ref={dish} position={[0, 1.1, 0]}>
        <mesh rotation-x={Math.PI / 2} material={DISH_MAT}>
          <sphereGeometry args={[0.85, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        </mesh>
        <mesh position={[0, 0.25, 0.35]}>
          <sphereGeometry args={[0.08, 6, 6]} />
          <meshStandardMaterial color="#39424e" />
        </mesh>
      </group>
    </group>
  );
}

/** pick tall, flat-roofed buildings for rooftop props — deterministic */
function useRooftopProps(L: CityLayout) {
  return useMemo(() => {
    const rnd = mulberry(777001);
    const fans: { pos: [number, number, number]; h: number; fp: number }[] = [];
    const dishes: { pos: [number, number, number]; h: number }[] = [];
    for (const b of L.buildings) {
      if (b.kind === "api") continue; // glass towers already carry their beacon
      if (b.kind === "service" || b.kind === "controller") continue; // chimneys occupy these roofs
      const warehouse = b.kind === "model";
      const h = warehouse ? b.h * 0.55 : b.h;
      const fp = warehouse ? 6.4 : 4.6;
      if (h > 7 && rnd() < 0.55) fans.push({ pos: b.pos, h, fp });
      else if (h > 5 && rnd() < 0.3) dishes.push({ pos: [b.pos[0] + 1.6, b.pos[1], b.pos[2] + 1.6], h });
    }
    return { fans, dishes };
  }, [L]);
}

// ─── rotating neon billboards on two landmark roofs ─────────────────────────
const BILLBOARDS = [
  { x: -36, z: -14, y: 16, msgs: ["CODECITY AI", "LIVE TRAFFIC"], accent: "#22d3ee" },
  { x: 40, z: -20, y: 18, msgs: ["SHIP IT", "ZERO DOWNTIME"], accent: "#f472b6" },
];

function NeonBillboard({ x, z, y, msgs, accent }: (typeof BILLBOARDS)[number]) {
  const g = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { g.current.rotation.y += Math.min(dt, 0.05) * 0.45; });
  return (
    <group position={[x, y, z]} ref={g}>
      {/* pole down toward the roofline */}
      <mesh position={[0, -(y - 12) / 2 - 1.4, 0]}>
        <cylinderGeometry args={[0.16, 0.16, y - 10.8, 8]} />
        <meshStandardMaterial color="#6b7280" roughness={0.6} />
      </mesh>
      <mesh>
        <boxGeometry args={[9.8, 3.5, 0.16]} />
        <meshBasicMaterial color={accent} transparent opacity={0.14} />
      </mesh>
      {/* DOM chip instead of drei <Text> — Text spawns a WebGL context per
          SDF atlas and 5+ of them blow Chrome's context budget → black scene.
          The panel rotates; the Html chip stays screen-facing on its own. */}
      <Html center position={[0, 0, 0.3]} distanceFactor={46} style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
        <div className="whitespace-nowrap rounded-md px-2 py-1 text-center font-bold leading-tight"
          style={{ background: "rgba(4,10,22,.72)", border: `1px solid ${accent}66`, color: "#fff", boxShadow: `0 0 18px ${accent}55` }}>
          {msgs[0]}
          <div style={{ color: accent, fontSize: "0.72em" }}>{msgs[1]}</div>
        </div>
      </Html>
    </group>
  );
}

// ─── the blimp: one slow high lap over downtown (~140 s), day & night ───────
function Blimp() {
  const g = useRef<THREE.Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.045;
    g.current.position.set(Math.cos(t) * 74, 44 + Math.sin(clock.elapsedTime * 0.31) * 1.6, Math.sin(t) * 66);
    g.current.rotation.y = -t; // nose along the tangent of the circle
  });
  return (
    <group ref={g}>
      <mesh rotation-x={Math.PI / 2} castShadow>
        <capsuleGeometry args={[2.6, 6.4, 6, 14]} />
        <meshStandardMaterial color="#e8ebef" roughness={0.35} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.1, -4.6]} rotation-x={-0.35}>
        <boxGeometry args={[0.14, 1.7, 2.1]} />
        <meshStandardMaterial color="#e30613" roughness={0.5} />
      </mesh>
      <mesh position={[0, -2.9, 0.8]}>
        <boxGeometry args={[1.1, 0.9, 2.2]} />
        <meshStandardMaterial color="#39424e" roughness={0.6} />
      </mesh>
      <Html center distanceFactor={40} style={{ pointerEvents: "none" }} zIndexRange={[10, 0]}>
        <div className="whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-extrabold tracking-widest"
          style={{ background: "rgba(255,255,255,.9)", color: "#e30613" }}>
          CODECITY AI
        </div>
      </Html>
      <Blinker offset={0} />
    </group>
  );
}

function Blinker({ offset }: { offset: number }) {
  const m = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    const on = ENV.night > 0.5 && Math.sin(clock.elapsedTime * 2.2 + offset) > 0.55;
    m.current.emissiveIntensity = on ? 2.4 : 0.05;
  });
  return (
    <mesh position={[0, -1.4, -5]}>
      <sphereGeometry args={[0.16, 6, 6]} />
      <meshStandardMaterial ref={m} color="#ff5252" emissive="#ff5252" emissiveIntensity={0.05} />
    </mesh>
  );
}

// ─── the whole ambient layer, mounted once ──────────────────────────────────
export function ShowcaseWorld({ L }: { L: CityLayout }) {
  const { fans, dishes } = useRooftopProps(L);
  return (
    <group>
      {TURBINES.map((t, i) => (
        <Turbine key={i} x={t.p[0]} z={t.p[1]} s={t.s} />
      ))}
      {fans.map((f, i) => (
        <group key={`f${i}`} position={f.pos}>
          <RooftopFan h={f.h} fp={f.fp} />
        </group>
      ))}
      {dishes.map((d, i) => (
        <group key={`d${i}`} position={d.pos}>
          <RadarDish x={0} z={0} h={d.h} />
        </group>
      ))}
      {BILLBOARDS.map((bb, i) => (
        <NeonBillboard key={`b${i}`} {...bb} />
      ))}
      <Blimp />
    </group>
  );
}

// ─── cinematic showcase orbit — press O or the HUD button ───────────────────
const TMP_POS = new THREE.Vector3();
const TMP_TGT = new THREE.Vector3();

export function ShowcaseOrbit() {
  const active = useCity((s) => s.showcase);
  const controls = useThree((s) => s.controls) as any;
  const ang = useRef(-Math.PI / 3);

  // any grab of the scene hands control back to the user
  useEffect(() => {
    if (!active) return;
    const el = document.querySelector("canvas");
    const off = () => useCity.getState().patch({ showcase: false });
    el?.addEventListener("pointerdown", off, { once: true });
    return () => el?.removeEventListener("pointerdown", off);
  }, [active]);

  useFrame(({ camera }, rawDt) => {
    if (!active || !controls) return;
    const dt = Math.min(rawDt, 0.05);
    // resume the orbit from wherever the user left the camera
    ang.current += dt * 0.12; // one lap ≈ 52 s
    const k = 1 - Math.pow(0.02, dt);
    TMP_POS.set(Math.cos(ang.current) * 105, 58, Math.sin(ang.current) * 105);
    camera.position.lerp(TMP_POS, k);
    TMP_TGT.set(0, 6, 0);
    controls.target.lerp(TMP_TGT, k);
    controls.update();
  });
  return null; // logic-only component
}

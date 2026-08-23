import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { CityLayout } from "../lib/layout";
import { useCity, followTarget } from "../store/useCity";
import { ENV } from "./env";
import { VEHICLE_FAST, VEHICLE_MED, VEHICLE_SLOW, VEHICLE_HERO, pick } from "./assets";
import { TollGate } from "./Toll";

const SPEED = { fast: 0.1, medium: 0.045, slow: 0.018 };
const LAT_COLOR = { fast: "#22c55e", medium: "#eab308", slow: "#ef4444" };

/**
 * Models whose nose points at −Z in local space. `lookAt` aims +Z along the
 * travel tangent, so these would drive in reverse unless we spin them 180°.
 * (Measured from wheel nodes: ferrari front axle sits at z=−1.15, rear +1.5.)
 */
const REVERSE_MODELS = new Set(["/models/vehicles/ferrari.glb"]);

/**
 * Build a driving curve for a flow. Prefers the hand-authored street lane in
 * L.flowPaths (cars ride actual roads); falls back to building centers only
 * when no lane exists for that flow.
 */
function makeCurve(L: CityLayout, name: string, ids: string[]): THREE.CatmullRomCurve3 | null {
  const lanePts = L.flowPaths?.[name];
  if (lanePts && lanePts.length >= 2) {
    return new THREE.CatmullRomCurve3(
      lanePts.map(([x, y, z]) => new THREE.Vector3(x, y + 0.06, z)),
      false,
      "catmullrom",
      0.08,
    );
  }
  console.warn(`[Traffic] no street lane for "${name}" — falling back to building centers`);
  const pts = ids.filter(Boolean).map((id) => {
    const b = L.byId.get(id);
    if (!b) console.warn(`[Traffic] unknown flow id "${id}" — skipped`);
    return b;
  }).filter(Boolean).map((b) => new THREE.Vector3((b as any).pos[0], 0.05, (b as any).pos[2]));
  if (pts.length < 2) return null;
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.15);
}

function GltfCar({ url, color }: { url: string; color?: string }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const done = useRef(false);
  if (color && !done.current) {
    cloned.traverse((o: any) => {
      if (o.isMesh && o.material?.color) {
        o.material = o.material.clone();
        o.material.color.lerp(new THREE.Color(color), 0.45);
      }
    });
    done.current = true;
  }
  return <primitive object={cloned} />;
}

function Headlights({ flip = false }: { flip?: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const z = flip ? -1.05 : 1.05;
  useFrame(() => { if (mat.current) mat.current.emissiveIntensity = ENV.night * 2; });
  return (
    <group>
      <mesh position={[-0.28, 0.45, z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.09, 10]} />
        <meshStandardMaterial ref={mat} color="#fff7d6" emissive="#ffdf8a" emissiveIntensity={0} />
      </mesh>
      <mesh position={[0.28, 0.45, z]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[0.09, 10]} />
        <meshStandardMaterial color="#fff7d6" emissive="#ffdf8a" emissiveIntensity={0} />
      </mesh>
    </group>
  );
}

function Car({ curve, offset, latencyKey, hero, stuck, color }: any) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(offset);
  const cur = useCity((s) => s.latency);
  const key = latencyKey ?? cur;
  const url = useMemo(
    () => (hero ? VEHICLE_HERO : key === "fast" ? pick(VEHICLE_FAST, offset * 100) : key === "medium" ? pick(VEHICLE_MED, offset * 100) : pick(VEHICLE_SLOW, offset * 100)),
    [key, offset, hero],
  );
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // clamp tab-switch/GC spikes → no teleporting actors
    if (!stuck) t.current = (t.current + dt * SPEED[cur]) % 1;
    const u = stuck ? 0.55 : t.current;
    const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
    // deck top sits at y=1.5; lane waypoints already carry BRIDGE_Y over water.
    // add only a small clearance bump so wheels never clip the deck slab.
    const lift = (1 - THREE.MathUtils.smoothstep(Math.abs(p.x), 4.8, 7)) * 0.35;
    ref.current.position.set(p.x, p.y + lift, p.z);
    ref.current.lookAt(p.clone().add(tan));
    // nose-at-−Z models would otherwise drive in reverse — spin them round
    if (REVERSE_MODELS.has(url)) ref.current.rotateY(Math.PI);
    if (hero) { followTarget.active = true; followTarget.x = p.x; followTarget.z = p.z; }
  });
  return (
    <group ref={ref}>
      <GltfCar url={url} color={typeof color === "string" && color.startsWith("#") ? color : undefined} />
      <Headlights flip={REVERSE_MODELS.has(url)} />
      <mesh position={[0, 1.1, -0.6]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={LAT_COLOR[cur]} emissive={LAT_COLOR[cur]} emissiveIntensity={0.6 + ENV.night * 3} /></mesh>
    </group>
  );
}

/** emerald delivery truck: slow loop on the query edge (services → database platform) */
function Truck({ curve, offset }: { curve: THREE.CatmullRomCurve3; offset: number }) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(offset);
  const url = useMemo(() => pick(VEHICLE_SLOW, offset * 777), [offset]);
  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05); // clamp tab-switch/GC spikes → no teleporting actors
    t.current = (t.current + dt * SPEED.slow * 0.55) % 1;
    const p = curve.getPointAt(t.current), tan = curve.getTangentAt(t.current);
    const lift = (1 - THREE.MathUtils.smoothstep(Math.abs(p.x), 4.8, 7)) * 0.35;
    ref.current.position.set(p.x, p.y + lift, p.z);
    ref.current.lookAt(p.clone().add(tan));
  });
  return (
    <group ref={ref}>
      <GltfCar url={url} />
      <mesh position={[0, 0.85, -0.35]}>
        <boxGeometry args={[1.15, 0.9, 1.9]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.25} roughness={0.6} />
      </mesh>
      <Headlights />
    </group>
  );
}

export function Traffic({ L }: { L: CityLayout }) {
  const traffic = useCity((s) => s.traffic);
  const failing = useCity((s) => s.failing);
  const failingId = useCity((s) => s.failingId);

  // curves built reactively from the active city's flows
  const flows = useCity((s) => s.city.flows);
  const curves = useMemo(() => {
    const out: Record<string, THREE.CatmullRomCurve3 | null> = {};
    for (const [name, ids] of Object.entries(flows ?? {})) out[name] = makeCurve(L, name, ids as string[]);
    return out;
  }, [flows, L]);

  // followTarget ghost fix: deactivate when this layer unmounts
  useEffect(() => () => { followTarget.active = false; }, []);

  const failB = failingId ? L.byId.get(failingId) : L.byId.get("be-payctrl");
  return (
    <group>
      <TollGate x={L.toll.x} z={L.toll.z} lanes={[...L.toll.lanes]} open={!failing} />
      {traffic && <>
        {curves.login && <Car curve={curves.login} offset={0.1} hero />}
        {curves.login && <Car curve={curves.login} offset={0.6} color="#38bdf8" />}
        {curves.payment && <Car curve={curves.payment} offset={0.3} stuck={failing} color={failing ? "#ef4444" : "#facc15"} />}
        {curves.cart && <Car curve={curves.cart} offset={0.75} latencyKey="medium" />}
        {curves.payment && <Truck curve={curves.payment} offset={0.45} />}
        {curves.cart && <Truck curve={curves.cart} offset={0.15} />}
      </>}
      {failing && failB && (
        <group position={[failB.pos[0], 0, failB.pos[2]]}>
          <mesh position={[0, 7, 0]}><coneGeometry args={[0.8, 1.6, 4]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} /></mesh>
          <Html center position={[0, 9, 0]}><div className="px-2 py-1 rounded-lg bg-red-600/90 text-white text-xs font-bold whitespace-nowrap backdrop-blur">⚠ 500 — {failB.name}</div></Html>
        </group>
      )}
      {/* roadblock on the lane in front of the Controllers district gate */}
      {failing && (
        <mesh position={[43, 0.55, -20]}>
          <boxGeometry args={[6.5, 1, 0.5]} />
          <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.7} />
        </mesh>
      )}
    </group>
  );
}

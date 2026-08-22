import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { CityLayout } from "../lib/layout";
import { useCity, followTarget } from "../store/useCity";
import { ENV } from "./env";
import { VEHICLE_FAST, VEHICLE_MED, VEHICLE_SLOW, pick } from "./assets";

const SPEED = { fast: 0.1, medium: 0.045, slow: 0.018 };
const LAT_COLOR = { fast: "#22c55e", medium: "#eab308", slow: "#ef4444" };
const makeCurve = (L: CityLayout, ids: string[]) =>
  new THREE.CatmullRomCurve3(ids.map((id) => L.byId.get(id)!).map((b) => new THREE.Vector3(b.pos[0], 0.8, b.pos[2])), false, "catmullrom", 0.15);

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
  // normalize: Kenney vehicles are ~1.5 units long; keep native scale
  return <primitive object={cloned} />;
}

function Car({ curve, offset, latencyKey, hero, stuck, color }: any) {
  const ref = useRef<THREE.Group>(null!);
  const t = useRef(offset);
  const cur = useCity((s) => s.latency);
  const key = latencyKey ?? cur;
  const url = useMemo(
    () => (key === "fast" ? pick(VEHICLE_FAST, offset * 100) : key === "medium" ? pick(VEHICLE_MED, offset * 100) : pick(VEHICLE_SLOW, offset * 100)),
    [key, offset],
  );
  useFrame((_, dt) => {
    if (!stuck) t.current = (t.current + dt * SPEED[cur]) % 1;
    const u = stuck ? 0.55 : t.current;
    const p = curve.getPointAt(u), tan = curve.getTangentAt(u);
    ref.current.position.copy(p); ref.current.lookAt(p.clone().add(tan));
    if (hero) { followTarget.active = true; followTarget.x = p.x; followTarget.z = p.z; }
  });
  return (
    <group ref={ref}>
      <GltfCar url={url} color={typeof color === "string" && color.startsWith("#") ? color : undefined} />
      {/* emissive beacon so the car reads at night */}
      <mesh position={[0, 1.1, -0.6]}><sphereGeometry args={[0.07, 8, 8]} /><meshStandardMaterial color={LAT_COLOR[cur]} emissive={LAT_COLOR[cur]} emissiveIntensity={0.6 + ENV.night * 3} /></mesh>
    </group>
  );
}

export function Traffic({ L }: { L: CityLayout }) {
  const traffic = useCity((s) => s.traffic), failing = useCity((s) => s.failing);
  const curves = useMemo(() => ({
    login: makeCurve(L, ["fe-login", "be-authroute", "be-authctrl", "be-authsvc", "db-users"]),
    payment: makeCurve(L, ["fe-payment", "be-payroute", "be-payctrl", "be-paysvc", "db-payments"]),
  }), [L]);
  const pay = L.byId.get("be-payctrl")!;
  return (
    <group>
      {traffic && <>
        <Car curve={curves.login} offset={0.1} hero />
        <Car curve={curves.login} offset={0.6} color="#38bdf8" />
        <Car curve={curves.payment} offset={0.3} stuck={failing} color={failing ? "#ef4444" : "#facc15"} />
      </>}
      {failing && (
        <group position={[pay.pos[0], 0, pay.pos[2]]}>
          <mesh position={[0, 7, 0]}><coneGeometry args={[0.8, 1.6, 4]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} /></mesh>
          <Html center position={[0, 9, 0]}><div className="px-2 py-1 rounded-lg bg-red-600/90 text-white text-xs font-bold whitespace-nowrap backdrop-blur">⚠ 500 — {pay.name}</div></Html>
        </group>
      )}
    </group>
  );
}

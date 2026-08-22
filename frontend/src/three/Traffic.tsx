import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { CityLayout } from "../lib/layout";
import { useCity, followTarget } from "../store/useCity";

const SPEED = { fast: 0.1, medium: 0.045, slow: 0.018 };
const LAT_COLOR = { fast: "#22c55e", medium: "#eab308", slow: "#ef4444" };

function toCurve(pts: [number, number, number][]) {
  return new THREE.CatmullRomCurve3(
    pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    "catmullrom",
    0.08,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Car({ curve, offset, color, hero, stuck }: any) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(offset);
  const latency = useCity((s) => s.latency);
  useFrame((_, dt) => {
    if (!ref.current) return;
    if (!stuck) t.current = (t.current + dt * SPEED[latency]) % 1;
    const u = stuck ? 0.4 : t.current;
    const p = curve.getPointAt(Math.min(u, 0.999));
    const tan = curve.getTangentAt(Math.min(u, 0.999));
    ref.current.position.copy(p);
    ref.current.lookAt(p.clone().add(tan));
    if (hero) {
      followTarget.active = true;
      followTarget.x = p.x;
      followTarget.z = p.z;
    }
  });
  return (
    <group ref={ref}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <boxGeometry args={[0.9, 0.5, 1.7]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.75, -0.1]}>
        <boxGeometry args={[0.7, 0.35, 0.8]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>
      {/* headlights (+Z is forward after lookAt) */}
      <mesh position={[0.26, 0.38, 0.86]}>
        <boxGeometry args={[0.18, 0.12, 0.06]} />
        <meshBasicMaterial color="#e0f2fe" toneMapped={false} />
      </mesh>
      <mesh position={[-0.26, 0.38, 0.86]}>
        <boxGeometry args={[0.18, 0.12, 0.06]} />
        <meshBasicMaterial color="#e0f2fe" toneMapped={false} />
      </mesh>
      {/* taillights */}
      <mesh position={[0.26, 0.4, -0.86]}>
        <boxGeometry args={[0.18, 0.1, 0.06]} />
        <meshBasicMaterial color="#ff3b3b" toneMapped={false} />
      </mesh>
      <mesh position={[-0.26, 0.4, -0.86]}>
        <boxGeometry args={[0.18, 0.1, 0.06]} />
        <meshBasicMaterial color="#ff3b3b" toneMapped={false} />
      </mesh>
    </group>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Person({ a, b, seed }: any) {
  const ref = useRef<THREE.Group>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useFrame(({ clock }: any) => {
    if (!ref.current) return;
    const t = clock.elapsedTime * 0.15 + seed;
    const u = (Math.sin(t) + 1) / 2;
    ref.current.position.set(
      a[0] + (b[0] - a[0]) * u,
      0.5 + Math.abs(Math.sin(t * 8)) * 0.08,
      a[1] + (b[1] - a[1]) * u,
    );
  });
  const colors = ["#f472b6", "#60a5fa", "#facc15", "#4ade80", "#c084fc"];
  const c = colors[Math.floor(seed * 100) % colors.length];
  return (
    <group ref={ref}>
      <mesh castShadow>
        <cylinderGeometry args={[0.22, 0.28, 0.8, 8]} />
        <meshStandardMaterial color={c} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.22, 8, 8]} />
        <meshStandardMaterial color="#fcd7b6" />
      </mesh>
    </group>
  );
}

export function Traffic({ L }: { L: CityLayout }) {
  const traffic = useCity((s) => s.traffic);
  const failing = useCity((s) => s.failing);
  const failingId = useCity((s) => s.failingId);
  const latency = useCity((s) => s.latency);
  const curves = useMemo(
    () => ({
      login: toCurve(L.flowPaths.login),
      payment: toCurve(L.flowPaths.payment),
      cart: toCurve(L.flowPaths.cart),
    }),
    [L],
  );
  const failB = failingId ? L.byId.get(failingId) : undefined;

  return (
    <group>
      {traffic && (
        <>
          <Car curve={curves.login} offset={0.1} color={LAT_COLOR[latency]} hero />
          <Car curve={curves.login} offset={0.6} color={LAT_COLOR[latency]} />
          <Car curve={curves.payment} offset={0.3} color={failing ? "#ef4444" : LAT_COLOR[latency]} stuck={failing} />
          <Car curve={curves.cart} offset={0.5} color={LAT_COLOR[latency]} />
          <Car curve={curves.payment} offset={0.75} color={LAT_COLOR[latency]} />
        </>
      )}
      {L.people.map((p, i) => (
        <Person key={i} a={p.a} b={p.b} seed={i * 0.7} />
      ))}
      {failing && failB && (
        <group position={[failB.pos[0], 0, failB.pos[2]]}>
          <mesh position={[0, 6.5, 0]}>
            <coneGeometry args={[0.8, 1.6, 4]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={1} />
          </mesh>
          <Html center position={[0, 8.5, 0]}>
            <div className="px-2 py-1 rounded bg-red-600 text-white text-xs font-bold whitespace-nowrap">⚠ 500 — {failB.name}</div>
          </Html>
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

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useAuth } from "../lib/auth";

const INK = new THREE.Color("#141414");
const SIGNAL = new THREE.Color("#e30613");

/**
 * JWT TOLL PLAZA — the western approach to the bridge is a paid (authenticated)
 * road. Booths + barriers sit across the three lanes; barriers lift only for
 * signed-in drivers. Unauthenticated visitors see the "TOLL / JWT REQUIRED"
 * sign and the AuthModal opens on demand.
 */
export function TollGate({ x, z, lanes, open }: { x: number; z: number; lanes: number[]; open: boolean }) {
  const token = useAuth((s) => s.token);
  // arms lift with traffic flow; the LAMP + SIGN carry the auth state
  const lifted = open;

  return (
    <group position={[x, 0, z]}>
      {/* plaza apron */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.06, 0]} receiveShadow>
        <planeGeometry args={[10, 9]} />
        <meshStandardMaterial color="#3a4150" roughness={0.95} />
      </mesh>
      {/* lane divider islands */}
      {[-1.05, 1.05].map((lx, i) => (
        <mesh key={i} position={[lx, 0.28, 0]} castShadow>
          <boxGeometry args={[0.5, 0.55, 7]} />
          <meshStandardMaterial color="#d8d2bd" roughness={0.8} />
        </mesh>
      ))}
      {/* canopy over the plaza */}
      <mesh position={[0, 3.6, -0.4]} castShadow>
        <boxGeometry args={[11, 0.35, 6]} />
        <meshStandardMaterial color={INK} roughness={0.6} />
      </mesh>
      <mesh position={[0, 3.85, -0.4]}>
        <boxGeometry args={[11.2, 0.12, 6.2]} />
        <meshStandardMaterial color={SIGNAL} emissive={SIGNAL} emissiveIntensity={0.55} />
      </mesh>
      {[-3.4, 3.4].map((cx, i) => (
        <mesh key={`c${i}`} position={[cx, 1.8, -0.4]}>
          <cylinderGeometry args={[0.16, 0.16, 3.6, 8]} />
          <meshStandardMaterial color="#5b6270" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}

      {/* one booth + barrier arm per lane */}
      {lanes.map((lz, i) => (
        <TollLane key={i} z={lz} lifted={lifted} delay={i * 0.25} />
      ))}

      {/* the price sign */}
      <Html center position={[0, 5.1, -0.4]} distanceFactor={60}>
        <div className="pointer-events-none select-none whitespace-nowrap rounded-none border-[1.5px] border-black-ink bg-paper px-2 py-1 font-mono text-[10px] font-bold text-black-ink shadow-[3px_3px_0_rgba(0,0,0,.45)]">
          TOLL · <span className="text-signal">JWT</span> {token ? "· PAID ✓" : "· GUEST — SIGN IN"}
        </div>
      </Html>
    </group>
  );
}

function TollLane({ z, lifted, delay }: { z: number; lifted: boolean; delay: number }) {
  const arm = useRef<THREE.Group>(null!);
  const lampMat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(({ clock }) => {
    if (!arm.current) return;
    // staggered lift so the three arms rise in sequence
    const target = lifted ? -Math.PI / 2 : 0;
    const t = THREE.MathUtils.clamp((clock.elapsedTime - (lifted ? delay : 0)) * 1.6, 0, 1);
    arm.current.rotation.z += (target - arm.current.rotation.z) * (lifted ? Math.min(1, t) : 0.12);
    if (lampMat.current) {
      const blink = !lifted && Math.sin(clock.elapsedTime * 6) > 0 ? 1 : 0.15;
      lampMat.current.emissiveIntensity = blink;
    }
  });
  return (
    <group position={[1.05, 0, z - 2.2]}>
      {/* booth */}
      <mesh position={[0.95, 1.05, 0]} castShadow>
        <boxGeometry args={[1.3, 2.1, 1.3]} />
        <meshStandardMaterial color="#d8d2bd" roughness={0.85} />
      </mesh>
      <mesh position={[0.95, 1.75, 0.67]}>
        <boxGeometry args={[0.9, 0.6, 0.04]} />
        <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.35} />
      </mesh>
      {/* signal lamp */}
      <mesh position={[0.95, 2.35, 0]}>
        <sphereGeometry args={[0.14, 10, 10]} />
        <meshStandardMaterial ref={lampMat} color={lifted ? "#22c55e" : "#ef4444"} emissive={lifted ? "#22c55e" : "#ef4444"} emissiveIntensity={0.15} /> {/* green=paid flow · red=halted */}
      </mesh>
      {/* barrier arm pivots at the post */}
      <group ref={arm} position={[0.6, 1.15, 0]}>
        <mesh position={[-1.5, 0, 0]} castShadow>
          <boxGeometry args={[3.2, 0.14, 0.14]} />
          <meshStandardMaterial color="#f97316" />
        </mesh>
        <mesh position={[-2.7, 0.02, 0]}>
          <boxGeometry args={[0.55, 0.16, 0.16]} />
          <meshStandardMaterial color="#f8f5ea" />
        </mesh>
      </group>
    </group>
  );
}

import { Instances, Instance } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useCity } from "../store/useCity";
import type { CityLayout } from "../lib/layout";

function segProps(a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  return {
    len: Math.hypot(dx, dz),
    rot: -Math.atan2(dz, dx),
    mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as [number, number],
  };
}

/** dashed centre-line markings so the lanes read as lanes */
function LaneDashes({ L }: { L: CityLayout }) {
  if (L.dashes.length === 0) return null;
  return (
    <Instances limit={200}>
      <boxGeometry args={[1.7, 0.02, 0.16]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.55} />
      {L.dashes.map((d, i) => (
        <Instance key={i} position={[d.p[0], 0.16, d.p[1]]} rotation={[0, d.rot, 0]} />
      ))}
    </Instances>
  );
}

export function Ground() {
  const underground = useCity((s) => s.underground);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[400, 400]} />
      <meshStandardMaterial color="#0b1222" transparent opacity={underground ? 0.12 : 1} />
    </mesh>
  );
}

const riverVertex = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    vUv = uv;
    vec3 p = position;
    p.z += sin(p.y * 0.55 + uTime * 1.2) * 0.12;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const riverFragment = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  void main() {
    float flow = sin(vUv.y * 60.0 + uTime * 2.0) * 0.5 + 0.5;
    float cross = sin(vUv.x * 10.0 - vUv.y * 6.0 - uTime * 1.3) * 0.5 + 0.5;
    float ripple = smoothstep(0.72, 1.0, flow * cross);
    vec3 deep = vec3(0.008, 0.10, 0.22);
    vec3 shallow = vec3(0.02, 0.28, 0.45);
    vec3 col = mix(deep, shallow, cross * 0.6) + ripple * vec3(0.25, 0.85, 1.0);
    gl_FragColor = vec4(col, 0.92);
  }
`;

export function River() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame(({ clock }) => {
    if (mat.current) mat.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, -20]}>
      <planeGeometry args={[10, 130]} />
      <shaderMaterial
        ref={mat}
        uniforms={uniforms}
        vertexShader={riverVertex}
        fragmentShader={riverFragment}
        transparent
      />
    </mesh>
  );
}

export function Roads({ L }: { L: CityLayout }) {
  return (
    <group>
      <LaneDashes L={L} />
      {L.roads.filter((s) => s.kind !== "bridge").map((s, i) => {
        const p = segProps(s.a, s.b);
        return (
          <mesh key={i} position={[p.mid[0], 0.08, p.mid[1]]} rotation={[0, p.rot, 0]} receiveShadow>
            <boxGeometry args={[p.len, 0.12, s.w]} />
            <meshStandardMaterial color={s.kind === "highway" ? "#1e293b" : "#334155"} />
          </mesh>
        );
      })}
      {L.bridges.map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[12, 0.4, 6]} />
            <meshStandardMaterial color="#475569" />
          </mesh>
          <mesh position={[-4, 0.45, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.9, 8]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[4, 0.45, 0]}>
            <cylinderGeometry args={[0.4, 0.4, 0.9, 8]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0, 1.05, 2.9]}>
            <boxGeometry args={[12, 0.4, 0.15]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
          </mesh>
          <mesh position={[0, 1.05, -2.9]}>
            <boxGeometry args={[12, 0.5, 0.15]} />
            <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function Underground({ L }: { L: CityLayout }) {
  const on = useCity((s) => s.underground);
  if (!on) return null;
  return (
    <group>
      {L.pipes.map((s, i) => {
        const p = segProps(s.a, s.b);
        return (
          <group key={i} position={[p.mid[0], -1.5, p.mid[1]]} rotation={[0, p.rot, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.35, 0.35, p.len, 8]} />
              <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.2} transparent opacity={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

export function Decor({ L }: { L: CityLayout }) {
  return (
    <group>
      <Instances limit={300}>
        <cylinderGeometry args={[0.15, 0.2, 1, 6]} />
        <meshStandardMaterial color="#7c4a21" />
        {L.trees.map((t, i) => (
          <Instance key={i} position={[t[0], 0.5, t[1]]} />
        ))}
      </Instances>
      <Instances limit={300}>
        <coneGeometry args={[1.1, 2.6, 6]} />
        <meshStandardMaterial color="#16a34a" />
        {L.trees.map((t, i) => (
          <Instance key={i} position={[t[0], 2.2, t[1]]} />
        ))}
      </Instances>
      <Instances limit={100}>
        <cylinderGeometry args={[0.07, 0.07, 3, 6]} />
        <meshStandardMaterial color="#94a3b8" />
        {L.lamps.map((t, i) => (
          <Instance key={i} position={[t[0], 1.5, t[1]]} />
        ))}
      </Instances>
      <Instances limit={100}>
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={1.5} />
        {L.lamps.map((t, i) => (
          <Instance key={i} position={[t[0], 3.1, t[1]]} />
        ))}
      </Instances>
    </group>
  );
}

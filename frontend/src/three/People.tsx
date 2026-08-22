import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import type { CityLayout } from "../lib/layout";
import { useCity } from "../store/useCity";
import { ENV } from "./env";
import { SOLDIER, CHARACTERS } from "./assets";

const UMBRELLAS = ["#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6"];

/** Animated pedestrian: Soldier.glb Walk clip, ping-pongs along a sidewalk path. */
function Walker({ a, b, seed }: { a: [number, number]; b: [number, number]; seed: number }) {
  const ref = useRef<THREE.Group>(null!);
  const umb = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(SOLDIER);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const { actions, names } = useAnimations(animations, ref);
  const weather = useCity((s) => s.weather);
  const speed = 0.55 + (seed % 1) * 0.45;
  const t = useRef(seed * 10);

  useMemo(() => {
    // start Walk on every clone instance
    const clip = names.find((n) => /walk/i.test(n));
    if (clip && actions[clip]) { actions[clip].play(); (actions[clip] as any).timeScale = 1; }
  }, [actions, names]);

  useFrame((_, dt) => {
    t.current += dt * speed;
    const u = (Math.sin(t.current * 0.5) + 1) / 2;
    const x = a[0] + (b[0] - a[0]) * u, z = a[1] + (b[1] - a[1]) * u;
    ref.current.position.set(x, 0.02, z);
    ref.current.rotation.y = Math.atan2(b[0] - a[0], b[1] - a[1]) * (Math.cos(t.current * 0.5) > 0 ? 1 : -1) + Math.PI;
    if (umb.current) umb.current.rotation.z = ENV.wind * 0.35;
  });

  return (
    <group ref={ref} scale={0.012}>
      <primitive object={cloned} />
      {weather !== "clear" && weather !== "fog" && (
        <group ref={umb} position={[0, 150, 0]} scale={60}>
          <mesh><cylinderGeometry args={[0.02, 0.02, 0.6, 6]} /><meshStandardMaterial color="#334155" /></mesh>
          <mesh position={[0, 0.28, 0]}><coneGeometry args={[0.55, 0.35, 8]} /><meshStandardMaterial color={UMBRELLAS[Math.floor(seed * 90) % 4]} /></mesh>
        </group>
      )}
    </group>
  );
}

/** Static blocky character with idle animation from the Kenney pack. */
function Bystander({ pos, seed }: { pos: [number, number]; seed: number }) {
  const ref = useRef<THREE.Group>(null!);
  const url = CHARACTERS[Math.floor(seed * 9973) % CHARACTERS.length];
  const { scene, animations } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const { actions, names } = useAnimations(animations, cloned);
  useMemo(() => {
    const clip = names.find((n) => /idle/i.test(n)) ?? names[0];
    if (clip && actions[clip]) actions[clip].play();
  }, [actions, names]);
  return (
    <group ref={ref} position={[pos[0], 0.02, pos[1]]} rotation-y={seed * Math.PI * 2} scale={1.15}>
      <primitive object={cloned} />
    </group>
  );
}

export function People({ L }: { L: CityLayout }) {
  const paths = [...L.people.map((p) => [p.a, p.b] as const), [[-6, -8], [6, -8]] as const, [[-14, 60], [14, 60]] as const];
  const spots = useMemo(() => {
    const out: [number, number][] = [];
    L.districts.forEach((d) => { out.push([d.center[0] + 13, d.center[1] + 8], [d.center[0] - 12, d.center[1] - 9]); });
    return out;
  }, [L]);
  return (
    <group>
      {paths.map((p, i) => <Walker key={i} a={p[0] as any} b={p[1] as any} seed={i * 0.37 + 0.13} />)}
      {spots.map((s, i) => <Bystander key={i} pos={s} seed={i * 0.61 + 0.29} />)}
    </group>
  );
}

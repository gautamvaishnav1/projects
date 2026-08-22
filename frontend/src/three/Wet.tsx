import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Instances, Instance } from "@react-three/drei";
import * as THREE from "three";
import { ENV } from "./env";
import type { CityLayout } from "../lib/layout";

export function Wet({ L }: { L: CityLayout }) {
  const scene = useThree((s) => s.scene);
  const reg = useRef<{ m: THREE.MeshStandardMaterial; base: THREE.Color; rough: number }[]>([]);
  useEffect(() => {
    reg.current = [];
    scene.traverse((o: any) => { if (o.isMesh && o.material?.isMeshStandardMaterial && o.material.map && o.geometry?.type === "PlaneGeometry") reg.current.push({ m: o.material, base: o.material.color.clone(), rough: o.material.roughness }); });
  }, [scene]);

  const puddles = useMemo(() => {
    const out: [number, number, number][] = [];
    L.roads.forEach((r) => { for (let i = 0; i < 3; i++) { const t = Math.random(), dx = r.b[0] - r.a[0], dz = r.b[1] - r.a[1], len = Math.hypot(dx, dz), off = (Math.random() - .5) * r.w * .6; out.push([r.a[0] + dx * t + (-dz / len) * off, 0.11, r.a[1] + dz * t + (dx / len) * off]); } });
    return out.slice(0, 90);
  }, [L]);
  const pudMat = useRef<THREE.MeshStandardMaterial>(null!);

  useFrame(() => {
    const w = ENV.wet;
    reg.current.forEach(({ m, base, rough }) => { m.roughness = THREE.MathUtils.lerp(rough, 0.12, w); m.color.copy(base).multiplyScalar(1 - w * 0.4); });
    if (pudMat.current) pudMat.current.opacity = Math.max(0, w - 0.25) * 1.2;
  });
  return (
    <Instances limit={100} frustumCulled={false}>
      <circleGeometry args={[1, 20]} />
      <meshStandardMaterial ref={pudMat} color="#0b1626" metalness={1} roughness={0.06} transparent opacity={0} envMapIntensity={2.5} />
      {puddles.map((p, i) => <Instance key={i} position={p} rotation={[-Math.PI / 2, 0, 0]} scale={0.6 + (i % 5) * 0.35} />)}
    </Instances>
  );
}

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ENV, TIME } from "./env";
import { softCircle } from "./textures";

export function Precipitation() {
  const rain = useRef<THREE.Points>(null!), snow = useRef<THREE.Points>(null!);
  const mk = (n: number) => { const a = new Float32Array(n * 3); for (let i = 0; i < a.length; i += 3) { a[i] = (Math.random() - .5) * 230; a[i + 1] = Math.random() * 60; a[i + 2] = (Math.random() - .5) * 230; } return a; };
  const rPos = useMemo(() => mk(2200), []), sPos = useMemo(() => mk(1400), []);
  const sMap = useMemo(() => softCircle(), []);

  useFrame((_, dt) => {
    const t = TIME.value;
    rain.current.visible = ENV.rain > 0.02;
    if (rain.current.visible) {
      const p = rain.current.geometry.attributes.position.array as Float32Array;
      const vy = 48 + ENV.storm * 28, vx = ENV.wind * 16;
      for (let i = 0; i < p.length; i += 3) { p[i + 1] -= vy * dt; p[i] += vx * dt; if (p[i + 1] < 0) p[i + 1] += 60; if (p[i] > 115) p[i] -= 230; }
      rain.current.geometry.attributes.position.needsUpdate = true;
      (rain.current.material as THREE.PointsMaterial).opacity = ENV.rain * 0.5;
    }
    snow.current.visible = ENV.snow > 0.02;
    if (snow.current.visible) {
      const p = snow.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < p.length; i += 3) { const idx = i / 3; p[i + 1] -= 3.2 * dt; p[i] += (Math.sin(t * 0.8 + idx) * 1.2 + ENV.wind * 6) * dt; if (p[i + 1] < 0) p[i + 1] += 60; if (p[i] > 115) p[i] -= 230; }
      snow.current.geometry.attributes.position.needsUpdate = true;
      (snow.current.material as THREE.PointsMaterial).opacity = ENV.snow * 0.9;
    }
  });
  return (
    <group>
      <points ref={rain} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[rPos, 3]} /></bufferGeometry><pointsMaterial size={0.18} color="#9ecbff" transparent opacity={0} depthWrite={false} /></points>
      <points ref={snow} frustumCulled={false}><bufferGeometry><bufferAttribute attach="attributes-position" args={[sPos, 3]} /></bufferGeometry><pointsMaterial size={0.5} map={sMap} color="#fff" transparent opacity={0} depthWrite={false} /></points>
    </group>
  );
}

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Stars } from "@react-three/drei";
import * as THREE from "three";
import { useCity } from "../store/useCity";
import { ENV, PRESETS, TIME, WIND } from "./env";
import type { Weather } from "./env";
import { SAMPLE_CITY } from "../data/sampleCity";
import { setRainLevel } from "./audio";

const NIGHT = new THREE.Color("#060a18"), DAY = new THREE.Color("#8ecbe8"), DUSK = new THREE.Color("#f0855a"), GRAY = new THREE.Color("#5a6472");
const healthWeather = (s: any): Weather => {
  if (s.failing) return "storm";
  if (s.latency === "slow") return "rain";
  const warns = SAMPLE_CITY.districts.flatMap((d) => d.buildings).filter((b) => b.health !== "ok").length;
  return s.latency === "medium" || warns > 0 ? "drizzle" : "clear";
};

export function Atmosphere() {
  const scene = useThree((s) => s.scene);
  const sun = useRef<THREE.DirectionalLight>(null!), moon = useRef<THREE.DirectionalLight>(null!), amb = useRef<THREE.AmbientLight>(null!), stars = useRef<THREE.Group>(null!);
  const acc = useRef(0), liveAcc = useRef(0), tmp = useMemo(() => new THREE.Color(), []);
  const cloudMat = useMemo(() => new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.25, depthWrite: false }), []);
  const shadowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#000", transparent: true, opacity: 0.15, depthWrite: false }), []);
  const clouds = useMemo(() => Array.from({ length: 9 }, () => ({ x: (Math.random() - .5) * 260, y: 36 + Math.random() * 12, z: (Math.random() - .5) * 200, s: 9 + Math.random() * 9, v: 1.5 + Math.random() * 2 })), []);

  useFrame((_, dt) => {
    const st = useCity.getState();
    TIME.value += dt; WIND.value = ENV.wind;
    if (st.autoCycle) { acc.current += dt; if (acc.current > 0.25) { st.patch({ time: (st.time + acc.current * 0.5) % 24 }); acc.current = 0; } }
    if (st.live) { liveAcc.current += dt; if (liveAcc.current > 1) { liveAcc.current = 0; const w = healthWeather(st); if (w !== st.weather) st.patch({ weather: w }); } }

    // ── smooth weather transitions ──
    const P = PRESETS[st.weather], k = 1 - Math.pow(0.25, dt);
    ENV.rain += (P.rain - ENV.rain) * k; ENV.snow += (P.snow - ENV.snow) * k; ENV.fog += (P.fog - ENV.fog) * k;
    ENV.wind += (P.wind - ENV.wind) * k; ENV.cloud += (P.cloud - ENV.cloud) * k;
    ENV.storm += ((st.weather === "storm" ? 1 : 0) - ENV.storm) * k;
    const wetT = Math.max(ENV.rain, ENV.snow * 0.25);
    ENV.wet += (wetT - ENV.wet) * (wetT > ENV.wet ? k : k * 0.25); // dries slower than it rains

    // ── sky / sun / fog ──
    const a = ((st.time - 6) / 12) * Math.PI, elev = Math.sin(a);
    const day = THREE.MathUtils.smoothstep(elev, -0.12, 0.3);
    const dusk = Math.exp(-Math.pow((elev - 0.03) / 0.14, 2));
    tmp.copy(NIGHT).lerp(DAY, day).lerp(DUSK, dusk * 0.5).lerp(GRAY, ENV.cloud * 0.65 * (0.3 + day * 0.7));
    (scene.background as THREE.Color).copy(tmp);
    const fog = scene.fog as THREE.FogExp2; fog.color.copy(tmp); fog.density = 0.0016 + ENV.fog * 0.0075 + ENV.wet * 0.0008;
    sun.current.position.set(Math.cos(a) * -90, Math.sin(a) * 90, 30);
    sun.current.intensity = day * 1.5 * (1 - ENV.cloud * 0.75);
    moon.current.intensity = (1 - day) * 0.3;
    amb.current.intensity = 0.16 + day * 0.5 - ENV.cloud * 0.1;
    stars.current.visible = day < 0.35 && ENV.cloud < 0.7;
    cloudMat.color.set(ENV.cloud > 0.6 ? "#565f6e" : "#ffffff"); cloudMat.opacity = 0.18 + ENV.cloud * 0.35;
    shadowMat.opacity = ENV.cloud * 0.2 + ENV.wet * 0.08;
    setRainLevel(ENV.rain * 0.8 + ENV.storm * 0.2);
  });

  return (
    <group>
      <ambientLight ref={amb} intensity={0.4} />
      <directionalLight ref={sun} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-left={-110} shadow-camera-right={110} shadow-camera-top={110} shadow-camera-bottom={-110} />
      <directionalLight ref={moon} color="#7aa2ff" position={[-40, 60, -30]} />
      <group ref={stars}><Stars radius={200} depth={40} count={2500} factor={4} fade /></group>
      {clouds.map((c, i) => <Cloud key={i} {...c} mat={cloudMat} shadowMat={shadowMat} />)}
    </group>
  );
}

function Cloud({ x, y, z, s, v, mat, shadowMat }: any) {
  const ref = useRef<THREE.Group>(null!);
  useFrame((_, dt) => { ref.current.position.x += v * dt * (0.5 + ENV.wind * 2.5); if (ref.current.position.x > 170) ref.current.position.x = -170; });
  return (
    <group ref={ref} position={[x, y, z]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[(i - 1.5) * s * 0.5, (i % 2) * s * 0.08, (i % 3) * s * 0.12]} scale={[s * (0.7 + (i % 2) * 0.3), s * 0.28, s * 0.5]}>
          <sphereGeometry args={[1, 12, 12]} /><primitive object={mat} attach="material" />
        </mesh>))}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.6 - y, 0]}>
        <planeGeometry args={[s * 2.6, s * 1.6]} /><primitive object={shadowMat} attach="material" />
      </mesh>
    </group>
  );
}

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Instances, Instance, Line, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { CityLayout } from "../lib/layout";
import { useCity } from "../store/useCity";
import { ENV } from "./env";
import { grassTexture, asphaltTexture, groundTextures } from "./textures";
import { TREES, ROCKS, BUSHES_PLANTS, PROP, BARRIER, FENCE, CONE, pick } from "./assets";

const seg = (a: [number, number], b: [number, number]) => { const dx = b[0] - a[0], dz = b[1] - a[1]; return { len: Math.hypot(dx, dz), rot: -Math.atan2(dz, dx), mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] }; };

export function Ground() {
  const underground = useCity((s) => s.underground);
  const canvasMap = useMemo(() => grassTexture(), []);
  const pbr = useMemo(() => groundTextures(), []);
  return (
    <group>
      {/* PBR photo grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[420, 420]} />
        <meshStandardMaterial {...pbr} color="#9fb8a8" transparent opacity={underground ? 0.12 : 1} roughness={1} normalScale={new THREE.Vector2(0.7, 0.7)} />
      </mesh>
      {/* riverbed under the shader water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, -20]}>
        <planeGeometry args={[13, 132]} />
        <meshStandardMaterial map={canvasMap} color="#1c2b3a" roughness={1} />
      </mesh>
    </group>
  );
}

export function Roads({ L }: { L: CityLayout }) {
  const hw = useMemo(() => asphaltTexture(true), []), st = useMemo(() => asphaltTexture(false), []);
  const dashes = useMemo(() => L.dashes.map(({ p, rot }) => ({ p, rot })), [L]);
  return (
    <group>
      {L.roads.map((s, i) => { const p = seg(s.a, s.b); const t = (s.kind === "highway" ? hw : st).clone(); t.repeat.set(p.len / 8, s.kind === "highway" ? 1.6 : 0.8); t.needsUpdate = true; return (
        <mesh key={i} rotation={[-Math.PI / 2, 0, Math.atan2(-(s.b[1] - s.a[1]), s.b[0] - s.a[0])]} position={[p.mid[0], s.kind === "highway" ? 0.09 : 0.08, p.mid[1]]} receiveShadow>
          <planeGeometry args={[p.len, s.w]} /><meshStandardMaterial map={t} color="#2b3038" roughness={0.95} />
        </mesh> ); })}
      {/* lane dashes (layout generates them; now they're actually rendered) */}
      <Instances limit={400} frustumCulled={false}>
        <planeGeometry args={[1.6, 0.18]} />
        <meshStandardMaterial color="#e8d9a0" emissive="#f59e0b" emissiveIntensity={ENV.night * 0.8} transparent opacity={0.85} />
        {dashes.map((d, i) => <Instance key={i} position={[d.p[0], 0.105, d.p[1]]} rotation={[0, d.rot, 0]} />)}
      </Instances>
      {/* junction corner patches — hide the notch where avenue meets trunk */}
      {[[-42, -8], [42, -8]].map(([jx, jz], i) => (
        <mesh key={`j${i}`} rotation-x={-Math.PI / 2} position={[jx, 0.085, jz]} receiveShadow>
          <planeGeometry args={[5, 5]} />
          <meshStandardMaterial map={st.clone()} color="#2b3038" roughness={0.95} />
        </mesh>
      ))}
      {L.bridges.map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          {/* approach ramps: road-y → deck-y so cars/peds transition smoothly */}
          <mesh position={[-7.75, 0.55, 0]} rotation-z={-0.165} castShadow>
            <boxGeometry args={[3.9, 0.25, 6.4]} />
            <meshStandardMaterial map={hw} />
          </mesh>
          <mesh position={[7.75, 0.55, 0]} rotation-z={0.165} castShadow>
            <boxGeometry args={[3.9, 0.25, 6.4]} />
            <meshStandardMaterial map={hw} />
          </mesh>
          {/* main deck — TOP surface exactly at y=1.5 where lanes ride */}
          <mesh position={[0, 1.3, 0]} castShadow receiveShadow>
            <boxGeometry args={[12, 0.4, 6.4]} />
            <meshStandardMaterial map={hw} />
          </mesh>
          {/* piers */}
          <mesh position={[-3.2, 0.45, 0]}><cylinderGeometry args={[0.42, 0.5, 1.1, 10]} /><meshStandardMaterial color="#334155" /></mesh>
          <mesh position={[3.2, 0.45, 0]}><cylinderGeometry args={[0.42, 0.5, 1.1, 10]} /><meshStandardMaterial color="#334155" /></mesh>
          {/* railings + nav lights */}
          <mesh position={[0, 1.72, 3.05]}><boxGeometry args={[12.4, 0.45, 0.14]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.4} /></mesh>
          <mesh position={[0, 1.72, -3.05]}><boxGeometry args={[12.4, 0.45, 0.14]} /><meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.4} /></mesh>
          <mesh position={[-5.6, 2.6, 0]}><sphereGeometry args={[0.16, 8, 8]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={2} /></mesh>
          <mesh position={[5.6, 2.6, 0]}><sphereGeometry args={[0.16, 8, 8]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={2} /></mesh>
        </group>))}
    </group>
  );
}

export function Underground({ L }: { L: CityLayout }) {
  const on = useCity((s) => s.underground); if (!on) return null;
  return <group>{L.pipes.map((s, i) => { const p = seg(s.a, s.b); return (
    <mesh key={i} position={[p.mid[0], -1.5, p.mid[1]]} rotation={[0, Math.PI / 2 - p.rot, 0]}>
      <cylinderGeometry args={[0.35, 0.35, p.len, 8]} />
      <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1.4} transparent opacity={0.8} />
    </mesh> ); })}</group>;
}

function GltfProp({ url, position, rot = 0, scale = 1 }: { url: string; position: [number, number, number]; rot?: number; scale?: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={position} rotation-y={rot} scale={scale}>
      <primitive object={cloned} />
    </group>
  );
}
/** variant for nesting inside an already-scaled/positioned group */
function GltfPropInline({ url, scale = 1 }: { url: string; scale?: number }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} scale={scale} />;
}
function GltfTreeInline({ seed }: { seed: number }) {
  const { scene } = useGLTF(pick(TREES, seed * 9973));
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} />;
}
/** small deterministic offset helper so props don't line up like soldiers */
const DRESS = (districtIdx: number, slot: number) => ((districtIdx * 7 + slot * 13) % 9) - 4;

function GltfTree({ pos, seed }: { pos: [number, number]; seed: number }) {
  const ref = useRef<THREE.Group>(null!);
  const url = pick(TREES, seed * 9973);
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  const s = 1.4 + (seed % 1) * 1.2;
  return (
    <group ref={ref} position={[pos[0], 0, pos[1]]} rotation-y={seed * 7} scale={s}>
      <primitive object={cloned} />
    </group>
  );
}

export function Decor({ L }: { L: CityLayout }) {
  const failing = useCity((s) => s.failing);
  const lamp = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => { if (lamp.current) lamp.current.emissiveIntensity = 0.2 + ENV.night * 1.0; });
  const props = useMemo(() => {
    // dress the database platform + district corners with street furniture
    const out: { url: string; p: [number, number]; rot: number }[] = [];
    L.districts.forEach((d, di) => {
      if (d.stack === "database") return;
      out.push({ url: PROP.bench, p: [d.center[0] - 13.5, d.center[1] + DRESS(di, 0)], rot: Math.PI / 2 });
      out.push({ url: PROP.hydrant, p: [d.center[0] + 13.5, d.center[1] - DRESS(di, 1)], rot: 0 });
      out.push({ url: PROP.trashBin, p: [d.center[0] - 12.6, d.center[1] - DRESS(di, 2)], rot: 0 });
      out.push({ url: PROP.mailbox, p: [d.center[0] + 12.4, d.center[1] + DRESS(di, 3)], rot: -Math.PI / 3 });
      if (di % 2 === 0) out.push({ url: PROP.phoneBooth, p: [d.center[0], d.center[1] + 11.2], rot: 0 });
      else out.push({ url: PROP.kiosk, p: [d.center[0], d.center[1] - 11.2], rot: Math.PI });
    });
    // plaza on the database platform
    out.push({ url: PROP.fountain, p: [0, 61], rot: 0 });
    out.push({ url: PROP.bench, p: [-7, 63.5], rot: Math.PI / 2 });
    out.push({ url: PROP.bench, p: [7, 63.5], rot: Math.PI / 2 });
    out.push({ url: PROP.planter, p: [-14, 58.5], rot: 0 });
    out.push({ url: PROP.planter, p: [14, 58.5], rot: 0 });
    out.push({ url: PROP.billboard, p: [-30, 30], rot: Math.PI / 4 });
    out.push({ url: PROP.busStop, p: [-38.5, -26], rot: Math.PI / 2 });
    out.push({ url: PROP.trafficLight, p: [38.5, -26], rot: -Math.PI / 2 });
    out.push({ url: PROP.bollard, p: [-3, 55], rot: 0 });
    out.push({ url: PROP.bollard, p: [3, 55], rot: 0 });
    return out;
  }, [L]);
  const scatter = useMemo(() => {
    // nature scatter around the map edges & between districts
    const out: { kind: "tree" | "rock" | "bush"; x: number; z: number; s: number; seed: number }[] = [];
    for (let i = 0; i < 90; i++) {
      const ang = (i / 90) * Math.PI * 2 + 0.13;
      const r = 62 + ((i * 37) % 40);
      out.push({ kind: i % 5 === 0 ? "rock" : i % 5 === 1 ? "bush" : "tree", x: Math.cos(ang) * r, z: Math.sin(ang) * r * 0.85, s: 0.8 + ((i * 17) % 10) / 10, seed: i * 0.618 });
    }
    return out;
  }, []);
  return (
    <group>
      {L.trees.map((t, i) => <GltfTree key={i} pos={t} seed={i * 0.173 + 0.41} />)}
      {scatter.map((s, i) => (
        <group key={`s${i}`} position={[s.x, 0, s.z]} rotation-y={s.seed * 9} scale={s.s}>
          {s.kind === "tree" && <GltfTreeInline seed={s.seed} />}
          {s.kind === "rock" && <GltfPropInline url={pick(ROCKS, s.seed * 99)} scale={0.8} />}
          {s.kind === "bush" && <GltfPropInline url={pick(BUSHES_PLANTS, s.seed * 77)} />}
        </group>
      ))}
      {props.map((pr, i) => <GltfProp key={`p${i}`} url={pr.url} position={[pr.p[0], 0, pr.p[1]]} rot={pr.rot} />)}
      {failing && (
        <group>
          {/* construction site at the failing payment building */}
          <GltfProp url={BARRIER} position={[-3, 0, -3]} rot={0.4} />
          <GltfProp url={BARRIER} position={[3, 0, -4]} rot={-0.8} />
          <GltfProp url={CONE} position={[-1.5, 0, 3]} rot={0} />
          <GltfProp url={CONE} position={[2.2, 0, 2.4]} rot={1.2} />
          <GltfProp url={FENCE} position={[0, 0, -6]} rot={0} />
        </group>
      )}
      <Instances limit={100}><cylinderGeometry args={[0.07, 0.09, 3, 6]} /><meshStandardMaterial color="#8b94a3" metalness={0.6} roughness={0.4} />{L.lamps.map((t, i) => <Instance key={i} position={[t[0], 1.5, t[1]]} />)}</Instances>
      <Instances limit={100}><sphereGeometry args={[0.18, 10, 10]} /><meshStandardMaterial ref={lamp} color="#fef9c3" emissive="#ffcf7a" emissiveIntensity={1} />{L.lamps.map((t, i) => <Instance key={i} position={[t[0], 3.1, t[1]]} />)}</Instances>
    </group>
  );
}

export function Links({ L }: { L: CityLayout }) {
  const on = useCity((s) => s.links);
  const edges = useCity((s) => s.city.edges); // LIVE edges — updates when a repo loads
  if (!on) return null;
  const COLORS = { http: "#22d3ee", query: "#4ade80", import: "#94a3b8" };
  return (
    <group>
      {(edges ?? []).map((e, i) => {
        const a = L.byId.get(e.from), b = L.byId.get(e.to); if (!a || !b) return null;
        const A = new THREE.Vector3(a.pos[0], 2, a.pos[2]), B = new THREE.Vector3(b.pos[0], 2, b.pos[2]);
        const mid = A.clone().lerp(B, 0.5); mid.y = 6 + A.distanceTo(B) * 0.18;
        const pts = new THREE.QuadraticBezierCurve3(A, mid, B).getPoints(24);
        return <Line key={i} points={pts} color={COLORS[e.kind]} lineWidth={1.2} transparent opacity={0.55} />;
      })}
    </group>
  );
}

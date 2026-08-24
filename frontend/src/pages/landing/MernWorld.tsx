import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/* ── THE WORLD MAP — a printed MERN maquette ────────────────────────
   Four islands: CLIENT · API · RUNTIME · DATA. Real low-poly GLB
   buildings (CC0, threejsassets.com) repainted as a paper maquette:
   white volumes, ink edges, one signal-red request tracing the route.
   Mounted only when the section scrolls into view (lazy chunk).      */

const INK = "#141414";
const PAPER = "#f7f4e8";
const SLAB = "#eae6d3";
const SIGNAL = "#e30613";

const MAQ = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.72, metalness: 0 });
const SLAB_MAT = new THREE.MeshStandardMaterial({ color: SLAB, roughness: 0.9 });
const EDGE = new THREE.LineBasicMaterial({ color: INK, transparent: true, opacity: 0.55 });

/** CC0 models — threejsassets.com (glTF binary, vertex-color lowpoly) */
const MODELS = {
  react: ["/models/apt.glb", "/models/deco-hotel-corner-curve.glb"],
  express: ["/models/deco-bank-civic.glb", "/models/dock-warehouse-unit.glb"],
  node: ["/models/coaling-tower-modern.glb", "/models/bazaar-stall.glb"],
};
Object.values(MODELS).flat().forEach((u) => useGLTF.preload(u));

/** repaint + ink-outline a GLB into the maquette */
function Maquette({ url, position, s = 1, ry = 0 }: { url: string; position: [number, number, number]; s?: number; ry?: number }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = MAQ;
      m.castShadow = m.receiveShadow = false;
      const eg = new THREE.EdgesGeometry(m.geometry, 26);
      const lines = new THREE.LineSegments(eg, EDGE);
      m.add(lines);
    });
    const box = new THREE.Box3().setFromObject(c);
    const rawH = Math.max(0.01, box.max.y - box.min.y);
    return { o: c, k: 2.6 / rawH };
  }, [scene]);
  return (
    <group position={position} rotation={[0, ry, 0]} scale={obj.k * s}>
      <primitive object={obj.o} />
    </group>
  );
}

/** island slab — printed base plinth */
function Island({ position, w = 4.4, label, sub, active, onActive }: {
  position: [number, number, number];
  w?: number;
  label: string;
  sub: string;
  active: boolean;
  onActive: () => void;
}) {
  return (
    <group
      position={position}
      onPointerOver={(e) => { e.stopPropagation(); onActive(); }}
      onClick={(e) => { e.stopPropagation(); onActive(); }}
    >
      <mesh material={SLAB_MAT}>
        <boxGeometry args={[w, 0.5, 4]} />
        {/* hand-inked border */}
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, 0.5, 4)]} />
          <lineBasicMaterial color={INK} transparent opacity={active ? 0.95 : 0.5} />
        </lineSegments>
      </mesh>
      <Html center distanceFactor={14} position={[0, 3.4, 0]} zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div className={`caption-caps whitespace-nowrap border px-1.5 py-0.5 font-bold transition-colors ${active ? "border-black-ink bg-signal text-paper" : "border-black-ink/60 bg-paper/90 text-black-ink"}`}>
          {label} <span className="opacity-60">{sub}</span>
        </div>
      </Html>
    </group>
  );
}

/** mongo — cylinder stacks, drawn by hand (no model needed) */
function DataStack({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.45 + i * 0.78, 0]} material={MAQ}>
          <cylinderGeometry args={[1.05 - i * 0.12, 1.05 - i * 0.12, 0.62, 18]} />
          <lineSegments>
            <edgesGeometry args={[new THREE.CylinderGeometry(1.05 - i * 0.12, 1.05 - i * 0.12, 0.62, 18)]} />
            <lineBasicMaterial color={INK} transparent opacity={0.5} />
          </lineSegments>
        </mesh>
      ))}
    </group>
  );
}

/** the request — signal dot + misregistration ghosts riding the route */
function Traveler({ curve, paused, reduced }: { curve: THREE.CatmullRomCurve3; paused: boolean; reduced: boolean }) {
  const main = useRef<THREE.Mesh>(null!);
  const ghosts = useRef<THREE.Group>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (reduced || paused) return;
    t.current = (t.current + dt * 0.09) % 1;
    const p = curve.getPointAt(t.current);
    main.current.position.copy(p);
    ghosts.current.children.forEach((g, i) => {
      const tt = (t.current - 0.02 * (i + 1) + 1) % 1;
      (g as THREE.Mesh).position.copy(curve.getPointAt(tt));
    });
  });
  const statics = useMemo(
    () => [0.12, 0.38, 0.62, 0.88].map((u) => curve.getPointAt(u)),
    [curve],
  );
  const reqCurve = useMemo(() => new THREE.CatmullRomCurve3(REQ_PTS.map(([x, y, z]) => new THREE.Vector3(x, y, z))), []);
  const resCurve = useMemo(() => new THREE.CatmullRomCurve3(RES_PTS.map(([x, y, z]) => new THREE.Vector3(x, y, z))), []);
  if (reduced) {
    return (
      <group>
        {statics.map((p, i) => (
          <mesh key={i} position={p}>
            <sphereGeometry args={[0.16, 10, 10]} />
            <meshBasicMaterial color={SIGNAL} />
          </mesh>
        ))}
        <RouteLines reqCurve={reqCurve} resCurve={resCurve} />
      </group>
    );
  }
  return (
    <group>
      {/* printed route — dashed ink legs under the traveling dots */}
      <RouteLines reqCurve={reqCurve} resCurve={resCurve} />
      <mesh ref={main}>
        <sphereGeometry args={[0.22, 14, 14]} />
        <meshBasicMaterial color={SIGNAL} />
      </mesh>
      <group ref={ghosts}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.15, 10, 10]} />
            <meshBasicMaterial color={SIGNAL} transparent opacity={0.45 - i * 0.13} />
          </mesh>
        ))}
      </group>
      <ResponseDot curve={curve} />
    </group>
  );
}

/** signal-red request leg · dashed ink response leg */
function RouteLines({ reqCurve, resCurve }: { reqCurve: THREE.CatmullRomCurve3; resCurve: THREE.CatmullRomCurve3 }) {
  return (
    <group>
      <Line points={reqCurve.getPoints(60)} color={SIGNAL} lineWidth={1.5} dashed dashSize={0.35} gapSize={0.18} transparent opacity={0.85} />
      <Line points={resCurve.getPoints(40)} color={INK} lineWidth={1} dashed dashSize={0.22} gapSize={0.26} transparent opacity={0.4} />
    </group>
  );
}

/** response courier — small gold bead trailing the red request on its climb home */
function ResponseDot({ curve }: { curve: THREE.CatmullRomCurve3 }) {
  const ref = useRef<THREE.Mesh>(null!);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current = (t.current + dt * 0.09) % 1;
    // ride slightly behind the request; visible mostly on the return leg
    const u = (t.current - 0.06 + 1) % 1;
    ref.current.position.copy(curve.getPointAt(u));
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = u > 0.72 ? 1 : 0.25;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.12, 10, 10]} />
      <meshBasicMaterial color="#c99700" transparent opacity={0.3} />
    </mesh>
  );
}

/* request descends the islands then climbs home */
const WAYPOINTS: Array<[number, number, number]> = [
  [-6.6, 1.2, 0], [-6.6, 1.2, 1.8],
  [-2.2, 1.2, 1.8], [-2.2, 1.2, 0],
  [2.2, 1.2, 0], [2.2, 1.2, 1.8],
  [6.6, 1.2, 1.8], [6.6, 1.2, 0],
  [6.6, 2.6, 0], [-6.6, 2.6, 0], [-6.6, 1.2, 0],
];
/** request leg: islands left→right at deck height (first 7 hops) */
const REQ_PTS = WAYPOINTS.slice(0, 8);
/** response leg: climb + express return (hops 8..10) */
const RES_PTS = WAYPOINTS.slice(7);

const LAYERS = [
  { key: "client", n: "01", label: "CLIENT", sub: "REACT", cap: "<App/> renders the plan — state, router, components." },
  { key: "api", n: "02", label: "API", sub: "EXPRESS", cap: "route → guard → controller. Requests checked at the gate." },
  { key: "node", n: "03", label: "RUNTIME", sub: "NODE", cap: "Event loop executes — non-blocking I/O, libuv pool." },
  { key: "data", n: "04", label: "DATA", sub: "MONGODB", cap: "Documents persist — collections, indexes, pipelines." },
];

function World() {
  const [active, setActive] = useState(0);
  const reduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const rig = useRef<THREE.Group>(null!);
  const curve = useMemo(() => new THREE.CatmullRomCurve3(WAYPOINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z))), []);
  const hovered = useRef(false);
  /* auto-narration: the layer under the traveling request becomes active;
     also mirrored onto a window event so the printed indicator strip below
     the plate can follow along (DOM side reads it, no click needed)      */
  const lastHop = useRef(-1);
  useFrame(({ clock }) => {
    if (!rig.current || reduced) return;
    rig.current.rotation.y = Math.sin(clock.elapsedTime * 0.25) * (hovered.current ? 0.03 : 0.1);
    if (!hovered.current) {
      const u = (clock.elapsedTime * 0.09) % 1;
      const x = curve.getPointAt(u).x;
      const hop = x < -4.4 ? 0 : x < 0 ? 1 : x < 4.4 ? 2 : 3;
      if (hop !== lastHop.current) {
        lastHop.current = hop;
        setActive(hop);
        window.dispatchEvent(new CustomEvent("mern-layer", { detail: hop }));
      }
    }
  });
  return (
    <group
      ref={rig}
      onPointerOver={() => (hovered.current = true)}
      onPointerOut={() => (hovered.current = false)}
    >
      {/* river of paper between the rows */}
      <mesh position={[0, -0.32, 0]} receiveShadow={false}>
        <boxGeometry args={[17.6, 0.24, 5.6]} />
        <meshStandardMaterial color="#f2efe3" roughness={1} />
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(17.6, 0.24, 5.6)]} />
          <lineBasicMaterial color={INK} transparent opacity={0.35} />
        </lineSegments>
      </mesh>

      <group position={[-6.6, 0, 0]} onPointerOver={(e) => { e.stopPropagation(); setActive(0); }}>
        <Maquette url={MODELS.react[0]} position={[-1, 0.25, 0]} ry={0.5} />
        <Maquette url={MODELS.react[1]} position={[1.1, 0.25, -0.4]} s={0.85} ry={-0.3} />
      </group>
      <group position={[-2.2, 0, 0]} onPointerOver={(e) => { e.stopPropagation(); setActive(1); }}>
        <Maquette url={MODELS.express[0]} position={[0, 0.25, -0.3]} ry={0.2} />
      </group>
      <group position={[2.2, 0, 0]} onPointerOver={(e) => { e.stopPropagation(); setActive(2); }}>
        <Maquette url={MODELS.node[0]} position={[-0.8, 0.25, 0]} s={1.1} />
        <Maquette url={MODELS.node[1]} position={[1.2, 0.25, -0.5]} s={0.8} ry={1} />
      </group>

      {/* island slabs sit under the groups */}
      {LAYERS.map((l, i) => (
        <Island key={l.key} position={[(-6.6 + i * 4.4), -0.25, 0]} label={l.label} sub={l.sub}
          active={active === i} onActive={() => setActive(i)} />
      ))}
      <DataStack position={[6.6, 0.25, 0]} />

      <Traveler curve={curve} paused={false} reduced={reduced} />
    </group>
  );
}

export default function MernWorld({ active = true }: { active?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 8.5, 13.5], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={active ? "always" : "never"}
    >
      <ambientLight intensity={1.1} />
      <directionalLight position={[6, 12, 8]} intensity={1.6} />
      <directionalLight position={[-8, 6, -6]} intensity={0.5} />
      <World />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 3.4}
        maxPolarAngle={Math.PI / 2.4}
        rotateSpeed={0.55}
        makeDefault
      />
    </Canvas>
  );
}


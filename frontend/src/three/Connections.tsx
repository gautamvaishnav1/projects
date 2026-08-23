import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CityLayout } from "../lib/layout";
import type { EdgeNode } from "../types";
import { useCity } from "../store/useCity";

const EDGE_COLOR: Record<EdgeNode["kind"], string> = {
  http: "#22d3ee",
  import: "#a78bfa",
  query: "#34d399",
};

/** packets per connection — more on active links so the flow reads clearly */
const PACKETS = 3;

function Arc({ edge, layout, phase }: { edge: EdgeNode; layout: CityLayout; phase: number }) {
  const selectedId = useCity((s) => s.selectedId);
  const linksOn = useCity((s) => s.links);
  const group = useRef<THREE.Group>(null);
  const packets = useRef<(THREE.Mesh | null)[]>([]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const active = selectedId === edge.from || selectedId === edge.to;

  const curve = useMemo(() => {
    const a = layout.byId.get(edge.from);
    const b = layout.byId.get(edge.to);
    if (!a || !b) return null;
    const pa = new THREE.Vector3(a.pos[0], a.h + 1, a.pos[2]);
    const pb = new THREE.Vector3(b.pos[0], b.h + 1, b.pos[2]);
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    mid.y += pa.distanceTo(pb) * 0.22 + 3;
    return new THREE.QuadraticBezierCurve3(pa, mid, pb);
  }, [edge, layout]);

  const geo = useMemo(() => {
    if (!curve) return null;
    return new THREE.TubeGeometry(curve, 32, 0.09, 5, false);
  }, [curve]);
  useEffect(() => () => geo?.dispose(), [geo]);

  useFrame(({ clock }) => {
    if (!group.current || !geo || !curve) return;
    const t = clock.elapsedTime;
    group.current.visible = linksOn || active;
    if (!group.current.visible) return;
    if (mat.current) mat.current.opacity = active ? 0.85 : 0.16 + Math.sin(t * 1.6 + phase) * 0.05;
    // continuous data flow: packets stream from → to along the arc
    const speed = active ? 0.5 : 0.28;
    for (let i = 0; i < PACKETS; i++) {
      const p = packets.current[i];
      if (!p) continue;
      const u = (t * speed + phase + i / PACKETS) % 1;
      const pos = curve.getPoint(u);
      p.position.copy(pos);
      // fade packets in/out at the ends so they don't pop
      const fade = Math.min(u, 1 - u) * 6;
      (p.material as THREE.MeshBasicMaterial).opacity = Math.min(1, fade) * (active ? 1 : 0.75);
      const s = active ? 1 : 0.7;
      p.scale.setScalar(s * (0.8 + 0.4 * Math.min(1, fade)));
    }
  });

  if (!geo || !curve) return null;

  return (
    <group ref={group}>
      <mesh geometry={geo}>
        <meshBasicMaterial
          ref={mat}
          color={EDGE_COLOR[edge.kind]}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {Array.from({ length: PACKETS }).map((_, i) => (
        <mesh key={i} ref={(el) => { packets.current[i] = el; }}>
          <sphereGeometry args={[0.3, 8, 8]} />
          <meshBasicMaterial color={EDGE_COLOR[edge.kind]} transparent opacity={0.9} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

export function Connections({ layout, edges }: { layout: CityLayout; edges: EdgeNode[] }) {
  return (
    <group>
      {edges.map((e, i) => (
        <Arc key={`${e.from}-${e.to}-${e.kind}`} edge={e} layout={layout} phase={i * 0.37} />
      ))}
    </group>
  );
}

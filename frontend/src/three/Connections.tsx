import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { LAYOUT, CITY_EDGES } from "../lib/city";
import type { EdgeNode } from "../types";
import { useCity } from "../store/useCity";

const EDGE_COLOR: Record<EdgeNode["kind"], string> = {
  http: "#22d3ee",
  import: "#a78bfa",
  query: "#34d399",
};

function Arc({ edge, phase }: { edge: EdgeNode; phase: number }) {
  const selectedId = useCity((s) => s.selectedId);
  const linksOn = useCity((s) => s.links);
  const group = useRef<THREE.Group>(null);
  const packet = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const active = selectedId === edge.from || selectedId === edge.to;

  const geo = useMemo(() => {
    const a = LAYOUT.byId.get(edge.from)!;
    const b = LAYOUT.byId.get(edge.to)!;
    const pa = new THREE.Vector3(a.pos[0], a.h + 1, a.pos[2]);
    const pb = new THREE.Vector3(b.pos[0], b.h + 1, b.pos[2]);
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    mid.y += pa.distanceTo(pb) * 0.22 + 3;
    return new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(pa, mid, pb), 32, 0.09, 5, false);
  }, [edge]);
  useEffect(() => () => geo.dispose(), [geo]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.visible = linksOn || active;
    if (mat.current) mat.current.opacity = active ? 0.85 : 0.14 + Math.sin(t * 1.6 + phase) * 0.05;
    if (active && packet.current) {
      packet.current.visible = true;
      const u = (t * 0.45 + phase) % 1;
      const p = geo.parameters.path.getPoint(u);
      packet.current.position.copy(p);
    } else if (packet.current) {
      packet.current.visible = false;
    }
  });

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
      <mesh ref={packet} visible={false}>
        <sphereGeometry args={[0.32, 8, 8]} />
        <meshBasicMaterial color={EDGE_COLOR[edge.kind]} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function Connections() {
  return (
    <group>
      {CITY_EDGES.map((e, i) => (
        <Arc key={`${e.from}-${e.to}-${e.kind}`} edge={e} phase={i * 0.37} />
      ))}
    </group>
  );
}

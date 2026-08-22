/**
 * TrafficParticles.tsx
 * Animates small glowing spheres along the paths defined by currentRepo.edges.
 */
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppSelector } from '../../store';
import { svgToWorld, ISLAND_DEPTH } from '../../utils/worldCoords';

function TrafficParticle({
  start,
  end,
  duration,
  delay,
  color = '#00f0ff'
}: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  duration: number;
  delay: number;
  color?: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Calculate control point for a subtle arc
  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  mid.y += 0.8; // Arc height

  const curve = useMemo(
    () => new THREE.QuadraticBezierCurve3(start, mid, end),
    [start, mid, end]
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    
    const t = ((clock.elapsedTime + delay) % duration) / duration;
    
    // Get position along curve
    const pos = curve.getPoint(t);
    meshRef.current.position.copy(pos);
    
    // Fade out near ends
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    if (t < 0.1) mat.opacity = t * 10;
    else if (t > 0.9) mat.opacity = (1 - t) * 10;
    else mat.opacity = 1;
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.06, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={0} />
    </mesh>
  );
}

export function TrafficParticles() {
  const { currentRepo, transform } = useAppSelector((state) => state.city);
  
  if (!transform.showTraffic) return null;

  return (
    <group>
      {currentRepo.edges.map((edge, index) => {
        const fromNode = currentRepo.nodes.find((n) => n.id === edge.from);
        const toNode = currentRepo.nodes.find((n) => n.id === edge.to);
        
        if (!fromNode || !toNode) return null;

        const [sx, , sz] = svgToWorld(fromNode.gridPos.x, fromNode.gridPos.y - 20);
        const [ex, , ez] = svgToWorld(toNode.gridPos.x, toNode.gridPos.y - 20);
        
        // Starting points slightly above island
        const y = ISLAND_DEPTH + 0.1;

        const start = new THREE.Vector3(sx, y, sz);
        const end = new THREE.Vector3(ex, y, ez);

        return (
          <TrafficParticle
            key={`traffic-${index}`}
            start={start}
            end={end}
            duration={2.2 + index * 0.4} // Vary speed
            delay={index * 0.3} // Stagger start times
          />
        );
      })}
    </group>
  );
}

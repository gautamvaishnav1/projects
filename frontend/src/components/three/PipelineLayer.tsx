/**
 * PipelineLayer.tsx
 * Underground subterranean pipelines below the ocean floor.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppSelector } from '../../store';
import { OCEAN_Y } from '../../utils/worldCoords';

function PipeLine({
  points,
  color,
  yOffset,
  pulseSpeed
}: {
  points: [number, number, number][];
  color: string;
  yOffset: number;
  pulseSpeed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Build a path connecting the points
  const path = new THREE.CatmullRomCurve3(
    points.map(p => new THREE.Vector3(p[0], p[1], p[2])),
    false,
    'catmullrom',
    0.1
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.5 + Math.sin(clock.elapsedTime * pulseSpeed) * 1.5;
  });

  return (
    <group position={[0, yOffset, 0]}>
      {/* Outer transparent glass tube */}
      <mesh>
        <tubeGeometry args={[path, 64, 0.15, 8, false]} />
        <meshPhysicalMaterial
          color="#0f172a"
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.9}
          clearcoat={1}
        />
      </mesh>
      
      {/* Inner glowing core line */}
      <mesh ref={meshRef}>
        <tubeGeometry args={[path, 64, 0.05, 8, false]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

export function PipelineLayer() {
  const showPipelines = useAppSelector((state) => state.city.transform.showPipelines);
  
  if (!showPipelines) return null;

  const basePath = OCEAN_Y - 1.5; // Far below ocean

  return (
    <group>
      {/* DATA PIPELINE (Cyan) */}
      <PipeLine
        points={[[-6, basePath, -2], [0, basePath, -4], [6, basePath, 2], [8, basePath, 8]]}
        color="#00f0ff"
        yOffset={0}
        pulseSpeed={2}
      />
      
      {/* CACHE LAYER (Amber) */}
      <PipeLine
        points={[[-4, basePath, 5], [2, basePath, 3], [5, basePath, -3], [3, basePath, -8]]}
        color="#ffb800"
        yOffset={-0.4}
        pulseSpeed={1.5}
      />
      
      {/* EVENT QUEUE (Purple) */}
      <PipeLine
        points={[[-8, basePath, -6], [-2, basePath, 0], [4, basePath, 4], [9, basePath, 2]]}
        color="#a855f7"
        yOffset={-0.8}
        pulseSpeed={2.5}
      />
      
      {/* NETWORK LAYER (Green) */}
      <PipeLine
        points={[[-7, basePath, 7], [-1, basePath, 6], [1, basePath, -5], [7, basePath, -7]]}
        color="#00ff88"
        yOffset={-1.2}
        pulseSpeed={1}
      />
    </group>
  );
}

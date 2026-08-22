/**
 * OceanPlane.tsx
 * Animated dark cyberpunk ocean base — the glowing water body surrounding all islands.
 * Uses a grid-line overlay + subtle wave pulse for depth.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OCEAN_Y } from '../../utils/worldCoords';

// Animated ocean surface
function OceanSurface() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.opacity = 0.82 + Math.sin(clock.elapsedTime * 0.6) * 0.06;
    mat.emissiveIntensity = 0.12 + Math.sin(clock.elapsedTime * 0.4) * 0.05;
  });

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, OCEAN_Y, 0]}
      receiveShadow
    >
      <planeGeometry args={[55, 55, 1, 1]} />
      <meshStandardMaterial
        color="#3b82f6"
        emissive="#1d4ed8"
        emissiveIntensity={0.2}
        transparent
        opacity={0.9}
        roughness={0.1}
        metalness={0.8}
      />
    </mesh>
  );
}

// Grid-line overlay to simulate cyberpunk water reflection grid
function OceanGrid() {
  const gridRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!gridRef.current) return;
    const mat = gridRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.06 + Math.sin(clock.elapsedTime * 0.3) * 0.02;
  });

  return (
    <mesh
      ref={gridRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, OCEAN_Y + 0.005, 0]}
    >
      <planeGeometry args={[55, 55, 36, 28]} />
      <meshBasicMaterial
        color="#60a5fa"
        wireframe
        transparent
        opacity={0.15}
      />
    </mesh>
  );
}

// Edge glow borders
function OceanEdgeGlow() {
  return (
    <>
      {/* Horizon ambient glow planes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, OCEAN_Y - 0.1, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color="#2563eb" transparent opacity={0.8} />
      </mesh>
    </>
  );
}

// Floating light reflections on water
function WaterReflections() {
  const refs = useRef<THREE.Mesh[]>([]);

  useFrame(({ clock }) => {
    refs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const t = clock.elapsedTime + i * 1.2;
      (mesh.material as THREE.MeshBasicMaterial).opacity =
        0.04 + Math.abs(Math.sin(t * 0.8)) * 0.08;
    });
  });

  const positions: [number, number, number][] = [
    [-6, OCEAN_Y + 0.01, -2],  [-3, OCEAN_Y + 0.01, -5],
    [4, OCEAN_Y + 0.01, -3],   [7, OCEAN_Y + 0.01, 1],
    [-8, OCEAN_Y + 0.01, 2],   [2, OCEAN_Y + 0.01, 5],
    [-5, OCEAN_Y + 0.01, 4],   [5, OCEAN_Y + 0.01, -6],
    [0, OCEAN_Y + 0.01, -8],   [-2, OCEAN_Y + 0.01, 7],
    [8, OCEAN_Y + 0.01, 5],    [-9, OCEAN_Y + 0.01, -4],
  ];

  const colors = ['#ffffff', '#bfdbfe', '#93c5fd'];

  return (
    <>
      {positions.map((pos, i) => (
        <mesh
          key={i}
          position={pos}
          rotation={[-Math.PI / 2, 0, 0]}
          ref={(el) => {
            if (el) refs.current[i] = el;
          }}
        >
          <planeGeometry args={[1.2 + (i % 3) * 0.5, 0.12]} />
          <meshBasicMaterial
            color={colors[i % colors.length]}
            transparent
            opacity={0.2}
          />
        </mesh>
      ))}
    </>
  );
}

export function OceanPlane() {
  return (
    <group>
      <OceanEdgeGlow />
      <OceanSurface />
      <OceanGrid />
      <WaterReflections />
    </group>
  );
}

/**
 * ApiGatewayHub.tsx
 * The central hub monument connecting all districts.
 * Rendered at the SVG center (converted to 0,0,0 world coordinates).
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { ISLAND_DEPTH } from '../../utils/worldCoords';

export function ApiGatewayHub() {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const pingSphereRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    // Rotate the dashed outer ring
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y = clock.elapsedTime * -0.5;
    }

    // Ping sphere pulsing
    if (pingSphereRef.current) {
      const mat = pingSphereRef.current.material as THREE.MeshBasicMaterial;
      const t = (clock.elapsedTime % 2) / 2; // 0 to 1 over 2 seconds
      
      const scale = 1 + t * 2;
      pingSphereRef.current.scale.set(scale, scale, scale);
      mat.opacity = (1 - t) * 0.6;
    }
  });

  return (
    <group position={[0, ISLAND_DEPTH / 2 + 0.1, 0]}>
      {/* Base Platform */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[1.2, 1.3, 0.2, 32]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.9} metalness={0.1} />
      </mesh>
      
      {/* Outer Border (Stone Wall) */}
      <mesh position={[0, 0.15, 0]}>
        <torusGeometry args={[1.1, 0.1, 16, 64]} />
        <meshStandardMaterial color="#64748b" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Inner Floor Area (Grass/Park) */}
      <mesh position={[0, 0.105, 0]}>
        <cylinderGeometry args={[1.1, 1.1, 0.01, 32]} />
        <meshStandardMaterial color="#4ade80" roughness={0.8} />
      </mesh>

      {/* Center Core Column (Stone Monument) */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 0.6, 16]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Core Center Dot */}
      <mesh position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial color="#fcd34d" emissive="#f59e0b" emissiveIntensity={0.5} />
      </mesh>

      {/* Pulsing Ping Sphere */}
      <mesh ref={pingSphereRef} position={[0, 0.72, 0]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#fde047" transparent opacity={0.4} />
      </mesh>

      {/* HTML Label */}
      <Html position={[0, 1.5, 0]} center distanceFactor={8} occlude>
        <div style={{
          background: '#ffffff',
          border: '1.5px solid #e2e8f0',
          borderRadius: 5,
          padding: '2px 8px',
          whiteSpace: 'nowrap',
          color: '#1e293b',
          fontFamily: 'sans-serif',
          fontSize: '9px',
          fontWeight: 'bold',
          pointerEvents: 'none',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}>
          API GATEWAY HUB
        </div>
      </Html>
    </group>
  );
}

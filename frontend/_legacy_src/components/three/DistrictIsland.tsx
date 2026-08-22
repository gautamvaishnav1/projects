/**
 * DistrictIsland.tsx
 * Renders a single raised island platform for a district.
 *
 * Structure:
 *   - Island base platform (BoxGeometry) with neon border glow
 *   - Corner decorative trees (matching the reference image's green corner trees)
 *   - Neon district header badge (Html overlay)
 *   - All CityBuilding children that belong to this district
 *
 * All data comes from IslandSector + CityNode[] — fully dynamic from any data source.
 */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { IslandSector, CityNode } from '../../types/codecity';
import { CityBuilding } from './CityBuilding';
import {
  svgToWorld, svgSizeToWorld, ISLAND_DEPTH,
} from '../../utils/worldCoords';

// -- Corner tree cluster (cypress-like cone + trunk) --------------------------
function CornerTree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const trunkH = 0.12 * scale;
  const treeH  = 0.38 * scale;
  const treeR  = 0.12 * scale;

  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, trunkH / 2, 0]}>
        <cylinderGeometry args={[0.03 * scale, 0.04 * scale, trunkH, 6]} />
        <meshStandardMaterial color="#3d2b1f" roughness={0.9} />
      </mesh>
      {/* Foliage cone 1 (bottom) */}
      <mesh position={[0, trunkH + treeH * 0.35, 0]}>
        <coneGeometry args={[treeR, treeH * 0.55, 7]} />
        <meshStandardMaterial color="#166534" roughness={0.8} />
      </mesh>
      {/* Foliage cone 2 (top) */}
      <mesh position={[0, trunkH + treeH * 0.72, 0]}>
        <coneGeometry args={[treeR * 0.65, treeH * 0.4, 7]} />
        <meshStandardMaterial color="#15803d" roughness={0.8} />
      </mesh>
    </group>
  );
}

// -- Animated neon border frame (4 edge strips) --------------------------------
function NeonBorder({ isActive }: { isActive: boolean }) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(({ clock }) => {
    if (!matRef.current) return;
    matRef.current.opacity = (isActive ? 0.9 : 0.55) + Math.sin(clock.elapsedTime * 1.5) * 0.12;
  });

  const h = 0.06;

  return (
    <group position={[0, ISLAND_DEPTH + h / 2, 0]}>
      {/* We are removing the neon border frame in the natural style */}
    </group>
  );
}

// -- Island platform box -------------------------------------------------------
function IslandBase({
  w, d, color, isHovered,
}: { w: number; d: number; color: string; isHovered: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissive.set(color);
    mat.emissiveIntensity = (isHovered ? 0.15 : 0.05) + Math.sin(clock.elapsedTime * 0.8) * 0.03;
  });

  return (
    <>
      {/* Platform top surface (Grass) */}
      <mesh ref={meshRef} position={[0, ISLAND_DEPTH / 2, 0]} receiveShadow>
        <boxGeometry args={[w, ISLAND_DEPTH, d]} />
        <meshStandardMaterial
          color="#4ade80" // Vibrant green grass
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {/* Sand/Beach layer */}
      <mesh position={[0, ISLAND_DEPTH / 2 - 0.1, 0]}>
        <boxGeometry args={[w + 0.1, 0.05, d + 0.1]} />
        <meshStandardMaterial color="#fde047" roughness={0.9} metalness={0.1} /> 
      </mesh>
      {/* Cliff sides (Dirt/Rock) */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[w + 0.05, 0.12, d + 0.05]} />
        <meshStandardMaterial color="#78350f" roughness={1} metalness={0} /> // Dark brown dirt
      </mesh>
    </>
  );
}

// ── Main DistrictIsland ────────────────────────────────────────────────────────
export interface DistrictIslandProps {
  sector: IslandSector;
  nodes: CityNode[];
  selectedNode: CityNode | null;
  onSelectNode: (node: CityNode) => void;
  isHighlighted?: boolean;
}

export function DistrictIsland({
  sector,
  nodes,
  selectedNode,
  onSelectNode,
  isHighlighted = false,
}: DistrictIslandProps) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  const [wx, , wz] = svgToWorld(sector.gridOrigin.x, sector.gridOrigin.y);
  const [rawW, rawD] = svgSizeToWorld(sector.size.width, sector.size.height);
  
  // Shrink islands slightly to create rivers between them
  const w = rawW - 1.5; 
  const d = rawD - 1.5;

  const color = sector.accentBright;
  const isActive = isHighlighted || hovered;

  // Hover lift effect
  useFrame(() => {
    if (!groupRef.current) return;
    const targetY = isActive ? 0.07 : 0;
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.06;
  });

  // Many trees around the perimeter
  const halfW = w / 2 - 0.18;
  const halfD = d / 2 - 0.18;
  const treePosns: [number, number, number][] = [];
  
  // Create a perimeter of trees
  const numTreesX = Math.floor(w / 0.8);
  const numTreesZ = Math.floor(d / 0.8);
  
  for(let i = 0; i < numTreesX; i++) {
    treePosns.push([-halfW + (i * w) / numTreesX, ISLAND_DEPTH + 0.01, -halfD]);
    treePosns.push([-halfW + (i * w) / numTreesX, ISLAND_DEPTH + 0.01, halfD]);
  }
  for(let i = 0; i < numTreesZ; i++) {
    treePosns.push([-halfW, ISLAND_DEPTH + 0.01, -halfD + (i * d) / numTreesZ]);
    treePosns.push([halfW, ISLAND_DEPTH + 0.01, -halfD + (i * d) / numTreesZ]);
  }

  return (
    <>
      <group
        ref={groupRef}
        position={[wx, 0, wz]}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
        onPointerOut={() => setHovered(false)}
      >
        {/* Island base platform */}
      <IslandBase w={w} d={d} color={color} isHovered={isActive} />

      {/* Neon border frame */}
      <NeonBorder isActive={isActive} />

      {/* Decorative corner trees */}
      {treePosns.map((pos, i) => (
        <CornerTree key={i} position={pos} scale={0.75 + (i % 2) * 0.15} />
      ))}

      {/* Point light above island for daylight boost */}
      <pointLight
        position={[0, 2.5, 0]}
        intensity={isActive ? 1.0 : 0.3}
        color="#ffffff"
        distance={4.5}
      />

      {/* District header badge (HTML overlay at top of island) */}
      <Html
        position={[0, ISLAND_DEPTH + 0.35, -d / 2 + 0.05]}
        center
        distanceFactor={5.5}
      >
        <div style={{
          background: 'rgba(8,12,22,0.95)',
          border: `1.5px solid ${color}`,
          borderRadius: 8,
          padding: '4px 10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 1,
          pointerEvents: 'none',
          boxShadow: `0 0 12px ${color}66`,
          minWidth: 90,
        }}>
          <span style={{
            fontSize: 8,
            fontFamily: 'monospace',
            fontWeight: 900,
            color,
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
          }}>
            {sector.title}
          </span>
          <span style={{
            fontSize: 7,
            fontFamily: 'monospace',
            color: '#64748b',
            whiteSpace: 'nowrap',
          }}>
            {sector.subtitle}
          </span>
          <span style={{
            fontSize: 7,
            fontFamily: 'monospace',
            color: '#475569',
          }}>
            {nodes.length} node{nodes.length !== 1 ? 's' : ''}
          </span>
        </div>
      </Html>

      </group>

      {/* All buildings for this district - placed OUTSIDE the translated group so absolute world coords work */}
      {nodes.map((node) => (
        <CityBuilding
          key={node.id}
          node={node}
          isSelected={selectedNode?.id === node.id}
          onSelectNode={onSelectNode}
          districtColor={color}
        />
      ))}
    </>
  );
}

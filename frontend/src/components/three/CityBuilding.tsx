/**
 * CityBuilding.tsx
 * A single 3D building rendered dynamically from CityNode data.
 *
 * Shape variants — driven purely by node.island (same as mockRepoData, future backend data):
 *   • database  → cylinder silo
 *   • auth      → castle / fort tower
 *   • infra     → industrial block cluster
 *   • service   → satellite dish + tower
 *   • default   → glass skyscraper tower
 *
 * Lucide icons are overlaid via @react-three/drei <Html> — works in 2D HTML-space
 * above the 3D building position.
 */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  Layout, Server, Database, ShieldCheck, Cpu,
  Activity, Globe, Archive, AlertTriangle,
} from 'lucide-react';
import type { CityNode } from '../../types/codecity';
import {
  svgToWorld, linesToHeight, riskToColor, DISTRICT_COLORS,
  WORLD_SCALE,
} from '../../utils/worldCoords';

// ── Icon map: district → Lucide icon component ────────────────────────────────
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number; color?: string }>> = {
  frontend : Layout,
  backend  : Server,
  database : Database,
  auth     : ShieldCheck,
  infra    : Cpu,
  service  : Activity,
  external : Globe,
  depot    : Archive,
};

export interface CityBuildingProps {
  node: CityNode;
  isSelected?: boolean;
  onSelectNode: (node: CityNode) => void;
  districtColor: string;
}

// ── Animated selection ring ───────────────────────────────────────────────────
function SelectionRing({ color, radius }: { color: string; radius: number }) {
  const ringRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    ringRef.current.rotation.z = clock.elapsedTime * 1.2;
    const mat = ringRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.5 + Math.sin(clock.elapsedTime * 4) * 0.3;
  });
  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <ringGeometry args={[radius, radius + 0.06, 48]} />
      <meshBasicMaterial color={color} transparent opacity={0.7} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ── Risk beacon (flashing tip on high-risk buildings) ─────────────────────────
function RiskBeacon({ height, color }: { height: number; color: string }) {
  const beaconRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!beaconRef.current) return;
    const mat = beaconRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.4 + Math.abs(Math.sin(clock.elapsedTime * 3)) * 1.8;
  });
  return (
    <mesh ref={beaconRef} position={[0, height + 0.25, 0]}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
    </mesh>
  );
}

// ── DATABASE SILO (cylinder) ──────────────────────────────────────────────────
function DatabaseSilo({ node, isSelected, onSelectNode, color }: CityBuildingProps & { color: string }) {
  const [hovered, setHovered] = useState(false);
  const height = linesToHeight(node.lines);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const target = isSelected || hovered ? 1.08 : 1.0;
    meshRef.current.scale.y += (target - meshRef.current.scale.y) * 0.1;
  });

  const isRisk = node.security.toLowerCase().includes('risk') || node.security.toLowerCase().includes('warning');

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onSelectNode(node); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Silo body */}
      <mesh ref={meshRef} position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.32, height, 16]} />
        <meshStandardMaterial
          color="#f1f5f9" // Light grey/white metal tank
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, height, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.28, 0.08, 16]} />
        <meshStandardMaterial color="#ffffff" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Ring bands */}
      {[0.3, 0.6].map((frac) => (
        <mesh key={frac} position={[0, height * frac, 0]}>
          <torusGeometry args={[0.3, 0.025, 8, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>
      ))}
      {/* Selection ring */}
      {isSelected && <SelectionRing color={color} radius={0.45} />}
      {/* Risk beacon */}
      {isRisk && <RiskBeacon height={height} color="#ef4444" />}
      {/* Floating label + icon */}
      <Html position={[0, height + 0.55, 0]} center distanceFactor={6} occlude>
        <div style={{
          background: 'rgba(10,14,26,0.92)',
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '3px 7px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: `0 0 8px ${color}55`,
        }}>
          <Database size={10} color={color} />
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#e2e8f0', fontWeight: 'bold' }}>
            {node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name}
          </span>
        </div>
      </Html>
    </group>
  );
}

// ── AUTH FORT (castle tower) ──────────────────────────────────────────────────
function AuthFort({ node, isSelected, onSelectNode, color }: CityBuildingProps & { color: string }) {
  const [hovered, setHovered] = useState(false);
  const height = linesToHeight(node.lines);
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current) return;
    const target = isSelected || hovered ? 1.06 : 1.0;
    meshRef.current.scale.y += (target - meshRef.current.scale.y) * 0.1;
  });

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onSelectNode(node); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main tower body */}
      <mesh ref={meshRef} position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[0.55, height, 0.55]} />
        <meshStandardMaterial
          color="#94a3b8" // Solid stone color
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      {/* Battlements (4 corner merlons) */}
      {[[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]].map(([bx, bz], i) => (
        <mesh key={i} position={[bx, height + 0.12, bz]} castShadow>
          <boxGeometry args={[0.14, 0.24, 0.14]} />
          <meshStandardMaterial color="#64748b" roughness={0.9} metalness={0.1} />
        </mesh>
      ))}
      {/* Shield emblem */}
      <mesh position={[0.28, height * 0.55, 0]}>
        <planeGeometry args={[0.18, 0.22]} />
        <meshStandardMaterial color="#fcd34d" emissive="#f59e0b" emissiveIntensity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* Tower flag spire */}
      <mesh position={[0, height + 0.55, 0]}>
        <coneGeometry args={[0.05, 0.4, 8]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      {/* Selection ring */}
      {isSelected && <SelectionRing color={color} radius={0.52} />}
      {/* Label */}
      <Html position={[0, height + 0.9, 0]} center distanceFactor={6} occlude>
        <div style={{
          background: 'rgba(10,14,26,0.92)',
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '3px 7px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: `0 0 8px ${color}55`,
        }}>
          <ShieldCheck size={10} color={color} />
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#e2e8f0', fontWeight: 'bold' }}>
            {node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name}
          </span>
        </div>
      </Html>
    </group>
  );
}

// ── MONITORING SATELLITE (dish + tower) ───────────────────────────────────────
function SatelliteTower({ node, isSelected, onSelectNode, color }: CityBuildingProps & { color: string }) {
  const [hovered, setHovered] = useState(false);
  const dishRef = useRef<THREE.Mesh>(null);
  const height = linesToHeight(node.lines) * 0.7;

  useFrame(({ clock }) => {
    if (dishRef.current) {
      const speed = hovered ? 1.2 : 0.4;
      dishRef.current.rotation.y = Math.sin(clock.elapsedTime * speed) * 0.3;
    }
  });

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onSelectNode(node); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Base tower */}
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.14, height, 6]} />
        <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Dish arm */}
      <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.35, 6]} />
        <meshStandardMaterial color="#64748b" />
      </mesh>
      {/* Dish */}
      <mesh ref={dishRef} position={[0.22, height, 0]} rotation={[Math.PI / 6, 0, -Math.PI / 4]}>
        <sphereGeometry args={[0.22, 12, 8, 0, Math.PI]} />
        <meshStandardMaterial
          color="#f8fafc" // White satellite dish
          roughness={0.3}
          metalness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* Pulse ring */}
      <PulseRing position={[0, 0.04, 0]} color={color} />
      {isSelected && <SelectionRing color={color} radius={0.38} />}
      <Html position={[0, height + 0.5, 0]} center distanceFactor={6} occlude>
        <div style={{
          background: 'rgba(10,14,26,0.92)',
          border: `1px solid ${color}`,
          borderRadius: 6,
          padding: '3px 7px',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: `0 0 8px ${color}55`,
        }}>
          <Activity size={10} color={color} />
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: '#e2e8f0', fontWeight: 'bold' }}>
            {node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name}
          </span>
        </div>
      </Html>
    </group>
  );
}

// Animated expanding rings (monitoring ping)
function PulseRing({ position, color }: { position: [number, number, number]; color: string }) {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = (clock.elapsedTime % 2) / 2;
    const t2 = ((clock.elapsedTime + 1) % 2) / 2;
    [ring1, ring2].forEach((r, i) => {
      const tt = i === 0 ? t : t2;
      if (!r.current) return;
      r.current.scale.set(1 + tt * 3, 1, 1 + tt * 3);
      (r.current.material as THREE.MeshBasicMaterial).opacity = (1 - tt) * 0.4;
    });
  });

  return (
    <group position={position}>
      <mesh ref={ring1} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.36, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.36, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// ── GENERIC CITADEL (default for all other districts) ─────────────────────
function GameCitadel({ node, isSelected, onSelectNode, color }: CityBuildingProps & { color: string }) {
  const [hovered, setHovered] = useState(false);
  const height = linesToHeight(node.lines);
  const w = (node.width || 44) * WORLD_SCALE * 0.75;
  const d = (node.depth || 44) * WORLD_SCALE * 0.75;
  const groupRef = useRef<THREE.Group>(null);
  const isRisk = node.security.toLowerCase().includes('risk') || node.security.toLowerCase().includes('warning');
  const alertColor = riskToColor(node.security);
  const IconComp = ICON_MAP[node.island] || Layout;

  useFrame(() => {
    if (!groupRef.current) return;
    const targetY = hovered || isSelected ? 0.12 : 0;
    groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.1;
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => { e.stopPropagation(); onSelectNode(node); }}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {/* Main keep body - thick stone */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, height, d]} />
        <meshStandardMaterial
          color="#94a3b8" // Stone grey
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>

      {/* Roof cap - wood/shingle color */}
      <mesh position={[0, height + 0.05, 0]}>
        <boxGeometry args={[w + 0.05, 0.1, d + 0.05]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} /> 
      </mesh>

      {/* 4 Corner Watchtowers */}
      {[[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]].map(([ex, ez], i) => (
        <group key={i} position={[ex, height / 2, ez]}>
          {/* Tower base */}
          <mesh>
            <boxGeometry args={[0.15, height + 0.2, 0.15]} />
            <meshStandardMaterial color="#64748b" roughness={0.9} />
          </mesh>
          {/* Tower roof */}
          <mesh position={[0, (height + 0.2) / 2 + 0.1, 0]}>
            <coneGeometry args={[0.12, 0.2, 4]} />
            <meshStandardMaterial color="#991b1b" roughness={0.8} />
          </mesh>
        </group>
      ))}

      {/* Risk alert overlay */}
      {isRisk && <RiskBeacon height={height + 0.45} color={alertColor} />}
      {/* Selected ring */}
      {isSelected && <SelectionRing color={color} radius={Math.max(w, d) * 0.65} />}

      {/* Floating icon + name label */}
      <Html position={[0, height + 0.62, 0]} center distanceFactor={7} occlude>
        <div style={{
          background: 'rgba(8,12,22,0.93)',
          border: `1px solid ${isSelected ? '#ffffff' : color}`,
          borderRadius: 7,
          padding: '3px 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: `0 0 ${isSelected ? 14 : 6}px ${color}60`,
          transition: 'all 0.2s',
        }}>
          {isRisk && <AlertTriangle size={9} color="#f59e0b" />}
          <IconComp size={10} color={color} />
          <span style={{ fontSize: 9, fontFamily: 'monospace', color: isSelected ? '#fff' : '#cbd5e1', fontWeight: 'bold' }}>
            {node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name}
          </span>
        </div>
      </Html>
    </group>
  );
}

// ── Main export: routes to correct variant by island type ─────────────────────
export function CityBuilding({ node, isSelected = false, onSelectNode }: CityBuildingProps) {
  const color = DISTRICT_COLORS[node.island] ?? '#00F0FF';
  const [wx, , wz] = svgToWorld(node.gridPos.x, node.gridPos.y);

  return (
    <group position={[wx, 0, wz]}>
      {node.island === 'database' && (
        <DatabaseSilo node={node} isSelected={isSelected} onSelectNode={onSelectNode} districtColor={color} color={color} />
      )}
      {node.island === 'auth' && (
        <AuthFort node={node} isSelected={isSelected} onSelectNode={onSelectNode} districtColor={color} color={color} />
      )}
      {node.island === 'service' && (
        <SatelliteTower node={node} isSelected={isSelected} onSelectNode={onSelectNode} districtColor={color} color={color} />
      )}
      {!['database', 'auth', 'service'].includes(node.island) && (
        <GameCitadel node={node} isSelected={isSelected} onSelectNode={onSelectNode} districtColor={color} color={color} />
      )}
    </group>
  );
}

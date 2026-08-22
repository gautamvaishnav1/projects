/**
 * NeonRoads.tsx
 * The 6 connecting highways/roads from the districts to the API Gateway Hub.
 * Rendered using THREE.QuadraticBezierCurve3 or simple lines.
 */
import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { svgToWorld, ISLAND_DEPTH } from '../../utils/worldCoords';

// Hardcoded road connections from SVG implementation
const ROAD_DEFINITIONS = [
  { id: 'f-road', sx: 480, sy: 240, ex: 480, ey: 380, color: '#00f0ff', label: '', type: 'straight' },
  { id: 'b-road', sx: 280, sy: 380, ex: 480, ey: 380, color: '#a855f7', label: 'Invalidate Cache', lx: 380, ly: 370, type: 'straight' },
  { id: 'd-road', sx: 680, sy: 380, ex: 480, ey: 380, color: '#00ff88', label: 'Query User Silo', lx: 580, ly: 370, type: 'straight' },
  { id: 'a-road', sx: 680, sy: 240, ex: 480, ey: 380, color: '#ffb800', label: 'Verify JWT Fort', lx: 560, ly: 300, cx: 580, cy: 300, type: 'curve' },
  { id: 'i-road', sx: 480, sy: 520, ex: 480, ey: 380, color: '#3b82f6', label: 'Docker Deploy', lx: 470, ly: 460, type: 'straight' },
  { id: 's-road', sx: 680, sy: 520, ex: 480, ey: 380, color: '#ffb800', label: '', cx: 580, cy: 450, type: 'curve' }
];

function Road({ road }: { road: typeof ROAD_DEFINITIONS[0] }) {
  const [sx, , sz] = svgToWorld(road.sx, road.sy);
  const [ex, , ez] = svgToWorld(road.ex, road.ey);
  
  const y = ISLAND_DEPTH / 2 - 0.05; // Slightly below island surface but above ocean
  
  const geometry = useMemo(() => {
    let curve;
    if (road.type === 'curve' && road.cx && road.cy) {
      const [cx, , cz] = svgToWorld(road.cx, road.cy);
      curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(sx, y, sz),
        new THREE.Vector3(cx, y, cz),
        new THREE.Vector3(ex, y, ez)
      );
    } else {
      curve = new THREE.LineCurve3(
        new THREE.Vector3(sx, y, sz),
        new THREE.Vector3(ex, y, ez)
      );
    }
    
    // Create a flat bridge geometry instead of a tube
    // Extrude the curve into a flat road
    const extrudeSettings = {
      steps: 20,
      bevelEnabled: false,
      extrudePath: curve
    };
    
    // Create a shape for the road cross section (flat wide rectangle)
    const shape = new THREE.Shape();
    shape.moveTo(-0.25, -0.05);
    shape.lineTo(0.25, -0.05);
    shape.lineTo(0.25, 0.05);
    shape.lineTo(-0.25, 0.05);
    shape.lineTo(-0.25, -0.05);

    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [sx, sz, ex, ez, road.cx, road.cy, road.type, y]);

  // For floating labels
  const labelPos = useMemo(() => {
    if (road.lx && road.ly) {
      const [lx, , lz] = svgToWorld(road.lx, road.ly);
      return new THREE.Vector3(lx, y + 0.3, lz);
    }
    return null;
  }, [road.lx, road.ly, y]);

  return (
    <group>
      {/* Asphalt bridge */}
      <mesh geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial color="#475569" roughness={0.9} metalness={0.1} />
      </mesh>
      
      {/* Yellow dashed center line (simulated by placing a slightly raised neon road) */}
      <mesh position={[0, 0.06, 0]}>
        {/* We recreate the tube just for the yellow line */}
        <tubeGeometry args={[
          road.type === 'curve' && road.cx && road.cy 
            ? new THREE.QuadraticBezierCurve3(new THREE.Vector3(sx, y, sz), new THREE.Vector3(...svgToWorld(road.cx, road.cy)), new THREE.Vector3(ex, y, ez))
            : new THREE.LineCurve3(new THREE.Vector3(sx, y, sz), new THREE.Vector3(ex, y, ez)), 
          20, 0.02, 4, false
        ]} />
        <meshBasicMaterial color="#fde047" />
      </mesh>

      {/* Road Label */}
      {labelPos && road.label && (
        <Html position={labelPos} center distanceFactor={8} occlude>
          <div style={{
            background: '#0a0e1a',
            border: `1px solid ${road.color}`,
            borderRadius: 4,
            padding: '2px 6px',
            color: road.color,
            fontSize: '8px',
            fontWeight: 'bold',
            fontFamily: 'monospace',
            pointerEvents: 'none',
            whiteSpace: 'nowrap'
          }}>
            {road.label}
          </div>
        </Html>
      )}
    </group>
  );
}

export function NeonRoads() {
  return (
    <group>
      {ROAD_DEFINITIONS.map((road) => (
        <Road key={road.id} road={road} />
      ))}
    </group>
  );
}

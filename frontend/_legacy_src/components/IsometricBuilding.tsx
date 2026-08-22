/**
 * IsometricBuilding.tsx — Per-node building renderer.
 *
 * Rendering tiers:
 *  1. database  → Enhanced cylindrical silo (keeps existing look + Fort walls behind)
 *  2. auth      → Full Fort castle (most fort-like, with golden shield crest)
 *  3. All others → Isometric Fort architecture scaled by complexity
 *
 * All interactions (click → Redux selectedNode → RightDrawer) are preserved.
 * All zoom/pan transforms are preserved (this component just draws; the parent transforms).
 */

import React, { useState } from 'react';
import type { CityNode } from '../types/codecity';
import { ISLAND_SECTORS } from '../data/mockRepoData';
import Fort from './Fort';

interface IsometricBuildingProps {
  node: CityNode;
  isSelected: boolean;
  onSelect: (node: CityNode) => void;
}

export const IsometricBuilding: React.FC<IsometricBuildingProps> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sector = ISLAND_SECTORS[node.island] || ISLAND_SECTORS.frontend;

  const isHighRisk =
    node.security.toLowerCase().includes('risk') ||
    node.security.toLowerCase().includes('warning');

  const x = node.gridPos.x;
  const y = node.gridPos.y;

  // Scale fort by complexity
  const scaleMap: Record<string, number> = {
    Low: 0.72,
    Medium: 0.82,
    High: 0.92,
    Critical: 1.0,
  };
  const fortScale = scaleMap[node.complexity] ?? 0.78;

  // ─── HANDLER ──────────────────────────────────────────────────────────────────
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node);
  };

  // ─── DATABASE CITADEL: enhanced cylindrical silo + fort wall ring ─────────────
  if (node.island === 'database') {
    const rx = (node.width || 44) * 0.42;
    const ry = rx * 0.48;
    const rawH = node.lines * 0.55;
    const h = Math.min(Math.max(rawH, 36), 150);

    return (
      <g
        className="cursor-pointer"
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        transform={`translate(${x},${y})${isHovered ? ' translate(0,-7)' : ''}`}
        style={{ transition: 'transform 0.18s ease-out' }}
      >
        {/* Ground shadow */}
        <ellipse cx={0} cy={4} rx={rx + 6} ry={ry + 3} fill="rgba(0,0,0,0.55)" style={{ filter: 'blur(5px)' }} />

        {/* Stone fortification ring */}
        <ellipse
          cx={0} cy={0} rx={rx + 12} ry={ry + 6}
          fill="rgba(5,150,105,0.08)"
          stroke={sector.accentMedium}
          strokeWidth="2"
          strokeDasharray="3 4"
        />
        {/* Battlement nubs on ring */}
        {[0, 60, 120, 180, 240, 300].map(deg => {
          const rad = (deg * Math.PI) / 180;
          const cx2 = Math.cos(rad) * (rx + 12);
          const cy2 = Math.sin(rad) * (ry + 6);
          return <rect key={deg} x={cx2 - 3} y={cy2 - 3} width={6} height={6} rx={1} fill={sector.accentBright} opacity={0.7} />;
        })}

        {/* Cylinder body */}
        <path
          d={`M ${-rx},${0} L ${-rx},${-h} A ${rx} ${ry} 0 0 1 ${rx},${-h} L ${rx},${0} A ${rx} ${ry} 0 0 1 ${-rx},${0}`}
          fill={sector.accentDark}
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="1.5"
        />

        {/* Horizontal band lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <ellipse
            key={frac}
            cx={0} cy={-h * frac} rx={rx} ry={ry}
            fill="none"
            stroke={sector.accentBright}
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity={0.5}
          />
        ))}

        {/* Top cylinder cap */}
        <ellipse
          cx={0} cy={-h} rx={rx} ry={ry}
          fill={sector.accentBright}
          stroke="#ffffff"
          strokeWidth={isSelected ? '2.5' : '1.2'}
          style={{
            filter: (isHovered || isSelected)
              ? `drop-shadow(0 0 14px ${sector.accentBright})`
              : undefined,
          }}
        />

        {/* Database icon on cap */}
        <g transform={`translate(0,${-h})`} color={sector.accentDark}>
          <ellipse cx={0} cy={0} rx={rx * 0.6} ry={ry * 0.5} fill={sector.accentDark} opacity={0.6} />
          <text x={0} y={4} textAnchor="middle" fill={sector.accentDark} fontSize={9} fontWeight="bold" fontFamily="monospace">DB</text>
        </g>

        {/* Silo mid icon */}
        <g transform={`translate(0,${-h * 0.5})`}>
          <circle cx={0} cy={0} r={11} fill={sector.accentDark} stroke={sector.accentBright} strokeWidth="1.5" />
          <path d="M -3,3 C -3,-3 3,-5 3,-5 C 3,-5 3,3 -3,3 Z" fill={sector.accentBright} />
        </g>

        {/* Antenna spire on top */}
        <line x1={0} y1={-h} x2={0} y2={-h - 14} stroke={sector.accentBright} strokeWidth="1.5" />
        <circle cx={0} cy={-h - 15} r={3} fill="#ffffff" style={{ filter: `drop-shadow(0 0 4px ${sector.accentBright})` }} />

        {/* Label */}
        <g transform={`translate(0,${-h - 30})`}>
          <rect x={-32} y={-10} width={64} height={18} rx={4} fill="rgba(10,14,26,0.92)" stroke={isHovered ? sector.accentBright : 'rgba(100,116,139,0.4)'} strokeWidth="1" />
          <text x={0} y={3} textAnchor="middle" fill="#f8fafc" fontSize={9} fontWeight="bold" fontFamily="monospace">
            {node.name.length > 11 ? `${node.name.substring(0, 9)}..` : node.name}
          </text>
        </g>

        {/* Risk badge */}
        {isHighRisk && (
          <g transform={`translate(${rx - 2},${-h - 4})`}>
            <circle cx={0} cy={0} r={7} fill="#ef4444" stroke="#ffffff" strokeWidth="1" className="animate-bounce" />
            <text x={0} y={3} textAnchor="middle" fill="#ffffff" fontSize={9} fontWeight="bold">!</text>
          </g>
        )}
      </g>
    );
  }

  // ─── ALL OTHER DISTRICTS: isometric Fort architecture ─────────────────────────
  return (
    <g
      className="cursor-pointer"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      transform={`translate(${x},${y})${isHovered ? ' translate(0,-8)' : ''}`}
      style={{ transition: 'transform 0.18s ease-out' }}
    >
      <Fort
        island={node.island}
        color={sector.accentBright}
        colorMid={sector.accentMedium}
        colorDark={sector.accentDark}
        label={node.name}
        isSelected={isSelected}
        isHovered={isHovered}
        isHighRisk={isHighRisk}
        scale={fortScale}
      />
    </g>
  );
};

export default IsometricBuilding;

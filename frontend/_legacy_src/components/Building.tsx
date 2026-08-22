import React, { useState } from 'react';
import type { CityNode } from '../types/codecity';
import { ISLAND_SECTORS } from '../data/mockRepoData';

export interface BuildingProps {
  node: CityNode;
  isSelected?: boolean;
  onSelectNode: (node: CityNode) => void;
}

export const Building: React.FC<BuildingProps> = ({
  node,
  isSelected = false,
  onSelectNode,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const sector = ISLAND_SECTORS[node.island] || ISLAND_SECTORS.frontend;

  // Building height calculation based on Lines of Code
  const rawHeight = node.lines * 0.55;
  const height = Math.min(Math.max(rawHeight, 34), 160);

  const w = node.width || 44;
  const d = node.depth || 44;
  const x = node.gridPos.x;
  const y = node.gridPos.y;

  const isHighRisk =
    node.security.toLowerCase().includes('risk') ||
    node.security.toLowerCase().includes('warning');

  // DATABASE CITADEL SILOS (Cylindrical Geometry)
  if (node.island === 'database') {
    const rx = w * 0.45;
    const ry = rx * 0.5;

    return (
      <g
        className="cursor-pointer transition-all duration-200"
        onClick={() => onSelectNode(node)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        transform={isHovered ? 'translate(0, -6)' : 'translate(0, 0)'}
      >
        {/* Shadow */}
        <ellipse cx={x} cy={y} rx={rx + 4} ry={ry + 2} fill="rgba(0,0,0,0.5)" filter="blur(4px)" />

        {/* Cylinder Body */}
        <path
          d={`M ${x - rx},${y} L ${x - rx},${y - height} A ${rx} ${ry} 0 0 1 ${x + rx},${y - height} L ${x + rx},${y} A ${rx} ${ry} 0 0 1 ${x - rx},${y}`}
          fill="#059669"
          stroke="#064e3b"
          strokeWidth="1.5"
        />

        {/* Metal Band Lines */}
        <ellipse
          cx={x}
          cy={y - height * 0.5}
          rx={rx}
          ry={ry}
          fill="none"
          stroke="#00FF88"
          strokeWidth="1.5"
          strokeDasharray="4 2"
        />

        {/* Top Cylinder Cap */}
        <ellipse
          cx={x}
          cy={y - height}
          rx={rx}
          ry={ry}
          fill="#00FF88"
          stroke="#ffffff"
          strokeWidth={isSelected ? '2' : '1'}
          className={isHovered || isSelected ? 'drop-shadow-[0_0_12px_#00FF88]' : ''}
        />

        {/* Database Icon */}
        <g transform={`translate(${x}, ${y - height * 0.5 - 5})`}>
          <circle cx="0" cy="0" r="10" fill="#064e3b" stroke="#00FF88" strokeWidth="1" />
          <path d="M -3,3 C -3,-3 3,-5 3,-5 C 3,-5 3,3 -3,3 Z" fill="#00FF88" />
        </g>

        {/* Label */}
        <g transform={`translate(${x}, ${y - height - 18})`}>
          <rect
            x="-30"
            y="-9"
            width="60"
            height="16"
            rx="4"
            fill="rgba(15, 23, 42, 0.9)"
            stroke="#00FF88"
            strokeWidth="1"
          />
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fill="#00FF88"
            fontSize="8"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {node.name}
          </text>
        </g>
      </g>
    );
  }

  // AUTHENTICATION FORT (Medieval Castle Fortress)
  if (node.island === 'auth') {
    return (
      <g
        className="cursor-pointer transition-all duration-200"
        onClick={() => onSelectNode(node)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        transform={isHovered ? 'translate(0, -6)' : 'translate(0, 0)'}
      >
        {/* Base Shadow */}
        <rect x={x - 30} y={y - 20} width="60" height="30" rx="8" fill="rgba(0,0,0,0.5)" filter="blur(4px)" />

        {/* Castle Walls */}
        <rect
          x={x - 26}
          y={y - height}
          width="52"
          height={height}
          fill="#d97706"
          stroke="#78350f"
          strokeWidth="2"
          rx="4"
        />

        {/* Battlements Top */}
        <path
          d={`M ${x - 26},${y - height} L ${x - 26},${y - height - 8} L ${x - 18},${y - height - 8} L ${x - 18},${y - height} L ${x - 10},${y - height} L ${x - 10},${y - height - 8} L ${x - 2},${y - height - 8} L ${x - 2},${y - height} L ${x + 6},${y - height} L ${x + 6},${y - height - 8} L ${x + 14},${y - height - 8} L ${x + 14},${y - height} L ${x + 22},${y - height} L ${x + 22},${y - height - 8} L ${x + 26},${y - height - 8} L ${x + 26},${y - height}`}
          fill="#FFB800"
        />

        {/* Shield Lock Emblem */}
        <g transform={`translate(${x}, ${y - height * 0.5})`}>
          <circle cx="0" cy="0" r="12" fill="#78350f" stroke="#FFB800" strokeWidth="2" className="animate-pulse" />
          <path d="M -4,-2 L 4,-2 L 4,3 C 4,5 0,7 0,7 C 0,7 -4,5 -4,3 Z" fill="#FFB800" />
        </g>

        {/* Label */}
        <g transform={`translate(${x}, ${y - height - 20})`}>
          <rect
            x="-35"
            y="-9"
            width="70"
            height="16"
            rx="4"
            fill="rgba(15, 23, 42, 0.9)"
            stroke="#FFB800"
            strokeWidth="1"
          />
          <text
            x="0"
            y="2"
            textAnchor="middle"
            fill="#FFB800"
            fontSize="8"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {node.name}
          </text>
        </g>
      </g>
    );
  }

  // STANDARD 3D ISOMETRIC BUILDING (Top, Left, Right faces)
  const baseBottom = `${x},${y}`;
  const baseRight = `${x + w},${y - w * 0.5}`;
  const baseTop = `${x + w - d},${y - (w + d) * 0.5}`;
  const baseLeft = `${x - d},${y - d * 0.5}`;

  const topBottom = `${x},${y - height}`;
  const topRight = `${x + w},${y - w * 0.5 - height}`;
  const topTop = `${x + w - d},${y - (w + d) * 0.5 - height}`;
  const topLeft = `${x - d},${y - d * 0.5 - height}`;

  const leftFacePoints = `${baseLeft} ${baseBottom} ${topBottom} ${topLeft}`;
  const rightFacePoints = `${baseBottom} ${baseRight} ${topRight} ${topBottom}`;
  const topFacePoints = `${topBottom} ${topRight} ${topTop} ${topLeft}`;

  return (
    <g
      className="cursor-pointer transition-all duration-200"
      onClick={() => onSelectNode(node)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      transform={isHovered ? 'translate(0, -6)' : 'translate(0, 0)'}
    >
      {/* Drop Shadow */}
      <polygon
        points={`${baseBottom} ${baseRight} ${baseTop} ${baseLeft}`}
        fill="rgba(0,0,0,0.45)"
        filter="blur(4px)"
      />

      {/* Left Face - Medium Shade */}
      <polygon points={leftFacePoints} fill={sector.accentMedium} stroke="rgba(15,23,42,0.4)" strokeWidth="1" />

      {/* Left Windows */}
      {height > 40 && (
        <path
          d={`M ${x - d * 0.7},${y - d * 0.35 - height * 0.3} L ${x - d * 0.3},${y - d * 0.15 - height * 0.3} M ${x - d * 0.7},${y - d * 0.35 - height * 0.6} L ${x - d * 0.3},${y - d * 0.15 - height * 0.6}`}
          stroke="rgba(255, 255, 255, 0.3)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      )}

      {/* Right Face - Dark Shadow */}
      <polygon points={rightFacePoints} fill={sector.accentDark} stroke="rgba(15,23,42,0.6)" strokeWidth="1" />

      {/* Right Windows */}
      {height > 40 && (
        <path
          d={`M ${x + w * 0.3},${y - w * 0.15 - height * 0.3} L ${x + w * 0.7},${y - w * 0.35 - height * 0.3} M ${x + w * 0.3},${y - w * 0.15 - height * 0.6} L ${x + w * 0.7},${y - w * 0.35 - height * 0.6}`}
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />
      )}

      {/* Top Roof Face - Bright Neon */}
      <polygon
        points={topFacePoints}
        fill={sector.accentBright}
        stroke="#ffffff"
        strokeWidth={isSelected ? '2' : '1'}
        opacity={isHovered ? 1 : 0.9}
        className={isHovered || isSelected ? sector.glowClass : ''}
      />

      {/* Top Outline */}
      <polygon
        points={topFacePoints}
        fill="none"
        stroke={isSelected ? '#ffffff' : sector.accentBright}
        strokeWidth="1.5"
      />

      {/* Antenna Spire */}
      <line
        x1={x}
        y1={y - height}
        x2={x}
        y2={y - height - 12}
        stroke={isHighRisk ? '#ef4444' : sector.accentBright}
        strokeWidth="2"
      />
      <circle
        cx={x}
        cy={y - height - 13}
        r="3"
        fill={isHighRisk ? '#ef4444' : '#ffffff'}
        className={isHighRisk ? 'animate-ping' : ''}
      />

      {/* High Risk Alert Badge */}
      {isHighRisk && (
        <g transform={`translate(${x + 12}, ${y - height - 18})`}>
          <circle cx="0" cy="0" r="7" fill="#ef4444" stroke="#ffffff" strokeWidth="1" className="animate-bounce" />
          <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
            !
          </text>
        </g>
      )}

      {/* Label Badge */}
      <g transform={`translate(${x}, ${y - height - 26})`}>
        <rect
          x="-34"
          y="-10"
          width="68"
          height="18"
          rx="4"
          fill="rgba(15, 23, 42, 0.9)"
          stroke={isHovered ? sector.accentBright : 'rgba(100, 116, 139, 0.4)'}
          strokeWidth="1"
        />
        <text
          x="0"
          y="2"
          textAnchor="middle"
          fill="#f8fafc"
          fontSize="9"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {node.name.length > 11 ? `${node.name.substring(0, 9)}..` : node.name}
        </text>
      </g>
    </g>
  );
};

export default Building;

import React from 'react';
import { motion } from 'framer-motion';
import type { IslandSector, CityNode } from '../types/codecity';
import { Building } from './Building';

export interface DistrictProps {
  sector: IslandSector;
  nodes: CityNode[];
  selectedNode: CityNode | null;
  onSelectNode: (node: CityNode) => void;
  onDistrictClick?: (sectorId: string) => void;
}

export const District: React.FC<DistrictProps> = ({
  sector,
  nodes,
  selectedNode,
  onSelectNode,
  onDistrictClick,
}) => {
  const origin = sector.gridOrigin;
  const size = sector.size;

  const districtNodes = nodes.filter((n) => n.island === sector.id);

  return (
    <motion.g
      key={sector.id}
      className="district-zone-group cursor-pointer"
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={() => onDistrictClick && onDistrictClick(sector.id)}
    >
      {/* Outer Ground Base with Colored Neon Border */}
      <rect
        x={origin.x - size.width / 2}
        y={origin.y - size.height / 2}
        width={size.width}
        height={size.height}
        rx="28"
        fill="rgba(15, 23, 42, 0.95)"
        stroke={sector.accentBright}
        strokeWidth="2.5"
        filter="drop-shadow(0 12px 25px rgba(0,0,0,0.5))"
        className="transition-all duration-300"
      />

      {/* Grid Pattern Inner Overlay */}
      <rect
        x={origin.x - size.width / 2 + 12}
        y={origin.y - size.height / 2 + 12}
        width={size.width - 24}
        height={size.height - 24}
        rx="18"
        fill="rgba(30, 41, 59, 0.45)"
        stroke={sector.accentMedium}
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      {/* District Header Badge */}
      <g transform={`translate(${origin.x}, ${origin.y - size.height / 2 + 18})`}>
        <rect
          x="-90"
          y="-12"
          width="180"
          height="24"
          rx="6"
          fill="rgba(10, 14, 26, 0.95)"
          stroke={sector.accentBright}
          strokeWidth="1.5"
        />
        <text
          x="0"
          y="4"
          textAnchor="middle"
          fill={sector.accentBright}
          fontSize="10"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {sector.title} ({districtNodes.length})
        </text>
      </g>

      {/* District Buildings */}
      {districtNodes.map((node) => (
        <Building
          key={node.id}
          node={node}
          isSelected={selectedNode?.id === node.id}
          onSelectNode={onSelectNode}
        />
      ))}
    </motion.g>
  );
};

export default District;

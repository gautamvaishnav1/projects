import React from 'react';

interface UndergroundPipelinesProps {
  visible: boolean;
}

export const UndergroundPipelines: React.FC<UndergroundPipelinesProps> = ({ visible }) => {
  if (!visible) return null;

  return (
    <g className="underground-pipelines-layer opacity-90 transition-opacity duration-300">
      {/* Subterranean bedrock layer outline */}
      <rect
        x="80"
        y="650"
        width="840"
        height="120"
        rx="16"
        fill="rgba(15, 23, 42, 0.95)"
        stroke="rgba(6, 182, 212, 0.4)"
        strokeWidth="1.5"
      />

      <text x="100" y="670" fill="#06b6d4" fontSize="11" fontWeight="bold" fontFamily="monospace">
        SUBTERRANEAN DATA PIPELINES & CACHE LAYER
      </text>

      {/* Main Conduits / Pipes */}
      {/* Pipe 1: Data Pipeline (Cyan) */}
      <path
        d="M 120,710 L 320,710 L 320,730 L 520,730"
        fill="none"
        stroke="#0891b2"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M 120,710 L 320,710 L 320,730 L 520,730"
        fill="none"
        stroke="#22d3ee"
        strokeWidth="4"
        strokeDasharray="8 8"
        strokeLinecap="round"
      >
        <animate attributeName="stroke-dashoffset" from="32" to="0" dur="1.5s" repeatCount="indefinite" />
      </path>

      {/* Pipe 2: Cache Layer (Amber) */}
      <path
        d="M 300,740 L 500,740 L 550,700 L 720,700"
        fill="none"
        stroke="#d97706"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d="M 300,740 L 500,740 L 550,700 L 720,700"
        fill="none"
        stroke="#fbbf24"
        strokeWidth="3"
        strokeDasharray="6 6"
      >
        <animate attributeName="stroke-dashoffset" from="0" to="24" dur="1s" repeatCount="indefinite" />
      </path>

      {/* Pipe 3: Event Queue (Purple) */}
      <path
        d="M 520,710 L 720,710 L 860,710"
        fill="none"
        stroke="#7e22ce"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M 520,710 L 720,710 L 860,710"
        fill="none"
        stroke="#c084fc"
        strokeWidth="4"
        strokeDasharray="10 10"
      >
        <animate attributeName="stroke-dashoffset" from="40" to="0" dur="2s" repeatCount="indefinite" />
      </path>

      {/* Pipe Badges */}
      <g transform="translate(160, 695)">
        <rect x="0" y="0" width="100" height="20" rx="4" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
        <text x="50" y="14" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold" fontFamily="monospace">
          DATA PIPELINE
        </text>
      </g>

      <g transform="translate(360, 725)">
        <rect x="0" y="0" width="90" height="20" rx="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="1" />
        <text x="45" y="14" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="bold" fontFamily="monospace">
          CACHE LAYER
        </text>
      </g>

      <g transform="translate(580, 695)">
        <rect x="0" y="0" width="90" height="20" rx="4" fill="#0f172a" stroke="#a855f7" strokeWidth="1" />
        <text x="45" y="14" textAnchor="middle" fill="#c084fc" fontSize="9" fontWeight="bold" fontFamily="monospace">
          EVENT QUEUE
        </text>
      </g>

      <g transform="translate(740, 725)">
        <rect x="0" y="0" width="100" height="20" rx="4" fill="#0f172a" stroke="#10b981" strokeWidth="1" />
        <text x="50" y="14" textAnchor="middle" fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace">
          NETWORK LAYER
        </text>
      </g>
    </g>
  );
};

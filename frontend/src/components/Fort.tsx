/**
 * Fort.tsx — Reusable isometric fortress/citadel SVG component.
 *
 * Architecture:
 *   - All 8 district types reuse this one component
 *   - Geometry: left face + right face + top face = 3D depth
 *   - Two flanking towers with conical/pyramidal roofs
 *   - Central main keep with battlements
 *   - A gate arch at the base
 *   - Neon accent colour from the district sector
 *   - Floating Lucide icon above the keep
 *   - Hover lift animation (controlled by parent)
 *   - All coordinates are relative — parent positions via SVG <g transform>
 */

import React from 'react';
import type { NodeType } from '../types/codecity';

// ─── Per-district icon paths (hand-drawn SVG mini-icons, no import needed) ────
// We encode a tiny 20×20 icon path for each node type so we stay dependency-light
// while still showing symbolic meaning inside the fort.

function getIconPath(island: NodeType): React.ReactNode {
  switch (island) {
    case 'frontend':
      // Atom-style orbital rings
      return (
        <g>
          <circle cx="0" cy="0" r="3" fill="currentColor" />
          <ellipse cx="0" cy="0" rx="9" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="0" cy="0" rx="9" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(60)" />
          <ellipse cx="0" cy="0" rx="9" ry="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-60)" />
        </g>
      );
    case 'backend':
      // Server rack stripes
      return (
        <g>
          <rect x="-8" y="-8" width="16" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="-8" y1="-2" x2="8" y2="-2" stroke="currentColor" strokeWidth="1" />
          <line x1="-8" y1="3" x2="8" y2="3" stroke="currentColor" strokeWidth="1" />
          <circle cx="5" cy="-5" r="1.5" fill="currentColor" />
          <circle cx="5" cy="0.5" r="1.5" fill="currentColor" />
        </g>
      );
    case 'database':
      // Cylinder silo stack
      return (
        <g>
          <ellipse cx="0" cy="-6" rx="7" ry="3" fill="currentColor" opacity="0.8" />
          <rect x="-7" y="-6" width="14" height="8" fill="currentColor" opacity="0.5" />
          <ellipse cx="0" cy="2" rx="7" ry="3" fill="currentColor" />
          <line x1="-7" y1="-3" x2="-7" y2="2" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
          <line x1="7" y1="-3" x2="7" y2="2" stroke="currentColor" strokeWidth="0.5" opacity="0.6" />
        </g>
      );
    case 'auth':
      // Shield + lock
      return (
        <g>
          <path d="M 0,-9 L 8,-5 L 8,2 C 8,7 0,10 0,10 C 0,10 -8,7 -8,2 L -8,-5 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="-3" y="-1" width="6" height="5" rx="1" fill="currentColor" />
          <path d="M -2,-1 A 2 2 0 0 1 2,-1" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </g>
      );
    case 'infra':
      // Container stack
      return (
        <g>
          <rect x="-8" y="-9" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="-8" y="-1" width="16" height="6" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <rect x="-8" y="7" width="16" height="4" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="5" cy="-6" r="1.5" fill="currentColor" />
          <circle cx="5" cy="2" r="1.5" fill="currentColor" />
        </g>
      );
    case 'service':
      // Radar pulse
      return (
        <g>
          <circle cx="0" cy="0" r="8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          <circle cx="0" cy="0" r="5" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.6" />
          <circle cx="0" cy="0" r="2" fill="currentColor" />
          <line x1="0" y1="0" x2="7" y2="-4" stroke="currentColor" strokeWidth="1.5" />
        </g>
      );
    case 'external':
      // Globe / cloud
      return (
        <g>
          <circle cx="0" cy="0" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <ellipse cx="0" cy="0" rx="4" ry="8" fill="none" stroke="currentColor" strokeWidth="1" />
          <line x1="-8" y1="0" x2="8" y2="0" stroke="currentColor" strokeWidth="1" />
          <line x1="-6" y1="-4" x2="6" y2="-4" stroke="currentColor" strokeWidth="0.8" />
          <line x1="-6" y1="4" x2="6" y2="4" stroke="currentColor" strokeWidth="0.8" />
        </g>
      );
    case 'depot':
      // Folder / archive
      return (
        <g>
          <path d="M -8,-2 L -8,7 L 8,7 L 8,-4 L 1,-4 L -1,-7 L -8,-7 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <line x1="-5" y1="1" x2="5" y2="1" stroke="currentColor" strokeWidth="1" />
          <line x1="-5" y1="4" x2="5" y2="4" stroke="currentColor" strokeWidth="1" />
        </g>
      );
    default:
      return <circle cx="0" cy="0" r="6" fill="currentColor" />;
  }
}

// ─── Fort geometry helper ───────────────────────────────────────────────────────
// Isometric projection for a box at origin:
//   frontLeft  = ( 0, 0 ) baseline
//   frontRight = ( W, 0 ) baseline (in isometric X = W/2 right + W*iso_dy down)
// We use a simplified cabinet projection so it still works at any rotation.

export interface FortProps {
  island: NodeType;
  color: string;       // accent bright
  colorMid: string;    // accent medium
  colorDark: string;   // accent dark
  label: string;
  isSelected?: boolean;
  isHovered?: boolean;
  isHighRisk?: boolean;
  /** Size multiplier — keep near 1.0 for standard buildings */
  scale?: number;
}

const Fort: React.FC<FortProps> = ({
  island,
  color,
  colorMid,
  colorDark,
  label,
  isSelected = false,
  isHovered = false,
  isHighRisk = false,
  scale = 1,
}) => {
  const S = scale;

  // ─── Shared geometry constants ───────────────────────────────────────────────
  // Keep width: 56, depth: 44, height varies by type
  const W = 56 * S;          // half-width (footprint left → right)
  const D = 44 * S;          // depth (footprint front → back)
  const keepH = 52 * S;      // central keep height
  const wallH = 28 * S;      // outer wall height
  const towerW = 14 * S;     // tower width
  const towerH = 60 * S;     // tower height (taller than keep)
  const battleH = 8 * S;     // battlement notch height
  const gateW = 14 * S;      // gate arch width
  const gateH = 18 * S;      // gate arch height

  // Isometric offsets — these make the building look 3D with left + right faces
  const isoRX = W * 0.5;     // isometric x-shift for right face (half footprint)
  const isoRY = W * 0.28;    // isometric y-shift for right face
  const isoLX = -D * 0.5;   // isometric x-shift for left face
  const isoLY = D * 0.28;    // isometric y-shift for left face

  // Base corners (at y = 0 = ground level, centre at 0,0)
  const bl = { x: isoLX, y: isoLY };           // base-left
  const br = { x: isoRX, y: isoRY };            // base-right
  const bb = { x: 0, y: (isoLY + isoRY) };     // base-bottom (front centre)
  const bt = { x: isoLX + isoRX, y: (isoLY + isoRY) - (isoLY + isoRY) }; // base-top (back centre)

  // Top of outer wall (y offset = -wallH)
  const wl = { x: bl.x, y: bl.y - wallH };
  const wr = { x: br.x, y: br.y - wallH };
  const wb = { x: 0, y: bb.y - wallH };
  const wt = { x: bt.x, y: bt.y - wallH };

  // Helper: polygon point string
  const pts = (arr: {x: number; y: number}[]) => arr.map(p => `${p.x},${p.y}`).join(' ');

  // ─── Battlements (top of wall) ───────────────────────────────────────────────
  const buildBattlements = (startX: number, startY: number, endX: number, endY: number, count = 4) => {
    const segments: React.ReactNode[] = [];
    for (let i = 0; i < count; i++) {
      const t0 = i / count;
      const t1 = (i + 0.4) / count;
      const x0 = startX + (endX - startX) * t0;
      const y0 = startY + (endY - startY) * t0;
      const x1 = startX + (endX - startX) * t1;
      const y1 = startY + (endY - startY) * t1;
      segments.push(
        <polygon
          key={i}
          points={`${x0},${y0} ${x0},${y0 - battleH} ${x1},${y1 - battleH} ${x1},${y1}`}
          fill={color}
          opacity={0.9}
        />
      );
    }
    return segments;
  };

  // ─── Glowing selection ring ───────────────────────────────────────────────────
  const selectionRing = (isSelected || isHovered) && (
    <ellipse
      cx={0}
      cy={bb.y - 4}
      rx={W * 0.9}
      ry={8 * S}
      fill="none"
      stroke={color}
      strokeWidth={isSelected ? 2.5 : 1.5}
      opacity={isSelected ? 0.9 : 0.5}
      style={{ filter: `drop-shadow(0 0 8px ${color})` }}
    />
  );

  // ─── Ground shadow ────────────────────────────────────────────────────────────
  const groundShadow = (
    <ellipse cx={0} cy={bb.y + 4} rx={W * 0.95} ry={10 * S} fill="rgba(0,0,0,0.55)" style={{ filter: 'blur(5px)' }} />
  );

  // ── OUTER WALL: left face ─────────────────────────────────────────────────────
  const outerWallLeft = (
    <polygon
      points={pts([bl, { x: 0, y: bb.y }, wb, wl])}
      fill={colorDark}
      stroke="rgba(0,0,0,0.5)"
      strokeWidth="1"
    />
  );

  // ── OUTER WALL: right face ────────────────────────────────────────────────────
  const outerWallRight = (
    <polygon
      points={pts([{ x: 0, y: bb.y }, br, wr, wb])}
      fill={colorMid}
      stroke="rgba(0,0,0,0.4)"
      strokeWidth="1"
    />
  );

  // ── OUTER WALL: top face ──────────────────────────────────────────────────────
  const outerWallTop = (
    <polygon
      points={pts([wb, wr, wt, wl])}
      fill={color}
      opacity={0.6}
      stroke={color}
      strokeWidth="1"
    />
  );

  // ─── CENTRAL KEEP ─────────────────────────────────────────────────────────────
  const kW = W * 0.55;   // keep half-width
  const kD = D * 0.55;   // keep depth
  const kY = wb.y;       // keep base = top of outer wall

  const kbl = { x: -kD * 0.5, y: kY + kD * 0.28 };
  const kbr = { x: kW * 0.5, y: kY + kW * 0.28 };
  const kbb = { x: 0, y: kY + kD * 0.28 + kW * 0.28 };
  const kbt = { x: kW * 0.5 - kD * 0.5, y: kY };

  const ktl = { x: kbl.x, y: kbl.y - keepH };
  const ktr = { x: kbr.x, y: kbr.y - keepH };
  const ktb = { x: kbb.x, y: kbb.y - keepH };
  const ktt = { x: kbt.x, y: kbt.y - keepH };

  const keepLeft = (
    <polygon points={pts([kbl, kbb, ktb, ktl])} fill={colorDark} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
  );
  const keepRight = (
    <polygon points={pts([kbb, kbr, ktr, ktb])} fill={colorMid} stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
  );
  const keepTop = (
    <polygon
      points={pts([ktb, ktr, ktt, ktl])}
      fill={color}
      stroke="#ffffff"
      strokeWidth={isSelected ? 2 : 1}
      opacity={isHovered ? 1 : 0.85}
      style={{ filter: (isHovered || isSelected) ? `drop-shadow(0 0 12px ${color})` : undefined }}
    />
  );

  // Keep battlements along the top-front edge
  const keepBattlements = buildBattlements(ktb.x - kD * 0.5, ktb.y, ktb.x + kW * 0.5, ktb.y, 3);

  // ─── LEFT TOWER ───────────────────────────────────────────────────────────────
  const ltX = bl.x + towerW * 0.2;   // left tower centre X
  const ltY = wl.y - 2;              // left tower base Y = top of outer wall

  const leftTowerBase = (
    <g>
      {/* Tower body left */}
      <polygon
        points={`${ltX - towerW},${ltY + towerW * 0.25} ${ltX},${ltY + towerW * 0.5} ${ltX},${ltY + towerW * 0.5 - towerH} ${ltX - towerW},${ltY + towerW * 0.25 - towerH}`}
        fill={colorDark}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="1"
      />
      {/* Tower body right */}
      <polygon
        points={`${ltX},${ltY + towerW * 0.5} ${ltX + towerW},${ltY + towerW * 0.25} ${ltX + towerW},${ltY + towerW * 0.25 - towerH} ${ltX},${ltY + towerW * 0.5 - towerH}`}
        fill={colorMid}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
      {/* Tower roof (cone top) */}
      <polygon
        points={`${ltX},${ltY - towerH + towerW * 0.25 - 2 * S} ${ltX - towerW},${ltY - towerH + towerW * 0.25} ${ltX + towerW},${ltY - towerH + towerW * 0.25}`}
        fill={color}
        stroke={color}
        strokeWidth="1"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      {/* Tower beacon light */}
      <circle
        cx={ltX}
        cy={ltY - towerH + towerW * 0.25 - 6 * S}
        r={3 * S}
        fill={isHighRisk ? '#ef4444' : '#ffffff'}
        style={{ filter: `drop-shadow(0 0 4px ${isHighRisk ? '#ef4444' : color})` }}
        className={isHighRisk ? 'animate-ping' : ''}
      />
    </g>
  );

  // ─── RIGHT TOWER ──────────────────────────────────────────────────────────────
  const rtX = br.x - towerW * 0.2;
  const rtY = wr.y - 2;

  const rightTowerBase = (
    <g>
      <polygon
        points={`${rtX - towerW},${rtY + towerW * 0.25} ${rtX},${rtY + towerW * 0.5} ${rtX},${rtY + towerW * 0.5 - towerH} ${rtX - towerW},${rtY + towerW * 0.25 - towerH}`}
        fill={colorDark}
        stroke="rgba(0,0,0,0.4)"
        strokeWidth="1"
      />
      <polygon
        points={`${rtX},${rtY + towerW * 0.5} ${rtX + towerW},${rtY + towerW * 0.25} ${rtX + towerW},${rtY + towerW * 0.25 - towerH} ${rtX},${rtY + towerW * 0.5 - towerH}`}
        fill={colorMid}
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="1"
      />
      <polygon
        points={`${rtX},${rtY - towerH + towerW * 0.25 - 2 * S} ${rtX - towerW},${rtY - towerH + towerW * 0.25} ${rtX + towerW},${rtY - towerH + towerW * 0.25}`}
        fill={color}
        stroke={color}
        strokeWidth="1"
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <circle
        cx={rtX}
        cy={rtY - towerH + towerW * 0.25 - 6 * S}
        r={3 * S}
        fill={isHighRisk ? '#ef4444' : '#ffffff'}
        style={{ filter: `drop-shadow(0 0 4px ${isHighRisk ? '#ef4444' : color})` }}
      />
    </g>
  );

  // ─── GATE ARCH (bottom front wall) ───────────────────────────────────────────
  const gateY = bb.y;  // gate sits at ground level
  const gate = (
    <g>
      {/* Gate frame */}
      <path
        d={`M ${-gateW / 2},${gateY} L ${-gateW / 2},${gateY - gateH * 0.5} A ${gateW / 2} ${gateH * 0.5} 0 0 1 ${gateW / 2},${gateY - gateH * 0.5} L ${gateW / 2},${gateY}`}
        fill="#0a0e1a"
        stroke={color}
        strokeWidth="1.5"
      />
      {/* Gate keystone */}
      <polygon
        points={`0,${gateY - gateH * 0.55} ${-4 * S},${gateY - gateH * 0.4} ${4 * S},${gateY - gateH * 0.4}`}
        fill={color}
        opacity={0.8}
      />
    </g>
  );

  // ─── BATTLEMENTS on outer wall top ───────────────────────────────────────────
  // Front-facing (left face top edge) + right face top edge
  const outerBattleLeft  = buildBattlements(bl.x, wl.y, 0, wb.y, 3);
  const outerBattleRight = buildBattlements(0, wb.y, br.x, wr.y, 3);

  // ─── DISTRICT ICON (floating above keep) ─────────────────────────────────────
  const iconY = ktb.y - keepH - 26 * S;
  const districtIcon = (
    <g transform={`translate(0, ${iconY})`} color={color}>
      {/* Icon halo */}
      <circle cx="0" cy="0" r={16 * S} fill="rgba(10,14,26,0.85)" stroke={color} strokeWidth="1.5" />
      <g transform={`scale(${S})`} color={color}>
        {getIconPath(island)}
      </g>
    </g>
  );

  // ─── LABEL ───────────────────────────────────────────────────────────────────
  const labelY = iconY - 22 * S;
  const truncLabel = label.length > 12 ? `${label.substring(0, 10)}..` : label;
  const districtLabel = (
    <g transform={`translate(0, ${labelY})`}>
      <rect
        x={-38 * S}
        y={-10 * S}
        width={76 * S}
        height={18 * S}
        rx={4 * S}
        fill="rgba(10,14,26,0.92)"
        stroke={isHovered ? color : 'rgba(100,116,139,0.4)'}
        strokeWidth="1"
      />
      <text
        x="0"
        y={3 * S}
        textAnchor="middle"
        fill="#f8fafc"
        fontSize={9 * S}
        fontWeight="bold"
        fontFamily="monospace"
      >
        {truncLabel}
      </text>
    </g>
  );

  // ─── HIGH RISK ALERT ─────────────────────────────────────────────────────────
  const riskBadge = isHighRisk && (
    <g transform={`translate(${kbr.x + 8}, ${ktb.y - keepH - 14})`}>
      <circle cx="0" cy="0" r={7 * S} fill="#ef4444" stroke="#ffffff" strokeWidth="1" className="animate-bounce" />
      <text x="0" y={3 * S} textAnchor="middle" fill="#ffffff" fontSize={9 * S} fontWeight="bold">!</text>
    </g>
  );

  // ─── WALL WINDOW DETAILS ──────────────────────────────────────────────────────
  const wallWindows = (
    <g>
      {/* Left face windows */}
      <rect x={kbl.x - 4} y={kbb.y - keepH * 0.35} width={5 * S} height={7 * S} rx={1} fill={color} opacity={0.5} />
      <rect x={kbl.x - 4} y={kbb.y - keepH * 0.65} width={5 * S} height={7 * S} rx={1} fill={color} opacity={0.4} />
      {/* Right face windows */}
      <rect x={kbr.x - 2} y={kbb.y - keepH * 0.35} width={5 * S} height={7 * S} rx={1} fill={color} opacity={0.4} />
    </g>
  );

  // ─── Render order: back → front (painter's algorithm) ────────────────────────
  return (
    <g>
      {groundShadow}
      {selectionRing}

      {/* Outer wall (back faces first) */}
      {outerWallTop}
      {outerWallLeft}
      {outerWallRight}

      {/* Outer wall battlements */}
      {outerBattleLeft}
      {outerBattleRight}

      {/* Towers (behind keep) */}
      {leftTowerBase}
      {rightTowerBase}

      {/* Central keep */}
      {keepLeft}
      {keepRight}
      {keepTop}
      {keepBattlements}

      {/* Wall windows */}
      {wallWindows}

      {/* Gate */}
      {gate}

      {/* Icon + label */}
      {districtIcon}
      {districtLabel}

      {/* Risk badge */}
      {riskBadge}
    </g>
  );
};

export default Fort;

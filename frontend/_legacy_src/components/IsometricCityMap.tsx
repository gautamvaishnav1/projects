import React, { useState, useRef } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Compass
} from 'lucide-react';
import type { CityNode, CityEdge, MapViewTransform, FilterState } from '../types/codecity';
import { ISLAND_SECTORS } from '../data/mockRepoData';
import { IsometricBuilding } from './IsometricBuilding';
import { UndergroundPipelines } from './UndergroundPipelines';

interface IsometricCityMapProps {
  nodes: CityNode[];
  edges: CityEdge[];
  selectedNode: CityNode | null;
  onSelectNode: (node: CityNode) => void;
  transform: MapViewTransform;
  onTransformChange: (updater: (prev: MapViewTransform) => MapViewTransform) => void;
  filters: FilterState;
}

export const IsometricCityMap: React.FC<IsometricCityMapProps> = ({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  transform,
  onTransformChange,
  filters
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Filter nodes
  const filteredNodes = nodes.filter(node => {
    if (filters.selectedSector !== 'all' && node.island !== filters.selectedSector) return false;
    if (filters.securityFilter === 'clean' && (node.security.toLowerCase().includes('risk') || node.security.toLowerCase().includes('warning'))) return false;
    if (filters.securityFilter === 'risks' && node.security === 'Clean') return false;
    if (filters.searchQuery && !node.name.toLowerCase().includes(filters.searchQuery.toLowerCase()) && !node.path.toLowerCase().includes(filters.searchQuery.toLowerCase())) return false;
    return true;
  });

  // Pan Drag Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.panX, y: e.clientY - transform.panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    onTransformChange(prev => ({
      ...prev,
      panX: e.clientX - dragStart.x,
      panY: e.clientY - dragStart.y
    }));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleZoomIn = () => onTransformChange(prev => ({ ...prev, zoom: Math.min(prev.zoom + 0.15, 2.2) }));
  const handleZoomOut = () => onTransformChange(prev => ({ ...prev, zoom: Math.max(prev.zoom - 0.15, 0.4) }));
  const handleReset = () => onTransformChange(prev => ({
    ...prev,
    zoom: 1,
    rotateX: 60,
    rotateZ: -45,
    panX: 0,
    panY: 0,
    isTopDown: false
  }));

  // Helper for Edge curved paths
  const getEdgePath = (edge: CityEdge) => {
    const fromNode = nodes.find(n => n.id === edge.from);
    const toNode = nodes.find(n => n.id === edge.to);

    if (!fromNode || !toNode) return null;

    const x1 = fromNode.gridPos.x;
    const y1 = fromNode.gridPos.y - 20;
    const x2 = toNode.gridPos.x;
    const y2 = toNode.gridPos.y - 20;

    const cx = (x1 + x2) / 2;
    const cy = (y1 + y2) / 2 - 35;

    return {
      path: `M ${x1},${y1} Q ${cx},${cy} ${x2},${y2}`,
      midX: cx,
      midY: cy,
      label: edge.label
    };
  };

  const transformStyle = transform.isTopDown
    ? {
        transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
        transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }
    : {
        transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom}) rotateX(${transform.rotateX}deg) rotateZ(${transform.rotateZ}deg)`,
        transformStyle: 'preserve-3d' as const,
        transition: isDragging ? 'none' : 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      };

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 w-full h-full bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing select-none cyber-grid"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Floating Canvas Camera Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 glass-panel p-2 rounded-xl border border-slate-800 shadow-2xl">
        <button onClick={handleZoomIn} className="p-2 bg-slate-900/90 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg transition border border-slate-800" title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={handleZoomOut} className="p-2 bg-slate-900/90 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-400 rounded-lg transition border border-slate-800" title="Zoom Out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={handleReset} className="p-2 bg-slate-900/90 hover:bg-purple-500/20 text-slate-300 hover:text-purple-400 rounded-lg transition border border-slate-800" title="Reset Camera">
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-800 my-0.5" />
        <button onClick={() => onTransformChange(prev => ({ ...prev, rotateZ: prev.rotateZ - 15 }))} className="p-2 bg-slate-900/90 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-400 rounded-lg transition border border-slate-800" title="Rotate Map Left">
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Main 2.5D Isometric SVG Container */}
      <div className="w-full h-full flex items-center justify-center pointer-events-auto">
        <div style={transformStyle} className="isometric-container origin-center">
          <svg width="1080" height="840" viewBox="0 0 1080 840" className="overflow-visible">
            <defs>
              <filter id="neonGlowCyan" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="neonGlowPurple" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {/* Ocean gradient — deep cyberpunk blue */}
              <radialGradient id="oceanGrad" cx="50%" cy="50%" r="55%">
                <stop offset="0%"  stopColor="#0c2d4e" />
                <stop offset="60%" stopColor="#071a30" />
                <stop offset="100%" stopColor="#030e1c" />
              </radialGradient>
              <pattern id="wavePattern" x="0" y="0" width="48" height="20" patternUnits="userSpaceOnUse">
                <path d="M 0,10 Q 12,4 24,10 Q 36,16 48,10" fill="none" stroke="rgba(6,182,212,0.12)" strokeWidth="1.2" />
              </pattern>
            </defs>

            {/* 1. Ocean water — gradient + wave pattern */}
            <rect x="30" y="30" width="1020" height="780" rx="40" fill="url(#oceanGrad)" stroke="rgba(6,182,212,0.35)" strokeWidth="3" />
            <rect x="30" y="30" width="1020" height="780" rx="40" fill="url(#wavePattern)" opacity={0.7} />
            {/* Subtle ocean grid dots */}
            <rect x="30" y="30" width="1020" height="780" rx="40" fill="none" stroke="rgba(6,182,212,0.06)" strokeWidth="1" strokeDasharray="2 18" />

            {/* Ocean Cargo Boat (kept) */}
            <g transform="translate(180, 720)">
              <path d="M 0,0 L 40,-5 L 50,5 L -10,5 Z" fill="#1e3a5f" stroke="#06b6d4" strokeWidth="1" />
              <rect x="15" y="-12" width="18" height="10" fill="#0c4a8a" />
              <circle cx="20" cy="-7" r="2" fill="#38bdf8" />
              <line x1="20" y1="-12" x2="20" y2="-22" stroke="#06b6d4" strokeWidth="1" />
              <polygon points="20,-22 28,-18 20,-16" fill="#06b6d4" opacity={0.7} />
            </g>
            {/* Second boat */}
            <g transform="translate(820, 680)">
              <path d="M 0,0 L 36,-4 L 44,4 L -8,4 Z" fill="#1e3a5f" stroke="#a855f7" strokeWidth="1" />
              <rect x="12" y="-10" width="14" height="8" fill="#4c1d95" />
              <circle cx="16" cy="-6" r="1.5" fill="#c084fc" />
            </g>

            {/* 2. ISLAND DISTRICTS — Fortress Terrain Islands */}
            {Object.entries(ISLAND_SECTORS).map(([key, sector]) => {
              const origin = sector.gridOrigin;
              const size   = sector.size;
              const ox = origin.x;
              const oy = origin.y;
              const hw = size.width  / 2;
              const hh = size.height / 2;
              const edgeDepth = 14; // stone-edge depth for raised island effect

              return (
                <g key={key} className="sector-island-group">
                  {/* ── Island raised stone edge (south + east face) ── */}
                  {/* South face */}
                  <polygon
                    points={`${ox - hw + 14},${oy + hh}  ${ox + hw - 14},${oy + hh}  ${ox + hw - 14},${oy + hh + edgeDepth}  ${ox - hw + 14},${oy + hh + edgeDepth}`}
                    fill="rgba(15,23,42,0.97)"
                    stroke={sector.accentDark}
                    strokeWidth="1"
                  />
                  {/* East face */}
                  <polygon
                    points={`${ox + hw - 14},${oy - hh + 20}  ${ox + hw},${oy - hh + 20}  ${ox + hw},${oy + hh}  ${ox + hw - 14},${oy + hh}`}
                    fill="rgba(20,20,35,0.97)"
                    stroke={sector.accentDark}
                    strokeWidth="1"
                  />

                  {/* ── Outer island terrain (green raised platform) ── */}
                  <rect
                    x={ox - hw}
                    y={oy - hh}
                    width={size.width}
                    height={size.height}
                    rx="22"
                    fill={`rgba(${sector.id === 'frontend' ? '6,70,50' : sector.id === 'backend' ? '45,25,70' : sector.id === 'database' ? '5,60,40' : sector.id === 'auth' ? '60,40,5' : sector.id === 'infra' ? '5,30,80' : sector.id === 'service' ? '5,50,70' : sector.id === 'external' ? '50,20,30' : '50,40,5'},0.85)`}
                    stroke={sector.accentBright}
                    strokeWidth="2.5"
                    style={{ filter: `drop-shadow(0 0 18px ${sector.accentBright}55) drop-shadow(0 12px 30px rgba(0,0,0,0.7))` }}
                  />

                  {/* ── Inner terrain (grass / circuit floor) ── */}
                  <rect
                    x={ox - hw + 10}
                    y={oy - hh + 10}
                    width={size.width - 20}
                    height={size.height - 20}
                    rx="16"
                    fill={`rgba(${sector.id === 'frontend' ? '8,90,65' : sector.id === 'backend' ? '60,30,90' : sector.id === 'database' ? '6,80,52' : sector.id === 'auth' ? '80,55,8' : sector.id === 'infra' ? '8,40,100' : sector.id === 'service' ? '6,65,88' : sector.id === 'external' ? '65,25,38' : '65,52,8'},0.25)`}
                    stroke={sector.accentMedium}
                    strokeWidth="1"
                    strokeDasharray="5 4"
                  />

                  {/* ── Stone wall perimeter (fortress look) ── */}
                  <rect
                    x={ox - hw + 4}
                    y={oy - hh + 4}
                    width={size.width - 8}
                    height={size.height - 8}
                    rx="20"
                    fill="none"
                    stroke={sector.accentMedium}
                    strokeWidth="1.5"
                    strokeDasharray="8 3"
                    opacity={0.45}
                  />

                  {/* ── Corner fortress towers ── */}
                  {[
                    [ox - hw + 18, oy - hh + 18],
                    [ox + hw - 18, oy - hh + 18],
                    [ox - hw + 18, oy + hh - 18],
                    [ox + hw - 18, oy + hh - 18],
                  ].map(([cx2, cy2], idx) => (
                    <g key={idx} transform={`translate(${cx2},${cy2})`}>
                      <rect x={-7} y={-7} width={14} height={14} rx={3}
                        fill="rgba(10,14,26,0.9)" stroke={sector.accentBright} strokeWidth="1.5" />
                      <polygon points={`0,-10 -4,-4 4,-4`} fill={sector.accentBright} opacity={0.75} />
                    </g>
                  ))}

                  {/* ── Pine trees scattered around island ── */}
                  {[
                    [ox - hw + 24, oy - hh + 36],
                    [ox - hw + 38, oy + hh - 28],
                    [ox + hw - 26, oy - hh + 34],
                    [ox + hw - 40, oy + hh - 30],
                    [ox, oy + hh - 24],
                  ].map(([tx, ty], idx) => (
                    <g key={idx} transform={`translate(${tx},${ty})`}>
                      <polygon points="0,-13 -6,0 6,0" fill="#059669" opacity={0.9} />
                      <polygon points="0,-8 -4,2 4,2"  fill="#047857" opacity={0.8} />
                      <rect x={-2} y={0} width={4} height={5} fill="#064e3b" />
                    </g>
                  ))}

                  {/* ── District header badge ── */}
                  <g transform={`translate(${ox}, ${oy - hh + 20})`}>
                    <rect
                      x="-90" y="-13" width="180" height="26"
                      rx="6"
                      fill="rgba(10,14,26,0.96)"
                      stroke={sector.accentBright}
                      strokeWidth="1.5"
                      style={{ filter: `drop-shadow(0 0 6px ${sector.accentBright}80)` }}
                    />
                    <text
                      x="0" y="4"
                      textAnchor="middle"
                      fill={sector.accentBright}
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {sector.title}
                    </text>
                  </g>
                </g>
              );
            })}

            {/* 3. ADDITIONAL SPECIAL PICTURE SECTORS */}
            {/* Sector A: External Services Mountain & Highway Tunnel (Top Left) */}
            <g transform="translate(180, 140)">
              <polygon points="-40,20 0,-30 40,20" fill="#334155" stroke="#64748b" strokeWidth="2" />
              <path d="M -15,20 A 15 15 0 0 1 15,20 Z" fill="#0f172a" stroke="#fb7185" strokeWidth="1.5" />
              <rect x="-35" y="-42" width="70" height="16" rx="4" fill="#0f172a" stroke="#fb7185" strokeWidth="1" />
              <text x="0" y="-30" textAnchor="middle" fill="#fb7185" fontSize="8" fontWeight="bold" fontFamily="monospace">AWS • STRIPE</text>
            </g>

            {/* Sector B: File System Depot Hangar (Bottom Right) */}
            <g transform="translate(780, 600)">
              <rect x="-90" y="-50" width="180" height="100" rx="20" fill="rgba(15,23,42,0.95)" stroke="#eab308" strokeWidth="2" />
              {/* Storage Hangar Vault */}
              <path d="M -50,20 L -50,-10 Q 0,-45 50,-10 L 50,20 Z" fill="#854d0e" stroke="#fef08a" strokeWidth="1.5" />
              <rect x="-60" y="-62" width="120" height="18" rx="4" fill="#0f172a" stroke="#eab308" strokeWidth="1" />
              <text x="0" y="-50" textAnchor="middle" fill="#fef08a" fontSize="9" fontWeight="bold" fontFamily="monospace">FILE SYSTEM DEPOT</text>
            </g>

            {/* 4. API GATEWAY GRAND FORTRESS (Center Intersection) */}
            <g transform="translate(480, 380)">
              {/* Outer glow ring */}
              <circle cx="0" cy="0" r="68" fill="none" stroke="#c084fc" strokeWidth="1" strokeDasharray="4 6" opacity={0.4} />

              {/* Stone fortress base platform */}
              <polygon
                points="-60,28 60,28 72,14 60,-14 0,-26 -60,-14 -72,14"
                fill="rgba(15,10,35,0.97)"
                stroke="#c084fc"
                strokeWidth="2"
              />

              {/* Left fortress tower */}
              <rect x="-64" y="-42" width="20" height="56" rx="4" fill="#1e0a40" stroke="#a855f7" strokeWidth="1.5" />
              <rect x="-68" y="-48" width="28" height="10" rx="2" fill="#2d1060" stroke="#c084fc" strokeWidth="1" />
              {/* Left tower battlements */}
              {[-68,-62,-56,-50].map((bx, i) => (
                <rect key={i} x={bx} y={-56} width={5} height={8} rx={1} fill="#c084fc" opacity={0.7} />
              ))}
              <circle cx="-54" cy="-52" r="3" fill="#c084fc" opacity={0.9} style={{ filter: 'drop-shadow(0 0 4px #a855f7)' }} />

              {/* Right fortress tower */}
              <rect x="44" y="-42" width="20" height="56" rx="4" fill="#1e0a40" stroke="#a855f7" strokeWidth="1.5" />
              <rect x="40" y="-48" width="28" height="10" rx="2" fill="#2d1060" stroke="#c084fc" strokeWidth="1" />
              {/* Right tower battlements */}
              {[40,46,52,58].map((bx, i) => (
                <rect key={i} x={bx} y={-56} width={5} height={8} rx={1} fill="#c084fc" opacity={0.7} />
              ))}
              <circle cx="54" cy="-52" r="3" fill="#c084fc" opacity={0.9} style={{ filter: 'drop-shadow(0 0 4px #a855f7)' }} />

              {/* Central wall */}
              <rect x="-44" y="-36" width="88" height="50" rx="4" fill="#160835" stroke="#a855f7" strokeWidth="1.5" />
              {/* Central wall battlements */}
              {[-44,-34,-24,-14,-4,6,16,26,36].map((bx, i) => (
                <rect key={i} x={bx} y={-44} width={7} height={10} rx={1} fill="#7c3aed" opacity={0.6} />
              ))}

              {/* Gate arch */}
              <path
                d="M -18,14 L -18,-8 A 18 18 0 0 1 18,-8 L 18,14 Z"
                fill="#050010"
                stroke="#c084fc"
                strokeWidth="2"
              />
              {/* Gate keystone */}
              <polygon points="0,-26 -5,-16 5,-16" fill="#c084fc" opacity={0.8} />

              {/* Central emblem (animated pulse) */}
              <circle cx="0" cy="-14" r="14" fill="#a855f7" className="animate-ping" opacity={0.3} />
              <circle cx="0" cy="-14" r="11" fill="#7c3aed" stroke="#ffffff" strokeWidth="1.5" />
              <text x="0" y="-10" textAnchor="middle" fill="#f3e8ff" fontSize="8" fontWeight="bold" fontFamily="monospace">API</text>

              {/* Label plate */}
              <rect x="-55" y="16" width="110" height="20" rx="5" fill="rgba(10,14,26,0.95)" stroke="#c084fc" strokeWidth="1.5" />
              <text x="0" y="30" textAnchor="middle" fill="#f3e8ff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                API GATEWAY HUB
              </text>
            </g>

            {/* 5. ASPHALT ROADS & HIGHWAYS CONNECTING ALL SECTORS */}
            {/* FE Road */}
            <path d="M 480,240 L 480,380" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
            <path d="M 480,240 L 480,380" fill="none" stroke="#06b6d4" strokeWidth="2" strokeDasharray="6 6" />

            {/* BE Road */}
            <path d="M 280,380 L 480,380" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
            <path d="M 280,380 L 480,380" fill="none" stroke="#a855f7" strokeWidth="2" strokeDasharray="6 6" />

            {/* DB Road */}
            <path d="M 680,380 L 480,380" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
            <path d="M 680,380 L 480,380" fill="none" stroke="#10b981" strokeWidth="2" strokeDasharray="6 6" />

            {/* Auth Road */}
            <path d="M 680,240 Q 580,300 480,380" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
            <path d="M 680,240 Q 580,300 480,380" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 6" />

            {/* Infra Road */}
            <path d="M 480,520 L 480,380" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
            <path d="M 480,520 L 480,380" fill="none" stroke="#3b82f6" strokeWidth="2" strokeDasharray="6 6" />

            {/* File Depot Road */}
            <path d="M 680,520 Q 580,450 480,380" fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round" />
            <path d="M 680,520 Q 580,450 480,380" fill="none" stroke="#eab308" strokeWidth="2" strokeDasharray="6 6" />

            {/* 6. ANIMATED REQUEST PACKETS / CARS */}
            {transform.showTraffic && edges.map((edge, index) => {
              const pathData = getEdgePath(edge);
              if (!pathData) return null;

              return (
                <g key={`edge-${index}`}>
                  <path d={pathData.path} fill="none" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="2" strokeDasharray="4 4" />
                  <g transform={`translate(${pathData.midX}, ${pathData.midY})`}>
                    <rect x="-40" y="-10" width="80" height="18" rx="4" fill="rgba(15, 23, 42, 0.9)" stroke="#06b6d4" strokeWidth="1" />
                    <text x="0" y="2" textAnchor="middle" fill="#06b6d4" fontSize="8" fontWeight="bold" fontFamily="monospace">{edge.label}</text>
                  </g>
                  <circle r="5" fill="#22d3ee" filter="url(#neonGlowCyan)">
                    <animateMotion path={pathData.path} dur={`${2.5 + index * 0.5}s`} repeatCount="indefinite" rotate="auto" />
                  </circle>
                  <circle r="4" fill="#a855f7" filter="url(#neonGlowPurple)">
                    <animateMotion path={pathData.path} dur={`${3 + index * 0.4}s`} repeatCount="indefinite" keyPoints="1;0" keyTimes="0;1" />
                  </circle>
                </g>
              );
            })}

            {/* 7. ISOMETRIC BUILDINGS / FILE NODES */}
            {filteredNodes.map(node => (
              <IsometricBuilding
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                onSelect={onSelectNode}
              />
            ))}

            {/* 8. SUBTERRANEAN PIPELINES & NETWORKS */}
            <UndergroundPipelines visible={transform.showPipelines} />
          </svg>
        </div>
      </div>
    </div>
  );
};

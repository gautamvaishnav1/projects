import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Sparkles,
  Layers,
  Eye,
  Workflow,
  Activity,
  LogOut,
  FileCode,
  Code2,
  ShieldAlert,
  Zap,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Compass,
  X,
} from 'lucide-react';

import { useAppDispatch, useAppSelector } from '../../store';
import TelemetryCard from '../../components/TelemetryCard';
import FilterBar from '../../components/FilterBar';
import { WorldScene } from '../../components/three/WorldScene';

import {
  setCurrentRepo,
  setSelectedNode,
  setZoom,
  setPan,
  toggleTopDown,
  togglePipelines,
  toggleTraffic,
  resetCamera,
  rotateLeft,
  setSelectedSectorFilter,
  setSearchQuery,
} from '../../store/citySlice';
import { logout } from '../../store/authSlice';
import { PRESET_REPOSITORIES } from '../../data/mockRepoData';

export function CodeCity3DWorldPage() {
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);
  const { currentRepo, selectedNode, transform, filters } = useAppSelector(
    (state) => state.city
  );

  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate sector node counts
  const sectorCounts = currentRepo.nodes.reduce<Record<string, number>>((acc, node) => {
    acc[node.island] = (acc[node.island] || 0) + 1;
    return acc;
  }, {});

  // Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.panX, y: e.clientY - transform.panY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    dispatch(
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    );
  };

  const handleMouseUp = () => setIsDragging(false);



  // Map transform not used directly in CSS anymore, handled by WorldScene and OrbitControls

  return (
    <div className="flex flex-col w-screen h-screen bg-[#090D16] text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP BAR (60px height) */}
      <header className="h-[60px] px-5 bg-[#0A0E1A]/95 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between z-30 shrink-0 select-none">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00F0FF] via-[#A855F7] to-[#00FF88] p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0A0E1A] rounded-[11px] flex items-center justify-center">
              <Building2 className="w-4 h-4 text-[#00F0FF] animate-pulse" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00F0FF]"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-wider bg-gradient-to-r from-[#00F0FF] via-[#A855F7] to-[#00FF88] bg-clip-text text-transparent drop-shadow">
                CODECITY
              </h1>
              <span className="px-2 py-0.5 text-[9px] font-mono uppercase font-bold tracking-widest bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/30 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-[#00F0FF]" /> AI 3D World
              </span>
            </div>
          </div>
        </div>

        {/* Preset Repos Selector */}
        <div className="hidden lg:flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-[#A855F7]" /> Preset Repos:
          </span>
          <select
            value={currentRepo.id}
            onChange={(e) => {
              const selected = PRESET_REPOSITORIES.find((r) => r.id === e.target.value);
              if (selected) dispatch(setCurrentRepo(selected));
            }}
            className="px-3 py-1 bg-[#0D1117] border border-slate-700/80 hover:border-[#00F0FF]/50 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#00F0FF] cursor-pointer transition shadow-inner"
          >
            {PRESET_REPOSITORIES.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.owner}/{repo.name} ({repo.stars} ★)
              </option>
            ))}
          </select>
        </div>

        {/* View Toggles & User Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Toggle 2D Top-Down */}
          <button
            onClick={() => dispatch(toggleTopDown())}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition cursor-pointer ${
              transform.isTopDown
                ? 'bg-[#A855F7]/20 border-[#A855F7]/60 text-[#A855F7] shadow-[0_0_10px_rgba(168,85,247,0.3)] font-bold'
                : 'bg-[#0D1117] border-slate-800 text-slate-300 hover:border-[#00F0FF]/40'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-[#A855F7]" />
            <span>2D Top-Down</span>
          </button>

          {/* Toggle Underground */}
          <button
            onClick={() => dispatch(togglePipelines())}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition cursor-pointer ${
              transform.showPipelines
                ? 'bg-[#00FF88]/20 border-[#00FF88]/60 text-[#00FF88] shadow-[0_0_10px_rgba(0,255,136,0.3)] font-bold'
                : 'bg-[#0D1117] border-slate-800 text-slate-300'
            }`}
          >
            <Workflow className="w-3.5 h-3.5 text-[#00FF88]" />
            <span>Underground: ON</span>
          </button>

          {/* Toggle Live Traffic */}
          <button
            onClick={() => dispatch(toggleTraffic())}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 border transition cursor-pointer ${
              transform.showTraffic
                ? 'bg-[#00F0FF]/20 border-[#00F0FF]/60 text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.3)] font-bold'
                : 'bg-[#0D1117] border-slate-800 text-slate-400'
            }`}
          >
            <Activity
              className={`w-3.5 h-3.5 ${
                transform.showTraffic ? 'text-[#00F0FF] animate-pulse' : 'text-slate-500'
              }`}
            />
            <span>Traffic</span>
          </button>

          {/* User Profile Info */}
          {user && (
            <div className="flex items-center gap-2 pl-3 border-l border-slate-800">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full border border-[#00F0FF]/40 object-cover"
              />
              <div className="hidden md:block text-left font-mono">
                <div className="text-xs font-bold text-slate-200">{user.name}</div>
                <div className="text-[10px] text-slate-400">{user.email}</div>
              </div>
              <button
                onClick={() => dispatch(logout())}
                className="p-1.5 rounded-lg bg-[#0D1117] hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition cursor-pointer ml-1"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Left Sidebar + Center Canvas) */}
      <div className="relative flex flex-1 w-full h-[calc(100vh-60px)] overflow-hidden">
        {/* LEFT SIDEBAR (280px width, #0A0E1A dark) */}
        <aside className="w-[280px] h-full bg-[#0A0E1A] border-r border-slate-800/80 flex flex-col z-20 shrink-0 select-none overflow-y-auto p-4 space-y-4">
          {/* Top Logo & Title */}
          <div className="pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-ping" />
              <h2 className="text-sm font-bold font-mono text-white tracking-wide">
                CODECITY AI
              </h2>
            </div>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
              3D Isometric System Architecture Visualizer
            </p>
          </div>

          {/* Telemetry Grid: 4 Cards */}
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
              System Telemetry
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <TelemetryCard
                title="Total Files"
                value={currentRepo.stats.totalFiles}
                subtext={`${currentRepo.stats.frontendCount} FE • ${currentRepo.stats.backendCount} BE`}
                icon={FileCode}
                glowColor="cyan"
              />
              <TelemetryCard
                title="Total Lines"
                value={currentRepo.stats.totalLines.toLocaleString()}
                subtext="LOC total volume"
                icon={Code2}
                glowColor="purple"
              />
              <TelemetryCard
                title="Security Score"
                value={currentRepo.stats.securityScore}
                subtext={`${currentRepo.stats.highRiskCount} Risk File`}
                icon={ShieldAlert}
                glowColor="emerald"
                riskAlert={currentRepo.stats.highRiskCount > 0}
              />
              <TelemetryCard
                title="Bottlenecks"
                value={currentRepo.stats.bottlenecks}
                subtext="Performance flags"
                icon={Zap}
                glowColor="amber"
              />
            </div>
          </div>

          {/* District Filters Component */}
          <div className="pt-2">
            <FilterBar
              selectedSector={filters.selectedSector}
              onSelectSector={(sec) => dispatch(setSelectedSectorFilter(sec))}
              searchQuery={filters.searchQuery}
              onSearchChange={(q) => dispatch(setSearchQuery(q))}
              totalNodesCount={currentRepo.nodes.length}
              sectorCounts={sectorCounts}
            />
          </div>
        </aside>

        {/* CENTER CANVAS (dark grid background #0D1117) */}
        <main
          className="relative flex-1 h-full overflow-hidden bg-[#0D1117] flex flex-col cursor-grab active:cursor-grabbing select-none cyber-grid"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Right Vertical Floating Toolbar: 4 Circle Buttons */}
          <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 bg-[#0A0E1A]/90 p-2 rounded-2xl border border-slate-800 shadow-2xl backdrop-blur-md">
            <button
              onClick={() => dispatch(setZoom(Math.min(transform.zoom + 0.15, 2.2)))}
              className="w-8 h-8 rounded-full bg-[#0D1117] hover:bg-[#00F0FF]/20 text-slate-300 hover:text-[#00F0FF] flex items-center justify-center transition border border-slate-800 cursor-pointer"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => dispatch(setZoom(Math.max(transform.zoom - 0.15, 0.4)))}
              className="w-8 h-8 rounded-full bg-[#0D1117] hover:bg-[#00F0FF]/20 text-slate-300 hover:text-[#00F0FF] flex items-center justify-center transition border border-slate-800 cursor-pointer"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => dispatch(resetCamera())}
              className="w-8 h-8 rounded-full bg-[#0D1117] hover:bg-[#A855F7]/20 text-slate-300 hover:text-[#A855F7] flex items-center justify-center transition border border-slate-800 cursor-pointer"
              title="Refresh Camera View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => dispatch(rotateLeft())}
              className="w-8 h-8 rounded-full bg-[#0D1117] hover:bg-[#00FF88]/20 text-slate-300 hover:text-[#00FF88] flex items-center justify-center transition border border-slate-800 cursor-pointer"
              title="Rotate Compass"
            >
              <Compass className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive 3D World Canvas Viewport */}
          <div className="w-full h-full flex items-center justify-center pointer-events-auto">
            <WorldScene />
          </div>
        </main>

        {/* RIGHT BUILDING INSPECTOR SLIDE-OVER DRAWER */}
        <AnimatePresence>
          {selectedNode && (
            <motion.aside
              initial={{ x: 380, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 380, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-96 h-full bg-[#0A0E1A]/95 border-l border-slate-800 backdrop-blur-xl z-30 shrink-0 p-5 flex flex-col overflow-y-auto font-mono"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00F0FF] animate-pulse" />
                  <h3 className="text-sm font-bold text-white">{selectedNode.name}</h3>
                </div>
                <button
                  onClick={() => dispatch(setSelectedNode(null))}
                  className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div className="p-3 bg-[#0D1117] rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="text-slate-400">Path: <span className="text-slate-200">{selectedNode.path}</span></div>
                  <div className="text-slate-400">Lines of Code: <span className="text-[#00F0FF] font-bold">{selectedNode.lines} LOC</span></div>
                  <div className="text-slate-400">Complexity: <span className="text-[#A855F7] font-bold">{selectedNode.complexity}</span></div>
                  <div className="text-slate-400">Security Status: <span className={selectedNode.security === 'Clean' ? 'text-[#00FF88]' : 'text-amber-400 font-bold'}>{selectedNode.security}</span></div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-1.5">Code Preview</h4>
                  <pre className="p-3 bg-[#0D1117] border border-slate-800 rounded-xl text-[11px] text-[#00F0FF] overflow-x-auto">
                    <code>{selectedNode.codeSnippet}</code>
                  </pre>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 mb-1.5">AI Architecture Insights</h4>
                  <div className="p-3 bg-[#0D1117] border border-[#00F0FF]/30 rounded-xl text-xs text-slate-300 leading-relaxed">
                    {selectedNode.aiExplanation}
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default CodeCity3DWorldPage;

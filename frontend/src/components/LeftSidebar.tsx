import React, { useState } from 'react';
import { 
  Search, 
  FileCode, 
  Code2, 
  ShieldAlert, 
  Zap, 
  Filter, 
  RefreshCw,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import type { NodeType } from '../types/codecity';
import { ISLAND_SECTORS, generateCityFromRepoUrl } from '../data/mockRepoData';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  setCurrentRepo, 
  setSelectedSectorFilter, 
  setSecurityFilter, 
  setIsAnalyzing 
} from '../store/citySlice';

export const LeftSidebar: React.FC = () => {
  const dispatch = useAppDispatch();
  const repo = useAppSelector(state => state.city.currentRepo);
  const filters = useAppSelector(state => state.city.filters);
  const isAnalyzing = useAppSelector(state => state.city.isAnalyzing);

  const [repoInput, setRepoInput] = useState(repo.url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (repoInput.trim()) {
      dispatch(setIsAnalyzing(true));
      setTimeout(() => {
        const generated = generateCityFromRepoUrl(repoInput.trim());
        dispatch(setCurrentRepo(generated));
        dispatch(setIsAnalyzing(false));
      }, 1100);
    }
  };

  const getSecurityColor = (score: number) => {
    if (score >= 85) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 70) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  return (
    <aside className="w-80 h-full bg-slate-950/85 backdrop-blur-xl border-r border-slate-800/80 flex flex-col z-20 shrink-0 select-none overflow-y-auto">
      {/* 1. Repository Input Form */}
      <div className="p-4 border-b border-slate-800/80">
        <label className="block text-xs font-mono font-medium text-slate-400 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-cyan-400">
            <Search className="w-3.5 h-3.5" /> GitHub Repo Analyzer
          </span>
          <span className="text-[10px] text-slate-500">Redux Active</span>
        </label>
        
        <form onSubmit={handleSubmit} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              placeholder="https://github.com/owner/repo"
              className="w-full px-3 py-2 pl-3 text-xs font-mono bg-slate-900 border border-slate-800 focus:border-cyan-500/80 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 transition shadow-inner"
            />
          </div>
          
          <button
            type="submit"
            disabled={isAnalyzing}
            className="w-full py-2 px-4 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-medium text-xs font-mono rounded-lg shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Parsing AST & City Grid...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-cyan-200" />
                <span>Analyze System City</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-2 text-[10px] text-slate-500 font-mono">
          Tip: Paste any public GitHub repo URL to dynamically construct a 3D isometric city map.
        </p>
      </div>

      {/* 2. Summary Stats Cards */}
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Repository Telemetry</span>
          <span className="text-[10px] text-slate-500">{repo.name}</span>
        </h2>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Total Files */}
          <div className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-xl hover:border-cyan-500/30 transition glass-panel-hover">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-mono">Total Files</span>
              <FileCode className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100">
              {repo.stats.totalFiles}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {repo.stats.frontendCount} FE • {repo.stats.backendCount} BE
            </div>
          </div>

          {/* Card 2: Total Lines of Code */}
          <div className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-xl hover:border-purple-500/30 transition glass-panel-hover">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-mono">Total Lines</span>
              <Code2 className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100">
              {repo.stats.totalLines.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              LOC total volume
            </div>
          </div>

          {/* Card 3: Security Score */}
          <div className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-xl hover:border-emerald-500/30 transition glass-panel-hover">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-mono">Security Score</span>
              <ShieldAlert className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-slate-100">
                {repo.stats.securityScore}
              </span>
              <span className={`px-1.5 py-0.5 text-[9px] font-mono border rounded ${getSecurityColor(repo.stats.securityScore)}`}>
                / 100
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
              {repo.stats.highRiskCount > 0 ? (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {repo.stats.highRiskCount} Risk File{repo.stats.highRiskCount > 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Clean Security
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Scalability Bottlenecks */}
          <div className="p-3 bg-slate-900/90 border border-slate-800/90 rounded-xl hover:border-amber-500/30 transition glass-panel-hover">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[11px] font-mono">Bottlenecks</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold font-mono text-slate-100">
              {repo.stats.bottlenecks}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Performance flags
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filters & Sector Navigation */}
      <div className="p-4 border-b border-slate-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> District Filter
          </h3>
          {filters.selectedSector !== 'all' && (
            <button
              onClick={() => dispatch(setSelectedSectorFilter('all'))}
              className="text-[10px] font-mono text-cyan-400 hover:underline"
            >
              Reset Sector
            </button>
          )}
        </div>

        <div className="space-y-1">
          <button
            onClick={() => dispatch(setSelectedSectorFilter('all'))}
            className={`w-full px-3 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between transition ${
              filters.selectedSector === 'all'
                ? 'bg-slate-800 text-cyan-400 font-bold border border-cyan-500/30'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <span>All Districts (Full World)</span>
            <span className="px-1.5 py-0.2 bg-slate-950 rounded text-[10px]">{repo.nodes.length}</span>
          </button>

          {Object.entries(ISLAND_SECTORS).map(([key, sector]) => {
            const count = repo.nodes.filter(n => n.island === key).length;
            const isSelected = filters.selectedSector === key;
            return (
              <button
                key={key}
                onClick={() => dispatch(setSelectedSectorFilter(key as NodeType))}
                className={`w-full px-3 py-1.5 rounded-lg text-xs font-mono flex items-center justify-between border transition ${
                  isSelected
                    ? `${sector.badgeBg} ${sector.badgeBorder} font-semibold`
                    : 'bg-slate-900/50 border-slate-800/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sector.accentBright }} />
                  <span>{sector.title}</span>
                </div>
                <span className="px-1.5 py-0.2 bg-slate-950/80 rounded text-[10px] text-slate-300">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Security Risk Filter */}
      <div className="p-4 border-b border-slate-800/80 space-y-2">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
          Security Level Filter
        </h3>
        <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
          <button
            onClick={() => dispatch(setSecurityFilter('all'))}
            className={`py-1 rounded border text-center transition ${
              filters.securityFilter === 'all'
                ? 'bg-slate-800 border-cyan-500/50 text-cyan-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => dispatch(setSecurityFilter('clean'))}
            className={`py-1 rounded border text-center transition ${
              filters.securityFilter === 'clean'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-emerald-400'
            }`}
          >
            Clean
          </button>
          <button
            onClick={() => dispatch(setSecurityFilter('risks'))}
            className={`py-1 rounded border text-center transition ${
              filters.securityFilter === 'risks'
                ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400'
            }`}
          >
            Risks
          </button>
        </div>
      </div>

      {/* 5. City Map Visual Legend */}
      <div className="p-4 mt-auto space-y-2 bg-slate-900/40">
        <div className="text-[11px] font-mono font-semibold text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" /> Isometric City Guide
        </div>
        <div className="space-y-1.5 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-cyan-500 border border-cyan-300" />
            <span>Building Heights = Lines of Code (LOC)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-purple-500 border border-purple-300" />
            <span>3D Shading: Top / Left / Right faces</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span>Pulsing Warning = Security Alert</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span>Moving Dots = Real-time API Traffic</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

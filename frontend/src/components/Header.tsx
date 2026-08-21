import React from 'react';
import { 
  Building2, 
  Layers, 
  Eye, 
  Activity, 
  Sparkles,
  Workflow,
  LogOut,
    
} from 'lucide-react';
import type { MapViewTransform, RepoDataset } from '../types/codecity';
import { PRESET_REPOSITORIES } from '../data/mockRepoData';
import { useAppDispatch, useAppSelector } from '../store';
import { logout } from '../store/authSlice';

interface HeaderProps {
  currentRepo: RepoDataset;
  onSelectPreset: (repo: RepoDataset) => void;
  transform: MapViewTransform;
  onTransformChange: (updater: (prev: MapViewTransform) => MapViewTransform) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRepo,
  onSelectPreset,
  transform,
  onTransformChange
}) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);

  return (
    <header className="h-16 px-5 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between z-30 shrink-0 select-none">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-purple-500 to-emerald-400 p-[1px] shadow-lg shadow-cyan-500/20">
          <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
            <Building2 className="w-5 h-5 text-cyan-400 animate-pulse" />
          </div>
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent drop-shadow">
              CODECITY
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-bold tracking-widest bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-300" /> AI 3D World
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            3D Isometric System Architecture Visualizer
          </p>
        </div>
      </div>

      {/* Center Controls: Repository Preset Selector */}
      <div className="hidden lg:flex items-center gap-2">
        <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
          <Layers className="w-3.5 h-3.5 text-purple-400" /> Preset Repos:
        </span>
        <div className="relative">
          <select
            value={currentRepo.id}
            onChange={(e) => {
              const selected = PRESET_REPOSITORIES.find(r => r.id === e.target.value);
              if (selected) onSelectPreset(selected);
            }}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 hover:border-cyan-500/50 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer shadow-inner transition"
          >
            {PRESET_REPOSITORIES.map(repo => (
              <option key={repo.id} value={repo.id}>
                {repo.owner}/{repo.name} ({repo.stars} ⭐)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Controls: View Mode Toggles & User Profile */}
      <div className="flex items-center gap-3">
        {/* Toggle 2.5D vs Top-down 2D */}
        <button
          onClick={() => onTransformChange(prev => ({ ...prev, isTopDown: !prev.isTopDown }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 border transition ${
            transform.isTopDown 
              ? 'bg-purple-950/70 border-purple-500/50 text-purple-300 shadow-sm shadow-purple-500/20' 
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-cyan-500/40 hover:text-cyan-300'
          }`}
          title="Toggle between 3D Isometric View and 2D Top-Down View"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          {transform.isTopDown ? '2D Top-Down' : '3D Isometric'}
        </button>

        {/* Toggle Underground Data Pipelines */}
        <button
          onClick={() => onTransformChange(prev => ({ ...prev, showPipelines: !prev.showPipelines }))}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 border transition ${
            transform.showPipelines 
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/20' 
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:text-emerald-300'
          }`}
          title="Toggle Underground Data Conduits & Pipelines"
        >
          <Workflow className="w-3.5 h-3.5 text-emerald-400" />
          {transform.showPipelines ? 'Underground: ON' : 'Underground View'}
        </button>

        {/* Live Traffic Indicator */}
        <button
          onClick={() => onTransformChange(prev => ({ ...prev, showTraffic: !prev.showTraffic }))}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 border transition ${
            transform.showTraffic 
              ? 'bg-cyan-950/70 border-cyan-500/50 text-cyan-300 shadow-sm shadow-cyan-500/20' 
              : 'bg-slate-900 border-slate-800 text-slate-400'
          }`}
          title="Toggle Animated API Packets/Traffic Flow"
        >
          <Activity className={`w-3.5 h-3.5 ${transform.showTraffic ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
          <span>Traffic</span>
        </button>

        {/* User Profile Badge */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full border border-cyan-500/40 object-cover" />
            <div className="hidden xl:block text-left font-mono">
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1">
                {user.name}
              </div>
              <div className="text-[10px] text-slate-400">{user.email}</div>
            </div>
            <button
              onClick={() => dispatch(logout())}
              className="p-2 rounded-lg bg-slate-900 hover:bg-rose-950/80 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-300 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

import React from 'react';
import { Filter, Search } from 'lucide-react';
import type { NodeType } from '../types/codecity';
import { ISLAND_SECTORS } from '../data/mockRepoData';

export interface FilterBarProps {
  selectedSector: NodeType | 'all';
  onSelectSector: (sector: NodeType | 'all') => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalNodesCount: number;
  sectorCounts: Record<string, number>;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedSector,
  onSelectSector,
  searchQuery,
  onSearchChange,
  totalNodesCount,
  sectorCounts,
}) => {
  return (
    <div className="space-y-3 font-mono">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter districts or files..."
          className="w-full px-3 py-1.5 pl-8 text-xs bg-[#0D1117] border border-slate-800 focus:border-[#00F0FF] rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none transition"
        />
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[#00F0FF]" /> District Filter
        </h3>
        {selectedSector !== 'all' && (
          <button
            onClick={() => onSelectSector('all')}
            className="text-[10px] text-[#00F0FF] hover:underline cursor-pointer"
          >
            Reset
          </button>
        )}
      </div>

      {/* District Buttons List */}
      <div className="space-y-1.5">
        {/* All Districts Button */}
        <button
          onClick={() => onSelectSector('all')}
          className={`w-full px-3 py-2 rounded-lg text-xs flex items-center justify-between transition cursor-pointer border ${
            selectedSector === 'all'
              ? 'bg-[#00F0FF]/10 text-[#00F0FF] font-bold border-[#00F0FF]/40 shadow-[0_0_12px_rgba(0,240,255,0.15)]'
              : 'bg-[#0D1117]/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse" />
            <span>All Districts (Full World)</span>
          </div>
          <span className="px-1.5 py-0.5 bg-[#0A0E1A] rounded text-[10px] font-bold text-[#00F0FF]">
            {totalNodesCount}
          </span>
        </button>

        {/* Individual Sector Buttons */}
        {Object.entries(ISLAND_SECTORS).map(([key, sector]) => {
          const count = sectorCounts[key] || 0;
          const isSelected = selectedSector === key;
          return (
            <button
              key={key}
              onClick={() => onSelectSector(key as NodeType)}
              className={`w-full px-3 py-1.5 rounded-lg text-xs flex items-center justify-between border transition cursor-pointer ${
                isSelected
                  ? `${sector.badgeBg} ${sector.badgeBorder} font-bold shadow-md`
                  : 'bg-[#0D1117]/40 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: sector.accentBright }}
                />
                <span className="truncate">{sector.title}</span>
              </div>
              <span className="px-1.5 py-0.2 bg-[#0A0E1A] rounded text-[10px] text-slate-300">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FilterBar;

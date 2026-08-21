import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileCode, 
  Code2, 
  Sparkles, 
  Copy, 
  Check, 
  Bot, 
  ArrowRight,
  Layers,
  Cpu,
  User,
  Zap
} from 'lucide-react';
import type { CityNode, CityEdge } from '../types/codecity';
import { ISLAND_SECTORS } from '../data/mockRepoData';

interface RightDrawerProps {
  node: CityNode | null;
  edges: CityEdge[];
  onClose: () => void;
}

export const RightDrawer: React.FC<RightDrawerProps> = ({
  node,
  edges,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'analyzer'>('overview');
  const [isCopied, setIsCopied] = useState(false);
  const [aiTypingText, setAiTypingText] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showAiResult, setShowAiResult] = useState(false);

  // Reset AI typing state when node changes
  useEffect(() => {
    setAiTypingText('');
    setIsAiTyping(false);
    setShowAiResult(false);
    setActiveTab('overview');
  }, [node?.id]);

  if (!node) return null;

  const sector = ISLAND_SECTORS[node.island] || ISLAND_SECTORS.frontend;

  // Handle Copy Code to clipboard
  const handleCopyCode = () => {
    navigator.clipboard.writeText(node.codeSnippet);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Trigger AI Explanation typing animation effect
  const handleTriggerAiExplanation = () => {
    if (isAiTyping) return;
    setIsAiTyping(true);
    setShowAiResult(true);
    setAiTypingText('');

    const fullText = node.aiExplanation;
    let index = 0;

    const interval = setInterval(() => {
      if (index < fullText.length) {
        setAiTypingText(fullText.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsAiTyping(false);
      }
    }, 15); // Smooth 15ms per character typing speed
  };

  // Get complexity badge color
  const getComplexityBadge = (lvl: string) => {
    switch (lvl) {
      case 'Low': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'Medium': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'High': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'Critical': return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default: return 'bg-slate-800 text-slate-300';
    }
  };

  // Find incoming & outgoing edges for this node
  const connectedEdges = edges.filter(e => e.from === node.id || e.to === node.id);

  return (
    <div className="fixed inset-y-0 right-0 w-[460px] max-w-full bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800/80 shadow-2xl z-40 flex flex-col transition-all duration-300 ease-out select-none">
      {/* Drawer Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-start justify-between bg-slate-900/40">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl border" style={{ backgroundColor: `${sector.accentBright}15`, borderColor: sector.accentBright }}>
            <FileCode className="w-6 h-6" style={{ color: sector.accentBright }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-slate-100">{node.name}</h2>
              <span className={`px-2 py-0.5 text-[10px] font-mono border rounded ${sector.badgeBg}`}>
                {node.type.toUpperCase()}
              </span>
            </div>
            <p className="text-xs font-mono text-slate-400 mt-0.5 truncate max-w-[280px]" title={node.path}>
              {node.path}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-slate-100 hover:bg-slate-800 border border-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stats Quick Ribbon */}
      <div className="grid grid-cols-3 gap-2 px-5 py-3 border-b border-slate-800/80 bg-slate-900/60 font-mono text-xs">
        <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500">LINE COUNT</div>
          <div className="text-sm font-bold text-cyan-400">{node.lines} LOC</div>
        </div>

        <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500">COMPLEXITY</div>
          <div className={`text-xs font-bold inline-block px-1.5 py-0.5 rounded border mt-0.5 ${getComplexityBadge(node.complexity)}`}>
            {node.complexity}
          </div>
        </div>

        <div className="p-2 bg-slate-950/80 rounded-lg border border-slate-800">
          <div className="text-[10px] text-slate-500">SECURITY AUDIT</div>
          <div className={`text-[11px] font-semibold truncate ${node.security === 'Clean' ? 'text-emerald-400' : 'text-amber-400'}`}>
            {node.security}
          </div>
        </div>
      </div>

      {/* Tab Controls */}
      <div className="flex border-b border-slate-800/80 bg-slate-950 font-mono text-xs">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 text-center border-b-2 font-medium flex items-center justify-center gap-2 transition ${
            activeTab === 'overview'
              ? 'border-cyan-400 text-cyan-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Overview
        </button>
        <button
          onClick={() => setActiveTab('analyzer')}
          className={`flex-1 py-3 text-center border-b-2 font-medium flex items-center justify-center gap-2 transition ${
            activeTab === 'analyzer'
              ? 'border-purple-400 text-purple-400 bg-slate-900/40'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" /> Code Analyzer
        </button>
      </div>

      {/* Drawer Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-5 font-mono">
            {/* Metadata Box */}
            <div className="space-y-3 p-4 bg-slate-900/60 rounded-xl border border-slate-800">
              <h3 className="text-xs font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-cyan-400" /> Node Telemetry
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block">DISTRICT SECTOR</span>
                  <span className="text-slate-200 font-semibold">{sector.title}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block">LANGUAGE</span>
                  <span className="text-slate-200 font-semibold">{node.language || 'TypeScript'}</span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block">AUTHOR</span>
                  <span className="text-slate-200 font-semibold flex items-center gap-1">
                    <User className="w-3 h-3 text-purple-400" /> {node.author || 'dev.team'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 block">BUILDING FOOTPRINT</span>
                  <span className="text-slate-200 font-semibold">{node.width || 44}m x {node.depth || 44}m</span>
                </div>
              </div>
            </div>

            {/* Imports / Dependencies List */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-slate-400 flex items-center justify-between">
                <span>Imports & Dependencies</span>
                <span className="text-[10px] text-slate-500">{node.imports.length} modules</span>
              </h3>

              <div className="flex flex-wrap gap-1.5">
                {node.imports.map((imp, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 text-cyan-300 text-xs rounded-md font-mono hover:border-cyan-500/40 transition"
                  >
                    import {imp}
                  </span>
                ))}
              </div>
            </div>

            {/* Connected Architectural Flows */}
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Connected API Flows
              </h3>

              {connectedEdges.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No direct incoming or outgoing edge flows.</p>
              ) : (
                <div className="space-y-1.5">
                  {connectedEdges.map((edge, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-slate-900/80 border border-slate-800/80 rounded-lg flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="text-purple-400 font-bold">{edge.from}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-cyan-400 font-bold">{edge.to}</span>
                      </div>
                      <span className="px-2 py-0.5 bg-slate-950 text-cyan-400 border border-cyan-500/30 rounded text-[10px]">
                        {edge.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CODE ANALYZER */}
        {activeTab === 'analyzer' && (
          <div className="space-y-4 font-mono">
            {/* Code Snippet Container */}
            <div className="relative rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
              <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-cyan-400" /> Source Snippet
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 rounded flex items-center gap-1 transition"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              <pre className="p-4 text-xs font-mono text-cyan-100 overflow-x-auto leading-relaxed bg-slate-950/60 max-h-72">
                <code>{node.codeSnippet}</code>
              </pre>
            </div>

            {/* "Explain with AI" Action Button */}
            <button
              onClick={handleTriggerAiExplanation}
              disabled={isAiTyping}
              className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 via-cyan-600 to-emerald-600 hover:from-purple-500 hover:to-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:opacity-50"
            >
              <Bot className={`w-4 h-4 ${isAiTyping ? 'animate-bounce' : ''}`} />
              <span>{isAiTyping ? 'AI Analyzing Code Base...' : 'Explain with AI (Generate Security & Optimization Report)'}</span>
            </button>

            {/* AI Explanation Terminal Output */}
            {showAiResult && (
              <div className="p-4 bg-slate-950 border border-purple-500/40 rounded-xl space-y-2 shadow-inner">
                <div className="flex items-center justify-between text-purple-400 border-b border-purple-500/20 pb-2">
                  <span className="text-xs font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" /> AI Architecture & Security Report
                  </span>
                  <span className="text-[10px] text-slate-500">Live Agent Output</span>
                </div>

                <div className="text-xs font-mono text-slate-200 whitespace-pre-wrap leading-relaxed pt-1">
                  {aiTypingText}
                  {isAiTyping && <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

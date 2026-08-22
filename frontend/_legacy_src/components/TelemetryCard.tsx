import React from 'react';
import type { LucideIcon } from 'lucide-react';

export interface TelemetryCardProps {
  title: string;
  value: string | number;
  subtext: string;
  icon: LucideIcon;
  glowColor?: 'cyan' | 'purple' | 'emerald' | 'amber' | 'rose';
  riskAlert?: boolean;
}

export const TelemetryCard: React.FC<TelemetryCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  glowColor = 'cyan',
  riskAlert = false,
}) => {
  const getGlowStyles = () => {
    switch (glowColor) {
      case 'purple':
        return 'border-purple-500/30 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.25)] text-purple-400';
      case 'emerald':
        return 'border-emerald-500/30 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(0,255,136,0.25)] text-emerald-400';
      case 'amber':
        return 'border-amber-500/30 hover:border-amber-400 hover:shadow-[0_0_15px_rgba(255,184,0,0.25)] text-amber-400';
      case 'rose':
        return 'border-rose-500/30 hover:border-rose-400 hover:shadow-[0_0_15px_rgba(244,63,94,0.25)] text-rose-400';
      case 'cyan':
      default:
        return 'border-cyan-500/30 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(0,240,255,0.25)] text-cyan-400';
    }
  };

  return (
    <div
      className={`p-3 bg-[#0A0E1A]/90 border rounded-xl transition-all duration-200 backdrop-blur-md relative overflow-hidden group ${getGlowStyles()}`}
    >
      <div className="flex items-center justify-between text-slate-400 mb-1">
        <span className="text-[11px] font-mono text-slate-300 group-hover:text-white transition-colors">
          {title}
        </span>
        <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${glowColor === 'cyan' ? 'text-[#00F0FF]' : glowColor === 'purple' ? 'text-[#A855F7]' : glowColor === 'emerald' ? 'text-[#00FF88]' : glowColor === 'amber' ? 'text-[#FFB800]' : 'text-rose-400'}`} />
      </div>

      <div className="text-xl font-bold font-mono text-slate-100 flex items-baseline gap-1">
        {value}
        {title === 'Security Score' && <span className="text-[10px] text-slate-400 font-normal">/100</span>}
      </div>

      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
        {riskAlert ? (
          <span className="text-amber-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            {subtext}
          </span>
        ) : (
          <span>{subtext}</span>
        )}
      </div>
    </div>
  );
};

export default TelemetryCard;

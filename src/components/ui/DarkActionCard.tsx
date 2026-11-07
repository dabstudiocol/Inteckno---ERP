import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface DarkActionCardProps {
  title: string;
  subtitle: string;
  buttonText: string;
  onButtonClick: () => void;
  tag?: string;
}

export const DarkActionCard: React.FC<DarkActionCardProps> = ({
  title,
  subtitle,
  buttonText,
  onButtonClick,
  tag = 'Prioridad de Hoy',
}) => {
  return (
    <div className="relative p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#041022] via-[#082246] to-[#0284C7] text-white overflow-hidden flex flex-col justify-between min-h-[180px] sm:min-h-[200px]">
      {/* Patrón wireframe sutil de fondo */}
      <div className="absolute -right-6 -bottom-6 w-40 h-40 opacity-20 pointer-events-none">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full stroke-cyan-300">
          <circle cx="100" cy="100" r="80" strokeWidth="1.5" strokeDasharray="4 4" />
          <polygon points="100,20 180,65 180,155 100,200 20,155 20,65" strokeWidth="1.5" />
          <polygon points="100,45 155,77 155,142 100,175 45,142 45,77" strokeWidth="1" />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-cyan-200 text-[10px] font-black tracking-widest uppercase mb-2.5">
          <Sparkles size={12} className="text-amber-400" />
          {tag}
        </div>

        <h3 className="text-base sm:text-xl font-black text-white tracking-tight leading-snug">
          {title}
        </h3>
        <p className="text-xs font-semibold text-sky-100 mt-1.5 line-clamp-2 leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="relative z-10 pt-4">
        <button
          onClick={onButtonClick}
          className="inline-flex items-center justify-center gap-2 px-4.5 py-2.5 rounded-2xl bg-white text-[#041022] hover:bg-cyan-50 text-xs font-black transition-all active:scale-98 cursor-pointer"
        >
          <span>{buttonText}</span>
          <ArrowRight size={14} className="text-[#0284C7]" />
        </button>
      </div>
    </div>
  );
};

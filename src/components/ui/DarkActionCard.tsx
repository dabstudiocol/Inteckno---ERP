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
    <div className="relative p-4 sm:p-5 rounded-xl bg-[#0B141B] text-white overflow-hidden flex flex-col justify-between min-h-[170px] sm:min-h-[190px]">
      {/* Patrón wireframe sutil de fondo */}
      <div className="absolute -right-6 -bottom-6 w-36 h-36 opacity-15 pointer-events-none">
        <svg viewBox="0 0 200 200" fill="none" className="w-full h-full stroke-cyan-400">
          <circle cx="100" cy="100" r="80" strokeWidth="1.5" strokeDasharray="4 4" />
          <polygon points="100,20 180,65 180,155 100,200 20,155 20,65" strokeWidth="1.5" />
          <polygon points="100,45 155,77 155,142 100,175 45,142 45,77" strokeWidth="1" />
        </svg>
      </div>

      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/10 text-cyan-300 text-[10px] font-bold tracking-wide uppercase mb-2">
          <Sparkles size={11} className="text-[#F39200]" />
          {tag}
        </div>

        <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-snug">
          {title}
        </h3>
        <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="relative z-10 pt-3">
        {/* Botón Inner R = 8px (rounded-lg) en armonía matemática con Outer R = 12px (rounded-xl) */}
        <button
          onClick={onButtonClick}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-white text-[#0B1317] hover:bg-slate-100 text-xs font-bold transition-all active:scale-98 cursor-pointer"
        >
          <span>{buttonText}</span>
          <ArrowRight size={13} className="text-[#00668F]" />
        </button>
      </div>
    </div>
  );
};

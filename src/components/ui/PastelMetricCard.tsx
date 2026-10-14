import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export type PastelColor = 'blue' | 'purple' | 'green' | 'amber';

interface PastelMetricCardProps {
  color: PastelColor;
  label: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  badgeText?: string;
  badgePositive?: boolean;
  trendData?: number[];
  onClick?: () => void;
}

const colorStyles: Record<PastelColor, { bg: string; border: string; text: string; badgeBg: string; badgeText: string; chartFill: string; chartStroke: string }> = {
  blue: {
    bg: 'bg-[#EBF5FA]',
    border: 'border-[#CFE4F3]',
    text: 'text-[#085579]',
    badgeBg: 'bg-[#D1E8F7]',
    badgeText: 'text-[#06425E]',
    chartFill: 'rgba(0, 102, 143, 0.12)',
    chartStroke: '#00668F',
  },
  purple: {
    bg: 'bg-[#F2EEFD]',
    border: 'border-[#DBD1FA]',
    text: 'text-[#4E3596]',
    badgeBg: 'bg-[#E0D5FA]',
    badgeText: 'text-[#3E2880]',
    chartFill: 'rgba(124, 58, 237, 0.12)',
    chartStroke: '#7C3AED',
  },
  green: {
    bg: 'bg-[#EBF7EE]',
    border: 'border-[#C8EAD0]',
    text: 'text-[#186635]',
    badgeBg: 'bg-[#CCEED4]',
    badgeText: 'text-[#114D27]',
    chartFill: 'rgba(16, 185, 129, 0.12)',
    chartStroke: '#10B981',
  },
  amber: {
    bg: 'bg-[#FFF7EB]',
    border: 'border-[#FDE0B5]',
    text: 'text-[#8A4C00]',
    badgeBg: 'bg-[#FEE5BF]',
    badgeText: 'text-[#6B3A00]',
    chartFill: 'rgba(243, 146, 0, 0.15)',
    chartStroke: '#F39200',
  },
};

export const PastelMetricCard: React.FC<PastelMetricCardProps> = ({
  color,
  label,
  value,
  subtitle,
  icon,
  badgeText,
  badgePositive = true,
  trendData = [40, 48, 45, 52, 50, 60, 58, 65, 70],
  onClick,
}) => {
  const styles = colorStyles[color];

  const width = 160;
  const height = 40;
  const max = Math.max(...trendData);
  const min = Math.min(...trendData);
  const range = max - min || 1;

  const points = trendData.map((val, idx) => {
    const x = (idx / (trendData.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 8) - 4;
    return `${x},${y}`;
  });

  const pathD = `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
  const lineD = `M ${points.join(' L ')}`;

  return (
    <div
      onClick={onClick}
      className={`relative p-3 sm:p-3.5 rounded-xl ${styles.bg} transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[110px] sm:min-h-[125px] hover:opacity-95`}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <button className="text-slate-400 hover:text-slate-700 transition-colors p-0.5 rounded-md">
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Cifra Grande */}
      <div className="my-0.5">
        <div className={`text-lg sm:text-2xl font-black tracking-tight ${styles.text}`}>
          {value}
        </div>
        {subtitle && <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium truncate mt-0.5">{subtitle}</p>}
      </div>

      {/* Pie con icono simétrico armonizado y micrográfica */}
      <div className="relative mt-1.5 flex items-end justify-between">
        <div className="flex items-center gap-1.5">
          {/* Inner icon R = 8px (rounded-lg) perfectamente armónico con Outer R = 12px y Padding 12px */}
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/90 flex items-center justify-center text-slate-700 shrink-0">
            {icon}
          </div>
          {badgeText && (
            <span
              className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md ${styles.badgeBg} ${styles.badgeText} truncate max-w-[80px] sm:max-w-none`}
            >
              {badgeText}
            </span>
          )}
        </div>

        {/* Micrográfica fluida */}
        <div className="w-16 sm:w-20 h-7 sm:h-8 opacity-75 shrink-0">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <path d={pathD} fill={styles.chartFill} />
            <path d={lineD} fill="none" stroke={styles.chartStroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

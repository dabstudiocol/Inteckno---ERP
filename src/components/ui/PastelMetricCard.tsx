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
    bg: 'bg-[#005273]',
    border: 'border-[#CFE4F3]',
    text: 'text-white',
    badgeBg: 'bg-white/20',
    badgeText: 'text-sky-200',
    chartFill: 'rgba(255, 255, 255, 0.2)',
    chartStroke: '#38BDF8',
  },
  purple: {
    bg: 'bg-[#4338CA]',
    border: 'border-[#DBD1FA]',
    text: 'text-white',
    badgeBg: 'bg-white/20',
    badgeText: 'text-indigo-200',
    chartFill: 'rgba(255, 255, 255, 0.2)',
    chartStroke: '#A5B4FC',
  },
  green: {
    bg: 'bg-[#047857]',
    border: 'border-[#C8EAD0]',
    text: 'text-white',
    badgeBg: 'bg-white/20',
    badgeText: 'text-emerald-200',
    chartFill: 'rgba(255, 255, 255, 0.2)',
    chartStroke: '#6EE7B7',
  },
  amber: {
    bg: 'bg-[#D97706]',
    border: 'border-[#FDE0B5]',
    text: 'text-white',
    badgeBg: 'bg-white/20',
    badgeText: 'text-amber-200',
    chartFill: 'rgba(255, 255, 255, 0.2)',
    chartStroke: '#FDE68A',
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
      className={`relative p-3.5 sm:p-4 rounded-2xl ${styles.bg} transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[118px] sm:min-h-[130px] hover:shadow-md hover:-translate-y-0.5`}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] sm:text-[11px] font-bold text-white/80 uppercase tracking-wider">{label}</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
          className="text-white/70 hover:text-white transition-colors p-0.5 rounded-md cursor-pointer"
          title="Ver detalle"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Cifra Grande */}
      <div className="my-0.5">
        <div className={`text-lg sm:text-2xl font-black tracking-tight ${styles.text}`}>
          {value}
        </div>
        {subtitle && <p className="text-[10px] sm:text-[11px] text-white/80 font-medium truncate mt-0.5">{subtitle}</p>}
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

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

const colorStyles: Record<
  PastelColor,
  {
    bg: string;
    text: string;
    labelColor: string;
    subColor: string;
    iconBox: string;
    badgeBg: string;
    badgeText: string;
    chartFill: string;
    chartStroke: string;
  }
> = {
  blue: {
    bg: 'bg-gradient-to-br from-[#D8EEFE] via-[#E3F3FF] to-[#CCE7FD]',
    text: 'text-[#033F6B]',
    labelColor: 'text-[#035388]',
    subColor: 'text-[#075985]',
    iconBox: 'bg-[#0284C7] text-white',
    badgeBg: 'bg-[#0284C7]/15',
    badgeText: 'text-[#03406A]',
    chartFill: 'rgba(2, 132, 199, 0.20)',
    chartStroke: '#0284C7',
  },
  purple: {
    bg: 'bg-gradient-to-br from-[#E5DEFF] via-[#EDE8FF] to-[#D9CEFF]',
    text: 'text-[#371B85]',
    labelColor: 'text-[#4C28B0]',
    subColor: 'text-[#5B21B6]',
    iconBox: 'bg-[#6D28D9] text-white',
    badgeBg: 'bg-[#6D28D9]/15',
    badgeText: 'text-[#3B188C]',
    chartFill: 'rgba(109, 40, 217, 0.20)',
    chartStroke: '#6D28D9',
  },
  green: {
    bg: 'bg-gradient-to-br from-[#CFF5E0] via-[#DCF8E9] to-[#BCEED3]',
    text: 'text-[#064E28]',
    labelColor: 'text-[#0A6836]',
    subColor: 'text-[#065F46]',
    iconBox: 'bg-[#059669] text-white',
    badgeBg: 'bg-[#059669]/15',
    badgeText: 'text-[#064E28]',
    chartFill: 'rgba(5, 150, 105, 0.20)',
    chartStroke: '#059669',
  },
  amber: {
    bg: 'bg-gradient-to-br from-[#FDE8C4] via-[#FEF0D6] to-[#FCDCA8]',
    text: 'text-[#703800]',
    labelColor: 'text-[#8F4700]',
    subColor: 'text-[#92400E]',
    iconBox: 'bg-[#D97706] text-white',
    badgeBg: 'bg-[#D97706]/15',
    badgeText: 'text-[#703800]',
    chartFill: 'rgba(217, 119, 6, 0.22)',
    chartStroke: '#D97706',
  },
};

export const PastelMetricCard: React.FC<PastelMetricCardProps> = ({
  color,
  label,
  value,
  subtitle,
  icon,
  badgeText,
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
      className={`relative p-4 sm:p-5 rounded-3xl ${styles.bg} transition-all duration-200 cursor-pointer flex flex-col justify-between overflow-hidden min-h-[126px] sm:min-h-[140px] hover:-translate-y-0.5`}
    >
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10.5px] sm:text-xs font-black uppercase tracking-wider ${styles.labelColor}`}>
          {label}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) onClick();
          }}
          className={`${styles.labelColor} opacity-75 hover:opacity-100 transition-opacity p-1 rounded-xl bg-white/50 cursor-pointer`}
          title="Ver detalle"
        >
          <MoreHorizontal size={15} />
        </button>
      </div>

      {/* Cifra Grande */}
      <div className="my-1">
        <div className={`text-xl sm:text-3xl font-black tracking-tight ${styles.text}`}>
          {value}
        </div>
        {subtitle && (
          <p className={`text-[11px] sm:text-xs ${styles.subColor} font-bold truncate mt-0.5`}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Pie con icono simétrico y micrográfica */}
      <div className="relative mt-2 flex items-end justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-2xl ${styles.iconBox} flex items-center justify-center shrink-0 [&_svg]:!text-white`}>
            {icon}
          </div>
          {badgeText && (
            <span
              className={`text-[10px] sm:text-[11px] font-black px-2.5 py-1 rounded-full ${styles.badgeBg} ${styles.badgeText} truncate max-w-[95px] sm:max-w-none`}
            >
              {badgeText}
            </span>
          )}
        </div>

        {/* Micrográfica fluida */}
        <div className="w-16 sm:w-20 h-7 sm:h-8 opacity-85 shrink-0">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <path d={pathD} fill={styles.chartFill} />
            <path d={lineD} fill="none" stroke={styles.chartStroke} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
};

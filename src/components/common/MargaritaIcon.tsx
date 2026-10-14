import React from 'react';

interface MargaritaIconProps {
  size?: number | string;
  className?: string;
  petalColor?: string;
  centerColor?: string;
}

/**
 * Ícono vectorial de Margarita (Daisy) estilizada para LUC-IA-NA
 * Respeta la armonía visual y proporciones del ERP de Inteckno
 */
export const MargaritaIcon: React.FC<MargaritaIconProps> = ({
  size = 24,
  className = '',
  petalColor = 'currentColor',
  centerColor = '#F59E0B',
}) => {
  const angles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 ${className}`}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="margarita-center" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </radialGradient>
        <filter id="margarita-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* 12 Pétalos radiales estilizados */}
      <g filter="url(#margarita-glow)">
        {angles.map((angle) => (
          <ellipse
            key={angle}
            cx="50"
            cy="19"
            rx="6.8"
            ry="14.5"
            fill={petalColor}
            transform={`rotate(${angle} 50 50)`}
            className="transition-colors duration-200"
          />
        ))}
      </g>

      {/* Centro brillante de la margarita (botón floral) */}
      <circle
        cx="50"
        cy="50"
        r="14"
        fill={centerColor === '#F59E0B' ? 'url(#margarita-center)' : centerColor}
      />
      <circle
        cx="46"
        cy="46"
        r="3.5"
        fill="#FEF08A"
        opacity="0.6"
      />
    </svg>
  );
};

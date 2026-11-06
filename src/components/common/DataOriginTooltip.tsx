import React, { useState } from 'react';
import { Info, ArrowRight, ShieldCheck, Database, User, Calendar } from 'lucide-react';

export interface DataOriginTrace {
  sourceModule: string; // ej. "RRHH (employees) / Timesheets"
  sourceEntityId?: string; // ej. "TS-2026-001"
  sourceUser?: string; // ej. "Supervisor Dairo Morales (USR-05)"
  sourceTimestamp?: string; // ej. "30/10/2026 14:30"
  targetModule: string; // ej. "Proyectos (costMatrix)"
  calculationLogic?: string; // ej. "10h @ $27.505/h (Ley 2101/2021) = $275.050 COP"
  status?: 'verified' | 'committed' | 'pending' | 'draft';
}

interface DataOriginTooltipProps {
  trace: DataOriginTrace;
  children?: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const DataOriginTooltip: React.FC<DataOriginTooltipProps> = ({
  trace,
  children,
  position = 'top',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {children}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        aria-label="Ver Trazabilidad y Origen del Dato"
        className="ml-1 p-0.5 rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors focus:outline-none cursor-pointer"
      >
        <Info size={13} className="shrink-0" />
      </button>

      {isOpen && (
        <div
          role="tooltip"
          className={`absolute z-50 w-72 p-3 bg-gray-900/95 backdrop-blur-md text-white text-xs rounded-xl shadow-xl border border-gray-800 transition-all pointer-events-none ${posClasses}`}
          style={{ fontFamily: "'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800">
            <span className="flex items-center gap-1.5 font-semibold text-blue-400 text-[11px] uppercase tracking-wider">
              <Database size={12} /> Autopista de Información
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-900/50 text-blue-300 border border-blue-700/50">
              <ShieldCheck size={9} /> Verificado
            </span>
          </div>

          {/* Minimapa de Trazabilidad: Origen -> Destino */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-gray-400 font-medium shrink-0">Origen:</span>
              <span className="text-gray-200 font-semibold truncate">{trace.sourceModule}</span>
            </div>

            <div className="flex items-center justify-center gap-2 py-0.5 text-blue-400 font-bold text-[10px]">
              <span className="h-px bg-gray-700 flex-1" />
              <ArrowRight size={11} className="shrink-0" />
              <span className="h-px bg-gray-700 flex-1" />
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-gray-400 font-medium shrink-0">Destino:</span>
              <span className="text-emerald-400 font-semibold truncate">{trace.targetModule}</span>
            </div>

            {/* Metadatos de Responsable y Timestamp */}
            <div className="pt-2 mt-2 border-t border-gray-800 space-y-1 text-[10px] text-gray-400">
              {trace.sourceEntityId && (
                <div className="flex items-center justify-between">
                  <span>ID Registro:</span>
                  <span className="font-mono text-gray-300">{trace.sourceEntityId}</span>
                </div>
              )}
              {trace.sourceUser && (
                <div className="flex items-center gap-1 text-gray-300">
                  <User size={10} className="shrink-0 text-gray-400" />
                  <span className="truncate">{trace.sourceUser}</span>
                </div>
              )}
              {trace.sourceTimestamp && (
                <div className="flex items-center gap-1 text-gray-400">
                  <Calendar size={10} className="shrink-0" />
                  <span>{trace.sourceTimestamp}</span>
                </div>
              )}
              {trace.calculationLogic && (
                <div className="p-1.5 mt-1 rounded bg-gray-800/80 text-gray-300 text-[10px] font-mono leading-tight">
                  {trace.calculationLogic}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

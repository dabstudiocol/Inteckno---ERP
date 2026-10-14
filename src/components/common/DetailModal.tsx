import React from 'react';
import { X, ExternalLink, Calendar, User, Tag, FileText, CheckCircle2 } from 'lucide-react';

export interface DetailField {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  isMono?: boolean;
  colSpan?: 1 | 2;
}

export interface DetailModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  badge?: {
    label: string;
    color?: string;
  };
  fields: DetailField[];
  onClose: () => void;
  actions?: React.ReactNode;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  title,
  subtitle,
  badge,
  fields,
  onClose,
  actions,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="space-y-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </h3>
              {badge && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {badge.label}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Field Grid */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {fields.map((f, idx) => (
              <div 
                key={idx}
                className={`p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 space-y-1 min-w-0 ${
                  f.colSpan === 2 ? 'sm:col-span-2' : ''
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {f.icon && <span className="text-[#00668F] shrink-0">{f.icon}</span>}
                  <span className="truncate">{f.label}</span>
                </div>
                <div className={`text-xs text-slate-800 dark:text-slate-100 break-words ${f.isMono ? 'font-mono' : ''}`}>
                  {f.value || <span className="text-slate-400 italic">No especificado</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div>{actions}</div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

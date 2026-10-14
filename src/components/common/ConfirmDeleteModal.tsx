import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  itemName?: string;
  requireConfirmWord?: boolean; // If true, requires typing 'BORRAR'
  confirmWord?: string; // Default 'BORRAR'
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  description = 'Esta acción no se puede deshacer. Se eliminará el registro de forma permanente de la base de datos.',
  itemName,
  requireConfirmWord = false,
  confirmWord = 'BORRAR',
  confirmText = 'Eliminar permanentemente',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [typedWord, setTypedWord] = useState('');

  useEffect(() => {
    if (isOpen) {
      setTypedWord('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isWordMatch = !requireConfirmWord || typedWord.trim().toUpperCase() === confirmWord.toUpperCase();

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
      onClick={onCancel}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/50 w-full max-w-md shadow-2xl overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con advertencia */}
        <div className="p-5 flex items-start gap-3 border-b border-rose-100 dark:border-rose-950/60 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h3 className="text-base font-bold text-rose-950 dark:text-rose-200 truncate">
              {title}
            </h3>
            {itemName && (
              <p className="text-xs font-mono font-medium text-rose-700 dark:text-rose-300 truncate mt-0.5">
                «{itemName}»
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido / Confirmación */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {description}
          </p>

          {requireConfirmWord && (
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300 block">
                Para confirmar la eliminación, escribe <span className="font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-1 py-0.5 rounded">{confirmWord}</span> a continuación:
              </label>
              <input
                type="text"
                value={typedWord}
                onChange={(e) => setTypedWord(e.target.value)}
                placeholder={`Escribe ${confirmWord}`}
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 uppercase tracking-wider"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={!isWordMatch || isLoading}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isLoading ? 'Eliminando...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

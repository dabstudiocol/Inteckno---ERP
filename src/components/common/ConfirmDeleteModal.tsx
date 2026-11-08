import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

export interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  message?: string;
  itemName?: string;
  requireConfirmWord?: boolean; // Default true: requires typing 'BORRAR'
  confirmWord?: string; // Default 'BORRAR'
  confirmText?: string;
  cancelText?: string;
  holdDurationMs?: number; // Default 2200ms (2.2 seconds hold-to-delete)
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  isLoading?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  title,
  description,
  message,
  itemName,
  requireConfirmWord = true,
  confirmWord = 'BORRAR',
  confirmText = 'Eliminar permanentemente',
  cancelText = 'Cancelar',
  holdDurationMs = 2200,
  onConfirm,
  onCancel,
  onClose,
  isLoading = false,
}) => {
  const handleCancel = onCancel || onClose || (() => {});
  const resolvedDescription =
    message ||
    description ||
    'Esta acción no se puede deshacer. Se eliminará el registro de forma permanente de la base de datos y de la nube.';

  const [typedWord, setTypedWord] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const [isHolding, setIsHolding] = useState(false);

  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const triggeredRef = useRef<boolean>(false);

  const stopHold = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    startTimeRef.current = null;
    setIsHolding(false);
    if (!triggeredRef.current) {
      setHoldProgress(0);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTypedWord('');
      setAcknowledged(false);
      setHoldProgress(0);
      setIsHolding(false);
      triggeredRef.current = false;
    } else {
      stopHold();
    }
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isOpen, stopHold]);

  const isWordMatch =
    !requireConfirmWord || typedWord.trim().toUpperCase() === confirmWord.toUpperCase();
  const isReadyToHold = isWordMatch && acknowledged && !isLoading;

  const startHold = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      if (!isReadyToHold || triggeredRef.current) return;

      setIsHolding(true);
      startTimeRef.current = performance.now();

      const tick = (now: number) => {
        if (!startTimeRef.current) return;
        const elapsed = now - startTimeRef.current;
        const pct = Math.min(100, Math.round((elapsed / holdDurationMs) * 100));
        setHoldProgress(pct);

        if (elapsed >= holdDurationMs) {
          triggeredRef.current = true;
          setIsHolding(false);
          setHoldProgress(100);
          onConfirm();
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },
    [isReadyToHold, holdDurationMs, onConfirm]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fadeIn"
      onClick={handleCancel}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md overflow-hidden animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header con advertencia de seguridad */}
        <div className="p-5 flex items-start gap-3.5 bg-rose-50/80 dark:bg-rose-950/30">
          <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-200/80 text-rose-900">
                Protocolo de Seguridad Crítica
              </span>
            </div>
            <h3 className="text-base font-extrabold text-rose-950 dark:text-rose-200 truncate mt-1">
              {title}
            </h3>
            {itemName && (
              <p className="text-xs font-mono font-bold text-rose-700 dark:text-rose-300 truncate mt-0.5">
                «{itemName}»
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleCancel}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido / Triple Validación */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {resolvedDescription}
          </p>

          {/* PASO 1: Escribir palabra BORRAR */}
          {requireConfirmWord && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-[#EEF3F9] dark:bg-slate-800/60">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200 block">
                  1. Escribe{' '}
                  <span className="font-mono font-extrabold text-rose-600 bg-rose-100/90 px-1.5 py-0.5 rounded-md">
                    {confirmWord}
                  </span>{' '}
                  para desbloquear:
                </label>
                {isWordMatch && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Validado
                  </span>
                )}
              </div>
              <input
                type="text"
                value={typedWord}
                onChange={(e) => setTypedWord(e.target.value)}
                placeholder={`Escribe ${confirmWord} aquí...`}
                className="w-full px-3.5 py-2.5 text-xs font-mono font-extrabold rounded-xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none uppercase tracking-widest"
                autoFocus
              />
            </div>
          )}

          {/* PASO 2: Casilla de Confirmación Consciente */}
          <label
            className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all select-none ${
              isWordMatch
                ? 'bg-rose-50/70 hover:bg-rose-50 cursor-pointer'
                : 'bg-slate-100/70 opacity-60 cursor-not-allowed'
            }`}
          >
            <input
              type="checkbox"
              disabled={!isWordMatch}
              checked={acknowledged}
              onChange={(e) => {
                setAcknowledged(e.target.checked);
                if (!e.target.checked) {
                  stopHold();
                }
              }}
              className="mt-0.5 w-4 h-4 rounded accent-rose-600 cursor-pointer shrink-0"
            />
            <div className="text-[11px] leading-snug text-slate-700 dark:text-slate-300">
              <span className="font-extrabold text-rose-950 dark:text-rose-200 block">
                2. Confirmación de eliminación irreversible
              </span>
              <span>
                Comprendo que este registro y sus vínculos asociados serán eliminados de forma permanente del ERP y de la nube.
              </span>
            </div>
          </label>

          {/* PASO 3: Instrucción de Mantener Presionado + Barra de Progreso Visual */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>3. Mantén presionado el botón rojo durante 2 segundos:</span>
              </span>
              <span
                className={`font-mono font-extrabold ${
                  holdProgress > 0 ? 'text-rose-600' : 'text-slate-400'
                }`}
              >
                {holdProgress}%
              </span>
            </div>

            {/* Barra de carga independiente de alta visibilidad */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-red-600 to-rose-700 transition-none rounded-full"
                style={{ width: `${holdProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Acciones: Cancelar + Botón Hold-to-Delete con Carga Interna */}
        <div className="p-4 bg-slate-50/90 dark:bg-slate-900/80 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={() => {
              stopHold();
              handleCancel();
            }}
            disabled={isLoading}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold rounded-2xl text-slate-700 dark:text-slate-300 bg-slate-200/70 hover:bg-slate-300/80 transition-colors text-center cursor-pointer"
          >
            {cancelText}
          </button>

          <button
            type="button"
            disabled={!isReadyToHold}
            onMouseDown={startHold}
            onMouseUp={stopHold}
            onMouseLeave={stopHold}
            onTouchStart={startHold}
            onTouchEnd={stopHold}
            onTouchCancel={stopHold}
            onContextMenu={(e) => e.preventDefault()}
            className={`relative overflow-hidden w-full sm:w-auto min-w-[215px] px-5 py-2.5 text-xs font-extrabold rounded-2xl text-white flex items-center justify-center gap-2 transition-all select-none ${
              isReadyToHold
                ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer active:scale-[0.99]'
                : 'bg-slate-300 text-slate-500 opacity-60 cursor-not-allowed'
            }`}
          >
            {/* Relleno animado de carga mientras se mantiene presionado */}
            {holdProgress > 0 && (
              <span
                className="absolute inset-y-0 left-0 bg-rose-900/55 pointer-events-none transition-none"
                style={{ width: `${holdProgress}%` }}
              />
            )}

            <span className="relative z-10 flex items-center justify-center gap-1.5">
              {!isReadyToHold ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Completa los pasos 1 y 2</span>
                </>
              ) : isLoading || holdProgress >= 100 ? (
                <>
                  <Trash2 className="w-3.5 h-3.5 animate-bounce" />
                  <span>¡Eliminando registro!</span>
                </>
              ) : isHolding ? (
                <>
                  <Trash2 className="w-3.5 h-3.5 animate-pulse" />
                  <span>Mantén presionado... {holdProgress}%</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Mantener presionado: {confirmText}</span>
                </>
              )}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

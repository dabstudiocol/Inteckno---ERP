import React, { useState } from 'react';
import { AlertTriangle, Trash2, X, ShieldAlert, CheckCircle2, Lock } from 'lucide-react';

interface ClearInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productsCount: number;
  onConfirmClear: () => Promise<void> | void;
}

export const ClearInventoryModal: React.FC<ClearInventoryModalProps> = ({
  isOpen,
  onClose,
  productsCount,
  onConfirmClear,
}) => {
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [acknowledgedRisk, setAcknowledgedRisk] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const REQUIRED_PHRASE = 'BORRAR INVENTARIO';
  const isPhraseExact = confirmationPhrase.trim() === REQUIRED_PHRASE;
  const canDelete = isPhraseExact && acknowledgedRisk && !isDeleting;

  const handleConfirm = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    try {
      await onConfirmClear();
      setConfirmationPhrase('');
      setAcknowledgedRisk(false);
      onClose();
    } catch (error) {
      console.error('Error al vaciar inventario:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (isDeleting) return;
    setConfirmationPhrase('');
    setAcknowledgedRisk(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] p-3 sm:p-6 overflow-y-auto flex items-center justify-center bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Cabecera de Alerta Crítica */}
        <div className="flex items-center justify-between px-5 py-4 bg-rose-600 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <ShieldAlert size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-wide">
                Verificación de Seguridad Crítica
              </h3>
              <p className="text-[11px] text-rose-100 font-medium">
                Acción destructiva e irreversible en la base de datos
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleCancel}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors disabled:opacity-50"
            title="Cancelar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Contenido / Cuerpo con Scroll Elástico */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* Tarjeta de Impacto Numérico */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
            <AlertTriangle size={22} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-rose-950 text-sm">
                ¿Estás seguro de eliminar los datos de inventario?
              </p>
              <p className="text-rose-800 leading-relaxed">
                Esta acción eliminará de forma permanente los{' '}
                <strong className="font-black text-rose-900 underline">
                  {productsCount.toLocaleString('es-CO')} artículos
                </strong>{' '}
                actualmente almacenados en el ERP.
              </p>
            </div>
          </div>

          <div className="space-y-2 text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <p className="font-semibold text-slate-900">
              ¿Qué ocurrirá al confirmar?
            </p>
            <ul className="list-disc pl-4 space-y-1 text-slate-600">
              <li>El catálogo de artículos quedará completamente en <strong>cero (0)</strong>.</li>
              <li>Podrás cargar desde cero un archivo Excel limpio una sola vez con los datos oficiales.</li>
              <li>A partir de allí, todas las entradas, salidas y existencias se controlarán 100% dentro del ERP.</li>
              <li>Se registrará un evento de auditoría de seguridad con tu usuario y fecha.</li>
            </ul>
          </div>

          {/* Blindaje Poka-Yoke: Doble Verificación Obligatoria */}
          <div className="space-y-3 pt-2">
            
            {/* Paso 1: Aceptación de Riesgo */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition-colors select-none">
              <input
                type="checkbox"
                checked={acknowledgedRisk}
                onChange={(e) => setAcknowledgedRisk(e.target.checked)}
                disabled={isDeleting}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 border-slate-300 focus:ring-rose-500 cursor-pointer"
              />
              <span className="text-slate-800 font-medium">
                Confirmo que deseo vaciar todo el catálogo de artículos y entiendo que esta acción no se puede deshacer.
              </span>
            </label>

            {/* Paso 2: Frase de Seguridad Exacta */}
            <div className="space-y-1.5">
              <label className="block font-bold text-slate-800">
                Escribe exactamente <span className="font-mono text-rose-600 font-black px-1.5 py-0.5 rounded bg-rose-50 border border-rose-200">{REQUIRED_PHRASE}</span> para desbloquear:
              </label>
              <input
                type="text"
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value.toUpperCase())}
                disabled={isDeleting}
                placeholder="Escribe BORRAR INVENTARIO..."
                className={`w-full h-10 px-3 rounded-xl border font-mono font-bold text-xs tracking-wider transition-all focus:outline-hidden ${
                  isPhraseExact
                    ? 'border-emerald-500 bg-emerald-50/40 text-emerald-900'
                    : 'border-slate-300 bg-white text-slate-900 focus:border-rose-500'
                }`}
              />
              {isPhraseExact && (
                <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 mt-1">
                  <CheckCircle2 size={13} />
                  <span>Frase de seguridad validada correctamente.</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer con Botones de Acción */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isDeleting}
            onClick={handleCancel}
            className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 text-xs cursor-pointer transition-colors disabled:opacity-50"
          >
            Cancelar y Conservar Datos
          </button>
          <button
            type="button"
            disabled={!canDelete}
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all ${
              canDelete
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200 active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Vaciando Inventario...</span>
              </>
            ) : canDelete ? (
              <>
                <Trash2 size={15} />
                <span>Confirmar y Vaciar Todo</span>
              </>
            ) : (
              <>
                <Lock size={14} />
                <span>Bloqueado por Seguridad</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

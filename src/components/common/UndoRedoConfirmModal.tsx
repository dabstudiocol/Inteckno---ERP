import React from 'react';
import { Undo2, Redo2, AlertCircle, Clock, User, X, Check } from 'lucide-react';
import { UserUndoAction } from '../../core/services/undoRedoService';

interface Props {
  isOpen: boolean;
  mode: 'undo' | 'redo';
  action: UserUndoAction | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const UndoRedoConfirmModal: React.FC<Props> = ({
  isOpen,
  mode,
  action,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !action) return null;

  const isUndo = mode === 'undo';

  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'create':
        return isUndo ? 'Eliminará el registro recién creado' : 'Volverá a crear el registro';
      case 'delete':
        return isUndo ? 'Restaurará el registro que habías eliminado' : 'Volverá a eliminar el registro';
      case 'update':
        return isUndo ? 'Revertirá los campos a los valores previos' : 'Reaplicará la última edición';
      default:
        return 'Revertirá la operación';
    }
  };

  const getCollectionLabel = (coll: string) => {
    switch (coll) {
      case 'requisitions':
        return 'Peticiones de Compra (SOLPED)';
      case 'purchaseOrders':
        return 'Órdenes de Compra (OC)';
      case 'expenses':
        return 'Legalización de Gastos & Viáticos';
      case 'timesheets':
        return 'Registro de Horas (Timesheet)';
      case 'projects':
        return 'Proyectos STC';
      case 'tasks':
        return 'Cronograma WBS & Actividades';
      case 'products':
        return 'Inventario & Almacén';
      case 'documents':
        return 'Gestión Documental & Planos';
      case 'opportunities':
        return 'CRM & Oportunidades';
      case 'contacts':
        return 'Directorio de Contactos';
      case 'todos':
        return 'Actividades Pendientes';
      default:
        return coll;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] p-3 sm:p-6 overflow-y-auto flex items-center justify-center bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado */}
        <div
          className={`px-5 py-4 flex items-center justify-between text-white shrink-0 ${
            isUndo ? 'bg-[#003650]' : 'bg-emerald-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              {isUndo ? <Undo2 size={20} /> : <Redo2 size={20} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isUndo ? '¿Deshacer tu último cambio?' : '¿Rehacer este cambio?'}
              </h3>
              <p className="text-xs text-slate-300">
                Historial aislado de tu cuenta ({action.userName})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo / Detalle de la Acción */}
        <div className="p-5 space-y-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <Clock size={13} className="text-[#00668F]" />
                <span>Hora: {action.timestamp}</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white font-bold text-[#00668F] border border-slate-200">
                {getCollectionLabel(action.collection)}
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                ACCIÓN A {isUndo ? 'DESHACER' : 'REHACER'}:
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                {action.description}
              </h4>
              <p className="text-slate-600 mt-1 font-medium">
                Elemento: <strong>{action.entityName}</strong>
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white border border-slate-200 text-slate-700 flex items-start gap-2">
              <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong>Efecto en el sistema:</strong> {getActionTypeLabel(action.actionType)}.
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed bg-sky-50/60 p-3 rounded-xl border border-sky-100 flex items-start gap-2">
            <User size={14} className="text-[#00668F] shrink-0 mt-0.5" />
            <span>
              <strong>Protección multiusuario:</strong> Esta operación solo revierte la acción que tú ejecutaste. Ningún cambio realizado por otros colaboradores de Inteckno será alterado.
            </span>
          </div>
        </div>

        {/* Pie de Acciones */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200 font-bold transition-colors cursor-pointer text-center text-xs"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-white shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 text-xs ${
              isUndo
                ? 'bg-[#003650] hover:bg-[#00273a]'
                : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
          >
            <Check size={14} />
            <span>{isUndo ? 'Sí, Deshacer Cambio' : 'Sí, Rehacer Cambio'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

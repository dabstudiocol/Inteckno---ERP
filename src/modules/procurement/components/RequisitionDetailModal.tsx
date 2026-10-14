import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  User,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Send,
  Plus,
  Trash2,
  Building,
  Save,
  Tag,
  Clock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { InternalRequisition, InternalRequisitionItem } from '../../../types';
import { useErp } from '../../../core/storage/erpStore';
import { useModuleCatalog } from '../../../core/services/moduleConfigService';

interface RequisitionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: InternalRequisition | null;
}

export const RequisitionDetailModal: React.FC<RequisitionDetailModalProps> = ({
  isOpen,
  onClose,
  requisition,
}) => {
  const { updateRequisition, notify, currentUser, users } = useErp();

  // Catálogos dinámicos configurables por el usuario
  const urgencyOptions = useModuleCatalog('requisitions', 'urgencies');
  const requisitionTypeOptions = useModuleCatalog('requisitions', 'requisitionTypes');

  // Lista de aprobadores reconocidos (Clemencia, Wilson, Gustavo y líderes)
  const approverOptions = useMemo(() => {
    const keyApprovers = [
      { id: 'USR-04', name: 'Clemencia García Moncada', shortName: 'Clemencia', role: 'Gerente Administrativa & Financiera' },
      { id: 'USR-18', name: 'Wilson Albeiro Alzate Correa', shortName: 'Wilson', role: 'Director de Operaciones & Proyectos' },
      { id: 'USR-07', name: 'Gustavo Alberto Mejía Tobón', shortName: 'Gustavo', role: 'Gerente General & Comercial' },
    ];
    (users || []).forEach((u) => {
      if (!keyApprovers.some((a) => a.id === u.id || a.name.toLowerCase() === u.name.toLowerCase())) {
        if (
          u.role.includes('gerente') ||
          u.role.includes('director') ||
          u.role.includes('admin') ||
          u.role.includes('lider') ||
          u.role.includes('coord')
        ) {
          keyApprovers.push({
            id: u.id,
            name: u.name,
            shortName: u.name.split(' ')[0],
            role: u.roleLabel || u.department || 'Líder de Área',
          });
        }
      }
    });
    return keyApprovers;
  }, [users]);

  const [items, setItems] = useState<InternalRequisitionItem[]>([]);
  const [priority, setPriority] = useState<string>('Normal');
  const [requisitionType, setRequisitionType] = useState<string>('');
  const [neededDate, setNeededDate] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedApproverId, setSelectedApproverId] = useState<string>('USR-18');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (requisition) {
      setItems(
        requisition.items && requisition.items.length > 0
          ? JSON.parse(JSON.stringify(requisition.items))
          : []
      );
      setPriority(requisition.priority || (urgencyOptions[0]?.name || 'Normal'));
      setRequisitionType(requisition.requisitionType || (requisitionTypeOptions[0]?.name || ''));
      setNeededDate(requisition.neededDate || new Date().toISOString().split('T')[0]);
      setNotes(requisition.notes || '');

      // Selección inteligente del aprobador:
      if (requisition.targetApproverId) {
        setSelectedApproverId(requisition.targetApproverId);
      } else if (
        requisition.projectCode === 'OFICINA-ADMIN' ||
        requisition.projectName?.toLowerCase().includes('oficina') ||
        requisition.department?.toLowerCase().includes('sistemas') ||
        requisition.department?.toLowerCase().includes('admin')
      ) {
        // Insumos generales, TI, oficina -> Clemencia García
        setSelectedApproverId('USR-04');
      } else {
        // Proyectos de ingeniería o campo STC -> Wilson Alzate
        setSelectedApproverId('USR-18');
      }
    }
  }, [requisition, urgencyOptions, requisitionTypeOptions]);

  if (!isOpen || !requisition) return null;

  const handleItemChange = (index: number, field: keyof InternalRequisitionItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleAddItem = () => {
    const newItem: InternalRequisitionItem = {
      productId: `REQ-ITEM-${Date.now()}`,
      productSku: `ITK-SOL-${items.length + 1}`,
      productName: '',
      measures: '',
      unit: 'unid',
      qtyRequested: 1,
      inStock: false,
      availableStock: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      notify('warning', 'Mínimo un ítem', 'La petición debe contener al menos un renglón de material o insumo.');
      return;
    }
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
  };

  const currentApprover = approverOptions.find((a) => a.id === selectedApproverId) || approverOptions[0];

  const handleSaveChanges = (
    newStatus?: InternalRequisition['status'],
    approver?: typeof approverOptions[0]
  ) => {
    if (!requisition) return;
    if (items.length === 0) {
      notify('warning', 'Sin ítems', 'No puedes guardar una petición vacía.');
      return;
    }

    const hasEmptyNames = items.some((it) => !it.productName || !it.productName.trim());
    if (hasEmptyNames) {
      notify('warning', 'Campos obligatorios', 'Todos los ítems deben tener descripción o nombre del material.');
      return;
    }

    setIsSubmitting(true);
    const updatedData: Partial<InternalRequisition> = {
      items,
      priority,
      requisitionType,
      neededDate,
      notes,
    };

    if (newStatus) {
      if (newStatus === 'pending_approval' && approver) {
        // Compatibilidad con Wilson y soporte universal para Clemencia, Gustavo u otros
        updatedData.status = approver.id === 'USR-18' ? 'pending_wilson_approval' : 'pending_approval';
        updatedData.targetApproverId = approver.id;
        updatedData.targetApproverName = approver.name;
      } else {
        updatedData.status = newStatus;
      }
    }

    updateRequisition(requisition.id, updatedData);

    if (newStatus === 'pending_approval' && approver) {
      notify(
        'urgent',
        `Notificación Enviada a ${approver.name}`,
        `La petición ${requisition.reqNumber} fue remitida a ${approver.name} (${approver.role}) para su revisión y aprobación formal.`
      );
    } else {
      notify('success', 'Petición Actualizada', `Se guardaron las modificaciones de ${requisition.reqNumber}.`);
    }

    setIsSubmitting(false);
    onClose();
  };

  const handleNotifyApprover = () => {
    handleSaveChanges('pending_approval', currentApprover);
  };

  const handleApproveByLeader = (approverName?: string) => {
    const approverText = approverName || currentUser?.name || 'Dirección / Gerencia';
    updateRequisition(requisition!.id, {
      status: 'approved',
      approvedBy: approverText,
      approvedAt: new Date().toISOString(),
    });
    notify(
      'success',
      'Petición Aprobada',
      `${requisition!.reqNumber} ha sido aprobada por ${approverText} y está lista para trámite de cotización y compra.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Cabecera Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#003650] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
              <FileText size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Petición de Compra: {requisition.reqNumber}
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    requisition.status === 'pending_wilson_approval'
                      ? 'bg-amber-400 text-slate-950'
                      : requisition.status === 'approved'
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-white/20 text-white'
                  }`}
                >
                  {requisition.status === 'pending_wilson_approval'
                    ? 'Esperando Visto Bueno de Wilson Alzate'
                    : requisition.status === 'approved'
                    ? 'Aprobada'
                    : requisition.status === 'submitted'
                    ? 'Radicada'
                    : requisition.status}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Consulta los requerimientos, edita cantidades o especificaciones y remite para aprobación.
              </p>
            </div>
          </div>

          {/* Botón de cerrar - Círculo perfecto */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido Desplazable */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* Ficha Resumen de la Petición */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Solicitante
              </span>
              <div className="font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <User size={13} className="text-[#00668F]" />
                <span>{requisition.requesterName}</span>
              </div>
              <span className="text-[11px] text-slate-500">
                Área: {requisition.department || 'Operaciones'}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Destino / Imputación
              </span>
              <div className="font-bold text-[#003650] mt-0.5 flex items-center gap-1.5">
                <Building size={13} className="text-[#00668F]" />
                <span>{requisition.projectCode ? requisition.projectCode : 'Insumos Generales'}</span>
              </div>
              <span className="text-[11px] text-slate-600 line-clamp-1">
                {requisition.projectName || 'Oficina y Mantenimiento'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                  Fecha Requerida
                </label>
                <input
                  type="date"
                  value={neededDate}
                  onChange={(e) => setNeededDate(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-medium text-slate-800 text-xs focus:outline-hidden focus:border-[#003650]"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                  Tipo de Requisición
                </label>
                <select
                  value={requisitionType}
                  onChange={(e) => setRequisitionType(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-bold text-xs focus:outline-hidden focus:border-[#003650]"
                >
                  {requisitionTypeOptions.length > 0 ? (
                    requisitionTypeOptions.map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Repuesto Crítico STC">Repuesto Crítico STC</option>
                      <option value="Herramienta e Instrumentación">Herramienta e Instrumentación</option>
                      <option value="EPP y Alturas">EPP y Alturas</option>
                      <option value="Insumo y Consumible Químico">Insumo y Consumible Químico</option>
                      <option value="Servicio Externo de Taller">Servicio Externo de Taller</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                  Nivel de Urgencia
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-bold text-xs focus:outline-hidden focus:border-[#003650]"
                >
                  {urgencyOptions.length > 0 ? (
                    urgencyOptions.map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Inmediata (Parada de Operación STC)">Inmediata (Parada de Operación STC)</option>
                      <option value="Alta (Requerida ≤ 24 Horas)">Alta (Requerida ≤ 24 Horas)</option>
                      <option value="Normal (Atención en Ventana Regular)">Normal (Atención en Ventana Regular)</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* Alerta si está pendiente de aprobación (Wilson, Clemencia, Gustavo u otro líder) */}
          {(requisition.status === 'pending_wilson_approval' || requisition.status === 'pending_approval') && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
              <div className="flex items-center gap-2.5">
                <Clock size={18} className="text-amber-600 shrink-0" />
                <div>
                  <div className="font-bold text-xs">
                    Pendiente de Aprobación por {requisition.targetApproverName || 'Wilson Albeiro Alzate'}
                  </div>
                  <div className="text-[11px] text-amber-800">
                    Se notificó a {requisition.targetApproverName || 'Wilson Alzate'} para validar justificación, especificaciones técnicas y presupuesto.
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleApproveByLeader(requisition.targetApproverName)}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 cursor-pointer flex items-center gap-1.5 shadow-2xs transition-colors self-end sm:self-auto"
              >
                <CheckCircle2 size={14} />
                <span>Dar Visto Bueno (Aprobar)</span>
              </button>
            </div>
          )}

          {/* Tabla de Ítems / Materiales Solicitados */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">
                  Materiales e Insumos de la Petición ({items.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  Puedes editar descripciones, referencias o cantidades directamente.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#003650] font-bold text-xs border border-sky-200 transition-colors cursor-pointer"
              >
                <Plus size={13} />
                <span>Agregar Ítem</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
              <div className="grid grid-cols-12 bg-slate-100 p-2.5 font-bold text-slate-700 text-[11px] border-b border-slate-200">
                <div className="col-span-3">SKU / Ref</div>
                <div className="col-span-4">Descripción del Material</div>
                <div className="col-span-2">Medidas / Especificación</div>
                <div className="col-span-1 text-center">Unidad</div>
                <div className="col-span-1 text-center">Cant.</div>
                <div className="col-span-1 text-center">Acción</div>
              </div>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {items.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-slate-50/60">
                    <div className="col-span-3">
                      <input
                        type="text"
                        value={item.productSku || ''}
                        onChange={(e) => handleItemChange(idx, 'productSku', e.target.value)}
                        placeholder="SKU"
                        className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-mono font-bold text-xs"
                      />
                    </div>

                    <div className="col-span-4">
                      <input
                        type="text"
                        required
                        value={item.productName || ''}
                        onChange={(e) => handleItemChange(idx, 'productName', e.target.value)}
                        placeholder="Nombre o descripción..."
                        className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white font-medium text-xs"
                      />
                    </div>

                    <div className="col-span-2">
                      <input
                        type="text"
                        value={item.measures || ''}
                        onChange={(e) => handleItemChange(idx, 'measures', e.target.value)}
                        placeholder="Medidas (opcional)"
                        className="w-full h-8 px-2 rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>

                    <div className="col-span-1">
                      <input
                        type="text"
                        value={item.unit || 'unid'}
                        onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                        className="w-full h-8 px-1 text-center rounded-lg border border-slate-300 bg-white font-bold text-xs"
                      />
                    </div>

                    <div className="col-span-1">
                      <input
                        type="number"
                        min="1"
                        value={item.qtyRequested || 1}
                        onChange={(e) => handleItemChange(idx, 'qtyRequested', Number(e.target.value) || 1)}
                        className="w-full h-8 px-1 text-center font-mono font-bold rounded-lg border border-slate-300 bg-white text-xs"
                      />
                    </div>

                    <div className="col-span-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1 cursor-pointer transition-colors"
                        title="Eliminar ítem"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Notas / Observaciones */}
          <div>
            <label className="block font-bold text-slate-700 mb-1 text-xs">
              Observaciones y Justificación de la Petición:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles sobre urgencia, destino en obra o especificaciones requeridas..."
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-[#003650]"
            />
          </div>

        </div>

        {/* Footer con Acciones */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <div className="text-[11px] text-slate-500 font-medium">
            Fecha de Creación: <span className="font-mono text-slate-700">{requisition.createdAt}</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 text-xs cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={() => handleSaveChanges()}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Save size={14} />
              <span>Guardar Cambios</span>
            </button>

            {/* SELECTOR DE APROBADOR Y NOTIFICACIÓN FORMAL */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-600 pl-2">Aprobador:</span>
              <select
                value={selectedApproverId}
                onChange={(e) => setSelectedApproverId(e.target.value)}
                className="h-8 px-2 rounded-lg border border-slate-300 bg-white font-bold text-xs text-slate-900 focus:outline-hidden"
              >
                {approverOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.shortName} ({a.role})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNotifyApprover}
                disabled={isSubmitting}
                className="px-3.5 py-1.5 rounded-lg bg-[#003650] hover:bg-[#00283c] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all whitespace-nowrap"
                title={`Notificar formalmente a ${currentApprover.name}`}
              >
                <Send size={13} />
                <span>Notificar a {currentApprover.shortName}</span>
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

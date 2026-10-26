import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  FileText,
  DollarSign,
  Scissors,
  CheckCircle2,
  Building2,
  Package,
  Settings,
} from 'lucide-react';
import {
  Product,
  PhysicalCableSegment,
  InventoryWriteOffRequest,
  InventoryWriteOffReason,
} from '../../../types';
import { useErp } from '../../../core/storage/erpStore';
import { formatCOP } from '../../../core/services/trmService';

interface InventoryWriteOffModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  tramo?: PhysicalCableSegment | null;
  onSuccess?: () => void;
}

export const InventoryWriteOffModal: React.FC<InventoryWriteOffModalProps> = ({
  isOpen,
  onClose,
  product,
  tramo,
  onSuccess,
}) => {
  const { projects, currentUser, notify } = useErp();

  const [motivo, setMotivo] = useState<InventoryWriteOffReason>('RETAZO_INUTILIZABLE');
  const [destinacion, setDestinacion] = useState<'BAJA_DEFINITIVA' | 'REASIGNAR_ESLINGAS_IZAJE'>('BAJA_DEFINITIVA');
  const [cantidad, setCantidad] = useState<number>(tramo?.longitudMetros || 1);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(() => projects[0]?.id || '');
  const [descripcion, setDescripcion] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Auto-selección rápida de Centro de Costos si está vacío
  React.useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  if (!isOpen || !product) return null;

  const unitCost = product.costPriceCOP || 0;
  const valorTotalCOP = cantidad * unitCost;

  // Encontrar proyecto seleccionado
  const selectedProj = projects.find((p) => p.id === selectedProjectId);
  const projectCode = selectedProj?.code || selectedProj?.id || 'CENTRO_COSTOS_GENERAL';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cantidad <= 0) {
      notify?.('warning', 'Cantidad Inválida', 'La cantidad a dar de baja debe ser mayor a 0');
      return;
    }

    if (!descripcion.trim()) {
      notify?.('warning', 'Justificación Requerida', 'Debes ingresar una justificación técnica detallada para la baja');
      return;
    }

    setIsSubmitting(true);
    try {
      const nuevaSolicitud: InventoryWriteOffRequest = {
        id: `BAJA-${Date.now()}`,
        codigoSolicitud: `BAJA-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        fechaSolicitud: new Date().toISOString().split('T')[0],
        solicitanteId: currentUser?.id || 'usr_solicitante',
        solicitanteNombre: currentUser?.name || 'Responsable de Almacén',
        solicitanteCargo: currentUser?.roleLabel || 'Ingeniero de Operaciones',
        productId: product.id,
        productSku: product.sku,
        productName: product.name,
        idTramo: tramo?.idTramo,
        longitudMetros: tramo?.longitudMetros,
        cantidad,
        unidad: tramo ? 'metros' : product.unit,
        valorEstimadoCOP: valorTotalCOP,
        motivo,
        descripcionDetallada: `[DESTINO: ${destinacion === 'REASIGNAR_ESLINGAS_IZAJE' ? 'REASIGNACIÓN PARA ESLINGAS / ESTROBOS DE IZAJE EN MONTAJE DE TELEFÉRICOS' : 'BAJA DEFINITIVA / CHATARRA'}] ${descripcion.trim()}`,
        centroCostosProyectoId: selectedProj?.id,
        centroCostosProyectoCodigo: projectCode,
        estado: 'PENDIENTE_APROBACION_GERENCIA',
      };

      // Guardar en localStorage / sincronizar con ERP store
      const storageKey = 'inteckno_inventory_write_offs';
      const existingRaw = localStorage.getItem(storageKey);
      const writeOffsList: InventoryWriteOffRequest[] = existingRaw ? JSON.parse(existingRaw) : [];
      writeOffsList.unshift(nuevaSolicitud);
      localStorage.setItem(storageKey, JSON.stringify(writeOffsList));

      // Despachar evento para sincronización reactiva en tiempo real
      window.dispatchEvent(new CustomEvent('inteckno:inventory-write-off-created', { detail: nuevaSolicitud }));

      notify?.(
        'success',
        'Solicitud Enviada',
        `Solicitud ${nuevaSolicitud.codigoSolicitud} enviada. Queda en estado PENDIENTE DE APROBACIÓN POR GERENCIA y no afectará el stock hasta su visto bueno.`
      );

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error registrando baja de inventario:', err);
      notify?.('urgent', 'Error en Solicitud', 'Error al registrar la solicitud de baja de inventario');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* ENCABEZADO */}
        <div className="p-4 sm:p-5 bg-rose-900 text-white flex items-start justify-between relative shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-black px-2 py-0.5 rounded-md bg-white/20 text-white tracking-wider">
                BAJA DE INVENTARIO
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-rose-500/40 text-rose-100 font-bold">
                Kardex Transaccional
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-1.5 text-white leading-tight flex items-center gap-2">
              <Scissors size={20} className="text-rose-300" />
              Solicitud de Baja por Merma / Daño
            </h2>
            <p className="text-xs text-rose-200 mt-1">
              {product.name} ({product.sku})
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('inteckno:open-module-config', { detail: { moduleId: 'almacen' } }));
              }}
              title="Configurar Opciones y Catálogos de Almacén"
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-rose-200 hover:text-white transition-colors cursor-pointer"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ALERTA DE GOBERNANZA */}
        <div className="bg-amber-50 border-b border-amber-200 p-3 flex items-start gap-2.5 text-xs text-amber-900 shrink-0">
          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Regla de Aprobación de Gerencia:</strong>
            <p className="text-[11px] mt-0.5 text-amber-800">
              Esta solicitud se registrará en estado <strong>PENDIENTE DE APROBACIÓN POR GERENCIA</strong> y afectará contablemente al Centro de Costos seleccionado. Las existencias físicas no serán descontadas hasta la aprobación formal de la Dirección.
            </p>
          </div>
        </div>

        {/* FORMULARIO */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs text-gray-800">
          
          {/* Tramo Físico si aplica */}
          {tramo && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[11px] font-bold text-gray-500 uppercase block">Tramo Físico Identificado:</span>
              <div className="flex items-center justify-between mt-1">
                <span className="font-mono font-bold text-gray-900 text-sm">{tramo.idTramo}</span>
                <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  {tramo.longitudMetros} metros (Carrete: {tramo.carreteNumero || 'S/N'})
                </span>
              </div>
            </div>
          )}

          {/* Motivo de la baja */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Motivo Técnico de la Baja:
            </label>
            <select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as InventoryWriteOffReason)}
              className="w-full p-2.5 border border-gray-300 rounded-xl font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F]"
            >
              <option value="RETAZO_INUTILIZABLE">Retazo Inutilizable (Cables STC cortados no empalmables)</option>
              <option value="DAÑO_MONTAÑA">Daño en Operación de Montaña / Tracción Mecánica</option>
              <option value="CADUCIDAD_QUIMICO">Caducidad de Químico END / Lubricante (Vencimiento FEFO)</option>
              <option value="OBSOLESCENCIA">Obsolescencia Técnica / Cambio de Norma</option>
              <option value="DESGASTE_NORMAL">Desgaste Excesivo Fuera de Tolerancia Técnica</option>
            </select>
          </div>

          {/* Destino Final del Material */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Destino / Tratamiento del Material:
            </label>
            <select
              value={destinacion}
              onChange={(e) => setDestinacion(e.target.value as any)}
              className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F]"
            >
              <option value="BAJA_DEFINITIVA">Baja Definitiva (Disposición Final / Merma / Chatarra)</option>
              <option value="REASIGNAR_ESLINGAS_IZAJE">Reasignar como Eslingas / Estrobos de Izaje (Reutilización en Obra de Teleféricos)</option>
            </select>
            {destinacion === 'REASIGNAR_ESLINGAS_IZAJE' && (
              <p className="text-[10px] text-emerald-700 mt-1 font-semibold">
                ✓ Aprovechamiento técnico: El cable será reclasificado para confección de estrobos de izaje bajo norma ASME B30.9 para montajes electromecánicos.
              </p>
            )}
          </div>

          {/* Cantidad y Unidad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Cantidad a Dar de Baja:
              </label>
              <input
                type="number"
                min="0.01"
                step="any"
                value={cantidad}
                onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
                className="w-full p-2.5 border border-gray-300 rounded-xl font-bold bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Unidad de Medida:
              </label>
              <input
                type="text"
                value={tramo ? 'metros' : product.unit}
                readOnly
                className="w-full p-2.5 border border-gray-200 bg-gray-100 rounded-xl font-mono font-bold text-gray-600 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Centro de Costos / Proyecto (Regla 1 Proyecto = 1 Centro de Costos) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
              <Building2 size={13} className="text-[#00668F]" />
              Centro de Costos Afectado (Proyecto Inteckno):
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-xl font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F]"
              required
            >
              <option value="">-- Selecciona el Proyecto / Centro de Costos --</option>
              {projects.map((proj) => (
                <option key={proj.id} value={proj.id}>
                  {proj.code} — {proj.name}
                </option>
              ))}
            </select>
            <span className="text-[10px] text-gray-500 mt-1 block">
              Código de imputación contable: <strong>{projectCode}</strong>
            </span>
          </div>

          {/* Impacto Económico */}
          <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] font-bold text-emerald-800 uppercase block">Impacto en Pérdida / Merma:</span>
              <span className="text-[10px] text-emerald-700">Calculado a costo unitario promedio ponderado</span>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-emerald-900 block font-mono">
                {formatCOP(valorTotalCOP)}
              </span>
            </div>
          </div>

          {/* Justificación Detallada */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Justificación Técnica Detallada:
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              placeholder="Explica la causa técnica (ej. tramo final de carrete no empalmable según norma UNE EN 12927, producto con fecha vencida en inspección mensual HSEQ, etc.)..."
              className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F]"
              required
            />
          </div>

          {/* PIE DE FORMULARIO */}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Scissors size={14} />
              {isSubmitting ? 'Registrando...' : 'Enviar a Aprobación de Gerencia'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

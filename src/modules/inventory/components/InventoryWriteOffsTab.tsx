import React, { useState, useEffect } from 'react';
import {
  Scissors,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  AlertTriangle,
  FileText,
  Search,
  Filter,
  DollarSign,
} from 'lucide-react';
import { InventoryWriteOffRequest } from '../../../types';
import { useErp } from '../../../core/storage/erpStore';
import { formatCOP } from '../../../core/services/trmService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface InventoryWriteOffsTabProps {
  onOpenNewWriteOff?: () => void;
}

export const InventoryWriteOffsTab: React.FC<InventoryWriteOffsTabProps> = ({ onOpenNewWriteOff }) => {
  const { currentUser, notify, products, updateProductStockDirect, recordInventoryAuditLog } = useErp();
  const [writeOffs, setWriteOffs] = useState<InventoryWriteOffRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const loadWriteOffs = () => {
    try {
      const raw = localStorage.getItem('inteckno_inventory_write_offs');
      if (raw) {
        setWriteOffs(JSON.parse(raw));
      } else {
        setWriteOffs([]);
      }
    } catch (e) {
      console.error('Error cargando bajas:', e);
    }
  };

  useEffect(() => {
    loadWriteOffs();
    const handleUpdate = () => loadWriteOffs();
    window.addEventListener('inteckno:inventory-write-off-created', handleUpdate);
    return () => window.removeEventListener('inteckno:inventory-write-off-created', handleUpdate);
  }, []);

  const handleApprove = (solicitud: InventoryWriteOffRequest) => {
    try {
      const updatedList = writeOffs.map((item) => {
        if (item.id === solicitud.id) {
          return {
            ...item,
            estado: 'APROBADO_GERENCIA' as const,
            aprobadoPorId: currentUser?.id || 'gerencia_general',
            aprobadoPorNombre: currentUser?.name || 'Gerencia General Inteckno',
            fechaAprobacion: new Date().toISOString().split('T')[0],
          };
        }
        return item;
      });

      localStorage.setItem('inteckno_inventory_write_offs', JSON.stringify(updatedList));
      setWriteOffs(updatedList);

      // Descontar del stock real del producto
      const targetProd = products.find((p) => p.id === solicitud.productId);
      if (targetProd) {
        const currentAvail = targetProd.availableStock || 0;
        const newStock = Math.max(0, currentAvail - solicitud.cantidad);
        updateProductStockDirect(targetProd.id, newStock);

        if (recordInventoryAuditLog) {
          recordInventoryAuditLog({
            productId: targetProd.id,
            productSku: targetProd.sku,
            productName: targetProd.name,
            userId: currentUser?.id || 'usr_gerente',
            userName: currentUser?.name || 'Gerencia General',
            userEmail: currentUser?.email || 'gerencia@inteckno.com.co',
            source: 'erp_web',
            previousStock: currentAvail,
            newStock,
            delta: -solicitud.cantidad,
            reason: `Baja Aprobada (${solicitud.codigoSolicitud}): ${solicitud.motivo} - Proyecto ${solicitud.centroCostosProyectoCodigo}`,
            projectCode: solicitud.centroCostosProyectoCodigo,
          });
        }
      }

      notify?.('success', 'Baja Aprobada', `Solicitud ${solicitud.codigoSolicitud} APROBADA con éxito. Stock descontado del inventario.`);
    } catch (err) {
      console.error('Error aprobando baja:', err);
      notify?.('urgent', 'Error en Aprobación', 'Error al procesar la aprobación de la baja');
    }
  };

  const handleReject = (solicitud: InventoryWriteOffRequest) => {
    const razon = window.prompt('Ingresa el motivo del rechazo técnico de la baja:');
    if (!razon) return;

    try {
      const updatedList = writeOffs.map((item) => {
        if (item.id === solicitud.id) {
          return {
            ...item,
            estado: 'RECHAZADO_GERENCIA' as const,
            motivoRechazo: razon,
            aprobadoPorId: currentUser?.id || 'gerencia_general',
            aprobadoPorNombre: currentUser?.name || 'Gerencia General Inteckno',
            fechaAprobacion: new Date().toISOString().split('T')[0],
          };
        }
        return item;
      });

      localStorage.setItem('inteckno_inventory_write_offs', JSON.stringify(updatedList));
      setWriteOffs(updatedList);
      notify?.('info', 'Baja Rechazada', `Solicitud ${solicitud.codigoSolicitud} RECHAZADA. El stock no fue modificado.`);
    } catch (err) {
      console.error('Error rechazando baja:', err);
      notify?.('urgent', 'Error en Rechazo', 'Error al registrar el rechazo de la baja');
    }
  };

  const filteredWriteOffs = writeOffs.filter((item) => {
    const matchesStatus = statusFilter === 'all' || item.estado === statusFilter;
    const matchesSearch =
      item.codigoSolicitud.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.centroCostosProyectoCodigo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-4">
      {/* BARRA SUPERIOR DE FILTROS Y ACCIÓN */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, artículo o proyecto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#00668F]"
            />
          </div>

          <div className="w-56 shrink-0">
            <CreatableSelect
              value={
                statusFilter === 'all' ? 'Todos los Estados' :
                statusFilter === 'PENDIENTE_APROBACION_GERENCIA' ? 'Pendientes de Gerencia' :
                statusFilter === 'APROBADO_GERENCIA' ? 'Aprobados' :
                statusFilter === 'RECHAZADO_GERENCIA' ? 'Rechazados' :
                statusFilter
              }
              onChange={(val) => {
                if (val === 'Todos los Estados' || !val) setStatusFilter('all');
                else if (val === 'Pendientes de Gerencia') setStatusFilter('PENDIENTE_APROBACION_GERENCIA');
                else if (val === 'Aprobados') setStatusFilter('APROBADO_GERENCIA');
                else if (val === 'Rechazados') setStatusFilter('RECHAZADO_GERENCIA');
                else setStatusFilter(val);
              }}
              options={[
                'Todos los Estados',
                'Pendientes de Gerencia',
                'Aprobados',
                'Rechazados',
              ]}
              placeholder="Estado..."
              isClearable={false}
              allowCustomText={false}
              inputClassName="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white font-medium focus:outline-hidden"
            />
          </div>
        </div>

        {onOpenNewWriteOff && (
          <button
            onClick={onOpenNewWriteOff}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Scissors size={14} /> Registrar Nueva Baja
          </button>
        )}
      </div>

      {/* LISTADO DE SOLICITUDES DE BAJA */}
      {filteredWriteOffs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          <Scissors size={32} className="mx-auto text-slate-300 mb-2" />
          <h4 className="font-bold text-slate-700 text-sm">No hay solicitudes de baja registradas</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Las bajas por retazos inutilizables de cables STC, mermas de obra o químicos END caducados aparecerán aquí con su estado de aprobación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredWriteOffs.map((sol) => (
            <div
              key={sol.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 hover:shadow-xs transition-shadow flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-gray-900 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {sol.codigoSolicitud}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                    sol.estado === 'PENDIENTE_APROBACION_GERENCIA'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : sol.estado === 'APROBADO_GERENCIA'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}>
                    {sol.estado === 'PENDIENTE_APROBACION_GERENCIA'
                      ? 'PENDIENTE APROBACIÓN GERENCIA'
                      : sol.estado === 'APROBADO_GERENCIA'
                      ? 'APROBADO POR GERENCIA'
                      : 'RECHAZADO'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Clock size={12} /> {sol.fechaSolicitud}
                  </span>
                </div>

                <div className="font-bold text-gray-800 text-sm">
                  {sol.productName} <span className="font-mono text-xs text-slate-500">({sol.productSku})</span>
                </div>

                <div className="flex items-center gap-4 text-slate-600 flex-wrap text-[11px]">
                  <span>
                    Cantidad: <strong className="text-gray-900">{sol.cantidad} {sol.unidad}</strong>
                  </span>
                  <span>
                    Motivo: <strong className="text-rose-700">{sol.motivo}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Building2 size={12} className="text-[#00668F]" />
                    Centro Costos: <strong className="text-[#00668F] font-mono">{sol.centroCostosProyectoCodigo}</strong>
                  </span>
                  <span>
                    Impacto: <strong className="text-gray-900 font-mono">{formatCOP(sol.valorEstimadoCOP)}</strong>
                  </span>
                </div>

                <p className="text-slate-600 italic bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">
                  "{sol.descripcionDetallada}"
                </p>

                {sol.motivoRechazo && (
                  <p className="text-rose-700 font-semibold text-[11px] bg-rose-50 p-1.5 rounded">
                    Motivo del Rechazo: {sol.motivoRechazo}
                  </p>
                )}
              </div>

              {/* ACCIONES DE GERENCIA */}
              {sol.estado === 'PENDIENTE_APROBACION_GERENCIA' && (
                <div className="flex items-center gap-2 shrink-0 sm:self-center">
                  <button
                    onClick={() => handleReject(sol)}
                    className="px-3 py-1.5 rounded-xl border border-rose-300 text-rose-700 hover:bg-rose-50 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <XCircle size={13} /> Rechazar
                  </button>
                  <button
                    onClick={() => handleApprove(sol)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                  >
                    <CheckCircle2 size={13} /> Aprobar Baja
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

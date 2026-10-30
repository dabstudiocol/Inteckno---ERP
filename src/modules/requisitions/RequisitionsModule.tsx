import React, { useState } from 'react';
import {
  Package,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShoppingCart,
  Sparkles,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { InternalRequisition } from '../../types';
import { LightTable } from '../../components/ui/LightTable';
import { CreateRequisitionModal } from '../procurement/components/CreateRequisitionModal';
import { RequisitionDetailModal } from '../procurement/components/RequisitionDetailModal';

export const RequisitionsModule: React.FC = () => {
  const { requisitions, setActiveModule } = useErp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReqForDetail, setSelectedReqForDetail] = useState<InternalRequisition | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Encabezado y Principio Humano (Lenguaje sin burocracia) */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 pb-2 w-full min-w-0">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Pedir Materiales y Repuestos</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Si hay existencias en bodega se autoriza la salida; si no hay existencias disponibles, el sistema genera la solicitud de compra.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            <span>Pedir Materiales Ahora</span>
          </button>
        </div>
      </div>

      {/* Trazabilidad de Requisiciones */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Solicitudes Realizadas ({requisitions.length})</h3>
            <p className="text-xs text-slate-500">Trazabilidad desde el pedido en terreno hasta la recepción en almacén</p>
          </div>
        </div>

        <LightTable
          data={requisitions}
          keyExtractor={(req) => req.id}
          onRowClick={(req) => {
            setSelectedReqForDetail(req);
            setIsDetailModalOpen(true);
          }}
          columns={[
            {
              key: 'reqNumber',
              header: 'Número / Fecha',
              render: (req) => (
                <div>
                  <div className="font-bold text-xs text-[#00668F]">{req.reqNumber}</div>
                  <div className="text-[11px] text-gray-400 font-medium">Por: {req.requesterName}</div>
                </div>
              ),
            },
            {
              key: 'projectCode',
              header: 'Proyecto STC / Destino',
              render: (req) => (
                <div>
                  <span className="font-bold text-xs text-gray-900">{req.projectCode}</span>
                  <div className="text-[11px] text-gray-500">{req.projectName}</div>
                  {req.requisitionType && (
                    <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-[#00668F] border border-sky-200">
                      {req.requisitionType}
                    </span>
                  )}
                </div>
              ),
            },
            {
              key: 'priority',
              header: 'Urgencia',
              align: 'center',
              render: (req) => {
                const prio = req.priority || 'Normal';
                const isImmediate = prio.toLowerCase().includes('inmediat') || prio.toLowerCase().includes('crítica');
                const isHigh = prio.toLowerCase().includes('alta') || prio.toLowerCase().includes('urgente') || prio.toLowerCase().includes('24');
                return (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isImmediate
                        ? 'bg-rose-100 text-rose-800 border border-rose-300'
                        : isHigh
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {prio}
                  </span>
                );
              },
            },
            {
              key: 'items',
              header: 'Materiales Solicitados',
              render: (req) => (
                <div className="space-y-1">
                  {req.items.map((i, idx) => (
                    <div key={idx} className="text-xs text-gray-800">
                      <strong>{i.qtyRequested}x</strong> {i.productName}
                    </div>
                  ))}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Estado / Flujo Conectado',
              align: 'center',
              render: (req) => {
                if (req.status === 'auto_po_generated') {
                  return (
                    <div className="text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                        <ShoppingCart size={11} />
                        Orden de Compra Generada ({req.generatedPoNumber})
                      </span>
                      <span className="block text-[10px] text-purple-600 font-semibold mt-0.5">
                        Sin existencias → Compra en trámite
                      </span>
                    </div>
                  );
                }
                if (req.status === 'pending_wilson_approval' || req.status === 'pending_approval') {
                  const approverLabel = req.targetApproverName ? req.targetApproverName.split(' ')[0] : 'V°B°';
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                      <Clock size={11} />
                      Pendiente V°B° {approverLabel}
                    </span>
                  );
                }
                if (req.status === 'approved') {
                  return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 size={11} />
                      Surtido con Stock Local
                    </span>
                  );
                }
                return (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700">
                    {req.status === 'submitted' ? 'Radicada' : req.status}
                  </span>
                );
              },
            },
            {
              key: 'actions',
              header: 'Seguimiento',
              align: 'right',
              render: (req) => {
                if (req.generatedPoNumber) {
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModule('procurement');
                      }}
                      className="text-xs text-[#00668F] font-bold hover:underline flex items-center gap-1 ml-auto cursor-pointer"
                    >
                      <span>Ver Compra {req.generatedPoNumber}</span>
                      <ArrowRight size={13} />
                    </button>
                  );
                }
                return (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveModule('procurement');
                      setTimeout(() => {
                        window.dispatchEvent(
                          new CustomEvent('inteckno:create-po-from-requisition', { detail: req })
                        );
                      }, 80);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#00668F] hover:bg-[#005073] text-white text-[11px] font-bold transition-all cursor-pointer ml-auto"
                    title="Convertir esta SOLPED en Orden de Compra"
                  >
                    <ShoppingCart size={12} />
                    <span>Convertir en OC</span>
                  </button>
                );
              },
            },
          ]}
        />
      </div>

      {/* Modal de Detalle, Edición y Notificación a Wilson Alzate */}
      <RequisitionDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedReqForDetail(null);
        }}
        requisition={selectedReqForDetail}
      />

      {/* Modal Universal de Peticiones de Compra (Proyectos & Insumos de Oficina) */}
      <CreateRequisitionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};


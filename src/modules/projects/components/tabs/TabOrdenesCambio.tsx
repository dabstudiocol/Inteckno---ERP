import React, { useState } from 'react';
import { 
  FileEdit, 
  Plus, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  TrendingUp,
  FileText,
  Trash2,
  Info
} from 'lucide-react';
import { Project } from '../../../../types';
import { ProjectChangeOrder } from '../../../../types/ProjectSchema';
import { formatCOP, formatUSD } from '../../../../core/services/trmService';
import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';
import { DetailModal } from '../../../../components/common/DetailModal';

interface TabOrdenesCambioProps {
  project: Project;
  currentTrm: number;
  onUpdateProject?: (updates: Partial<Project>) => void;
}

export const TabOrdenesCambio: React.FC<TabOrdenesCambioProps> = ({ 
  project, 
  currentTrm,
  onUpdateProject 
}) => {
  const [orders, setOrders] = useState<ProjectChangeOrder[]>(() => {
    return (project as any).changeOrders || [];
  });
  const [showModal, setShowModal] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<ProjectChangeOrder | null>(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<ProjectChangeOrder | null>(null);

  // Form State (inicia limpio para que el usuario ingrese el código del otrosí o lo deje autogenerar al guardar)
  const [orderNumber, setOrderNumber] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [amountAddedCOP, setAmountAddedCOP] = useState<string>('');
  const [amountAddedUSD, setAmountAddedUSD] = useState<string>('');
  const [daysAdded, setDaysAdded] = useState<string>('0');
  const [clientApprovalActNo, setClientApprovalActNo] = useState<string>('');

  const handleCreateChangeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !justification.trim()) {
      setMsg({ text: 'Título y justificación técnica son obligatorios.', type: 'error' });
      return;
    }

    const cop = Number(amountAddedCOP) || 0;
    const usd = Number(amountAddedUSD) || (cop > 0 ? Math.round(cop / currentTrm) : 0);
    const days = Number(daysAdded) || 0;
    const isApproved = Boolean(clientApprovalActNo.trim());
    const finalOrderNumber = orderNumber.trim() || `ADD-${String(orders.length + 1).padStart(3, '0')}`;

    const newOrder: ProjectChangeOrder = {
      id: `CO-${Date.now()}`,
      projectId: project.id,
      orderNumber: finalOrderNumber,
      title: title.trim(),
      justification: justification.trim(),
      amountAddedCOP: cop,
      amountAddedUSD: usd,
      daysAdded: days,
      requestedBy: 'Dirección de Proyectos STC',
      approvedByClient: clientApprovalActNo.trim() || 'Pendiente Firma',
      approvalDate: isApproved ? new Date().toISOString().split('T')[0] : '',
      status: isApproved ? 'aprobada' : 'propuesta',
      createdAt: new Date().toISOString(),
    };

    const updatedOrders = [...orders, newOrder];
    setOrders(updatedOrders);

    // If approved, update project budget, contractAmount, offerBudget and end date
    if (isApproved && onUpdateProject) {
      const currentPV = project.budgetPV || 0;
      const currentContract = project.contractAmount || currentPV;
      let newEndDate = project.endDate;
      if (days > 0 && project.endDate) {
        const d = new Date(project.endDate);
        d.setDate(d.getDate() + days);
        newEndDate = d.toISOString().split('T')[0];
      }

      onUpdateProject({
        budgetPV: currentPV + cop,
        contractAmount: currentContract + cop,
        endDate: newEndDate,
        changeOrders: updatedOrders as any
      } as any);
    } else if (onUpdateProject) {
      onUpdateProject({
        changeOrders: updatedOrders as any
      } as any);
    }

    setMsg({ 
      text: isApproved 
        ? 'Orden de cambio aprobada y presupuesto ajustado inmutablemente.' 
        : 'Propuesta de otrosí registrada en revisión.', 
      type: 'success' 
    });
    setShowModal(false);
    setTitle('');
    setJustification('');
    setAmountAddedCOP('');
    setAmountAddedUSD('');
    setDaysAdded('0');
    setClientApprovalActNo('');
    setOrderNumber('');
  };

  const handleApproveOrder = (orderId: string) => {
    const act = prompt('Ingrese el número de acta o referencia firmada por el cliente:');
    if (!act) return;

    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'aprobada' as const,
          approvedByClient: act,
          approvalDate: new Date().toISOString().split('T')[0]
        };
      }
      return o;
    });

    setOrders(updatedOrders);
    const targetOrder = updatedOrders.find(o => o.id === orderId);

    if (targetOrder && onUpdateProject) {
      const currentPV = project.budgetPV || 0;
      const currentContract = project.contractAmount || currentPV;
      let newEndDate = project.endDate;
      if (targetOrder.daysAdded > 0 && project.endDate) {
        const d = new Date(project.endDate);
        d.setDate(d.getDate() + targetOrder.daysAdded);
        newEndDate = d.toISOString().split('T')[0];
      }

      onUpdateProject({
        budgetPV: currentPV + targetOrder.amountAddedCOP,
        contractAmount: currentContract + targetOrder.amountAddedCOP,
        endDate: newEndDate,
        changeOrders: updatedOrders as any
      } as any);
    }

    setMsg({ text: `Orden aprobada exitosamente y presupuesto base ajustado.`, type: 'success' });
  };

  const totalAdditionalCOP = orders
    .filter(o => o.status === 'aprobada')
    .reduce((sum, o) => sum + (o.amountAddedCOP || 0), 0);
  const totalAdditionalDays = orders
    .filter(o => o.status === 'aprobada')
    .reduce((sum, o) => sum + (o.daysAdded || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Presupuesto PV Inicial</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {formatCOP((project.budgetPV || 0) - totalAdditionalCOP)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Línea base contractual original</span>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#00668F] mb-1">
            <span>Presupuesto Vigente Aprobado</span>
            <TrendingUp className="w-4 h-4 text-[#00668F]" />
          </div>
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {formatCOP(project.budgetPV || 0)}
          </div>
          <span className="text-[11px] text-[#00668F] mt-1 block">
            +{formatCOP(totalAdditionalCOP)} en adiciones autorizadas
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Ampliación de Plazo</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
            +{totalAdditionalDays} días
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Fin vigente: {project.endDate || 'No definida'}
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Órdenes de Cambio</span>
              <FileEdit className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">
              {orders.length}
            </div>
            <span className="text-[11px] text-slate-500">
              {orders.filter(o => o.status === 'aprobada').length} aprobadas / {orders.filter(o => o.status === 'propuesta').length} en trámite
            </span>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 w-full py-1.5 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Otrosí / Addendum
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-3 text-xs rounded-lg border flex items-center justify-between ${
          msg.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-200' 
            : 'bg-red-50 dark:bg-red-950/30 border-red-300 text-red-800 dark:text-red-200'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#00668F]" />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Historial de Otrosís y Órdenes de Cambio Contractuales
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Trazabilidad Inmutable de Alcance
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="p-8 text-center">
            <FileEdit className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No hay órdenes de cambio registradas en este proyecto
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Si surgen variaciones de alcance, mayores cantidades de obra o adiciones de plazo, regístralas aquí para respaldo técnico.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Código / Título</th>
                  <th className="py-3 px-4">Justificación Técnica</th>
                  <th className="py-3 px-4">Impacto Costo</th>
                  <th className="py-3 px-4">Plazo Adicional</th>
                  <th className="py-3 px-4">Acta Cliente</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-[#00668F]">
                        {order.orderNumber}
                      </div>
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {order.title}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {order.createdAt.split('T')[0]}
                      </div>
                    </td>
                    <td className="py-3 px-4 max-w-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                      {order.justification}
                    </td>
                    <td className="py-3 px-4">
                      {order.amountAddedCOP > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                          +{formatCOP(order.amountAddedCOP)}
                        </span>
                      ) : (
                        <span className="text-slate-500">$0</span>
                      )}
                      {order.amountAddedUSD > 0 && (
                        <div className="text-[11px] text-slate-500">
                          +{formatUSD(order.amountAddedUSD)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {order.daysAdded > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400 font-medium">
                          +{order.daysAdded} días
                        </span>
                      ) : (
                        <span className="text-slate-400">0 días</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                        {order.approvedByClient}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {order.status === 'aprobada' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          Aprobada
                        </span>
                      ) : order.status === 'rechazada' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                          <AlertCircle className="w-3 h-3" />
                          Rechazada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <Clock className="w-3 h-3" />
                          En Trámite
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {order.status === 'propuesta' && (
                          <button
                            onClick={() => handleApproveOrder(order.id)}
                            className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-300"
                          >
                            Aprobar
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedOrderDetail(order)}
                          className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Ver detalle del otrosí"
                        >
                          <Info size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderToDelete(order)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                          title="Eliminar otrosí"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Nueva Orden de Cambio */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-[#00668F]" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Registrar Orden de Cambio / Otrosí
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateChangeOrder} className="mt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Título descriptivo *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Adición 12m de tubería 6in SCH 80"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Justificación Técnica y Alcance *
                </label>
                <textarea
                  rows={3}
                  required
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Detalle el requerimiento del cliente o imprevisto técnico de obra..."
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monto Adicional COP ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={amountAddedCOP}
                    onChange={(e) => setAmountAddedCOP(e.target.value)}
                    placeholder="0"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Monto USD ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={amountAddedUSD}
                    onChange={(e) => setAmountAddedUSD(e.target.value)}
                    placeholder="0"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Días Adicionales Plazo
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={daysAdded}
                    onChange={(e) => setDaysAdded(e.target.value)}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Acta / Referencia Cliente
                  </label>
                  <input
                    type="text"
                    value={clientApprovalActNo}
                    onChange={(e) => setClientApprovalActNo(e.target.value)}
                    placeholder="Ej. ACTA-004 (Opcional)"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-lg transition-colors shadow-sm"
                >
                  Registrar Orden de Cambio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación de Otrosí / Orden de Cambio */}
      <ConfirmDeleteModal
        isOpen={Boolean(orderToDelete)}
        title="¿Eliminar Orden de Cambio / Otrosí?"
        itemName={orderToDelete ? `${orderToDelete.orderNumber} - ${orderToDelete.title}` : ''}
        description="Esta acción eliminará el registro del otrosí contractual. ¿Deseas confirmar la eliminación?"
        requireConfirmWord={true}
        confirmWord="BORRAR"
        confirmText="Eliminar Otrosí"
        onConfirm={() => {
          if (orderToDelete) {
            const updated = orders.filter((o) => o.id !== orderToDelete.id);
            setOrders(updated);
            if (onUpdateProject) {
              onUpdateProject({ changeOrders: updated } as any);
            }
            setOrderToDelete(null);
          }
        }}
        onCancel={() => setOrderToDelete(null)}
      />

      {/* Modal Detalle Completo de Orden de Cambio */}
      <DetailModal
        isOpen={Boolean(selectedOrderDetail)}
        title={selectedOrderDetail ? `Otrosí ${selectedOrderDetail.orderNumber}: ${selectedOrderDetail.title}` : 'Ficha de Orden de Cambio'}
        subtitle={selectedOrderDetail ? `Proyecto: ${project.name}` : ''}
        badge={selectedOrderDetail ? {
          label: selectedOrderDetail.status === 'aprobada' ? 'Aprobada' : selectedOrderDetail.status === 'rechazada' ? 'Rechazada' : 'En Trámite',
          color: selectedOrderDetail.status === 'aprobada' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : selectedOrderDetail.status === 'rechazada' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        } : undefined}
        onClose={() => setSelectedOrderDetail(null)}
        fields={selectedOrderDetail ? [
          { label: 'Número de Orden', value: selectedOrderDetail.orderNumber, isMono: true },
          { label: 'Título del Otrosí', value: selectedOrderDetail.title },
          { label: 'Impacto Presupuestal COP', value: formatCOP(selectedOrderDetail.amountAddedCOP), isMono: true },
          { label: 'Impacto Presupuestal USD', value: formatUSD(selectedOrderDetail.amountAddedUSD), isMono: true },
          { label: 'Días Adicionales de Plazo', value: `${selectedOrderDetail.daysAdded} días`, isMono: true },
          { label: 'Acta / Referencia Cliente', value: selectedOrderDetail.approvedByClient || 'Sin acta registrada', isMono: true },
          { label: 'Fecha de Registro', value: selectedOrderDetail.createdAt ? selectedOrderDetail.createdAt.split('T')[0] : 'N/A' },
          { label: 'Justificación Técnica y Alcance', value: selectedOrderDetail.justification, colSpan: 2 },
        ] : []}
      />
    </div>
  );
};

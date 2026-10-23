import React, { useMemo } from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Package,
  FileText,
  DollarSign,
  ShieldCheck,
  User,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { InternalRequisition, PurchaseOrder, AppNotification } from '../../types';
import { getCalibrationStatus } from '../../utils/calibrationUtils';

interface UserLoginAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAction: (moduleId: string, actionType?: string, payload?: any) => void;
}

export interface UserPendingAction {
  id: string;
  title: string;
  message: string;
  urgency: 'HIGH' | 'MEDIUM' | 'INFO';
  badge: string;
  badgeColor: string;
  moduleId: string;
  actionType: 'open_requisition' | 'open_po_receipt' | 'open_billing' | 'open_expense' | 'generic';
  actionLabel: string;
  payload?: any;
  timestamp: string;
}

export const UserLoginAlertsModal: React.FC<UserLoginAlertsModalProps> = ({
  isOpen,
  onClose,
  onNavigateToAction,
}) => {
  const {
    currentUser,
    products,
    requisitions,
    purchaseOrders,
    expenses,
    milestones,
    notifications,
    todos,
  } = useErp();

  // Generar acciones y tareas pendientes específicas para el usuario activo según Matriz RACI
  const userActions = useMemo(() => {
    const actions: UserPendingAction[] = [];
    const userId = currentUser?.id || '';
    const userRole = currentUser?.role || '';
    const userName = (currentUser?.name || '').toLowerCase();

    // Roles RACI estrictos
    const isWilson =
      userId === 'USR-18' ||
      userName.includes('wilson');

    const isAlmacenista =
      userId === 'USR-08' ||
      userRole === 'almacenista' ||
      userName.includes('almacen');

    const isCompras =
      userId === 'USR-07' ||
      userRole === 'coord_compras' ||
      userName.includes('compras');

    const isContabilidad =
      userId === 'USR-04' ||
      userRole === 'contador_externo' ||
      userName.includes('contad');

    const isGerenteAdmin =
      userRole === 'gerente_administrativa' ||
      userName.includes('administrativa');

    const isGerenteGeneral =
      userRole === 'gerente_general' ||
      userName.includes('alejandro');

    const isAdminTI =
      userRole === 'admin_sistemas' ||
      userId === 'USR-06' ||
      userName.includes('david') ||
      userName.includes('sistemas');

    // 1. REQUISICIONES PENDIENTES DE APROBACIÓN (Wilson, Clemencia, Gustavo u otro líder asignado)
    const myPendingReqs = (requisitions || []).filter((req) => {
      if (req.status !== 'pending_wilson_approval' && req.status !== 'pending_approval') return false;
      
      // Si la petición tiene targetApproverId o targetApproverName explícito
      if (req.targetApproverId && req.targetApproverId === userId) return true;
      if (req.targetApproverName && userName && req.targetApproverName.toLowerCase().includes(userName.split(' ')[0])) return true;

      // Por rol / usuario histórico
      if (isWilson && (req.status === 'pending_wilson_approval' || !req.targetApproverName || req.targetApproverName.toLowerCase().includes('wilson'))) return true;
      if ((isGerenteAdmin || userName.includes('clemencia')) && (req.targetApproverId === 'USR-04' || req.targetApproverName?.toLowerCase().includes('clemencia'))) return true;
      if ((isGerenteGeneral || userName.includes('gustavo')) && (req.targetApproverId === 'USR-07' || req.targetApproverName?.toLowerCase().includes('gustavo'))) return true;
      if (isAdminTI) return true; // Administrador TI tiene visibilidad de control
      
      return false;
    });

    myPendingReqs.forEach((req) => {
      const approverShort = req.targetApproverName ? req.targetApproverName.split(' ')[0] : 'Wilson';
      actions.push({
        id: `approver-req-${req.id}`,
        title: `V°B° Requerido: Petición ${req.reqNumber}`,
        message: `El solicitante ${req.requesterName} radicó requerimientos para ${req.projectCode || 'Insumos Generales'} (${(req.items || []).length} ítems). Requiere visto bueno de ${approverShort}.`,
        urgency: 'HIGH',
        badge: `Aprobación (${approverShort})`,
        badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
        moduleId: 'compras',
        actionType: 'open_requisition',
        actionLabel: 'Revisar y Aprobar Petición',
        payload: { requisitionId: req.id, req },
        timestamp: req.createdAt || 'Pendiente',
      });
    });

    // 2. ÓRDENES PENDIENTES DE RECEPCIÓN FÍSICA PARA EL ALMACENISTA (RACI: Almacén recibe en bodega)
    if (isAlmacenista) {
      const pendingPOs = (purchaseOrders || []).filter(
        (po) => po.status === 'ordered' || po.status === 'partial'
      );
      pendingPOs.forEach((po) => {
        actions.push({
          id: `wh-po-${po.id}`,
          title: `Recepción en Bodega: Orden ${po.orderNumber}`,
          message: `Proveedor ${po.supplierName} con ${(po.items || []).length} ítems en tránsito. Realiza el conteo físico y registro de ingreso.`,
          urgency: po.status === 'partial' ? 'MEDIUM' : 'HIGH',
          badge: po.status === 'partial' ? 'Saldo Pendiente' : 'En Tránsito',
          badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          moduleId: 'inventario',
          actionType: 'open_po_receipt',
          actionLabel: 'Dar Ingreso a Bodega',
          payload: { purchaseOrderId: po.id, po },
          timestamp: po.date || 'Pendiente',
        });
      });

      // Calibraciones para el almacenista
      (products || []).forEach((p) => {
        if (!p.calibrationInfo) return;
        const cal = getCalibrationStatus(p.calibrationInfo);
        if (cal.status === 'critical_1m' || cal.status === 'expired') {
          actions.push({
            id: `cal-crit-${p.id}`,
            title: `¡Alerta Roja! Calibración: ${p.sku}`,
            message: `El equipo "${p.name}" tiene vigencia crítica de calibración: ${cal.label}. Requiere recertificación inmediata para uso seguro en campo STC.`,
            urgency: 'HIGH',
            badge: 'Calibración Crítica (< 1 mes)',
            badgeColor: 'bg-rose-100 text-rose-900 border-rose-300',
            moduleId: 'inventario',
            actionType: 'generic',
            actionLabel: 'Ver Ficha en Inventario',
            payload: { productId: p.id },
            timestamp: p.calibrationInfo,
          });
        } else if (cal.status === 'warning_2m') {
          actions.push({
            id: `cal-warn-${p.id}`,
            title: `Recordatorio Naranja: ${p.sku}`,
            message: `El equipo "${p.name}" vencerá su calibración técnica en menos de 2 meses (${cal.label}). Programa la calibración con el laboratorio.`,
            urgency: 'MEDIUM',
            badge: 'Próximo a Vencer (< 2 meses)',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            moduleId: 'inventario',
            actionType: 'generic',
            actionLabel: 'Ver en Inventario',
            payload: { productId: p.id },
            timestamp: p.calibrationInfo,
          });
        }
      });
    }

    // 3. PETICIONES APROBADAS PARA COMPRADOR (RACI: Compras emite las órdenes)
    if (isCompras) {
      const approvedReqs = (requisitions || []).filter(
        (r) => r.status === 'approved' && !r.generatedPoNumber
      );
      approvedReqs.forEach((req) => {
        actions.push({
          id: `comp-req-${req.id}`,
          title: `Petición Aprobada: ${req.reqNumber}`,
          message: `Petición de ${req.projectName} aprobada técnicamente por Wilson. Lista para emitir orden al proveedor.`,
          urgency: 'MEDIUM',
          badge: 'Lista para Compra',
          badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
          moduleId: 'compras',
          actionType: 'open_requisition',
          actionLabel: 'Gestionar Orden de Compra',
          payload: { requisitionId: req.id, req },
          timestamp: req.createdAt || 'Pendiente',
        });
      });
    }

    // 4. FACTURACIÓN ELECTRÓNICA PARA CONTABILIDAD (RACI: Contadora emite DIAN)
    if (isContabilidad || isGerenteAdmin) {
      const pendingInvoices = (milestones || []).filter(
        (m) => m.acceptanceActSigned && !m.invoiceIssued
      );
      if (pendingInvoices.length > 0) {
        actions.push({
          id: 'contab-milestones',
          title: `Actas Firmadas pendientes de Facturación (${pendingInvoices.length})`,
          message: `Hitos de proyectos con acta aprobada listos para emitir factura electrónica ante la DIAN.`,
          urgency: 'HIGH',
          badge: 'Facturación DIAN',
          badgeColor: 'bg-purple-100 text-purple-900 border-purple-300',
          moduleId: 'facturacion',
          actionType: 'open_billing',
          actionLabel: 'Emitir Facturas',
          timestamp: 'Regla 48h',
        });
      }
    }

    // 5. GASTOS OPERATIVOS PARA GERENCIA ADMINISTRATIVA (RACI: Gerente Administrativa aprueba reembolsos)
    if (isGerenteAdmin || isGerenteGeneral) {
      const pendingExpenses = (expenses || []).filter((e) => e.status === 'pending');
      if (pendingExpenses.length > 0) {
        actions.push({
          id: 'gerencia-expenses',
          title: `Gastos Operativos por Legalizar (${pendingExpenses.length})`,
          message: `Hay ${pendingExpenses.length} comprobantes de gastos radicados pendientes de aprobación contable.`,
          urgency: 'MEDIUM',
          badge: 'Contabilidad & Gastos',
          badgeColor: 'bg-indigo-100 text-indigo-900 border-indigo-300',
          moduleId: 'gastos',
          actionType: 'open_expense',
          actionLabel: 'Revisar Comprobantes',
          timestamp: 'Pendiente',
        });
      }
    }

    // 6. TI / SISTEMAS: ALERTAS ESPECÍFICAS DE ADMINISTRACIÓN
    if (isAdminTI) {
      actions.push({
        id: 'ti-system-status',
        title: 'Servidores & Infraestructura ERP',
        message: 'Todas las conexiones de base de datos cliente y Microsoft Graph API sincronizadas correctamente.',
        urgency: 'INFO',
        badge: 'Consola TI',
        badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
        moduleId: 'usuarios-ti',
        actionType: 'generic',
        actionLabel: 'Ver Panel TI',
        timestamp: 'Hoy',
      });
    }

    // 7. SEGUIMIENTO DE PETICIONES CREADAS POR EL USUARIO ACTIVO (Cualquier rol)
    const myReqs = (requisitions || []).filter(
      (r) => (r.requesterId === userId || (r.requesterName && r.requesterName.toLowerCase().includes(userName))) &&
             r.status !== 'pending_wilson_approval'
    );
    myReqs.slice(0, 3).forEach((req) => {
      if (req.status === 'approved') {
        actions.push({
          id: `my-req-${req.id}`,
          title: `Tu petición ${req.reqNumber} fue aprobada`,
          message: `Wilson aprobó tu solicitud técnica para ${req.projectName}. Compras está procesando la orden con el proveedor.`,
          urgency: 'INFO',
          badge: 'Aprobada',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          moduleId: 'compras',
          actionType: 'open_requisition',
          actionLabel: 'Ver Petición',
          payload: { requisitionId: req.id, req },
          timestamp: req.createdAt,
        });
      }
    });

    // 8. TAREAS Y ACTIVIDADES ASIGNADAS AL USUARIO (Sincronizado con Actividades / To-Do)
    const myTodos = (todos || []).filter((t) => {
      if (t.completed) return false;
      const isAssigned =
        t.assignedToUserId === userId ||
        (t.assignedToName && t.assignedToName.toLowerCase().includes(userName)) ||
        (!t.assignedToUserId && t.userId === userId);
      return isAssigned;
    });

    myTodos.slice(0, 4).forEach((todo) => {
      actions.push({
        id: `todo-${todo.id}`,
        title: `Tarea Asignada: ${todo.title}`,
        message: todo.notes || 'Tarea pendiente en tu lista de actividades de Inteckno.',
        urgency: todo.priority === 'alta' ? 'HIGH' : todo.priority === 'media' ? 'MEDIUM' : 'INFO',
        badge: 'Actividad Pendiente',
        badgeColor:
          todo.priority === 'alta'
            ? 'bg-rose-100 text-rose-900 border-rose-300'
            : 'bg-sky-100 text-sky-900 border-sky-300',
        moduleId: 'actividades',
        actionType: 'generic',
        actionLabel: 'Ir a Mis Actividades',
        payload: { todoId: todo.id },
        timestamp: todo.dueDate || 'Sin fecha límite',
      });
    });

    // 9. NOTIFICACIONES DIRECTAS DESTINADAS A ESTE USUARIO O SU ROL
    const userTargetedNotifs = (notifications || []).filter((n) => {
      if ((n as any).userId && (n as any).userId !== userId) return false;
      if ((n as any).targetRole && (n as any).targetRole !== userRole) return false;
      return true;
    }).slice(0, 3);

    userTargetedNotifs.forEach((n) => {
      if (!actions.some((a) => a.id === n.id)) {
        actions.push({
          id: n.id,
          title: n.title,
          message: n.message,
          urgency: n.type === 'urgent' ? 'HIGH' : n.type === 'warning' ? 'MEDIUM' : 'INFO',
          badge: n.type === 'urgent' ? 'Urgente' : 'Novedad',
          badgeColor:
            n.type === 'urgent'
              ? 'bg-rose-100 text-rose-900 border-rose-300'
              : 'bg-slate-100 text-slate-800 border-slate-300',
          moduleId: n.module || 'proyectos',
          actionType: 'generic',
          actionLabel: 'Ver Detalles',
          timestamp: n.timestamp,
        });
      }
    });

    return actions;
  }, [currentUser, requisitions, purchaseOrders, expenses, milestones, notifications, todos, products]);

  if (!isOpen) return null;

  const highPriorityCount = userActions.filter((a) => a.urgency === 'HIGH').length;

  return (
    <div className="fixed inset-0 z-[9999] p-3 sm:p-6 overflow-y-auto flex items-center justify-center bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Cabecera del Pop-up con Colores Sólidos Corporativos */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#003650] text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Bell size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  ¡Hola, {currentUser?.name}!
                </h3>
                {highPriorityCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                    {highPriorityCount} requerimiento{highPriorityCount > 1 ? 's' : ''} pendiente{highPriorityCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {currentUser?.roleLabel} • Centro de Notificaciones & Tareas Operativas
              </p>
            </div>
          </div>

          {/* Botón Cerrar - Círculo perfecto */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido con Lista de Alertas del Usuario */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
          {userActions.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">¡Estás al día!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No tienes autorizaciones ni tareas pendientes que requieran tu visto bueno en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Notificaciones específicas para ti ({userActions.length})
                </span>
                <span className="text-[11px] text-slate-400">
                  Haz clic en cualquier acción para ir directamente
                </span>
              </div>

              {userActions.map((action) => (
                <div
                  key={action.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    action.urgency === 'HIGH'
                      ? 'bg-amber-50/70 border-amber-200 hover:bg-amber-50'
                      : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${action.badgeColor}`}>
                          {action.badge}
                        </span>
                        <h4 className="font-bold text-xs text-slate-900 truncate">
                          {action.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {action.message}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                        <Clock size={11} />
                        <span>{action.timestamp}</span>
                      </div>
                    </div>

                    {/* Botón de Acción Específica con Redirección Inmediata */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToAction(action.moduleId, action.actionType, action.payload);
                      }}
                      className="w-full sm:w-auto justify-center px-3.5 py-2 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow-2xs active:scale-95 cursor-pointer"
                    >
                      <span>{action.actionLabel}</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer del Modal */}
        <div className="px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
          <span className="text-[11px] text-slate-500 text-center sm:text-left">
            Inteckno ERP • Sesión iniciada como <strong>{currentUser?.email}</strong>
          </span>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer text-center"
          >
            Continuar al ERP
          </button>
        </div>

      </div>
    </div>
  );
};

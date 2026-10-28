import { User, Product, InternalRequisition, PurchaseOrder, ExpenseEntry, BillingMilestone, TodoItem } from '../types';
import { getCalibrationStatus } from './calibrationUtils';

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
  isMandatoryAction?: boolean; // Tarea que NO se puede descartar hasta cumplirse en el ERP
}

export function computeUserPendingActions(params: {
  currentUser: User | null;
  products?: Product[];
  requisitions?: InternalRequisition[];
  purchaseOrders?: PurchaseOrder[];
  expenses?: ExpenseEntry[];
  milestones?: BillingMilestone[];
  todos?: TodoItem[];
}): UserPendingAction[] {
  const {
    currentUser,
    products = [],
    requisitions = [],
    purchaseOrders = [],
    expenses = [],
    milestones = [],
    todos = [],
  } = params;

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
  const myPendingReqs = requisitions.filter((req) => {
    if (req.status !== 'pending_wilson_approval' && req.status !== 'pending_approval') return false;

    if (req.targetApproverId && req.targetApproverId === userId) return true;
    if (req.targetApproverName && userName && req.targetApproverName.toLowerCase().includes(userName.split(' ')[0])) return true;

    if (isWilson && (req.status === 'pending_wilson_approval' || !req.targetApproverName || req.targetApproverName.toLowerCase().includes('wilson'))) return true;
    if ((isGerenteAdmin || userName.includes('clemencia')) && (req.targetApproverId === 'USR-04' || req.targetApproverName?.toLowerCase().includes('clemencia'))) return true;
    if ((isGerenteGeneral || userName.includes('gustavo')) && (req.targetApproverId === 'USR-07' || req.targetApproverName?.toLowerCase().includes('gustavo'))) return true;
    if (isAdminTI) return true;

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
      isMandatoryAction: true,
    });
  });

  // 2. ÓRDENES PENDIENTES DE RECEPCIÓN FÍSICA PARA EL ALMACENISTA
  if (isAlmacenista) {
    const pendingPOs = purchaseOrders.filter(
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
        isMandatoryAction: true,
      });
    });

    // Calibraciones para el almacenista
    products.forEach((p) => {
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
          isMandatoryAction: true,
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
          isMandatoryAction: true,
        });
      }
    });
  }

  // 3. PETICIONES APROBADAS PARA COMPRADOR (Compras emite las órdenes)
  if (isCompras) {
    const approvedReqs = requisitions.filter(
      (r) => r.status === 'approved' && !r.generatedPoNumber
    );
    approvedReqs.forEach((req) => {
      actions.push({
        id: `comp-req-${req.id}`,
        title: `Petición Aprobada: ${req.reqNumber}`,
        message: `Petición de ${req.projectName} aprobada técnicamente. Lista para emitir orden al proveedor.`,
        urgency: 'MEDIUM',
        badge: 'Lista para Compra',
        badgeColor: 'bg-sky-100 text-sky-900 border-sky-300',
        moduleId: 'compras',
        actionType: 'open_requisition',
        actionLabel: 'Gestionar Orden de Compra',
        payload: { requisitionId: req.id, req },
        timestamp: req.createdAt || 'Pendiente',
        isMandatoryAction: true,
      });
    });
  }

  // 4. FACTURACIÓN ELECTRÓNICA PARA CONTABILIDAD
  if (isContabilidad || isGerenteAdmin) {
    const pendingInvoices = milestones.filter(
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
        isMandatoryAction: true,
      });
    }
  }

  // 5. GASTOS OPERATIVOS PARA GERENCIA ADMINISTRATIVA
  if (isGerenteAdmin || isGerenteGeneral) {
    const pendingExpenses = expenses.filter((e) => e.status === 'pending');
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
        isMandatoryAction: true,
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
      isMandatoryAction: false,
    });
  }

  // 7. SEGUIMIENTO DE PETICIONES CREADAS POR EL USUARIO ACTIVO
  const myReqs = requisitions.filter(
    (r) => (r.requesterId === userId || (r.requesterName && r.requesterName.toLowerCase().includes(userName))) &&
           r.status !== 'pending_wilson_approval'
  );
  myReqs.slice(0, 3).forEach((req) => {
    if (req.status === 'approved') {
      actions.push({
        id: `my-req-${req.id}`,
        title: `Tu petición ${req.reqNumber} fue aprobada`,
        message: `Tu solicitud técnica para ${req.projectName} fue aprobada. Compras está procesando la orden con el proveedor.`,
        urgency: 'INFO',
        badge: 'Aprobada',
        badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        moduleId: 'compras',
        actionType: 'open_requisition',
        actionLabel: 'Ver Petición',
        payload: { requisitionId: req.id, req },
        timestamp: req.createdAt || 'Reciente',
        isMandatoryAction: false,
      });
    }
  });

  // 8. TAREAS Y ACTIVIDADES ASIGNADAS AL USUARIO (To-Do)
  const myTodos = todos.filter((t) => {
    if (t.completed) return false;
    const isAssigned =
      t.assignedToUserId === userId ||
      (t.assignedToName && t.assignedToName.toLowerCase().includes(userName)) ||
      (!t.assignedToUserId && t.userId === userId);
    return isAssigned;
  });

  myTodos.forEach((todo) => {
    actions.push({
      id: `todo-${todo.id}`,
      title: `Tarea Asignada: ${todo.title}`,
      message: todo.notes || 'Tarea asignada que requiere ser ejecutada y completada.',
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
      isMandatoryAction: true, // No se quita hasta que se chulee en Actividades o se complete
    });
  });

  return actions;
}

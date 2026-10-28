import React, { useState, useMemo } from 'react';
import {
  X,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Check,
  CheckCheck,
  ListTodo,
  Info,
  Lock,
  Sparkles,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { AppNotification } from '../../types';
import { computeUserPendingActions, UserPendingAction } from '../../utils/userActionsUtils';

interface UserLoginAlertsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToAction: (moduleId: string, actionType?: string, payload?: any) => void;
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
    markNotificationAsRead,
    markAllNotificationsAsRead,
  } = useErp();

  // Tab activo: 'all' | 'actions' | 'notifications'
  const [activeTab, setActiveTab] = useState<'all' | 'actions' | 'notifications'>('all');

  // Acciones operativas calculadas según el rol y tareas RACI (Obligatorias hasta cumplirse)
  const userActions = useMemo(() => {
    return computeUserPendingActions({
      currentUser,
      products,
      requisitions,
      purchaseOrders,
      expenses,
      milestones,
      todos,
    });
  }, [currentUser, products, requisitions, purchaseOrders, expenses, milestones, todos]);

  // Notificaciones informativas directas de erpStore
  const userNotifications = useMemo(() => {
    const userId = currentUser?.id || '';
    const userRole = currentUser?.role || '';

    return (notifications || []).filter((n) => {
      if (n.userId && n.userId !== userId) return false;
      if (n.targetRole && n.targetRole !== userRole) return false;
      return true;
    });
  }, [notifications, currentUser]);

  const unreadNotifs = useMemo(() => {
    return userNotifications.filter((n) => !n.read);
  }, [userNotifications]);

  if (!isOpen) return null;

  const mandatoryActions = userActions.filter((a) => a.isMandatoryAction);
  const infoActions = userActions.filter((a) => !a.isMandatoryAction);

  const totalActionCount = userActions.length;
  const unreadCount = unreadNotifs.length;
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
                {totalActionCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                    {totalActionCount} tarea{totalActionCount > 1 ? 's' : ''} operativa{totalActionCount > 1 ? 's' : ''}
                  </span>
                )}
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-400 text-slate-950">
                    {unreadCount} sin leer
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {currentUser?.roleLabel} • Centro de Notificaciones & Tareas Operativas
              </p>
            </div>
          </div>

          {/* Botón Cerrar */}
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X size={16} />
          </button>
        </div>

        {/* Pestañas de Filtrado y Acción Masiva */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas ({totalActionCount + userNotifications.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('actions')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'actions'
                  ? 'bg-[#003650] text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Lock size={12} className="text-amber-300" />
              <span>Tareas Obligatorias ({totalActionCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'notifications'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Info size={12} className="text-sky-600" />
              <span>Novedades ({userNotifications.length})</span>
            </button>
          </div>

          {/* Botón Marcar Todas como Leídas / Recibidas (para notificaciones informativas) */}
          {unreadCount > 0 && (activeTab === 'all' || activeTab === 'notifications') && (
            <button
              type="button"
              onClick={() => markAllNotificationsAsRead(currentUser?.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Marcar todas las novedades informativas como leídas"
            >
              <CheckCheck size={14} className="text-emerald-600" />
              <span>Marcar todas como recibidas ({unreadCount})</span>
            </button>
          )}
        </div>

        {/* Contenido con Lista de Alertas y Tareas */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          
          {/* SECCIÓN 1: TAREAS OPERATIVAS OBLIGATORIAS (No se pueden quitar con simple clic, requieren ejecutar la acción) */}
          {(activeTab === 'all' || activeTab === 'actions') && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Tareas Operativas Requeridas ({userActions.length})
                  </span>
                </div>
                <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-medium">
                  🔒 No descartables: se completan al ejecutar la acción
                </span>
              </div>

              {userActions.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-center text-xs text-slate-500">
                  No tienes tareas ni aprobaciones obligatorias pendientes por resolver.
                </div>
              ) : (
                userActions.map((action) => (
                  <div
                    key={action.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      action.urgency === 'HIGH'
                        ? 'bg-amber-50/80 border-amber-200 hover:bg-amber-50'
                        : 'bg-slate-50/80 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${action.badgeColor}`}>
                            {action.badge}
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <Lock size={10} className="text-amber-600" />
                            Acción Requerida
                          </span>
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {action.title}
                          </h4>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {action.message}
                        </p>
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                          <div className="flex items-center gap-1">
                            <Clock size={11} />
                            <span>{action.timestamp}</span>
                          </div>
                          <span className="text-amber-700 font-medium">
                            • Requiere gestión en módulo {action.moduleId}
                          </span>
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
                ))
              )}
            </div>
          )}

          {/* SECCIÓN 2: NOVEDADES E INFORMACIÓN DEL SISTEMA (Chuleables / Marcables como recibidas) */}
          {(activeTab === 'all' || activeTab === 'notifications') && (
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                    Novedades e Información ({userNotifications.length})
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  ✓ Puedes chulear o marcar como recibidas
                </span>
              </div>

              {userNotifications.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 text-center text-xs text-slate-500">
                  No hay novedades registradas recientemente.
                </div>
              ) : (
                userNotifications.map((notif) => {
                  const isRead = !!notif.read;
                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isRead
                          ? 'bg-white border-slate-200 opacity-65 hover:opacity-100'
                          : notif.type === 'urgent'
                          ? 'bg-rose-50/80 border-rose-200'
                          : notif.type === 'warning'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-sky-50/50 border-sky-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                isRead
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : notif.type === 'urgent'
                                  ? 'bg-rose-100 text-rose-900 border-rose-300'
                                  : notif.type === 'warning'
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-sky-100 text-sky-900 border-sky-300'
                              }`}
                            >
                              {notif.type === 'urgent'
                                ? 'Urgente'
                                : notif.type === 'warning'
                                ? 'Alerta'
                                : 'Novedad'}
                            </span>
                            {isRead && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check size={10} />
                                Recibido
                              </span>
                            )}
                            <h4
                              className={`font-bold text-xs truncate ${
                                isRead ? 'text-slate-600 line-through' : 'text-slate-900'
                              }`}
                            >
                              {notif.title}
                            </h4>
                          </div>

                          <p
                            className={`text-xs leading-relaxed ${
                              isRead ? 'text-slate-500' : 'text-slate-700'
                            }`}
                          >
                            {notif.message}
                          </p>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400 pt-0.5">
                            <Clock size={11} />
                            <span>{notif.timestamp}</span>
                            {notif.module && <span>• Módulo: {notif.module}</span>}
                          </div>
                        </div>

                        {/* Botón de Chulear / Marcar como Recibida */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => markNotificationAsRead(notif.id)}
                            disabled={isRead}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isRead
                                ? 'bg-slate-100 text-slate-400 cursor-default border border-slate-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-95'
                            }`}
                            title={isRead ? 'Notificación ya recibida' : 'Marcar como leída y recibida'}
                          >
                            <Check size={13} />
                            <span>{isRead ? 'Recibida' : 'Chulear / Recibido'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {userActions.length === 0 && userNotifications.length === 0 && (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="font-bold text-slate-900 text-sm">¡Estás al día!</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No tienes autorizaciones ni tareas pendientes que requieran tu visto bueno en este momento.
              </p>
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

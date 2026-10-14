import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, ExternalLink, Send, Bell } from 'lucide-react';
import { CriticalBlockAlert } from '../../../types';
import { useErp } from '../../../core/storage/erpStore';

const CRITICAL_ALERTS_KEY = 'inteckno_critical_block_alerts';

export function getActiveCriticalAlerts(): CriticalBlockAlert[] {
  try {
    const raw = localStorage.getItem(CRITICAL_ALERTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  return [];
}

export function saveCriticalAlerts(alerts: CriticalBlockAlert[]): void {
  localStorage.setItem(CRITICAL_ALERTS_KEY, JSON.stringify(alerts));
  window.dispatchEvent(new CustomEvent('inteckno_critical_alert_updated'));
}

export function triggerCriticalBlockAlert(alert: Omit<CriticalBlockAlert, 'id' | 'createdAt' | 'acknowledged'>): void {
  const current = getActiveCriticalAlerts();
  const newAlert: CriticalBlockAlert = {
    ...alert,
    id: `ALERT-${Date.now()}`,
    createdAt: new Date().toISOString(),
    acknowledged: false,
  };
  saveCriticalAlerts([...current, newAlert]);
}

/**
 * Modal Bloqueante Global (High-Order UI).
 * Si hay una alerta urgente o crítica no reconocida para el usuario o sistema,
 * oscurece completamente el ERP y bloquea la interacción hasta pulsar "Aceptar y leer alerta".
 */
export const CriticalBlockAlertModal: React.FC = () => {
  const { currentUser } = useErp();
  const [activeAlert, setActiveAlert] = useState<CriticalBlockAlert | null>(null);

  const checkAlerts = () => {
    const all = getActiveCriticalAlerts();
    // Buscar alertas no reconocidas para el usuario actual o globales
    const unacknowledged = all.find(
      (a) =>
        !a.acknowledged &&
        (a.urgency === 'HIGH' || a.urgency === 'CRITICAL') &&
        (!a.targetUserId || a.targetUserId === currentUser?.id || currentUser?.role === 'gerente_general' || currentUser?.name?.toLowerCase().includes('wilson'))
    );
    setActiveAlert(unacknowledged || null);
  };

  useEffect(() => {
    checkAlerts();
    const handleUpdate = () => checkAlerts();
    window.addEventListener('inteckno_critical_alert_updated', handleUpdate);
    return () => window.removeEventListener('inteckno_critical_alert_updated', handleUpdate);
  }, [currentUser]);

  if (!activeAlert) return null;

  const handleAcknowledge = () => {
    const all = getActiveCriticalAlerts();
    const updated = all.map((a) =>
      a.id === activeAlert.id ? { ...a, acknowledged: true, acknowledgedAt: new Date().toISOString() } : a
    );
    saveCriticalAlerts(updated);
    setActiveAlert(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border-2 border-rose-500 overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Encabezado Bloqueante de Emergencia */}
        <div className="p-4 bg-rose-600 text-white flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white/20 text-white animate-bounce">
            <ShieldAlert size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 px-2 py-0.5 rounded">
              Bloqueo Crítico de Operación (Urgencia: {activeAlert.urgency})
            </span>
            <h3 className="text-base font-bold text-white mt-0.5">{activeAlert.title}</h3>
          </div>
        </div>

        {/* Mensaje Crítico */}
        <div className="p-6 space-y-4 text-xs text-gray-800">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 font-medium leading-relaxed">
            {activeAlert.message}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="block font-bold text-gray-700">Responsable Notificado:</span>
              <span>{activeAlert.targetUserName}</span>
            </div>
            <div>
              <span className="block font-bold text-gray-700">Fecha y Hora de Emisión:</span>
              <span>{new Date(activeAlert.createdAt).toLocaleString('es-CO')}</span>
            </div>
            {activeAlert.projectCode && (
              <div>
                <span className="block font-bold text-gray-700">Proyecto Afectado:</span>
                <span className="font-mono font-bold text-[#00668F]">{activeAlert.projectCode}</span>
              </div>
            )}
            {activeAlert.sku && (
              <div>
                <span className="block font-bold text-gray-700">Artículo Crítico (SKU):</span>
                <span className="font-mono font-bold text-gray-800">{activeAlert.sku}</span>
              </div>
            )}
          </div>

          <p className="text-[11px] text-gray-500 italic text-center">
            Este aviso requiere acuse de recibo obligatorio antes de continuar operando el ERP.
          </p>
        </div>

        {/* Botón de Acuse de Recibo */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end">
          <button
            type="button"
            onClick={handleAcknowledge}
            className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md transition-transform active:scale-98"
          >
            <CheckCircle size={16} className="text-emerald-400" />
            <span>Aceptar y leer alerta técnica (Desbloquear ERP)</span>
          </button>
        </div>

      </div>
    </div>
  );
};

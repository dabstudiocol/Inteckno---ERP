/**
 * Utilidades para cálculo de vigencia y alertas de calibración de equipos
 * Regla de negocio Inteckno:
 * - 2 meses antes (31 a 60 días): Alerta / Recordatorio NARANJA
 * - 1 mes antes (<= 30 días o vencido): Alerta Crítica ROJA
 * - Más de 60 días: VIGENTE (Verde)
 */

export interface CalibrationStatus {
  hasCalibration: boolean;
  expiryDate?: string;
  daysRemaining?: number;
  status: 'expired' | 'critical_1m' | 'warning_2m' | 'valid' | 'none';
  label: string;
  badgeClass: string;
  color: 'red' | 'orange' | 'green' | 'gray';
}

export function getCalibrationStatus(dateStr?: string): CalibrationStatus {
  if (!dateStr || !dateStr.trim() || dateStr.toLowerCase().includes('no requiere') || dateStr.toLowerCase().includes('n/a')) {
    return {
      hasCalibration: false,
      status: 'none',
      label: 'No Aplica',
      badgeClass: 'bg-slate-100 text-slate-500 border border-slate-200',
      color: 'gray',
    };
  }

  // Parsear fecha YYYY-MM-DD
  const expiryTime = new Date(dateStr).getTime();
  if (isNaN(expiryTime)) {
    return {
      hasCalibration: true,
      expiryDate: dateStr,
      status: 'valid',
      label: dateStr,
      badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
      color: 'gray',
    };
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiryTime - now.getTime()) / (1000 * 3600 * 24));

  if (diffDays <= 0) {
    return {
      hasCalibration: true,
      expiryDate: dateStr,
      daysRemaining: diffDays,
      status: 'expired',
      label: `Vencida (${Math.abs(diffDays)}d atrasada)`,
      badgeClass: 'bg-red-500 text-white font-black shadow-2xs',
      color: 'red',
    };
  } else if (diffDays <= 30) {
    // 1 mes antes: ALERTA ROJA CRÍTICA
    return {
      hasCalibration: true,
      expiryDate: dateStr,
      daysRemaining: diffDays,
      status: 'critical_1m',
      label: `¡Alerta! Vence en ${diffDays} días (1 mes)`,
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold animate-pulse',
      color: 'red',
    };
  } else if (diffDays <= 60) {
    // 2 meses antes: RECORDATORIO NARANJA
    return {
      hasCalibration: true,
      expiryDate: dateStr,
      daysRemaining: diffDays,
      status: 'warning_2m',
      label: `Recordatorio: Vence en ${diffDays} días (2 meses)`,
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-400 font-bold',
      color: 'orange',
    };
  } else {
    // Más de 60 días: VIGENTE
    return {
      hasCalibration: true,
      expiryDate: dateStr,
      daysRemaining: diffDays,
      status: 'valid',
      label: `Vigente (${diffDays} días)`,
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold',
      color: 'green',
    };
  }
}

import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirebaseDb } from './firebaseClient';
import { AuditLogEntry } from '../../types';

const AUDIT_STORAGE_KEY = 'itk_audit_logs';

// Eventos semilla para trazabilidad inicial
const SEED_AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: 'AUD-2026-001',
    timestamp: '2026-09-15T08:30:00.000Z',
    action: 'user_created',
    performedByUserId: 'USR-001',
    performedByName: 'David Hurtado',
    targetUserId: 'USR-002',
    targetUserName: 'Gustavo Adolfo Álvarez Restrepo',
    details: 'Alta y aprovisionamiento oficial de Gerente de Proyectos STC con vinculación a Ficha de Cargo ITK-CAR-01.',
    previousValue: undefined,
    newValue: 'Rol: gerente_proyectos | Depto: Ingeniería y Proyectos',
  },
  {
    id: 'AUD-2026-002',
    timestamp: '2026-09-20T14:15:22.000Z',
    action: 'role_changed',
    performedByUserId: 'USR-001',
    performedByName: 'David Hurtado',
    targetUserId: 'USR-003',
    targetUserName: 'Alejandro Hurtado',
    details: 'Actualización de permisos RBAC para Dirección de Operaciones Técnicas.',
    previousValue: 'supervisor_tecnico',
    newValue: 'lider_proyectos',
  },
  {
    id: 'AUD-2026-003',
    timestamp: '2026-09-28T10:05:11.000Z',
    action: 'password_reset',
    performedByUserId: 'USR-001',
    performedByName: 'David Hurtado',
    targetUserId: 'USR-005',
    targetUserName: 'Técnico Especialista STC',
    details: 'Restablecimiento de credenciales con cambio obligatorio de contraseña en próximo inicio.',
    previousValue: 'Hash anterior',
    newValue: 'Contraseña temporal asignada',
  },
  {
    id: 'AUD-2026-004',
    timestamp: '2026-10-01T09:45:00.000Z',
    action: 'permission_changed',
    performedByUserId: 'USR-001',
    performedByName: 'David Hurtado',
    targetUserId: 'ROLE-HSEQ',
    targetUserName: 'Coordinación HSEQ',
    details: 'Gobierno de Accesos: Asignación de permisos de Escritura en módulo de Artículos y Documentos.',
    previousValue: 'read',
    newValue: 'write',
  },
];

// Obtiene los logs locales asegurando que existan los eventos base
export function getAuditLogs(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
    }
  } catch (err) {
    console.warn('Error leyendo audit logs de localStorage:', err);
  }
  return SEED_AUDIT_LOGS;
}

// Guarda los logs en localStorage
function persistLocalAuditLogs(logs: AuditLogEntry[]): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs));
  } catch (err) {
    console.warn('Error guardando audit logs en localStorage:', err);
  }
}

// Registra un evento de auditoría tanto en localStorage como en Firestore
export async function recordAuditEvent(
  entryData: Omit<AuditLogEntry, 'id' | 'timestamp'>
): Promise<AuditLogEntry> {
  const currentLogs = getAuditLogs();
  const newEntry: AuditLogEntry = {
    ...entryData,
    id: `AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
    timestamp: new Date().toISOString(),
  };

  const updatedLogs = [newEntry, ...currentLogs];
  persistLocalAuditLogs(updatedLogs);

  // Sincronización transparente con Cloud Firestore
  try {
    const db = getFirebaseDb();
    if (db) {
      const colRef = collection(db, 'audit_logs');
      await addDoc(colRef, {
        ...newEntry,
        createdAtEpoch: Date.now(),
      });
    }
  } catch (err) {
    console.warn('Advertencia: No se pudo enviar el audit log a Firestore (quedará en persistencia local):', err);
  }

  return newEntry;
}

// Filtra registros de auditoría
export function filterAuditLogs(
  logs: AuditLogEntry[],
  filters: {
    userId?: string;
    action?: string;
    module?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }
): AuditLogEntry[] {
  return logs.filter((log) => {
    if (filters.action && filters.action !== 'all' && log.action !== filters.action) {
      return false;
    }
    if (filters.module && filters.module !== 'all' && log.module !== filters.module) {
      return false;
    }
    if (filters.userId && filters.userId !== 'all' && log.targetUserId !== filters.userId && log.performedByUserId !== filters.userId) {
      return false;
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom).getTime();
      const logDate = new Date(log.timestamp).getTime();
      if (logDate < from) return false;
    }
    if (filters.dateTo) {
      const to = new Date(`${filters.dateTo}T23:59:59.999Z`).getTime();
      const logDate = new Date(log.timestamp).getTime();
      if (logDate > to) return false;
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const match =
        (log.performedByName || '').toLowerCase().includes(q) ||
        (log.targetUserName || '').toLowerCase().includes(q) ||
        (log.details || '').toLowerCase().includes(q) ||
        (log.action || '').toLowerCase().includes(q) ||
        (log.module || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });
}

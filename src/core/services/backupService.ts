/**
 * CONTINUOUS BACKUP & DATA GUARDIAN SERVICE FOR INTECKNO ERP
 * Implementación oficial del agente inteckno_data_guardian.
 * Guarda instantáneas versionadas (backups) en Google Cloud Firestore y IndexedDB
 * cada vez que se realizan modificaciones financieras, presupuestales o de ITEMS.
 */

import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { getFirebaseDb } from './firebaseClient';
import { saveStateToIdb, loadStateFromIdb } from '../storage/idbStorage';

export interface DataBackupSnapshot {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  module: string;
  description: string;
  data: any;
}

const BACKUP_IDB_KEY_PREFIX = 'ITK_BACKUP_SNAPSHOT_';

/**
 * Guarda una instantánea de respaldo automática en Google Cloud Firestore y en IndexedDB
 */
export async function createSystemBackup(
  module: string,
  description: string,
  data: any,
  userId = 'system',
  userName = 'Sistema Inteckno'
): Promise<boolean> {
  const timestamp = new Date().toISOString();
  const backupId = `BCK-${Date.now()}`;

  const snapshot: DataBackupSnapshot = {
    id: backupId,
    timestamp,
    userId,
    userName,
    module,
    description,
    data,
  };

  // 1. Persistencia local ultra-resistente en IndexedDB
  try {
    await saveStateToIdb(snapshot, `${BACKUP_IDB_KEY_PREFIX}${backupId}`);
    // Mantener un índice de los últimos 20 backups locales
    const recentBackupsStr = localStorage.getItem('ITK_RECENT_BACKUP_KEYS');
    let recentKeys: string[] = [];
    if (recentBackupsStr) {
      try {
        recentKeys = JSON.parse(recentBackupsStr);
      } catch {}
    }
    recentKeys = [backupId, ...recentKeys.filter((k) => k !== backupId)].slice(0, 20);
    localStorage.setItem('ITK_RECENT_BACKUP_KEYS', JSON.stringify(recentKeys));
  } catch (idbErr) {
    console.warn('[DataGuardian] Advertencia guardando snapshot local en IndexedDB:', idbErr);
  }

  // 2. Persistencia en la nube de Google Cloud Firestore (Colección erp_backups)
  const db = getFirebaseDb();
  if (!db) return true; // Si está offline o sin conexión directa, el respaldo local ya está a salvo

  try {
    const backupRef = doc(db, 'erp_backups', backupId);
    // Sanear objetos para Firestore (eliminar posibles undefined)
    const sanitizedPayload = JSON.parse(JSON.stringify(snapshot));
    await setDoc(backupRef, sanitizedPayload);
    return true;
  } catch (cloudErr) {
    console.warn('[DataGuardian] Advertencia guardando snapshot en Firestore:', cloudErr);
    return false;
  }
}

/**
 * Obtiene los últimos respaldos guardados en la nube o local
 */
export async function getLatestBackups(limitCount = 10): Promise<DataBackupSnapshot[]> {
  const db = getFirebaseDb();
  if (db) {
    try {
      const colRef = collection(db, 'erp_backups');
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(limitCount));
      const snaps = await getDocs(q);
      const list: DataBackupSnapshot[] = [];
      snaps.forEach((docSnap) => {
        if (docSnap.exists()) {
          list.push(docSnap.data() as DataBackupSnapshot);
        }
      });
      if (list.length > 0) return list;
    } catch (err) {
      console.warn('[DataGuardian] Error consultando respaldos de Firestore, recurriendo a local:', err);
    }
  }

  // Fallback: consultar respaldos locales en IndexedDB
  const results: DataBackupSnapshot[] = [];
  try {
    const recentBackupsStr = localStorage.getItem('ITK_RECENT_BACKUP_KEYS');
    if (recentBackupsStr) {
      const keys: string[] = JSON.parse(recentBackupsStr);
      for (const k of keys.slice(0, limitCount)) {
        const item = await loadStateFromIdb<DataBackupSnapshot>(`${BACKUP_IDB_KEY_PREFIX}${k}`);
        if (item) results.push(item);
      }
    }
  } catch {}

  return results;
}

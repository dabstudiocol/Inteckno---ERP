/**
 * hseqOfflineService.ts
 * Servicio PWA Offline con IndexedDB nativo para Permisos de Seguridad (ARO) en obra.
 * Guarda localmente cuando no hay señal y sincroniza con Firebase al detectar conexión.
 * CERO Mock Data.
 */

import { HSEQAroPermit } from '../../types/ProjectSchema';
import { getFirebaseDb } from './firebaseClient';
import { doc, setDoc } from 'firebase/firestore';

const DB_NAME = 'inteckno_hseq_db';
const STORE_NAME = 'offline_permits';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no soportado en este entorno'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Guarda un permiso en IndexedDB localmente (para trabajo offline en sitio)
 */
export async function savePermitOffline(permit: HSEQAroPermit): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(permit);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Obtiene todos los permisos de un proyecto almacenados en IndexedDB
 */
export async function getOfflinePermitsByProject(projectId: string): Promise<HSEQAroPermit[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const all: HSEQAroPermit[] = req.result || [];
        resolve(all.filter((p) => p.projectId === projectId));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Error leyendo permisos offline desde IndexedDB:', err);
    return [];
  }
}

/**
 * Sincroniza permisos pendientes de IndexedDB a Firebase Cloud Firestore
 */
export async function syncOfflinePermitsToFirebase(projectId: string): Promise<number> {
  if (!navigator.onLine) {
    return 0; // Seguimos offline
  }

  const firestore = getFirebaseDb();
  if (!firestore) return 0;

  const localPermits = await getOfflinePermitsByProject(projectId);
  const pending = localPermits.filter((p) => !p.syncedToFirebase);

  let syncedCount = 0;
  for (const permit of pending) {
    try {
      const docRef = doc(firestore, `stc_projects/${projectId}/hseq_permits/${permit.id}`);
      await setDoc(docRef, {
        ...permit,
        syncedToFirebase: true,
        isOfflineDraft: false,
        syncedAt: new Date().toISOString(),
      });

      // Actualizar localmente en IndexedDB
      await savePermitOffline({
        ...permit,
        syncedToFirebase: true,
        isOfflineDraft: false,
      });

      syncedCount++;
    } catch (err) {
      console.warn(`No se pudo sincronizar permiso ${permit.id}:`, err);
    }
  }

  return syncedCount;
}

/**
 * IndexedDB Persistent Storage Engine for Inteckno ERP
 * Solves browser localStorage 5MB quota restrictions and prevents data loss.
 * High-durability local database that persists profiles, documents, and company records.
 */

const DB_NAME = 'inteckno_erp_db';
const DB_VERSION = 1;
const STORE_NAME = 'erp_state_store';
const ROOT_STATE_KEY = 'INTECKNO_STATE_SNAPSHOT';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB no está soportado en este entorno.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Save state to IndexedDB asynchronously
 */
export async function saveStateToIdb<T>(data: T, key: string = ROOT_STATE_KEY): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data, key);

      tx.oncomplete = () => {
        resolve(true);
      };

      tx.onerror = () => {
        console.warn('Error en transacción de IndexedDB:', tx.error);
        resolve(false);
      };
    });
  } catch (err) {
    console.warn('No se pudo guardar en IndexedDB:', err);
    return false;
  }
}

/**
 * Load state from IndexedDB asynchronously
 */
export async function loadStateFromIdb<T>(key: string = ROOT_STATE_KEY): Promise<T | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result ? (req.result as T) : null);
      };

      req.onerror = () => {
        console.warn('Error leyendo de IndexedDB:', req.error);
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('No se pudo acceder a IndexedDB:', err);
    return null;
  }
}

/**
 * Clear data in IndexedDB
 */
export async function clearIdb(key?: string): Promise<boolean> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (key) {
        store.delete(key);
      } else {
        store.clear();
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    });
  } catch (err) {
    return false;
  }
}

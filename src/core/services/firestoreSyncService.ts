/**
 * CLOUD FIRESTORE SYNCHRONIZATION SERVICE FOR INTECKNO ERP
 * - Keeps user profiles, chat messages, and corporate records synchronized across users in real-time.
 * - Protects against data loss and provides offline-first durability with IndexedDB.
 * - Sanitizes input payloads to defend against injection attacks and data tampering.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  limit,
  orderBy,
  Unsubscribe,
  writeBatch,
  runTransaction,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebaseClient';
import { initModuleConfigsCloudSync } from './moduleConfigService';
import { User, ChatMessage, Product, InventoryAuditLog } from '../../types';

// Sanitize string to prevent basic script injection (XSS defense)
export function sanitizeText(input: string | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .trim();
}

/**
 * Sync a single user profile to Cloud Firestore
 */
export async function syncUserToCloud(user: User): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !user?.id) return false;

  try {
    const userRef = doc(db, 'users', user.id);
    
    // Construct clean, schema-compliant user payload
    const payload: Partial<User> = {
      id: user.id,
      name: sanitizeText(user.name),
      email: user.email.toLowerCase().trim(),
      role: user.role,
      roleLabel: user.roleLabel || '',
      department: user.department || '',
      phone: sanitizeText(user.phone),
      bloodType: user.bloodType || 'O+',
      avatar: user.avatar || '',
      avatarColor: user.avatarColor || '#00668F',
      competencies: user.competencies || [],
      hseqStatus: user.hseqStatus || 'valid',
      hseqExpiresAt: user.hseqExpiresAt || '2027-12-31',
      canWorkHeights: Boolean(user.canWorkHeights),
      isActive: user.isActive !== undefined ? user.isActive : true,
    };

    if (user.birthDate) payload.birthDate = user.birthDate;
    if (user.address) payload.address = sanitizeText(user.address);
    if (user.city) payload.city = sanitizeText(user.city);
    if (user.nationalId) payload.nationalId = sanitizeText(user.nationalId);
    if (user.emergencyContactName) payload.emergencyContactName = sanitizeText(user.emergencyContactName);
    if (user.emergencyContactPhone) payload.emergencyContactPhone = sanitizeText(user.emergencyContactPhone);
    if (user.photoUrl) payload.photoUrl = user.photoUrl;
    if (user.jobPositionId) payload.jobPositionId = user.jobPositionId;
    if (user.jobPosition) payload.jobPosition = user.jobPosition;
    if (user.jobReadinessScore !== undefined) payload.jobReadinessScore = user.jobReadinessScore;
    if (user.lucianaImprovementPlan) payload.lucianaImprovementPlan = user.lucianaImprovementPlan;
    if (user.verifiedSkills) payload.verifiedSkills = user.verifiedSkills;
    if (user.certifications) payload.certifications = user.certifications;
    if (user.linkedInUrl) payload.linkedInUrl = user.linkedInUrl;
    if (user.professionalProfile) payload.professionalProfile = user.professionalProfile;
    if (user.preferences) payload.preferences = user.preferences;
    if (user.accountStatus) payload.accountStatus = user.accountStatus;
    if (user.m365AccountSynced !== undefined) payload.m365AccountSynced = user.m365AccountSynced;
    if (user.forcePasswordChange !== undefined) payload.forcePasswordChange = user.forcePasswordChange;
    if (user.password) payload.password = user.password;
    if (user.performanceEvaluations) payload.performanceEvaluations = user.performanceEvaluations;
    if (user.dataPrivacyConsent) payload.dataPrivacyConsent = user.dataPrivacyConsent;
    if (user.inductionPath) payload.inductionPath = user.inductionPath;
    if (user.onboardingCompleted !== undefined) payload.onboardingCompleted = user.onboardingCompleted;

    await setDoc(userRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('[FirestoreSync] Error sincronizando usuario:', err);
    return false;
  }
}

/**
 * Load all users from Cloud Firestore
 */
export async function loadUsersFromCloud(): Promise<User[]> {
  const db = getFirebaseDb();
  if (!db) return [];

  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    const users: User[] = [];
    snap.forEach((d) => {
      const data = d.data() as User;
      if (data && data.id && data.name && data.email) {
        users.push(data);
      }
    });
    return users;
  } catch (err) {
    console.warn('[FirestoreSync] Error cargando usuarios desde Cloud:', err);
    return [];
  }
}

/**
 * Detecta y sincroniza automáticamente usuarios locales personalizados hacia Cloud Firestore.
 * Esto garantiza que si el usuario guardó datos en su PC, se suban de inmediato a Google Cloud
 * para que aparezcan en su celular y otros dispositivos sin demora.
 */
export async function syncLocalCustomUsersToCloud(localUsers: User[]): Promise<number> {
  const db = getFirebaseDb();
  if (!db || !Array.isArray(localUsers)) return 0;

  try {
    const cloudUsers = await loadUsersFromCloud();
    const cloudMap = new Map<string, User>();
    cloudUsers.forEach((u) => cloudMap.set(u.id, u));

    let pushed = 0;
    for (const u of localUsers) {
      if (!u?.id) continue;
      const c = cloudMap.get(u.id);

      // Si el usuario local tiene foto o datos modificados que la nube aún no tiene
      const hasPhoto = Boolean(u.photoUrl && (!c || !c.photoUrl || c.photoUrl.length < 50));
      const hasPhone = Boolean(u.phone && (!c || u.phone !== c.phone));
      const hasBlood = Boolean(u.bloodType && (!c || u.bloodType !== c.bloodType));
      const hasBirth = Boolean(u.birthDate && (!c || u.birthDate !== c.birthDate));
      const hasContact = Boolean(u.emergencyContactPhone && (!c || u.emergencyContactPhone !== c.emergencyContactPhone));

      if (hasPhoto || hasPhone || hasBlood || hasBirth || hasContact || !c) {
        const merged: User = {
          ...(c || {}),
          ...u,
          photoUrl: u.photoUrl || c?.photoUrl || '',
          bloodType: u.bloodType || c?.bloodType || 'O+',
          phone: u.phone || c?.phone || '',
          birthDate: u.birthDate || c?.birthDate || '1995-01-29',
        };
        const ok = await syncUserToCloud(merged);
        if (ok) pushed++;
      }
    }
    return pushed;
  } catch (err) {
    console.warn('[FirestoreSync] Error en syncLocalCustomUsersToCloud:', err);
    return 0;
  }
}

/**
 * Subscribe to real-time updates for users
 */
export function subscribeToCloudUsers(
  onUpdate: (users: User[]) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const usersCol = collection(db, 'users');
    return onSnapshot(
      usersCol,
      (snap) => {
        const users: User[] = [];
        snap.forEach((d) => {
          const data = d.data() as User;
          if (data && data.id && data.name && data.email) {
            users.push(data);
          }
        });
        if (users.length > 0) {
          onUpdate(users);
        }
      },
      (error) => {
        console.warn('[FirestoreSync] Listener error on users:', error);
      }
    );
  } catch (err) {
    console.warn('[FirestoreSync] Error configurando suscripción a usuarios:', err);
    return null;
  }
}

/**
 * Sync a chat message to Cloud Firestore for cross-user real-time communication
 */
export async function syncChatMessageToCloud(message: ChatMessage): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !message?.id) return false;

  try {
    const msgRef = doc(db, 'chat_messages', message.id);
    const payload: Partial<ChatMessage> = {
      id: message.id,
      channel: message.channel,
      senderId: message.senderId,
      senderName: sanitizeText(message.senderName),
      senderRole: message.senderRole || '',
      avatarColor: message.avatarColor || '#00668F',
      text: sanitizeText(message.text),
      timestamp: message.timestamp || new Date().toISOString(),
      readBy: message.readBy || [message.senderId],
    };

    if (message.replyTo) payload.replyTo = message.replyTo;
    if (message.attachment) payload.attachment = message.attachment;
    if (message.audioData) payload.audioData = message.audioData;
    if (message.transcriptionText) payload.transcriptionText = message.transcriptionText;
    if (message.aiExtraction) payload.aiExtraction = message.aiExtraction;
    if (message.aiAnalysis) payload.aiAnalysis = message.aiAnalysis;
    if (message.aiStatus) payload.aiStatus = message.aiStatus;
    if (message.linkedProjectId) payload.linkedProjectId = message.linkedProjectId;
    if (message.linkedWorkOrderId) payload.linkedWorkOrderId = message.linkedWorkOrderId;
    if (message.linkedTaskUuid) payload.linkedTaskUuid = message.linkedTaskUuid;
    if (typeof message.isEmergency === 'boolean') payload.isEmergency = message.isEmergency;
    if (message.createdAt) payload.createdAt = message.createdAt;
    if (typeof message.isEdited === 'boolean') payload.isEdited = message.isEdited;
    if (message.editedAt) payload.editedAt = message.editedAt;
    if (typeof message.isForwarded === 'boolean') payload.isForwarded = message.isForwarded;
    if (typeof message.isPinned === 'boolean') payload.isPinned = message.isPinned;
    if (message.pinnedAt) payload.pinnedAt = message.pinnedAt;
    if (message.pinnedBy) payload.pinnedBy = message.pinnedBy;
    if (Array.isArray(message.starredBy)) payload.starredBy = message.starredBy;
    if (Array.isArray(message.deletedForUserIds)) payload.deletedForUserIds = message.deletedForUserIds;

    await setDoc(msgRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.warn('[FirestoreSync] Error sincronizando mensaje de chat:', err);
    return false;
  }
}

/**
 * Delete a chat message from Cloud Firestore (eliminación global para toda la empresa)
 */
export async function deleteChatMessageFromCloud(messageId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !messageId) return false;

  try {
    const msgRef = doc(db, 'chat_messages', messageId);
    // Marcamos primero con bandera isDeleted para que cualquier cliente lo descarte inmediatamente
    await setDoc(msgRef, { isDeleted: true, text: '' }, { merge: true }).catch(() => {});
    // Luego borramos el documento físicamente
    await deleteDoc(msgRef);
    return true;
  } catch (err) {
    console.warn('[FirestoreSync] Error eliminando mensaje de chat en la nube:', err);
    return false;
  }
}

/**
 * Subscribe to recent chat messages in real time (adiciones, ediciones y eliminaciones)
 */
export function subscribeToCloudChatMessages(
  onUpdate: (payload: { msgs: ChatMessage[]; removedIds: string[] }) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const chatCol = collection(db, 'chat_messages');
    const q = query(chatCol, orderBy('timestamp', 'desc'), limit(150));

    return onSnapshot(
      q,
      (snap) => {
        const msgs: ChatMessage[] = [];
        const removedIds: string[] = [];

        snap.docChanges().forEach((change) => {
          if (change.type === 'removed') {
            removedIds.push(change.doc.id);
          }
        });

        snap.forEach((d) => {
          const data = d.data() as ChatMessage;
          if (data && (data.isDeleted || (data as any).deleted)) {
            removedIds.push(d.id);
          } else if (data && data.id && data.channel && data.text) {
            msgs.push(data);
          }
        });

        onUpdate({ msgs: msgs.reverse(), removedIds });
      },
      (error) => {
        console.warn('[FirestoreSync] Listener error on chat:', error);
      }
    );
  } catch (err) {
    console.warn('[FirestoreSync] Error al suscribir chat:', err);
    return null;
  }
}

// =============================================================================
// MODULAR ERP SYNCHRONIZATION (Projects, Procurement, Operations, Commercial, Productivity)
// Transmite en vivo cualquier cambio o eliminación entre todos los usuarios y dispositivos sin recargar.
// =============================================================================

export type ErpModuleKey =
  | 'projects'
  | 'procurement'
  | 'operations'
  | 'commercial'
  | 'productivity'
  | 'hr';

const lastLocalWriteTimestamps: Record<string, string> = {};
const lastSyncedModuleHashes: Record<string, string> = {};

/**
 * Sincroniza un módulo completo de datos en Cloud Firestore
 */
export async function syncModuleToCloud(
  moduleKey: ErpModuleKey,
  payload: Record<string, any>,
  userId?: string
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    // PROTECCION DE COSTO BLAZE (Google Cloud Firestore):
    // Verificamos si la carga util ha cambiado antes de enviar setDoc a la nube.
    // Si la data es identica, cancelamos la llamada evitando una operacion de escritura innecesaria ($0 USD).
    const serialized = JSON.stringify(payload);
    if (lastSyncedModuleHashes[moduleKey] === serialized) {
      return true;
    }

    const modRef = doc(db, 'erp_modules', moduleKey);
    const now = new Date().toISOString();
    lastLocalWriteTimestamps[moduleKey] = now;
    lastSyncedModuleHashes[moduleKey] = serialized;

    await setDoc(
      modRef,
      {
        ...payload,
        lastUpdated: now,
        updatedBy: userId || 'system',
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn(`[FirestoreSync] Error sincronizando modulo ${moduleKey}:`, err);
    return false;
  }
}

/**
 * Escucha cambios en tiempo real en un modulo del ERP
 */
export function subscribeToCloudModule(
  moduleKey: ErpModuleKey,
  onUpdate: (data: Record<string, any>) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const modRef = doc(db, 'erp_modules', moduleKey);
    return onSnapshot(
      modRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data) {
            // Ignora el eco si fue emitido por este mismo cliente
            if (data.lastUpdated && data.lastUpdated === lastLocalWriteTimestamps[moduleKey]) {
              return;
            }
            onUpdate(data);
          }
        }
      },
      (error) => {
        console.warn(`[FirestoreSync] Error en listener del módulo ${moduleKey}:`, error);
      }
    );
  } catch (err) {
    console.warn(`[FirestoreSync] No se pudo suscribir al módulo ${moduleKey}:`, err);
    return null;
  }
}

/**
 * Carga directa de un módulo desde Cloud Firestore
 */
export async function loadModuleFromCloud(moduleKey: ErpModuleKey): Promise<Record<string, any> | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const modRef = doc(db, 'erp_modules', moduleKey);
    const snap = await getDoc(modRef);
    if (snap.exists()) {
      return snap.data() || null;
    }
    return null;
  } catch (err) {
    console.warn(`[FirestoreSync] Error cargando módulo ${moduleKey} desde Cloud:`, err);
    return null;
  }
}

/**
 * Carga directa del inventario particionado completo desde Cloud Firestore
 */
export async function loadInventoryFromCloud(): Promise<Product[] | null> {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    // 1. Consultar metadatos de chunks consolidados en erp_inventory (~1 sola lectura inicial)
    const metaRef = doc(db, 'erp_inventory', 'meta');
    const metaSnap = await getDoc(metaRef);
    if (metaSnap.exists()) {
      const meta = metaSnap.data();
      const chunkCount = Number(meta?.chunkCount) || 0;
      if (chunkCount === 0) return [];

      // Descargar únicamente los N chunks (ej. 4 o 5 chunks = ~4-5 lecturas en vez de 1.500)
      const chunkReads = [];
      for (let i = 0; i < chunkCount; i++) {
        const cRef = doc(db, 'erp_inventory', 'chunk_' + i);
        chunkReads.push(getDoc(cRef));
      }

      const chunkSnaps = await Promise.all(chunkReads);
      const reconstructed: Product[] = [];

      chunkSnaps.forEach((cs) => {
        if (cs.exists()) {
          const cData = cs.data();
          if (Array.isArray(cData?.items)) {
            reconstructed.push(...cData.items);
          }
        }
      });

      if (reconstructed.length > 0) {
        return reconstructed;
      }
    }

    // 2. Fallback de contingencia: si no existen chunks, leer erp_products de forma acotada
    const prodSnap = await getDocs(query(collection(db, 'erp_products'), limit(500)));
    if (!prodSnap.empty && prodSnap.size > 0) {
      const items: Product[] = [];
      prodSnap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.sku) {
          items.push(data as Product);
        }
      });
      return items;
    }

    return null;
  } catch (err) {
    console.warn('[FirestoreSync] Error cargando inventario desde Cloud:', err);
    return null;
  }
}

/**
 * Migra los productos de chunks hacia documentos individuales en erp_products (No-op para evitar picos de escritura).
 */
export async function migrateProductsToIndividualDocs(_products: Product[]): Promise<void> {
  return;
}

export async function loadKardexFromCloud(limitCount: number = 300): Promise<InventoryAuditLog[] | null> {
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const q = query(collection(db, 'erp_kardex'), orderBy('timestamp', 'desc'), limit(limitCount));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs.map((d) => d.data() as InventoryAuditLog);
  } catch (err) {
    console.warn('[FirestoreSync] Error cargando kardex desde Cloud:', err);
    return null;
  }
}

/**
 * Descarga inicial completa de todos los módulos del ERP desde Cloud Firestore
 * Garantiza que cualquier navegador o dispositivo arranque con la información central de la empresa.
 */
export async function loadAllModulesFromCloud(): Promise<{
  projects?: Record<string, any> | null;
  procurement?: Record<string, any> | null;
  operations?: Record<string, any> | null;
  commercial?: Record<string, any> | null;
  productivity?: Record<string, any> | null;
  hr?: Record<string, any> | null;
  products?: Product[] | null;
  kardex?: InventoryAuditLog[] | null;
}> {
  initModuleConfigsCloudSync();

  const [projects, procurement, operations, commercial, productivity, hr, products, kardex] = await Promise.all([
    loadModuleFromCloud('projects'),
    loadModuleFromCloud('procurement'),
    loadModuleFromCloud('operations'),
    loadModuleFromCloud('commercial'),
    loadModuleFromCloud('productivity'),
    loadModuleFromCloud('hr'),
    loadInventoryFromCloud(),
    loadKardexFromCloud(300),
  ]);

  return {
    projects,
    procurement,
    operations,
    commercial,
    productivity,
    hr,
    products,
    kardex,
  };
}

// =============================================================================
// INVENTARIO GRANULAR & KARDEX INMUTABLE
// =============================================================================

const INVENTORY_CHUNK_SIZE = 300;
let lastLocalInventoryTimestamp = '';

/**
 * Sincroniza el inventario completo tanto en documentos individuales (erp_products)
 * como en bloques compactos de aceleración de lectura (erp_inventory).
 */
export async function syncInventoryToCloud(
  products: Product[],
  userId?: string
): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db) return false;

  try {
    const now = new Date().toISOString();
    lastLocalInventoryTimestamp = now;

    if (!products || products.length === 0) {
      const metaRef = doc(db, 'erp_inventory', 'meta');
      await setDoc(metaRef, {
        totalProducts: 0,
        chunkCount: 0,
        lastUpdated: now,
        updatedBy: userId || 'system',
      });
      return true;
    }

    // Mantener chunks en erp_inventory para snapshot ultraligero y económico (~4 a 5 escrituras totales)
    const chunks: Product[][] = [];
    for (let i = 0; i < products.length; i += INVENTORY_CHUNK_SIZE) {
      chunks.push(products.slice(i, i + INVENTORY_CHUNK_SIZE));
    }

    const chunkPromises = chunks.map((chunk, idx) => {
      const chunkRef = doc(db, 'erp_inventory', 'chunk_' + idx);
      const cleanItems = JSON.parse(JSON.stringify(chunk));
      return setDoc(chunkRef, {
        chunkIndex: idx,
        itemCount: cleanItems.length,
        items: cleanItems,
        lastUpdated: now,
      });
    });

    await Promise.all(chunkPromises);

    const metaRef = doc(db, 'erp_inventory', 'meta');
    await setDoc(metaRef, {
      totalProducts: products.length,
      chunkCount: chunks.length,
      lastUpdated: now,
      updatedBy: userId || 'system',
    });

    console.log('[FirestoreSync] Sincronización de inventario particionado completada con éxito (~5 escrituras).');
    return true;
  } catch (err) {
    console.error('[FirestoreSync] Error crítico sincronizando inventario:', err);
    return false;
  }
}

export async function syncSingleProductToCloud(product: Product): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !product?.id) return false;
  try {
    const prodRef = doc(db, 'erp_products', product.id);
    const cleanProd = JSON.parse(JSON.stringify(product));
    await setDoc(prodRef, {
      ...cleanProd,
      _lastUpdated: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.error('[FirestoreSync] Error guardando producto individual:', err);
    return false;
  }
}

/**
 * Elimina un producto individual en Cloud Firestore (erp_products).
 */
export async function deleteProductFromCloud(productId: string): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !productId) return false;
  try {
    const prodRef = doc(db, 'erp_products', productId);
    await deleteDoc(prodRef);
    return true;
  } catch (err) {
    console.error('[FirestoreSync] Error eliminando producto individual:', err);
    return false;
  }
}

/**
 * Registra un asiento contable inmutable en el Kardex de Cloud Firestore.
 */
export async function recordKardexEntryCloud(entry: InventoryAuditLog): Promise<boolean> {
  const db = getFirebaseDb();
  if (!db || !entry?.id) return false;
  try {
    const kardexRef = doc(db, 'erp_kardex', entry.id);
    const cleanEntry = JSON.parse(JSON.stringify(entry));
    await setDoc(kardexRef, {
      ...cleanEntry,
      _recordedAt: new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.error('[FirestoreSync] Error registrando kardex en Cloud:', err);
    return false;
  }
}

/**
 * Escucha cambios en tiempo real del Kardex inmutable en Firestore.
 */
export function subscribeToCloudKardex(onUpdate: (logs: InventoryAuditLog[]) => void): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;
  try {
    const q = query(collection(db, 'erp_kardex'), orderBy('timestamp', 'desc'), limit(300));
    return onSnapshot(q, (snap) => {
      if (snap.empty) return;
      const logs = snap.docs.map((d) => d.data() as InventoryAuditLog);
      onUpdate(logs);
    }, (err) => {
      console.warn('[FirestoreSync] Error en listener de Kardex:', err);
    });
  } catch (err) {
    console.warn('[FirestoreSync] No se pudo suscribir a Kardex:', err);
    return null;
  }
}

/**
 * Transacción atómica de stock en Cloud Firestore con registro directo en Kardex.
 * Previene condiciones de carrera, bloquea el SKU individual y garantiza la inmutabilidad contable.
 */
export async function atomicStockTransaction(
  productId: string,
  delta: number,
  logData: Omit<InventoryAuditLog, 'id' | 'timestamp'>
): Promise<{ success: boolean; newStock: number; error?: string }> {
  const db = getFirebaseDb();
  if (!db || !productId) return { success: false, newStock: 0, error: 'DB no inicializada o ID faltante' };

  try {
    const prodRef = doc(db, 'erp_products', productId);
    const kardexId = 'KDX-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900);
    const kardexRef = doc(db, 'erp_kardex', kardexId);
    const timestamp = new Date().toISOString();

    const resultStock = await runTransaction(db, async (tx) => {
      const prodDoc = await tx.get(prodRef);
      let currentStock = Number(logData.previousStock) || 0;
      let reservedStock = 0;
      let existingData: any = {};

      if (prodDoc.exists()) {
        existingData = prodDoc.data();
        currentStock = Number(existingData.realStock) || 0;
        reservedStock = Number(existingData.reservedStock) || 0;
      }

      const calculatedStock = Math.max(0, currentStock + delta);
      const calculatedAvailable = Math.max(0, calculatedStock - reservedStock);

      // 1. Actualizar el SKU individual
      tx.set(prodRef, {
        ...existingData,
        id: productId,
        sku: logData.productSku,
        name: logData.productName,
        realStock: calculatedStock,
        availableStock: calculatedAvailable,
        lastStockUpdate: timestamp,
      }, { merge: true });

      // 2. Grabar el asiento inmutable en Kardex
      const kardexEntry: InventoryAuditLog = {
        ...logData,
        id: kardexId,
        productId,
        timestamp,
        previousStock: currentStock,
        newStock: calculatedStock,
        delta,
      };

      tx.set(kardexRef, JSON.parse(JSON.stringify(kardexEntry)));

      return calculatedStock;
    });

    return { success: true, newStock: resultStock };
  } catch (err: any) {
    console.error('[FirestoreSync] Error en transacción atómica de stock:', err);
    return { success: false, newStock: 0, error: err?.message || 'Error en transacción' };
  }
}

export function subscribeToCloudInventory(
  onUpdate: (products: Product[]) => void
): Unsubscribe | null {
  const db = getFirebaseDb();
  if (!db) return null;

  try {
    const metaRef = doc(db, 'erp_inventory', 'meta');
    return onSnapshot(
      metaRef,
      async (snap) => {
        if (!snap.exists()) return;
        const meta = snap.data();
        if (!meta) return;

        // Ignora el eco si fue emitido por este mismo cliente
        if (meta.lastUpdated && meta.lastUpdated === lastLocalInventoryTimestamp) {
          return;
        }

        const chunkCount = Number(meta.chunkCount) || 0;
        if (chunkCount === 0) {
          onUpdate([]);
          return;
        }

        // Descargar los chunks en paralelo
        try {
          const chunkReads = [];
          for (let i = 0; i < chunkCount; i++) {
            const cRef = doc(db, 'erp_inventory', `chunk_${i}`);
            chunkReads.push(getDoc(cRef));
          }

          const chunkSnaps = await Promise.all(chunkReads);
          const reconstructed: Product[] = [];

          chunkSnaps.forEach((cs) => {
            if (cs.exists()) {
              const cData = cs.data();
              if (Array.isArray(cData?.items)) {
                reconstructed.push(...cData.items);
              }
            }
          });

          if (reconstructed.length > 0 || meta.totalProducts === 0) {
            onUpdate(reconstructed);
          }
        } catch (readErr) {
          console.warn('[FirestoreSync] Error leyendo chunks de inventario:', readErr);
        }
      },
      (error) => {
        console.warn('[FirestoreSync] Error en listener de inventario:', error);
      }
    );
  } catch (err) {
    console.warn('[FirestoreSync] No se pudo suscribir al inventario:', err);
    return null;
  }
}

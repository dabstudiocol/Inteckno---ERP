// ============================================================================
// SERVICIO DE DESHACER / REHACER (UNDO / REDO) AISLADO POR USUARIO
// ============================================================================
// Garantiza que cada colaborador únicamente pueda deshacer y rehacer sus propios
// cambios, protegiendo las acciones de los demás usuarios del ERP.

export type SupportedCollection =
  | 'requisitions'
  | 'purchaseOrders'
  | 'expenses'
  | 'timesheets'
  | 'projects'
  | 'tasks'
  | 'products'
  | 'documents'
  | 'todos'
  | 'opportunities'
  | 'contacts';

export interface UserUndoAction {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  actionType: 'create' | 'update' | 'delete';
  collection: SupportedCollection;
  entityName: string; // e.g. "Requisición SOLPED-018", "Orden de Compra OC-2026-003", "Gasto Hotel"
  description: string;
  previousData?: any; // Para 'update' o 'delete' (lo que había antes)
  newData?: any;      // Para 'create' o 'update' (lo que se creó o modificó)
}

const STORAGE_KEY_UNDO = 'ITK_USER_UNDO_STACK_V1';
const STORAGE_KEY_REDO = 'ITK_USER_REDO_STACK_V1';
const MAX_HISTORY_PER_USER = 25;

function getStoredStack(key: string): UserUndoAction[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error cargando historial de deshacer/rehacer:', e);
    return [];
  }
}

function saveStack(key: string, stack: UserUndoAction[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(stack));
  } catch (e) {
    console.error('Error guardando historial de deshacer/rehacer:', e);
  }
}

class UndoRedoService {
  /**
   * Registra una acción efectuada por el usuario actual.
   * Limpia la pila de Rehacer para ese usuario, ya que una nueva acción rompe el árbol de rehacer.
   */
  public recordAction(action: Omit<UserUndoAction, 'id' | 'timestamp'>): UserUndoAction {
    const undoStack = getStoredStack(STORAGE_KEY_UNDO);
    const redoStack = getStoredStack(STORAGE_KEY_REDO);

    const fullAction: UserUndoAction = {
      ...action,
      id: `ACT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };

    // Añadir a la pila de deshacer
    undoStack.unshift(fullAction);

    // Limitar tamaño por usuario a MAX_HISTORY_PER_USER
    const userActions = undoStack.filter((a) => a.userId === fullAction.userId);
    if (userActions.length > MAX_HISTORY_PER_USER) {
      const toRemove = userActions.slice(MAX_HISTORY_PER_USER);
      const removeIds = new Set(toRemove.map((a) => a.id));
      const filtered = undoStack.filter((a) => !removeIds.has(a.id));
      saveStack(STORAGE_KEY_UNDO, filtered);
    } else {
      saveStack(STORAGE_KEY_UNDO, undoStack);
    }

    // Al hacer una nueva acción, se descarta el redoStack de ese usuario
    const updatedRedo = redoStack.filter((a) => a.userId !== fullAction.userId);
    saveStack(STORAGE_KEY_REDO, updatedRedo);

    // Notificar cambio de estado para re-renderizado reactivo
    window.dispatchEvent(new CustomEvent('inteckno:undoredo-updated'));

    return fullAction;
  }

  /**
   * Verifica si el usuario actual tiene acciones que puede deshacer
   */
  public canUndo(userId: string): boolean {
    if (!userId) return false;
    const undoStack = getStoredStack(STORAGE_KEY_UNDO);
    return undoStack.some((a) => a.userId === userId);
  }

  /**
   * Verifica si el usuario actual tiene acciones que puede rehacer
   */
  public canRedo(userId: string): boolean {
    if (!userId) return false;
    const redoStack = getStoredStack(STORAGE_KEY_REDO);
    return redoStack.some((a) => a.userId === userId);
  }

  /**
   * Obtiene la última acción para deshacer del usuario actual (sin sacarla aún de la pila)
   */
  public getLastUndoAction(userId: string): UserUndoAction | null {
    if (!userId) return null;
    const undoStack = getStoredStack(STORAGE_KEY_UNDO);
    return undoStack.find((a) => a.userId === userId) || null;
  }

  /**
   * Obtiene la siguiente acción para rehacer del usuario actual (sin sacarla aún de la pila)
   */
  public getNextRedoAction(userId: string): UserUndoAction | null {
    if (!userId) return null;
    const redoStack = getStoredStack(STORAGE_KEY_REDO);
    return redoStack.find((a) => a.userId === userId) || null;
  }

  /**
   * Extrae la última acción del usuario actual de la pila Undo y la coloca en Redo
   */
  public popUndo(userId: string): UserUndoAction | null {
    if (!userId) return null;
    const undoStack = getStoredStack(STORAGE_KEY_UNDO);
    const idx = undoStack.findIndex((a) => a.userId === userId);
    if (idx === -1) return null;

    const [action] = undoStack.splice(idx, 1);
    saveStack(STORAGE_KEY_UNDO, undoStack);

    // Mover a Redo
    const redoStack = getStoredStack(STORAGE_KEY_REDO);
    redoStack.unshift(action);
    saveStack(STORAGE_KEY_REDO, redoStack);

    window.dispatchEvent(new CustomEvent('inteckno:undoredo-updated'));
    return action;
  }

  /**
   * Extrae la acción de la pila Redo y la devuelve a Undo
   */
  public popRedo(userId: string): UserUndoAction | null {
    if (!userId) return null;
    const redoStack = getStoredStack(STORAGE_KEY_REDO);
    const idx = redoStack.findIndex((a) => a.userId === userId);
    if (idx === -1) return null;

    const [action] = redoStack.splice(idx, 1);
    saveStack(STORAGE_KEY_REDO, redoStack);

    // Mover de vuelta a Undo
    const undoStack = getStoredStack(STORAGE_KEY_UNDO);
    undoStack.unshift(action);
    saveStack(STORAGE_KEY_UNDO, undoStack);

    window.dispatchEvent(new CustomEvent('inteckno:undoredo-updated'));
    return action;
  }
}

export const undoRedoService = new UndoRedoService();

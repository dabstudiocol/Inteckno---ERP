// ============================================================================
// EVENT BUS DE DOMINIO PERSISTENTE - COMUNICACIÓN DESACOPLADA ENTRE MÓDULOS
// INTECKNO ERP - FASE 1: Patrón Outbox, Idempotencia Inmutable y Sincronización
// ============================================================================

import { loadStateFromIdb, saveStateToIdb } from '../storage/idbStorage';
import { syncModuleToCloud } from '../services/firestoreSyncService';

export type DomainEvent =
  | { type: 'MATERIAL_MASTER_APPROVED'; payload: { projectId: string; itemsCount: number } }
  | { type: 'INTERNAL_REQUEST_MISSING_STOCK'; payload: { reqId: string; productId: string; qty: number } }
  | { type: 'PURCHASE_ORDER_RECEIVED'; payload: { poId: string; projectCode?: string; totalAmount: number; lines?: Array<{ originLineId: string; amountCOP: number; sku?: string }> } }
  | { type: 'PURCHASE_ORDER_REVERSED'; payload: { poId: string; projectCode?: string; reason: string } }
  | { type: 'DISPATCH_REMISSION_CREATED'; payload: { remissionId: string; remissionNumber: string; projectId?: string; totalEstimatedCOP: number } }
  | { type: 'RETURN_REMISSION_PROCESSED'; payload: { returnRemissionId: string; originalDispatchId: string; projectId?: string; totalReturnedCOP: number } }
  | { type: 'EXPENSE_APPROVED'; payload: { expenseId: string; projectId?: string; amountCOP: number; invoiceNumber?: string } }
  | { type: 'TIMESHEET_SUBMITTED'; payload: { timesheetId: string; userId: string; hours: number } }
  | { type: 'DDR_APPROVED'; payload: { ddrId: string; projectCode: string; progressDelta: number } }
  | { type: 'MILESTONE_ACCEPTED'; payload: { milestoneId: string; projectCode: string; amountCOP: number } }
  | { type: 'HSEQ_RESTRICTION_TRIGGERED'; payload: { userId: string; userName: string; reason: string } };

export type EventSyncStatus = 'local_pending' | 'synced_to_firestore' | 'failed';

export interface PersistentDomainEventRecord {
  id: string; // UUID v4 o id único
  type: DomainEvent['type'];
  version: number;
  occurredAt: string; // ISO 8601
  actorId: string;
  correlationId: string;
  payload: any;
  status: 'pendiente' | 'procesando' | 'procesado' | 'error' | 'reintentando';
  syncStatus: EventSyncStatus;
  attempts: number;
  lastError?: string;
  processedAt?: string;
}

type Handler = (event: DomainEvent) => void | Promise<void>;

const IDB_EVENTS_KEY = 'ITK_DOMAIN_EVENTS_LOG';
const processedEventIds = new Set<string>();

class PersistentDomainEventBus {
  private handlers: Set<Handler> = new Set();
  private eventLog: PersistentDomainEventRecord[] = [];
  private isInitialized = false;

  constructor() {
    this.initFromStorage();
  }

  private async initFromStorage() {
    try {
      const stored = await loadStateFromIdb<PersistentDomainEventRecord[]>(IDB_EVENTS_KEY);
      if (Array.isArray(stored)) {
        this.eventLog = stored;
        stored.forEach((evt) => {
          if (evt.status === 'procesado') {
            processedEventIds.add(evt.id);
          }
        });
      }
      this.isInitialized = true;
      // Intenta enviar eventos pendientes offline si hay red
      this.flushPendingEventsToCloud();
    } catch (e) {
      console.warn('[DomainEventBus] Error inicializando log de eventos:', e);
      this.isInitialized = true;
    }
  }

  subscribe(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Publica un evento de dominio síncrono/reactivo para los listeners en memoria
   * y garantiza su registro persistente con patrón Outbox (IndexedDB -> Firestore).
   */
  async publish(
    event: DomainEvent,
    meta?: { actorId?: string; correlationId?: string; eventId?: string }
  ): Promise<PersistentDomainEventRecord> {
    const eventId = meta?.eventId || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const record: PersistentDomainEventRecord = {
      id: eventId,
      type: event.type,
      version: 1,
      occurredAt: new Date().toISOString(),
      actorId: meta?.actorId || 'system',
      correlationId: meta?.correlationId || eventId,
      payload: (event as any).payload || {},
      status: 'procesando',
      syncStatus: 'local_pending',
      attempts: 0,
    };

    // 1. Guardar en cola local Outbox (IndexedDB)
    this.eventLog.push(record);
    await this.persistLocalLog();

    // 2. Disparar manejadores en memoria
    this.handlers.forEach(async (h) => {
      try {
        await h(event);
      } catch (err: any) {
        console.error(`[DomainEventBus] Error procesando ${event.type}:`, err);
        record.lastError = err?.message || String(err);
        record.status = 'error';
      }
    });

    record.status = record.lastError ? 'error' : 'procesado';
    record.processedAt = new Date().toISOString();
    processedEventIds.add(record.id);

    // 3. Sincronizar a Firestore en segundo plano
    this.syncSingleEventToCloud(record);

    return record;
  }

  private async persistLocalLog() {
    try {
      // Conservar los últimos 500 eventos para evitar crecimiento desmedido en IndexedDB
      if (this.eventLog.length > 500) {
        this.eventLog = this.eventLog.slice(-500);
      }
      await saveStateToIdb(this.eventLog, IDB_EVENTS_KEY);
    } catch (e) {
      console.warn('[DomainEventBus] Error guardando eventos en IDB:', e);
    }
  }

  private async syncSingleEventToCloud(record: PersistentDomainEventRecord) {
    try {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return; // Permanecerá local_pending hasta que vuelva la conexión
      }
      const success = await syncModuleToCloud('domain_events', {
        lastEvent: record,
        recentEvents: this.eventLog.slice(-50),
      });
      if (success) {
        record.syncStatus = 'synced_to_firestore';
        await this.persistLocalLog();
      }
    } catch (err: any) {
      console.warn(`[DomainEventBus] No se pudo replicar evento ${record.id} a Cloud:`, err);
    }
  }

  public async flushPendingEventsToCloud() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const pending = this.eventLog.filter((e) => e.syncStatus === 'local_pending');
    if (pending.length === 0) return;

    try {
      const success = await syncModuleToCloud('domain_events', {
        flushedAt: new Date().toISOString(),
        recentEvents: this.eventLog.slice(-100),
      });
      if (success) {
        pending.forEach((e) => (e.syncStatus = 'synced_to_firestore'));
        await this.persistLocalLog();
      }
    } catch (e) {
      console.warn('[DomainEventBus] Error vaciando cola outbox a Cloud:', e);
    }
  }

  public isEventProcessed(eventId: string): boolean {
    return processedEventIds.has(eventId);
  }

  public getEventHistory(): PersistentDomainEventRecord[] {
    return [...this.eventLog];
  }
}

export const domainEventBus = new PersistentDomainEventBus();

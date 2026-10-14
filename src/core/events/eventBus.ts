// ============================================================================
// EVENT BUS DE DOMINIO - COMUNICACIÓN DESACOPLADA ENTRE MÓDULOS
// ============================================================================

export type DomainEvent =
  | { type: 'MATERIAL_MASTER_APPROVED'; payload: { projectId: string; itemsCount: number } }
  | { type: 'INTERNAL_REQUEST_MISSING_STOCK'; payload: { reqId: string; productId: string; qty: number } }
  | { type: 'PURCHASE_ORDER_RECEIVED'; payload: { poId: string; projectCode?: string; totalAmount: number } }
  | { type: 'TIMESHEET_SUBMITTED'; payload: { timesheetId: string; userId: string; hours: number } }
  | { type: 'DDR_APPROVED'; payload: { ddrId: string; projectCode: string; progressDelta: number } }
  | { type: 'MILESTONE_ACCEPTED'; payload: { milestoneId: string; projectCode: string; amountCOP: number } }
  | { type: 'HSEQ_RESTRICTION_TRIGGERED'; payload: { userId: string; userName: string; reason: string } };

type Handler = (event: DomainEvent) => void;

class DomainEventBus {
  private handlers: Set<Handler> = new Set();

  subscribe(handler: Handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  publish(event: DomainEvent) {
    console.log(`[DomainEvent] ${event.type}:`, event.payload);
    this.handlers.forEach((h) => {
      try {
        h(event);
      } catch (err) {
        console.error('Error handling domain event:', err);
      }
    });
  }
}

export const domainEventBus = new DomainEventBus();

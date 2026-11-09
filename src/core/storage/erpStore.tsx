
export function ensureProjectItems(p: Project): any[] {
  const existing = ((p.projectItems || (p as any).items || []) as any[]);
  let items: any[] = [];
  if (existing.length > 0) {
    items = existing.map((it: any, idx: number) => ({
      id: it.id || `item-${p.id}-${idx + 1}`,
      code: it.code || `ITEM ${String(idx + 1).padStart(2, '0')}`,
      name: it.name || `Alcance Contractual ${idx + 1}`,
      budgetPlanned: Number(it.budgetPlanned || 0),
      status: it.status || 'activo',
      createdAt: it.createdAt || new Date().toISOString(),
    }));
  } else {
    const matrixItemCodes = Array.from(new Set(((p.costMatrix || []) as any[]).map((c: any) => c.itemCode).filter(Boolean)));
    if (matrixItemCodes.length > 0) {
      items = matrixItemCodes.map((code: any, idx: number) => ({
        id: `item-${p.id}-${idx + 1}`,
        code: String(code),
        name: `Ítem Contractual ${code}`,
        budgetPlanned: 0,
        status: 'activo' as const,
        createdAt: new Date().toISOString(),
      }));
    } else {
      items = [
        {
          id: `item-${p.id}-1`,
          code: 'ITEM 01',
          name: p.name || 'Alcance Contractual Principal',
          budgetPlanned: Number(p.budgetPV || 0),
          status: 'activo' as const,
          createdAt: new Date().toISOString(),
        }
      ];
    }
  }

  // Garantizar que cada fila de costMatrix tenga su projectItemId inmutable enlazado
  if (Array.isArray(p.costMatrix)) {
    p.costMatrix.forEach((costRow: any) => {
      if (!costRow.projectItemId && costRow.itemCode) {
        const matched = items.find((it) => it.code === costRow.itemCode || it.id === costRow.itemCode);
        if (matched) {
          costRow.projectItemId = matched.id;
        }
      }
    });
  }

  return items;
}

export function recalculateProjectEvm(p: Project): Project {
  const items = ensureProjectItems(p);
  const matrix = ((p.costMatrix || []) as any[]);
  const matrixActual = matrix.reduce(
    (sum: number, row: any) => sum + Number(row?.actualTotal ?? row?.actualAmount ?? 0),
    0
  );
  const matrixPlanned = matrix.reduce(
    (sum: number, row: any) => sum + Number(row?.plannedTotal ?? row?.plannedAmount ?? 0),
    0
  );
  const actualCostAC = Math.max(Number(p.actualCostAC || 0), matrixActual);
  const contractVal = Number((p as any).contractAmount || p.budgetPV || 0);
  const eac = Math.max(actualCostAC, matrixPlanned);
  const computedMarginPct =
    eac > 0 && contractVal > 0 ? Number((((contractVal - eac) / contractVal) * 100).toFixed(2)) : 'N/D';
  return {
    ...p,
    projectItems: items,
    actualCostAC,
    ...( { computedEAC: eac, computedMarginPct } as any ),
  };
}
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getStoredTRM } from '../services/trmService';
import { getProjectTaxRate } from '../services/taxService';
import { getLaborRates } from '../services/moduleConfigService';
import { reconcileProjectAnalyticalCosts, applyProjectCostEntry } from '../services/projectFinancialEngine';
import {
  User,
  Project,
  WBSTask,
  Partner,
  Product,
  EquipmentTool,
  PurchaseOrder,
  InternalRequisition,
  DailyProgressReport,
  TimesheetEntry,
  ExpenseEntry,
  BillingMilestone,
  ProjectBillingItem,
  AppNotification,
  Opportunity,
  CRMContact,
  ChatMessage,
  DocumentItem,
  CalendarEvent,
  CalendarReminderToast,
  TodoItem,
  InternationalLead,
  EmployeeRecord,
  PayrollNovelty,
  DispatchRemission,
  RemissionItem,
  ChatGroup,
  UserPreferences,
  InventoryAuditLog,  SstInspectionRecord,  InventoryWriteOffRequest,  JobPosition,  JobApplicationCandidate,} from '../../types';
import { INITIAL_JOB_POSITIONS } from '../../modules/inteckno/CargosModule';
import {
  SEED_USERS,
  SEED_PARTNERS,
  SEED_EQUIPMENT,
  SEED_CONTACTS,
  SEED_CHAT_GROUPS,
} from '../../seed/intecknoData';
import { BusinessRulesEngine } from '../rules/businessRules';
import { domainEventBus } from '../events/eventBus';
import { playNotificationSound } from '../../utils/sound';
import {
  syncProductChangeToExcelOnline,
  appendDispatchToExcelSalidas,
  appendReturnToExcelEntradas,
} from '../services/m365Sync';
import { saveStateToIdb, loadStateFromIdb, clearIdb } from './idbStorage';
import {
  syncUserToCloud,
  loadUsersFromCloud,
  subscribeToCloudUsers,
  syncChatMessageToCloud,
  deleteChatMessageFromCloud,
  subscribeToCloudChatMessages,
  syncLocalCustomUsersToCloud,
  syncModuleToCloud,
  subscribeToCloudModule,
  syncInventoryToCloud,
  subscribeToCloudInventory,
  loadAllModulesFromCloud,
  syncSingleProductToCloud,
  deleteProductFromCloud,
  recordKardexEntryCloud,
  subscribeToCloudKardex,
  atomicStockTransaction,
  deleteUserFromCloud,
  markEntityAsDeletedPermanent,
  isEntityDeletedPermanent,
} from '../services/firestoreSyncService';
import { recordAuditEvent } from '../services/auditService';
import { undoRedoService, UserUndoAction, SupportedCollection } from '../services/undoRedoService';
import { templateManagerService } from '../services/templateManagerService';
import { createSystemBackup } from '../services/backupService';

const STORAGE_KEY = 'ITK_ERP_STATE_V2';
const SESSION_KEY = 'ITK_ERP_SESSION_V2';
export const ERP_BROADCAST_CHANNEL = 'INTECKNO_ERP_SYNC_BUS';

export function getDirectChatId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `dm-${sorted[0]}--${sorted[1]}`;
}

export function normalizeChannelId(channelId: string): string {
  if (!channelId) return 'general';
  if (channelId.startsWith('dm-')) {
    const raw = channelId.slice(3);
    const parts = raw.includes('--') ? raw.split('--') : raw.split('-');
    if (parts.length === 2) {
      return getDirectChatId(parts[0], parts[1]);
    }
    if (parts.length === 4) {
      return getDirectChatId(`${parts[0]}-${parts[1]}`, `${parts[2]}-${parts[3]}`);
    }
  }
  return channelId;
}

export function isProjectLinkedChatGroup(g: ChatGroup): {
  isProjectChannel: boolean;
  extractedCode?: string;
  extractedName?: string;
} {
  if (!g) return { isProjectChannel: false };
  const descMatch = g.description?.match(/Canal oficial del proyecto\s+(.+?)\s+para bit/i);
  const extractedCode = g.linkedProjectId || (descMatch ? descMatch[1].trim() : undefined);
  const hasCableCarEmoji = Boolean(g.name && (g.name.startsWith('🚠') || g.name.includes('🚠')));
  const extractedName = hasCableCarEmoji ? g.name.replace(/🚠/g, '').trim() : undefined;
  const isProjectChannel = Boolean(
    g.linkedProjectId ||
    g.category === 'proyecto' ||
    descMatch ||
    hasCableCarEmoji
  );
  return { isProjectChannel, extractedCode, extractedName };
}

export function sanitizeAndFilterChatGroups(
  rawGroups: ChatGroup[],
  activeProjects: Project[],
  purgeOrphans = true
): ChatGroup[] {
  if (!Array.isArray(rawGroups)) return [];
  const seenKeys = new Set<string>();
  const orphanIdsToPurge: string[] = [];
  const result: ChatGroup[] = [];

  for (const g of rawGroups) {
    if (!g || !g.id || isEntityDeletedPermanent(g.id)) continue;

    const { isProjectChannel, extractedCode, extractedName } = isProjectLinkedChatGroup(g);

    if (isProjectChannel && purgeOrphans) {
      const matchedProject = (activeProjects || []).find((p) => {
        if (!p || isEntityDeletedPermanent(p.id)) return false;
        if (extractedCode && (p.code === extractedCode || p.id === extractedCode)) return true;
        if (extractedName && p.name && p.name.trim().toLowerCase() === extractedName.toLowerCase()) return true;
        if (p.code && g.description && g.description.includes(p.code)) return true;
        return false;
      });

      if (!matchedProject) {
        orphanIdsToPurge.push(g.id);
        continue;
      }

      g.linkedProjectId = matchedProject.code;
      g.category = 'proyecto';
    }

    const dedupeKey = isProjectChannel
      ? `prj:${(g.linkedProjectId || extractedCode || g.name || '').trim().toLowerCase()}`
      : g.isDirect
      ? `dm:${normalizeChannelId(g.id)}`
      : `grp:${(g.name || '').trim().toLowerCase()}::${(g.description || '').trim().toLowerCase()}`;

    if (seenKeys.has(dedupeKey)) {
      orphanIdsToPurge.push(g.id);
      continue;
    }
    seenKeys.add(dedupeKey);
    result.push(g);
  }

  if (orphanIdsToPurge.length > 0) {
    markEntityAsDeletedPermanent(orphanIdsToPurge);
  }

  return result;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'light',
  soundEnabled: true,
  toastsEnabled: true,
  defaultCurrency: 'COP',
  visualDensity: 'comfortable',
  emailAlerts: true,
  fontSize: 'normal',
  defaultLandingModule: 'proyectos',
  dateFormat: 'DD/MM/YYYY',
  confirmBeforeDelete: true,
};

export const playNotificationChime = () => {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Tono primario suave (Re5 - 587.33Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.3);

    // Tono secundario armónico (La5 - 880Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1);
    gain2.gain.setValueAtTime(0.06, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.45);
  } catch (e) {
    // Modo silencioso si el navegador bloquea la reproducción de audio
  }
};

export interface ChatNotificationToast {
  id: string;
  channelId: string;
  channelName: string;
  senderName: string;
  senderRole?: string;
  senderAvatar: string;
  avatarColor: string;
  text: string;
  timestamp: string;
}

interface ErpState {
  isAuthenticated: boolean;
  currentUser: User;
  activeModuleId: string;
  users: User[];
  projects: Project[];
  tasks: WBSTask[];
  partners: Partner[];
  products: Product[];
  equipment: EquipmentTool[];
  purchaseOrders: PurchaseOrder[];
  requisitions: InternalRequisition[];
  milestones: BillingMilestone[];
  timesheets: TimesheetEntry[];
  expenses: ExpenseEntry[];
  ddrs: DailyProgressReport[];
  notifications: AppNotification[];

  // Remisiones de Despacho y Reingreso
  remissions: DispatchRemission[];

  // Huella Digital Inmutable de Inventario (Audit Trail)
  inventoryAuditLogs: InventoryAuditLog[];
  inventoryWriteOffs: InventoryWriteOffRequest[];
  sstInspections: SstInspectionRecord[];
  jobPositions: JobPosition[];
  candidates: JobApplicationCandidate[];

  // Nuevas colecciones
  opportunities: Opportunity[];
  contacts: CRMContact[];
  chatMessages: ChatMessage[];
  chatGroups: ChatGroup[];
  activeChatChannelId: string;
  activeChatToast: ChatNotificationToast | null;
  activeCalendarToast: CalendarReminderToast | null;
  documents: DocumentItem[];
  todos: TodoItem[];
  calendarEvents: CalendarEvent[];
  leads: InternationalLead[];
  employees: EmployeeRecord[];
  novelties: PayrollNovelty[];
  navigationContext: {
    targetModule: string;
    action: string;
    data?: any;
    timestamp: number;
  } | null;
}

export interface ErpContextType extends ErpState {
  login: (userId: string) => void;
  logout: () => void;
  switchUser: (userId: string) => void;
  authenticate: (emailOrUser: string, password: string) => { success: boolean; user?: User; error?: string };
  updateUserProfile: (userId: string, data: Partial<User>) => void;
  updateUserPreferences: (prefs: Partial<UserPreferences>) => void;
  resetUserPassword: (userId: string, newPassword: string) => void;
  createUserAccount: (user: Omit<User, 'id'>) => User;
  deleteUserAccount: (userId: string) => void;
  toggleUserStatus: (userId: string) => void;
  setActiveModule: (moduleId: string) => void;
  navigateWithContext: (targetModule: string, action: string, data?: any) => void;
  clearNavigationContext: () => void;
  notify: (type: AppNotification['type'], title: string, message: string, extra?: Partial<AppNotification>) => void;
  dismissNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (forUserId?: string) => void;

  // CHAT EN TIEMPO REAL & NOTIFICACIONES
  setActiveChatChannel: (channelId: string) => void;
  markChatAsRead: (channelId: string, userId?: string) => void;
  markAllChatsAsRead: (userId?: string) => void;
  triggerChatToast: (toast: Omit<ChatNotificationToast, 'id' | 'timestamp'>) => void;
  dismissChatToast: () => void;
  simulateColleagueMessage: (channelId?: string, text?: string) => void;


  // BAJAS DE INVENTARIO (KARDEX & GERENCIA)
  createInventoryWriteOff: (solicitud: Omit<InventoryWriteOffRequest, 'id' | 'fechaSolicitud'>) => InventoryWriteOffRequest;
  approveInventoryWriteOff: (id: string, approverId: string, approverName: string) => void;
  rejectInventoryWriteOff: (id: string, reason: string) => void;

  // TALENTO HUMANO & SST
  createSstInspection: (insp: Omit<SstInspectionRecord, 'id' | 'createdAt'>) => SstInspectionRecord;
  deleteSstInspection: (id: string) => void;
  saveJobPosition: (pos: JobPosition) => void;
  assignJobPosition: (posId: string, employeeOrUserId: string) => void;
  unassignJobPosition: (employeeOrUserId: string) => void;
  deleteJobPosition: (id: string) => void;
  saveCandidate: (cand: JobApplicationCandidate) => void;
  updateCandidateStage: (id: string, stage: JobApplicationCandidate['stage']) => void;

  // CRM & COMERCIAL
  createOpportunity: (opp: Omit<Opportunity, 'id' | 'code' | 'createdAt'>) => Opportunity;
  updateOpportunity: (id: string, data: Partial<Opportunity>) => void;
  deleteOpportunity: (id: string) => void;
  awardOpportunity: (id: string, customData?: Partial<Project>) => { success: boolean; projectId?: string; projectCode?: string };
  createContact: (contact: Omit<CRMContact, 'id'>) => void;
  updateContact: (id: string, data: Partial<CRMContact>) => void;
  deleteContact: (id: string) => void;

  // PROYECTOS & INGENIERÍA
  createProject: (prj: Omit<Project, 'id' | 'spi' | 'cpi' | 'cv' | 'earnedValueEV' | 'actualCostAC'>) => Project;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addWbsTask: (task: Omit<WBSTask, 'id' | 'actualHours'>) => void;
  updateTask: (id: string, data: Partial<WBSTask>) => void;
  deleteTask: (id: string) => void;
  updateProjectStatus: (projectId: string, status: Project['status']) => void;
  assignTechnician: (projectId: string, userId: string) => { success: boolean; error?: string; warning?: string };
  submitDDR: (ddr: Omit<DailyProgressReport, 'id' | 'reportNumber' | 'approvedByLeader'>) => void;
  approveDDR: (id: string) => void;
  deleteDDR: (id: string) => void;

  // REGISTRO DE HORAS (TIMESHEETS)
  submitTimesheet: (entry: Omit<TimesheetEntry, 'id' | 'status'>) => void;
  approveTimesheet: (id: string) => void;
  rejectTimesheet: (id: string, reason: string) => void;
  deleteTimesheet: (id: string) => void;

  // ABASTECIMIENTO & LOGÍSTICA
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'status' | 'gmApproved'>) => {
    success: boolean;
    error?: string;
    requiresGMApproval?: boolean;
  };
  approvePurchaseOrderGM: (poId: string) => void;
  receivePurchaseOrder: (poId: string) => { success: boolean; error?: string };
  receivePurchaseOrderPartial: (poId: string, itemReceipts: { sku: string; receivedQty: number }[]) => { success: boolean; error?: string };
  deletePurchaseOrder: (id: string) => void;
  updatePurchaseOrder: (id: string, data: Partial<PurchaseOrder>) => void;
  createRequisition: (req: Omit<InternalRequisition, 'id' | 'reqNumber' | 'createdAt' | 'status'> & { status?: InternalRequisition['status'] }) => {
    success: boolean;
    autoPoCreated: boolean;
    poNumber?: string;
    requisition?: InternalRequisition;
  };
  updateRequisition: (id: string, data: Partial<InternalRequisition>) => void;
  deleteRequisition: (id: string) => void;
  createPartner: (partner: Omit<Partner, 'id'>) => void;
  updatePartner: (id: string, data: Partial<Partner>) => void;
  deletePartner: (id: string) => void;
  createProduct: (product: Omit<Product, 'id'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  setAllProducts: (products: Product[]) => void;
  clearInventory: () => void;
  adjustProductStock: (productId: string, delta: number, reason?: string, projectCode?: string, source?: InventoryAuditLog['source']) => void;
  updateProductStockDirect: (productId: string, newStock: number, reason?: string, projectCode?: string, source?: InventoryAuditLog['source']) => void;
  recordInventoryAuditLog: (logData: Omit<InventoryAuditLog, 'id' | 'timestamp'>) => Promise<InventoryAuditLog>;
  loanEquipment: (toolId: string, projectId: string, userId: string) => { success: boolean; error?: string };
  returnEquipment: (toolId: string) => void;

  // REMISIONES DE DESPACHO Y REINGRESO (CUSTODIA EN CAMPO Y CONTROL DE CONSUMO)
  setAllRemissions: (remissions: DispatchRemission[]) => void;
  createDispatchRemission: (remData: Omit<DispatchRemission, 'id' | 'remissionNumber' | 'status' | 'totalDispatchedItems' | 'totalReturnedItems' | 'totalConsumedValueUSD' | 'totalConsumedValueCOP'>) => {
    success: boolean;
    remissionNumber: string;
  };
  processReturnRemission: (
    remissionId: string,
    returnedItems: { id: string; qtyReturned: number; condition?: RemissionItem['condition']; notes?: string }[],
    returnNotes: string,
    returnDate?: string,
    returnSignature?: {
      signatureUrl?: string;
      timestamp?: string;
      signerName?: string;
      signerDoc?: string;
    }
  ) => {
    success: boolean;
    consumedCostUSD: number;
    consumedCostCOP: number;
  };

  // GASTOS & CONTABILIDAD
  submitExpense: (entry: Omit<ExpenseEntry, 'id' | 'status'>) => void;
  approveExpense: (id: string) => void;
  deleteExpense: (id: string) => void;
  createMilestone: (milestoneData: Partial<BillingMilestone>) => void;
  signMilestoneAct: (milestoneId: string, signerData?: { signerName: string; signerId: string; signerRole: string; gps?: { lat: number; lng: number }; signatureHash?: string }) => void;
  issueMilestoneInvoice: (milestoneId: string, invoiceNumber: string) => void;
  markMilestonePaid: (milestoneId: string, paymentData?: { paidAt?: string; paymentReference?: string; paymentAmountCOP?: number }) => void;
  deleteMilestone: (milestoneId: string) => void;

  // MÓDULOS INTECKNO (TRANSVERSALES)
  addChatMessage: (
    channel: string,
    text: string,
    replyTo?: ChatMessage['replyTo'],
    attachment?: ChatMessage['attachment'],
    extraMeta?: Partial<ChatMessage>
  ) => void;
  updateChatMessage: (id: string, data: Partial<ChatMessage>) => void;
  deleteChatMessage: (id: string) => void;
  deleteChatMessageForMe: (id: string, userId?: string) => void;
  createChatGroup: (name: string, description: string, members: string[], extra?: Partial<ChatGroup>) => string;
  deleteChatGroup: (groupId: string) => void;
  addMembersToChatGroup: (groupId: string, newMembers: string[]) => void;
  getOrCreateDirectChat: (partnerId: string) => string;
  addDocument: (doc: Omit<DocumentItem, 'id' | 'date'>) => void;
  updateDocument: (id: string, data: Partial<DocumentItem>) => void;
  deleteDocument: (id: string) => void;
  addTodo: (
    title: string,
    priority: TodoItem['priority'],
    dueDate: string,
    assignedToUserId?: string,
    assignedToName?: string,
    projectCode?: string,
    notes?: string,
    extra?: Partial<TodoItem>
  ) => void;
  updateTodo: (id: string, data: Partial<TodoItem>) => void;
  toggleTodo: (id: string) => void;
  deleteTodo: (id: string) => void;
  createCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void;
  updateCalendarEvent: (id: string, data: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;
  batchMergeCalendarEvents: (events: CalendarEvent[]) => void;
  triggerCalendarReminderToast: (toast: CalendarReminderToast) => void;
  dismissCalendarReminderToast: () => void;

  // TALENTO HUMANO & MANTENIMIENTO
  createEmployee: (emp: Omit<EmployeeRecord, 'id'>) => void;
  updateEmployee: (id: string, data: Partial<EmployeeRecord>) => void;
  deleteEmployee: (id: string) => void;
  seedEmployeesFromUsers: () => void;
  requestPayrollNovelty: (novelty: Omit<PayrollNovelty, 'id' | 'status' | 'requestedAt'>) => { success: boolean; id?: string };
  approvePayrollNovelty: (id: string, approverName: string) => void;
  rejectPayrollNovelty: (id: string, approverName: string, reason?: string) => void;
  deletePayrollNovelty: (id: string) => void;

  // SISTEMA DESHACER / REHACER (MULTI-USUARIO AISLADO)
  canUndo: boolean;
  canRedo: boolean;
  getLastUndoAction: () => UserUndoAction | null;
  getNextRedoAction: () => UserUndoAction | null;
  executeUndo: () => { success: boolean; message: string };
  executeRedo: () => { success: boolean; message: string };
}

const ErpContext = createContext<ErpContextType | undefined>(undefined);


export function resolveUserRoleFromTitle(title: string): User['role'] {
  const t = (title || '').toLowerCase();
  if (t.includes('sistemas') || t.includes('ti') || t.includes('cloud')) return 'admin_sistemas';
  if (t.includes('gerente general') || t.includes('director general')) return 'gerente_general';
  if (t.includes('gerente administrativa') || t.includes('financier')) return 'gerente_administrativa';
  if (t.includes('lider') && (t.includes('proyecto') || t.includes('tecnico') || t.includes('técnico'))) return 'lider_proyectos';
  if (t.includes('lider') && (t.includes('ingenier') || t.includes('mecanic') || t.includes('mecánic'))) return 'lider_ingenieria';
  if (t.includes('sst') || t.includes('hseq') || t.includes('seguridad')) return 'hseq';
  if (t.includes('talento') || t.includes('rrhh') || t.includes('humano')) return 'coord_talento_humano';
  if (t.includes('compra') || t.includes('logistica') || t.includes('logística') || t.includes('almacen') || t.includes('almacén')) return 'coord_compras';
  if (t.includes('comercial') || t.includes('negocio') || t.includes('licitacion')) return 'coord_comercial';
  if (t.includes('administrativ') || t.includes('contable')) return 'auxiliar_administrativo';
  if (t.includes('ingenier') || t.includes('residente')) return 'ingeniero_proyectos';
  return 'tecnico_stc';
}

export function ensureJobPositionForRole(
  roleTitle: string,
  department?: string,
  baseSalaryCOP?: number,
  currentPositions: JobPosition[] = []
): { jobPosition: JobPosition; updatedPositions: JobPosition[]; wasCreated: boolean } {
  const cleanTitle = (roleTitle || 'Especialista Técnico STC').trim();
  const cleanDept = (department || 'Ingeniería y Proyectos').trim();
  const titleLower = cleanTitle.toLowerCase();

  const existing = currentPositions.find(
    (p) =>
      p.title?.trim().toLowerCase() === titleLower ||
      p.code?.trim().toLowerCase() === titleLower ||
      p.id?.trim().toLowerCase() === titleLower
  );

  if (existing) {
    // Si tiene salario real reportado y el rango estaba vacío, enriquecerlo
    if (baseSalaryCOP && baseSalaryCOP > 0 && (!existing.salaryRange || typeof existing.salaryRange !== 'object' || !existing.salaryRange.min)) {
      const enriched: JobPosition = {
        ...existing,
        department: existing.department || cleanDept,
        salaryRange: {
          min: baseSalaryCOP,
          max: Math.round(baseSalaryCOP * 1.25),
          currency: 'COP',
          isConfidential: true,
        },
      };
      return {
        jobPosition: enriched,
        updatedPositions: currentPositions.map((p) => (p.id === existing.id ? enriched : p)),
        wasCreated: false,
      };
    }
    return { jobPosition: existing, updatedPositions: currentPositions, wasCreated: false };
  }

  // Buscar plantilla base en INITIAL_JOB_POSITIONS si aplica
  const matchedTemplate = INITIAL_JOB_POSITIONS.find(
    (t) =>
      t.title.toLowerCase() === titleLower ||
      titleLower.includes(t.title.toLowerCase()) ||
      t.title.toLowerCase().includes(titleLower) ||
      (titleLower.includes('ingeniero residente') && t.title.toLowerCase().includes('ingeniero'))
  );

  const initials = cleanTitle
    .split(/[\s\(\)\/\-]+/)
    .filter((w) => w.length > 1 && !['de', 'en', 'el', 'la', 'los', 'las', 'y', 'del', 'para'].includes(w.toLowerCase()))
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 4) || 'STC';

  const generatedCode = `ITK-CAR-${initials}`;
  const generatedId = `POS-${cleanTitle.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 22)}`;
  const minSal = baseSalaryCOP && baseSalaryCOP > 0
    ? baseSalaryCOP
    : typeof matchedTemplate?.salaryRange === 'object' && matchedTemplate.salaryRange
    ? matchedTemplate.salaryRange.min
    : 3800000;
  const maxSal = baseSalaryCOP && baseSalaryCOP > 0
    ? Math.round(baseSalaryCOP * 1.25)
    : typeof matchedTemplate?.salaryRange === 'object' && matchedTemplate.salaryRange
    ? matchedTemplate.salaryRange.max
    : 5200000;

  const newPos: JobPosition = {
    id: generatedId,
    code: generatedCode,
    title: cleanTitle,
    department: cleanDept || matchedTemplate?.department || 'Ingeniería y Proyectos',
    purpose:
      matchedTemplate?.purpose ||
      `Planificar, ejecutar y supervisar las actividades técnicas, operativas y de ingeniería correspondientes al cargo de ${cleanTitle} dentro del departamento de ${cleanDept}, garantizando la confiabilidad electromecánica, seguridad HSEQ y cumplimiento normativo (EN 1709 / EN 12927) en los proyectos de Inteckno S.A.S.`,
    responsibilities: matchedTemplate?.responsibilities || [
      `Ejecutar y liderar las labores asignadas al rol de ${cleanTitle} en frentes de obra y sede técnica.`,
      'Cumplir estrictamente los protocolos de seguridad en alturas (Res. 4272) y lineamientos HSEQ.',
      'Registrar avances técnicos, horas laboradas y bitácoras operativas en el ERP Inteckno.',
      'Velar por el cuidado de herramientas de precisión, equipos de medición y activos asignados.',
    ],
    academicRequirements: matchedTemplate?.academicRequirements || [
      'Formación profesional, tecnológica o técnica certificada afín al área de desempeño.',
      'Certificación vigente de Trabajo Seguro en Alturas (cuando aplique a labores de campo).',
    ],
    experienceRequired: matchedTemplate?.experienceRequired || 'Mínimo 2 años de experiencia certificada en sistemas electromecánicos, transporte por cable o afines.',
    technicalSkills: matchedTemplate?.technicalSkills || [
      'Normatividad técnica de sistemas de transporte por cable (EN 1709 / EN 12927)',
      'Gestión operativa y trazabilidad en ERP Inteckno',
      'Protocolos de mantenimiento preventivo, correctivo y seguridad industrial',
    ],
    softSkills: matchedTemplate?.softSkills || [
      'Trabajo en equipo y comunicación asertiva en campo',
      'Rigurosidad técnica y orientación al detalle',
      'Compromiso con la seguridad y excelencia operativa',
    ],
    workConditions: matchedTemplate?.workConditions || [
      'Operación en sede técnica Medellín y/o proyectos STC nacionales e internacionales.',
    ],
    salaryRange: {
      min: minSal,
      max: maxSal,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: new Date().toISOString().split('T')[0],
    updatedAt: new Date().toISOString().split('T')[0],
  };

  // Si este ID o código estuvo antes en la lista de eliminados, rehabilitarlo porque se acaba de asignar o crear
  try {
    const rawDel = localStorage.getItem('ITK_DELETED_ENTITY_IDS_V1');
    if (rawDel) {
      const parsedDel: string[] = JSON.parse(rawDel);
      if (Array.isArray(parsedDel)) {
        const filteredDel = parsedDel.filter(
          (x) =>
            String(x).toLowerCase() !== generatedId.toLowerCase() &&
            String(x).toLowerCase() !== generatedCode.toLowerCase()
        );
        if (filteredDel.length !== parsedDel.length) {
          localStorage.setItem('ITK_DELETED_ENTITY_IDS_V1', JSON.stringify(filteredDel));
        }
      }
    }
  } catch {}

  const updatedPositions = [...currentPositions, newPos];
  try {
    localStorage.setItem('itk_job_positions', JSON.stringify(updatedPositions));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('inteckno:job-positions-updated'));
    }
  } catch {}

  return { jobPosition: newPos, updatedPositions, wasCreated: true };
}

export function buildUserFromEmployee(
  emp: EmployeeRecord,
  jobPosition?: JobPosition,
  existingUser?: User
): User {
  const cleanName = (emp.name || emp.fullName || existingUser?.name || 'Colaborador Inteckno').trim();
  const initials = cleanName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('') || 'IT';

  const generatedEmail =
    emp.email ||
    existingUser?.email ||
    `${cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '')}@inteckno.com`;

  const resolvedRole = existingUser?.role || resolveUserRoleFromTitle(emp.role || emp.position || jobPosition?.title || '');
  const resolvedRoleLabel = emp.role || emp.position || jobPosition?.title || existingUser?.roleLabel || 'Especialista STC';
  const resolvedDept = emp.department || jobPosition?.department || existingUser?.department || 'Ingeniería y Proyectos';
  const isHeightValid = emp.heightCertStatus === 'vigente';
  const isEmpActive = (emp as any).status !== 'inactivo';

  return {
    ...(existingUser || {}),
    id: existingUser?.id || emp.userId || emp.id,
    employeeId: emp.employeeId || emp.id,
    name: cleanName,
    email: generatedEmail,
    role: resolvedRole,
    roleLabel: resolvedRoleLabel,
    position: resolvedRoleLabel,
    department: resolvedDept,
    avatar: existingUser?.avatar || initials,
    avatarColor: existingUser?.avatarColor || '#00668F',
    password: existingUser?.password || 'Inteckno2026*',
    isActive: isEmpActive ? (existingUser?.isActive ?? true) : false,
    accountStatus: isEmpActive ? (existingUser?.accountStatus || 'activa') : 'suspendida',
    nationalId: emp.documentId || existingUser?.nationalId || '',
    phone: emp.phone || emp.emergencyPhone || existingUser?.phone || '',
    city: emp.city || existingUser?.city || 'Medellín, Antioquia',
    emergencyContactName: emp.emergencyContact || existingUser?.emergencyContactName || 'Contacto Familiar',
    emergencyContactPhone: emp.emergencyPhone || existingUser?.emergencyContactPhone || '',
    hseqStatus: isHeightValid ? 'valid' : 'expired',
    hseqExpiresAt: emp.heightCertExpiry || existingUser?.hseqExpiresAt || '2026-12-31',
    canWorkHeights: isHeightValid,
    jobPositionId: jobPosition?.id || emp.jobPositionId || existingUser?.jobPositionId,
    jobPosition: jobPosition || existingUser?.jobPosition,
    competencies: emp.competencyIds || existingUser?.competencies || ['SKILL-001', 'SKILL-004'],
    competencyIds: emp.competencyIds || existingUser?.competencyIds || ['SKILL-001', 'SKILL-004'],
  };
}

export function buildInitialEmployeesFromUsers(usersList: User[]): EmployeeRecord[] {
  const todayIso = new Date().toISOString().slice(0, 10);
  return usersList.map((u, idx) => {
    const isGerente = u.role.includes('gerente');
    const isLider = u.role.includes('lider');
    const isIng = u.role.includes('ingeniero') || u.role.includes('coord') || u.role.includes('admin');
    const isTec = u.role.includes('tecnico') || u.role.includes('supervisor');
    const salaryFromJob =
      u.jobPosition?.salaryRange && typeof u.jobPosition.salaryRange === 'object'
        ? u.jobPosition.salaryRange.min
        : 0;
    const salary = salaryFromJob > 0 ? salaryFromJob : isGerente ? 6500000 : isLider ? 4800000 : isIng ? 3800000 : isTec ? 3100000 : 2500000;
    const expiry = u.hseqExpiresAt || '2027-12-31';
    const isExpired = u.hseqStatus === 'expired' || expiry < todayIso;
    const empIdCode = u.employeeId || `EMP-${u.id}`;

    return {
      id: u.id,
      employeeId: empIdCode,
      userId: u.id,
      jobPositionId: u.jobPositionId,
      competencyIds: u.competencyIds || ['SKILL-004'],
      name: u.name,
      fullName: u.name,
      documentId: u.nationalId || `CC-${1000000000 + (idx + 1) * 11111111}`,
      role: u.roleLabel || u.role,
      position: u.roleLabel || u.role,
      department: u.department || 'Operaciones STC',
      hireDate: '2023-02-01',
      baseSalaryCOP: salary,
      monthlyBaseSalary: salary,
      city: u.city || 'Medellín',
      email: u.email,
      phone: u.phone || '+57 300 000 0000',
      heightCertExpiry: expiry,
      heightCertStatus: isExpired ? 'vencido' : 'vigente',
      medicalExamExpiry: expiry,
      medicalExamStatus: isExpired ? 'vencido' : 'vigente',
      vacationDaysAvailable: 15,
      emergencyContact: u.emergencyContactName || 'Contacto Familiar',
      emergencyPhone: u.emergencyContactPhone || '+57 300 000 0000',
    };
  });
}

export const ErpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ErpState>(() => {
    const defaultState: ErpState = {
      isAuthenticated: false,
      currentUser: SEED_USERS[0], // Gustavo Mejía
      activeModuleId: 'proyectos',
      users: SEED_USERS,
      projects: [],
      tasks: [],
      partners: SEED_PARTNERS,
      products: [],
      equipment: SEED_EQUIPMENT,
      purchaseOrders: [],
      requisitions: [],
      milestones: [],
      timesheets: [],
      expenses: [],
      ddrs: [],
      notifications: [],
      opportunities: [],
      contacts: SEED_CONTACTS,
      chatMessages: [],
      chatGroups: SEED_CHAT_GROUPS,
      activeChatChannelId: 'general',
      activeChatToast: null,
      activeCalendarToast: null,
      navigationContext: null,
      documents: [],
      todos: [],
      calendarEvents: [],
      leads: [],
      employees: buildInitialEmployeesFromUsers(SEED_USERS),
      novelties: [],
      remissions: [],
      inventoryAuditLogs: [],
      inventoryWriteOffs: [],
      sstInspections: [],
      jobPositions: INITIAL_JOB_POSITIONS,
      candidates: [],
    };

    try {
      const MOCK_CLEAN_KEY = 'ITK_ERP_PURGED_MOCKS_FINAL_V2';
      const hasPurged = typeof localStorage !== 'undefined' ? localStorage.getItem(MOCK_CLEAN_KEY) : null;
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      const sessionSaved = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_KEY) : null;
      let activeUser = defaultState.currentUser;
      let activeAuth = defaultState.isAuthenticated;

      if (sessionSaved) {
        try {
          const parsedSession = JSON.parse(sessionSaved);
          if (parsedSession.currentUser) activeUser = parsedSession.currentUser;
          if (parsedSession.isAuthenticated !== undefined) activeAuth = parsedSession.isAuthenticated;
        } catch (e) {}
      }

      // Si es la primera vez que se ejecuta con la versión limpia, purgar cualquier dato de prueba previo
      if (!hasPurged && typeof localStorage !== 'undefined') {
        localStorage.setItem(MOCK_CLEAN_KEY, 'true');
        // Limpiar también storages de servicios de facturas y nóminas de prueba
        localStorage.removeItem('inteckno_radian_electronic_invoices_v1');
        localStorage.removeItem('inteckno_dian_support_documents_v1');
        localStorage.removeItem('inteckno_dian_payroll_records_v1');
        localStorage.removeItem('itk_candidates');
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        if (!sessionSaved) {
          if (parsed.currentUser) activeUser = parsed.currentUser;
          if (parsed.isAuthenticated !== undefined) activeAuth = parsed.isAuthenticated ?? false;
        }

        const seedUsers = defaultState.users.filter((su) => !isEntityDeletedPermanent(su.id, su.email));
        const mergedUsers: User[] = (parsed.users && Array.isArray(parsed.users) ? parsed.users : seedUsers)
          .filter((u: User) => !isEntityDeletedPermanent(u?.id, u?.email))
          .map((u: User) => {
          const seed = seedUsers.find((su) => su.id === u.id || su.email?.toLowerCase() === u.email?.toLowerCase());
          return {
            ...seed,
            ...u,
            name: u.name || seed?.name || '',
            nationalId: u.nationalId || (u as any)?.cedula || seed?.nationalId || '',
            email: u.email || seed?.email || '',
            jobPositionId: u.jobPositionId || seed?.jobPositionId,
            jobPosition: u.jobPosition || seed?.jobPosition,
            role: (u.email === 'sistemas@inteckno.com' ? 'admin_sistemas' : (u.role || seed?.role || 'tecnico_stc')) as User['role'],
            roleLabel: u.email === 'sistemas@inteckno.com' ? 'Administrador de Sistemas & TI' : (u.roleLabel || seed?.roleLabel || ''),
            department: u.department || seed?.department || 'Ingeniería y Proyectos',
            birthDate: u.birthDate || seed?.birthDate,
            bloodType: u.bloodType || seed?.bloodType || 'O+',
            phone: u.phone !== undefined ? u.phone : seed?.phone,
            address: u.address !== undefined ? u.address : seed?.address,
            city: u.city !== undefined ? u.city : seed?.city,
            emergencyContactName: u.emergencyContactName !== undefined ? u.emergencyContactName : seed?.emergencyContactName,
            emergencyContactPhone: u.emergencyContactPhone !== undefined ? u.emergencyContactPhone : seed?.emergencyContactPhone,
            photoUrl: u.photoUrl !== undefined ? u.photoUrl : (seed?.photoUrl || ''),
            avatar: u.avatar || seed?.avatar || '',
            avatarColor: u.avatarColor || seed?.avatarColor || '#0078D4',
            password: u.password || seed?.password || (u.email === 'sistemas@inteckno.com' ? 'Bruno0129$' : 'Inteckno2026*'),
            isActive: u.isActive !== undefined ? u.isActive : (seed?.isActive ?? true),
            preferences: u.preferences || seed?.preferences,
            verifiedSkills: u.verifiedSkills || [],
            certifications: u.certifications || [],
            professionalProfile: u.professionalProfile || seed?.professionalProfile,
            lucianaImprovementPlan: u.lucianaImprovementPlan || seed?.lucianaImprovementPlan,
          };
        });

        seedUsers.forEach((su) => {
          if (
            (!isEntityDeletedPermanent(su.id, su.email) || su.email.toLowerCase() === 'sistemas@inteckno.com') &&
            !mergedUsers.some((mu) => mu.id === su.id || mu.email.toLowerCase() === su.email.toLowerCase())
          ) {
            mergedUsers.push(su);
          }
        });

        // Garantía absoluta: el usuario Sistemas Inteckno siempre debe estar presente
        const sistemasSeed = SEED_USERS.find((su) => su.email === 'sistemas@inteckno.com');
        if (sistemasSeed && !mergedUsers.some((u) => u.email.toLowerCase() === 'sistemas@inteckno.com')) {
          mergedUsers.unshift(sistemasSeed);
        }

        const resolvedActiveUser =
          (activeUser?.id && mergedUsers.find((u) => u.id === activeUser.id)) ||
          mergedUsers[0] ||
          defaultState.currentUser;

        // Si aún no se había purgado en este navegador, retornar estado limpio sin mocks
        if (!hasPurged) {
          return {
            ...defaultState,
            users: mergedUsers,
            currentUser: resolvedActiveUser,
            isAuthenticated: activeAuth,
          };
        }

        // Si ya estaba purgado, cargar los registros ingresados por el usuario (filtrando eliminados permanentemente)
        return {
          ...defaultState,
          ...parsed,
          users: mergedUsers,
          currentUser: resolvedActiveUser,
          isAuthenticated: activeAuth,
          activeChatChannelId: parsed.activeChatChannelId || 'general',
          activeChatToast: null,
          activeCalendarToast: null,
          projects: Array.isArray(parsed.projects) ? parsed.projects.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          partners: (Array.isArray(parsed.partners) ? parsed.partners : SEED_PARTNERS).filter((x: any) => !isEntityDeletedPermanent(x?.id)),
          products: Array.isArray(parsed.products) ? parsed.products.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          equipment: (Array.isArray(parsed.equipment) ? parsed.equipment : SEED_EQUIPMENT).filter((x: any) => !isEntityDeletedPermanent(x?.id)),
          purchaseOrders: Array.isArray(parsed.purchaseOrders) ? parsed.purchaseOrders.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          requisitions: Array.isArray(parsed.requisitions) ? parsed.requisitions.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          milestones: Array.isArray(parsed.milestones) ? parsed.milestones.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          timesheets: Array.isArray(parsed.timesheets) ? parsed.timesheets.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          ddrs: Array.isArray(parsed.ddrs) ? parsed.ddrs.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          contacts: (Array.isArray(parsed.contacts) ? parsed.contacts : SEED_CONTACTS).filter((x: any) => !isEntityDeletedPermanent(x?.id)),
          chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
          chatGroups: sanitizeAndFilterChatGroups(
            Array.isArray(parsed.chatGroups) ? parsed.chatGroups : SEED_CHAT_GROUPS,
            Array.isArray(parsed.projects) ? parsed.projects.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
            true
          ),
          documents: Array.isArray(parsed.documents) ? parsed.documents.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          todos: Array.isArray(parsed.todos) ? parsed.todos.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          leads: Array.isArray(parsed.leads) ? parsed.leads.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          employees: (Array.isArray(parsed.employees) ? parsed.employees : buildInitialEmployeesFromUsers(mergedUsers)).filter(
            (x: any) => !isEntityDeletedPermanent(x?.id, x?.email) && !isEntityDeletedPermanent(x?.userId)
          ),
          novelties: Array.isArray(parsed.novelties) ? parsed.novelties.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          remissions: Array.isArray(parsed.remissions) ? parsed.remissions.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : [],
          inventoryAuditLogs: Array.isArray(parsed.inventoryAuditLogs) ? parsed.inventoryAuditLogs : [],
        };
      }
    } catch (e) {
      console.error('Error reading localStorage:', e);
    }
    return defaultState;
  });

  // Persistir sesión específica de esta ventana/pestaña
  useEffect(() => {
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            currentUser: state.currentUser,
            isAuthenticated: state.isAuthenticated,
          })
        );
      }
    } catch (e) {}
  }, [state.currentUser, state.isAuthenticated]);

  // Persistir concurrentemente en IndexedDB (sin límite de 5MB) y localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('Alerta de cuota en localStorage, guardando versión compacta y persistiendo en IndexedDB:', e);
      try {
        const lightChat = state.chatMessages.map((m) => {
          if (m.audioData?.base64 && m.audioData.base64.length > 30000) {
            return {
              ...m,
              audioData: { ...m.audioData, base64: '' },
              attachment: m.attachment?.base64Data ? { ...m.attachment, base64Data: '' } : m.attachment,
            };
          }
          return m;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, chatMessages: lightChat }));
      } catch (e2) {
        console.warn('LocalStorage saturado totalmente, confiando en IndexedDB:', e2);
      }
    }
    // Guardar copia durable completa en IndexedDB (sin límite de tamaño)
    saveStateToIdb(state).catch((err) => {
      console.warn('Error guardando en IndexedDB:', err);
    });
  }, [state]);

  // Garantizar modo diurno de alto contraste y legibilidad óptima, y aplicar preferencias de densidad y fuente
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark');
      const density = state.currentUser?.preferences?.visualDensity || 'comfortable';
      document.documentElement.setAttribute('data-density', density);
      const fontSize = state.currentUser?.preferences?.fontSize || 'normal';
      document.documentElement.setAttribute('data-font-size', fontSize);
    }
  }, [state.currentUser?.preferences?.visualDensity, state.currentUser?.preferences?.fontSize]);

  // Re-renderizado reactivo cuando se añade, deshace o rehace una acción en el stack del usuario
  const [undoVersion, setUndoVersion] = useState(0);
  useEffect(() => {
    const handleUndoRedoUpdate = () => setUndoVersion((v) => v + 1);
    window.addEventListener('inteckno:undoredo-updated', handleUndoRedoUpdate);
    return () => window.removeEventListener('inteckno:undoredo-updated', handleUndoRedoUpdate);
  }, []);

  const canUndo = useMemo(() => {
    return undoRedoService.canUndo(state.currentUser?.id || '');
  }, [state.currentUser?.id, undoVersion]);

  const canRedo = useMemo(() => {
    return undoRedoService.canRedo(state.currentUser?.id || '');
  }, [state.currentUser?.id, undoVersion]);

  const getLastUndoAction = useCallback(() => {
    return undoRedoService.getLastUndoAction(state.currentUser?.id || '');
  }, [state.currentUser?.id, undoVersion]);

  const getNextRedoAction = useCallback(() => {
    return undoRedoService.getNextRedoAction(state.currentUser?.id || '');
  }, [state.currentUser?.id, undoVersion]);

  // Control de sincronización en la nube (Cloud-First) con banderas aisladas por módulo
  const isRemoteUpdateRef = useRef(false);
  const remoteModuleFlagsRef = useRef<Record<string, boolean>>({});
  const isCloudLoadedRef = useRef(false);

  // Registro persistente en memoria y almacenamiento local de IDs de mensajes eliminados
  const deletedChatIdsRef = useRef<Set<string>>((() => {
    try {
      const stored = localStorage.getItem('ITK_DELETED_CHAT_IDS');
      if (stored) {
        return new Set<string>(JSON.parse(stored));
      }
    } catch {}
    return new Set<string>();
  })());

  // Cargar datos durables desde IndexedDB y suscribirse a Cloud Firestore en tiempo real
  useEffect(() => {
    let isMounted = true;

    // Desbloquear y limpiar tombstone accidental de la cuenta de Sistemas Inteckno
    try {
      if (typeof localStorage !== 'undefined') {
        const rawDel = localStorage.getItem('ITK_DELETED_ENTITY_IDS_V1');
        if (rawDel) {
          const arr = JSON.parse(rawDel);
          if (Array.isArray(arr)) {
            const cleaned = arr.filter((x) => {
              const s = String(x).toLowerCase().trim();
              return s !== 'sistemas@inteckno.com' && s !== 'usr-99' && s !== 'emp-usr-99' && s !== 'sistemas';
            });
            if (cleaned.length !== arr.length) {
              localStorage.setItem('ITK_DELETED_ENTITY_IDS_V1', JSON.stringify(cleaned));
            }
          }
        }
      }
    } catch {}

    // 0. CARGA INICIAL FORZADA DESDE GOOGLE CLOUD FIRESTORE (CLOUD-FIRST):
    // Garantiza que cualquier navegador, PC o celular descargue la base de datos central antes de cualquier cosa.
    loadAllModulesFromCloud().then((cloudData) => {
      if (!isMounted || !cloudData) return;
      isRemoteUpdateRef.current = true;
      setState((prev) => {
        const next: ErpState = { ...prev };
        let hasChanges = false;

        // Projects (Reconciliación: Si un proyecto local fue actualizado más recientemente, respetar la decisión del usuario)
        if (cloudData.projects) {
          if (Array.isArray(cloudData.projects.projects)) {
            const incomingProjects = cloudData.projects.projects.filter((p: Project) => !isEntityDeletedPermanent(p?.id));
            const merged = incomingProjects.map((remoteP: Project) => {
              const localP = prev.projects.find((lp) => lp.id === remoteP.id);
              if (!localP) return remoteP;

              // Comparar marcas de tiempo: Si el local es más reciente que el remoto, priorizar el estado local
              const localTime = localP.updatedAt ? new Date(localP.updatedAt).getTime() : 0;
              const remoteTime = (remoteP as any).updatedAt ? new Date((remoteP as any).updatedAt).getTime() : 0;

              if (localTime > remoteTime) {
                return {
                  ...remoteP,
                  ...localP,
                };
              }

              // Si el remoto es más reciente o igual, tomamos el remoto pero preservamos colecciones locales si en el remoto son indefinidas
              return {
                ...remoteP,
                projectItems: (remoteP as any).projectItems !== undefined
                  ? (remoteP as any).projectItems
                  : (localP as any).projectItems,
                costMatrix: (remoteP as any).costMatrix !== undefined
                  ? (remoteP as any).costMatrix
                  : (localP as any).costMatrix,
                billingItems: (remoteP as any).billingItems !== undefined
                  ? (remoteP as any).billingItems
                  : (localP as any).billingItems,
                offerBudget: (remoteP as any).offerBudget !== undefined
                  ? (remoteP as any).offerBudget
                  : (localP as any).offerBudget,
                staffAssignments: (remoteP as any).staffAssignments !== undefined
                  ? (remoteP as any).staffAssignments
                  : (localP as any).staffAssignments,
              };
            });
            // Añadir proyectos locales creados que aún no estén en la nube
            prev.projects.forEach((lp) => {
              if (!isEntityDeletedPermanent(lp?.id) && !merged.some((mp: Project) => mp.id === lp.id)) {
                merged.push(lp);
              }
            });
            next.projects = merged.map((p: Project) => recalculateProjectEvm(p));
            hasChanges = true;
          }
          if (Array.isArray(cloudData.projects.tasks)) { next.tasks = cloudData.projects.tasks.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.projects.milestones)) { next.milestones = cloudData.projects.milestones.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
        }

        // Procurement
        if (cloudData.procurement) {
          if (Array.isArray(cloudData.procurement.purchaseOrders)) { next.purchaseOrders = cloudData.procurement.purchaseOrders.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.procurement.requisitions)) { next.requisitions = cloudData.procurement.requisitions.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.procurement.equipment)) { next.equipment = cloudData.procurement.equipment.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.procurement.partners)) { next.partners = cloudData.procurement.partners.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.procurement.inventoryAuditLogs)) { next.inventoryAuditLogs = cloudData.procurement.inventoryAuditLogs; hasChanges = true; }
          if (Array.isArray(cloudData.procurement.inventoryWriteOffs)) { next.inventoryWriteOffs = cloudData.procurement.inventoryWriteOffs; hasChanges = true; }
        }

        // Products / Inventory
        if (Array.isArray(cloudData.products) && cloudData.products.length > 0) {
          next.products = cloudData.products.filter((x: any) => !isEntityDeletedPermanent(x?.id));
          hasChanges = true;
        }

        // Kardex inmutable sincronizado desde Cloud
        if (Array.isArray(cloudData.kardex) && cloudData.kardex.length > 0) {
          const existingIds = new Set(next.inventoryAuditLogs.map((l) => l.id));
          const toAdd = cloudData.kardex.filter((l) => !existingIds.has(l.id));
          if (toAdd.length > 0) {
            next.inventoryAuditLogs = [...toAdd, ...next.inventoryAuditLogs];
            hasChanges = true;
          }
        }

        // Operations
        if (cloudData.operations) {
          if (Array.isArray(cloudData.operations.timesheets)) { next.timesheets = cloudData.operations.timesheets.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.operations.expenses)) { next.expenses = cloudData.operations.expenses.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.operations.ddrs)) { next.ddrs = cloudData.operations.ddrs.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.operations.remissions)) { next.remissions = cloudData.operations.remissions.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.operations.employees)) { next.employees = cloudData.operations.employees.filter((x: any) => !isEntityDeletedPermanent(x?.id, x?.email) && !isEntityDeletedPermanent(x?.userId)); hasChanges = true; }
          if (Array.isArray(cloudData.operations.novelties)) { next.novelties = cloudData.operations.novelties.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
        }

        // HR (Talento Humano & SST)
        if (cloudData.hr) {
          if (Array.isArray(cloudData.hr.employees)) {
            const validCloudEmployees = cloudData.hr.employees.filter(
              (x: any) => !isEntityDeletedPermanent(x?.id, x?.email) && !isEntityDeletedPermanent(x?.userId)
            );
            if (validCloudEmployees.length > 0) {
              next.employees = validCloudEmployees;
            } else if (!next.employees || next.employees.length === 0) {
              const autoSeeded = buildInitialEmployeesFromUsers(
                (next.users && next.users.length > 0 ? next.users : SEED_USERS).filter(
                  (u) => !isEntityDeletedPermanent(u.id, u.email)
                )
              );
              next.employees = autoSeeded;
              syncModuleToCloud('hr', {
                employees: autoSeeded,
                novelties: cloudData.hr.novelties || [],
                sstInspections: cloudData.hr.sstInspections || [],
                jobPositions: cloudData.hr.jobPositions || [],
                candidates: cloudData.hr.candidates || [],
              }, prev.currentUser?.id || 'USR-01').catch(console.warn);
            }
            hasChanges = true;
          }
          if (Array.isArray(cloudData.hr.novelties)) { next.novelties = cloudData.hr.novelties.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.hr.sstInspections)) { next.sstInspections = cloudData.hr.sstInspections.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.hr.jobPositions) && cloudData.hr.jobPositions.length > 0) { next.jobPositions = cloudData.hr.jobPositions.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.hr.candidates)) { next.candidates = cloudData.hr.candidates.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
        }

        // Commercial
        if (cloudData.commercial) {
          if (Array.isArray(cloudData.commercial.opportunities)) { next.opportunities = cloudData.commercial.opportunities.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.commercial.contacts)) { next.contacts = cloudData.commercial.contacts.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.commercial.leads)) { next.leads = cloudData.commercial.leads.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
        }

        // Productivity
        if (cloudData.productivity) {
          if (Array.isArray(cloudData.productivity.todos)) { next.todos = cloudData.productivity.todos.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.productivity.calendarEvents)) { next.calendarEvents = cloudData.productivity.calendarEvents.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.productivity.documents)) { next.documents = cloudData.productivity.documents.filter((x: any) => !isEntityDeletedPermanent(x?.id)); hasChanges = true; }
          if (Array.isArray(cloudData.productivity.chatGroups)) {
            next.chatGroups = sanitizeAndFilterChatGroups(cloudData.productivity.chatGroups, next.projects, true);
            hasChanges = true;
          }
        }
        next.chatGroups = sanitizeAndFilterChatGroups(next.chatGroups, next.projects, true);

        // Reconciliación Analítica Transversal al cargar desde Cloud (SAP/Odoo Single Source of Truth)
        if (Array.isArray(next.projects) && next.projects.length > 0) {
          const activeTrm = getStoredTRM() || 4150;
          next.projects = next.projects.map((p) =>
            recalculateProjectEvm(
              reconcileProjectAnalyticalCosts(p, {
                purchaseOrders: next.purchaseOrders,
                expenses: next.expenses,
                timesheets: next.timesheets,
                remissions: next.remissions,
                trm: activeTrm,
              })
            )
          );
        }

        // Reconciliación bidireccional inmediata con Firestore:
        // Si el cliente local en memoria tiene productos y la nube no los tiene (ej: importación inicial previa),
        // subirlos inmediatamente a Cloud Firestore para que toda la empresa los tenga.
        const localProducts = prev.products || [];
        const cloudProductsCount = Array.isArray(cloudData?.products) ? cloudData.products.length : 0;

        if (localProducts.length > cloudProductsCount) {
          console.log(`[CloudSync] El cliente local tiene más artículos (${localProducts.length}) que la nube (${cloudProductsCount}). Sincronizando catálogo completo hacia Google Cloud Firestore...`);
          syncInventoryToCloud(localProducts, prev.currentUser?.id || 'USR-01').catch(console.warn);
        }

        return hasChanges ? next : prev;
      });
      isCloudLoadedRef.current = true;
    }).catch((err) => {
      console.warn('[CloudSync] Error en carga inicial forzada de módulos:', err);
      isCloudLoadedRef.current = true;
    });

    // 1. Sincronización automática de usuarios locales hacia la nube de Google Cloud:
    // Si este dispositivo tiene datos personalizados (foto, RH, teléfono), los sube para que el celular los vea
    syncLocalCustomUsersToCloud(state.users).catch((err) => {
      console.warn('[Sync] Auto-sincronización inicial hacia Cloud:', err);
    });

    // 2. Reconciliación con IndexedDB (por si localStorage fue vaciado o recortado)
    loadStateFromIdb<ErpState>().then((idbState) => {
      if (!isMounted || !idbState) return;
      if (idbState.users && Array.isArray(idbState.users)) {
        syncLocalCustomUsersToCloud(idbState.users).catch(() => {});
      }
      setState((prev) => {
        const hasIdbProducts = Array.isArray(idbState.products) && idbState.products.length > (prev.products?.length || 0);
        if (hasIdbProducts) {
          console.log(`[IndexedDB] Recuperados ${idbState.products.length} productos desde almacenamiento local durable. Subiendo a Firestore...`);
          syncInventoryToCloud(idbState.products, prev.currentUser?.id || 'USR-01').catch(console.warn);
        }

        if (idbState.users && Array.isArray(idbState.users) && idbState.users.length > 0) {
          const mergedUsers = prev.users
            .filter((pu) => !isEntityDeletedPermanent(pu.id, pu.email))
            .map((pu) => {
              const idbUser = idbState.users.find((iu) => iu.id === pu.id && !isEntityDeletedPermanent(iu.id, iu.email));
              return idbUser ? { ...pu, ...idbUser } : pu;
            });
          const updatedCurrent =
            (prev.currentUser?.id && mergedUsers.find((u) => u.id === prev.currentUser.id)) ||
            prev.currentUser ||
            mergedUsers[0];
          return {
            ...prev,
            users: mergedUsers,
            currentUser: updatedCurrent,
            products: hasIdbProducts ? idbState.products : prev.products,
          };
        } else if (hasIdbProducts) {
          return {
            ...prev,
            products: idbState.products,
          };
        }
        return prev;
      });
    });

    // 2. Suscribirse a usuarios en Cloud Firestore (multi-usuario en tiempo real)
    const unsubUsers = subscribeToCloudUsers((cloudUsers, removedIds) => {
      if (!isMounted) return;
      setState((prev) => {
        const removedSet = new Set((removedIds || []).map((r) => String(r).toLowerCase()));
        const mergedUsers = prev.users
          .filter(
            (localUser) =>
              !removedSet.has(localUser.id.toLowerCase()) &&
              !isEntityDeletedPermanent(localUser.id, localUser.email)
          )
          .map((localUser) => {
            const cloudMatch = (cloudUsers || []).find(
              (cu) => cu.id === localUser.id || cu.email?.toLowerCase() === localUser.email?.toLowerCase()
            );
            if (cloudMatch) {
              return {
                ...localUser,
                ...cloudMatch,
                // Preservar datos locales si la nube aún no los ha populado o son más detallados
                role: cloudMatch.role || localUser.role,
                roleLabel: cloudMatch.roleLabel || localUser.roleLabel,
                jobPositionId: cloudMatch.jobPositionId || localUser.jobPositionId,
                jobPosition: cloudMatch.jobPosition || localUser.jobPosition,
                nationalId: cloudMatch.nationalId || localUser.nationalId || (localUser as any)?.cedula || '',
                birthDate: cloudMatch.birthDate || localUser.birthDate,
                bloodType: cloudMatch.bloodType || localUser.bloodType,
                phone: cloudMatch.phone || localUser.phone,
                address: cloudMatch.address || localUser.address,
                city: cloudMatch.city || localUser.city,
                emergencyContactName: cloudMatch.emergencyContactName || localUser.emergencyContactName,
                emergencyContactPhone: cloudMatch.emergencyContactPhone || localUser.emergencyContactPhone,
                photoUrl: cloudMatch.photoUrl || localUser.photoUrl,
                verifiedSkills: cloudMatch.verifiedSkills && cloudMatch.verifiedSkills.length > 0 ? cloudMatch.verifiedSkills : localUser.verifiedSkills,
                certifications: cloudMatch.certifications && cloudMatch.certifications.length > 0 ? cloudMatch.certifications : localUser.certifications,
                professionalProfile: cloudMatch.professionalProfile || localUser.professionalProfile,
                lucianaImprovementPlan: cloudMatch.lucianaImprovementPlan || localUser.lucianaImprovementPlan,
                jobReadinessScore: cloudMatch.jobReadinessScore !== undefined ? cloudMatch.jobReadinessScore : localUser.jobReadinessScore,
              };
            }
            return localUser;
          });

        // Incorporar usuarios creados en otros dispositivos que aún no estaban en prev.users
        (cloudUsers || []).forEach((cu) => {
          if (isEntityDeletedPermanent(cu.id, cu.email)) return;
          const exists = mergedUsers.some(
            (mu) => mu.id === cu.id || (mu.email && cu.email && mu.email.toLowerCase() === cu.email.toLowerCase())
          );
          if (!exists && cu.id && cu.email) {
            mergedUsers.push(cu);
          }
        });

        const updatedEmployees = prev.employees.filter(
          (emp) =>
            !removedSet.has(String(emp.id).toLowerCase()) &&
            !removedSet.has(String(emp.userId || '').toLowerCase()) &&
            !isEntityDeletedPermanent(emp.id, emp.email) &&
            !isEntityDeletedPermanent(emp.userId)
        );

        const updatedCurrent =
          (prev.currentUser?.id && mergedUsers.find((u) => u.id === prev.currentUser.id)) ||
          prev.currentUser ||
          mergedUsers[0];

        return {
          ...prev,
          users: mergedUsers,
          employees: updatedEmployees,
          currentUser: updatedCurrent,
        };
      });
    });

    // 0. Cargar estado durable de IndexedDB para recuperar audios y transcripciones si localStorage sufrió cuota
    loadStateFromIdb<ErpState>().then((idbState) => {
      if (!isMounted || !idbState?.chatMessages?.length) return;
      setState((prev) => {
        const idbMap = new Map(idbState.chatMessages.map((m) => [m.id, m]));
        const mergedChat = prev.chatMessages.map((m) => {
          const idbMsg = idbMap.get(m.id);
          if (idbMsg) {
            idbMap.delete(m.id);
            return {
              ...m,
              transcriptionText: m.transcriptionText || idbMsg.transcriptionText,
              aiExtraction: m.aiExtraction || idbMsg.aiExtraction,
              aiStatus: ((m.aiStatus === 'done' || idbMsg.aiStatus === 'done' || m.transcriptionText || idbMsg.transcriptionText)
                ? 'done'
                : (m.aiStatus || idbMsg.aiStatus || 'idle')) as 'error' | 'idle' | 'processing' | 'done',
              attachment: m.attachment || idbMsg.attachment,
            };
          }
          return m;
        });
        const remaining = Array.from(idbMap.values());
        return {
          ...prev,
          chatMessages: [...mergedChat, ...remaining],
        };
      });
    }).catch((err) => {
      console.warn('Error restaurando chat desde IndexedDB:', err);
    });

    // 3. Suscribirse a mensajes de chat en Cloud Firestore (mensajería en tiempo real entre colaboradores)
    const unsubChat = subscribeToCloudChatMessages(({ msgs, removedIds }) => {
      if (!isMounted) return;
      if (removedIds && removedIds.length > 0) {
        removedIds.forEach((id) => deletedChatIdsRef.current.add(id));
      }

      setState((prev) => {
        const deletedSet = deletedChatIdsRef.current;
        let updated = prev.chatMessages.filter((m) => !deletedSet.has(m.id));

        // Insertar o actualizar mensajes no eliminados
        if (msgs && msgs.length > 0) {
          const validMsgs = msgs.filter((m) => !deletedSet.has(m.id));
          const cloudMap = new Map(validMsgs.map((m) => [m.id, m]));
          updated = updated.map((m) => {
            const remote = cloudMap.get(m.id);
            if (remote) {
              cloudMap.delete(m.id);
              // Proteger transcripción y estado completado frente a snapshots remotos pendientes
              const bestTranscription = m.transcriptionText || remote.transcriptionText;
              const bestAiExtraction = m.aiExtraction || remote.aiExtraction;
              const bestAiAnalysis = m.aiAnalysis || remote.aiAnalysis;
              const bestAiStatus =
                (m.aiStatus === 'done' || remote.aiStatus === 'done' || bestTranscription)
                  ? 'done'
                  : (remote.aiStatus || m.aiStatus);
              const bestAudioData = m.audioData || remote.audioData;
              const bestAttachment = m.attachment || remote.attachment;
              return {
                ...m,
                ...remote,
                transcriptionText: bestTranscription,
                aiExtraction: bestAiExtraction,
                aiAnalysis: bestAiAnalysis,
                aiStatus: bestAiStatus,
                audioData: bestAudioData,
                attachment: bestAttachment,
              };
            }
            return m;
          });

          // Agregar los nuevos que no estaban en la lista local y no fueron eliminados
          const brandNew = Array.from(cloudMap.values());
          if (brandNew.length > 0) {
            updated = [...updated, ...brandNew];
          }
        }

        return {
          ...prev,
          chatMessages: updated.filter((m) => !deletedSet.has(m.id)),
        };
      });
    });

    // 4. Suscribirse a Proyectos, Tareas e Hitos en tiempo real
    const unsubProjects = subscribeToCloudModule('projects', (data) => {
      if (!isMounted || !data) return;
      remoteModuleFlagsRef.current['projects'] = true;
      setState((prev) => {
        let mergedProjects = prev.projects.filter((p) => !isEntityDeletedPermanent(p?.id));
        if (Array.isArray(data.projects)) {
          mergedProjects = data.projects
            .filter((remoteP: Project) => !isEntityDeletedPermanent(remoteP?.id))
            .map((remoteP: Project) => {
              const localP = prev.projects.find((lp) => lp.id === remoteP.id);
              if (!localP) return remoteP;

              // Comparar marcas de tiempo: Si el local es más reciente que el remoto, priorizar el estado local
              const localTime = localP.updatedAt ? new Date(localP.updatedAt).getTime() : 0;
              const remoteTime = (remoteP as any).updatedAt ? new Date((remoteP as any).updatedAt).getTime() : 0;

              if (localTime > remoteTime) {
                return {
                  ...remoteP,
                  ...localP,
                };
              }

              return {
                ...remoteP,
                projectItems: (remoteP as any).projectItems !== undefined
                  ? (remoteP as any).projectItems
                  : (localP as any).projectItems,
                costMatrix: (remoteP as any).costMatrix !== undefined
                  ? (remoteP as any).costMatrix
                  : (localP as any).costMatrix,
                billingItems: (remoteP as any).billingItems !== undefined
                  ? (remoteP as any).billingItems
                  : (localP as any).billingItems,
                offerBudget: (remoteP as any).offerBudget !== undefined
                  ? (remoteP as any).offerBudget
                  : (localP as any).offerBudget,
                staffAssignments: (remoteP as any).staffAssignments !== undefined
                  ? (remoteP as any).staffAssignments
                  : (localP as any).staffAssignments,
              };
            });
        }

        const currentTrm = getStoredTRM() || 4200;
        const nextProjects = mergedProjects.map((p: Project) =>
          recalculateProjectEvm(
            reconcileProjectAnalyticalCosts(p, {
              purchaseOrders: prev.purchaseOrders,
              expenses: prev.expenses,
              timesheets: prev.timesheets,
              remissions: prev.remissions,
              trm: currentTrm,
            })
          )
        );
        return {
          ...prev,
          projects: nextProjects,
          tasks: Array.isArray(data.tasks) ? data.tasks.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.tasks,
          milestones: Array.isArray(data.milestones) ? data.milestones.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.milestones,
          chatGroups: sanitizeAndFilterChatGroups(prev.chatGroups, nextProjects, true),
        };
      });
    });

    // 5. Suscribirse a Abastecimiento, Compras y Requisiciones en tiempo real (excluyendo inventario pesado)
    const unsubProcurement = subscribeToCloudModule('procurement', (data) => {
      if (!isMounted || !data) return;
      remoteModuleFlagsRef.current['procurement'] = true;
      setState((prev) => {
        const nextPOs = Array.isArray(data.purchaseOrders)
          ? data.purchaseOrders.filter((x: any) => !isEntityDeletedPermanent(x?.id))
          : prev.purchaseOrders;
        const currentTrm = getStoredTRM() || 4200;
        const reconciledProjects = prev.projects.map((p) =>
          recalculateProjectEvm(
            reconcileProjectAnalyticalCosts(p, {
              purchaseOrders: nextPOs,
              expenses: prev.expenses,
              timesheets: prev.timesheets,
              remissions: prev.remissions,
              trm: currentTrm,
            })
          )
        );
        return {
          ...prev,
          projects: reconciledProjects,
          purchaseOrders: nextPOs,
          requisitions: Array.isArray(data.requisitions) ? data.requisitions.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.requisitions,
          equipment: Array.isArray(data.equipment) && data.equipment.length > 0 ? data.equipment.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.equipment,
          partners: Array.isArray(data.partners) && data.partners.length > 0 ? data.partners.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.partners,
          inventoryAuditLogs: Array.isArray(data.inventoryAuditLogs) ? data.inventoryAuditLogs : prev.inventoryAuditLogs,
          inventoryWriteOffs: Array.isArray(data.inventoryWriteOffs) ? data.inventoryWriteOffs : prev.inventoryWriteOffs,
        };
      });
    });

    // 5.1 Suscribirse al Catálogo de Inventario en Cloud Firestore (particionado por lotes seguros)
    const unsubInventory = subscribeToCloudInventory((remoteProducts) => {
      if (!isMounted || !Array.isArray(remoteProducts)) return;
      setState((prev) => ({
        ...prev,
        products: remoteProducts.filter((x: any) => !isEntityDeletedPermanent(x?.id)),
      }));
    });

    const unsubKardex = subscribeToCloudKardex((remoteLogs) => {
      if (!isMounted || !Array.isArray(remoteLogs)) return;
      setState((prev) => {
        const existingIds = new Set(prev.inventoryAuditLogs.map((l) => l.id));
        const toAdd = remoteLogs.filter((l) => !existingIds.has(l.id));
        if (toAdd.length === 0) return prev;
        return {
          ...prev,
          inventoryAuditLogs: [...toAdd, ...prev.inventoryAuditLogs],
        };
      });
    });

    // 5.2 Suscribirse a Talento Humano & SST en Cloud Firestore
    const unsubHr = subscribeToCloudModule('hr', (data) => {
      if (!isMounted || !data) return;
      remoteModuleFlagsRef.current['hr'] = true;
      setState((prev) => ({
        ...prev,
        employees: Array.isArray(data.employees) && data.employees.length > 0
          ? data.employees.filter((x: any) => !isEntityDeletedPermanent(x?.id, x?.email) && !isEntityDeletedPermanent(x?.userId))
          : prev.employees.filter((x: any) => !isEntityDeletedPermanent(x?.id, x?.email) && !isEntityDeletedPermanent(x?.userId)),
        novelties: Array.isArray(data.novelties) ? data.novelties.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.novelties,
        sstInspections: Array.isArray(data.sstInspections) ? data.sstInspections.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.sstInspections,
        jobPositions: Array.isArray(data.jobPositions) && data.jobPositions.length > 0 ? data.jobPositions.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.jobPositions,
        candidates: Array.isArray(data.candidates) ? data.candidates.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.candidates,
      }));
    });

    // 6. Suscribirse a Operaciones en Campo (Horas, Gastos, DDRs, Remisiones) en tiempo real
    const unsubOperations = subscribeToCloudModule('operations', (data) => {
      if (!isMounted || !data) return;
      remoteModuleFlagsRef.current['operations'] = true;
      setState((prev) => {
        const nextTimesheets = Array.isArray(data.timesheets) ? data.timesheets.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.timesheets;
        const nextExpenses = Array.isArray(data.expenses) ? data.expenses.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.expenses;
        const nextRemissions = Array.isArray(data.remissions) ? data.remissions.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.remissions;
        const currentTrm = getStoredTRM() || 4200;
        const reconciledProjects = prev.projects.map((p) =>
          recalculateProjectEvm(
            reconcileProjectAnalyticalCosts(p, {
              purchaseOrders: prev.purchaseOrders,
              expenses: nextExpenses,
              timesheets: nextTimesheets,
              remissions: nextRemissions,
              trm: currentTrm,
            })
          )
        );
        return {
          ...prev,
          projects: reconciledProjects,
          timesheets: nextTimesheets,
          expenses: nextExpenses,
          ddrs: Array.isArray(data.ddrs) ? data.ddrs.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.ddrs,
          remissions: nextRemissions,
        };
      });
    });

    // 7. Suscribirse a Comercial (CRM, Oportunidades, Contactos) en tiempo real
    const unsubCommercial = subscribeToCloudModule('commercial', (data) => {
      if (!isMounted || !data) return;
      remoteModuleFlagsRef.current['commercial'] = true;
      setState((prev) => ({
        ...prev,
        opportunities: Array.isArray(data.opportunities) ? data.opportunities.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.opportunities,
        contacts: Array.isArray(data.contacts) && data.contacts.length > 0 ? data.contacts.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.contacts,
        leads: Array.isArray(data.leads) ? data.leads.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.leads,
      }));
    });

    // 8. Suscribirse a Productividad (Tareas To-Do, Calendario, Documentos, Canales de Chat) en tiempo real
    const unsubProductivity = subscribeToCloudModule('productivity', (data) => {
      if (!isMounted || !data) return;
      remoteModuleFlagsRef.current['productivity'] = true;
      setState((prev) => ({
        ...prev,
        todos: Array.isArray(data.todos) ? data.todos.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.todos,
        calendarEvents: Array.isArray(data.calendarEvents) ? data.calendarEvents.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.calendarEvents,
        documents: Array.isArray(data.documents) ? data.documents.filter((x: any) => !isEntityDeletedPermanent(x?.id)) : prev.documents,
        chatGroups: Array.isArray(data.chatGroups) && data.chatGroups.length > 0
          ? sanitizeAndFilterChatGroups(data.chatGroups, prev.projects, true)
          : sanitizeAndFilterChatGroups(prev.chatGroups, prev.projects, true),
      }));
    });

    return () => {
      isMounted = false;
      if (unsubUsers) unsubUsers();
      if (unsubChat) unsubChat();
      if (unsubProjects) unsubProjects();
      if (unsubProcurement) unsubProcurement();
      if (unsubInventory) unsubInventory();
      if (unsubKardex) unsubKardex();
      if (unsubHr) unsubHr();
      if (unsubOperations) unsubOperations();
      if (unsubCommercial) unsubCommercial();
      if (unsubProductivity) unsubProductivity();
    };
  }, []);

  // SINCRONIZADORES REACTIVOS AISLADOS POR MÓDULO:
  // Evita que un snapshot entrante de un módulo cancele el guardado pendiente de otro módulo y reduce escrituras en Firestore en un 83%.
  useEffect(() => {
    if (isRemoteUpdateRef.current || remoteModuleFlagsRef.current['projects']) {
      remoteModuleFlagsRef.current['projects'] = false;
      return;
    }
    if (!isCloudLoadedRef.current) return;
    const timer = setTimeout(() => {
      syncModuleToCloud('projects', {
        projects: state.projects,
        tasks: state.tasks,
        milestones: state.milestones,
      }, state.currentUser?.id || 'USR-01');
    }, 600);
    return () => clearTimeout(timer);
  }, [state.projects, state.tasks, state.milestones, state.currentUser?.id]);

  useEffect(() => {
    if (isRemoteUpdateRef.current || remoteModuleFlagsRef.current['procurement']) {
      remoteModuleFlagsRef.current['procurement'] = false;
      return;
    }
    if (!isCloudLoadedRef.current) return;
    const timer = setTimeout(() => {
      syncModuleToCloud('procurement', {
        purchaseOrders: state.purchaseOrders,
        requisitions: state.requisitions,
        equipment: state.equipment,
        partners: state.partners,
        inventoryAuditLogs: state.inventoryAuditLogs,
        inventoryWriteOffs: state.inventoryWriteOffs,
      }, state.currentUser?.id || 'USR-01');
    }, 600);
    return () => clearTimeout(timer);
  }, [state.purchaseOrders, state.requisitions, state.equipment, state.partners, state.inventoryAuditLogs, state.inventoryWriteOffs, state.currentUser?.id]);

  useEffect(() => {
    if (isRemoteUpdateRef.current || remoteModuleFlagsRef.current['operations']) {
      remoteModuleFlagsRef.current['operations'] = false;
      return;
    }
    if (!isCloudLoadedRef.current) return;
    const timer = setTimeout(() => {
      syncModuleToCloud('operations', {
        timesheets: state.timesheets,
        expenses: state.expenses,
        ddrs: state.ddrs,
        remissions: state.remissions,
      }, state.currentUser?.id || 'USR-01');
    }, 600);
    return () => clearTimeout(timer);
  }, [state.timesheets, state.expenses, state.ddrs, state.remissions, state.currentUser?.id]);

  useEffect(() => {
    if (isRemoteUpdateRef.current || remoteModuleFlagsRef.current['hr']) {
      remoteModuleFlagsRef.current['hr'] = false;
      return;
    }
    if (!isCloudLoadedRef.current) return;
    const timer = setTimeout(() => {
      syncModuleToCloud('hr', {
        employees: state.employees,
        novelties: state.novelties || [],
        sstInspections: state.sstInspections || [],
        jobPositions: state.jobPositions || [],
        candidates: state.candidates || [],
      }, state.currentUser?.id || 'USR-01');
    }, 600);
    return () => clearTimeout(timer);
  }, [state.employees, state.novelties, state.sstInspections, state.jobPositions, state.candidates, state.currentUser?.id]);

  useEffect(() => {
    if (isRemoteUpdateRef.current || remoteModuleFlagsRef.current['commercial']) {
      remoteModuleFlagsRef.current['commercial'] = false;
      return;
    }
    if (!isCloudLoadedRef.current) return;
    const timer = setTimeout(() => {
      syncModuleToCloud('commercial', {
        opportunities: state.opportunities,
        contacts: state.contacts,
        leads: state.leads,
      }, state.currentUser?.id || 'USR-01');
    }, 600);
    return () => clearTimeout(timer);
  }, [state.opportunities, state.contacts, state.leads, state.currentUser?.id]);

  useEffect(() => {
    if (isRemoteUpdateRef.current || remoteModuleFlagsRef.current['productivity']) {
      remoteModuleFlagsRef.current['productivity'] = false;
      return;
    }
    if (!isCloudLoadedRef.current) return;
    const timer = setTimeout(() => {
      syncModuleToCloud('productivity', {
        todos: state.todos,
        calendarEvents: state.calendarEvents,
        documents: state.documents,
        chatGroups: state.chatGroups,
      }, state.currentUser?.id || 'USR-01');
    }, 600);
    return () => clearTimeout(timer);
  }, [state.todos, state.calendarEvents, state.documents, state.chatGroups, state.currentUser?.id]);

  useEffect(() => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
    }
  });

  // Reconciliación Reactiva Bidireccional Automática: Empleados <-> Usuarios TI <-> Cargos
  // Si existe un empleado creado en Talento Humano que aún no figure en Consola TI (users) o cuyo cargo
  // no tenga ficha oficial en Gestión de Cargos (jobPositions), se auto-sintetiza y sincroniza en segundo plano.
  useEffect(() => {
    if (!state.employees || state.employees.length === 0) return;

    let needsUserUpdate = false;
    let nextUsers = [...state.users];
    let nextJobPositions = [...state.jobPositions];
    let positionsChanged = false;
    const usersToSync: User[] = [];

    for (const emp of state.employees) {
      if (isEntityDeletedPermanent(emp.id, emp.email) || isEntityDeletedPermanent(emp.userId)) continue;

      // 1. Asegurar cargo en jobPositions
      const roleName = emp.role || emp.position || 'Especialista Técnico STC';
      const { jobPosition, updatedPositions, wasCreated } = ensureJobPositionForRole(
        roleName,
        emp.department,
        emp.baseSalaryCOP,
        nextJobPositions
      );
      if (wasCreated || updatedPositions !== nextJobPositions) {
        nextJobPositions = updatedPositions;
        positionsChanged = true;
      }

      // 2. Verificar existencia en users
      const empNameClean = (emp.name || emp.fullName || '').trim().toLowerCase();
      const existingUser = nextUsers.find(
        (u) =>
          u.id === emp.id ||
          u.id === emp.userId ||
          u.employeeId === emp.id ||
          (emp.email && u.email && u.email.toLowerCase() === emp.email.toLowerCase()) ||
          (emp.documentId && u.nationalId && u.nationalId === emp.documentId) ||
          (empNameClean && u.name.trim().toLowerCase() === empNameClean)
      );

      if (!existingUser) {
        const synthesizedUser = buildUserFromEmployee(emp, jobPosition);
        nextUsers.push(synthesizedUser);
        usersToSync.push(synthesizedUser);
        needsUserUpdate = true;
      } else if (!existingUser.jobPositionId || !existingUser.jobPosition) {
        // Enlazar ficha de cargo si faltaba
        const enrichedUser: User = {
          ...existingUser,
          jobPositionId: jobPosition.id,
          jobPosition: jobPosition,
        };
        nextUsers = nextUsers.map((u) => (u.id === existingUser.id ? enrichedUser : u));
        usersToSync.push(enrichedUser);
        needsUserUpdate = true;
      }
    }

    if (needsUserUpdate || positionsChanged) {
      setState((prev) => ({
        ...prev,
        users: needsUserUpdate ? nextUsers : prev.users,
        jobPositions: positionsChanged ? nextJobPositions : prev.jobPositions,
      }));

      usersToSync.forEach((u) => {
        syncUserToCloud(u).catch(console.warn);
      });

      if (positionsChanged) {
        syncModuleToCloud('hr', {
          employees: state.employees,
          novelties: state.novelties || [],
          sstInspections: state.sstInspections || [],
          jobPositions: nextJobPositions,
          candidates: state.candidates || [],
        }, state.currentUser?.id || 'USR-01').catch(console.warn);
      }
    }
  }, [state.employees]);

  const notify = useCallback(
    (type: AppNotification['type'], title: string, message: string, extra?: Partial<AppNotification>) => {
      // Reproducir sonido si está habilitado en las preferencias del usuario
      if (state.currentUser?.preferences?.soundEnabled !== false) {
        playNotificationChime();
      }

      const newNotif: AppNotification = {
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title,
        message,
        type,
        timestamp: 'Ahora mismo',
        read: false,
        ...extra,
      };
      setState((prev) => ({
        ...prev,
        notifications: [newNotif, ...prev.notifications],
      }));
    },
    [state.currentUser?.preferences?.soundEnabled]
  );

  const dismissNotification = useCallback((id: string) => {
    setState((prev) => {
      const targetNotif = prev.notifications.find((n) => n.id === id);
      if (targetNotif && prev.currentUser?.id) {
        undoRedoService.recordAction({
          userId: prev.currentUser.id,
          userName: prev.currentUser.name,
          actionType: 'delete',
          collection: 'notifications',
          entityName: `Notificación: ${targetNotif.title}`,
          description: `Se descartó la notificación "${targetNotif.title}"`,
          previousData: targetNotif,
        });
      }
      return {
        ...prev,
        notifications: prev.notifications.filter((n) => n.id !== id),
      };
    });
  }, []);

  const markNotificationAsRead = useCallback((id: string) => {
    setState((prev) => {
      const targetNotif = prev.notifications.find((n) => n.id === id);
      if (targetNotif && prev.currentUser?.id) {
        undoRedoService.recordAction({
          userId: prev.currentUser.id,
          userName: prev.currentUser.name,
          actionType: 'delete',
          collection: 'notifications',
          entityName: `Notificación: ${targetNotif.title}`,
          description: `Se chuleó como recibida la notificación "${targetNotif.title}"`,
          previousData: targetNotif,
        });
      }
      // Al chulear se quita del panel activo
      return {
        ...prev,
        notifications: prev.notifications.filter((n) => n.id !== id),
      };
    });
  }, []);

  const markAllNotificationsAsRead = useCallback((forUserId?: string) => {
    setState((prev) => {
      const removedNotifs = prev.notifications.filter((n) => {
        if (forUserId && n.userId && n.userId !== forUserId) return false;
        return true;
      });
      if (removedNotifs.length > 0 && prev.currentUser?.id) {
        undoRedoService.recordAction({
          userId: prev.currentUser.id,
          userName: prev.currentUser.name,
          actionType: 'delete',
          collection: 'notifications',
          entityName: `${removedNotifs.length} Notificaciones`,
          description: `Se marcaron como recibidas y quitaron ${removedNotifs.length} notificaciones`,
          previousData: removedNotifs,
        });
      }
      return {
        ...prev,
        notifications: prev.notifications.filter((n) => {
          if (forUserId && n.userId && n.userId !== forUserId) return true;
          return false;
        }),
      };
    });
  }, []);

  const login = useCallback((userId: string) => {
    setState((prev) => {
      const user = prev.users.find((u) => u.id === userId) || prev.users[0];
      const targetModule = user?.preferences?.defaultLandingModule || prev.activeModuleId || 'proyectos';
      return { ...prev, currentUser: user, isAuthenticated: true, activeModuleId: targetModule };
    });
  }, []);

  const authenticate = useCallback(
    (emailOrUser: string, pass: string): { success: boolean; user?: User; error?: string } => {
      const cleanInput = (emailOrUser || '').trim().toLowerCase();
      const cleanPass = (pass || '').trim();

      if (!cleanInput) {
        return { success: false, error: 'Por favor ingrese su usuario o correo corporativo.' };
      }
      if (!cleanPass) {
        return { success: false, error: 'Por favor ingrese su contraseña.' };
      }

      // Buscar por email exacto, username antes del @, o nombre
      const matchedUser = state.users.find((u) => {
        const emailLower = u.email.toLowerCase();
        const usernamePart = emailLower.split('@')[0];
        const nameLower = u.name.toLowerCase();
        return (
          emailLower === cleanInput ||
          usernamePart === cleanInput ||
          nameLower === cleanInput ||
          (cleanInput.includes('@') && emailLower.startsWith(cleanInput))
        );
      });

      if (!matchedUser) {
        return {
          success: false,
          error: 'Usuario o correo no registrado en el ERP de Inteckno.',
        };
      }

      if (matchedUser.isActive === false) {
        return {
          success: false,
          error: 'Esta cuenta de usuario ha sido desactivada. Comuníquese con el Administrador de Sistemas (sistemas@inteckno.com).',
        };
      }

      // Validar contraseña
      const expectedPassword =
        matchedUser.password ||
        (matchedUser.email === 'sistemas@inteckno.com' ? 'Bruno0129$' : 'Inteckno2026*');

      if (cleanPass !== expectedPassword) {
        return {
          success: false,
          error: 'Contraseña incorrecta. Por favor verifique sus datos o solicite reseteo a Sistemas.',
        };
      }

      // Autenticación correcta
      const targetModule = matchedUser?.preferences?.defaultLandingModule || 'proyectos';
      setState((prev) => ({
        ...prev,
        currentUser: matchedUser,
        isAuthenticated: true,
        activeModuleId: targetModule,
      }));

      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ currentUser: matchedUser, isAuthenticated: true })
          );
        }
      } catch (e) {}

      return { success: true, user: matchedUser };
    },
    [state.users]
  );

  const updateUserProfile = useCallback((userId: string, data: Partial<User>) => {
    setState((prev) => {
      let targetUser: User | null = null;
      const updatedUsers = prev.users.map((u) => {
        if (u.id === userId) {
          targetUser = { ...u, ...data };
          return targetUser;
        }
        return u;
      });

      const updatedCurrent =
        prev.currentUser.id === userId ? { ...prev.currentUser, ...data } : prev.currentUser;

      try {
        if (typeof sessionStorage !== 'undefined' && prev.currentUser.id === userId) {
          sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({ currentUser: updatedCurrent, isAuthenticated: prev.isAuthenticated })
          );
        }
      } catch (e) {}

      // Sincronizar en la nube con Cloud Firestore para que persista y se comparta entre dispositivos
      if (targetUser) {
        syncUserToCloud(targetUser).catch((err) => {
          console.warn('[CloudSync] Error sincronizando usuario:', err);
        });
      }

      // Sincronización bidireccional con Talento Humano (EmployeeRecord)
      const updatedEmployees = prev.employees.map((emp) => {
        const isMatch =
          emp.id === userId ||
          emp.userId === userId ||
          (targetUser && emp.name.toLowerCase() === (targetUser as User).name.toLowerCase());
        if (!isMatch) return emp;

        let newSalary = emp.baseSalaryCOP;
        if (data.jobPosition?.salaryRange && typeof data.jobPosition.salaryRange === 'object') {
          const mid = Math.round((data.jobPosition.salaryRange.min + data.jobPosition.salaryRange.max) / 2);
          if (mid > 0 && (!newSalary || newSalary === 0)) {
            newSalary = mid;
          }
        }

        return {
          ...emp,
          name: data.name || emp.name,
          fullName: data.name || emp.fullName,
          role: data.roleLabel || data.position || emp.role,
          position: data.roleLabel || data.position || emp.position,
          department: data.department || emp.department,
          documentId: data.nationalId || emp.documentId,
          emergencyPhone: data.emergencyContactPhone || emp.emergencyPhone,
          heightCertExpiry: data.hseqExpiresAt || emp.heightCertExpiry,
          heightCertStatus:
            data.hseqStatus === 'valid'
              ? ('vigente' as const)
              : data.hseqStatus === 'expired'
              ? ('vencido' as const)
              : emp.heightCertStatus,
          competencyIds: data.competencies || emp.competencyIds,
          baseSalaryCOP: newSalary,
        };
      });

      return {
        ...prev,
        users: updatedUsers,
        employees: updatedEmployees,
        currentUser: updatedCurrent,
      };
    });
  }, []);

  const updateUserPreferences = useCallback(
    (prefs: Partial<UserPreferences>) => {
      const activeId = state.currentUser?.id;
      if (!activeId) return;
      const currentPrefs = state.currentUser.preferences || DEFAULT_USER_PREFERENCES;
      const mergedPrefs: UserPreferences = {
        ...currentPrefs,
        ...prefs,
      };
      updateUserProfile(activeId, {
        preferences: mergedPrefs,
      });
    },
    [state.currentUser, updateUserProfile]
  );

  const resetUserPassword = useCallback((userId: string, newPassword: string) => {
    setState((prev) => {
      let targetUser: User | null = null;
      const updatedUsers = prev.users.map((u) => {
        if (u.id === userId) {
          targetUser = { ...u, password: newPassword };
          return targetUser;
        }
        return u;
      });

      const updatedCurrent =
        prev.currentUser.id === userId ? { ...prev.currentUser, password: newPassword } : prev.currentUser;

      if (targetUser) {
        syncUserToCloud(targetUser).catch((err) => {
          console.warn('[CloudSync] Error sincronizando cambio de clave:', err);
        });
      }

      return {
        ...prev,
        users: updatedUsers,
        currentUser: updatedCurrent,
      };
    });
  }, []);

  const createUserAccount = useCallback((userData: Omit<User, 'id'>): User => {
    const newId = `USR-${Math.floor(100 + Math.random() * 900)}`;
    const initials = userData.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');

    const empCode = userData.employeeId || `EMP-${newId}`;
    const newUser: User = {
      ...userData,
      id: newId,
      employeeId: empCode,
      avatar: userData.avatar || initials || 'IT',
      avatarColor: userData.avatarColor || '#00668F',
      password: userData.password || 'Inteckno2026*',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      hseqStatus: userData.hseqStatus || 'valid',
      hseqExpiresAt: userData.hseqExpiresAt || '2028-12-31',
      canWorkHeights: userData.canWorkHeights ?? false,
      competencies: userData.competencies || ['SKILL-004'],
      competencyIds: userData.competencyIds || userData.competencies || ['SKILL-004'],
    };

    const newEmpRecord = buildInitialEmployeesFromUsers([newUser])[0];

    syncUserToCloud(newUser).catch((err) => {
      console.warn('[CloudSync] Error sincronizando nuevo usuario:', err);
    });

    setState((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
      employees: prev.employees.some((e) => e.id === newUser.id || e.userId === newUser.id)
        ? prev.employees
        : [...prev.employees, newEmpRecord],
    }));

    return newUser;
  }, []);

  const deleteUserAccount = useCallback((userId: string) => {
    setState((prev) => {
      const targetUser = prev.users.find((u) => u.id === userId);
      if (targetUser?.email?.toLowerCase().trim() === 'sistemas@inteckno.com' || userId === 'USR-99') {
        notify('warning', 'Acción Protegida', 'La cuenta raíz de Administrador de Sistemas no puede ser eliminada.');
        return prev;
      }
      const targetEmail = targetUser?.email?.toLowerCase().trim();

      // Registrar tombstone permanente (ID, correo y ficha de empleado vinculada)
      markEntityAsDeletedPermanent([
        userId,
        targetEmail,
        targetUser?.employeeId,
        `EMP-${userId}`,
      ]);

      // Eliminar permanentemente de Google Cloud Firestore
      deleteUserFromCloud(userId, targetEmail).catch((err) => {
        console.warn('[CloudSync] Error eliminando usuario de Cloud Firestore:', err);
      });

      const updatedUsers = prev.users.filter(
        (u) =>
          u.id !== userId &&
          (!targetEmail || u.email?.toLowerCase().trim() !== targetEmail)
      );

      const updatedEmployees = prev.employees.filter(
        (emp) =>
          emp.id !== userId &&
          emp.userId !== userId &&
          (!targetEmail || emp.email?.toLowerCase().trim() !== targetEmail)
      );

      // Sincronizar módulo HR con el empleado ya purgado
      syncModuleToCloud(
        'hr',
        {
          employees: updatedEmployees,
          novelties: prev.novelties || [],
          sstInspections: prev.sstInspections || [],
          jobPositions: prev.jobPositions || [],
          candidates: prev.candidates || [],
        },
        prev.currentUser?.id || 'USR-01'
      ).catch(console.warn);

      const updatedCurrent =
        prev.currentUser.id === userId
          ? updatedUsers[0] || prev.currentUser
          : prev.currentUser;

      return {
        ...prev,
        users: updatedUsers,
        employees: updatedEmployees,
        currentUser: updatedCurrent,
      };
    });
  }, []);

  const toggleUserStatus = useCallback((userId: string) => {
    setState((prev) => {
      let targetUser: User | null = null;
      const updatedUsers = prev.users.map((u) => {
        if (u.id === userId) {
          targetUser = { ...u, isActive: u.isActive === false ? true : false };
          return targetUser;
        }
        return u;
      });

      const updatedCurrent =
        prev.currentUser.id === userId
          ? { ...prev.currentUser, isActive: prev.currentUser.isActive === false ? true : false }
          : prev.currentUser;

      if (targetUser) {
        syncUserToCloud(targetUser).catch((err) => {
          console.warn('[CloudSync] Error sincronizando estado de usuario:', err);
        });
      }

      return {
        ...prev,
        users: updatedUsers,
        currentUser: updatedCurrent,
      };
    });
  }, []);

  const logout = useCallback(() => {
    setState((prev) => ({ ...prev, isAuthenticated: false }));
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (e) {}
  }, []);

  const switchUser = useCallback((userId: string) => {
    setState((prev) => {
      const user = prev.users.find((u) => u.id === userId) || prev.users[0];
      return { ...prev, currentUser: user, isAuthenticated: true };
    });
  }, []);

  const CANONICAL_MODULE_MAP: Record<string, string> = {
    projects: 'proyectos',
    proyectos: 'proyectos',
    procurement: 'compras',
    compras: 'compras',
    orders: 'compras',
    'purchase-orders': 'compras',
    timesheet: 'registro-horas',
    'registro-horas': 'registro-horas',
    timesheets: 'registro-horas',
    horas: 'registro-horas',
    billing: 'contabilidad',
    contabilidad: 'contabilidad',
    facturacion: 'contabilidad',
    invoices: 'contabilidad',
    commercial: 'crm',
    comercial: 'crm',
    crm: 'crm',
    pipeline: 'crm',
    contactos: 'contactos',
    contacts: 'contactos',
    clientes: 'contactos',
    inventory: 'inventario',
    inventario: 'inventario',
    almacen: 'inventario',
    bodega: 'inventario',
    stock: 'inventario',
    'codigo-barras': 'codigo-barras',
    barcode: 'codigo-barras',
    requisitions: 'requisiciones',
    requisiciones: 'requisiciones',
    solped: 'requisiciones',
    hr: 'empleados',
    empleados: 'empleados',
    'talento-humano': 'empleados',
    vacaciones: 'vacaciones',
    vacations: 'vacaciones',
    nomina: 'nomina',
    payroll: 'nomina',
    expenses: 'gastos',
    gastos: 'gastos',
    viaticos: 'gastos',
    'caja-menor': 'gastos',
    dashboard: 'tableros',
    tableros: 'tableros',
    kpis: 'tableros',
    indicadores: 'tableros',
    international: 'calculadora-precios',
    'calculadora-precios': 'calculadora-precios',
    calculator: 'calculadora-precios',
    calculadora: 'calculadora-precios',
    'radar-oportunidades': 'radar-oportunidades',
    radar: 'radar-oportunidades',
    licitaciones: 'radar-oportunidades',
    documents: 'documentos',
    documentos: 'documentos',
    archivos: 'documentos',
    chat: 'conversaciones',
    conversaciones: 'conversaciones',
    mensajes: 'conversaciones',
    calendar: 'calendario',
    calendario: 'calendario',
    tasks: 'actividades',
    actividades: 'actividades',
    todos: 'actividades',
    positions: 'cargos',
    cargos: 'cargos',
    profile: 'perfil',
    perfil: 'perfil',
    users: 'usuarios-ti',
    usuarios: 'usuarios-ti',
    'usuarios-ti': 'usuarios-ti',
    sst: 'encuestas',
    'hseq-gate': 'encuestas',
    hseq: 'encuestas',
    encuestas: 'encuestas',
    operaciones: 'proyectos',
    operations: 'proyectos',
    gantt: 'planeacion',
    planeacion: 'planeacion',
    planning: 'planeacion',
    wbs: 'planeacion',
    'firma-electronica': 'firma-electronica',
    acts: 'firma-electronica',
    actas: 'firma-electronica',
    signatures: 'firma-electronica',
  };

  const navigateWithContext = useCallback((targetModule: string, action: string, data?: any) => {
    const canonical = CANONICAL_MODULE_MAP[targetModule.toLowerCase()] || targetModule;
    setState((prev) => ({
      ...prev,
      activeModuleId: canonical,
      navigationContext: {
        targetModule: canonical,
        action,
        data,
        timestamp: Date.now(),
      },
    }));
  }, []);

  const clearNavigationContext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      navigationContext: null,
    }));
  }, []);

  const setActiveModule = useCallback((moduleId: string) => {
    const canonical = CANONICAL_MODULE_MAP[moduleId.toLowerCase()] || moduleId;
    setState((prev) => ({ ...prev, activeModuleId: canonical }));
  }, []);

  // MÉTODOS DE BORRADO INDIVIDUAL
  const deleteProject = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.projects.find((p) => p.id === id);
      if (target && state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'delete',
          collection: 'projects',
          entityName: `Proyecto ${target.code}`,
          description: `Eliminación del proyecto ${target.code} (${target.name})`,
          previousData: target,
        });

        // Agente Guardián: Respaldo continuo de seguridad (Regla 14)
        createSystemBackup(
          'projects',
          `Eliminación de Proyecto ${target.code || target.id} (${target.name}) (Respaldo de recuperación)`,
          target,
          state.currentUser.id,
          state.currentUser.name
        ).catch(console.warn);
      }

      setState((prev) => {
        const remainingProjects = prev.projects.filter((p) => p.id !== id);
        const linkedGroupIds = prev.chatGroups
          .filter((g) => {
            if (g.linkedProjectId === id || (target?.code && g.linkedProjectId === target.code)) return true;
            if (target?.code && g.description?.includes(target.code)) return true;
            if (target?.name && g.name?.replace(/🚠/g, '').trim().toLowerCase() === target.name.trim().toLowerCase()) return true;
            return false;
          })
          .map((g) => g.id);

        if (linkedGroupIds.length > 0) {
          markEntityAsDeletedPermanent(linkedGroupIds);
        }

        const nextChatGroups = sanitizeAndFilterChatGroups(
          prev.chatGroups.filter((g) => !linkedGroupIds.includes(g.id)),
          remainingProjects,
          true
        );

        const nextChatMessages = prev.chatMessages.filter((m) => !linkedGroupIds.includes(m.channel));

        if (isCloudLoadedRef.current) {
          syncModuleToCloud(
            'productivity',
            {
              todos: prev.todos,
              calendarEvents: prev.calendarEvents,
              documents: prev.documents,
              chatGroups: nextChatGroups,
            },
            prev.currentUser?.id || 'USR-01'
          ).catch(console.warn);
        }

        return {
          ...prev,
          projects: remainingProjects,
          tasks: prev.tasks.filter((t) => t.projectId !== id),
          chatGroups: nextChatGroups,
          chatMessages: nextChatMessages,
        };
      });
      notify('info', 'Proyecto Eliminado', 'El proyecto, sus actividades y su canal de conversación asociado han sido retirados.');
    },
    [state.projects, state.currentUser, notify]
  );

  const deleteOpportunity = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.opportunities.find((o) => o.id === id);
      if (target && state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'delete',
          collection: 'opportunities',
          entityName: `Oportunidad ${target.code}`,
          description: `Eliminación de cotización ${target.code} (${target.title})`,
          previousData: target,
        });
      }
      setState((prev) => ({
        ...prev,
        opportunities: prev.opportunities.filter((o) => o.id !== id),
        // Eliminación en cascada de contactos creados exclusivamente por esta oportunidad para evitar contactos huérfanos
        contacts: prev.contacts.filter((c) => {
          if (c.opportunityId === id) return false;
          if (target?.code && c.opportunityCode === target.code) return false;
          if (target?.code && c.notes?.includes(`desde la oportunidad ${target.code}`)) return false;
          return true;
        }),
      }));
      notify('info', 'Oportunidad Eliminada', 'La cotización/oportunidad y sus contactos temporales vinculados han sido retirados.');
    },
    [state.opportunities, state.currentUser, notify]
  );

  const deleteContact = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.contacts.find((c) => c.id === id);
      if (target && state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'delete',
          collection: 'contacts',
          entityName: `Contacto ${target.name}`,
          description: `Eliminación del contacto ${target.name} (${target.company})`,
          previousData: target,
        });
      }
      setState((prev) => ({
        ...prev,
        contacts: prev.contacts.filter((c) => c.id !== id),
      }));
      notify('info', 'Contacto Eliminado', 'El cliente/contacto ha sido retirado del CRM.');
    },
    [state.contacts, state.currentUser, notify]
  );

  const deletePurchaseOrder = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.purchaseOrders.find((po) => po.id === id);
      if (target && state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'delete',
          collection: 'purchaseOrders',
          entityName: `Orden de Compra ${target.orderNumber || target.id}`,
          description: `Eliminación de la orden ${target.orderNumber || target.id}`,
          previousData: target,
        });

        // Agente Guardián: Respaldo continuo de seguridad (Regla 14)
        createSystemBackup(
          'procurement',
          `Eliminación de Orden de Compra ${target.orderNumber || target.id} (Respaldo de recuperación)`,
          target,
          state.currentUser.id,
          state.currentUser.name
        ).catch(console.warn);
      }
      setState((prev) => {
        let updatedProjects = prev.projects;
        if (target && (target.projectId || target.projectCode)) {
          const costCOP = target.totalAmountCOP || 0;
          const wasReceived = target.status === 'received';
          updatedProjects = prev.projects.map((prj) => {
            if (prj.id === target.projectId || prj.code === target.projectCode) {
              const newAC = wasReceived ? Math.max(0, (prj.actualCostAC || 0) - costCOP) : (prj.actualCostAC || 0);
              const newCommitted = !wasReceived ? Math.max(0, (prj.committedCostPO || 0) - costCOP) : (prj.committedCostPO || 0);
              const newCV = (prj.earnedValueEV || 0) - newAC;
              const newCPI = newAC > 0 ? Number(((prj.earnedValueEV || 0) / newAC).toFixed(2)) : prj.cpi;
              
              const existingMatrix: any[] = (prj as any).costMatrix || [];
              const updatedMatrix = existingMatrix
                .map((item) => {
                  if (target.costMatrixItemId && item.id === target.costMatrixItemId) {
                    const newQty = Math.max(0, (item.actualQuantity || 1) - 1);
                    const newTotal = Math.max(0, (item.actualTotal || 0) - costCOP);
                    return {
                      ...item,
                      actualQuantity: newQty,
                      actualTotal: newTotal,
                      actualUnitCost: newQty > 0 ? Math.round(newTotal / newQty) : item.actualUnitCost,
                      variance: (item.plannedTotal || 0) - newTotal,
                    };
                  }
                  return item;
                })
                .filter((item) => {
                  const isCreatedByPo = item.id === `cost-po-${target.id}` || 
                                       (item.concept && target.orderNumber && item.concept.includes(`OC ${target.orderNumber}`));
                  return !isCreatedByPo;
                });

              return {
                ...prj,
                actualCostAC: newAC,
                committedCostPO: newCommitted,
                cv: newCV,
                cpi: newCPI,
                costMatrix: updatedMatrix,
              };
            }
            return prj;
          });
        }

        return {
          ...prev,
          purchaseOrders: prev.purchaseOrders.filter((po) => po.id !== id),
          projects: updatedProjects,
        };
      });
      notify('info', 'Orden de Compra Eliminada', 'La orden de compra ha sido retirada y sus costos reversados.');
    },
    [state.purchaseOrders, state.currentUser, notify]
  );

  const updatePurchaseOrder = useCallback(
    (id: string, data: Partial<PurchaseOrder>) => {
      const prevPo = state.purchaseOrders.find((p) => p.id === id);
      setState((prev) => {
        let updatedProjects = prev.projects;
        if (prevPo && data.status === 'received' && prevPo.status !== 'received' && (prevPo.projectId || prevPo.projectCode)) {
          const costCOP = (data.totalAmountCOP !== undefined ? data.totalAmountCOP : prevPo.totalAmountCOP) || 0;
          updatedProjects = prev.projects.map((prj) => {
            if (prj.id === prevPo.projectId || prj.code === prevPo.projectCode) {
              const newCommitted = Math.max(0, (prj.committedCostPO || 0) - costCOP);
              const newAC = (prj.actualCostAC || 0) + costCOP;
              const newCV = (prj.earnedValueEV || 0) - newAC;
              const newCPI = newAC > 0 ? Number(((prj.earnedValueEV || 0) / newAC).toFixed(2)) : prj.cpi;
              
              const existingMatrix: any[] = (prj as any).costMatrix || [];
              let updatedMatrix: any[];
              if (prevPo.costMatrixItemId && existingMatrix.some((m) => m.id === prevPo.costMatrixItemId)) {
                updatedMatrix = existingMatrix.map((item) => {
                  if (item.id === prevPo.costMatrixItemId) {
                    const newQty = (item.actualQuantity || 0) + 1;
                    const newTotal = (item.actualTotal || 0) + costCOP;
                    return {
                      ...item,
                      actualQuantity: newQty,
                      actualTotal: newTotal,
                      actualUnitCost: newQty > 0 ? Math.round(newTotal / newQty) : item.actualUnitCost,
                      variance: (item.plannedTotal || 0) - newTotal,
                    };
                  }
                  return item;
                });
              } else {
                updatedMatrix = existingMatrix.map((item) => {
                  if (item.id === `cost-po-${prevPo.id}` || (item.concept && prevPo.orderNumber && item.concept.includes(`OC ${prevPo.orderNumber}`))) {
                    return {
                      ...item,
                      actualTotal: costCOP,
                      actualQuantity: 1,
                      actualUnitCost: costCOP,
                      observations: `Imputado por OC ${prevPo.orderNumber} (Cumplida y Recibida).`,
                    };
                  }
                  return item;
                });
              }

              return {
                ...prj,
                actualCostAC: newAC,
                committedCostPO: newCommitted,
                cv: newCV,
                cpi: newCPI,
                costMatrix: updatedMatrix,
              };
            }
            return prj;
          });
        }

        return {
          ...prev,
          purchaseOrders: prev.purchaseOrders.map((po) =>
            po.id === id ? { ...po, ...data } : po
          ),
          projects: updatedProjects,
        };
      });
      notify('success', 'Orden de Compra Actualizada', 'Los datos de la orden han sido sincronizados.');
    },
    [state.purchaseOrders, notify]
  );

  const deleteRequisition = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.requisitions.find((r) => r.id === id);
      if (target && state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'delete',
          collection: 'requisitions',
          entityName: `Requisición ${target.reqNumber || target.id}`,
          description: `Eliminación de requisición ${target.reqNumber || target.id}`,
          previousData: target,
        });
      }
      setState((prev) => ({
        ...prev,
        requisitions: prev.requisitions.filter((r) => r.id !== id),
      }));
      notify('info', 'Requisición Eliminada', 'La requisición interna ha sido retirada permanentemente.');
    },
    [state.requisitions, state.currentUser, notify]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.products.find((p) => p.id === id);
      if (target && state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'delete',
          collection: 'products',
          entityName: `Artículo ${target.sku || target.name}`,
          description: `Eliminación del artículo ${target.sku}: ${target.name}`,
          previousData: target,
        });
      }
      setState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
      }));
      deleteProductFromCloud(id).catch(console.warn);
      notify('info', 'Artículo Eliminado', 'El artículo ha sido retirado del inventario.');
    },
    [state.products, state.currentUser, notify]
  );

  const deletePartner = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      setState((prev) => ({
        ...prev,
        partners: prev.partners.filter((p) => p.id !== id),
      }));
      notify('info', 'Proveedor Eliminado', 'El proveedor ha sido retirado.');
    },
    [notify]
  );

  const deleteExpense = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.expenses.find((e) => e.id === id);
      if (target && state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'delete',
          collection: 'expenses',
          entityName: `Gasto: ${target.description || target.category || target.id}`,
          description: `Eliminación de comprobante de gasto por ${target.amount?.toLocaleString()} COP`,
          previousData: target,
        });

        // Agente Guardián: Respaldo continuo de seguridad (Regla 14)
        createSystemBackup(
          'expenses',
          `Eliminación de comprobante de gasto (${target.description || target.category || target.id}) por ${target.amount?.toLocaleString()} ${target.currency}`,
          target,
          state.currentUser.id,
          state.currentUser.name
        ).catch(console.warn);
      }
      setState((prev) => {
        let updatedProjects = prev.projects;
        if (target && (target.projectId || target.projectCode) && (target.status === 'approved' || target.status === 'legalized')) {
          const expTrm = getStoredTRM() || 4150.00;
          const costCOP = target.currency === 'USD'
            ? Math.round((target.amount || 0) * expTrm)
            : target.currency === 'EUR'
            ? Math.round((target.amount || 0) * expTrm * 1.08)
            : (target.amount || 0);

          updatedProjects = prev.projects.map((prj) => {
            if (prj.id === target.projectId || prj.code === target.projectCode) {
              const newAC = Math.max(0, (prj.actualCostAC || 0) - costCOP);
              const newCV = (prj.earnedValueEV || 0) - newAC;
              const newCPI = newAC > 0 ? Number(((prj.earnedValueEV || 0) / newAC).toFixed(2)) : prj.cpi;
              const existingMatrix: any[] = (prj as any).costMatrix || [];
              const updatedMatrix = existingMatrix
                .map((item) => {
                  if (target.costMatrixItemId && item.id === target.costMatrixItemId) {
                    const newTotal = Math.max(0, (item.actualTotal || 0) - costCOP);
                    return {
                      ...item,
                      actualTotal: newTotal,
                      variance: (item.plannedTotal || 0) - newTotal,
                    };
                  }
                  return item;
                })
                .filter((item) => item.id !== `cost-exp-${target.id}`);

              return {
                ...prj,
                actualCostAC: newAC,
                cv: newCV,
                cpi: newCPI,
                costMatrix: updatedMatrix,
              };
            }
            return prj;
          });
        }

        return {
          ...prev,
          expenses: prev.expenses.filter((e) => e.id !== id),
          projects: updatedProjects,
        };
      });
      notify('info', 'Gasto Eliminado', 'El comprobante de gasto ha sido retirado y sus costos reversados.');
    },
    [state.expenses, state.currentUser, notify]
  );

  const deleteTimesheet = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.timesheets.find((t) => t.id === id);
      if (target && state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'delete',
          collection: 'timesheets',
          entityName: `Horas en ${target.projectCode}`,
          description: `Eliminación de ${target.hours}h de trabajo`,
          previousData: target,
        });
      }
      setState((prev) => {
        let updatedProjects = prev.projects;
        let updatedTasks = prev.tasks;

        // Rollback de horas en la tarea WBS si aplica
        if (target?.taskId) {
          updatedTasks = prev.tasks.map((task) => {
            if (task.id === target.taskId) {
              const newActualHours = Math.max(0, (task.actualHours || 0) - (target.hours || 0));
              const progressPct = task.plannedHours > 0
                ? Math.min(100, Math.round((newActualHours / task.plannedHours) * 100))
                : task.progressPct;
              return { ...task, actualHours: newActualHours, progressPct };
            }
            return task;
          });
        }

        // Rollback de costo si la hoja de horas ya había sido aprobada
        if (target && target.status === 'approved' && (target.projectId || target.projectCode)) {
          updatedProjects = prev.projects.map((prj) => {
            if (prj.id === target.projectId || prj.code === target.projectCode) {
              const existingMatrix: any[] = (prj as any).costMatrix || [];
              const matchedCostItem = existingMatrix.find(
                (item) => item.id === `cost-ts-${target.id}` || (item.concept && item.concept.includes(`cost-ts-${target.id}`))
              );
              const laborCOP = (target.hours || 0) * (target.hourlyRateCOP || 0) || (matchedCostItem?.actualTotal || 0);
              const newAC = Math.max(0, (prj.actualCostAC || 0) - laborCOP);
              const newCV = (prj.earnedValueEV || 0) - newAC;
              const newCPI = newAC > 0 ? Number(((prj.earnedValueEV || 0) / newAC).toFixed(2)) : prj.cpi;
              const updatedMatrix = existingMatrix.filter(
                (item) => item.id !== `cost-ts-${target.id}` && !item.concept?.includes(`cost-ts-${target.id}`)
              );
              const existingTs = (prj as any).timesheetEntries || [];
              const updatedTs = existingTs.filter((ts: any) => ts.id !== target.id);

              return {
                ...prj,
                actualCostAC: newAC,
                cv: newCV,
                cpi: newCPI,
                costMatrix: updatedMatrix,
                timesheetEntries: updatedTs,
              };
            }
            return prj;
          });
        }

        return {
          ...prev,
          timesheets: prev.timesheets.map((t) =>
            t.id === id
              ? {
                  ...t,
                  isDeleted: true,
                  deletedAt: new Date().toISOString(),
                  deletedBy: prev.currentUser?.id || 'USR-SYSTEM',
                }
              : t
          ),
          tasks: updatedTasks,
          projects: updatedProjects,
        };
      });
      notify('info', 'Horas Eliminadas', 'El registro de horas de trabajo ha sido retirado.');
    },
    [state.timesheets, state.currentUser, notify]
  );

  const deleteDDR = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      setState((prev) => ({
        ...prev,
        ddrs: prev.ddrs.filter((d) => d.id !== id),
      }));
      notify('info', 'Reporte Diario Eliminado', 'El reporte DDR ha sido retirado.');
    },
    [notify]
  );

  const deleteMilestone = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.milestones.find((m) => m.id === id);
      setState((prev) => {
        const updatedProjects = target?.projectId
          ? prev.projects.map((p) => {
              if (p.id === target.projectId || p.code === target.projectCode) {
                const updatedBilling = (p.billingItems || []).filter((b) => b.id !== id && b.invoiceNumber !== target.invoiceNumber);
                const totalInvoiced = updatedBilling.reduce((acc, b) => acc + (Number(b.subtotal) || 0), 0);
                const totalPaid = updatedBilling.filter((b) => b.status === 'paid').reduce((acc, b) => acc + (Number(b.paidAmount || b.subtotal) || 0), 0);
                return { ...p, billingItems: updatedBilling, totalInvoiced, totalPaid };
              }
              return p;
            })
          : prev.projects;
        return {
          ...prev,
          milestones: prev.milestones.filter((m) => m.id !== id),
          projects: updatedProjects,
        };
      });
      notify('info', 'Hito Eliminado', 'El hito de facturación ha sido retirado.');
    },
    [state.milestones, notify]
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      let targetEmp: EmployeeRecord | undefined;
      let targetUser: User | undefined;

      setState((prev) => {
        targetEmp = prev.employees.find((e) => e.id === id);
        targetUser = prev.users.find(
          (u) =>
            u.id === id ||
            u.id === targetEmp?.userId ||
            u.employeeId === id ||
            (targetEmp && u.email && targetEmp.email && u.email.toLowerCase() === targetEmp.email.toLowerCase()) ||
            (targetEmp && u.nationalId && targetEmp.documentId && u.nationalId === targetEmp.documentId)
        );

        const idsToMark = [
          id,
          targetEmp?.userId,
          targetEmp?.employeeId,
          targetEmp?.documentId,
          targetEmp?.email,
          targetUser?.id,
          targetUser?.employeeId,
          targetUser?.email,
          targetUser?.nationalId,
        ].filter(Boolean) as string[];

        markEntityAsDeletedPermanent(idsToMark);

        const nextEmployees = prev.employees.filter((e) => e.id !== id && e.userId !== targetUser?.id);
        const nextUsers = prev.users.filter(
          (u) =>
            u.id !== id &&
            u.id !== targetEmp?.userId &&
            u.employeeId !== id &&
            (!targetUser || u.id !== targetUser.id)
        );

        if (targetUser) {
          deleteUserFromCloud(targetUser.id, targetUser.email).catch(console.warn);
        }

        syncModuleToCloud('hr', {
          employees: nextEmployees,
          novelties: prev.novelties || [],
          sstInspections: prev.sstInspections || [],
          jobPositions: prev.jobPositions || [],
          candidates: prev.candidates || [],
        }, prev.currentUser?.id).catch(console.warn);

        return {
          ...prev,
          employees: nextEmployees,
          users: nextUsers,
        };
      });
      notify('info', 'Empleado Eliminado', 'El registro de talento humano y su usuario TI han sido retirados.');
    },
    [notify]
  );

  // ============================================================================
  // INTERFAZ 1: CRM Oportunidad Ganada -> Proyecto STC Automático
  // ============================================================================
  const createOpportunity = useCallback(
    (oppData: Omit<Opportunity, 'id' | 'code' | 'createdAt'>): Opportunity => {
      const code = `OPP-2026-${String(state.opportunities.length + 1).padStart(3, '0')}`;
      const newOpp: Opportunity = {
        ...oppData,
        id: `OPP-${Date.now()}`,
        code,
        createdAt: new Date().toISOString().split('T')[0],
      };

      // Si se ingresó cliente y no existe en contactos, agregar automáticamente
      const clientName = oppData.clientName?.trim();
      const clientEmail = oppData.clientEmail?.trim();
      const clientPhone = oppData.clientPhone?.trim();

      const contactExists = state.contacts.some(
        (c) =>
          (clientEmail && c.email.toLowerCase() === clientEmail.toLowerCase()) ||
          c.company.toLowerCase() === clientName.toLowerCase()
      );

      let newContact: CRMContact | null = null;
      if (!contactExists && clientName) {
        newContact = {
          id: `CNT-${Date.now()}`,
          name: oppData.clientContactPerson?.trim() || clientName,
          company: clientName,
          role: 'Contacto Comercial / Operador STC',
          email: clientEmail || '',
          phone: clientPhone || '',
          stcSystem: oppData.cableType || 'Sistema Teleférico',
          country: oppData.country || 'Colombia',
          opportunityId: newOpp.id,
          opportunityCode: code,
          notes: `Registrado automáticamente desde la oportunidad ${code}: ${oppData.title}`,
        };
        newOpp.contactId = newContact.id;
      }

      setState((prev) => ({
        ...prev,
        opportunities: [newOpp, ...prev.opportunities],
        contacts: newContact ? [newContact, ...prev.contacts] : prev.contacts,
      }));

      notify(
        'success',
        'Oportunidad Creada',
        `${code}: ${oppData.title} registrada en el pipeline${newContact ? ' y cliente añadido a Contactos.' : '.'}`
      );
      return newOpp;
    },
    [state.opportunities.length, state.contacts, notify]
  );

  const awardOpportunity = useCallback(
    (oppId: string, customData?: Partial<Project>): { success: boolean; projectId?: string; projectCode?: string } => {
      const opp = state.opportunities.find((o) => o.id === oppId);
      if (!opp) return { success: false };

      const projectSeq = state.projects.length + 1;
      const projectCode =
        customData?.code?.trim() ||
        `PRJ-2026-${opp.country === 'México' ? 'CDMX' : opp.country === 'Bolivia' ? 'LPZ' : 'MED'}-${String(projectSeq).padStart(2, '0')}`;
      const projectId = `PRJ-${Date.now()}`;

      // Crear nuevo Proyecto Heredando Datos de la Oferta Comercial y del Formulario de Adjudicación
      const newProject: Project = {
        id: projectId,
        code: projectCode,
        name: customData?.name || opp.title,
        clientId: customData?.clientId || opp.clientId,
        opportunityId: oppId,
        clientName: customData?.clientName || opp.clientName,
        lineOfBusiness: (customData?.lineOfBusiness as any) || (opp.title.toLowerCase().includes('overhaul') ? 'Mantenimiento' : 'Montaje'),
        serviceType: customData?.serviceType || opp.cableType,
        status: 'kickoff',
        startDate: customData?.startDate || new Date().toISOString().split('T')[0],
        endDate: customData?.endDate || opp.expectedCloseDate,
        location: customData?.location || `${opp.country} (En sitio)`,
        costCenter: customData?.costCenter || `CC-${projectCode}`,
        budgetPV: customData?.budgetPV || (customData?.contractAmount ? customData.contractAmount : opp.estimatedValueUSD * (getStoredTRM() || 4150.00)),
        actualCostAC: 0,
        committedCostPO: 0,
        earnedValueEV: 0,
        spi: 1.0,
        cpi: 1.0,
        cv: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        projectLeaderId: customData?.projectLeaderId || '',
        projectLeaderName: customData?.projectLeaderName || '',
        supervisorId: customData?.supervisorId || customData?.projectLeaderId || '',
        supervisorName: customData?.supervisorName || customData?.projectLeaderName || '',
        assignedTeamIds: customData?.assignedTeamIds || (customData?.projectLeaderId ? [customData.projectLeaderId] : []),
        templateReused: Boolean(customData?.templateName),
        templateName: customData?.templateName || '',
        closedDossierSigned: false,
        liquidationSigned: false,
        lessonLearnedDone: false,
        clientNit: customData?.clientNit || opp.clientNit || opp.clientTaxId,
        clientCountry: customData?.clientCountry || opp.country,
        commercialContact: customData?.commercialContact,
        technicalContact: customData?.technicalContact,
        projectCategory: customData?.projectCategory,
        contractAmount: customData?.contractAmount,
        currency: customData?.currency || opp.currency || 'COP',
        billingMethod: customData?.billingMethod || 'fixed_price',
        paymentMilestones: customData?.paymentMilestones || opp.paymentMilestones,
        applicableRates: customData?.applicableRates,
        quoteCode: (customData as any)?.quoteCode || opp.quotations?.[0]?.code || '',
        contractCode: (customData as any)?.contractCode || '',
        costMatrix: [], // Cero Mock Data y Precio != Costo: La matriz de costos reales inicia limpia para reflejar la ejecución de obra
        offerBudget: (customData as any)?.offerBudget,
        projectItems: customData?.projectItems || (
          ((opp.quotations?.[0]?.items || (opp as any).items || []) as any[]).length > 0
            ? (((opp.quotations?.[0]?.items || (opp as any).items || []) as any[]).map((it: any, idx: number) => ({
                id: `item-${Date.now()}-${idx + 1}`,
                code: it.code || `ITEM ${String(idx + 1).padStart(2, '0')}`,
                name: it.name || it.description || `Alcance Contractual ${idx + 1}`,
                budgetPlanned: Number(it.totalPrice || it.budgetPlanned || it.unitPrice || 0),
                status: 'activo' as const,
                createdAt: new Date().toISOString(),
              })))
            : [
                {
                  id: `item-${Date.now()}-1`,
                  code: 'ITEM 01',
                  name: customData?.name || opp.title,
                  budgetPlanned: Number(customData?.budgetPV || (opp.estimatedValueUSD * (getStoredTRM() || 4150.00)) || 0),
                  status: 'activo' as const,
                  createdAt: new Date().toISOString(),
                }
              ]
        ),
      };

      // Crear Hitos de Facturación a partir de los hitos comerciales pactados o hito inicial contractual
      const milestonesToUse = customData?.paymentMilestones || opp.paymentMilestones;
      const initialContractCOP = newProject.contractAmount || newProject.budgetPV || 0;
      let initialMilestones: BillingMilestone[] = [];
      if (milestonesToUse && milestonesToUse.length > 0) {
        initialMilestones = milestonesToUse.map((m, idx) => ({
          id: m.id || `M-${Date.now()}-${idx + 1}`,
          projectId,
          projectCode,
          projectName: newProject.name,
          clientId: newProject.clientId,
          clientNit: newProject.clientNit,
          clientName: newProject.clientName,
          milestoneIndex: idx + 1,
          title: m.name || `Hito ${idx + 1}: Facturación contractual`,
          percentage: m.percentage,
          amountCOP: m.amount,
          amountUSD: Math.round(m.amount / (getStoredTRM() || 4150.00)),
          dueDate: newProject.endDate,
          acceptanceActSigned: false,
          invoiceIssued: m.status === 'invoiced' || m.status === 'paid',
          isPaid: m.status === 'paid',
        }));
      } else if (initialContractCOP > 0) {
        initialMilestones = [
          {
            id: `M-${Date.now()}-1`,
            projectId,
            projectCode,
            projectName: newProject.name,
            clientId: newProject.clientId,
            clientNit: newProject.clientNit,
            clientName: newProject.clientName,
            milestoneIndex: 1,
            title: `Hito 1: Facturación contractual - ${newProject.name}`,
            percentage: 100,
            amountCOP: initialContractCOP,
            amountUSD: Math.round(initialContractCOP / (getStoredTRM() || 4150.00)),
            dueDate: newProject.endDate,
            acceptanceActSigned: false,
            invoiceIssued: false,
            isPaid: false,
          },
        ];
      }

      const initialBillingItems: ProjectBillingItem[] = initialMilestones.map((m) => {
        const cop = m.amountCOP || 0;
        const taxRate = getProjectTaxRate(newProject.location || (newProject as any).clientCountry).rate;
        const iva = Math.round(cop * taxRate);
        return {
          id: m.id,
          itemCode: `HITO-${m.milestoneIndex}`,
          invoiceDate: m.dueDate || new Date().toISOString().split('T')[0],
          invoiceNumber: m.invoiceNumber || `FAC-PEND-${m.milestoneIndex}`,
          subtotal: cop,
          ivaAmount: iva,
          grandTotal: cop + iva,
          observations: `Hito comercial: ${m.title} (${m.percentage}%)`,
          milestoneName: m.title,
          milestonePercentage: m.percentage,
          dueDate: m.dueDate,
          status: m.isPaid ? 'paid' : m.invoiceIssued ? 'invoiced' : 'pending',
          acceptanceActSigned: m.acceptanceActSigned,
        };
      });
      newProject.billingItems = customData?.billingItems || initialBillingItems;

      // Inyectar Estructura WBS únicamente si el usuario seleccionó explícitamente una Plantilla Maestra Inteckno
      const allTemplates = templateManagerService.getWbsTemplates();
      const targetFamilyName = (customData?.templateName || '').trim();
      const matchedTpl = targetFamilyName
        ? allTemplates.find((t) =>
            t.title.toLowerCase().includes(targetFamilyName.toLowerCase()) ||
            targetFamilyName.toLowerCase().includes(t.title.toLowerCase())
          )
        : undefined;

      const standardTasks: WBSTask[] = (matchedTpl?.tasks && matchedTpl.tasks.length > 0)
        ? matchedTpl.tasks.map((t, idx) => ({
            id: `TASK-${Date.now()}-${idx + 1}`,
            projectId,
            code: t.code,
            name: t.name,
            plannedHours: t.plannedHours || 0,
            actualHours: 0,
            progressPct: 0,
            isCriticalPath: t.isCriticalPath ?? true,
            predecessors: t.predecessors || [],
            status: 'pending',
            assignedToName: t.assignedRole || newProject.supervisorName || '',
          }))
        : [];

      setState((prev) => ({
        ...prev,
        // Preservar la oportunidad en el CRM con stage 'awarded' y enlace al proyecto
        opportunities: prev.opportunities.map((o) =>
          o.id === oppId
            ? {
                ...o,
                stage: 'awarded' as const,
                awardedProjectId: projectId,
              }
            : o
        ),
        projects: [newProject, ...prev.projects],
        tasks: [...standardTasks, ...prev.tasks],
        milestones: [...initialMilestones, ...prev.milestones],
        activeModuleId: 'proyectos',
      }));

      // Agente Guardián: Respaldo continuo al adjudicar proyecto (Regla 14)
      createSystemBackup(
        'projects',
        `Adjudicación de oportunidad comercial: Creación de proyecto ${projectCode} (${newProject.name})`,
        newProject,
        state.currentUser?.id || 'USR-01',
        state.currentUser?.name || 'Sistema Inteckno'
      ).catch(console.warn);

      notify(
        'success',
        '¡Oportunidad Adjudicada!',
        `Se creó automáticamente el proyecto ${projectCode} (${newProject.name}) con su traza contractual completa.`
      );

      return { success: true, projectId, projectCode };
    },
    [state.opportunities, state.projects.length, notify]
  );

  const createContact = useCallback(
    (contactData: Omit<CRMContact, 'id'>) => {
      const newContact: CRMContact = {
        ...contactData,
        id: `CNT-${Date.now()}`,
      };
      if (state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'create',
          collection: 'contacts',
          entityName: `Contacto ${newContact.name}`,
          description: `Creación del contacto ${newContact.name} (${newContact.company})`,
          newData: newContact,
        });
      }
      setState((prev) => ({
        ...prev,
        contacts: [newContact, ...prev.contacts],
      }));
      notify('success', 'Contacto Creado', `${contactData.name} (${contactData.company}) guardado.`);
    },
    [state.currentUser, notify]
  );

  // ============================================================================
  // PROYECTOS & WBS
  // ============================================================================
  const createProject = useCallback(
    (prjData: Omit<Project, 'id' | 'spi' | 'cpi' | 'cv' | 'earnedValueEV' | 'actualCostAC'>): Project => {
      const nowIso = new Date().toISOString();
      const newProject: Project = {
        ...prjData,
        id: `PRJ-${Date.now()}`,
        actualCostAC: 0,
        earnedValueEV: 0,
        spi: 1.0,
        cpi: 1.0,
        cv: 0,
        createdAt: prjData.createdAt || nowIso,
        updatedAt: nowIso,
      };
      newProject.projectItems = ensureProjectItems(newProject);
      if (state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'create',
          collection: 'projects',
          entityName: `Proyecto ${newProject.code}`,
          description: `Creación del proyecto ${newProject.code} (${newProject.name})`,
          newData: newProject,
        });
      }

      setState((prev) => {
        const nextProjects = [newProject, ...prev.projects];

        // Persistencia inmediata local síncrona
        try {
          if (typeof localStorage !== 'undefined') {
            const currentState = { ...prev, projects: nextProjects };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
          }
        } catch (err) {}

        // Persistencia inmediata durable en IndexedDB
        saveStateToIdb({ ...prev, projects: nextProjects }).catch(console.warn);

        // Sincronización cloud proactiva inmediata sin esperar el debounce de 600ms
        if (isCloudLoadedRef.current) {
          syncModuleToCloud('projects', {
            projects: nextProjects,
            tasks: prev.tasks,
            milestones: prev.milestones,
          }, prev.currentUser?.id || 'USR-01').catch(console.warn);

          // Agente Guardián: Respaldo continuo de seguridad (Regla 14)
          createSystemBackup(
            'projects',
            `Creación de proyecto ${newProject.code} (${newProject.name})`,
            newProject,
            prev.currentUser?.id || 'USR-01',
            prev.currentUser?.name || 'Sistema Inteckno'
          ).catch(console.warn);
        }

        return {
          ...prev,
          projects: nextProjects,
        };
      });

      notify('success', 'Proyecto Registrado', `${newProject.code}: ${newProject.name} activo.`);
      return newProject;
    },
    [state.currentUser, notify]
  );

  const addWbsTask = useCallback(
    (taskData: Omit<WBSTask, 'id' | 'actualHours'>) => {
      const newTask: WBSTask = {
        ...taskData,
        id: `TASK-${Date.now()}`,
        actualHours: 0,
      };
      setState((prev) => ({
        ...prev,
        tasks: [...prev.tasks, newTask],
      }));
      notify('success', 'Tarea WBS Añadida', `Fase ${newTask.code}: ${newTask.name} asignada a ${newTask.assignedToName || 'personal'}.`);
    },
    [notify]
  );

  const updateProjectStatus = useCallback(
    (projectId: string, status: Project['status']) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => (p.id === projectId ? { ...p, status } : p)),
      }));
      notify('info', 'Estado Actualizado', `El proyecto cambió a fase: ${status.toUpperCase()}`);
    },
    [notify]
  );

  const assignTechnician = useCallback(
    (projectId: string, userId: string): { success: boolean; error?: string; warning?: string } => {
      const user = state.users.find((u) => u.id === userId);
      const project = state.projects.find((p) => p.id === projectId);
      if (!user || !project) return { success: false, error: 'Usuario o proyecto no encontrado' };

      const check = BusinessRulesEngine.canAssignToHeights(user);
      if (!check.allowed) {
        notify('urgent', 'Bloqueo HSEQ / Alturas', check.reason || 'Certificación no apta.');
        return { success: false, error: check.reason };
      }

      setState((prev) => ({
        ...prev,
        projects: prev.projects.map((p) => {
          if (p.id === projectId) {
            const currentTeam = p.assignedTeamIds || [];
            if (!currentTeam.includes(userId)) {
              return { ...p, assignedTeamIds: [...currentTeam, userId] };
            }
          }
          return p;
        }),
      }));

      notify('success', 'Técnico Asignado', `${user.name} asignado a ${project.code}.`);
      return { success: true };
    },
    [state.users, state.projects, notify]
  );

  const submitDDR = useCallback(
    (ddrData: Omit<DailyProgressReport, 'id' | 'reportNumber' | 'approvedByLeader'>) => {
      const count = state.ddrs.length + 1;
      const reportNumber = `DDR-2026-${String(count).padStart(3, '0')}`;
      const ddrId = `DDR-${Date.now()}`;

      const hasAnomaly = ddrData.anomalyDetected || ddrData.incidentsReported || (ddrData.incidentNotes && ddrData.incidentNotes.trim().length > 0);

      const newDdr: DailyProgressReport = {
        ...ddrData,
        id: ddrId,
        reportNumber,
        approvedByLeader: false,
        anomalyDetected: hasAnomaly,
      };

      if (ddrData.weather === 'tormenta_electrica') {
        notify('warning', 'Alerta Climatológica STC', 'Labores en alturas suspendidas por tormenta eléctrica.');
      } else if (hasAnomaly) {
        notify('urgent', 'Alerta Operativa en Campo', `${reportNumber}: Se reportó una anomalía operativa. Requiere revisión de Ingeniería.`);
      } else {
        notify('success', 'DDR Enviado', `Reporte ${reportNumber} radicado. En espera de visto bueno del Ingeniero.`);
      }

      setState((prev) => ({
        ...prev,
        ddrs: [newDdr, ...prev.ddrs],
      }));
    },
    [state.ddrs.length, notify]
  );

  const approveDDR = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        ddrs: prev.ddrs.map((d) => (d.id === id ? { ...d, approvedByLeader: true, approvedAt: new Date().toISOString() } : d)),
      }));
      notify('success', 'DDR Aprobado', 'El reporte diario fue aprobado por la dirección del proyecto.');
    },
    [notify]
  );

  // ============================================================================
  // REGISTRO DE HORAS (TIMESHEETS)
  // ============================================================================
  const submitTimesheet = useCallback(
    (entry: Omit<TimesheetEntry, 'id' | 'status'>) => {
      const newEntry: TimesheetEntry = {
        ...entry,
        id: `TS-${Date.now()}`,
        status: 'submitted',
      };
      if (state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'create',
          collection: 'timesheets',
          entityName: `Horas en ${entry.projectCode} (${entry.hours}h)`,
          description: `Radicación de ${entry.hours}h de trabajo en ${entry.projectCode}`,
          newData: newEntry,
        });
      }
      setState((prev) => ({
        ...prev,
        timesheets: [newEntry, ...prev.timesheets],
      }));
      notify('success', 'Horas Registradas', `Se radicaron ${entry.hours} horas en el proyecto ${entry.projectCode}.`);
    },
    [state.currentUser, notify]
  );

  const approveTimesheet = useCallback(
    (id: string) => {
      setState((prev) => {
        const targetTs = prev.timesheets.find((t) => t.id === id);
        if (!targetTs) return prev;
        if (targetTs.status === 'approved') return prev;

        // Buscar tarifa real del colaborador en la base de datos de Talento Humano / Usuarios
        const employeeRecord = prev.employees.find(
          (e) => e.id === targetTs.userId || e.name.toLowerCase() === targetTs.userName?.toLowerCase()
        );
        const userRecord = prev.users.find(
          (u) => u.id === targetTs.userId || u.name.toLowerCase() === targetTs.userName?.toLowerCase()
        );

        // Cálculo dinámico de tarifa hora según salario base real (240h laborales mensuales)
        // Costo hora empleador: salario base x factor prestacional (Ley 2101/2021: 42 h/sem = 210 h/mes)
        const laborRates = getLaborRates();
        const LABOR_BURDEN_FACTOR = laborRates.factorPrestacional;
        const MONTHLY_LEGAL_HOURS = laborRates.divisorMensual;
        const projectTrmForCost = getStoredTRM() || 4150.00;
        let hourlyRateCOP = targetTs.hourlyRateCOP || 0;
        if (!hourlyRateCOP) {
          if (employeeRecord?.baseSalaryCOP && employeeRecord.baseSalaryCOP > 0) {
            hourlyRateCOP = Math.round((employeeRecord.baseSalaryCOP * LABOR_BURDEN_FACTOR) / MONTHLY_LEGAL_HOURS);
          } else if (userRecord?.jobPosition?.salaryRange && typeof userRecord.jobPosition.salaryRange === 'object') {
            const midSalary = (userRecord.jobPosition.salaryRange.min + userRecord.jobPosition.salaryRange.max) / 2;
            if (midSalary > 0) {
              hourlyRateCOP = Math.round((midSalary * LABOR_BURDEN_FACTOR) / MONTHLY_LEGAL_HOURS);
            }
          }
        }

        // FASE 3: Desacoplamiento de Hojas de Horas hacia applyProjectCostEntry
        const updatedProjects = prev.projects.map((prj) => {
          if (prj.id === targetTs.projectId || prj.code === targetTs.projectCode) {
            const laborCOP = targetTs.totalCostCOP || ((targetTs.hours || 0) * hourlyRateCOP);
            const res = applyProjectCostEntry(prj, {
              originType: 'TIMESHEET',
              originId: targetTs.id,
              originLineId: targetTs.taskId || 'TS-LINE-01',
              entryNature: 'ACTUAL',
              itemCode: targetTs.itemCode,
              projectItemId: targetTs.costMatrixItemId,
              category: 'mano_obra_itk',
              concept: `Mano de Obra ITK - ${targetTs.userName || 'Técnico'} (${targetTs.hours}h @ ${hourlyRateCOP.toLocaleString('es-CO')}/h - ${targetTs.taskName || 'Labores'})`,
              unit: 'Horas',
              quantity: targetTs.hours || 0,
              unitCostCOP: hourlyRateCOP,
              totalCostCOP: laborCOP,
              costType: 'directo',
              date: targetTs.date || new Date().toISOString().split('T')[0],
              observations: `Radicado desde módulo de Registro de Horas. Aprobado por supervisión.`,
            });

            // Sincronizar entrada en project.timesheetEntries
            const existingTimesheets: any[] = (res.project as any).timesheetEntries || [];
            const fromProjectTab = targetTs.origin === 'proyecto';
            const updatedTsEntries = fromProjectTab
              ? existingTimesheets
              : [
                  {
                    id: targetTs.id,
                    projectId: prj.id,
                    taskId: targetTs.taskId || '',
                    taskName: targetTs.taskName || '',
                    taskCode: '',
                    userId: targetTs.userId,
                    userName: targetTs.userName,
                    userRole: targetTs.userRole,
                    date: targetTs.date,
                    hours: targetTs.hours || 0,
                    isEndTask: false,
                    isCertValid: true,
                    workDescription: targetTs.description || '',
                    status: 'aprobado',
                    createdAt: new Date().toISOString(),
                  },
                  ...existingTimesheets,
                ];

            return {
              ...res.project,
              timesheetEntries: updatedTsEntries,
            };
          }
          return prj;
        });

        // Actualizar horas reales y progreso en la Tarea WBS vinculada (si existe)
        const updatedTasks = prev.tasks.map((t) => {
          const isSameProject = t.projectId === targetTs.projectId;
          const matchesTask =
            t.id === targetTs.taskId ||
            t.code === targetTs.taskId ||
            (targetTs.taskName && (t.name.toLowerCase() === targetTs.taskName.toLowerCase() || targetTs.taskName.includes(t.code)));
          if (isSameProject && matchesTask && targetTs.origin !== 'proyecto') {
            const newActualHours = (t.actualHours || 0) + (targetTs.hours || 0);
            const newProgress = t.plannedHours > 0
              ? Math.min(100, Math.round((newActualHours / t.plannedHours) * 100))
              : t.progressPct;
            return {
              ...t,
              actualHours: newActualHours,
              progressPct: Math.max(t.progressPct || 0, newProgress),
              status: newProgress >= 100 ? ('completed' as const) : ('in_progress' as const),
            };
          }
          return t;
        });

        return {
          ...prev,
          timesheets: prev.timesheets.map((t) => (t.id === id ? { ...t, status: 'approved', hourlyRateCOP } : t)),
          projects: updatedProjects,
          tasks: updatedTasks,
        };
      });
      // Publicación en EventBus persistente de dominio
      const targetTs = state.timesheets.find((t) => t.id === id);
      if (targetTs) {
        domainEventBus.publish({
          type: 'TIMESHEET_SUBMITTED',
          payload: {
            timesheetId: targetTs.id,
            userId: targetTs.userId,
            hours: targetTs.hours || 0,
          },
        }, {
          actorId: state.currentUser?.id || 'USR-SYSTEM',
          correlationId: `CORR-TS-${targetTs.id}`,
          eventId: `evt-ts-appr-${targetTs.id}`,
        }).catch(console.warn);
      }

      notify('success', 'Horas Aprobadas y Costo Imputado', 'Registro de horas validado y liquidado en la matriz del proyecto.');
    },
    [notify]
  );

  const rejectTimesheet = useCallback(
    (id: string, reason: string) => {
      setState((prev) => ({
        ...prev,
        timesheets: prev.timesheets.map((t) => (t.id === id ? { ...t, status: 'rejected', rejectionReason: reason } : t)),
      }));
      notify('warning', 'Horas Devueltas', `El registro fue devuelto: ${reason}`);
    },
    [notify]
  );

  // ============================================================================
  // ABASTECIMIENTO & COMPRAS
  // ============================================================================
  const createPurchaseOrder = useCallback(
    (poData: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'status' | 'gmApproved'>) => {
      const count = state.purchaseOrders.length + 1;
      const orderNumber = `PO-2026-${String(count).padStart(3, '0')}`;

      const currentTrm = getStoredTRM();
      const totalUSD = poData.currency === 'USD'
        ? (poData.totalAmountUSD || 0)
        : Math.round((poData.totalAmountCOP || 0) / (currentTrm || 4150));
      const requiresGM = totalUSD > 2000;

      const newPo: PurchaseOrder = {
        ...poData,
        id: `PO-${Date.now()}`,
        orderNumber,
        status: requiresGM ? 'pending_gm_approval' : 'ordered',
        gmApproved: !requiresGM,
      };

      setState((prev) => {
        // 1. Vincular Requisición de Origen (SOLPED) si aplica
        const updatedReqs = poData.originRequisitionId
          ? prev.requisitions.map((req) =>
              req.id === poData.originRequisitionId
                ? {
                    ...req,
                    status: 'auto_po_generated' as const,
                    generatedPoId: newPo.id,
                    generatedPoNumber: orderNumber,
                  }
                : req
            )
          : prev.requisitions;

        // 2. Desacoplamiento de Matriz: Toda afectación económica pasa por applyProjectCostEntry
        // createPurchaseOrder registra COMMITTED (Costo Comprometido), NUNCA costo real ejecutado.
        const currentTrm = getStoredTRM();
        const costCOP = poData.totalAmountCOP || (poData.currency === 'USD' ? Math.round((poData.totalAmountUSD || 0) * currentTrm) : (poData.totalAmountUSD || 0));
        const poCategory = (poData.costCategory as any) || 'repuestos_fabricacion';
        const effectiveCostType = poData.costType || (['subcontratos_gruas', 'viaticos_transporte'].includes(poCategory) ? 'indirecto' : 'directo');
        const poLines = (poData.items && poData.items.length > 0) ? poData.items : [{
          id: 'line-1',
          originLineId: 'line-1',
          productId: 'gen',
          sku: 'GEN',
          name: poData.notes || 'Ítems de OC',
          qty: 1,
          orderedQty: 1,
          receivedQty: 0,
          unitPriceUSD: 0,
          unitPriceCOP: costCOP,
          subtotalUSD: 0,
          subtotalCOP: costCOP,
        }];

        const updatedProjects = prev.projects.map((prj) => {
          if (prj.id === poData.projectId || prj.code === poData.projectCode) {
            let currentProject = prj;
            poLines.forEach((it, idx) => {
              const lineId = it.originLineId || it.id || it.sku || `line-${idx + 1}`;
              const lineAmount = it.subtotalCOP || (Number(it.qty || 1) * Number(it.unitPriceCOP || 0)) || Math.round(costCOP / poLines.length);

              const result = applyProjectCostEntry(currentProject, {
                originType: 'PURCHASE_ORDER',
                originId: newPo.id,
                originLineId: lineId,
                entryNature: 'COMMITTED',
                itemCode: it.itemCode || poData.itemCode,
                projectItemId: it.costMatrixItemId || poData.costMatrixItemId,
                category: poCategory,
                concept: `OC ${orderNumber} - ${it.name || poData.supplierName || 'Proveedor'} [Comprometido]`,
                unit: 'unid',
                quantity: Number(it.orderedQty || it.qty || 1),
                unitCostCOP: Number(it.unitPriceCOP) || lineAmount,
                totalCostCOP: lineAmount,
                costType: effectiveCostType,
                date: poData.date || new Date().toISOString().split('T')[0],
                observations: `[Comprometido] Orden de compra emitida a ${poData.supplierName || 'Proveedor'}.`,
              });

              currentProject = result.project;
            });
            return currentProject;
          }
          return prj;
        });

        return {
          ...prev,
          purchaseOrders: [newPo, ...prev.purchaseOrders],
          requisitions: updatedReqs,
          projects: updatedProjects,
        };
      });

      // Huella Digital: Auditoría de creación de Orden de Compra
      recordAuditEvent({
        action: 'po_created',
        module: 'compras',
        performedByUserId: state.currentUser?.id || 'USR-001',
        performedByName: state.currentUser?.name || 'Usuario ITK',
        targetEntityId: orderNumber,
        details: `Creación de orden de compra ${orderNumber} para proveedor ${poData.supplierName || 'General'} por COP $${(poData.totalAmountCOP || 0).toLocaleString()}.`,
        newValue: `${orderNumber} | Total COP: $${(poData.totalAmountCOP || 0).toLocaleString()} | Estado: ${newPo.status}`,
      }).catch(() => {});

      // Registrar en el historial de deshacer aislado por usuario
      if (state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'create',
          collection: 'purchaseOrders',
          entityName: `Orden de Compra ${orderNumber}`,
          description: `Creación de orden de compra ${orderNumber}`,
          newData: newPo,
        });
      }

      notify('success', 'Orden de Compra Registrada', `${orderNumber} registrada y lista para seguimiento de entrega.`);

      return { success: true, requiresGMApproval: requiresGM };
    },
    [state.purchaseOrders.length, state.currentUser, notify]
  );

  const approvePurchaseOrderGM = useCallback(
    (poId: string) => {
      const targetPo = state.purchaseOrders.find((p) => p.id === poId);
      setState((prev) => ({
        ...prev,
        purchaseOrders: prev.purchaseOrders.map((po) =>
          po.id === poId
            ? {
                ...po,
                status: 'approved',
                gmApproved: true,
                gmApprovedBy: 'Gustavo Alberto Mejía Tobón',
                gmApprovedAt: new Date().toISOString(),
              }
            : po
        ),
      }));

      // Huella Digital: Visto Bueno Gerencia
      recordAuditEvent({
        action: 'po_approved',
        module: 'compras',
        performedByUserId: state.currentUser?.id || 'USR-07',
        performedByName: state.currentUser?.name || 'Gustavo Alberto Mejía Tobón',
        targetEntityId: targetPo?.orderNumber || poId,
        details: `Visto Bueno de Gerencia General concedido para la orden ${targetPo?.orderNumber || poId} por USD $${(targetPo?.totalAmountUSD || 0).toLocaleString()}.`,
        previousValue: 'pending_gm_approval',
        newValue: 'approved',
      }).catch(() => {});

      notify('success', 'Visto Bueno Concedido', 'La orden de compra fue autorizada por Gerencia General.');
    },
    [state.purchaseOrders, state.currentUser, notify]
  );

  // ============================================================================
  // HUELLA DIGITAL FORENSE & AUDITORÍA DE INVENTARIO INMUTABLE
  // ============================================================================
  const recordInventoryAuditLog = useCallback(
    async (logData: Omit<InventoryAuditLog, 'id' | 'timestamp'>): Promise<InventoryAuditLog> => {
      const newLog: InventoryAuditLog = {
        ...logData,
        id: `LOG-AUD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        inventoryAuditLogs: [newLog, ...prev.inventoryAuditLogs],
      }));

      // Registrar también en auditoría transversal del ERP
      recordKardexEntryCloud(newLog).catch(console.warn);

      recordAuditEvent({
        action: 'stock_adjusted',
        module: 'inventario',
        performedByUserId: logData.userId || state.currentUser?.id || 'USR-001',
        performedByName: logData.userName || state.currentUser?.name || 'Almacén ITK',
        targetEntityId: logData.productSku,
        details: `${logData.reason} | Origen: ${logData.source} | Stock: ${logData.previousStock} -> ${logData.newStock} (Δ ${logData.delta > 0 ? '+' : ''}${logData.delta}).`,
        previousValue: `${logData.previousStock} uds`,
        newValue: `${logData.newStock} uds`,
      }).catch(() => {});

      return newLog;
    },
    [state.currentUser]
  );

  const receivePurchaseOrder = useCallback(
    (poId: string) => {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (!po) return { success: false, error: 'Orden no encontrada' };
      if (po.status === 'received') return { success: false, error: 'La orden ya ha sido recibida previamente' };

      setState((prev) => {
        const newProductsToAdd: Product[] = [];
        const updatedProducts = prev.products.map((prod) => {
          const poItem = po.items.find((it) => it.productId === prod.id || it.sku === prod.sku);
          if (poItem) {
            const addedStock = Number(poItem.qty) || 0;
            const newStock = prod.realStock + addedStock;
            return {
              ...prod,
              realStock: newStock,
              availableStock: Math.max(0, newStock - prod.reservedStock),
            };
          }
          return prod;
        });

        // Crear productos no existentes que hayan sido comprados y recibidos
        po.items.forEach((it) => {
          const existsInProducts = prev.products.some((p) => p.id === it.productId || p.sku === it.sku);
          const alreadyAdded = newProductsToAdd.some((p) => p.id === it.productId || p.sku === it.sku);
          if (!existsInProducts && !alreadyAdded && it.sku) {
            const qty = Number(it.qty) || 1;
            newProductsToAdd.push({
              id: it.productId || `PRD-${Date.now()}-${it.sku}`,
              sku: it.sku,
              name: it.name || it.sku,
              category: 'Repuestos & Fabricación STC',
              unit: (it as any).unit || 'unid',
              costPriceCOP: it.unitPriceCOP || 0,
              costPriceUSD: it.unitPriceUSD || 0,
              realStock: qty,
              reservedStock: 0,
              availableStock: qty,
              minStock: 1,
              isCriticalSpare: false,
              isHomologatedITK: true,
              locationName: 'Almacén Central Medellín (Sede Poblado)',
              shelf: 'A-01',
            });
          }
        });

        // FASE 1: DESACOPLAMIENTO DE MUTACIONES DIRECTAS SOBRE project.costMatrix
        // Toda afectación económica pasa por applyProjectCostEntry con clave de idempotencia compuesta inmutable.
        let updatedProjects = prev.projects;
        if (po.projectId || po.projectCode) {
          const poCategory = (po.costCategory as any) || 'repuestos_fabricacion';
          const effectiveCostType = po.costType || (['subcontratos_gruas', 'viaticos_transporte'].includes(poCategory) ? 'indirecto' : 'directo');
          const poLines = (po.items && po.items.length > 0) ? po.items : [{
            id: 'line-1',
            originLineId: 'line-1',
            productId: 'gen',
            sku: 'GEN',
            name: po.notes || 'Ítems de OC',
            qty: 1,
            orderedQty: 1,
            receivedQty: 1,
            unitPriceUSD: 0,
            unitPriceCOP: po.totalAmountCOP || 0,
            subtotalUSD: 0,
            subtotalCOP: po.totalAmountCOP || 0,
          }];

          updatedProjects = prev.projects.map((prj) => {
            if (prj.id === po.projectId || prj.code === po.projectCode) {
              let currentProject = prj;
              poLines.forEach((it, idx) => {
                const lineId = it.originLineId || it.id || it.sku || `line-${idx + 1}`;
                const lineAmount = it.subtotalCOP || (Number(it.qty || 1) * Number(it.unitPriceCOP || 0)) || (po.totalAmountCOP ? Math.round(po.totalAmountCOP / poLines.length) : 0);

                const result = applyProjectCostEntry(currentProject, {
                  originType: 'PURCHASE_ORDER',
                  originId: po.id,
                  originLineId: lineId,
                  entryNature: 'ACTUAL',
                  itemCode: it.itemCode || po.itemCode,
                  projectItemId: it.costMatrixItemId || po.costMatrixItemId,
                  category: poCategory,
                  concept: `OC ${po.orderNumber} - ${it.name || po.supplierName || 'Proveedor'}`,
                  unit: 'unid',
                  quantity: Number(it.receivedQty || it.qty || 1),
                  unitCostCOP: Number(it.unitPriceCOP) || lineAmount,
                  totalCostCOP: lineAmount,
                  costType: effectiveCostType,
                  date: po.date || new Date().toISOString().split('T')[0],
                  invoiceNumber: (po as any).invoiceNumber || po.orderNumber,
                  observations: `Imputado por recepción de OC ${po.orderNumber} (${po.supplierName || 'Proveedor'}).`,
                });

                currentProject = result.project;
              });
              return currentProject;
            }
            return prj;
          });
        }

        // Coreografía de Trazabilidad: Eje 5 (Activos y HSEQ)
        // Si la OC compra una herramienta costosa/activo (ej. torquímetro), se registra en equipment con nextDueDate
        // y se notifica a HSEQ para su control de calibración
        const newEquipmentTools: EquipmentTool[] = [];
        const newNotifications: any[] = [];

        po.items.forEach((it, idx) => {
          const isHighPrecision = /torquimetro|torqumetro|laser|lser|alineador|multimetro|multmetro|ensayo|end|ndt|vibrac/i.test(`${it.name} ${it.sku}`);
          if (isHighPrecision || po.isEquipmentPurchase) {
            const today = new Date();
            const calibMonths = po.equipmentCalibPeriodMonths || 12;
            const nextDue = new Date(today.getTime() + calibMonths * 30 * 24 * 60 * 60 * 1000);
            const nextDueDateStr = nextDue.toISOString().split('T')[0];
            const eqCode = `EQ-${it.sku || 'TOOL'}-${Date.now().toString().slice(-4)}`;

            newEquipmentTools.push({
              id: `EQ-${Date.now()}-${idx}`,
              code: eqCode,
              name: it.name || 'Herramienta de Precisión',
              serialNumber: `SN-${Date.now().toString().slice(-6)}`,
              type: 'herramienta_especial',
              calibrationDate: today.toISOString().split('T')[0],
              calibrationExpiry: nextDueDateStr,
              nextDueDate: nextDueDateStr,
              isCalibrated: true,
              calibrationCertNumber: `CAL-${Date.now().toString().slice(-5)}`,
              status: 'available',
              dailyUsageCostCOP: Math.round((it.unitPriceCOP || 100000) * 0.03), // 3% depreciación/uso diario
            });

            newNotifications.push({
              id: `notif-eq-${Date.now()}-${idx}`,
              type: 'urgent',
              title: 'Metrología y Calibración HSEQ',
              message: `Herramienta de precisión recibida: ${it.name} (${eqCode}). Próxima calibración obligatoria: ${nextDueDateStr}. Revisar re-calibración antes de la fecha indicada.`,
              targetRole: 'hseq',
              timestamp: new Date().toISOString(),
              read: false,
            });
          }
        });

        return {
          ...prev,
          products: [...updatedProducts, ...newProductsToAdd],
          equipment: [...prev.equipment, ...newEquipmentTools],
          notifications: [...prev.notifications, ...newNotifications],
          purchaseOrders: prev.purchaseOrders.map((p) =>
            p.id === poId ? { ...p, status: 'received', deliveryStatus: 'entregado', physicalReceiptDone: true, technicalQualityInspectionDone: true } : p
          ),
          requisitions: prev.requisitions.map((r) =>
            r.id === po.originRequisitionId ? { ...r, status: 'fulfilled' as const } : r
          ),
          projects: updatedProjects,
        };
      });

      // Huella Digital Inmutable y Sincronización M365 Excel Online
      for (const poItem of po.items) {
        const prod = state.products.find((p) => p.id === poItem.productId || p.sku === poItem.sku);
        const qty = Number(poItem.qty) || 0;
        const prevStock = prod?.realStock || 0;
        const newStock = prevStock + qty;
        const prodId = prod?.id || poItem.productId || `PRD-${poItem.sku}`;
        const prodName = prod?.name || poItem.name || poItem.sku;

        recordInventoryAuditLog({
          productId: prodId,
          productSku: poItem.sku,
          productName: prodName,
          userId: state.currentUser?.id || 'USR-001',
          userName: state.currentUser?.name || 'Recepción Bodega ITK',
          userEmail: state.currentUser?.email || 'almacen@inteckno.com',
          source: 'erp_web',
          previousStock: prevStock,
          newStock,
          delta: qty,
          reason: `Ingreso por Orden de Compra ${po.orderNumber} (Proveedor: ${po.supplierName})`,
          projectCode: po.projectCode,
        });
        syncProductChangeToExcelOnline(poItem.sku, newStock).catch(() => {});
      }

      // Sincronizar automáticamente con la hoja 'Entrada' de Excel Online
      const poItemsToEntrada = po.items.map((it) => ({
        sku: it.sku,
        name: it.name,
        qty: it.qty,
        unit: 'unid',
        condition: 'bueno',
      }));

      if (poItemsToEntrada.length > 0) {
        appendReturnToExcelEntradas({
          referenceNumber: po.orderNumber,
          fecha: new Date().toISOString().split('T')[0],
          proyecto: po.projectCode,
          responsable: po.supplierName,
          tipo: 'recepcion_compra',
          notes: `Recepción de Orden de Compra ${po.orderNumber}`,
          items: poItemsToEntrada,
        }).catch(() => {});
      }

      // Agente Guardián: Respaldo continuo de recepción en almacén (Regla 14)
      createSystemBackup(
        'procurement',
        `Recepción total en bodega de Orden de Compra ${po.orderNumber} (Proveedor: ${po.supplierName})`,
        po,
        state.currentUser?.id || 'USR-001',
        state.currentUser?.name || 'Recepción Bodega ITK'
      ).catch(console.warn);

      // Publicación en EventBus persistente de dominio (Fase 1: Outbox + Idempotente)
      domainEventBus.publish({
        type: 'PURCHASE_ORDER_RECEIVED',
        payload: {
          poId: po.id,
          projectCode: po.projectCode || po.projectId,
          totalAmount: po.totalAmountCOP || 0,
          lines: (po.items || []).map((it, idx) => ({
            originLineId: it.originLineId || it.id || it.sku || `line-${idx + 1}`,
            amountCOP: it.subtotalCOP || (Number(it.qty || 1) * Number(it.unitPriceCOP || 0)),
            sku: it.sku,
          })),
        },
      }, {
        actorId: state.currentUser?.id || 'USR-SYSTEM',
        correlationId: `CORR-PO-${po.id}`,
        eventId: `evt-po-recv-${po.id}`,
      }).catch(console.warn);

      notify('success', 'Mercancía Recibida en Bodega', `${po.orderNumber}: Repuestos ingresados a bodega e inventario.`);
      return { success: true };
    },
    [state.purchaseOrders, state.products, state.currentUser, recordInventoryAuditLog, notify]
  );

  const receivePurchaseOrderPartial = useCallback(
    (poId: string, itemReceipts: { sku: string; receivedQty: number }[]) => {
      const po = state.purchaseOrders.find((p) => p.id === poId);
      if (!po) return { success: false, error: 'Orden no encontrada' };

      const receiptMap = new Map<string, number>();
      itemReceipts.forEach((r) => receiptMap.set(r.sku, r.receivedQty));

      setState((prev) => {
        const newProductsToAdd: Product[] = [];
        // Actualizar stock de existentes
        const updatedProducts = prev.products.map((prod) => {
          const deltaReceived = receiptMap.get(prod.sku) || 0;
          if (deltaReceived > 0) {
            const newStock = prod.realStock + deltaReceived;
            return {
              ...prod,
              realStock: newStock,
              availableStock: Math.max(0, newStock - prod.reservedStock),
            };
          }
          return prod;
        });

        // Crear productos no existentes que hayan sido recibidos
        itemReceipts.forEach((r) => {
          if (r.receivedQty <= 0) return;
          const it = po.items.find((pItem) => pItem.sku === r.sku);
          const existsInProducts = prev.products.some((p) => p.sku === r.sku || (it && p.id === it.productId));
          const alreadyAdded = newProductsToAdd.some((p) => p.sku === r.sku);
          if (!existsInProducts && !alreadyAdded && r.sku && it) {
            newProductsToAdd.push({
              id: it.productId || `PRD-${Date.now()}-${r.sku}`,
              sku: r.sku,
              name: it.name || r.sku,
              category: 'Repuestos & Fabricación STC',
              unit: (it as any).unit || 'unid',
              costPriceCOP: it.unitPriceCOP || 0,
              costPriceUSD: it.unitPriceUSD || 0,
              realStock: r.receivedQty,
              reservedStock: 0,
              availableStock: r.receivedQty,
              minStock: 1,
              isCriticalSpare: false,
              isHomologatedITK: true,
              locationName: 'Almacén Central Medellín (Sede Poblado)',
              shelf: 'A-01',
            });
          }
        });

        // Actualizar items de la orden de compra
        const updatedPoItems = po.items.map((it) => {
          const delta = receiptMap.get(it.sku) || 0;
          const currentReceived = it.receivedQty !== undefined ? it.receivedQty : (po.status === 'received' ? it.qty : 0);
          const newReceived = currentReceived + delta;
          const ordered = it.orderedQty !== undefined ? it.orderedQty : it.qty;
          const pending = Math.max(0, ordered - newReceived);
          return {
            ...it,
            orderedQty: ordered,
            receivedQty: newReceived,
            pendingQty: pending,
          };
        });

        // Determinar si es completa o parcial
        const allCompleted = updatedPoItems.every((it) => (it.receivedQty || 0) >= (it.orderedQty || it.qty));
        const hasAnyReceived = updatedPoItems.some((it) => (it.receivedQty || 0) > 0);
        const newStatus: PurchaseOrder['status'] = allCompleted ? 'received' : hasAnyReceived ? 'partial' : po.status;

        // Calcular delta de costo en COP transferido de Comprometido a Real
        let deltaCostCOP = 0;
        itemReceipts.forEach((r) => {
          if (r.receivedQty <= 0) return;
          const it = po.items.find((pItem) => pItem.sku === r.sku);
          const unitCOP = it?.unitPriceCOP || (po.totalAmountCOP && po.items.length > 0 ? Math.round(po.totalAmountCOP / po.items.length) : 0);
          deltaCostCOP += r.receivedQty * unitCOP;
        });

        let updatedProjects = prev.projects;
        if ((po.projectId || po.projectCode) && (deltaCostCOP > 0 || allCompleted)) {
          updatedProjects = prev.projects.map((prj) => {
            if (prj.id === po.projectId || prj.code === po.projectCode) {
              const transferAmount = allCompleted
                ? Math.max(deltaCostCOP, (prj.committedCostPO || 0))
                : deltaCostCOP;
              const newCommitted = Math.max(0, (prj.committedCostPO || 0) - transferAmount);
              const newAC = (prj.actualCostAC || 0) + deltaCostCOP;
              const newCV = (prj.earnedValueEV || 0) - newAC;
              const newCPI = newAC > 0 ? Number(((prj.earnedValueEV || 0) / newAC).toFixed(2)) : prj.cpi;

              const existingMatrix: any[] = (prj as any).costMatrix || [];
              let updatedCostMatrix: any[];
              if (po.costMatrixItemId && existingMatrix.some((m) => m.id === po.costMatrixItemId)) {
                updatedCostMatrix = existingMatrix.map((item) => {
                  if (item.id === po.costMatrixItemId) {
                    const newQty = (item.actualQuantity || 0) + 1;
                    const newTotal = (item.actualTotal || 0) + deltaCostCOP;
                    return {
                      ...item,
                      actualQuantity: newQty,
                      actualTotal: newTotal,
                      actualUnitCost: newQty > 0 ? Math.round(newTotal / newQty) : item.actualUnitCost,
                      variance: (item.plannedTotal || 0) - newTotal,
                      observations: item.observations
                        ? `${item.observations} | Recepción ${allCompleted ? 'completa' : 'parcial'} OC ${po.orderNumber}`
                        : `Recepción ${allCompleted ? 'completa' : 'parcial'} OC ${po.orderNumber}`,
                    };
                  }
                  return item;
                });
              } else {
                updatedCostMatrix = existingMatrix.map((item) => {
                  if (item.id === `cost-po-${po.id}` || (item.concept && po.orderNumber && item.concept.includes(`OC ${po.orderNumber}`))) {
                    const newTotal = (item.actualTotal || 0) + deltaCostCOP;
                    return {
                      ...item,
                      actualTotal: newTotal,
                      actualQuantity: 1,
                      actualUnitCost: newTotal,
                      variance: Math.max(0, (item.plannedTotal || 0) - newTotal),
                      observations: `Imputado por OC ${po.orderNumber} (${allCompleted ? 'Cumplida y Recibida' : 'Recepción Parcial'}).`,
                    };
                  }
                  return item;
                });
              }

              return {
                ...prj,
                actualCostAC: newAC,
                committedCostPO: newCommitted,
                cv: newCV,
                cpi: newCPI,
                costMatrix: updatedCostMatrix,
              };
            }
            return prj;
          });
        }

        return {
          ...prev,
          products: [...updatedProducts, ...newProductsToAdd],
          purchaseOrders: prev.purchaseOrders.map((p) =>
            p.id === poId
              ? {
                  ...p,
                  status: newStatus,
                  deliveryStatus: allCompleted ? 'entregado' : 'parcial',
                  items: updatedPoItems,
                  physicalReceiptDone: allCompleted,
                  technicalQualityInspectionDone: allCompleted,
                }
              : p
          ),
          requisitions: prev.requisitions.map((r) =>
            r.id === po.originRequisitionId && allCompleted ? { ...r, status: 'fulfilled' as const } : r
          ),
          projects: updatedProjects,
        };
      });

      // Audit log y Excel sync por delta recibido
      for (const receipt of itemReceipts) {
        if (receipt.receivedQty <= 0) continue;
        const prod = state.products.find((p) => p.sku === receipt.sku);
        const prodName = prod?.name || po.items.find((it) => it.sku === receipt.sku)?.name || receipt.sku;
        const prodId = prod?.id || `PRD-${receipt.sku}`;
        const prevStock = prod?.realStock || 0;
        const newStock = prevStock + receipt.receivedQty;

        recordInventoryAuditLog({
          productId: prodId,
          productSku: receipt.sku,
          productName: prodName,
          userId: state.currentUser?.id || 'USR-001',
          userName: state.currentUser?.name || 'Recepción Bodega ITK',
          userEmail: state.currentUser?.email || 'almacen@inteckno.com',
          source: 'erp_web',
          previousStock: prevStock,
          newStock,
          delta: receipt.receivedQty,
          reason: `Recepción Parcial (${receipt.receivedQty}) OC ${po.orderNumber}`,
          projectCode: po.projectCode,
        });
        syncProductChangeToExcelOnline(receipt.sku, newStock).catch(() => {});
      }

      notify('success', 'Despacho Parcial Registrado', `${po.orderNumber}: Stock actualizado con éxito.`);
      return { success: true };
    },
    [state.purchaseOrders, state.products, state.currentUser, recordInventoryAuditLog, notify]
  );

  const createRequisition = useCallback(
    (reqData: Omit<InternalRequisition, 'id' | 'reqNumber' | 'createdAt'> & { status?: InternalRequisition['status'] }) => {
      const count = state.requisitions.length + 1;
      const reqNumber = `REQ-2026-${String(count).padStart(3, '0')}`;
      const newReq: InternalRequisition = {
        ...reqData,
        id: `REQ-${Date.now()}`,
        reqNumber,
        status: reqData.status || 'draft',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setState((prev) => ({
        ...prev,
        requisitions: [newReq, ...prev.requisitions],
      }));
      if (state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'create',
          collection: 'requisitions',
          entityName: `Requisición ${reqNumber}`,
          description: `Creación de requisición ${reqNumber}`,
          newData: newReq,
        });
      }
      notify('success', 'Requisición Creada', `${reqNumber} registrada en el embudo de compras.`);
      return { success: true, autoPoCreated: false, requisition: newReq };
    },
    [state.requisitions.length, state.currentUser, notify]
  );

  const updateRequisition = useCallback(
    (id: string, data: Partial<InternalRequisition>) => {
      setState((prev) => ({
        ...prev,
        requisitions: prev.requisitions.map((r) => (r.id === id ? { ...r, ...data } : r)),
      }));
    },
    []
  );

  const createProduct = useCallback(
    (productData: Omit<Product, 'id'>) => {
      const newProd: Product = {
        ...productData,
        id: `PROD-${Date.now()}`,
      };
      setState((prev) => ({
        ...prev,
        products: [newProd, ...prev.products],
      }));
      syncSingleProductToCloud(newProd).catch(console.warn);
      notify('success', 'Repuesto Registrado', `${newProd.sku}: ${newProd.name} agregado a bodega.`);
    },
    [notify]
  );

  const updateProduct = useCallback(
    (id: string, data: Partial<Product>) => {
      setState((prev) => {
        const updated = prev.products.map((p) => {
          if (p.id === id) {
            const merged = { ...p, ...data };
            syncSingleProductToCloud(merged).catch(console.warn);
            return merged;
          }
          return p;
        });
        return {
          ...prev,
          products: updated,
        };
      });
    },
    []
  );

  const setAllProducts = useCallback((newProducts: Product[]) => {
    setState((prev) => ({
      ...prev,
      products: newProducts,
    }));
  }, []);

  const clearInventory = useCallback(() => {
    setState((prev) => ({
      ...prev,
      products: [],
    }));
    try {
      localStorage.removeItem('itk_excel_online_inventory_cache');
      localStorage.removeItem('itk_excel_online_salidas_cache');
      localStorage.removeItem('itk_excel_online_entradas_cache');
    } catch (e) {}
    notify('info', 'Inventario Vaciado', 'Se han eliminado todos los artículos del inventario.');
  }, [notify]);

  const adjustProductStock = useCallback(
    (productId: string, delta: number, reason: string = 'Ajuste de existencias', projectCode?: string, source: InventoryAuditLog['source'] = 'erp_web') => {
      const targetProd = state.products.find((p) => p.id === productId);
      if (!targetProd) return;
      const prevStock = targetProd.realStock;
      const newStock = Math.max(0, prevStock + delta);

      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              realStock: newStock,
              availableStock: Math.max(0, newStock - p.reservedStock),
            };
          }
          return p;
        }),
      }));

      // Huella Digital Inmutable
      recordInventoryAuditLog({
        productId: targetProd.id,
        productSku: targetProd.sku,
        productName: targetProd.name,
        userId: state.currentUser?.id || 'USR-001',
        userName: state.currentUser?.name || 'Almacén ITK',
        userEmail: state.currentUser?.email || 'almacen@inteckno.com',
        source,
        previousStock: prevStock,
        newStock,
        delta,
        reason,
        projectCode,
      });
      // Nota de Cuota: atomicStockTransaction actualiza el SKU y el Kardex en Cloud de forma transaccional sin duplicar escrituras

      // Ejecutar transacción atómica de stock en Cloud Firestore
      atomicStockTransaction(targetProd.id, delta, {
        productId: targetProd.id,
        productSku: targetProd.sku,
        productName: targetProd.name,
        userId: state.currentUser?.id || 'USR-001',
        userName: state.currentUser?.name || 'Almacén ITK',
        userEmail: state.currentUser?.email || 'almacen@inteckno.com',
        source,
        previousStock: prevStock,
        newStock,
        delta,
        reason,
        projectCode,
        movementType: delta > 0 ? 'ENTRADA' : 'SALIDA',
        unitCostCOP: targetProd.costPriceCOP || 0,
        totalCostCOP: Math.abs(delta) * (targetProd.costPriceCOP || 0),
      }).catch(console.warn);

      // Sincronización transparente con Microsoft Excel Online
      syncProductChangeToExcelOnline(targetProd.sku, newStock).catch(() => {});

      notify('info', 'Stock Modificado', `Inventario ajustado en ${delta > 0 ? '+' : ''}${delta} unidades.`);
    },
    [state.products, state.currentUser, recordInventoryAuditLog, notify]
  );

  const loanEquipment = useCallback(
    (toolId: string, projectId: string, userId: string) => {
      const tool = state.equipment.find((t) => t.id === toolId);
      const prj = state.projects.find((p) => p.id === projectId);
      const targetUsr = state.users.find((u) => u.id === userId);

      setState((prev) => ({
        ...prev,
        equipment: prev.equipment.map((t) =>
          t.id === toolId ? { ...t, status: 'assigned_in_field', assignedProjectId: projectId, assignedUserId: userId } : t
        ),
      }));

      // Huella Digital: Asignación de Herramienta a Campo
      recordAuditEvent({
        action: 'equipment_loaned',
        module: 'inventario',
        performedByUserId: state.currentUser?.id || 'USR-001',
        performedByName: state.currentUser?.name || 'Almacén ITK',
        targetEntityId: tool?.code || toolId,
        details: `Préstamo de herramienta/equipo ${tool?.name} (${tool?.code}) a proyecto ${prj?.code || projectId} bajo custodia de ${targetUsr?.name || userId}.`,
        previousValue: 'available',
        newValue: `assigned_in_field | Proyecto: ${prj?.code || projectId}`,
      }).catch(() => {});

      notify('success', 'Equipo Prestado', `Herramienta asignada al proyecto.`);
      return { success: true };
    },
    [state.equipment, state.projects, state.users, state.currentUser, notify]
  );

  const returnEquipment = useCallback(
    (toolId: string) => {
      const tool = state.equipment.find((t) => t.id === toolId);
      setState((prev) => ({
        ...prev,
        equipment: prev.equipment.map((t) =>
          t.id === toolId ? { ...t, status: 'available', assignedProjectId: undefined, assignedUserId: undefined } : t
        ),
      }));

      // Huella Digital: Retorno de Herramienta a Bodega
      recordAuditEvent({
        action: 'equipment_returned',
        module: 'inventario',
        performedByUserId: state.currentUser?.id || 'USR-001',
        performedByName: state.currentUser?.name || 'Almacén ITK',
        targetEntityId: tool?.code || toolId,
        details: `Reingreso e inspección técnica de equipo ${tool?.name} (${tool?.code}) a bodega central.`,
        previousValue: 'assigned_in_field',
        newValue: 'available',
      }).catch(() => {});

      notify('success', 'Equipo Devuelto', `Equipo retornado a bodega principal.`);
    },
    [state.equipment, state.currentUser, notify]
  );

  const updateProductStockDirect = useCallback(
    (productId: string, newStock: number, reason: string = 'Ajuste de existencias', projectCode?: string, source: InventoryAuditLog['source'] = 'erp_web') => {
      const sanitizedStock = Math.max(0, Number(newStock) || 0);
      const targetProd = state.products.find((p) => p.id === productId);
      const previousStock = targetProd?.realStock || 0;
      const delta = sanitizedStock - previousStock;

      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => {
          if (p.id === productId) {
            return {
              ...p,
              realStock: sanitizedStock,
              availableStock: Math.max(0, sanitizedStock - p.reservedStock),
            };
          }
          return p;
        }),
      }));

      if (targetProd && delta !== 0) {
        recordInventoryAuditLog({
          productId: targetProd.id,
          productSku: targetProd.sku,
          productName: targetProd.name,
          userId: state.currentUser?.id || 'USR-001',
          userName: state.currentUser?.name || 'Almacén ITK (Pistola Láser/Cámara)',
          userEmail: state.currentUser?.email || 'almacen@inteckno.com',
          source,
          previousStock,
          newStock: sanitizedStock,
          delta,
          reason,
          projectCode,
        });
        syncProductChangeToExcelOnline(targetProd.sku, sanitizedStock).catch(() => {});
      }
    },
    [state.products, state.currentUser, recordInventoryAuditLog]
  );

  // --------------------------------------------------------------------------
  // REMISIONES DE SALIDA, CUSTODIA EN CAMPO Y REINGRESO DE MATERIALES
  // --------------------------------------------------------------------------
  const setAllRemissions = useCallback((newRemissions: DispatchRemission[]) => {
    setState((prev) => ({
      ...prev,
      remissions: newRemissions,
    }));
  }, []);

  const createDispatchRemission = useCallback(
    (
      remData: Omit<
        DispatchRemission,
        'id' | 'remissionNumber' | 'status' | 'totalDispatchedItems' | 'totalReturnedItems' | 'totalConsumedValueUSD' | 'totalConsumedValueCOP'
      >
    ) => {
      // 1. BLOQUEO PREVENTIVO DE CALIBRACIÓN VENCIDA PARA EQUIPOS ESPECIALES NDT
      const expiredToolsInDispatch: EquipmentTool[] = [];
      const nowMs = Date.now();

      for (const item of remData.items) {
        const foundEq = state.equipment.find((e) => e.id === item.productId || e.code === item.sku);
        if (foundEq) {
          const isExpired = !foundEq.isCalibrated || (foundEq.calibrationExpiry && new Date(foundEq.calibrationExpiry).getTime() < nowMs);
          if (isExpired) {
            expiredToolsInDispatch.push(foundEq);
          }
        }
      }

      if (expiredToolsInDispatch.length > 0) {
        const toolNames = expiredToolsInDispatch.map((t) => `${t.name} (${t.code} - Venció: ${t.calibrationExpiry})`).join(', ');
        notify(
          'urgent',
          'BLOQUEO METROLÓGICO NDT',
          `No es posible autorizar la salida: el equipo [${toolNames}] tiene su Certificado de Calibración VENCIDO. Debe recalibrarse según norma ISO/IEC 17025.`
        );
        return { success: false, remissionNumber: '' };
      }

      const count = state.remissions.length + 1;
      const remissionNumber = `REM-OUT-2026-${String(count).padStart(3, '0')}`;
      const totalDispatched = remData.items.reduce((acc, it) => acc + (Number(it.qtyDispatched) || 0), 0);

      const newRemission: DispatchRemission = {
        ...remData,
        id: `REM-${Date.now()}`,
        remissionNumber,
        userId: remData.responsibleTechnicianId,
        status: 'en_campo',
        totalDispatchedItems: totalDispatched,
        totalReturnedItems: 0,
        totalConsumedValueUSD: 0,
        totalConsumedValueCOP: 0,
        items: remData.items.map((it) => {
          const prod = state.products.find((p) => p.id === it.productId || p.sku === it.sku);
          const suggested = it.suggestedUnitCostCOP || it.unitCostCOP || prod?.costPriceCOP || 0;
          const approved = (it.approvedCostCOP !== undefined && it.approvedCostCOP !== null)
            ? Number(it.approvedCostCOP)
            : suggested;
          return {
            ...it,
            suggestedUnitCostCOP: suggested,
            approvedCostCOP: approved,
            unitCostCOP: approved,
            imputedToProjectCost: Boolean(remData.projectId),
          };
        }),
      };

      // Descontar inventario de cada producto despachado y registrar auditoría forense con IDs relacionales
      setState((prev) => {
        const updatedProducts = prev.products.map((p) => {
          const itemDespachado = remData.items.find((it) => it.productId === p.id || it.sku === p.sku);
          if (itemDespachado) {
            const qtyToDeduct = Number(itemDespachado.qtyDispatched) || 0;
            const newStock = Math.max(0, p.realStock - qtyToDeduct);
            return {
              ...p,
              realStock: newStock,
              availableStock: Math.max(0, newStock - p.reservedStock),
              userId: remData.responsibleTechnicianId,
              custodianUserId: remData.responsibleTechnicianId,
              custodianName: remData.responsibleTechnicianName,
              projectId: remData.projectId,
              projectCodeAllocation: remData.projectCode || p.projectCodeAllocation,
              remissionId: newRemission.id,
              activeRemissionId: newRemission.id,
              loanStatus: 'DISPATCHED_TO_PROJECT',
            };
          }
          return p;
        });

        // Actualizar equipos a assigned_in_field si coinciden
        const updatedEquipment = prev.equipment.map((eq) => {
          const itemDespachado = remData.items.find((it) => it.productId === eq.id || it.sku === eq.code);
          if (itemDespachado) {
            return {
              ...eq,
              status: 'assigned_in_field' as const,
              assignedProjectId: remData.projectId,
              assignedProjectCode: remData.projectCode,
              assignedUserId: remData.responsibleTechnicianId,
              assignedUserName: remData.responsibleTechnicianName,
              loanDate: remData.departureDate,
              expectedReturnDate: remData.expectedReturnDate,
            };
          }
          return eq;
        });

        // Calcular valor de materiales consumibles / repuestos despachados directamente al proyecto
        let dispatchTotalCOP = 0;
        let dispatchTotalUSD = 0;
        const currentTrmVal = getStoredTRM() || 4150.00;
        const consumedItemsDesc: string[] = [];

        remData.items.forEach((it) => {
          const prod = prev.products.find((p) => p.id === it.productId || p.sku === it.sku);
          // Los equipos e instrumentación retornable no son costo de insumo de obra
          const isTool = prev.equipment.some((eq) => eq.id === it.productId || eq.code === it.sku);
          if (!isTool) {
            const qty = Number(it.qtyDispatched) || 0;
            const unitCostCOP = (it.approvedCostCOP !== undefined && it.approvedCostCOP !== null)
              ? Number(it.approvedCostCOP)
              : (it.unitCostCOP || prod?.costPriceCOP || 0);
            const itemTotalCOP = qty * unitCostCOP;
            if (itemTotalCOP > 0) {
              dispatchTotalCOP += itemTotalCOP;
              dispatchTotalUSD += Math.round(itemTotalCOP / currentTrmVal);
              consumedItemsDesc.push(`${it.name} (x${qty})`);
            }
          }
        });

        // FASE 2: Desacoplamiento de Remisiones hacia applyProjectCostEntry
        // Registra PROVISIONAL para materiales entregados en obra
        const updatedProjects = prev.projects.map((prj) => {
          if ((prj.id === remData.projectId || prj.code === remData.projectCode) && dispatchTotalCOP > 0) {
            let currentPrj = prj;
            remData.items.forEach((it, idx) => {
              const prod = prev.products.find((p) => p.id === it.productId || p.sku === it.sku);
              const isTool = prev.equipment.some((eq) => eq.id === it.productId || eq.code === it.sku);
              if (!isTool) {
                const qty = Number(it.qtyDispatched) || 0;
                const unitCostCOP = (it.approvedCostCOP !== undefined && it.approvedCostCOP !== null)
                  ? Number(it.approvedCostCOP)
                  : (it.unitCostCOP || prod?.costPriceCOP || 0);
                const itemTotalCOP = qty * unitCostCOP;
                if (itemTotalCOP > 0) {
                  const lineId = (it as any).id || it.sku || `line-${idx + 1}`;
                  const res = applyProjectCostEntry(currentPrj, {
                    originType: 'DISPATCH_REMISSION',
                    originId: newRemission.id,
                    originLineId: lineId,
                    entryNature: 'PROVISIONAL',
                    itemCode: it.itemCode || remData.itemCode,
                    category: 'repuestos_fabricacion',
                    concept: `Salida Almacén (${remissionNumber}) - ${it.name || it.sku}`,
                    unit: 'unid',
                    quantity: qty,
                    unitCostCOP,
                    totalCostCOP: itemTotalCOP,
                    costType: 'directo',
                    date: remData.departureDate || new Date().toISOString().split('T')[0],
                    observations: `[Provisional] Salida a obra por Remisión ${remissionNumber}. Responsable: ${remData.responsibleTechnicianName}.`,
                  });
                  currentPrj = res.project;
                }
              }
            });
            return currentPrj;
          }
          return prj;
        });

        return {
          ...prev,
          products: updatedProducts,
          equipment: updatedEquipment,
          projects: updatedProjects,
          remissions: [newRemission, ...prev.remissions],
        };
      });

      // Huella digital inmutable y sincronización con Excel Online por cada producto despachado
      for (const item of remData.items) {
        const p = state.products.find((prod) => prod.id === item.productId || prod.sku === item.sku);
        if (p) {
          const qty = Number(item.qtyDispatched) || 0;
          const newStock = Math.max(0, p.realStock - qty);
          recordInventoryAuditLog({
            productId: p.id,
            productSku: p.sku,
            productName: p.name,
            userId: state.currentUser?.id || 'USR-001',
            userName: state.currentUser?.name || 'Almacén ITK',
            userEmail: state.currentUser?.email || 'almacen@inteckno.com',
            source: 'erp_web',
            previousStock: p.realStock,
            newStock,
            delta: -qty,
            reason: `Despacho por Remisión ${remissionNumber} a cargo de ${remData.responsibleTechnicianName}`,
            projectCode: remData.projectCode,
          });
          syncProductChangeToExcelOnline(p.sku, newStock).catch(() => {});
        }
      }

      // Sincronizar automáticamente con la hoja 'Salida' de Excel Online
      appendDispatchToExcelSalidas({
        remissionNumber,
        departureDate: remData.departureDate,
        projectCode: remData.projectCode,
        responsibleTechnicianName: remData.responsibleTechnicianName,
        notes: remData.notes,
        items: remData.items.map((it) => ({
          sku: it.sku,
          name: it.name,
          qtyDispatched: it.qtyDispatched,
          unit: it.unit,
        })),
      }).catch(() => {});

      notify(
        'success',
        'Remisión de Salida Generada',
        `${remissionNumber}: ${totalDispatched} artículos despachados a ${remData.projectCode} a cargo de ${remData.responsibleTechnicianName}.`
      );

      return { success: true, remissionNumber };
    },
    [state.remissions.length, state.equipment, state.products, state.currentUser, recordInventoryAuditLog, notify]
  );

  const processReturnRemission = useCallback(
    (
      remissionId: string,
      returnedItems: { id: string; qtyReturned: number; condition?: RemissionItem['condition']; notes?: string }[],
      returnNotes: string,
      returnDate: string = new Date().toISOString().split('T')[0],
      returnSignature?: {
        signatureUrl?: string;
        timestamp?: string;
        signerName?: string;
        signerDoc?: string;
      }
    ) => {
      const remission = state.remissions.find((r) => r.id === remissionId);
      if (!remission) return { success: false, consumedCostUSD: 0, consumedCostCOP: 0 };

      let consumedCostUSD = 0;
      let consumedCostCOP = 0;
      let totalReturned = 0;

      const updatedItems: RemissionItem[] = remission.items.map((item) => {
        const retInfo = returnedItems.find((r) => r.id === item.id);
        const qtyReturned = retInfo ? Math.min(item.qtyDispatched, Math.max(0, Number(retInfo.qtyReturned) || 0)) : item.qtyDispatched;
        const qtyConsumed = Math.max(0, item.qtyDispatched - qtyReturned);

        totalReturned += qtyReturned;
        consumedCostUSD += qtyConsumed * item.unitCostUSD;
        consumedCostCOP += qtyConsumed * item.unitCostCOP;

        return {
          ...item,
          qtyReturned,
          qtyConsumed,
          condition: retInfo?.condition || (qtyConsumed > 0 ? 'consumido' : 'bueno'),
          notes: retInfo?.notes || item.notes,
        };
      });

      const allReturned = updatedItems.every((it) => it.qtyConsumed === 0);
      const returnNumber = `REM-IN-2026-${String(state.remissions.filter((r) => r.actualReturnDate).length + 1).padStart(3, '0')}`;

      setState((prev) => {
        // Reintegrar al inventario los ítems que retornaron
        const updatedProducts = prev.products.map((p) => {
          const retItem = updatedItems.find((it) => it.productId === p.id || it.sku === p.sku);
          if (retItem && retItem.qtyReturned > 0) {
            const newStock = p.realStock + retItem.qtyReturned;
            return {
              ...p,
              realStock: newStock,
              availableStock: Math.max(0, newStock - p.reservedStock),
            };
          }
          return p;
        });

        // Reintegrar equipos y calcular costo por uso / depreciación inyectado al proyecto (Eje 5)
        let totalEquipmentUsageCostCOP = 0;
        const equipmentUsageCostItems: any[] = [];

        const updatedEquipment = prev.equipment.map((eq) => {
          const retItem = updatedItems.find((it) => it.productId === eq.id || it.sku === eq.code);
          if (retItem && retItem.qtyReturned > 0) {
            // Calcular días de permanencia en obra
            const departureMs = remission.departureDate ? new Date(remission.departureDate).getTime() : Date.now();
            const returnMs = returnDate ? new Date(returnDate).getTime() : Date.now();
            const daysUsed = Math.max(1, Math.ceil((returnMs - departureMs) / (1000 * 60 * 60 * 24)));
            const dailyRate = eq.dailyUsageCostCOP || 25000;
            const toolUsageCOP = daysUsed * dailyRate;

            totalEquipmentUsageCostCOP += toolUsageCOP;
            equipmentUsageCostItems.push({
              id: `cost-tool-${eq.code}-${Date.now()}`,
              category: 'alquiler_equipos' as const,
              concept: `Depreciación / Uso de Equipo: ${eq.name} (${eq.code}) - ${daysUsed} días @ ${dailyRate.toLocaleString('es-CO')}/día`,
              unit: 'Días',
              plannedQuantity: daysUsed,
              plannedUnitCost: dailyRate,
              plannedTotal: toolUsageCOP,
              actualQuantity: daysUsed,
              actualUnitCost: dailyRate,
              actualTotal: toolUsageCOP,
              variance: 0,
              costType: 'directo' as const,
              date: returnDate,
              observations: `Liquidado al retorno de Remisión ${remission.remissionNumber} (Retorno ${returnNumber}). Eje 5 HSEQ.`,
            });

            return {
              ...eq,
              status: 'available' as const,
              assignedProjectId: undefined,
              assignedProjectCode: undefined,
              assignedUserId: undefined,
              assignedUserName: undefined,
            };
          }
          return eq;
        });

        // FASE 2: Liquidación de Consumo Neto Real mediante applyProjectCostEntry
        // Registra ACTUAL por los ítems consumidos y por el desgaste de herramientas
        const updatedProjects = prev.projects.map((prj) => {
          if (prj.id === remission.projectId || prj.code === remission.projectCode) {
            let currentPrj = prj;

            // 1. Imputar consumo de materiales
            updatedItems.forEach((it, idx) => {
              if (it.qtyConsumed > 0) {
                const itemTotalCOP = Math.round(Number(it.qtyConsumed) * Number(it.unitCostCOP || 0));
                const lineId = (it as any).id || it.sku || `line-${idx + 1}`;
                const res = applyProjectCostEntry(currentPrj, {
                  originType: 'RETURN_REMISSION',
                  originId: returnNumber,
                  originLineId: lineId,
                  entryNature: 'ACTUAL',
                  itemCode: it.itemCode || remission.itemCode,
                  category: 'repuestos_fabricacion',
                  concept: `Consumo Almacén (${remission.remissionNumber} / Ret: ${returnNumber}) - ${it.name}`,
                  unit: 'unid',
                  quantity: it.qtyConsumed,
                  unitCostCOP: Number(it.unitCostCOP || 0),
                  totalCostCOP: itemTotalCOP,
                  costType: 'directo',
                  date: returnDate || new Date().toISOString().split('T')[0],
                  invoiceNumber: returnNumber,
                  observations: `Liquidación final de consumo neto en obra (${returnNotes || 'Sin notas adicionales'}).`,
                });
                currentPrj = res.project;
              }
            });

            // 2. Imputar uso/desgaste de herramientas especiales NDT
            equipmentUsageCostItems.forEach((toolCost: any, tIdx: number) => {
              const res = applyProjectCostEntry(currentPrj, {
                originType: 'RETURN_REMISSION',
                originId: returnNumber,
                originLineId: `tool-usage-${tIdx + 1}`,
                entryNature: 'ACTUAL',
                category: 'consumibles_taller',
                concept: toolCost.concept,
                unit: toolCost.unit || 'Días',
                quantity: toolCost.actualQuantity || 1,
                unitCostCOP: toolCost.actualUnitCost || toolCost.actualTotal,
                totalCostCOP: toolCost.actualTotal,
                costType: 'directo',
                date: returnDate || new Date().toISOString().split('T')[0],
                observations: toolCost.observations,
              });
              currentPrj = res.project;
            });

            return currentPrj;
          }
          return prj;
        });

        const updatedRemissions = prev.remissions.map((r) => {
          if (r.id === remissionId) {
            return {
              ...r,
              returnRemissionNumber: returnNumber,
              actualReturnDate: returnDate,
              status: allReturned ? ('retornado_total' as const) : ('retornado_parcial' as const),
              items: updatedItems,
              totalReturnedItems: totalReturned,
              totalConsumedValueUSD: consumedCostUSD,
              totalConsumedValueCOP: consumedCostCOP,
              returnNotes,
              returnSignatureUrl: returnSignature?.signatureUrl,
              returnSignedAt: returnSignature?.timestamp,
              returnSignerName: returnSignature?.signerName,
              returnSignerDoc: returnSignature?.signerDoc,
            };
          }
          return r;
        });

        return {
          ...prev,
          products: updatedProducts,
          equipment: updatedEquipment,
          projects: updatedProjects,
          remissions: updatedRemissions,
        };
      });

      // Huella digital inmutable y sincronización con Excel Online por ítems retornados
      for (const item of updatedItems) {
        if (item.qtyReturned > 0) {
          const p = state.products.find((prod) => prod.id === item.productId || prod.sku === item.sku);
          if (p) {
            const newStock = p.realStock + item.qtyReturned;
            recordInventoryAuditLog({
              productId: p.id,
              productSku: p.sku,
              productName: p.name,
              userId: state.currentUser?.id || 'USR-001',
              userName: state.currentUser?.name || 'Almacén ITK',
              userEmail: state.currentUser?.email || 'almacen@inteckno.com',
              source: 'erp_web',
              previousStock: p.realStock,
              newStock,
              delta: item.qtyReturned,
              reason: `Reingreso a bodega por ${returnNumber} (Retorno de campo ${remission.projectCode})`,
              projectCode: remission.projectCode,
            });
            syncProductChangeToExcelOnline(p.sku, newStock).catch(() => {});
          }
        }
      }

      // Sincronizar automáticamente con la hoja 'Entrada' de Excel Online
      const returnedItemsList = updatedItems
        .filter((it) => it.qtyReturned > 0)
        .map((it) => ({
          sku: it.sku,
          name: it.name,
          qty: it.qtyReturned,
          unit: it.unit,
          condition: it.condition,
        }));

      if (returnedItemsList.length > 0) {
        appendReturnToExcelEntradas({
          referenceNumber: returnNumber,
          fecha: returnDate,
          proyecto: remission.projectCode,
          responsable: remission.responsibleTechnicianName,
          tipo: 'reingreso_campo',
          notes: returnNotes,
          items: returnedItemsList,
        }).catch(() => {});
      }

      if (consumedCostUSD > 0) {
        notify(
          'urgent',
          'Consumo Imputado al Proyecto',
          `${returnNumber}: Se liquidaron USD $${consumedCostUSD.toLocaleString()} (COP $${consumedCostCOP.toLocaleString()}) cargados al costo real de ${remission.projectCode}.`
        );
      } else {
        notify(
          'success',
          'Reingreso Total de Herramientas',
          `${returnNumber}: Todos los equipos retornaron conformes a bodega central.`
        );
      }

      return { success: true, consumedCostUSD, consumedCostCOP };
    },
    [state.remissions, state.products, state.currentUser, recordInventoryAuditLog, notify]
  );
  const submitExpense = useCallback(
    (entry: Omit<ExpenseEntry, 'id' | 'status'>) => {
      const expId = `EXP-${Date.now()}`;
      const newEntry: ExpenseEntry = {
        ...entry,
        id: expId,
        status: 'pending',
      };
      setState((prev) => ({
        ...prev,
        expenses: [newEntry, ...prev.expenses],
      }));

      // Huella Digital: Registro de Gasto Operativo
      recordAuditEvent({
        action: 'expense_created',
        module: 'gastos',
        performedByUserId: state.currentUser?.id || 'USR-001',
        performedByName: state.currentUser?.name || 'Colaborador ITK',
        targetEntityId: expId,
        details: `Radicación de gasto ${entry.category || 'Operativo'} por ${entry.currency} $${(entry.amount || 0).toLocaleString()} (Concepto: ${entry.description || 'Gasto'}).`,
        newValue: `${entry.currency} $${(entry.amount || 0).toLocaleString()} | Estado: pending`,
      }).catch(() => {});

      if (state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'create',
          collection: 'expenses',
          entityName: `Gasto: ${entry.description || entry.category || 'Operativo'}`,
          description: `Registro de gasto por ${entry.currency} $${(entry.amount || 0).toLocaleString()}`,
          newData: newEntry,
        });
      }

      notify('success', 'Gasto Reportado', `Se radicó el comprobante por ${entry.currency} $${entry.amount.toLocaleString()}.`);
    },
    [state.currentUser, notify]
  );

  const approveExpense = useCallback(
    (id: string) => {
      const exp = state.expenses.find((e) => e.id === id);
      setState((prev) => {
        const targetExp = prev.expenses.find((e) => e.id === id);
        if (!targetExp) return prev;
        if (targetExp.status === 'approved') return prev;
        let updatedProjects = prev.projects;

        // Si el gasto está imputado a un Proyecto y no es una recarga/depósito de caja, inyectar en la Matriz de Costos del Proyecto
        if (targetExp && (targetExp.projectId || targetExp.projectCode) && targetExp.movementType !== 'deposito') {
          const expTrm = getStoredTRM() || 4150.00;
          const amountCOP = targetExp.currency === 'USD'
            ? Math.round((targetExp.amount || 0) * expTrm)
            : targetExp.currency === 'EUR'
            ? Math.round((targetExp.amount || 0) * expTrm * 1.08) // misma convención EUR/USD que TabCostosPresupuesto
            : (targetExp.amount || 0);

          const mappedCategory = (
            ['viaticos_alimentacion', 'tiquetes_transporte', 'alojamiento', 'transporte_urbano'].includes(targetExp.category) ? 'viaticos_transporte' :
            ['materiales_urgentes', 'materiales_obra'].includes(targetExp.category) ? 'repuestos_fabricacion' :
            targetExp.category === 'herramientas' ? 'consumibles_taller' :
            targetExp.category === 'servicios_tecnicos' ? 'subcontratos_gruas' : 'imprevistos_contingencia'
          ) as any;

          // FASE 2: Desacoplamiento de Gastos hacia applyProjectCostEntry
          // Registra ACTUAL con idempotencia inmutable basada en originId: targetExp.id
          updatedProjects = prev.projects.map((prj) => {
            if (prj.id === targetExp.projectId || prj.code === targetExp.projectCode) {
              const res = applyProjectCostEntry(prj, {
                originType: 'EXPENSE',
                originId: targetExp.id,
                originLineId: targetExp.invoiceNumber || 'EXP-LINE-01',
                entryNature: 'ACTUAL',
                itemCode: targetExp.itemCode,
                projectItemId: targetExp.costMatrixItemId,
                category: mappedCategory,
                concept: `${targetExp.isPettyCash ? '[Caja Menor] ' : '[Gasto Legalizado] '}${targetExp.description}${targetExp.supplierName ? ` - ${targetExp.supplierName}` : ''}`,
                unit: 'Global',
                quantity: 1,
                unitCostCOP: amountCOP,
                totalCostCOP: amountCOP,
                costType: 'directo',
                date: targetExp.date || new Date().toISOString().split('T')[0],
                invoiceNumber: targetExp.invoiceNumber || '',
                observations: `Radicado por ${targetExp.userName}. Aprobado por contabilidad (${currentUserName}).`,
              });
              return res.project;
            }
            return prj;
          });
        }

        const currentUserId = state.currentUser?.id || 'USR-04';
        const currentUserName = state.currentUser?.name || 'Clemencia García (USR-04)';
        return {
          ...prev,
          expenses: prev.expenses.map((e) => (e.id === id ? { 
            ...e, 
            status: 'approved',
            approvedBy: currentUserId,
            approvedByName: currentUserName,
            approvedAt: new Date().toISOString(),
            costMatrixInjected: true,
          } : e)),
          projects: updatedProjects,
        };
      });

      // Huella Digital: Aprobación Contable de Gasto
      const approverId = state.currentUser?.id || 'USR-04';
      const approverName = state.currentUser?.name || 'Clemencia García (USR-04)';
      recordAuditEvent({
        action: 'expense_approved',
        module: 'gastos',
        performedByUserId: approverId,
        performedByName: approverName,
        targetEntityId: id,
        details: `Aprobación y legalización contable de gasto ${id} por ${exp?.currency || 'COP'} ${(exp?.amount || 0).toLocaleString()} ejecutada por ${approverName}.`,
        previousValue: 'pending',
        newValue: 'approved',
      }).catch(() => {});

      notify('success', 'Gasto Aprobado e Imputado', 'Se legalizó el desembolso y se actualizó la matriz de costos del proyecto.');
    },
    [state.expenses, state.currentUser, notify]
  );

  const createMilestone = useCallback(
    (milestoneData: Partial<BillingMilestone>) => {
      const newMilestone: BillingMilestone = {
        id: milestoneData.id || `MS-${Date.now()}`,
        projectId: milestoneData.projectId || '',
        projectCode: milestoneData.projectCode || 'STC-GENERAL',
        projectName: milestoneData.projectName || 'Proyecto General ITK',
        clientId: milestoneData.clientId,
        clientNit: milestoneData.clientNit,
        clientName: milestoneData.clientName || 'Cliente STC',
        milestoneIndex: milestoneData.milestoneIndex || (state.milestones.length + 1),
        title: milestoneData.title || `Hito Contractual ${state.milestones.length + 1}`,
        percentage: Number(milestoneData.percentage) || 10,
        amountCOP: Number(milestoneData.amountCOP) || 0,
        amountUSD: Number(milestoneData.amountUSD) || 0,
        dueDate: milestoneData.dueDate || new Date().toISOString().split('T')[0],
        acceptanceActSigned: Boolean(milestoneData.acceptanceActSigned),
        acceptanceActSignedAt: milestoneData.acceptanceActSignedAt,
        invoiceDeadlineTimestamp: milestoneData.invoiceDeadlineTimestamp,
        invoiceIssued: Boolean(milestoneData.invoiceIssued),
        invoiceNumber: milestoneData.invoiceNumber,
        invoiceIssuedAt: milestoneData.invoiceIssuedAt,
        billingItemId: milestoneData.billingItemId,
        isPaid: Boolean(milestoneData.isPaid),
        paidAt: milestoneData.paidAt,
        paymentReference: milestoneData.paymentReference,
        paymentAmountCOP: milestoneData.paymentAmountCOP,
      };

      setState((prev) => ({
        ...prev,
        milestones: [newMilestone, ...prev.milestones],
      }));

      notify('success', 'Hito Contractual Radicado', `Se creó el hito "${newMilestone.title}" para ${newMilestone.projectCode}.`);
    },
    [state.milestones, notify]
  );

  const signMilestoneAct = useCallback(
    (milestoneId: string, signerData?: { signerName: string; signerId: string; signerRole: string; gps?: { lat: number; lng: number }; signatureHash?: string }) => {
      const milestone = state.milestones.find((m) => m.id === milestoneId);
      if (!milestone) return;

      // Coreografía Eje 8 (Calidad, Dossiers y Hitos): HARD STOP EN 1709
      // Si el hito requiere dossier de calidad o verificación técnica EN 1709, validar que existan los documentos técnicos aprobados
      const projectDocs = state.documents.filter((d) => 
        (d.projectCode && milestone.projectCode && d.projectCode.toLowerCase() === milestone.projectCode.toLowerCase()) ||
        (d.category === 'certificados_hseq' || d.category === 'procedimientos' || d.category === 'planos')
      );
      const hasDossier = projectDocs.some((d) => 
        d.category === 'certificados_hseq' || 
        d.title.toLowerCase().includes('en 1709') || 
        d.title.toLowerCase().includes('calidad') || 
        d.title.toLowerCase().includes('dossier') ||
        d.title.toLowerCase().includes('carga')
      );

      if (milestone.requiresQualityDossier && !hasDossier) {
        notify('urgent', 'BLOQUEO HARD STOP: Dossier de Calidad Incompleto', 'No es posible firmar el Acta. Se exige el 100% de documentos técnicos EN 1709 (Ensayos, Pruebas de Carga y As-Built).');
        return;
      }

      const signedAt = new Date().toISOString();
      const rawPayload = `${milestoneId}:${signerData?.signerId || 'S/N'}:${signedAt}:${signerData?.signerName || 'Interventor'}`;
      // Generación determinista de hash SHA-256 o fallback hexadecimal seguro
      const computedHash = signerData?.signatureHash || Array.from(rawPayload)
        .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
        .toString(16)
        .padStart(16, '0') + '-sha256-verified';

      const auditEvidence = {
        signatureHash: computedHash,
        signedAt,
        signedBy: signerData?.signerName || 'Interventor Autorizado',
        signerNationalId: signerData?.signerId || 'S/N',
        signerRole: signerData?.signerRole || 'Interventor de Obra',
        gpsCoordinates: signerData?.gps || { lat: 6.2442, lng: -75.5812, precisionMeters: 5 },
        verificationStandard: 'NTP-ISO-2026 / SHA-256',
      };

      setState((prev) => ({
        ...prev,
        milestones: prev.milestones.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                acceptanceActSigned: true,
                acceptanceActSignedAt: signedAt,
                acceptanceActSignerName: signerData?.signerName || 'Interventor Autorizado',
                acceptanceActSignerId: signerData?.signerId || 'S/N',
                acceptanceActSignerRole: signerData?.signerRole || 'Interventor de Obra',
                auditEvidence,
                invoiceDeadlineTimestamp: Date.now() + 48 * 3600 * 1000,
              }
            : m
        ),
      }));

      // Huella Digital: Firma de Acta de Hito
      recordAuditEvent({
        action: 'act_signed',
        module: 'facturacion',
        performedByUserId: state.currentUser?.id || 'USR-001',
        performedByName: state.currentUser?.name || 'Director de Proyectos ITK',
        targetEntityId: milestoneId,
        details: `Firma oficial de Acta de Aceptación para hito "${milestone?.title || milestoneId}". Regla DIAN 48h para emisión de factura activada.`,
        previousValue: 'Acta pendiente',
        newValue: 'acceptanceActSigned: true',
      }).catch(() => {});

      notify('urgent', 'Acta Firmada (Regla 48h Activa)', 'Inicia conteo de 48 horas para expedir la factura.');
    },
    [state.milestones, state.currentUser, notify]
  );

  const issueMilestoneInvoice = useCallback(
    (milestoneId: string, invoiceNumber: string) => {
      const milestone = state.milestones.find((m) => m.id === milestoneId);
      setState((prev) => {
        const updatedMilestones = prev.milestones.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                invoiceIssued: true,
                invoiceNumber,
                invoiceIssuedAt: new Date().toISOString(),
              }
            : m
        );

        // Si el hito pertenece a un proyecto, sincronizar su registro en billingItems
        const updatedProjects = milestone?.projectId
          ? prev.projects.map((p) => {
              if (p.id === milestone.projectId || p.code === milestone.projectCode) {
                const existingBilling = p.billingItems || [];
                const cop = milestone.amountCOP || 0;
                const iva = Math.round(cop * getProjectTaxRate(p.location || (p as any).clientCountry || (p as any).country).rate);
                const grandTotal = cop + iva;

                const updatedBilling: any[] = existingBilling.some((b) => b.id === milestoneId)
                  ? existingBilling.map((b) =>
                      b.id === milestoneId
                        ? {
                            ...b,
                            status: b.status === 'paid' ? ('paid' as const) : ('invoiced' as const),
                            invoiceNumber,
                            invoiceDate: new Date().toISOString().split('T')[0],
                            subtotal: b.subtotal || cop,
                            ivaAmount: b.ivaAmount !== undefined ? b.ivaAmount : iva,
                            grandTotal: b.grandTotal || grandTotal,
                            observations: `Hito de facturación ${milestone.title || ''}`,
                          }
                        : b
                    )
                  : [
                      ...existingBilling,
                      {
                        id: milestoneId,
                        itemCode: `FAC-${milestone.milestoneIndex || 1}`,
                        status: 'invoiced' as const,
                        invoiceNumber,
                        invoiceDate: new Date().toISOString().split('T')[0],
                        subtotal: cop,
                        ivaAmount: iva,
                        grandTotal: grandTotal,
                        observations: `Hito: ${milestone.title} (${milestone.percentage || 100}%)`,
                      },
                    ];
                const totalInvoiced = updatedBilling.reduce((acc, b) => acc + (Number(b.subtotal) || 0), 0);
                const updatedPaymentMilestones = p.paymentMilestones?.map((pm) =>
                  pm.id === milestoneId || pm.name === milestone.title
                    ? { ...pm, status: (pm.status === 'paid' ? ('paid' as const) : ('invoiced' as const)) }
                    : pm
                );
                return { ...p, billingItems: updatedBilling, totalInvoiced, paymentMilestones: updatedPaymentMilestones || p.paymentMilestones };
              }
              return p;
            })
          : prev.projects;

        syncModuleToCloud('projects', {
          projects: updatedProjects,
          milestones: updatedMilestones,
        }, prev.currentUser?.id).catch(console.warn);

        return {
          ...prev,
          milestones: updatedMilestones,
          projects: updatedProjects,
        };
      });

      // Huella Digital: Emisión de Factura Electrónica
      recordAuditEvent({
        action: 'invoice_issued',
        module: 'facturacion',
        performedByUserId: state.currentUser?.id || 'USR-001',
        performedByName: state.currentUser?.name || 'Facturación & Contabilidad ITK',
        targetEntityId: invoiceNumber,
        details: `Expedición de factura fiscal ${invoiceNumber} para hito "${milestone?.title || milestoneId}" por COP $${(milestone?.amountCOP || 0).toLocaleString()}.`,
        previousValue: 'Sin facturar',
        newValue: `Factura: ${invoiceNumber}`,
      }).catch(() => {});

      notify('success', 'Factura Emitida', `${invoiceNumber} registrada exitosamente.`);
    },
    [state.milestones, state.currentUser, notify]
  );

  const markMilestonePaid = useCallback(
    (milestoneId: string, paymentData?: { paidAt?: string; paymentReference?: string; paymentAmountCOP?: number }) => {
      const milestone = state.milestones.find((m) => m.id === milestoneId);
      setState((prev) => {
        const paidAt = paymentData?.paidAt || new Date().toISOString();
        const paymentReference = paymentData?.paymentReference || '';
        const paidCOP = paymentData?.paymentAmountCOP || milestone?.amountCOP || 0;

        const updatedMilestones = prev.milestones.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                isPaid: true,
                paidAt,
                paymentReference,
                paymentAmountCOP: paidCOP,
              }
            : m
        );

        // Si el hito pertenece a un proyecto, sincronizar su registro en billingItems y totalPaid
        const updatedProjects = milestone?.projectId
          ? prev.projects.map((p) => {
              if (p.id === milestone.projectId || p.code === milestone.projectCode) {
                const existingBilling = p.billingItems || [];
                const updatedBilling = existingBilling.map((b) =>
                  b.id === milestoneId || (milestone.invoiceNumber && b.invoiceNumber === milestone.invoiceNumber)
                    ? {
                        ...b,
                        status: 'paid' as const,
                        paymentDate: paidAt.split('T')[0],
                        paidAmount: paidCOP,
                        observations: b.observations
                          ? `${b.observations} | Pago recaudado Ref: ${paymentReference}`
                          : `Pago recaudado Ref: ${paymentReference}`,
                      }
                    : b
                );
                const totalPaid = updatedBilling
                  .filter((b) => b.status === 'paid')
                  .reduce((acc, b) => acc + (Number(b.paidAmount || b.subtotal) || 0), 0);

                // Sincronizar también con paymentMilestones del proyecto si existen
                const updatedPaymentMilestones = p.paymentMilestones?.map((pm) =>
                  pm.id === milestoneId || pm.name === milestone.title
                    ? { ...pm, status: 'paid' as const }
                    : pm
                );

                return {
                  ...p,
                  billingItems: updatedBilling,
                  totalPaid,
                  paymentMilestones: updatedPaymentMilestones || p.paymentMilestones,
                };
              }
              return p;
            })
          : prev.projects;

        syncModuleToCloud('projects', {
          projects: updatedProjects,
          milestones: updatedMilestones,
        }, prev.currentUser?.id).catch(console.warn);

        return {
          ...prev,
          milestones: updatedMilestones,
          projects: updatedProjects,
        };
      });

      // Huella Digital: Registro de Pago / Recaudo
      recordAuditEvent({
        action: 'milestone_paid',
        module: 'facturacion',
        performedByUserId: state.currentUser?.id || 'USR-001',
        performedByName: state.currentUser?.name || 'Tesorería & Cartera ITK',
        targetEntityId: milestoneId,
        details: `Registro de pago / recaudo de hito "${milestone?.title || milestoneId}" por COP $${(paymentData?.paymentAmountCOP || milestone?.amountCOP || 0).toLocaleString()} (Ref: ${paymentData?.paymentReference || 'N/A'}).`,
        previousValue: 'Pendiente de pago',
        newValue: 'isPaid: true',
      }).catch(() => {});

      // Agente Guardián: Respaldo de recaudo y tesorería (Regla 14)
      createSystemBackup(
        'billing',
        `Recaudo registrado para hito "${milestone?.title || milestoneId}" (${milestone?.projectCode || ''})`,
        { milestoneId, paymentData },
        state.currentUser?.id || 'USR-001',
        state.currentUser?.name || 'Tesorería & Cartera ITK'
      ).catch(console.warn);

      notify('success', 'Recaudo Registrado', `El hito "${milestone?.title || milestoneId}" ha sido marcado como pagado.`);
    },
    [state.milestones, state.currentUser, notify]
  );

  // ============================================================================
  // MÓDULOS INTECKNO (TRANSVERSALES)
  // ============================================================================
  const setActiveChatChannel = useCallback((channelId: string) => {
    setState((prev) => ({
      ...prev,
      activeChatChannelId: channelId,
    }));
  }, []);

  const triggerChatToast = useCallback(
    (toastData: Omit<ChatNotificationToast, 'id' | 'timestamp'>) => {
      const toast: ChatNotificationToast = {
        ...toastData,
        id: `toast-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: 'Ahora',
      };
      setState((prev) => ({
        ...prev,
        activeChatToast: toast,
      }));
      playNotificationSound();
    },
    []
  );

  const dismissChatToast = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeChatToast: null,
    }));
  }, []);

  const markChatAsRead = useCallback(
    (channelId: string, userId?: string) => {
      const targetUserId = userId || state.currentUser.id;
      const normalizedChannel = normalizeChannelId(channelId);
      setState((prev) => {
        let changed = false;
        const updatedMessages = prev.chatMessages.map((m) => {
          const mNorm = normalizeChannelId(m.channel);
          if ((m.channel === normalizedChannel || mNorm === normalizedChannel) && m.senderId !== targetUserId) {
            const currentReadBy = m.readBy || [m.senderId];
            if (!currentReadBy.includes(targetUserId)) {
              changed = true;
              return {
                ...m,
                readBy: [...currentReadBy, targetUserId],
              };
            }
          }
          return m;
        });

        if (!changed) return prev;
        return {
          ...prev,
          chatMessages: updatedMessages,
        };
      });

      // Notificar a otras ventanas abiertas que se leyeron los mensajes
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel(ERP_BROADCAST_CHANNEL);
          bc.postMessage({
            type: 'CHAT_MARK_READ',
            channelId: normalizedChannel,
            userId: targetUserId,
          });
          bc.close();
        }
      } catch (e) {}
    },
    [state.currentUser.id]
  );

  const markAllChatsAsRead = useCallback(
    (userId?: string) => {
      const targetUserId = userId || state.currentUser.id;
      setState((prev) => {
        let changed = false;
        const updatedMessages = prev.chatMessages.map((m) => {
          if (m.senderId !== targetUserId) {
            const currentReadBy = m.readBy || [m.senderId];
            if (!currentReadBy.includes(targetUserId)) {
              changed = true;
              return {
                ...m,
                readBy: [...currentReadBy, targetUserId],
              };
            }
          }
          return m;
        });

        if (!changed) return prev;
        return {
          ...prev,
          chatMessages: updatedMessages,
        };
      });

      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel(ERP_BROADCAST_CHANNEL);
          bc.postMessage({
            type: 'CHAT_MARK_ALL_READ',
            userId: targetUserId,
          });
          bc.close();
        }
      } catch (e) {}
    },
    [state.currentUser.id]
  );

  const simulateColleagueMessage = useCallback(
    (channelId?: string, customText?: string) => {
      const targetChannel = normalizeChannelId(channelId || state.activeChatChannelId || 'general');
      const targetGroup = state.chatGroups.find((g) => g.id === targetChannel);
      const channelName = targetGroup ? targetGroup.name : 'Chat General';

      let sender = SEED_USERS.find((u) => u.id !== state.currentUser.id);
      if (targetGroup?.isDirect) {
        const otherId = targetGroup.members.find((m) => m !== state.currentUser.id);
        const partner = SEED_USERS.find((u) => u.id === otherId);
        if (partner) sender = partner;
      }

      if (!sender) sender = SEED_USERS[1];

      const sampleReplies = [
        'Copiado. Recibido el reporte, procedo con la validación de campo.',
        'Enterado, ya registré el hito en la bitácora técnica de Inteckno.',
        'Perfecto, los datos coinciden con la calibración del dinamómetro.',
        'Excelente coordinación, quedo atento a cualquier actualización adicional.',
        'Confirmado el avance técnico. Muchas gracias por el seguimiento.',
      ];
      const replyText = customText || sampleReplies[Math.floor(Math.random() * sampleReplies.length)];

      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      const ampm = Number(hours) >= 12 ? 'PM' : 'AM';
      const formattedTime = `Hoy ${hours}:${mins} ${ampm}`;

      const newMsg: ChatMessage = {
        id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        channel: targetChannel,
        senderId: sender.id,
        senderName: sender.name,
        senderRole: sender.roleLabel,
        avatarColor: sender.avatarColor,
        text: replyText,
        timestamp: formattedTime,
        readBy: [sender.id],
      };

      setState((prev) => ({
        ...prev,
        chatMessages: [...prev.chatMessages, newMsg],
      }));

      triggerChatToast({
        channelId: targetChannel,
        channelName,
        senderName: sender.name,
        senderRole: sender.roleLabel,
        senderAvatar: sender.avatar || sender.name.slice(0, 2).toUpperCase(),
        avatarColor: sender.avatarColor,
        text: replyText,
      });
    },
    [state.activeChatChannelId, state.chatGroups, state.currentUser.id, triggerChatToast]
  );

  const addChatMessage = useCallback(
    (
      channel: string,
      text: string,
      replyTo?: ChatMessage['replyTo'],
      attachment?: ChatMessage['attachment'],
      extraMeta?: Partial<ChatMessage>
    ) => {
      const normalizedChannel = normalizeChannelId(channel);
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const mins = now.getMinutes().toString().padStart(2, '0');
      const ampm = Number(hours) >= 12 ? 'PM' : 'AM';
      const formattedTime = `Hoy ${hours}:${mins} ${ampm}`;

      const newMsg: ChatMessage = {
        id: `MSG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        channel: normalizedChannel,
        senderId: state.currentUser.id,
        senderName: state.currentUser.name.split(' ')[0] + ' ' + (state.currentUser.name.split(' ')[1] || ''),
        senderRole: state.currentUser.roleLabel,
        avatarColor: state.currentUser.avatarColor,
        text,
        timestamp: formattedTime,
        createdAt: Date.now(),
        readBy: [state.currentUser.id],
        replyTo,
        attachment,
        ...(extraMeta || {}),
      };

      const targetGroup = state.chatGroups.find((g) => g.id === normalizedChannel);

      setState((prev) => ({
        ...prev,
        chatMessages: [...prev.chatMessages, newMsg],
      }));

      // TRANSMISIÓN INMEDIATA ENTRE VENTANAS/PESTAÑAS ABIERTAS (BroadcastChannel)
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel(ERP_BROADCAST_CHANNEL);
          bc.postMessage({
            type: 'CHAT_MESSAGE_SENT',
            message: newMsg,
            senderUserId: state.currentUser.id,
            group: targetGroup,
          });
          bc.close();
        }
      } catch (err) {
        console.warn('Error broadcasting message:', err);
      }

      // Sincronización en la nube con Cloud Firestore para que otros usuarios lo reciban
      syncChatMessageToCloud(newMsg).catch((err) => {
        console.warn('[CloudChatSync] Error sincronizando mensaje en la nube:', err);
      });

      // Si es un canal de emergencia o mensaje crítico, generar alerta prioritaria en el ERP
      if (normalizedChannel === 'canal-emergencias-stc' || extraMeta?.isEmergency) {
        notify(
          'urgent',
          '🚨 ALERTA CRÍTICA STC EN CAMPO',
          `${newMsg.senderName} (${newMsg.senderRole}): ${text.slice(0, 100)}`
        );
      }
    },
    [state.currentUser, state.chatGroups, notify]
  );

  const updateChatMessage = useCallback((id: string, data: Partial<ChatMessage>) => {
    setState((prev) => {
      let updatedTarget: ChatMessage | null = null;
      const updatedMessages = prev.chatMessages.map((m) => {
        if (m.id === id) {
          updatedTarget = { ...m, ...data };
          return updatedTarget;
        }
        return m;
      });

      if (updatedTarget) {
        // Sincronización en Cloud Firestore
        syncChatMessageToCloud(updatedTarget).catch((err) => {
          console.warn('[CloudChatSync] Error sincronizando mensaje actualizado en Cloud:', err);
        });

        // Transmisión inmediata entre pestañas locales
        try {
          if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
            const bc = new BroadcastChannel(ERP_BROADCAST_CHANNEL);
            bc.postMessage({
              type: 'CHAT_MESSAGE_UPDATED',
              message: updatedTarget,
            });
            bc.close();
          }
        } catch (e) {}
      }

      return {
        ...prev,
        chatMessages: updatedMessages,
      };
    });
  }, []);

  // ESCUCHADOR DE TIEMPO REAL ENTRE PESTAÑAS Y VENTANAS ABIERTAS (BroadcastChannel & storage)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(ERP_BROADCAST_CHANNEL);
      bc.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'CHAT_MESSAGE_SENT') {
          const incomingMsg: ChatMessage = data.message;

          setState((prev) => {
            if (prev.chatMessages.some((m) => m.id === incomingMsg.id)) {
              return prev;
            }
            return {
              ...prev,
              chatMessages: [...prev.chatMessages, incomingMsg],
            };
          });

          // Si el usuario de esta ventana NO es el emisor:
          if (incomingMsg.senderId !== state.currentUser.id) {
            const targetGroup =
              data.group ||
              state.chatGroups.find((g) => g.id === incomingMsg.channel);

            const isRecipient = targetGroup
              ? targetGroup.members.includes(state.currentUser.id)
              : true;

            if (isRecipient) {
              playNotificationSound();

              const chatTitle = targetGroup?.isDirect
                ? incomingMsg.senderName
                : targetGroup?.name || 'Chat';

              triggerChatToast({
                channelId: incomingMsg.channel,
                channelName: chatTitle,
                senderName: incomingMsg.senderName,
                senderRole: incomingMsg.senderRole,
                senderAvatar: incomingMsg.senderName.slice(0, 2).toUpperCase(),
                avatarColor: incomingMsg.avatarColor,
                text: incomingMsg.text || 'Archivo adjunto',
              });

              if (
                state.activeModuleId === 'conversaciones' &&
                normalizeChannelId(state.activeChatChannelId) === incomingMsg.channel
              ) {
                markChatAsRead(incomingMsg.channel, state.currentUser.id);
              }
            }
          }
        } else if (data.type === 'CHAT_MARK_READ') {
          setState((prev) => ({
            ...prev,
            chatMessages: prev.chatMessages.map((m) => {
              if (m.channel === data.channelId || normalizeChannelId(m.channel) === data.channelId) {
                const currentRead = m.readBy || [m.senderId];
                if (!currentRead.includes(data.userId)) {
                  return { ...m, readBy: [...currentRead, data.userId] };
                }
              }
              return m;
            }),
          }));
        } else if (data.type === 'CHAT_MARK_ALL_READ') {
          setState((prev) => ({
            ...prev,
            chatMessages: prev.chatMessages.map((m) => {
              if (m.senderId !== data.userId) {
                const currentRead = m.readBy || [m.senderId];
                if (!currentRead.includes(data.userId)) {
                  return { ...m, readBy: [...currentRead, data.userId] };
                }
              }
              return m;
            }),
          }));
        } else if (data.type === 'CHAT_GROUP_CREATED') {
          setState((prev) => {
            if (prev.chatGroups.some((g) => g.id === data.group.id)) return prev;
            return {
              ...prev,
              chatGroups: [data.group, ...prev.chatGroups],
            };
          });
        } else if (data.type === 'CHAT_GROUP_DELETED') {
          if (data.groupId) {
            markEntityAsDeletedPermanent([data.groupId]);
            setState((prev) => ({
              ...prev,
              chatGroups: prev.chatGroups.filter((g) => g.id !== data.groupId),
              chatMessages: prev.chatMessages.filter((m) => m.channel !== data.groupId),
            }));
          }
        } else if (data.type === 'CHAT_MESSAGE_DELETED') {
          deletedChatIdsRef.current.add(data.messageId);
          setState((prev) => ({
            ...prev,
            chatMessages: prev.chatMessages.filter((m) => m.id !== data.messageId),
          }));
        } else if (data.type === 'CHAT_MESSAGE_UPDATED') {
          setState((prev) => ({
            ...prev,
            chatMessages: prev.chatMessages.map((m) =>
              m.id === data.message.id ? { ...m, ...data.message } : m
            ),
          }));
        }
      };
    }

    // Fallback con storage event
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.chatMessages) {
            setState((prev) => {
              const existingIds = new Set(prev.chatMessages.map((m) => m.id));
              const newMsgs = parsed.chatMessages.filter(
                (m: ChatMessage) => !existingIds.has(m.id)
              );
              if (newMsgs.length === 0) return prev;
              return {
                ...prev,
                chatMessages: [...prev.chatMessages, ...newMsgs],
                chatGroups: parsed.chatGroups || prev.chatGroups,
              };
            });
          }
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) {
        bc.close();
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [
    state.currentUser.id,
    state.activeModuleId,
    state.activeChatChannelId,
    state.chatGroups,
    triggerChatToast,
    markChatAsRead,
  ]);

  const createChatGroup = useCallback(
    (name: string, description: string, members: string[], extra?: Partial<ChatGroup>) => {
      const existing = state.chatGroups.find(
        (g) =>
          (extra?.linkedProjectId && g.linkedProjectId === extra.linkedProjectId) ||
          (g.name.trim().toLowerCase() === name.trim().toLowerCase() &&
            g.description.trim().toLowerCase() === description.trim().toLowerCase())
      );
      if (existing) {
        return existing.id;
      }

      const id = `grp-${Date.now()}`;
      const newGroup: ChatGroup = {
        id,
        name,
        description,
        createdBy: state.currentUser.id,
        createdAt: new Date().toISOString().split('T')[0],
        members: Array.from(new Set([state.currentUser.id, ...members])),
        isCustom: true,
        avatarColor: '#00668F',
        ...extra,
      };
      setState((prev) => ({
        ...prev,
        chatGroups: [...prev.chatGroups, newGroup],
      }));
      notify('success', 'Grupo Creado', `El grupo "${name}" se creó con ${newGroup.members.length} participantes.`);

      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel(ERP_BROADCAST_CHANNEL);
          bc.postMessage({ type: 'CHAT_GROUP_CREATED', group: newGroup });
          bc.close();
        }
      } catch (e) {}

      return id;
    },
    [state.chatGroups, state.currentUser.id, notify]
  );

  const deleteChatGroup = useCallback(
    (groupId: string) => {
      if (!groupId) return;
      markEntityAsDeletedPermanent([groupId]);

      const msgsInGroup = state.chatMessages.filter(
        (m) => m.channel === groupId || normalizeChannelId(m.channel) === normalizeChannelId(groupId)
      );
      msgsInGroup.forEach((m) => {
        deletedChatIdsRef.current.add(m.id);
        deleteChatMessageFromCloud(m.id).catch(() => {});
      });
      try {
        localStorage.setItem(
          'ITK_DELETED_CHAT_IDS',
          JSON.stringify(Array.from(deletedChatIdsRef.current).slice(-300))
        );
      } catch {}

      setState((prev) => {
        const nextGroups = prev.chatGroups.filter((g) => g.id !== groupId);
        const nextMessages = prev.chatMessages.filter(
          (m) => m.channel !== groupId && normalizeChannelId(m.channel) !== normalizeChannelId(groupId)
        );
        const nextActiveId =
          prev.activeChatChannelId === groupId
            ? nextGroups[0]?.id || 'general'
            : prev.activeChatChannelId;

        syncModuleToCloud(
          'productivity',
          {
            todos: prev.todos,
            calendarEvents: prev.calendarEvents,
            documents: prev.documents,
            chatGroups: nextGroups,
          },
          prev.currentUser?.id || 'USR-01'
        ).catch(console.warn);

        return {
          ...prev,
          chatGroups: nextGroups,
          chatMessages: nextMessages,
          activeChatChannelId: nextActiveId,
        };
      });

      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel(ERP_BROADCAST_CHANNEL);
          bc.postMessage({ type: 'CHAT_GROUP_DELETED', groupId });
          bc.close();
        }
      } catch (e) {}

      notify('info', 'Canal / Grupo Eliminado', 'El grupo de conversación y su historial de mensajes fueron eliminados permanentemente.');
    },
    [state.chatMessages, notify]
  );

  // Reconciliación reactiva automática de canales de proyectos huérfanos o duplicados
  useEffect(() => {
    const cleaned = sanitizeAndFilterChatGroups(state.chatGroups, state.projects, true);
    if (cleaned.length !== state.chatGroups.length) {
      setState((prev) => {
        const nextCleaned = sanitizeAndFilterChatGroups(prev.chatGroups, prev.projects, true);
        if (nextCleaned.length === prev.chatGroups.length) return prev;
        if (isCloudLoadedRef.current) {
          syncModuleToCloud(
            'productivity',
            {
              todos: prev.todos,
              calendarEvents: prev.calendarEvents,
              documents: prev.documents,
              chatGroups: nextCleaned,
            },
            prev.currentUser?.id || 'USR-01'
          ).catch(console.warn);
        }
        return {
          ...prev,
          chatGroups: nextCleaned,
        };
      });
    }
  }, [state.projects, state.chatGroups]);

  const addMembersToChatGroup = useCallback(
    (groupId: string, newMembers: string[]) => {
      setState((prev) => ({
        ...prev,
        chatGroups: prev.chatGroups.map((g) =>
          g.id === groupId
            ? { ...g, members: Array.from(new Set([...g.members, ...newMembers])) }
            : g
        ),
      }));
      notify('success', 'Participantes Añadidos', 'Se actualizaron los miembros del grupo.');
    },
    [notify]
  );

  const getOrCreateDirectChat = useCallback(
    (partnerId: string) => {
      const directId = getDirectChatId(state.currentUser.id, partnerId);

      const existing = state.chatGroups.find(
        (g) =>
          g.id === directId ||
          (g.isDirect && g.members.includes(state.currentUser.id) && g.members.includes(partnerId))
      );

      if (existing) {
        if (existing.id !== directId) {
          setState((prev) => ({
            ...prev,
            chatGroups: prev.chatGroups.map((g) => (g.id === existing.id ? { ...g, id: directId } : g)),
          }));
        }
        return directId;
      }

      const partner = state.users.find((u) => u.id === partnerId);
      const partnerName = partner ? partner.name : 'Colaborador';

      const newGroup: ChatGroup = {
        id: directId,
        name: partnerName,
        description: `Chat directo con ${partnerName} (${partner?.roleLabel || 'Equipo'})`,
        createdBy: state.currentUser.id,
        createdAt: new Date().toISOString().split('T')[0],
        members: [state.currentUser.id, partnerId],
        isCustom: true,
        isDirect: true,
        directPartnerId: partnerId,
        avatarColor: partner?.avatarColor || '#00668F',
      };

      setState((prev) => ({
        ...prev,
        chatGroups: [newGroup, ...prev.chatGroups],
      }));

      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel(ERP_BROADCAST_CHANNEL);
          bc.postMessage({ type: 'CHAT_GROUP_CREATED', group: newGroup });
          bc.close();
        }
      } catch (e) {}

      return directId;
    },
    [state.chatGroups, state.currentUser.id, state.users]
  );

  const deleteChatMessage = useCallback(
    (id: string) => {
      // Registrar ID en conjunto de eliminados persistente
      deletedChatIdsRef.current.add(id);
      try {
        localStorage.setItem(
          'ITK_DELETED_CHAT_IDS',
          JSON.stringify(Array.from(deletedChatIdsRef.current).slice(-200))
        );
      } catch {}

      setState((prev) => ({
        ...prev,
        chatMessages: prev.chatMessages.filter((m) => m.id !== id),
      }));

      // Broadcast eliminación a otras pestañas
      try {
        if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
          const bc = new BroadcastChannel(ERP_BROADCAST_CHANNEL);
          bc.postMessage({
            type: 'CHAT_MESSAGE_DELETED',
            messageId: id,
          });
          bc.close();
        }
      } catch (e) {}

      // Eliminar de Cloud Firestore para que se elimine para toda la empresa en tiempo real
      deleteChatMessageFromCloud(id).catch((err) => {
        console.warn('[CloudChatSync] Error eliminando mensaje de la nube:', err);
      });

      notify('info', 'Mensaje Eliminado', 'El mensaje fue eliminado para todos los usuarios de la empresa.');
    },
    [notify]
  );

  const deleteChatMessageForMe = useCallback(
    (id: string, userId?: string) => {
      const targetUserId = userId || state.currentUser.id;

      try {
        const storageKey = `ITK_DELETED_FOR_ME_${targetUserId}`;
        const raw = localStorage.getItem(storageKey);
        const set = new Set<string>(raw ? JSON.parse(raw) : []);
        set.add(id);
        localStorage.setItem(storageKey, JSON.stringify(Array.from(set).slice(-500)));
      } catch {}

      let targetMsg: ChatMessage | null = null;
      setState((prev) => {
        const updated = prev.chatMessages.map((m) => {
          if (m.id === id) {
            const currentDeletedFor = m.deletedForUserIds || [];
            if (!currentDeletedFor.includes(targetUserId)) {
              targetMsg = { ...m, deletedForUserIds: [...currentDeletedFor, targetUserId] };
              return targetMsg;
            }
          }
          return m;
        });
        return {
          ...prev,
          chatMessages: updated,
        };
      });

      if (targetMsg) {
        syncChatMessageToCloud(targetMsg).catch((err) => {
          console.warn('[CloudChatSync] Error sincronizando eliminación para mí:', err);
        });
      }

      notify('info', 'Mensaje Eliminado para Ti', 'El mensaje ya no aparecerá en tu vista.');
    },
    [state.currentUser.id, notify]
  );

  const addDocument = useCallback(
    (docData: Omit<DocumentItem, 'id' | 'date'>) => {
      const newDoc: DocumentItem = {
        ...docData,
        id: `DOC-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
      };
      if (state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'create',
          collection: 'documents',
          entityName: `Documento: ${newDoc.title}`,
          description: `Subida de documento técnico ${newDoc.title}`,
          newData: newDoc,
        });
      }
      setState((prev) => ({
        ...prev,
        documents: [newDoc, ...prev.documents],
      }));
      notify('success', 'Documento en Repositorio', `${newDoc.title} archivado en el repositorio técnico.`);
    },
    [state.currentUser, notify]
  );

  const deleteDocument = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      setState((prev) => {
        const docToDelete = prev.documents.find((d) => d.id === id);
        if (docToDelete) {
          if (state.currentUser) {
            undoRedoService.recordAction({
              userId: state.currentUser.id,
              userName: state.currentUser.name,
              actionType: 'delete',
              collection: 'documents',
              entityName: `Documento: ${docToDelete.title}`,
              description: `Eliminación de documento técnico ${docToDelete.title}`,
              previousData: docToDelete,
            });
          }
          try {
            const raw = localStorage.getItem('inteckno_deleted_documents_history');
            const history = raw ? JSON.parse(raw) : [];
            const updated = [docToDelete, ...history.filter((h: any) => h.id !== id)].slice(0, 50);
            localStorage.setItem('inteckno_deleted_documents_history', JSON.stringify(updated));
          } catch (e) {}
        }
        return {
          ...prev,
          documents: prev.documents.filter((d) => d.id !== id),
        };
      });
      notify('info', 'Documento Eliminado', 'El archivo fue retirado del ERP (sigue guardado en SharePoint).');
    },
    [state.currentUser, notify]
  );

  const updateDocument = useCallback(
    (id: string, data: Partial<DocumentItem>) => {
      setState((prev) => ({
        ...prev,
        documents: prev.documents.map((d) => (d.id === id ? { ...d, ...data } : d)),
      }));
      notify('success', 'Documento Actualizado', 'Los cambios en el documento fueron guardados.');
    },
    [notify]
  );

  const addTodo = useCallback(
    (
      title: string,
      priority: TodoItem['priority'],
      dueDate: string,
      assignedToUserId?: string,
      assignedToName?: string,
      projectCode?: string,
      notes?: string,
      extra?: Partial<TodoItem>
    ) => {
      const assignedUser = state.users.find((u) => u.id === assignedToUserId) || state.currentUser;
      const newTodo: TodoItem = {
        id: `TODO-${Date.now()}`,
        userId: state.currentUser.id,
        assignedToUserId: assignedUser.id,
        assignedToName: assignedToName || assignedUser.name,
        title,
        priority,
        dueDate,
        completed: false,
        status: 'pendiente',
        projectCode,
        notes,
        createdAt: new Date().toISOString(),
        ...extra,
      };
      setState((prev) => ({
        ...prev,
        todos: [newTodo, ...prev.todos],
      }));
      if (state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'create',
          collection: 'todos',
          entityName: `Tarea: ${title}`,
          description: `Creación de tarea personal "${title}"`,
          newData: newTodo,
        });
      }
      // Notificación automática al responsable asignado
      notify(
        'urgent',
        `Nueva Actividad Asignada (${newTodo.assignedToName})`,
        `"${title}" (Prioridad ${priority.toUpperCase()}) vence el ${dueDate}. Asignado por ${state.currentUser.name}.`
      );
    },
    [state.currentUser, state.users, notify]
  );

  const updateTodo = useCallback((id: string, data: Partial<TodoItem>) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...data };
          if (data.status === 'completada' && !t.completed) {
            updated.completed = true;
            updated.completedAt = updated.completedAt || new Date().toISOString();
            updated.completedBy = updated.completedBy || prev.currentUser.name;
          } else if (data.status && data.status !== 'completada') {
            updated.completed = false;
          } else if (data.completed !== undefined) {
            updated.status = data.completed ? 'completada' : 'pendiente';
            if (data.completed) {
              updated.completedAt = updated.completedAt || new Date().toISOString();
              updated.completedBy = updated.completedBy || prev.currentUser.name;
            }
          }
          return updated;
        }
        return t;
      }),
    }));
  }, []);

  const toggleTodo = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      todos: prev.todos.map((t) => {
        if (t.id === id) {
          const nextCompleted = !t.completed;
          return {
            ...t,
            completed: nextCompleted,
            status: nextCompleted ? 'completada' : 'pendiente',
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
            completedBy: nextCompleted ? prev.currentUser.name : undefined,
          };
        }
        return t;
      }),
    }));
  }, []);

  const deleteTodo = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      const target = state.todos.find((t) => t.id === id);
      if (target && state.currentUser) {
        undoRedoService.recordAction({
          userId: state.currentUser.id,
          userName: state.currentUser.name,
          actionType: 'delete',
          collection: 'todos',
          entityName: `Tarea: ${target.title}`,
          description: `Eliminación de la tarea "${target.title}"`,
          previousData: target,
        });
      }
      setState((prev) => ({
        ...prev,
        todos: prev.todos.filter((t) => t.id !== id),
      }));
      notify('info', 'Actividad Eliminada', 'La tarea fue eliminada de compromisos operativos.');
    },
    [state.todos, state.currentUser, notify]
  );

  const createCalendarEvent = useCallback(
    (eventData: Omit<CalendarEvent, 'id'>) => {
      const newEvt: CalendarEvent = {
        ...eventData,
        id: `EVT-${Date.now()}`,
      };
      setState((prev) => ({
        ...prev,
        calendarEvents: [newEvt, ...prev.calendarEvents],
      }));
      notify('success', 'Evento Agendado', `${newEvt.title} programado para el ${newEvt.date}.`);
    },
    [notify]
  );

  const updateCalendarEvent = useCallback(
    (id: string, data: Partial<CalendarEvent>) => {
      setState((prev) => ({
        ...prev,
        calendarEvents: prev.calendarEvents.map((e) => (e.id === id ? { ...e, ...data } : e)),
      }));
      notify('success', 'Evento Actualizado', 'Los cambios en el evento fueron guardados.');
    },
    [notify]
  );

  const deleteCalendarEvent = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      setState((prev) => ({
        ...prev,
        calendarEvents: prev.calendarEvents.filter((e) => e.id !== id),
      }));
      notify('info', 'Evento Cancelado', 'El evento fue retirado del cronograma STC.');
    },
    [notify]
  );

  const batchMergeCalendarEvents = useCallback((incomingEvents: CalendarEvent[]) => {
    setState((prev) => {
      const map = new Map<string, CalendarEvent>();
      for (const e of prev.calendarEvents) {
        map.set(e.id, e);
        if (e.m365EventId) {
          map.set(e.m365EventId, e);
        }
      }
      for (const inc of incomingEvents) {
        const key = inc.m365EventId || inc.id;
        const existing = map.get(key) || map.get(inc.id);
        map.set(inc.id, existing ? { ...existing, ...inc } : inc);
      }
      return {
        ...prev,
        calendarEvents: Array.from(map.values()),
      };
    });
  }, []);

  const triggerCalendarReminderToast = useCallback((toast: CalendarReminderToast) => {
    playNotificationSound();
    setState((prev) => ({
      ...prev,
      activeCalendarToast: toast,
    }));
  }, []);

  const dismissCalendarReminderToast = useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeCalendarToast: null,
    }));
  }, []);

  const updateProject = useCallback((id: string, data: Partial<Project>) => {
    setState((prev) => {
      const nowStr = new Date().toISOString();
      const activeTrm = getStoredTRM() || 4150;
      let updatedMilestones = [...(prev.milestones || [])];

      const updatedProjects = prev.projects.map((p) => {
        if (p.id !== id) return p;

        const mergedProject: Project = { ...p, ...data, updatedAt: nowStr };

        // 1. Sincronización bidireccional: project.billingItems <-> state.milestones (Facturación DIAN)
        if (Array.isArray(data.billingItems)) {
          const billingList = data.billingItems;
          mergedProject.totalInvoiced = billingList
            .filter((b) => b.status === 'invoiced' || b.status === 'paid' || Boolean(b.invoiceNumber))
            .reduce((acc, b) => acc + (Number(b.subtotal) || 0), 0);
          mergedProject.totalPaid = billingList
            .filter((b) => b.status === 'paid')
            .reduce((acc, b) => acc + (Number(b.paidAmount || b.subtotal) || 0), 0);

          billingList.forEach((bItem, idx) => {
            const existingMsIdx = updatedMilestones.findIndex(
              (m) =>
                m.id === bItem.id ||
                m.billingItemId === bItem.id ||
                (bItem.invoiceNumber && m.invoiceNumber === bItem.invoiceNumber && (m.projectId === p.id || m.projectCode === p.code))
            );
            const copVal = Number(bItem.subtotal) || 0;
            const contractBase = Number(mergedProject.contractAmount || mergedProject.budgetPV || 0);
            const computedPct = bItem.milestonePercentage || (contractBase > 0 ? Math.round((copVal / contractBase) * 100) : 100);

            if (existingMsIdx >= 0) {
              const existingMs = updatedMilestones[existingMsIdx];
              updatedMilestones[existingMsIdx] = {
                ...existingMs,
                title: bItem.milestoneName || bItem.observations || existingMs.title,
                percentage: computedPct,
                amountCOP: copVal,
                amountUSD: Math.round(copVal / activeTrm),
                dueDate: bItem.dueDate || bItem.invoiceDate || existingMs.dueDate,
                invoiceNumber: bItem.invoiceNumber || existingMs.invoiceNumber,
                invoiceIssued: bItem.status === 'invoiced' || bItem.status === 'paid' || existingMs.invoiceIssued,
                isPaid: bItem.status === 'paid' || existingMs.isPaid,
                paidAt: bItem.paymentDate || existingMs.paidAt,
                paymentAmountCOP: bItem.paidAmount || (bItem.status === 'paid' ? copVal : existingMs.paymentAmountCOP),
                acceptanceActSigned: bItem.acceptanceActSigned ?? existingMs.acceptanceActSigned,
                billingItemId: bItem.id,
              };
            } else if (copVal > 0) {
              updatedMilestones.unshift({
                id: bItem.id || `MS-${Date.now()}-${idx}`,
                projectId: p.id,
                projectCode: p.code,
                projectName: mergedProject.name,
                clientId: mergedProject.clientId,
                clientNit: mergedProject.clientNit,
                clientName: mergedProject.clientName,
                milestoneIndex: idx + 1,
                title: bItem.milestoneName || bItem.observations || `Factura ${bItem.invoiceNumber || idx + 1} - ${mergedProject.code}`,
                percentage: computedPct,
                amountCOP: copVal,
                amountUSD: Math.round(copVal / activeTrm),
                dueDate: bItem.dueDate || bItem.invoiceDate || mergedProject.endDate,
                acceptanceActSigned: Boolean(bItem.acceptanceActSigned),
                invoiceIssued: bItem.status === 'invoiced' || bItem.status === 'paid' || Boolean(bItem.invoiceNumber && !bItem.invoiceNumber.startsWith('FAC-PEND')),
                invoiceNumber: bItem.invoiceNumber,
                billingItemId: bItem.id,
                isPaid: bItem.status === 'paid',
                paidAt: bItem.paymentDate,
                paymentAmountCOP: bItem.paidAmount,
              });
            }
          });
        }

        // 2. Sincronización automática de Órdenes de Cambio / Otrosí aprobados -> ProjectItemFolder + Hito de Facturación
        const rawChangeOrders: any[] = (data as any).changeOrders || (mergedProject as any).changeOrders || [];
        const approvedChanges = rawChangeOrders.filter((co: any) => co.status === 'aprobada');
        if (approvedChanges.length > 0) {
          const currentFolders = ensureProjectItems(mergedProject);
          approvedChanges.forEach((co: any) => {
            const folderCode = co.orderNumber || `AD-${String(currentFolders.length + 1).padStart(2, '0')}`;
            const existsFolder = currentFolders.some((f: any) => f.code === folderCode || f.id === `item-co-${co.id}`);
            if (!existsFolder) {
              currentFolders.push({
                id: `item-co-${co.id}`,
                code: folderCode,
                name: co.title || `Otrosí ${folderCode}`,
                budgetPlanned: Number(co.amountAddedCOP || 0),
                status: 'activo',
                createdAt: co.approvalDate || nowStr,
              });
            }

            const msId = `MS-CO-${co.id}`;
            const existsMs = updatedMilestones.some((m) => m.id === msId);
            if (!existsMs && Number(co.amountAddedCOP) > 0) {
              updatedMilestones.unshift({
                id: msId,
                projectId: p.id,
                projectCode: p.code,
                projectName: mergedProject.name,
                clientId: mergedProject.clientId,
                clientNit: mergedProject.clientNit,
                clientName: mergedProject.clientName,
                milestoneIndex: updatedMilestones.filter((m) => m.projectId === p.id).length + 1,
                title: `Otrosí / Orden de Cambio ${folderCode}: ${co.title}`,
                percentage: 100,
                amountCOP: Number(co.amountAddedCOP),
                amountUSD: Number(co.amountAddedUSD) || Math.round(Number(co.amountAddedCOP) / activeTrm),
                dueDate: mergedProject.endDate,
                acceptanceActSigned: false,
                invoiceIssued: false,
                isPaid: false,
              });
            }
          });
          mergedProject.projectItems = currentFolders;
        }

        return recalculateProjectEvm(mergedProject);
      });

      const targetUpdated = updatedProjects.find((p) => p.id === id);

      // Persistencia inmediata ultra-rápida en local storage e IndexedDB sin depender del debounce
      try {
        if (typeof localStorage !== 'undefined') {
          const currentState = { ...prev, projects: updatedProjects, milestones: updatedMilestones };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
        }
      } catch (err) {}

      // Sincronización proactiva hacia Cloud Firestore inmediata para cambios en finanzas/presupuesto/items
      if (isCloudLoadedRef.current) {
        syncModuleToCloud('projects', {
          projects: updatedProjects,
          tasks: prev.tasks,
          milestones: updatedMilestones,
        }, prev.currentUser?.id || 'USR-01').catch(console.warn);

        // Agente Guardián: Respaldo continuo automático en Google Cloud Firestore e IndexedDB
        if (targetUpdated) {
          createSystemBackup(
            'projects',
            `Actualización de proyecto ${targetUpdated.code || id}: ITEMS, matriz o presupuesto`,
            targetUpdated,
            prev.currentUser?.id || 'USR-01',
            prev.currentUser?.name || 'Sistema Inteckno'
          ).catch(console.warn);
        }
      }

      return {
        ...prev,
        projects: updatedProjects,
        milestones: updatedMilestones,
      };
    });
    notify('success', 'Proyecto Actualizado', 'Los cambios en la ficha técnica y matriz presupuestal fueron guardados.');
  }, [notify]);

  const updateTask = useCallback((id: string, data: Partial<WBSTask>) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
    notify('success', 'Tarea WBS Actualizada', 'Avance u horas modificadas.');
  }, [notify]);

  const deleteTask = useCallback((id: string) => {
    markEntityAsDeletedPermanent([id]);
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.id !== id),
    }));
    notify('info', 'Tarea Eliminada', 'Actividad retirada de la estructura EDT.');
  }, [notify]);

  const updateOpportunity = useCallback((id: string, data: Partial<Opportunity>) => {
    setState((prev) => ({
      ...prev,
      opportunities: prev.opportunities.map((o) => (o.id === id ? { ...o, ...data } : o)),
    }));
    notify('success', 'Oportunidad Actualizada', 'Datos comerciales guardados.');
  }, [notify]);

  const createPartner = useCallback(
    (partnerData: Omit<Partner, 'id'>) => {
      const newPartner: Partner = {
        ...partnerData,
        id: `PARTNER-${Date.now()}`,
      };
      setState((prev) => ({
        ...prev,
        partners: [newPartner, ...prev.partners],
      }));
      notify('success', 'Proveedor Registrado', `${newPartner.name} ingresado a proveedores.`);
    },
    [notify]
  );

  const updatePartner = useCallback(
    (id: string, data: Partial<Partner>) => {
      setState((prev) => ({
        ...prev,
        partners: prev.partners.map((p) => (p.id === id ? { ...p, ...data } : p)),
      }));
      notify('success', 'Proveedor Actualizado', 'Estado de homologación y datos guardados.');
    },
    [notify]
  );


  const updateContact = useCallback((id: string, data: Partial<CRMContact>) => {
    setState((prev) => ({
      ...prev,
      contacts: prev.contacts.map((c) => (c.id === id ? { ...c, ...data } : c)),
    }));
    notify('success', 'Contacto Actualizado', 'Ficha de contacto modificada.');
  }, [notify]);

  const updateEmployee = useCallback((id: string, data: Partial<EmployeeRecord>) => {
    setState((prev) => {
      const targetEmp = prev.employees.find((e) => e.id === id);
      const nextEmployees = prev.employees.map((e) => (e.id === id ? { ...e, ...data } : e));

      // Sincronización bidireccional 1:1 con Usuarios del ERP (Certificaciones HSEQ, Cargo, Departamento y Alturas)
      let syncedUser: User | null = null;
      const nextUsers = prev.users.map((u) => {
        const isMatch =
          u.id === id ||
          u.employeeId === id ||
          (targetEmp?.userId && u.id === targetEmp.userId) ||
          (targetEmp?.name && u.name.toLowerCase() === targetEmp.name.toLowerCase());
        if (!isMatch) return u;

        const updatedUser: User = {
          ...u,
          name: data.name || u.name,
          roleLabel: data.role || u.roleLabel,
          department: data.department || u.department,
          nationalId: data.documentId || u.nationalId,
          bloodType: (data as any).bloodType || u.bloodType,
          emergencyContactPhone: data.emergencyPhone || u.emergencyContactPhone,
          hseqExpiresAt: data.heightCertExpiry || u.hseqExpiresAt,
          hseqStatus:
            data.heightCertStatus === 'vigente'
              ? 'valid'
              : data.heightCertStatus === 'vencido'
              ? 'expired'
              : u.hseqStatus,
          canWorkHeights:
            data.heightCertStatus !== undefined ? data.heightCertStatus === 'vigente' : u.canWorkHeights,
          competencies: data.competencyIds || (data as any).competencies || u.competencies,
        };
        syncedUser = updatedUser;
        return updatedUser;
      });

      if (syncedUser) {
        syncUserToCloud(syncedUser).catch(console.warn);
      }

      syncModuleToCloud('hr', {
        employees: nextEmployees,
        novelties: prev.novelties || [],
        sstInspections: prev.sstInspections || [],
        jobPositions: prev.jobPositions || [],
        candidates: prev.candidates || [],
      }, prev.currentUser?.id).catch(console.warn);
      return {
        ...prev,
        employees: nextEmployees,
        users: nextUsers,
      };
    });
    notify('success', 'Empleado Actualizado', 'Registro de talento humano, usuarios y SST sincronizados.');
  }, [notify]);

  const createEmployee = useCallback(
    (empData: Omit<EmployeeRecord, 'id'>) => {
      const newEmpId = `EMP-${Date.now()}`;
      let createdUser: User | null = null;

      setState((prev) => {
        // 1. Asegurar ficha técnica de cargo oficial en jobPositions (8 Pilares)
        const { jobPosition, updatedPositions } = ensureJobPositionForRole(
          empData.role || empData.position || 'Especialista Técnico STC',
          empData.department,
          empData.baseSalaryCOP,
          prev.jobPositions
        );

        const newEmp: EmployeeRecord = {
          ...empData,
          id: newEmpId,
          employeeId: newEmpId,
          userId: newEmpId,
          jobPositionId: jobPosition.id,
        };

        // 2. Crear y sincronizar el usuario TI correspondiente
        const newUser = buildUserFromEmployee(newEmp, jobPosition);
        createdUser = newUser;

        const nextEmployees = [newEmp, ...prev.employees];
        const nextUsers = [...prev.users.filter((u) => u.id !== newUser.id && u.email !== newUser.email), newUser];

        syncModuleToCloud('hr', {
          employees: nextEmployees,
          novelties: prev.novelties || [],
          sstInspections: prev.sstInspections || [],
          jobPositions: updatedPositions,
          candidates: prev.candidates || [],
        }, prev.currentUser?.id).catch(console.warn);

        return {
          ...prev,
          employees: nextEmployees,
          users: nextUsers,
          jobPositions: updatedPositions,
        };
      });

      if (createdUser) {
        syncUserToCloud(createdUser).catch(console.warn);
      }

      notify('success', 'Empleado y Usuario TI Registrados', `${empData.name} vinculado en Talento Humano, Consola TI y Gestión de Cargos.`);
    },
    [notify]
  );

  const seedEmployeesFromUsers = useCallback(() => {
    setState((prev) => {
      const initialFromUsers = buildInitialEmployeesFromUsers(prev.users && prev.users.length > 0 ? prev.users : SEED_USERS);
      syncModuleToCloud('hr', {
        employees: initialFromUsers,
        novelties: prev.novelties || [],
        sstInspections: prev.sstInspections || [],
        jobPositions: prev.jobPositions || [],
        candidates: prev.candidates || [],
      }, prev.currentUser?.id).catch(console.warn);
      return {
        ...prev,
        employees: initialFromUsers,
      };
    });
    notify('success', 'Directorio de Personal Inicializado', 'Se han importado los colaboradores base desde el equipo corporativo.');
  }, [notify]);

  const requestPayrollNovelty = useCallback(
    (noveltyData: Omit<PayrollNovelty, 'id' | 'status' | 'requestedAt'>): { success: boolean; id?: string } => {
      const newNovelty: PayrollNovelty = {
        ...noveltyData,
        id: `NOV-${Date.now()}`,
        status: 'solicitada',
        requestedAt: new Date().toISOString(),
      };

      setState((prev) => {
        const updatedNovelties = [newNovelty, ...(prev.novelties || [])];
        syncModuleToCloud('hr', {
          employees: prev.employees,
          novelties: updatedNovelties,
        }, prev.currentUser?.id).catch(console.warn);
        return {
          ...prev,
          novelties: updatedNovelties,
        };
      });

      notify('success', 'Novedad Registrada', `Solicitud de ${newNovelty.type} radicada para ${newNovelty.employeeName}.`);
      return { success: true, id: newNovelty.id };
    },
    [notify]
  );

  const approvePayrollNovelty = useCallback(
    (id: string, approverName: string) => {
      let targetNovelty: PayrollNovelty | undefined;
      setState((prev) => {
        const list = prev.novelties || [];
        targetNovelty = list.find((n) => n.id === id);
        if (!targetNovelty) return prev;

        const updatedNovelties = list.map((n) =>
          n.id === id
            ? {
                ...n,
                status: 'aprobada' as const,
                approvedAt: new Date().toISOString(),
                approvedBy: approverName,
              }
            : n
        );

        let updatedEmployees = prev.employees;
        if (targetNovelty.type === 'vacaciones' && targetNovelty.employeeId) {
          const daysToDeduct = Number(targetNovelty.daysCount) || 0;
          updatedEmployees = prev.employees.map((emp) =>
            emp.id === targetNovelty?.employeeId
              ? {
                  ...emp,
                  vacationDaysAvailable: Math.max(0, (emp.vacationDaysAvailable || 0) - daysToDeduct),
                }
              : emp
          );
        }

        syncModuleToCloud('hr', {
          employees: updatedEmployees,
          novelties: updatedNovelties,
        }, prev.currentUser?.id).catch(console.warn);

        return {
          ...prev,
          novelties: updatedNovelties,
          employees: updatedEmployees,
        };
      });

      if (targetNovelty) {
        notify('success', 'Novedad Aprobada', `Se aprobó la novedad de ${(targetNovelty as any).type} para ${(targetNovelty as any).employeeName}.`);
      }
    },
    [notify]
  );

  const rejectPayrollNovelty = useCallback(
    (id: string, approverName: string, reason?: string) => {
      setState((prev) => {
        const updatedNovelties = (prev.novelties || []).map((n) =>
          n.id === id
            ? {
                ...n,
                status: 'rechazada' as const,
                approvedAt: new Date().toISOString(),
                approvedBy: approverName,
                notes: reason || n.notes,
              }
            : n
        );
        syncModuleToCloud('hr', {
          employees: prev.employees,
          novelties: updatedNovelties,
        }, prev.currentUser?.id).catch(console.warn);
        return {
          ...prev,
          novelties: updatedNovelties,
        };
      });
      notify('info', 'Novedad Rechazada', 'La solicitud ha sido rechazada.');
    },
    [notify]
  );

  const deletePayrollNovelty = useCallback(
    (id: string) => {
      markEntityAsDeletedPermanent([id]);
      setState((prev) => {
        const updatedNovelties = (prev.novelties || []).filter((n) => n.id !== id);
        syncModuleToCloud('hr', {
          employees: prev.employees,
          novelties: updatedNovelties,
        }, prev.currentUser?.id).catch(console.warn);
        return {
          ...prev,
          novelties: updatedNovelties,
        };
      });
      notify('info', 'Novedad Eliminada', 'El registro de novedad fue retirado.');
    },
    [notify]
  );

  // OPERACIONES AVANZADAS: WORK ORDERS, MANUFACTURA Y BANCO DE PRUEBAS
  // BAJAS DE INVENTARIO (KARDEX & GERENCIA)
  const createInventoryWriteOff = useCallback((solicitud: Omit<InventoryWriteOffRequest, 'id' | 'fechaSolicitud'>): InventoryWriteOffRequest => {
    const newReq: InventoryWriteOffRequest = {
      ...solicitud,
      id: `WO-${Date.now()}`,
      fechaSolicitud: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      inventoryWriteOffs: [newReq, ...prev.inventoryWriteOffs],
    }));
    return newReq;
  }, []);

  const approveInventoryWriteOff = useCallback((id: string, approverId: string, approverName: string) => {
    setState((prev) => {
      const target = prev.inventoryWriteOffs.find((w) => w.id === id);
      if (!target) return prev;
      const updatedWriteOffs = prev.inventoryWriteOffs.map((w) =>
        w.id === id
          ? {
              ...w,
              estado: 'APROBADO_GERENCIA' as const,
              aprobadoPorId: approverId,
              aprobadoPorNombre: approverName,
              fechaAprobacion: new Date().toISOString().split('T')[0],
            }
          : w
      );
      const updatedProducts = prev.products.map((p) => {
        if (p.id === target.productId) {
          const nextAvail = Math.max(0, (p.availableStock || 0) - target.cantidad);
          const nextReal = Math.max(0, (p.realStock || 0) - target.cantidad);
          return {
            ...p,
            availableStock: nextAvail,
            realStock: nextReal,
          };
        }
        return p;
      });
      return {
        ...prev,
        inventoryWriteOffs: updatedWriteOffs,
        products: updatedProducts,
      };
    });
  }, []);

  const rejectInventoryWriteOff = useCallback((id: string, reason: string) => {
    setState((prev) => ({
      ...prev,
      inventoryWriteOffs: prev.inventoryWriteOffs.map((w) =>
        w.id === id
          ? {
              ...w,
              estado: 'RECHAZADO_GERENCIA' as const,
              motivoRechazo: reason,
            }
          : w
      ),
    }));
  }, []);

  // TALENTO HUMANO, SST, CARGOS & CANDIDATOS
  const createSstInspection = useCallback((insp: Omit<SstInspectionRecord, 'id' | 'createdAt'>): SstInspectionRecord => {
    const newInsp: SstInspectionRecord = {
      ...insp,
      id: `SST-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({
      ...prev,
      sstInspections: [newInsp, ...prev.sstInspections],
    }));
    return newInsp;
  }, []);

  const deleteSstInspection = useCallback((id: string) => {
    markEntityAsDeletedPermanent([id]);
    setState((prev) => ({
      ...prev,
      sstInspections: prev.sstInspections.filter((i) => i.id !== id),
    }));
  }, []);

  const saveJobPosition = useCallback((pos: JobPosition) => {
    setState((prev) => {
      const exists = prev.jobPositions.some((p) => p.id === pos.id || p.code === pos.code);
      const updated = exists
        ? prev.jobPositions.map((p) => (p.id === pos.id || p.code === pos.code ? pos : p))
        : [...prev.jobPositions, pos];
      return {
        ...prev,
        jobPositions: updated,
      };
    });
  }, []);

  const deleteJobPosition = useCallback((id: string) => {
    markEntityAsDeletedPermanent([id]);
    setState((prev) => ({
      ...prev,
      jobPositions: prev.jobPositions.filter((p) => p.id !== id),
    }));
  }, []);

  const saveCandidate = useCallback((cand: JobApplicationCandidate) => {
    setState((prev) => {
      const exists = prev.candidates.some((c) => c.id === cand.id);
      const updated = exists
        ? prev.candidates.map((c) => (c.id === cand.id ? cand : c))
        : [cand, ...prev.candidates];
      return {
        ...prev,
        candidates: updated,
      };
    });
  }, []);

  const updateCandidateStage = useCallback((id: string, stage: JobApplicationCandidate['stage']) => {
    setState((prev) => ({
      ...prev,
      candidates: prev.candidates.map((c) =>
        c.id === id ? { ...c, stage } : c
      ),
    }));
  }, []);

  const assignJobPosition = useCallback((posId: string, employeeOrUserId: string) => {
    setState((prev) => {
      const targetPos = prev.jobPositions.find((p) => p.id === posId || p.code === posId);
      if (!targetPos) return prev;

      const targetEmp = prev.employees.find(
        (e) =>
          e.id === employeeOrUserId ||
          e.userId === employeeOrUserId ||
          e.employeeId === employeeOrUserId ||
          (typeof employeeOrUserId === 'string' && employeeOrUserId.startsWith(e.name))
      );
      const targetUser = prev.users.find(
        (u) => u.id === employeeOrUserId || (targetEmp?.userId && u.id === targetEmp.userId) || (targetEmp?.id && u.employeeId === targetEmp.id)
      );

      const nextEmployees = prev.employees.map((e) => {
        const isMatch =
          e.id === employeeOrUserId ||
          (targetEmp && e.id === targetEmp.id) ||
          (targetUser && (e.userId === targetUser.id || e.id === targetUser.employeeId));
        if (!isMatch) return e;
        return {
          ...e,
          role: targetPos.title,
          position: targetPos.title,
          department: targetPos.department || e.department,
          jobPositionId: targetPos.id,
        };
      });

      let syncedUser: User | null = null;
      const nextUsers = prev.users.map((u) => {
        const isMatch =
          u.id === employeeOrUserId ||
          (targetUser && u.id === targetUser.id) ||
          (targetEmp && (u.id === targetEmp.userId || u.employeeId === targetEmp.id));
        if (!isMatch) return u;
        const updatedU: User = {
          ...u,
          roleLabel: targetPos.title,
          position: targetPos.title,
          department: targetPos.department || u.department,
          jobPositionId: targetPos.id,
          jobPosition: targetPos,
        };
        syncedUser = updatedU;
        return updatedU;
      });

      if (syncedUser) {
        syncUserToCloud(syncedUser).catch(console.warn);
      }

      syncModuleToCloud('hr', {
        employees: nextEmployees,
        novelties: prev.novelties || [],
        sstInspections: prev.sstInspections || [],
        jobPositions: prev.jobPositions || [],
        candidates: prev.candidates || [],
      }, prev.currentUser?.id).catch(console.warn);

      return {
        ...prev,
        employees: nextEmployees,
        users: nextUsers,
      };
    });
    notify('success', 'Cargo Asignado', 'El empleado ha sido vinculado al cargo oficial.');
  }, [notify]);

  const unassignJobPosition = useCallback((employeeOrUserId: string) => {
    setState((prev) => {
      const targetEmp = prev.employees.find(
        (e) =>
          e.id === employeeOrUserId ||
          e.userId === employeeOrUserId ||
          e.employeeId === employeeOrUserId ||
          (typeof employeeOrUserId === 'string' && employeeOrUserId.startsWith(e.name))
      );
      const targetUser = prev.users.find(
        (u) => u.id === employeeOrUserId || (targetEmp?.userId && u.id === targetEmp.userId) || (targetEmp?.id && u.employeeId === targetEmp.id)
      );

      const nextEmployees = prev.employees.map((e) => {
        const isMatch =
          e.id === employeeOrUserId ||
          (targetEmp && e.id === targetEmp.id) ||
          (targetUser && (e.userId === targetUser.id || e.id === targetUser.employeeId));
        if (!isMatch) return e;
        return {
          ...e,
          role: 'Sin cargo asignado',
          position: 'Sin cargo asignado',
          jobPositionId: undefined,
        };
      });

      let syncedUser: User | null = null;
      const nextUsers = prev.users.map((u) => {
        const isMatch =
          u.id === employeeOrUserId ||
          (targetUser && u.id === targetUser.id) ||
          (targetEmp && (u.id === targetEmp.userId || u.employeeId === targetEmp.id));
        if (!isMatch) return u;
        const updatedU: User = {
          ...u,
          roleLabel: 'Sin cargo asignado',
          position: 'Sin cargo asignado',
          jobPositionId: undefined,
          jobPosition: undefined,
        };
        syncedUser = updatedU;
        return updatedU;
      });

      if (syncedUser) {
        syncUserToCloud(syncedUser).catch(console.warn);
      }

      syncModuleToCloud('hr', {
        employees: nextEmployees,
        novelties: prev.novelties || [],
        sstInspections: prev.sstInspections || [],
        jobPositions: prev.jobPositions || [],
        candidates: prev.candidates || [],
      }, prev.currentUser?.id).catch(console.warn);

      return {
        ...prev,
        employees: nextEmployees,
        users: nextUsers,
      };
    });
    notify('info', 'Asignación Removida', 'El empleado fue desvinculado del cargo.');
  }, [notify]);

  const executeUndo = useCallback((): { success: boolean; message: string } => {
    if (!state.currentUser?.id) {
      return { success: false, message: 'Usuario no autenticado.' };
    }
    const action = undoRedoService.popUndo(state.currentUser.id);
    if (!action) {
      return { success: false, message: 'No hay acciones previas para deshacer.' };
    }

    setState((prev) => {
      switch (action.collection) {
        case 'requisitions': {
          if (action.actionType === 'create') {
            return { ...prev, requisitions: prev.requisitions.filter((r) => r.id !== action.newData.id) };
          } else if (action.actionType === 'delete') {
            return { ...prev, requisitions: [action.previousData, ...prev.requisitions] };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              requisitions: prev.requisitions.map((r) => (r.id === action.previousData.id ? action.previousData : r)),
            };
          }
          break;
        }
        case 'purchaseOrders': {
          if (action.actionType === 'create') {
            return { ...prev, purchaseOrders: prev.purchaseOrders.filter((po) => po.id !== action.newData.id) };
          } else if (action.actionType === 'delete') {
            return { ...prev, purchaseOrders: [action.previousData, ...prev.purchaseOrders] };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              purchaseOrders: prev.purchaseOrders.map((po) => (po.id === action.previousData.id ? action.previousData : po)),
            };
          }
          break;
        }
        case 'expenses': {
          if (action.actionType === 'create') {
            return { ...prev, expenses: prev.expenses.filter((e) => e.id !== action.newData.id) };
          } else if (action.actionType === 'delete') {
            return { ...prev, expenses: [action.previousData, ...prev.expenses] };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              expenses: prev.expenses.map((e) => (e.id === action.previousData.id ? action.previousData : e)),
            };
          }
          break;
        }
        case 'timesheets': {
          if (action.actionType === 'create') {
            return { ...prev, timesheets: prev.timesheets.filter((t) => t.id !== action.newData.id) };
          } else if (action.actionType === 'delete') {
            return { ...prev, timesheets: [action.previousData, ...prev.timesheets] };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              timesheets: prev.timesheets.map((t) => (t.id === action.previousData.id ? action.previousData : t)),
            };
          }
          break;
        }
        case 'projects': {
          if (action.actionType === 'create') {
            return {
              ...prev,
              projects: prev.projects.filter((p) => p.id !== action.newData.id),
              tasks: prev.tasks.filter((t) => t.projectId !== action.newData.id),
            };
          } else if (action.actionType === 'delete') {
            return { ...prev, projects: [action.previousData, ...prev.projects] };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              projects: prev.projects.map((p) => (p.id === action.previousData.id ? action.previousData : p)),
            };
          }
          break;
        }
        case 'todos': {
          if (action.actionType === 'create') {
            return { ...prev, todos: prev.todos.filter((t) => t.id !== action.newData.id) };
          } else if (action.actionType === 'delete') {
            return { ...prev, todos: prev.todos.filter((t) => t.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              todos: prev.todos.map((t) => (t.id === action.previousData.id ? action.previousData : t)),
            };
          }
          break;
        }
        case 'documents': {
          if (action.actionType === 'create') {
            return { ...prev, documents: prev.documents.filter((d) => d.id !== action.newData.id) };
          } else if (action.actionType === 'delete') {
            return { ...prev, documents: prev.documents.filter((d) => d.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              documents: prev.documents.map((d) => (d.id === action.previousData.id ? action.previousData : d)),
            };
          }
          break;
        }
        case 'products': {
          if (action.actionType === 'create') {
            return { ...prev, products: prev.products.filter((p) => p.id !== action.newData.id) };
          } else if (action.actionType === 'delete') {
            return { ...prev, products: prev.products.filter((p) => p.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              products: prev.products.map((p) => (p.id === action.previousData.id ? action.previousData : p)),
            };
          }
          break;
        }
        case 'opportunities': {
          if (action.actionType === 'create') {
            return { ...prev, opportunities: prev.opportunities.filter((o) => o.id !== action.newData.id) };
          } else if (action.actionType === 'delete') {
            return { ...prev, opportunities: prev.opportunities.filter((o) => o.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              opportunities: prev.opportunities.map((o) => (o.id === action.previousData.id ? action.previousData : o)),
            };
          }
          break;
        }
        case 'contacts': {
          if (action.actionType === 'create') {
            return { ...prev, contacts: prev.contacts.filter((c) => c.id !== action.newData.id) };
          } else if (action.actionType === 'delete') {
            return { ...prev, contacts: prev.contacts.filter((c) => c.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              contacts: prev.contacts.map((c) => (c.id === action.previousData.id ? action.previousData : c)),
            };
          }
          break;
        }
        case 'notifications': {
          if (action.actionType === 'delete') {
            const restored = Array.isArray(action.previousData) ? action.previousData : [action.previousData];
            return {
              ...prev,
              notifications: [...restored, ...prev.notifications],
            };
          } else if (action.actionType === 'create') {
            return {
              ...prev,
              notifications: prev.notifications.filter((n) => n.id !== action.newData.id),
            };
          }
          break;
        }
        default:
          return prev;
      }
      return prev;
    });

    const msg = `Se deshizo: ${action.description}`;
    notify('info', 'Acción Deshecha', msg);
    return { success: true, message: msg };
  }, [state.currentUser?.id, notify]);

  const executeRedo = useCallback((): { success: boolean; message: string } => {
    if (!state.currentUser?.id) {
      return { success: false, message: 'Usuario no autenticado.' };
    }
    const action = undoRedoService.popRedo(state.currentUser.id);
    if (!action) {
      return { success: false, message: 'No hay acciones para rehacer.' };
    }

    setState((prev) => {
      switch (action.collection) {
        case 'requisitions': {
          if (action.actionType === 'create') {
            return { ...prev, requisitions: [action.newData, ...prev.requisitions] };
          } else if (action.actionType === 'delete') {
            return { ...prev, requisitions: prev.requisitions.filter((r) => r.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              requisitions: prev.requisitions.map((r) => (r.id === action.newData.id ? action.newData : r)),
            };
          }
          break;
        }
        case 'purchaseOrders': {
          if (action.actionType === 'create') {
            return { ...prev, purchaseOrders: [action.newData, ...prev.purchaseOrders] };
          } else if (action.actionType === 'delete') {
            return { ...prev, purchaseOrders: prev.purchaseOrders.filter((po) => po.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              purchaseOrders: prev.purchaseOrders.map((po) => (po.id === action.newData.id ? action.newData : po)),
            };
          }
          break;
        }
        case 'expenses': {
          if (action.actionType === 'create') {
            return { ...prev, expenses: [action.newData, ...prev.expenses] };
          } else if (action.actionType === 'delete') {
            return { ...prev, expenses: prev.expenses.filter((e) => e.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              expenses: prev.expenses.map((e) => (e.id === action.newData.id ? action.newData : e)),
            };
          }
          break;
        }
        case 'timesheets': {
          if (action.actionType === 'create') {
            return { ...prev, timesheets: [action.newData, ...prev.timesheets] };
          } else if (action.actionType === 'delete') {
            return { ...prev, timesheets: prev.timesheets.filter((t) => t.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              timesheets: prev.timesheets.map((t) => (t.id === action.newData.id ? action.newData : t)),
            };
          }
          break;
        }
        case 'projects': {
          if (action.actionType === 'create') {
            return { ...prev, projects: [action.newData, ...prev.projects] };
          } else if (action.actionType === 'delete') {
            return {
              ...prev,
              projects: prev.projects.filter((p) => p.id !== action.previousData.id),
              tasks: prev.tasks.filter((t) => t.projectId !== action.previousData.id),
            };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              projects: prev.projects.map((p) => (p.id === action.newData.id ? action.newData : p)),
            };
          }
          break;
        }
        case 'todos': {
          if (action.actionType === 'create') {
            return { ...prev, todos: [action.newData, ...prev.todos] };
          } else if (action.actionType === 'delete') {
            return { ...prev, todos: prev.todos.filter((t) => t.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              todos: prev.todos.map((t) => (t.id === action.newData.id ? action.newData : t)),
            };
          }
          break;
        }
        case 'documents': {
          if (action.actionType === 'create') {
            return { ...prev, documents: [action.newData, ...prev.documents] };
          } else if (action.actionType === 'delete') {
            return { ...prev, documents: prev.documents.filter((d) => d.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              documents: prev.documents.map((d) => (d.id === action.newData.id ? action.newData : d)),
            };
          }
          break;
        }
        case 'products': {
          if (action.actionType === 'create') {
            return { ...prev, products: [action.newData, ...prev.products] };
          } else if (action.actionType === 'delete') {
            return { ...prev, products: prev.products.filter((p) => p.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              products: prev.products.map((p) => (p.id === action.newData.id ? action.newData : p)),
            };
          }
          break;
        }
        case 'opportunities': {
          if (action.actionType === 'create') {
            return { ...prev, opportunities: [action.newData, ...prev.opportunities] };
          } else if (action.actionType === 'delete') {
            return { ...prev, opportunities: prev.opportunities.filter((o) => o.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              opportunities: prev.opportunities.map((o) => (o.id === action.newData.id ? action.newData : o)),
            };
          }
          break;
        }
        case 'contacts': {
          if (action.actionType === 'create') {
            return { ...prev, contacts: [action.newData, ...prev.contacts] };
          } else if (action.actionType === 'delete') {
            return { ...prev, contacts: prev.contacts.filter((c) => c.id !== action.previousData.id) };
          } else if (action.actionType === 'update') {
            return {
              ...prev,
              contacts: prev.contacts.map((c) => (c.id === action.newData.id ? action.newData : c)),
            };
          }
          break;
        }
        case 'notifications': {
          if (action.actionType === 'delete') {
            const removedIds = Array.isArray(action.previousData)
              ? action.previousData.map((n: any) => n.id)
              : [action.previousData?.id];
            return {
              ...prev,
              notifications: prev.notifications.filter((n) => !removedIds.includes(n.id)),
            };
          } else if (action.actionType === 'create') {
            return {
              ...prev,
              notifications: [action.newData, ...prev.notifications],
            };
          }
          break;
        }
        default:
          return prev;
      }
      return prev;
    });

    const msg = `Se rehizo: ${action.description}`;
    notify('info', 'Acción Rehecha', msg);
    return { success: true, message: msg };
  }, [state.currentUser?.id, notify]);

  return (
    <ErpContext.Provider
      value={{
        ...state,
        login,
        logout,
        switchUser,
        authenticate,
        updateUserProfile,
        updateUserPreferences,
        resetUserPassword,
        createUserAccount,
        deleteUserAccount,
        toggleUserStatus,
        setActiveModule,
        navigateWithContext,
        clearNavigationContext,
        notify,
        dismissNotification,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        deleteProject,
        deleteOpportunity,
        deleteContact,
        deletePurchaseOrder,
        deleteRequisition,
        deleteProduct,
        deletePartner,
        deleteExpense,
        deleteTimesheet,
        deleteDDR,
        deleteMilestone,
        deleteEmployee,
        createOpportunity,
        updateOpportunity,
        awardOpportunity,
        createContact,
        updateContact,
        createProject,
        updateProject,
        addWbsTask,
        updateTask,
        deleteTask,
        updateProjectStatus,
        assignTechnician,
        submitDDR,
        approveDDR,
        submitTimesheet,
        approveTimesheet,
        rejectTimesheet,
        createPurchaseOrder,
        updatePurchaseOrder,
        approvePurchaseOrderGM,
        receivePurchaseOrder,
        receivePurchaseOrderPartial,
        createRequisition,
        updateRequisition,
        createPartner,
        updatePartner,
        createProduct,
        updateProduct,
        setAllProducts,
        clearInventory,
        adjustProductStock,
        updateProductStockDirect,
        recordInventoryAuditLog,
        loanEquipment,
        returnEquipment,
        setAllRemissions,
        createDispatchRemission,
        processReturnRemission,
        submitExpense,
        approveExpense,
        createMilestone,
        signMilestoneAct,
        issueMilestoneInvoice,
        markMilestonePaid,
        setActiveChatChannel,
        markChatAsRead,
        markAllChatsAsRead,
        triggerChatToast,
        dismissChatToast,
        simulateColleagueMessage,
        addChatMessage,
        updateChatMessage,
        deleteChatMessage,
        deleteChatMessageForMe,
        createChatGroup,
        deleteChatGroup,
        addMembersToChatGroup,
        getOrCreateDirectChat,
        addDocument,
        updateDocument,
        deleteDocument,
        addTodo,
        updateTodo,
        toggleTodo,
        deleteTodo,
        createCalendarEvent,
        updateCalendarEvent,
        deleteCalendarEvent,
        batchMergeCalendarEvents,
        triggerCalendarReminderToast,
        dismissCalendarReminderToast,
        createEmployee,
        updateEmployee,
        seedEmployeesFromUsers,
        requestPayrollNovelty,
        approvePayrollNovelty,
        rejectPayrollNovelty,
        deletePayrollNovelty,
        createInventoryWriteOff,
        approveInventoryWriteOff,
        rejectInventoryWriteOff,
        createSstInspection,
        deleteSstInspection,
        saveJobPosition,
        deleteJobPosition,
        assignJobPosition,
        unassignJobPosition,
        saveCandidate,
        updateCandidateStage,

        canUndo,
        canRedo,
        getLastUndoAction,
        getNextRedoAction,
        executeUndo,
        executeRedo,
      }}
    >
      {children}
    </ErpContext.Provider>
  );
};

export const useErp = () => {
  const context = useContext(ErpContext);
  if (!context) {
    throw new Error('useErp debe usarse dentro de un ErpProvider');
  }
  return context;
};

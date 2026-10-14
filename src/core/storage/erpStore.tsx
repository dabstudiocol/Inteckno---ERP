import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
  AppNotification,
  Opportunity,
  CRMContact,
  ChatMessage,
  DocumentItem,
  CalendarEvent,
  CalendarReminderToast,
  TodoItem,
  WikiArticle,
  InternationalLead,
  EmployeeRecord,
  MaintenancePlan,
  DispatchRemission,
  RemissionItem,
  ChatGroup,
  UserPreferences,
  InventoryAuditLog,
} from '../../types';
import {
  SEED_USERS,
  SEED_PROJECTS,
  SEED_TASKS,
  SEED_PARTNERS,
  SEED_PRODUCTS,
  SEED_EQUIPMENT,
  SEED_PURCHASE_ORDERS,
  SEED_REQUISITIONS,
  SEED_BILLING_MILESTONES,
  SEED_TIMESHEETS,
  SEED_EXPENSES,
  SEED_DDRS,
  SEED_OPPORTUNITIES,
  SEED_CONTACTS,
  SEED_CHAT_MESSAGES,
  SEED_CHAT_GROUPS,
  SEED_DOCUMENTS,
  SEED_TODOS,
  SEED_CALENDAR_EVENTS,
  SEED_ARTICLES,
  SEED_INTERNATIONAL_LEADS,
  SEED_EMPLOYEES,
  SEED_MAINTENANCE_PLANS,
  SEED_REMISSIONS,
  SEED_INVENTORY_AUDIT_LOGS,
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
} from '../services/firestoreSyncService';
import { recordAuditEvent } from '../services/auditService';

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
  articles: WikiArticle[];
  leads: InternationalLead[];
  employees: EmployeeRecord[];
  maintenancePlans: MaintenancePlan[];
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
  toggleUserStatus: (userId: string) => void;
  setActiveModule: (moduleId: string) => void;
  notify: (type: AppNotification['type'], title: string, message: string) => void;
  dismissNotification: (id: string) => void;

  // CHAT EN TIEMPO REAL & NOTIFICACIONES
  setActiveChatChannel: (channelId: string) => void;
  markChatAsRead: (channelId: string, userId?: string) => void;
  markAllChatsAsRead: (userId?: string) => void;
  triggerChatToast: (toast: Omit<ChatNotificationToast, 'id' | 'timestamp'>) => void;
  dismissChatToast: () => void;
  simulateColleagueMessage: (channelId?: string, text?: string) => void;

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
  signMilestoneAct: (milestoneId: string) => void;
  issueMilestoneInvoice: (milestoneId: string, invoiceNumber: string) => void;
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
  createChatGroup: (name: string, description: string, members: string[]) => string;
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
  addArticle: (art: Omit<WikiArticle, 'id' | 'updatedAt'>) => void;
  updateArticle: (id: string, data: Partial<WikiArticle>) => void;
  deleteArticle: (id: string) => void;

  // TALENTO HUMANO & MANTENIMIENTO
  createEmployee: (emp: Omit<EmployeeRecord, 'id'>) => void;
  updateEmployee: (id: string, data: Partial<EmployeeRecord>) => void;
  deleteEmployee: (id: string) => void;
  completeMaintenance: (id: string) => void;
}

const ErpContext = createContext<ErpContextType | undefined>(undefined);

export const ErpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ErpState>(() => {
    const defaultState: ErpState = {
      isAuthenticated: false,
      currentUser: SEED_USERS[0], // Gustavo Mejía
      activeModuleId: 'proyectos',
      users: SEED_USERS,
      projects: [],
      tasks: [],
      partners: [],
      products: [],
      equipment: [],
      purchaseOrders: [],
      requisitions: [],
      milestones: [],
      timesheets: [],
      expenses: [],
      ddrs: [],
      notifications: [],
      opportunities: [],
      contacts: [],
      chatMessages: [],
      chatGroups: [],
      activeChatChannelId: 'general',
      activeChatToast: null,
      activeCalendarToast: null,
      documents: [],
      todos: [],
      calendarEvents: [],
      articles: [],
      leads: [],
      employees: [],
      maintenancePlans: [],
      remissions: [],
      inventoryAuditLogs: [],
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

        const seedUsers = defaultState.users;
        const mergedUsers: User[] = (parsed.users && Array.isArray(parsed.users) ? parsed.users : seedUsers).map((u: User) => {
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
          if (!mergedUsers.some((mu) => mu.id === su.id || mu.email.toLowerCase() === su.email.toLowerCase())) {
            mergedUsers.push(su);
          }
        });

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

        // Si ya estaba purgado, cargar los registros ingresados por el usuario
        return {
          ...defaultState,
          ...parsed,
          users: mergedUsers,
          currentUser: resolvedActiveUser,
          isAuthenticated: activeAuth,
          activeChatChannelId: parsed.activeChatChannelId || 'general',
          activeChatToast: null,
          activeCalendarToast: null,
          projects: Array.isArray(parsed.projects) ? parsed.projects : [],
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
          partners: Array.isArray(parsed.partners) ? parsed.partners : [],
          products: Array.isArray(parsed.products) ? parsed.products : [],
          equipment: Array.isArray(parsed.equipment) ? parsed.equipment : [],
          purchaseOrders: Array.isArray(parsed.purchaseOrders) ? parsed.purchaseOrders : [],
          requisitions: Array.isArray(parsed.requisitions) ? parsed.requisitions : [],
          milestones: Array.isArray(parsed.milestones) ? parsed.milestones : [],
          timesheets: Array.isArray(parsed.timesheets) ? parsed.timesheets : [],
          expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
          ddrs: Array.isArray(parsed.ddrs) ? parsed.ddrs : [],
          notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
          opportunities: Array.isArray(parsed.opportunities) ? parsed.opportunities : [],
          contacts: Array.isArray(parsed.contacts) ? parsed.contacts : [],
          chatMessages: Array.isArray(parsed.chatMessages) ? parsed.chatMessages : [],
          chatGroups: Array.isArray(parsed.chatGroups) ? parsed.chatGroups : [],
          documents: Array.isArray(parsed.documents) ? parsed.documents : [],
          todos: Array.isArray(parsed.todos) ? parsed.todos : [],
          calendarEvents: Array.isArray(parsed.calendarEvents) ? parsed.calendarEvents : [],
          articles: Array.isArray(parsed.articles) ? parsed.articles : [],
          leads: Array.isArray(parsed.leads) ? parsed.leads : [],
          employees: Array.isArray(parsed.employees) ? parsed.employees : [],
          maintenancePlans: Array.isArray(parsed.maintenancePlans) ? parsed.maintenancePlans : [],
          remissions: Array.isArray(parsed.remissions) ? parsed.remissions : [],
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
        if (idbState.users && Array.isArray(idbState.users) && idbState.users.length > 0) {
          const mergedUsers = prev.users.map((pu) => {
            const idbUser = idbState.users.find((iu) => iu.id === pu.id);
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
          };
        }
        return prev;
      });
    });

    // 2. Suscribirse a usuarios en Cloud Firestore (multi-usuario en tiempo real)
    const unsubUsers = subscribeToCloudUsers((cloudUsers) => {
      if (!isMounted || !cloudUsers || cloudUsers.length === 0) return;
      setState((prev) => {
        const mergedUsers = prev.users.map((localUser) => {
          const cloudMatch = cloudUsers.find(
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

        const updatedCurrent =
          (prev.currentUser?.id && mergedUsers.find((u) => u.id === prev.currentUser.id)) ||
          prev.currentUser ||
          mergedUsers[0];

        return {
          ...prev,
          users: mergedUsers,
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
      isRemoteUpdateRef.current = true;
      setState((prev) => ({
        ...prev,
        projects: Array.isArray(data.projects) && data.projects.length > 0 ? data.projects : prev.projects,
        tasks: Array.isArray(data.tasks) && data.tasks.length > 0 ? data.tasks : prev.tasks,
        milestones: Array.isArray(data.milestones) && data.milestones.length > 0 ? data.milestones : prev.milestones,
      }));
    });

    // 5. Suscribirse a Abastecimiento, Compras, Requisiciones e Inventario en tiempo real
    const unsubProcurement = subscribeToCloudModule('procurement', (data) => {
      if (!isMounted || !data) return;
      isRemoteUpdateRef.current = true;
      setState((prev) => ({
        ...prev,
        purchaseOrders: Array.isArray(data.purchaseOrders) ? data.purchaseOrders : prev.purchaseOrders,
        requisitions: Array.isArray(data.requisitions) ? data.requisitions : prev.requisitions,
        products: Array.isArray(data.products) && data.products.length > 0 ? data.products : prev.products,
        equipment: Array.isArray(data.equipment) ? data.equipment : prev.equipment,
        partners: Array.isArray(data.partners) ? data.partners : prev.partners,
        inventoryAuditLogs: Array.isArray(data.inventoryAuditLogs) && data.inventoryAuditLogs.length > 0 ? data.inventoryAuditLogs : prev.inventoryAuditLogs,
      }));
    });

    // 6. Suscribirse a Operaciones en Campo (Horas, Gastos, DDRs, Remisiones) en tiempo real
    const unsubOperations = subscribeToCloudModule('operations', (data) => {
      if (!isMounted || !data) return;
      isRemoteUpdateRef.current = true;
      setState((prev) => ({
        ...prev,
        timesheets: Array.isArray(data.timesheets) ? data.timesheets : prev.timesheets,
        expenses: Array.isArray(data.expenses) ? data.expenses : prev.expenses,
        ddrs: Array.isArray(data.ddrs) ? data.ddrs : prev.ddrs,
        remissions: Array.isArray(data.remissions) ? data.remissions : prev.remissions,
        maintenancePlans: Array.isArray(data.maintenancePlans) ? data.maintenancePlans : prev.maintenancePlans,
      }));
    });

    // 7. Suscribirse a Comercial (CRM, Oportunidades, Contactos) en tiempo real
    const unsubCommercial = subscribeToCloudModule('commercial', (data) => {
      if (!isMounted || !data) return;
      isRemoteUpdateRef.current = true;
      setState((prev) => ({
        ...prev,
        opportunities: Array.isArray(data.opportunities) ? data.opportunities : prev.opportunities,
        contacts: Array.isArray(data.contacts) ? data.contacts : prev.contacts,
        leads: Array.isArray(data.leads) ? data.leads : prev.leads,
      }));
    });

    // 8. Suscribirse a Productividad (Tareas To-Do, Calendario, Documentos, Wiki) en tiempo real
    const unsubProductivity = subscribeToCloudModule('productivity', (data) => {
      if (!isMounted || !data) return;
      isRemoteUpdateRef.current = true;
      setState((prev) => ({
        ...prev,
        todos: Array.isArray(data.todos) ? data.todos : prev.todos,
        calendarEvents: Array.isArray(data.calendarEvents) ? data.calendarEvents : prev.calendarEvents,
        documents: Array.isArray(data.documents) ? data.documents : prev.documents,
        articles: Array.isArray(data.articles) ? data.articles : prev.articles,
      }));
    });

    return () => {
      isMounted = false;
      if (unsubUsers) unsubUsers();
      if (unsubChat) unsubChat();
      if (unsubProjects) unsubProjects();
      if (unsubProcurement) unsubProcurement();
      if (unsubOperations) unsubOperations();
      if (unsubCommercial) unsubCommercial();
      if (unsubProductivity) unsubProductivity();
    };
  }, []);

  const isRemoteUpdateRef = useRef(false);

  // SINCRONIZADOR REACTIVO MODULAR: Cualquier adición, edición o eliminación local se transmite a la nube
  useEffect(() => {
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    const timer = setTimeout(() => {
      const currentUserId = state.currentUser?.id || 'USR-01';

      syncModuleToCloud('projects', {
        projects: state.projects,
        tasks: state.tasks,
        milestones: state.milestones,
      }, currentUserId);

      syncModuleToCloud('procurement', {
        purchaseOrders: state.purchaseOrders,
        requisitions: state.requisitions,
        products: state.products,
        equipment: state.equipment,
        partners: state.partners,
        inventoryAuditLogs: state.inventoryAuditLogs,
      }, currentUserId);

      syncModuleToCloud('operations', {
        timesheets: state.timesheets,
        expenses: state.expenses,
        ddrs: state.ddrs,
        remissions: state.remissions,
        maintenancePlans: state.maintenancePlans,
      }, currentUserId);

      syncModuleToCloud('commercial', {
        opportunities: state.opportunities,
        contacts: state.contacts,
        leads: state.leads,
      }, currentUserId);

      syncModuleToCloud('productivity', {
        todos: state.todos,
        calendarEvents: state.calendarEvents,
        documents: state.documents,
        articles: state.articles,
      }, currentUserId);
    }, 450);

    return () => clearTimeout(timer);
  }, [
    state.projects,
    state.tasks,
    state.milestones,
    state.purchaseOrders,
    state.requisitions,
    state.products,
    state.equipment,
    state.partners,
    state.timesheets,
    state.expenses,
    state.ddrs,
    state.remissions,
    state.maintenancePlans,
    state.opportunities,
    state.contacts,
    state.leads,
    state.todos,
    state.calendarEvents,
    state.documents,
    state.articles,
    state.currentUser?.id,
  ]);

  const notify = useCallback(
    (type: AppNotification['type'], title: string, message: string) => {
      // Reproducir sonido si está habilitado en las preferencias del usuario
      if (state.currentUser?.preferences?.soundEnabled !== false) {
        playNotificationChime();
      }

      const newNotif: AppNotification = {
        id: `notif-${Date.now()}`,
        title,
        message,
        type,
        timestamp: 'Ahora mismo',
        read: false,
      };
      setState((prev) => ({
        ...prev,
        notifications: [newNotif, ...prev.notifications],
      }));
    },
    [state.currentUser?.preferences?.soundEnabled]
  );

  const dismissNotification = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.filter((n) => n.id !== id),
    }));
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

      return {
        ...prev,
        users: updatedUsers,
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
      const updatedUsers = prev.users.map((u) => {
        if (u.id === userId) {
          return { ...u, password: newPassword };
        }
        return u;
      });

      const updatedCurrent =
        prev.currentUser.id === userId ? { ...prev.currentUser, password: newPassword } : prev.currentUser;

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

    const newUser: User = {
      ...userData,
      id: newId,
      avatar: userData.avatar || initials || 'IT',
      avatarColor: userData.avatarColor || '#00668F',
      password: userData.password || 'Inteckno2026*',
      isActive: userData.isActive !== undefined ? userData.isActive : true,
      hseqStatus: userData.hseqStatus || 'valid',
      hseqExpiresAt: userData.hseqExpiresAt || '2028-12-31',
      canWorkHeights: userData.canWorkHeights ?? false,
      competencies: userData.competencies || ['Inducción General STC'],
    };

    setState((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
    }));

    return newUser;
  }, []);

  const toggleUserStatus = useCallback((userId: string) => {
    setState((prev) => {
      const updatedUsers = prev.users.map((u) => {
        if (u.id === userId) {
          return { ...u, isActive: u.isActive === false ? true : false };
        }
        return u;
      });

      const updatedCurrent =
        prev.currentUser.id === userId
          ? { ...prev.currentUser, isActive: prev.currentUser.isActive === false ? true : false }
          : prev.currentUser;

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

  const setActiveModule = useCallback((moduleId: string) => {
    setState((prev) => ({ ...prev, activeModuleId: moduleId }));
  }, []);

  // MÉTODOS DE BORRADO INDIVIDUAL
  const deleteProject = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        projects: prev.projects.filter((p) => p.id !== id),
        tasks: prev.tasks.filter((t) => t.projectId !== id),
      }));
      notify('info', 'Proyecto Eliminado', 'El proyecto y sus actividades asociadas han sido retirados.');
    },
    [notify]
  );

  const deleteOpportunity = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        opportunities: prev.opportunities.filter((o) => o.id !== id),
      }));
      notify('info', 'Oportunidad Eliminada', 'La cotización/oportunidad ha sido retirada.');
    },
    [notify]
  );

  const deleteContact = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        contacts: prev.contacts.filter((c) => c.id !== id),
      }));
      notify('info', 'Contacto Eliminado', 'El cliente/contacto ha sido retirado del CRM.');
    },
    [notify]
  );

  const deletePurchaseOrder = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        purchaseOrders: prev.purchaseOrders.filter((po) => po.id !== id),
      }));
      notify('info', 'Orden de Compra Eliminada', 'La orden de compra ha sido retirada.');
    },
    [notify]
  );

  const deleteRequisition = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        requisitions: prev.requisitions.filter((r) => r.id !== id),
      }));
      notify('info', 'Requisición Eliminada', 'La requisición interna ha sido retirada.');
    },
    [notify]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.filter((p) => p.id !== id),
      }));
      notify('info', 'Artículo Eliminado', 'El artículo ha sido retirado del inventario.');
    },
    [notify]
  );

  const deletePartner = useCallback(
    (id: string) => {
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
      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== id),
      }));
      notify('info', 'Gasto Eliminado', 'El comprobante de gasto ha sido retirado.');
    },
    [notify]
  );

  const deleteTimesheet = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        timesheets: prev.timesheets.filter((t) => t.id !== id),
      }));
      notify('info', 'Horas Eliminadas', 'El registro de horas de trabajo ha sido retirado.');
    },
    [notify]
  );

  const deleteDDR = useCallback(
    (id: string) => {
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
      setState((prev) => ({
        ...prev,
        milestones: prev.milestones.filter((m) => m.id !== id),
      }));
      notify('info', 'Hito Eliminado', 'El hito de facturación ha sido retirado.');
    },
    [notify]
  );

  const deleteEmployee = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        employees: prev.employees.filter((e) => e.id !== id),
      }));
      notify('info', 'Empleado Eliminado', 'El registro de talento humano ha sido retirado.');
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
          notes: `Registrado automáticamente desde la oportunidad ${code}: ${oppData.title}`,
        };
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
        clientName: customData?.clientName || opp.clientName,
        lineOfBusiness: (customData?.lineOfBusiness as any) || (opp.title.toLowerCase().includes('overhaul') ? 'Mantenimiento' : 'Montaje'),
        serviceType: customData?.serviceType || opp.cableType,
        status: 'kickoff',
        startDate: customData?.startDate || new Date().toISOString().split('T')[0],
        endDate: customData?.endDate || opp.expectedCloseDate,
        location: customData?.location || `${opp.country} (En sitio)`,
        costCenter: customData?.costCenter || `CC-${projectCode}`,
        budgetPV: customData?.budgetPV || (customData?.contractAmount ? customData.contractAmount : opp.estimatedValueUSD * 4200),
        actualCostAC: 0,
        earnedValueEV: 0,
        spi: 1.0,
        cpi: 1.0,
        cv: 0,
        totalInvoiced: 0,
        totalPaid: 0,
        projectLeaderId: customData?.projectLeaderId || 'USR-18', // Wilson Alzate
        projectLeaderName: customData?.projectLeaderName || 'Wilson Albeiro Alzate Correa',
        supervisorId: customData?.supervisorId || 'USR-05', // Dairo Morales
        supervisorName: customData?.supervisorName || 'Dairo Morales Villa',
        assignedTeamIds: customData?.assignedTeamIds || ['USR-18', 'USR-05', 'USR-16'],
        templateReused: true,
        templateName: 'Plantilla Maestra STC - Mantenimiento Mayor y Desmontaje',
        closedDossierSigned: false,
        liquidationSigned: false,
        lessonLearnedDone: false,
        clientNit: customData?.clientNit,
        commercialContact: customData?.commercialContact,
        technicalContact: customData?.technicalContact,
        projectCategory: customData?.projectCategory,
        contractAmount: customData?.contractAmount,
        currency: customData?.currency || 'USD',
        billingMethod: customData?.billingMethod || 'fixed_price',
        paymentMilestones: customData?.paymentMilestones,
        applicableRates: customData?.applicableRates,
      };

      // Inyectar Estructura WBS Estándar Inteckno
      const standardTasks: WBSTask[] = [
        {
          id: `TASK-${Date.now()}-1`,
          projectId,
          code: '1.0',
          name: 'Gestión HSEQ, Permisos de Alturas y Plan de Izaje',
          plannedHours: 40,
          actualHours: 0,
          progressPct: 0,
          isCriticalPath: true,
          predecessors: [],
          status: 'pending',
          assignedToName: 'Kelly Rojas',
        },
        {
          id: `TASK-${Date.now()}-2`,
          projectId,
          code: '2.0',
          name: 'Logística de Equipos Calibrados y Recepción de Repuestos',
          plannedHours: 32,
          actualHours: 0,
          progressPct: 0,
          isCriticalPath: true,
          predecessors: ['1.0'],
          status: 'pending',
          assignedToName: 'Sebastián Vélez',
        },
        {
          id: `TASK-${Date.now()}-3`,
          projectId,
          code: '3.0',
          name: 'Intervención Electromecánica en Estaciones / Pilonas',
          plannedHours: 120,
          actualHours: 0,
          progressPct: 0,
          isCriticalPath: true,
          predecessors: ['2.0'],
          status: 'pending',
          assignedToName: 'Dairo Morales',
        },
        {
          id: `TASK-${Date.now()}-4`,
          projectId,
          code: '4.0',
          name: 'Ensayos No Destructivos (NDT Magnetografía) y Pruebas de Carga',
          plannedHours: 48,
          actualHours: 0,
          progressPct: 0,
          isCriticalPath: true,
          predecessors: ['3.0'],
          status: 'pending',
          assignedToName: 'Sebastián Ruiz',
        },
        {
          id: `TASK-${Date.now()}-5`,
          projectId,
          code: '5.0',
          name: 'Elaboración de Dossier de Calidad, Acta de Entrega y Cierre',
          plannedHours: 24,
          actualHours: 0,
          progressPct: 0,
          isCriticalPath: false,
          predecessors: ['4.0'],
          status: 'pending',
          assignedToName: 'Wilson Alzate',
        },
      ];

      setState((prev) => ({
        ...prev,
        // Cuando se adjudica o gana una oportunidad, se retira del CRM y pasa a ser un Proyecto
        opportunities: prev.opportunities.filter((o) => o.id !== oppId),
        projects: [newProject, ...prev.projects],
        tasks: [...standardTasks, ...prev.tasks],
        activeModuleId: 'proyectos',
      }));

      notify(
        'success',
        '¡Oportunidad Adjudicada!',
        `Se creó automáticamente el proyecto ${projectCode} (${newProject.name}) con 5 fases WBS precargadas.`
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
      setState((prev) => ({
        ...prev,
        contacts: [newContact, ...prev.contacts],
      }));
      notify('success', 'Contacto Creado', `${contactData.name} (${contactData.company}) guardado.`);
    },
    [notify]
  );

  // ============================================================================
  // PROYECTOS & WBS
  // ============================================================================
  const createProject = useCallback(
    (prjData: Omit<Project, 'id' | 'spi' | 'cpi' | 'cv' | 'earnedValueEV' | 'actualCostAC'>): Project => {
      const newProject: Project = {
        ...prjData,
        id: `PRJ-${Date.now()}`,
        actualCostAC: 0,
        earnedValueEV: 0,
        spi: 1.0,
        cpi: 1.0,
        cv: 0,
      };
      setState((prev) => ({
        ...prev,
        projects: [newProject, ...prev.projects],
      }));
      notify('success', 'Proyecto Registrado', `${newProject.code}: ${newProject.name} activo.`);
      return newProject;
    },
    [notify]
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
      const newDdr: DailyProgressReport = {
        ...ddrData,
        id: `DDR-${Date.now()}`,
        reportNumber,
        approvedByLeader: false,
      };

      if (ddrData.weather === 'tormenta_electrica') {
        notify('warning', 'Alerta Climatológica STC', 'Labores en alturas suspendidas por tormenta eléctrica.');
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
      setState((prev) => ({
        ...prev,
        timesheets: [newEntry, ...prev.timesheets],
      }));
      notify('success', 'Horas Registradas', `Se radicaron ${entry.hours} horas en el proyecto ${entry.projectCode}.`);
    },
    [notify]
  );

  const approveTimesheet = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        timesheets: prev.timesheets.map((t) => (t.id === id ? { ...t, status: 'approved' } : t)),
      }));
      notify('success', 'Horas Aprobadas', 'El registro de horas fue validado por la jefatura técnica.');
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

      const newPo: PurchaseOrder = {
        ...poData,
        id: `PO-${Date.now()}`,
        orderNumber,
        status: 'ordered',
        gmApproved: true,
      };

      setState((prev) => ({
        ...prev,
        purchaseOrders: [newPo, ...prev.purchaseOrders],
      }));

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

      notify('success', 'Orden de Compra Registrada', `${orderNumber} registrada y lista para seguimiento de entrega.`);

      return { success: true, requiresGMApproval: false };
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

      setState((prev) => {
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

        return {
          ...prev,
          products: updatedProducts,
          purchaseOrders: prev.purchaseOrders.map((p) =>
            p.id === poId ? { ...p, status: 'received', physicalReceiptDone: true, technicalQualityInspectionDone: true } : p
          ),
        };
      });

      // Huella Digital Inmutable y Sincronización M365 Excel Online
      for (const poItem of po.items) {
        const prod = state.products.find((p) => p.id === poItem.productId || p.sku === poItem.sku);
        if (prod) {
          const qty = Number(poItem.qty) || 0;
          const newStock = prod.realStock + qty;
          recordInventoryAuditLog({
            productId: prod.id,
            productSku: prod.sku,
            productName: prod.name,
            userId: state.currentUser?.id || 'USR-001',
            userName: state.currentUser?.name || 'Recepción Bodega ITK',
            userEmail: state.currentUser?.email || 'almacen@inteckno.com',
            source: 'erp_web',
            previousStock: prod.realStock,
            newStock,
            delta: qty,
            reason: `Ingreso por Orden de Compra ${po.orderNumber} (Proveedor: ${po.supplierName})`,
            projectCode: po.projectCode,
          });
          syncProductChangeToExcelOnline(prod.sku, newStock).catch(() => {});
        }
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
        // Actualizar stock
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

        return {
          ...prev,
          products: updatedProducts,
          purchaseOrders: prev.purchaseOrders.map((p) =>
            p.id === poId
              ? {
                  ...p,
                  status: newStatus,
                  items: updatedPoItems,
                  physicalReceiptDone: allCompleted,
                  technicalQualityInspectionDone: allCompleted,
                }
              : p
          ),
        };
      });

      // Audit log y Excel sync por delta recibido
      for (const receipt of itemReceipts) {
        if (receipt.receivedQty <= 0) continue;
        const prod = state.products.find((p) => p.sku === receipt.sku);
        if (prod) {
          const newStock = prod.realStock + receipt.receivedQty;
          recordInventoryAuditLog({
            productId: prod.id,
            productSku: prod.sku,
            productName: prod.name,
            userId: state.currentUser?.id || 'USR-001',
            userName: state.currentUser?.name || 'Recepción Bodega ITK',
            userEmail: state.currentUser?.email || 'almacen@inteckno.com',
            source: 'erp_web',
            previousStock: prod.realStock,
            newStock,
            delta: receipt.receivedQty,
            reason: `Recepción Parcial (${receipt.receivedQty}) OC ${po.orderNumber}`,
            projectCode: po.projectCode,
          });
          syncProductChangeToExcelOnline(prod.sku, newStock).catch(() => {});
        }
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
      notify('success', 'Requisición Creada', `${reqNumber} registrada en el embudo de compras.`);
      return { success: true, autoPoCreated: false, requisition: newReq };
    },
    [state.requisitions.length, notify]
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
      notify('success', 'Repuesto Registrado', `${newProd.sku}: ${newProd.name} agregado a bodega.`);
    },
    [notify]
  );

  const updateProduct = useCallback(
    (id: string, data: Partial<Product>) => {
      setState((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === id ? { ...p, ...data } : p)),
      }));
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
    },
    []
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
        status: 'en_campo',
        totalDispatchedItems: totalDispatched,
        totalReturnedItems: 0,
        totalConsumedValueUSD: 0,
        totalConsumedValueCOP: 0,
      };

      // Descontar inventario de cada producto despachado y registrar auditoría forense
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

        return {
          ...prev,
          products: updatedProducts,
          equipment: updatedEquipment,
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

        // Reintegrar equipos
        const updatedEquipment = prev.equipment.map((eq) => {
          const retItem = updatedItems.find((it) => it.productId === eq.id || it.sku === eq.code);
          if (retItem && retItem.qtyReturned > 0) {
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

        // Si se consumieron artículos, imputar el costo al proyecto
        const updatedProjects = prev.projects.map((prj) => {
          if (prj.id === remission.projectId || prj.code === remission.projectCode) {
            const newAC = prj.actualCostAC + consumedCostUSD;
            const newCPI = newAC > 0 ? Number((prj.earnedValueEV / newAC).toFixed(2)) : prj.cpi;
            const newCV = prj.earnedValueEV - newAC;
            return {
              ...prj,
              actualCostAC: newAC,
              cpi: newCPI,
              cv: newCV,
            };
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

      notify('success', 'Gasto Reportado', `Se radicó el comprobante por ${entry.currency} $${entry.amount.toLocaleString()}.`);
    },
    [state.currentUser, notify]
  );

  const approveExpense = useCallback(
    (id: string) => {
      const exp = state.expenses.find((e) => e.id === id);
      setState((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => (e.id === id ? { ...e, status: 'approved' } : e)),
      }));

      // Huella Digital: Aprobación Contable de Gasto
      recordAuditEvent({
        action: 'expense_approved',
        module: 'gastos',
        performedByUserId: state.currentUser?.id || 'USR-001',
        performedByName: state.currentUser?.name || 'Administración / Gerencia ITK',
        targetEntityId: id,
        details: `Aprobación y legalización contable de gasto ${id} por ${exp?.currency || 'COP'} $${(exp?.amount || 0).toLocaleString()}.`,
        previousValue: 'pending',
        newValue: 'approved',
      }).catch(() => {});

      notify('success', 'Gasto Aprobado', 'Se legalizó el desembolso y se imputó a contabilidad.');
    },
    [state.expenses, state.currentUser, notify]
  );

  const signMilestoneAct = useCallback(
    (milestoneId: string) => {
      const milestone = state.milestones.find((m) => m.id === milestoneId);
      setState((prev) => ({
        ...prev,
        milestones: prev.milestones.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                acceptanceActSigned: true,
                acceptanceActSignedAt: new Date().toISOString(),
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
      setState((prev) => ({
        ...prev,
        milestones: prev.milestones.map((m) =>
          m.id === milestoneId
            ? {
                ...m,
                invoiceIssued: true,
                invoiceNumber,
                invoiceIssuedAt: new Date().toISOString(),
              }
            : m
        ),
      }));

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
    (name: string, description: string, members: string[]) => {
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
    [state.currentUser.id, notify]
  );

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
      setState((prev) => ({
        ...prev,
        documents: [newDoc, ...prev.documents],
      }));
      notify('success', 'Documento en Repositorio', `${newDoc.title} archivado en el repositorio técnico.`);
    },
    [notify]
  );

  const deleteDocument = useCallback(
    (id: string) => {
      setState((prev) => {
        const docToDelete = prev.documents.find((d) => d.id === id);
        if (docToDelete) {
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
    [notify]
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
      setState((prev) => ({
        ...prev,
        todos: prev.todos.filter((t) => t.id !== id),
      }));
      notify('info', 'Actividad Eliminada', 'La tarea fue eliminada de compromisos operativos.');
    },
    [notify]
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

  const addArticle = useCallback(
    (artData: Omit<WikiArticle, 'id' | 'updatedAt'>) => {
      const newArt: WikiArticle = {
        ...artData,
        id: `ART-${Date.now()}`,
        updatedAt: new Date().toISOString().split('T')[0],
      };
      setState((prev) => ({
        ...prev,
        articles: [newArt, ...prev.articles],
      }));
      notify('success', 'Artículo Publicado', `"${newArt.title}" agregado a la Wiki STC.`);
    },
    [notify]
  );

  const updateArticle = useCallback(
    (id: string, data: Partial<WikiArticle>) => {
      setState((prev) => ({
        ...prev,
        articles: prev.articles.map((a) =>
          a.id === id
            ? {
                ...a,
                ...data,
                updatedAt: data.updatedAt || new Date().toISOString().split('T')[0],
              }
            : a
        ),
      }));
    },
    []
  );

  const deleteArticle = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        articles: prev.articles.filter((a) => a.id !== id),
      }));
      notify('info', 'Artículo Retirado', 'Artículo eliminado de la base de conocimiento.');
    },
    [notify]
  );

  const updateProject = useCallback((id: string, data: Partial<Project>) => {
    setState((prev) => ({
      ...prev,
      projects: prev.projects.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));
    notify('success', 'Proyecto Actualizado', 'Los cambios en la ficha técnica fueron guardados.');
  }, [notify]);

  const updateTask = useCallback((id: string, data: Partial<WBSTask>) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
    notify('success', 'Tarea WBS Actualizada', 'Avance u horas modificadas.');
  }, [notify]);

  const deleteTask = useCallback((id: string) => {
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
    setState((prev) => ({
      ...prev,
      employees: prev.employees.map((e) => (e.id === id ? { ...e, ...data } : e)),
    }));
    notify('success', 'Empleado Actualizado', 'Registro de talento humano y SST guardado.');
  }, [notify]);

  const createEmployee = useCallback(
    (empData: Omit<EmployeeRecord, 'id'>) => {
      const newEmp: EmployeeRecord = {
        ...empData,
        id: `EMP-${Date.now()}`,
      };
      setState((prev) => ({
        ...prev,
        employees: [newEmp, ...prev.employees],
      }));
      notify('success', 'Empleado Registrado', `${newEmp.name} agregado al sistema de Talento Humano.`);
    },
    [notify]
  );

  const completeMaintenance = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        maintenancePlans: prev.maintenancePlans.map((m) =>
          m.id === id
            ? {
                ...m,
                status: 'al_dia',
                lastDoneDate: new Date().toISOString().split('T')[0],
              }
            : m
        ),
      }));
      notify('success', 'Mantenimiento Ejecutado', 'Se registró la inspección técnica y se reprogramó el ciclo.');
    },
    [notify]
  );

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
        toggleUserStatus,
        setActiveModule,
        notify,
        dismissNotification,
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
        signMilestoneAct,
        issueMilestoneInvoice,
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
        addArticle,
        updateArticle,
        deleteArticle,
        createEmployee,
        updateEmployee,
        completeMaintenance,
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

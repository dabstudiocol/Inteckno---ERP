import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder,
  FileText,
  UploadCloud,
  Search,
  ExternalLink,
  Download,
  Trash2,
  Eye,
  Plus,
  RefreshCw,
  X,
  Share2,
  Link,
  Settings,
  Copy,
  Check,
  ChevronRight,
  ArrowLeft,
  Building2,
  User,
  Users,
  HardDrive,
  Layers,
  Sparkles,
  FolderPlus,
  FileUp,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet,
  Calendar,
  MessageSquare,
  Send,
  GitBranch,
  History,
  Mail,
  Cloud,
  Shield,
  Clock,
  Maximize2,
  Filter,
  MoreVertical,
  Star,
  Pencil,
  FolderOpen,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { DocumentItem } from '../../types';
import {
  openMicrosoftAuthPopup,
  fetchSharePointFilesFromGraph,
  getM365Config,
  saveM365Config,
  getAdminConsentUrl,
  openAdminConsentPopup,
  isM365TokenExpired,
  getOfficeOnlineUrl,
  getOutlookDocumentAlertUrl,
  getTeamsDocumentAlertUrl,
} from '../../core/services/m365Sync';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { AiDocumentUploader } from '../../components/ui/AiDocumentUploader';
import {
  askDocumentQuestion,
  calculateExpirationStatus,
} from '../../core/services/aiDocumentService';
import { MargaritaIcon } from '../../components/common/MargaritaIcon';
import { cleanSpecialChars } from '../../core/services/lucianaService';

export type OrganizerTab = 'todos' | 'empresa' | 'mi_unidad' | 'compartido' | 'vencimientos_hseq';

export type CompanyDepartment =
  | 'Operaciones'
  | 'HSEQ'
  | 'Comercial'
  | 'Ingeniería'
  | 'Administración'
  | 'Sistemas';

export interface DocFolder {
  id: string;
  name: string;
  subtitle: string;
  scope: 'empresa' | 'personal' | 'compartido';
  department?: CompanyDepartment;
  projectCode?: string;
  iconColor: string;
  isCustom?: boolean;
  isFavorite?: boolean;
}

const DEFAULT_FOLDERS: DocFolder[] = [
  // EMPRESA - PROYECTOS & ÁREAS CORPORATIVAS
  {
    id: 'f-med-k',
    name: 'Línea K - Metrocable Medellín',
    subtitle: 'Metro de Medellín • Operaciones & Montaje',
    scope: 'empresa',
    department: 'Ingeniería',
    projectCode: 'PRJ-2026-MED-K',
    iconColor: '#00668F',
  },
  {
    id: 'f-bog-tmc',
    name: 'TransMiCable San Cristóbal',
    subtitle: 'IDU Bogotá • HSEQ & Obra Civil',
    scope: 'empresa',
    department: 'HSEQ',
    projectCode: 'PRJ-2026-BOG-TMC',
    iconColor: '#059669',
  },
  {
    id: 'f-cdmx-l3',
    name: 'Cablebús Línea 3 Chapultepec',
    subtitle: 'CDMX • Licitación & Pliegos',
    scope: 'empresa',
    department: 'Comercial',
    projectCode: 'PRJ-2026-CDMX-L3',
    iconColor: '#7C3AED',
  },
  {
    id: 'f-gye-aer',
    name: 'Aerovía Guayaquil - Durán',
    subtitle: 'Consorcio Ecuador • Repuestos & Actas',
    scope: 'empresa',
    department: 'Administración',
    projectCode: 'PRJ-2026-GYE-AER',
    iconColor: '#D97706',
  },
  {
    id: 'f-corp-norm',
    name: 'Repositorio Corporativo & Normativa STC',
    subtitle: 'Normas EN 1709, EN 12927 y Calidad STC',
    scope: 'empresa',
    department: 'Ingeniería',
    projectCode: 'DOCS-CORP',
    iconColor: '#4B5563',
  },
  {
    id: 'f-area-ops',
    name: 'Operaciones & Mantenimiento STC',
    subtitle: 'Cables de tracción, pilonas y ensayos MRT',
    scope: 'empresa',
    department: 'Operaciones',
    iconColor: '#0284C7',
  },
  {
    id: 'f-area-hseq',
    name: 'HSEQ & Seguridad Industrial',
    subtitle: 'Protocolos de alturas, EPP y certificaciones SST',
    scope: 'empresa',
    department: 'HSEQ',
    iconColor: '#10B981',
  },
  {
    id: 'f-area-com',
    name: 'Comercial & Licitaciones',
    subtitle: 'Propuestas comerciales, cotizaciones y pliegos',
    scope: 'empresa',
    department: 'Comercial',
    iconColor: '#8B5CF6',
  },
  {
    id: 'f-area-adm',
    name: 'Gestión Administrativa & Financiera',
    subtitle: 'Contratos, compras de repuestos y facturación 48h',
    scope: 'empresa',
    department: 'Administración',
    iconColor: '#F59E0B',
  },
  {
    id: 'f-area-ti',
    name: 'Sistemas & TI',
    subtitle: 'Infraestructura cloud, ERP y Microsoft 365',
    scope: 'empresa',
    department: 'Sistemas',
    iconColor: '#00668F',
  },

  // MI UNIDAD (DOCUMENTOS PERSONALES DEL USUARIO)
  {
    id: 'f-per-campo',
    name: 'Mis Archivos de Campo',
    subtitle: 'Registros, fotos y notas técnicas personales',
    scope: 'personal',
    iconColor: '#0284C7',
  },
  {
    id: 'f-per-inf',
    name: 'Mis Informes & Reportes',
    subtitle: 'Borradores de informes y memorias propias',
    scope: 'personal',
    iconColor: '#10B981',
  },
  {
    id: 'f-per-cert',
    name: 'Mis Certificaciones & Documentos',
    subtitle: 'Certificados personales, cursos y licencias SST',
    scope: 'personal',
    iconColor: '#6366F1',
  },

  // COMPARTIDO CONMIGO (COLABORATIVO)
  {
    id: 'f-cmp-prj',
    name: 'Compartidos de Proyectos STC',
    subtitle: 'Planos e informes compartidos por el equipo',
    scope: 'compartido',
    iconColor: '#EC4899',
  },
  {
    id: 'f-cmp-colab',
    name: 'Documentos de Colaboración',
    subtitle: 'Borradores conjuntos y revisiones técnicas',
    scope: 'compartido',
    iconColor: '#14B8A6',
  },
];

const COMPANY_AREAS: { id: CompanyDepartment | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Todas las Áreas', icon: '🏢' },
  { id: 'Operaciones', label: 'Operaciones & Mantenimiento', icon: '⚙️' },
  { id: 'HSEQ', label: 'HSEQ & Seguridad', icon: '🛡️' },
  { id: 'Comercial', label: 'Comercial & Licitaciones', icon: '💼' },
  { id: 'Ingeniería', label: 'Ingeniería & Proyectos', icon: '🏗️' },
  { id: 'Administración', label: 'Administración & Finanzas', icon: '📊' },
  { id: 'Sistemas', label: 'Sistemas & TI', icon: '💻' },
];

export const DocumentosModule: React.FC = () => {
  const { documents, addDocument, updateDocument, deleteDocument, currentUser, users, projects } = useErp();

  // Estados principales de navegación
  const [activeTab, setActiveTab] = useState<OrganizerTab>('todos');
  const [selectedArea, setSelectedArea] = useState<CompanyDepartment | 'all'>('all');
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtros adicionales híbridos
  const [selectedVencimientoFilter, setSelectedVencimientoFilter] = useState<'todos' | 'vencidos' | 'por_vencer' | 'vigentes'>('todos');
  const [selectedStorageSource, setSelectedStorageSource] = useState<'todos' | 'sharepoint_m365' | 'firebase_storage'>('todos');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('todos');

  // Asistente Técnico "Preguntar al Documento"
  const [chatDoc, setChatDoc] = useState<DocumentItem | null>(null);
  const [chatQuestions, setChatQuestions] = useState<
    { id: string; sender: 'user' | 'gemini'; text: string; timestamp: string }[]
  >([]);
  const [chatInput, setChatInput] = useState('');
  const [isAskingGemini, setIsAskingGemini] = useState(false);

  // Control de Revisiones y Versiones de Ingeniería
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionTargetDoc, setVersionTargetDoc] = useState<DocumentItem | null>(null);
  const [newVersionTag, setNewVersionTag] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');

  // Modificaciones / Eliminaciones de carpetas (incluidas las DEFAULT_FOLDERS)
  const [folderOverrides, setFolderOverrides] = useState<Record<string, Partial<DocFolder>>>(() => {
    try {
      const saved = localStorage.getItem('inteckno_folder_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [deletedFolderIds, setDeletedFolderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('inteckno_deleted_folders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Carpetas personalizadas creadas por el usuario
  const [customFolders, setCustomFolders] = useState<DocFolder[]>(() => {
    try {
      const saved = localStorage.getItem('inteckno_custom_folders');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allFolders = useMemo(() => {
    const list = [...DEFAULT_FOLDERS, ...customFolders]
      .filter((f) => !deletedFolderIds.includes(f.id))
      .map((f) => ({ ...f, ...(folderOverrides[f.id] || {}) }));

    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const unique: DocFolder[] = [];
    for (const f of list) {
      const normName = f.name.trim().toLowerCase();
      if (!seenIds.has(f.id) && !seenNames.has(normName)) {
        seenIds.add(f.id);
        seenNames.add(normName);
        unique.push(f);
      }
    }
    return unique;
  }, [customFolders, deletedFolderIds, folderOverrides]);

  // Menú contextual flotante y modal de acciones para carpetas y documentos
  const [floatingMenu, setFloatingMenu] = useState<{
    type: 'folder' | 'doc';
    id: string;
    x: number;
    y: number;
    item: DocFolder | DocumentItem;
  } | null>(null);

  const activeMenuFolderId = floatingMenu?.type === 'folder' ? floatingMenu.id : null;
  const activeMenuDocId = floatingMenu?.type === 'doc' ? floatingMenu.id : null;
  const setActiveMenuFolderId = (id: string | null) => {
    if (!id) setFloatingMenu(null);
  };
  const setActiveMenuDocId = (id: string | null) => {
    if (!id) setFloatingMenu(null);
  };

  // Posicionamiento inteligente y seguro del menú flotante (sin recortes por sidebar o bordes)
  const openFloatingMenu = (
    e: React.MouseEvent,
    type: 'folder' | 'doc',
    item: DocFolder | DocumentItem,
    anchor: 'trigger' | 'cursor' = 'trigger'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    if (floatingMenu?.id === item.id && floatingMenu?.type === type) {
      setFloatingMenu(null);
      return;
    }

    const menuWidth = 208; // w-52
    const menuHeight = 220;
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = 0;
    let y = 0;

    if (anchor === 'cursor') {
      x = e.clientX;
      y = e.clientY + 4;
    } else {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      x = rect.right - menuWidth;
      y = rect.bottom + 6;

      if (x < padding) {
        x = rect.left;
      }
    }

    // Clampeo estricto horizontal para que nunca se desborde a los lados de la pantalla
    if (x + menuWidth > viewportWidth - padding) {
      x = viewportWidth - menuWidth - padding;
    }
    if (x < padding) {
      x = padding;
    }

    // Clampeo estricto vertical
    if (y + menuHeight > viewportHeight - padding) {
      if (anchor === 'trigger') {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        y = Math.max(padding, rect.top - menuHeight - 6);
      } else {
        y = Math.max(padding, e.clientY - menuHeight - 6);
      }
    }

    setFloatingMenu({
      type,
      id: item.id,
      x,
      y,
      item,
    });
  };

  // Cierre reactivo al hacer scroll o cambiar tamaño de ventana
  useEffect(() => {
    if (!floatingMenu) return;
    const handleClose = () => setFloatingMenu(null);
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [floatingMenu]);

  // Modales de Edición y Adjuntar a Proyecto
  const [editingFolder, setEditingFolder] = useState<DocFolder | null>(null);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [assignProjectFolder, setAssignProjectFolder] = useState<DocFolder | null>(null);
  const [assignProjectDoc, setAssignProjectDoc] = useState<DocumentItem | null>(null);

  // Modales
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isSharePointInfoModalOpen, setIsSharePointInfoModalOpen] = useState(false);
  const [isSyncingSharepoint, setIsSyncingSharepoint] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Catálogos dinámicos editables por Inteckno
  const catalogCategories = useModuleCatalog('documentos', 'categories');
  const catalogDepartments = useModuleCatalog('documentos', 'departments');
  const catalogScopes = useModuleCatalog('documentos', 'scopes');
  const catalogFileTypes = useModuleCatalog('documentos', 'fileTypes');

  // Modo de subida manual clásico
  const [uploadMode, setUploadMode] = useState<'multiple_files' | 'sharepoint_link' | 'single_file'>('multiple_files');

  // Formulario nueva carpeta
  const [newFolderForm, setNewFolderForm] = useState({
    name: '',
    subtitle: '',
    scope: 'empresa' as 'empresa' | 'personal' | 'compartido',
    department: 'Operaciones' as CompanyDepartment,
    iconColor: '#00668F',
  });

  // Formulario nuevo documento (individual)
  const [uploadForm, setUploadForm] = useState({
    title: '',
    code: '',
    scope: 'empresa' as 'empresa' | 'personal' | 'compartido',
    department: 'Operaciones' as CompanyDepartment,
    projectCode: 'PRJ-2026-MED-K',
    folderName: 'Línea K - Metrocable Medellín',
    category: 'planos' as DocumentItem['category'],
    version: 'Rev. 0',
    fileType: 'PDF / CAD',
    fileSize: '4.8 MB',
    description: '',
    sharepointUrl: '',
    sharedWith: [] as string[],
  });

  // Estado para archivos múltiples seleccionados
  const [selectedBatchFiles, setSelectedBatchFiles] = useState<File[]>([]);
  const [batchScope, setBatchScope] = useState<'empresa' | 'personal' | 'compartido'>('empresa');
  const [batchDepartment, setBatchDepartment] = useState<CompanyDepartment>('Operaciones');
  const [batchFolderName, setBatchFolderName] = useState<string>('Línea K - Metrocable Medellín');

  // Estado para enlaces múltiples pegados
  const [batchLinksText, setBatchLinksText] = useState('');

  // URL base de SharePoint de la empresa
  const [sharePointOrgUrl, setSharePointOrgUrl] = useState(() => {
    return localStorage.getItem('inteckno_sp_url') || 'https://intecknosas.sharepoint.com';
  });

  // Client ID y Tenant ID de Azure para Microsoft Graph
  const [azureClientId, setAzureClientId] = useState(() => {
    return localStorage.getItem('inteckno_azure_client_id') || '6410d26a-faf8-4a55-8767-080c822e3b7f';
  });
  const [azureTenantId, setAzureTenantId] = useState(() => {
    return localStorage.getItem('inteckno_azure_tenant_id') || 'd9161e60-3df0-4633-b466-30d2d1db3bdd';
  });

  // Estado de token Microsoft 365
  const [isAuthenticatingM365, setIsAuthenticatingM365] = useState(false);
  const [hasM365Token, setHasM365Token] = useState(() => !!getM365Config().accessToken);

  // Conteo dinámico de documentos por vencer o vencidos
  const expiringDocsCount = useMemo(() => {
    return documents.filter((d) => {
      const st = d.status || calculateExpirationStatus(d.aiExtraction?.expirationDate);
      return st === 'por_vencer' || st === 'vencido';
    }).length;
  }, [documents]);

  // Helper para detectar formato, iconografía y badge de archivo
  const getFileVisualBadge = (doc: DocumentItem) => {
    const filename = (doc.title || '').toLowerCase();
    const ext = filename.includes('.')
      ? filename.split('.').pop() || ''
      : (doc.fileType || '').toLowerCase();

    if (ext.includes('xls') || ext.includes('sheet') || ext.includes('csv')) {
      return {
        label: 'EXCEL M365',
        badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800',
        iconBg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
        typeLabel: 'Hoja de Cálculo Excel',
        extension: '.xlsx',
        isExcel: true,
        isWord: false,
      };
    }
    if (ext.includes('doc')) {
      return {
        label: 'WORD M365',
        badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-800',
        iconBg: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        typeLabel: 'Documento Word',
        extension: '.docx',
        isExcel: false,
        isWord: true,
      };
    }
    if (ext.includes('pdf')) {
      return {
        label: 'PDF',
        badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-300 dark:border-rose-800',
        iconBg: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
        typeLabel: 'Documento PDF',
        extension: '.pdf',
        isExcel: false,
        isWord: false,
      };
    }
    if (ext.includes('dwg') || ext.includes('dxf') || ext.includes('cad')) {
      return {
        label: 'CAD',
        badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300 dark:border-purple-800',
        iconBg: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
        typeLabel: 'Plano Técnico CAD',
        extension: '.dwg',
        isExcel: false,
        isWord: false,
      };
    }
    return {
      label: (doc.fileType || 'DOC').toUpperCase().slice(0, 8),
      badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-300 dark:border-sky-800',
      iconBg: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
      typeLabel: doc.categoryLabel || 'Documento Técnico',
      extension: ext ? `.${ext}` : '',
      isExcel: false,
      isWord: false,
    };
  };

  // Helper para el Semáforo de Vencimientos
  const getDocumentStatusInfo = (doc: DocumentItem) => {
    const expirationDate = doc.aiExtraction?.expirationDate;
    const computedStatus = doc.status || calculateExpirationStatus(expirationDate);

    if (computedStatus === 'vencido') {
      return {
        status: 'vencido' as const,
        label: 'VENCIDO',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800',
        dotClass: 'bg-rose-500',
        text: expirationDate ? `Venció: ${expirationDate}` : 'Vencido',
      };
    }
    if (computedStatus === 'por_vencer') {
      return {
        status: 'por_vencer' as const,
        label: 'POR VENCER',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-800',
        dotClass: 'bg-amber-500 animate-pulse',
        text: expirationDate ? `Vence: ${expirationDate}` : 'Por vencer (<30d)',
      };
    }
    if (expirationDate) {
      return {
        status: 'activo' as const,
        label: 'VIGENTE',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800',
        dotClass: 'bg-emerald-500',
        text: `Vigente hasta ${expirationDate}`,
      };
    }
    return {
      status: 'activo' as const,
      label: 'ACTIVO',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
      dotClass: 'bg-slate-400',
      text: 'Sin vencimiento',
    };
  };

  // Carga inteligente completada con Gemini
  const handleAiDocumentExtracted = (data: any) => {
    const targetFolder = activeFolder || allFolders[0];
    const newDocCode = `DOC-${Date.now().toString().slice(-4)}`;

    addDocument({
      title: data.title || 'Documento Técnico STC',
      code: newDocCode,
      category: data.category || 'manuales_stc',
      categoryLabel: data.categoryLabel || 'Documentación Técnica',
      fileSize: data.fileSize || '2.0 MB',
      fileType: data.fileType || 'PDF',
      uploadedBy: currentUser.name,
      projectCode: data.projectCode || targetFolder.projectCode || 'PRJ-CORP',
      projectName: data.projectName || targetFolder.name,
      folderName: targetFolder.name,
      sharepointUrl:
        data.source === 'sharepoint_m365'
          ? `${sharePointOrgUrl}/${encodeURIComponent(targetFolder.name.replace(/\s+/g, '_'))}/${encodeURIComponent(data.title)}`
          : undefined,
      sharepointWebUrl:
        data.source === 'sharepoint_m365'
          ? `${sharePointOrgUrl}/${encodeURIComponent(targetFolder.name.replace(/\s+/g, '_'))}/${encodeURIComponent(data.title)}`
          : undefined,
      scope: activeTab === 'mi_unidad' ? 'personal' : activeTab === 'compartido' ? 'compartido' : 'empresa',
      department: data.department || targetFolder.department || 'Operaciones',
      source: data.source || 'sharepoint_m365',
      status: data.status || 'activo',
      version: data.version || 'Rev. 0',
      description: data.description || data.aiExtraction?.summary,
      aiExtraction: data.aiExtraction,
      linkedEntities: data.linkedEntities,
    });

    setSyncToastMessage(
      `¡Documento analizado e indexado con éxito! "${data.title}" (${data.aiExtraction?.confidenceScore || 96}% confianza IA).`
    );
  };

  // Iniciar asistente inteligente LUC-IA-NA con documento
  const handleOpenDocAssistant = (doc: DocumentItem) => {
    setChatDoc(doc);
    setChatQuestions([
      {
        id: `init-${Date.now()}`,
        sender: 'gemini',
        text: `¡Hola! Soy LUC-IA-NA 🌼, tu compañera y asistente inteligente para este documento ("${doc.title}").\n\nPuedo explicarte de forma muy sencilla y clara de qué trata, qué fechas o vencimientos tiene, qué tareas o pasos hay que seguir, o los detalles técnicos si los necesitas.\n\n¿Qué te gustaría saber o qué duda tienes?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // Enviar pregunta al documento
  const handleSendChatQuestion = async (customQuestion?: string) => {
    const questionText = (customQuestion || chatInput).trim();
    if (!questionText || !chatDoc || isAskingGemini) return;

    const userMsg = {
      id: `chat-${Date.now()}`,
      sender: 'user' as const,
      text: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatQuestions((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsAskingGemini(true);

    try {
      const response = await askDocumentQuestion({
        documentTitle: chatDoc.title,
        documentCategory: chatDoc.categoryLabel || chatDoc.category,
        documentSummary: chatDoc.aiExtraction?.summary || chatDoc.description,
        documentMetadata: chatDoc.aiExtraction,
        question: questionText,
      });

      const geminiMsg = {
        id: `gemini-${Date.now()}`,
        sender: 'gemini' as const,
        text: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatQuestions((prev) => [...prev, geminiMsg]);
    } catch (err: any) {
      const errMsg = {
        id: `err-${Date.now()}`,
        sender: 'gemini' as const,
        text: `Error al consultar con Gemini: ${err.message || 'Error de red o clave API inválida'}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatQuestions((prev) => [...prev, errMsg]);
    } finally {
      setIsAskingGemini(false);
    }
  };

  // Guardar nueva versión de ingeniería
  const handleSaveNewVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!versionTargetDoc || !newVersionTag.trim()) return;

    const currentHistory = versionTargetDoc.versionHistory || [];
    const prevEntry = {
      version: versionTargetDoc.version || 'Rev. 0',
      date: versionTargetDoc.date,
      uploadedBy: versionTargetDoc.uploadedBy,
      notes: newVersionNotes || 'Revisión previa de ingeniería.',
      fileSize: versionTargetDoc.fileSize,
      sharepointWebUrl: versionTargetDoc.sharepointWebUrl || versionTargetDoc.sharepointUrl,
    };

    const updatedHistory = [prevEntry, ...currentHistory];

    updateDocument(versionTargetDoc.id, {
      version: newVersionTag.trim(),
      date: new Date().toISOString().split('T')[0],
      uploadedBy: currentUser.name,
      versionHistory: updatedHistory,
    });

    if (previewDoc && previewDoc.id === versionTargetDoc.id) {
      setPreviewDoc({
        ...previewDoc,
        version: newVersionTag.trim(),
        date: new Date().toISOString().split('T')[0],
        uploadedBy: currentUser.name,
        versionHistory: updatedHistory,
      });
    }

    setSyncToastMessage(
      `¡Nueva versión ${newVersionTag.trim()} registrada! Se preservó el historial anterior.`
    );
    setIsVersionModalOpen(false);
    setVersionTargetDoc(null);
    setNewVersionTag('');
    setNewVersionNotes('');
  };

  // Helper para saber si un documento pertenece de forma exacta a una carpeta
  const docBelongsToFolder = (doc: DocumentItem, folder: DocFolder): boolean => {
    if ((doc as any).folderId && (doc as any).folderId === folder.id) return true;

    if (doc.folderName) {
      const docFold = doc.folderName.trim().toLowerCase();
      const targetFold = folder.name.trim().toLowerCase();

      if (docFold === targetFold) return true;
      if (docFold.includes('línea k') && targetFold.includes('línea k')) return true;
      if (docFold.includes('transmicable') && targetFold.includes('transmicable')) return true;
      if (docFold.includes('cablebús') && targetFold.includes('cablebús')) return true;
      if (docFold.includes('aerovía') && targetFold.includes('aerovía')) return true;
      if (
        (docFold.includes('repositorio corporativo') || docFold.includes('normativa stc')) &&
        (targetFold.includes('repositorio corporativo') || targetFold.includes('normativa stc'))
      ) return true;
      if (docFold.includes('operaciones') && targetFold.includes('operaciones')) return true;
      if (docFold.includes('hseq') && targetFold.includes('hseq')) return true;
      if (docFold.includes('comercial') && targetFold.includes('comercial')) return true;
      if (docFold.includes('administrativ') && targetFold.includes('administrativ')) return true;
      if (docFold.includes('sistema') && targetFold.includes('sistema')) return true;
      if (docFold.includes('campo') && targetFold.includes('campo')) return true;
      if (docFold.includes('informes') && targetFold.includes('informes')) return true;
      if (docFold.includes('certificaciones') && targetFold.includes('certificaciones')) return true;
      if (docFold.includes('compartidos') && targetFold.includes('compartidos')) return true;

      return false;
    }

    if (folder.projectCode && doc.projectCode && folder.projectCode === doc.projectCode) {
      return true;
    }

    if (!folder.projectCode && folder.department && doc.department === folder.department) {
      return true;
    }

    return false;
  };

  // Conteo de documentos por carpeta
  const getDocumentCountForFolder = (folder: DocFolder): number => {
    return documents.filter((d) => {
      if (folder.scope === 'personal') {
        const isMyDoc = d.uploadedBy === currentUser.name || d.scope === 'personal';
        return isMyDoc && docBelongsToFolder(d, folder);
      }
      if (folder.scope === 'compartido') {
        const isShared =
          d.scope === 'compartido' ||
          (d.sharedWith && (d.sharedWith.includes(currentUser.name) || d.sharedWith.includes(currentUser.id)));
        return isShared && docBelongsToFolder(d, folder);
      }
      return docBelongsToFolder(d, folder);
    }).length;
  };

  // Carpetas visibles
  const visibleFolders = useMemo(() => {
    if (activeTab === 'vencimientos_hseq') return [];

    return allFolders.filter((f) => {
      if (activeTab === 'empresa') {
        if (f.scope !== 'empresa') return false;
        if (selectedArea !== 'all' && f.department !== selectedArea) return false;
      } else if (activeTab === 'mi_unidad') {
        if (f.scope !== 'personal') return false;
      } else if (activeTab === 'compartido') {
        if (f.scope !== 'compartido') return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = f.name.toLowerCase().includes(q);
        const matchSub = f.subtitle.toLowerCase().includes(q);
        const matchDept = f.department?.toLowerCase().includes(q);
        const matchPrj = f.projectCode?.toLowerCase().includes(q);
        if (!matchName && !matchSub && !matchDept && !matchPrj) return false;
      }

      return true;
    });
  }, [allFolders, activeTab, selectedArea, searchQuery]);

  // Documentos visibles con filtros combinados
  const visibleDocuments = useMemo(() => {
    const seenTitles = new Set<string>();

    return documents.filter((doc) => {
      // Deduplicación estricta de títulos idénticos
      const cleanTitle = (doc.title || '').trim().toLowerCase();
      if (cleanTitle && seenTitles.has(cleanTitle)) return false;
      if (cleanTitle) seenTitles.add(cleanTitle);

      // Filtro de origen de almacenamiento
      if (selectedStorageSource !== 'todos') {
        if (selectedStorageSource === 'sharepoint_m365') {
          if (doc.source && doc.source !== 'sharepoint_m365' && doc.source !== 'onedrive' && !doc.sharepointUrl) {
            return false;
          }
        } else if (selectedStorageSource === 'firebase_storage') {
          if (doc.source !== 'firebase_storage' && doc.source !== 'local_upload') {
            return false;
          }
        }
      }

      // Filtro de Proyecto STC
      if (selectedProjectFilter !== 'todos') {
        if (doc.projectCode !== selectedProjectFilter) return false;
      }

      // Vista Especial: SEMÁFORO DE VENCIMIENTOS & HSEQ
      if (activeTab === 'vencimientos_hseq') {
        const statusInfo = getDocumentStatusInfo(doc);

        if (selectedVencimientoFilter === 'vencidos' && statusInfo.status !== 'vencido') return false;
        if (selectedVencimientoFilter === 'por_vencer' && statusInfo.status !== 'por_vencer') return false;
        if (selectedVencimientoFilter === 'vigentes' && (statusInfo.status !== 'activo' || !doc.aiExtraction?.expirationDate)) return false;

        // Si es 'todos', mostrar los que tienen fecha de expiración o están en categoría HSEQ/END
        if (selectedVencimientoFilter === 'todos') {
          const hasDate = Boolean(doc.aiExtraction?.expirationDate);
          const isHseq = doc.category === 'certificados_hseq' || doc.department === 'HSEQ';
          if (!hasDate && !isHseq) return false;
        }
      } else {
        // Vistas estándar por pestaña
        if (selectedFolderId) {
          const folder = allFolders.find((f) => f.id === selectedFolderId);
          if (!folder || !docBelongsToFolder(doc, folder)) return false;
        } else {
          if (activeTab === 'empresa') {
            const isEmpresaDoc = doc.scope === 'empresa' || (!doc.scope && doc.projectCode);
            if (!isEmpresaDoc) return false;
            if (selectedArea !== 'all' && doc.department && doc.department !== selectedArea) return false;
          } else if (activeTab === 'mi_unidad') {
            const isMyDoc = doc.uploadedBy === currentUser.name || doc.scope === 'personal';
            if (!isMyDoc) return false;
          } else if (activeTab === 'compartido') {
            const isShared =
              doc.scope === 'compartido' ||
              (doc.sharedWith &&
                (doc.sharedWith.includes(currentUser.name) || doc.sharedWith.includes(currentUser.id))) ||
              (doc.uploadedBy !== currentUser.name && doc.scope !== 'personal');
            if (!isShared) return false;
          }
        }
      }

      // Filtro de Búsqueda
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = doc.title.toLowerCase().includes(q);
        const matchCode = doc.code.toLowerCase().includes(q);
        const matchAuthor = doc.uploadedBy.toLowerCase().includes(q);
        const matchDept = doc.department?.toLowerCase().includes(q);
        const matchFolder = doc.folderName?.toLowerCase().includes(q);
        const matchPrj = doc.projectName?.toLowerCase().includes(q);
        const matchCat = doc.categoryLabel?.toLowerCase().includes(q);
        const matchEntity = doc.aiExtraction?.issuingEntity?.toLowerCase().includes(q);
        const matchLocation = doc.aiExtraction?.locationTower?.toLowerCase().includes(q);

        if (
          !matchTitle &&
          !matchCode &&
          !matchAuthor &&
          !matchDept &&
          !matchFolder &&
          !matchPrj &&
          !matchCat &&
          !matchEntity &&
          !matchLocation
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    documents,
    allFolders,
    activeTab,
    selectedArea,
    selectedFolderId,
    selectedStorageSource,
    selectedProjectFilter,
    selectedVencimientoFilter,
    searchQuery,
    currentUser,
  ]);

  const activeFolder = useMemo(() => {
    return selectedFolderId ? allFolders.find((f) => f.id === selectedFolderId) : null;
  }, [selectedFolderId, allFolders]);

  // Manejo de apertura de subida
  const handleOpenUpload = (folder?: DocFolder) => {
    const defaultCode = `DOC-${Date.now().toString().slice(-4)}`;
    const targetFolder = folder || activeFolder || allFolders[0];

    const currentScope =
      activeTab === 'mi_unidad'
        ? 'personal'
        : activeTab === 'compartido'
        ? 'compartido'
        : targetFolder.scope;

    setUploadForm({
      title: '',
      code: defaultCode,
      scope: currentScope,
      department: targetFolder.department || 'Operaciones',
      projectCode: targetFolder.projectCode || 'PRJ-2026-MED-K',
      folderName: targetFolder.name,
      category: 'planos',
      version: 'Rev. 0',
      fileType: 'PDF / CAD',
      fileSize: '4.8 MB',
      description: '',
      sharepointUrl: `${sharePointOrgUrl}/${targetFolder.name.replace(/\s+/g, '_')}/${defaultCode}.pdf`,
      sharedWith: [],
    });

    setBatchScope(currentScope);
    setBatchDepartment(targetFolder.department || 'Operaciones');
    setBatchFolderName(targetFolder.name);
    setSelectedBatchFiles([]);
    setBatchLinksText('');
    setIsUploadModalOpen(true);
  };

  // Guardar documento individual clásico
  const handleSaveSingleDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.code) return;

    const finalSharePointUrl =
      uploadForm.sharepointUrl.trim() ||
      `${sharePointOrgUrl}/${uploadForm.folderName.replace(/\s+/g, '_')}/${uploadForm.code}`;

    addDocument({
      title: uploadForm.title,
      code: uploadForm.code,
      projectCode: uploadForm.projectCode,
      projectName: uploadForm.folderName,
      category: uploadForm.category,
      categoryLabel:
        uploadForm.category === 'planos'
          ? 'Planos y Esquemas CAD'
          : uploadForm.category === 'certificados_hseq'
          ? 'Certificaciones HSEQ / SST'
          : uploadForm.category === 'manuales_stc'
          ? 'Manuales y Protocolos STC'
          : uploadForm.category === 'pliegos_licitacion'
          ? 'Pliegos y Licitación'
          : uploadForm.category === 'actas_contratos'
          ? 'Actas de Entrega & Cobro 48h'
          : 'Documentación Técnica',
      version: uploadForm.version,
      fileType: uploadForm.fileType,
      fileSize: uploadForm.fileSize,
      description: uploadForm.description,
      uploadedBy: currentUser.name,
      sharepointFolder: `/${uploadForm.folderName.replace(/\s+/g, '_')}`,
      sharepointUrl: finalSharePointUrl,
      sharepointWebUrl: finalSharePointUrl,
      scope: uploadForm.scope,
      department: uploadForm.department,
      sharedWith: uploadForm.sharedWith,
      folderName: uploadForm.folderName,
      source: 'sharepoint_m365',
      status: 'activo',
    });

    setIsUploadModalOpen(false);
  };

  // Crear nueva carpeta personalizada
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderForm.name.trim()) return;

    const newFolder: DocFolder = {
      id: `custom-f-${Date.now()}`,
      name: newFolderForm.name.trim(),
      subtitle: newFolderForm.subtitle.trim() || `Carpeta de ${newFolderForm.department || 'Área'}`,
      scope: newFolderForm.scope,
      department: newFolderForm.department,
      iconColor: newFolderForm.iconColor,
      isCustom: true,
    };

    const updated = [...customFolders, newFolder];
    setCustomFolders(updated);
    try {
      localStorage.setItem('inteckno_custom_folders', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }

    setNewFolderForm({
      name: '',
      subtitle: '',
      scope: 'empresa',
      department: 'Operaciones',
      iconColor: '#00668F',
    });
    setIsNewFolderModalOpen(false);
    setSelectedFolderId(newFolder.id);
  };

  // Manejadores de acciones sobre carpetas (Eliminar, Favoritos, Editar, Adjuntar a Proyecto)
  const handleDeleteFolder = (folderId: string, folderName: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la carpeta "${folderName}"?`)) return;

    // Si es una carpeta custom, la quitamos de customFolders
    const updatedCustom = customFolders.filter((f) => f.id !== folderId);
    if (updatedCustom.length !== customFolders.length) {
      setCustomFolders(updatedCustom);
      try {
        localStorage.setItem('inteckno_custom_folders', JSON.stringify(updatedCustom));
      } catch (e) {
        console.error(e);
      }
    }

    // Registrar en deletedFolderIds para ocultarla permanentemente
    const updatedDeleted = Array.from(new Set([...deletedFolderIds, folderId]));
    setDeletedFolderIds(updatedDeleted);
    try {
      localStorage.setItem('inteckno_deleted_folders', JSON.stringify(updatedDeleted));
    } catch (e) {
      console.error(e);
    }

    if (selectedFolderId === folderId) {
      setSelectedFolderId(null);
    }
    setActiveMenuFolderId(null);
  };

  const handleToggleFavoriteFolder = (folder: DocFolder) => {
    const newFav = !folder.isFavorite;
    const updatedOverrides = {
      ...folderOverrides,
      [folder.id]: { ...(folderOverrides[folder.id] || {}), isFavorite: newFav },
    };
    setFolderOverrides(updatedOverrides);
    try {
      localStorage.setItem('inteckno_folder_overrides', JSON.stringify(updatedOverrides));
    } catch (e) {
      console.error(e);
    }
    setActiveMenuFolderId(null);
  };

  const handleSaveEditFolder = (folderId: string, updatedData: Partial<DocFolder>) => {
    const updatedOverrides = {
      ...folderOverrides,
      [folderId]: { ...(folderOverrides[folderId] || {}), ...updatedData },
    };
    setFolderOverrides(updatedOverrides);
    try {
      localStorage.setItem('inteckno_folder_overrides', JSON.stringify(updatedOverrides));
    } catch (e) {
      console.error(e);
    }
    setEditingFolder(null);
  };

  const handleAttachFolderToProject = (folderId: string, projectCode: string) => {
    const updatedOverrides = {
      ...folderOverrides,
      [folderId]: { ...(folderOverrides[folderId] || {}), projectCode },
    };
    setFolderOverrides(updatedOverrides);
    try {
      localStorage.setItem('inteckno_folder_overrides', JSON.stringify(updatedOverrides));
    } catch (e) {
      console.error(e);
    }
    setAssignProjectFolder(null);
  };

  // Manejadores de acciones sobre documentos (Favoritos, Adjuntar a Proyecto)
  const handleToggleFavoriteDoc = (doc: DocumentItem) => {
    updateDocument(doc.id, { isFavorite: !doc.isFavorite });
    setActiveMenuDocId(null);
  };

  const handleAttachDocToProject = (docId: string, projectCode: string, projectName?: string) => {
    updateDocument(docId, {
      projectCode,
      projectName,
      linkedEntities: { projectId: projectCode },
    });
    setAssignProjectDoc(null);
  };

  // Sincronización SharePoint
  const handleSyncSharePoint = async () => {
    setIsSyncingSharepoint(true);
    let cfg = getM365Config();

    if (!cfg.accessToken || isM365TokenExpired()) {
      try {
        saveM365Config({ clientId: azureClientId, tenantId: azureTenantId });
        await openMicrosoftAuthPopup();
        cfg = getM365Config();
        setHasM365Token(true);
      } catch (authErr: any) {
        setIsSyncingSharepoint(false);
        setIsSharePointInfoModalOpen(true);
        setSyncToastMessage('Configuración de Azure Entra ID requerida (Revisar Redirect URI).');
        return;
      }
    }

    let res = await fetchSharePointFilesFromGraph();
    setIsSyncingSharepoint(false);

    if (res.success && res.files) {
      setSyncToastMessage(`¡Sincronización exitosa! ${res.files.length} archivos verificados en SharePoint.`);
    } else {
      setIsSharePointInfoModalOpen(true);
      setSyncToastMessage(`Aviso de SharePoint: ${res.message || 'Verifica la configuración de Azure Entra ID'}.`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* NOTIFICACIÓN FLOTANTE / TOAST */}
      {syncToastMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{syncToastMessage}</span>
          </div>
          <button onClick={() => setSyncToastMessage(null)} className="text-emerald-700 hover:text-emerald-950">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ORGANIZADOR PRINCIPAL Y BARRA BUSCADORA UNIFICADA */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        
        {/* Selector de Ámbito Principal y Acciones */}
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 w-full min-w-0 pb-1">
          <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl overflow-x-auto max-w-full min-w-0">
            <button
              onClick={() => {
                setActiveTab('todos');
                setSelectedFolderId(null);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0 ${
                activeTab === 'todos'
                  ? 'bg-white dark:bg-slate-900 text-[#00668F] dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Folder size={14} className="shrink-0" />
              <span className="truncate">TODOS</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('empresa');
                setSelectedFolderId(null);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0 ${
                activeTab === 'empresa'
                  ? 'bg-white dark:bg-slate-900 text-[#00668F] dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 size={14} className="shrink-0" />
              <span className="truncate">EMPRESA</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('mi_unidad');
                setSelectedFolderId(null);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0 ${
                activeTab === 'mi_unidad'
                  ? 'bg-white dark:bg-slate-900 text-[#00668F] dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User size={14} className="shrink-0" />
              <span className="truncate">MI UNIDAD</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('compartido');
                setSelectedFolderId(null);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center shrink-0 ${
                activeTab === 'compartido'
                  ? 'bg-white dark:bg-slate-900 text-[#00668F] dark:text-sky-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users size={14} className="shrink-0" />
              <span className="truncate">COMPARTIDO</span>
            </button>

            {/* PESTAÑA: SEMÁFORO DE VENCIMIENTOS CRÍTICOS Y SST */}
            <button
              onClick={() => {
                setActiveTab('vencimientos_hseq');
                setSelectedFolderId(null);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer text-center relative shrink-0 ${
                activeTab === 'vencimientos_hseq'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs border border-amber-200 dark:border-amber-900/50'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield size={14} className="text-amber-500 shrink-0" />
              <span className="truncate">VENCIMIENTOS & SST</span>
              {expiringDocsCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white shrink-0 animate-pulse">
                  {expiringDocsCount}
                </span>
              )}
            </button>
          </div>

          {/* BARRA BUSCADORA Y ACCIONES COMPACTAS */}
          <div className="flex items-center gap-2 w-full 2xl:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64">
              <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por plano, equipo..."
                className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-none shadow-2xs transition-all border border-transparent focus:border-[#00668F]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <AiDocumentUploader
              docType="ecm_general"
              onExtracted={handleAiDocumentExtracted}
              contextProjectCode={activeFolder?.projectCode}
              contextFolderName={activeFolder?.name}
              buttonLabel="Cargar con IA"
            />

            <button
              onClick={handleSyncSharePoint}
              disabled={isSyncingSharepoint}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              title="Sincronizar SharePoint"
            >
              <RefreshCw size={14} className={isSyncingSharepoint ? 'animate-spin text-[#00668F]' : 'text-slate-600 dark:text-slate-300'} />
            </button>

            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              title="Configuración de catálogos"
            >
              <Settings size={14} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* FILTROS SECUNDARIOS HÍBRIDOS (Proyecto STC, Origen y Semáforo) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro por Proyecto STC */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <Building2 size={13} className="text-[#00668F] shrink-0" />
              <span className="text-[11px] font-medium text-slate-500">Proyecto:</span>
              <div className="w-56">
                <CreatableSelect
                  value={selectedProjectFilter}
                  options={[
                    { id: 'todos', name: 'Todos los Proyectos STC' },
                    { id: 'DOCS-CORP', name: 'DOCS-CORP (Normativa STC)' },
                    ...projects.map((p) => ({
                      id: p.code,
                      name: `${p.code} (${p.name})`,
                    })),
                  ]}
                  onChange={(val) => setSelectedProjectFilter(val || 'todos')}
                  placeholder="Proyecto..."
                  
                />
              </div>
            </div>

            {/* Filtro por Origen de Almacenamiento */}
            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <Cloud size={13} className="text-[#0078D4] shrink-0" />
              <span className="text-[11px] font-medium text-slate-500">Origen:</span>
              <div className="w-52">
                <CreatableSelect
                  value={selectedStorageSource}
                  options={[
                    { id: 'todos', name: 'Todos los Orígenes' },
                    { id: 'sharepoint_m365', name: 'SharePoint / OneDrive (M365)' },
                    { id: 'firebase_storage', name: 'Almacenamiento Local / Firebase' },
                  ]}
                  onChange={(val) => setSelectedStorageSource((val as any) || 'todos')}
                  placeholder="Origen..."
                  
                />
              </div>
            </div>
          </div>

          {/* Si está en la pestaña Vencimientos & HSEQ: Filtros del Semáforo */}
          {activeTab === 'vencimientos_hseq' && (
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setSelectedVencimientoFilter('todos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedVencimientoFilter === 'todos'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedVencimientoFilter('vencidos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedVencimientoFilter === 'vencidos'
                    ? 'bg-rose-500 text-white shadow-2xs'
                    : 'text-rose-600 hover:bg-rose-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span>Vencidos</span>
              </button>
              <button
                onClick={() => setSelectedVencimientoFilter('por_vencer')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedVencimientoFilter === 'por_vencer'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-amber-600 hover:bg-amber-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Por Vencer (&lt;30d)</span>
              </button>
              <button
                onClick={() => setSelectedVencimientoFilter('vigentes')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedVencimientoFilter === 'vigentes'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Vigentes</span>
              </button>
            </div>
          )}
        </div>

        {/* DESPLIEGUE DE ÁREAS DE LA EMPRESA (Solo cuando pestaña es EMPRESA) */}
        {activeTab === 'empresa' && (
          <div className="pt-2 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} className="text-[#00668F]" />
                <span>Áreas de la Empresa INTECKNO:</span>
              </span>
              {selectedArea !== 'all' && (
                <button
                  onClick={() => setSelectedArea('all')}
                  className="text-[11px] font-bold text-[#00668F] hover:underline cursor-pointer"
                >
                  Ver todas las áreas
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {COMPANY_AREAS.map((area) => (
                <button
                  key={area.id}
                  onClick={() => {
                    setSelectedArea(area.id);
                    setSelectedFolderId(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedArea === area.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  <span>{area.icon}</span>
                  <span>{area.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BREADCRUMB / NAVEGACIÓN DENTRO DE CARPETA SELECCIONADA */}
        {activeFolder ? (
          <div className="p-3 bg-sky-50/70 dark:bg-sky-950/30 rounded-2xl flex items-center justify-between gap-3 animate-in fade-in duration-150 border border-sky-100 dark:border-sky-900/50">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setSelectedFolderId(null)}
                className="p-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                title="Volver al visor de carpetas"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">Volver</span>
              </button>

              <div className="flex items-center gap-1.5 text-xs truncate">
                <span
                  onClick={() => setSelectedFolderId(null)}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium"
                >
                  Carpetas
                </span>
                <ChevronRight size={14} className="text-slate-400 shrink-0" />
                <span className="font-black text-[#00668F] dark:text-sky-400 truncate flex items-center gap-1.5">
                  <Folder size={14} style={{ color: activeFolder.iconColor }} />
                  {activeFolder.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleOpenUpload(activeFolder)}
                className="px-3.5 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <UploadCloud size={14} />
                <span>Cargar en esta carpeta</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {/* SECCIÓN 1: GRILLA DE CARPETAS (Solo cuando no estamos en pestaña de Vencimientos ni dentro de una carpeta) */}
      {!selectedFolderId && activeTab !== 'vencimientos_hseq' && (
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Folder size={15} className="text-[#00668F]" />
              <span>
                {activeTab === 'todos'
                  ? 'Todas las Carpetas'
                  : activeTab === 'empresa'
                  ? selectedArea === 'all'
                    ? 'Carpetas de la Empresa'
                    : `Carpetas del Área: ${selectedArea}`
                  : activeTab === 'mi_unidad'
                  ? 'Carpetas en Mi Unidad'
                  : 'Carpetas Compartidas'}
                {' '}({visibleFolders.length})
              </span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewFolderModalOpen(true)}
                className="text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-colors shadow-2xs"
                title="Crear una nueva carpeta personalizada para el ERP y SharePoint"
              >
                <FolderPlus size={14} className="text-[#00668F]" />
                <span>Nueva Carpeta</span>
              </button>

              <button
                onClick={() => handleOpenUpload()}
                className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer bg-[#00668F] hover:bg-[#005273] px-3.5 py-1.5 rounded-xl transition-colors shadow-xs active:scale-95"
              >
                <UploadCloud size={14} />
                <span>Subida Manual</span>
              </button>
            </div>
          </div>

          {visibleFolders.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {visibleFolders.map((folder) => {
                const count = getDocumentCountForFolder(folder);

                return (
                  <div
                    key={folder.id}
                    onClick={() => {
                      if (floatingMenu) {
                        setFloatingMenu(null);
                        return;
                      }
                      setSelectedFolderId(folder.id);
                    }}
                    onContextMenu={(e) => openFloatingMenu(e, 'folder', folder, 'cursor')}
                    className="relative p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-2xs flex flex-col justify-between min-h-[95px] group active:scale-[0.99] border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 relative"
                          style={{ backgroundColor: `${folder.iconColor}15`, color: folder.iconColor }}
                        >
                          <Folder size={20} />
                          {folder.isFavorite && (
                            <Star size={10} className="absolute -top-1 -right-1 text-amber-500 fill-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4
                            className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-1 group-hover:text-[#00668F] dark:group-hover:text-sky-400 transition-colors flex items-center gap-1"
                            title={folder.name}
                          >
                            <span>{folder.name}</span>
                          </h4>
                          <span className="text-[10px] text-slate-400 block truncate">
                            {folder.projectCode ? `Proyecto: ${folder.projectCode}` : folder.department ? `Área ${folder.department}` : folder.subtitle}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-2xs">
                          {count}
                        </span>

                        {/* Botón de 3 puntos */}
                        <button
                          type="button"
                          onClick={(e) => openFloatingMenu(e, 'folder', folder, 'trigger')}
                          title="Opciones de carpeta"
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                        >
                          <MoreVertical size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2">
                      <span className="truncate">{folder.subtitle}</span>
                      <ChevronRight size={14} className="text-slate-400 group-hover:text-[#00668F] transition-colors shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
              <Folder size={32} className="mx-auto mb-1.5 opacity-40" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No hay carpetas que coincidan con la búsqueda</p>
              <p className="text-[11px] mt-0.5">Puedes crear una nueva carpeta con el botón "+ Nueva Carpeta".</p>
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN 2: LISTADO DE DOCUMENTOS & TABLEROS TÉCNICOS */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-[24px] shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText size={16} className="text-[#00668F]" />
              <span>
                {activeTab === 'vencimientos_hseq' ? (
                  <>
                    Semáforo de Vencimientos Críticos & HSEQ{' '}
                    <span className="text-xs font-normal text-slate-400">
                      (Calibraciones END, Cursos de Alturas, Pólizas)
                    </span>
                  </>
                ) : activeFolder ? (
                  <>
                    Archivos en: <span className="text-[#00668F] dark:text-sky-400 font-black">{activeFolder.name}</span>
                  </>
                ) : activeTab === 'todos' ? (
                  'Catálogo General de Documentos Técnicos'
                ) : activeTab === 'empresa' ? (
                  selectedArea === 'all'
                    ? 'Documentos de la Empresa'
                    : `Documentos de ${selectedArea}`
                ) : activeTab === 'mi_unidad' ? (
                  'Mis Documentos Personales'
                ) : (
                  'Documentos Compartidos Conmigo'
                )}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {visibleDocuments.length} documentos indexados con soporte híbrido SharePoint M365 + Local/Firebase.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenUpload(activeFolder || undefined)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UploadCloud size={14} />
              <span>Subida Manual</span>
            </button>
          </div>
        </div>

        {visibleDocuments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {visibleDocuments.map((doc) => {
              const isMine = doc.uploadedBy === currentUser.name;
              const fileBadge = getFileVisualBadge(doc);
              const statusInfo = getDocumentStatusInfo(doc);
              const hasCleanCode =
                doc.code && !doc.code.startsWith('SP-') && !doc.code.startsWith('DOC-SP-');

              return (
                <div
                  key={`${doc.id}-${doc.title}`}
                  onClick={() => {
                    if (floatingMenu) {
                      setFloatingMenu(null);
                      return;
                    }
                    setPreviewDoc(doc);
                  }}
                  onContextMenu={(e) => openFloatingMenu(e, 'doc', doc, 'cursor')}
                  className="relative p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100/90 dark:hover:bg-slate-800/80 transition-all cursor-pointer shadow-2xs hover:shadow-md flex flex-col justify-between space-y-3 group border border-slate-200/80 dark:border-slate-700/60"
                >
                  {/* Fila superior: Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs mt-0.5 ${fileBadge.iconBg}`}
                        >
                          {fileBadge.isExcel ? (
                            <FileSpreadsheet size={18} />
                          ) : fileBadge.label === 'CAD' ? (
                            <Layers size={18} />
                          ) : (
                            <FileText size={18} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${fileBadge.badgeBg}`}>
                              {fileBadge.label}
                            </span>
                            {hasCleanCode && (
                              <span className="text-[10px] font-mono font-bold text-[#00668F] dark:text-sky-400">
                                {doc.code}
                              </span>
                            )}
                            <span className="text-[9px] font-semibold bg-white dark:bg-slate-900 px-1.5 py-0.2 rounded-md text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              {doc.version || 'Rev. 0'}
                            </span>

                            {doc.isFavorite && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                <Star size={10} className="fill-amber-500 text-amber-500" />
                                <span>Favorito</span>
                              </span>
                            )}

                            {/* Badge del Semáforo de Vencimientos */}
                            {doc.aiExtraction?.expirationDate && (
                              <span
                                className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1 border ${statusInfo.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dotClass}`} />
                                <span>{statusInfo.label}</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-[#00668F] dark:group-hover:text-sky-400 transition-colors leading-snug line-clamp-2 mt-1.5 break-words">
                            {doc.title}
                          </h4>
                        </div>
                      </div>
                    </div>

                    {/* Resumen o viñetas de Gemini si existen */}
                    {doc.aiExtraction?.summary && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 italic bg-white/60 dark:bg-slate-900/40 p-2 rounded-xl border border-slate-200/50 dark:border-slate-800">
                        "{doc.aiExtraction.summary}"
                      </p>
                    )}

                    {/* Mini Tablero de Métricas Técnicas (Excel) */}
                    {doc.aiExtraction?.keyMetrics && doc.aiExtraction.keyMetrics.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        {doc.aiExtraction.keyMetrics.slice(0, 2).map((m, idx) => (
                          <div
                            key={idx}
                            className={`p-1.5 rounded-lg border text-[10px] ${
                              m.status === 'critico'
                                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300 font-bold'
                                : m.status === 'alerta'
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-300 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            <span className="text-[9px] text-slate-400 block truncate">{m.label}</span>
                            <span className="font-mono font-bold">{m.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Metadatos inferiores */}
                  <div className="space-y-1 pt-1 text-[11px] text-slate-500 border-t border-slate-200/60 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium text-[10px] border border-slate-200 dark:border-slate-700">
                        {doc.department ? `${doc.department} • ` : ''}
                        {doc.categoryLabel}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{doc.fileSize}</span>
                    </div>

                    {/* Ubicación / Pilona / Emisor si fue detectado por Gemini */}
                    {(doc.aiExtraction?.locationTower || doc.aiExtraction?.issuingEntity) && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                        <span className="truncate">
                          📍 {doc.aiExtraction.locationTower || doc.aiExtraction.issuingEntity}
                        </span>
                        {doc.projectCode && (
                          <span className="font-mono text-sky-700 dark:text-sky-300">
                            {doc.projectCode}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                      <span className="truncate">
                        {isMine ? 'Subido por mí' : `Por: ${doc.uploadedBy}`}
                      </span>
                      <span>{doc.date}</span>
                    </div>
                  </div>

                  {/* Acciones Rápidas */}
                  <div
                    className="pt-2 flex items-center justify-between text-[11px] border-t border-slate-200/60 dark:border-slate-800"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Botón Asistente IA */}
                    <button
                      type="button"
                      onClick={() => handleOpenDocAssistant(doc)}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 text-[#00668F] dark:text-sky-300 font-bold transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
                      title="Hacer consultas técnicas a este documento con Gemini"
                    >
                      <Sparkles size={12} className="text-amber-500" />
                      <span>Preguntar</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Apertura en Office Online para Word o Excel */}
                      {(fileBadge.isExcel || fileBadge.isWord) && (
                        <a
                          href={getOfficeOnlineUrl(doc.sharepointWebUrl || doc.sharepointUrl)}
                          target="_blank"
                          rel="noreferrer"
                          title={`Abrir en ${fileBadge.isExcel ? 'Excel' : 'Word'} Online`}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors ${
                            fileBadge.isExcel
                              ? 'bg-emerald-100/90 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300'
                              : 'bg-blue-100/90 text-blue-800 hover:bg-blue-200 dark:bg-blue-950/70 dark:text-blue-300'
                          }`}
                        >
                          <ExternalLink size={11} />
                          <span>{fileBadge.isExcel ? 'Excel Online' : 'Word Online'}</span>
                        </a>
                      )}

                      {/* Notificación Outlook / Teams si está por vencer o vencido */}
                      {(statusInfo.status === 'vencido' || statusInfo.status === 'por_vencer') && (
                        <a
                          href={getOutlookDocumentAlertUrl(doc)}
                          target="_blank"
                          rel="noreferrer"
                          title="Enviar alerta preventiva por Outlook Web"
                          className="p-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900 text-amber-800 dark:text-amber-300 transition-colors"
                        >
                          <Mail size={12} />
                        </a>
                      )}

                      {/* Botón de 3 puntos del Documento */}
                      <button
                        type="button"
                        onClick={(e) => openFloatingMenu(e, 'doc', doc, 'trigger')}
                        title="Opciones del documento"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl">
            <FileText size={38} className="mx-auto mb-2 opacity-40" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              No hay documentos que coincidan con los filtros seleccionados
            </p>
            <p className="text-[11px] mt-1 text-slate-400">
              Prueba cambiando de pestaña o utiliza el botón "Carga con IA (Gemini Multimodal)".
            </p>
          </div>
        )}
      </div>

      {/* PANEL LATERAL / DRAWER: ASISTENTE TÉCNICO "PREGUNTAR AL DOCUMENTO" CON GEMINI */}
      {chatDoc && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-end bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-slate-800">
            {/* Header del Chat */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full shrink-0 aspect-square bg-sky-100 dark:bg-sky-950/60 text-[#00668F] dark:text-sky-300 flex items-center justify-center">
                  <MargaritaIcon size={22} petalColor="currentColor" centerColor="#F59E0B" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      LUC-IA-NA 🌼
                    </h3>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00668F]/10 text-[#00668F] dark:text-sky-300 font-mono font-bold">
                      Asistente Documental
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                    {chatDoc.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setChatDoc(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            {/* Ficha Resumen del Documento */}
            <div className="p-3.5 bg-sky-50/50 dark:bg-sky-950/20 border-b border-sky-100 dark:border-sky-900/40 text-xs text-slate-600 dark:text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Categoría: {chatDoc.categoryLabel}
                </span>
                <span className="font-mono text-[#00668F] dark:text-sky-400 font-bold">
                  {chatDoc.code}
                </span>
              </div>
              {chatDoc.aiExtraction?.summary && (
                <p className="italic text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2">
                  "{chatDoc.aiExtraction.summary}"
                </p>
              )}
            </div>

            {/* Lista de Mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs">
              {chatQuestions.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-[#00668F] text-white rounded-br-none shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/80 dark:border-slate-700 shadow-2xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">{cleanSpecialChars(msg.text)}</div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {isAskingGemini && (
                <div className="flex items-center gap-2 p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-[#00668F] dark:text-sky-300 text-xs w-fit">
                  <MargaritaIcon size={16} petalColor="currentColor" centerColor="#F59E0B" className="animate-spin" />
                  <span>LUC-IA-NA analizando el documento... 🌼</span>
                </div>
              )}
            </div>

            {/* Sugerencias Rápidas de Preguntas Frecuentes (Accesibles para Todos) */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Preguntas Rápidas:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    handleSendChatQuestion('Explícame de forma muy sencilla y clara de qué trata este documento, qué significa y por qué es importante para la empresa.')
                  }
                  className="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-[11px] font-bold text-[#00668F] dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 cursor-pointer"
                >
                  💡 Explicar en palabras sencillas
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSendChatQuestion('¿Cuándo vence este documento y qué fechas importantes o de renovación debemos tener en cuenta?')
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#00668F] cursor-pointer"
                >
                  📅 Fechas y Vencimientos
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSendChatQuestion('¿Cuáles son los pasos, tareas o acciones concretas que debemos realizar según este documento?')
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#00668F] cursor-pointer"
                >
                  📋 Tareas y Pasos a seguir
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSendChatQuestion('¿Cuáles son las especificaciones técnicas, torques, tolerancias y normas aplicables de este documento?')
                  }
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-[#00668F] cursor-pointer"
                >
                  ⚙️ Datos Técnicos (Ingeniería)
                </button>
              </div>
            </div>

            {/* Input y Botón de Envío */}
            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChatQuestion()}
                placeholder="Pregunta sobre este documento..."
                disabled={isAskingGemini}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:bg-white dark:focus:bg-slate-900 border border-transparent focus:border-[#00668F] outline-none"
              />
              <button
                type="button"
                onClick={() => handleSendChatQuestion()}
                disabled={!chatInput.trim() || isAskingGemini}
                className="w-10 h-10 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-xs transition-transform active:scale-95"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONTROL DE REVISIONES Y VERSIONES DE INGENIERÍA */}
      {isVersionModalOpen && versionTargetDoc && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center shrink-0">
                  <GitBranch size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Cargar Nueva Versión de Ingeniería
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Control de revisiones para planos y especificaciones STC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVersionModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNewVersion} className="space-y-3.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">DOCUMENTO ACTUAL:</span>
                <div className="font-bold text-slate-900 dark:text-slate-100">{versionTargetDoc.title}</div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Versión Actual: {versionTargetDoc.version || 'Rev. 0'}
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nueva Versión (Código de Revisión):
                </label>
                <input
                  type="text"
                  required
                  value={newVersionTag}
                  onChange={(e) => setNewVersionTag(e.target.value)}
                  placeholder="Ej: Rev. 1, Rev. A, Rev. 2026.2"
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Notas de Ingeniería / Control de Cambios:
                </label>
                <textarea
                  rows={3}
                  required
                  value={newVersionNotes}
                  onChange={(e) => setNewVersionNotes(e.target.value)}
                  placeholder="Describe qué cambios se hicieron (ej: ajuste de torque de mordaza según nuevo boletín técnico Doppelmayr)..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00668F] text-white font-bold hover:bg-[#005273] shadow-xs cursor-pointer active:scale-95"
                >
                  Guardar Revisión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE VISTA PREVIA DETALLADA DEL DOCUMENTO (100% CLARO, ESTÉTICO ERP) */}
      {previewDoc && (() => {
        const previewBadge = getFileVisualBadge(previewDoc);
        const statusInfo = getDocumentStatusInfo(previewDoc);
        const hasCleanCode =
          previewDoc.code && !previewDoc.code.startsWith('SP-') && !previewDoc.code.startsWith('DOC-SP-');

        return (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
              {/* Cabecera */}
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${previewBadge.badgeBg}`}>
                      {previewBadge.label}
                    </span>
                    {hasCleanCode && (
                      <span className="text-xs font-mono font-bold text-[#00668F] dark:text-sky-400">
                        {previewDoc.code}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {previewDoc.version || 'Rev. 0'}
                    </span>
                    <span className="text-emerald-700 bg-emerald-100/90 dark:bg-emerald-950/70 dark:text-emerald-300 px-2 py-0.5 rounded-full font-bold text-[10px]">
                      {previewDoc.source === 'firebase_storage' ? 'Firebase Storage Seguro' : 'Sincronizado SharePoint M365'}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug break-words">
                    {previewDoc.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Área: {previewDoc.department || 'Operaciones'} • Categoría: {previewBadge.typeLabel}
                  </p>
                </div>

                <button
                  onClick={() => setPreviewDoc(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Banner Semáforo de Vencimiento */}
              {previewDoc.aiExtraction?.expirationDate && (
                <div
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                    statusInfo.status === 'vencido'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
                      : statusInfo.status === 'por_vencer'
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.dotClass}`} />
                    <span>Estado Normativo: {statusInfo.label} ({statusInfo.text})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={getOutlookDocumentAlertUrl(previewDoc)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-bold text-[11px] shadow-2xs hover:bg-slate-100 flex items-center gap-1.5"
                    >
                      <Mail size={12} className="text-[#0078D4]" />
                      <span>Alerta Outlook</span>
                    </a>
                    <a
                      href={getTeamsDocumentAlertUrl(previewDoc)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-xl bg-[#5B5FC7] text-white font-bold text-[11px] shadow-2xs hover:bg-[#4f53b8] flex items-center gap-1.5"
                    >
                      <span>Teams</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Ficha Técnica del Documento */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 space-y-3 border border-slate-200 dark:border-slate-700">
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${previewBadge.iconBg}`}
                  >
                    {previewBadge.isExcel ? (
                      <FileSpreadsheet size={22} />
                    ) : previewBadge.label === 'CAD' ? (
                      <Layers size={22} />
                    ) : (
                      <FileText size={22} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {previewBadge.typeLabel}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {previewDoc.fileSize}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        Carpeta asignada:
                      </span>
                      <div className="w-72">
                        <CreatableSelect
                          value={previewDoc.folderName || 'Repositorio Corporativo & Normativa STC'}
                          options={allFolders.map((f) => ({
                            id: f.name,
                            name: `📁 ${f.name}`,
                          }))}
                          onChange={(val) => {
                            const newFold = val || 'Repositorio Corporativo & Normativa STC';
                            updateDocument(previewDoc.id, { folderName: newFold });
                            setPreviewDoc({ ...previewDoc, folderName: newFold });
                            setSyncToastMessage(`Documento movido a la carpeta "${newFold}".`);
                          }}
                          placeholder="Mover a carpeta..."
                          
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen Ejecutivo de Gemini */}
                {previewDoc.aiExtraction?.summary && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl space-y-1.5 text-xs border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-500" />
                      <span>Extracción Inteligente (Gemini Flash Multimodal):</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed">
                      "{previewDoc.aiExtraction.summary}"
                    </p>
                    {previewDoc.aiExtraction.bullets && previewDoc.aiExtraction.bullets.length > 0 && (
                      <ul className="list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1">
                        {previewDoc.aiExtraction.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* TABLERO TÉCNICO DE MÉTRICAS EXCEL */}
                {previewDoc.aiExtraction?.keyMetrics && previewDoc.aiExtraction.keyMetrics.length > 0 && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl space-y-2 text-xs border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <FileSpreadsheet size={14} className="text-emerald-600" />
                        <span>Tablero Técnico de Inspección Dinamométrica & Tolerancias:</span>
                      </span>
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-bold bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                        Excel M365
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {previewDoc.aiExtraction.keyMetrics.map((m, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-xl border text-[11px] ${
                            m.status === 'critico'
                              ? 'bg-red-50 dark:bg-red-950/40 border-red-200 text-red-800 dark:text-red-300 font-bold'
                              : m.status === 'alerta'
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 text-amber-800 dark:text-amber-300 font-bold'
                              : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          <div className="text-[10px] text-slate-400">{m.label}</div>
                          <div className="font-mono text-xs font-bold mt-0.5">{m.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* HISTORIAL DE REVISIONES DE INGENIERÍA */}
                {previewDoc.versionHistory && previewDoc.versionHistory.length > 0 && (
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl space-y-2 text-xs border border-slate-200 dark:border-slate-700">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <History size={14} className="text-purple-600" />
                      <span>Historial de Versiones y Revisiones:</span>
                    </div>
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {previewDoc.versionHistory.map((vh, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-slate-600 dark:text-slate-300"
                        >
                          <div>
                            <span className="font-bold text-purple-600 mr-2">{vh.version}</span>
                            <span>{vh.notes || 'Revisión'}</span>
                          </div>
                          <div className="text-[10px] text-slate-400">{vh.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Metadatos */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-100 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">SUBIDO POR:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{previewDoc.uploadedBy}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">FECHA:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{previewDoc.date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">EMISOR:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {previewDoc.aiExtraction?.issuingEntity || 'Inteckno STC'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-bold">UBICACIÓN / PILONA:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                    {previewDoc.aiExtraction?.locationTower || previewDoc.projectCode || 'General'}
                  </span>
                </div>
              </div>

              {/* Botonera de Acciones */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => {
                    deleteDocument(previewDoc.id);
                    setPreviewDoc(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 size={14} />
                  <span>Eliminar</span>
                </button>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
                  {/* Botón Asistente IA */}
                  <button
                    type="button"
                    onClick={() => {
                      const d = previewDoc;
                      setPreviewDoc(null);
                      handleOpenDocAssistant(d);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 dark:bg-sky-950 text-[#00668F] dark:text-sky-300 hover:bg-sky-100 border border-sky-200 dark:border-sky-800 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles size={14} className="text-amber-500" />
                    <span>Preguntar al Documento</span>
                  </button>

                  {/* Cargar Nueva Versión */}
                  <button
                    type="button"
                    onClick={() => {
                      setVersionTargetDoc(previewDoc);
                      setNewVersionTag(`Rev. ${((previewDoc.versionHistory?.length || 0) + 1)}`);
                      setIsVersionModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <GitBranch size={13} className="text-purple-600" />
                    <span>Nueva Versión</span>
                  </button>

                  {/* Abrir en Office Online */}
                  {(previewBadge.isExcel || previewBadge.isWord) && (
                    <a
                      href={getOfficeOnlineUrl(previewDoc.sharepointWebUrl || previewDoc.sharepointUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer ${
                        previewBadge.isExcel ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-[#0078D4] hover:bg-[#006cbe]'
                      }`}
                    >
                      <ExternalLink size={13} />
                      <span>{previewBadge.isExcel ? 'Abrir en Excel Online' : 'Abrir en Word Online'}</span>
                    </a>
                  )}

                  <a
                    href={previewDoc.sharepointUrl || sharePointOrgUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0078D4] hover:bg-[#006cbe] text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    <span>SharePoint</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL CLÁSICO: SUBIDA MANUAL / LOTES */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Subida Manual e Importación
                </h3>
                <p className="text-xs text-slate-400">
                  Indexa documentos individuales o carpetas locales al catálogo ERP
                </p>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSingleDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Título del Documento:
                </label>
                <input
                  type="text"
                  required
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                  placeholder="Ej: Certificado de Calibración Mordazas DT"
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Código Técnico:
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadForm.code}
                    onChange={(e) => setUploadForm({ ...uploadForm, code: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Versión:
                  </label>
                  <input
                    type="text"
                    value={uploadForm.version}
                    onChange={(e) => setUploadForm({ ...uploadForm, version: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Carpeta de Destino:
                  </label>
                  <CreatableSelect
                    value={uploadForm.folderName}
                    options={allFolders.map((f) => ({
                      id: f.name,
                      name: `📁 ${f.name}`,
                    }))}
                    onChange={(val) => setUploadForm({ ...uploadForm, folderName: val || 'Repositorio Corporativo & Normativa STC' })}
                    placeholder="Carpeta..."
                    
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Categoría Documental:
                  </label>
                  <CreatableSelect
                    value={uploadForm.category}
                    options={[
                      { id: 'planos', name: 'Planos CAD & As-Built' },
                      { id: 'certificados', name: 'Certificados de Calidad & Cables' },
                      { id: 'protocolos', name: 'Protocolos de Prueba & END' },
                      { id: 'manuales', name: 'Manuales OEM & Fabricante' },
                      { id: 'sst', name: 'Informes HSEQ & Alturas' },
                      { id: 'actas', name: 'Actas de Recibo & Contratos' },
                    ]}
                    onChange={(val) => setUploadForm({ ...uploadForm, category: (val as any) || 'planos' })}
                    placeholder="Categoría..."
                    
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Proyecto STC Asociado:
                  </label>
                  <CreatableSelect
                    value={uploadForm.projectCode}
                    options={[
                      { id: 'DOCS-CORP', name: 'Normativa Corporativa STC' },
                      ...projects.map((p) => ({
                        id: p.code,
                        name: `${p.code} (${p.name})`,
                      })),
                    ]}
                    onChange={(val) => setUploadForm({ ...uploadForm, projectCode: val || 'DOCS-CORP' })}
                    placeholder="Proyecto..."
                    
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00668F] text-white font-bold hover:bg-[#005273] shadow-xs cursor-pointer"
                >
                  Guardar en Catálogo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR NUEVA CARPETA */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">Crear Nueva Carpeta</h3>
                <p className="text-xs text-slate-400">
                  Organiza tus planos y documentos con vinculación a SharePoint
                </p>
              </div>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nombre de la Carpeta:
                </label>
                <input
                  type="text"
                  required
                  value={newFolderForm.name}
                  onChange={(e) => setNewFolderForm({ ...newFolderForm, name: e.target.value })}
                  placeholder="Ej: Licitaciones 2026 o Mantenimiento Pilonas"
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Descripción / Subtítulo:
                </label>
                <input
                  type="text"
                  value={newFolderForm.subtitle}
                  onChange={(e) => setNewFolderForm({ ...newFolderForm, subtitle: e.target.value })}
                  placeholder="Ej: Informes mensuales de ensayos no destructivos"
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00668F] text-white font-bold hover:bg-[#005273] shadow-xs cursor-pointer active:scale-95"
                >
                  Crear Carpeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURACIÓN SHAREPOINT & SOLUCIÓN AADSTS50011 */}
      {isSharePointInfoModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#0078D4]/10 text-[#0078D4] flex items-center justify-center shrink-0 aspect-square shadow-2xs">
                  <Cloud size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Conexión con SharePoint & Microsoft 365
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sincronización en vivo con Microsoft Graph y configuración de Microsoft Entra ID
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSharePointInfoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            {/* Aprobación del Administrador de Microsoft (Admin Consent) */}
            <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#00668F] dark:text-sky-300 font-bold text-xs">
                    <ShieldCheck size={16} className="shrink-0" />
                    <span>¿Microsoft te pide "Se necesita la aprobación del administrador"?</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    Las directivas de seguridad de Microsoft Entra ID de <strong>inteckno.com</strong> exigen que el administrador corporativo apruebe los permisos de SharePoint y OneDrive <strong>una sola vez para toda la organización</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await openAdminConsentPopup();
                    setSyncToastMessage('Ventana de aprobación de Microsoft abierta. Al dar "Aceptar", se aprueba para toda la empresa.');
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                >
                  <ExternalLink size={13} />
                  <span>Aprobar como Administrador (1 Clic)</span>
                </button>
              </div>
            </div>

            {/* Explicación amigable del error AADSTS50011 */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-xs">
                <AlertCircle size={16} className="shrink-0" />
                <span>¿Por qué aparece el error "AADSTS50011: The redirect URI..." en Microsoft?</span>
              </div>
              <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                Por seguridad corporativa, Microsoft exige que <strong>cada dirección web donde corre el ERP</strong> esté autorizada previamente en tu portal de <strong>Microsoft Azure Entra ID</strong>. Si intentas conectar desde una URL que no está en la lista blanca, Microsoft bloquea la ventana de acceso para proteger tus datos.
              </p>
            </div>

            {/* Pasos de Solución */}
            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-500" />
                Pasos para habilitar el acceso en Microsoft Azure (1 minuto):
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#00668F] text-white text-[10px] font-bold flex items-center justify-center">1</span>
                  <div className="font-bold text-slate-900 dark:text-white">Abrir Azure Portal</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ingresa a la sección de <em>Registros de aplicaciones</em> en Entra ID.
                  </p>
                  <a
                    href="https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-[#0078D4] font-bold hover:underline pt-1"
                  >
                    <span>Ir a Azure Portal</span>
                    <ExternalLink size={11} />
                  </a>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#00668F] text-white text-[10px] font-bold flex items-center justify-center">2</span>
                  <div className="font-bold text-slate-900 dark:text-white">Buscar la App</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Abre la app con ID <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">6410d26a...</code> y ve al menú <strong>Autenticación</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-1">
                  <span className="w-5 h-5 rounded-full bg-[#00668F] text-white text-[10px] font-bold flex items-center justify-center">3</span>
                  <div className="font-bold text-slate-900 dark:text-white">Pegar Redirect URIs</div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    En "URI de redirección (SPA / Web)", agrega las URLs de Inteckno ERP y pulsa <strong>Guardar</strong>.
                  </p>
                </div>
              </div>

              {/* URLs para copiar */}
              <div className="space-y-2 pt-2">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  URLs que debes autorizar en Azure (haz clic para copiar):
                </span>
                
                {[
                  { label: 'Dominio de Producción (Principal)', url: 'https://inteckno.web.app' },
                  { label: 'Dominio de Producción (Secundario)', url: 'https://inteckno-erp.web.app' },
                  { label: 'Desarrollo Local (Sistemas)', url: 'http://localhost:3000' },
                ].map((item) => (
                  <div
                    key={item.url}
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold uppercase">{item.label}</span>
                      <code className="font-mono text-slate-800 dark:text-slate-200 font-bold">{item.url}</code>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(item.url)}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold flex items-center gap-1.5 text-[11px] cursor-pointer shadow-2xs shrink-0"
                    >
                      {copiedLink ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      <span>{copiedLink ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Parámetros de Configuración */}
              <div className="pt-2 space-y-3 border-t border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">
                  Parámetros de Conexión del Tenant Corporativo:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                      URL del Sitio SharePoint:
                    </label>
                    <input
                      type="text"
                      value={sharePointOrgUrl}
                      onChange={(e) => setSharePointOrgUrl(e.target.value)}
                      placeholder="https://intecknosas.sharepoint.com"
                      className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1">
                      Azure Client ID (Application ID):
                    </label>
                    <input
                      type="text"
                      value={azureClientId}
                      onChange={(e) => setAzureClientId(e.target.value)}
                      className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-400">
                {hasM365Token ? '🟢 Sesión de Microsoft activa' : '⚪ Pendiente de autorización Microsoft'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('inteckno_sp_url', sharePointOrgUrl);
                    localStorage.setItem('inteckno_azure_client_id', azureClientId);
                    localStorage.setItem('inteckno_azure_tenant_id', azureTenantId);
                    saveM365Config({ clientId: azureClientId, tenantId: azureTenantId });
                    setSyncToastMessage('¡Configuración de SharePoint guardada con éxito!');
                    setIsSharePointInfoModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Guardar Parámetros
                </button>

                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('inteckno_sp_url', sharePointOrgUrl);
                    localStorage.setItem('inteckno_azure_client_id', azureClientId);
                    localStorage.setItem('inteckno_azure_tenant_id', azureTenantId);
                    saveM365Config({ clientId: azureClientId, tenantId: azureTenantId });
                    setIsSharePointInfoModalOpen(false);
                    handleSyncSharePoint();
                  }}
                  className="px-4 py-2 rounded-xl bg-[#0078D4] hover:bg-[#006cbe] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw size={13} />
                  <span>Guardar y Probar Conexión</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CARPETA */}
      {editingFolder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil size={15} className="text-[#00668F]" />
                <span>Editar Carpeta</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingFolder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Nombre:</label>
                <input
                  type="text"
                  value={editingFolder.name}
                  onChange={(e) => setEditingFolder({ ...editingFolder, name: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Subtítulo / Descripción:</label>
                <input
                  type="text"
                  value={editingFolder.subtitle}
                  onChange={(e) => setEditingFolder({ ...editingFolder, subtitle: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingFolder(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveEditFolder(editingFolder.id, { name: editingFolder.name, subtitle: editingFolder.subtitle })}
                className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold cursor-pointer shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR DOCUMENTO */}
      {editingDoc && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Pencil size={15} className="text-[#00668F]" />
                <span>Editar Documento</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Título:</label>
                <input
                  type="text"
                  value={editingDoc.title}
                  onChange={(e) => setEditingDoc({ ...editingDoc, title: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Código Técnico:</label>
                <input
                  type="text"
                  value={editingDoc.code || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, code: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 font-mono"
                />
              </div>
              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Versión / Revisión:</label>
                <input
                  type="text"
                  value={editingDoc.version || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, version: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingDoc(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  updateDocument(editingDoc.id, {
                    title: editingDoc.title,
                    code: editingDoc.code,
                    version: editingDoc.version,
                  });
                  setEditingDoc(null);
                }}
                className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold cursor-pointer shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADJUNTAR CARPETA A PROYECTO */}
      {assignProjectFolder && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 size={16} className="text-[#00668F]" />
                <span>Adjuntar Carpeta a un Proyecto</span>
              </h3>
              <button
                type="button"
                onClick={() => setAssignProjectFolder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Selecciona el proyecto del ERP al cual pertenecerá la carpeta <strong>"{assignProjectFolder.name}"</strong>:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleAttachFolderToProject(assignProjectFolder.id, '')}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 text-left text-xs text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
              >
                <span>Desvincular (General / Sin proyecto asignado)</span>
                {!assignProjectFolder.projectCode && <Check size={14} className="text-[#00668F]" />}
              </button>
              {projects.map((prj) => (
                <button
                  key={prj.id}
                  type="button"
                  onClick={() => handleAttachFolderToProject(assignProjectFolder.id, prj.code)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                    assignProjectFolder.projectCode === prj.code
                      ? 'border-[#00668F] bg-sky-50/60 text-[#00668F] font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div>
                    <span className="font-mono text-[11px] block">{prj.code}</span>
                    <span className="text-xs">{prj.name}</span>
                  </div>
                  {assignProjectFolder.projectCode === prj.code && <Check size={14} />}
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAssignProjectFolder(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADJUNTAR DOCUMENTO A PROYECTO */}
      {assignProjectDoc && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 size={16} className="text-[#00668F]" />
                <span>Adjuntar Documento a un Proyecto</span>
              </h3>
              <button
                type="button"
                onClick={() => setAssignProjectDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Selecciona el proyecto al que vincular el archivo <strong>"{assignProjectDoc.title}"</strong>:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <button
                type="button"
                onClick={() => handleAttachDocToProject(assignProjectDoc.id, '', '')}
                className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-400 text-left text-xs text-slate-600 hover:bg-slate-50 cursor-pointer flex items-center justify-between"
              >
                <span>Desvincular (General / Sin proyecto)</span>
                {!assignProjectDoc.projectCode && <Check size={14} className="text-[#00668F]" />}
              </button>
              {projects.map((prj) => (
                <button
                  key={prj.id}
                  type="button"
                  onClick={() => handleAttachDocToProject(assignProjectDoc.id, prj.code, prj.name)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex items-center justify-between ${
                    assignProjectDoc.projectCode === prj.code
                      ? 'border-[#00668F] bg-sky-50/60 text-[#00668F] font-bold'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div>
                    <span className="font-mono text-[11px] block">{prj.code}</span>
                    <span className="text-xs">{prj.name}</span>
                  </div>
                  {assignProjectDoc.projectCode === prj.code && <Check size={14} />}
                </button>
              ))}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setAssignProjectDoc(null)}
                className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Menú Contextual y de Opciones Flotante Universal (Protegido contra desbordamientos y recortes) */}
      {floatingMenu && (
        <>
          {/* Backdrop invisible para capturar cualquier clic o clic derecho fuera */}
          <div
            className="fixed inset-0 z-[9998] bg-transparent"
            onClick={(e) => {
              e.stopPropagation();
              setFloatingMenu(null);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setFloatingMenu(null);
            }}
          />

          {/* Menú Flotante fijo con coordenadas seguras dentro del viewport */}
          <div
            style={{
              position: 'fixed',
              left: `${floatingMenu.x}px`,
              top: `${floatingMenu.y}px`,
            }}
            className="z-[9999] w-52 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-100 select-none"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {floatingMenu.type === 'folder' ? (
              (() => {
                const folder = floatingMenu.item as DocFolder;
                return (
                  <div className="space-y-0.5">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate border-b border-slate-100 dark:border-slate-700/60 mb-1">
                      {folder.name}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFolderId(folder.id);
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <FolderOpen size={13} className="text-[#00668F]" />
                      <span>Abrir carpeta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingFolder(folder);
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Pencil size={13} className="text-sky-600" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleToggleFavoriteFolder(folder);
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Star
                        size={13}
                        className={folder.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}
                      />
                      <span>{folder.isFavorite ? 'Quitar de favoritos' : 'Poner en favoritos'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAssignProjectFolder(folder);
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Building2 size={13} className="text-indigo-600" />
                      <span>Adjuntar a un proyecto</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                    <button
                      type="button"
                      onClick={() => {
                        handleDeleteFolder(folder.id, folder.name);
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer font-bold"
                    >
                      <Trash2 size={13} />
                      <span>Eliminar carpeta</span>
                    </button>
                  </div>
                );
              })()
            ) : (
              (() => {
                const doc = floatingMenu.item as DocumentItem;
                return (
                  <div className="space-y-0.5">
                    <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate border-b border-slate-100 dark:border-slate-700/60 mb-1">
                      {doc.title}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setPreviewDoc(doc);
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Eye size={13} className="text-[#00668F]" />
                      <span>Vista previa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingDoc(doc);
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Pencil size={13} className="text-sky-600" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleToggleFavoriteDoc(doc);
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Star
                        size={13}
                        className={doc.isFavorite ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}
                      />
                      <span>{doc.isFavorite ? 'Quitar de favoritos' : 'Poner en favoritos'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAssignProjectDoc(doc);
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/70 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <Building2 size={13} className="text-indigo-600" />
                      <span>Adjuntar a un proyecto</span>
                    </button>

                    <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Estás seguro de eliminar el documento "${doc.title}"?`)) {
                          deleteDocument(doc.id);
                        }
                        setFloatingMenu(null);
                      }}
                      className="w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 cursor-pointer font-bold"
                    >
                      <Trash2 size={13} />
                      <span>Eliminar documento</span>
                    </button>
                  </div>
                );
              })()
            )}
          </div>
        </>
      )}

      {/* Modal Universal de Configuración de Gestión Documental */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="documentos"
        moduleTitle="Gestión Documental & Planos"
      />
    </div>
  );
};

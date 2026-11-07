import { UserRole, AreaId, AreaInfo } from '../../types';
import {
  MessageSquare,
  FileText,
  Calendar,
  CheckSquare,
  BookOpen,
  Briefcase,
  Users,
  TrendingUp,
  MessageCircle,
  FolderKanban,
  Clock,
  CalendarRange,
  Wrench,
  Hammer,
  Factory,
  Cog,
  FileCode2,
  ShoppingCart,
  Package,
  Barcode,
  UserCheck,
  Palmtree,
  ClipboardList,
  Coins,
  Calculator,
  Receipt,
  FileSignature,
  LayoutDashboard,
  Globe2,
  SearchCheck,
  UserCircle2,
  ShieldCheck,
  Radar,
} from 'lucide-react';

export interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: any;
  areaId: AreaId;
}

export const ALL_AREAS: { [key in AreaId]: AreaInfo } = {
  empresa: {
    id: 'empresa',
    name: 'Módulos INTECKNO',
    tagline: 'Colaboración y herramientas transversales para toda la empresa',
    accentColor: '#00668F',
    bgBadge: 'bg-sky-100/70 text-sky-800',
    modules: [
      { id: 'conversaciones', label: 'Conversaciones', description: 'Canales internos y mensajería de equipo' },
      { id: 'documentos', label: 'Documentos', description: 'Repositorio documental, planos y certificados' },
      { id: 'calendario', label: 'Calendario', description: 'Cronograma de visitas e hitos de teleférico' },
      { id: 'actividades', label: 'Actividades pendientes', description: 'Mis tareas y compromisos prioritarios' },
      { id: 'cargos', label: 'Cargos y Vacantes', description: 'Estructura organizacional, perfiles ITK y reclutamiento IA' },
      { id: 'perfil', label: 'Mi Perfil', description: 'Datos personales, foto, teléfono y credenciales' },
      { id: 'requisiciones', label: 'Peticiones de Compra', description: 'Solicitar materiales, repuestos o servicios a Compras' },
      { id: 'usuarios-ti', label: 'Gestión Usuarios TI', description: 'Control de accesos y administración de cuentas' },
    ],
  },
  comercial: {
    id: 'comercial',
    name: 'La Gestión Comercial',
    tagline: 'Prospección, licitaciones y relaciones con clientes STC',
    accentColor: '#DC2626',
    bgBadge: 'bg-rose-100/70 text-rose-800',
    modules: [
      { id: 'crm', label: 'Gestión de Clientes (CRM)', description: 'Prospección de oportunidades y licitaciones STC' },
      { id: 'contactos', label: 'Contactos', description: 'Directorio de operadores, clientes y aliados' },
    ],
  },
  operaciones: {
    id: 'operaciones',
    name: 'Ingeniería y Operaciones en Campo',
    tagline: 'Gestión técnica de teleféricos, plan de trabajo y horas de campo',
    accentColor: '#16A34A',
    bgBadge: 'bg-emerald-100/70 text-emerald-800',
    modules: [
      { id: 'proyectos', label: 'Proyectos', description: 'Maestro de proyectos STC y control de avance de obra' },
      { id: 'registro-horas', label: 'Registro de horas', description: 'Control de Horas-Hombre de campo' },
      { id: 'planeacion', label: 'Planeación', description: 'Cronograma de actividades, ruta crítica y curva de avance' },
    ],
  },
  abastecimiento: {
    id: 'abastecimiento',
    name: 'Abastecimiento y Logística',
    tagline: 'Compras homologadas, existencias críticas y trazabilidad',
    accentColor: '#D97706',
    bgBadge: 'bg-amber-100/70 text-amber-800',
    modules: [
      { id: 'compras', label: 'Compras', description: 'Órdenes de compra y visto bueno de Gerencia General' },
      { id: 'inventario', label: 'Inventario', description: 'Existencias de repuestos críticos y herramientas' },
      { id: 'codigo-barras', label: 'Código de barras', description: 'Escáner y trazabilidad serial y por lote' },
    ],
  },
  talento: {
    id: 'talento',
    name: 'Soporte Transversal: Talento Humano y SST',
    tagline: 'Personal técnico, certificaciones de altura y bienestar',
    accentColor: '#4B5563',
    bgBadge: 'bg-slate-200/70 text-slate-800',
    modules: [
      { id: 'empleados', label: 'Empleados', description: 'Fichas técnicas y certificaciones vigentes' },
      { id: 'cargos', label: 'Cargos y Vacantes', description: 'Estructura organizacional, perfiles ITK y reclutamiento IA' },
      { id: 'vacaciones', label: 'Vacaciones', description: 'Control de días y solicitudes' },
      { id: 'encuestas', label: 'Encuestas', description: 'Inspecciones SST de campo y clima laboral' },
      { id: 'nomina', label: 'Nómina', description: 'Cálculo de horas y recargos técnicos' },
    ],
  },
  financiera: {
    id: 'financiera',
    name: 'Gestión Administrativa y Financiera',
    tagline: 'Control de caja, facturación de hitos, viáticos y métricas',
    accentColor: '#EA580C',
    bgBadge: 'bg-orange-100/70 text-orange-800',
    modules: [
      { id: 'contabilidad', label: 'Contabilidad', description: 'Facturación oportuna tras hito, cartera y cuentas' },
      { id: 'gastos', label: 'Gastos', description: 'Legalización de viáticos en campo' },
      { id: 'firma-electronica', label: 'Firma electrónica', description: 'Actas de entrega y liquidaciones digitales' },
      { id: 'tableros', label: 'Tableros de Control', description: 'Indicadores de gestión y rentabilidad' },
    ],
  },
  internacional: {
    id: 'internacional',
    name: 'Negocios Internacionales',
    tagline: 'Expansión global, cotizaciones de exportación y radar de oportunidades',
    accentColor: '#00668F',
    bgBadge: 'bg-sky-100 text-[#00668F]',
    modules: [
      { id: 'calculadora-precios', label: 'Calculadora de Exportación', description: 'Cotizaciones técnicas y financieras en USD con Incoterms 2020' },
      { id: 'radar-oportunidades', label: 'Radar de Oportunidades & Licitaciones', description: 'Monitoreo de licitaciones, compras y proyectos STC' },
    ],
  },
};

export const MODULE_ICONS: { [moduleId: string]: any } = {
  // Módulos INTECKNO
  conversaciones: MessageSquare,
  documentos: FileText,
  calendario: Calendar,
  actividades: CheckSquare,  cargos: Briefcase,
  perfil: UserCircle2,
  requisiciones: ShoppingCart,
  'usuarios-ti': ShieldCheck,

  // Comercial
  crm: Briefcase,
  contactos: Users,
  // Operaciones
  proyectos: FolderKanban,
  'registro-horas': Clock,
  planeacion: CalendarRange,
  // Abastecimiento
  compras: ShoppingCart,
  inventario: Package,
  'codigo-barras': Barcode,

  // Talento Humano
  empleados: UserCheck,
  vacaciones: Palmtree,
  encuestas: ClipboardList,
  nomina: Coins,

  // Financiera
  contabilidad: Calculator,
  gastos: Receipt,
  'firma-electronica': FileSignature,
  tableros: LayoutDashboard,

  // Internacional
  'calculadora-precios': Calculator,
  'radar-oportunidades': Radar,
  'leads-internacionales': Radar,
};

// MATRIZ DE PERMISOS POR ROL
export const ROLE_PERMISSIONS: { [key in UserRole]: AreaId[] } = {
  // SuperAdmins con acceso a los 7 pilares
  admin_sistemas: ['empresa', 'comercial', 'operaciones', 'abastecimiento', 'talento', 'financiera', 'internacional'],
  gerente_general: ['empresa', 'comercial', 'operaciones', 'abastecimiento', 'talento', 'financiera', 'internacional'],
  gerente_administrativa: ['empresa', 'comercial', 'operaciones', 'abastecimiento', 'talento', 'financiera', 'internacional'],

  // Comercial & Internacional
  coord_comercial: ['empresa', 'comercial', 'internacional'],
  asistente_negocios_internacionales: ['empresa', 'comercial', 'internacional'],

  // Operaciones & Campo
  gerente_proyectos: ['empresa', 'operaciones'],
  lider_proyectos: ['empresa', 'operaciones'],
  lider_ingenieria: ['empresa', 'operaciones'],
  ingeniero_proyectos: ['empresa', 'operaciones'],
  supervisor_tecnico: ['empresa', 'operaciones'],
  tecnico_stc: ['empresa', 'operaciones'],
  auxiliar_tecnico: ['empresa', 'operaciones'],
  practicante_ingenieria: ['empresa', 'operaciones'],
  conductor: ['empresa', 'operaciones', 'abastecimiento'],

  // Compras & Bodega
  coord_compras: ['empresa', 'abastecimiento'],
  almacenista: ['empresa', 'abastecimiento'],

  // SST & Talento
  hseq: ['empresa', 'talento', 'operaciones'],
  auxiliar_sst: ['empresa', 'talento', 'operaciones'],
  gestor_ambiental: ['empresa', 'talento', 'operaciones'],
  coord_talento_humano: ['empresa', 'talento'],
  auxiliar_talento_humano: ['empresa', 'talento'],

  // Administración & Finanzas
  coord_administrativo: ['empresa', 'financiera', 'talento'],
  auxiliar_administrativo: ['empresa', 'talento', 'financiera'],
  contador_externo: ['empresa', 'financiera'],
};

export function getUserAccessibleAreas(role: UserRole): AreaInfo[] {
  const allowedAreaIds = ROLE_PERMISSIONS[role] || ['empresa'];
  const canAccessUserManagement = [
    'admin_sistemas',
    'gerente_general',
    'gerente_administrativa',
    'coord_talento_humano',
  ].includes(role);

  return allowedAreaIds.map((id) => {
    const area = ALL_AREAS[id];
    if (id === 'empresa' && !canAccessUserManagement) {
      return {
        ...area,
        modules: area.modules.filter((m) => m.id !== 'usuarios-ti'),
      };
    }
    return area;
  });
}

export function canUserAccessModule(role: UserRole, moduleId: string): boolean {
  if (moduleId === 'perfil') return true;
  if (moduleId === 'usuarios-ti') {
    return [
      'admin_sistemas',
      'gerente_general',
      'gerente_administrativa',
      'coord_talento_humano',
    ].includes(role);
  }
  const allowedAreas = getUserAccessibleAreas(role);
  return allowedAreas.some((area) => area.modules.some((m) => m.id === moduleId));
}

export function findAreaOfModule(moduleId: string): AreaId {
  for (const areaKey of Object.keys(ALL_AREAS) as AreaId[]) {
    if (ALL_AREAS[areaKey].modules.some((m) => m.id === moduleId)) {
      return areaKey;
    }
  }
  return 'empresa';
}

// Niveles de acceso granular para matriz de gobierno RBAC
export type PermissionLevel = 'none' | 'read' | 'write' | 'admin';

export interface ModulePermissionInfo {
  id: string;
  label: string;
  areaId: AreaId;
  areaName: string;
}

// Retorna la lista plana de todos los modulos del ERP
export function getAllSystemModules(): ModulePermissionInfo[] {
  const list: ModulePermissionInfo[] = [];
  (Object.keys(ALL_AREAS) as AreaId[]).forEach((areaKey) => {
    const area = ALL_AREAS[areaKey];
    area.modules.forEach((mod) => {
      list.push({
        id: mod.id,
        label: mod.label,
        areaId: areaKey,
        areaName: area.name,
      });
    });
  });
  return list;
}

// Calcula nivel por defecto segun el rol y el modulo
export function getDefaultPermissionLevel(role: UserRole, moduleId: string): PermissionLevel {
  if (moduleId === 'perfil') return 'write';
  if (['admin_sistemas', 'gerente_general', 'gerente_administrativa'].includes(role)) {
    return 'admin';
  }
  if (moduleId === 'usuarios-ti') {
    if (role === 'coord_talento_humano') return 'write';
    return 'none';
  }

  const hasAccess = canUserAccessModule(role, moduleId);
  if (!hasAccess) return 'none';

  // Si tiene acceso, discernir nivel por rol
  if (['lider_proyectos', 'gerente_proyectos', 'lider_ingenieria', 'coord_talento_humano', 'coord_compras', 'coord_comercial', 'hseq', 'coord_administrativo'].includes(role)) {
    return 'admin';
  }
  if ([
    'ingeniero_proyectos',
    'supervisor_tecnico',
    'almacenista',
    'asistente_negocios_internacionales',
    'auxiliar_administrativo',
    'auxiliar_talento_humano',
    'auxiliar_sst',
    'gestor_ambiental',
    'auxiliar_tecnico',
    'practicante_ingenieria',
    'conductor',
  ].includes(role)) {
    return 'write';
  }
  return 'read';
}

const RBAC_MATRIX_STORAGE_KEY = 'itk_custom_rbac_permissions';

// Carga la matriz personalizada de permisos guardada en almacenamiento
export function getCustomRbacMatrix(): Record<string, Record<string, PermissionLevel>> {
  try {
    const raw = localStorage.getItem(RBAC_MATRIX_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Guarda ajustes en la matriz de permisos
export function saveCustomRbacMatrix(matrix: Record<string, Record<string, PermissionLevel>>): void {
  try {
    localStorage.setItem(RBAC_MATRIX_STORAGE_KEY, JSON.stringify(matrix));
  } catch (err) {
    console.error('Error guardando matriz de permisos RBAC:', err);
  }
}

// Obtiene el permiso efectivo para un rol y modulo especifico
export function getEffectiveModulePermission(role: UserRole, moduleId: string): PermissionLevel {
  const custom = getCustomRbacMatrix();
  if (custom[role] && custom[role][moduleId]) {
    return custom[role][moduleId];
  }
  return getDefaultPermissionLevel(role, moduleId);
}


export interface SystemHubSubModule {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: any;
}

export interface SystemHub {
  id: string;
  label: string;
  tagline: string;
  icon: any;
  areaId: AreaId;
  accentColor: string;
  bgBadge: string;
  defaultModuleId: string;
  subModules: SystemHubSubModule[];
}

export const SYSTEM_HUBS: SystemHub[] = [
  {
    id: 'empresa',
    label: 'Colaboración & Herramientas',
    tagline: 'Herramientas transversales y de equipo STC',
    icon: MessageSquare,
    areaId: 'empresa',
    accentColor: '#00668F',
    bgBadge: 'bg-sky-100/70 text-sky-800',
    defaultModuleId: 'conversaciones',
    subModules: [
      { id: 'conversaciones', label: 'Conversaciones', shortLabel: 'Chat', description: 'Canales internos y mensajería directa', icon: MessageSquare },
      { id: 'documentos', label: 'Gestión Documental', shortLabel: 'Documentos', description: 'Planos CAD, manuales y certificados STC', icon: FileText },
      { id: 'calendario', label: 'Calendario de Visitas', shortLabel: 'Calendario', description: 'Cronograma de visitas a campo e hitos', icon: Calendar },
      { id: 'actividades', label: 'Actividades & Tareas', shortLabel: 'Tareas', description: 'To-Dos y compromisos operativos', icon: CheckSquare },
      { id: 'requisiciones', label: 'Pedir Materiales (SOLPED)', shortLabel: 'SOLPED', description: 'Solicitudes de materiales y repuestos', icon: ShoppingCart },
    ],
  },
  {
    id: 'comercial',
    label: 'Gestión Comercial',
    tagline: 'Prospección, cotizaciones y relaciones con clientes',
    icon: Briefcase,
    areaId: 'comercial',
    accentColor: '#DC2626',
    bgBadge: 'bg-rose-100/70 text-rose-800',
    defaultModuleId: 'crm',
    subModules: [
      { id: 'crm', label: 'Pipeline Oportunidades', shortLabel: 'Pipeline', description: 'Licitaciones y embudo comercial STC', icon: Briefcase },
      { id: 'contactos', label: 'Directorio Contactos', shortLabel: 'Contactos', description: 'Operadores, clientes y aliados', icon: Users },
    ],
  },
  {
    id: 'operaciones',
    label: 'Proyectos & Ingeniería',
    tagline: 'Maestro de proyectos, WBS y valor ganado EVM',
    icon: FolderKanban,
    areaId: 'operaciones',
    accentColor: '#16A34A',
    bgBadge: 'bg-emerald-100/70 text-emerald-800',
    defaultModuleId: 'proyectos',
    subModules: [
      { id: 'proyectos', label: 'Maestro de Proyectos', shortLabel: 'Proyectos', description: 'Control de proyectos STC y EVM', icon: FolderKanban },
      { id: 'planeacion', label: 'Cronograma Gantt & WBS', shortLabel: 'Gantt WBS', description: 'Ruta crítica y dependencias de obra', icon: CalendarRange },
      { id: 'registro-horas', label: 'Registro de Horas (HH)', shortLabel: 'Horas Campo', description: 'Control de horas-hombre imputadas a WBS', icon: Clock },
    ],
  },
  {
    id: 'abastecimiento',
    label: 'Abastecimiento & Almacén',
    tagline: 'Compras homologadas, existencias críticas y trazabilidad',
    icon: ShoppingCart,
    areaId: 'abastecimiento',
    accentColor: '#D97706',
    bgBadge: 'bg-amber-100/70 text-amber-800',
    defaultModuleId: 'compras',
    subModules: [
      { id: 'compras', label: 'Órdenes de Compra', shortLabel: 'Compras OC', description: 'Gestión de proveedores y aprobación GM', icon: ShoppingCart },
      { id: 'inventario', label: 'Inventario & Kardex', shortLabel: 'Inventario', description: 'Existencias de repuestos críticos STC', icon: Package },
      { id: 'codigo-barras', label: 'Lector Código de Barras', shortLabel: 'Escáner', description: 'Escaneo óptico de SKU, seriales y lotes', icon: Barcode },
    ],
  },
  {
    id: 'talento',
    label: 'Talento Humano & SST',
    tagline: 'Personal técnico, cargos, licencias de alturas y nómina',
    icon: UserCheck,
    areaId: 'talento',
    accentColor: '#4B5563',
    bgBadge: 'bg-slate-200/70 text-slate-800',
    defaultModuleId: 'empleados',
    subModules: [
      { id: 'empleados', label: 'Personal Técnico & Licencias', shortLabel: 'Colaboradores', description: 'Fichas, licencias de alturas y exámenes', icon: UserCheck },
      { id: 'cargos', label: 'Cargos & Reclutamiento IA', shortLabel: 'Cargos / Vacantes', description: 'Estructura organizacional y perfiles', icon: Briefcase },
      { id: 'vacaciones', label: 'Control de Vacaciones', shortLabel: 'Vacaciones', description: 'Programación de descansos y solicitudes', icon: Palmtree },
      { id: 'encuestas', label: 'Inspecciones SST & ARO', shortLabel: 'SST / ARO', description: 'Checklists de seguridad y trabajo en alturas', icon: ClipboardList },
      { id: 'nomina', label: 'Nómina Técnica de Campo', shortLabel: 'Nómina', description: 'Cálculo de horas, recargos y asignaciones', icon: Coins },
    ],
  },
  {
    id: 'financiera',
    label: 'Finanzas & Facturación',
    tagline: 'Facturación de hitos, viáticos de campo y tableros',
    icon: Calculator,
    areaId: 'financiera',
    accentColor: '#EA580C',
    bgBadge: 'bg-orange-100/70 text-orange-800',
    defaultModuleId: 'contabilidad',
    subModules: [
      { id: 'contabilidad', label: 'Facturación & Cartera', shortLabel: 'Facturación', description: 'Facturación oportuna tras hito (Regla 48h)', icon: Calculator },
      { id: 'firma-electronica', label: 'Firma Actas de Entrega', shortLabel: 'Firma Actas', description: 'Actas de hito con validez jurídica', icon: FileSignature },
      { id: 'gastos', label: 'Gastos & Viáticos de Campo', shortLabel: 'Gastos Viáticos', description: 'Legalización fotográfica y centros de costos', icon: Receipt },
      { id: 'tableros', label: 'Tableros de Control & EBITDA', shortLabel: 'Dashboard KPIs', description: 'Rentabilidad de proyectos y margen real EAC', icon: LayoutDashboard },
    ],
  },
  {
    id: 'internacional',
    label: 'Negocios Internacionales',
    tagline: 'Radar de licitaciones globales y calculadora de exportación',
    icon: Globe2,
    areaId: 'internacional',
    accentColor: '#00668F',
    bgBadge: 'bg-sky-100 text-[#00668F]',
    defaultModuleId: 'radar-oportunidades',
    subModules: [
      { id: 'radar-oportunidades', label: 'Radar de Licitaciones Globales', shortLabel: 'Radar Licitaciones', description: 'Monitoreo de licitaciones y proyectos STC', icon: Radar },
      { id: 'calculadora-precios', label: 'Calculadora de Exportación', shortLabel: 'Incoterms 2020', description: 'Cotizaciones en USD con Incoterms y aranceles', icon: Calculator },
    ],
  },
];

export function getHubForModule(moduleId: string): SystemHub | undefined {
  return SYSTEM_HUBS.find((hub) => hub.subModules.some((m) => m.id === moduleId));
}

export function getUserAccessibleHubs(role: UserRole): SystemHub[] {
  const allowedAreaIds = ROLE_PERMISSIONS[role] || ['empresa'];
  return SYSTEM_HUBS.filter((hub) => allowedAreaIds.includes(hub.areaId));
}

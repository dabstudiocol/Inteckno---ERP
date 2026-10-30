import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
  Users,
  Package,
  Truck,
  Briefcase,
  Trash2,
  Info,
  Activity,
  ShieldCheck,
  Gauge,
  Flame,
  Clock,
  Layers,
  Folder,
  FolderPlus,
  ChevronRight,
  ArrowLeft,
  Receipt,
  CheckCircle2,
  ChevronDown,
  Calculator,
  Save,
  Check,
  Camera,
  Image as ImageIcon,
  ExternalLink,
  Eye,
  X,
  Edit,
  Edit2,
  Edit3,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Project } from '../../../../types';
import { CostMatrixItem, ProjectItemFolder, ProjectBillingItem, ProjectOfferBudget, ProjectOfferBudgetItem } from '../../../../types/ProjectSchema';
import { useErp } from '../../../../core/storage/erpStore';
import { formatCOP, formatUSD } from '../../../../core/services/trmService';
import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';
import { CreatableSelect } from '../../../../components/common/CreatableSelect';
import { DetailModal } from '../../../../components/common/DetailModal';

export interface TabCostosPresupuestoProps {
  project: Project;
  currentTrm: number;
  onUpdateProject?: (updatedProject: Project) => void;
}

export const INTECKNO_OFFICIAL_CATEGORIES: {
  key: CostMatrixItem['category'];
  label: string;
  shortLabel: string;
  color: string;
  defaultUnit: string;
  allowedUnits: string[];
  conceptPlaceholder: string;
  defaultCostType: 'directo' | 'indirecto';
  showProrrateo: boolean;
  notesPlaceholder: string;
}[] = [
  { 
    key: 'mano_obra_itk', 
    label: 'Mano de Obra ITK (Horas-Hombre)', 
    shortLabel: 'Mano de Obra ITK', 
    color: 'bg-blue-50 text-blue-700 border-blue-200',
    defaultUnit: 'Horas',
    allowedUnits: ['Horas', 'Días', 'Meses', 'Turno'],
    conceptPlaceholder: 'ej. Ingeniero Residente / Técnico Empalmador ITK',
    defaultCostType: 'directo',
    showProrrateo: true,
    notesPlaceholder: 'ej. Planilla MO cuadrilla corte quincenal',
  },
  { 
    key: 'mano_obra_externa', 
    label: 'Mano de Obra Externa / Especialistas', 
    shortLabel: 'MO Externa', 
    color: 'bg-sky-50 text-sky-700 border-sky-200',
    defaultUnit: 'Horas',
    allowedUnits: ['Horas', 'Días', 'Servicio', 'Turno'],
    conceptPlaceholder: 'ej. Especialista Alineación Láser / Soldador 6G Certificado',
    defaultCostType: 'directo',
    showProrrateo: true,
    notesPlaceholder: 'ej. Factura honorarios especialista externo',
  },
  { 
    key: 'viaticos_transporte', 
    label: 'Transporte, Pasajes & Viáticos', 
    shortLabel: 'Viáticos & Movilidad', 
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    defaultUnit: 'Viaje',
    allowedUnits: ['Viaje', 'Días', 'Pasaje', 'Pernocta', 'Ruta', 'Global'],
    conceptPlaceholder: 'ej. Tiquetes Aéreos Medellín-Bucaramanga / Hotel Chicamocha / Camioneta 4x4',
    defaultCostType: 'directo',
    showProrrateo: true,
    notesPlaceholder: 'ej. Legalización viáticos cuadrilla comisión de servicio',
  },
  { 
    key: 'consumibles_taller', 
    label: 'Consumibles de Taller & EPP', 
    shortLabel: 'Consumibles', 
    color: 'bg-orange-50 text-orange-700 border-orange-200',
    defaultUnit: 'unid',
    allowedUnits: ['unid', 'gal', 'kg', 'm', 'kit', 'Lote', 'Global'],
    conceptPlaceholder: 'ej. Discos de corte / Desengrasante dieléctrico / Arnés dieléctrico',
    defaultCostType: 'directo',
    showProrrateo: false,
    notesPlaceholder: 'ej. Comprobante almacén taller central',
  },
  { 
    key: 'inspeccion_mrt', 
    label: 'Inspección Electromagnética Cables (MRT)', 
    shortLabel: 'MRT Cables', 
    color: 'bg-purple-50 text-purple-700 border-purple-200',
    defaultUnit: 'm',
    allowedUnits: ['m', 'km', 'Cable', 'Servicio', 'Jornada'],
    conceptPlaceholder: 'ej. Ensayo MRT Intron Cable Portador-Tractor 52mm',
    defaultCostType: 'directo',
    showProrrateo: true,
    notesPlaceholder: 'ej. Informe técnico y certificado Nivel II MRT',
  },
  { 
    key: 'ensayos_end', 
    label: 'Ensayos No Destructivos (END / NDT)', 
    shortLabel: 'Ensayos END', 
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    defaultUnit: 'Punto',
    allowedUnits: ['Punto', 'Elemento', 'unid', 'Servicio', 'Jornada'],
    conceptPlaceholder: 'ej. Tintas penetrantes y partículas magnéticas en balancines y ejes',
    defaultCostType: 'directo',
    showProrrateo: true,
    notesPlaceholder: 'ej. Registro de inspección END según norma UNE-EN',
  },
  { 
    key: 'analisis_vibraciones', 
    label: 'Análisis de Vibraciones & Tribología', 
    shortLabel: 'Vibraciones', 
    color: 'bg-teal-50 text-teal-700 border-teal-200',
    defaultUnit: 'Punto',
    allowedUnits: ['Punto', 'Equipo', 'Servicio', 'Muestra'],
    conceptPlaceholder: 'ej. Espectro de vibración en reductor principal Flender y motor',
    defaultCostType: 'directo',
    showProrrateo: false,
    notesPlaceholder: 'ej. Reporte diagnóstico predictivo de rodamientos',
  },
  { 
    key: 'termografia', 
    label: 'Termografía Infrarroja', 
    shortLabel: 'Termografía', 
    color: 'bg-rose-50 text-rose-700 border-rose-200',
    defaultUnit: 'Tablero',
    allowedUnits: ['Tablero', 'Punto', 'Servicio', 'Jornada'],
    conceptPlaceholder: 'ej. Barrido termográfico tableros de potencia y control variadores',
    defaultCostType: 'directo',
    showProrrateo: false,
    notesPlaceholder: 'ej. Termogramas con diferencial de temperatura',
  },
  { 
    key: 'repuestos_fabricacion', 
    label: 'Materiales, Repuestos & Fabricación', 
    shortLabel: 'Repuestos & Piezas', 
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    defaultUnit: 'unid',
    allowedUnits: ['unid', 'm', 'kg', 'Juego', 'Lote'],
    conceptPlaceholder: 'ej. Rodamiento SKF 23140-CC / Guarnición de volante / Mordaza DT-104',
    defaultCostType: 'directo',
    showProrrateo: false,
    notesPlaceholder: 'ej. Certificado de calidad del fabricante (Mill Test Certificate)',
  },
  { 
    key: 'subcontratos_gruas', 
    label: 'Subcontratos Especializados / Grúas', 
    shortLabel: 'Subcontratos / Grúas', 
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    defaultUnit: 'Hora',
    allowedUnits: ['Hora', 'Día', 'Servicio', 'Turno', 'Global'],
    conceptPlaceholder: 'ej. Grúa telescópica 70 Ton maniobra pilona / Transporte cama baja',
    defaultCostType: 'directo',
    showProrrateo: true,
    notesPlaceholder: 'ej. Plan de izaje y póliza contractual del operador',
  },
  { 
    key: 'imprevistos_contingencia', 
    label: 'Imprevistos & Contingencia de Obra', 
    shortLabel: 'Imprevistos', 
    color: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    defaultUnit: 'Global',
    allowedUnits: ['Global', 'Porcentaje', 'Evento'],
    conceptPlaceholder: 'ej. Fondo de contingencia por condiciones climáticas en montaña',
    defaultCostType: 'indirecto',
    showProrrateo: false,
    notesPlaceholder: 'ej. Aprobación expresa de Gerencia de Proyectos',
  },
];

export function getCategoryMeta(cat: string) {
  if (!cat) {
    return INTECKNO_OFFICIAL_CATEGORIES[0];
  }
  const cleanCat = cat.trim().toLowerCase();
  
  // Buscar primero por coincidencia exacta de key
  const matchByKey = INTECKNO_OFFICIAL_CATEGORIES.find(
    (c) => c.key.toLowerCase() === cleanCat
  );
  if (matchByKey) return matchByKey;

  // Buscar por coincidencia exacta o normalizada de label o shortLabel
  const matchByLabel = INTECKNO_OFFICIAL_CATEGORIES.find(
    (c) => c.label.toLowerCase() === cleanCat || c.shortLabel.toLowerCase() === cleanCat
  );
  if (matchByLabel) return matchByLabel;

  // Mapeos heredados o abreviados
  if (cleanCat.includes('viatic') || cleanCat.includes('pasaje') || cleanCat.includes('transporte')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'viaticos_transporte')!;
  }
  if (cleanCat.includes('itk') || (cleanCat.includes('mano') && !cleanCat.includes('extern'))) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'mano_obra_itk')!;
  }
  if (cleanCat.includes('extern')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'mano_obra_externa')!;
  }
  if (cleanCat.includes('consumibl') || cleanCat.includes('taller')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'consumibles_taller')!;
  }
  if (cleanCat.includes('mrt') || cleanCat.includes('cable')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'inspeccion_mrt')!;
  }
  if (cleanCat.includes('end') || cleanCat.includes('ensayo') || cleanCat.includes('ndt')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'ensayos_end')!;
  }
  if (cleanCat.includes('vibrac') || cleanCat.includes('tribolog')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'analisis_vibraciones')!;
  }
  if (cleanCat.includes('termogra')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'termografia')!;
  }
  if (cleanCat.includes('repuesto') || cleanCat.includes('fabricac') || cleanCat.includes('material')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'repuestos_fabricacion')!;
  }
  if (cleanCat.includes('subcontrat') || cleanCat.includes('grua')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'subcontratos_gruas')!;
  }
  if (cleanCat.includes('imprevist') || cleanCat.includes('contingenc')) {
    return INTECKNO_OFFICIAL_CATEGORIES.find((c) => c.key === 'imprevistos_contingencia')!;
  }

  return {
    key: cat as any,
    label: cat,
    shortLabel: cat,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    defaultUnit: 'unid',
    allowedUnits: ['unid', 'Horas', 'Días', 'Global', 'Servicio'],
    conceptPlaceholder: 'ej. Concepto o proveedor...',
    defaultCostType: 'directo' as const,
    showProrrateo: true,
    notesPlaceholder: 'Observaciones de obra...',
  };
}

import { getProjectTaxRate } from '../../../../core/services/taxService';
export { getProjectTaxRate };

export function getItemDisplayName(code?: string, name?: string) {
  if (!code && !name) return 'Sin ITEM asignado';
  if (code && name) return `${code} - ${name}`;
  return code || name || 'Sin ITEM';
}

// Formateador con puntos de miles para inputs numéricos de moneda (ej: 5000000 -> 5.000.000)
export function formatThousands(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '' || val === 0) return '';
  const numStr = String(val).replace(/\D/g, '');
  if (!numStr) return '';
  return Number(numStr).toLocaleString('es-CO');
}

export function parseThousands(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/\./g, '').replace(/,/g, '').replace(/\D/g, '');
  return clean ? Number(clean) : 0;
}

export const TabCostosPresupuesto: React.FC<TabCostosPresupuestoProps> = ({
  project,
  currentTrm,
  onUpdateProject,
}) => {
  const { timesheets } = useErp();

  // Matriz de Costos cargada desde el proyecto o inicializada
  const [costItems, setCostItems] = useState<CostMatrixItem[]>(() => {
    return (project as any).costMatrix || [];
  });

  // Carpetas / ITEMS del proyecto
  const [projectItems, setProjectItems] = useState<ProjectItemFolder[]>(() => {
    return (project as any).projectItems || [];
  });

  // Registros de facturación del proyecto
  const [billingItems, setBillingItems] = useState<ProjectBillingItem[]>(() => {
    return (project as any).billingItems || [];
  });

  // Presupuesto Estimado Inicial / Consolidado de Oferta (Estructura oficial Inteckno: Rubro, Descripción, Valor Presupuestado, IVA Opcional)
  // CERO DATOS DE PRUEBA: Por defecto inicia completamente limpio (sin filas prellenadas).
  // Si el usuario desea agregar rubros, usa el botón "Añadir Rubro Presupuestal".
  const defaultOfferBudgetItems: ProjectOfferBudgetItem[] = [];

  // Helper para recalcular el Consolidado de Oferta
  // Si un rubro tiene hasIva === false, NO genera IVA.
  // El IVA se calcula exactamente sobre la base gravable presupuestada (rubros con IVA + su proporción de utilidad).
  const recalculateOfferBudget = (items: ProjectOfferBudgetItem[], profit: number): ProjectOfferBudget => {
    const totalBudgetedCost = items.reduce((acc, it) => acc + (Number(it.budgetPlanned) || 0), 0);
    const subtotal = totalBudgetedCost + profit;
    const taxRate = getProjectTaxRate((project as any).country || project.location).rate;

    // Base gravable: suma de costos que tienen IVA
    const taxableCost = items
      .filter((it) => it.hasIva !== false)
      .reduce((acc, it) => acc + (Number(it.budgetPlanned) || 0), 0);
    
    // Proporción de la utilidad que corresponde a rubros gravados
    const profitTaxableRatio = totalBudgetedCost > 0 ? (taxableCost / totalBudgetedCost) : (taxableCost > 0 ? 1 : 0);
    const taxableProfit = profit * profitTaxableRatio;
    const taxableBase = taxableCost + taxableProfit;

    const ivaAmount = Math.round(taxableBase * taxRate);
    const grandTotalOffer = subtotal + ivaAmount;

    return {
      items,
      totalBudgetedCost,
      totalBudgetedProfit: profit,
      subtotal,
      ivaAmount,
      grandTotalOffer,
      lastUpdated: new Date().toISOString(),
    };
  };

  const [offerBudget, setOfferBudget] = useState<ProjectOfferBudget>(() => {
    const existing = (project as any).offerBudget;
    if (existing && existing.items?.length > 0) {
      // Normalizar items en caso de datos anteriores
      const normalizedItems: ProjectOfferBudgetItem[] = existing.items.map((it: any) => ({
        id: it.id,
        rubroName: it.rubroName,
        description: it.description || '',
        budgetPlanned: Number(it.budgetPlanned ?? it.totalBudgetedCost ?? (it.suppliersCost || 0) + (it.indirectCost || 0)) || 0,
        hasIva: it.hasIva !== false,
      }));
      const profit = Number(existing.totalBudgetedProfit) || 0;
      return recalculateOfferBudget(normalizedItems, profit);
    }
    return {
      items: defaultOfferBudgetItems,
      totalBudgetedCost: 0,
      totalBudgetedProfit: 0,
      subtotal: 0,
      ivaAmount: 0,
      grandTotalOffer: 0,
    };
  });

  const [offerBudgetSavedMessage, setOfferBudgetSavedMessage] = useState(false);

  // Selector de Vista Principal: 'dashboard_graficos' (Visualización Interactiva) vs 'items_costos' (Matriz de ITEMS y Costos) vs 'consolidado_oferta' (Presupuesto)
  const [activeMainView, setActiveMainView] = useState<'dashboard_graficos' | 'items_costos' | 'consolidado_oferta'>('dashboard_graficos');

  // Mantener sincronizado el estado si el proyecto cambia, respetando el estado actual incluso si viene vacío
  React.useEffect(() => {
    if ((project as any)?.costMatrix !== undefined) {
      setCostItems((project as any).costMatrix || []);
    }
    if ((project as any)?.projectItems !== undefined) {
      setProjectItems((project as any).projectItems || []);
    }
    if ((project as any)?.billingItems !== undefined) {
      setBillingItems((project as any).billingItems || []);
    }
    if ((project as any)?.offerBudget) {
      const existing = (project as any).offerBudget;
      const rawItems = Array.isArray(existing.items) ? existing.items : [];
      const normalizedItems: ProjectOfferBudgetItem[] = rawItems.map((it: any) => ({
        ...it,
        hasIva: it.hasIva !== false,
      }));
      setOfferBudget(recalculateOfferBudget(normalizedItems, Number(existing.totalBudgetedProfit) || 0));
    }
  }, [project]);

  // Recalcular fila y totales del Consolidado de Oferta según la estructura de 3 columnas
  const handleUpdateOfferBudgetValue = (index: number, val: number) => {
    const updatedItems = [...offerBudget.items];
    updatedItems[index] = {
      ...updatedItems[index],
      budgetPlanned: val,
    };
    const newOfferBudget = recalculateOfferBudget(updatedItems, offerBudget.totalBudgetedProfit || 0);
    setOfferBudget(newOfferBudget);
    onUpdateProject?.({
      ...project,
      offerBudget: newOfferBudget as any,
    } as any);
  };

  // Alternar si un rubro del presupuesto tiene IVA o no
  const handleToggleOfferItemIva = (index: number) => {
    const updatedItems = [...offerBudget.items];
    const current = updatedItems[index];
    updatedItems[index] = {
      ...current,
      hasIva: current.hasIva === false ? true : false,
    };
    const newOfferBudget = recalculateOfferBudget(updatedItems, offerBudget.totalBudgetedProfit || 0);
    setOfferBudget(newOfferBudget);
    onUpdateProject?.({
      ...project,
      offerBudget: newOfferBudget as any,
    } as any);
  };

  // Actualizar Utilidad Total Presupuestada (Fila resumen)
  const handleUpdateOfferProfit = (profitVal: number) => {
    const newOfferBudget = recalculateOfferBudget(offerBudget.items, profitVal);
    setOfferBudget(newOfferBudget);
    onUpdateProject?.({
      ...project,
      offerBudget: newOfferBudget as any,
    } as any);
  };

  // Modales y estados de Consolidado de Oferta
  const [isAddOfferItemModalOpen, setIsAddOfferItemModalOpen] = useState(false);
  const [offerItemForm, setOfferItemForm] = useState<{ rubroName: string; description: string; budgetPlanned: number; hasIva: boolean }>({
    rubroName: '',
    description: '',
    budgetPlanned: 0,
    hasIva: true,
  });
  const [offerItemToDelete, setOfferItemToDelete] = useState<ProjectOfferBudgetItem | null>(null);
  const [editingOfferItem, setEditingOfferItem] = useState<{ index: number; item: ProjectOfferBudgetItem } | null>(null);

  // Estado para editar rubros de costos reales (Costos Directos / Indirectos)
  const [editingCostItem, setEditingCostItem] = useState<CostMatrixItem | null>(null);

  // Visor de fotos de soporte / factura
  const [viewingReceiptPhotos, setViewingReceiptPhotos] = useState<{ title: string; invoiceNumber?: string; photos: string[] } | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);
  const [photoZoom, setPhotoZoom] = useState<number>(1);
  const [isPhotoFullscreen, setIsPhotoFullscreen] = useState<boolean>(false);

  // Segmento activo en el hover de la dona tecnológica de control
  const [hoveredDonutSegment, setHoveredDonutSegment] = useState<{
    name: string;
    value: number;
    pct: number;
    color: string;
  } | null>(null);

  // Segmento activo en el hover de la dona de Costos (Directos vs Indirectos / Categorías)
  const [hoveredCostDonutSegment, setHoveredCostDonutSegment] = useState<{
    name: string;
    value: number;
    pct: number;
    color: string;
    count?: number;
  } | null>(null);

  // Segmento activo en el hover de la dona de Presupuesto (Oferta por Rubros)
  const [hoveredOfferDonutSegment, setHoveredOfferDonutSegment] = useState<{
    name: string;
    value: number;
    pct: number;
    color: string;
  } | null>(null);

  // Segmento activo en el hover de la dona de Tipo de Costo (Directos vs Indirectos)
  const [hoveredCostTypeDonutSegment, setHoveredCostTypeDonutSegment] = useState<{
    name: string;
    value: number;
    pct: number;
    color: string;
    count?: number;
  } | null>(null);

  // Filtro interactivo de ITEM para el Dashboard de Gráficos ('todos' o código del ITEM seleccionado)
  const [dashboardItemFilter, setDashboardItemFilter] = useState<string>('todos');

  // Navegación: Vista general de carpetas o Carpeta de ITEM abierta
  const [selectedFolderCode, setSelectedFolderCode] = useState<string | null>(null);

  // Modales
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isAddBillingModalOpen, setIsAddBillingModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<CostMatrixItem | null>(null);
  const [billingToDelete, setBillingToDelete] = useState<ProjectBillingItem | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<ProjectItemFolder | null>(null);
  const [selectedCostDetail, setSelectedCostDetail] = useState<CostMatrixItem | null>(null);

  // Control interactivo de vista de Gráficos Financieros
  const [showFinancialCharts, setShowFinancialCharts] = useState<boolean>(true);

  // Formulario para crear Carpeta de ITEM
  const [folderForm, setFolderForm] = useState<{
    code: string;
    name: string;
    budgetPlanned: number;
    observations: string;
  }>({
    code: '',
    name: '',
    budgetPlanned: 0,
    observations: '',
  });

  // Formulario para Facturación (Hojas de Facturación Inteckno)
  const [billingForm, setBillingForm] = useState<{
    itemCode: string;
    invoiceDate: string;
    invoiceNumber: string;
    advanceAmount: number;
    subtotal: number;
    ivaAmount: number;
    retentionAmount: number;
    observations: string;
    paymentDate: string;
  }>({
    itemCode: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    advanceAmount: 0,
    subtotal: 0,
    ivaAmount: 0,
    retentionAmount: 0,
    observations: '',
    paymentDate: '',
  });

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('todos');
  const [activeItemFilter, setActiveItemFilter] = useState<string>('todos');
  const [hasIva, setHasIva] = useState<boolean>(true);
  const [billingHasIva, setBillingHasIva] = useState<boolean>(true);

  // Formulario de nuevo rubro financiero (Alineado a ITEMS y Rubros de Control de Proyectos Inteckno P23, P25, P26)
  const [itemForm, setItemForm] = useState<{
    itemCode: string;
    itemName: string;
    category: CostMatrixItem['category'];
    costType: 'directo' | 'indirecto';
    concept: string;
    unit: string;
    plannedQuantity: number;
    plannedUnitCost: number;
    actualQuantity: number;
    actualUnitCost: number;
    date: string;
    invoiceNumber: string;
    ivaAmount: number;
    retentionAmount: number;
    observations: string;
    splitPercentage: number;
    splitWithProjectCode: string;
    receiptPhotos: string[];
  }>({
    itemCode: '',
    itemName: '',
    category: 'mano_obra_itk',
    costType: 'directo',
    concept: '',
    unit: 'Horas',
    plannedQuantity: 1,
    plannedUnitCost: 0,
    actualQuantity: 0,
    actualUnitCost: 0,
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    ivaAmount: 0,
    retentionAmount: 0,
    observations: '',
    splitPercentage: 100,
    splitWithProjectCode: '',
    receiptPhotos: [],
  });

  // Procesamiento y compresión de fotos de soporte / factura a base64 liviano
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.72);
            setItemForm((prev) => ({
              ...prev,
              receiptPhotos: [...(prev.receiptPhotos || []), compressedDataUrl],
            }));
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setItemForm((prev) => ({
      ...prev,
      receiptPhotos: prev.receiptPhotos.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Manejador para agregar nuevo rubro al Consolidado de Oferta (Presupuesto)
  const handleAddOfferItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerItemForm.rubroName.trim()) return;

    const newItem: ProjectOfferBudgetItem = {
      id: `offer-${Date.now()}`,
      rubroName: offerItemForm.rubroName.trim().toUpperCase(),
      description: offerItemForm.description.trim(),
      budgetPlanned: Number(offerItemForm.budgetPlanned) || 0,
      hasIva: offerItemForm.hasIva !== false,
    };

    const updatedItems = [...offerBudget.items, newItem];
    const newOfferBudget = recalculateOfferBudget(updatedItems, offerBudget.totalBudgetedProfit || 0);

    setOfferBudget(newOfferBudget);
    onUpdateProject?.({
      ...project,
      offerBudget: newOfferBudget as any,
    } as any);

    setOfferItemForm({ rubroName: '', description: '', budgetPlanned: 0, hasIva: true });
    setIsAddOfferItemModalOpen(false);
  };

  // Manejador para guardar edición de un rubro presupuestal
  const handleSaveEditedOfferItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOfferItem) return;

    const updatedItems = [...offerBudget.items];
    updatedItems[editingOfferItem.index] = {
      ...editingOfferItem.item,
      rubroName: editingOfferItem.item.rubroName.trim().toUpperCase(),
      description: editingOfferItem.item.description || '',
      budgetPlanned: Number(editingOfferItem.item.budgetPlanned) || 0,
      hasIva: editingOfferItem.item.hasIva !== false,
    };

    const newOfferBudget = recalculateOfferBudget(updatedItems, offerBudget.totalBudgetedProfit || 0);
    setOfferBudget(newOfferBudget);
    onUpdateProject?.({
      ...project,
      offerBudget: newOfferBudget as any,
    } as any);

    setEditingOfferItem(null);
  };

  // Manejador para eliminar rubro del Consolidado de Oferta
  const handleConfirmDeleteOfferItem = () => {
    if (!offerItemToDelete) return;
    const updatedItems = offerBudget.items.filter((it) => it.id !== offerItemToDelete.id);
    const newOfferBudget = recalculateOfferBudget(updatedItems, offerBudget.totalBudgetedProfit || 0);

    setOfferBudget(newOfferBudget);
    onUpdateProject?.({
      ...project,
      offerBudget: newOfferBudget as any,
    } as any);

    setOfferItemToDelete(null);
  };

  // Manejador para crear una nueva Carpeta de ITEM
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderForm.code) return;

    const formattedCode = folderForm.code.trim().toUpperCase();
    const existingIndex = projectItems.findIndex((f) => f.code.toUpperCase() === formattedCode);

    const newFolder: ProjectItemFolder = {
      id: `ITEM-${Date.now()}`,
      code: formattedCode,
      name: folderForm.name || formattedCode,
      budgetPlanned: Number(folderForm.budgetPlanned) || 0,
      observations: folderForm.observations || '',
      status: 'activo',
      createdAt: new Date().toISOString(),
    };

    let updatedFolders: ProjectItemFolder[];
    if (existingIndex >= 0) {
      updatedFolders = [...projectItems];
      updatedFolders[existingIndex] = { ...updatedFolders[existingIndex], ...newFolder };
    } else {
      updatedFolders = [...projectItems, newFolder];
    }

    setProjectItems(updatedFolders);
    onUpdateProject?.({
      ...project,
      projectItems: updatedFolders as any,
    } as any);

    setFolderForm({
      code: '',
      name: '',
      budgetPlanned: 0,
      observations: '',
    });
    setIsCreateFolderModalOpen(false);
  };

  // Manejador para agregar factura a la carpeta de ITEM
  const handleAddBilling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!billingForm.invoiceNumber) return;

    const subtotal = Number(billingForm.subtotal) || 0;
    const ivaAmount = Number(billingForm.ivaAmount) || 0;
    const retentionAmount = Number(billingForm.retentionAmount) || 0;
    const grandTotal = subtotal + ivaAmount - retentionAmount;

    const newBilling: ProjectBillingItem = {
      id: `BILL-${Date.now()}`,
      itemCode: billingForm.itemCode || selectedFolderCode || '',
      invoiceDate: billingForm.invoiceDate || new Date().toISOString().split('T')[0],
      invoiceNumber: billingForm.invoiceNumber,
      advanceAmount: Number(billingForm.advanceAmount) || 0,
      subtotal,
      ivaAmount,
      retentionAmount,
      grandTotal,
      observations: billingForm.observations,
      paymentDate: billingForm.paymentDate,
    };

    const updatedBilling = [newBilling, ...billingItems];
    const totalInvoiced = updatedBilling.reduce((acc, b) => acc + (Number(b.subtotal) || 0), 0);
    setBillingItems(updatedBilling);
    onUpdateProject?.({
      ...project,
      billingItems: updatedBilling as any,
      totalInvoiced,
    } as any);

    setBillingForm({
      itemCode: '',
      invoiceDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      advanceAmount: 0,
      subtotal: 0,
      ivaAmount: 0,
      retentionAmount: 0,
      observations: '',
      paymentDate: '',
    });
    setBillingHasIva(true);
    setIsAddBillingModalOpen(false);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.concept) return;

    const rawPlanned = itemForm.plannedQuantity * itemForm.plannedUnitCost;
    const rawActual = itemForm.actualQuantity * itemForm.actualUnitCost;
    const factor = (itemForm.splitPercentage || 100) / 100;
    const plannedTotal = rawPlanned * factor;
    const actualTotal = rawActual * factor;
    const variance = plannedTotal - actualTotal;

    const targetCode = itemForm.itemCode || selectedFolderCode || '';
    const targetName = itemForm.itemName || targetCode || 'Rubro General';

    let updated: CostMatrixItem[];
    if (editingCostItem) {
      const updatedItem: CostMatrixItem = {
        ...editingCostItem,
        itemCode: targetCode,
        itemName: targetName,
        category: itemForm.category,
        costType: itemForm.costType,
        concept: itemForm.concept,
        unit: itemForm.unit,
        plannedQuantity: itemForm.plannedQuantity,
        plannedUnitCost: itemForm.plannedUnitCost,
        plannedTotal,
        actualQuantity: itemForm.actualQuantity,
        actualUnitCost: itemForm.actualUnitCost,
        actualTotal,
        variance,
        date: itemForm.date,
        invoiceNumber: itemForm.invoiceNumber,
        hasIva,
        ivaAmount: hasIva ? itemForm.ivaAmount : 0,
        retentionAmount: itemForm.retentionAmount,
        observations: itemForm.observations,
        splitPercentage: itemForm.splitPercentage,
        splitWithProjectCode: itemForm.splitWithProjectCode,
        receiptPhotos: itemForm.receiptPhotos || [],
      };
      updated = costItems.map((c) => (c.id === editingCostItem.id ? updatedItem : c));
    } else {
      const newItem: CostMatrixItem = {
        id: `COST-${Date.now()}`,
        itemCode: targetCode,
        itemName: targetName,
        category: itemForm.category,
        costType: itemForm.costType,
        concept: itemForm.concept,
        unit: itemForm.unit,
        plannedQuantity: itemForm.plannedQuantity,
        plannedUnitCost: itemForm.plannedUnitCost,
        plannedTotal,
        actualQuantity: itemForm.actualQuantity,
        actualUnitCost: itemForm.actualUnitCost,
        actualTotal,
        variance,
        date: itemForm.date,
        invoiceNumber: itemForm.invoiceNumber,
        hasIva,
        ivaAmount: hasIva ? itemForm.ivaAmount : 0,
        retentionAmount: itemForm.retentionAmount,
        observations: itemForm.observations,
        splitPercentage: itemForm.splitPercentage,
        splitWithProjectCode: itemForm.splitWithProjectCode,
        receiptPhotos: itemForm.receiptPhotos || [],
      };
      updated = [newItem, ...costItems];
    }
    setCostItems(updated);

    // Asegurarse de que el ITEM exista en la lista de carpetas
    let updatedFolders = [...projectItems];
    if (targetCode && !updatedFolders.some((f) => f.code.toUpperCase() === targetCode.toUpperCase())) {
      updatedFolders.push({
        id: `ITEM-${Date.now()}`,
        code: targetCode,
        name: targetName,
        budgetPlanned: plannedTotal,
        status: 'activo',
        createdAt: new Date().toISOString(),
      });
      setProjectItems(updatedFolders);
    }

    onUpdateProject?.({
      ...project,
      costMatrix: updated as any,
      projectItems: updatedFolders as any,
    } as any);

    setItemForm({
      itemCode: '',
      itemName: '',
      category: 'mano_obra_itk',
      costType: 'directo',
      concept: '',
      unit: 'Horas',
      plannedQuantity: 1,
      plannedUnitCost: 0,
      actualQuantity: 0,
      actualUnitCost: 0,
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      ivaAmount: 0,
      retentionAmount: 0,
      observations: '',
      splitPercentage: 100,
      splitWithProjectCode: '',
      receiptPhotos: [],
    });
    setEditingCostItem(null);
    setIsAddItemModalOpen(false);
  };

  // Cálculo de Horas Reportadas en Campo (Timesheet) conectado con el módulo central y el proyecto
  const projectTimesheets = timesheets.filter((t) => t.projectId === project.id || t.projectCode === project.code);
  const timesheetList = projectTimesheets.length > 0 ? projectTimesheets : ((project as any)?.timesheetEntries || []);
  const totalTimesheetHours = timesheetList.reduce((acc: number, entry: any) => acc + (Number(entry.hours) || 0), 0);
  const estimatedTimesheetCostCOP = totalTimesheetHours * 65000; // Tarifa base promedio HH Inteckno

  // Totales acumulados
  const totalPlanned = costItems.reduce((sum, i) => sum + i.plannedTotal, 0);
  const totalActual = costItems.reduce((sum, i) => sum + i.actualTotal, 0);
  const totalVariance = totalPlanned - totalActual;

  const getCategoryStats = (cat: string) => {
    const list = costItems.filter((i) => {
      if (i.category === cat) return true;
      if (cat === 'mano_obra_itk' && (i.category === 'mano_obra' || i.category === 'mano_obra_itk')) return true;
      if (cat === 'repuestos_fabricacion' && (i.category === 'repuestos_materiales' || i.category === 'repuestos_fabricacion')) return true;
      if (cat === 'subcontratos_gruas' && (i.category === 'subcontratos' || i.category === 'subcontratos_gruas')) return true;
      if (cat === 'viaticos_transporte' && (i.category === 'viaticos' || i.category === 'viaticos_transporte')) return true;
      return false;
    });

    // Presupuesto Plan REAL: Extraído exclusivamente de los rubros coincidentes del Consolidado de Oferta
    // CERO inventar datos: Si no se ha formulado rubro en la oferta para esta categoría, el plan es exactamente $ 0.
    const offerBudgetForCategory = offerBudget.items
      .filter((it) => {
        const lowerName = (it.rubroName || '').toLowerCase();
        if (cat === 'mano_obra_itk' && (lowerName.includes('mano') || lowerName.includes('personal') || lowerName.includes('cuadrilla') || lowerName.includes('ingenier') || lowerName.includes('tecnic'))) return true;
        if (cat === 'mano_obra_externa' && (lowerName.includes('extern') || lowerName.includes('especialista'))) return true;
        if (['inspeccion_mrt', 'ensayos_end', 'analisis_vibraciones', 'termografia', 'end_mrt'].includes(cat) && (lowerName.includes('mrt') || lowerName.includes('ensayo') || lowerName.includes('end') || lowerName.includes('inspecc') || lowerName.includes('diagnost') || lowerName.includes('vibrac') || lowerName.includes('termogra'))) return true;
        if (cat === 'repuestos_fabricacion' && (lowerName.includes('repuesto') || lowerName.includes('material') || lowerName.includes('pieza') || lowerName.includes('fabricac') || lowerName.includes('insumo'))) return true;
        if (cat === 'viaticos_transporte' && (lowerName.includes('viatic') || lowerName.includes('transporte') || lowerName.includes('pasaje') || lowerName.includes('movil') || lowerName.includes('hospedaj') || lowerName.includes('hotel'))) return true;
        if (cat === 'subcontratos_gruas' && (lowerName.includes('subcontrat') || lowerName.includes('grua') || lowerName.includes('alquiler') || lowerName.includes('equipo'))) return true;
        return false;
      })
      .reduce((sum, it) => sum + (Number(it.budgetPlanned) || 0), 0);

    const actual = list.reduce((sum, i) => sum + i.actualTotal, 0);
    return { count: list.length, planned: offerBudgetForCategory, actual };
  };

  const manoObra = {
    count: getCategoryStats('mano_obra_itk').count + getCategoryStats('mano_obra_externa').count,
    planned: getCategoryStats('mano_obra_itk').planned + getCategoryStats('mano_obra_externa').planned,
    actual: getCategoryStats('mano_obra_itk').actual + getCategoryStats('mano_obra_externa').actual,
  };
  const ensayosEndMrt = {
    count: getCategoryStats('inspeccion_mrt').count + getCategoryStats('ensayos_end').count + getCategoryStats('analisis_vibraciones').count + getCategoryStats('termografia').count,
    planned: getCategoryStats('inspeccion_mrt').planned + getCategoryStats('ensayos_end').planned + getCategoryStats('analisis_vibraciones').planned + getCategoryStats('termografia').planned,
    actual: getCategoryStats('inspeccion_mrt').actual + getCategoryStats('ensayos_end').actual + getCategoryStats('analisis_vibraciones').actual + getCategoryStats('termografia').actual,
  };
  const repuestos = getCategoryStats('repuestos_fabricacion');
  const viaticosSub = {
    count: getCategoryStats('viaticos_transporte').count + getCategoryStats('subcontratos_gruas').count,
    planned: getCategoryStats('viaticos_transporte').planned + getCategoryStats('subcontratos_gruas').planned,
    actual: getCategoryStats('viaticos_transporte').actual + getCategoryStats('subcontratos_gruas').actual,
  };

  const filteredItems = costItems.filter((i) => {
    // Filtro por ITEM
    if (activeItemFilter !== 'todos') {
      const targetItem = (i.itemCode || '').toUpperCase();
      if (targetItem !== activeItemFilter.toUpperCase()) return false;
    }
    // Filtro por Categoría
    if (activeCategoryFilter === 'todos') return true;
    if (i.category === activeCategoryFilter) return true;
    if (activeCategoryFilter === 'mano_obra_itk' && (i.category === 'mano_obra' || i.category === 'mano_obra_externa')) return true;
    if (activeCategoryFilter === 'repuestos_fabricacion' && i.category === 'repuestos_materiales') return true;
    if (activeCategoryFilter === 'subcontratos_gruas' && i.category === 'subcontratos') return true;
    if (activeCategoryFilter === 'viaticos_transporte' && i.category === 'viaticos') return true;
    if (activeCategoryFilter === 'end_mrt' && ['inspeccion_mrt', 'ensayos_end', 'analisis_vibraciones', 'termografia'].includes(i.category)) return true;
    return false;
  });

  // Cálculos financieros contractuales basados en la realidad de Inteckno S.A.S.
  const rawContractAmount = project.contractAmount || project.budgetPV || 0;
  const currency = project.currency || 'COP';
  const contractAmountCOP = currency === 'USD' 
    ? rawContractAmount * currentTrm 
    : currency === 'EUR' 
    ? rawContractAmount * (currentTrm * 1.08) 
    : rawContractAmount;

  const projectCountry = project.clientCountry || (project as any).country || ((project as any).client as any)?.country || 'Colombia';
  const projectTaxRate = getProjectTaxRate(projectCountry);

    const totalIncurred = totalActual;
  // Presupuesto de Costos Planificado (Consolidado de Oferta):
  // El presupuesto plan corresponde a los costos presupuestados en el Consolidado de Oferta del proyecto (offerBudget.totalBudgetedCost).
  // Si aún no se ha desglosado la oferta pero se definió un presupuesto inicial al crear el proyecto (project.budgetPV), se usa este techo.
  const initialCostBudget = project.budgetPV || 0;
  const activeCostBudgetPlan = offerBudget.totalBudgetedCost > 0 
    ? offerBudget.totalBudgetedCost 
    : initialCostBudget;

  // Margen bruto proyectado = (Contrato - EAC) / Contrato.
  // EAC (Estimate at Completion) = max(Costo Real Incurrido, Presupuesto de Costos Planificado).
  const estimateAtCompletion = Math.max(totalIncurred, activeCostBudgetPlan);
  const hasCostData = estimateAtCompletion > 0;
  const grossProfitCOP = hasCostData ? contractAmountCOP - estimateAtCompletion : 0;
  const grossMarginPct = hasCostData && contractAmountCOP > 0 ? (grossProfitCOP / contractAmountCOP) * 100 : 0;

  const totalInvoiced = project.totalInvoiced || 0;
  const pendingToInvoice = Math.max(0, contractAmountCOP - totalInvoiced);
  const advanceAmount = project.advancePaymentAmount || (
    project.advancePaymentPercentage ? (contractAmountCOP * project.advancePaymentPercentage / 100) : 0
  );

  // Lista de ITEMS creados o existentes en el proyecto (CERO mock data / CERO pre-poblado masivo sin haber sido creado)
  const allAvailableItems = (() => {
    const map = new Map<string, { code: string; name: string; budgetPlanned?: number }>();
    
    // 1. Agregar las carpetas guardadas explícitamente en el proyecto
    projectItems.forEach((f) => {
      map.set(f.code.toUpperCase(), {
        code: f.code,
        name: f.name,
        budgetPlanned: f.budgetPlanned,
      });
    });

    // 2. Incluir cualquier ITEM que aparezca en los costos existentes del proyecto
    costItems.forEach((c) => {
      if (c.itemCode) {
        const upper = c.itemCode.toUpperCase();
        if (!map.has(upper)) {
          map.set(upper, {
            code: c.itemCode,
            name: c.itemName || c.itemCode,
            budgetPlanned: 0,
          });
        }
      }
    });

    // 3. Incluir cualquier ITEM que aparezca en la facturación existente del proyecto
    billingItems.forEach((b) => {
      if (b.itemCode) {
        const upper = b.itemCode.toUpperCase();
        if (!map.has(upper)) {
          map.set(upper, {
            code: b.itemCode,
            name: getItemDisplayName(b.itemCode),
            budgetPlanned: 0,
          });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  })();

  return (
    <div className="space-y-4">
      {/* SELECTOR DE 3 SUBPESTAÑAS PRINCIPALES: DASHBOARD CON GRÁFICOS | MATRIZ DE ITEMS Y COSTOS | PRESUPUESTO */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 shadow-2xs flex items-center gap-1.5 max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveMainView('dashboard_graficos')}
          className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMainView === 'dashboard_graficos'
              ? 'bg-[#00668F] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 size={15} />
          <span>Dashboard & Gráficos</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMainView('items_costos')}
          className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMainView === 'items_costos'
              ? 'bg-[#00668F] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Folder size={15} />
          <span>Matriz de ITEMS & Costos</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveMainView('consolidado_oferta')}
          className={`flex-1 py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeMainView === 'consolidado_oferta'
              ? 'bg-[#00668F] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet size={15} />
          <span>Presupuesto (Oferta)</span>
        </button>
      </div>

      {activeMainView === 'dashboard_graficos' ? (
        /* SUBPESTAÑA 1: DASHBOARD CON GRÁFICOS INTERACTIVOS (DESGLOSE DE COSTOS DIRECTOS/INDIRECTOS Y PRESUPUESTO OFERTA) */
        <div className="space-y-4 animate-in fade-in duration-150">
      {/* 0. PANEL EJECUTIVO DE CONTROL DE PROYECTO (ESTILO MODERNO BENTO / HAPPYHOUR DASHBOARD) */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-[#003b54] p-5 sm:p-6 rounded-3xl border border-sky-900/60 text-white shadow-xl space-y-5">
        {/* Cabecera del Panel Ejecutivo */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-cyan-300 border border-sky-400/30 px-2.5 py-0.5 rounded-full">
                Control de Proyecto • Kardex Financiero
              </span>
              <span className="text-xs text-sky-200 font-mono font-bold bg-white/5 px-2 py-0.5 rounded-lg border border-white/10">
                {project.code}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-2">
              Balance financiero consolidado, costos reales, presupuesto contractual y márgenes proyectados.
            </p>
          </div>

          {/* Margen de Rentabilidad estilo Happyhour (Badge tecnológico destacado) */}
          <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 backdrop-blur-sm flex items-center gap-3 self-start md:self-auto">
            <div className={`p-2.5 rounded-xl ${
              !hasCostData ? 'bg-slate-800 text-slate-400' : grossMarginPct >= 30 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
            }`}>
              <TrendingUp size={22} />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Margen Proyectado</span>
              <span className={`text-xl font-black font-mono tracking-tight ${
                offerBudget.totalBudgetedCost > 0 && offerBudget.totalBudgetedProfit > 0
                  ? 'text-emerald-400'
                  : !hasCostData
                  ? 'text-slate-400'
                  : grossMarginPct >= 30
                  ? 'text-emerald-400'
                  : grossMarginPct >= 15
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}>
                {offerBudget.subtotal > 0 && offerBudget.totalBudgetedProfit > 0
                  ? ((offerBudget.totalBudgetedProfit / offerBudget.subtotal) * 100).toFixed(1) + '%'
                  : hasCostData
                  ? grossMarginPct.toFixed(1) + '%'
                  : 'N/D'}
              </span>
              <span className="text-[9px] text-slate-400 block mt-0.5">
                {offerBudget.subtotal > 0 && offerBudget.totalBudgetedProfit > 0 ? '(Utilidad / Oferta Subtotal)' : '(Contrato - Costos) / Contrato'}
              </span>
            </div>
          </div>
        </div>

        {/* Bento Grid Principal: 4 Tarjetas de Métricas Clave */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Valor Contractual */}
          <div className="p-4 bg-white/[0.07] hover:bg-white/[0.09] transition-all rounded-2xl border border-white/10 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-sky-300 text-[11px] font-bold uppercase tracking-wider">
                <span>Valor Contractual</span>
                <DollarSign size={14} className="text-sky-400" />
              </div>
              <div className="text-lg font-black text-white mt-1.5 font-mono">
                {currency === 'COP' ? formatCOP(contractAmountCOP) : `${currency} $${rawContractAmount.toLocaleString('en-US')}`}
              </div>
            </div>
            <div className="text-[11px] text-slate-300 mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
              {offerBudget.subtotal > 0 ? (
                <>
                  <span className="truncate pr-1">Plan: {formatCOP(offerBudget.subtotal)}</span>
                  <span className={`text-[10px] font-mono font-bold shrink-0 px-1.5 py-0.2 rounded ${
                    contractAmountCOP >= offerBudget.subtotal ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {contractAmountCOP >= offerBudget.subtotal ? '✓ Cubierto' : '⚠️ Desvío'}
                  </span>
                </>
              ) : (
                <span className="text-slate-400 text-[10px]">Sin oferta construida</span>
              )}
            </div>
          </div>

          {/* Costos Incurridos */}
          <div className="p-4 bg-white/[0.07] hover:bg-white/[0.09] transition-all rounded-2xl border border-white/10 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-rose-300 text-[11px] font-bold uppercase tracking-wider">
                <span>Costos Incurridos</span>
                <TrendingDown size={14} className="text-rose-400" />
              </div>
              <div className="text-lg font-black text-rose-300 mt-1.5 font-mono">
                {formatCOP(totalIncurred)}
              </div>
            </div>
            <div className="text-[11px] text-slate-300 mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
              <span>Presupuesto Plan:</span>
              <span className="font-mono font-bold text-white">{formatCOP(activeCostBudgetPlan)}</span>
            </div>
          </div>

          {/* Utilidad Presupuestada (Consolidado de Oferta) */}
          <div className="p-4 bg-white/[0.07] hover:bg-white/[0.09] transition-all rounded-2xl border border-white/10 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-emerald-300 text-[11px] font-bold uppercase tracking-wider">
                <span>Utilidad Total Presupuestada</span>
                <TrendingUp size={14} className="text-emerald-400" />
              </div>
              <div className="text-lg font-black text-emerald-300 mt-1.5 font-mono">
                {offerBudget.totalBudgetedProfit > 0
                  ? formatCOP(offerBudget.totalBudgetedProfit)
                  : hasCostData
                  ? formatCOP(grossProfitCOP)
                  : '$ 0'}
              </div>
            </div>
            <div className="text-[11px] text-slate-300 mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
              <span>Sobre Costos:</span>
              <span className="font-semibold text-emerald-300 font-mono">
                {offerBudget.totalBudgetedCost > 0
                  ? ((offerBudget.totalBudgetedProfit / offerBudget.totalBudgetedCost) * 100).toFixed(1) + '%'
                  : '0.0%'}
              </span>
            </div>
          </div>

          {/* Facturación y Saldo */}
          <div className="p-4 bg-white/[0.07] hover:bg-white/[0.09] transition-all rounded-2xl border border-white/10 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-cyan-300 text-[11px] font-bold uppercase tracking-wider">
                <span>Facturación & Cobro</span>
                <Receipt size={14} className="text-cyan-400" />
              </div>
              <div className="text-lg font-black text-cyan-200 mt-1.5 font-mono">
                {formatCOP(totalInvoiced)}
              </div>
            </div>
            <div className="text-[11px] text-slate-300 mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
              <span>Por Cobrar / Facturar:</span>
              <span className="font-mono font-bold text-sky-300">{formatCOP(pendingToInvoice)}</span>
            </div>
          </div>
        </div>

        {/* SECCIÓN INTERACTIVA: GRÁFICO DE DONA BENTO (ESTILO HAPPYHOUR / STIMULSOFT BI) */}
        {(() => {
          // Porcentajes reales sobre el Valor Contractual Vigente (100%)
          const pctCost = contractAmountCOP > 0 ? Math.min(100, (totalIncurred / contractAmountCOP) * 100) : 0;
          const budgetedProfitVal = offerBudget.totalBudgetedProfit > 0 ? offerBudget.totalBudgetedProfit : grossProfitCOP;
          const pctProfit = contractAmountCOP > 0 ? Math.min(100, Math.max(0, (budgetedProfitVal / contractAmountCOP) * 100)) : 0;
          const pctInvoiced = contractAmountCOP > 0 ? Math.min(100, (totalInvoiced / contractAmountCOP) * 100) : 0;
          const pctRemaining = Math.max(0, 100 - (pctCost + pctProfit));

          // Datos para la dona interactiva con segmentos segmentados y estilizados
          const controlDonutData = [
            {
              name: 'Costos Incurridos',
              value: totalIncurred,
              pct: pctCost,
              color: '#f43f5e', // Rose
              bg: 'bg-rose-500',
              label: 'Ejecutado',
            },
            {
              name: 'Utilidad Presupuestada',
              value: budgetedProfitVal,
              pct: pctProfit,
              color: '#10b981', // Emerald
              bg: 'bg-emerald-500',
              label: 'Margen Esperado',
            },
            {
              name: 'Facturación Realizada',
              value: totalInvoiced,
              pct: pctInvoiced,
              color: '#06b6d4', // Cyan
              bg: 'bg-cyan-500',
              label: 'Cobrado / Facturado',
            },
            {
              name: 'Saldo Contractual Libre',
              value: Math.max(0, contractAmountCOP - (totalIncurred + budgetedProfitVal)),
              pct: pctRemaining,
              color: '#3b82f6', // Blue
              bg: 'bg-blue-500',
              label: 'Disponible',
            },
          ].filter((d) => d.value > 0);

          return (
            <div className="p-5 bg-white/[0.05] rounded-3xl border border-white/10 backdrop-blur-md">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                
                {/* 1. GRÁFICO DE DONA INTERACTIVO ESTILO HAPPYHOUR CON CENTRO TECNOLÓGICO */}
                <div className="lg:col-span-5 flex flex-col items-center justify-center relative min-h-[260px]">
                  <div className="w-[240px] h-[240px] relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={controlDonutData.length > 0 ? controlDonutData : [{ name: 'Sin registros', value: 1, color: '#334155' }]}
                          cx="50%"
                          cy="50%"
                          innerRadius={72}
                          outerRadius={98}
                          paddingAngle={5}
                          dataKey="value"
                          stroke="none"
                          cornerRadius={6}
                          onMouseEnter={(entry: any) => {
                            if (entry && entry.name) {
                              setHoveredDonutSegment(entry);
                            }
                          }}
                          onMouseLeave={() => setHoveredDonutSegment(null)}
                        >
                          {(controlDonutData.length > 0 ? controlDonutData : [{ color: '#334155' }]).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Centro Tecnológico de la Dona */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                      {hoveredDonutSegment ? (
                        <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-950/95 border border-sky-400/40 shadow-2xl backdrop-blur-md max-w-[170px]">
                          <span className="text-[10px] uppercase tracking-wider font-extrabold truncate max-w-[150px] block" style={{ color: hoveredDonutSegment.color }}>
                            {hoveredDonutSegment.name}
                          </span>
                          <span className="text-lg font-black font-mono text-white tracking-tight mt-0.5">
                            {formatCOP(hoveredDonutSegment.value)}
                          </span>
                          <span className="text-[10px] font-mono text-cyan-300 font-bold mt-0.5">
                            {hoveredDonutSegment.pct ? `${hoveredDonutSegment.pct.toFixed(1)}% del contrato` : ''}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                            Margen Real
                          </span>
                          <span className="text-2xl font-black font-mono text-white tracking-tight">
                            {grossMarginPct.toFixed(1)}%
                          </span>
                          <span className="text-[9px] font-mono text-cyan-300">
                            {formatCOP(contractAmountCOP)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium">
                    Distribución interactiva sobre el 100% del contrato
                  </span>
                </div>

                {/* 2. BARRAS DE PROGRESO Y DESGLOSE INTERACTIVO (ESTILO HAPPYHOUR / STIMULSOFT) */}
                <div className="lg:col-span-7 space-y-3.5">
                  <div className="border-b border-white/10 pb-2">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      Desglose Visual de Control Financiero
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Balance en tiempo real de los componentes contractuales
                    </p>
                  </div>

                  {/* Fila 1: Costos Incurridos */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                        <span className="font-semibold text-slate-200">Costos Incurridos</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 text-[11px]">{pctCost.toFixed(1)}%</span>
                        <span className="font-bold text-rose-300">{formatCOP(totalIncurred)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        style={{ width: `${pctCost}%` }}
                        className="bg-gradient-to-r from-rose-500 to-rose-400 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Fila 2: Utilidad Presupuestada */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <span className="font-semibold text-slate-200">Utilidad Presupuestada</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 text-[11px]">{pctProfit.toFixed(1)}%</span>
                        <span className="font-bold text-emerald-300">{formatCOP(budgetedProfitVal)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        style={{ width: `${pctProfit}%` }}
                        className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Fila 3: Facturación Realizada */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                        <span className="font-semibold text-slate-200">Facturación & Cobro</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 text-[11px]">{pctInvoiced.toFixed(1)}%</span>
                        <span className="font-bold text-cyan-200">{formatCOP(totalInvoiced)}</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        style={{ width: `${pctInvoiced}%` }}
                        className="bg-gradient-to-r from-cyan-500 to-sky-400 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>

                  {/* Fila 4: Saldo Contractual Disponible */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                        <span className="font-semibold text-slate-200">Saldo Contractual Disponible</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400 text-[11px]">{pctRemaining.toFixed(1)}%</span>
                        <span className="font-bold text-blue-300">{formatCOP(Math.max(0, contractAmountCOP - (totalIncurred + budgetedProfitVal)))}</span>
                      </div>
                    </div>
                    <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div
                        style={{ width: `${pctRemaining}%` }}
                        className="bg-gradient-to-r from-blue-600 to-indigo-500 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}
      </div>

      {/* 1. TARJETAS DE CATEGORÍAS FINANCIERAS PRINCIPALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Mano de Obra */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'mano_obra_itk' ? 'todos' : 'mano_obra_itk')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'mano_obra_itk'
              ? 'border-[#00668F] bg-sky-50/50 shadow-xs ring-2 ring-[#00668F]'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Mano de Obra ITK / Ext.</span>
            <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
              <Users size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{formatCOP(manoObra.actual)}</div>
          <div className="text-[10px] text-slate-400">Plan: {formatCOP(manoObra.planned)} ({manoObra.count} rubros)</div>
        </div>

        {/* Ensayos END & MRT */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'end_mrt' ? 'todos' : 'end_mrt')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'end_mrt'
              ? 'border-[#00668F] bg-purple-50/50 shadow-xs ring-2 ring-[#00668F]'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">END, MRT & Diagnóstico</span>
            <span className="p-1.5 rounded-lg bg-purple-50 text-purple-700">
              <Activity size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{formatCOP(ensayosEndMrt.actual)}</div>
          <div className="text-[10px] text-slate-400">Plan: {formatCOP(ensayosEndMrt.planned)} ({ensayosEndMrt.count} rubros)</div>
        </div>

        {/* Repuestos y Fabricación */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'repuestos_fabricacion' ? 'todos' : 'repuestos_fabricacion')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'repuestos_fabricacion'
              ? 'border-[#00668F] bg-sky-50/50 shadow-xs ring-2 ring-[#00668F]'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Repuestos & Fabricación</span>
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Package size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{formatCOP(repuestos.actual)}</div>
          <div className="text-[10px] text-slate-400">Plan: {formatCOP(repuestos.planned)} ({repuestos.count} rubros)</div>
        </div>

        {/* Viáticos & Logística */}
        <div
          onClick={() => setActiveCategoryFilter(activeCategoryFilter === 'viaticos_transporte' ? 'todos' : 'viaticos_transporte')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeCategoryFilter === 'viaticos_transporte'
              ? 'border-[#00668F] bg-sky-50/50 shadow-xs ring-2 ring-[#00668F]'
              : 'border-slate-200/80 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between pb-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase">Viáticos & Subcontratos</span>
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Truck size={14} />
            </span>
          </div>
          <div className="text-base font-black text-slate-900 truncate">{formatCOP(viaticosSub.actual)}</div>
          <div className="text-[10px] text-slate-400">Plan: {formatCOP(viaticosSub.planned)} ({viaticosSub.count} rubros)</div>
        </div>
      </div>


          {(() => {
            // Filtrar los costos si el usuario seleccionó un ITEM específico en el Dashboard
            const visibleCostItems = dashboardItemFilter === 'todos'
              ? costItems
              : costItems.filter((c) => (c.itemCode || '').toUpperCase() === dashboardItemFilter.toUpperCase());

            // 1. Dona de Tipo de Costo: Directos vs Indirectos (con su propio hover y centro tecnológico)
            const totalDirectCost = visibleCostItems.filter((c) => c.costType !== 'indirecto').reduce((acc, c) => acc + (c.actualTotal || 0), 0);
            const totalIndirectCost = visibleCostItems.filter((c) => c.costType === 'indirecto').reduce((acc, c) => acc + (c.actualTotal || 0), 0);
            const sumCostsTotal = totalDirectCost + totalIndirectCost;
            const pctDirect = sumCostsTotal > 0 ? (totalDirectCost / sumCostsTotal) * 100 : 0;
            const pctIndirect = sumCostsTotal > 0 ? (totalIndirectCost / sumCostsTotal) * 100 : 0;

            const costTypeDonutData = [
              {
                name: 'Costos Directos (MO, Obra, Insumos)',
                value: totalDirectCost,
                pct: pctDirect,
                color: '#0284c7',
                count: visibleCostItems.filter((c) => c.costType !== 'indirecto').length,
              },
              {
                name: 'Costos Indirectos (Pólizas, Grúas, Peajes)',
                value: totalIndirectCost,
                pct: pctIndirect,
                color: '#9333ea',
                count: visibleCostItems.filter((c) => c.costType === 'indirecto').length,
              },
            ].filter((d) => d.value > 0);

            // 2. Dona de Categorías Financieras Inteckno
            const catColors: Record<string, string> = {
              mano_obra_itk: '#0284c7', // Sky Blue
              mano_obra_externa: '#38bdf8', // Light Sky
              viaticos_transporte: '#f59e0b', // Amber
              consumibles_taller: '#f97316', // Orange
              repuestos_fabricacion: '#10b981', // Emerald
              subcontratos_gruas: '#64748b', // Slate
              inspeccion_mrt: '#8b5cf6', // Violet
              ensayos_end: '#6366f1', // Indigo
              analisis_vibraciones: '#14b8a6', // Teal
              termografia: '#ec4899', // Pink
              imprevistos_contingencia: '#eab308', // Yellow
            };

            const catMap = new Map<string, { name: string; value: number; count: number; color: string }>();
            visibleCostItems.forEach((c) => {
              const catKey = c.category || 'mano_obra_itk';
              const meta = getCategoryMeta(catKey);
              const existing = catMap.get(catKey) || {
                name: meta.shortLabel || meta.label,
                value: 0,
                count: 0,
                color: catColors[catKey] || '#00668F',
              };
              existing.value += (c.actualTotal || 0);
              existing.count += 1;
              catMap.set(catKey, existing);
            });

            const costCategoryDonutData = Array.from(catMap.values())
              .filter((d) => d.value > 0)
              .map((d) => ({
                ...d,
                pct: sumCostsTotal > 0 ? (d.value / sumCostsTotal) * 100 : 0,
              }));

            const totalIvaCosts = visibleCostItems.reduce((acc, c) => acc + (c.hasIva ? (c.ivaAmount || 0) : 0), 0);
            const totalRetentionCosts = visibleCostItems.reduce((acc, c) => acc + (c.retentionAmount || 0), 0);

            // 3. Dona de Presupuesto Construido (Oferta por Rubros)
            const offerCategoriesMap = new Map<string, number>();
            offerBudget.items.forEach((it) => {
              const catKey = it.rubroName || 'Otros Rubros';
              offerCategoriesMap.set(catKey, (offerCategoriesMap.get(catKey) || 0) + (it.budgetPlanned || 0));
            });

            const offerBudgetDonutData = Array.from(offerCategoriesMap.entries()).map(([name, value], idx) => {
              const colors = ['#0284c7', '#059669', '#d97706', '#9333ea', '#ec4899', '#6366f1', '#14b8a6'];
              return {
                name,
                value,
                pct: offerBudget.subtotal > 0 ? (value / offerBudget.subtotal) * 100 : 0,
                color: colors[idx % colors.length],
              };
            }).filter((d) => d.value > 0);

            // 4. Comparativa por Categoría Financiera (Mano de Obra, Diagnóstico END, Repuestos, Viáticos)
            const categoriesBarData = [
              { name: 'Mano de Obra', Plan: manoObra.planned, Real: visibleCostItems.filter((c) => c.category === 'mano_obra_itk' || c.category === 'mano_obra_externa').reduce((s, c) => s + (c.actualTotal || 0), 0), categoryKey: 'mano_obra_itk' },
              { name: 'END & MRT', Plan: ensayosEndMrt.planned, Real: visibleCostItems.filter((c) => ['inspeccion_mrt', 'ensayos_end', 'analisis_vibraciones', 'termografia'].includes(c.category)).reduce((s, c) => s + (c.actualTotal || 0), 0), categoryKey: 'end_mrt' },
              { name: 'Repuestos & Fab.', Plan: repuestos.planned, Real: visibleCostItems.filter((c) => c.category === 'repuestos_fabricacion' || c.category === 'repuestos_materiales').reduce((s, c) => s + (c.actualTotal || 0), 0), categoryKey: 'repuestos_fabricacion' },
              { name: 'Viáticos & Subc.', Plan: viaticosSub.planned, Real: visibleCostItems.filter((c) => c.category === 'viaticos_transporte' || c.category === 'subcontratos_gruas').reduce((s, c) => s + (c.actualTotal || 0), 0), categoryKey: 'viaticos_transporte' },
            ];

            return (
              <div className="space-y-4">
                {/* BARRA DE FILTROS INTERACTIVOS DEL DASHBOARD (FILTRAR POR ITEM CONTRACTUAL O VER TODOS) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-[#00668F]/10 text-[#00668F]">
                      <Filter size={16} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">Filtro Interactivo por ITEM</h4>
                      <p className="text-[10px] text-slate-400">
                        {dashboardItemFilter === 'todos' ? 'Mostrando todos los ITEMS y costos consolidados del proyecto' : `Filtrando datos exclusivos de la carpeta ${dashboardItemFilter}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setDashboardItemFilter('todos')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        dashboardItemFilter === 'todos'
                          ? 'bg-[#00668F] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Todos los ITEMS ({costItems.length})
                    </button>
                    {allAvailableItems.map((item) => (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setDashboardItemFilter(item.code)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono ${
                          dashboardItemFilter.toUpperCase() === item.code.toUpperCase()
                            ? 'bg-[#00668F] text-white shadow-xs ring-2 ring-[#00668F]/20'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {item.code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* DONA 1: COSTOS DIRECTOS VS INDIRECTOS */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <PieChartIcon size={16} className="text-[#00668F]" />
                          Costos Directos vs Indirectos
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Operación vs Gastos Administrativos / Grúas
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-xl">
                        {formatCOP(sumCostsTotal)}
                      </span>
                    </div>

                    <div className="h-[240px] w-full relative flex items-center justify-center my-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={costTypeDonutData.length > 0 ? costTypeDonutData : [{ name: 'Sin costos', value: 1, color: '#e2e8f0', pct: 0 }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={68}
                            outerRadius={95}
                            paddingAngle={6}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={6}
                            animationDuration={400}
                            animationEasing="ease-out"
                            onMouseEnter={(entry: any) => {
                              if (entry && entry.name) {
                                setHoveredCostTypeDonutSegment(entry);
                              }
                            }}
                            onMouseLeave={() => setHoveredCostTypeDonutSegment(null)}
                          >
                            {(costTypeDonutData.length > 0 ? costTypeDonutData : [{ color: '#e2e8f0' }]).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Centro Tecnológico de Directos vs Indirectos */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                        {hoveredCostTypeDonutSegment ? (
                          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/95 border border-sky-400/30 shadow-2xl backdrop-blur-md max-w-[170px]">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold truncate max-w-[150px] block" style={{ color: hoveredCostTypeDonutSegment.color }}>
                              {hoveredCostTypeDonutSegment.name}
                            </span>
                            <span className="text-base font-black font-mono text-white tracking-tight mt-0.5">
                              {formatCOP(hoveredCostTypeDonutSegment.value)}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-300 font-bold mt-0.5">
                              {hoveredCostTypeDonutSegment.pct ? `${hoveredCostTypeDonutSegment.pct.toFixed(1)}%` : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                            <span className="text-base font-black font-mono text-slate-900">{formatCOP(sumCostsTotal)}</span>
                            <span className="text-[10px] text-sky-700 font-semibold">{visibleCostItems.length} rubros</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                      <div className="p-2.5 bg-sky-50/60 rounded-xl border border-sky-100">
                        <span className="text-[10px] text-slate-500 font-bold uppercase block">Directos ({pctDirect.toFixed(1)}%)</span>
                        <span className="text-xs font-black font-mono text-[#00668F] block mt-0.5">{formatCOP(totalDirectCost)}</span>
                      </div>
                      <div className="p-2.5 bg-purple-50/60 rounded-xl border border-purple-100">
                        <span className="text-[10px] text-purple-700 font-bold uppercase block">Indirectos ({pctIndirect.toFixed(1)}%)</span>
                        <span className="text-xs font-black font-mono text-purple-900 block mt-0.5">{formatCOP(totalIndirectCost)}</span>
                      </div>
                    </div>
                  </div>

                  {/* DONA 2: COSTOS POR CATEGORÍA FINANCIERA & IMPUESTOS */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <Layers size={16} className="text-emerald-700" />
                          Categorías Financieras & Tasas
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Mano de Obra, Repuestos, Viáticos e IVA
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-xl">
                        {costCategoryDonutData.length} líneas
                      </span>
                    </div>

                    <div className="h-[240px] w-full relative flex items-center justify-center my-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={costCategoryDonutData.length > 0 ? costCategoryDonutData : [{ name: 'Sin costos', value: 1, color: '#e2e8f0', pct: 0 }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={68}
                            outerRadius={95}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={6}
                            animationDuration={400}
                            animationEasing="ease-out"
                            onMouseEnter={(entry: any) => {
                              if (entry && entry.name) {
                                setHoveredCostDonutSegment(entry);
                              }
                            }}
                            onMouseLeave={() => setHoveredCostDonutSegment(null)}
                          >
                            {(costCategoryDonutData.length > 0 ? costCategoryDonutData : [{ color: '#e2e8f0' }]).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Centro Tecnológico de Categorías */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                        {hoveredCostDonutSegment ? (
                          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/95 border border-sky-400/30 shadow-2xl backdrop-blur-md max-w-[170px]">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold truncate max-w-[150px] block" style={{ color: hoveredCostDonutSegment.color }}>
                              {hoveredCostDonutSegment.name}
                            </span>
                            <span className="text-base font-black font-mono text-white tracking-tight mt-0.5">
                              {formatCOP(hoveredCostDonutSegment.value)}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-300 font-bold mt-0.5">
                              {hoveredCostDonutSegment.pct ? `${hoveredCostDonutSegment.pct.toFixed(1)}% del costo` : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Gasto Real</span>
                            <span className="text-base font-black font-mono text-slate-900">{formatCOP(sumCostsTotal)}</span>
                            <span className="text-[10px] text-emerald-700 font-semibold">{visibleCostItems.length} rubros</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 text-xs">
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                        <span className="text-[10px] text-amber-700 font-bold uppercase block">IVA Soportado</span>
                        <span className="text-xs font-black font-mono text-amber-900 block mt-0.5">{formatCOP(totalIvaCosts)}</span>
                      </div>
                      <div className="p-2.5 bg-rose-50/60 rounded-xl border border-rose-100">
                        <span className="text-[10px] text-rose-700 font-bold uppercase block">Retenciones</span>
                        <span className="text-xs font-black font-mono text-rose-900 block mt-0.5">{formatCOP(totalRetentionCosts)}</span>
                      </div>
                    </div>
                  </div>

                  {/* DONA 3: PRESUPUESTO CONSTRUIDO (OFERTA POR RUBROS) */}
                  <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs flex flex-col justify-between">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                          <FileSpreadsheet size={16} className="text-sky-700" />
                          Presupuesto Construido (Oferta)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Composición presupuestal de costos y utilidad
                        </p>
                      </div>
                      <span className="text-xs font-mono font-black text-sky-800 bg-sky-50 px-2.5 py-1 rounded-xl">
                        {formatCOP(offerBudget.subtotal)}
                      </span>
                    </div>

                    <div className="h-[240px] w-full relative flex items-center justify-center my-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={offerBudgetDonutData.length > 0 ? offerBudgetDonutData : [{ name: 'Sin presupuesto', value: 1, color: '#e2e8f0', pct: 0 }]}
                            cx="50%"
                            cy="50%"
                            innerRadius={68}
                            outerRadius={95}
                            paddingAngle={6}
                            dataKey="value"
                            stroke="none"
                            cornerRadius={6}
                            animationDuration={400}
                            animationEasing="ease-out"
                            onMouseEnter={(entry: any) => {
                              if (entry && entry.name) {
                                setHoveredOfferDonutSegment(entry);
                              }
                            }}
                            onMouseLeave={() => setHoveredOfferDonutSegment(null)}
                          >
                            {(offerBudgetDonutData.length > 0 ? offerBudgetDonutData : [{ color: '#e2e8f0' }]).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>

                      {/* Centro Tecnológico de la Dona de Oferta */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                        {hoveredOfferDonutSegment ? (
                          <div className="flex flex-col items-center justify-center p-2 rounded-2xl bg-slate-900/95 border border-emerald-400/30 shadow-2xl backdrop-blur-md max-w-[170px]">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold truncate max-w-[150px] block" style={{ color: hoveredOfferDonutSegment.color }}>
                              {hoveredOfferDonutSegment.name}
                            </span>
                            <span className="text-base font-black font-mono text-white tracking-tight mt-0.5">
                              {formatCOP(hoveredOfferDonutSegment.value)}
                            </span>
                            <span className="text-[10px] font-mono text-emerald-300 font-bold mt-0.5">
                              {hoveredOfferDonutSegment.pct ? `${hoveredOfferDonutSegment.pct.toFixed(1)}%` : ''}
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Total Oferta</span>
                            <span className="text-base font-black font-mono text-emerald-700">{formatCOP(offerBudget.grandTotalOffer)}</span>
                            <span className="text-[10px] text-slate-500 font-semibold">{offerBudget.items.length} rubros oferta</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Costos vs Utilidad Oferta</span>
                        <span className="font-bold text-slate-800 font-mono text-[10px]">
                          Costos: {formatCOP(offerBudget.totalBudgetedCost)} | Ganancia: {formatCOP(offerBudget.totalBudgetedProfit)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-lg shadow-2xs border border-emerald-200 text-[10px]">
                        {offerBudget.totalBudgetedCost > 0 ? ((offerBudget.totalBudgetedProfit / offerBudget.totalBudgetedCost) * 100).toFixed(0) : 0}% ganancia
                      </span>
                    </div>
                  </div>
                </div>

                {/* GRÁFICO 4: BARRAS COMPARATIVAS SEGÚN CATEGORÍAS FINANCIERAS (MANO DE OBRA, REPUESTOS, VIÁTICOS) */}
                <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-2xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 size={16} className="text-[#00668F]" />
                        Comparativo por Categorías Financieras Inteckno
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Presupuesto Plan vs Costo Real Incurrido por línea de gasto {dashboardItemFilter !== 'todos' ? `(ITEM ${dashboardItemFilter})` : '(Global)'}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <span className="w-3 h-3 rounded bg-slate-300"></span> Presupuesto Plan
                      </span>
                      <span className="flex items-center gap-1.5 text-[#00668F]">
                        <span className="w-3 h-3 rounded bg-[#00668F]"></span> Costo Real
                      </span>
                    </div>
                  </div>

                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoriesBarData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }} tickLine={false} axisLine={false} tickFormatter={(val) => `$${(val / 1000000).toFixed(1)}M`} />
                        <Tooltip
                          formatter={(value: any, name: any) => [formatCOP(Number(value) || 0), name === 'Plan' ? 'Presupuesto Plan' : 'Costo Real Incurrido']}
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderRadius: '12px',
                            border: '1px solid #334155',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        />
                        <Bar dataKey="Plan" name="Plan" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={38} animationDuration={400} animationEasing="ease-out" />
                        <Bar dataKey="Real" name="Real" fill="#00668F" radius={[6, 6, 0, 0]} maxBarSize={38} animationDuration={400} animationEasing="ease-out" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      ) : activeMainView === 'consolidado_oferta' ? (
        /* VISTA INDEPENDIENTE: CONSOLIDADO DE OFERTA / PRESUPUESTO ESTIMADO INICIAL (FOTO EXCEL OFICIAL) */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden animate-in fade-in duration-150">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#00668F]/10 text-[#00668F]">
                  <FileSpreadsheet size={18} />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Consolidado de Oferta • Presupuesto Estimado Inicial</h3>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Estimación de oferta comercial previa a la creación de ITEMS y rubros reales de ejecución. Formato oficial Inteckno.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-[#00668F] font-mono">
                IVA {projectTaxRate.countryName}: {projectTaxRate.label}
              </span>
              <button
                type="button"
                onClick={() => setIsAddOfferItemModalOpen(true)}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
              >
                <Plus size={14} />
                <span>Añadir Rubro Presupuestal</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[28%]" />
                <col />
                <col className="w-32" />
                <col className="w-56" />
                <col className="w-20" />
              </colgroup>
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3 px-4">Rubro</th>
                  <th className="py-3 px-4">Descripción</th>
                  <th className="py-3 px-3 text-center">¿Aplica IVA?</th>
                  <th className="py-3 px-4 text-right">Valor Presupuestado</th>
                  <th className="py-3 px-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {offerBudget.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FileSpreadsheet size={32} className="opacity-30 text-slate-400" />
                        <p className="font-bold text-xs text-slate-600">No hay rubros en el presupuesto de este proyecto</p>
                        <p className="text-[11px] text-slate-400 max-w-md">
                          Haz clic en el botón superior <strong className="text-slate-700">"Añadir Rubro Presupuestal"</strong> para agregar los conceptos estimados de la oferta comercial (ej. Recurso Humano, Viáticos, Proveedores, Imprevistos).
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  offerBudget.items.map((row, idx) => {
                  const isImprevistos = (row.rubroName || '').toLowerCase().includes('imprevist');
                  const itemHasIva = row.hasIva !== false;
                  return (
                    <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800 align-top">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">{row.rubroName}</span>
                          {isImprevistos && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 shrink-0">
                              Mandatorio
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-600 align-top">
                        <textarea
                          rows={2}
                          value={row.description || ''}
                          placeholder="Descripción o alcance de este rubro..."
                          onChange={(e) => {
                            const newItems = [...offerBudget.items];
                            newItems[idx] = { ...newItems[idx], description: e.target.value };
                            const updated = { ...offerBudget, items: newItems };
                            setOfferBudget(updated);
                            onUpdateProject?.({ ...project, offerBudget: updated as any } as any);
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-transparent hover:border-slate-200 focus:border-[#00668F] focus:bg-white rounded-lg text-xs transition-all resize-none leading-relaxed"
                        />
                      </td>
                      <td className="py-3 px-3 text-center align-top pt-3.5">
                        <button
                          type="button"
                          onClick={() => handleToggleOfferItemIva(idx)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer inline-flex items-center gap-1 ${
                            itemHasIva
                              ? 'bg-sky-100 text-[#00668F] hover:bg-sky-200 ring-1 ring-[#00668F]/30'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200 line-through'
                          }`}
                          title={itemHasIva ? 'Este rubro causa IVA (Haz clic para excluirlo)' : 'Rubro exento de IVA (Haz clic para aplicarlo)'}
                        >
                          <span>{itemHasIva ? `Con IVA (${projectTaxRate.label})` : 'Sin IVA'}</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right align-top">
                        <div className="flex justify-end">
                          <div className="relative w-full max-w-[180px]">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">$</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="0"
                              value={formatThousands(row.budgetPlanned)}
                              onChange={(e) => {
                                const val = parseThousands(e.target.value);
                                handleUpdateOfferBudgetValue(idx, val);
                              }}
                              className="w-full pl-6 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-right font-mono font-bold text-xs text-slate-800 focus:bg-white focus:border-[#00668F] transition-all"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => setEditingOfferItem({ index: idx, item: { ...row } })}
                            className="p-1.5 text-slate-400 hover:text-[#00668F] hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar nombre y alcance de este rubro"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setOfferItemToDelete(row)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Eliminar rubro presupuestal"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
              {/* FILAS DE TOTALES Y RESUMEN CALCULADOS DE LA COLUMNA VALOR PRESUPUESTADO */}
              <tfoot className="border-t-2 border-slate-300">
                {/* 1. Costos Totales Presupuestados (Solo visible cuando hay más de 1 rubro para evitar redundancia Regla 10) */}
                {offerBudget.items.length > 1 && (
                  <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200">
                    <td colSpan={3} className="py-2.5 px-4 uppercase text-[11px] tracking-wider text-slate-700">
                      Costos Totales Presupuestados
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex justify-end font-mono text-sm text-slate-900 font-bold pr-2.5">
                        {formatCOP(offerBudget.totalBudgetedCost)}
                      </div>
                    </td>
                    <td></td>
                  </tr>
                )}

                {/* 2. Utilidad Total Presupuestada (Permite ingresar o ajustar la utilidad estimada de la oferta) */}
                <tr className="bg-emerald-50/40 font-bold text-slate-800 border-b border-slate-200">
                  <td colSpan={3} className="py-2.5 px-4 uppercase text-[11px] tracking-wider text-emerald-900">
                    <div className="flex items-center gap-2">
                      <span>Utilidad Total Presupuestada</span>
                      <span className="text-[10px] text-emerald-700 font-normal">
                        ({offerBudget.totalBudgetedCost > 0 ? ((offerBudget.totalBudgetedProfit / offerBudget.totalBudgetedCost) * 100).toFixed(1) : 0}% sobre costos)
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <div className="flex justify-end">
                      <div className="relative w-full max-w-[180px]">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-emerald-600 pointer-events-none">$</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="0"
                          value={formatThousands(offerBudget.totalBudgetedProfit)}
                          onChange={(e) => {
                            const val = parseThousands(e.target.value);
                            handleUpdateOfferProfit(val);
                          }}
                          className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-emerald-300 rounded-xl text-right font-mono font-bold text-xs text-emerald-700 focus:bg-white focus:border-emerald-600 transition-all"
                        />
                      </div>
                    </div>
                  </td>
                  <td></td>
                </tr>

                {/* 3. Valor Subtotal (Costos Totales + Utilidad) */}
                <tr className="bg-slate-100 font-bold text-slate-900 border-b border-slate-200">
                  <td colSpan={3} className="py-2.5 px-4 uppercase text-[11px] tracking-wider text-slate-800">
                    Valor Subtotal
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex justify-end font-mono text-sm text-slate-900 font-black pr-2.5">
                      {formatCOP(offerBudget.subtotal)}
                    </div>
                  </td>
                  <td></td>
                </tr>

                {/* 4. IVA (% según país del proyecto calculado sobre rubros con IVA) */}
                <tr className="bg-slate-50 font-bold text-slate-800 border-b border-slate-200">
                  <td colSpan={3} className="py-2.5 px-4 uppercase text-[11px] tracking-wider text-slate-700">
                    <div className="flex items-center gap-2">
                      <span>IVA ({projectTaxRate.countryName}: {projectTaxRate.label})</span>
                      <span className="text-[10px] text-slate-400 font-normal">Calculado solo en rubros gravados</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <div className="flex justify-end font-mono text-sm text-slate-700 font-bold pr-2.5">
                      {formatCOP(offerBudget.ivaAmount)}
                    </div>
                  </td>
                  <td></td>
                </tr>

                {/* 5. Valor Total (Subtotal + IVA) */}
                <tr className="bg-[#00668F]/10 font-bold text-slate-900 border-b border-[#00668F]/20">
                  <td colSpan={3} className="py-3 px-4 uppercase text-xs tracking-wider text-[#00668F] font-black">
                    Valor Total de la Oferta
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex justify-end font-mono text-base font-black text-[#00668F] pr-2.5">
                      {formatCOP(offerBudget.grandTotalOffer)}
                    </div>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <Info size={14} className="text-[#00668F]" />
              <span>
                Cálculos automáticos sincronizados en tiempo real: Subtotal = Costos Totales + Utilidad. IVA automático ({projectTaxRate.label}).
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <Check size={14} /> Sincronizado en la nube
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* VISTA DE EJECUCIÓN REAL: ITEMS Y RUBROS (CARPETAS O 3 TABLAS POR ITEM) */
        <>
      {/* 2. VISTA DE ITEMS: CARPETAS O DETALLE DE ITEM (3 TABLAS: COSTOS DIRECTOS, INDIRECTOS Y FACTURACIÓN) */}
      {!selectedFolderCode ? (
        /* VISTA DE CARPETAS DE ITEMS */
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Folder size={18} className="text-[#00668F]" />
                <span>Carpetas de ITEMS del Proyecto</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-100 text-[#00668F] text-[11px] font-extrabold font-mono">
                  {allAvailableItems.length} ITEMS
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cada carpeta agrupa sus rubros de costos directos, costos indirectos y facturación tal como se gestiona en el Excel oficial.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setFolderForm({ code: '', name: '', budgetPlanned: 0, observations: '' });
                  setIsCreateFolderModalOpen(true);
                }}
                className="px-3.5 py-1.5 bg-[#00668F] hover:bg-[#005273] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus size={14} />
                <span>Añadir ITEM / Carpeta</span>
              </button>
            </div>
          </div>

          {/* Grid de Carpetas de ITEMS o Estado Vacío */}
          {allAvailableItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400 space-y-3">
              <Folder size={40} className="mx-auto text-slate-300" />
              <div>
                <h4 className="text-sm font-bold text-slate-700">No hay ITEMS creados en este proyecto</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Para comenzar con el control financiero, haz clic en "Añadir ITEM / Carpeta" y crea el primer ITEM contractual de la obra (ej. ITEM 01, ITEM 11).
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFolderForm({ code: '', name: '', budgetPlanned: 0, observations: '' });
                  setIsCreateFolderModalOpen(true);
                }}
                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <FolderPlus size={14} />
                <span>Crear Primer ITEM</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {allAvailableItems.map((itemDef) => {
                const itemDirects = costItems.filter(
                  (c) => (c.itemCode || '').toUpperCase() === itemDef.code.toUpperCase() && c.costType !== 'indirecto'
                );
                const itemIndirects = costItems.filter(
                  (c) => (c.itemCode || '').toUpperCase() === itemDef.code.toUpperCase() && c.costType === 'indirecto'
                );
                const itemBills = billingItems.filter(
                  (b) => (b.itemCode || '').toUpperCase() === itemDef.code.toUpperCase()
                );

                const totalDir = itemDirects.reduce((sum, c) => sum + (c.actualTotal || 0), 0);
                const totalInd = itemIndirects.reduce((sum, c) => sum + (c.actualTotal || 0), 0);
                const totalCost = totalDir + totalInd;
                const totalFact = itemBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);
                const marginItem = totalFact > 0 ? ((totalFact - totalCost) / totalFact) * 100 : (totalCost > 0 ? -100 : 0);

                return (
                  <div
                    key={itemDef.code}
                    onClick={() => setSelectedFolderCode(itemDef.code)}
                    className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-[#00668F] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between relative"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="p-2 rounded-xl bg-sky-50 text-[#00668F] group-hover:bg-[#00668F] group-hover:text-white transition-colors">
                            <Folder size={18} />
                          </span>
                          <div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-black bg-slate-100 text-[#00668F] border border-slate-200">
                              {itemDef.code}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setFolderToDelete({
                              id: `ITEM-${itemDef.code}`,
                              code: itemDef.code,
                              name: itemDef.name,
                            })}
                            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Eliminar este ITEM y sus registros"
                          >
                            <Trash2 size={14} />
                          </button>
                          <span className="text-[10px] text-slate-400 group-hover:text-[#00668F] font-bold flex items-center gap-0.5 ml-1">
                            Abrir <ChevronRight size={13} />
                          </span>
                        </div>
                      </div>

                      <h4 className="text-xs font-bold text-slate-800 mt-2.5 line-clamp-2 min-h-[32px] group-hover:text-[#00668F] transition-colors">
                        {itemDef.name}
                      </h4>

                      {/* Consolidados de Costos y Facturación */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2 text-[11px]">
                        <div className="grid grid-cols-2 gap-2 bg-slate-50/70 p-2 rounded-xl border border-slate-100">
                          <div>
                            <span className="text-[10px] text-slate-500 block font-medium">Costos Directos</span>
                            <span className="font-bold text-slate-900 font-mono">{formatCOP(totalDir)}</span>
                            <span className="text-[9px] text-slate-400 block">{itemDirects.length} rubros</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-purple-700 block font-medium">Costos Indirectos</span>
                            <span className="font-bold text-purple-900 font-mono">{formatCOP(totalInd)}</span>
                            <span className="text-[9px] text-purple-400 block">{itemIndirects.length} rubros</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-dashed border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-500 block font-medium">Costos Totales</span>
                            <span className="font-black text-slate-900 font-mono text-xs">{formatCOP(totalCost)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-700 block font-medium">Facturación Total</span>
                            <span className="font-black text-emerald-800 font-mono text-xs">{formatCOP(totalFact)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-medium">
                        {itemDirects.length + itemIndirects.length} gastos • {itemBills.length} facturas
                      </span>
                      {totalFact > 0 ? (
                        <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                          marginItem >= 20 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          Margen: {marginItem.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="font-mono font-bold px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                          Por Facturar
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* VISTA INTERNA DE LA CARPETA DEL ITEM CON LAS 3 TABLAS */
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Barra de Navegación del ITEM */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedFolderCode(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Volver a todas las carpetas"
              >
                <ArrowLeft size={16} />
                <span>Volver a Carpetas</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-black bg-[#00668F] text-white">
                    {selectedFolderCode}
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    {allAvailableItems.find((it) => it.code.toUpperCase() === selectedFolderCode.toUpperCase())?.name || selectedFolderCode}
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Control contractual de costos directos, costos indirectos y facturación de este ITEM
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setItemForm({
                    ...itemForm,
                    itemCode: selectedFolderCode,
                    itemName: allAvailableItems.find((it) => it.code.toUpperCase() === selectedFolderCode.toUpperCase())?.name || selectedFolderCode,
                    costType: 'directo',
                  });
                  setIsAddItemModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Añadir Costo Directo</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setItemForm({
                    ...itemForm,
                    itemCode: selectedFolderCode,
                    itemName: allAvailableItems.find((it) => it.code.toUpperCase() === selectedFolderCode.toUpperCase())?.name || selectedFolderCode,
                    costType: 'indirecto',
                  });
                  setIsAddItemModalOpen(true);
                }}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Añadir Costo Indirecto</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBillingForm({
                    ...billingForm,
                    itemCode: selectedFolderCode,
                  });
                  setIsAddBillingModalOpen(true);
                }}
                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Añadir Facturación</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = allAvailableItems.find((it) => it.code.toUpperCase() === selectedFolderCode.toUpperCase());
                  setFolderToDelete({
                    id: `ITEM-${selectedFolderCode}`,
                    code: selectedFolderCode,
                    name: target?.name || selectedFolderCode,
                  });
                }}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 active:scale-95 text-xs font-bold rounded-xl border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer"
                title="Eliminar este ITEM y todos sus rubros"
              >
                <Trash2 size={14} />
                <span>Eliminar ITEM</span>
              </button>
            </div>
          </div>

          {/* Tarjetas KPI de Consolidados del ITEM Seleccionado */}
          {(() => {
            const folderDirects = costItems.filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType !== 'indirecto');
            const folderIndirects = costItems.filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType === 'indirecto');
            const folderBills = billingItems.filter((b) => (b.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase());

            const sumDirects = folderDirects.reduce((acc, c) => acc + (c.actualTotal || c.plannedTotal || 0), 0);
            const sumIndirects = folderIndirects.reduce((acc, c) => acc + (c.actualTotal || c.plannedTotal || 0), 0);
            const sumTotalCost = sumDirects + sumIndirects;
            const sumBilling = folderBills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);
            const folderMargin = sumBilling > 0 ? ((sumBilling - sumTotalCost) / sumBilling) * 100 : (sumTotalCost > 0 ? -100 : 0);

            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
                <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100">
                  <span className="text-[10px] font-bold text-[#00668F] uppercase tracking-wider block">Consolidado Costos Directos</span>
                  <span className="text-sm sm:text-base font-black text-slate-900 font-mono block mt-1">{formatCOP(sumDirects)}</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{folderDirects.length} rubros cargados</span>
                </div>

                <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100">
                  <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Consolidado Costos Indirectos</span>
                  <span className="text-sm sm:text-base font-black text-purple-900 font-mono block mt-1">{formatCOP(sumIndirects)}</span>
                  <span className="text-[10px] text-purple-500 font-medium block mt-0.5">{folderIndirects.length} rubros cargados</span>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Gran Total Costos Incurridos</span>
                  <span className="text-sm sm:text-base font-black text-[#00668F] font-mono block mt-1">{formatCOP(sumTotalCost)}</span>
                  <span className="text-[10px] text-slate-500 font-medium block mt-0.5">{folderDirects.length + folderIndirects.length} registros totales</span>
                </div>

                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Consolidado Facturación</span>
                    {sumBilling > 0 && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                        {folderMargin.toFixed(0)}% util.
                      </span>
                    )}
                  </div>
                  <span className="text-sm sm:text-base font-black text-emerald-700 font-mono block mt-1">{formatCOP(sumBilling)}</span>
                  <span className="text-[10px] text-emerald-600 font-medium block mt-0.5">{folderBills.length} facturas vinculadas</span>
                </div>
              </div>
            );
          })()}

          {/* TABLA 1: COSTOS DIRECTOS (Tal cual la foto de Excel) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-sky-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00668F]"></span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Costos Directos — {selectedFolderCode}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({costItems.filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType !== 'indirecto').length} rubros)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setItemForm({
                    ...itemForm,
                    itemCode: selectedFolderCode,
                    itemName: allAvailableItems.find((it) => it.code.toUpperCase() === selectedFolderCode.toUpperCase())?.name || selectedFolderCode,
                    costType: 'directo',
                  });
                  setIsAddItemModalOpen(true);
                }}
                className="text-xs font-bold text-[#00668F] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Agregar Rubro Directo</span>
              </button>
            </div>

            {costItems.filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType !== 'indirecto').length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay costos directos registrados para {selectedFolderCode}. Agrega horas-hombre, compras de ferretería o insumos de obra.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-4">Concepto del Costo Directo</th>
                      <th className="py-2.5 px-3 text-right">Valor Costo Directo</th>
                      <th className="py-2.5 px-3 text-right">IVA ({projectTaxRate.label})</th>
                      <th className="py-2.5 px-3 text-right">Retención</th>
                      <th className="py-2.5 px-3 text-right">Gran Total</th>
                      <th className="py-2.5 px-3">Recibo - Factura</th>
                      <th className="py-2.5 px-4">Observaciones</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {costItems
                      .filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType !== 'indirecto')
                      .map((c) => {
                        const valDirecto = c.actualTotal || (c.actualQuantity * c.actualUnitCost) || c.plannedTotal;
                        const iva = c.ivaAmount || 0;
                        const ret = c.retentionAmount || 0;
                        const granTotal = valDirecto + iva - ret;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                              {c.date || '—'}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">
                              {c.concept}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatCOP(valDirecto)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {iva > 0 ? formatCOP(iva) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {ret > 0 ? formatCOP(ret) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCOP(granTotal)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {c.receiptPhotos && c.receiptPhotos.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingReceiptPhotos({
                                      title: c.concept,
                                      invoiceNumber: c.invoiceNumber,
                                      photos: c.receiptPhotos || [],
                                    });
                                    setActivePhotoIndex(0);
                                    setPhotoZoom(1);
                                    setIsPhotoFullscreen(false);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#00668F] font-bold text-xs transition-colors cursor-pointer group"
                                  title="Ver fotos de la factura/soporte"
                                >
                                  <ImageIcon size={13} className="group-hover:scale-110 transition-transform text-[#00668F]" />
                                  <span>{c.invoiceNumber || 'Factura'}</span>
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#00668F] text-white font-mono">
                                    {c.receiptPhotos.length}
                                  </span>
                                </button>
                              ) : (
                                <span>{c.invoiceNumber || '—'}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 text-[11px] italic">
                              {c.observations || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCostItem(c);
                                    setItemForm({
                                      itemCode: c.itemCode || selectedFolderCode,
                                      itemName: c.itemName || selectedFolderCode,
                                      category: c.category,
                                      costType: c.costType,
                                      concept: c.concept,
                                      unit: c.unit,
                                      plannedQuantity: c.plannedQuantity,
                                      plannedUnitCost: c.plannedUnitCost,
                                      actualQuantity: c.actualQuantity,
                                      actualUnitCost: c.actualUnitCost,
                                      date: c.date || new Date().toISOString().split('T')[0],
                                      invoiceNumber: c.invoiceNumber || '',
                                      ivaAmount: c.ivaAmount || 0,
                                      retentionAmount: c.retentionAmount || 0,
                                      observations: c.observations || '',
                                      splitPercentage: c.splitPercentage || 100,
                                      splitWithProjectCode: c.splitWithProjectCode || '',
                                      receiptPhotos: c.receiptPhotos || [],
                                    });
                                    setHasIva(c.hasIva !== undefined ? c.hasIva : Boolean(c.ivaAmount && c.ivaAmount > 0));
                                    setIsAddItemModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-sky-50 rounded transition-colors cursor-pointer"
                                  title="Editar rubro de costo directo"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemToDelete(c)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Eliminar rubro"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  {/* Fila de Consolidados Totales de Costos Directos (Solo visible cuando hay 2 o más registros para evitar duplicación visual) */}
                  {(() => {
                    const directs = costItems.filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType !== 'indirecto');
                    if (directs.length <= 1) return null;

                    const sumVal = directs.reduce((acc, c) => acc + (c.actualTotal || c.plannedTotal || 0), 0);
                    const sumIva = directs.reduce((acc, c) => acc + (c.ivaAmount || 0), 0);
                    const sumRet = directs.reduce((acc, c) => acc + (c.retentionAmount || 0), 0);
                    const sumTotal = sumVal + sumIva - sumRet;

                    return (
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                          <td colSpan={2} className="py-2.5 px-4 text-center font-bold">
                            Consolidados Totales Costos Directos ({directs.length} rubros)
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCOP(sumVal)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumIva > 0 ? formatCOP(sumIva) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumRet > 0 ? formatCOP(sumRet) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#00668F]">{formatCOP(sumTotal)}</td>
                          <td colSpan={3} className="py-2.5 px-3 text-right text-slate-500 font-medium italic text-[11px]">
                            Total incurrido en carpeta {selectedFolderCode}
                          </td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            )}
          </div>

          {/* TABLA 2: COSTOS INDIRECTOS (Tal cual la foto de Excel) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-purple-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
                <h4 className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Costos Indirectos — {selectedFolderCode}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({costItems.filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType === 'indirecto').length} rubros)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setItemForm({
                    ...itemForm,
                    itemCode: selectedFolderCode,
                    itemName: allAvailableItems.find((it) => it.code.toUpperCase() === selectedFolderCode.toUpperCase())?.name || selectedFolderCode,
                    costType: 'indirecto',
                  });
                  setIsAddItemModalOpen(true);
                }}
                className="text-xs font-bold text-purple-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Agregar Rubro Indirecto</span>
              </button>
            </div>

            {costItems.filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType === 'indirecto').length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay costos indirectos registrados para {selectedFolderCode}. Agrega pólizas, peajes, grúas o papelería.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Fecha</th>
                      <th className="py-2.5 px-4">Concepto del Costo Indirecto</th>
                      <th className="py-2.5 px-3 text-right">Valor Costo Indirecto</th>
                      <th className="py-2.5 px-3 text-right">IVA ({projectTaxRate.label})</th>
                      <th className="py-2.5 px-3 text-right">Retención</th>
                      <th className="py-2.5 px-3 text-right">Gran Total</th>
                      <th className="py-2.5 px-3">Factura Proveedor</th>
                      <th className="py-2.5 px-4">Observaciones</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {costItems
                      .filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType === 'indirecto')
                      .map((c) => {
                        const valIndirecto = c.actualTotal || (c.actualQuantity * c.actualUnitCost) || c.plannedTotal;
                        const iva = c.ivaAmount || 0;
                        const ret = c.retentionAmount || 0;
                        const granTotal = valIndirecto + iva - ret;
                        return (
                          <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                              {c.date || '—'}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-800">
                              {c.concept}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatCOP(valIndirecto)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {iva > 0 ? formatCOP(iva) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                              {ret > 0 ? formatCOP(ret) : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatCOP(granTotal)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {c.receiptPhotos && c.receiptPhotos.length > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewingReceiptPhotos({
                                      title: c.concept,
                                      invoiceNumber: c.invoiceNumber,
                                      photos: c.receiptPhotos || [],
                                    });
                                    setActivePhotoIndex(0);
                                    setPhotoZoom(1);
                                    setIsPhotoFullscreen(false);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-xs transition-colors cursor-pointer group"
                                  title="Ver fotos de la factura/soporte"
                                >
                                  <ImageIcon size={13} className="group-hover:scale-110 transition-transform text-purple-600" />
                                  <span>{c.invoiceNumber || 'Factura'}</span>
                                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-purple-700 text-white font-mono">
                                    {c.receiptPhotos.length}
                                  </span>
                                </button>
                              ) : (
                                <span>{c.invoiceNumber || '—'}</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 text-[11px] italic">
                              {c.observations || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingCostItem(c);
                                    setItemForm({
                                      itemCode: c.itemCode || selectedFolderCode,
                                      itemName: c.itemName || selectedFolderCode,
                                      category: c.category,
                                      costType: c.costType,
                                      concept: c.concept,
                                      unit: c.unit,
                                      plannedQuantity: c.plannedQuantity,
                                      plannedUnitCost: c.plannedUnitCost,
                                      actualQuantity: c.actualQuantity,
                                      actualUnitCost: c.actualUnitCost,
                                      date: c.date || new Date().toISOString().split('T')[0],
                                      invoiceNumber: c.invoiceNumber || '',
                                      ivaAmount: c.ivaAmount || 0,
                                      retentionAmount: c.retentionAmount || 0,
                                      observations: c.observations || '',
                                      splitPercentage: c.splitPercentage || 100,
                                      splitWithProjectCode: c.splitWithProjectCode || '',
                                      receiptPhotos: c.receiptPhotos || [],
                                    });
                                    setHasIva(c.hasIva !== undefined ? c.hasIva : Boolean(c.ivaAmount && c.ivaAmount > 0));
                                    setIsAddItemModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors cursor-pointer"
                                  title="Editar rubro de costo indirecto"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setItemToDelete(c)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                                  title="Eliminar rubro"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  {/* Fila de Consolidados Totales de Costos Indirectos (Solo visible cuando hay 2 o más registros para evitar duplicación visual) */}
                  {(() => {
                    const indirects = costItems.filter((c) => (c.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType === 'indirecto');
                    if (indirects.length <= 1) return null;

                    const sumVal = indirects.reduce((acc, c) => acc + (c.actualTotal || c.plannedTotal || 0), 0);
                    const sumIva = indirects.reduce((acc, c) => acc + (c.ivaAmount || 0), 0);
                    const sumRet = indirects.reduce((acc, c) => acc + (c.retentionAmount || 0), 0);
                    const sumTotal = sumVal + sumIva - sumRet;

                    return (
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                          <td colSpan={2} className="py-2.5 px-4 text-center font-bold">
                            Consolidados Totales Costos Indirectos
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCOP(sumVal)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumIva > 0 ? formatCOP(sumIva) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumRet > 0 ? formatCOP(sumRet) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-purple-700">{formatCOP(sumTotal)}</td>
                          <td colSpan={2} className="py-2.5 px-3 text-right text-slate-500 text-[11px]">
                            {indirects.length} registros cargados
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            )}
          </div>

          {/* TABLA 3: FACTURACIÓN (Tal cual la foto de Excel) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-emerald-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Facturación — {selectedFolderCode}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({billingItems.filter((b) => (b.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase()).length} facturas)
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBillingForm({
                    ...billingForm,
                    itemCode: selectedFolderCode,
                  });
                  setIsAddBillingModalOpen(true);
                }}
                className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Agregar Factura</span>
              </button>
            </div>

            {billingItems.filter((b) => (b.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase()).length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No hay facturas emitidas ni registradas para {selectedFolderCode}. Registra facturas FE con su subtotal e IVA.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      <th className="py-2.5 px-3">Fecha Factura</th>
                      <th className="py-2.5 px-3">Número Factura</th>
                      <th className="py-2.5 px-3 text-right">Anticipo</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 text-right">IVA ({projectTaxRate.label})</th>
                      <th className="py-2.5 px-3 text-right">Retención</th>
                      <th className="py-2.5 px-3 text-right">Gran Total</th>
                      <th className="py-2.5 px-4">Observaciones</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Fecha Pago</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {billingItems
                      .filter((b) => (b.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase())
                      .map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            {b.invoiceDate || '—'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                            {b.invoiceNumber}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {b.advanceAmount ? formatCOP(b.advanceAmount) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {formatCOP(b.subtotal)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {b.ivaAmount ? formatCOP(b.ivaAmount) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                            {b.retentionAmount ? formatCOP(b.retentionAmount) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                            {formatCOP(b.grandTotal)}
                          </td>
                          <td className="py-2.5 px-4 text-slate-500 text-[11px] italic">
                            {b.observations || '—'}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            {b.paymentDate || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setBillingToDelete(b)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Eliminar factura"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                  {/* Fila de Consolidados Totales de Facturación (Solo visible cuando hay 2 o más registros para evitar duplicación visual) */}
                  {(() => {
                    const bills = billingItems.filter((b) => (b.itemCode || '').toUpperCase() === selectedFolderCode.toUpperCase());
                    if (bills.length <= 1) return null;

                    const sumAnt = bills.reduce((acc, b) => acc + (b.advanceAmount || 0), 0);
                    const sumSub = bills.reduce((acc, b) => acc + (b.subtotal || 0), 0);
                    const sumIva = bills.reduce((acc, b) => acc + (b.ivaAmount || 0), 0);
                    const sumRet = bills.reduce((acc, b) => acc + (b.retentionAmount || 0), 0);
                    const sumGrand = bills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);

                    return (
                      <tfoot>
                        <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                          <td colSpan={2} className="py-2.5 px-4 text-center font-bold">
                            Consolidados Totales Facturación ({bills.length} facturas)
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumAnt > 0 ? formatCOP(sumAnt) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCOP(sumSub)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumIva > 0 ? formatCOP(sumIva) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumRet > 0 ? formatCOP(sumRet) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{formatCOP(sumGrand)}</td>
                          <td colSpan={3} className="py-2.5 px-3 text-right text-emerald-700 font-medium italic text-[11px]">
                            Total facturado en carpeta {selectedFolderCode}
                          </td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      </>
      )}

      {/* MODAL: CREAR O AÑADIR ITEM / CARPETA */}
      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-sky-50 text-[#00668F]">
                  <FolderPlus size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Añadir ITEM / Carpeta</h3>
                  <p className="text-[11px] text-slate-400">Estructura contractual del proyecto (Excel oficial)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateFolderModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Código del ITEM</label>
                <input
                  type="text"
                  required
                  placeholder="ej. ITEM 01, ITEM 1, AD-01..."
                  value={folderForm.code}
                  onChange={(e) => setFolderForm({ ...folderForm, code: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase font-bold focus:bg-white focus:border-[#00668F] transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre Descriptivo del ITEM</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Mantenimiento de fijaciones mecánicas..."
                  value={folderForm.name}
                  onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:border-[#00668F] transition-all"
                />
              </div>

              <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-xl text-xs text-sky-800 leading-relaxed">
                <p className="font-semibold text-[#00668F] mb-0.5">ℹ️ Carpeta de Agrupación Operativa</p>
                Los ITEMS agrupan los rubros de costos directos, indirectos y facturación asociada del proyecto. El presupuesto general se gestiona a nivel de proyecto (Consolidado de Oferta).
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observaciones / Alcance Contractual</label>
                <input
                  type="text"
                  placeholder="ej. Pilonas en cables aéreos estación motriz"
                  value={folderForm.observations}
                  onChange={(e) => setFolderForm({ ...folderForm, observations: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateFolderModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer text-xs shadow-xs"
                >
                  Guardar Carpeta de ITEM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR FACTURA A ITEM */}
      {isAddBillingModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full flex flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-white">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
                  <Receipt size={18} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Agregar Facturación — {billingForm.itemCode || selectedFolderCode}</h3>
                  <p className="text-[11px] text-slate-400">Registro de factura emitida asociada al ITEM</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBillingModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBilling} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha Factura</label>
                  <input
                    type="date"
                    required
                    value={billingForm.invoiceDate}
                    onChange={(e) => setBillingForm({ ...billingForm, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número Factura</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. FE-318 / FE-292"
                    value={billingForm.invoiceNumber}
                    onChange={(e) => setBillingForm({ ...billingForm, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subtotal (COP)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="0"
                    value={billingForm.subtotal || ''}
                    onChange={(e) => {
                      const sub = e.target.value === '' ? 0 : Number(e.target.value);
                      setBillingForm((prev) => ({
                        ...prev,
                        subtotal: sub,
                        ivaAmount: billingHasIva ? Math.round(sub * projectTaxRate.rate) : 0,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-emerald-600 transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">IVA ({projectTaxRate.label})</label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !billingHasIva;
                        setBillingHasIva(next);
                        setBillingForm((prev) => ({
                          ...prev,
                          ivaAmount: next ? Math.round((prev.subtotal || 0) * projectTaxRate.rate) : 0,
                        }));
                      }}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                        billingHasIva ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {billingHasIva ? 'Con IVA' : 'Sin IVA'}
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    disabled={!billingHasIva}
                    placeholder="0"
                    value={billingHasIva ? (billingForm.ivaAmount || '') : ''}
                    onChange={(e) => setBillingForm({ ...billingForm, ivaAmount: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-emerald-600 transition-all disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Anticipo Amortizado</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={billingForm.advanceAmount || ''}
                    onChange={(e) => setBillingForm({ ...billingForm, advanceAmount: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-emerald-600 transition-all"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retención</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={billingForm.retentionAmount || ''}
                    onChange={(e) => setBillingForm({ ...billingForm, retentionAmount: e.target.value === '' ? 0 : Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-emerald-600 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fecha de Pago</label>
                  <input
                    type="date"
                    value={billingForm.paymentDate}
                    onChange={(e) => setBillingForm({ ...billingForm, paymentDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Observaciones</label>
                  <input
                    type="text"
                    placeholder="ej. Pago primer hito contractual"
                    value={billingForm.observations}
                    onChange={(e) => setBillingForm({ ...billingForm, observations: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between font-mono">
                <span className="font-bold text-emerald-900 text-xs">Gran Total Proyectado:</span>
                <span className="font-black text-emerald-800 text-sm">
                  {formatCOP((billingForm.subtotal || 0) + (billingForm.ivaAmount || 0) - (billingForm.retentionAmount || 0))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBillingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer text-xs shadow-xs"
                >
                  Guardar Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR RUBRO */}
      {isAddItemModalOpen && (() => {
        const catMeta = getCategoryMeta(itemForm.category);
        return (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden">
              {/* Header Fijo */}
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 shrink-0 bg-white">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingCostItem ? 'Editar Rubro Financiero' : `Agregar Rubro a ${itemForm.itemCode || selectedFolderCode || 'ITEM'}`}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {itemForm.costType === 'indirecto' ? 'Costo Indirecto (Pólizas, Peajes, Grúas)' : 'Costo Directo (MO, Obra, Insumos)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddItemModalOpen(false);
                    setEditingCostItem(null);
                  }}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Formulario con Scroll Interno Fluido */}
              <form onSubmit={handleAddItem} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
                  {/* ITEM Contractual / Operativo */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">ITEM Contractual / Operativo</label>
                    <CreatableSelect
                      options={allAvailableItems.map((it) => ({
                        id: it.code,
                        name: `${it.code} - ${it.name}`,
                      }))}
                      value={getItemDisplayName(itemForm.itemCode || selectedFolderCode, itemForm.itemName)}
                      onChange={(val) => {
                        const matched = allAvailableItems.find(
                          (it) => it.code.toLowerCase() === val.toLowerCase() || `${it.code} - ${it.name}`.toLowerCase() === val.toLowerCase()
                        );
                        if (matched) {
                          const suggestedCategory = (matched as any).categoryDefault || itemForm.category;
                          const meta = getCategoryMeta(suggestedCategory);
                          setItemForm({
                            ...itemForm,
                            itemCode: matched.code,
                            itemName: matched.name,
                            category: suggestedCategory,
                            unit: meta.defaultUnit,
                          });
                        } else {
                          setItemForm({
                            ...itemForm,
                            itemCode: val,
                            itemName: val,
                          });
                        }
                      }}
                      placeholder="Seleccionar o escribir ITEM (ej. ITEM 01, ITEM 1)..."
                      isClearable={true}
                      allowCustomText={true}
                    />
                  </div>

                  {/* Categoría Financiera */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Categoría Financiera</label>
                    <CreatableSelect
                      options={INTECKNO_OFFICIAL_CATEGORIES.map((cat) => ({
                        id: cat.key,
                        name: cat.label
                      }))}
                      value={catMeta.label}
                      onChange={(val) => {
                        const meta = getCategoryMeta(val);
                        setItemForm({
                          ...itemForm,
                          category: meta.key,
                          unit: meta.defaultUnit,
                          costType: meta.defaultCostType,
                        });
                      }}
                      placeholder="Seleccionar o buscar categoría..."
                    />
                  </div>

                  {/* Concepto / Actividad / Proveedor */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Concepto / Actividad / Proveedor</label>
                    <input
                      type="text"
                      required
                      placeholder={catMeta.conceptPlaceholder}
                      value={itemForm.concept}
                      onChange={(e) => setItemForm({ ...itemForm, concept: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:border-[#00668F] transition-all"
                    />
                  </div>

                  {/* Fecha y Soporte / Factura */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={itemForm.date}
                        onChange={(e) => setItemForm({ ...itemForm, date: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Recibo / Factura / DS</label>
                      <input
                        type="text"
                        placeholder="ej. FE-3098 / DS-1035 / WF-970838"
                        value={itemForm.invoiceNumber}
                        onChange={(e) => setItemForm({ ...itemForm, invoiceNumber: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  {/* Subir Fotos de la Factura / Soporte */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                        <Camera size={14} className="text-[#00668F]" />
                        <span>Fotos de la Factura / Recibo / Soporte</span>
                      </label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {itemForm.receiptPhotos.length} {itemForm.receiptPhotos.length === 1 ? 'foto adjunta' : 'fotos adjuntas'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-dashed border-slate-300 hover:border-[#00668F] rounded-xl text-xs font-semibold text-slate-600 hover:text-[#00668F] cursor-pointer transition-all">
                        <ImageIcon size={15} />
                        <span>Adjuntar fotos desde este dispositivo...</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Previsualización en miniaturas con botón eliminar */}
                    {itemForm.receiptPhotos.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        {itemForm.receiptPhotos.map((photo, pIdx) => (
                          <div key={pIdx} className="relative group rounded-lg overflow-hidden border border-slate-200 aspect-square bg-slate-100">
                            <img
                              src={photo}
                              alt={`Foto ${pIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(pIdx)}
                              className="absolute top-1 right-1 p-1 rounded-full bg-slate-900/70 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                              title="Remover foto"
                            >
                              <X size={11} />
                            </button>
                            <span className="absolute bottom-1 left-1 px-1 py-0.2 bg-black/60 text-white rounded text-[9px] font-mono">
                              #{pIdx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Unidad y Cantidad (Grid 2 columnas simétrico) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unidad de Medida</label>
                      <CreatableSelect
                        key={`unit-${itemForm.category}`}
                        value={itemForm.unit}
                        onChange={(val) => setItemForm({ ...itemForm, unit: val })}
                        options={catMeta.allowedUnits}
                        placeholder="Seleccionar unidad..."
                        allowCustomText={true}
                        isClearable={true}
                        inputClassName="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={itemForm.plannedQuantity || ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : Number(e.target.value);
                          const newQty = val;
                          setItemForm((prev) => {
                            const newCost = prev.actualUnitCost || prev.plannedUnitCost || 0;
                            const newSubtotal = newCost * (newQty || 1);
                            const updatedIva = hasIva ? Math.round(newSubtotal * projectTaxRate.rate) : 0;
                            return {
                              ...prev,
                              plannedQuantity: newQty,
                              actualQuantity: newQty,
                              ivaAmount: updatedIva,
                            };
                          });
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:bg-white focus:border-[#00668F] transition-all"
                      />
                    </div>
                  </div>

                  {/* Costo / Subtotal (Fila completa estructurada y alineada) */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Costo / Subtotal {itemForm.costType === 'directo' ? 'Directo' : 'Indirecto'} (COP)
                    </label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={itemForm.actualUnitCost || itemForm.plannedUnitCost || ''}
                      onChange={(e) => {
                        const val = e.target.value === '' ? 0 : Number(e.target.value);
                        setItemForm((prev) => {
                          const qty = prev.plannedQuantity || 1;
                          const subtotal = val * qty;
                          const updatedIva = hasIva ? Math.round(subtotal * projectTaxRate.rate) : 0;
                          return {
                            ...prev,
                            plannedUnitCost: val,
                            actualUnitCost: val,
                            actualQuantity: qty,
                            ivaAmount: updatedIva,
                          };
                        });
                      }}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-800 focus:bg-white focus:border-[#00668F] transition-all"
                    />
                  </div>

                  {/* IVA y Retención */}
                  <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <label className="font-bold text-slate-700 text-xs">
                          IVA ({projectTaxRate.countryName}: {projectTaxRate.label})
                        </label>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setHasIva(false);
                            setItemForm((prev) => ({ ...prev, ivaAmount: 0 }));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                            !hasIva
                              ? 'bg-slate-700 text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Sin IVA
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHasIva(true);
                            const cost = itemForm.actualUnitCost || itemForm.plannedUnitCost || 0;
                            const qty = itemForm.plannedQuantity || 1;
                            const sub = cost * qty;
                            setItemForm((prev) => ({
                              ...prev,
                              ivaAmount: Math.round(sub * projectTaxRate.rate),
                            }));
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer transition-colors ${
                            hasIva
                              ? 'bg-[#00668F] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          Con IVA ({projectTaxRate.label})
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">
                          {hasIva ? `Valor IVA Calculado (${projectTaxRate.label})` : 'IVA (No aplica)'}
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={itemForm.ivaAmount || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setItemForm({ ...itemForm, ivaAmount: val });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:border-[#00668F] transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">Retención (si aplica)</label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={itemForm.retentionAmount || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setItemForm({ ...itemForm, retentionAmount: val });
                          }}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs focus:border-[#00668F] transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* GRAN TOTAL: Solo Visualización de la Suma (Subtotal + IVA + Retención) */}
                  <div className="p-3.5 bg-linear-to-r from-sky-50 to-blue-50/60 rounded-xl border border-sky-200/80 flex items-center justify-between">
                    <div>
                      <span className="block font-bold text-slate-800 text-xs">Gran Total del Rubro:</span>
                      <span className="text-[10px] text-slate-500">Costo/Subtotal + IVA + Retención</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-[#00668F] font-mono">
                        {(() => {
                          const cost = itemForm.actualUnitCost || itemForm.plannedUnitCost || 0;
                          const qty = itemForm.plannedQuantity || 1;
                          const subtotal = cost * qty;
                          const iva = itemForm.ivaAmount || 0;
                          const ret = itemForm.retentionAmount || 0;
                          const total = subtotal + iva + ret;
                          return formatCOP(total);
                        })()}
                      </span>
                    </div>
                  </div>

                  {/* Prorrateo entre Proyectos */}
                  {catMeta.showProrrateo ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-700 text-xs">Prorrateo / División entre Proyectos</label>
                        <span className="text-[10px] font-bold text-[#00668F] font-mono">{itemForm.splitPercentage}% a este proyecto</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">% Asignado a {project.code}</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            placeholder="100"
                            value={itemForm.splitPercentage || ''}
                            onChange={(e) => setItemForm({ ...itemForm, splitPercentage: e.target.value === '' ? 0 : Number(e.target.value) })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-slate-500 mb-0.5">Compartido con Proyecto</label>
                          <input
                            type="text"
                            placeholder="ej. P25 - 21"
                            value={itemForm.splitWithProjectCode}
                            onChange={(e) => setItemForm({ ...itemForm, splitWithProjectCode: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center justify-between">
                      <span>Imputación directa 100% a este proyecto ({catMeta.shortLabel})</span>
                      <span className="font-mono font-bold text-[#00668F]">100%</span>
                    </div>
                  )}

                  {/* Observaciones */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Observaciones / Notas de Obra</label>
                    <input
                      type="text"
                      placeholder={catMeta.notesPlaceholder}
                      value={itemForm.observations}
                      onChange={(e) => setItemForm({ ...itemForm, observations: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:border-[#00668F] transition-all"
                    />
                  </div>
                </div>

                {/* Footer Fijo con Botones */}
                <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0">
                  <div className="text-[11px] font-mono text-slate-500">
                    Gran Total: <strong className="text-slate-900 font-bold">{(() => {
                      const cost = itemForm.actualUnitCost || itemForm.plannedUnitCost || 0;
                      const qty = itemForm.plannedQuantity || 1;
                      const subtotal = cost * qty;
                      const iva = itemForm.ivaAmount || 0;
                      const ret = itemForm.retentionAmount || 0;
                      return formatCOP(subtotal + iva + ret);
                    })()}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddItemModalOpen(false);
                        setEditingCostItem(null);
                      }}
                      className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-colors cursor-pointer text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer text-xs shadow-xs"
                    >
                      {editingCostItem ? 'Guardar Cambios' : 'Guardar Rubro'}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Modal Confirmación de Eliminación de Rubro */}
      <ConfirmDeleteModal
        isOpen={Boolean(itemToDelete)}
        title="¿Eliminar Rubro Financiero?"
        itemName={itemToDelete ? itemToDelete.concept : ''}
        description="Esta acción eliminará el concepto de costo de la matriz financiera del proyecto. Para confirmar, escribe BORRAR a continuación:"
        requireConfirmWord={true}
        confirmWord="BORRAR"
        confirmText="Eliminar Rubro"
        onConfirm={() => {
          if (itemToDelete) {
            const updated = costItems.filter((i) => i.id !== itemToDelete.id);
            setCostItems(updated);
            if (onUpdateProject) {
              onUpdateProject({ ...project, costMatrix: updated } as any);
            }
            setItemToDelete(null);
          }
        }}
        onCancel={() => setItemToDelete(null)}
      />

      {/* Modal Confirmación de Eliminación de Carpeta de ITEM */}
      <ConfirmDeleteModal
        isOpen={Boolean(folderToDelete)}
        title="¿Eliminar Carpeta de ITEM Contractual?"
        itemName={folderToDelete ? `${folderToDelete.code} - ${folderToDelete.name}` : ''}
        description="Esta acción eliminará el ITEM completo junto con todos sus rubros de costos directos, costos indirectos y facturación asociada. Para confirmar, escribe BORRAR a continuación:"
        requireConfirmWord={true}
        confirmWord="BORRAR"
        confirmText="Eliminar ITEM Completo"
        onConfirm={() => {
          if (folderToDelete) {
            const codeToDel = folderToDelete.code.toUpperCase();
            const updatedFolders = projectItems.filter((f) => f.code.toUpperCase() !== codeToDel);
            const updatedCosts = costItems.filter((c) => (c.itemCode || '').toUpperCase() !== codeToDel);
            const updatedBills = billingItems.filter((b) => (b.itemCode || '').toUpperCase() !== codeToDel);

            setProjectItems(updatedFolders);
            setCostItems(updatedCosts);
            setBillingItems(updatedBills);

            if (selectedFolderCode?.toUpperCase() === codeToDel) {
              setSelectedFolderCode(null);
            }

            if (onUpdateProject) {
              onUpdateProject({
                ...project,
                projectItems: updatedFolders as any,
                costMatrix: updatedCosts as any,
                billingItems: updatedBills as any,
              } as any);
            }
            setFolderToDelete(null);
          }
        }}
        onCancel={() => setFolderToDelete(null)}
      />

      {/* Modal Confirmación de Eliminación de Factura */}
      <ConfirmDeleteModal
        isOpen={Boolean(billingToDelete)}
        title="¿Eliminar Registro de Factura?"
        itemName={billingToDelete ? `Factura N° ${billingToDelete.invoiceNumber}` : ''}
        description="Esta acción eliminará el registro de facturación asociado a este ITEM. Para confirmar, escribe BORRAR a continuación:"
        requireConfirmWord={true}
        confirmWord="BORRAR"
        confirmText="Eliminar Factura"
        onConfirm={() => {
          if (billingToDelete) {
            const updated = billingItems.filter((b) => b.id !== billingToDelete.id);
            setBillingItems(updated);
            if (onUpdateProject) {
              onUpdateProject({ ...project, billingItems: updated } as any);
            }
            setBillingToDelete(null);
          }
        }}
        onCancel={() => setBillingToDelete(null)}
      />

      {/* Modal Confirmación de Eliminación de Rubro Presupuestal de Oferta */}
      <ConfirmDeleteModal
        isOpen={Boolean(offerItemToDelete)}
        title="¿Eliminar Rubro del Presupuesto Comercial?"
        itemName={offerItemToDelete ? offerItemToDelete.rubroName : ''}
        description="Esta acción eliminará este rubro del Consolidado de Oferta y recalculará automáticamente los subtotales, IVA y el Gran Total. Para confirmar, escribe BORRAR a continuación:"
        requireConfirmWord={true}
        confirmWord="BORRAR"
        confirmText="Eliminar Rubro de Oferta"
        onConfirm={handleConfirmDeleteOfferItem}
        onCancel={() => setOfferItemToDelete(null)}
      />

      {/* Modal: Añadir Rubro al Consolidado de Oferta (Presupuesto) */}
      {isAddOfferItemModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#00668F]/10 text-[#00668F]">
                  <FileSpreadsheet size={16} />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Añadir Rubro Presupuestal a la Oferta</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddOfferItemModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddOfferItem} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Rubro Presupuestal *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. 6. TRANSPORTE Y LOGÍSTICA DE MAQUINARIA"
                  value={offerItemForm.rubroName}
                  onChange={(e) => setOfferItemForm({ ...offerItemForm, rubroName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:border-[#00668F] transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción / Alcance del Rubro (Opcional)</label>
                <textarea
                  rows={3}
                  placeholder="ej. Traslado terrestre de equipos pesados, alquiler de cama baja y escolta técnica en ruta nacional."
                  value={offerItemForm.description}
                  onChange={(e) => setOfferItemForm({ ...offerItemForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#00668F] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tratamiento de IVA</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOfferItemForm({ ...offerItemForm, hasIva: true })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      offerItemForm.hasIva !== false
                        ? 'bg-sky-50 border-[#00668F] text-[#00668F] ring-1 ring-[#00668F]/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Con IVA ({projectTaxRate.label})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOfferItemForm({ ...offerItemForm, hasIva: false })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      offerItemForm.hasIva === false
                        ? 'bg-slate-200 border-slate-400 text-slate-800 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Sin IVA (Exento)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor Presupuestado (COP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400 pointer-events-none">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={formatThousands(offerItemForm.budgetPlanned)}
                    onChange={(e) => setOfferItemForm({ ...offerItemForm, budgetPlanned: parseThousands(e.target.value) })}
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:border-[#00668F] transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOfferItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer text-xs shadow-xs"
                >
                  Añadir Rubro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Rubro del Consolidado de Oferta (Presupuesto) */}
      {editingOfferItem && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-[#00668F]/10 text-[#00668F]">
                  <Edit3 size={16} />
                </span>
                <h3 className="text-sm font-bold text-slate-900">Editar Rubro Presupuestal</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingOfferItem(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditedOfferItem} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nombre del Rubro Presupuestal *</label>
                <input
                  type="text"
                  required
                  value={editingOfferItem.item.rubroName}
                  onChange={(e) =>
                    setEditingOfferItem({
                      ...editingOfferItem,
                      item: { ...editingOfferItem.item, rubroName: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:border-[#00668F] transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descripción / Alcance del Rubro</label>
                <textarea
                  rows={3}
                  value={editingOfferItem.item.description || ''}
                  onChange={(e) =>
                    setEditingOfferItem({
                      ...editingOfferItem,
                      item: { ...editingOfferItem.item, description: e.target.value },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-[#00668F] transition-all resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tratamiento de IVA</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setEditingOfferItem({
                        ...editingOfferItem,
                        item: { ...editingOfferItem.item, hasIva: true },
                      })
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      editingOfferItem.item.hasIva !== false
                        ? 'bg-sky-50 border-[#00668F] text-[#00668F] ring-1 ring-[#00668F]/30'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Con IVA ({projectTaxRate.label})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditingOfferItem({
                        ...editingOfferItem,
                        item: { ...editingOfferItem.item, hasIva: false },
                      })
                    }
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      editingOfferItem.item.hasIva === false
                        ? 'bg-slate-200 border-slate-400 text-slate-800 font-black'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>Sin IVA (Exento)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Valor Presupuestado (COP)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={formatThousands(editingOfferItem.item.budgetPlanned)}
                  onChange={(e) =>
                    setEditingOfferItem({
                      ...editingOfferItem,
                      item: {
                        ...editingOfferItem.item,
                        budgetPlanned: parseThousands(e.target.value),
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:bg-white focus:border-[#00668F] transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOfferItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors cursor-pointer text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer text-xs shadow-xs"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visor de Fotos de Factura / Soporte con Modo Pantalla Completa y Zoom */}
      {viewingReceiptPhotos && (
        <div
          className={`fixed inset-0 z-[9999] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-150 ${
            isPhotoFullscreen ? 'p-0' : ''
          }`}
        >
          <div
            className={`bg-slate-900 border border-slate-700/60 shadow-2xl flex flex-col overflow-hidden transition-all duration-200 ${
              isPhotoFullscreen
                ? 'w-screen h-screen rounded-none'
                : 'rounded-2xl max-w-6xl w-full h-[92vh]'
            }`}
          >
            {/* Header del Visor */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/80 shrink-0 text-white">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-xl bg-[#00668F]/30 text-sky-400 border border-[#00668F]/40">
                  <ImageIcon size={20} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>Soporte: {viewingReceiptPhotos.invoiceNumber || viewingReceiptPhotos.title}</span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Foto {activePhotoIndex + 1} de {viewingReceiptPhotos.photos.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {viewingReceiptPhotos.title}
                  </p>
                </div>
              </div>

              {/* Acciones y Controles de Zoom / Pantalla Completa */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Zoom Out */}
                <button
                  type="button"
                  onClick={() => setPhotoZoom((prev) => Math.max(0.5, Number((prev - 0.25).toFixed(2))))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
                  title="Alejar (Zoom -)"
                >
                  <ZoomOut size={16} />
                </button>

                <span className="text-xs font-mono font-bold text-slate-300 px-1 min-w-[45px] text-center">
                  {Math.round(photoZoom * 100)}%
                </span>

                {/* Zoom In */}
                <button
                  type="button"
                  onClick={() => setPhotoZoom((prev) => Math.min(3, Number((prev + 0.25).toFixed(2))))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
                  title="Acercar (Zoom +)"
                >
                  <ZoomIn size={16} />
                </button>

                {/* Reset Zoom */}
                {photoZoom !== 1 && (
                  <button
                    type="button"
                    onClick={() => setPhotoZoom(1)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors cursor-pointer text-xs"
                    title="Restablecer tamaño (100%)"
                  >
                    <RotateCw size={15} />
                  </button>
                )}

                <div className="h-5 w-px bg-slate-800 mx-1" />

                {/* Descargar imagen original en alta definición */}
                <a
                  href={viewingReceiptPhotos.photos[activePhotoIndex]}
                  download={`soporte_${viewingReceiptPhotos.invoiceNumber || 'factura'}_${activePhotoIndex + 1}.jpg`}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                  title="Descargar imagen en alta definición"
                >
                  <ExternalLink size={16} />
                  <span className="hidden sm:inline font-bold">Descargar</span>
                </a>

                {/* Alternar Pantalla Completa */}
                <button
                  type="button"
                  onClick={() => setIsPhotoFullscreen(!isPhotoFullscreen)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1"
                  title={isPhotoFullscreen ? 'Salir de pantalla completa' : 'Ver a pantalla completa'}
                >
                  {isPhotoFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  <span className="hidden sm:inline font-bold">
                    {isPhotoFullscreen ? 'Salir' : 'Pantalla Completa'}
                  </span>
                </button>

                <div className="h-5 w-px bg-slate-800 mx-1" />

                {/* Cerrar Visor */}
                <button
                  type="button"
                  onClick={() => {
                    setViewingReceiptPhotos(null);
                    setPhotoZoom(1);
                    setIsPhotoFullscreen(false);
                  }}
                  className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors cursor-pointer text-xs"
                  title="Cerrar visor"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Contenedor Principal de la Imagen */}
            <div className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-2 relative select-none">
              {viewingReceiptPhotos.photos[activePhotoIndex] && (
                <div
                  className="relative transition-transform duration-150 ease-out flex items-center justify-center"
                  style={{
                    transform: `scale(${photoZoom})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <img
                    src={viewingReceiptPhotos.photos[activePhotoIndex]}
                    alt={`Soporte ${activePhotoIndex + 1}`}
                    className="max-h-[82vh] w-auto max-w-full object-contain rounded-lg shadow-2xl transition-all"
                  />
                </div>
              )}
            </div>

            {/* Barra Inferior: Selector de Miniaturas si hay múltiples fotos */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto max-w-[70vw] py-1">
                {viewingReceiptPhotos.photos.length > 1 &&
                  viewingReceiptPhotos.photos.map((ph, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setActivePhotoIndex(idx);
                        setPhotoZoom(1);
                      }}
                      className={`h-12 w-12 rounded-lg border-2 overflow-hidden shrink-0 transition-all cursor-pointer ${
                        activePhotoIndex === idx
                          ? 'border-sky-400 scale-105 shadow-md shadow-sky-500/20 ring-2 ring-sky-400/30'
                          : 'border-slate-700 opacity-60 hover:opacity-100 hover:border-slate-500'
                      }`}
                      title={`Ver foto #${idx + 1}`}
                    >
                      <img src={ph} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => {
                    setViewingReceiptPhotos(null);
                    setPhotoZoom(1);
                    setIsPhotoFullscreen(false);
                  }}
                  className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Cerrar Visor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalle Completo de Rubro */}
      <DetailModal
        isOpen={Boolean(selectedCostDetail)}
        title={selectedCostDetail?.concept || 'Detalle de Rubro Presupuestal'}
        subtitle={selectedCostDetail ? `Categoría: ${selectedCostDetail.category.replace('_', ' ').toUpperCase()} | Proyecto: ${project.name}` : ''}
        badge={selectedCostDetail ? {
          label: selectedCostDetail.variance >= 0 ? 'Dentro de Presupuesto' : 'Sobrecosto / Desvío',
          color: selectedCostDetail.variance >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
        } : undefined}
        onClose={() => setSelectedCostDetail(null)}
        fields={selectedCostDetail ? [
          { label: 'ITEM Contractual / Operativo', value: getItemDisplayName(selectedCostDetail.itemCode, selectedCostDetail.itemName), colSpan: 2 },
          { label: 'Concepto / Actividad / Proveedor', value: selectedCostDetail.concept, colSpan: 2 },
          { label: 'Tipo de Costo', value: selectedCostDetail.costType === 'indirecto' ? 'Costos Indirectos (Pólizas, Peajes)' : 'Costos Directos (MO, Obra, Insumos)' },
          { label: 'Categoría Financiera', value: selectedCostDetail.category.replace('_', ' ').toUpperCase() },
          { label: 'Fecha de Corte / Gasto', value: selectedCostDetail.date || 'No registrada' },
          { label: 'N° Recibo / Factura / Soporte', value: selectedCostDetail.invoiceNumber || 'Sin soporte asignado', isMono: true },
          { label: 'Prorrateo / División', value: selectedCostDetail.splitPercentage ? `${selectedCostDetail.splitPercentage}% a este proyecto ${selectedCostDetail.splitWithProjectCode ? `(Compartido con ${selectedCostDetail.splitWithProjectCode})` : ''}` : '100% Imputado a este proyecto' },
          { label: 'Unidad de Medida', value: selectedCostDetail.unit, isMono: true },
          { label: 'Cantidad Planificada', value: selectedCostDetail.plannedQuantity.toString(), isMono: true },
          { label: 'Costo Unitario Plan', value: formatCOP(selectedCostDetail.plannedUnitCost), isMono: true },
          { label: 'Total Planificado', value: formatCOP(selectedCostDetail.plannedTotal), isMono: true },
          { label: 'Cantidad Real', value: selectedCostDetail.actualQuantity.toString(), isMono: true },
          { label: 'Costo Unitario Real', value: formatCOP(selectedCostDetail.actualUnitCost), isMono: true },
          { label: 'Total Real Incurrido', value: formatCOP(selectedCostDetail.actualTotal), isMono: true },
          { label: 'Desviación Presupuestal', value: `${selectedCostDetail.variance >= 0 ? '+' : ''}${formatCOP(selectedCostDetail.variance)}`, isMono: true },
          { label: 'Observaciones / Notas', value: selectedCostDetail.observations || 'Sin observaciones.', colSpan: 2 },
        ] : []}
      />
    </div>
  );
};

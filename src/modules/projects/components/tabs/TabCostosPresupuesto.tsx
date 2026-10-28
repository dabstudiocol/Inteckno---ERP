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
} from 'lucide-react';
import { Project } from '../../../../types';
import { CostMatrixItem, ProjectItemFolder, ProjectBillingItem } from '../../../../types/ProjectSchema';
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

// Catálogo de ITEMS Oficiales de Inteckno (Basado en Estructura de Control de Proyectos P23, P25, P26)
export interface IntecknoItemDefinition {
  code: string;
  name: string;
  categoryDefault?: CostMatrixItem['category'];
  description?: string;
}

export const INTECKNO_PROJECT_ITEMS: IntecknoItemDefinition[] = [
  { code: 'ITEM 01', name: 'Mantenimiento Electromecánico Estación Motriz / Retorno', categoryDefault: 'mano_obra_itk' },
  { code: 'ITEM 02', name: 'Overhaul de Balancines, Rodillos y Ejes de Pilonas', categoryDefault: 'repuestos_fabricacion' },
  { code: 'ITEM 03', name: 'Inspección Magneto-inductiva (MRT) de Cables Tractores / Portadores', categoryDefault: 'inspeccion_mrt' },
  { code: 'ITEM 04', name: 'Ensayos No Destructivos (END / NDT) en Soldaduras y Perno-Pasadores', categoryDefault: 'ensayos_end' },
  { code: 'ITEM 05', name: 'Alineación Láser y Análisis de Vibraciones en Reductor y Grupo Motriz', categoryDefault: 'analisis_vibraciones' },
  { code: 'ITEM 06', name: 'Desarme, Inspección y Calibración de Mordazas de Cabinas', categoryDefault: 'mano_obra_itk' },
  { code: 'ITEM 07', name: 'Tendido, Recorte y Empalme de Cable de Tracción', categoryDefault: 'mano_obra_itk' },
  { code: 'ITEM 08', name: 'Cámara celular / Instalación red de aire / Almacén taller', categoryDefault: 'consumibles_taller' },
  { code: 'ITEM 09', name: 'Suministro de Repuestos Críticos y Fabricación Metalmecánica', categoryDefault: 'repuestos_fabricacion' },
  { code: 'ITEM 10', name: 'Maniobras Especializadas de Izaje y Grúas Telescópicas en Línea', categoryDefault: 'subcontratos_gruas' },
  { code: 'ITEM 11', name: 'Mantenimiento de fijaciones mecánicas: retorqueo y ajuste de tornillería, espárragos y pernos en pilonas en cables aéreos', categoryDefault: 'mano_obra_itk' },
  { code: 'ITEM 12', name: 'Termografía Infrarroja y Monitoreo de Redes Eléctricas', categoryDefault: 'termografia' },
  { code: 'ITEM 13', name: 'Suministros de ferretería, soldadura y herramientas de precisión', categoryDefault: 'consumibles_taller' },
  { code: 'ITEM 14', name: 'Seguridad y Salud en el Trabajo (SST), ARO y Permisos en Alturas', categoryDefault: 'mano_obra_itk' },
  { code: 'ITEM 15', name: 'Transporte, Camionetas 4x4 y Logística de Cuadrilla', categoryDefault: 'viaticos_transporte' },
  { code: 'ITEM 16', name: 'Pasajes Aéreos, Hotel y Viáticos de Comisión Técnica', categoryDefault: 'viaticos_transporte' },
  { code: 'ITEM 17', name: 'Costos Globales Transversales / Administración de Proyecto', categoryDefault: 'imprevistos_contingencia' },
  { code: 'ITEM 18', name: 'Placas, Señalización Técnica y Marcación de Componentes', categoryDefault: 'consumibles_taller' },
  { code: 'ITEM 19', name: 'Pólizas Contractuales, RCE y Amparos de Cumplimiento', categoryDefault: 'imprevistos_contingencia' },
  { code: 'ITEM 20', name: 'Liquidación de Obra, Informes Técnicos Finales y As-Built', categoryDefault: 'mano_obra_itk' },
  { code: 'AD-25', name: 'Adicional / Otrosí / Modificación Contractual', categoryDefault: 'mano_obra_itk' },
];

export function getItemDisplayName(code?: string, name?: string) {
  if (!code && !name) return 'Sin ITEM asignado';
  if (code && name) return `${code} - ${name}`;
  if (code) {
    const found = INTECKNO_PROJECT_ITEMS.find((it) => it.code.toUpperCase() === code.toUpperCase());
    return found ? `${found.code} - ${found.name}` : code;
  }
  return name || 'Sin ITEM';
}

export const TabCostosPresupuesto: React.FC<TabCostosPresupuestoProps> = ({
  project,
  currentTrm,
  onUpdateProject,
}) => {
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

  // Mantener sincronizado el estado si el proyecto cambia
  React.useEffect(() => {
    if ((project as any)?.costMatrix) {
      setCostItems((project as any).costMatrix);
    }
    if ((project as any)?.projectItems) {
      setProjectItems((project as any).projectItems);
    }
    if ((project as any)?.billingItems) {
      setBillingItems((project as any).billingItems);
    }
  }, [project]);

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
    spendingNature: 'PRESUPUESTO' | 'REPROCESO';
    date: string;
    invoiceNumber: string;
    ivaAmount: number;
    retentionAmount: number;
    observations: string;
    splitPercentage: number;
    splitWithProjectCode: string;
  }>({
    itemCode: 'ITEM 11',
    itemName: 'Mantenimiento de fijaciones mecánicas: retorqueo y ajuste de tornillería, espárragos y pernos en pilonas en cables aéreos',
    category: 'mano_obra_itk',
    costType: 'directo',
    concept: '',
    unit: 'Horas',
    plannedQuantity: 40,
    plannedUnitCost: 65000,
    actualQuantity: 0,
    actualUnitCost: 65000,
    spendingNature: 'PRESUPUESTO',
    date: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    ivaAmount: 0,
    retentionAmount: 0,
    observations: '',
    splitPercentage: 100,
    splitWithProjectCode: '',
  });

  // Manejador para crear una nueva Carpeta de ITEM
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderForm.code) return;

    const formattedCode = folderForm.code.trim().toUpperCase();
    const existingIndex = projectItems.findIndex((f) => f.code.toUpperCase() === formattedCode);

    const newFolder: ProjectItemFolder = {
      id: `ITEM-${Date.now()}`,
      code: formattedCode,
      name: folderForm.name || INTECKNO_PROJECT_ITEMS.find((it) => it.code.toUpperCase() === formattedCode)?.name || formattedCode,
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
      itemCode: billingForm.itemCode || selectedFolderCode || 'ITEM 11',
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
    setBillingItems(updatedBilling);
    onUpdateProject?.({
      ...project,
      billingItems: updatedBilling as any,
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

    const targetCode = itemForm.itemCode || selectedFolderCode || 'ITEM 11';
    const targetName = itemForm.itemName || INTECKNO_PROJECT_ITEMS.find((it) => it.code.toUpperCase() === targetCode.toUpperCase())?.name || targetCode;

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
      spendingNature: itemForm.spendingNature,
      date: itemForm.date,
      invoiceNumber: itemForm.invoiceNumber,
      ivaAmount: itemForm.ivaAmount,
      retentionAmount: itemForm.retentionAmount,
      observations: itemForm.observations,
      splitPercentage: itemForm.splitPercentage,
      splitWithProjectCode: itemForm.splitWithProjectCode,
    };

    const updated = [newItem, ...costItems];
    setCostItems(updated);

    // Asegurarse de que el ITEM exista en la lista de carpetas
    let updatedFolders = [...projectItems];
    if (!updatedFolders.some((f) => f.code.toUpperCase() === targetCode.toUpperCase())) {
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
      itemCode: 'ITEM 11',
      itemName: 'Mantenimiento de fijaciones mecánicas: retorqueo y ajuste de tornillería, espárragos y pernos en pilonas en cables aéreos',
      category: 'mano_obra_itk',
      costType: 'directo',
      concept: '',
      unit: 'Horas',
      plannedQuantity: 40,
      plannedUnitCost: 65000,
      actualQuantity: 0,
      actualUnitCost: 65000,
      spendingNature: 'PRESUPUESTO',
      date: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      ivaAmount: 0,
      retentionAmount: 0,
      observations: '',
      splitPercentage: 100,
      splitWithProjectCode: '',
    });
    setIsAddItemModalOpen(false);
  };

  // Cálculo de Horas Reportadas en Campo (Timesheet)
  const timesheetList = (project as any)?.timesheetEntries || [];
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
    const planned = list.reduce((sum, i) => sum + i.plannedTotal, 0);
    const actual = list.reduce((sum, i) => sum + i.actualTotal, 0);
    return { count: list.length, planned, actual };
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
      const targetItem = (i.itemCode || 'ITEM 11').toUpperCase();
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

  const totalIncurred = totalActual;
  const grossProfitCOP = contractAmountCOP - totalIncurred;
  const grossMarginPct = contractAmountCOP > 0 ? (grossProfitCOP / contractAmountCOP) * 100 : 0;

  const totalInvoiced = project.totalInvoiced || 0;
  const pendingToInvoice = Math.max(0, contractAmountCOP - totalInvoiced);
  const advanceAmount = project.advancePaymentAmount || (
    project.advancePaymentPercentage ? (contractAmountCOP * project.advancePaymentPercentage / 100) : 0
  );

  // Lista consolidada de todos los ITEMS disponibles (Oficiales de catálogo + personalizados del proyecto + usados en costos/facturación)
  const allAvailableItems = (() => {
    const map = new Map<string, { code: string; name: string; budgetPlanned?: number }>();
    
    // 1. Agregar catálogo oficial de 21 ITEMS
    INTECKNO_PROJECT_ITEMS.forEach((it) => {
      map.set(it.code.toUpperCase(), { code: it.code, name: it.name, budgetPlanned: 0 });
    });

    // 2. Agregar o sobrescribir con carpetas guardadas en project.projectItems
    projectItems.forEach((f) => {
      map.set(f.code.toUpperCase(), {
        code: f.code,
        name: f.name,
        budgetPlanned: f.budgetPlanned,
      });
    });

    // 3. Incluir cualquier ITEM que aparezca en los costos existentes
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

    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
  })();

  return (
    <div className="space-y-4">
      {/* 0. PANEL EJECUTIVO DE CONTROL DE PROYECTO (ADN FINANCIERO INTECKNO) */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 p-4 rounded-2xl border border-sky-900 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-sky-800/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-cyan-300 border border-sky-400/30 px-2 py-0.5 rounded">
                Control de Proyecto • Kardex Financiero
              </span>
              <span className="text-xs text-sky-200 font-mono">
                {project.code}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white mt-1">
              {project.name}
            </h2>
            <div className="text-[11px] text-sky-300 mt-0.5 flex flex-wrap gap-x-3">
              <span>Cliente: <strong className="text-white">{project.clientName}</strong></span>
              {project.contractCode && <span>Contrato / OC: <strong className="text-white">{project.contractCode}</strong></span>}
              {project.quoteCode && <span>Cotización: <strong className="text-white">{project.quoteCode}</strong></span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-sky-300 block uppercase">Margen de Rentabilidad</span>
              <span className={`text-base font-black ${
                grossMarginPct >= 30 ? 'text-emerald-400' : grossMarginPct >= 15 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {grossMarginPct.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3.5">
          {/* Valor Contractual */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-sky-300 uppercase font-semibold block">Valor Contractual Vigente</span>
            <div className="text-sm font-bold text-white mt-0.5">
              {currency === 'COP' ? formatCOP(contractAmountCOP) : `${currency} $${rawContractAmount.toLocaleString('en-US')}`}
            </div>
            {currency !== 'COP' && (
              <div className="text-[10px] text-cyan-300 mt-0.5">
                ≈ {formatCOP(contractAmountCOP)} (TRM {currentTrm.toLocaleString('es-CO')})
              </div>
            )}
          </div>

          {/* Costos Reales Incurridos */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-sky-300 uppercase font-semibold block">Costos Totales Incurridos</span>
            <div className="text-sm font-bold text-rose-300 mt-0.5">
              {formatCOP(totalIncurred)}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              Presupuesto Plan: {formatCOP(totalPlanned)}
            </div>
          </div>

          {/* Utilidad Bruta */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-sky-300 uppercase font-semibold block">Utilidad Bruta Proyectada</span>
            <div className={`text-sm font-bold mt-0.5 ${grossProfitCOP >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              {formatCOP(grossProfitCOP)}
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5">
              Estado: {grossMarginPct >= 30 ? 'Excelente' : grossMarginPct >= 15 ? 'Aceptable' : 'Alerta de Margen'}
            </div>
          </div>

          {/* Facturación y Saldo */}
          <div className="p-3 bg-white/5 rounded-xl border border-white/10">
            <span className="text-[10px] text-sky-300 uppercase font-semibold block">Facturación & Saldos</span>
            <div className="text-sm font-bold text-cyan-200 mt-0.5">
              Facturado: {formatCOP(totalInvoiced)}
            </div>
            <div className="text-[10px] text-sky-300 mt-0.5">
              Pendiente por Facturar: {formatCOP(pendingToInvoice)}
            </div>
          </div>
        </div>
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

          {/* Grid de Carpetas de ITEMS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {allAvailableItems.map((itemDef) => {
              const itemDirects = costItems.filter(
                (c) => (c.itemCode || 'ITEM 11').toUpperCase() === itemDef.code.toUpperCase() && c.costType !== 'indirecto'
              );
              const itemIndirects = costItems.filter(
                (c) => (c.itemCode || 'ITEM 11').toUpperCase() === itemDef.code.toUpperCase() && c.costType === 'indirecto'
              );
              const itemBills = billingItems.filter(
                (b) => (b.itemCode || 'ITEM 11').toUpperCase() === itemDef.code.toUpperCase()
              );

              const totalDir = itemDirects.reduce((sum, c) => sum + (c.actualTotal || 0), 0);
              const totalInd = itemIndirects.reduce((sum, c) => sum + (c.actualTotal || 0), 0);
              const totalCost = totalDir + totalInd;
              const totalFact = itemBills.reduce((sum, b) => sum + (b.grandTotal || 0), 0);

              const budgetPlan = itemDef.budgetPlanned || itemDirects.reduce((s, c) => s + c.plannedTotal, 0) + itemIndirects.reduce((s, c) => s + c.plannedTotal, 0);
              const balancePct = budgetPlan > 0 ? (totalCost / budgetPlan) * 100 : 0;

              return (
                <div
                  key={itemDef.code}
                  onClick={() => setSelectedFolderCode(itemDef.code)}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 hover:border-[#00668F] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
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
                      <span className="text-[10px] text-slate-400 group-hover:text-[#00668F] font-bold flex items-center gap-0.5">
                        Abrir <ChevronRight size={13} />
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 mt-2.5 line-clamp-2 min-h-[32px] group-hover:text-[#00668F] transition-colors">
                      {itemDef.name}
                    </h4>

                    {/* Resumen de costos */}
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Costos Totales</span>
                        <span className="font-bold text-slate-900 font-mono">{formatCOP(totalCost)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Facturación</span>
                        <span className="font-bold text-emerald-700 font-mono">{formatCOP(totalFact)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">
                      {itemDirects.length + itemIndirects.length} rubros • {itemBills.length} facturas
                    </span>
                    {budgetPlan > 0 && (
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                        balancePct <= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        Balance: {balancePct.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
            </div>
          </div>

          {/* TABLA 1: COSTOS DIRECTOS (Tal cual la foto de Excel) */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-sky-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#00668F]"></span>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Costos Directos — {selectedFolderCode}
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  ({costItems.filter((c) => (c.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType !== 'indirecto').length} rubros)
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

            {costItems.filter((c) => (c.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType !== 'indirecto').length === 0 ? (
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
                      <th className="py-2.5 px-3 text-right">IVA (19%)</th>
                      <th className="py-2.5 px-3 text-right">Retención</th>
                      <th className="py-2.5 px-3 text-right">Gran Total</th>
                      <th className="py-2.5 px-3">Recibo - Factura</th>
                      <th className="py-2.5 px-4">Observaciones</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {costItems
                      .filter((c) => (c.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType !== 'indirecto')
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
                              {c.invoiceNumber || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 text-[11px] italic">
                              {c.observations || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setItemToDelete(c)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Eliminar rubro"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  {/* Fila de Consolidados Totales de Costos Directos */}
                  <tfoot>
                    {(() => {
                      const directs = costItems.filter((c) => (c.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType !== 'indirecto');
                      const sumVal = directs.reduce((acc, c) => acc + (c.actualTotal || c.plannedTotal || 0), 0);
                      const sumIva = directs.reduce((acc, c) => acc + (c.ivaAmount || 0), 0);
                      const sumRet = directs.reduce((acc, c) => acc + (c.retentionAmount || 0), 0);
                      const sumTotal = sumVal + sumIva - sumRet;

                      const targetFolder = allAvailableItems.find((it) => it.code.toUpperCase() === selectedFolderCode.toUpperCase());
                      const budget = targetFolder?.budgetPlanned || directs.reduce((s, c) => s + c.plannedTotal, 0);
                      const balancePct = budget > 0 ? (sumTotal / budget) * 100 : 0;

                      return (
                        <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                          <td colSpan={2} className="py-2.5 px-4 text-center font-bold">
                            Consolidados Totales Costos Directos
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCOP(sumVal)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumIva > 0 ? formatCOP(sumIva) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumRet > 0 ? formatCOP(sumRet) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-[#00668F]">{formatCOP(sumTotal)}</td>
                          <td colSpan={2} className="py-2.5 px-3 text-right bg-yellow-100 text-yellow-900 font-black font-mono">
                            Balance Presupuesto: {balancePct.toFixed(0)}%
                          </td>
                          <td></td>
                        </tr>
                      );
                    })()}
                  </tfoot>
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
                  ({costItems.filter((c) => (c.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType === 'indirecto').length} rubros)
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

            {costItems.filter((c) => (c.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType === 'indirecto').length === 0 ? (
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
                      <th className="py-2.5 px-3 text-right">IVA (19%)</th>
                      <th className="py-2.5 px-3 text-right">Retención</th>
                      <th className="py-2.5 px-3 text-right">Gran Total</th>
                      <th className="py-2.5 px-3">Factura Proveedor</th>
                      <th className="py-2.5 px-4">Observaciones</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {costItems
                      .filter((c) => (c.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType === 'indirecto')
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
                              {c.invoiceNumber || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-slate-500 text-[11px] italic">
                              {c.observations || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => setItemToDelete(c)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Eliminar rubro"
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                  {/* Fila de Consolidados Totales de Costos Indirectos */}
                  <tfoot>
                    {(() => {
                      const indirects = costItems.filter((c) => (c.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase() && c.costType === 'indirecto');
                      const sumVal = indirects.reduce((acc, c) => acc + (c.actualTotal || c.plannedTotal || 0), 0);
                      const sumIva = indirects.reduce((acc, c) => acc + (c.ivaAmount || 0), 0);
                      const sumRet = indirects.reduce((acc, c) => acc + (c.retentionAmount || 0), 0);
                      const sumTotal = sumVal + sumIva - sumRet;

                      return (
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
                      );
                    })()}
                  </tfoot>
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
                  ({billingItems.filter((b) => (b.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase()).length} facturas)
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

            {billingItems.filter((b) => (b.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase()).length === 0 ? (
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
                      <th className="py-2.5 px-3 text-right">IVA (19%)</th>
                      <th className="py-2.5 px-3 text-right">Retención</th>
                      <th className="py-2.5 px-3 text-right">Gran Total</th>
                      <th className="py-2.5 px-4">Observaciones</th>
                      <th className="py-2.5 px-3 whitespace-nowrap">Fecha Pago</th>
                      <th className="py-2.5 px-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {billingItems
                      .filter((b) => (b.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase())
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
                  {/* Fila de Consolidados Totales de Facturación */}
                  <tfoot>
                    {(() => {
                      const bills = billingItems.filter((b) => (b.itemCode || 'ITEM 11').toUpperCase() === selectedFolderCode.toUpperCase());
                      const sumAnt = bills.reduce((acc, b) => acc + (b.advanceAmount || 0), 0);
                      const sumSub = bills.reduce((acc, b) => acc + (b.subtotal || 0), 0);
                      const sumIva = bills.reduce((acc, b) => acc + (b.ivaAmount || 0), 0);
                      const sumRet = bills.reduce((acc, b) => acc + (b.retentionAmount || 0), 0);
                      const sumGrand = bills.reduce((acc, b) => acc + (b.grandTotal || 0), 0);

                      const targetFolder = allAvailableItems.find((it) => it.code.toUpperCase() === selectedFolderCode.toUpperCase());
                      const budget = targetFolder?.budgetPlanned || 0;
                      const pendingFact = Math.max(0, budget - sumGrand);
                      const pctFact = budget > 0 ? (sumGrand / budget) * 100 : 100;

                      return (
                        <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900 text-xs">
                          <td colSpan={2} className="py-2.5 px-4 text-center font-bold">
                            Consolidados Totales Facturación
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumAnt > 0 ? formatCOP(sumAnt) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{formatCOP(sumSub)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumIva > 0 ? formatCOP(sumIva) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{sumRet > 0 ? formatCOP(sumRet) : '$ -'}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-emerald-800">{formatCOP(sumGrand)}</td>
                          <td colSpan={2} className="py-2.5 px-3 text-right bg-yellow-100 text-yellow-900 font-black font-mono">
                            Pendiente Facturación: {formatCOP(pendingFact)} ({pctFact.toFixed(0)}% Facturado)
                          </td>
                          <td></td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
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
                <label className="block font-bold text-slate-700 mb-1">Seleccionar o Escribir Código de ITEM</label>
                <CreatableSelect
                  options={INTECKNO_PROJECT_ITEMS.map((it) => ({
                    id: it.code,
                    name: `${it.code} - ${it.name}`,
                  }))}
                  value={folderForm.code ? `${folderForm.code} - ${folderForm.name}` : ''}
                  onChange={(val) => {
                    const match = INTECKNO_PROJECT_ITEMS.find(
                      (it) => it.code.toLowerCase() === val.toLowerCase() || `${it.code} - ${it.name}`.toLowerCase() === val.toLowerCase()
                    );
                    if (match) {
                      setFolderForm({
                        ...folderForm,
                        code: match.code,
                        name: match.name,
                      });
                    } else {
                      setFolderForm({
                        ...folderForm,
                        code: val,
                        name: val,
                      });
                    }
                  }}
                  placeholder="ej. ITEM 11, ITEM 21, AD-25..."
                  isClearable={true}
                  allowCustomText={true}
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">Presupuesto Asignado al ITEM (COP)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="ej. 15000000"
                  value={folderForm.budgetPlanned || ''}
                  onChange={(e) => setFolderForm({ ...folderForm, budgetPlanned: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                />
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
                    onChange={(e) => setBillingForm({ ...billingForm, subtotal: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">IVA (19% Si Aplica)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={billingForm.ivaAmount || ''}
                    onChange={(e) => setBillingForm({ ...billingForm, ivaAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
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
                    onChange={(e) => setBillingForm({ ...billingForm, advanceAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Retención</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={billingForm.retentionAmount || ''}
                    onChange={(e) => setBillingForm({ ...billingForm, retentionAmount: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
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
                    Agregar Rubro a {itemForm.itemCode || selectedFolderCode || 'ITEM 11'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {itemForm.costType === 'indirecto' ? 'Costo Indirecto (Pólizas, Peajes, Grúas)' : 'Costo Directo (MO, Obra, Insumos)'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddItemModalOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Formulario con Scroll Interno Fluido */}
              <form onSubmit={handleAddItem} className="flex flex-col flex-1 min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3.5 text-xs">
                  {/* Naturaleza del Gasto */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Naturaleza del Gasto</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setItemForm({ ...itemForm, spendingNature: 'PRESUPUESTO' })}
                        className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          itemForm.spendingNature === 'PRESUPUESTO'
                            ? 'bg-[#00668F]/10 border-[#00668F] text-[#00668F]'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Presupuesto (Obra)
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemForm({ ...itemForm, spendingNature: 'REPROCESO' })}
                        className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          itemForm.spendingNature === 'REPROCESO'
                            ? 'bg-rose-50 border-rose-400 text-rose-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Reproceso / Calidad
                      </button>
                    </div>
                  </div>

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
                            costType: meta.defaultCostType,
                          });
                        } else {
                          setItemForm({
                            ...itemForm,
                            itemCode: val,
                            itemName: val,
                          });
                        }
                      }}
                      placeholder="Seleccionar o escribir ITEM (ej. ITEM 11)..."
                      isClearable={true}
                      allowCustomText={true}
                    />
                  </div>

                  {/* Tipo de Costo: Directo vs Indirecto (Real Inteckno) */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Costo</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setItemForm({ ...itemForm, costType: 'directo' })}
                        className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          itemForm.costType === 'directo'
                            ? 'bg-sky-50 border-[#00668F] text-[#00668F]'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Costos Directos (MO, Insumos)
                      </button>
                      <button
                        type="button"
                        onClick={() => setItemForm({ ...itemForm, costType: 'indirecto' })}
                        className={`p-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          itemForm.costType === 'indirecto'
                            ? 'bg-purple-50 border-purple-500 text-purple-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        Costos Indirectos (Pólizas, Grúas)
                      </button>
                    </div>
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

                  {/* Unidad y Cantidad */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Unidad</label>
                      <CreatableSelect
                        key={`unit-${itemForm.category}`}
                        value={itemForm.unit}
                        onChange={(val) => setItemForm({ ...itemForm, unit: val })}
                        options={catMeta.allowedUnits}
                        placeholder="Unidad..."
                        allowCustomText={true}
                        isClearable={true}
                        inputClassName="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Cantidad Planificada</label>
                      <input
                        type="number"
                        min="1"
                        value={itemForm.plannedQuantity}
                        onChange={(e) => setItemForm({ ...itemForm, plannedQuantity: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                  </div>

                  {/* Costos Plan y Real */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Costo Unitario Plan (COP)</label>
                      <input
                        type="number"
                        min="0"
                        value={itemForm.plannedUnitCost}
                        onChange={(e) => setItemForm({ ...itemForm, plannedUnitCost: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Costo Real Incurrido (COP)</label>
                      <input
                        type="number"
                        min="0"
                        value={itemForm.actualUnitCost * (itemForm.actualQuantity || 1)}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setItemForm({
                            ...itemForm,
                            actualQuantity: 1,
                            actualUnitCost: val,
                          });
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                      />
                    </div>
                  </div>

                  {/* IVA y Retención si aplica */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">IVA (19% si aplica)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={itemForm.ivaAmount || ''}
                        onChange={(e) => setItemForm({ ...itemForm, ivaAmount: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Retención si aplica</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={itemForm.retentionAmount || ''}
                        onChange={(e) => setItemForm({ ...itemForm, retentionAmount: Number(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                      />
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
                            value={itemForm.splitPercentage}
                            onChange={(e) => setItemForm({ ...itemForm, splitPercentage: Number(e.target.value) || 100 })}
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
                <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAddItemModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-colors cursor-pointer text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] active:scale-95 text-white font-bold rounded-xl transition-all cursor-pointer text-xs shadow-xs"
                  >
                    Guardar Rubro
                  </button>
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
        description="Esta acción eliminará el concepto de costo de la matriz financiera del proyecto. ¿Deseas confirmar la eliminación?"
        requireConfirmWord={false}
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

      {/* Modal Confirmación de Eliminación de Factura */}
      <ConfirmDeleteModal
        isOpen={Boolean(billingToDelete)}
        title="¿Eliminar Registro de Factura?"
        itemName={billingToDelete ? `Factura N° ${billingToDelete.invoiceNumber}` : ''}
        description="Esta acción eliminará el registro de facturación asociado a este ITEM. ¿Deseas confirmar la eliminación?"
        requireConfirmWord={false}
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

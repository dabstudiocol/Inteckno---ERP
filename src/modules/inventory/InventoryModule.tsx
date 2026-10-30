import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Package,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  ShieldAlert,
  ArrowRight,
  Search,
  Plus,
  RotateCcw,
  Pencil,
  Barcode,
  Truck,
  FileCheck2,
  History,
  Layers,
  Sparkles,
  DollarSign,
  FileText,
  Eye,
  Droplets,
  Boxes,
  Wind,
  Trash2,
  HardHat,
  Tag,
  ScanLine,
  Settings,
  QrCode,
  PenTool,
  Cpu,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  X,
  Send,
  Loader2,
  Activity,
  Filter,
  ArrowUpDown,
  Scissors,
  Upload,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { Product, EquipmentTool, DispatchRemission, RemissionItem, InventoryAuditLog, PhysicalCableSegment } from '../../types';
import { LightTable } from '../../components/ui/LightTable';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { getCalibrationStatus } from '../../utils/calibrationUtils';

import { BiometricSignatureModal } from './components/BiometricSignatureModal';
import { AllocationQrModal } from './components/AllocationQrModal';
import { ClearInventoryModal } from './components/ClearInventoryModal';
import { InventoryExcelUploadModal } from './components/InventoryExcelUploadModal';
import { BomExtractorModal } from './components/BomExtractorModal';
import { NameplateVisionModal } from './components/NameplateVisionModal';
import { InventoryForensicsTab } from './components/InventoryForensicsTab';
import { ProductDetailModal } from './components/ProductDetailModal';
import { InventoryWriteOffModal } from './components/InventoryWriteOffModal';
import { InventoryWriteOffsTab } from './components/InventoryWriteOffsTab';
import { WarehouseReceiptModal } from '../procurement/components/WarehouseReceiptModal';
import {
  getStoredTRM,
  fetchLiveTRM,
  formatCOP,
  formatUSD,
  formatTRM,
  convertUSDToCOP,
  convertCOPToUSD,
} from '../../core/services/trmService';
import { syncInventoryToCloud } from '../../core/services/firestoreSyncService';

// Resolución dinámica de documento de identidad desde usuarios y colaboradores registrados
const getPersonCedula = (user: any): string => {
  if (!user) return 'S/N';
  if (user.nationalId) return user.nationalId;
  if (user.documentId) return user.documentId;
  if (user.cedula) return user.cedula;
  if (user.taxId) return user.taxId;
  if (user.documentNumber) return user.documentNumber;
  return 'S/N';
};

interface InventoryModuleProps {
  initialTab?: 'unified' | 'dispatch' | 'return' | 'history' | 'barcode' | 'audit';
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({ initialTab }) => {
  const {
    products,
    equipment,
    projects,
    users,
    employees,
    remissions,
    purchaseOrders,
    inventoryAuditLogs,
    createProduct,
    updateProduct,
    deleteProduct,
    setAllProducts,
    setAllRemissions,
    updateProductStockDirect,
    adjustProductStock,
    createDispatchRemission,
    processReturnRemission,
    createRequisition,
    receivePurchaseOrderPartial,
    recordInventoryAuditLog,
    clearInventory,
    notify,
    currentUser,
    activeModuleId,
    setActiveModule,
  } = useErp();

  const [isWarehouseReceiptModalOpen, setIsWarehouseReceiptModalOpen] = useState(false);
  const [isClearInventoryModalOpen, setIsClearInventoryModalOpen] = useState(false);
  const [isExcelUploadModalOpen, setIsExcelUploadModalOpen] = useState(false);
  const [isWriteOffModalOpen, setIsWriteOffModalOpen] = useState(false);
  const [productForWriteOff, setProductForWriteOff] = useState<Product | null>(null);
  const [tramoForWriteOff, setTramoForWriteOff] = useState<PhysicalCableSegment | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const defaultTab = initialTab || (activeModuleId === 'codigo-barras' ? 'barcode' : 'unified');
  const [activeTab, setActiveTab] = useState<'unified' | 'dispatch' | 'return' | 'history' | 'barcode' | 'audit' | 'writeoffs'>(defaultTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as any);
    } else if (activeModuleId === 'codigo-barras') {
      setActiveTab('barcode');
    } else if (activeModuleId === 'inventario' && activeTab === 'barcode') {
      setActiveTab('unified');
    }
  }, [initialTab, activeModuleId]);

  // Escuchar evento para abrir recepción de mercancía desde notificaciones
  React.useEffect(() => {
    const handleOpenReceipt = () => {
      setIsWarehouseReceiptModalOpen(true);
    };
    window.addEventListener('inteckno:open-po-receipt', handleOpenReceipt);
    return () => {
      window.removeEventListener('inteckno:open-po-receipt', handleOpenReceipt);
    };
  }, []);

  // Lista unificada de colaboradores (Usuarios de sistema + Personal registrado en Talento Humano)
  const collaboratorsList = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string }>();
    users.forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        role: u.roleLabel || u.department || 'Colaborador ITK',
      });
    });
    employees.forEach((emp) => {
      if (!map.has(emp.id)) {
        map.set(emp.id, {
          id: emp.id,
          name: emp.name,
          role: emp.role || emp.department || 'Técnico de Campo',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, employees]);

  // Filtros del Inventario Unificado
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [filterStockStatus, setFilterStockStatus] = useState<'all' | 'optimal' | 'low' | 'out'>('all');
  const [filterCalibration, setFilterCalibration] = useState<'all' | 'warning_2m' | 'critical_1m' | 'valid' | 'none'>('all');
  const [filterLocation, setFilterLocation] = useState<string>('all');
  const [filterCritical, setFilterCritical] = useState<boolean>(false);

  // Filtros Avanzados Estilo Excel en Cabecera de Columnas
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [colSearchQuery, setColSearchQuery] = useState('');
  const [colFilters, setColFilters] = useState<Record<string, string[]>>({});
  const [colSort, setColSort] = useState<{ col: string; dir: 'asc' | 'desc' } | null>(null);

  // Modal para nuevo producto o editar producto
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [currentTRM, setCurrentTRM] = useState<number>(getStoredTRM());
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Sincronizar TRM oficial del día
  React.useEffect(() => {
    fetchLiveTRM().then((rate) => {
      if (rate && rate > 1000) {
        setCurrentTRM(rate);
      }
    });

    const handleTrmUpdate = (e: any) => {
      if (e.detail?.rate) {
        setCurrentTRM(e.detail.rate);
      }
    };
    window.addEventListener('inteckno_trm_updated', handleTrmUpdate);
    return () => window.removeEventListener('inteckno_trm_updated', handleTrmUpdate);
  }, []);

  const baselineProductsRef = React.useRef<Map<string, number>>(new Map());

  // Inicializar o sincronizar el baseline cuando no haya cambios pendientes y tengamos productos
  React.useEffect(() => {
    if (baselineProductsRef.current.size === 0 && products.length > 0) {
      const map = new Map<string, number>();
      products.forEach((p) => map.set(p.id, p.availableStock));
      baselineProductsRef.current = map;
    }
  }, [products]);

  // Manejador blindado para Vaciar Todo el Inventario
  const handleConfirmClear = async () => {
    const previousCount = products.length;
    clearInventory();
    baselineProductsRef.current.clear();
    syncInventoryToCloud([], currentUser?.id).catch(console.warn);

    await recordInventoryAuditLog({
      productId: 'CATALOG-ALL',
      productSku: 'CLEAR-ALL',
      productName: `Vaciado Total de Catálogo (${previousCount} artículos eliminados)`,
      userId: currentUser?.id || 'USR-001',
      userName: currentUser?.name || 'Administrador',
      userEmail: currentUser?.email || 'almacen@inteckno.com',
      source: 'erp_web',
      previousStock: previousCount,
      newStock: 0,
      delta: -previousCount,
      reason: 'Vaciado total del inventario autorizado mediante verificación de seguridad Poka-Yoke.',
    });

    notify('success', 'Inventario Vaciado', 'Se han eliminado correctamente todos los artículos del catálogo.');
  };

  // Manejador para Importar Archivo Excel al ERP
  const handleImportProducts = async (newProducts: Product[], isReplace: boolean, fileName: string) => {
    let finalProducts: Product[];
    if (isReplace) {
      finalProducts = newProducts;
    } else {
      const existingSkuMap = new Map(products.map((p) => [p.sku.toUpperCase(), p]));
      newProducts.forEach((np) => {
        existingSkuMap.set(np.sku.toUpperCase(), np);
      });
      finalProducts = Array.from(existingSkuMap.values());
    }

    setAllProducts(finalProducts);
    const newMap = new Map<string, number>();
    finalProducts.forEach((p) => newMap.set(p.id, p.availableStock));
    baselineProductsRef.current = newMap;

    // Sincronizar de inmediato a Cloud Firestore con particionamiento seguro
    await syncInventoryToCloud(finalProducts, currentUser?.id).catch((err) => {
      console.warn('[Inventario] Error persistiendo catálogo particionado:', err);
    });

    await recordInventoryAuditLog({
      productId: 'CATALOG-ALL',
      productSku: 'IMPORT-EXCEL',
      productName: `Carga de Excel (${finalProducts.length} artículos totales)`,
      userId: currentUser?.id || 'USR-001',
      userName: currentUser?.name || 'Administrador',
      userEmail: currentUser?.email || 'almacen@inteckno.com',
      source: 'erp_web',
      previousStock: products.length,
      newStock: finalProducts.length,
      delta: finalProducts.length - products.length,
      reason: `Importación directa de archivo Excel "${fileName}" (${newProducts.length} filas procesadas)`,
    });

    notify(
      'success',
      'Catálogo Actualizado',
      `Se incorporaron exitosamente ${newProducts.length} artículos al inventario del ERP.`
    );
  };

  // Cambio fluido de pestañas sin bloqueos de SharePoint
  const handleTabChangeWithCheck = (targetTab: 'unified' | 'dispatch' | 'return' | 'history' | 'barcode' | 'audit' | 'writeoffs') => {
    setActiveTab(targetTab as any);
  };

  // Catálogos dinámicos editables por Inteckno
  const catalogCategories = useModuleCatalog('inventario', 'categories');
  const catalogUnits = useModuleCatalog('inventario', 'units');
  const catalogWarehouses = useModuleCatalog('inventario', 'warehouses');
  const catalogShelves = useModuleCatalog('inventario', 'shelves');

  // Formulario Producto / Repuesto
  const [prodForm, setProdForm] = useState({
    sku: '',
    name: '',
    category: 'Repuestos y Componentes',
    unit: 'unid',
    costPriceUSD: 0,
    costPriceCOP: 0,
    realStock: 0,
    reservedStock: 0,
    availableStock: 0,
    minStock: 0,
    isCriticalSpare: false,
    isHomologatedITK: true,
    locationName: 'Bodega Principal - Guarne',
    shelf: '',
    observations: '',
    physicalState: 'solido',
    safetyDataSheetUrl: '',
    technicalDataSheetUrl: '',
    calibrationInfo: '',
    purchaseDate: '',
  });

  // --------------------------------------------------------------------------
  // ESTADO PARA REMISIÓN DE SALIDA (DESPACHO MULTI-ÍTEM)
  // --------------------------------------------------------------------------
  const [dispatchProjectId, setDispatchProjectId] = useState(projects[0]?.id || '');
  const [dispatchTechId, setDispatchTechId] = useState(users[0]?.id || '');
  const [departureDate, setDepartureDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [dispatchItems, setDispatchItems] = useState<
    {
      id: string;
      productId: string;
      sku: string;
      name: string;
      unit: string;
      category: string;
      qtyDispatched: number;
      unitCostUSD: number;
      unitCostCOP: number;
    }[]
  >([]);

  // --------------------------------------------------------------------------
  // ESTADO PARA REMISIÓN DE REINGRESO (RETORNO Y LIQUIDACIÓN)
  // --------------------------------------------------------------------------
  const [selectedReturnRemissionId, setSelectedReturnRemissionId] = useState<string>(
    remissions.find((r) => r.status === 'en_campo' || r.status === 'retornado_parcial')?.id || remissions[0]?.id || ''
  );
  const [returnReceiverUserId, setReturnReceiverUserId] = useState<string>(
    users.find((u) => u.role === 'almacenista')?.id || users[0]?.id || ''
  );
  const [returnNotes, setReturnNotes] = useState('');
  const [returnItemsState, setReturnItemsState] = useState<{ [itemId: string]: { qtyReturned: number; condition: RemissionItem['condition']; notes: string } }>({});
  // --------------------------------------------------------------------------
  // ESTADO PARA FIRMA BIOMÉTRICA & CROSS-DOCKING QR & IA
  // --------------------------------------------------------------------------
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
  const [signatureData, setSignatureData] = useState<{
    signatureUrl: string;
    signerName: string;
    signerDoc: string;
    timestamp: string;
  } | null>(null);

  // Firma Biometríca para Reingresos
  const [isReturnSignatureModalOpen, setIsReturnSignatureModalOpen] = useState(false);
  const [returnSignatureData, setReturnSignatureData] = useState<{
    signatureUrl: string;
    signerName: string;
    signerDoc: string;
    timestamp: string;
  } | null>(null);

  // Modal para inspeccionar remisión completa en Historial
  const [selectedRemissionForView, setSelectedRemissionForView] = useState<DispatchRemission | null>(null);

  const [selectedProductForQr, setSelectedProductForQr] = useState<Product | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [isNameplateModalOpen, setIsNameplateModalOpen] = useState(false);

  // --------------------------------------------------------------------------
  // ESTADO PARA EL ESCÁNER DE CÓDIGOS DE BARRA
  // --------------------------------------------------------------------------
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedResult, setScannedResult] = useState<Product | EquipmentTool | null>(null);
  const [scanMessage, setScanMessage] = useState('');

  // --------------------------------------------------------------------------
  // MANEJADORES DEL INVENTARIO UNIFICADO (PAGINACIÓN Y RENDIMIENTO ALTO)
  // --------------------------------------------------------------------------
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const filteredProducts = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cat = selectedCategory.toLowerCase();

    let list = products.filter((p) => {
      // 1. Búsqueda por texto (código, nombre, notas, ubicación, estante)
      const matchesSearch =
        !q ||
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        (p.observations && p.observations.toLowerCase().includes(q)) ||
        p.locationName.toLowerCase().includes(q) ||
        p.shelf.toLowerCase().includes(q);

      // 2. Filtro por categoría
      const matchesCategory =
        cat === 'todos' || p.category.toLowerCase() === cat;

      // 3. Filtro por nivel de stock
      let matchesStock = true;
      if (filterStockStatus === 'optimal') {
        matchesStock = p.availableStock > p.minStock;
      } else if (filterStockStatus === 'low') {
        matchesStock = p.availableStock > 0 && p.availableStock <= p.minStock;
      } else if (filterStockStatus === 'out') {
        matchesStock = p.availableStock <= 0;
      }

      // 4. Filtro por calibración / vigencia
      let matchesCalibration = true;
      if (filterCalibration !== 'all') {
        const cal = getCalibrationStatus(p.calibrationInfo);
        if (filterCalibration === 'warning_2m') {
          matchesCalibration = cal.status === 'warning_2m';
        } else if (filterCalibration === 'critical_1m') {
          matchesCalibration = cal.status === 'critical_1m' || cal.status === 'expired';
        } else if (filterCalibration === 'valid') {
          matchesCalibration = cal.status === 'valid';
        } else if (filterCalibration === 'none') {
          matchesCalibration = !cal.hasCalibration;
        }
      }

      // 5. Filtro por ubicación
      const matchesLocation =
        filterLocation === 'all' || p.locationName === filterLocation;

      // 6. Filtro por repuesto crítico STC
      const matchesCritical = !filterCritical || Boolean(p.isCriticalSpare);

      // 7. Filtros por columnas estilo Excel
      let matchesColFilters = true;
      for (const [col, selectedVals] of Object.entries(colFilters)) {
        if (!selectedVals || selectedVals.length === 0) continue;
        let itemVal = '';
        if (col === 'sku') itemVal = p.sku;
        else if (col === 'name') itemVal = p.name;
        else if (col === 'category') itemVal = p.category;
        else if (col === 'unit') itemVal = p.unit;
        else if (col === 'locationName') {
          itemVal = p.shelf && !p.shelf.toLowerCase().includes('bodega central')
            ? p.shelf
            : (p.locationName && !p.locationName.toLowerCase().includes('bodega central')
                ? p.locationName
                : (p.shelf || p.locationName || 'Sin ubicación'));
        }
        else if (col === 'availableStock') itemVal = String(p.availableStock);
        else if (col === 'minStock') itemVal = String(p.minStock);

        if (!selectedVals.includes(itemVal)) {
          matchesColFilters = false;
          break;
        }
      }

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStock &&
        matchesCalibration &&
        matchesLocation &&
        matchesCritical &&
        matchesColFilters
      );
    });

    // Ordenamiento por columna estilo Excel
    if (colSort) {
      list = [...list].sort((a, b) => {
        let valA: any = (a as any)[colSort.col] ?? '';
        let valB: any = (b as any)[colSort.col] ?? '';
        if (typeof valA === 'string') {
          return colSort.dir === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return colSort.dir === 'asc' ? valA - valB : valB - valA;
      });
    }

    return list;
  }, [
    products,
    searchQuery,
    selectedCategory,
    filterStockStatus,
    filterCalibration,
    filterLocation,
    filterCritical,
    colFilters,
    colSort,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));
  const paginatedProducts = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage, itemsPerPage]);

  // Si cambia la búsqueda o filtros, reiniciar a página 1
  React.useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedCategory,
    filterStockStatus,
    filterCalibration,
    filterLocation,
    filterCritical,
  ]);

  const categories = [
    'todos',
    'Repuestos y Componentes',
    'Herramientas e Instrumentos',
    'EPP y Alturas',
    'Insumos y Consumibles',
  ];

  const uniqueLocations = React.useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.locationName) set.add(p.locationName);
    });
    return Array.from(set);
  }, [products]);

  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedCategory !== 'todos' ||
    filterStockStatus !== 'all' ||
    filterCalibration !== 'all' ||
    filterLocation !== 'all' ||
    filterCritical
  );

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('todos');
    setFilterStockStatus('all');
    setFilterCalibration('all');
    setFilterLocation('all');
    setFilterCritical(false);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.sku || !prodForm.name) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        ...prodForm,
        availableStock: Math.max(0, prodForm.realStock - prodForm.reservedStock),
      });
      setEditingProduct(null);
    } else {
      createProduct({
        ...prodForm,
        availableStock: Math.max(0, prodForm.realStock - prodForm.reservedStock),
      });
    }

    setIsProductModalOpen(false);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setProdForm({
      sku: prod.sku,
      name: prod.name,
      category: prod.category,
      unit: prod.unit,
      costPriceUSD: prod.costPriceUSD,
      costPriceCOP: prod.costPriceCOP,
      realStock: prod.realStock,
      reservedStock: prod.reservedStock,
      availableStock: prod.availableStock,
      minStock: prod.minStock,
      isCriticalSpare: prod.isCriticalSpare,
      isHomologatedITK: prod.isHomologatedITK,
      locationName: prod.locationName,
      shelf: prod.shelf,
      observations: prod.observations || '',
      physicalState: prod.physicalState || 'solido',
      safetyDataSheetUrl: prod.safetyDataSheetUrl || '',
      technicalDataSheetUrl: prod.technicalDataSheetUrl || '',
      calibrationInfo: prod.calibrationInfo || '',
      purchaseDate: prod.purchaseDate || '',
    });
    setIsProductModalOpen(true);
  };

  // --------------------------------------------------------------------------
  // MANEJADORES DE DESPACHO (REMISIÓN DE SALIDA)
  // --------------------------------------------------------------------------
  const addDispatchItemRow = () => {
    const defaultProd = products[0];
    setDispatchItems([
      ...dispatchItems,
      {
        id: `d-item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: defaultProd?.id || '',
        sku: defaultProd?.sku || '',
        name: defaultProd?.name || '',
        unit: defaultProd?.unit || 'unid',
        category: defaultProd?.category || 'General',
        qtyDispatched: 1,
        unitCostUSD: defaultProd?.costPriceUSD || 0,
        unitCostCOP: defaultProd?.costPriceCOP || 0,
      },
    ]);
  };

  const updateDispatchItem = (id: string, field: string, value: any) => {
    setDispatchItems(
      dispatchItems.map((item) => {
        if (item.id === id) {
          if (field === 'productId') {
            const p = products.find((pr) => pr.id === value);
            if (p) {
              return {
                ...item,
                productId: p.id,
                sku: p.sku,
                name: p.name,
                unit: p.unit,
                category: p.category,
                unitCostUSD: p.costPriceUSD,
                unitCostCOP: p.costPriceCOP,
              };
            }
          }
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const removeDispatchItem = (id: string) => {
    if (dispatchItems.length <= 1) return;
    setDispatchItems(dispatchItems.filter((i) => i.id !== id));
  };

  const handleCreateDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const project = projects.find((p) => p.id === dispatchProjectId);
    const tech = collaboratorsList.find((c) => c.id === dispatchTechId);

    if (!dispatchTechId || !tech) {
      notify('urgent', 'Responsable Obligatorio', 'Debes seleccionar el técnico que solicita y retira los artículos.');
      return;
    }

    if (!signatureData?.signatureUrl) {
      notify('urgent', 'Firma Obligatoria', 'Es obligatorio estampar la firma biométrica en pantalla antes de emitir la remisión de salida.');
      setIsSignatureModalOpen(true);
      return;
    }

    if (!project || dispatchItems.length === 0) {
      notify('warning', 'Datos Incompletos', 'Verifica el proyecto seleccionado y los artículos de la remisión.');
      return;
    }

    createDispatchRemission({
      type: 'salida',
      departureDate,
      expectedReturnDate,
      responsibleTechnicianId: tech.id,
      responsibleTechnicianName: tech.name,
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      notes: dispatchNotes || 'Despacho de materiales e instrumentación para labores en campo.',
      items: dispatchItems.map((it) => ({
        id: `RIT-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        productId: it.productId,
        sku: it.sku,
        name: it.name,
        unit: it.unit,
        category: it.category,
        qtyDispatched: Math.max(1, Number(it.qtyDispatched) || 1),
        qtyReturned: 0,
        qtyConsumed: 0,
        unitCostUSD: it.unitCostUSD,
        unitCostCOP: it.unitCostCOP,
        condition: 'bueno',
        notes: '',
      })),
      recipientSignatureUrl: signatureData?.signatureUrl,
      recipientSignedAt: signatureData?.timestamp,
      recipientSignerName: signatureData?.signerName || tech.name,
      recipientSignerDoc: signatureData?.signerDoc,
      barcodeScanned: true,
    });

    setSignatureData(null);

    // Cambiar a la pestaña de historial
    setActiveTab('history');
  };

  // --------------------------------------------------------------------------
  // MANEJADORES DE REINGRESO
  // --------------------------------------------------------------------------
  const activeReturnRemission = remissions.find((r) => r.id === selectedReturnRemissionId);

  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReturnRemission) return;

    const receiverUser = collaboratorsList.find((u) => u.id === returnReceiverUserId);
    if (!returnReceiverUserId || !receiverUser) {
      notify('urgent', 'Responsable de Recepción Obligatorio', 'Debes indicar el almacenista o encargado responsable de recibir los artículos.');
      return;
    }

    if (!returnSignatureData?.signatureUrl) {
      notify('urgent', 'Firma de Recepción Obligatoria', 'Es obligatorio que el encargado de recepción estampe su firma biométrica antes de procesar el reingreso.');
      setIsReturnSignatureModalOpen(true);
      return;
    }

    const returnedItemsPayload = activeReturnRemission.items.map((it) => {
      const state = returnItemsState[it.id] || {
        qtyReturned: it.qtyDispatched,
        condition: 'bueno' as const,
        notes: '',
      };
      return {
        id: it.id,
        qtyReturned: Number(state.qtyReturned) || 0,
        condition: state.condition || 'bueno',
        notes: state.notes || '',
      };
    });

    processReturnRemission(
      activeReturnRemission.id,
      returnedItemsPayload,
      returnNotes || `Reingreso verificado por ${receiverUser.name} (${receiverUser.role}).`,
      new Date().toISOString().split('T')[0],
      {
        signatureUrl: returnSignatureData.signatureUrl,
        timestamp: returnSignatureData.timestamp,
        signerName: returnSignatureData.signerName || receiverUser.name,
        signerDoc: returnSignatureData.signerDoc,
      }
    );

    setReturnSignatureData(null);
    setActiveTab('history');
  };

  // --------------------------------------------------------------------------
  // MANEJADORES DEL ESCÁNER ÓPTICO
  // --------------------------------------------------------------------------
  const handleBarcodeScan = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;

    const foundProduct = products.find((p) => p.sku.toUpperCase() === clean);
    if (foundProduct) {
      setScannedResult(foundProduct);
      setScanMessage(`✓ Repuesto Encontrado: ${foundProduct.name} (Stock: ${foundProduct.availableStock} ${foundProduct.unit})`);
      return;
    }

    const foundEquipment = equipment.find((e) => e.code.toUpperCase() === clean || e.serialNumber.toUpperCase() === clean);
    if (foundEquipment) {
      setScannedResult(foundEquipment as any);
      setScanMessage(`✓ Instrumento Encontrado: ${foundEquipment.name} (Estado: ${foundEquipment.status})`);
      return;
    }

    setScannedResult(null);
    setScanMessage(`⚠️ Código "${code}" no registrado en el inventario.`);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Barra Superior con Opciones de Inventario en Contenedor Fluido y Seguro */}
      {activeModuleId !== 'codigo-barras' && (
        <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 pb-2 w-full min-w-0">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-full min-w-0">
            <button
              onClick={() => handleTabChangeWithCheck('unified')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center shrink-0 ${
                activeTab === 'unified'
                  ? 'bg-white text-[#00668F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package size={14} className="shrink-0" />
              <span className="truncate">Inventario ({products.length})</span>
            </button>

            <button
              onClick={() => handleTabChangeWithCheck('dispatch')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center shrink-0 ${
                activeTab === 'dispatch'
                  ? 'bg-white text-[#00668F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck size={14} className="shrink-0" />
              <span className="truncate">Despachos y Salidas</span>
            </button>

            <button
              onClick={() => handleTabChangeWithCheck('return')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center shrink-0 ${
                activeTab === 'return'
                  ? 'bg-white text-[#00668F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <RotateCcw size={14} className="shrink-0" />
              <span className="truncate">Reingresos</span>
            </button>

            <button
              onClick={() => handleTabChangeWithCheck('history')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center shrink-0 ${
                activeTab === 'history'
                  ? 'bg-white text-[#00668F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={14} className="shrink-0" />
              <span className="truncate">Historial ({remissions.length})</span>
            </button>

            <button
              onClick={() => handleTabChangeWithCheck('audit')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center shrink-0 ${
                activeTab === 'audit'
                  ? 'bg-white text-[#00668F] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History size={14} className="shrink-0 text-[#00668F]" />
              <span className="truncate">Movimientos ({inventoryAuditLogs.length})</span>
            </button>

            <button
              onClick={() => handleTabChangeWithCheck('writeoffs')}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center shrink-0 ${
                activeTab === 'writeoffs'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scissors size={14} className="shrink-0 text-rose-600" />
              <span className="truncate">Bajas y Mermas</span>
            </button>
          </div>

          {/* Botones de Acción Rápida con Flex-Wrap Seguro */}
          <div className="flex items-center flex-wrap gap-2 shrink-0">
            {/* Botón Cargar Archivo Excel Inicial */}
            <button
              type="button"
              onClick={() => setIsExcelUploadModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Cargar archivo Excel (.xlsx / .xls) para inicializar o actualizar el inventario"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>Subir Archivo Excel</span>
            </button>

            {/* Botón Vaciar Inventario con Verificación Estricta Poka-Yoke */}
            {products.length > 0 && (
              <button
                type="button"
                onClick={() => setIsClearInventoryModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                title="Eliminar todos los datos del inventario con verificación rigurosa de seguridad"
              >
                <Trash2 size={13} className="text-rose-600" />
                <span>Vaciar Inventario</span>
              </button>
            )}

            {/* Botón Ingreso al Almacén (Recepción de OC por el Almacenista) */}
            <button
              type="button"
              onClick={() => setIsWarehouseReceiptModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Registrar ingreso físico de mercancía por órdenes de compra emitidas a proveedores"
            >
              <Package size={14} />
              <span>Ingreso al Almacén (OC)</span>
            </button>

            <button
              onClick={() => {
                setEditingProduct(null);
                setProdForm({
                  sku: `ITK-REF-${String(products.length + 1).padStart(3, '0')}`,
                  name: '',
                  category: 'Repuestos y Componentes',
                  unit: 'unid',
                  costPriceUSD: 0,
                  costPriceCOP: 0,
                  realStock: 0,
                  reservedStock: 0,
                  availableStock: 0,
                  minStock: 0,
                  isCriticalSpare: false,
                  isHomologatedITK: true,
                  locationName: 'Bodega Principal - Guarne',
                  shelf: '',
                  observations: '',
                  physicalState: 'solido',
                  safetyDataSheetUrl: '',
                  technicalDataSheetUrl: '',
                  calibrationInfo: '',
                  purchaseDate: '',
                });
                setIsProductModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl transition-transform active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>Nuevo Artículo</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA 1: INVENTARIO UNIFICADO (TABLA ÚNICA DE 9 COLUMNAS SOLICITADA) */}
      {/* ==================================================================== */}
      {activeTab === 'unified' && (
        <div className="space-y-3.5">
          {/* Barra de Sincronización M365 Excel Online */}
          {/* Estado Vacío cuando no hay artículos en inventario */}
          {products.length === 0 && (
            <div className="bg-white rounded-2xl p-8 sm:p-12 border-2 border-dashed border-slate-200 text-center flex flex-col items-center justify-center max-w-xl mx-auto my-6 space-y-4 shadow-2xs animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <FileSpreadsheet size={32} />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-900">Catálogo de Inventario Vacío</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  No hay artículos registrados actualmente en el ERP. Sube tu archivo Excel (.xlsx) oficial una sola vez para inicializar el catálogo de repuestos y materiales de Inteckno S.A.S.
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsExcelUploadModalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm active:scale-95 transition-all"
                >
                  <Upload size={15} />
                  <span>Subir Archivo Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setProdForm({
                      sku: `ITK-REF-001`,
                      name: '',
                      category: 'Repuestos y Componentes',
                      unit: 'unid',
                      costPriceUSD: 0,
                      costPriceCOP: 0,
                      realStock: 0,
                      reservedStock: 0,
                      availableStock: 0,
                      minStock: 0,
                      isCriticalSpare: false,
                      isHomologatedITK: true,
                      locationName: 'Bodega Principal - Guarne',
                      shelf: '',
                      observations: '',
                      physicalState: 'solido',
                      safetyDataSheetUrl: '',
                      technicalDataSheetUrl: '',
                      calibrationInfo: '',
                      purchaseDate: '',
                    });
                    setIsProductModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Plus size={15} />
                  <span>Crear Artículo Manual</span>
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
          {/* Cabecera y Filtros */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>Catálogo e Inventario General Unificado</span>
                <span className="text-xs font-normal text-gray-500">
                  ({filteredProducts.length} de {products.length} artículos)
                </span>
              </h3>
              <p className="text-xs text-gray-500">
                Control de existencias en tiempo real con edición numérica directa de stock disponible.
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Badge de TRM Oficial en Tiempo Real */}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 shrink-0"
                title="Tasa Representativa del Mercado oficial de Colombia (Superfinanciera)"
              >
                <DollarSign size={13} className="text-emerald-700" />
                <span>TRM Hoy: <strong className="text-emerald-800 font-mono">${formatTRM(currentTRM)}</strong></span>
                <button
                  type="button"
                  onClick={async () => {
                    const fresh = await fetchLiveTRM(true);
                    if (fresh) setCurrentTRM(fresh);
                  }}
                  title="Actualizar TRM oficial en tiempo real desde Superfinanciera"
                  className="p-1 hover:bg-slate-200 rounded-md text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  <RotateCcw size={11} />
                </button>
              </div>

              {/* Buscador de Inventario */}
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={15} />
                <input
                  type="text"
                  placeholder="Buscar por código, descripción, ubicación..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#00668F] bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* Pastillas de Categorías en Grid Responsivo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-1">
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 shrink-0">
              <Tag size={13} />
              Categorías:
            </span>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-1.5 w-full">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all capitalize text-center flex items-center justify-center cursor-pointer ${
                    selectedCategory.toLowerCase() === cat.toLowerCase()
                      ? 'bg-[#00668F] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span className="truncate">{cat === 'todos' ? 'Todas' : cat}</span>
                </button>
              ))}
            </div>
          </div>

          {/* BARRA SUPERIOR COMPACTA DE ESTADO Y RESETEO DE FILTROS */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 py-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">
                Tip: Haz clic en el encabezado de cualquier columna para ordenar (A-Z) o filtrar por valores específicos como en Excel.
              </span>
              {(Object.keys(colFilters).some(k => colFilters[k]?.length > 0) || colSort || hasActiveFilters) && (
                <button
                  type="button"
                  onClick={() => {
                    clearAllFilters();
                    setColFilters({});
                    setColSort(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-sky-50 text-[#00668F] hover:bg-sky-100 transition-colors flex items-center gap-1 cursor-pointer font-bold text-[11px]"
                >
                  <X size={12} />
                  <span>Limpiar todos los filtros y orden</span>
                </button>
              )}
            </div>

            <div className="text-[11px] font-semibold text-slate-500 shrink-0">
              Mostrando <strong className="text-slate-900">{filteredProducts.length}</strong> de {products.length} artículos
            </div>
          </div>

          {/* VISTA MÓVIL: Tarjetas Responsivas para Artículos del Inventario (md:hidden) */}
          <div className="md:hidden space-y-3">
            {paginatedProducts.map((p) => {
              const isLowStock = p.availableStock <= p.minStock;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProductForDetail(p)}
                  className="p-3.5 bg-slate-50 hover:bg-sky-50/50 transition-colors rounded-xl space-y-2.5 cursor-pointer border border-transparent hover:border-sky-200"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-white text-gray-900 shadow-2xs">
                          {p.sku}
                        </span>
                        <span className="whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-[#00668F]">
                          {p.category}
                        </span>
                        {p.physicalState && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 font-semibold capitalize">
                            {p.physicalState}
                          </span>
                        )}
                        {p.calibrationInfo && (
                          (() => {
                            const cal = getCalibrationStatus(p.calibrationInfo);
                            if (!cal.hasCalibration) return null;
                            return (
                              <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1 ${cal.badgeClass}`}>
                                <Activity size={10} />
                                {cal.label}
                              </span>
                            );
                          })()
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm mt-1">{p.name}</h4>
                      {p.isCriticalSpare && (
                        <span className="whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 text-[9px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded mt-1">
                          REPUESTO CRÍTICO STC
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedProductForDetail(p)}
                        title="Ver Ficha Completa del Artículo"
                        className="p-2 rounded-xl text-sky-700 hover:text-sky-800 bg-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProductForQr(p);
                          setIsQrModalOpen(true);
                        }}
                        title="Generar Etiqueta QR de Asignación por Proyecto"
                        className="p-2 rounded-xl text-amber-600 hover:text-amber-700 bg-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <QrCode size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenEditProduct(p)}
                        title="Editar Ficha del Artículo"
                        className="p-2 rounded-xl text-gray-500 hover:text-[#00668F] bg-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setProductToDelete(p)}
                        title="Eliminar este artículo"
                        className="p-2 rounded-xl text-gray-500 hover:text-rose-600 bg-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setDispatchItems([
                            {
                              id: `d-item-${Date.now()}`,
                              productId: p.id,
                              sku: p.sku,
                              name: p.name,
                              unit: p.unit,
                              category: p.category,
                              qtyDispatched: 1,
                              unitCostUSD: p.costPriceUSD,
                              unitCostCOP: p.costPriceCOP,
                            },
                          ]);
                          setActiveTab('dispatch');
                        }}
                        title="Despachar este artículo"
                        className="p-2 rounded-xl text-emerald-700 hover:text-emerald-800 bg-white transition-colors cursor-pointer shadow-2xs"
                      >
                        <Truck size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2.5 rounded-lg shadow-2xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Stock Disponible:</span>
                      <div className="inline-flex items-center gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          min="0"
                          value={p.availableStock}
                          onChange={(e) => updateProductStockDirect(p.id, Number(e.target.value))}
                          className="w-16 p-1 text-center font-black text-xs rounded-lg bg-slate-50 focus:outline-hidden"
                        />
                        <span className="text-[10px] text-gray-500 font-bold">{p.unit}</span>
                      </div>
                      <span
                        className="text-[9px] text-gray-500 block mt-0.5"
                        title="Físico: cantidad real en bodega | Res: unidades reservadas para proyectos"
                      >
                        Físico: <strong>{p.realStock}</strong> | Res: <strong>{p.reservedStock}</strong>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Estado Stock:</span>
                      <div className="mt-1">
                        {isLowStock ? (
                          <span className="whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-1 rounded-md animate-pulse">
                            ⚠️ STOCK BAJO
                          </span>
                        ) : (
                          <span className="whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                            ✓ Óptimo
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-gray-400 block mt-0.5">
                        Mínimo: {p.minStock} {p.unit}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Ubicación:</span>
                      <span className="font-mono font-bold text-gray-900 text-xs block mt-0.5">
                        {p.shelf && !p.shelf.toLowerCase().includes('bodega central')
                          ? p.shelf
                          : (p.locationName && !p.locationName.toLowerCase().includes('bodega central')
                              ? p.locationName
                              : (p.shelf || p.locationName || 'Sin ubicación'))}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-medium">Valor Unitario:</span>
                      <span className="font-mono font-bold text-emerald-700 text-xs block">
                        {formatCOP(p.costPriceCOP)}
                      </span>
                      <span className="text-gray-400 font-mono text-[10px] block">
                        ≈ {formatUSD(p.costPriceUSD)} USD
                      </span>
                    </div>
                  </div>

                  {p.observations && (
                    <p className="text-[11px] text-gray-500 italic px-1 line-clamp-2">{p.observations}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* VISTA ESCRITORIO: TABLA PRINCIPAL UNIFICADA (hidden md:block) */}
          <div className="hidden md:block rounded-xl overflow-hidden bg-white w-full max-w-full min-w-0 border border-gray-100 shadow-2xs">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="bg-slate-50 text-gray-700 font-bold text-[11px] border-b border-gray-200">
                    {/* 1. Código Referencia */}
                    <th className="p-2 relative select-none">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">Código Referencia</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilterCol(activeFilterCol === 'sku' ? null : 'sku');
                            setColSearchQuery('');
                          }}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                            colFilters['sku']?.length > 0 || colSort?.col === 'sku'
                              ? 'text-[#00668F] font-black'
                              : 'text-slate-400'
                          }`}
                          title="Filtrar u ordenar columna"
                        >
                          <Filter size={11} />
                        </button>
                      </div>
                      {activeFilterCol === 'sku' && (
                        <div
                          className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2.5 text-xs font-normal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setColSort({ col: 'sku', dir: 'asc' });
                                setActiveFilterCol(null);
                              }}
                              className="text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between font-medium text-slate-700"
                            >
                              <span>Ordenar A a Z</span>
                              <span className="text-[10px] text-slate-400 font-bold">↑</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setColSort({ col: 'sku', dir: 'desc' });
                                setActiveFilterCol(null);
                              }}
                              className="text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between font-medium text-slate-700"
                            >
                              <span>Ordenar Z a A</span>
                              <span className="text-[10px] text-slate-400 font-bold">↓</span>
                            </button>
                          </div>
                          <div className="pt-2">
                            <input
                              type="text"
                              placeholder="Buscar en lista..."
                              value={colSearchQuery}
                              onChange={(e) => setColSearchQuery(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg mb-2 focus:outline-hidden"
                            />
                            <div className="max-h-36 overflow-y-auto space-y-1">
                              {Array.from(new Set(products.map((p) => p.sku)))
                                .filter((s) => s.toLowerCase().includes(colSearchQuery.toLowerCase()))
                                .slice(0, 40)
                                .map((skuVal) => {
                                  const isChecked = colFilters['sku']?.includes(skuVal) ?? false;
                                  return (
                                    <label key={skuVal} className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-50 rounded cursor-pointer text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const prev = colFilters['sku'] || [];
                                          const next = e.target.checked
                                            ? [...prev, skuVal]
                                            : prev.filter((v) => v !== skuVal);
                                          setColFilters({ ...colFilters, sku: next });
                                        }}
                                        className="rounded border-slate-300 text-[#00668F]"
                                      />
                                      <span className="truncate font-mono">{skuVal}</span>
                                    </label>
                                  );
                                })}
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between">
                              <button
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, sku: [] })}
                                className="text-[10px] text-rose-600 font-bold hover:underline"
                              >
                                Limpiar filtro
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFilterCol(null)}
                                className="text-[10px] bg-[#00668F] text-white px-2 py-0.5 rounded font-bold"
                              >
                                Listo
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </th>

                    {/* 2. Descripción */}
                    <th className="p-2 relative select-none">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">Descripción</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilterCol(activeFilterCol === 'name' ? null : 'name');
                            setColSearchQuery('');
                          }}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                            colFilters['name']?.length > 0 || colSort?.col === 'name'
                              ? 'text-[#00668F] font-black'
                              : 'text-slate-400'
                          }`}
                        >
                          <Filter size={11} />
                        </button>
                      </div>
                      {activeFilterCol === 'name' && (
                        <div
                          className="absolute left-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2.5 text-xs font-normal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setColSort({ col: 'name', dir: 'asc' });
                                setActiveFilterCol(null);
                              }}
                              className="text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between font-medium text-slate-700"
                            >
                              <span>Ordenar A a Z</span>
                              <span className="text-[10px] text-slate-400 font-bold">↑</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setColSort({ col: 'name', dir: 'desc' });
                                setActiveFilterCol(null);
                              }}
                              className="text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between font-medium text-slate-700"
                            >
                              <span>Ordenar Z a A</span>
                              <span className="text-[10px] text-slate-400 font-bold">↓</span>
                            </button>
                          </div>
                          <div className="pt-2">
                            <input
                              type="text"
                              placeholder="Buscar en lista..."
                              value={colSearchQuery}
                              onChange={(e) => setColSearchQuery(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-200 rounded-lg mb-2 focus:outline-hidden"
                            />
                            <div className="max-h-36 overflow-y-auto space-y-1">
                              {Array.from(new Set(products.map((p) => p.name)))
                                .filter((s) => s.toLowerCase().includes(colSearchQuery.toLowerCase()))
                                .slice(0, 30)
                                .map((nameVal) => {
                                  const isChecked = colFilters['name']?.includes(nameVal) ?? false;
                                  return (
                                    <label key={nameVal} className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-50 rounded cursor-pointer text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={(e) => {
                                          const prev = colFilters['name'] || [];
                                          const next = e.target.checked
                                            ? [...prev, nameVal]
                                            : prev.filter((v) => v !== nameVal);
                                          setColFilters({ ...colFilters, name: next });
                                        }}
                                        className="rounded border-slate-300 text-[#00668F]"
                                      />
                                      <span className="truncate">{nameVal}</span>
                                    </label>
                                  );
                                })}
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between">
                              <button
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, name: [] })}
                                className="text-[10px] text-rose-600 font-bold hover:underline"
                              >
                                Limpiar filtro
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFilterCol(null)}
                                className="text-[10px] bg-[#00668F] text-white px-2 py-0.5 rounded font-bold"
                              >
                                Listo
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </th>

                    {/* 3. Categoría */}
                    <th className="p-2 relative select-none">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">Categoría</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilterCol(activeFilterCol === 'category' ? null : 'category');
                            setColSearchQuery('');
                          }}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                            colFilters['category']?.length > 0 || colSort?.col === 'category'
                              ? 'text-[#00668F] font-black'
                              : 'text-slate-400'
                          }`}
                        >
                          <Filter size={11} />
                        </button>
                      </div>
                      {activeFilterCol === 'category' && (
                        <div
                          className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2.5 text-xs font-normal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setColSort({ col: 'category', dir: 'asc' });
                                setActiveFilterCol(null);
                              }}
                              className="text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between font-medium text-slate-700"
                            >
                              <span>Ordenar A a Z</span>
                              <span className="text-[10px] text-slate-400 font-bold">↑</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setColSort({ col: 'category', dir: 'desc' });
                                setActiveFilterCol(null);
                              }}
                              className="text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between font-medium text-slate-700"
                            >
                              <span>Ordenar Z a A</span>
                              <span className="text-[10px] text-slate-400 font-bold">↓</span>
                            </button>
                          </div>
                          <div className="pt-2">
                            <div className="max-h-36 overflow-y-auto space-y-1">
                              {Array.from(new Set(products.map((p) => p.category))).map((catVal) => {
                                const isChecked = colFilters['category']?.includes(catVal) ?? false;
                                return (
                                  <label key={catVal} className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-50 rounded cursor-pointer text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const prev = colFilters['category'] || [];
                                        const next = e.target.checked
                                          ? [...prev, catVal]
                                          : prev.filter((v) => v !== catVal);
                                        setColFilters({ ...colFilters, category: next });
                                      }}
                                      className="rounded border-slate-300 text-[#00668F]"
                                    />
                                    <span className="truncate">{catVal}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between">
                              <button
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, category: [] })}
                                className="text-[10px] text-rose-600 font-bold hover:underline"
                              >
                                Limpiar filtro
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFilterCol(null)}
                                className="text-[10px] bg-[#00668F] text-white px-2 py-0.5 rounded font-bold"
                              >
                                Listo
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </th>

                    {/* 4. Stock Operativo Disponible */}
                    <th className="p-2 text-center relative select-none">
                      <div className="flex items-center justify-center gap-1">
                        <span>Stock Operativo</span>
                        <button
                          type="button"
                          onClick={() => {
                            const nextDir = colSort?.col === 'availableStock' && colSort.dir === 'asc' ? 'desc' : 'asc';
                            setColSort({ col: 'availableStock', dir: nextDir });
                          }}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                            colSort?.col === 'availableStock' ? 'text-[#00668F] font-black' : 'text-slate-400'
                          }`}
                          title="Ordenar por stock operativo disponible"
                        >
                          <ArrowUpDown size={11} />
                        </button>
                      </div>
                    </th>

                    {/* 5. Unidad */}
                    <th className="p-2 text-center relative select-none">
                      <div className="flex items-center justify-center gap-1">
                        <span>Unidad</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilterCol(activeFilterCol === 'unit' ? null : 'unit');
                          }}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                            colFilters['unit']?.length > 0 ? 'text-[#00668F] font-black' : 'text-slate-400'
                          }`}
                        >
                          <Filter size={11} />
                        </button>
                      </div>
                      {activeFilterCol === 'unit' && (
                        <div
                          className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs font-normal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="max-h-36 overflow-y-auto space-y-1">
                            {Array.from(new Set(products.map((p) => p.unit))).map((uVal) => {
                              const isChecked = colFilters['unit']?.includes(uVal) ?? false;
                              return (
                                <label key={uVal} className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-50 rounded cursor-pointer text-slate-700">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      const prev = colFilters['unit'] || [];
                                      const next = e.target.checked
                                        ? [...prev, uVal]
                                        : prev.filter((v) => v !== uVal);
                                      setColFilters({ ...colFilters, unit: next });
                                    }}
                                    className="rounded border-slate-300 text-[#00668F]"
                                  />
                                  <span className="font-mono">{uVal}</span>
                                </label>
                              );
                            })}
                          </div>
                          <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between">
                            <button
                              type="button"
                              onClick={() => setColFilters({ ...colFilters, unit: [] })}
                              className="text-[10px] text-rose-600 font-bold hover:underline"
                            >
                              Limpiar
                            </button>
                            <button
                              type="button"
                              onClick={() => setActiveFilterCol(null)}
                              className="text-[10px] bg-[#00668F] text-white px-2 py-0.5 rounded font-bold"
                            >
                              Listo
                            </button>
                          </div>
                        </div>
                      )}
                    </th>

                    {/* 6. Ubicación */}
                    <th className="p-2 relative select-none">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">Ubicación</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveFilterCol(activeFilterCol === 'locationName' ? null : 'locationName');
                            setColSearchQuery('');
                          }}
                          className={`p-1 rounded hover:bg-slate-200 transition-colors ${
                            colFilters['locationName']?.length > 0 || colSort?.col === 'locationName'
                              ? 'text-[#00668F] font-black'
                              : 'text-slate-400'
                          }`}
                        >
                          <Filter size={11} />
                        </button>
                      </div>
                      {activeFilterCol === 'locationName' && (
                        <div
                          className="absolute left-0 top-full mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2.5 text-xs font-normal"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex flex-col gap-1 pb-2 border-b border-slate-100">
                            <button
                              type="button"
                              onClick={() => {
                                setColSort({ col: 'locationName', dir: 'asc' });
                                setActiveFilterCol(null);
                              }}
                              className="text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between font-medium text-slate-700"
                            >
                              <span>Ordenar A a Z</span>
                              <span className="text-[10px] text-slate-400 font-bold">↑</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setColSort({ col: 'locationName', dir: 'desc' });
                                setActiveFilterCol(null);
                              }}
                              className="text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center justify-between font-medium text-slate-700"
                            >
                              <span>Ordenar Z a A</span>
                              <span className="text-[10px] text-slate-400 font-bold">↓</span>
                            </button>
                          </div>
                          <div className="pt-2">
                            <div className="max-h-36 overflow-y-auto space-y-1">
                              {Array.from(new Set(products.map((p) => (
                                p.shelf && !p.shelf.toLowerCase().includes('bodega central')
                                  ? p.shelf
                                  : (p.locationName && !p.locationName.toLowerCase().includes('bodega central')
                                      ? p.locationName
                                      : (p.shelf || p.locationName || 'Sin ubicación'))
                              )).filter(Boolean))).map((locVal) => {
                                const isChecked = colFilters['locationName']?.includes(locVal) ?? false;
                                return (
                                  <label key={locVal} className="flex items-center gap-2 px-1 py-0.5 hover:bg-slate-50 rounded cursor-pointer text-slate-700">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={(e) => {
                                        const prev = colFilters['locationName'] || [];
                                        const next = e.target.checked
                                          ? [...prev, locVal]
                                          : prev.filter((v) => v !== locVal);
                                        setColFilters({ ...colFilters, locationName: next });
                                      }}
                                      className="rounded border-slate-300 text-[#00668F]"
                                    />
                                    <span className="truncate">{locVal}</span>
                                  </label>
                                );
                              })}
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between">
                              <button
                                type="button"
                                onClick={() => setColFilters({ ...colFilters, locationName: [] })}
                                className="text-[10px] text-rose-600 font-bold hover:underline"
                              >
                                Limpiar filtro
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveFilterCol(null)}
                                className="text-[10px] bg-[#00668F] text-white px-2 py-0.5 rounded font-bold"
                              >
                                Listo
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </th>

                    {/* 7. Valor COP */}
                    <th className="p-2 text-right relative select-none">
                      <span>Valor (COP)</span>
                    </th>

                    {/* 8. Estado (Semáforo) */}
                    <th className="p-2 text-center select-none">
                      <span>Estado (Semáforo)</span>
                    </th>

                    {/* Acciones */}
                    <th className="p-2 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {paginatedProducts.map((p) => {
                    const isLowStock = p.availableStock <= p.minStock;

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedProductForDetail(p)}
                        className="hover:bg-sky-50/50 transition-colors cursor-pointer group"
                        title="Haz clic para ver la ficha completa, especificaciones técnicas y hoja de seguridad"
                      >
                        {/* 1. Código Referencia */}
                        <td className="p-3 font-mono font-bold text-gray-900 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 group-hover:bg-white group-hover:shadow-2xs transition-all">
                            {p.sku}
                          </span>
                        </td>

                        {/* 2. Descripción */}
                        <td className="p-3 font-semibold text-gray-900 max-w-xs">
                          <div className="group-hover:text-[#00668F] transition-colors">{p.name}</div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {p.isCriticalSpare && (
                              <span className="whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 text-[9px] font-black text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                                REPUESTO CRÍTICO STC
                              </span>
                            )}
                            {p.physicalState && (
                              <span className="whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 text-[9px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded capitalize">
                                {p.physicalState}
                              </span>
                            )}
                            {p.calibrationInfo && (
                              (() => {
                                const cal = getCalibrationStatus(p.calibrationInfo);
                                if (!cal.hasCalibration) return null;
                                return (
                                  <span className={`whitespace-nowrap inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded font-bold ${cal.badgeClass}`}>
                                    <Activity size={10} />
                                    {cal.label}
                                  </span>
                                );
                              })()
                            )}
                          </div>
                        </td>

                        {/* 3. Categoría */}
                        <td className="p-3">
                          <span className="whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-[#00668F]">
                            {p.category}
                          </span>
                        </td>

                        {/* 4. Stock Operativo Disponible (Diferente al físico) */}
                        <td className="p-3 text-center whitespace-nowrap">
                          <div
                            className="inline-flex items-center gap-1.5 bg-slate-50 rounded-xl p-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="number"
                              min="0"
                              value={p.availableStock}
                              onChange={(e) => updateProductStockDirect(p.id, Number(e.target.value))}
                              title="Stock operativo disponible (Escribe directamente para ajustar)"
                              className="w-16 p-1 text-center font-black text-xs rounded-lg bg-white focus:outline-hidden"
                            />
                            <span className="text-[10px] text-gray-400 font-medium pr-1">
                              {p.unit}
                            </span>
                          </div>
                          <div
                            className="text-[9px] text-gray-500 mt-0.5"
                            title="Físico: existencia en almacén | Res: apartado para proyectos activos"
                          >
                            Físico: <strong>{p.realStock ?? p.availableStock}</strong> | Res: <strong>{p.reservedStock || 0}</strong>
                            {(p.totalEntradas !== undefined || p.totalSalidas !== undefined) && (
                              <div className="text-[8px] text-slate-400">
                                Ent: {p.totalEntradas || 0} • Sal: {p.totalSalidas || 0}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 5. Unidad */}
                        <td className="p-3 text-center">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                            {p.unit}
                          </span>
                        </td>

                        {/* 6. Ubicación Real */}
                        <td className="p-3 text-[11px] whitespace-nowrap">
                          <span className="font-mono font-bold text-gray-900 bg-slate-100 px-2 py-0.5 rounded-md inline-block">
                            {p.shelf && !p.shelf.toLowerCase().includes('bodega central')
                              ? p.shelf
                              : (p.locationName && !p.locationName.toLowerCase().includes('bodega central')
                                  ? p.locationName
                                  : (p.shelf || p.locationName || 'Sin ubicación'))}
                          </span>
                          {p.purchaseYear && (
                            <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                              Año: {p.purchaseYear}
                            </div>
                          )}
                        </td>

                        {/* 7. Valor COP */}
                        <td className="p-3 text-right whitespace-nowrap">
                          <div className="font-mono font-bold text-gray-900 text-xs">
                            {formatCOP(p.costPriceCOP)}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">
                            ≈ {formatUSD(p.costPriceUSD)} USD
                          </div>
                        </td>

                        {/* 7. Estado (Semáforo de Disponibilidad & HSEQ) */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {(() => {
                            const cal = p.calibrationInfo ? getCalibrationStatus(p.calibrationInfo) : null;
                            const isExpiredCal = cal && (cal.status === 'expired' || cal.status === 'critical_1m');
                            
                            if (p.availableStock <= 0 || isExpiredCal) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                  {p.availableStock <= 0 ? 'Sin Stock' : 'Calibración Vencida'}
                                </span>
                              );
                            }
                            if (p.availableStock <= p.minStock) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  Bajo Mínimo ({p.minStock})
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                Óptimo Operativo
                              </span>
                            );
                          })()}
                        </td>

                        {/* 8. Acciones */}
                        <td className="p-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedProductForDetail(p)}
                              title="Ver Ficha Técnica y Detalle Maestro"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setProductForWriteOff(p);
                                setTramoForWriteOff(null);
                                setIsWriteOffModalOpen(true);
                              }}
                              title="Solicitar Baja por Retazo, Merma o Daño"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Scissors size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProductForQr(p);
                                setIsQrModalOpen(true);
                              }}
                              title="Generar Etiqueta QR"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                            >
                              <QrCode size={14} />
                            </button>
                            <button
                              onClick={() => handleOpenEditProduct(p)}
                              title="Editar Ficha del Artículo"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-[#00668F] hover:bg-sky-50 transition-colors cursor-pointer"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => {
                                setDispatchItems([
                                  {
                                    id: `d-item-${Date.now()}`,
                                    productId: p.id,
                                    sku: p.sku,
                                    name: p.name,
                                    unit: p.unit,
                                    category: p.category,
                                    qtyDispatched: 1,
                                    unitCostUSD: p.costPriceUSD,
                                    unitCostCOP: p.costPriceCOP,
                                  },
                                ]);
                                setActiveTab('dispatch');
                              }}
                              title="Despachar a frente de obra"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                            >
                              <Truck size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Controles de Paginación */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50 border-t border-gray-100 rounded-b-xl text-xs text-gray-600">
                <div>
                  Mostrando{' '}
                  <span className="font-bold text-gray-900">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>{' '}
                  a{' '}
                  <span className="font-bold text-gray-900">
                    {Math.min(currentPage * itemsPerPage, filteredProducts.length)}
                  </span>{' '}
                  de <span className="font-bold text-gray-900">{filteredProducts.length}</span> artículos
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Anterior
                  </button>
                  <span className="font-semibold text-gray-800">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA 2: DESPACHO Y SALIDAS (REMISIÓN MULTI-ÍTEM A TERRENO)           */}
      {/* ==================================================================== */}
      {activeTab === 'dispatch' && (
        <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#00668F]/10 text-[#00668F]">
                  Logística en Campo
                </span>
                <span className="text-xs text-gray-400 font-mono">REM-OUT-2026</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 mt-1">
                Generar Remisión de Salida Multi-Artículo
              </h3>
              <p className="text-xs text-gray-500">
                Despacha múltiples herramientas, equipos de medición, EPP y consumibles hacia los frentes de obra STC.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateDispatch} className="space-y-6 text-xs">
            {/* Cabecera de la Remisión */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <CreatableSelect
                  label="Proyecto o Sede Destino STC"
                  value={
                    projects.find((p) => p.id === dispatchProjectId)?.name
                      ? `${projects.find((p) => p.id === dispatchProjectId)?.code} — ${projects.find((p) => p.id === dispatchProjectId)?.name}`
                      : dispatchProjectId === 'SEDE-MED-01'
                      ? 'BOD-MED-01 — Almacén Central Medellín (Poblado)'
                      : dispatchProjectId === 'TAL-GBL-02'
                      ? 'TAL-GBL-02 — Taller Central Guayabal (Banco de Ensayos)'
                      : dispatchProjectId === 'BOD-METRO-03'
                      ? 'BOD-METRO-03 — Bodega de Campo Metro Medellín'
                      : dispatchProjectId === 'BOD-MOV-06'
                      ? 'BOD-MOV-06 — Contenedor Móvil de Obra STC'
                      : dispatchProjectId
                  }
                  onChange={(val) => {
                    const match = projects.find((p) => `${p.code} — ${p.name}`.toLowerCase() === val.toLowerCase() || p.id === val);
                    if (match) {
                      setDispatchProjectId(match.id);
                    } else if (val.includes('BOD-MED-01')) {
                      setDispatchProjectId('SEDE-MED-01');
                    } else if (val.includes('TAL-GBL-02')) {
                      setDispatchProjectId('TAL-GBL-02');
                    } else if (val.includes('BOD-METRO-03')) {
                      setDispatchProjectId('BOD-METRO-03');
                    } else if (val.includes('BOD-MOV-06')) {
                      setDispatchProjectId('BOD-MOV-06');
                    } else {
                      setDispatchProjectId(val);
                    }
                  }}
                  options={[
                    ...projects.map((p) => ({
                      id: p.id,
                      name: `${p.code} — ${p.name}`,
                      code: p.costCenter,
                    })),
                    { id: 'SEDE-MED-01', name: 'BOD-MED-01 — Almacén Central Medellín (Poblado)', code: 'BOD-01' },
                    { id: 'TAL-GBL-02', name: 'TAL-GBL-02 — Taller Central Guayabal (Banco de Ensayos)', code: 'TAL-02' },
                    { id: 'BOD-METRO-03', name: 'BOD-METRO-03 — Bodega de Campo Metro Medellín', code: 'BOD-03' },
                    { id: 'BOD-MOV-06', name: 'BOD-MOV-06 — Contenedor Móvil de Obra STC', code: 'BOD-06' },
                  ]}
                  placeholder="Seleccionar destino..."
                  allowCustomText={true}
                  inputClassName="bg-white border-gray-200"
                />
              </div>

              <div>
                <CreatableSelect
                  label="Responsable de lo que sale"
                  value={collaboratorsList.find((u) => u.id === dispatchTechId)?.name || dispatchTechId}
                  onChange={(val) => {
                    const match = collaboratorsList.find((u) => u.name.toLowerCase() === val.toLowerCase() || u.id === val);
                    setDispatchTechId(match?.id || val);
                  }}
                  options={collaboratorsList.map((u) => ({
                    id: u.id,
                    name: `${u.name} (${u.role})`,
                    code: u.role,
                  }))}
                  placeholder="Seleccionar responsable..."
                  allowCustomText={true}
                  inputClassName="bg-white border-gray-200"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Fecha de Salida
                </label>
                <input
                  type="date"
                  required
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Fecha Estimada de Retorno
                </label>
                <input
                  type="date"
                  required
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-medium focus:outline-hidden focus:border-[#00668F]"
                />
              </div>
            </div>

            {/* Renglones de la Remisión (Multi-ítem) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                <div>
                  <h4 className="font-black text-sm text-gray-900">
                    Artículos y Herramientas Despachadas ({dispatchItems.length})
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Agrega los repuestos, cables, instrumentación o herramientas que salen en la remisión.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addDispatchItemRow}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-50 text-[#00668F] font-bold hover:bg-sky-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Agregar Artículo</span>
                </button>
              </div>

              {/* VISTA MÓVIL: TARJETAS RESPONSIVAS PARA DESPACHO */}
              <div className="md:hidden space-y-3">
                {dispatchItems.map((item) => {
                  const prod = products.find((p) => p.id === item.productId);

                  return (
                    <div key={item.id} className="bg-white p-3.5 rounded-2xl shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">
                            Repuesto o Artículo
                          </label>
                          <CreatableSelect
                            value={
                              products.find((p) => p.id === item.productId)
                                ? `${products.find((p) => p.id === item.productId)!.sku} — ${products.find((p) => p.id === item.productId)!.name} (Disp: ${products.find((p) => p.id === item.productId)!.availableStock} ${products.find((p) => p.id === item.productId)!.unit})`
                                : ''
                            }
                            onChange={(val) => {
                              const found = products.find(
                                (p) => `${p.sku} — ${p.name} (Disp: ${p.availableStock} ${p.unit})` === val || p.id === val || p.sku === val
                              );
                              if (found) updateDispatchItem(item.id, 'productId', found.id);
                            }}
                            options={products.map((p) => ({
                              id: p.id,
                              name: `${p.sku} — ${p.name} (Disp: ${p.availableStock} ${p.unit})`,
                              code: p.sku,
                            }))}
                            placeholder="Buscar repuesto..."
                            allowCustomText={false}
                            
                            inputClassName="w-full h-11 px-3 text-xs rounded-xl bg-slate-100 font-semibold text-slate-800"
                          />
                        </div>
                        {dispatchItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeDispatchItem(item.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl mt-5 shrink-0"
                            title="Eliminar artículo"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] font-bold text-[#00668F] block mb-1">
                            Cant. a Despachar
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="1"
                              max={prod?.availableStock || 999}
                              value={item.qtyDispatched}
                              onChange={(e) =>
                                updateDispatchItem(item.id, 'qtyDispatched', Math.max(1, parseInt(e.target.value) || 1))
                              }
                              className="w-full h-10 px-3 text-center font-black text-xs rounded-xl bg-slate-100 focus:bg-white"
                            />
                            <span className="text-xs font-bold text-slate-500 shrink-0">{item.unit}</span>
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-400 block mb-1">
                            Subtotal Estimado
                          </label>
                          <div className="h-10 flex items-center justify-end font-mono font-black text-slate-900 text-xs">
                            ${(item.qtyDispatched * item.unitCostUSD).toLocaleString()} USD
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* VISTA DESKTOP: TABLA CON SCROLL HORIZONTAL DE SEGURIDAD */}
              <div className="hidden md:block rounded-2xl overflow-hidden bg-white shadow-2xs w-full max-w-full min-w-0">
                <div className="overflow-x-auto w-full max-w-full">
                  <div className="min-w-[760px]">
                    <div className="grid grid-cols-12 bg-slate-50 p-2.5 font-bold text-gray-600 text-[11px]">
                      <div className="col-span-5">Seleccionar del Inventario / Repuesto</div>
                      <div className="col-span-2 text-center">Categoría</div>
                      <div className="col-span-1 text-center">Unidad</div>
                      <div className="col-span-2 text-center">Cant. a Despachar</div>
                      <div className="col-span-1 text-right">Valor USD</div>
                      <div className="col-span-1 text-center">Acción</div>
                    </div>

                    <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
                      {dispatchItems.map((item) => {
                        const prod = products.find((p) => p.id === item.productId);

                        return (
                          <div key={item.id} className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-sky-50/30">
                            <div className="col-span-5">
                              <CreatableSelect
                                value={
                                  products.find((p) => p.id === item.productId)
                                    ? `${products.find((p) => p.id === item.productId)!.sku} — ${products.find((p) => p.id === item.productId)!.name} (Disp: ${products.find((p) => p.id === item.productId)!.availableStock} ${products.find((p) => p.id === item.productId)!.unit})`
                                    : ''
                                }
                                onChange={(val) => {
                                  const found = products.find(
                                    (p) => `${p.sku} — ${p.name} (Disp: ${p.availableStock} ${p.unit})` === val || p.id === val || p.sku === val
                                  );
                                  if (found) updateDispatchItem(item.id, 'productId', found.id);
                                }}
                                options={products.map((p) => ({
                                  id: p.id,
                                  name: `${p.sku} — ${p.name} (Disp: ${p.availableStock} ${p.unit})`,
                                  code: p.sku,
                                }))}
                                placeholder="Buscar repuesto..."
                                allowCustomText={false}
                                
                                inputClassName="w-full h-10 px-3 text-xs rounded-xl bg-slate-100 font-medium"
                              />
                            </div>

                            <div className="col-span-2 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-bold">
                                {item.category}
                              </span>
                            </div>

                            <div className="col-span-1 text-center font-mono font-bold text-gray-700">
                              {item.unit}
                            </div>

                            <div className="col-span-2 text-center">
                              <input
                                type="number"
                                min="1"
                                max={prod?.availableStock || 999}
                                value={item.qtyDispatched}
                                onChange={(e) =>
                                  updateDispatchItem(item.id, 'qtyDispatched', Math.max(1, parseInt(e.target.value) || 1))
                                }
                                className="w-20 h-9 p-1.5 text-center font-bold text-xs rounded-lg bg-slate-100"
                              />
                            </div>

                            <div className="col-span-1 text-right font-mono font-bold text-gray-900">
                              ${(item.qtyDispatched * item.unitCostUSD).toLocaleString()}
                            </div>

                            <div className="col-span-1 text-center">
                              <button
                                type="button"
                                onClick={() => removeDispatchItem(item.id)}
                                disabled={dispatchItems.length <= 1}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  dispatchItems.length <= 1
                                    ? 'text-gray-300 cursor-not-allowed'
                                    : 'text-gray-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'
                                }`}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notas y Observaciones */}
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Observaciones del Despacho / Instrucciones de Transporte
              </label>
              <textarea
                rows={2}
                value={dispatchNotes}
                onChange={(e) => setDispatchNotes(e.target.value)}
                placeholder="Indica el transporte o condiciones especiales del traslado a estación..."
                className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#00668F]"
              />
            </div>

            {/* Sección de Firma Digital Biométrica */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-[#00668F]">
                  <PenTool size={16} />
                </div>
                <div>
                  <span className="font-bold text-gray-900 block text-xs">Firma del Responsable de lo que sale</span>
                  <p className="text-[11px] text-gray-500">
                    {signatureData ? (
                      <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                        <ShieldCheck size={12} /> Firmado por: {signatureData.signerName} ({signatureData.signerDoc})
                      </span>
                    ) : (
                      `Responsable asignado: ${users.find((u) => u.id === dispatchTechId)?.name || 'Seleccione'} • C.C. ${getPersonCedula(users.find((u) => u.id === dispatchTechId))}`
                    )}
                  </p>
                </div>
              </div>

              {signatureData ? (
                <div className="flex items-center gap-2 shrink-0">
                  <img
                    src={signatureData.signatureUrl}
                    alt="Firma"
                    className="h-9 w-24 object-contain bg-white rounded-lg border border-gray-200 p-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 text-[#00668F] border border-sky-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                >
                  <PenTool size={13} />
                  <span>Estampar Firma Táctil</span>
                </button>
              )}
            </div>

            {/* Botones de Envío */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('unified')}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-black shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <Truck size={15} />
                <span>Emitir Remisión de Salida y Descontar Stock</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA 3: REINGRESO DE MATERIALES Y LIQUIDACIÓN DE CONSUMOS          */}
      {/* ==================================================================== */}
      {activeTab === 'return' && (
        <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Control de Retorno & Consumo
                </span>
                <span className="text-xs text-gray-400 font-mono">REM-IN-2026</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 mt-1">
                Remisión de Reingreso y Liquidación de Consumos
              </h3>
              <p className="text-xs text-gray-500">
                Compara lo despachado vs lo retornado. Los artículos no devueltos o gastados se imputan como costo directo al proyecto.
              </p>
            </div>
          </div>

          {/* Selector de Remisión Activa en Campo y Responsable de Recepción */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-gray-100">
            <div className="space-y-1.5">
              <label className="block font-bold text-gray-700 text-xs">
                Seleccionar Remisión de Salida a Reingresar: *
              </label>
              <CreatableSelect
                value={
                  remissions.find((r) => r.id === selectedReturnRemissionId)
                    ? `${remissions.find((r) => r.id === selectedReturnRemissionId)!.remissionNumber} — ${remissions.find((r) => r.id === selectedReturnRemissionId)!.projectName} (${remissions.find((r) => r.id === selectedReturnRemissionId)!.responsibleTechnicianName} | Salida: ${remissions.find((r) => r.id === selectedReturnRemissionId)!.departureDate} | Estado: ${remissions.find((r) => r.id === selectedReturnRemissionId)!.status})`
                    : ''
                }
                onChange={(val) => {
                  const match = remissions.find(
                    (r) => `${r.remissionNumber} — ${r.projectName} (${r.responsibleTechnicianName} | Salida: ${r.departureDate} | Estado: ${r.status})` === val || r.id === val || r.remissionNumber === val
                  );
                  if (match) setSelectedReturnRemissionId(match.id);
                }}
                options={remissions.map((r) => ({
                  id: r.id,
                  name: `${r.remissionNumber} — ${r.projectName} (${r.responsibleTechnicianName} | Salida: ${r.departureDate} | Estado: ${r.status})`,
                  code: r.remissionNumber,
                }))}
                placeholder="Buscar remisión..."
                allowCustomText={false}
                
                inputClassName="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-bold text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block font-bold text-gray-700 text-xs">
                Almacenista o Encargado que Recibe: * (Obligatorio)
              </label>
              <CreatableSelect
                value={
                  collaboratorsList.find((u) => u.id === returnReceiverUserId)
                    ? `${collaboratorsList.find((u) => u.id === returnReceiverUserId)!.name} — ${collaboratorsList.find((u) => u.id === returnReceiverUserId)!.role}`
                    : ''
                }
                onChange={(val) => {
                  const match = collaboratorsList.find(
                    (u) => `${u.name} — ${u.role}` === val || u.id === val || u.name === val
                  );
                  if (match) setReturnReceiverUserId(match.id);
                }}
                options={collaboratorsList.map((u) => ({
                  id: u.id,
                  name: `${u.name} — ${u.role}`,
                  code: u.role,
                }))}
                placeholder="Seleccionar encargado..."
                allowCustomText={false}
                inputClassName="w-full p-2.5 rounded-xl border border-gray-200 bg-white font-bold text-xs"
              />
            </div>
          </div>

          {activeReturnRemission ? (
            <form onSubmit={handleProcessReturn} className="space-y-6 text-xs">
              {/* Tabla de Conciliación de Retorno */}
              <div className="space-y-3">
                <h4 className="font-black text-sm text-gray-900">
                  Detalle de Artículos y Conciliación (Salieron vs Retornaron)
                </h4>

                {/* VISTA MÓVIL: TARJETAS RESPONSIVAS SIN TEXTOS MONTADOS */}
                <div className="md:hidden space-y-3">
                  {activeReturnRemission.items.map((item) => {
                    const itemState = returnItemsState[item.id] || {
                      qtyReturned: item.qtyReturned > 0 ? item.qtyReturned : item.qtyDispatched,
                      condition: item.condition || 'bueno',
                      notes: item.notes || '',
                    };
                    const qtyReturned = Math.min(item.qtyDispatched, Math.max(0, Number(itemState.qtyReturned) || 0));
                    const qtyConsumed = Math.max(0, item.qtyDispatched - qtyReturned);
                    const costUSD = qtyConsumed * item.unitCostUSD;

                    return (
                      <div key={item.id} className="bg-white p-4 rounded-2xl shadow-xs space-y-3">
                        <div className="flex items-start justify-between gap-2 pb-1 border-b border-slate-100">
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-900 text-xs">{item.name}</h5>
                            <span className="text-[10px] text-slate-400 font-mono block mt-0.5">{item.sku}</span>
                          </div>
                          <span className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            Salida: {item.qtyDispatched} {item.unit}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl">
                          <div>
                            <label className="text-[10px] font-bold text-[#00668F] block mb-1">
                              Cant. Retornada
                            </label>
                            <input
                              type="number"
                              min="0"
                              max={item.qtyDispatched}
                              value={itemState.qtyReturned}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 0;
                                setReturnItemsState({
                                  ...returnItemsState,
                                  [item.id]: {
                                    ...itemState,
                                    qtyReturned: Math.min(item.qtyDispatched, Math.max(0, val)),
                                  },
                                });
                              }}
                              className="w-full h-10 px-2 text-center font-black text-xs rounded-xl bg-white focus:outline-none"
                            />
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-500 block mb-1">
                              Diferencia
                            </span>
                            <div className="h-10 flex items-center justify-center">
                              <span
                                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold text-center w-full ${
                                  qtyConsumed > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                }`}
                              >
                                {qtyConsumed > 0 ? `${qtyConsumed} ${item.unit} consumido` : '0 consumido (íntegro)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 block mb-1">
                              Estado al Regreso
                            </label>
                            <CreatableSelect
                              value={
                                itemState.condition === 'bueno' ? '✓ Buen Estado' :
                                itemState.condition === 'regular' ? '⚠️ Requiere Mantenimiento' :
                                itemState.condition === 'danado' ? '❌ Dañado' :
                                '📦 Consumido en Obra'
                              }
                              onChange={(val) => {
                                let cond: any = 'bueno';
                                if (val.includes('Mantenimiento')) cond = 'regular';
                                else if (val.includes('Dañado')) cond = 'danado';
                                else if (val.includes('Consumido')) cond = 'consumido';
                                setReturnItemsState({
                                  ...returnItemsState,
                                  [item.id]: {
                                    ...itemState,
                                    condition: cond,
                                  },
                                });
                              }}
                              options={[
                                '✓ Buen Estado',
                                '⚠️ Requiere Mantenimiento',
                                '❌ Dañado',
                                '📦 Consumido en Obra',
                              ]}
                              placeholder="Estado..."
                              allowCustomText={false}
                              
                              inputClassName="w-full h-10 px-3 text-xs rounded-xl bg-slate-100 font-semibold text-slate-800"
                            />
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
                            <span className="text-[10px] text-slate-400 font-medium">Costo Imputable:</span>
                            <span className="text-xs font-black font-mono text-slate-900">
                              ${costUSD.toLocaleString()} USD
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* VISTA DESKTOP / TABLET (CON SCROLL HORIZONTAL DE SEGURIDAD) */}
                <div className="hidden md:block rounded-2xl overflow-hidden bg-white shadow-2xs w-full max-w-full min-w-0">
                  <div className="overflow-x-auto w-full max-w-full">
                    <div className="min-w-[760px]">
                      <div className="grid grid-cols-12 bg-slate-50 p-2.5 font-bold text-gray-600 text-[11px]">
                        <div className="col-span-3">Artículo / Referencia</div>
                        <div className="col-span-1 text-center">Despachado</div>
                        <div className="col-span-2 text-center font-black text-[#00668F]">Cant. Retornada</div>
                        <div className="col-span-2 text-center text-amber-800">Diferencia Consumida</div>
                        <div className="col-span-2 text-right">Costo Imputable</div>
                        <div className="col-span-2 text-center">Estado al Regreso</div>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {activeReturnRemission.items.map((item) => {
                          const itemState = returnItemsState[item.id] || {
                            qtyReturned: item.qtyReturned > 0 ? item.qtyReturned : item.qtyDispatched,
                            condition: item.condition || 'bueno',
                            notes: item.notes || '',
                          };
                          const qtyReturned = Math.min(item.qtyDispatched, Math.max(0, Number(itemState.qtyReturned) || 0));
                          const qtyConsumed = Math.max(0, item.qtyDispatched - qtyReturned);
                          const costUSD = qtyConsumed * item.unitCostUSD;

                          return (
                            <div key={item.id} className="grid grid-cols-12 gap-2 p-3 items-center hover:bg-slate-50/50">
                              <div className="col-span-3">
                                <div className="font-bold text-gray-900">{item.name}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{item.sku}</div>
                              </div>

                              <div className="col-span-1 text-center font-bold text-gray-700">
                                {item.qtyDispatched} {item.unit}
                              </div>

                              <div className="col-span-2 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  max={item.qtyDispatched}
                                  value={itemState.qtyReturned}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setReturnItemsState({
                                      ...returnItemsState,
                                      [item.id]: {
                                        ...itemState,
                                        qtyReturned: Math.min(item.qtyDispatched, Math.max(0, val)),
                                      },
                                    });
                                  }}
                                  className="w-20 h-9 p-1.5 text-center font-black text-xs rounded-lg bg-slate-100 focus:bg-white focus:outline-none"
                                />
                              </div>

                              <div className="col-span-2 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                    qtyConsumed > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {qtyConsumed} {item.unit} {qtyConsumed > 0 ? 'consumido(s)' : 'íntegro'}
                                </span>
                              </div>

                              <div className="col-span-2 text-right font-mono font-black text-gray-900">
                                ${costUSD.toLocaleString()} USD
                              </div>

                              <div className="col-span-2 text-center">
                                <CreatableSelect
                                  value={
                                    itemState.condition === 'bueno' ? '✓ Buen Estado' :
                                    itemState.condition === 'regular' ? '⚠️ Requiere Mantenimiento' :
                                    itemState.condition === 'danado' ? '❌ Dañado' :
                                    '📦 Consumido en Obra'
                                  }
                                  onChange={(val) => {
                                    let cond: any = 'bueno';
                                    if (val.includes('Mantenimiento')) cond = 'regular';
                                    else if (val.includes('Dañado')) cond = 'danado';
                                    else if (val.includes('Consumido')) cond = 'consumido';
                                    setReturnItemsState({
                                      ...returnItemsState,
                                      [item.id]: {
                                        ...itemState,
                                        condition: cond,
                                      },
                                    });
                                  }}
                                  options={[
                                    '✓ Buen Estado',
                                    '⚠️ Requiere Mantenimiento',
                                    '❌ Dañado',
                                    '📦 Consumido en Obra',
                                  ]}
                                  placeholder="Estado..."
                                  allowCustomText={false}
                                  
                                  inputClassName="w-full h-9 p-1.5 text-xs rounded-lg bg-slate-100 font-semibold"
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Justificación y Acta */}
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Observaciones de Reingreso y Recepción en Bodega
                </label>
                <textarea
                  rows={2}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="Detalla si hubo desgaste anormal, pruebas técnicas o justificación de consumos..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              {/* Firma Biométrica Digital en Pantalla para Reingreso */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-slate-100 text-[#00668F] border border-slate-200">
                    <PenTool size={16} />
                  </div>
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      Firma Digital de Recepción y Reingreso
                    </h5>
                    <p className="text-[11px] text-slate-500">
                      {returnSignatureData
                        ? `Firmado digitalmente por ${returnSignatureData.signerName} (${returnSignatureData.timestamp})`
                        : 'El responsable de bodega o técnico debe firmar para validar el retorno.'}
                    </p>
                  </div>
                </div>

                {returnSignatureData ? (
                  <div className="flex items-center gap-2">
                    <img
                      src={returnSignatureData.signatureUrl}
                      alt="Firma Reingreso"
                      className="h-9 w-24 object-contain bg-white rounded-lg border border-slate-200 p-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => setIsReturnSignatureModalOpen(true)}
                      className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-700 cursor-pointer"
                    >
                      Cambiar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsReturnSignatureModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 text-[#00668F] border border-sky-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
                  >
                    <PenTool size={13} />
                    <span>Estampar Firma Táctil</span>
                  </button>
                )}
              </div>

              {/* Botón de Confirmación */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-2"
                >
                  <CheckCircle2 size={15} />
                  <span>Procesar Reingreso y Cargar Consumos al Proyecto</span>
                </button>
              </div>
            </form>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">No hay remisiones seleccionadas.</p>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA 4: HISTORIAL DE REMISIONES Y CUSTODIA EN CAMPO                */}
      {/* ==================================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Historial de Remisiones y Custodia en Terreno
              </h3>
              <p className="text-xs text-gray-500">
                Trazabilidad completa de responsables, fechas de despacho, reingresos y costos liquidados.
              </p>
            </div>
          </div>

          {/* VISTA MÓVIL: Tarjetas Responsivas para Historial (md:hidden) */}
          <div className="md:hidden space-y-3">
            {remissions.map((rem) => (
              <div
                key={rem.id}
                onClick={() => setSelectedRemissionForView(rem)}
                className="p-3.5 bg-slate-50 rounded-xl space-y-2.5 cursor-pointer hover:bg-slate-100 transition-colors border border-slate-200/80"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-xs text-[#00668F]">
                      {rem.remissionNumber}
                    </span>
                    {rem.returnRemissionNumber && (
                      <span className="font-mono text-[10px] text-gray-500">
                        → {rem.returnRemissionNumber}
                      </span>
                    )}
                  </div>
                  <span
                    className={`whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      rem.status === 'retornado_total'
                        ? 'bg-emerald-100 text-emerald-800'
                        : rem.status === 'retornado_parcial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {rem.status === 'retornado_total'
                      ? 'Retornado Total'
                      : rem.status === 'retornado_parcial'
                      ? 'Retornado Parcial'
                      : 'En Campo'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Proyecto STC:</span>
                    <span className="font-semibold text-gray-900 truncate block">{rem.projectCode}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Técnico Responsable:</span>
                    <span className="font-medium text-gray-800 truncate block">{rem.responsibleTechnicianName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Fecha Salida:</span>
                    <span className="text-gray-600 block">{rem.departureDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Fecha Retorno:</span>
                    <span className="text-gray-600 block">{rem.actualReturnDate || rem.expectedReturnDate}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs bg-white p-2.5 rounded-lg">
                  <span className="text-gray-500 text-[11px] font-medium">Costo Consumido:</span>
                  <span className="font-mono font-bold text-gray-900">
                    ${rem.totalConsumedValueUSD.toLocaleString()} USD
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* VISTA ESCRITORIO: Tabla Completa (hidden md:block) */}
          <div className="hidden md:block rounded-xl overflow-hidden bg-white w-full max-w-full min-w-0">
            <div className="overflow-x-auto w-full max-w-full">
              <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 text-gray-600 font-bold text-[11px]">
                    <th className="p-3">Remisión Salida</th>
                    <th className="p-3">Remisión Reingreso</th>
                    <th className="p-3">Proyecto STC</th>
                    <th className="p-3">Técnico Responsable</th>
                    <th className="p-3">Fecha Salida</th>
                    <th className="p-3">Fecha Retorno</th>
                    <th className="p-3 text-center">Estado</th>
                    <th className="p-3 text-right">Costo Consumido Imputado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {remissions.map((rem) => (
                    <tr
                      key={rem.id}
                      onClick={() => setSelectedRemissionForView(rem)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      title="Haz clic para ver el detalle completo de la remisión y firmas"
                    >
                      <td className="p-3 font-mono font-bold text-[#00668F]">
                        {rem.remissionNumber}
                      </td>
                      <td className="p-3 font-mono text-gray-600">
                        {rem.returnRemissionNumber || 'Pendiente'}
                      </td>
                      <td className="p-3 font-semibold text-gray-900">
                        {rem.projectCode}
                      </td>
                      <td className="p-3 font-medium text-gray-800">
                        {rem.responsibleTechnicianName}
                      </td>
                      <td className="p-3 text-gray-500">{rem.departureDate}</td>
                      <td className="p-3 text-gray-500">{rem.actualReturnDate || rem.expectedReturnDate}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`whitespace-nowrap inline-flex items-center justify-center leading-none shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rem.status === 'retornado_total'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rem.status === 'retornado_parcial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {rem.status === 'retornado_total'
                            ? 'Retornado Total'
                            : rem.status === 'retornado_parcial'
                            ? 'Retornado Parcial'
                            : 'En Campo'}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">
                        <div>${rem.totalConsumedValueUSD.toLocaleString()} USD</div>
                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                          {rem.recipientSignatureUrl && (
                            <span className="text-[10px] text-emerald-600 font-sans font-medium inline-flex items-center gap-0.5" title={`Firma Salida: ${rem.recipientSignerName || 'Receptor'}`}>
                              <ShieldCheck size={11} /> Salida
                            </span>
                          )}
                          {rem.returnSignatureUrl && (
                            <span className="text-[10px] text-sky-600 font-sans font-medium inline-flex items-center gap-0.5" title={`Firma Retorno: ${rem.returnSignerName || 'Receptor'}`}>
                              <ShieldCheck size={11} /> Reingreso
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA 5: AUDITORÍA FORENSE & BITÁCORA INMUTABLE                     */}
      {/* ==================================================================== */}
      {activeTab === 'audit' && (
        <InventoryForensicsTab logs={inventoryAuditLogs} products={products} />
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA 7: LECTOR ÓPTICO DE CÓDIGO DE BARRAS                           */}
      {/* ==================================================================== */}
      {activeTab === 'barcode' && (
        <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Barcode size={22} className="text-[#00668F]" />
                <span>Lector Óptico de Código de Barras (Hardware USB & Simulación)</span>
              </h3>
              <p className="text-xs text-gray-500">
                Compatible con pistolas lectoras USB/Bluetooth. Presiona Enter tras el escaneo para buscar automáticamente.
              </p>
            </div>
          </div>

          {/* Input de Lectura Óptica */}
          <div className="max-w-xl mx-auto space-y-4">
            <div className="p-4 rounded-2xl bg-sky-50/50 border border-sky-100 flex items-center gap-3">
              <ScanLine size={24} className="text-[#00668F] animate-pulse" />
              <input
                type="text"
                autoFocus
                placeholder="Escanea aquí con la pistola de código de barras o escribe el SKU..."
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleBarcodeScan(barcodeInput);
                  }
                }}
                className="w-full text-xs font-mono font-bold p-3 rounded-xl border border-gray-300 bg-white focus:outline-hidden focus:border-[#00668F]"
              />
              <button
                type="button"
                onClick={() => handleBarcodeScan(barcodeInput)}
                className="px-4 py-3 rounded-xl bg-[#00668F] text-white text-xs font-bold hover:bg-[#005073] cursor-pointer shrink-0"
              >
                Buscar
              </button>
            </div>

            {/* Botones de Prueba Rápida con Códigos Reales del Inventario */}
            {products.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-500">Artículos recientes del inventario para escaneo rápido:</span>
                <div className="flex items-center gap-2 flex-wrap">
                  {products.slice(0, 5).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setBarcodeInput(p.sku);
                        handleBarcodeScan(p.sku);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-mono text-xs cursor-pointer"
                    >
                      {p.sku}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Mensaje de Escaneo */}
            {scanMessage && (
              <div className="p-3 rounded-xl bg-slate-50 border border-gray-200 text-xs font-bold text-gray-800 text-center">
                {scanMessage}
              </div>
            )}

            {/* Ficha del Artículo Encontrado */}
            {scannedResult && (
              <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-md space-y-3 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <span className="font-mono font-bold text-xs text-[#00668F]">
                    {(scannedResult as any).sku || (scannedResult as any).code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Registrado
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-gray-900">{scannedResult.name}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Ubicación: {(scannedResult as any).locationName || 'Bodega Principal'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                  <span className="text-gray-500">
                    Stock Disponible: <strong>{(scannedResult as any).availableStock || 1}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setDispatchItems([
                        {
                          id: `scan-${Date.now()}`,
                          productId: scannedResult.id,
                          sku: (scannedResult as any).sku || (scannedResult as any).code,
                          name: scannedResult.name,
                          unit: (scannedResult as any).unit || 'unid',
                          category: (scannedResult as any).category || 'Equipos',
                          qtyDispatched: 1,
                          unitCostUSD: (scannedResult as any).costPriceUSD || 0,
                          unitCostCOP: (scannedResult as any).costPriceCOP || 0,
                        },
                      ]);
                      setActiveTab('dispatch');
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Cargar a Remisión de Salida</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* PESTAÑA: BAJAS DE INVENTARIO, RETAZOS Y MERMAS (KARDEX TRANSACCIONAL) */}
      {/* ==================================================================== */}
      {activeTab === 'writeoffs' && (
        <InventoryWriteOffsTab
          onOpenNewWriteOff={() => {
            setProductForWriteOff(products[0] || null);
            setTramoForWriteOff(null);
            setIsWriteOffModalOpen(true);
          }}
        />
      )}

      {/* ==================================================================== */}
      {/* MODAL CREAR / EDITAR PRODUCTO EN INVENTARIO                            */}
      {/* ==================================================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-slate-50/60 shrink-0">
              <div>
                <span className="text-[10px] font-bold text-[#00668F] uppercase tracking-wider block">
                  Ficha Técnica de Bodega
                </span>
                <h3 className="text-base font-bold text-gray-900">
                  {editingProduct ? 'Editar Artículo de Inventario' : 'Nuevo Artículo de Inventario'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Configurar bodegas, categorías y unidades"
                >
                  <Settings size={13} className="text-[#00668F]" />
                  <span>Configuración</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido Desplazable */}
            <form onSubmit={handleSaveProduct} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="font-bold text-gray-700 mb-1 min-h-[22px] flex items-center">Código de Referencia (SKU)</label>
                    <input
                      type="text"
                      required
                      value={prodForm.sku}
                      onChange={(e) => setProdForm({ ...prodForm, sku: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 font-bold focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <CreatableSelect
                      label="Categoría"
                      value={prodForm.category}
                      onChange={(val) => setProdForm({ ...prodForm, category: val })}
                      options={catalogCategories}
                      moduleId="inventario"
                      catalogKey="categories"
                      placeholder="Seleccionar o escribir categoría..."
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 mb-1 min-h-[22px] flex items-center">Descripción del Artículo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cable tractor 52mm galvanizado..."
                    value={prodForm.name}
                    onChange={(e) => setProdForm({ ...prodForm, name: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                  <div>
                    <CreatableSelect
                      label="Unidad"
                      value={prodForm.unit}
                      onChange={(val) => setProdForm({ ...prodForm, unit: val })}
                      options={catalogUnits}
                      moduleId="inventario"
                      catalogKey="units"
                      placeholder="Seleccionar o escribir unidad..."
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 mb-1 min-h-[22px] flex items-center">Stock Disponible</label>
                    <input
                      type="number"
                      min="0"
                      value={prodForm.realStock || ''}
                      placeholder="0"
                      onChange={(e) =>
                        setProdForm({
                          ...prodForm,
                          realStock: Number(e.target.value) || 0,
                          availableStock: Number(e.target.value) || 0,
                        })
                      }
                      className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 font-bold text-center focus:bg-white focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 mb-1 min-h-[22px] flex items-center">Stock Mínimo</label>
                    <input
                      type="number"
                      min="0"
                      value={prodForm.minStock || ''}
                      placeholder="0"
                      onChange={(e) => setProdForm({ ...prodForm, minStock: Number(e.target.value) || 0 })}
                      className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 text-center focus:bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Precios con COP como Principal y Conversión con TRM del Día */}
                <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase flex items-center gap-1">
                      <DollarSign size={14} /> Precios & Costeo (TRM Oficial del Día: ${formatTRM(currentTRM)} COP)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                    <div>
                      <label className="font-bold text-emerald-900 mb-1 min-h-[22px] flex items-center text-xs">
                        Costo Unitario COP (Moneda Principal) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={prodForm.costPriceCOP || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const valCOP = parseInt(e.target.value) || 0;
                          setProdForm({
                            ...prodForm,
                            costPriceCOP: valCOP,
                            costPriceUSD: convertCOPToUSD(valCOP, currentTRM),
                          });
                        }}
                        className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-gray-900 font-bold focus:bg-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 mb-1 min-h-[22px] flex items-center text-xs">
                        Costo Unitario USD (Equivalente)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={prodForm.costPriceUSD || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const valUSD = parseFloat(e.target.value) || 0;
                          setProdForm({
                            ...prodForm,
                            costPriceUSD: valUSD,
                            costPriceCOP: convertUSDToCOP(valUSD, currentTRM),
                          });
                        }}
                        className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 font-bold focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <CreatableSelect
                      label="Ubicación / Bodega"
                      value={prodForm.locationName}
                      onChange={(val) => setProdForm({ ...prodForm, locationName: val })}
                      options={catalogWarehouses}
                      moduleId="inventario"
                      catalogKey="warehouses"
                      placeholder="Seleccionar o escribir bodega..."
                    />
                  </div>
                  <div>
                    <CreatableSelect
                      label="Estante / Fila"
                      value={prodForm.shelf}
                      onChange={(val) => setProdForm({ ...prodForm, shelf: val })}
                      options={catalogShelves}
                      moduleId="inventario"
                      catalogKey="shelves"
                      placeholder="Seleccionar o escribir estante..."
                    />
                  </div>
                </div>

                {/* Especificaciones Técnicas de Ingeniería */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                  <span className="text-xs font-bold text-gray-700 uppercase block">
                    Especificaciones Técnicas & Seguridad Industrial
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 mb-1 flex items-center text-xs">Estado Físico / Materia</label>
                      <CreatableSelect
                        value={
                          prodForm.physicalState === 'liquido' ? 'Líquido' :
                          prodForm.physicalState === 'gas_vapor' ? 'Gas / Vapor' :
                          prodForm.physicalState === 'otro' ? 'Otro' :
                          'Sólido'
                        }
                        onChange={(val) => {
                          let st = 'solido';
                          if (val === 'Líquido') st = 'liquido';
                          else if (val.includes('Gas')) st = 'gas_vapor';
                          else if (val === 'Otro') st = 'otro';
                          setProdForm({ ...prodForm, physicalState: st });
                        }}
                        options={[
                          'Sólido',
                          'Líquido',
                          'Gas / Vapor',
                          'Otro',
                        ]}
                        placeholder="Estado físico..."
                        allowCustomText={false}
                        
                        inputClassName="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 mb-1 flex items-center text-xs">Fecha de Compra</label>
                      <input
                        type="date"
                        value={prodForm.purchaseDate || ''}
                        onChange={(e) => setProdForm({ ...prodForm, purchaseDate: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs focus:bg-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-gray-700 flex items-center text-xs">
                          Vigencia de Calibración
                        </label>
                        {prodForm.calibrationInfo && (
                          (() => {
                            const cal = getCalibrationStatus(prodForm.calibrationInfo);
                            return (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${cal.badgeClass}`}>
                                {cal.status === 'warning_2m'
                                  ? '🟠 < 2 meses'
                                  : cal.status === 'critical_1m' || cal.status === 'expired'
                                  ? '🔴 < 1 mes'
                                  : '🟢 Vigente'}
                              </span>
                            );
                          })()
                        )}
                      </div>
                      <input
                        type="date"
                        value={prodForm.calibrationInfo || ''}
                        onChange={(e) => setProdForm({ ...prodForm, calibrationInfo: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-gray-700 mb-1 flex items-center text-xs">Hoja de Seguridad (MSDS / Link)</label>
                      <input
                        type="text"
                        placeholder="URL de SharePoint o enlace de SDS"
                        value={prodForm.safetyDataSheetUrl || ''}
                        onChange={(e) => setProdForm({ ...prodForm, safetyDataSheetUrl: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs focus:bg-white focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-gray-700 mb-1 flex items-center text-xs">Ficha Técnica (Datasheet / Link)</label>
                      <input
                        type="text"
                        placeholder="URL o código de ficha técnica"
                        value={prodForm.technicalDataSheetUrl || ''}
                        onChange={(e) => setProdForm({ ...prodForm, technicalDataSheetUrl: e.target.value })}
                        className="w-full p-2.5 rounded-xl bg-white border border-gray-200 text-gray-800 text-xs focus:bg-white focus:outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-700 mb-1 min-h-[22px] flex items-center">Observaciones</label>
                  <textarea
                    rows={2}
                    value={prodForm.observations}
                    onChange={(e) => setProdForm({ ...prodForm, observations: e.target.value })}
                    placeholder="Detalles sobre certificados de calidad, lubricantes recomendados, etc."
                    className="w-full p-2.5 rounded-xl bg-slate-100 text-gray-800 focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Pie Fijo Siempre Visible */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-200/70 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold shadow-md cursor-pointer"
                >
                  Guardar Artículo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Configuración de Inventario */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="inventario"
        moduleTitle="Inventario & Almacén STC"
      />

      {/* Modal de Firma Biométrica Táctil para Despachos (Responsable de lo que sale) */}
      <BiometricSignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={(sig) => setSignatureData(sig)}
        title="Firma del Responsable de lo que sale"
        subtitle="Estampe de firma biométrica para custodia oficial de materiales y equipos despachados."
        defaultSignerName={users.find((u) => u.id === dispatchTechId)?.name || 'Responsable de lo que sale'}
        defaultSignerDoc={getPersonCedula(users.find((u) => u.id === dispatchTechId))}
      />

      {/* Modal de Firma Biométrica Táctil para Reingresos */}
      <BiometricSignatureModal
        isOpen={isReturnSignatureModalOpen}
        onClose={() => setIsReturnSignatureModalOpen(false)}
        onSave={(sig) => setReturnSignatureData(sig)}
        defaultSignerName={
          activeReturnRemission?.responsibleTechnicianName ||
          users.find((u) => u.id === activeReturnRemission?.responsibleTechnicianId)?.name ||
          'Receptor / Bodeguero ITK'
        }
      />

      {/* Modal de Detalle Completo de Remisión (Inspección desde Historial) */}
      {selectedRemissionForView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150 text-xs">
            {/* Cabecera */}
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-slate-100 text-[#00668F] border border-slate-200">
                  <FileText size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Remisión {selectedRemissionForView.remissionNumber}
                    </h3>
                    {selectedRemissionForView.returnRemissionNumber && (
                      <span className="text-[11px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Reingreso: {selectedRemissionForView.returnRemissionNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Proyecto: <strong>{selectedRemissionForView.projectCode}</strong> — {selectedRemissionForView.projectName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRemissionForView(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* Tarjetas Informativas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">Técnico Responsable</span>
                  <span className="font-bold text-slate-900 block truncate mt-0.5">
                    {selectedRemissionForView.responsibleTechnicianName}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">Fecha de Salida</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {selectedRemissionForView.departureDate}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">Fecha Retorno</span>
                  <span className="font-bold text-slate-900 block mt-0.5">
                    {selectedRemissionForView.actualReturnDate || selectedRemissionForView.expectedReturnDate}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 block font-medium">Costo Consumido</span>
                  <span className="font-bold font-mono text-[#00668F] block mt-0.5">
                    ${selectedRemissionForView.totalConsumedValueUSD.toLocaleString()} USD
                  </span>
                </div>
              </div>

              {/* Tabla de Artículos */}
              <div className="space-y-1.5">
                <h4 className="font-bold text-slate-900 text-xs">Artículos Despachados y Conciliación:</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                      <tr>
                        <th className="p-2.5">Artículo / SKU</th>
                        <th className="p-2.5 text-center">Despachado</th>
                        <th className="p-2.5 text-center">Retornado</th>
                        <th className="p-2.5 text-center">Consumido</th>
                        <th className="p-2.5 text-center">Estado</th>
                        <th className="p-2.5 text-right">Costo Imputado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedRemissionForView.items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50/60">
                          <td className="p-2.5">
                            <span className="font-bold text-slate-900 block">{it.name}</span>
                            <span className="text-[10px] font-mono text-slate-400 block">{it.sku}</span>
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {it.qtyDispatched} {it.unit}
                          </td>
                          <td className="p-2.5 text-center font-bold text-emerald-700">
                            {it.qtyReturned} {it.unit}
                          </td>
                          <td className="p-2.5 text-center font-bold text-amber-700">
                            {it.qtyConsumed} {it.unit}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                              {it.condition || 'Bueno'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                            ${((it.qtyConsumed || 0) * (it.unitCostUSD || 0)).toLocaleString()} USD
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Observaciones */}
              {(selectedRemissionForView.notes || selectedRemissionForView.returnNotes) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {selectedRemissionForView.notes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Notas de Despacho:</span>
                      <p className="text-slate-700 text-[11px] leading-relaxed">{selectedRemissionForView.notes}</p>
                    </div>
                  )}
                  {selectedRemissionForView.returnNotes && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Notas de Reingreso:</span>
                      <p className="text-slate-700 text-[11px] leading-relaxed">{selectedRemissionForView.returnNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Sellos de Firma Digital */}
              <div className="space-y-1.5 pt-1">
                <h4 className="font-bold text-slate-900 text-xs">Firmas Digitales Estampadas:</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Firma de Salida */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      <span>Firma de Salida / Entrega</span>
                    </span>
                    {selectedRemissionForView.recipientSignatureUrl ? (
                      <div className="space-y-1.5">
                        <img
                          src={selectedRemissionForView.recipientSignatureUrl}
                          alt="Firma Salida"
                          className="h-16 w-full max-w-[240px] object-contain bg-white rounded-lg border border-slate-200 p-1 mx-auto"
                        />
                        <div className="text-[10px] text-slate-500 text-center">
                          <div>Firmado por: <strong>{selectedRemissionForView.recipientSignerName || selectedRemissionForView.responsibleTechnicianName}</strong></div>
                          {selectedRemissionForView.recipientSignerDoc && (
                            <div>C.C. {selectedRemissionForView.recipientSignerDoc}</div>
                          )}
                          <div>Fecha: {selectedRemissionForView.recipientSignedAt || selectedRemissionForView.departureDate}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-3 text-center">
                        Sin firma digital registrada en la salida.
                      </p>
                    )}
                  </div>

                  {/* Firma de Reingreso */}
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-sky-600" />
                      <span>Firma de Reingreso / Recepción</span>
                    </span>
                    {selectedRemissionForView.returnSignatureUrl ? (
                      <div className="space-y-1.5">
                        <img
                          src={selectedRemissionForView.returnSignatureUrl}
                          alt="Firma Reingreso"
                          className="h-16 w-full max-w-[240px] object-contain bg-white rounded-lg border border-slate-200 p-1 mx-auto"
                        />
                        <div className="text-[10px] text-slate-500 text-center">
                          <div>Firmado por: <strong>{selectedRemissionForView.returnSignerName || 'Receptor Bodega'}</strong></div>
                          {selectedRemissionForView.returnSignerDoc && (
                            <div>C.C. {selectedRemissionForView.returnSignerDoc}</div>
                          )}
                          <div>Fecha: {selectedRemissionForView.returnSignedAt || selectedRemissionForView.actualReturnDate}</div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic py-3 text-center">
                        {selectedRemissionForView.status === 'en_campo'
                          ? 'Pendiente por reingreso de campo.'
                          : 'Sin firma digital registrada en el retorno.'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pie */}
            <div className="flex items-center justify-end px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedRemissionForView(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer transition-colors"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Etiqueta QR Dinámica (Cross-Docking por Proyecto) */}
      <AllocationQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        product={selectedProductForQr!}
        projectCode={projects.find((p) => p.id === dispatchProjectId)?.code || 'ITK-STC-MED'}
      />

      {/* Modal de Extracción Multimodal de BOM con LUC-IA-NA */}
      <BomExtractorModal
        isOpen={isBomModalOpen}
        onClose={() => setIsBomModalOpen(false)}
        products={products}
        onCreateRequisition={(req) => {
          createRequisition({
            projectId: dispatchProjectId || projects[0]?.id || 'PRJ-01',
            projectCode: projects.find((p) => p.id === dispatchProjectId)?.code || 'ITK-STC-MED',
            projectName: projects.find((p) => p.id === dispatchProjectId)?.name || 'Mantenimiento General STC',
            requesterId: users[0]?.id || 'USR-01',
            requesterName: users[0]?.name || 'LUC-IA-NA AI Auto-Procurement',
            department: 'Ingeniero de Confiabilidad y Almacén',
            priority: 'urgente',
            neededDate: new Date().toISOString().split('T')[0],
            notes: req.reason,
            items: req.items.map((it: any) => ({
              productId: it.sku || 'ITK-GEN',
              productSku: it.sku || 'ITK-GEN',
              productName: it.description,
              description: it.description,
              qtyRequested: it.quantity || 1,
              inStock: false,
              availableStock: 0,
              qtyToPurchase: it.quantity || 1,
              unit: it.unit || 'unid',
              unitCostUSD: it.estimatedUnitCostUSD || 50,
            })),
          });
        }}
      />

      {/* Modal de Reconocimiento Óptico de Placas Técnicas (Nameplate) */}
      <NameplateVisionModal
        isOpen={isNameplateModalOpen}
        onClose={() => setIsNameplateModalOpen(false)}
        products={products}
        equipment={equipment}
      />

      {/* MODAL BLINDADO POKA-YOKE: VACIAR INVENTARIO */}
      <ClearInventoryModal
        isOpen={isClearInventoryModalOpen}
        onClose={() => setIsClearInventoryModalOpen(false)}
        productsCount={products.length}
        onConfirmClear={handleConfirmClear}
      />

      {/* MODAL: CARGAR ARCHIVO EXCEL DE INVENTARIO */}
      <InventoryExcelUploadModal
        isOpen={isExcelUploadModalOpen}
        onClose={() => setIsExcelUploadModalOpen(false)}
        onImportProducts={handleImportProducts}
      />

      {/* MODAL DETALLE COMPLETO DEL PRODUCTO (AL CLICKEAR CUALQUIER PRODUCTO) */}
      <ProductDetailModal
        product={selectedProductForDetail}
        isOpen={!!selectedProductForDetail}
        onClose={() => setSelectedProductForDetail(null)}
        onEdit={(prod) => {
          setSelectedProductForDetail(null);
          handleOpenEditProduct(prod);
        }}
        onGenerateQr={(prod) => {
          setSelectedProductForDetail(null);
          setSelectedProductForQr(prod);
          setIsQrModalOpen(true);
        }}
        onRequestWriteOff={(prod, tramo) => {
          setSelectedProductForDetail(null);
          setProductForWriteOff(prod);
          setTramoForWriteOff(tramo || null);
          setIsWriteOffModalOpen(true);
        }}
      />

      {/* MODAL DE SOLICITUD DE BAJA POR MERMA / RETAZO / DAÑO (KARDEX TRANSACCIONAL) */}
      <InventoryWriteOffModal
        isOpen={isWriteOffModalOpen}
        onClose={() => {
          setIsWriteOffModalOpen(false);
          setProductForWriteOff(null);
          setTramoForWriteOff(null);
        }}
        product={productForWriteOff}
        tramo={tramoForWriteOff}
      />

      {/* MODAL: INGRESO AL ALMACÉN / RECEPCIÓN FÍSICA DE MERCANCÍA (ALMACENISTA) */}
      <WarehouseReceiptModal
        isOpen={isWarehouseReceiptModalOpen}
        onClose={() => setIsWarehouseReceiptModalOpen(false)}
        purchaseOrders={purchaseOrders}
        onApplyReceipt={(orderId, itemReceipts) => {
          return receivePurchaseOrderPartial(orderId, itemReceipts);
        }}
      />

      {/* MODAL BLINDADO POKA-YOKE: ELIMINAR ARTÍCULO */}
      <ConfirmDeleteModal
        isOpen={Boolean(productToDelete)}
        title="¿Eliminar Artículo del Inventario?"
        itemName={productToDelete ? `${productToDelete.sku} - ${productToDelete.name}` : ''}
        description={
          productToDelete && productToDelete.realStock > 0
            ? `¡Atención! Este artículo cuenta actualmente con ${productToDelete.realStock} ${productToDelete.unit} en stock. Si lo eliminas, se retirará del catálogo y de los balances del almacén.`
            : 'Esta acción eliminará el artículo del catálogo de repuestos e inventario de forma permanente.'
        }
        confirmText="Eliminar Artículo"
        onConfirm={() => {
          if (productToDelete) {
            deleteProduct(productToDelete.id);
            setProductToDelete(null);
          }
        }}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
};

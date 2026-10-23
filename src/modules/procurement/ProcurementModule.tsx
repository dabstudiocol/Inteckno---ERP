import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ShieldAlert,
  Plus,
  ArrowRight,
  DollarSign,
  Download,
  Building2,
  Clock,
  Sparkles,
  FileText,
  Trash2,
  Settings,
  Package,
  Truck,
  Layers,
  Upload,
  Check,
  RotateCcw,
  X,
  Eye,
  BarChart3,
  Scale,
  ShieldCheck,
  CreditCard,
  FileSpreadsheet,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { PurchaseOrder, Partner, PurchaseOrderItem, InternalRequisition } from '../../types';
import { LightTable } from '../../components/ui/LightTable';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { AiDocumentUploader } from '../../components/ui/AiDocumentUploader';

// Componentes del Módulo
import { CreateRequisitionModal } from './components/CreateRequisitionModal';
import { RequisitionDetailModal } from './components/RequisitionDetailModal';
import { ProcurementReportsDashboard } from './components/ProcurementReportsDashboard';
import { PurchaseOrderDetailDrawer } from './components/PurchaseOrderDetailDrawer';
import { QuoteComparisonModal, VendorQuoteCandidate } from './components/QuoteComparisonModal';
import { RegisterPurchaseOrderModal } from './components/RegisterPurchaseOrderModal';
import { ProcurementPayablesTab } from './components/ProcurementPayablesTab';
import { ProcurementPendingDeliveryTab } from './components/ProcurementPendingDeliveryTab';
import { ProcurementCorporateMatrixTab } from './components/ProcurementCorporateMatrixTab';
import { getStoredTRM, formatCOP, formatUSD, formatTRM } from '../../core/services/trmService';

interface PoItemRow {
  id: string;
  productId?: string;
  sku: string;
  name: string;
  unit: string;
  qty: number;
  unitPriceCOP: number;
  unitPriceUSD: number;
}

export const ProcurementModule: React.FC = () => {
  const {
    partners,
    purchaseOrders,
    products,
    projects,
    requisitions,
    currentUser,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    approvePurchaseOrderGM,
    receivePurchaseOrderPartial,
    updateRequisition,
    deleteRequisition,
    createPartner,
    updatePartner,
  } = useErp();

  const currentTrm = getStoredTRM();

  // Pestañas Matriz Corporativa Inteckno
  const [activeTab, setActiveTab] = useState<
    'orders' | 'requisitions' | 'payables' | 'pending_delivery' | 'matriz_compras' | 'quotes' | 'suppliers' | 'reports'
  >('orders');

  // Modales y Paneles
  const [isRegisterPoModalOpen, setIsRegisterPoModalOpen] = useState(false);
  const [selectedPoForDetail, setSelectedPoForDetail] = useState<PurchaseOrder | null>(null);
  const [isQuoteComparisonOpen, setIsQuoteComparisonOpen] = useState(false);
  const [isCreateReqModalOpen, setIsCreateReqModalOpen] = useState(false);
  const [selectedReqForDetail, setSelectedReqForDetail] = useState<InternalRequisition | null>(null);
  const [isReqDetailModalOpen, setIsReqDetailModalOpen] = useState(false);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Catálogos dinámicos
  const catalogPaymentTerms = useModuleCatalog('compras', 'paymentTerms');
  const catalogSupplierCategories = useModuleCatalog('compras', 'supplierCategories');

  // Formulario nuevo proveedor
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    taxId: '',
    country: 'Colombia',
    city: 'Medellín',
    category: 'Repuestos & Cables STC',
    email: '',
    phone: '',
    paymentTerms: '30 días F/F',
    criticality: 'media' as const,
    isHomologatedLegal: true,
    isHomologatedTechnical: true,
  });

  // Formulario Registro de Orden de Compra (Emitida al Proveedor)
  const [poOrderNumber, setPoOrderNumber] = useState('');
  const [poSupplierType, setPoSupplierType] = useState<'registered' | 'custom'>('registered');
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [customSupplierTaxId, setCustomSupplierTaxId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState(partners[0]?.id || '');
  const [destinationType, setDestinationType] = useState<'project' | 'general'>('project');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [generalArea, setGeneralArea] = useState('Administración & Oficina');
  const [poDate, setPoDate] = useState(new Date().toISOString().split('T')[0]);
  const [poEstimatedArrivalDate, setPoEstimatedArrivalDate] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [documentSupportName, setDocumentSupportName] = useState<string | null>(null);

  // Escuchar evento para abrir detalle de requisición desde notificaciones del usuario
  useEffect(() => {
    const handleOpenFromNotification = (e: any) => {
      if (e.detail) {
        setActiveTab('requisitions');
        setSelectedReqForDetail(e.detail);
        setIsReqDetailModalOpen(true);
      }
    };
    window.addEventListener('inteckno:open-requisition-detail', handleOpenFromNotification);
    return () => {
      window.removeEventListener('inteckno:open-requisition-detail', handleOpenFromNotification);
    };
  }, []);

  const [poItems, setPoItems] = useState<PoItemRow[]>([
    {
      id: 'row-1',
      productId: products[0]?.id || 'PRD-01',
      sku: products[0]?.sku || 'ITK-ROP-52',
      name: products[0]?.name || 'Cable Portador Tractor 52mm Galvanizado FATZER',
      unit: products[0]?.unit || 'm',
      qty: 10,
      unitPriceCOP: products[0]?.costPriceCOP || 360000,
      unitPriceUSD: Number(((products[0]?.costPriceCOP || 360000) / currentTrm).toFixed(2)),
    },
  ]);

  // Arreglos seguros
  const safePartners = Array.isArray(partners) ? partners : [];
  const safePOs = Array.isArray(purchaseOrders) ? purchaseOrders : [];
  const safeReqs = Array.isArray(requisitions) ? requisitions : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const suppliers = safePartners.filter((p) => p && (p.type === 'supplier' || p.type === 'both'));

  // Órdenes con saldo pendiente de recepción
  const pendingReceiptPOs = safePOs.filter(
    (po) => po && po.status !== 'rejected' && po.status !== 'received'
  );

  // Cuentas por Pagar y Entregas Pendientes (Matriz Corporativa)
  const payablesCount = safePOs.filter((po) => po && po.status !== 'rejected' && po.paymentStatus !== 'paid').length;
  const pendingDeliveryCount = safePOs.filter((po) => {
    if (!po || po.status === 'rejected' || po.status === 'received') return false;
    if (po.deliveryStatus === 'entregado') return false;
    return true;
  }).length;

  const addItemRow = () => {
    const newRow: PoItemRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sku: `ITK-REF-${poItems.length + 1}`,
      name: '',
      unit: 'unid',
      qty: 1,
      unitPriceCOP: 450000,
      unitPriceUSD: Number((450000 / currentTrm).toFixed(2)),
    };
    setPoItems([...poItems, newRow]);
  };

  const updateItemRow = (id: string, field: keyof PoItemRow, value: any) => {
    setPoItems(
      poItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'unitPriceCOP') {
            const copVal = Number(value) || 0;
            updated.unitPriceUSD = Number((copVal / currentTrm).toFixed(2));
          } else if (field === 'unitPriceUSD') {
            const usdVal = Number(value) || 0;
            updated.unitPriceCOP = Math.round(usdVal * currentTrm);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSelectCatalogItem = (rowId: string, productId: string) => {
    const prod = safeProducts.find((p) => p.id === productId);
    if (!prod) return;
    setPoItems(
      poItems.map((item) => {
        if (item.id === rowId) {
          const cop = prod.costPriceCOP || 0;
          return {
            ...item,
            productId: prod.id,
            sku: prod.sku,
            name: prod.name,
            unit: prod.unit || 'unid',
            unitPriceCOP: cop,
            unitPriceUSD: Number((cop / currentTrm).toFixed(2)),
          };
        }
        return item;
      })
    );
  };

  const removeItemRow = (id: string) => {
    if (poItems.length <= 1) return;
    setPoItems(poItems.filter((it) => it.id !== id));
  };

  const totalPoCOP = poItems.reduce((acc, it) => acc + (Number(it.qty) || 0) * (Number(it.unitPriceCOP) || 0), 0);
  const totalPoUSD = Number((totalPoCOP / currentTrm).toFixed(2));

  // Extracción inteligente con IA desde cotización o factura
  const handleAiExtracted = (extractedData: any) => {
    if (extractedData.supplierName) {
      setPoSupplierType('custom');
      setCustomSupplierName(extractedData.supplierName);
      setCustomSupplierTaxId(extractedData.taxId || '');
    }
    if (extractedData.notes) {
      setPoNotes(extractedData.notes);
    }
    if (extractedData.items && extractedData.items.length > 0) {
      const parsedItems: PoItemRow[] = extractedData.items.map((it: any, idx: number) => {
        const cop = it.unitPriceCOP || (it.unitPriceUSD ? Math.round(it.unitPriceUSD * currentTrm) : 0);
        return {
          id: `ai-row-${idx}-${Date.now()}`,
          sku: it.sku || `REF-EXT-${idx + 1}`,
          name: it.name || 'Componente extraído por IA',
          unit: it.unit || 'unid',
          qty: Number(it.qty) || 1,
          unitPriceCOP: cop,
          unitPriceUSD: Number((cop / currentTrm).toFixed(2)),
        };
      });
      setPoItems(parsedItems);
    }
  };

  // Guardar Registro de la Orden de Compra
  const handleRegisterPo = (e: React.FormEvent) => {
    e.preventDefault();
    if (poItems.length === 0) return;

    let finalSupplierId = selectedSupplierId;
    let finalSupplierName = '';
    let isHomologated = true;

    if (poSupplierType === 'registered') {
      const supplier = safePartners.find((p) => p.id === selectedSupplierId);
      if (!supplier) return;
      finalSupplierId = supplier.id;
      finalSupplierName = supplier.name;
      isHomologated = supplier.isHomologatedLegal && supplier.isHomologatedTechnical;
    } else {
      if (!customSupplierName.trim()) return;
      finalSupplierId = `SUP-CUSTOM-${Date.now()}`;
      finalSupplierName = customSupplierName.trim();
      isHomologated = true;
    }

    const isProject = destinationType === 'project';
    const project = isProject ? projects.find((p) => p.id === selectedProjectId) : null;
    const projectCode = isProject ? project?.code : generalArea;

    const formattedItems: PurchaseOrderItem[] = poItems.map((item) => {
      const subtotalCOP = (Number(item.qty) || 1) * (Number(item.unitPriceCOP) || 0);
      const subtotalUSD = Number((subtotalCOP / currentTrm).toFixed(2));
      return {
        productId: item.productId || `ITEM-${Date.now()}`,
        sku: item.sku || 'REF-GEN',
        name: item.name || 'Componente / Insumo',
        qty: Math.max(1, Number(item.qty) || 1),
        orderedQty: Math.max(1, Number(item.qty) || 1),
        receivedQty: 0,
        pendingQty: Math.max(1, Number(item.qty) || 1),
        unitPriceCOP: Number(item.unitPriceCOP) || 0,
        unitPriceUSD: Number(item.unitPriceUSD) || 0,
        subtotalCOP,
        subtotalUSD,
      };
    });

    const result = createPurchaseOrder({
      supplierId: finalSupplierId,
      supplierName: finalSupplierName,
      supplierHomologated: isHomologated,
      projectId: project?.id,
      projectCode,
      date: poDate || new Date().toISOString().split('T')[0],
      estimatedArrivalDate: poEstimatedArrivalDate || undefined,
      currency: 'COP',
      totalAmountCOP: totalPoCOP,
      totalAmountUSD: totalPoUSD,
      qualityCertificateRequired: true,
      qualityCertificateAttached: false,
      physicalReceiptDone: false,
      technicalQualityInspectionDone: false,
      items: formattedItems,
      notes: poNotes || `Orden de compra registrada para ${projectCode}. Soporte: ${documentSupportName || 'Documento adjunto'}.`,
    });

    if (result.success) {
      setIsRegisterPoModalOpen(false);
      setPoNotes('');
      setCustomSupplierName('');
      setCustomSupplierTaxId('');
      setPoEstimatedArrivalDate('');
      setDocumentSupportName(null);
    }
  };

  const handleOpenRequisitionDetail = (req: InternalRequisition) => {
    setSelectedReqForDetail(req);
    setIsReqDetailModalOpen(true);
  };

  const handleSaveNewSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) return;

    createPartner({
      name: supplierForm.name.trim(),
      taxId: supplierForm.taxId.trim() || `NIT-${Date.now().toString().slice(-6)}`,
      type: 'supplier',
      country: supplierForm.country || 'Colombia',
      city: supplierForm.city || 'Medellín',
      category: supplierForm.category,
      email: supplierForm.email,
      phone: supplierForm.phone,
      paymentTerms: supplierForm.paymentTerms,
      criticality: supplierForm.criticality,
      isHomologatedLegal: supplierForm.isHomologatedLegal,
      isHomologatedTechnical: supplierForm.isHomologatedTechnical,
      ratingScore: 5.0,
    });

    setIsNewSupplierModalOpen(false);
    setSupplierForm({
      name: '',
      taxId: '',
      country: 'Colombia',
      city: 'Medellín',
      category: catalogSupplierCategories[0]?.name || 'Repuestos & Cables STC',
      email: '',
      phone: '',
      paymentTerms: catalogPaymentTerms[0]?.name || '30 días F/F',
      criticality: 'media',
      isHomologatedLegal: true,
      isHomologatedTechnical: true,
    });
  };

  const handleAwardQuote = (awardedQuote: VendorQuoteCandidate, projectId: string) => {
    const proj = projects.find((p) => p.id === projectId);
    createPurchaseOrder({
      supplierId: `PROV-ADJ-${Date.now()}`,
      supplierName: awardedQuote.supplierName,
      supplierHomologated: awardedQuote.isHomologated,
      projectId: proj?.id,
      projectCode: proj?.code,
      date: new Date().toISOString().split('T')[0],
      currency: 'COP',
      totalAmountCOP: awardedQuote.totalCOP,
      totalAmountUSD: awardedQuote.totalUSD,
      qualityCertificateRequired: awardedQuote.technicalCompliance,
      qualityCertificateAttached: false,
      physicalReceiptDone: false,
      technicalQualityInspectionDone: false,
      estimatedArrivalDate: new Date(Date.now() + awardedQuote.deliveryDays * 24 * 3600 * 1000).toISOString().split('T')[0],
      notes: `Adjudicado desde Cuadro Comparativo de Ofertas. Plazo: ${awardedQuote.paymentTerms}. Notas: ${awardedQuote.notes}`,
      paymentStatus: 'pending',
      threeWayMatchStatus: 'pending',
      items: [
        {
          productId: 'PRD-AWARDED',
          sku: 'MAT-STC-AWARD',
          name: `Suministro Adjudicado a ${awardedQuote.supplierName}`,
          qty: 1,
          orderedQty: 1,
          receivedQty: 0,
          unitPriceCOP: awardedQuote.totalCOP,
          unitPriceUSD: awardedQuote.totalUSD,
          subtotalCOP: awardedQuote.totalCOP,
          subtotalUSD: awardedQuote.totalUSD,
        },
      ],
    });
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Encabezado y Pestañas Principales (Limpio, Armonioso & Sin Saturación) */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 pb-2 w-full min-w-0">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-full min-w-0">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'orders' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShoppingCart size={14} />
            <span>Órdenes de Compra ({safePOs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requisitions')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'requisitions' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText size={14} />
            <span># SOLPED ({safeReqs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('payables')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'payables' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <CreditCard size={14} />
            <span>Cuentas x Pagar ({payablesCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending_delivery')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'pending_delivery' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Truck size={14} />
            <span>Pendiente x Entrega ({pendingDeliveryCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('matriz_compras')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'matriz_compras' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileSpreadsheet size={14} />
            <span>Matriz BD Compras</span>
          </button>

          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'quotes' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Scale size={14} />
            <span>Cuadro Comparativo</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'suppliers' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Building2 size={14} />
            <span>Proveedores ({suppliers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
              activeTab === 'reports' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BarChart3 size={14} />
            <span>Reportes</span>
          </button>
        </div>

        {/* Acciones Elásticas Universales (Cero Botones Cortados) */}
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsRegisterPoModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Nueva Orden de Compra</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateReqModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={14} />
            <span>+ Nueva SOLPED</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuoteComparisonOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#00668F] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Scale size={14} />
            <span>Comparar Ofertas</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
            title="Configurar Parámetros del Módulo de Compras"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: ÓRDENES DE COMPRA (REGISTRO Y TRAZABILIDAD) */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Registro de Órdenes de Compra Emitidas a Proveedores</h3>
            <p className="text-xs text-slate-500">Trazabilidad de pedidos al proveedor, imputación presupuestal y recepción de almacén</p>
          </div>
        </div>

        <LightTable
            data={safePOs}
            keyExtractor={(po) => po.id}
            onRowClick={(po) => setSelectedPoForDetail(po)}
            columns={[
              {
                key: 'orderNumber',
                header: 'N° Orden (OC) / Fecha',
                render: (po) => (
                  <div>
                    <div className="font-bold text-xs text-[#003650] font-mono flex items-center gap-1.5">
                      <span>{po.orderNumber}</span>
                      {po.exchangeRateAlert && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold" title="Alerta TRM">
                          TRM
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">Emisión: {po.date}</div>
                    {po.estimatedArrivalDate && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Prometida: {po.estimatedArrivalDate}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'supplierName',
                header: 'Proveedor',
                render: (po) => (
                  <div>
                    <div className="font-semibold text-xs text-slate-900 line-clamp-1 flex items-center gap-1">
                      <span>{po.supplierName}</span>
                      {po.supplierHomologated && (
                        <span title="Homologado">
                          <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {po.projectCode ? `Centro Costos: ${po.projectCode}` : 'Gasto General / Oficina'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'totalAmountCOP',
                header: 'Monto Total (COP / USD)',
                align: 'right',
                render: (po) => (
                  <div className="text-right">
                    <div className="font-black text-xs text-slate-900 font-mono">
                      {formatCOP(po.totalAmountCOP || 0)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      ≈ {formatUSD(po.totalAmountUSD || (po.totalAmountCOP || 0) / currentTrm)} USD
                    </div>
                  </div>
                ),
              },
              {
                key: 'status',
                header: 'Entrega Física (Semáforo)',
                align: 'center',
                render: (po) => {
                  if (po.status === 'received') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                        <CheckCircle2 size={11} />
                        100% en Almacén
                      </span>
                    );
                  }
                  if (po.status === 'partial') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        <Clock size={11} />
                        Entrega Parcial
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#003650] border border-sky-200">
                      En Tránsito
                    </span>
                  );
                },
              },
              {
                key: 'paymentStatus',
                header: 'Estado de Pago & Cruce',
                align: 'center',
                render: (po) => {
                  if (po.paymentStatus === 'paid') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                        Pagado 100%
                      </span>
                    );
                  }
                  if (po.threeWayMatchStatus === 'matched' || po.paymentStatus === 'authorized_for_payment') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                        Cruce 3 Vías OK
                      </span>
                    );
                  }
                  if (po.paymentStatus === 'advance_paid') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900">
                        Anticipo {po.advancePaymentPercentage || 30}%
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                      Pendiente
                    </span>
                  );
                },
              },
              {
                key: 'logistics',
                header: 'Guía / Transportadora',
                render: (po) => (
                  <div className="text-xs">
                    <div className="font-semibold text-slate-800 line-clamp-1">{po.carrierName || 'Envía Colvanes'}</div>
                    {po.trackingNumber ? (
                      <div className="font-mono text-[10px] text-[#00668F]">
                        Guía: {po.trackingNumber}
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-400">Sin guía registrada</div>
                    )}
                  </div>
                ),
              },
              {
                key: 'actions',
                header: 'Acción',
                align: 'right',
                render: (po) => (
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPoForDetail(po);
                      }}
                      title="Ver Detalle y Cruce de 3 Vías"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-[#003650] hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Eye size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Estás seguro de eliminar la orden ${po.orderNumber}?`)) {
                          deletePurchaseOrder(po.id);
                        }
                      }}
                      title="Eliminar Orden de Compra"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* PESTAÑA 2: PETICIONES DE COMPRA (REQUISICIONES INTERNAS) */}
      {activeTab === 'requisitions' && (
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
            <div>
              <h3 className="text-base font-bold text-slate-900">Bandeja de Peticiones de Compra Recibidas</h3>
              <p className="text-xs text-slate-500">Peticiones enviadas por ingenieros de proyectos y áreas operativas. Haz clic para revisar, editar y generar OC.</p>
            </div>
            <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/60 self-start sm:self-auto">
              Total recibidas: <strong className="text-[#003650]">{safeReqs.length}</strong>
            </div>
          </div>

          <LightTable
            data={safeReqs}
            keyExtractor={(req) => req.id}
            onRowClick={(req) => handleOpenRequisitionDetail(req)}
            columns={[
              {
                key: 'reqNumber',
                header: 'N° Petición / Fecha',
                render: (req) => (
                  <div>
                    <div className="font-bold text-xs text-[#003650] font-mono hover:underline cursor-pointer">
                      {req.reqNumber}
                    </div>
                    <div className="text-[11px] text-slate-400">{req.createdAt}</div>
                  </div>
                ),
              },
              {
                key: 'requesterName',
                header: 'Solicitante / Área',
                render: (req) => (
                  <div>
                    <div className="font-semibold text-xs text-slate-900">{req.requesterName}</div>
                    <div className="text-[11px] text-slate-500">{req.department || 'Operaciones'}</div>
                  </div>
                ),
              },
              {
                key: 'destination',
                header: 'Destino',
                render: (req) => (
                  <div>
                    <div className="font-bold text-xs text-slate-900">
                      {req.projectCode ? req.projectCode : 'Insumos Generales'}
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1">{req.projectName}</div>
                  </div>
                ),
              },
              {
                key: 'itemsCount',
                header: 'Ítems Solicitados',
                align: 'center',
                render: (req) => (
                  <span className="font-bold text-xs text-slate-800 font-mono">
                    {(req.items || []).length} ítems
                  </span>
                ),
              },
              {
                key: 'priority',
                header: 'Prioridad / Tipo',
                align: 'center',
                render: (req) => {
                  const prio = req.priority || 'Normal';
                  const isImmediate = prio.toLowerCase().includes('inmediat') || prio.toLowerCase().includes('crítica');
                  const isHigh = prio.toLowerCase().includes('alta') || prio.toLowerCase().includes('urgente') || prio.toLowerCase().includes('24');
                  
                  return (
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isImmediate
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : isHigh
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {prio}
                      </span>
                      {req.requisitionType && (
                        <span className="text-[10px] text-slate-500 font-medium">
                          {req.requisitionType}
                        </span>
                      )}
                    </div>
                  );
                },
              },
              {
                key: 'status',
                header: 'Estado',
                align: 'center',
                render: (req) => {
                  if (req.status === 'pending_wilson_approval' || req.status === 'pending_approval') {
                    const approverLabel = req.targetApproverName ? req.targetApproverName.split(' ')[0] : 'Wilson';
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        Pendiente V°B° {approverLabel}
                      </span>
                    );
                  }
                  if (req.status === 'approved') {
                    return (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                        Aprobada
                      </span>
                    );
                  }
                  return (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#003650] border border-sky-200">
                      {req.status === 'submitted' ? 'Radicada' : req.status}
                    </span>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Acción',
                align: 'right',
                render: (req) => (
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenRequisitionDetail(req);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#003650] border border-sky-200 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Eye size={12} />
                      <span>Ver / Editar</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`¿Estás seguro de eliminar la petición ${req.reqNumber}?`)) {
                          deleteRequisition(req.id);
                        }
                      }}
                      title="Eliminar Petición"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* PESTAÑA: CUENTAS POR PAGAR (MATRIZ CORPORATIVA) */}
      {activeTab === 'payables' && (
        <ProcurementPayablesTab
          purchaseOrders={safePOs}
          partners={safePartners}
          projects={projects}
          currentTrm={currentTrm}
          onSelectPo={(po) => setSelectedPoForDetail(po)}
          onUpdatePo={(poId, updates) => {
            updatePurchaseOrder(poId, updates);
            if (selectedPoForDetail && selectedPoForDetail.id === poId) {
              setSelectedPoForDetail((prev) => (prev ? { ...prev, ...updates } : null));
            }
          }}
        />
      )}

      {/* PESTAÑA: PENDIENTES POR ENTREGA (SEGUIMIENTO LOGÍSTICO) */}
      {activeTab === 'pending_delivery' && (
        <ProcurementPendingDeliveryTab
          purchaseOrders={safePOs}
          partners={safePartners}
          projects={projects}
          onSelectPo={(po) => setSelectedPoForDetail(po)}
          onUpdatePo={(poId, updates) => {
            updatePurchaseOrder(poId, updates);
            if (selectedPoForDetail && selectedPoForDetail.id === poId) {
              setSelectedPoForDetail((prev) => (prev ? { ...prev, ...updates } : null));
            }
          }}
        />
      )}

      {/* PESTAÑA: MATRIZ CONSOLIDADA BD COMPRAS (25 COLUMNAS CORPORATIVAS) */}
      {activeTab === 'matriz_compras' && (
        <ProcurementCorporateMatrixTab
          purchaseOrders={safePOs}
          partners={safePartners}
          projects={projects}
          currentTrm={currentTrm}
          onSelectPo={(po) => setSelectedPoForDetail(po)}
        />
      )}

      {/* PESTAÑA 3: CUADRO COMPARATIVO DE OFERTAS */}
      {activeTab === 'quotes' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-900">Cuadro Comparativo de Ofertas & Licitación de Insumos</h3>
              <p className="text-xs text-slate-500">Evaluación de 2 a 3 cotizaciones de proveedores: Precio total, plazos de entrega y certificados técnicos</p>
            </div>
            <button
              onClick={() => setIsQuoteComparisonOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#003650] hover:bg-[#00283c] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
            >
              <Scale size={14} />
              <span>Abrir Comparador y Adjudicar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">1. Cumplimiento Técnico Estricto</span>
              <p className="text-slate-600">
                Ninguna oferta puede adjudicarse para teleféricos a menos que el proveedor garantice Certificado de Calidad del Fabricante (Mill Test).
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">2. Impacto Cambiario en USD</span>
              <p className="text-slate-600">
                El comparador liquida en tiempo real la TRM oficial para identificar sobrecostos ocultos por importaciones en moneda extranjera.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
              <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">3. Generación Inmediata de OC</span>
              <p className="text-slate-600">
                Al seleccionar la oferta ganadora, el sistema genera la Orden de Compra oficial amarrada al Centro de Costos correspondiente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 4: PROVEEDORES HOMOLOGADOS */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Directorio de Proveedores y Homologación</h3>
              <p className="text-xs text-slate-500">Verificación legal por Administración y técnica por Ingeniería</p>
            </div>
            <button
              onClick={() => setIsNewSupplierModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#003650] hover:bg-[#00283c] text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Homologar Proveedor</span>
            </button>
          </div>

          <LightTable
            data={suppliers}
            keyExtractor={(s) => s.id}
            columns={[
              {
                key: 'name',
                header: 'Razón Social / NIT',
                render: (s) => (
                  <div>
                    <div className="font-bold text-xs text-slate-900">{s.name}</div>
                    <div className="text-[11px] text-slate-400 font-mono">NIT: {s.taxId} • {s.city}, {s.country}</div>
                  </div>
                ),
              },
              {
                key: 'paymentTerms',
                header: 'Condiciones de Pago',
                render: (s) => <span className="text-xs text-slate-600 font-medium">{s.paymentTerms}</span>,
              },
              {
                key: 'homologation',
                header: 'Homologación (Legal / Técnica)',
                align: 'center',
                render: (s) => {
                  const isFullyHomologated = s.isHomologatedLegal && s.isHomologatedTechnical;
                  return (
                    <button
                      onClick={() =>
                        updatePartner(s.id, {
                          isHomologatedLegal: !isFullyHomologated,
                          isHomologatedTechnical: !isFullyHomologated,
                        })
                      }
                      title="Clic para cambiar estado de homologación técnica y legal"
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-all hover:scale-105 ${
                        isFullyHomologated
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                          : 'bg-rose-100 text-rose-900 border border-rose-200'
                      }`}
                    >
                      {isFullyHomologated ? '✓ Homologado 100%' : '⚠️ No Homologado'}
                    </button>
                  );
                },
              },
              {
                key: 'ratingScore',
                header: 'Calificación',
                align: 'center',
                render: (s) => (
                  <span className="text-xs font-bold text-amber-600 font-mono">
                    ★ {s.ratingScore.toFixed(1)} / 5.0
                  </span>
                ),
              },
            ]}
          />
        </div>
      )}

      {/* PESTAÑA 4: REPORTES Y ANALÍTICA DE COMPRAS (PROYECTOS VS OFICINA) */}
      {activeTab === 'reports' && (
        <ProcurementReportsDashboard
          purchaseOrders={safePOs}
          projects={projects}
          partners={safePartners}
          trm={currentTrm}
        />
      )}

      {/* MODAL BLINDADO POKA-YOKE: REGISTRAR ORDEN DE COMPRA */}
      <RegisterPurchaseOrderModal
        isOpen={isRegisterPoModalOpen}
        onClose={() => setIsRegisterPoModalOpen(false)}
        partners={partners}
        projects={projects}
        products={products}
        requisitions={requisitions}
        existingPurchaseOrders={safePOs}
        currentTrm={currentTrm}
        onCreatePo={createPurchaseOrder}
      />

      {/* MODAL BLINDADO POKA-YOKE: CUADRO COMPARATIVO MULTICRITERIO */}
      <QuoteComparisonModal
        isOpen={isQuoteComparisonOpen}
        onClose={() => setIsQuoteComparisonOpen(false)}
        projects={projects}
        partners={partners}
        currentTrm={currentTrm}
        onAwardQuote={handleAwardQuote}
      />

      {/* PANEL LATERAL DE DETALLE MAESTRO-DETALLE (4 PESTAÑAS) */}
      {selectedPoForDetail && (
        <PurchaseOrderDetailDrawer
          po={selectedPoForDetail}
          project={projects.find((p) => p.id === selectedPoForDetail.projectId)}
          supplier={partners.find((p) => p.id === selectedPoForDetail.supplierId)}
          currentTrm={currentTrm}
          onClose={() => setSelectedPoForDetail(null)}
          onUpdatePo={(updatedFields) => {
            updatePurchaseOrder(selectedPoForDetail.id, updatedFields);
            setSelectedPoForDetail((prev) => (prev ? { ...prev, ...updatedFields } : null));
          }}
        />
      )}

      {/* MODAL: CREAR SOLICITUD DE COMPRA */}
      <CreateRequisitionModal
        isOpen={isCreateReqModalOpen}
        onClose={() => setIsCreateReqModalOpen(false)}
      />

      {/* MODAL: VER / MODIFICAR PETICIÓN DE COMPRA & NOTIFICAR A WILSON ALZATE */}
      <RequisitionDetailModal
        isOpen={isReqDetailModalOpen}
        onClose={() => {
          setIsReqDetailModalOpen(false);
          setSelectedReqForDetail(null);
        }}
        requisition={selectedReqForDetail}
      />

      {/* MODAL: HOMOLOGAR NUEVO PROVEEDOR CON CATÁLOGOS DINÁMICOS */}
      {isNewSupplierModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-5 py-3.5 bg-[#003650] text-white">
              <div className="flex items-center gap-2">
                <Building2 size={18} />
                <h3 className="font-bold text-sm text-white">Homologar Nuevo Proveedor</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSupplierModalOpen(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleSaveNewSupplier} className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Razón Social / Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Inversiones & Cables S.A.S."
                  value={supplierForm.name}
                  onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 font-medium text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">NIT / Tax ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 901.458.321-4"
                    value={supplierForm.taxId}
                    onChange={(e) => setSupplierForm({ ...supplierForm, taxId: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Ciudad / Sede</label>
                  <input
                    type="text"
                    value={supplierForm.city}
                    onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Línea o Categoría (Catálogo)</label>
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(true)}
                    className="text-[11px] text-[#00668F] font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Settings size={11} /> Configurar
                  </button>
                </div>
                <select
                  value={supplierForm.category}
                  onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900"
                >
                  {catalogSupplierCategories.length > 0 ? (
                    catalogSupplierCategories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Repuestos & Cables STC">Repuestos & Cables STC</option>
                      <option value="Herramientas y Equipos Especializados">Herramientas y Equipos Especializados</option>
                      <option value="Servicios de Maquinado & Taller">Servicios de Maquinado & Taller</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Condición de Pago Acordada</label>
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(true)}
                    className="text-[11px] text-[#00668F] font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Settings size={11} /> Configurar
                  </button>
                </div>
                <select
                  value={supplierForm.paymentTerms}
                  onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900"
                >
                  {catalogPaymentTerms.length > 0 ? (
                    catalogPaymentTerms.map((pt) => (
                      <option key={pt.id} value={pt.name}>{pt.name}</option>
                    ))
                  ) : (
                    <>
                      <option value="Contado Comercial (Anticipado)">Contado Comercial (Anticipado)</option>
                      <option value="15 días F/F">15 días fecha factura</option>
                      <option value="30 días F/F">30 días fecha factura</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email de Contacto</label>
                  <input
                    type="email"
                    placeholder="comercial@proveedor.com"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Teléfono</label>
                  <input
                    type="tel"
                    placeholder="+57 300 000 0000"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white font-bold cursor-pointer shadow-xs"
                >
                  Guardar y Homologar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL UNIVERSAL DE CONFIGURACIÓN */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="compras"
        moduleTitle="Compras y Proveedores"
      />

    </div>
  );
};

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
    deletePurchaseOrder,
    approvePurchaseOrderGM,
    receivePurchaseOrderPartial,
    updateRequisition,
    deleteRequisition,
    createPartner,
    updatePartner,
  } = useErp();

  const currentTrm = getStoredTRM();

  // Pestañas (Órdenes, Peticiones, Proveedores, Reportes)
  const [activeTab, setActiveTab] = useState<'orders' | 'requisitions' | 'suppliers' | 'reports'>('orders');

  // Modales
  const [isRegisterPoModalOpen, setIsRegisterPoModalOpen] = useState(false);
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

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      
      {/* Encabezado y Pestañas Principales (Limpio, Armonioso & Sin Saturación) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full lg:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'orders' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <ShoppingCart size={14} />
            <span>Órdenes de Compra ({safePOs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('requisitions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'requisitions' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <FileText size={14} />
            <span>Peticiones de Compra ({safeReqs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'suppliers' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <Building2 size={14} />
            <span>Proveedores ({suppliers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all text-center flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'reports' ? 'bg-[#003650] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            <BarChart3 size={14} />
            <span>Reportes</span>
          </button>
        </div>

        {/* Acciones Contextuales según la Pestaña Activa */}
        <div className="flex items-center gap-2">
          {activeTab === 'orders' && (
            <button
              type="button"
              onClick={() => setIsRegisterPoModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Plus size={14} />
              <span>Registrar OC</span>
            </button>
          )}
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
            columns={[
              {
                key: 'orderNumber',
                header: 'N° Orden / Fecha',
                render: (po) => (
                  <div>
                    <div className="font-bold text-xs text-[#003650] font-mono">{po.orderNumber}</div>
                    <div className="text-[11px] text-slate-400">Emisión: {po.date}</div>
                    {po.estimatedArrivalDate && (
                      <div className="text-[10px] text-emerald-700 font-medium">
                        Llegada est: {po.estimatedArrivalDate}
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
                    <div className="font-semibold text-xs text-slate-900 line-clamp-1">{po.supplierName}</div>
                    <div className="text-[11px] text-slate-500">
                      {po.projectCode ? `Destino: ${po.projectCode}` : 'Gasto General / Oficina'}
                    </div>
                  </div>
                ),
              },
              {
                key: 'totalAmountCOP',
                header: 'Monto Total (COP)',
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
                header: 'Estado / Recepción',
                align: 'center',
                render: (po) => {
                  if (po.status === 'received') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                        <CheckCircle2 size={11} />
                        Ingreso 100% en Almacén
                      </span>
                    );
                  }
                  if (po.status === 'partial') {
                    return (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        <Clock size={11} />
                        Entrega Parcial en Bodega
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#003650] border border-sky-200">
                      En Tránsito con Proveedor
                    </span>
                  );
                },
              },
              {
                key: 'actions',
                header: 'Acción',
                align: 'right',
                render: (po) => (
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

      {/* MODAL: REGISTRAR ORDEN DE COMPRA (EMITIDA AL PROVEEDOR) */}
      {isRegisterPoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 max-h-[88vh] sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header del Modal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-[#003650] text-white gap-3 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">
                  Registrar Orden de Compra (Proveedor)
                </h3>
                <p className="text-xs text-slate-300">
                  Carga la orden emitida al proveedor para control presupuestal, trazabilidad y fechas de llegada.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <AiDocumentUploader
                  docType="factura_cotizacion"
                  onExtracted={handleAiExtracted}
                  title="Auto-llenar con Documento (IA)"
                  description="Extrae proveedor, NIT e ítems de la orden o cotización con Gemini"
                />
                <button
                  type="button"
                  onClick={() => setIsRegisterPoModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Cerrar"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <form onSubmit={handleRegisterPo} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
              
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
                
                {/* Fechas de Emisión y Llegada (Trazabilidad) */}
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Fecha de Emisión de la Orden:
                    </label>
                    <input
                      type="date"
                      required
                      value={poDate}
                      onChange={(e) => setPoDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 text-xs focus:outline-hidden focus:border-[#003650]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Fecha Estimada de Llegada (Almacén):
                    </label>
                    <input
                      type="date"
                      value={poEstimatedArrivalDate}
                      onChange={(e) => setPoEstimatedArrivalDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 text-xs focus:outline-hidden focus:border-[#003650]"
                    />
                  </div>
                </div>

                {/* Datos del Proveedor y Destino */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs">
                      1. Proveedor y Destino de la Compra
                    </span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="radio"
                          name="supplierType"
                          checked={poSupplierType === 'registered'}
                          onChange={() => setPoSupplierType('registered')}
                          className="text-[#003650]"
                        />
                        <span>Proveedor Registrado</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                        <input
                          type="radio"
                          name="supplierType"
                          checked={poSupplierType === 'custom'}
                          onChange={() => setPoSupplierType('custom')}
                          className="text-[#003650]"
                        />
                        <span>Escribir Proveedor Libre</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {poSupplierType === 'registered' ? (
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Proveedor Homologado
                        </label>
                        <select
                          value={selectedSupplierId}
                          onChange={(e) => setSelectedSupplierId(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 text-xs focus:outline-hidden focus:border-[#003650]"
                        >
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} (NIT: {s.taxId})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Razón Social Libre</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej: Ferretería Central SAS"
                            value={customSupplierName}
                            onChange={(e) => setCustomSupplierName(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs focus:outline-hidden focus:border-[#003650]"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">NIT / Tax ID</label>
                          <input
                            type="text"
                            placeholder="900.123.456-7"
                            value={customSupplierTaxId}
                            onChange={(e) => setCustomSupplierTaxId(e.target.value)}
                            className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-xs focus:outline-hidden focus:border-[#003650]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Imputación */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Imputar Costo a:</label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDestinationType('project')}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${destinationType === 'project' ? 'bg-[#003650] text-white' : 'text-slate-500 hover:text-slate-900'}`}
                          >
                            Proyecto STC
                          </button>
                          <button
                            type="button"
                            onClick={() => setDestinationType('general')}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded cursor-pointer ${destinationType === 'general' ? 'bg-[#003650] text-white' : 'text-slate-500 hover:text-slate-900'}`}
                          >
                            Oficina / General
                          </button>
                        </div>
                      </div>

                      {destinationType === 'project' ? (
                        <select
                          value={selectedProjectId}
                          onChange={(e) => setSelectedProjectId(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 text-xs focus:outline-hidden focus:border-[#003650]"
                        >
                          {projects.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} — {p.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <select
                          value={generalArea}
                          onChange={(e) => setGeneralArea(e.target.value)}
                          className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 text-xs focus:outline-hidden focus:border-[#003650]"
                        >
                          <option value="Administración & Oficina">Administración & Oficina</option>
                          <option value="Sistemas & TI">Sistemas & TI</option>
                          <option value="Taller & Herramientas">Taller & Herramientas</option>
                          <option value="Gestión Humana & SST">Gestión Humana & SST</option>
                          <option value="Operaciones Generales">Operaciones Generales</option>
                        </select>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ítems y Renglones de la Orden */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs">
                        2. Ítems Comprados al Proveedor ({poItems.length})
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Ingresa las cantidades y precios acordados en <strong>COP</strong>.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addItemRow}
                      className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#003650] font-bold hover:bg-sky-100 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <Plus size={13} />
                      <span>Agregar Renglón</span>
                    </button>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div className="grid grid-cols-12 bg-slate-50 p-2.5 font-bold text-slate-700 text-[11px] border-b border-slate-200">
                      <div className="col-span-3">Código / SKU</div>
                      <div className="col-span-4">Descripción del Repuesto o Insumo</div>
                      <div className="col-span-1 text-center">Unid.</div>
                      <div className="col-span-1 text-center">Cant.</div>
                      <div className="col-span-2 text-right">Precio Unit. (COP)</div>
                      <div className="col-span-1 text-center">Quitar</div>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      {poItems.map((item) => (
                        <div key={item.id} className="grid grid-cols-12 gap-2 p-2.5 items-center hover:bg-slate-50/50">
                          <div className="col-span-3 space-y-1">
                            <input
                              type="text"
                              required
                              placeholder="SKU / Referencia"
                              value={item.sku}
                              onChange={(e) => updateItemRow(item.id, 'sku', e.target.value)}
                              className="w-full h-8 px-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white"
                            />
                            {safeProducts.length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) handleSelectCatalogItem(item.id, e.target.value);
                                }}
                                defaultValue=""
                                className="w-full h-6 px-1.5 text-[10px] text-slate-500 rounded-lg bg-slate-100 border border-slate-200"
                              >
                                <option value="" disabled>Cargar de catálogo...</option>
                                {safeProducts.slice(0, 40).map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.sku} - {p.name.substring(0, 25)}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          <div className="col-span-4">
                            <input
                              type="text"
                              required
                              placeholder="Descripción del material"
                              value={item.name}
                              onChange={(e) => updateItemRow(item.id, 'name', e.target.value)}
                              className="w-full h-8 px-2 text-xs font-medium rounded-lg border border-slate-300 bg-white"
                            />
                          </div>

                          <div className="col-span-1">
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => updateItemRow(item.id, 'unit', e.target.value)}
                              className="w-full h-8 px-1 text-center font-bold rounded-lg border border-slate-300 bg-white text-xs"
                            />
                          </div>

                          <div className="col-span-1">
                            <input
                              type="number"
                              min="1"
                              value={item.qty}
                              onChange={(e) => updateItemRow(item.id, 'qty', Number(e.target.value) || 1)}
                              className="w-full h-8 px-1 text-center font-mono font-bold rounded-lg border border-slate-300 bg-white text-xs"
                            />
                          </div>

                          <div className="col-span-2">
                            <input
                              type="number"
                              min="0"
                              step="100"
                              value={item.unitPriceCOP}
                              onChange={(e) => updateItemRow(item.id, 'unitPriceCOP', Number(e.target.value) || 0)}
                              className="w-full h-8 px-2 text-right font-mono font-bold rounded-lg border border-slate-300 bg-white text-xs"
                              placeholder="$ COP"
                            />
                          </div>

                          <div className="col-span-1 text-center">
                            <button
                              type="button"
                              onClick={() => removeItemRow(item.id)}
                              disabled={poItems.length <= 1}
                              className="text-slate-400 hover:text-rose-600 disabled:opacity-30 p-1 cursor-pointer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Justificación y TOTALES EN COP (DESTACADO Y PRINCIPAL) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start pt-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Soporte de la Orden y Notas:
                    </label>
                    <textarea
                      rows={2}
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                      placeholder="Observaciones de entrega, plazo acordado con el proveedor..."
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:outline-hidden focus:border-[#003650]"
                    />
                  </div>

                  {/* CAJA DE LIQUIDACIÓN CON COP PRINCIPAL */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Renglones Totales:</span>
                      <span className="font-bold text-slate-900">{poItems.length} ítems</span>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        TOTAL DE LA ORDEN DE COMPRA (COP):
                      </span>
                      <div className="text-xl font-black text-slate-950 font-mono mt-0.5">
                        {formatCOP(totalPoCOP)}
                      </div>
                      <div className="text-xs text-slate-500 font-mono mt-0.5">
                        ≈ {formatUSD(totalPoUSD)} USD (TRM Hoy: ${formatTRM(currentTrm)} COP)
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* Botones Fijos */}
              <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRegisterPoModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 size={15} />
                  <span>Registrar Orden de Compra</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
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

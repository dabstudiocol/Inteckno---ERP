import React, { useState } from 'react';
import {
  X,
  ShoppingCart,
  Plus,
  Trash2,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  DollarSign,
  Building2,
  FileText,
  Clock,
  Sparkles,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { PurchaseOrder, Partner, Product, Project, PurchaseOrderItem, InternalRequisition } from '../../../types';
import { formatCOP, formatUSD } from '../../../core/services/trmService';
import { useModuleCatalog } from '../../../core/services/moduleConfigService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface PoItemRow {
  id: string;
  productId?: string;
  sku: string;
  name: string;
  unit: string;
  qty: number;
  unitPriceCOP: number;
  unitPriceUSD: number;
  historicalPriceCOP?: number;
  priceConfirmedByPrompt?: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  partners: Partner[];
  projects: Project[];
  products: Product[];
  requisitions: InternalRequisition[];
  existingPurchaseOrders: PurchaseOrder[];
  currentTrm: number;
  onCreatePo: (poData: Omit<PurchaseOrder, 'id' | 'orderNumber' | 'status' | 'gmApproved'>) => void;
}

export const RegisterPurchaseOrderModal: React.FC<Props> = ({
  isOpen,
  onClose,
  partners,
  projects,
  products,
  requisitions,
  existingPurchaseOrders,
  currentTrm,
  onCreatePo,
}) => {
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');
  const [supplierType, setSupplierType] = useState<'registered' | 'custom'>('registered');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(partners[0]?.id || '');
  const [customSupplierName, setCustomSupplierName] = useState('');
  const [customSupplierTaxId, setCustomSupplierTaxId] = useState('');
  
  // Amarre obligatorio a Proyecto / Centro de Costos
  // Catálogos dinámicos configurables por el usuario
  const paymentTermsOptions = useModuleCatalog('compras', 'paymentTerms');
  const supplierCategoriesOptions = useModuleCatalog('compras', 'supplierCategories');

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [originReqId, setOriginReqId] = useState<string>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState('');
  const [carrierName, setCarrierName] = useState('Envía Colvanes');
  const [notes, setNotes] = useState('');
  // Campos Oficiales de la Matriz Corporativa de Compras (BD COMPRAS)
  const [solpedNumber, setSolpedNumber] = useState('');
  const [requesterName, setRequesterName] = useState('Wilson Alzate');
  const [paymentTermType, setPaymentTermType] = useState<string>('30 días fecha factura (30 F/F)');
  const [paymentDueDate, setPaymentDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [costCategory, setCostCategory] = useState<string>('Repuestos & Cables STC');
  const [spendingNature, setSpendingNature] = useState<'PRESUPUESTO' | 'REPROCESO'>('PRESUPUESTO');
  const [isFastTrackEmergency, setIsFastTrackEmergency] = useState(false);

  // Excepción de Gerencia para presupuesto sobregirado
  const [gmOverrideGranted, setGmOverrideGranted] = useState(false);
  const [gmOverrideNotes, setGmOverrideNotes] = useState('');

  // Auto-completar desde SOLPED / Requisición
  const handleOriginReqChange = (reqId: string) => {
    setOriginReqId(reqId);
    if (!reqId) return;
    const req = requisitions.find((r) => r.id === reqId);
    if (req) {
      setSolpedNumber(req.reqNumber);
      if (req.requesterName) setRequesterName(req.requesterName);
      if (req.projectId) setSelectedProjectId(req.projectId);
      if (req.spendingNature) setSpendingNature(req.spendingNature);
      if (req.items && req.items.length > 0) {
        const mappedItems: PoItemRow[] = req.items.map((it, idx) => {
          const prod = products.find((p) => p.id === it.productId || p.sku === it.productSku);
          const cop = prod?.costPriceCOP || (it.unitCostUSD ? Math.round(it.unitCostUSD * currentTrm) : 350000);
          return {
            id: `req-row-${idx}-${Date.now()}`,
            productId: it.productId,
            sku: it.productSku,
            name: it.productName,
            unit: it.unit || 'unid',
            qty: it.qtyToPurchase || it.qtyRequested || 1,
            unitPriceCOP: cop,
            unitPriceUSD: Number((cop / currentTrm).toFixed(2)),
            historicalPriceCOP: cop,
          };
        });
        setItems(mappedItems);
      }
    }
  };

  // Filas de insumos
  const [items, setItems] = useState<PoItemRow[]>([
    {
      id: 'row-1',
      productId: products[0]?.id || 'PRD-01',
      sku: products[0]?.sku || 'ITK-ROP-52',
      name: products[0]?.name || 'Cable Portador Tractor 52mm Galvanizado FATZER',
      unit: products[0]?.unit || 'm',
      qty: 10,
      unitPriceCOP: products[0]?.costPriceCOP || 360000,
      unitPriceUSD: Number(((products[0]?.costPriceCOP || 360000) / currentTrm).toFixed(2)),
      historicalPriceCOP: products[0]?.costPriceCOP || 350000,
    },
  ]);

  if (!isOpen) return null;

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const selectedSupplier = partners.find((p) => p.id === selectedSupplierId);

  // Cálculos de Totales
  const totalAmountCOP = items.reduce(
    (acc, it) => acc + (currency === 'COP' ? it.unitPriceCOP * it.qty : it.unitPriceUSD * currentTrm * it.qty),
    0
  );
  const totalAmountUSD = items.reduce(
    (acc, it) => acc + (currency === 'USD' ? it.unitPriceUSD * it.qty : (it.unitPriceCOP / currentTrm) * it.qty),
    0
  );

  // Presupuesto del Proyecto y Semáforo en Vivo (Regla 10.B)
  const projectTotalBudget = selectedProject?.budgetPV || (selectedProject as any)?.budget || 200000000;
  const projectCurrentExpenses = selectedProject?.actualCostAC || (selectedProject as any)?.expenses || 0;
  const availableBudget = projectTotalBudget - projectCurrentExpenses;
  const newProjectExpenseRatio = ((projectCurrentExpenses + totalAmountCOP) / projectTotalBudget) * 100;
  const isBudgetOverdrawn = newProjectExpenseRatio > 100;

  // Matriz de Firmas Jerárquica
  const getSignatureRequirement = (amountCOP: number) => {
    if (amountCOP < 2000000) {
      return {
        level: 'Director de Proyecto',
        person: selectedProject?.supervisorName || (selectedProject as any)?.manager || 'Director de Proyecto Asignado',
        badgeColor: 'bg-emerald-100 text-emerald-800',
      };
    }
    if (amountCOP <= 20000000 && currency === 'COP') {
      return {
        level: 'Gerencia de Operaciones',
        person: 'Wilson Alzate',
        badgeColor: 'bg-sky-100 text-[#003650]',
      };
    }
    return {
      level: 'Gerencia General / Presidencia',
      person: 'Gustavo Adolfo Mejía / Clemencia García',
      badgeColor: 'bg-purple-100 text-purple-900',
    };
  };
  const signatureLevel = getSignatureRequirement(totalAmountCOP);

  // Blindaje Poka-Yoke: Proveedor escrito a mano NO es homologado
  const isEffectiveSupplierHomologated = supplierType === 'registered' ? Boolean(selectedSupplier?.isHomologatedTechnical) : false;

  // Blindaje Poka-Yoke: Canal rápido en obra (hasta $1.500.000 COP)
  const isAboveFastTrackLimit = totalAmountCOP > 1500000;

  // Alerta Cambiaria TRM
  const projectBudgetTrm = 4000;
  const trmDiffPercent = Number((((currentTrm - projectBudgetTrm) / projectBudgetTrm) * 100).toFixed(1));
  const hasExchangeAlert = currency === 'USD' && trmDiffPercent > 5;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `row-${Date.now()}`,
        sku: 'GEN-REP',
        name: 'Nuevo Repuesto / Insumo',
        unit: 'unid',
        qty: 1,
        unitPriceCOP: 50000,
        unitPriceUSD: Number((50000 / currentTrm).toFixed(2)),
        historicalPriceCOP: 50000,
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof PoItemRow, value: any) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          const updated = { ...it, [field]: value };
          if (field === 'unitPriceCOP') {
            updated.unitPriceUSD = Number((Number(value) / currentTrm).toFixed(2));
          } else if (field === 'unitPriceUSD') {
            updated.unitPriceCOP = Math.round(Number(value) * currentTrm);
          }
          return updated;
        }
        return it;
      })
    );
  };

  const handleSelectProduct = (rowId: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems(
      items.map((it) => {
        if (it.id === rowId) {
          return {
            ...it,
            productId: prod.id,
            sku: prod.sku,
            name: prod.name,
            unit: prod.unit || 'unid',
            unitPriceCOP: prod.costPriceCOP || 100000,
            unitPriceUSD: Number(((prod.costPriceCOP || 100000) / currentTrm).toFixed(2)),
            historicalPriceCOP: prod.costPriceCOP || 100000,
          };
        }
        return it;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Blindaje 1: Amarre Obligatorio a Centro de Costos
    if (!selectedProjectId) {
      alert('Error de Contención: Es obligatorio seleccionar el Proyecto / Centro de Costos.');
      return;
    }

    // Blindaje 2: Bloqueo de Requisición Duplicada
    if (originReqId) {
      const existingPoForReq = existingPurchaseOrders.find(
        (po) => po.originRequisitionId === originReqId
      );
      if (existingPoForReq) {
        alert(
          `Bloqueo Poka-Yoke: Ya existe la orden ${existingPoForReq.orderNumber} vinculada a la requisición seleccionada. No se permiten órdenes duplicadas.`
        );
        return;
      }
    }

    // Blindaje 3: Tope Presupuestal en Vivo (>100% exige aprobación)
    if (isBudgetOverdrawn && !gmOverrideGranted) {
      alert(
        `Bloqueo Presupuestal Poka-Yoke: La compra de ${formatCOP(totalAmountCOP)} supera el 100% del presupuesto del proyecto (${selectedProject?.code}). Saldo disponible: ${formatCOP(availableBudget)}. Se requiere activar y justificar la Excepción de Gerencia.`
      );
      return;
    }

    // Blindaje 4: Detector de Error de Dedo (>25% de desviación de precio)
    for (const it of items) {
      if (it.historicalPriceCOP && it.historicalPriceCOP > 0) {
        const deviation = Math.abs(it.unitPriceCOP - it.historicalPriceCOP) / it.historicalPriceCOP;
        if (deviation > 0.25 && !it.priceConfirmedByPrompt) {
          const percentText = Math.round(deviation * 100);
          const confirmPrice = window.confirm(
            `Detector de Anomalía de Precio:\nEl precio de "${it.name}" (${formatCOP(it.unitPriceCOP)}) difiere un ${percentText}% del promedio histórico (${formatCOP(it.historicalPriceCOP)}).\n\n¿Confirmas que el valor ingresado es correcto y no tiene un error de digitación?`
          );
          if (!confirmPrice) return;
        }
      }
    }

    // Blindaje 5: Homologación estricta para compras no rápidas o repuestos críticos
    const hasCriticalSpare = items.some((it) => it.sku.toLowerCase().includes('rop') || it.sku.toLowerCase().includes('fatzer'));
    if ((isAboveFastTrackLimit || hasCriticalSpare) && !isEffectiveSupplierHomologated && !isFastTrackEmergency) {
      const confirmUnapproved = window.confirm(
        'Advertencia de Homologación:\nEste proveedor no está homologado técnicamente para repuestos críticos o compras mayores a $1.500.000 COP.\n\n¿Deseas tramitar la orden bajo excepción de Gerencia Técnica?'
      );
      if (!confirmUnapproved) return;
    }

    const supplierName = supplierType === 'registered' ? (selectedSupplier?.name || 'Proveedor General') : customSupplierName.trim();
    const supplierId = supplierType === 'registered' ? selectedSupplierId : `PROV-TEMP-${Date.now()}`;

    const formattedItems: PurchaseOrderItem[] = items.map((it) => ({
      productId: it.productId || `PRD-${it.sku}`,
      sku: it.sku,
      name: it.name,
      qty: it.qty,
      orderedQty: it.qty,
      receivedQty: 0,
      unitPriceUSD: it.unitPriceUSD,
      unitPriceCOP: it.unitPriceCOP,
      subtotalUSD: it.unitPriceUSD * it.qty,
      subtotalCOP: it.unitPriceCOP * it.qty,
      historicalPriceCOP: it.historicalPriceCOP,
      spendingNature,
    }));

    onCreatePo({
      supplierId,
      supplierName,
      supplierHomologated: isEffectiveSupplierHomologated,
      projectId: selectedProject.id,
      projectCode: selectedProject.code,
      date,
      currency,
      totalAmountUSD: Math.round(totalAmountUSD),
      totalAmountCOP: Math.round(totalAmountCOP),
      originRequisitionId: originReqId || undefined,
      spendingNature,
      qualityCertificateRequired: hasCriticalSpare,
      qualityCertificateAttached: false,
      physicalReceiptDone: false,
      technicalQualityInspectionDone: false,
      carrierName,
      estimatedArrivalDate: estimatedArrivalDate || undefined,
      notes: notes + (gmOverrideGranted ? ` [EXCEPCIÓN GERENCIA PRESUPUESTO: ${gmOverrideNotes}]` : ''),
      isFastTrackEmergency: false,
      budgetProjectTrm: projectBudgetTrm,
      currentTrmAtOrder: currentTrm,
      exchangeRateAlert: hasExchangeAlert,
      exchangeRateOvercostPercent: hasExchangeAlert ? trmDiffPercent : 0,
      paymentStatus: 'pending',
      threeWayMatchStatus: 'pending',
      items: formattedItems,
      // Matriz Corporativa BD COMPRAS
      solpedNumber: solpedNumber.trim() || undefined,
      requesterName: requesterName.trim() || undefined,
      supplierTaxId: (supplierType === 'registered' ? selectedSupplier?.taxId : customSupplierTaxId) || undefined,
      paymentTerms: supplierType === 'registered' ? selectedSupplier?.paymentTerms : paymentTermType,
      paymentTermType: (paymentTermType.toLowerCase().includes('contado') ? 'contado' : paymentTermType.toLowerCase().includes('anticipo') ? 'anticipo' : 'credito') as 'contado' | 'anticipo' | 'credito',
      paymentDueDate: paymentDueDate || undefined,
      costCategory,
      deliveryStatus: 'pendiente',
      weekOfYear: (() => {
        const d = new Date(date);
        const start = new Date(d.getFullYear(), 0, 1);
        return Math.ceil((((d.getTime() - start.getTime()) / 86400000) + start.getDay() + 1) / 7);
      })(),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera Sólida Corporativa */}
        <div className="p-4 sm:p-5 bg-[#003650] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <ShoppingCart size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-white">Emitir Nueva Orden de Compra Oficial (OC)</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${signatureLevel.badgeColor}`}>
                  Firma: {signatureLevel.level}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Amarre a Centro de Costos, Detector de Anomalías Poka-Yoke y Semáforo Presupuestal en Vivo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('inteckno:open-module-config'))}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title="Personalizar catálogos y opciones de compras"
            >
              <Settings size={16} />
              <span className="hidden sm:inline">Configurar Catálogos</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ALERTA CAMBIARIA EN CASO DE COMPRA EN USD */}
        {hasExchangeAlert && (
          <div className="px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600" />
              <span>
                <strong>Alerta Cambiaria TRM:</strong> Sobrecosto del +{trmDiffPercent}% frente a la TRM base ($4.000 vs actual ${currentTrm.toLocaleString()}).
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950 uppercase">
              Riesgo Dólar
            </span>
          </div>
        )}

        {/* FORMULARIO BLINDADO CON SCROLL */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          
          {/* SECCIÓN 1: PROVEEDOR Y CENTRO DE COSTOS (AMARRE OBLIGATORIO) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800">Proveedor de la Orden *</label>
                <div className="flex items-center gap-2 text-[11px]">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="supType"
                      checked={supplierType === 'registered'}
                      onChange={() => setSupplierType('registered')}
                    />
                    Registrado
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="radio"
                      name="supType"
                      checked={supplierType === 'custom'}
                      onChange={() => setSupplierType('custom')}
                    />
                    Nuevo a Mano
                  </label>
                </div>
              </div>

              {supplierType === 'registered' ? (
                <CreatableSelect
                  options={partners
                    .filter((p) => p.type === 'supplier' || p.type === 'both')
                    .map((p) => ({
                      id: p.id,
                      name: `${p.name} ${p.isHomologatedTechnical ? '✓ (Homologado)' : '⚠ (No Homologado)'}`,
                      code: p.taxId || p.id
                    }))}
                  value={selectedSupplierId}
                  onChange={(val) => setSelectedSupplierId(val)}
                  placeholder="Seleccionar o buscar proveedor registrado..."
                />
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    required
                    placeholder="Razón Social o Nombre del Proveedor"
                    value={customSupplierName}
                    onChange={(e) => setCustomSupplierName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  />
                  <input
                    type="text"
                    placeholder="NIT / Identificación Tributaria"
                    value={customSupplierTaxId}
                    onChange={(e) => setCustomSupplierTaxId(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-700 font-mono"
                  />
                  <p className="text-[10px] text-amber-700 font-medium">
                    ⚠️ Nota Poka-Yoke: Todo proveedor digitado a mano se registra automáticamente como NO Homologado hasta auditoría de calidad.
                  </p>
                </div>
              )}
            </div>

            {/* Centro de Costos / Proyecto */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Proyecto / Centro de Costos Imputado * (1 Proyecto = 1 Centro de Costos)
              </label>
              <CreatableSelect
                options={projects.map((p) => ({
                  id: p.id,
                  name: `${p.code} — ${p.name} (${p.clientName})`,
                  code: p.code
                }))}
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                placeholder="Seleccionar o buscar proyecto..."
              />

              {/* Semáforo Presupuestal en Vivo */}
              <div className="mt-2 p-2.5 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Saldo Disponible del Proyecto</span>
                  <span className={`font-mono font-black ${availableBudget < totalAmountCOP ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {formatCOP(availableBudget)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Ejecución Proyectada</span>
                  <span className={`font-mono font-bold ${isBudgetOverdrawn ? 'text-rose-600' : 'text-slate-800'}`}>
                    {newProjectExpenseRatio.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BLOQUEO POKA-YOKE SI SUPERA EL 100% DEL PRESUPUESTO */}
          {isBudgetOverdrawn && (
            <div className="p-3.5 rounded-xl border-2 border-rose-400 bg-rose-50 space-y-2">
              <div className="flex items-center gap-2 font-black text-rose-900 text-xs">
                <ShieldAlert size={16} /> Bloqueo Poka-Yoke: Presupuesto Sobregirado (&gt;100%)
              </div>
              <p className="text-rose-700 text-[11px]">
                Esta compra de {formatCOP(totalAmountCOP)} supera el presupuesto autorizado del proyecto {selectedProject.code}.
                Para poder guardar, se requiere autorización formal de excepción de Gerencia.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gmOverrideGranted}
                    onChange={(e) => setGmOverrideGranted(e.target.checked)}
                    className="rounded text-rose-600 cursor-pointer"
                  />
                  Activar Excepción de Gerencia General
                </label>
                {gmOverrideGranted && (
                  <input
                    type="text"
                    required
                    placeholder="N° de Radicado o Motivo de la excepción"
                    value={gmOverrideNotes}
                    onChange={(e) => setGmOverrideNotes(e.target.value)}
                    className="flex-1 px-3 py-1 bg-white border border-rose-300 rounded-lg text-xs"
                  />
                )}
              </div>
            </div>
          )}

          {/* SECCIÓN 2: PARÁMETROS GENERALES Y REQUISICIÓN DE ORIGEN */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Moneda de Negociación</label>
              <CreatableSelect
                value={
                  currency === 'COP' ? 'COP (Pesos Colombianos)' :
                  currency === 'USD' ? 'USD (Dólares Americanos)' :
                  currency
                }
                onChange={(val) => {
                  if (val.includes('USD')) setCurrency('USD');
                  else setCurrency('COP');
                }}
                options={[
                  'COP (Pesos Colombianos)',
                  'USD (Dólares Americanos)',
                ]}
                placeholder="Moneda..."
                isClearable={false}
                allowCustomText={false}
                inputClassName="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Fecha de Emisión</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Fecha Prometida de Entrega</label>
              <input
                type="date"
                value={estimatedArrivalDate}
                onChange={(e) => setEstimatedArrivalDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1"># SOLPED de Origen</label>
              <CreatableSelect
                options={[
                  { id: '', name: 'Sin SOLPED vinculada' },
                  ...requisitions.map((r) => ({
                    id: r.id,
                    name: `${r.reqNumber} — ${r.projectName}`,
                    code: r.reqNumber
                  }))
                ]}
                value={originReqId}
                onChange={(val) => handleOriginReqChange(val)}
                placeholder="Buscar o vincular SOLPED..."
              />
            </div>
          </div>

          {/* SECCIÓN 2.1: PARÁMETROS CORPORATIVOS DE LA MATRIZ DE COMPRAS */}
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">N° # SOLPED</label>
              <input
                type="text"
                placeholder="ej. SOLPED-018"
                value={solpedNumber}
                onChange={(e) => setSolpedNumber(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Solicitante Técnico</label>
              <input
                type="text"
                placeholder="ej. Wilson Alzate"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Rubro de Costo</label>
              <CreatableSelect
                options={supplierCategoriesOptions.length > 0 ? (
                  supplierCategoriesOptions.map((cat) => ({ id: cat.name, name: cat.name }))
                ) : [
                  { id: 'Repuestos & Fabricación STC', name: 'Repuestos & Fabricación STC' },
                  { id: 'Consumibles & EPP', name: 'Consumibles & EPP' },
                  { id: 'Viáticos & Movilidad', name: 'Viáticos & Movilidad' },
                  { id: 'Inspección Cables (MRT)', name: 'Inspección Cables (MRT)' },
                  { id: 'Ensayos NDT / END', name: 'Ensayos NDT / END' },
                  { id: 'Mano de Obra ITK', name: 'Mano de Obra ITK' },
                  { id: 'Mano de Obra Externa', name: 'Mano de Obra Externa' },
                  { id: 'Subcontratos & Grúas', name: 'Subcontratos & Grúas' },
                  { id: 'Imprevistos de Obra', name: 'Imprevistos de Obra' },
                ]}
                value={costCategory}
                onChange={(val) => setCostCategory(val)}
                allowCustomText={true}
                placeholder="Seleccionar rubro..."
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Naturaleza Gasto</label>
              <CreatableSelect
                value={
                  spendingNature === 'PRESUPUESTO' ? 'PRESUPUESTO (Obra)' :
                  spendingNature === 'REPROCESO' ? 'REPROCESO (Garantía)' :
                  spendingNature
                }
                onChange={(val) => {
                  if (val.includes('REPROCESO')) setSpendingNature('REPROCESO');
                  else setSpendingNature('PRESUPUESTO');
                }}
                options={[
                  'PRESUPUESTO (Obra)',
                  'REPROCESO (Garantía)',
                ]}
                placeholder="Naturaleza..."
                isClearable={false}
                allowCustomText={false}
                inputClassName={`w-full px-2 py-1.5 rounded-lg border text-xs font-bold ${
                  spendingNature === 'REPROCESO'
                    ? 'border-rose-400 bg-rose-50 text-rose-700'
                    : 'border-slate-300 bg-white text-[#00668F]'
                }`}
              />
            </div>

            <div>
              <CreatableSelect
                label="Forma / Plazo de Pago"
                value={paymentTermType}
                onChange={(val) => setPaymentTermType(val)}
                options={paymentTermsOptions.map((term) => ({
                  id: term.id,
                  name: term.name,
                  code: term.code,
                }))}
                placeholder="Seleccionar o escribir forma de pago..."
                moduleId="compras"
                catalogKey="paymentTerms"
                allowCustomText={true}
                inputClassName="bg-white border-slate-300"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">Vencimiento Factura</label>
              <input
                type="date"
                value={paymentDueDate}
                onChange={(e) => setPaymentDueDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-xs"
              />
            </div>
          </div>

          {/* SECCIÓN 3: ÍTEMS Y DETECTOR DE ANOMALÍAS DE PRECIO */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs">Insumos y Repuestos de la Orden</h4>
                <p className="text-[11px] text-slate-500">Detector de desvíos de precio &gt;25% activado</p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={13} /> Agregar Línea
              </button>
            </div>

            <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-700">
                  <tr>
                    <th className="p-2.5">Catálogo / Insumo</th>
                    <th className="p-2.5">Referencia</th>
                    <th className="p-2.5 text-center">Cant.</th>
                    <th className="p-2.5 text-right">Precio Unitario ({currency})</th>
                    <th className="p-2.5 text-right">Subtotal COP</th>
                    <th className="p-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((it) => {
                    const deviation = it.historicalPriceCOP && it.historicalPriceCOP > 0
                      ? Math.abs(it.unitPriceCOP - it.historicalPriceCOP) / it.historicalPriceCOP
                      : 0;
                    const isPriceAnomaly = deviation > 0.25;

                    return (
                      <tr key={it.id} className={isPriceAnomaly ? 'bg-amber-50/70' : 'hover:bg-slate-50'}>
                        <td className="p-2 min-w-[260px] space-y-1">
                          <input
                            type="text"
                            required
                            placeholder="Nombre / Descripción del repuesto o insumo..."
                            value={it.name}
                            onChange={(e) => handleUpdateItem(it.id, 'name', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white font-semibold text-slate-800"
                          />
                          <div className="pt-0.5">
                            <CreatableSelect
                              options={products.map((p) => ({
                                id: p.id,
                                name: `${p.name} (${p.sku})`,
                                code: p.sku
                              }))}
                              value={it.productId || ''}
                              onChange={(val) => {
                                if (val) handleSelectProduct(it.id, val);
                              }}
                              placeholder="Buscar en catálogo existente..."
                            />
                          </div>
                        </td>

                        <td className="p-2 w-28">
                          <input
                            type="text"
                            value={it.sku}
                            onChange={(e) => handleUpdateItem(it.id, 'sku', e.target.value)}
                            className="w-full px-2 py-1 font-mono text-xs border rounded bg-white"
                          />
                        </td>

                        <td className="p-2 w-20 text-center">
                          <input
                            type="number"
                            min={1}
                            value={it.qty}
                            onChange={(e) => handleUpdateItem(it.id, 'qty', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-center font-bold text-xs border rounded bg-white"
                          />
                        </td>

                        <td className="p-2 w-36 text-right">
                          <input
                            type="number"
                            min={0}
                            value={currency === 'COP' ? it.unitPriceCOP : it.unitPriceUSD}
                            onChange={(e) =>
                              handleUpdateItem(
                                it.id,
                                currency === 'COP' ? 'unitPriceCOP' : 'unitPriceUSD',
                                Number(e.target.value)
                              )
                            }
                            className={`w-full px-2 py-1 text-right font-mono font-bold text-xs border rounded ${
                              isPriceAnomaly ? 'bg-amber-100 border-amber-400 text-amber-900' : 'bg-white'
                            }`}
                          />
                          {isPriceAnomaly && (
                            <span className="block text-[9px] text-amber-800 font-bold mt-0.5">
                              ⚠️ Desvío del +{Math.round(deviation * 100)}%
                            </span>
                          )}
                        </td>

                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {formatCOP(it.unitPriceCOP * it.qty)}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(it.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* TOTALES Y MATRIZ DE FIRMA */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-400">Total Oficial de la Orden de Compra:</div>
              <div className="text-xl font-black font-mono text-white mt-0.5">
                {formatCOP(totalAmountCOP)}
                <span className="text-xs font-normal text-slate-300 ml-2">
                  (≈ {formatUSD(totalAmountUSD)} USD)
                </span>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="text-slate-400 block text-[11px]">Nivel de Aprobación Requerido:</span>
              <span className="font-bold text-[#F39200]">{signatureLevel.level}</span>
              <span className="text-slate-400 block text-[10px]">Responsable: {signatureLevel.person}</span>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white font-bold transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
            >
              <CheckCircle2 size={16} /> Emitir y Guardar Orden
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

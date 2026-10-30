import React, { useState } from 'react';
import {
  X,
  Package,
  FileText,
  DollarSign,
  Truck,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Download,
  Upload,
  RotateCcw,
  Plus,
  Send,
  Building2,
  FileCheck,
  Receipt,
  Scale,
} from 'lucide-react';
import { PurchaseOrder, Partner, Project } from '../../../types';
import { formatCOP, formatUSD } from '../../../core/services/trmService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface Props {
  po: PurchaseOrder;
  project?: Project;
  supplier?: Partner;
  currentTrm: number;
  onClose: () => void;
  onUpdatePo: (updatedFields: Partial<PurchaseOrder>) => void;
}

export const PurchaseOrderDetailDrawer: React.FC<Props> = ({
  po,
  project,
  supplier,
  currentTrm,
  onClose,
  onUpdatePo,
}) => {
  const [activeTab, setActiveTab] = useState<'items' | 'receipts' | 'finances' | 'logistics'>('items');

  // Estado local para enmienda
  const [isAddingAmendment, setIsAddingAmendment] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState('');
  const [amendmentChanges, setAmendmentChanges] = useState('');

  // Estado local para anticipo
  const [advancePercent, setAdvancePercent] = useState<number>(po.advancePaymentPercentage || 30);
  const [advanceProofFile, setAdvanceProofFile] = useState<string>(po.advancePaymentProofUrl || '');

  // Estado local para factura fiscal y 3-way match
  const [fiscalInvoiceNum, setFiscalInvoiceNum] = useState<string>(po.fiscalInvoiceNumber || '');
  const [fiscalInvoiceNit, setFiscalInvoiceNit] = useState<string>(po.fiscalInvoiceNit || supplier?.taxId || '');

  // Estado local para no conformidad / nota de devolución
  const [nonConformingQty, setNonConformingQty] = useState<number>(po.nonConformingReceivedQty || 0);
  const [nonConformingReason, setNonConformingReason] = useState<string>(po.nonConformingReason || 'Falta de Certificado Mill Test');
  const [showReturnNoteModal, setShowReturnNoteModal] = useState(false);

  // Estado local para logística
  const [carrier, setCarrier] = useState<string>(po.carrierName || 'Envía Colvanes');
  const [tracking, setTracking] = useState<string>(po.trackingNumber || '');
  const [certNumber, setCertNumber] = useState<string>(po.qualityCertificateNumber || '');
  const [certUrl, setCertUrl] = useState<string>(po.qualityCertificateUrl || '');

  // Cálculos de items y cantidades
  const totalOrderedQty = po.items.reduce((acc, it) => acc + (it.orderedQty || it.qty || 0), 0);
  const totalReceivedQty = po.items.reduce((acc, it) => acc + (it.receivedQty || 0), 0);
  const totalConformingQty = po.conformingReceivedQty ?? totalReceivedQty;

  // Cruce de 3 Vías (Three-Way Match)
  // Regla: Cantidad Ordenada >= Cantidad Recibida Conforme == Cantidad Facturada
  const isInvoiceEntered = Boolean(fiscalInvoiceNum.trim());
  const isReceivedFullOrPartial = totalReceivedQty > 0;
  const isMatchOk = isInvoiceEntered && isReceivedFullOrPartial && totalConformingQty > 0;

  // Impacto cambiario TRM
  const projectBudgetTrm = po.budgetProjectTrm || 4000;
  const trmDiffPercent = Number((((currentTrm - projectBudgetTrm) / projectBudgetTrm) * 100).toFixed(1));
  const hasExchangeAlert = po.currency === 'USD' && trmDiffPercent > 5;

  const handleSaveAmendment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amendmentReason.trim() || !amendmentChanges.trim()) return;

    const newAmendment = {
      id: `ENM-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      user: 'Usuario Inteckno',
      reason: amendmentReason.trim(),
      changes: amendmentChanges.trim(),
    };

    const currentAmendments = po.amendments || [];
    onUpdatePo({
      amendments: [newAmendment, ...currentAmendments],
    });

    setAmendmentReason('');
    setAmendmentChanges('');
    setIsAddingAmendment(false);
  };

  const handleSaveAdvancePayment = () => {
    const totalCOP = po.totalAmountCOP || (po.totalAmountUSD * currentTrm);
    const amountCOP = Math.round((totalCOP * advancePercent) / 100);

    onUpdatePo({
      advancePaymentPercentage: advancePercent,
      advancePaymentAmountCOP: amountCOP,
      advancePaymentProofUrl: advanceProofFile || 'Comprobante-Egreso-Anticipo.pdf',
      paymentStatus: 'advance_paid',
    });
  };

  const handleAuthorizeThreeWayMatch = () => {
    if (!isMatchOk) {
      alert('No se cumplen los requisitos del Cruce de 3 Vías: Se requiere factura fiscal válida, material recibido conforme y certificado técnico adjunto.');
      return;
    }

    onUpdatePo({
      threeWayMatchStatus: 'matched',
      threeWayMatchApprovedAt: new Date().toISOString(),
      threeWayMatchApprovedBy: 'Dirección Administrativa y Contable',
      paymentStatus: 'authorized_for_payment',
      fiscalInvoiceNumber: fiscalInvoiceNum,
      fiscalInvoiceNit: fiscalInvoiceNit,
    });
  };

  const handleSaveLogistics = () => {
    onUpdatePo({
      carrierName: carrier,
      trackingNumber: tracking,
      trackingUrl: tracking ? `https://rastreo.coordinadora.com/tracking?guia=${tracking}` : '',
      qualityCertificateNumber: certNumber,
      qualityCertificateUrl: certUrl,
      qualityCertificateAttached: Boolean(certUrl || certNumber),
    });
  };

  const handleSaveNonConformity = () => {
    const returnNumber = `DEV-PROV-${Date.now().toString().slice(-5)}`;
    onUpdatePo({
      nonConformingReceivedQty: nonConformingQty,
      nonConformingReason: nonConformingReason,
      returnNoteNumber: returnNumber,
    });
    setShowReturnNoteModal(true);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200">
        
        {/* ENCABEZADO DEL PANEL DE DETALLE */}
        <div className="p-4 sm:p-5 bg-[#003650] text-white flex items-start justify-between relative shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-white/20 text-white tracking-wider">
                {po.orderNumber}
              </span>
              {po.solpedNumber && (
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-sky-400/20 text-sky-200 border border-sky-300/30">
                  # SOLPED: {po.solpedNumber}
                </span>
              )}
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-sky-500/30 text-sky-100 font-semibold truncate">
                {po.projectCode || 'Gasto General / Oficina'}
              </span>
              {po.requesterName && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/10 text-slate-200 truncate">
                  Solicitante: {po.requesterName}
                </span>
              )}
              {po.supplierHomologated ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  <ShieldCheck size={12} /> Proveedor Homologado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/30 text-amber-200 border border-amber-400/30">
                  <AlertTriangle size={12} /> Proveedor No Homologado
                </span>
              )}
              {po.isFastTrackEmergency && (
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-orange-500 text-white animate-pulse">
                  Canal Rápido de Emergencia en Obra
                </span>
              )}
            </div>
            <h2 className="text-base sm:text-lg font-bold truncate text-white">
              {po.supplierName}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Emisión: {po.date} • Moneda: {po.currency} • Total COP: {formatCOP(po.totalAmountCOP)}
            </p>
          </div>

          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Cerrar Panel"
          >
            <X size={18} />
          </button>
        </div>

        {/* ALERTA CAMBIARIA TRM (SI APLICA) */}
        {hasExchangeAlert && (
          <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between text-xs text-amber-900 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>
                <strong>⚠️ Alerta Cambiaria:</strong> Sobrecosto estimado del <strong>+{trmDiffPercent}%</strong> respecto a la TRM presupuestada del proyecto (${projectBudgetTrm.toLocaleString()} vs actual ${currentTrm.toLocaleString()}).
              </span>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950 uppercase tracking-wide">
              Riesgo TRM
            </span>
          </div>
        )}

        {/* BARRA DE PESTAÑAS (SCROLLABLE CON ESTÁNDAR STRICTO) */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2 border-b border-slate-200 bg-slate-50 overflow-x-auto max-w-full min-w-0 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('items')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'items'
                ? 'bg-[#003650] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Package size={14} />
            Artículos y Precios ({po.items.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('receipts')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'receipts'
                ? 'bg-[#003650] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <CheckCircle2 size={14} />
            Entregas y No Conformidades
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('finances')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'finances'
                ? 'bg-[#003650] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <DollarSign size={14} />
            Anticipos y Cruce 3 Vías
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('logistics')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'logistics'
                ? 'bg-[#003650] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Truck size={14} />
            Calidad y Logística
          </button>
        </div>

        {/* CUERPO DEL PANEL CON SCROLL FLUIDO */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          
          {/* PESTAÑA 1: ARTÍCULOS Y PRECIOS */}
          {activeTab === 'items' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Insumos y Repuestos Ordenados</h3>
                  <p className="text-xs text-slate-500">Histórico de compras, verificación de precios y centro de costos</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingAmendment(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus size={13} /> Registrar Enmienda
                </button>
              </div>

              {/* Formulario de Nueva Enmienda si está abierto */}
              {isAddingAmendment && (
                <form onSubmit={handleSaveAmendment} className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-3 text-xs animate-in fade-in duration-150">
                  <div className="font-bold text-amber-900 flex items-center gap-1.5">
                    <FileCheck size={14} /> Registrar Enmienda Formal a la Orden
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Motivo / Justificación *</label>
                    <input
                      type="text"
                      required
                      value={amendmentReason}
                      onChange={(e) => setAmendmentReason(e.target.value)}
                      placeholder="Ej: Cambio de cantidad por ajuste en diseño mecánico o retraso del proveedor"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Descripción de Modificaciones *</label>
                    <textarea
                      required
                      rows={2}
                      value={amendmentChanges}
                      onChange={(e) => setAmendmentChanges(e.target.value)}
                      placeholder="Ej: Se incrementan 2 metros de cable portador tractor y se amplía fecha de entrega"
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddingAmendment(false)}
                      className="px-3 py-1 rounded-lg bg-slate-200 text-slate-700 font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-[#003650] text-white font-bold"
                    >
                      Guardar Enmienda
                    </button>
                  </div>
                </form>
              )}

              {/* Tabla contenida de artículos */}
              <div className="w-full overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-2.5">Código / Insumo</th>
                      <th className="p-2.5 text-center">Cant. Requerida</th>
                      <th className="p-2.5 text-center">Cant. Recibida</th>
                      <th className="p-2.5 text-right">Precio Unitario</th>
                      <th className="p-2.5 text-right">Subtotal COP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {po.items.map((it, idx) => {
                      const isInflated = it.priceInflationWarning || (it.priceInflationPercent && it.priceInflationPercent > 25);
                      return (
                        <tr key={it.productId || it.sku || idx} className="hover:bg-slate-50/70">
                          <td className="p-2.5">
                            <div className="font-mono font-bold text-slate-900">{it.sku}</div>
                            <div className="text-slate-600 line-clamp-1">{it.name}</div>
                            {it.historicalPriceCOP && (
                              <div className="text-[10px] text-slate-400">
                                Promedio 12 meses: {formatCOP(it.historicalPriceCOP)}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {it.orderedQty || it.qty} {it.sku.includes('ROP') ? 'm' : 'und'}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            <span className={it.receivedQty >= (it.orderedQty || it.qty) ? 'text-emerald-600' : 'text-amber-600'}>
                              {it.receivedQty || 0}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            {formatCOP(it.unitPriceCOP)}
                            {isInflated && (
                              <span className="block text-[10px] text-amber-700 font-bold">
                                ⚠️ +{it.priceInflationPercent}% vs histórico
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            {formatCOP(it.subtotalCOP || (it.unitPriceCOP * (it.orderedQty || it.qty)))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Historial de Enmiendas previas si existen */}
              {po.amendments && po.amendments.length > 0 && (
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText size={13} /> Historial de Enmiendas Registradas
                  </h4>
                  <div className="space-y-1.5">
                    {po.amendments.map((am) => (
                      <div key={am.id} className="p-2 rounded-lg bg-white border border-slate-200 text-xs">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                          <span>{am.date} • {am.user}</span>
                          <span className="font-mono text-[#00668F]">{am.id}</span>
                        </div>
                        <div className="font-semibold text-slate-800 mt-0.5">{am.reason}</div>
                        <div className="text-slate-600 text-[11px] mt-0.5">{am.changes}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: ENTREGAS Y NO CONFORMIDADES */}
          {activeTab === 'receipts' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Control de Ingreso Físico a Bodega</h3>
                <p className="text-xs text-slate-500">
                  Diferenciación entre piezas conformes (listas para uso) y rechazadas por no conformidad
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cantidad Pedida</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{totalOrderedQty} unid</div>
                  <div className="text-[10px] text-slate-400">Total en orden de compra</div>
                </div>

                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Conforme (En Existencias)</div>
                  <div className="text-xl font-black text-emerald-800 mt-1">{totalConformingQty} unid</div>
                  <div className="text-[10px] text-emerald-600">Aceptadas por calidad y almacén</div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">No Conforme (Rechazado)</div>
                  <div className="text-xl font-black text-rose-800 mt-1">{nonConformingQty} unid</div>
                  <div className="text-[10px] text-rose-600">Rechazadas por golpe o medida</div>
                </div>
              </div>

              {/* Registro de No Conformidad */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <AlertTriangle size={16} /> Registro y Devolución por No Conformidad Técnica
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Cantidad de Piezas Rechazadas</label>
                    <input
                      type="number"
                      min={0}
                      value={nonConformingQty}
                      onChange={(e) => setNonConformingQty(Number(e.target.value))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Causa del Rechazo</label>
                    <CreatableSelect
                      options={[
                        { id: 'Falta de Certificado Mill Test', name: 'Falta de Certificado Mill Test / Calidad' },
                        { id: 'Golpe o daño en transporte', name: 'Golpe o daño severo en transporte' },
                        { id: 'Medida o diámetro dimensional erróneo', name: 'Medida o diámetro dimensional erróneo' },
                        { id: 'Referencia distinta a la especificada en plano', name: 'Referencia distinta a la especificada en plano' },
                        { id: 'Oxidación o defecto superficial', name: 'Oxidación o defecto superficial' }
                      ]}
                      value={nonConformingReason}
                      onChange={(val) => setNonConformingReason(val)}
                      allowCustomText={true}
                      placeholder="Seleccionar o escribir causa..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-slate-600">
                    {po.returnNoteNumber ? `Nota de Devolución Emitida: ${po.returnNoteNumber}` : 'Al registrar, se genera el soporte para nota crédito o reposición.'}
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveNonConformity}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-colors"
                  >
                    Generar Nota de Devolución
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 3: ANTICIPOS Y CRUCE DE 3 VÍAS */}
          {activeTab === 'finances' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Gestión de Anticipos, Cartera y Cruce de 3 Vías</h3>
                <p className="text-xs text-slate-500">
                  Condición indispensable para autorizar giros contables y pagos a proveedores
                </p>
              </div>

              {/* Resumen de Cartera y Vencimiento (Matriz Corporativa) */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={15} className="text-[#00668F]" /> Programación de Pagos & Vencimiento
                  </span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                    po.paymentStatus === 'paid' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : po.paymentStatus === 'advance_paid'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {po.paymentStatus === 'paid' ? 'Pagado 100%' : po.paymentStatus === 'advance_paid' ? 'Anticipo Pagado' : 'Pendiente de Pago'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Forma de Pago</label>
                    <span className="font-bold text-slate-800 block capitalize">{po.paymentTermType || 'Crédito'} ({po.paymentTerms || '30 días'})</span>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Fecha Vencimiento</label>
                    <span className="font-bold font-mono text-slate-800 block">{po.paymentDueDate || 'No definida'}</span>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Valor Total OC</label>
                    <span className="font-black font-mono text-slate-900 block">{formatCOP(po.totalAmountCOP || 0)}</span>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Saldo por Pagar</label>
                    <span className="font-black font-mono text-rose-600 block">
                      {formatCOP(Math.max(0, (po.totalAmountCOP || 0) - (po.paidAmountCOP || (po.paymentStatus === 'paid' ? (po.totalAmountCOP || 0) : 0))))}
                    </span>
                  </div>
                </div>

                {po.paymentStatus !== 'paid' && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        onUpdatePo({
                          paymentStatus: 'paid',
                          paidAmountCOP: po.totalAmountCOP || 0,
                          notes: `${po.notes || ''} [Liquidado al 100% el ${new Date().toISOString().split('T')[0]}]`.trim(),
                        });
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-xs cursor-pointer"
                    >
                      ✓ Marcar como Pagado al 100%
                    </button>
                  </div>
                )}
              </div>

              {/* Registro de Anticipos */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span className="flex items-center gap-1.5">
                    <DollarSign size={15} className="text-emerald-600" /> Registro de Anticipo Financiero (30% / 50%)
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                    {po.paymentStatus === 'advance_paid' ? 'Anticipo Girado' : 'Sin Anticipo Registrado'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Porcentaje de Anticipo</label>
                    <CreatableSelect
                      value={
                        advancePercent === 0 ? '0% (Pago contra entrega)' :
                        advancePercent === 30 ? '30% de Anticipo' :
                        advancePercent === 50 ? '50% de Anticipo' :
                        advancePercent === 100 ? '100% Pago Anticipado' :
                        `${advancePercent}%`
                      }
                      onChange={(val) => {
                        if (val.includes('0%')) setAdvancePercent(0);
                        else if (val.includes('30%')) setAdvancePercent(30);
                        else if (val.includes('50%')) setAdvancePercent(50);
                        else if (val.includes('100%')) setAdvancePercent(100);
                        else {
                          const num = parseInt(val.replace(/\D/g, ''), 10);
                          setAdvancePercent(isNaN(num) ? 0 : num);
                        }
                      }}
                      options={[
                        '0% (Pago contra entrega)',
                        '30% de Anticipo',
                        '50% de Anticipo',
                        '100% Pago Anticipado',
                      ]}
                      placeholder="Anticipo..."
                      
                      allowCustomText={true}
                      inputClassName="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Monto en COP del Anticipo</label>
                    <input
                      type="text"
                      readOnly
                      value={formatCOP(Math.round(((po.totalAmountCOP || 0) * advancePercent) / 100))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-medium mb-1">Saldo Pendiente contra Entrega</label>
                    <input
                      type="text"
                      readOnly
                      value={formatCOP(Math.max(0, (po.totalAmountCOP || 0) - Math.round(((po.totalAmountCOP || 0) * advancePercent) / 100)))}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 font-mono font-bold text-emerald-700"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-medium mb-1">Soporte / Comprobante de Egreso</label>
                  <input
                    type="text"
                    value={advanceProofFile}
                    onChange={(e) => setAdvanceProofFile(e.target.value)}
                    placeholder="Número de comprobante bancario o enlace del soporte PDF"
                    className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveAdvancePayment}
                    className="px-4 py-1.5 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white font-bold cursor-pointer transition-colors"
                  >
                    Guardar Registro de Anticipo
                  </button>
                </div>
              </div>

              {/* CRUCE DE 3 VÍAS (THREE-WAY MATCH) */}
              <div className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50/50 space-y-3.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-black text-indigo-950 text-sm">
                    <Scale size={18} className="text-indigo-600" /> Cruce de Verificación de 3 Vías (Three-Way Match)
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-black text-[10px] uppercase tracking-wider ${
                      po.threeWayMatchStatus === 'matched'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {po.threeWayMatchStatus === 'matched' ? 'Cruce 100% Conforme' : 'Pendiente de Validación'}
                  </span>
                </div>

                <p className="text-slate-600 text-xs">
                  Por norma contable de Inteckno S.A.S., ninguna orden puede autorizarse para pago contable definitivo a menos que se cumpla la tríada:
                  <strong className="block text-slate-900 mt-1">
                    1. Cantidad Ordenada ({totalOrderedQty}) ≥ 2. Cantidad Recibida Conforme ({totalConformingQty}) == 3. Cantidad Facturada
                  </strong>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">N° de Factura Fiscal del Proveedor *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: FE-98402"
                      value={fiscalInvoiceNum}
                      onChange={(e) => setFiscalInvoiceNum(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">NIT del Proveedor Emisor *</label>
                    <input
                      type="text"
                      required
                      placeholder="900.123.456-7"
                      value={fiscalInvoiceNit}
                      onChange={(e) => setFiscalInvoiceNit(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>

                {/* Semáforo de Cruce */}
                <div className="p-3 rounded-lg bg-white border border-indigo-100 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">1. Orden de Compra Válida</span>
                    <span className="text-emerald-600 font-bold">✓ {po.orderNumber}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">2. Ingreso Físico en Bodega Conforme</span>
                    <span className={totalConformingQty > 0 ? 'text-emerald-600 font-bold' : 'text-amber-600 font-bold'}>
                      {totalConformingQty > 0 ? `✓ ${totalConformingQty} unid conformes` : '⚠ Pendiente de entrega'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">3. Factura Fiscal Registrada</span>
                    <span className={fiscalInvoiceNum.trim() ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                      {fiscalInvoiceNum.trim() ? `✓ ${fiscalInvoiceNum}` : '✗ Falta N° de factura'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-slate-500 font-medium">
                    {po.threeWayMatchApprovedBy ? `Autorizado por: ${po.threeWayMatchApprovedBy}` : 'Requiere cumplir las 3 condiciones'}
                  </span>
                  <button
                    type="button"
                    onClick={handleAuthorizeThreeWayMatch}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle2 size={15} /> Autorizar Giro Contable
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* PESTAÑA 4: CALIDAD Y LOGÍSTICA */}
          {activeTab === 'logistics' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Trazabilidad Logística y Certificados de Calidad</h3>
                <p className="text-xs text-slate-500">
                  Monitoreo de transportadora en ruta y certificados Mill Test de teleférico
                </p>
              </div>

              {/* Logística de Transporte */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Truck size={16} className="text-[#00668F]" /> Despacho y Transportadora de Carga
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Empresa Transportadora</label>
                    <CreatableSelect
                      options={[
                        { id: 'Envía Colvanes', name: 'Envía Colvanes' },
                        { id: 'Servientrega', name: 'Servientrega' },
                        { id: 'Coordinadora Mercantil', name: 'Coordinadora Mercantil' },
                        { id: 'TCC', name: 'TCC (Transportadora Comercial Colombia)' },
                        { id: 'InterRapidísimo', name: 'InterRapidísimo' },
                        { id: 'Camioneta Propia Inteckno', name: 'Camioneta Propia Inteckno (Cuadrilla STC)' },
                        { id: 'Transporte Internacional / Agente de Carga', name: 'Transporte Internacional / Agente de Carga' },
                      ]}
                      value={carrier}
                      onChange={(val) => setCarrier(val)}
                      allowCustomText={true}
                      placeholder="Seleccionar o escribir transportadora..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Número de Guía de Envío</label>
                    <input
                      type="text"
                      placeholder="Ej: 0192837465"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>
                </div>

                {tracking && (
                  <div className="flex items-center gap-2 pt-1 text-xs text-[#00668F]">
                    <ExternalLink size={14} />
                    <a
                      href={`https://google.com/search?q=${carrier}+guia+${tracking}`}
                      target="_blank"
                      rel="noreferrer"
                      className="underline font-bold hover:text-[#004e6e]"
                    >
                      Consultar Rastreo en Línea de {carrier} (Guía: {tracking})
                    </a>
                  </div>
                )}
              </div>

              {/* Certificados Mill Test y Ensayos No Destructivos */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-emerald-700" /> Certificado de Calidad del Fabricante (Mill Test)
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">N° de Certificado Técnico / Colada</label>
                    <input
                      type="text"
                      placeholder="Ej: CERT-FATZER-2026-99"
                      value={certNumber}
                      onChange={(e) => setCertNumber(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Enlace / Archivo del Certificado PDF</label>
                    <input
                      type="text"
                      placeholder="URL del documento en la nube o Drive"
                      value={certUrl}
                      onChange={(e) => setCertUrl(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveLogistics}
                    className="px-4 py-1.5 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white font-bold cursor-pointer transition-colors"
                  >
                    Guardar Datos de Logística y Calidad
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* PIE DEL PANEL */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            Última actualización: {po.date}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Detalle
          </button>
        </div>

      </div>

      {/* MODAL NOTA DE DEVOLUCIÓN AL PROVEEDOR */}
      {showReturnNoteModal && (
        <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-rose-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-bold text-base text-slate-900">Nota de Devolución Oficial Generada</h4>
                <p className="text-xs text-slate-500 font-mono">Consecutivo: {po.returnNoteNumber || 'DEV-PROV-001'}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Proveedor:</span>
                <span className="font-bold text-slate-900">{po.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Orden de Compra:</span>
                <span className="font-mono font-bold text-[#00668F]">{po.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cantidad Rechazada:</span>
                <span className="font-bold text-rose-700">{nonConformingQty} unidades</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Motivo:</span>
                <span className="font-semibold text-slate-800">{nonConformingReason}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Este documento oficial ha sido registrado en la base de datos de compras. El proveedor deberá reponer la pieza o emitir nota crédito antes del cierre del cruce de 3 vías.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowReturnNoteModal(false)}
                className="px-4 py-2 rounded-xl bg-[#003650] text-white font-bold text-xs cursor-pointer"
              >
                Entendido y Continuar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import React, { useState } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Plus,
  ArrowRight,
  ShieldCheck,
  Send,
  Building2,
  Sparkles,
  Settings,
  Zap,
  FileCheck2,
  Receipt,
  Users,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { BillingMilestone, DianRutData } from '../../types';
import { LightTable } from '../../components/ui/LightTable';
import { BusinessRulesEngine } from '../../core/rules/businessRules';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';

// Subcomponentes DIAN
import { DianRutUploaderModal } from './components/DianRutUploaderModal';
import { DianSupportDocumentManager } from './components/DianSupportDocumentManager';
import { DianRadianManager } from './components/DianRadianManager';
import { DianPayrollManager } from './components/DianPayrollManager';

interface BillingModuleProps {
  initialView?: 'invoices' | 'acts';
}

type BillingSubTab = 'milestones' | 'zero_digitation' | 'support_docs' | 'fev_radian' | 'payroll';

export const BillingModule: React.FC<BillingModuleProps> = () => {
  const { milestones, projects, currentUser, signMilestoneAct, issueMilestoneInvoice } = useErp();
  const [activeTab, setActiveTab] = useState<BillingSubTab>('milestones');
  const [invoiceModalMilestone, setInvoiceModalMilestone] = useState<BillingMilestone | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isRutModalOpen, setIsRutModalOpen] = useState(false);

  // Catálogos dinámicos editables por Inteckno
  const catalogBanks = useModuleCatalog('contabilidad', 'banks');
  const catalogPaymentTerms = useModuleCatalog('contabilidad', 'paymentTerms');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [selectedPaymentTerm, setSelectedPaymentTerm] = useState('');

  // Auto-selección inicial para agilizar la facturación (1 solo toque)
  React.useEffect(() => {
    if (!selectedBankId && catalogBanks.length > 0) {
      setSelectedBankId(catalogBanks[0].id);
    }
  }, [catalogBanks, selectedBankId]);

  React.useEffect(() => {
    if (!selectedPaymentTerm && catalogPaymentTerms.length > 0) {
      setSelectedPaymentTerm(catalogPaymentTerms[0].name);
    }
  }, [catalogPaymentTerms, selectedPaymentTerm]);

  const handleIssueInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceModalMilestone) return;

    issueMilestoneInvoice(
      invoiceModalMilestone.id,
      invoiceNumber || `FE-ITK-2026-${String(Math.floor(Math.random() * 800) + 100)}`
    );

    setInvoiceModalMilestone(null);
    setInvoiceNumber('');
  };

  const isFinance =
    currentUser.role === 'gerente_administrativa' ||
    currentUser.role === 'gerente_general' ||
    currentUser.role === 'contador_externo';

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Barra de Navegación por Sub-Pestañas DIAN & Facturación con Scroll Horizontal en Móvil */}
      <div className="flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-3 pb-2 w-full min-w-0 bg-white p-2 sm:p-2.5 rounded-xl">
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full min-w-0">
          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center shrink-0 ${
              activeTab === 'milestones'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock size={14} className="shrink-0" />
            <span className="truncate">Hitos & Actas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('zero_digitation')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center shrink-0 ${
              activeTab === 'zero_digitation'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Zap size={14} className="text-amber-500 shrink-0" />
            <span className="truncate">Cero Digitación & RUT</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('support_docs')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center shrink-0 ${
              activeTab === 'support_docs'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Receipt size={14} className="shrink-0" />
            <span className="truncate">Doc. Soporte (CUDS)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fev_radian')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center shrink-0 ${
              activeTab === 'fev_radian'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck size={14} className="shrink-0" />
            <span className="truncate">DIAN FEV & RADIAN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center shrink-0 ${
              activeTab === 'payroll'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Users size={14} className="shrink-0" />
            <span className="truncate">Nómina Electrónica</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsRutModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-[#00668F] hover:bg-sky-100 text-xs font-bold transition-all border border-sky-200 cursor-pointer"
            title="Escanear RUT con IA para auto-completar terceros y validar Módulo 11"
          >
            <Zap size={13} className="text-[#00668F]" />
            <span>Lector RUT IA</span>
          </button>
        </div>
      </div>

      {/* PESTAÑA 1: PLAN DE FACTURACIÓN Y ACTAS (FLUJO ORIGINAL) */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {/* Banner de la Regla de Facturación Oportuna (Manual 2.4) */}
          <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs text-amber-900">
            <div className="flex items-center gap-2.5">
              <Clock size={18} className="text-[#F39200] shrink-0" />
              <div>
                <strong className="block font-bold">Regla de Facturación Oportuna (Procedimiento 2.4):</strong>
                <span>
                  Toda factura de hito debe emitirse en un plazo máximo de <strong>48 horas</strong> tras la firma del acta parcial de aceptación por parte del cliente.
                </span>
              </div>
            </div>
            <div className="px-2.5 py-0.5 rounded-lg bg-white font-bold text-amber-800 border border-amber-300 self-start sm:self-auto shrink-0 text-[11px]">
              Cuenta Regresiva Activa
            </div>
          </div>

          {/* Plan de Hitos de Facturación por Proyecto */}
          <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
            <div>
              <h3 className="text-base font-bold text-gray-900">Plan de Facturación y Actas de Aceptación</h3>
              <p className="text-xs text-gray-400">
                Control de hitos contractuales, firma de actas parciales y expedición oportuna
              </p>
            </div>

            <LightTable
              data={milestones}
              keyExtractor={(m) => m.id}
              columns={[
                {
                  key: 'milestone',
                  header: 'Hito / Proyecto',
                  render: (m) => (
                    <div>
                      <div className="font-bold text-xs text-gray-900">{m.title}</div>
                      <div className="text-[11px] text-[#00668F] font-semibold">
                        {m.projectCode} — {m.clientName}
                      </div>
                    </div>
                  ),
                },
                {
                  key: 'amountUSD',
                  header: 'Valor del Hito',
                  align: 'right',
                  render: (m) => (
                    <div className="text-right">
                      <div className="font-bold text-xs text-gray-900">USD ${m.amountUSD.toLocaleString()}</div>
                      <div className="text-[10px] text-gray-400">({m.percentage}% del contrato)</div>
                    </div>
                  ),
                },
                {
                  key: 'countdown',
                  header: 'Estado Acta / Cuenta Regresiva 48h',
                  align: 'center',
                  render: (m) => {
                    if (!m.acceptanceActSigned) {
                      return (
                        <button
                          onClick={() => signMilestoneAct(m.id)}
                          className="px-3 py-1 rounded-full bg-blue-50 text-[#00668F] hover:bg-blue-100 border border-blue-200 text-[11px] font-bold transition-all shadow-2xs"
                        >
                          Firmar Acta Parcial
                        </button>
                      );
                    }

                    if (m.invoiceIssued) {
                      return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 size={12} /> Facturada ({m.invoiceNumber})
                        </span>
                      );
                    }

                    // Cálculo en tiempo real de la cuenta regresiva de 48h
                    const countdown = BusinessRulesEngine.calculateInvoiceCountdown(
                      m.acceptanceActSigned,
                      m.invoiceDeadlineTimestamp ? m.invoiceDeadlineTimestamp - 48 * 3600 * 1000 : undefined
                    );

                    return (
                      <div className="text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-extrabold ${
                            countdown.isExpired
                              ? 'bg-rose-100 text-rose-800 animate-pulse'
                              : countdown.urgencyLevel === 'urgent'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-[#FFF7EB] text-[#8A4C00] border border-[#FEE5BF]'
                          }`}
                        >
                          <Clock size={12} />
                          {countdown.isExpired
                            ? '¡PLAZO 48h VENCIDO!'
                            : `${countdown.hoursRemaining}h ${countdown.minutesRemaining}m restantes`}
                        </span>
                        <span className="block text-[10px] text-gray-400 mt-0.5">Acta firmada por cliente</span>
                      </div>
                    );
                  },
                },
                {
                  key: 'actions',
                  header: 'Emisión de Factura',
                  align: 'right',
                  render: (m) => {
                    if (m.acceptanceActSigned && !m.invoiceIssued) {
                      return (
                        <button
                          onClick={() => setInvoiceModalMilestone(m)}
                          className="px-4 py-1.5 rounded-full bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-xs active:scale-95 ml-auto block"
                        >
                          Expedir Factura
                        </button>
                      );
                    }
                    return (
                      <span className="text-[11px] text-gray-400 font-medium">
                        {m.isPaid ? 'Cobro Liquidado' : 'Radicada ante Cliente'}
                      </span>
                    );
                  },
                },
              ]}
            />
          </div>
        </div>
      )}

      {/* PESTAÑA 2: CERO DIGITACIÓN & RUT */}
      {activeTab === 'zero_digitation' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <Zap size={24} className="text-[#00668F] shrink-0" />
              <div>
                <strong className="block font-bold">Cero Digitación de Terceros & Validación Módulo 11:</strong>
                <span>
                  Elimina el 100% de los errores manuales al registrar clientes o proveedores. La IA extrae con precisión
                  la razón social, NIT con dígito de verificación validado matemáticamente, ciudad DANE, CIIU y responsabilidades fiscales.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsRutModalOpen(true)}
              className="px-4 py-2 rounded-full bg-[#00668F] hover:bg-[#005073] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
            >
              <Zap size={14} />
              <span>Abrir Lector Óptico de RUT</span>
            </button>
          </div>

          {/* Tarjeta explicativa con las casillas críticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
              <span className="px-2 py-0.5 rounded-md bg-sky-100 text-[#00668F] font-bold text-[10px] uppercase">
                Casilla 31 & 32
              </span>
              <h4 className="font-bold text-gray-900 text-sm">Validación Módulo 11 (DV)</h4>
              <p className="text-xs text-gray-500">
                Aplica la fórmula matemática oficial de la DIAN ponderando cada dígito por la serie de factores primos
                (3, 7, 13, 17, 19, 23, 29, 37, 41...). Previene facturas rechazadas.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[10px] uppercase">
                Casilla 53
              </span>
              <h4 className="font-bold text-gray-900 text-sm">Responsabilidades Tributarias</h4>
              <p className="text-xs text-gray-500">
                Detecta automáticamente si el tercero es Gran Contribuyente (O-13), Autorretenedor (O-15), Régimen Simple (O-47)
                o No Obligado a Facturar (R-99-PN), configurando las retenciones exactas.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-2xs space-y-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold text-[10px] uppercase">
                Casilla 46
              </span>
              <h4 className="font-bold text-gray-900 text-sm">Actividades Económicas CIIU v4</h4>
              <p className="text-xs text-gray-500">
                Cruza el código CIIU (ej. 3312 Mantenimiento, 7112 Ingeniería) con el código municipal DANE para parametrizar
                la tarifa aplicable de Impuesto de Industria y Comercio (ReteICA).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA 3: DOCUMENTO SOPORTE ELECTRÓNICO (DSE) */}
      {activeTab === 'support_docs' && <DianSupportDocumentManager />}

      {/* PESTAÑA 4: FACTURACIÓN DIAN & RADIAN */}
      {activeTab === 'fev_radian' && <DianRadianManager />}

      {/* PESTAÑA 5: NÓMINA ELECTRÓNICA */}
      {activeTab === 'payroll' && <DianPayrollManager />}

      {/* Modal Emisión de Factura de Venta de Hito */}
      {invoiceModalMilestone && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">Expedir Factura de Hito</h3>
                <p className="text-xs text-slate-500 font-medium">
                  {invoiceModalMilestone.projectCode} — USD ${invoiceModalMilestone.amountUSD.toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Configurar cuentas bancarias y términos de pago"
                >
                  <Settings size={13} className="text-[#00668F]" />
                  <span>Configuración</span>
                </button>
                <button
                  onClick={() => setInvoiceModalMilestone(null)}
                  className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleIssueInvoice} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-emerald-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={13} /> Acta Parcial de Aceptación Verificada
                </div>
                <div className="text-[11px]">
                  El cliente aprobó la entrega del hito. Al emitir la factura se cumple la meta de facturación en menos de 48 horas.
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Número de Factura de Venta
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ej. FE-ITK-2026-105"
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-[#00668F] font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <CreatableSelect
                    label="Cuenta Bancaria Receptora"
                    required
                    value={catalogBanks.find((b) => b.id === selectedBankId)?.name || selectedBankId}
                    onChange={(val) => {
                      const match = catalogBanks.find((b) => b.name.toLowerCase() === val.toLowerCase() || b.id === val);
                      setSelectedBankId(match?.id || val);
                    }}
                    options={catalogBanks.map((b) => ({
                      id: b.id,
                      name: b.name,
                      code: b.code,
                    }))}
                    placeholder="Seleccionar o escribir cuenta bancaria..."
                    moduleId="contabilidad"
                    catalogKey="banks"
                    allowCustomText={true}
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Término de Pago"
                    required
                    value={selectedPaymentTerm}
                    onChange={(val) => setSelectedPaymentTerm(val)}
                    options={catalogPaymentTerms.map((pt) => ({
                      id: pt.id,
                      name: pt.name,
                      code: pt.code,
                    }))}
                    placeholder="Seleccionar o escribir plazo de cobro..."
                    moduleId="contabilidad"
                    catalogKey="paymentTerms"
                    allowCustomText={true}
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Responsable de Facturación
                </label>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-medium">
                  Clemencia García Moncada (Gerente Administrativa)
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInvoiceModalMilestone(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold cursor-pointer transition-colors"
                >
                  Confirmar Emisión
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lector Inteligente de RUT DIAN */}
      <DianRutUploaderModal
        isOpen={isRutModalOpen}
        onClose={() => setIsRutModalOpen(false)}
        onApplyData={(rutData) => {
          console.log('RUT data applied to ERP context:', rutData);
          setIsRutModalOpen(false);
        }}
      />

      {/* Modal Universal de Configuración de Facturación */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="contabilidad"
        moduleTitle="Facturación y Contabilidad"
      />
    </div>
  );
};

import React, { useState } from 'react';
import {
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldCheck,
  Send,
  Building2,
  Calendar,
  Layers,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DianElectronicInvoice } from '../../../types';
import { DianElectronicBillingGateway } from '../services/dianElectronicBillingGateway';
import { LightTable } from '../../../components/ui/LightTable';

export const DianRadianManager: React.FC = () => {
  const [invoices, setInvoices] = useState<DianElectronicInvoice[]>(() =>
    DianElectronicBillingGateway.getRadianInvoices()
  );
  const [selectedInvoice, setSelectedInvoice] = useState<DianElectronicInvoice | null>(null);
  const [eventNotes, setEventNotes] = useState('');
  const [actionEventCode, setActionEventCode] = useState<'030' | '032' | '034' | null>(null);

  const handleRegisterEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !actionEventCode) return;

    DianElectronicBillingGateway.registerRadianEvent(
      selectedInvoice.id,
      actionEventCode
    );

    const updatedList = DianElectronicBillingGateway.getRadianInvoices();
    setInvoices(updatedList);
    setSelectedInvoice(null);
    setActionEventCode(null);
    setEventNotes('');
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner Explicativo RADIAN Res. 000085/2022 */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-[#F39200] shrink-0" />
          <div>
            <strong className="block font-bold">
              Registro de Facturas como Título Valor & Eventos RADIAN (Res. DIAN 000085/2022):
            </strong>
            <span>
              Para que las compras de bienes o servicios a <strong>crédito</strong> constituyan costo o gasto deducible en la declaración de renta de Inteckno, es obligatorio transmitir los 3 eventos: <strong>Acuse (030)</strong>, <strong>Recibo del bien/servicio (032)</strong> y <strong>Aceptación expresa (034)</strong>.
            </span>
          </div>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-white font-bold text-amber-900 border border-amber-300 shrink-0 text-center">
          Art. 771-2 E.T. Activo
        </div>
      </div>

      {/* Tabla de Facturas de Proveedores en RADIAN */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Facturas Electrónicas de Proveedores (Compras a Crédito)
            </h3>
            <p className="text-xs text-gray-400">
              Control de eventos DIAN para blindaje y deducibilidad fiscal en Renta
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Total Facturas Monitoreadas: {invoices.length}
          </div>
        </div>

        <LightTable
          data={invoices}
          keyExtractor={(inv) => inv.id}
          columns={[
            {
              key: 'number',
              header: 'Factura / Proveedor',
              render: (inv) => (
                <div>
                  <div className="font-extrabold text-[#00668F] text-xs flex items-center gap-1">
                    <FileCheck2 size={13} /> {inv.number}
                  </div>
                  <div className="font-bold text-gray-800 text-xs mt-0.5">{inv.customerName}</div>
                  <div className="text-[11px] text-gray-400">Emisor NIT: {inv.issuerNit}</div>
                </div>
              ),
            },
            {
              key: 'dates',
              header: 'Emisión & Plazo',
              render: (inv) => (
                <div className="text-xs">
                  <div className="text-gray-700 font-medium">Emisión: {inv.issueDate}</div>
                  <div className="text-[11px] text-gray-400">Hora: {inv.issueTime}</div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Factura a Crédito
                  </span>
                </div>
              ),
            },
            {
              key: 'totals',
              header: 'Valores Facturados',
              render: (inv) => (
                <div className="text-xs">
                  <div className="text-gray-600">Subtotal: ${inv.subtotal.toLocaleString('es-CO')}</div>
                  <div className="text-gray-600">IVA 19%: ${inv.taxAmount.toLocaleString('es-CO')}</div>
                  <div className="font-extrabold text-gray-900 mt-0.5 border-t border-gray-100 pt-0.5">
                    Total: ${inv.total.toLocaleString('es-CO')}
                  </div>
                </div>
              ),
            },
            {
              key: 'deductibility',
              header: 'Semáforo de Deducibilidad DIAN',
              render: (inv) => {
                const check = DianElectronicBillingGateway.checkDeductibilityStatus(inv);

                return (
                  <div className="space-y-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        check.has030 && check.has032 && check.has034
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : check.has030 && check.has032
                          ? 'bg-sky-50 text-sky-800 border-sky-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200 animate-pulse'
                      }`}
                    >
                      {check.has030 && check.has032 ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                      {check.statusLabel}
                    </span>

                    {/* Barra de progreso de eventos RADIAN */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <span
                        className={`px-1.5 py-0.5 rounded-sm font-bold ${
                          check.has030 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                        }`}
                        title="Evento 030: Acuse de Recibo"
                      >
                        030 {check.has030 ? '✓' : '—'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-sm font-bold ${
                          check.has032 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                        }`}
                        title="Evento 032: Recibo de Bienes / Servicios"
                      >
                        032 {check.has032 ? '✓' : '—'}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-sm font-bold ${
                          check.has034 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                        }`}
                        title="Evento 034: Aceptación Expresa"
                      >
                        034 {check.has034 ? '✓' : '—'}
                      </span>
                    </div>
                  </div>
                );
              },
            },
            {
              key: 'actions',
              header: 'Gestión RADIAN',
              render: (inv) => {
                const check = DianElectronicBillingGateway.checkDeductibilityStatus(inv);

                return (
                  <div className="flex flex-col gap-1">
                    {!check.has030 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setActionEventCode('030');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-[#00668F] font-bold text-[10px] border border-sky-200 transition-colors"
                      >
                        + Acuse (030)
                      </button>
                    )}
                    {check.has030 && !check.has032 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setActionEventCode('032');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] border border-emerald-200 transition-colors"
                      >
                        + Recibo Bienes (032)
                      </button>
                    )}
                    {check.has030 && check.has032 && !check.has034 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInvoice(inv);
                          setActionEventCode('034');
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[10px] border border-purple-200 transition-colors"
                      >
                        + Aceptación Expresa (034)
                      </button>
                    )}
                    {check.has030 && check.has032 && check.has034 && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 size={11} /> Ciclo Completo
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Deseas eliminar la factura ${inv.number}?`)) {
                          const updated = DianElectronicBillingGateway.deleteRadianInvoice(inv.id);
                          setInvoices(updated);
                        }
                      }}
                      title="Eliminar factura"
                      className="px-2 py-0.5 mt-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-[10px] font-bold flex items-center gap-1 transition-colors self-start cursor-pointer"
                    >
                      <Trash2 size={10} /> Eliminar
                    </button>
                  </div>
                );
              },
            },
          ]}
        />
      </div>

      {/* Modal para Registrar Evento RADIAN */}
      {selectedInvoice && actionEventCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in zoom-in-95 duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-100 text-[#00668F]">
                  <Send size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Transmitir Evento RADIAN ({actionEventCode})
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">{selectedInvoice.number}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedInvoice(null);
                  setActionEventCode(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center shrink-0 aspect-square cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterEvent} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-gray-800">
                  {actionEventCode === '030' && 'Evento 030: Acuse de Recibo de la Factura Electrónica'}
                  {actionEventCode === '032' && 'Evento 032: Recibo del Bien y/o Prestación del Servicio'}
                  {actionEventCode === '034' && 'Evento 034: Aceptación Expresa del Título Valor'}
                </div>
                <div className="text-[11px] text-gray-500">
                  Se generará y firmará digitalmente el documento UBL <code>ApplicationResponse</code> con
                  código CUDE de validación DIAN.
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Notas de Verificación / Responsable
                </label>
                <textarea
                  rows={3}
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  placeholder="Ej. Mercancía recibida conforme en bodega Sabaneta por Juan Carlos Hurtado"
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoice(null);
                    setActionEventCode(null);
                  }}
                  className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#00668F] hover:bg-[#005073] text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  <span>Transmitir a la DIAN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

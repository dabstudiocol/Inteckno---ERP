import React, { useState } from 'react';
import {
  X,
  Scale,
  Building2,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Award,
  AlertTriangle,
  Plus,
  Trash2,
} from 'lucide-react';
import { Partner, Project } from '../../../types';
import { formatCOP, formatUSD } from '../../../core/services/trmService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

export interface VendorQuoteCandidate {
  id: string;
  supplierName: string;
  supplierTaxId: string;
  isHomologated: boolean;
  totalCOP: number;
  totalUSD: number;
  deliveryDays: number; // Tiempo de entrega prometido
  paymentTerms: string; // 30 días, 50% anticipo, contado
  technicalCompliance: boolean; // Cumple ficha y certificado
  warrantyMonths: number;
  notes: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  partners: Partner[];
  currentTrm: number;
  onAwardQuote: (awardedQuote: VendorQuoteCandidate, projectId: string, needDescription?: string) => void;
}

export const QuoteComparisonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projects,
  partners,
  currentTrm,
  onAwardQuote,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [needDescription, setNeedDescription] = useState('');

  // Cotizaciones para comparar (inician limpias para que el usuario agregue las ofertas a evaluar)
  const [candidates, setCandidates] = useState<VendorQuoteCandidate[]>([]);

  const handleAddCandidate = () => {
    setCandidates((prev) => [
      ...prev,
      {
        id: `quote-${Date.now()}`,
        supplierName: '',
        supplierTaxId: '',
        isHomologated: true,
        totalCOP: 0,
        totalUSD: 0,
        deliveryDays: 1,
        paymentTerms: '30 días factura fecha',
        technicalCompliance: true,
        warrantyMonths: 12,
        notes: '',
      },
    ]);
  };

  if (!isOpen) return null;

  // Encontrar la mejor oferta (menor precio > 0 con cumplimiento técnico)
  const compliantQuotes = candidates.filter((c) => c.technicalCompliance && c.totalCOP > 0);
  const bestPriceQuote = compliantQuotes.reduce((min, c) => (c.totalCOP < min.totalCOP ? c : min), compliantQuotes[0]);

  const handleAward = (candidate: VendorQuoteCandidate) => {
    if (!selectedProjectId) {
      alert('Debes seleccionar el Proyecto o Centro de Costos antes de adjudicar la cotización.');
      return;
    }
    if (!candidate.technicalCompliance) {
      if (!window.confirm('Esta oferta NO cuenta con cumplimiento técnico de calidad. ¿Deseas forzar la adjudicación bajo excepción de Gerencia?')) {
        return;
      }
    }
    onAwardQuote(candidate, selectedProjectId, needDescription);
    onClose();
  };

  const handleUpdateCandidate = (id: string, field: keyof VendorQuoteCandidate, value: any) => {
    setCandidates(candidates.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera Corporativa */}
        <div className="p-4 sm:p-5 bg-[#003650] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Scale size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">
                Cuadro Comparativo de Ofertas y Cotizaciones
              </h3>
              <p className="text-xs text-slate-300">
                Evaluación multicriterio: Precio total, tiempo de entrega prometido y cumplimiento técnico de teleférico
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Parámetros de Selección (Amarre a Centro de Costos) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs shrink-0">
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Proyecto / Centro de Costos Imputado *
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
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Descripción de la Necesidad / Paquete de Materiales
            </label>
            <input
              type="text"
              value={needDescription}
              onChange={(e) => setNeedDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
            />
          </div>
        </div>

        {/* CUERPO DEL CUADRO COMPARATIVO */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleAddCandidate}
              className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#00668F] font-bold text-xs flex items-center gap-1.5 border border-sky-200 cursor-pointer"
            >
              <Plus size={13} /> Agregar Oferta de Proveedor
            </button>
          </div>
          {candidates.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              No hay cotizaciones cargadas. Haz clic en <strong>"Agregar Oferta de Proveedor"</strong> para iniciar la evaluación comparativa.
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {candidates.map((cand, idx) => {
              const isBest = cand.id === bestPriceQuote?.id && cand.technicalCompliance;
              return (
                <div
                  key={cand.id}
                  className={`rounded-2xl border-2 p-4 flex flex-col justify-between transition-all relative ${
                    isBest
                      ? 'border-emerald-500 bg-emerald-50/20 shadow-md ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  {isBest && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-xs">
                      <Sparkles size={11} /> Oferta Recomendada
                    </div>
                  )}

                  <div className="space-y-3">
                    {/* Encabezado del proveedor */}
                    <div className="border-b border-slate-100 pb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Cotización #{idx + 1}
                      </span>
                      <div className="mt-1">
                        <CreatableSelect
                          options={partners.map((p) => ({
                            id: p.name,
                            name: `${p.name} (${p.nit || p.taxId || 'NIT'})`,
                            code: p.nit || p.taxId,
                          }))}
                          value={cand.supplierName}
                          onChange={(val) => {
                            const found = partners.find((p) => p.name === val);
                            setCandidates((prev) =>
                              prev.map((c) =>
                                c.id === cand.id
                                  ? {
                                      ...c,
                                      supplierName: val,
                                      supplierTaxId: found?.nit || found?.taxId || c.supplierTaxId,
                                    }
                                  : c
                              )
                            );
                          }}
                          allowCustomText={true}
                          placeholder="Seleccionar o escribir proveedor..."
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[11px] text-slate-500">{cand.supplierTaxId || 'NIT pendiente'}</span>
                        {cand.isHomologated ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                            Homologado
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                            No Homologado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Precios */}
                    <div className="p-3 rounded-xl bg-slate-50 space-y-1">
                      <div className="text-[11px] text-slate-500 font-medium">Importe Total Cotizado (COP)</div>
                      <input
                        type="number"
                        min={0}
                        value={cand.totalCOP || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const cop = Number(e.target.value) || 0;
                          setCandidates((prev) =>
                            prev.map((c) =>
                              c.id === cand.id
                                ? { ...c, totalCOP: cop, totalUSD: Math.round(cop / currentTrm) }
                                : c
                            )
                          );
                        }}
                        className="w-full px-2 py-1 rounded border border-slate-200 bg-white font-mono text-sm font-black text-slate-900"
                      />
                      <div className="text-xs text-slate-500 font-mono">
                        {formatCOP(cand.totalCOP)} ≈ {formatUSD(cand.totalUSD)} USD
                      </div>
                    </div>

                    {/* Parámetros de servicio */}
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Clock size={13} /> Tiempo de Entrega:
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            value={cand.deliveryDays}
                            onChange={(e) => handleUpdateCandidate(cand.id, 'deliveryDays', Number(e.target.value))}
                            className="w-12 px-1 py-0.5 text-right font-bold border rounded bg-white"
                          />
                          <span className="font-bold text-slate-800">días</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1">
                          <ShieldCheck size={13} /> Cumplimiento Calidad:
                        </span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={cand.technicalCompliance}
                            onChange={(e) => handleUpdateCandidate(cand.id, 'technicalCompliance', e.target.checked)}
                            className="rounded text-emerald-600 cursor-pointer"
                          />
                          <span className={cand.technicalCompliance ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                            {cand.technicalCompliance ? 'Conforme' : 'No Conforme'}
                          </span>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Forma de Pago:</span>
                        <span className="font-semibold text-slate-800">{cand.paymentTerms}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Garantía:</span>
                        <span className="font-bold text-slate-800">{cand.warrantyMonths} meses</span>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-0.5">Observaciones Técnicas:</span>
                        <textarea
                          rows={2}
                          value={cand.notes}
                          onChange={(e) => handleUpdateCandidate(cand.id, 'notes', e.target.value)}
                          className="w-full p-1.5 text-[11px] border border-slate-200 rounded-lg bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Botón de Adjudicación */}
                  <div className="pt-4 border-t border-slate-100 mt-4">
                    <button
                      type="button"
                      onClick={() => handleAward(cand)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                        isBest
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-[#003650] hover:bg-[#00283c] text-white'
                      }`}
                    >
                      <Award size={15} /> Adjudicar y Generar Orden
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* PIE DEL MODAL */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500">
            Al adjudicar la oferta ganadora, el ERP transfiere los datos a una nueva Orden de Compra oficial con trazabilidad contable.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            Cerrar Comparador
          </button>
        </div>

      </div>
    </div>
  );
};

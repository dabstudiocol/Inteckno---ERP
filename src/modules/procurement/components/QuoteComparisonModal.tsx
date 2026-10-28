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
  onAwardQuote: (awardedQuote: VendorQuoteCandidate, projectId: string) => void;
}

export const QuoteComparisonModal: React.FC<Props> = ({
  isOpen,
  onClose,
  projects,
  partners,
  currentTrm,
  onAwardQuote,
}) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const [needDescription, setNeedDescription] = useState('Suministro de Repuestos y Cables para Mantenimiento Mayor STC');

  // 3 cotizaciones para comparar
  const [candidates, setCandidates] = useState<VendorQuoteCandidate[]>([
    {
      id: 'quote-1',
      supplierName: partners[0]?.name || 'FATZER AG Wire Ropes',
      supplierTaxId: partners[0]?.taxId || 'CHE-101.234.567',
      isHomologated: true,
      totalCOP: 18500000,
      totalUSD: Math.round(18500000 / currentTrm),
      deliveryDays: 15,
      paymentTerms: '50% Anticipo / 50% Contra Entrega',
      technicalCompliance: true,
      warrantyMonths: 24,
      notes: 'Fabricante original suizo. Incluye certificado Mill Test EN 10204 3.1.',
    },
    {
      id: 'quote-2',
      supplierName: partners[1]?.name || 'Ferretería Industrial del Cable S.A.S.',
      supplierTaxId: partners[1]?.taxId || '901.882.334-1',
      isHomologated: false,
      totalCOP: 16200000,
      totalUSD: Math.round(16200000 / currentTrm),
      deliveryDays: 5,
      paymentTerms: 'Contado contra entrega',
      technicalCompliance: true,
      warrantyMonths: 12,
      notes: 'Distribuidor local en Medellín. Entrega inmediata pero no es fabricante directo.',
    },
    {
      id: 'quote-3',
      supplierName: 'Importaciones y Cables Andinos Ltda.',
      supplierTaxId: '900.551.229-8',
      isHomologated: false,
      totalCOP: 21000000,
      totalUSD: Math.round(21000000 / currentTrm),
      deliveryDays: 30,
      paymentTerms: '30 días factura fecha',
      technicalCompliance: false,
      warrantyMonths: 6,
      notes: 'Precio superior y no garantiza certificado de calidad en origen.',
    },
  ]);

  if (!isOpen) return null;

  // Encontrar la mejor oferta (menor precio con cumplimiento técnico)
  const compliantQuotes = candidates.filter((c) => c.technicalCompliance);
  const bestPriceQuote = compliantQuotes.reduce((min, c) => (c.totalCOP < min.totalCOP ? c : min), compliantQuotes[0] || candidates[0]);

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
    onAwardQuote(candidate, selectedProjectId);
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
                      <input
                        type="text"
                        value={cand.supplierName}
                        onChange={(e) => handleUpdateCandidate(cand.id, 'supplierName', e.target.value)}
                        className="font-bold text-sm text-slate-900 w-full mt-0.5 bg-transparent border-b border-dashed border-slate-300 focus:border-[#00668F]"
                      />
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[11px] text-slate-500">{cand.supplierTaxId}</span>
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
                      <div className="text-[11px] text-slate-500 font-medium">Importe Total Cotizado</div>
                      <div className="text-lg font-black text-slate-900 font-mono">
                        {formatCOP(cand.totalCOP)}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">
                        ≈ {formatUSD(cand.totalUSD)} USD
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

import React from 'react';
import { Printer, Download, X, CheckCircle2, ShieldCheck, Globe, FileText, Anchor } from 'lucide-react';
import { InternationalCalculationState, QuoteCostBreakdown } from '../types';

interface QuotePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: InternationalCalculationState;
  breakdown: QuoteCostBreakdown;
  quoteTitle: string;
  clientName: string;
}

export const QuotePdfModal: React.FC<QuotePdfModalProps> = ({
  isOpen,
  onClose,
  state,
  breakdown,
  quoteTitle,
  clientName,
}) => {
  if (!isOpen) return null;

  const quoteNumber = `COT-INT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const currentDate = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Contenedor Modal / Documento A4 */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden print:max-h-none print:shadow-none print:rounded-none print:w-full print:max-w-none">
        {/* Barra Superior con Acciones (Oculta en Impresión) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white shrink-0 print:hidden">
          <div className="flex items-center gap-2 text-xs font-bold">
            <FileText size={16} className="text-[#00668F]" />
            <span>Vista Previa de Cotización Internacional Oficial (PDF / Impresión)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#00668F] hover:bg-[#005073] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Printer size={14} />
              <span>Imprimir / Guardar como PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Hoja de Cotización Imprimible */}
        <div id="printable-quote" className="p-8 sm:p-10 overflow-y-auto flex-1 text-slate-800 space-y-6 print:p-6 print:text-black">
          {/* Encabezado Corporativo Inteckno */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-[#00668F] pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#00668F] flex items-center justify-center text-white font-black text-lg">
                  IT
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight">INTECKNO S.A.S.</h1>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                    Sistemas de Transporte por Cable & Ingeniería Electromecánica
                  </p>
                </div>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 space-y-0.5">
                <div>NIT: 901.482.915-4 | Medellín, Colombia</div>
                <div>Edificio Milla de Oro, Torre 2, Piso 9 | ventas@inteckno.com</div>
              </div>
            </div>

            <div className="text-right sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#00668F] bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-100">
                Oferta Comercial Internacional
              </span>
              <div className="text-lg font-black text-slate-900 mt-1">{quoteNumber}</div>
              <div className="text-xs text-slate-500 font-medium">Fecha: {currentDate}</div>
              <div className="text-[11px] font-bold text-slate-700 mt-0.5">
                Validez: 30 Días con Cobertura Cambiaria
              </div>
            </div>
          </div>

          {/* Datos del Cliente y Proyecto */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Cliente / Entidad Operadora:
              </span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{clientName || 'Cliente Internacional'}</div>
              <div className="text-slate-600 mt-0.5 flex items-center gap-1">
                <Globe size={12} className="text-[#00668F]" />
                <span>Destino: <strong>{state.destinationCity || state.destinationCountry}, {state.destinationCountry}</strong></span>
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Proyecto / Equipo Cotizado:
              </span>
              <div className="font-bold text-slate-900 text-sm mt-0.5">{quoteTitle || 'Maquinaria y Componentes STC'}</div>
              <div className="text-slate-600 mt-0.5">
                Incoterm Acordado: <strong className="text-[#00668F] font-black">{state.selectedIncoterm} 2020</strong>
              </div>
            </div>
          </div>

          {/* Resumen Logístico de Carga & Cubicaje */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Anchor size={14} className="text-[#00668F]" />
              1. Especificaciones de Embalaje y Carga
            </h3>
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2 border-b">Bulto / Descripción</th>
                  <th className="p-2 border-b text-center">Cant.</th>
                  <th className="p-2 border-b text-center">Dimensiones (LxWxH)</th>
                  <th className="p-2 border-b text-center">Peso Bruto Total</th>
                  <th className="p-2 border-b text-center">Volumen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {state.packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td className="p-2 font-medium text-slate-800">{pkg.description}</td>
                    <td className="p-2 text-center font-bold">{pkg.quantity}</td>
                    <td className="p-2 text-center text-slate-600">
                      {pkg.length} × {pkg.width} × {pkg.height} {state.unitSystem === 'metric' ? 'cm' : 'in'}
                    </td>
                    <td className="p-2 text-center font-semibold text-slate-800">
                      {(pkg.weight * pkg.quantity).toLocaleString()} {state.unitSystem === 'metric' ? 'kg' : 'lbs'}
                    </td>
                    <td className="p-2 text-center text-slate-600 font-mono">
                      {((pkg.length * pkg.width * pkg.height * pkg.quantity) / (state.unitSystem === 'metric' ? 1_000_000 : 61023.7)).toFixed(2)} m³
                    </td>
                  </tr>
                ))}
              </tbody>
              {state.packages.length > 1 && (
                <tfoot className="bg-slate-50 font-bold text-slate-800">
                  <tr>
                    <td colSpan={3} className="p-2 text-right">Totales Consolidados:</td>
                    <td className="p-2 text-center text-[#00668F] font-bold">{breakdown.totalGrossWeightKg.toLocaleString()} kg</td>
                    <td className="p-2 text-center text-[#00668F] font-bold">{breakdown.totalCBM} CBM (m³)</td>
                  </tr>
                </tfoot>
              )}
            </table>
            <div className="mt-2 text-[10.5px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center justify-between">
              <span><strong>Embalaje Industrial:</strong> {state.targetPackaging.replace(/_/g, ' ').toUpperCase()}</span>
              <span><strong>Modalidad:</strong> {state.targetFreightMode.replace(/_/g, ' ').toUpperCase()}</span>
              <span><strong>Peso Facturable:</strong> {breakdown.chargeableWeightKg.toLocaleString()} kg</span>
            </div>
          </div>

          {/* Desglose Económico según Incoterm */}
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600" />
              2. Desglose de Costos en Cascada (Incoterm: {state.selectedIncoterm})
            </h3>
            <table className="w-full text-xs text-left border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2 border-b">Concepto / Etapa de Entrega</th>
                  <th className="p-2 border-b">Responsabilidad / Cobertura</th>
                  <th className="p-2 border-b text-right">Valor USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                <tr>
                  <td className="p-2 font-semibold">Fabricación & Ensamble Mecánico (EXW)</td>
                  <td className="p-2 text-slate-500">Puesto en taller Inteckno</td>
                  <td className="p-2 text-right font-medium">${breakdown.exwPriceUSD.toLocaleString()} USD</td>
                </tr>

                {['FCA', 'FOB', 'CFR', 'CPT', 'CIF', 'CIP', 'DAP', 'DDP'].includes(state.selectedIncoterm) && (
                  <tr>
                    <td className="p-2 font-semibold">Embalaje de Exportación + Tránsito a Puerto + Aduana Origen (FOB)</td>
                    <td className="p-2 text-slate-500">Puerto Buenaventura / Cartagena</td>
                    <td className="p-2 text-right font-medium">
                      +${(breakdown.exportPackagingUSD + breakdown.inlandFreightOriginUSD + breakdown.exportCustomsUSD).toLocaleString()} USD
                    </td>
                  </tr>
                )}

                {['CFR', 'CPT', 'CIF', 'CIP', 'DAP', 'DDP'].includes(state.selectedIncoterm) && (
                  <tr>
                    <td className="p-2 font-semibold">Flete Principal Internacional ({state.targetFreightMode.replace(/_/g, ' ').toUpperCase()})</td>
                    <td className="p-2 text-slate-500">Hasta puerto/aeropuerto de destino</td>
                    <td className="p-2 text-right font-medium">+${breakdown.internationalFreightUSD.toLocaleString()} USD</td>
                  </tr>
                )}

                {['CIF', 'CIP', 'DAP', 'DDP'].includes(state.selectedIncoterm) && (
                  <tr>
                    <td className="p-2 font-semibold">Seguro de Transporte Internacional (Póliza Todo Riesgo)</td>
                    <td className="p-2 text-slate-500">Cláusula Institute Cargo A (110% CIF)</td>
                    <td className="p-2 text-right font-medium">+${breakdown.transitInsuranceUSD.toLocaleString()} USD</td>
                  </tr>
                )}

                {['DAP', 'DDP'].includes(state.selectedIncoterm) && (
                  <tr>
                    <td className="p-2 font-semibold">Gastos Terminal Destino + Flete Terrestre en País Destino</td>
                    <td className="p-2 text-slate-500">Entrega en sitio de obra en {state.destinationCity || state.destinationCountry}</td>
                    <td className="p-2 text-right font-medium">
                      +${(breakdown.destinationPortAndThcUSD + breakdown.inlandFreightDestinationUSD).toLocaleString()} USD
                    </td>
                  </tr>
                )}

                {state.selectedIncoterm === 'DDP' && (
                  <tr>
                    <td className="p-2 font-semibold">
                      Aranceles Aduaneros & Gastos de Desaduanaje ({state.isFtaApplied ? 'TLC Aplicado 0%' : `${state.baseDutyPct}%`})
                    </td>
                    <td className="p-2 text-slate-500">
                      Nacionalización completa por Inteckno (HS: {state.hsCode})
                    </td>
                    <td className="p-2 text-right font-medium">
                      +${(breakdown.importDutyUSD + breakdown.importBrokerAndFormalitiesUSD + breakdown.destinationTaxesUSD).toLocaleString()} USD
                    </td>
                  </tr>
                )}

                {breakdown.totalFinancialCostUSD > 0 && (
                  <tr>
                    <td className="p-2 font-semibold">Gestión de Riesgo Cambiario & Costos Financieros</td>
                    <td className="p-2 text-slate-500">Cobertura cambiaria + Cartas de Crédito / Financiamiento</td>
                    <td className="p-2 text-right font-medium">+${breakdown.totalFinancialCostUSD.toLocaleString()} USD</td>
                  </tr>
                )}

                {breakdown.complianceCostUSD > 0 && (
                  <tr>
                    <td className="p-2 font-semibold">Certificaciones Técnicas & Compliance ({state.destinationCountry})</td>
                    <td className="p-2 text-slate-500">Inspección acreditada de tercera parte</td>
                    <td className="p-2 text-right font-medium">+${breakdown.complianceCostUSD.toLocaleString()} USD</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Caja Resaltada con el Total y Divisa del Cliente */}
          <div className="bg-[#0B1E28] text-white p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-sky-200 font-bold uppercase tracking-wider block">
                Precio Total de Venta ({state.selectedIncoterm} 2020)
              </span>
              <div className="text-2xl font-black mt-0.5">
                ${breakdown.selectedIncotermPriceUSD.toLocaleString()} USD
              </div>
              {state.quoteCurrency !== 'USD' && (
                <div className="text-sm font-semibold text-emerald-300 mt-1">
                  ≈ {breakdown.selectedIncotermPriceTargetCurrency.toLocaleString()} {state.quoteCurrency} (Tasa: {state.exchangeRates[state.quoteCurrency]})
                </div>
              )}
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 sm:border-l border-white/20 pt-3 sm:pt-0 sm:pl-6 text-xs text-sky-100 space-y-1 w-full sm:w-auto">
              <div>Partida Arancelaria: <strong className="text-white">{state.hsCode}</strong></div>
              <div>Régimen Arancelario: <strong className="text-white">{state.isFtaApplied ? 'Desgravación TLC 0%' : 'Arancel General'}</strong></div>
              <div>Certificado de Origen: <strong className="text-white">{state.isFtaApplied ? 'EMITIDO POR INTECKNO' : 'No Requerido'}</strong></div>
            </div>
          </div>

          {/* Términos y Condiciones */}
          <div className="text-[10px] text-slate-500 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="font-bold text-slate-700">Términos Comerciales y Legales:</div>
            <div>• <strong>Forma de Pago:</strong> {state.hasLetterOfCredit ? 'Carta de Crédito Irrevocable y Confirmada a la Vista' : (state.creditTermDays > 0 ? `Crédito Comercial a ${state.creditTermDays} días` : '50% de anticipo contra orden de compra, 50% contra entrega de documentos de embarque.')}</div>
            <div>• <strong>Garantía:</strong> 12 meses contra defectos de fabricación o 2.000 horas de operación continua en línea teleférica.</div>
            <div>• <strong>Normativa de Diseño:</strong> Cumplimiento estricto con las especificaciones del fabricante original y estándares OITAF / ASME B77 / EN 12929.</div>
          </div>

          {/* Firmas Autorizadas */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs">
            <div className="text-center">
              <div className="w-40 border-b border-slate-400 mx-auto mb-1"></div>
              <div className="font-bold text-slate-900">Ing. Carlos Mendoza</div>
              <div className="text-[10px] text-slate-500">Director Comercial & Negocios Internacionales</div>
              <div className="text-[9px] text-slate-400">Inteckno S.A.S.</div>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-slate-400 mx-auto mb-1"></div>
              <div className="font-bold text-slate-900">Aceptado por el Cliente</div>
              <div className="text-[10px] text-slate-500">Firma y Sello de Conformidad</div>
              <div className="text-[9px] text-slate-400">{clientName || 'Entidad Contratante'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

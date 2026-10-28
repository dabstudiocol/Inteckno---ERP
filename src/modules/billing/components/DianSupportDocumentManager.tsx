import React, { useState } from 'react';
import {
  FileText,
  Plus,
  ShieldCheck,
  QrCode,
  Download,
  ExternalLink,
  AlertTriangle,
  Info,
  CheckCircle2,
  DollarSign,
  UserCheck,
  Building,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { DianSupportDocument, DianRutData } from '../../../types';
import {
  DianSupportDocumentService,
} from '../services/dianSupportDocumentService';
import { SAMPLE_RUTS } from '../services/dianRutParserService';
import { LightTable } from '../../../components/ui/LightTable';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

export const DianSupportDocumentManager: React.FC = () => {
  const [documents, setDocuments] = useState<DianSupportDocument[]>(() =>
    DianSupportDocumentService.getStoredDocuments()
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedXmlDoc, setSelectedXmlDoc] = useState<DianSupportDocument | null>(null);

  const sampleList = Object.values(SAMPLE_RUTS);
  const [selectedRut, setSelectedRut] = useState<DianRutData | null>(() => sampleList[0] || null);
  const [description, setDescription] = useState('');
  const [conceptType, setConceptType] = useState<'servicio_tecnico' | 'mano_de_obra_obra' | 'repuestos_menores' | 'honorarios'>('servicio_tecnico');
  const [subtotal, setSubtotal] = useState<number>(0);

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRut || subtotal <= 0) return;

    DianSupportDocumentService.createDocument({
      vendorRut: selectedRut,
      description: description || 'Servicios técnicos y suministros mecánicos en sitio',
      conceptType,
      subtotal,
    });

    setDocuments(DianSupportDocumentService.getStoredDocuments());
    setIsModalOpen(false);
    setDescription('');
    setSubtotal(1500000);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Banner de Fundamento Tributario Res. 000167/2021 */}
      <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-950 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <ShieldCheck size={24} className="text-[#00668F] shrink-0" />
          <div>
            <strong className="block font-bold">Documento Soporte Electrónico (Resolución DIAN 000167/2021):</strong>
            <span>
              Respalda compras de bienes o servicios a personas naturales o empresas <strong>no obligadas a expedir factura</strong> (R-99-PN). Genera CUDS y garantiza la deducibilidad en Renta (Art. 771-2 E.T.).
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-full bg-[#00668F] hover:bg-[#005073] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
        >
          <Plus size={14} />
          <span>Emitir Documento Soporte (DSE)</span>
        </button>
      </div>

      {/* Tabla de Documentos Soporte */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historial de Documentos Soporte Emitidos</h3>
            <p className="text-xs text-slate-500">Numeración autorizada por la DIAN (Prefijo DSE) y validación previa</p>
          </div>
          <div className="text-xs text-slate-600 font-semibold bg-slate-50 px-3 py-1.5 rounded-lg">
            Total DSEs: {documents.length} | Costos Deducibles Asegurados
          </div>
        </div>

        <LightTable
          data={documents}
          keyExtractor={(d) => d.id}
          columns={[
            {
              key: 'number',
              header: 'Número DSE / Fecha',
              render: (d) => (
                <div>
                  <div className="font-extrabold text-[#00668F] text-xs flex items-center gap-1">
                    <FileText size={13} /> {d.prefix}-{d.consecutive}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {d.issueDate}
                  </div>
                </div>
              ),
            },
            {
              key: 'vendor',
              header: 'Beneficiario (No Obligado)',
              render: (d) => (
                <div>
                  <div className="font-bold text-gray-800 text-xs">{d.vendorName}</div>
                  <div className="text-[11px] text-gray-500">
                    NIT: {d.vendorNit}-{d.vendorDV} | {d.vendorCity}
                  </div>
                </div>
              ),
            },
            {
              key: 'concept',
              header: 'Concepto / Objeto',
              render: (d) => (
                <div className="max-w-xs">
                  <div className="text-xs text-gray-700 font-medium truncate" title={d.description}>
                    {d.description}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {d.conceptType}
                  </span>
                </div>
              ),
            },
            {
              key: 'amounts',
              header: 'Liquidación & Retenciones',
              render: (d) => (
                <div className="text-xs">
                  <div className="font-bold text-gray-900">
                    Subtotal: ${d.subtotal.toLocaleString('es-CO')}
                  </div>
                  <div className="text-[10px] text-rose-600 font-semibold">
                    - ReteFuente ({(d.reteFuenteRate * 100).toFixed(1)}%): -${d.reteFuenteAmount.toLocaleString('es-CO')}
                  </div>
                  <div className="text-[10px] text-amber-700 font-semibold">
                    - ReteICA ({(d.reteIcaRate * 1000).toFixed(1)}‰): -${d.reteIcaAmount.toLocaleString('es-CO')}
                  </div>
                  <div className="font-extrabold text-emerald-700 text-xs mt-0.5 border-t border-gray-100 pt-0.5">
                    Neto a Pagar: ${d.netPayable.toLocaleString('es-CO')}
                  </div>
                </div>
              ),
            },
            {
              key: 'dian',
              header: 'CUDS & Estado DIAN',
              render: (d) => (
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 size={11} /> {d.dianStatus.toUpperCase()}
                  </span>
                  <div
                    className="text-[9px] font-mono text-gray-400 truncate max-w-[140px]"
                    title={`CUDS: ${d.cuds}`}
                  >
                    CUDS: {d.cuds.slice(0, 16)}...
                  </div>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Acciones',
              render: (d) => {
                const qrUrl = `https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey=${d.cuds}`;
                return (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedXmlDoc(d)}
                      title="Ver XML UBL 2.1 estándar DIAN"
                      className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 border border-slate-200 text-xs transition-colors"
                    >
                      <Download size={13} />
                    </button>
                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Consultar en catálogo VPFE DIAN"
                      className="p-1.5 rounded-lg text-[#00668F] hover:bg-sky-50 border border-sky-200 text-xs transition-colors"
                    >
                      <ExternalLink size={13} />
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Deseas eliminar el documento soporte ${d.prefix}-${d.consecutive}?`)) {
                          const updated = DianSupportDocumentService.deleteDocument(d.id);
                          setDocuments(updated);
                        }
                      }}
                      title="Eliminar documento soporte"
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 text-xs transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              },
            },
          ]}
        />
      </div>

      {/* Modal Emisión de Documento Soporte */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in slide-in-from-bottom sm:zoom-in-95 duration-150">
          <div className="w-full max-w-lg bg-white rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-sky-100 text-[#00668F]">
                  <FileText size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Nuevo Documento Soporte Electrónico</h3>
                  <p className="text-xs text-slate-500">Transmisión inmediata con CUDS automático</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Proveedor Beneficiario (Sujeto No Obligado a Facturar)
                </label>
                <CreatableSelect
                  options={sampleList.map((r) => ({
                    id: r.nit,
                    name: `${r.razonSocial || `${r.primerNombre || ''} ${r.primerApellido || ''}`} (NIT: ${r.nit}-${r.dv})`,
                    code: r.nit
                  }))}
                  value={selectedRut?.nit || ''}
                  onChange={(val) => {
                    const found = sampleList.find((r) => r.nit === val);
                    if (found) setSelectedRut(found);
                  }}
                  placeholder="Buscar o seleccionar proveedor no obligado..."
                />
                {selectedRut && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-700">
                    <UserCheck size={12} />
                    <span>
                      Responsabilidad DIAN:{' '}
                      <strong>
                        {selectedRut.responsabilidades?.map((res) => res.code).join(', ') || 'R-99-PN'}
                      </strong>
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Concepto Operativo</label>
                <CreatableSelect
                  options={[
                    { id: 'servicio_tecnico', name: 'Servicio Técnico / Mantenimiento (4% ReteFuente)' },
                    { id: 'repuestos_menores', name: 'Suministro de Repuestos Menores (2.5% ReteFuente)' },
                    { id: 'mano_de_obra_obra', name: 'Mano de Obra en Sitio (4% ReteFuente)' },
                    { id: 'honorarios', name: 'Honorarios Profesionales / Consultoría (10% ReteFuente)' }
                  ]}
                  value={conceptType}
                  onChange={(val) => setConceptType(val as any)}
                  placeholder="Seleccionar o buscar concepto..."
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Valor Bruto Pactado (COP)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    min="10000"
                    step="1000"
                    required
                    value={subtotal}
                    onChange={(e) => setSubtotal(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border border-gray-200 font-bold text-sm focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Descripción del Servicio o Bien</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Torneado de pasadores y rectificado de engranajes en taller externo"
                  className="w-full p-2.5 rounded-xl border border-gray-200 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-full bg-[#00668F] hover:bg-[#005073] text-white font-bold shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles size={14} />
                  <span>Generar y Transmitir a DIAN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Previsualización de XML UBL 2.1 */}
      {selectedXmlDoc && (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in slide-in-from-bottom sm:zoom-in-95 duration-150">
          <div className="w-full max-w-2xl bg-white rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  XML UBL 2.1 Estándar DIAN — {selectedXmlDoc.prefix}-{selectedXmlDoc.consecutive}
                </h3>
                <p className="text-xs text-slate-500 font-mono">CUDS: {selectedXmlDoc.cuds}</p>
              </div>
              <button
                onClick={() => setSelectedXmlDoc(null)}
                className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto max-h-96">
              {DianSupportDocumentService.generateUblXml(selectedXmlDoc)}
            </pre>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs text-slate-500">
                ✅ Estructura UBL 2.1 interoperable con la DIAN y proveedores tecnológicos
              </span>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([DianSupportDocumentService.generateUblXml(selectedXmlDoc)], {
                    type: 'text/xml',
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selectedXmlDoc.prefix}-${selectedXmlDoc.consecutive}_DIAN_UBL.xml`;
                  a.click();
                }}
                className="px-4 py-2 rounded-full bg-[#00668F] hover:bg-[#005073] text-white font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <Download size={13} />
                <span>Descargar XML</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

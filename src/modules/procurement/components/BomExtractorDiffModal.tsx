import React, { useState } from 'react';
import {
  Layers,
  Sparkles,
  FileCheck2,
  X,
  Plus,
  ArrowRight,
  Upload,
  CheckCircle2,
  FolderKanban,
  FileSpreadsheet,
} from 'lucide-react';
import { BOMDiffResult } from '../../../types';
import { calculateBOMDiff, RawBOMItem } from '../../../utils/bomDiff';
import { extractBOMWithLuciana } from '../../../core/services/lucianaService';
import { useErp } from '../../../core/storage/erpStore';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface BomExtractorDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportBOMToRequisition?: (items: { sku: string; name: string; qty: number; unit: string; notes?: string }[], revision: string) => void;
}

export const BomExtractorDiffModal: React.FC<BomExtractorDiffModalProps> = ({
  isOpen,
  onClose,
  onImportBOMToRequisition,
}) => {
  const { projects, createRequisition, currentUser } = useErp();

  if (!isOpen) return null;

  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');
  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const [activeView, setActiveView] = useState<'compare' | 'upload'>('compare');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionSuccess, setExtractionSuccess] = useState(false);

  // Versiones de referencia para comparación de ingeniería STC (sin mock data inicial)
  const [v1Items, setV1Items] = useState<RawBOMItem[]>([]);
  const [v2Items, setV2Items] = useState<RawBOMItem[]>([]);

  const diffResult: BOMDiffResult = calculateBOMDiff(
    v1Items,
    v2Items,
    'Plano Rev 1.0 (Aprobado Inicial)',
    'Plano Rev 2.0 (Modificación de Campo)'
  );

  // Solo los ítems que requieren compra (delta > 0)
  const itemsToPurchase = diffResult.changes.filter((c) => c.deltaQty && c.deltaQty > 0);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    setExtractionSuccess(false);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const res = await extractBOMWithLuciana(base64, file.type, file.name);
        if (res.items && res.items.length > 0) {
          setV2Items(res.items);
          setExtractionSuccess(true);
          setActiveView('compare');
        }
        setIsExtracting(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsExtracting(false);
    }
  };

  const handleCreateRequisitionFromBOM = () => {
    if (itemsToPurchase.length === 0) return;

    const formattedItems = itemsToPurchase.map((c) => ({
      productId: `PRD-${c.sku}`,
      productSku: c.sku,
      productName: c.name,
      qtyRequested: c.deltaQty || 1,
      unit: c.unit || 'unid',
      inStock: false,
      availableStock: 0,
    }));

    createRequisition({
      requesterId: currentUser?.id || 'USR-01',
      requesterName: currentUser?.name || 'Ingeniería Inteckno',
      department: selectedProject?.code || 'Ingeniería & Obras',
      projectId: selectedProject?.id,
      projectCode: selectedProject?.code || 'STC-PROJ',
      projectName: selectedProject?.name || 'Proyecto STC',
      neededDate: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
      priority: 'urgente',
      items: formattedItems,
      notes: `Generado automáticamente desde Embudo de Ingeniería (${diffResult.v2Revision}). Se solicitan únicamente las diferencias positivas (Δ).`,
    });

    if (onImportBOMToRequisition) {
      onImportBOMToRequisition(
        itemsToPurchase.map((c) => ({
          sku: c.sku,
          name: c.name,
          qty: c.deltaQty!,
          unit: c.unit || 'unid',
          notes: c.notes,
        })),
        diffResult.v2Revision
      );
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera Sólida Corporativa */}
        <div className="p-4 bg-[#003650] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Embudo de Ingeniería: Control de Materiales y Planos</h3>
              <p className="text-xs text-slate-300">
                Compara las listas de materiales entre versiones de planos y compra únicamente las diferencias requeridas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Cerrar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Barra Superior de Proyecto y Pestañas */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="font-bold text-slate-700 whitespace-nowrap">Proyecto STC:</span>
            <div className="flex-1">
              <CreatableSelect
                options={projects.map((p) => ({
                  id: p.id,
                  name: `${p.code} — ${p.name}`,
                  code: p.code
                }))}
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                placeholder="Seleccionar proyecto STC..."
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-200 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveView('compare')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                activeView === 'compare' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Deltas a Comprar ({itemsToPurchase.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveView('upload')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeView === 'upload' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Upload size={13} />
              <span>Cargar Nuevo Plano / Excel</span>
            </button>
          </div>
        </div>

        {/* Contenido Principal */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {activeView === 'upload' ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-2xl bg-slate-50 space-y-3">
              <div className="w-12 h-12 mx-auto rounded-full bg-sky-100 text-[#003650] flex items-center justify-center">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">Sube la Lista de Materiales o Plano Técnico</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Formatos soportados: Excel (.xlsx, .csv), PDF o planos de ingeniería. La IA extraerá los renglones y calculará los deltas con respecto al plano aprobado.
                </p>
              </div>

              <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white font-bold text-xs cursor-pointer shadow-xs">
                <Upload size={14} />
                <span>{isExtracting ? 'Analizando Documento con IA...' : 'Seleccionar Archivo desde tu Equipo'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.pdf,image/*"
                  onChange={handleFileUpload}
                  disabled={isExtracting}
                  className="hidden"
                />
              </label>

              {extractionSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-2">
                  <CheckCircle2 size={16} />
                  <span>¡Materiales extraídos con éxito! Se han actualizado los deltas.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Resumen Simple y Directo */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase block tracking-wider">
                    Análisis Comparativo de Materiales
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-bold text-slate-900 text-sm">
                      {diffResult.v1Revision}
                    </span>
                    <ArrowRight size={14} className="text-slate-400" />
                    <span className="font-bold text-emerald-800 text-sm">
                      {diffResult.v2Revision}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-950 font-bold text-xs">
                    +{itemsToPurchase.length} ítems a pedir
                  </div>
                </div>
              </div>

              {/* Tabla de Materiales a Comprar (Deltas Positivos) */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between font-bold text-slate-800">
                  <span>Materiales que se deben solicitar a compras</span>
                  <span className="text-[11px] font-medium text-slate-500">
                    Solo se comprará el incremento neto requerido en obra
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px]">
                        <th className="p-3">Código SKU</th>
                        <th className="p-3">Descripción del Material</th>
                        <th className="p-3 text-center">Plano Inicial</th>
                        <th className="p-3 text-center">Plano Nuevo</th>
                        <th className="p-3 text-center font-bold text-emerald-800">Delta a Pedir (Δ)</th>
                        <th className="p-3">Novedad de Ingeniería</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemsToPurchase.map((item) => (
                        <tr key={item.sku} className="hover:bg-slate-50">
                          <td className="p-3 font-mono font-bold text-slate-900">{item.sku}</td>
                          <td className="p-3 font-semibold text-slate-800">{item.name}</td>
                          <td className="p-3 text-center text-slate-500 font-mono">{item.v1Qty || 0}</td>
                          <td className="p-3 text-center text-slate-900 font-mono font-bold">{item.v2Qty}</td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-mono font-bold text-xs">
                              +{item.deltaQty} {item.unit || 'und'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 text-[11px] italic">
                            {item.notes || 'Ampliación de metrado o repuesto adicional'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Pie Fijo con Acción Final */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-500 hidden sm:inline">
            El sistema generará la petición de compra formal para el proyecto <strong>{selectedProject?.code}</strong>.
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold cursor-pointer text-xs"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleCreateRequisitionFromBOM}
              disabled={itemsToPurchase.length === 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 text-xs"
            >
              <FileCheck2 size={15} />
              <span>Crear Petición de Compra del Proyecto ({itemsToPurchase.length})</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

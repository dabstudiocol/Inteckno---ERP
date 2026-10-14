import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  ShoppingCart,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Product } from '../../../types';
import { extractBOMFromPdfWithLuciana, BOMExtractionResult } from '../../../core/services/lucianaService';

interface BomExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onCreateRequisition?: (reqData: any) => void;
}

export const BomExtractorModal: React.FC<BomExtractorModalProps> = ({
  isOpen,
  onClose,
  products,
  onCreateRequisition,
}) => {
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileMimeType, setFileMimeType] = useState('application/pdf');
  const [isExtracting, setIsExtracting] = useState(false);
  const [bomResult, setBomResult] = useState<BOMExtractionResult | null>(null);
  const [reqCreatedSuccess, setReqCreatedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileMimeType(file.type || 'application/pdf');

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleStartExtraction = async () => {
    if (!fileBase64) return;
    setIsExtracting(true);
    setBomResult(null);

    try {
      const res = await extractBOMFromPdfWithLuciana(fileBase64, fileMimeType, products);
      setBomResult(res);
    } catch (err) {
      console.warn('Error extrayendo BOM:', err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCreateAutoRequisition = () => {
    if (!bomResult || !onCreateRequisition) return;

    const missingItems = bomResult.extractedItems.filter((it) => it.missingQuantity > 0);
    onCreateRequisition({
      projectId: 'PRJ-01',
      projectCode: bomResult.projectCodeSuggested || 'PRJ-2026-MED-K',
      projectName: bomResult.projectNameSuggested || 'Mantenimiento Mayor STC',
      items: missingItems.map((it) => ({
        id: `bom-${Date.now()}-${it.skuSuggested}`,
        productId: it.matchedProductId || it.skuSuggested,
        productSku: it.skuSuggested,
        productName: it.name,
        qtyRequested: it.missingQuantity,
        unit: it.unit,
        estimatedCostUSD: it.unitCostEstimatedUSD,
      })),
      notes: `Requisición generada automáticamente desde lista de materiales BOM (${fileName}) analizada por LUC-IA-NA.`,
    });

    setReqCreatedSuccess(true);
    setTimeout(() => {
      setReqCreatedSuccess(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 text-[#00668F]">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Extractor Inteligente de Lista de Materiales y Repuestos (BOM) con LUC-IA-NA
              </h3>
              <p className="text-[11px] text-gray-500">
                Lectura de planos, listas de despiece de teleféricos y generación automática de requisiciones
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          {/* Subida de archivo */}
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
            <UploadCloud size={32} className="mx-auto text-[#00668F] mb-2" />
            <p className="font-bold text-gray-700 text-sm">
              Arrastra o selecciona el documento PDF o imagen técnica
            </p>
            <p className="text-gray-400 text-xs mt-1">
              Soporta PDFs de despiece, facturas de SKF/Doppelmayr o planos escaneados
            </p>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg"
              onChange={handleFileUpload}
              className="mt-3 text-xs text-gray-600 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-[#00668F] file:text-white file:font-bold file:cursor-pointer"
            />
            {fileName && (
              <p className="mt-2 text-xs text-emerald-700 font-bold">
                ✓ Archivo cargado: {fileName}
              </p>
            )}
          </div>

          {fileBase64 && !bomResult && !isExtracting && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={handleStartExtraction}
                className="px-6 py-2.5 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Sparkles size={16} className="text-amber-300" />
                <span>Analizar y Extraer Lista de Materiales con LUC-IA-NA</span>
              </button>
            </div>
          )}

          {isExtracting && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-3 border-[#00668F] border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-gray-800 text-sm">
                LUC-IA-NA está analizando el documento con visión multimodal...
              </p>
              <p className="text-gray-400 text-xs max-w-sm">
                Identificando números de parte, cotejando con existencias en bodega y calculando faltantes.
              </p>
            </div>
          )}

          {bomResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-amber-950 space-y-1">
                <span className="font-bold text-[11px] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-700" /> Diagnóstico de LUC-IA-NA:
                </span>
                <p className="text-xs leading-relaxed">{bomResult.lucianaAnalysis}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-gray-400 block font-medium">Ítems Extraídos</span>
                  <span className="font-black text-lg text-gray-900">{bomResult.totalItems}</span>
                </div>
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <span className="text-[10px] text-rose-700 block font-medium">Faltantes Requeridos</span>
                  <span className="font-black text-lg text-rose-800">{bomResult.totalMissingItems}</span>
                </div>
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-100">
                  <span className="text-[10px] text-[#00668F] block font-medium">Costo Total Estimado</span>
                  <span className="font-black text-lg text-[#00668F]">
                    ${bomResult.totalEstimatedCostUSD.toLocaleString()} USD
                  </span>
                </div>
              </div>

              {/* Tabla de ítems desglosados */}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-slate-50 p-2.5 font-bold text-gray-600 text-[11px] grid grid-cols-12 gap-2">
                  <div className="col-span-4">Código / Repuesto Identificado</div>
                  <div className="col-span-2 text-center">Requerido</div>
                  <div className="col-span-2 text-center">Existencias en Bodega</div>
                  <div className="col-span-2 text-center">Faltante</div>
                  <div className="col-span-2 text-right">Subtotal USD</div>
                </div>

                <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {bomResult.extractedItems.map((item, idx) => (
                    <div key={idx} className="p-2.5 grid grid-cols-12 gap-2 items-center hover:bg-slate-50 text-[11px]">
                      <div className="col-span-4">
                        <span className="font-mono font-bold text-[#00668F] block">{item.skuSuggested}</span>
                        <span className="text-gray-800 font-medium truncate block">{item.name}</span>
                      </div>
                      <div className="col-span-2 text-center font-bold text-gray-700">
                        {item.quantityRequired} {item.unit}
                      </div>
                      <div className="col-span-2 text-center font-mono text-gray-600">
                        {item.availableInErpStock} {item.unit}
                      </div>
                      <div className="col-span-2 text-center">
                        {item.missingQuantity > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                            Faltan {item.missingQuantity}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Cubierto
                          </span>
                        )}
                      </div>
                      <div className="col-span-2 text-right font-mono font-bold text-gray-900">
                        ${item.totalCostUSD.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {reqCreatedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>¡Requisición de compra creada con éxito en el ERP!</span>
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-200/60 cursor-pointer"
          >
            Cerrar
          </button>

          {bomResult && bomResult.totalMissingItems > 0 && onCreateRequisition && (
            <button
              type="button"
              onClick={handleCreateAutoRequisition}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <ShoppingCart size={14} />
              <span>Generar Requisición de Compra ({bomResult.totalMissingItems} ítems)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

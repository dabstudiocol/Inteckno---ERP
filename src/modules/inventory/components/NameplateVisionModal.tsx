import React, { useState } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Product, EquipmentTool } from '../../../types';
import { identifyNameplateWithLuciana, NameplateVisionResult } from '../../../core/services/lucianaService';

interface NameplateVisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  equipment: EquipmentTool[];
  onSelectProductOrEquipment?: (item: any) => void;
}

export const NameplateVisionModal: React.FC<NameplateVisionModalProps> = ({
  isOpen,
  onClose,
  products,
  equipment,
  onSelectProductOrEquipment,
}) => {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [visionResult, setVisionResult] = useState<NameplateVisionResult | null>(null);

  if (!isOpen) return null;

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      setImageBase64(res);
      setImagePreview(res);
      setVisionResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleScanNameplate = async () => {
    if (!imageBase64) return;
    setIsScanning(true);
    setVisionResult(null);

    try {
      const res = await identifyNameplateWithLuciana(imageBase64, products, equipment);
      setVisionResult(res);
    } catch (err) {
      console.warn('Error en escaneo de placa:', err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Lectura Óptica de Placas de Fabricante (Visión Artificial)
              </h3>
              <p className="text-[11px] text-gray-500">
                Identificación de seriales, fabricantes y repuestos equivalentes con Asistencia LUC-IA-NA
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
          {/* Captura / Subida */}
          <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100/60 transition-colors">
            {imagePreview ? (
              <div className="space-y-3">
                <img
                  src={imagePreview}
                  alt="Placa Capturada"
                  className="max-h-48 mx-auto rounded-xl object-contain shadow-xs border border-gray-200"
                />
                <div className="flex items-center justify-center gap-3">
                  <label className="text-xs font-bold text-[#00668F] hover:underline cursor-pointer">
                    Tomar otra foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageCapture}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Camera size={36} className="mx-auto text-purple-600" />
                <p className="font-bold text-gray-700 text-sm">
                  Captura o sube la fotografía de la placa técnica del equipo
                </p>
                <p className="text-gray-400 text-xs">
                  Alinea la imagen para que el número de serie y fabricante sean legibles
                </p>
                <label className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold cursor-pointer">
                  <Camera size={14} />
                  <span>Fotografiar Placa</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageCapture}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {imagePreview && !visionResult && !isScanning && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={handleScanNameplate}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold inline-flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Sparkles size={16} className="text-amber-300" />
                <span>Identificar Serial y Repuestos Compatibles</span>
              </button>
            </div>
          )}

          {isScanning && (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-gray-800 text-sm">
                Procesando imagen con modelo de Visión de Gemini...
              </p>
              <p className="text-gray-400 text-xs max-w-sm">
                Extrayendo grabados industriales, modelo y especificaciones de torque o calibración.
              </p>
            </div>
          )}

          {visionResult && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl text-purple-950 space-y-1">
                <span className="font-bold text-[11px] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-purple-700" /> Veredicto de Identificación:
                </span>
                <p className="text-xs leading-relaxed">{visionResult.lucianaVerdict}</p>
              </div>

              {/* Ficha técnica extraída */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Serial Extraído</span>
                  <span className="font-mono font-bold text-gray-900">{visionResult.serialNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Fabricante</span>
                  <span className="font-bold text-gray-900">{visionResult.manufacturer}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Código / Modelo</span>
                  <span className="font-mono text-gray-800">{visionResult.modelCode}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-medium">Confianza IA</span>
                  <span className="font-black text-emerald-700">{visionResult.confidenceScorePct}%</span>
                </div>
              </div>

              {visionResult.technicalSpecs && (
                <div className="p-2.5 bg-white rounded-xl border border-gray-200 text-gray-700">
                  <span className="font-bold text-gray-900 block mb-0.5">Especificaciones Detectadas:</span>
                  <p className="text-[11px] leading-relaxed">{visionResult.technicalSpecs}</p>
                </div>
              )}

              {/* Registro coincidente en ERP */}
              {visionResult.matchedEquipmentOrProduct && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                      Elemento Registrado en Base de Datos
                    </span>
                    <span className="font-mono font-bold text-xs text-gray-900">
                      {visionResult.matchedEquipmentOrProduct.sku}
                    </span>
                    <p className="font-bold text-emerald-950 text-xs">
                      {visionResult.matchedEquipmentOrProduct.name}
                    </p>
                  </div>
                  {visionResult.matchedEquipmentOrProduct.calibrationExpiry && (
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500 block">Vencimiento Calibración</span>
                      <span className="font-mono font-bold text-xs text-gray-800">
                        {visionResult.matchedEquipmentOrProduct.calibrationExpiry}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Repuestos Gemelos / Twin Parts */}
              {visionResult.twinPartsSuggested.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-xs">
                    Repuestos Sustitutos o Compatibles (Twin Parts):
                  </h4>
                  <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                    {visionResult.twinPartsSuggested.map((twin, idx) => (
                      <div key={idx} className="p-2.5 bg-white hover:bg-slate-50 flex items-center justify-between gap-3">
                        <div>
                          <span className="font-mono font-bold text-[#00668F] text-xs mr-2">{twin.sku}</span>
                          <span className="font-bold text-gray-800">{twin.name}</span>
                          <p className="text-[10px] text-gray-500 mt-0.5">{twin.compatibilityReason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end px-5 py-3.5 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-200/60 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

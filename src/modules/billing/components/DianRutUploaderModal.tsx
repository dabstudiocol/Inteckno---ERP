import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building,
  MapPin,
  Mail,
  ShieldCheck,
  Zap,
  Sparkles,
  FileCheck,
  Tag,
  ArrowRight,
} from 'lucide-react';
import { DianRutData } from '../../../types';
import {
  parseRutFileWithAi,
  SAMPLE_RUTS,
  DIAN_RESPONSIBILITIES_CATALOG,
  CIIU_CATALOG,
  isValidNitWithDv,
} from '../services/dianRutParserService';

interface DianRutUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData?: (rutData: DianRutData) => void;
}

export const DianRutUploaderModal: React.FC<DianRutUploaderModalProps> = ({
  isOpen,
  onClose,
  onApplyData,
}) => {
  const sampleList = Object.values(SAMPLE_RUTS);
  const [extractedData, setExtractedData] = useState<DianRutData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const resultStr = reader.result as string;
          const base64String = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
          const data = await parseRutFileWithAi(base64String, file.type || 'application/pdf');
          setExtractedData(data);
        } catch (err) {
          console.error('Error en parseRutFileWithAi', err);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.onerror = () => {
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error al procesar RUT', err);
      setIsProcessing(false);
    }
  };

  const handleSelectSample = (sample: DianRutData) => {
    setExtractedData(sample);
  };

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const isDvValid = extractedData ? isValidNitWithDv(extractedData.nit, extractedData.dv) : false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-blue-50 text-[#00668F]">
                <Zap size={20} className="animate-pulse" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Cero Digitación & Lector Inteligente de RUT DIAN
                </h2>
                <p className="text-xs text-gray-500">
                  Extracción óptica asistida por IA, cálculo automático Módulo 11 (DV) y parametrización de Casilla 53
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors shrink-0 aspect-square cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Zona de Subida y Ejemplos Rápidos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-sky-300 rounded-2xl bg-sky-50/40 hover:bg-sky-50/70 transition-all cursor-pointer group">
              <UploadCloud size={32} className="text-[#00668F] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-gray-800">
                {isProcessing ? 'Procesando RUT con IA...' : 'Arrastra o haz clic para subir archivo RUT (PDF o Imagen)'}
              </span>
              <span className="text-[11px] text-gray-500 mt-1">
                La IA identifica casillas 5, 24, 31, 35, 41, 42, 46 y 53 sin errores humanos
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                disabled={isProcessing}
                className="hidden"
              />
            </label>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-600 block mb-2 uppercase tracking-wider">
                🧪 Probar con RUTs de Prueba:
              </span>
              <div className="space-y-1.5">
                {sampleList.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSample(s)}
                    className={`w-full text-left p-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                      extractedData?.nit === s.nit
                        ? 'bg-[#00668F] text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    <span className="truncate pr-2">{s.razonSocial || `${s.primerNombre} ${s.primerApellido}`}</span>
                    <span className="text-[10px] shrink-0 opacity-80">{s.tipoPersona === 'juridica' ? 'PJ' : 'PN'}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 mt-2">
              💡 Incluye un proveedor no obligado (R-99-PN) para probar Documento Soporte.
            </div>
          </div>
        </div>

        {/* Ficha de Información Extraída */}
        {extractedData && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-4 shadow-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 text-[10px] font-bold uppercase tracking-wider border border-sky-400/30">
                      Casilla 24: Persona {extractedData.tipoPersona.toUpperCase()}
                    </span>
                    <span className="text-slate-400 text-xs">Formulario 001 DIAN</span>
                  </div>
                  <h3 className="text-base font-extrabold text-white mt-1">
                    {extractedData.razonSocial || `${extractedData.primerNombre || ''} ${extractedData.otrosNombres || ''} ${extractedData.primerApellido || ''} ${extractedData.segundoApellido || ''}`.trim()}
                  </h3>
                  {extractedData.nombreComercial && (
                    <p className="text-xs text-slate-300 italic">"{extractedData.nombreComercial}"</p>
                  )}
                </div>

                <div className="flex items-center gap-2 bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">NIT (Casilla 31-32)</span>
                    <span className="text-sm font-black text-amber-400">
                      {extractedData.nit}-{extractedData.dv}
                    </span>
                  </div>
                  <div className="ml-2 pl-2 border-l border-slate-700">
                    {isDvValid ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400" title="Validado con Módulo 11 oficial de la DIAN">
                        <ShieldCheck size={16} /> Módulo 11 OK
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400" title="El dígito no coincide con el algoritmo DIAN">
                        <AlertCircle size={16} /> DV Inválido
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid de Datos Clave */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Ubicación (Casilla 39-40)</span>
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#00668F]" />
                  {extractedData.municipio || 'Medellín'} ({extractedData.departamento || 'Antioquia'})
                </p>
                <p className="text-[11px] text-gray-500 truncate" title={extractedData.direccion}>
                  {extractedData.direccion || 'Dirección no especificada'}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Contacto Electrónico (Casilla 42)</span>
                <p className="font-semibold text-gray-800 flex items-center gap-1.5 truncate">
                  <Mail size={13} className="text-[#00668F]" />
                  {extractedData.correoFacturacionElectronica || 'Sin correo en RUT'}
                </p>
                <p className="text-[11px] text-gray-500">Tel: {extractedData.telefono || 'N/A'}</p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Actividad CIIU (Casilla 46)</span>
                <p className="font-semibold text-gray-800 flex items-center gap-1.5">
                  <Tag size={13} className="text-[#00668F]" />
                  Código {extractedData.actividadPrincipal?.code || '3312'}
                </p>
                <p className="text-[11px] text-gray-500 truncate" title={extractedData.actividadPrincipal?.description}>
                  {extractedData.actividadPrincipal?.description || 'Mantenimiento industrial'}
                </p>
              </div>

              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Tarifa Sugerida ReteICA</span>
                <p className="font-bold text-emerald-700 text-sm">
                  {((extractedData.tarifaReteICA || 0.007) * 1000).toFixed(1)} x mil
                </p>
                <p className="text-[11px] text-gray-500">Base DANE: {extractedData.municipioCodeDANE || '05001'}</p>
              </div>
            </div>

            {/* Casilla 53: Responsabilidades Tributarias */}
            <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={16} className="text-[#F39200]" />
                  <span className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                    Casilla 53: Responsabilidades Fiscales Detectadas ({extractedData.responsabilidades.length})
                  </span>
                </div>
                <span className="text-[11px] text-amber-800 font-medium">
                  {extractedData.responsabilidades.some((r) => r.code === 'R-99-PN')
                    ? '⚠️ Sujeto NO obligado a facturar → Requiere Documento Soporte (DSE)'
                    : '✅ Sujeto obligado a expedir Factura Electrónica (FEV)'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {extractedData.responsabilidades.map((resp) => (
                  <div
                    key={resp.code}
                    className="p-2.5 bg-white rounded-xl border border-amber-200 shadow-2xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-900 font-extrabold text-[11px]">
                        {resp.code}
                      </span>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">
                        {resp.code === 'O-13' ? 'Gran Contribuyente' : resp.code === 'O-47' ? 'Simple' : 'Estatuto'}
                      </span>
                    </div>
                    <p className="font-bold text-gray-800 text-xs">{resp.name}</p>
                    <p className="text-[10px] text-gray-500 leading-tight">{resp.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <Sparkles size={14} className="text-amber-500" />
            <span>0% errores de digitación en NIF, DV y casillas fiscales garantizados</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 text-xs"
            >
              Cerrar
            </button>
            {extractedData && onApplyData && (
              <button
                type="button"
                onClick={() => {
                  onApplyData(extractedData);
                  onClose();
                }}
                className="px-5 py-2 rounded-full bg-[#00668F] hover:bg-[#005073] text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              >
                <span>Aplicar a Tercero en ERP</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

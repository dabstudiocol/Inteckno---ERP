import React, { useState } from 'react';
import {
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  FileSpreadsheet,
  Calendar,
  Building,
  MapPin,
  Shield,
  Layers,
  ExternalLink,
  ChevronRight,
  HardDrive,
  Cloud,
} from 'lucide-react';
import {
  analyzeDocumentWithGemini,
  ExtractedDocumentAnalysis,
} from '../../core/services/aiDocumentService';
import { getGeminiApiKey } from '../../core/services/geminiChatService';
import { CreatableSelect } from '../common/CreatableSelect';

export type AiDocType = 'factura_cotizacion' | 'cedula_sst' | 'tecnico_stc' | 'ecm_general';

interface AiDocumentUploaderProps {
  docType?: AiDocType;
  onExtracted: (data: any) => void;
  title?: string;
  description?: string;
  contextProjectCode?: string;
  contextFolderName?: string;
  buttonLabel?: string;
  className?: string;
}

export const AiDocumentUploader: React.FC<AiDocumentUploaderProps> = ({
  docType = 'ecm_general',
  onExtracted,
  title = 'Carga Inteligente de Documentos con Gemini AI',
  description = 'Procesamiento multimodal nativo: extrae metadatos técnicos, detecta vencimientos y clasifica automáticamente.',
  contextProjectCode,
  contextFolderName,
  buttonLabel = 'Subir Documento (Auto-llenar con IA)',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [extractedAnalysis, setExtractedAnalysis] = useState<ExtractedDocumentAnalysis | null>(null);
  const [storageDestination, setStorageDestination] = useState<'firebase_storage' | 'sharepoint_m365'>('sharepoint_m365');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Campos editables en la pantalla de confirmación previa
  const [editedTitle, setEditedTitle] = useState('');
  const [editedCategory, setEditedCategory] = useState<string>('manuales_stc');
  const [editedDepartment, setEditedDepartment] = useState<string>('Operaciones');
  const [editedExpiration, setEditedExpiration] = useState<string>('');
  const [editedEntity, setEditedEntity] = useState<string>('');
  const [editedLocation, setEditedLocation] = useState<string>('');
  const [editedComponent, setEditedComponent] = useState<string>('');

  const handleProcessFile = async (file: File) => {
    setFileSelected(file);
    setIsProcessing(true);
    setErrorMessage(null);
    setExtractedAnalysis(null);
    setProcessingStep('Iniciando lectura y conversión de archivo...');

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setIsProcessing(false);
      setErrorMessage(
        'No hay API Key de Gemini configurada. Ingresa tu clave en la Consola TI o en variables de entorno.'
      );
      return;
    }

    try {
      setProcessingStep('Enviando a Google AI Studio (Gemini Flash Multimodal)...');
      const result = await analyzeDocumentWithGemini(file, {
        contextProjectCode,
        contextFolderName,
      });

      setExtractedAnalysis(result);
      setEditedTitle(result.title);
      setEditedCategory(result.category);
      setEditedDepartment(result.department);
      setEditedExpiration(result.expirationDate || '');
      setEditedEntity(result.issuingEntity || '');
      setEditedLocation(result.locationTower || '');
      setEditedComponent(result.equipmentComponent || '');
    } catch (err: any) {
      console.error('Error al procesar archivo con Gemini:', err);
      setErrorMessage(
        err.message || 'Error al conectar con Google Gemini. Verifica tu conexión y API Key.'
      );
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  const handleApply = () => {
    if (!extractedAnalysis || !fileSelected) return;

    // Adaptar salida según el docType solicitado
    if (docType === 'factura_cotizacion') {
      const payload = {
        supplierName: editedEntity || extractedAnalysis.issuingEntity || 'Proveedor Técnico',
        taxId: extractedAnalysis.consecutiveCode || 'NIT Pendiente',
        documentNumber: extractedAnalysis.consecutiveCode || `FAC-${Date.now()}`,
        date: extractedAnalysis.issuanceDate || new Date().toISOString().split('T')[0],
        currency: 'USD',
        totalAmountUSD: 0,
        totalAmountCOP: 0,
        items: [],
        notes: extractedAnalysis.summary,
        file: fileSelected,
        storageDestination,
      };
      onExtracted(payload);
    } else if (docType === 'cedula_sst') {
      const payload = {
        name: extractedAnalysis.title,
        documentId: extractedAnalysis.consecutiveCode || 'C.C.',
        role: extractedAnalysis.equipmentComponent || 'Técnico Especialista',
        department: editedDepartment,
        heightCertExpiry: editedExpiration,
        heightCertStatus: extractedAnalysis.status,
        medicalExamExpiry: editedExpiration,
        medicalExamStatus: extractedAnalysis.status,
        emergencyContact: '',
        emergencyPhone: '',
        file: fileSelected,
        storageDestination,
      };
      onExtracted(payload);
    } else {
      // Documento Técnico ECM General
      const payload = {
        file: fileSelected,
        title: editedTitle,
        category: editedCategory,
        categoryLabel: extractedAnalysis.categoryLabel,
        department: editedDepartment,
        projectCode: extractedAnalysis.projectCode || contextProjectCode,
        projectName: extractedAnalysis.projectName,
        folderName: contextFolderName,
        fileSize: `${(fileSelected.size / (1024 * 1024)).toFixed(1)} MB`,
        fileType: fileSelected.name.split('.').pop()?.toUpperCase() || 'DOC',
        source: storageDestination,
        status: extractedAnalysis.status,
        version: 'Rev. 0',
        description: extractedAnalysis.summary,
        aiExtraction: {
          summary: extractedAnalysis.summary,
          bullets: extractedAnalysis.bullets,
          expirationDate: editedExpiration || undefined,
          issuingEntity: editedEntity || undefined,
          equipmentComponent: editedComponent || undefined,
          locationTower: editedLocation || undefined,
          consecutiveCode: extractedAnalysis.consecutiveCode || undefined,
          keyMetrics: extractedAnalysis.keyMetrics,
          confidenceScore: extractedAnalysis.confidenceScore,
          processedAt: new Date().toISOString(),
          modelUsed: extractedAnalysis.modelUsed,
        },
        linkedEntities: {
          projectId: extractedAnalysis.projectCode || contextProjectCode,
          systemId: editedLocation || undefined,
        },
      };
      onExtracted(payload);
    }

    setIsOpen(false);
    setFileSelected(null);
    setExtractedAnalysis(null);
  };

  const getExpirationBadge = () => {
    if (!editedExpiration) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
          Sin Vencimiento
        </span>
      );
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(editedExpiration);
    exp.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-bold flex items-center gap-1">
          <AlertCircle size={10} />
          Vencido hace {Math.abs(diffDays)} días
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center gap-1">
          <AlertCircle size={10} />
          Vence en {diffDays} días
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
        <CheckCircle2 size={10} />
        Vigente ({diffDays} días)
      </span>
    );
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={
          className ||
          'px-3.5 py-2 rounded-xl text-xs font-bold bg-[#00668F] hover:bg-[#005073] text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md active:scale-95'
        }
      >
        <Sparkles size={15} className="text-amber-300 animate-pulse" />
        <span>{buttonLabel}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-[#00668F] dark:text-sky-400 flex items-center justify-center shrink-0 border border-sky-100 dark:border-sky-900">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{title}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#00668F]/10 text-[#00668F] dark:text-sky-400 font-mono font-bold">
                      Gemini Flash Multimodal
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setFileSelected(null);
                  setExtractedAnalysis(null);
                  setErrorMessage(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            {/* Error banner si falló la API */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Error en el análisis de IA</div>
                  <div>{errorMessage}</div>
                </div>
              </div>
            )}

            {/* Zona Drag & Drop / Input File */}
            {!fileSelected && (
              <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-[#00668F] dark:hover:border-sky-500 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 group-hover:bg-[#00668F]/10 text-slate-500 group-hover:text-[#00668F] dark:group-hover:text-sky-400 flex items-center justify-center mb-3 transition-colors shadow-2xs">
                  <UploadCloud size={28} />
                </div>
                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Selecciona o arrastra el documento técnico
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center max-w-md">
                  Gemini analiza directamente PDFs de ingeniería, certificados de calibración END,
                  planos CAD/DWG, hojas Excel de inspección y fotos de placas en campo.
                </p>
                <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                  <span>PDF</span>•<span>PNG/JPG</span>•<span>XLSX</span>•<span>DOCX</span>•<span>XML DIAN</span>
                </div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.xml,.csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessFile(file);
                  }}
                />
              </label>
            )}

            {/* Estado de Procesamiento IA Real */}
            {isProcessing && (
              <div className="p-8 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/50 text-center space-y-3">
                <RefreshCw size={32} className="text-[#00668F] dark:text-sky-400 animate-spin mx-auto" />
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  Analizando documento con Google Gemini Multimodal...
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                  {processingStep}
                </p>
                <p className="text-[11px] text-slate-400">
                  Extrayendo especificaciones STC, fabricante, vigencias, tablas técnicas y componentes electromecánicos.
                </p>
              </div>
            )}

            {/* Resultado de la Extracción */}
            {extractedAnalysis && !isProcessing && (
              <div className="space-y-4 animate-in fade-in duration-200">
                {/* Banner de confianza */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-300">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Lectura Real con Gemini Completada: {fileSelected?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 font-extrabold font-mono">
                      Confianza {extractedAnalysis.confidenceScore}%
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200 font-mono">
                      {extractedAnalysis.modelUsed}
                    </span>
                  </div>
                </div>

                {/* Selección de Almacenamiento Híbrido */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>Destino de Almacenamiento Híbrido:</span>
                    <span className="text-[11px] text-[#00668F] dark:text-sky-400 font-medium">
                      {storageDestination === 'sharepoint_m365' ? 'Microsoft SharePoint / OneDrive' : 'Firebase Storage Seguro'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setStorageDestination('sharepoint_m365')}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                        storageDestination === 'sharepoint_m365'
                          ? 'border-[#00668F] bg-sky-50/60 dark:bg-sky-950/40 text-[#00668F] dark:text-sky-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Cloud size={16} className="text-[#0078D4] shrink-0" />
                      <div>
                        <div>SharePoint Online (M365)</div>
                        <div className="text-[10px] font-normal opacity-70">Edición en Office Web y Teams</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStorageDestination('firebase_storage')}
                      className={`p-2.5 rounded-xl border flex items-center gap-2 text-left transition-all cursor-pointer ${
                        storageDestination === 'firebase_storage'
                          ? 'border-[#00668F] bg-sky-50/60 dark:bg-sky-950/40 text-[#00668F] dark:text-sky-300 font-bold'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <HardDrive size={16} className="text-amber-500 shrink-0" />
                      <div>
                        <div>Almacenamiento Local / Firebase</div>
                        <div className="text-[10px] font-normal opacity-70">Copia cifrada en servidor ERP</div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Formulario de revisión previa rápida */}
                <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-xs">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between pb-1">
                    <span>Revisión de Metadatos Extraídos:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Vigencia:</span>
                      {getExpirationBadge()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                      Título Técnico Normalizado:
                    </label>
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium text-xs focus:ring-2 focus:ring-[#00668F] outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Categoría Documental:
                      </label>
                      <CreatableSelect
                        value={
                          editedCategory === 'planos' ? 'Planos y Diagramas Unifilares/CAD' :
                          editedCategory === 'certificados_hseq' ? 'Certificados Calibración END / Alturas (HSEQ)' :
                          editedCategory === 'manuales_stc' ? 'Manuales de Fabricante / Fichas STC' :
                          editedCategory === 'actas_contratos' ? 'Actas, Contratos y Facturas' :
                          editedCategory === 'procedimientos' ? 'Procedimientos de Montaje y Desmonte' :
                          editedCategory === 'pliegos_licitacion' ? 'Pliegos de Licitación y Contratación' :
                          editedCategory
                        }
                        onChange={(val) => {
                          if (val.includes('Planos')) setEditedCategory('planos');
                          else if (val.includes('Certificados')) setEditedCategory('certificados_hseq');
                          else if (val.includes('Manuales')) setEditedCategory('manuales_stc');
                          else if (val.includes('Actas')) setEditedCategory('actas_contratos');
                          else if (val.includes('Procedimientos')) setEditedCategory('procedimientos');
                          else if (val.includes('Pliegos')) setEditedCategory('pliegos_licitacion');
                          else setEditedCategory(val);
                        }}
                        options={[
                          'Planos y Diagramas Unifilares/CAD',
                          'Certificados Calibración END / Alturas (HSEQ)',
                          'Manuales de Fabricante / Fichas STC',
                          'Actas, Contratos y Facturas',
                          'Procedimientos de Montaje y Desmonte',
                          'Pliegos de Licitación y Contratación',
                        ]}
                        placeholder="Categoría..."
                        allowCustomText={true}
                        isClearable={false}
                        inputClassName="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Área Responsable:
                      </label>
                      <CreatableSelect
                        value={
                          editedDepartment === 'Operaciones' ? 'Operaciones & Mantenimiento' :
                          editedDepartment === 'HSEQ' ? 'HSEQ & Seguridad' :
                          editedDepartment === 'Ingeniería' ? 'Ingeniería & Proyectos' :
                          editedDepartment === 'Comercial' ? 'Comercial & Licitaciones' :
                          editedDepartment === 'Administración' ? 'Administración & Finanzas' :
                          editedDepartment === 'Sistemas' ? 'Sistemas & TI' :
                          editedDepartment
                        }
                        onChange={(val) => {
                          if (val.includes('Operaciones')) setEditedDepartment('Operaciones');
                          else if (val.includes('HSEQ')) setEditedDepartment('HSEQ');
                          else if (val.includes('Ingeniería')) setEditedDepartment('Ingeniería');
                          else if (val.includes('Comercial')) setEditedDepartment('Comercial');
                          else if (val.includes('Administración')) setEditedDepartment('Administración');
                          else if (val.includes('Sistemas')) setEditedDepartment('Sistemas');
                          else setEditedDepartment(val);
                        }}
                        options={[
                          'Operaciones & Mantenimiento',
                          'HSEQ & Seguridad',
                          'Ingeniería & Proyectos',
                          'Comercial & Licitaciones',
                          'Administración & Finanzas',
                          'Sistemas & TI',
                        ]}
                        placeholder="Área..."
                        allowCustomText={true}
                        isClearable={false}
                        inputClassName="w-full px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500">Fecha Vencimiento:</label>
                      <input
                        type="date"
                        value={editedExpiration}
                        onChange={(e) => setEditedExpiration(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500">Emisor / Fabricante:</label>
                      <input
                        type="text"
                        placeholder="Doppelmayr, Poma, SGS..."
                        value={editedEntity}
                        onChange={(e) => setEditedEntity(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500">Pilona / Estación:</label>
                      <input
                        type="text"
                        placeholder="Pilona 4, Motriz..."
                        value={editedLocation}
                        onChange={(e) => setEditedLocation(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-medium text-slate-500">Componente STC:</label>
                      <input
                        type="text"
                        placeholder="Mordaza, Rodillo..."
                        value={editedComponent}
                        onChange={(e) => setEditedComponent(e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>

                  {/* Resumen ejecutivo de Gemini */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                      Resumen Ejecutivo Extraído:
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic bg-white/70 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                      "{extractedAnalysis.summary}"
                    </p>
                    {extractedAnalysis.bullets && extractedAnalysis.bullets.length > 0 && (
                      <ul className="list-disc pl-4 text-[11px] text-slate-600 dark:text-slate-400 space-y-0.5 pt-1">
                        {extractedAnalysis.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Si hay métricas tabulares (Excel) */}
                  {extractedAnalysis.keyMetrics && extractedAnalysis.keyMetrics.length > 0 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileSpreadsheet size={13} className="text-emerald-600" />
                        <span>Métricas de Inspección Técnica Tabular (Excel):</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {extractedAnalysis.keyMetrics.map((m, idx) => (
                          <div
                            key={idx}
                            className={`p-2 rounded-xl border text-[11px] ${
                              m.status === 'critico'
                                ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 font-bold'
                                : m.status === 'alerta'
                                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 font-bold'
                                : 'bg-slate-100/80 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {m.label}
                            </div>
                            <div className="font-mono text-xs mt-0.5">{m.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFileSelected(null);
                      setExtractedAnalysis(null);
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    Subir otro documento
                  </button>
                  <button
                    type="button"
                    onClick={handleApply}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00668F] text-white hover:bg-[#005073] shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <CheckCircle2 size={16} />
                    <span>Confirmar y Guardar en Repositorio</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

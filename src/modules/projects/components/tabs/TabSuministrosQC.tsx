import React, { useState } from 'react';
import {
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
  Calendar,
  Radio,
  FileCheck2,
  Search,
  Clock,
  Info
} from 'lucide-react';
import { Project } from '../../../../types';
import { CriticalSparePart, InspectionEquipment } from '../../../../types/ProjectSchema';
import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';
import { DetailModal } from '../../../../components/common/DetailModal';

interface TabSuministrosQCProps {
  project: Project;
  onUpdateProject?: (updates: Partial<Project>) => void;
}

export const TabSuministrosQC: React.FC<TabSuministrosQCProps> = ({ project, onUpdateProject }) => {
  // Lista de Repuestos Críticos
  const [criticalSpares, setCriticalSpares] = useState<CriticalSparePart[]>(() => {
    return (project as any).criticalSpares || [];
  });

  // Lista de Equipos de Inspección (MRT, UT, etc.)
  const [inspectionEquipment, setInspectionEquipment] = useState<InspectionEquipment[]>(() => {
    return (project as any).inspectionEquipment || [];
  });

  // Modales
  const [isSpareModalOpen, setIsSpareModalOpen] = useState(false);
  const [isEquipModalOpen, setIsEquipModalOpen] = useState(false);
  const [selectedPdfPreview, setSelectedPdfPreview] = useState<{ name: string; url: string } | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const [spareToDelete, setSpareToDelete] = useState<CriticalSparePart | null>(null);
  const [equipToDelete, setEquipToDelete] = useState<InspectionEquipment | null>(null);
  const [detailSpare, setDetailSpare] = useState<CriticalSparePart | null>(null);
  const [detailEquip, setDetailEquip] = useState<InspectionEquipment | null>(null);

  // Formulario Repuesto Crítico
  const [spareForm, setSpareForm] = useState({
    partCode: '',
    name: '',
    category: 'rodamientos' as CriticalSparePart['category'],
    quantityReceived: 1,
    supplier: '',
    batchNumber: '',
    verifiedBy: project.supervisorName || 'Inspector QC',
    certificatePdf: null as File | null,
    certificateUrl: '',
    certificateNumber: '',
  });

  // Formulario Equipo de Inspección
  const [equipForm, setEquipForm] = useState({
    equipmentName: 'Equipo Magneto-inductivo MRT de Cables',
    serialNumber: '',
    brand: 'Intron Plus / DMT',
    model: 'MH-60',
    calibrationDate: new Date().toISOString().split('T')[0],
    calibrationExpiryDate: '',
    laboratoryName: 'Laboratorio de Metrología y Calibración Acreditado',
    certificatePdf: null as File | null,
  });

  // Helper para verificar estado de calibración
  const getCalibrationStatus = (expiryDateStr: string): { status: 'calibrado' | 'por_vencer' | 'vencido'; label: string; badgeClass: string } => {
    if (!expiryDateStr) {
      return { status: 'vencido', label: 'Sin Calibración', badgeClass: 'bg-red-50 text-red-700 border-red-200' };
    }
    const expiry = new Date(expiryDateStr).getTime();
    const now = Date.now();
    const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { 
        status: 'vencido', 
        label: `CALIBRACIÓN VENCIDA (${Math.abs(diffDays)}d)`, 
        badgeClass: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-300 font-bold' 
      };
    } else if (diffDays <= 30) {
      return { 
        status: 'por_vencer', 
        label: `Por vencer (${diffDays} días)`, 
        badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300' 
      };
    } else {
      return { 
        status: 'calibrado', 
        label: `Calibración Vigente (${diffDays}d)`, 
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300' 
      };
    }
  };

  // Guardar Repuesto Crítico
  const handleSaveSpare = (e: React.FormEvent) => {
    e.preventDefault();

    // REGLA DE NEGOCIO ESTRICTA: El certificado de calidad es obligatorio
    if (!spareForm.certificatePdf && !spareForm.certificateUrl) {
      setMsg({ 
        text: 'Regla de Negocio: Es OBLIGATORIO adjuntar el Certificado de Calidad en PDF para repuestos críticos (Rodamientos, Guarniciones, Mordazas).', 
        type: 'error' 
      });
      return;
    }

    const certUrl = spareForm.certificatePdf
      ? URL.createObjectURL(spareForm.certificatePdf)
      : spareForm.certificateUrl;

    const newSpare: CriticalSparePart = {
      id: `SPARE-${Date.now()}`,
      partCode: spareForm.partCode.trim(),
      name: spareForm.name.trim(),
      category: spareForm.category,
      quantityReceived: Number(spareForm.quantityReceived) || 1,
      receivedDate: new Date().toISOString().split('T')[0],
      qualityCertificateUrl: certUrl,
      qualityCertificateName: spareForm.certificatePdf?.name || spareForm.certificateNumber || 'Certificado_Calidad.pdf',
      supplier: spareForm.supplier.trim(),
      batchNumber: spareForm.batchNumber.trim(),
      verifiedBy: spareForm.verifiedBy.trim(),
      acceptanceStatus: 'aprobado',
    };

    const updated = [newSpare, ...criticalSpares];
    setCriticalSpares(updated);
    if (onUpdateProject) {
      onUpdateProject({ criticalSpares: updated } as any);
    }

    setIsSpareModalOpen(false);
    setMsg({ text: `Repuesto crítico "${newSpare.name}" recibido con Certificado de Calidad validado.`, type: 'success' });
    // Reset
    setSpareForm({
      partCode: '',
      name: '',
      category: 'rodamientos',
      quantityReceived: 1,
      supplier: '',
      batchNumber: '',
      verifiedBy: project.supervisorName || 'Inspector QC',
      certificatePdf: null,
      certificateUrl: '',
      certificateNumber: '',
    });
  };

  // Guardar Equipo de Inspección MRT / END
  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipForm.equipmentName.trim() || !equipForm.calibrationExpiryDate) {
      setMsg({ text: 'Nombre del equipo y fecha de expiración de calibración son requeridos.', type: 'error' });
      return;
    }

    const calCheck = getCalibrationStatus(equipForm.calibrationExpiryDate);
    const certUrl = equipForm.certificatePdf ? URL.createObjectURL(equipForm.certificatePdf) : undefined;

    const newEquip: InspectionEquipment = {
      id: `EQ-${Date.now()}`,
      equipmentName: equipForm.equipmentName.trim(),
      serialNumber: equipForm.serialNumber.trim() || 'SN-N/A',
      brand: equipForm.brand.trim(),
      model: equipForm.model.trim(),
      calibrationDate: equipForm.calibrationDate,
      calibrationExpiryDate: equipForm.calibrationExpiryDate,
      calibrationCertificateUrl: certUrl,
      calibrationCertificateName: equipForm.certificatePdf?.name || 'Certificado_Calibracion.pdf',
      laboratoryName: equipForm.laboratoryName.trim(),
      status: calCheck.status === 'vencido' ? 'vencido' : calCheck.status === 'por_vencer' ? 'por_vencer' : 'calibrado',
    };

    const updated = [newEquip, ...inspectionEquipment];
    setInspectionEquipment(updated);
    if (onUpdateProject) {
      onUpdateProject({ inspectionEquipment: updated } as any);
    }

    setIsEquipModalOpen(false);
    if (calCheck.status === 'vencido') {
      setMsg({ 
        text: `Atención: El equipo ${newEquip.equipmentName} fue registrado con CALIBRACIÓN VENCIDA. No debe usarse en inspecciones oficiales hasta recalibrar.`, 
        type: 'warning' 
      });
    } else {
      setMsg({ text: `Equipo de inspección "${newEquip.equipmentName}" registrado exitosamente.`, type: 'success' });
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 text-xs rounded-lg border flex items-center justify-between ${
          msg.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-200'
            : msg.type === 'warning'
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 text-amber-800 dark:text-amber-200'
            : 'bg-red-50 dark:bg-red-950/30 border-red-300 text-red-800 dark:text-red-200'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* SECCIÓN 1: EQUIPOS DE INSPECCIÓN (MRT, ULTRASONIDO, CALIBRACIÓN) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#00668F]" />
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Equipos de Inspección Especializada (MRT, Ultrasonido, Gaussímetro)
              </h3>
              <p className="text-xs text-slate-500">
                Control estricto de vigencia de certificados de calibración según norma UNE EN 12927
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsEquipModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Registrar Equipo de Inspección</span>
          </button>
        </div>

        {inspectionEquipment.length === 0 ? (
          <div className="p-8 text-center">
            <Radio className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              No hay equipos de inspección asignados a este proyecto
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Registra los sensores MRT, detectores de fallas o dinamómetros para validar que su certificado esté vigente antes de la corrida en cable.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Equipo / Marca / Modelo</th>
                  <th className="py-3 px-4">Número de Serie</th>
                  <th className="py-3 px-4">Laboratorio Calibrador</th>
                  <th className="py-3 px-4">Última Calibración</th>
                  <th className="py-3 px-4">Vencimiento Calibración</th>
                  <th className="py-3 px-4">Estado de Vigencia</th>
                  <th className="py-3 px-4 text-center">Certificado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inspectionEquipment.map((eq) => {
                  const cal = getCalibrationStatus(eq.calibrationExpiryDate);
                  return (
                    <tr 
                      key={eq.id} 
                      onClick={() => setDetailEquip(eq)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer group transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-[#00668F] transition-colors">{eq.equipmentName}</div>
                        <div className="text-[11px] text-slate-400">{eq.brand} • {eq.model}</div>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                        {eq.serialNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {eq.laboratoryName}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {eq.calibrationDate}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {eq.calibrationExpiryDate}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] border ${cal.badgeClass}`}>
                          {cal.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {eq.calibrationCertificateUrl ? (
                          <button
                            onClick={() => setSelectedPdfPreview({ name: eq.calibrationCertificateName || 'Calibración', url: eq.calibrationCertificateUrl! })}
                            className="inline-flex items-center gap-1 text-[#00668F] hover:underline font-medium text-xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Sin adjunto</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailEquip(eq)}
                            className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                            title="Ver ficha técnica"
                          >
                            <Info size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEquipToDelete(eq)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                            title="Eliminar equipo"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECCIÓN 2: REPUESTOS CRÍTICOS Y CERTIFICADOS DE CALIDAD OBLIGATORIOS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                Repuestos Críticos (Rodamientos, Guarniciones de Volantes, Mordazas)
              </h3>
              <p className="text-xs text-slate-500">
                Recepción con Certificado de Calidad obligatorio para trazabilidad técnica
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsSpareModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Recibir Repuesto Crítico</span>
          </button>
        </div>

        {criticalSpares.length === 0 ? (
          <div className="p-8 text-center">
            <PackageCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              No hay repuestos críticos recibidos en este proyecto
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Al ingresar componentes mecánicos de alta exigencia, registra su certificado de fábrica para asegurar la garantía del montaje.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Código / Repuesto</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Cantidad</th>
                  <th className="py-3 px-4">Proveedor / Lote</th>
                  <th className="py-3 px-4">Fecha Recepción</th>
                  <th className="py-3 px-4 text-center">Certificado de Calidad</th>
                  <th className="py-3 px-4">Verificado Por</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {criticalSpares.map((sp) => (
                  <tr 
                    key={sp.id} 
                    onClick={() => setDetailSpare(sp)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 cursor-pointer group transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="font-mono font-semibold text-[#00668F]">{sp.partCode}</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100 group-hover:text-[#00668F] transition-colors">{sp.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {sp.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                      {sp.quantityReceived} UND
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      <div>{sp.supplier}</div>
                      <div className="text-[10px] text-slate-400">Lote: {sp.batchNumber || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {sp.receivedDate}
                    </td>
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setSelectedPdfPreview({ name: sp.qualityCertificateName || sp.name, url: sp.qualityCertificateUrl })}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 rounded hover:bg-emerald-100 transition-colors"
                      >
                        <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Certificado OK</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                      {sp.verifiedBy}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setDetailSpare(sp)}
                          className="p-1 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Ver detalle del repuesto"
                        >
                          <Info size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSpareToDelete(sp)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                          title="Eliminar repuesto"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR EQUIPO DE INSPECCIÓN MRT */}
      {isEquipModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Radio className="w-5 h-5 text-[#00668F]" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Registrar Equipo de Inspección (MRT / END)
                </h3>
              </div>
              <button onClick={() => setIsEquipModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <form onSubmit={handleSaveEquipment} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre del Equipo *
                </label>
                <input
                  type="text"
                  required
                  value={equipForm.equipmentName}
                  onChange={(e) => setEquipForm({ ...equipForm, equipmentName: e.target.value })}
                  placeholder="Ej. Equipo Magneto-inductivo MRT de Cables"
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    value={equipForm.brand}
                    onChange={(e) => setEquipForm({ ...equipForm, brand: e.target.value })}
                    placeholder="Intron / DMT"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    value={equipForm.model}
                    onChange={(e) => setEquipForm({ ...equipForm, model: e.target.value })}
                    placeholder="MH-60"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Número de Serie *
                  </label>
                  <input
                    type="text"
                    required
                    value={equipForm.serialNumber}
                    onChange={(e) => setEquipForm({ ...equipForm, serialNumber: e.target.value })}
                    placeholder="SN-2024-MRT-09"
                    className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Laboratorio Calibrador
                  </label>
                  <input
                    type="text"
                    value={equipForm.laboratoryName}
                    onChange={(e) => setEquipForm({ ...equipForm, laboratoryName: e.target.value })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Calibración
                  </label>
                  <input
                    type="date"
                    value={equipForm.calibrationDate}
                    onChange={(e) => setEquipForm({ ...equipForm, calibrationDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha de Vencimiento de Calibración *
                  </label>
                  <input
                    type="date"
                    required
                    value={equipForm.calibrationExpiryDate}
                    onChange={(e) => setEquipForm({ ...equipForm, calibrationExpiryDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Certificado de Calibración (PDF)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setEquipForm({ ...equipForm, certificatePdf: e.target.files?.[0] || null })}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#00668F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEquipModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-lg shadow-sm"
                >
                  Registrar Equipo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RECIBIR REPUESTO CRÍTICO */}
      {isSpareModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg max-h-[90vh] flex flex-col overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Recepción de Repuesto Crítico STC
                </h3>
              </div>
              <button onClick={() => setIsSpareModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <form onSubmit={handleSaveSpare} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código de Repuesto *
                  </label>
                  <input
                    type="text"
                    required
                    value={spareForm.partCode}
                    onChange={(e) => setSpareForm({ ...spareForm, partCode: e.target.value })}
                    placeholder="Ej. SKF-23140-CC / GUARN-4800"
                    className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoría Crítica *
                  </label>
                  <select
                    value={spareForm.category}
                    onChange={(e) => setSpareForm({ ...spareForm, category: e.target.value as any })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  >
                    <option value="rodamientos">Rodamientos (Balancín / Volante)</option>
                    <option value="guarniciones">Guarniciones de Volante (Goma/Poliuretano)</option>
                    <option value="mordazas">Mordazas Desembragables</option>
                    <option value="ejes">Ejes y Bulones de Balancín</option>
                    <option value="sensores">Sensores de Posición / Seguridad</option>
                    <option value="otros">Otros Repuestos Críticos</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nombre descriptivo del Repuesto *
                </label>
                <input
                  type="text"
                  required
                  value={spareForm.name}
                  onChange={(e) => setSpareForm({ ...spareForm, name: e.target.value })}
                  placeholder="Ej. Rodamiento Oscilante de Rodillos SKF para Volante Motriz"
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cantidad Recibida *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={spareForm.quantityReceived}
                    onChange={(e) => setSpareForm({ ...spareForm, quantityReceived: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Proveedor / Fabricante *
                  </label>
                  <input
                    type="text"
                    required
                    value={spareForm.supplier}
                    onChange={(e) => setSpareForm({ ...spareForm, supplier: e.target.value })}
                    placeholder="Ej. SKF Colombia / Doppelmayr / Leitner"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Lote o Número de Trazabilidad
                  </label>
                  <input
                    type="text"
                    value={spareForm.batchNumber}
                    onChange={(e) => setSpareForm({ ...spareForm, batchNumber: e.target.value })}
                    placeholder="LOT-2026-X8"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Inspector QC que Recibe
                  </label>
                  <input
                    type="text"
                    value={spareForm.verifiedBy}
                    onChange={(e) => setSpareForm({ ...spareForm, verifiedBy: e.target.value })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              {/* CAMPO OBLIGATORIO: CERTIFICADO DE CALIDAD */}
              <div className="p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 rounded-xl space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>Certificado de Calidad del Fabricante (OBLIGATORIO) *</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Por norma de seguridad en teleféricos, no se permite ingresar repuestos críticos sin adjuntar el certificado de fábrica.
                </p>
                <input
                  type="file"
                  required={!spareForm.certificateUrl}
                  accept=".pdf"
                  onChange={(e) => setSpareForm({ ...spareForm, certificatePdf: e.target.files?.[0] || null })}
                  className="w-full text-xs text-slate-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-100 file:text-amber-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSpareModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
                >
                  Aprobar y Recibir Repuesto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISOR DE PDF */}
      {selectedPdfPreview && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl h-[80vh] flex flex-col shadow-2xl p-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00668F]" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  {selectedPdfPreview.name}
                </h3>
              </div>
              <button onClick={() => setSelectedPdfPreview(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </div>
            <div className="flex-1 mt-3 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
              <iframe
                src={selectedPdfPreview.url}
                title="Visor Certificado"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación de Equipo de Inspección */}
      <ConfirmDeleteModal
        isOpen={Boolean(equipToDelete)}
        title="¿Eliminar Equipo de Inspección?"
        itemName={equipToDelete ? `${equipToDelete.equipmentName} (${equipToDelete.serialNumber})` : ''}
        description="Esta acción eliminará el registro de calibración del equipo del proyecto. ¿Confirmas la eliminación?"
        requireConfirmWord={false}
        confirmText="Eliminar Equipo"
        onConfirm={() => {
          if (equipToDelete) {
            const updated = inspectionEquipment.filter((e) => e.id !== equipToDelete.id);
            setInspectionEquipment(updated);
            if (onUpdateProject) {
              onUpdateProject({ inspectionEquipment: updated } as any);
            }
            setEquipToDelete(null);
          }
        }}
        onCancel={() => setEquipToDelete(null)}
      />

      {/* Modal Confirmación de Eliminación de Repuesto Crítico */}
      <ConfirmDeleteModal
        isOpen={Boolean(spareToDelete)}
        title="¿Eliminar Repuesto Crítico?"
        itemName={spareToDelete ? `${spareToDelete.partCode} - ${spareToDelete.name}` : ''}
        description="Esta acción eliminará el componente recibido y su trazabilidad de calidad en este proyecto. ¿Confirmas la eliminación?"
        requireConfirmWord={false}
        confirmText="Eliminar Repuesto"
        onConfirm={() => {
          if (spareToDelete) {
            const updated = criticalSpares.filter((s) => s.id !== spareToDelete.id);
            setCriticalSpares(updated);
            if (onUpdateProject) {
              onUpdateProject({ criticalSpares: updated } as any);
            }
            setSpareToDelete(null);
          }
        }}
        onCancel={() => setSpareToDelete(null)}
      />

      {/* Modal Detalle Completo de Equipo */}
      <DetailModal
        isOpen={Boolean(detailEquip)}
        title={detailEquip?.equipmentName || 'Ficha de Equipo'}
        subtitle={detailEquip ? `Serie: ${detailEquip.serialNumber} | Marca: ${detailEquip.brand}` : ''}
        onClose={() => setDetailEquip(null)}
        fields={detailEquip ? [
          { label: 'Nombre del Equipo', value: detailEquip.equipmentName, colSpan: 2 },
          { label: 'Número de Serie', value: detailEquip.serialNumber, isMono: true },
          { label: 'Marca / Fabricante', value: detailEquip.brand },
          { label: 'Modelo', value: detailEquip.model },
          { label: 'Laboratorio de Calibración', value: detailEquip.laboratoryName },
          { label: 'Fecha de Calibración', value: detailEquip.calibrationDate },
          { label: 'Fecha de Vencimiento', value: detailEquip.calibrationExpiryDate },
          { label: 'Certificado de Calibración', value: detailEquip.calibrationCertificateName || 'Registrado' },
        ] : []}
      />

      {/* Modal Detalle Completo de Repuesto */}
      <DetailModal
        isOpen={Boolean(detailSpare)}
        title={detailSpare?.name || 'Ficha de Repuesto Crítico'}
        subtitle={detailSpare ? `Código: ${detailSpare.partCode} | Categoría: ${detailSpare.category.toUpperCase()}` : ''}
        onClose={() => setDetailSpare(null)}
        fields={detailSpare ? [
          { label: 'Código de Parte', value: detailSpare.partCode, isMono: true },
          { label: 'Nombre / Descripción', value: detailSpare.name },
          { label: 'Categoría Crítica', value: detailSpare.category.toUpperCase() },
          { label: 'Cantidad Recibida', value: `${detailSpare.quantityReceived} UND`, isMono: true },
          { label: 'Proveedor', value: detailSpare.supplier },
          { label: 'Número de Lote / Colada', value: detailSpare.batchNumber || 'N/A', isMono: true },
          { label: 'Fecha de Recepción', value: detailSpare.receivedDate },
          { label: 'Inspector que Verificó', value: detailSpare.verifiedBy },
          { label: 'N° Certificado Calidad', value: detailSpare.certificateNumber || 'Adjunto OK', isMono: true },
        ] : []}
      />
    </div>
  );
};

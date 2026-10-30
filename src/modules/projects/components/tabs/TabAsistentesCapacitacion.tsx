import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  GraduationCap, 
  Award, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Info,
  Building
} from 'lucide-react';
import { Project } from '../../../../types';
import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';
import { DetailModal } from '../../../../components/common/DetailModal';

export interface TraineeAttendee {
  id: string;
  name: string;
  documentId: string;
  company: string;
  jobTitle: string;
  hoursAttended: number;
  score?: number; // 0 - 100
  passed: boolean;
  certificateIssued: boolean;
  certificateCode?: string;
  notes?: string;
}

interface TabAsistentesCapacitacionProps {
  project: Project;
  onUpdateProject?: (updates: Partial<Project>) => void;
}

export const TabAsistentesCapacitacion: React.FC<TabAsistentesCapacitacionProps> = ({
  project,
  onUpdateProject,
}) => {
  const [attendees, setAttendees] = useState<TraineeAttendee[]>(() => {
    return (project.dynamicData?.attendees as TraineeAttendee[]) || [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [attendeeToDelete, setAttendeeToDelete] = useState<TraineeAttendee | null>(null);
  const [selectedAttendeeDetail, setSelectedAttendeeDetail] = useState<TraineeAttendee | null>(null);

  const [form, setForm] = useState({
    name: '',
    documentId: '',
    company: project.clientName || '',
    jobTitle: '',
    hoursAttended: (project.dynamicData as any)?.sessionHours || 0,
    score: 0,
    passed: true,
    certificateIssued: false,
    certificateCode: '',
    notes: '',
  });

  const handleSaveAttendee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.documentId.trim()) return;

    const newAttendee: TraineeAttendee = {
      id: `trainee_${Date.now()}`,
      name: form.name.trim(),
      documentId: form.documentId.trim(),
      company: form.company.trim(),
      jobTitle: form.jobTitle.trim(),
      hoursAttended: Number(form.hoursAttended) || 0,
      score: Number(form.score) || 0,
      passed: form.passed,
      certificateIssued: form.certificateIssued,
      certificateCode: form.certificateCode.trim() || `CERT-${project.code}-${attendees.length + 1}`,
      notes: form.notes.trim(),
    };

    const updated = [newAttendee, ...attendees];
    setAttendees(updated);

    if (onUpdateProject) {
      onUpdateProject({
        dynamicData: {
          ...(project.dynamicData || {}),
          attendees: updated,
        },
      });
    }

    setIsModalOpen(false);
    setForm({
      name: '',
      documentId: '',
      company: project.clientName || '',
      jobTitle: '',
      hoursAttended: (project.dynamicData as any)?.sessionHours || 0,
      score: 0,
      passed: true,
      certificateIssued: false,
      certificateCode: '',
      notes: '',
    });
  };

  const handleDeleteAttendee = () => {
    if (!attendeeToDelete) return;
    const updated = attendees.filter(a => a.id !== attendeeToDelete.id);
    setAttendees(updated);

    if (onUpdateProject) {
      onUpdateProject({
        dynamicData: {
          ...(project.dynamicData || {}),
          attendees: updated,
        },
      });
    }
    setAttendeeToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-[#00668F] rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Registro de Participantes y Asistencia a Capacitación
            </h3>
            <p className="text-xs text-slate-500">
              Control de horas asistidas, evaluación de competencias y certificación técnica de operarios STC
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Inscribir Asistente</span>
        </button>
      </div>

      {/* Grid o Tabla de Asistentes */}
      {attendees.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No hay participantes registrados
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Registra los técnicos y operarios que participan en esta capacitación técnica especializada.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Participante</th>
                  <th className="py-3 px-4">Documento</th>
                  <th className="py-3 px-4">Empresa / Cargo</th>
                  <th className="py-3 px-4 text-center">Horas Asistidas</th>
                  <th className="py-3 px-4 text-center">Calificación</th>
                  <th className="py-3 px-4 text-center">Certificado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {attendees.map(attendee => (
                  <tr key={attendee.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {attendee.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {attendee.documentId}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      <div className="truncate max-w-[200px]">
                        <span className="font-medium">{attendee.company}</span>
                        {attendee.jobTitle && <span className="text-slate-400"> - {attendee.jobTitle}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700 dark:text-slate-300">
                      {attendee.hoursAttended} h
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        attendee.passed
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}>
                        {attendee.score !== undefined ? `${attendee.score}/100` : attendee.passed ? 'Aprobado' : 'Reprobado'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {attendee.certificateIssued ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Emitido</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Pendiente</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        onClick={() => setSelectedAttendeeDetail(attendee)}
                        className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg inline-flex items-center gap-1"
                        title="Ver detalle"
                      >
                        <Info className="w-3.5 h-3.5 text-[#00668F]" />
                      </button>
                      <button
                        onClick={() => setAttendeeToDelete(attendee)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg inline-flex items-center gap-1"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Registrar Asistente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-y-auto p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#00668F]" />
              Inscribir Participante en Capacitación
            </h3>

            <form onSubmit={handleSaveAttendee} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ej. Carlos Mario Gómez"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cédula / Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.documentId}
                    onChange={(e) => setForm({ ...form, documentId: e.target.value })}
                    placeholder="Ej. 1.020.304.506"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Empresa / Organización
                  </label>
                  <input
                    type="text"
                    value={form.company}
                    onChange={(e) => setForm({ ...form, company: e.target.value })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Cargo del Participante
                  </label>
                  <input
                    type="text"
                    value={form.jobTitle}
                    onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                    placeholder="Ej. Operador de Cabinas"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Horas Asistidas
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.hoursAttended}
                    onChange={(e) => setForm({ ...form, hoursAttended: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Calificación Obtenida (0-100)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={form.score}
                    onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.passed}
                    onChange={(e) => setForm({ ...form, passed: e.target.checked })}
                    className="rounded border-slate-300 text-[#00668F]"
                  />
                  <span>Aprobó Capacitación</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.certificateIssued}
                    onChange={(e) => setForm({ ...form, certificateIssued: e.target.checked })}
                    className="rounded border-slate-300 text-[#00668F]"
                  />
                  <span>Certificado Emitido</span>
                </label>
              </div>

              {form.certificateIssued && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código de Certificado
                  </label>
                  <input
                    type="text"
                    value={form.certificateCode}
                    onChange={(e) => setForm({ ...form, certificateCode: e.target.value })}
                    placeholder={`CERT-${project.code}-01`}
                    className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notas / Observaciones
                </label>
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observaciones de desempeño en campo..."
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-lg"
                >
                  Guardar Participante
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {selectedAttendeeDetail && (
        <DetailModal
          isOpen={true}
          title={`Participante: ${selectedAttendeeDetail.name}`}
          subtitle={`Documento: ${selectedAttendeeDetail.documentId}`}
          fields={[
            { label: 'Nombre', value: selectedAttendeeDetail.name },
            { label: 'Documento / Cédula', value: selectedAttendeeDetail.documentId, isMono: true },
            { label: 'Empresa', value: selectedAttendeeDetail.company },
            { label: 'Cargo', value: selectedAttendeeDetail.jobTitle || 'No especificado' },
            { label: 'Horas Asistidas', value: `${selectedAttendeeDetail.hoursAttended} horas` },
            { label: 'Calificación', value: `${selectedAttendeeDetail.score ?? 'N/A'}/100` },
            { label: 'Estado de Aprobación', value: selectedAttendeeDetail.passed ? 'Aprobado' : 'No aprobado' },
            { label: 'Certificado', value: selectedAttendeeDetail.certificateIssued ? `Emitido (${selectedAttendeeDetail.certificateCode})` : 'No emitido' },
            { label: 'Observaciones', value: selectedAttendeeDetail.notes || 'Sin observaciones', colSpan: 2 },
          ]}
          onClose={() => setSelectedAttendeeDetail(null)}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      {attendeeToDelete && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Eliminar Participante"
          itemName={`${attendeeToDelete.name} (${attendeeToDelete.documentId})`}
          description="¿Estás seguro de que deseas eliminar este participante de la lista de capacitación? Esta acción no se puede deshacer."
          requireConfirmWord={true}
          confirmWord="BORRAR"
          onConfirm={handleDeleteAttendee}
          onCancel={() => setAttendeeToDelete(null)}
        />
      )}
    </div>
  );
};

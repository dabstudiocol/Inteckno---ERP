import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Calendar,
  Sparkles,
  Zap,
  Building2,
  TrendingUp,
  UserCheck,
  Settings,
  Trash2,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { TimesheetEntry } from '../../types';
import { LightTable } from '../../components/ui/LightTable';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';

export const TimesheetModule: React.FC = () => {
  const { timesheets, projects, currentUser, submitTimesheet, approveTimesheet, rejectTimesheet, deleteTimesheet } = useErp();

  // Estado del formulario rápido móvil en 3 toques
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [hours, setHours] = useState(8);
  const [description, setDescription] = useState('');
  const [taskName, setTaskName] = useState('');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [timesheetToDelete, setTimesheetToDelete] = useState<TimesheetEntry | null>(null);

  // Catálogo dinámico de labores técnicas
  const catalogLaborTypes = useModuleCatalog('registro-horas', 'laborTypes');

  // Inicializar labor por defecto
  useEffect(() => {
    if (catalogLaborTypes.length > 0 && !taskName) {
      setTaskName(catalogLaborTypes[0].name);
    }
  }, [catalogLaborTypes, taskName]);

  const internalProjectsMap: Record<string, { id: string; code: string; name: string }> = {
    'PRJ-INTERNAL-TALLER': { id: 'PRJ-INTERNAL-TALLER', code: 'ITK-TALLER', name: 'Taller Central Guayabal (Banco de Ensayos & Maquinado)' },
    'PRJ-INTERNAL-SST': { id: 'PRJ-INTERNAL-SST', code: 'ITK-SST', name: 'Capacitación y Certificación en Alturas / SST' },
    'PRJ-INTERNAL-SEDE': { id: 'PRJ-INTERNAL-SEDE', code: 'ITK-ADMIN', name: 'Soporte Operativo y Logística de Sede' },
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || internalProjectsMap[selectedProjectId] || projects[0];

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    submitTimesheet({
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.roleLabel,
      projectId: selectedProject.id,
      projectCode: selectedProject.code,
      projectName: selectedProject.name,
      taskName: taskName || 'Labores en Teleférico',
      date: new Date().toISOString().split('T')[0],
      hours: Number(hours),
      isBillable: !selectedProjectId.startsWith('PRJ-INTERNAL'),
      description: description || 'Labores técnicas en Sistema de Transporte por Cable según programación.',
    });

    setDescription('');
  };

  const isLeader =
    currentUser.role === 'lider_proyectos' ||
    currentUser.role === 'gerente_general' ||
    currentUser.role === 'gerente_administrativa' ||
    currentUser.role === 'supervisor_tecnico';

  return (
    <div className="space-y-3 sm:space-y-4 w-full max-w-full min-w-0 animate-in fade-in duration-200">
      
      {/* SECCIÓN MÓVIL EN 3 TOQUES (PRINCIPIO 1 & 6) */}
      <div className="p-3.5 sm:p-5 bg-white rounded-xl space-y-3.5 w-full max-w-full min-w-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EBF5FA] text-[#00668F] flex items-center justify-center shrink-0">
              <Zap size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">Registro Rápido de Horas (≤ 3 toques)</h3>
              <p className="text-xs text-slate-500">Pensado para técnicos de campo desde el celular</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800">
              {currentUser.name}
            </span>
          </div>
        </div>

        <form onSubmit={handleQuickSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Toque 1: Proyecto preseleccionado con opción de cambio rápido */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                1. Proyecto STC Asignado
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:outline-hidden focus:border-[#00668F] cursor-pointer"
              >
                <optgroup label="Proyectos STC con Clientes">
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} — {p.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Taller Central & Labores Internas">
                  <option value="PRJ-INTERNAL-TALLER">ITK-TALLER — Taller Guayabal (Banco de Ensayos & Maquinado)</option>
                  <option value="PRJ-INTERNAL-SST">ITK-SST — Capacitación y Certificación en Alturas</option>
                  <option value="PRJ-INTERNAL-SEDE">ITK-ADMIN — Soporte Operativo y Logística de Sede</option>
                </optgroup>
              </select>
            </div>

            {/* Toque 2: Tipo de Labor / Actividad Técnica */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  2. Labor Técnica
                </label>
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="text-[10px] text-[#00668F] hover:underline font-bold"
                >
                  ⚙️ Editar
                </button>
              </div>
              <select
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-800 focus:outline-hidden focus:border-[#00668F]"
              >
                {catalogLaborTypes.map((lt) => (
                  <option key={lt.id} value={lt.name}>
                    {lt.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toque 3: Selector de horas rápido con botones píldora */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                3. Horas Trabajadas
              </label>
              <div className="flex items-center gap-1.5">
                {[4, 8, 9, 10].map((h) => (
                  <button
                    type="button"
                    key={h}
                    onClick={() => setHours(h)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                      hours === h
                        ? 'bg-[#00668F] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Toque 4: Botón de envío principal */}
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-full bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>4. Radicar Horas</span>
                <CheckCircle2 size={15} />
              </button>
            </div>
          </div>

          <div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle opcional (ej. Desmonte de cabinas 03 a 06, torque de pernos de balancín...)"
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-[#00668F]"
            />
          </div>
        </form>
      </div>

      {/* HISTORIAL Y APROBACIONES DE HORAS */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5 w-full max-w-full min-w-0 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-1">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historial de Horas y Control de Planillas</h3>
            <p className="text-xs text-slate-500">Validación por líderes antes de imputación a costos reales de mano de obra</p>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            Total Registros: {timesheets.length}
          </span>
        </div>

        <LightTable
          data={timesheets}
          keyExtractor={(t) => t.id}
          columns={[
            {
              key: 'date',
              header: 'Fecha / Técnico',
              render: (t) => (
                <div>
                  <div className="font-bold text-xs text-gray-900">{t.userName}</div>
                  <div className="text-[11px] text-gray-400">{t.date} • {t.userRole}</div>
                </div>
              ),
            },
            {
              key: 'projectCode',
              header: 'Proyecto STC',
              render: (t) => (
                <div>
                  <span className="font-bold text-xs text-[#00668F]">{t.projectCode}</span>
                  <div className="text-[11px] text-gray-500 line-clamp-1">{t.projectName}</div>
                </div>
              ),
            },
            {
              key: 'taskName',
              header: 'Actividad Realizada',
              render: (t) => (
                <div>
                  <div className="text-xs text-gray-800 font-medium">{t.taskName}</div>
                  {t.description && <div className="text-[11px] text-gray-400 line-clamp-1">{t.description}</div>}
                </div>
              ),
            },
            {
              key: 'hours',
              header: 'Horas',
              align: 'center',
              render: (t) => (
                <span className="font-extrabold text-xs text-gray-800 bg-gray-100 px-2.5 py-1 rounded-full">
                  {t.hours} hrs
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Estado',
              align: 'center',
              render: (t) => (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    t.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : t.status === 'rejected'
                      ? 'bg-rose-50 text-rose-800 border border-rose-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {t.status === 'approved' ? 'Aprobado' : t.status === 'rejected' ? 'Rechazado' : 'Pendiente Visto Bueno'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Acciones',
              align: 'right',
              render: (t) => {
                return (
                  <div className="flex items-center justify-end gap-1.5">
                    {t.status === 'submitted' && isLeader && (
                      <>
                        <button
                          onClick={() => approveTimesheet(t.id)}
                          className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => rejectTimesheet(t.id, 'Requiere mayor detalle en actividades de campo.')}
                          className="px-2 py-1 rounded-full bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700 text-[11px] font-semibold transition-colors"
                        >
                          Devolver
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setTimesheetToDelete(t)}
                      title="Eliminar Registro de Horas"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

      {/* Modal Universal de Configuración de Horas */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="registro-horas"
        moduleTitle="Registro de Horas de Campo"
      />

      {/* Modal Poka-Yoke: Confirmación de Eliminación de Horas */}
      <ConfirmDeleteModal
        isOpen={Boolean(timesheetToDelete)}
        title="¿Eliminar Registro de Horas?"
        itemName={timesheetToDelete ? `${timesheetToDelete.userName} - ${timesheetToDelete.hours}h (${timesheetToDelete.projectCode})` : ''}
        description="Esta acción eliminará el registro de horas de campo de forma definitiva. Si ya fue imputado al proyecto, las horas saldrán de los balances."
        confirmText="Eliminar Horas"
        onConfirm={() => {
          if (timesheetToDelete) {
            deleteTimesheet(timesheetToDelete.id);
            setTimesheetToDelete(null);
          }
        }}
        onCancel={() => setTimesheetToDelete(null)}
      />
    </div>
  );
};

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
import { CreatableSelect } from '../../components/common/CreatableSelect';

export const TimesheetModule: React.FC = () => {
  const { timesheets, projects, users, employees, currentUser, submitTimesheet, approveTimesheet, rejectTimesheet, deleteTimesheet } = useErp();

  // Estado del formulario rápido móvil
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [hours, setHours] = useState(8);
  const [description, setDescription] = useState('');
  const [taskName, setTaskName] = useState('');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [timesheetToDelete, setTimesheetToDelete] = useState<TimesheetEntry | null>(null);

  // Mantener actualizado el usuario seleccionado si cambia currentUser
  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser.id, selectedUserId]);

  // Lista unificada de colaboradores (Usuarios de sistema + Personal registrado en Talento Humano)
  const collaboratorsList = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; email?: string }>();
    
    // Primero agregar usuarios de sistema
    users.forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        role: u.roleLabel || u.department || 'Colaborador ITK',
        email: u.email
      });
    });

    // Luego complementar con empleados de RRHH si no están ya en la lista
    employees.forEach((emp) => {
      if (!map.has(emp.id)) {
        map.set(emp.id, {
          id: emp.id,
          name: emp.name,
          role: emp.role || emp.department || 'Técnico de Campo',
          email: emp.documentId ? `C.C. ${emp.documentId}` : undefined
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, employees]);

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

  // Identificar el colaborador seleccionado
  const selectedCollaborator = collaboratorsList.find((c) => c.id === selectedUserId) || {
    id: currentUser.id,
    name: currentUser.name,
    role: currentUser.roleLabel || 'Colaborador ITK',
  };

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    submitTimesheet({
      userId: selectedCollaborator.id,
      userName: selectedCollaborator.name,
      userRole: selectedCollaborator.role,
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
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Personalizar catálogo de labores y turnos"
            >
              <Settings size={14} className="text-[#00668F]" />
              <span>Configuración</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Toque 0: Colaborador / Técnico Responsable (Interconexión RRHH) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                1. Colaborador / Técnico ITK
              </label>
              <CreatableSelect
                options={collaboratorsList.map((collab) => ({
                  id: collab.id,
                  name: `${collab.name} (${collab.role})`,
                  code: collab.role,
                }))}
                value={selectedUserId}
                onChange={(val) => setSelectedUserId(val)}
                placeholder="Seleccionar técnico..."
              />
            </div>

            {/* Toque 1: Proyecto preseleccionado con opción de cambio rápido */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                2. Proyecto STC Asignado
              </label>
              <CreatableSelect
                options={[
                  ...projects.map((p) => ({
                    id: p.id,
                    name: `${p.code} — ${p.name}`,
                    code: p.code
                  })),
                  { id: 'PRJ-INTERNAL-TALLER', name: 'ITK-TALLER — Taller Guayabal (Banco de Ensayos & Maquinado)', code: 'ITK-TALLER' },
                  { id: 'PRJ-INTERNAL-SST', name: 'ITK-SST — Capacitación y Certificación en Alturas', code: 'ITK-SST' },
                  { id: 'PRJ-INTERNAL-SEDE', name: 'ITK-ADMIN — Soporte Operativo y Logística de Sede', code: 'ITK-ADMIN' },
                ]}
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                placeholder="Seleccionar o buscar proyecto STC o taller..."
              />
            </div>

            {/* Toque 2: Tipo de Labor / Actividad Técnica */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                3. Labor Técnica
              </label>
              <CreatableSelect
                value={taskName}
                onChange={(val) => setTaskName(val)}
                options={catalogLaborTypes.map((lt) => ({ id: lt.id, name: lt.name, code: lt.code }))}
                placeholder="Seleccionar o escribir labor..."
                moduleId="registro-horas"
                catalogKey="laborTypes"
                allowCustomText={true}
              />
            </div>

            {/* Toque 3: Selector de horas rápido con botones píldora */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                4. Horas Trabajadas
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
            <div className="md:col-span-3">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle opcional (ej. Desmonte de cabinas 03 a 06, torque de pernos de balancín...)"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-[#00668F]"
              />
            </div>

            {/* Botón de envío principal */}
            <div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-full bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>5. Radicar Horas</span>
                <CheckCircle2 size={15} />
              </button>
            </div>
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

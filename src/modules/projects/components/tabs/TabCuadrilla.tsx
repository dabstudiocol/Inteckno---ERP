import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  Clock,
  MapPin,
  Briefcase,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Building,
  UserCheck,
  Trash2,
} from 'lucide-react';
import { Project, User, StaffAssignment } from '../../../../types';
import { useErp } from '../../../../core/storage/erpStore';
import { CreatableSelect } from '../../../../components/common/CreatableSelect';
import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';

interface TabCuadrillaProps {
  project: Project;
  onUpdateProject?: (updates: Partial<Project>) => void;
}

export const TabCuadrilla: React.FC<TabCuadrillaProps> = ({ project, onUpdateProject }) => {
  const { users, employees } = useErp();

  // Estado real vinculado al proyecto (Cero Mock Data)
  const assignments: StaffAssignment[] = useMemo(() => {
    return (project as any).staffAssignments || [];
  }, [project]);

  // Lista unificada de colaboradores de RRHH y Usuarios del Sistema
  const availableStaff = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; department?: string }>();
    users.forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        role: u.roleLabel || u.department || 'Personal ITK',
        department: u.department,
      });
    });
    employees.forEach((emp) => {
      if (!map.has(emp.id)) {
        map.set(emp.id, {
          id: emp.id,
          name: emp.name,
          role: emp.role || emp.department || 'Técnico de Campo',
          department: emp.department,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, employees]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterFront, setFilterFront] = useState<'all' | 'this_project'>('all');
  const [selectedWeekRange, setSelectedWeekRange] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Modal para eliminar con palabra 'BORRAR'
  const [assignmentToDelete, setAssignmentToDelete] = useState<StaffAssignment | null>(null);

  // Formulario nuevo personal
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Ingeniero de Campo STC');
  const [empLocation, setEmpLocation] = useState(project.location || '');
  const [weekStart, setWeekStart] = useState('S01');
  const [weekEnd, setWeekEnd] = useState('S12');
  const [allocPct, setAllocPct] = useState(100);

  // Semanas correspondientes al trimestre seleccionado
  const weekList = useMemo(() => {
    if (selectedWeekRange === 'Q1') return ['S01', 'S02', 'S03', 'S04', 'S05', 'S06', 'S07', 'S08', 'S09', 'S10', 'S11', 'S12', 'S13'];
    if (selectedWeekRange === 'Q2') return ['S14', 'S15', 'S16', 'S17', 'S18', 'S19', 'S20', 'S21', 'S22', 'S23', 'S24', 'S25', 'S26'];
    if (selectedWeekRange === 'Q3') return ['S27', 'S28', 'S29', 'S30', 'S31', 'S32', 'S33', 'S34', 'S35', 'S36', 'S37', 'S38', 'S39'];
    return ['S40', 'S41', 'S42', 'S43', 'S44', 'S45', 'S46', 'S47', 'S48', 'S49', 'S50', 'S51', 'S52'];
  }, [selectedWeekRange]);

  const filtered = useMemo(() => {
    return assignments.filter((a) => {
      const matchSearch =
        searchTerm === '' ||
        a.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.projectCode && a.projectCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchFront =
        filterFront === 'all' ||
        (filterFront === 'this_project' && (a.projectCode === project.code || a.projectName?.toLowerCase().includes(project.name.toLowerCase())));

      return matchSearch && matchFront;
    });
  }, [assignments, searchTerm, filterFront, project]);

  // Cálculos dinámicos reales para KPIs (Cero Mock Data)
  const uniqueLocationsCount = useMemo(() => {
    const locs = new Set(assignments.map(a => a.location?.trim()).filter(Boolean));
    return locs.size;
  }, [assignments]);

  const sstCoveredCount = useMemo(() => {
    return assignments.filter(a => 
      a.role.toLowerCase().includes('sst') || 
      a.role.toLowerCase().includes('hseq') || 
      a.role.toLowerCase().includes('seguridad')
    ).length;
  }, [assignments]);

  const persistAssignments = (newList: StaffAssignment[]) => {
    if (onUpdateProject) {
      onUpdateProject({ staffAssignments: newList });
    }
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;

    const newAssoc: StaffAssignment = {
      id: `STF-${Date.now()}`,
      employeeName: empName.trim(),
      role: empRole.trim(),
      department: 'Ingeniería y Operaciones',
      projectCode: project.code,
      projectName: project.name,
      location: empLocation.trim() || project.location || '',
      weekStart,
      weekEnd,
      allocationPct: allocPct,
      status: 'confirmado',
    };

    const updated = [newAssoc, ...assignments];
    persistAssignments(updated);
    setIsModalOpen(false);
    setEmpName('');
    setEmpRole('Ingeniero de Campo STC');
    setEmpLocation(project.location || '');
  };

  const handleDeleteAssignment = (assignId: string) => {
    const updated = assignments.filter(a => a.id !== assignId);
    persistAssignments(updated);
    setAssignmentToDelete(null);
  };

  const isAssignedInWeek = (assign: StaffAssignment, week: string) => {
    const wNum = parseInt(week.replace('S', ''), 10);
    const startNum = parseInt(assign.weekStart.replace('S', ''), 10);
    const endNum = parseInt(assign.weekEnd.replace('S', ''), 10);
    return wNum >= startNum && wNum <= endNum;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* TARJETAS RESUMEN DE STAFFING (100% DINÁMICAS - CERO MOCK DATA) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personal Programado</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {assignments.length} {assignments.length === 1 ? 'Colaborador' : 'Colaboradores'}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {assignments.length > 0 ? 'Asignados al cronograma de obra' : 'Sin asignaciones registradas'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Frentes / Ubicaciones</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MapPin size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-indigo-900">
            {uniqueLocationsCount} {uniqueLocationsCount === 1 ? 'Frente' : 'Frentes'}
          </div>
          <p className="mt-2 text-[11px] text-indigo-700 font-medium">
            {uniqueLocationsCount > 0 ? (project.location || 'Frente registrado') : 'Ubicación según proyecto'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Seguridad y Salud (SST)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-emerald-800">
            {sstCoveredCount} {sstCoveredCount === 1 ? 'Perfil SST' : 'Perfiles SST'}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {sstCoveredCount > 0 ? 'Coordinador / Auxiliar asignado' : 'Sin personal SST en cuadrilla'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horizonte de Ejecución</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {project.startDate && project.endDate ? `${project.startDate.slice(0, 7)} a ${project.endDate.slice(0, 7)}` : 'S1 a S52'}
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Programación semanal de proyecto</p>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS Y VISTA DE SEMANAS (S1..S52) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar colaborador, cargo, proyecto o ubicación..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00668F] font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Trimestre Q1..Q4 */}
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setSelectedWeekRange(q)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    selectedWeekRange === q
                      ? 'bg-white text-[#00668F] shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {q} (Semanas)
                </button>
              ))}
            </div>

            {/* Selector de frente */}
            <div className="w-60">
              <CreatableSelect
                value={filterFront}
                options={[
                  { id: 'all', name: 'Todas las Asignaciones' },
                  { id: 'this_project', name: `Solo este Proyecto (${project.code})` },
                ]}
                onChange={(val) => setFilterFront((val as any) || 'all')}
                placeholder="Filtrar frente..."
                allowCreate={false}
              />
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>Asignar Colaborador</span>
            </button>
          </div>
        </div>
      </div>

      {/* MATRIZ DE CRONOGRAMA SEMANAL (S1..S13, S14..S26, ETC.) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 overflow-x-auto">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Matriz Semanal de Staffing ({selectedWeekRange}) • {project.name || 'Proyecto'}
            </h3>
            <p className="text-[11px] text-slate-500">
              Visualización de asignación de cuadrilla, frentes de obra y porcentaje de dedicación
            </p>
          </div>
        </div>

        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold">
              <th className="py-2.5 px-3 min-w-[200px]">Colaborador / Cargo</th>
              <th className="py-2.5 px-3 min-w-[140px]">Frente / Ubicación</th>
              <th className="py-2.5 px-2 text-center min-w-[80px]">Dedicación</th>
              {weekList.map((wk) => (
                <th key={wk} className="py-2.5 px-1.5 text-center min-w-[36px] font-mono text-[10px]">
                  {wk}
                </th>
              ))}
              <th className="py-2.5 px-2 text-center min-w-[50px]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4 + weekList.length} className="py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Users size={32} className="text-slate-300 stroke-[1.5]" />
                    <p className="text-sm font-semibold text-slate-600">Sin asignaciones de cuadrilla para este proyecto</p>
                    <p className="text-xs text-slate-400 max-w-md">
                      Haz clic en "Asignar Colaborador" para programar el personal técnico y de ingeniería en las semanas correspondientes.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((assign) => (
                <tr key={assign.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="font-bold text-slate-900">{assign.employeeName}</div>
                    <div className="text-[10px] text-slate-500">{assign.role}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-xs font-semibold text-[#00668F]">{assign.projectCode || project.code}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <MapPin size={10} />
                      <span>{assign.location || project.location || 'Sin ubicación'}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                      assign.allocationPct === 100
                        ? 'bg-blue-100 text-[#00668F]'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {assign.allocationPct}%
                    </span>
                  </td>
                  {weekList.map((wk) => {
                    const active = isAssignedInWeek(assign, wk);
                    return (
                      <td key={wk} className="py-2.5 px-1.5 text-center">
                        {active ? (
                          <div
                            title={`${assign.employeeName} activo en ${wk} (${assign.allocationPct}%)`}
                            className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center text-[10px] font-bold text-white shadow-2xs ${
                              assign.allocationPct === 100 ? 'bg-[#00668F]' : 'bg-amber-500'
                            }`}
                          >
                            ✓
                          </div>
                        ) : (
                          <div className="w-1.5 h-1.5 mx-auto rounded-full bg-slate-200"></div>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2.5 px-2 text-center">
                    <button
                      type="button"
                      title="Eliminar asignación"
                      onClick={() => setAssignmentToDelete(assign)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN CON PALABRA 'BORRAR' (Regla #7) */}
      {assignmentToDelete && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Eliminar Asignación de Cuadrilla"
          itemName={`${assignmentToDelete.employeeName} (${assignmentToDelete.role})`}
          description="¿Estás seguro de eliminar este colaborador del cronograma semanal de obra? Esta acción no se puede deshacer."
          confirmWord="BORRAR"
          requireConfirmWord={true}
          onConfirm={() => handleDeleteAssignment(assignmentToDelete.id)}
          onCancel={() => setAssignmentToDelete(null)}
        />
      )}

      {/* MODAL DE ASIGNACIÓN DE COLABORADOR */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="text-[#00668F]" size={20} />
                <h3 className="text-base font-bold text-slate-900">Asignar Colaborador al Cronograma</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Colaborador / Personal de Nómina *</label>
                <CreatableSelect
                  value={empName}
                  onChange={(val) => {
                    const found = availableStaff.find(
                      (s) => s.name.toLowerCase() === val.toLowerCase() || `${s.name} (${s.role})` === val || s.id === val
                    );
                    if (found) {
                      setEmpName(found.name);
                      setEmpRole(found.role);
                    } else {
                      setEmpName(val);
                    }
                  }}
                  options={availableStaff.map((s) => ({
                    id: s.id,
                    name: `${s.name} (${s.role})`,
                    code: s.department || s.role,
                  }))}
                  placeholder="Seleccionar colaborador de nómina o escribir..."
                  allowCustomText={true}
                  inputClassName="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cargo / Especialidad *</label>
                <input
                  type="text"
                  required
                  value={empRole}
                  onChange={(e) => setEmpRole(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ubicación / Frente de Obra</label>
                <input
                  type="text"
                  placeholder={project.location || 'Ubicación de obra'}
                  value={empLocation}
                  onChange={(e) => setEmpLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semana Inicial</label>
                  <CreatableSelect
                    value={weekStart}
                    options={Array.from({ length: 52 }, (_, i) => {
                      const s = `S${String(i + 1).padStart(2, '0')}`;
                      return { id: s, name: s };
                    })}
                    onChange={(val) => setWeekStart(val || 'S01')}
                    placeholder="Semana inicial..."
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semana Final</label>
                  <CreatableSelect
                    value={weekEnd}
                    options={Array.from({ length: 52 }, (_, i) => {
                      const s = `S${String(i + 1).padStart(2, '0')}`;
                      return { id: s, name: s };
                    })}
                    onChange={(val) => setWeekEnd(val || 'S12')}
                    placeholder="Semana final..."
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Porcentaje de Dedicación (%)</label>
                <CreatableSelect
                  value={String(allocPct)}
                  options={[
                    { id: '100', name: '100% - Tiempo Completo Exclusivo' },
                    { id: '50', name: '50% - Dedicación Compartida (Prorrateo)' },
                    { id: '25', name: '25% - Asesoría / Supervisión Parcial' },
                  ]}
                  onChange={(val) => setAllocPct(Number(val) || 100)}
                  placeholder="Dedicación..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-600 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00668F] text-white font-bold hover:bg-[#005073] shadow-xs cursor-pointer active:scale-95"
                >
                  Confirmar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

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
} from 'lucide-react';
import { Project, User } from '../../../../types';

interface StaffAssignment {
  id: string;
  employeeName: string;
  role: string;
  department: string;
  projectCode: string;
  projectName: string;
  location: string;
  weekStart: string; // ej. S01 a S52
  weekEnd: string;
  allocationPct: number; // 25%, 50%, 100%
  status: 'confirmado' | 'propuesto' | 'completado';
}

const DEFAULT_STAFFING_DATA: StaffAssignment[] = [
  {
    id: 'STF-01',
    employeeName: 'Juan Pablo Castellanos Cadena',
    role: 'Coordinador Electromecánico / Residente',
    department: 'Ingeniería y Proyectos',
    projectCode: 'P25-SV01',
    projectName: 'Supervisión Aerocable Mejicanos - San Salvador',
    location: 'San Salvador, El Salvador',
    weekStart: 'S01',
    weekEnd: 'S36',
    allocationPct: 100,
    status: 'confirmado',
  },
  {
    id: 'STF-02',
    employeeName: 'Gustavo Adolfo Mejía',
    role: 'Consultor Principal de Teleféricos',
    department: 'Dirección Técnica',
    projectCode: 'P25-PA01',
    projectName: 'Consultoría Técnica Teleférico Panamá',
    location: 'Ciudad de Panamá / Medellín',
    weekStart: 'S04',
    weekEnd: 'S28',
    allocationPct: 50,
    status: 'confirmado',
  },
  {
    id: 'STF-03',
    employeeName: 'Wilson Alzate',
    role: 'Especialista en Diseño y Normativa UNE-EN',
    department: 'Ingeniería y Proyectos',
    projectCode: 'P25-PA01',
    projectName: 'Consultoría Técnica Teleférico Panamá',
    location: 'Medellín, Antioquia',
    weekStart: 'S04',
    weekEnd: 'S24',
    allocationPct: 50,
    status: 'confirmado',
  },
  {
    id: 'STF-04',
    employeeName: 'Dairo Morales',
    role: 'Inspector Senior Nivel II MRT & END',
    department: 'Operaciones de Campo',
    projectCode: 'P26-12',
    projectName: 'Inspección Magneto-inductiva MRT Cables La Paz',
    location: 'La Paz, Bolivia',
    weekStart: 'S10',
    weekEnd: 'S22',
    allocationPct: 100,
    status: 'confirmado',
  },
  {
    id: 'STF-05',
    employeeName: 'Santiago Arbeláez',
    role: 'Técnico Especialista de Campo / Empalmes',
    department: 'Operaciones de Campo',
    projectCode: 'P23-01',
    projectName: 'Parque Nacional Chicamocha - Recorte de Cable',
    location: 'Santander, Colombia',
    weekStart: 'S12',
    weekEnd: 'S16',
    allocationPct: 100,
    status: 'confirmado',
  },
  {
    id: 'STF-06',
    employeeName: 'Erika Liliana Escalante Carvajal',
    role: 'Coordinadora SST / HSEQ en Alturas',
    department: 'SST y Sostenibilidad',
    projectCode: 'P25-SV01',
    projectName: 'Supervisión Aerocable Mejicanos - San Salvador',
    location: 'San Salvador, El Salvador',
    weekStart: 'S01',
    weekEnd: 'S40',
    allocationPct: 100,
    status: 'confirmado',
  },
  {
    id: 'STF-07',
    employeeName: 'Kelly Johana Rojas Torres',
    role: 'Auxiliar SST en Campo',
    department: 'SST y Sostenibilidad',
    projectCode: 'P23-01',
    projectName: 'Parque Nacional Chicamocha - Santísimo',
    location: 'Santander, Colombia',
    weekStart: 'S12',
    weekEnd: 'S16',
    allocationPct: 100,
    status: 'confirmado',
  },
  {
    id: 'STF-08',
    employeeName: 'Juan David Correa Mejía',
    role: 'Ingeniero Mecánico / Ensayos No Destructivos',
    department: 'Ingeniería y Proyectos',
    projectCode: 'P25-20',
    projectName: 'Interventoría Teleférico Palmitas',
    location: 'Medellín / Palmitas',
    weekStart: 'S08',
    weekEnd: 'S32',
    allocationPct: 50,
    status: 'confirmado',
  },
  {
    id: 'STF-09',
    employeeName: 'Jonathan Bernal',
    role: 'Logística de Taller y Transporte Operativo',
    department: 'Operaciones de Campo',
    projectCode: 'P25-20',
    projectName: 'Interventoría Teleférico Palmitas',
    location: 'Medellín, Antioquia',
    weekStart: 'S08',
    weekEnd: 'S32',
    allocationPct: 50,
    status: 'confirmado',
  },
];

interface TabCuadrillaProps {
  project: Project;
}

export const TabCuadrilla: React.FC<TabCuadrillaProps> = ({ project }) => {
  const [assignments, setAssignments] = useState<StaffAssignment[]>(DEFAULT_STAFFING_DATA);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFront, setFilterFront] = useState<'all' | 'this_project' | 'internacional'>('all');
  const [selectedWeekRange, setSelectedWeekRange] = useState<'Q1' | 'Q2' | 'Q3' | 'Q4'>('Q1');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Formulario nuevo personal
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('Ingeniero de Campo STC');
  const [empLocation, setEmpLocation] = useState(project.location || 'Medellín');
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
        a.projectCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchFront =
        filterFront === 'all' ||
        (filterFront === 'this_project' && (a.projectCode === project.code || a.projectName.toLowerCase().includes(project.name.toLowerCase()))) ||
        (filterFront === 'internacional' && (a.location.includes('Salvador') || a.location.includes('Panamá') || a.location.includes('Bolivia')));

      return matchSearch && matchFront;
    });
  }, [assignments, searchTerm, filterFront, project]);

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName) return;

    const newAssoc: StaffAssignment = {
      id: `STF-${Date.now()}`,
      employeeName: empName,
      role: empRole,
      department: 'Ingeniería y Operaciones',
      projectCode: project.code,
      projectName: project.name,
      location: empLocation,
      weekStart,
      weekEnd,
      allocationPct: allocPct,
      status: 'confirmado',
    };

    setAssignments([newAssoc, ...assignments]);
    setIsModalOpen(false);
    setEmpName('');
  };

  const isAssignedInWeek = (assign: StaffAssignment, week: string) => {
    const wNum = parseInt(week.replace('S', ''), 10);
    const startNum = parseInt(assign.weekStart.replace('S', ''), 10);
    const endNum = parseInt(assign.weekEnd.replace('S', ''), 10);
    return wNum >= startNum && wNum <= endNum;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* TARJETAS RESUMEN DE STAFFING */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personal Programado</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center">
              <Users size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            {assignments.length} Ingenieros / Técnicos
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Plan de Personal Requerido ITK 2025-2028</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Frentes Internacionales</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MapPin size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-indigo-900">
            3 Países
          </div>
          <p className="mt-2 text-[11px] text-indigo-700 font-medium">El Salvador, Panamá y Bolivia</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Seguridad y Salud (SST)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-emerald-800">
            100% Cubierto
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Erika Escalante & Viviana Fernández</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Horizonte de Ejecución</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black tracking-tight text-slate-900">
            S1 a S52 (36 meses)
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Programación semanal multianual</p>
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
            <select
              value={filterFront}
              onChange={(e: any) => setFilterFront(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-semibold"
            >
              <option value="all">Todos los Frentes y Proyectos</option>
              <option value="this_project">Solo este Proyecto ({project.code})</option>
              <option value="internacional">Solo Frentes Internacionales</option>
            </select>

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
              Matriz Semanal de Staffing ({selectedWeekRange}) • Inteckno S.A.S.
            </h3>
            <p className="text-[11px] text-slate-500">
              Visualización de carga, frentes de obra y porcentaje de dedicación
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
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.map((assign) => (
              <tr key={assign.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="font-bold text-slate-900">{assign.employeeName}</div>
                  <div className="text-[10px] text-slate-500">{assign.role}</div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="text-xs font-semibold text-[#00668F]">{assign.projectCode}</div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <MapPin size={10} />
                    <span>{assign.location}</span>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
                <label className="block font-bold text-slate-700 mb-1">Nombre del Colaborador *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Juan Pablo Castellanos"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
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
                  value={empLocation}
                  onChange={(e) => setEmpLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semana Inicial</label>
                  <select
                    value={weekStart}
                    onChange={(e) => setWeekStart(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {Array.from({ length: 52 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Semana Final</label>
                  <select
                    value={weekEnd}
                    onChange={(e) => setWeekEnd(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    {Array.from({ length: 52 }, (_, i) => `S${String(i + 1).padStart(2, '0')}`).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Porcentaje de Dedicación (%)</label>
                <select
                  value={allocPct}
                  onChange={(e) => setAllocPct(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-[#00668F]"
                >
                  <option value={100}>100% - Tiempo Completo Exclusivo</option>
                  <option value={50}>50% - Dedicación Compartida (Prorrateo)</option>
                  <option value={25}>25% - Asesoría / Supervisión Parcial</option>
                </select>
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

import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FolderTree,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { TimesheetEntry } from '../../types';
import { LightTable } from '../../components/ui/LightTable';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { useModuleCatalog, getLaborRates } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { formatCOP } from '../../core/services/trmService';

export const TimesheetModule: React.FC = () => {
  const {
    timesheets,
    projects,
    tasks,
    users,
    employees,
    currentUser,
    submitTimesheet,
    approveTimesheet,
    rejectTimesheet,
    deleteTimesheet,
    navigationContext,
    clearNavigationContext,
    navigateWithContext,
  } = useErp();

  // Estado del formulario rápido móvil
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [selectedItemCode, setSelectedItemCode] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);
  const [hours, setHours] = useState(8);
  const [description, setDescription] = useState('');
  const [taskName, setTaskName] = useState('');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [timesheetToDelete, setTimesheetToDelete] = useState<TimesheetEntry | null>(null);

  // Desglose de Recargos Laborales (Ley 2101 / Colombia)
  const [isDetailedLaborMode, setIsDetailedLaborMode] = useState(false);
  const [hodHours, setHodHours] = useState<number>(8); // Ordinarias Diurnas (1.00)
  const [hedHours, setHedHours] = useState<number>(0); // Extras Diurnas (1.25)
  const [rnHours, setRnHours] = useState<number>(0);   // Recargo Nocturno (0.35)
  const [henHours, setHenHours] = useState<number>(0);  // Extras Nocturnas (1.75)
  const [domHours, setDomHours] = useState<number>(0);  // Dominicales / Festivos (1.75)
  const [heddHours, setHeddHours] = useState<number>(0); // Extras Dom. Diurnas (2.00)
  const [hendHours, setHendHours] = useState<number>(0); // Extras Dom. Nocturnas (2.50)

  // Mantener actualizado el usuario seleccionado si cambia currentUser
  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUserId(currentUser.id);
    }
  }, [currentUser.id, selectedUserId]);

  useEffect(() => {
    if (navigationContext && navigationContext.targetModule === 'registro-horas') {
      if (navigationContext.action === 'impute_hours') {
        const pid = navigationContext.data?.projectId;
        if (pid) {
          setSelectedProjectId(pid);
          if (navigationContext.data?.itemCode) {
            setSelectedItemCode(navigationContext.data.itemCode);
          }
          clearNavigationContext();
        }
      }
    }
  }, [navigationContext, clearNavigationContext]);

  // Lista unificada de colaboradores (Usuarios de sistema + Personal registrado en Talento Humano)
  const collaboratorsList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string; email?: string }>();
    
    users.forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        role: u.roleLabel || u.department || 'Colaborador ITK',
        email: u.email,
      });
    });

    employees.forEach((emp) => {
      if (!map.has(emp.id)) {
        map.set(emp.id, {
          id: emp.id,
          name: emp.name,
          role: emp.role || emp.department || 'Técnico de Campo',
          email: emp.documentId ? `C.C. ${emp.documentId}` : undefined,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, employees]);

  const internalProjectsMap: Record<string, { id: string; code: string; name: string }> = {
    'PRJ-INTERNAL-TALLER': { id: 'PRJ-INTERNAL-TALLER', code: 'ITK-TALLER', name: 'Taller Central Guayabal (Banco de Ensayos & Maquinado)' },
    'PRJ-INTERNAL-SST': { id: 'PRJ-INTERNAL-SST', code: 'ITK-SST', name: 'Capacitación y Certificación en Alturas / SST' },
    'PRJ-INTERNAL-SEDE': { id: 'PRJ-INTERNAL-SEDE', code: 'ITK-ADMIN', name: 'Soporte Operativo y Logística de Sede' },
  };

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || internalProjectsMap[selectedProjectId] || projects[0];

  // Adjudicación Granular: Opciones de Ítems Contractuales del Proyecto
  const availableProjectItems = useMemo(() => {
    if (!selectedProject) return [];
    if (selectedProjectId.startsWith('PRJ-INTERNAL')) {
      return [{ id: 'INTERNO', name: '[ Actividad Interna Sede / Taller ]', code: 'INTERNO' }];
    }
    const items = (((selectedProject as any)?.projectItems || (selectedProject as any)?.items || []) as any[]);
    const formatted = items.map((it: any) => ({
      id: it.code,
      name: `${it.code} — ${it.name}`,
      code: it.code,
    }));
    return [
      ...formatted,
      { id: 'INDIRECTO', name: '[ Costo Indirecto / Soporte General ]', code: 'INDIRECTO' },
    ];
  }, [selectedProject, selectedProjectId]);

  // Si cambia el proyecto, seleccionar el primer ítem contractual o 'INDIRECTO'
  useEffect(() => {
    if (availableProjectItems.length > 0) {
      const match = availableProjectItems.find((i) => i.id === selectedItemCode);
      if (!match) {
        setSelectedItemCode(availableProjectItems[0]?.id || '');
      }
    } else {
      setSelectedItemCode('');
    }
  }, [selectedProjectId, availableProjectItems]);

  // Catálogo dinámico de labores técnicas + Tareas WBS reales del proyecto seleccionado
  const catalogLaborTypes = useModuleCatalog('registro-horas', 'laborTypes');
  const projectWbsTasks = useMemo(
    () => tasks.filter((t) => t.projectId === selectedProjectId),
    [tasks, selectedProjectId]
  );
  const combinedLaborOptions = useMemo(() => {
    const wbsOpts = projectWbsTasks.map((t) => ({
      id: t.name,
      name: `[WBS ${t.code}] ${t.name}`,
      code: t.code,
    }));
    const catOpts = catalogLaborTypes.map((lt) => ({
      id: lt.name,
      name: lt.name,
      code: lt.code,
    }));
    return [...wbsOpts, ...catOpts];
  }, [projectWbsTasks, catalogLaborTypes]);

  // Identificar el colaborador seleccionado
  const selectedCollaborator = collaboratorsList.find((c) => c.id === selectedUserId) || {
    id: currentUser.id,
    name: currentUser.name,
    role: currentUser.roleLabel || 'Colaborador ITK',
  };

  // Factores Laborales Dinámicos (Ley 2101)
  const laborRates = useMemo(() => getLaborRates(), [isConfigModalOpen]);

  // Encontrar el salario del colaborador para calcular la tarifa hora prestacional
  const collaboratorEmployee = useMemo(() => {
    return employees.find(
      (e) => e.id === selectedUserId || e.name.toLowerCase() === selectedCollaborator.name.toLowerCase()
    );
  }, [employees, selectedUserId, selectedCollaborator.name]);

  const baseSalaryCOP = collaboratorEmployee?.baseSalaryCOP || 0;
  const hasValidSalary = baseSalaryCOP > 0;
  const baseHourlyRateCOP = hasValidSalary ? Math.round((baseSalaryCOP * laborRates.factorPrestacional) / (laborRates.divisorMensual || 210)) : 0;

  // Total de Horas Efectivas
  const totalDetailedHours = hodHours + hedHours + henHours + domHours + heddHours + hendHours;
  const effectiveHours = isDetailedLaborMode ? (totalDetailedHours || hours) : hours;

  // Costo Total de Mano de Obra en COP
  const calculatedLaborCostCOP = useMemo(() => {
    if (!isDetailedLaborMode) {
      return effectiveHours * baseHourlyRateCOP;
    }
    const cost = baseHourlyRateCOP * (
      hodHours * laborRates.hod +
      hedHours * laborRates.hed +
      rnHours * laborRates.rn +
      henHours * laborRates.hen +
      domHours * laborRates.dom +
      heddHours * laborRates.hedd +
      hendHours * laborRates.hend
    );
    return Math.round(cost);
  }, [isDetailedLaborMode, effectiveHours, baseHourlyRateCOP, hodHours, hedHours, rnHours, henHours, domHours, heddHours, hendHours, laborRates]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    const matchedTask = projectWbsTasks.find(
      (t) => t.id === taskName || t.name === taskName || `[WBS ${t.code}] ${t.name}` === taskName || t.code === taskName
    );
    
    // Adjudicación Granular estricta: selectedItemCode tiene máxima prioridad
    const finalItemCode = selectedItemCode || matchedTask?.itemCode || (selectedProject as any)?.projectItems?.[0]?.code || undefined;

    submitTimesheet({
      userId: selectedCollaborator.id,
      userName: selectedCollaborator.name,
      userRole: selectedCollaborator.role,
      projectId: selectedProject.id,
      projectCode: selectedProject.code,
      projectName: selectedProject.name,
      taskId: matchedTask?.id || undefined,
      itemCode: finalItemCode,
      origin: 'global',
      taskName: taskName || 'Labores en Teleférico',
      date: new Date().toISOString().split('T')[0],
      hours: Number(effectiveHours),
      isBillable: !selectedProjectId.startsWith('PRJ-INTERNAL'),
      description: description || 'Labores técnicas en Sistema de Transporte por Cable según programación.',
      hoursBreakdown: isDetailedLaborMode ? {
        hod: hodHours,
        hed: hedHours,
        rn: rnHours,
        hen: henHours,
        dom: domHours,
        hedd: heddHours,
        hend: hendHours,
      } : undefined,
      hourlyRateCOP: baseHourlyRateCOP,
      totalCostCOP: calculatedLaborCostCOP,
    });

    setDescription('');
  };

  const isLeader =
    currentUser.role === 'lider_proyectos' ||
    currentUser.role === 'gerente_general' ||
    currentUser.role === 'gerente_administrativa' ||
    currentUser.role === 'supervisor_tecnico';

  return (
    <div className="space-y-4 w-full max-w-full min-w-0 animate-in fade-in duration-200">
      
      {/* SECCIÓN PRINCIPAL: RADICACIÓN GRANULAR DE HORAS (LEY 2101) */}
      <div className="p-4 sm:p-5 bg-white rounded-xl space-y-4 w-full max-w-full min-w-0 shadow-2xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#EBF5FA] text-[#00668F] flex items-center justify-center shrink-0">
              <Clock size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Radicación de Horas con Adjudicación Granular
              </h3>
              <p className="text-xs text-slate-500">
                Imputación atómica por ÍTEM Contractual y discriminación de recargos (Ley 2101/2021)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsDetailedLaborMode(!isDetailedLaborMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                isDetailedLaborMode
                  ? 'bg-sky-50 text-[#00668F] border-sky-300 shadow-xs'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
              title="Alternar entre registro rápido y desglose por recargos"
            >
              <Zap size={14} className={isDetailedLaborMode ? 'text-[#00668F]' : 'text-slate-500'} />
              <span>{isDetailedLaborMode ? 'Desglose Ley 2101 Activo' : 'Activar Desglose Recargos'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer shadow-2xs"
              title="Personalizar factores de recargo, divisor y labores"
            >
              <Settings size={14} className="text-[#00668F]" />
              <span>Configuración</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleQuickSubmit} className="space-y-4">
          {/* Cuadrícula Simétrica de 2 Columnas (Estándar Regla 9) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Colaborador Técnico */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                1. Colaborador / Técnico Responsable
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

            {/* Proyecto STC */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                2. Proyecto STC Asignado
              </label>
              <CreatableSelect
                options={[
                  ...projects.map((p) => ({
                    id: p.id,
                    name: `${p.code} — ${p.name}`,
                    code: p.code,
                  })),
                  { id: 'PRJ-INTERNAL-TALLER', name: 'ITK-TALLER — Taller Guayabal (Banco de Ensayos & Maquinado)', code: 'ITK-TALLER' },
                  { id: 'PRJ-INTERNAL-SST', name: 'ITK-SST — Capacitación y Certificación en Alturas', code: 'ITK-SST' },
                  { id: 'PRJ-INTERNAL-SEDE', name: 'ITK-ADMIN — Soporte Operativo y Logística de Sede', code: 'ITK-ADMIN' },
                ]}
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                placeholder="Seleccionar o buscar proyecto..."
              />
            </div>

            {/* ADJUDICACIÓN GRANULAR: Ítem Contractual / Carpeta de Obra */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  3. Ítem Contractual / Carpeta de Obra (Adjudicación Atómica)
                </label>
                <span className="text-[10px] text-[#00668F] font-bold">Mandatorio Plan 1</span>
              </div>
              <CreatableSelect
                options={availableProjectItems}
                value={selectedItemCode}
                onChange={(val) => setSelectedItemCode(val)}
                placeholder="Seleccionar ítem contractual (ej. ITEM 01, ITEM 11)..."
              />
            </div>

            {/* Labor Técnica / Tarea WBS */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                4. Labor Técnica / Tarea WBS
              </label>
              <CreatableSelect
                key={selectedProjectId}
                value={taskName}
                onChange={(val) => setTaskName(val)}
                options={combinedLaborOptions}
                placeholder="Seleccionar tarea WBS o labor..."
                moduleId="registro-horas"
                catalogKey="laborTypes"
                allowCustomText={true}
              />
            </div>
          </div>

          {/* MODO DESGLOSE DETALLADO LEY 2101 / COLOMBIA */}
          {isDetailedLaborMode ? (
            <div className="p-3.5 rounded-xl bg-slate-50/90 border border-slate-200/80 space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">
                    Desglose de Horas y Recargos (Ley 2101 / Jornada {laborRates.divisorMensual}h/mes)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                    Tarifa Base: {formatCOP(baseHourlyRateCOP)}/h
                  </span>
                </div>
                <span className="text-xs font-bold text-emerald-700">
                  Costo Total Calculado: {formatCOP(calculatedLaborCostCOP)}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ordinarias (×{laborRates.hod})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hodHours || ''}
                    placeholder="0"
                    onChange={(e) => setHodHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ext. Diurnas (×{laborRates.hed})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hedHours || ''}
                    placeholder="0"
                    onChange={(e) => setHedHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Rec. Nocturno (×{laborRates.rn})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={rnHours || ''}
                    placeholder="0"
                    onChange={(e) => setRnHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ext. Nocturnas (×{laborRates.hen})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={henHours || ''}
                    placeholder="0"
                    onChange={(e) => setHenHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Dominical (×{laborRates.dom})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={domHours || ''}
                    placeholder="0"
                    onChange={(e) => setDomHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ext. Dom. D. (×{laborRates.hedd})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={heddHours || ''}
                    placeholder="0"
                    onChange={(e) => setHeddHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ext. Dom. N. (×{laborRates.hend})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={hendHours || ''}
                    placeholder="0"
                    onChange={(e) => setHendHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-center border border-slate-300 rounded-lg bg-white"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  5. Total Horas Trabajadas
                </label>
                <span className="text-[11px] text-slate-500">
                  Tarifa: {formatCOP(baseHourlyRateCOP)}/h • Costo: <strong className="text-emerald-700">{formatCOP(calculatedLaborCostCOP)}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[4, 8, 9, 10].map((h) => (
                  <button
                    type="button"
                    key={h}
                    onClick={() => setHours(h)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      hours === h
                        ? 'bg-[#00668F] text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
                <div className="w-24">
                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={hours || ''}
                    placeholder="0"
                    onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 text-xs font-bold text-center border border-slate-300 rounded-xl bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Detalle y Envío */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center pt-1">
            <div className="md:col-span-3">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalle de labores técnicas (ej. Calibración de pinzas vano P04-P05, torque pernos...)"
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-[#00668F]"
              />
            </div>

            <div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-md active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>Radicar Horas ({effectiveHours}h)</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* HISTORIAL Y APROBACIONES DE HORAS */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5 w-full max-w-full min-w-0 shadow-2xs border border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-1 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Historial de Horas y Control de Planillas</h3>
            <p className="text-xs text-slate-500">Trazabilidad por ÍTEM Contractual y liquidación de costos reales</p>
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
              header: 'Proyecto STC / Ítem',
              render: (t) => (
                <div>
                  <div className="flex items-center gap-1.5">
                    {t.projectId && !t.projectId.startsWith('PRJ-INTERNAL') ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigateWithContext('proyectos', 'view_project', { projectId: t.projectId, tab: 'horas' });
                        }}
                        title={`Ir al Proyecto ${t.projectCode}`}
                        className="font-bold text-xs text-[#00668F] hover:underline flex items-center gap-1 group cursor-pointer"
                      >
                        <span>{t.projectCode}</span>
                        <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ) : (
                      <span className="font-bold text-xs text-[#00668F]">{t.projectCode}</span>
                    )}

                    {t.itemCode && (
                      <span className="px-2 py-0.5 rounded-md bg-sky-100 text-[#00668F] text-[10px] font-bold">
                        {t.itemCode}
                      </span>
                    )}
                  </div>
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
              header: 'Horas / Costo Imputado',
              align: 'center',
              render: (t) => (
                <div className="flex flex-col items-center">
                  <span className="font-extrabold text-xs text-gray-800 bg-gray-100 px-2.5 py-0.5 rounded-full">
                    {t.hours} hrs
                  </span>
                  <span className="text-[10px] text-emerald-700 font-bold mt-0.5">
                    {t.totalCostCOP ? formatCOP(t.totalCostCOP) : formatCOP((t.hours || 0) * (t.hourlyRateCOP || baseHourlyRateCOP))}
                  </span>
                </div>
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
                          className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-all cursor-pointer"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => rejectTimesheet(t.id, 'Requiere mayor detalle en actividades de campo.')}
                          className="px-2 py-1 rounded-full bg-gray-100 hover:bg-rose-50 text-gray-600 hover:text-rose-700 text-[11px] font-semibold transition-colors cursor-pointer"
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

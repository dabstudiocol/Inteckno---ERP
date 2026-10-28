import React, { useState, useEffect, useMemo } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  LayoutList, 
  Kanban, 
  GanttChartSquare, 
  ChevronRight, 
  ArrowLeft,
  DollarSign, 
  Layers, 
  Clock, 
  ShieldCheck, 
  BarChart3, 
  CheckCircle2, 
  FileText,
  Trash2,
  Info,
  BookOpen,
  GraduationCap,
  Edit,
  Settings,
  Users,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { Project } from '../../types';
import { ProjectDynamicForm } from './components/ProjectDynamicForm';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { TabDashboard } from './components/tabs/TabDashboard';
import { TabWbsGantt } from './components/tabs/TabWbsGantt';
import { TabCostosPresupuesto } from './components/tabs/TabCostosPresupuesto';
import { TabSuministrosQC } from './components/tabs/TabSuministrosQC';
import { TabHojaHoras } from './components/tabs/TabHojaHoras';
import { TabHseqOffline } from './components/tabs/TabHseqOffline';
import { TabOrdenesCambio } from './components/tabs/TabOrdenesCambio';
import { TabDocumentosEntregables } from './components/tabs/TabDocumentosEntregables';
import { TabAsistentesCapacitacion } from './components/tabs/TabAsistentesCapacitacion';
import { TabCuadrilla } from './components/tabs/TabCuadrilla';
import { INTECKNO_PORTFOLIO } from '../../core/config/portfolioCatalog';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { DetailModal } from '../../components/common/DetailModal';
import { TemplateManagerModal } from '../../components/common/TemplateManagerModal';
import { formatCOP, getStoredTRM } from '../../core/services/trmService';
import { CreatableSelect } from '../../components/common/CreatableSelect';

type GlobalViewMode = 'table' | 'kanban' | 'gantt';
type InternalTab = 'dashboard' | 'wbs' | 'costos' | 'cuadrilla' | 'suministros' | 'horas' | 'hseq' | 'cambios' | 'documentos' | 'asistentes';

export interface ProjectsModuleProps {
  initialView?: 'gantt' | 'list' | 'engineering' | 'table' | 'kanban';
}

export const ProjectsModule: React.FC<ProjectsModuleProps> = ({ initialView }) => {
  const {
    projects,
    tasks,
    opportunities,
    users,
    partners,
    createProject,
    updateProject,
    deleteProject,
    addWbsTask,
    updateTask,
    deleteTask,
  } = useErp();

  const currentTrm = getStoredTRM();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const getInitialViewMode = (): GlobalViewMode => {
    if (initialView === 'gantt') return 'gantt';
    if (initialView === 'kanban') return 'kanban';
    return 'table';
  };

  const [viewMode, setViewMode] = useState<GlobalViewMode>(getInitialViewMode());
  const [activeTab, setActiveTab] = useState<InternalTab>('dashboard');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [isModuleConfigOpen, setIsModuleConfigOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [isTemplateManagerOpen, setIsTemplateManagerOpen] = useState<boolean>(false);

  useEffect(() => {
    if (initialView === 'gantt') setViewMode('gantt');
    else if (initialView === 'kanban') setViewMode('kanban');
    else if (initialView === 'list' || initialView === 'table') setViewMode('table');
  }, [initialView]);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pmFilter, setPmFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [countryFilter, setCountryFilter] = useState<string>('all');

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;
  const rawProjectTasks = selectedProject ? tasks.filter(t => t.projectId === selectedProject.id) : [];

  const projectTasks = useMemo(() => {
    if (!selectedProject) return [];
    const timesheetEntries = (selectedProject as any)?.timesheetEntries || [];

    return rawProjectTasks.map((t) => {
      const cleanName = t.name?.trim().toLowerCase() || '';
      const cleanCode = t.code?.trim().toLowerCase() || '';

      const taskTimesheetHours = timesheetEntries
        .filter((e: any) => {
          if (!e) return false;
          const matchId = e.taskId && (e.taskId === t.id || e.taskId === t.code);
          const eName = e.taskName ? e.taskName.trim().toLowerCase() : '';
          const matchName = eName && cleanName && (
            eName === cleanName ||
            eName.includes(cleanName) ||
            cleanName.includes(eName)
          );
          const eCode = e.taskCode ? e.taskCode.trim().toLowerCase() : '';
          const matchCode = eCode && cleanCode && eCode === cleanCode;
          return Boolean(matchId || matchName || matchCode);
        })
        .reduce((sum: number, e: any) => sum + (Number(e.hours) || 0), 0);

      const effectiveActual = Math.max(t.actualHours || 0, taskTimesheetHours);
      const planned = t.plannedHours || (t.durationDays * 8) || 40;
      const computedPct = planned > 0
        ? Math.min(100, Math.round((effectiveActual / planned) * 100))
        : 0;

      const effectivePct = (t.progressMethod === 'hours' || !t.progressPct || t.progressPct === 0)
        ? computedPct
        : Math.max(t.progressPct, computedPct);

      let effectiveStatus = t.status;
      if (effectivePct >= 100) {
        effectiveStatus = 'completed';
      } else if (effectivePct > 0 && effectiveStatus === 'pending') {
        effectiveStatus = 'in_progress';
      }

      return {
        ...t,
        actualHours: effectiveActual,
        progressPct: effectivePct,
        status: effectiveStatus,
      };
    });
  }, [selectedProject, rawProjectTasks]);

  // Unique lists for filters
  const uniquePMs = Array.from(new Set(projects.map(p => p.supervisorName).filter(Boolean))).sort();
  const uniqueClients = Array.from(new Set(projects.map(p => p.clientName).filter(Boolean))).sort();
  const uniqueCountries = Array.from(new Set(projects.map(p => p.clientCountry || 'Colombia').filter(Boolean))).sort();

  // Filtered projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesPM = pmFilter === 'all' || p.supervisorName === pmFilter;
    const matchesClient = clientFilter === 'all' || p.clientName === clientFilter;
    const matchesCountry = countryFilter === 'all' || (p.clientCountry || 'Colombia') === countryFilter;

    return matchesSearch && matchesStatus && matchesPM && matchesClient && matchesCountry;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
      case 'in_progress':
        return { 
          label: 'En ejecución', 
          description: 'El plan ya se puso en marcha y se están realizando las actividades.',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' 
        };
      case 'in_adjustments':
        return { 
          label: 'En ajustes', 
          description: 'Se modifica tras encontrar observaciones una vez aprobado o iniciado.',
          color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300' 
        };
      case 'on_hold':
        return { 
          label: 'En espera (En pausa)', 
          description: 'Las actividades se detuvieron temporalmente.',
          color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' 
        };
      case 'cancelled':
        return { 
          label: 'Cancelado', 
          description: 'El proyecto se terminó antes de completarse.',
          color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' 
        };
      case 'completed':
      case 'closed':
      case 'in_closing':
        return { 
          label: 'Cerrado / Finalizado', 
          description: 'Se completaron los objetivos y se entregaron los resultados.',
          color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300' 
        };
      case 'archived':
        return { 
          label: 'Archivado', 
          description: 'El proyecto terminó o se canceló, y sus registros se guardan para consulta.',
          color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300' 
        };
      case 'kickoff':
      case 'prospecting':
        return { 
          label: 'En ajustes', 
          description: 'Preparación y ajustes iniciales de ingeniería.',
          color: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300' 
        };
      default:
        return { label: status, description: '', color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  const handleUpdateCurrentProject = (updates: Partial<Project>) => {
    if (selectedProject) {
      updateProject(selectedProject.id, updates);
    }
  };

  const getProjectPortfolioCategory = (p: Project): string => {
    if (p.categoryId) return p.categoryId;
    if (p.dynamicData?.categoryId) return p.dynamicData.categoryId;
    if (p.serviceCategory) return p.serviceCategory;
    
    // Inferencia de fallback para proyectos previos
    const st = (p.serviceType || '').toUpperCase();
    const lob = (p.lineOfBusiness || '').toUpperCase();
    
    if (st.includes('INSPECCIÓN') || st.includes('PREDICTIVO') || st.includes('MRT') || st.includes('END') || lob === 'DIAGNÓSTICO') {
      return 'INSPECCIONES Y MANTENIMIENTO PREDICTIVO';
    }
    if (st.includes('FORMACIÓN') || st.includes('CAPACITACIÓN') || st.includes('ENTRENAMIENTO')) {
      return 'FORMACIÓN TÉCNICA ESPECIALIZADA';
    }
    if (st.includes('CONSULTORÍA') || st.includes('PREFACTIBILIDAD') || lob === 'CONSULTORÍA' || lob === 'DISEÑO') {
      return 'CONSULTORIA';
    }
    if (st.includes('HERRAMIENTAS') || st.includes('EQUIPOS')) {
      return 'PROYECTOS ESPECIALES DE HERRAMIENTAS Y EQUIPOS';
    }
    if (st.includes('IMPLEMENTACIÓN') || lob === 'MONTAJE') {
      return 'IMPLEMENTACIÓN DE PROYECTOS EN SISTEMAS DE TRANSPORTE POR CABLE';
    }
    return 'MANTENIMIENTO Y MONTAJE ESPECIALIZADO';
  };

    const getVisibleTabs = (category: string): { id: InternalTab; label: string; icon: React.ReactNode }[] => {
      const baseTabs: { id: InternalTab; label: string; icon: React.ReactNode }[] = [
        { id: 'dashboard', label: 'Panel de Control', icon: <BarChart3 className="w-4 h-4" /> },
        { id: 'wbs', label: 'Plan y Cronograma', icon: <Layers className="w-4 h-4" /> },
        { id: 'costos', label: 'Costos y Presupuesto', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'cuadrilla', label: 'Personal & Staffing (S1..S52)', icon: <Users className="w-4 h-4" /> },
        { id: 'horas', label: 'Hojas de Horas / Turnos', icon: <Clock className="w-4 h-4" /> },
      ];

      // 1. MANTENIMIENTO Y MONTAJE ESPECIALIZADO / IMPLEMENTACIÓN STC
      if (
        category === 'MANTENIMIENTO Y MONTAJE ESPECIALIZADO' || 
        category === 'IMPLEMENTACIÓN DE PROYECTOS EN SISTEMAS DE TRANSPORTE POR CABLE'
      ) {
        return [
          ...baseTabs,
          { id: 'suministros', label: 'Suministros y Equipos QC', icon: <CheckCircle2 className="w-4 h-4" /> },
          { id: 'hseq', label: 'Seguridad y Salud (SST)', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'cambios', label: 'Órdenes de Cambio (Otro Sí)', icon: <FileText className="w-4 h-4" /> },
        ];
      }

      // 2. INSPECCIONES Y MANTENIMIENTO PREDICTIVO (MRT / END / Vibraciones)
      if (category === 'INSPECCIONES Y MANTENIMIENTO PREDICTIVO') {
        return [
          ...baseTabs,
          { id: 'suministros', label: 'Equipos MRT y Ensayos END', icon: <CheckCircle2 className="w-4 h-4" /> },
          { id: 'hseq', label: 'Seguridad y Salud (SST)', icon: <ShieldCheck className="w-4 h-4" /> },
          { id: 'cambios', label: 'Órdenes de Cambio (Otro Sí)', icon: <FileText className="w-4 h-4" /> },
        ];
      }

      // 3. CONSULTORIA / PROYECTOS ESPECIALES DE HERRAMIENTAS Y EQUIPOS
      if (
        category === 'CONSULTORIA' || 
        category === 'PROYECTOS ESPECIALES DE HERRAMIENTAS Y EQUIPOS'
      ) {
        return [
          ...baseTabs,
          { id: 'documentos', label: 'Entregables y Documentos', icon: <BookOpen className="w-4 h-4" /> },
          { id: 'suministros', label: 'Equipos y Herramientas', icon: <CheckCircle2 className="w-4 h-4" /> },
          { id: 'cambios', label: 'Órdenes de Cambio (Otro Sí)', icon: <FileText className="w-4 h-4" /> },
        ];
      }

      // 4. FORMACIÓN TÉCNICA ESPECIALIZADA
      if (category === 'FORMACIÓN TÉCNICA ESPECIALIZADA') {
        return [
          ...baseTabs,
          { id: 'asistentes', label: 'Lista de Asistentes', icon: <GraduationCap className="w-4 h-4" /> },
          { id: 'cambios', label: 'Órdenes de Cambio (Otro Sí)', icon: <FileText className="w-4 h-4" /> },
        ];
      }

      // Fallback universal
      return [
        ...baseTabs,
        { id: 'suministros', label: 'Suministros y Equipos', icon: <CheckCircle2 className="w-4 h-4" /> },
        { id: 'hseq', label: 'Seguridad y Salud (SST)', icon: <ShieldCheck className="w-4 h-4" /> },
        { id: 'cambios', label: 'Órdenes de Cambio (Otro Sí)', icon: <FileText className="w-4 h-4" /> },
      ];
    };

  // If a project is selected, render the dynamic internal tabs detail view
  if (selectedProject) {
    const projectCategory = getProjectPortfolioCategory(selectedProject);
    const visibleTabs = getVisibleTabs(projectCategory);
    const currentTab = visibleTabs.some(t => t.id === activeTab) ? activeTab : 'dashboard';

    return (
      <div className="space-y-6 animate-fadeIn pb-12">
        {/* Detail Top Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedProjectId(null)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title="Volver al listado de proyectos"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-[#00668F] bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                  {selectedProject.code}
                </span>
                {selectedProject.currency && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                    {selectedProject.currency}
                  </span>
                )}
                {selectedProject.contractCode && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Contrato: {selectedProject.contractCode}
                  </span>
                )}
                {selectedProject.quoteCode && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    Cotización: {selectedProject.quoteCode}
                  </span>
                )}
                <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {selectedProject.name}
                </h1>
                <div className="w-44">
                  <CreatableSelect
                    value={
                      selectedProject.status === 'active' ? 'En ejecución' :
                      selectedProject.status === 'in_adjustments' ? 'En ajustes' :
                      selectedProject.status === 'on_hold' ? 'En espera (En pausa)' :
                      selectedProject.status === 'cancelled' ? 'Cancelado' :
                      selectedProject.status === 'completed' ? 'Cerrado / Finalizado' :
                      selectedProject.status === 'archived' ? 'Archivado' :
                      selectedProject.status
                    }
                    onChange={(val) => {
                      if (val === 'En ejecución') handleUpdateCurrentProject({ status: 'active' });
                      else if (val === 'En ajustes') handleUpdateCurrentProject({ status: 'in_adjustments' });
                      else if (val === 'En espera (En pausa)') handleUpdateCurrentProject({ status: 'on_hold' });
                      else if (val === 'Cancelado') handleUpdateCurrentProject({ status: 'cancelled' });
                      else if (val === 'Cerrado / Finalizado') handleUpdateCurrentProject({ status: 'completed' });
                      else if (val === 'Archivado') handleUpdateCurrentProject({ status: 'archived' });
                    }}
                    options={[
                      'En ejecución',
                      'En ajustes',
                      'En espera (En pausa)',
                      'Cancelado',
                      'Cerrado / Finalizado',
                      'Archivado',
                    ]}
                    placeholder="Estado..."
                    allowCustomText={false}
                    isClearable={false}
                    inputClassName={`text-[11px] font-semibold py-1 px-2.5 rounded-full border ${getStatusBadge(selectedProject.status).color}`}
                  />
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <span>Cliente: <strong className="text-slate-700 dark:text-slate-300">{selectedProject.clientName}</strong></span>
                {selectedProject.location && <span>• Ubicación: <strong className="text-slate-700 dark:text-slate-300">{selectedProject.location}</strong></span>}
                <span>• Categoría: <strong className="text-slate-700 dark:text-slate-300">{projectCategory}</strong></span>
                <span>• Servicio: <strong className="text-slate-700 dark:text-slate-300">{selectedProject.serviceId || selectedProject.serviceType}</strong></span>
                <span>• Líder: <strong className="text-slate-700 dark:text-slate-300">{selectedProject.supervisorName || 'Sin asignar'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 block uppercase font-medium">Presupuesto Planificado</span>
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {formatCOP(selectedProject.budgetPV || 0)}
              </span>
            </div>

            <button
              onClick={() => setEditingProject(selectedProject)}
              className="p-2 rounded-lg border border-[#00668F]/30 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 text-[#00668F] dark:text-cyan-400 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Editar datos generales y fechas del proyecto"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden md:inline">Editar Proyecto</span>
            </button>

            <button
              onClick={() => setDetailProject(selectedProject)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Ver ficha técnica completa del proyecto"
            >
              <Info className="w-4 h-4 text-[#00668F]" />
              <span className="hidden md:inline">Ficha Detalle</span>
            </button>

            <button
              onClick={() => setIsTemplateManagerOpen(true)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
              title="Gestionar plantillas WBS especializadas (Ver, Editar, Duplicar)"
            >
              <FolderKanban className="w-4 h-4 text-[#00668F]" />
              <span className="hidden lg:inline">Plantillas WBS</span>
            </button>

            <button
              onClick={() => setIsModuleConfigOpen(true)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Configurar catálogos y opciones del módulo"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden lg:inline">Configuración</span>
            </button>

            <button
              onClick={() => setProjectToDelete(selectedProject)}
              className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Eliminar proyecto permanentemente"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden md:inline">Eliminar</span>
            </button>
          </div>
        </div>

        {/* Dynamic Internal Tabs Navigation */}
        <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar pb-px">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                currentTab === tab.id
                  ? 'border-[#00668F] text-[#00668F]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        <div>
          {currentTab === 'dashboard' && (
            <TabDashboard 
              project={selectedProject} 
              tasks={projectTasks} 
              currentTrm={currentTrm} 
            />
          )}

          {currentTab === 'wbs' && (
            <TabWbsGantt 
              project={selectedProject} 
              tasks={projectTasks}
              erpUsers={users || []}
              onAddTask={(newTask) => addWbsTask({ ...newTask, projectId: selectedProject.id })}
              onUpdateTask={(taskId, updates) => updateTask(taskId, updates)}
              onDeleteTask={(taskId) => deleteTask(taskId)}
            />
          )}

          {currentTab === 'costos' && (
            <TabCostosPresupuesto 
              project={selectedProject} 
              currentTrm={currentTrm} 
              onUpdateProject={handleUpdateCurrentProject}
            />
          )}

          {currentTab === 'cuadrilla' && (
            <TabCuadrilla 
              project={selectedProject} 
            />
          )}

          {currentTab === 'suministros' && (
            <TabSuministrosQC 
              project={selectedProject} 
              onUpdateProject={handleUpdateCurrentProject}
            />
          )}

          {currentTab === 'horas' && (
            <TabHojaHoras 
              project={selectedProject} 
              tasks={projectTasks}
              erpUsers={users || []}
              onUpdateProject={handleUpdateCurrentProject}
              onUpdateTask={(taskId, updates) => updateTask(taskId, updates)}
            />
          )}

          {currentTab === 'hseq' && (
            <TabHseqOffline 
              project={selectedProject} 
            />
          )}

          {currentTab === 'cambios' && (
            <TabOrdenesCambio 
              project={selectedProject} 
              currentTrm={currentTrm}
              onUpdateProject={handleUpdateCurrentProject}
            />
          )}

          {currentTab === 'documentos' && (
            <TabDocumentosEntregables 
              project={selectedProject} 
              onUpdateProject={handleUpdateCurrentProject}
            />
          )}

          {currentTab === 'asistentes' && (
            <TabAsistentesCapacitacion 
              project={selectedProject} 
              onUpdateProject={handleUpdateCurrentProject}
            />
          )}
        </div>

        {/* Modal Editar Proyecto STC (Dentro de la vista detalle) */}
        {editingProject && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
              <ProjectDynamicForm
                initialData={editingProject}
                opportunities={opportunities || []}
                erpUsers={users || []}
                partners={partners || []}
                currentTrm={currentTrm}
                onSubmit={(updatedData) => {
                  updateProject(editingProject.id, updatedData as any);
                  setEditingProject(null);
                }}
                onCancel={() => setEditingProject(null)}
              />
            </div>
          </div>
        )}

        {/* Modal Universal de Configuración de Módulo (Dentro de la vista detalle) */}
        <UniversalModuleConfigModal
          isOpen={isModuleConfigOpen}
          onClose={() => setIsModuleConfigOpen(false)}
          moduleId="proyectos"
          moduleTitle="Configuración del Módulo de Proyectos"
        />

        {/* Modal Confirmar Eliminación Crítica de Proyecto (Dentro de la vista detalle) */}
        <ConfirmDeleteModal
          isOpen={Boolean(projectToDelete)}
          title="¿Eliminar Proyecto Crítico?"
          itemName={projectToDelete ? `${projectToDelete.code} - ${projectToDelete.name}` : ''}
          description="Esta acción eliminará el proyecto y todos sus paquetes de trabajo asociados del ERP. Al ser una entidad crítica, debes confirmar escribiendo la palabra exacta."
          requireConfirmWord={true}
          confirmWord="BORRAR"
          confirmText="Eliminar Proyecto"
          onConfirm={() => {
            if (projectToDelete) {
              deleteProject(projectToDelete.id);
              if (selectedProjectId === projectToDelete.id) {
                setSelectedProjectId(null);
              }
              setProjectToDelete(null);
            }
          }}
          onCancel={() => setProjectToDelete(null)}
        />

        {/* Modal Detalle Completo de Proyecto (Dentro de la vista detalle) */}
        <DetailModal
          isOpen={Boolean(detailProject)}
          title={detailProject?.name || 'Ficha de Proyecto'}
          subtitle={detailProject ? `Código: ${detailProject.code} | Cliente: ${detailProject.clientName}` : ''}
          badge={detailProject ? {
            label: getStatusBadge(detailProject.status).label,
            color: getStatusBadge(detailProject.status).color
          } : undefined}
          onClose={() => setDetailProject(null)}
          fields={detailProject ? [
            { label: 'Código de Proyecto', value: detailProject.code, isMono: true },
            { label: 'Cliente', value: detailProject.clientName },
            { label: 'Categoría de Servicio', value: detailProject.categoryId || getProjectPortfolioCategory(detailProject) },
            { label: 'Sub-servicio Técnico', value: detailProject.serviceId || detailProject.serviceType || 'Ingeniería Mecánica' },
            { label: 'Líder / PM Asignado', value: detailProject.supervisorName || 'Sin asignar' },
            { label: 'Ubicación / Sitio', value: detailProject.location || 'No especificada' },
            { label: 'Fecha Inicio Plan', value: detailProject.startDate || 'Pendiente' },
            { label: 'Fecha Fin Plan', value: detailProject.endDate || 'Pendiente' },
            { label: 'Presupuesto Planificado (PV)', value: formatCOP(detailProject.budgetPV || 0), isMono: true },
            { label: 'Valor Ganado (EV)', value: formatCOP(detailProject.earnedValueEV || 0), isMono: true },
            { label: 'Costo Real Incurrido (AC)', value: formatCOP(detailProject.actualCostAC || 0), isMono: true },
            { label: 'Índice SPI (Cronograma)', value: detailProject.spi ? detailProject.spi.toFixed(2) : '1.00', isMono: true },
            { label: 'Índice CPI (Costos)', value: detailProject.cpi ? detailProject.cpi.toFixed(2) : '1.00', isMono: true },
            ...(detailProject.dynamicData?.componentIntervened ? [{ label: 'Componente Intervenido', value: detailProject.dynamicData.componentIntervened }] : []),
            ...(detailProject.dynamicData?.cableInterventionLengthMeters ? [{ label: 'Longitud Cable Intervenido', value: `${detailProject.dynamicData.cableInterventionLengthMeters} m` }] : []),
            ...(detailProject.dynamicData?.applicableStandard ? [{ label: 'Norma Aplicable', value: detailProject.dynamicData.applicableStandard }] : []),
            ...(detailProject.dynamicData?.measurementEquipmentName ? [{ label: 'Equipo Medición END', value: detailProject.dynamicData.measurementEquipmentName }] : []),
            ...(detailProject.dynamicData?.studyPhase ? [{ label: 'Fase de Estudio', value: detailProject.dynamicData.studyPhase }] : []),
            ...(detailProject.dynamicData?.trainingTopic ? [{ label: 'Tema de Capacitación', value: detailProject.dynamicData.trainingTopic }] : []),
            { label: 'Descripción / Alcance', value: detailProject.description || detailProject.dynamicData?.scopeSummary || 'Sin descripción registrada.', colSpan: 2 },
          ] : []}
        />
      </div>
    );
  }

  // Global Project Listing View
  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl text-[#00668F]">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Gestión de Proyectos STC
              </h1>
              <p className="text-xs text-slate-500">
                Ingeniería Mecánica • Tuberías, Tanques API 650, Estructuras y Montaje
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-[#00668F] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Vista de Tabla"
            >
              <LayoutList className="w-4 h-4" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-900 text-[#00668F] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Vista Kanban"
            >
              <Kanban className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'gantt'
                  ? 'bg-white dark:bg-slate-900 text-[#00668F] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
              title="Vista Cronograma de Actividades"
            >
              <GanttChartSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Cronograma</span>
            </button>
          </div>

          <button
            onClick={() => setIsTemplateManagerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
            title="Gestionar plantillas WBS oficiales (Ver, Editar, Duplicar)"
          >
            <FolderKanban className="w-4 h-4 text-[#00668F]" />
            <span className="hidden sm:inline">Plantillas WBS</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-xl transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Proyecto STC</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar código, nombre o cliente..."
            className="w-full pl-9 pr-3 py-2 text-xs border rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#00668F]"
          />
        </div>

        {/* Status Filter */}
        <div>
          <CreatableSelect
            value={
              statusFilter === 'all' ? 'Todos los Estados' :
              statusFilter === 'active' ? 'En ejecución' :
              statusFilter === 'in_adjustments' ? 'En ajustes' :
              statusFilter === 'on_hold' ? 'En espera (En pausa)' :
              statusFilter === 'cancelled' ? 'Cancelado' :
              statusFilter === 'completed' ? 'Cerrado / Finalizado' :
              'Archivado'
            }
            onChange={(val) => {
              if (val === 'En ejecución') setStatusFilter('active');
              else if (val === 'En ajustes') setStatusFilter('in_adjustments');
              else if (val === 'En espera (En pausa)') setStatusFilter('on_hold');
              else if (val === 'Cancelado') setStatusFilter('cancelled');
              else if (val === 'Cerrado / Finalizado') setStatusFilter('completed');
              else if (val === 'Archivado') setStatusFilter('archived');
              else setStatusFilter('all');
            }}
            options={[
              'Todos los Estados',
              'En ejecución',
              'En ajustes',
              'En espera (En pausa)',
              'Cancelado',
              'Cerrado / Finalizado',
              'Archivado',
            ]}
            placeholder="Filtrar por estado..."
            allowCustomText={false}
            isClearable={false}
            inputClassName="text-xs px-3 py-2 border rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* PM Filter */}
        <div>
          <CreatableSelect
            value={pmFilter === 'all' ? 'Todos los Responsables' : pmFilter}
            onChange={(val) => setPmFilter(!val || val === 'Todos los Responsables' ? 'all' : val)}
            options={['Todos los Responsables', ...uniquePMs]}
            placeholder="Filtrar por responsable..."
            allowCustomText={false}
            isClearable={false}
            inputClassName="text-xs px-3 py-2 border rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* Cliente Filter */}
        <div>
          <CreatableSelect
            value={clientFilter === 'all' ? `Todos los Clientes (${uniqueClients.length})` : clientFilter}
            onChange={(val) => setClientFilter(!val || val.startsWith('Todos los Clientes') ? 'all' : val)}
            options={[`Todos los Clientes (${uniqueClients.length})`, ...uniqueClients]}
            placeholder="Filtrar por cliente..."
            allowCustomText={false}
            isClearable={false}
            inputClassName="text-xs px-3 py-2 border rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>

        {/* País / Jurisdicción Filter */}
        <div>
          <CreatableSelect
            value={countryFilter === 'all' ? `Todos los Países (${uniqueCountries.length})` : countryFilter}
            onChange={(val) => setCountryFilter(!val || val.startsWith('Todos los Países') ? 'all' : val)}
            options={[`Todos los Países (${uniqueCountries.length})`, ...uniqueCountries]}
            placeholder="Filtrar por país..."
            allowCustomText={false}
            isClearable={false}
            inputClassName="text-xs px-3 py-2 border rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Main Content by Selected View Mode */}
      {filteredProjects.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <FolderKanban className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No se encontraron proyectos
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {projects.length === 0
              ? 'No hay proyectos registrados en la base de datos de Firebase. Haz clic en "Nuevo Proyecto STC" para crear el primero.'
              : 'Ningún proyecto coincide con los criterios de búsqueda o filtros seleccionados.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Crear Proyecto STC
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Código / Proyecto</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Línea STC</th>
                  <th className="py-3 px-4">Responsable</th>
                  <th className="py-3 px-4">Fechas</th>
                  <th className="py-3 px-4">Presupuesto</th>
                  <th className="py-3 px-4">Avance</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProjects.map(proj => {
                  const badge = getStatusBadge(proj.status);
                  const progress = proj.budgetPV > 0 
                    ? Math.round(((proj.earnedValueEV || 0) / proj.budgetPV) * 100) 
                    : ((proj as any).progressPercent || 0);
                  return (
                    <tr 
                      key={proj.id} 
                      onClick={() => setSelectedProjectId(proj.id)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-mono font-semibold text-[#00668F]">
                          {proj.code}
                        </div>
                        <div className="font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                          {proj.name}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                        {proj.clientName}
                      </td>
                      <td className="py-3 px-4">
                        <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {proj.lineOfBusiness || 'Mantenimiento'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        {proj.supervisorName || 'Sin asignar'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        <div>Inicio: {proj.startDate || '-'}</div>
                        <div>Fin: {proj.endDate || '-'}</div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                        {formatCOP(proj.budgetPV || 0)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-[#00668F] h-1.5 rounded-full" 
                              style={{ width: `${Math.min(progress, 100)}%` }} 
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300">{progress}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[150px]" onClick={(e) => e.stopPropagation()}>
                        <CreatableSelect
                          value={
                            proj.status === 'active' ? 'En ejecución' :
                            proj.status === 'in_adjustments' ? 'En ajustes' :
                            proj.status === 'on_hold' ? 'En espera (En pausa)' :
                            proj.status === 'cancelled' ? 'Cancelado' :
                            proj.status === 'completed' ? 'Cerrado / Finalizado' :
                            proj.status === 'archived' ? 'Archivado' :
                            proj.status
                          }
                          onChange={(val) => {
                            if (val === 'En ejecución') updateProject(proj.id, { status: 'active' });
                            else if (val === 'En ajustes') updateProject(proj.id, { status: 'in_adjustments' });
                            else if (val === 'En espera (En pausa)') updateProject(proj.id, { status: 'on_hold' });
                            else if (val === 'Cancelado') updateProject(proj.id, { status: 'cancelled' });
                            else if (val === 'Cerrado / Finalizado') updateProject(proj.id, { status: 'completed' });
                            else if (val === 'Archivado') updateProject(proj.id, { status: 'archived' });
                          }}
                          options={[
                            'En ejecución',
                            'En ajustes',
                            'En espera (En pausa)',
                            'Cancelado',
                            'Cerrado / Finalizado',
                            'Archivado',
                          ]}
                          placeholder="Estado..."
                          allowCustomText={false}
                          isClearable={false}
                          inputClassName={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setDetailProject(proj)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-500 hover:text-[#00668F] transition-colors"
                            title="Ver detalles completos del proyecto"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProjectToDelete(proj)}
                            className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                            title="Eliminar proyecto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSelectedProjectId(proj.id)}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-600"
                            title="Abrir proyecto"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'kanban' ? (
        /* KANBAN VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {([
            { key: 'active', label: 'En ejecución', desc: 'El plan ya se puso en marcha y se están realizando las actividades.' },
            { key: 'in_adjustments', label: 'En ajustes', desc: 'Se modifica tras encontrar observaciones una vez aprobado o iniciado.' },
            { key: 'on_hold', label: 'En espera (En pausa)', desc: 'Las actividades se detuvieron temporalmente.' },
            { key: 'cancelled', label: 'Cancelado', desc: 'El proyecto se terminó antes de completarse.' },
            { key: 'completed', label: 'Cerrado / Finalizado', desc: 'Se completaron los objetivos y se entregaron los resultados.' },
            { key: 'archived', label: 'Archivado', desc: 'El proyecto terminó o se canceló, y sus registros se guardan para consulta.' },
          ] as const).map(col => {
            const statusProjects = filteredProjects.filter(p => {
              if (col.key === 'active') return p.status === 'active' || p.status === 'in_progress';
              if (col.key === 'completed') return p.status === 'completed' || p.status === 'closed' || p.status === 'in_closing';
              if (col.key === 'in_adjustments') return p.status === 'in_adjustments' || p.status === 'kickoff' || p.status === 'prospecting';
              return p.status === col.key;
            });

            return (
              <div key={col.key} className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col min-h-[460px]">
                <div className="pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 truncate" title={col.label}>
                      {col.label}
                    </span>
                    <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      {statusProjects.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight" title={col.desc}>
                    {col.desc}
                  </p>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {statusProjects.map(proj => (
                    <div
                      key={proj.id}
                      onClick={() => setSelectedProjectId(proj.id)}
                      className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-[#00668F]">
                          {proj.code}
                        </span>
                        <span className="capitalize text-[10px] text-slate-400">
                          {proj.lineOfBusiness || 'STC'}
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                        {proj.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {proj.clientName}
                      </p>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <span>PM: {proj.supervisorName || 'N/A'}</span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setDetailProject(proj)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-[#00668F]"
                            title="Ficha completa"
                          >
                            <Info className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setProjectToDelete(proj)}
                            className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-600"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {statusProjects.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Sin proyectos
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* GANTT VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3 border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <GanttChartSquare className="w-4 h-4 text-[#00668F]" />
              Cronograma Global de Portafolio
            </h3>
            <span className="text-xs text-slate-500">
              {filteredProjects.length} Proyectos en Línea de Tiempo
            </span>
          </div>

          <div className="space-y-3">
            {filteredProjects.map(proj => (
              <div 
                key={proj.id} 
                onClick={() => setSelectedProjectId(proj.id)}
                className="p-3 border border-slate-100 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#00668F]">{proj.code}</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200">{proj.name}</span>
                    <span className="text-slate-400">({proj.clientName})</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {proj.startDate || 'Sin fecha'} → {proj.endDate || 'Sin fecha'}
                  </div>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#00668F] h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min(proj.budgetPV > 0 ? Math.round(((proj.earnedValueEV || 0) / proj.budgetPV) * 100) : 15, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Crear Proyecto STC */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <ProjectDynamicForm
              opportunities={opportunities || []}
              erpUsers={users || []}
              partners={partners || []}
              currentTrm={currentTrm}
              onSubmit={(newProjData) => {
                createProject(newProjData as any);
                setShowCreateModal(false);
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          </div>
        </div>
      )}

      {/* Modal Editar Proyecto STC */}
      {editingProject && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <ProjectDynamicForm
              initialData={editingProject}
              opportunities={opportunities || []}
              erpUsers={users || []}
              partners={partners || []}
              currentTrm={currentTrm}
              onSubmit={(updatedData) => {
                updateProject(editingProject.id, updatedData as any);
                setEditingProject(null);
              }}
              onCancel={() => setEditingProject(null)}
            />
          </div>
        </div>
      )}

      {/* Modal Universal de Configuración de Módulo (Proyectos) */}
      <UniversalModuleConfigModal
        isOpen={isModuleConfigOpen}
        onClose={() => setIsModuleConfigOpen(false)}
        moduleId="proyectos"
        moduleTitle="Configuración del Módulo de Proyectos"
      />

      {/* Modal Confirmar Eliminación Crítica de Proyecto (Requiere escribir BORRAR) */}
      <ConfirmDeleteModal
        isOpen={Boolean(projectToDelete)}
        title="¿Eliminar Proyecto Crítico?"
        itemName={projectToDelete ? `${projectToDelete.code} - ${projectToDelete.name}` : ''}
        description="Esta acción eliminará el proyecto y todos sus paquetes de trabajo asociados del ERP. Al ser una entidad crítica, debes confirmar escribiendo la palabra exacta."
        requireConfirmWord={true}
        confirmWord="BORRAR"
        confirmText="Eliminar Proyecto"
        onConfirm={() => {
          if (projectToDelete) {
            deleteProject(projectToDelete.id);
            if (selectedProjectId === projectToDelete.id) {
              setSelectedProjectId(null);
            }
            setProjectToDelete(null);
          }
        }}
        onCancel={() => setProjectToDelete(null)}
      />

      {/* Modal Detalle Completo de Proyecto */}
      <DetailModal
        isOpen={Boolean(detailProject)}
        title={detailProject?.name || 'Ficha de Proyecto'}
        subtitle={detailProject ? `Código: ${detailProject.code} | Cliente: ${detailProject.clientName}` : ''}
        badge={detailProject ? {
          label: getStatusBadge(detailProject.status).label,
          color: getStatusBadge(detailProject.status).color
        } : undefined}
        onClose={() => setDetailProject(null)}
        actions={detailProject ? (
          <button
            onClick={() => {
              setSelectedProjectId(detailProject.id);
              setDetailProject(null);
            }}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#00668F] text-white hover:bg-[#005273] transition-colors"
          >
            Abrir Espacio de Trabajo
          </button>
        ) : undefined}
        fields={detailProject ? [
          { label: 'Código de Proyecto', value: detailProject.code, isMono: true },
          { label: 'Cliente', value: detailProject.clientName },
          { label: 'Categoría de Servicio', value: detailProject.categoryId || getProjectPortfolioCategory(detailProject) },
          { label: 'Sub-servicio Técnico', value: detailProject.serviceId || detailProject.serviceType || 'Ingeniería Mecánica' },
          { label: 'Líder / PM Asignado', value: detailProject.supervisorName || 'Sin asignar' },
          { label: 'Ubicación / Sitio', value: detailProject.location || 'No especificada' },
          { label: 'Fecha Inicio Plan', value: detailProject.startDate || 'Pendiente' },
          { label: 'Fecha Fin Plan', value: detailProject.endDate || 'Pendiente' },
          { label: 'Presupuesto Planificado (PV)', value: formatCOP(detailProject.budgetPV || 0), isMono: true },
          { label: 'Valor Ganado (EV)', value: formatCOP(detailProject.earnedValueEV || 0), isMono: true },
          { label: 'Costo Real Incurrido (AC)', value: formatCOP(detailProject.actualCostAC || 0), isMono: true },
          { label: 'Índice SPI (Cronograma)', value: detailProject.spi ? detailProject.spi.toFixed(2) : '1.00', isMono: true },
          { label: 'Índice CPI (Costos)', value: detailProject.cpi ? detailProject.cpi.toFixed(2) : '1.00', isMono: true },
          ...(detailProject.dynamicData?.componentIntervened ? [{ label: 'Componente Intervenido', value: detailProject.dynamicData.componentIntervened }] : []),
          ...(detailProject.dynamicData?.cableInterventionLengthMeters ? [{ label: 'Longitud Cable Intervenido', value: `${detailProject.dynamicData.cableInterventionLengthMeters} m` }] : []),
          ...(detailProject.dynamicData?.applicableStandard ? [{ label: 'Norma Aplicable', value: detailProject.dynamicData.applicableStandard }] : []),
          ...(detailProject.dynamicData?.measurementEquipmentName ? [{ label: 'Equipo Medición END', value: detailProject.dynamicData.measurementEquipmentName }] : []),
          ...(detailProject.dynamicData?.studyPhase ? [{ label: 'Fase de Estudio', value: detailProject.dynamicData.studyPhase }] : []),
          ...(detailProject.dynamicData?.trainingTopic ? [{ label: 'Tema de Capacitación', value: detailProject.dynamicData.trainingTopic }] : []),
          { label: 'Descripción / Alcance', value: detailProject.description || detailProject.dynamicData?.scopeSummary || 'Sin descripción registrada.', colSpan: 2 },
        ] : []}
      />

      {/* Modal Avanzado de Gestión de Plantillas (Ver, Editar, Duplicar WBS) */}
      <TemplateManagerModal
        isOpen={isTemplateManagerOpen}
        onClose={() => setIsTemplateManagerOpen(false)}
        activeProjectName={selectedProject ? `${selectedProject.code} - ${selectedProject.name}` : undefined}
        onApplyTemplate={(tpl) => {
          if (selectedProject) {
            for (const item of tpl.tasks) {
              addWbsTask({
                projectId: selectedProject.id,
                code: item.code,
                name: item.name,
                plannedHours: item.plannedHours,
                progressPct: 0,
                isCriticalPath: item.isCriticalPath,
                predecessors: item.predecessors,
                status: 'pending',
                priority: item.isCriticalPath ? 'alta' : 'media',
                deliverable: item.deliverable,
                assignedToName: item.assignedRole || 'Equipo de Ingeniería STC',
                durationDays: Math.max(1, Math.round(item.plannedHours / 8)),
                dependencyType: 'FC',
                lagDays: 0,
              });
            }
          }
        }}
      />
    </div>
  );
};

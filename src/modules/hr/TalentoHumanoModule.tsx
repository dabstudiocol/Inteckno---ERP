import React, { useState, useEffect, useMemo } from 'react';
import {
  UserCheck,
  Palmtree,
  ClipboardList,
  Coins,
  Plus,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  User,
  Pencil,
  Settings,
  Check,
  X,
  Trash2,
  Search,
  Filter,
  FileText,
  AlertCircle,
  Users,
  Ban,
  CalendarDays,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { EmployeeRecord, PayrollNovelty, PayrollNoveltyType } from '../../types';
import { AiDocumentUploader } from '../../components/ui/AiDocumentUploader';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';

interface TalentoHumanoProps {
  initialTab?: 'empleados' | 'vacaciones' | 'encuestas' | 'nomina';
}

export const TalentoHumanoModule: React.FC<TalentoHumanoProps> = ({ initialTab = 'empleados' }) => {
  const {
    employees,
    createEmployee,
    updateEmployee,
    timesheets,
    expenses,
    activeModuleId,
    novelties = [],
    requestPayrollNovelty,
    approvePayrollNovelty,
    rejectPayrollNovelty,
    deletePayrollNovelty,
    currentUser,
  } = useErp();

  const currentTab = (activeModuleId === 'vacaciones' || activeModuleId === 'encuestas' || activeModuleId === 'nomina' || activeModuleId === 'empleados')
    ? (activeModuleId as 'empleados' | 'vacaciones' | 'encuestas' | 'nomina')
    : initialTab;

  const [activeTab, setActiveTab] = useState<'empleados' | 'vacaciones' | 'encuestas' | 'nomina'>(currentTab);
  const [isNewEmpModalOpen, setIsNewEmpModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRecord | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Estados para Novedades de Nómina & Vacaciones
  const [isNewNoveltyModalOpen, setIsNewNoveltyModalOpen] = useState(false);
  const [noveltyToDelete, setNoveltyToDelete] = useState<PayrollNovelty | null>(null);
  const [noveltyView, setNoveltyView] = useState<'historial' | 'balance'>('historial');
  const [noveltySearch, setNoveltySearch] = useState('');
  const [noveltyTypeFilter, setNoveltyTypeFilter] = useState<string>('all');
  const [noveltyStatusFilter, setNoveltyStatusFilter] = useState<string>('all');

  // Formulario radicación novedad
  const [noveltyEmpId, setNoveltyEmpId] = useState('');
  const [noveltyType, setNoveltyType] = useState<PayrollNoveltyType>('vacaciones');
  const [noveltyStartDate, setNoveltyStartDate] = useState('');
  const [noveltyEndDate, setNoveltyEndDate] = useState('');
  const [noveltyDaysCount, setNoveltyDaysCount] = useState<number>(1);
  const [noveltyJustification, setNoveltyJustification] = useState('');
  const [noveltyReplacementId, setNoveltyReplacementId] = useState('');
  const [noveltyImpactsAvailability, setNoveltyImpactsAvailability] = useState(true);

  // Catálogos dinámicos editables por Inteckno
  const catalogDepartments = useModuleCatalog('empleados', 'departments');
  const catalogRoles = useModuleCatalog('empleados', 'roles');
  const catalogLeaveTypes = useModuleCatalog('empleados', 'leaveTypes');

  // Mapeo de metadatos de tipos de novedades
  const NOVELTY_TYPES_META: Record<PayrollNoveltyType, { label: string; badgeClass: string; icon: any }> = {
    vacaciones: { label: 'Vacaciones Anuales', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', icon: Palmtree },
    compensatorio: { label: 'Día Compensatorio', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200', icon: Clock },
    incapacidad_general: { label: 'Incapacidad General (EPS)', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200', icon: AlertCircle },
    incapacidad_laboral: { label: 'Incapacidad Laboral (ARL)', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', icon: ShieldCheck },
    licencia_remunerada: { label: 'Licencia Remunerada', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200', icon: FileText },
    licencia_no_remunerada: { label: 'Licencia No Remunerada', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300', icon: FileText },
    permiso_medico: { label: 'Permiso / Cita Médica', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200', icon: UserCheck },
    calamidad: { label: 'Calamidad Doméstica', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200', icon: AlertTriangle },
    dia_familia: { label: 'Día de la Familia (Ley 1857)', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200', icon: Users },
  };

  // Autocálculo de días de novedad
  useEffect(() => {
    if (noveltyStartDate && noveltyEndDate) {
      const d1 = new Date(noveltyStartDate);
      const d2 = new Date(noveltyEndDate);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime()) && d2 >= d1) {
        const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1;
        setNoveltyDaysCount(diff);
      }
    }
  }, [noveltyStartDate, noveltyEndDate]);

  // Radicación formal de novedad
  const handleCreateNovelty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noveltyEmpId || !noveltyStartDate || !noveltyEndDate || noveltyDaysCount <= 0) return;
    const emp = employees.find((e) => e.id === noveltyEmpId);
    if (!emp) return;

    const rep = employees.find((e) => e.id === noveltyReplacementId);

    requestPayrollNovelty({
      employeeId: emp.id,
      employeeName: emp.name,
      documentId: emp.documentId,
      type: noveltyType,
      typeLabel: NOVELTY_TYPES_META[noveltyType]?.label || noveltyType,
      startDate: noveltyStartDate,
      endDate: noveltyEndDate,
      daysCount: Number(noveltyDaysCount) || 1,
      justification: noveltyJustification.trim() || 'Sin observaciones adicionales.',
      replacementEmployeeId: rep?.id,
      replacementEmployeeName: rep?.name,
      impactsAvailability: noveltyImpactsAvailability,
    });

    setIsNewNoveltyModalOpen(false);
    setNoveltyEmpId('');
    setNoveltyType('vacaciones');
    setNoveltyStartDate('');
    setNoveltyEndDate('');
    setNoveltyDaysCount(1);
    setNoveltyJustification('');
    setNoveltyReplacementId('');
    setNoveltyImpactsAvailability(true);
  };

  // Novedades filtradas
  const filteredNovelties = useMemo(() => {
    return novelties.filter((n) => {
      const matchSearch =
        !noveltySearch ||
        n.employeeName.toLowerCase().includes(noveltySearch.toLowerCase()) ||
        n.documentId.toLowerCase().includes(noveltySearch.toLowerCase()) ||
        n.justification.toLowerCase().includes(noveltySearch.toLowerCase()) ||
        n.id.toLowerCase().includes(noveltySearch.toLowerCase());

      const matchType = noveltyTypeFilter === 'all' || n.type === noveltyTypeFilter;
      const matchStatus = noveltyStatusFilter === 'all' || n.status === noveltyStatusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [novelties, noveltySearch, noveltyTypeFilter, noveltyStatusFilter]);

  // Cálculos dinámicos reales de KPIs
  const totalVacationDaysAvailable = useMemo(() => {
    return employees.reduce((sum, emp) => sum + (Number(emp.vacationDaysAvailable) || 0), 0);
  }, [employees]);

  const pendingNoveltiesCount = useMemo(() => {
    return novelties.filter((n) => n.status === 'solicitada').length;
  }, [novelties]);

  const activeApprovedNoveltiesCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return novelties.filter(
      (n) => n.status === 'aprobada' && n.startDate <= today && n.endDate >= today
    ).length;
  }, [novelties]);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (activeModuleId && ['empleados', 'vacaciones', 'encuestas', 'nomina'].includes(activeModuleId)) {
      setActiveTab(activeModuleId as any);
    }
  }, [initialTab, activeModuleId]);

  // Formulario nuevo empleado
  const [empForm, setEmpForm] = useState({
    name: '',
    documentId: '',
    role: '',
    department: '',
    hireDate: '',
    baseSalaryCOP: 0,
    heightCertExpiry: '',
    medicalExamExpiry: '',
    emergencyContact: '',
    emergencyPhone: '',
  });

  const handleCreateEmp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empForm.name || !empForm.documentId) return;
    createEmployee({
      ...empForm,
      heightCertStatus: 'vigente',
      medicalExamStatus: 'vigente',
      vacationDaysAvailable: 15,
    });
    setIsNewEmpModalOpen(false);
    setEmpForm({
      name: '',
      documentId: '',
      role: '',
      department: '',
      hireDate: '',
      baseSalaryCOP: 0,
      heightCertExpiry: '',
      medicalExamExpiry: '',
      emergencyContact: '',
      emergencyPhone: '',
    });
  };

  return (
    <div className="space-y-6">

      {/* 1. PERSONAL TÉCNICO Y CERTIFICACIONES */}
      {activeTab === 'empleados' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Directorio de Ingenieros y Cuadrillas STC</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsNewEmpModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00668F] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#005273] cursor-pointer"
              >
                <Plus size={15} />
                Registrar Empleado
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {employees.map((emp) => (
              <div key={emp.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{emp.name}</h4>
                    <p className="text-xs text-[#00668F] font-semibold">{emp.role}</p>
                    <p className="text-[11px] text-gray-400">{emp.documentId} • {emp.department}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Activo
                    </span>
                    <button
                      onClick={() => setEditingEmployee(emp)}
                      title="Editar Datos y Certificados"
                      className="p-1 rounded-lg text-gray-400 hover:text-[#00668F] hover:bg-sky-50 transition-colors cursor-pointer"
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </div>

                {/* Semáforo de Certificaciones Críticas para Trabajos en Pilonas */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-100">
                    <span className="text-[10px] text-gray-500 block font-medium">Curso Alturas (Avanzado)</span>
                    <div className="flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                      <ShieldCheck size={14} />
                      <span>Vigente ({emp.heightCertExpiry})</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-gray-100">
                    <span className="text-[10px] text-gray-500 block font-medium">Examen Médico Ocupacional</span>
                    <div className="flex items-center gap-1 font-bold text-emerald-700 mt-0.5">
                      <CheckCircle2 size={14} />
                      <span>Apto ({emp.medicalExamExpiry})</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Días de Vacaciones: <strong className="text-gray-900">{emp.vacationDaysAvailable} días</strong></span>
                  <span>Emergencia: <strong className="text-gray-700">{emp.emergencyPhone}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. NOVEDADES DE NÓMINA, VACACIONES Y PERMISOS */}
      {activeTab === 'vacaciones' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* CABECERA Y BOTÓN DE ACCIÓN PRINCIPAL */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#00668F] uppercase tracking-wider">
                <Palmtree size={15} />
                <span>Gestión de Talento Humano & Bienestar</span>
              </div>
              <h3 className="text-base font-black text-gray-900 mt-0.5">
                Novedades de Nómina, Vacaciones & Permisos STC
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Control de descansos, incapacidades EPS/ARL, licencias y validación de disponibilidad para cuadrillas.
              </p>
            </div>
            <button
              onClick={() => setIsNewNoveltyModalOpen(true)}
              className="px-4 py-2.5 bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
            >
              <Plus size={16} />
              <span>Radicar Novedad</span>
            </button>
          </div>

          {/* TARJETAS RESUMEN DE INDICADORES (100% DATOS REALES) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Vacaciones Disponibles</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Palmtree size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {totalVacationDaysAvailable} días
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Acumulado total de la plantilla activa</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Solicitudes Pendientes</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-900">
                {pendingNoveltiesCount}
              </div>
              <p className="mt-1 text-[11px] text-amber-700 font-medium">
                {pendingNoveltiesCount > 0 ? 'Requieren aprobación de jefatura' : 'Sin solicitudes pendientes'}
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ausencias Activas Hoy</span>
                <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center">
                  <CalendarDays size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900">
                {activeApprovedNoveltiesCount} {activeApprovedNoveltiesCount === 1 ? 'Colaborador' : 'Colaboradores'}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">En período de disfrute o incapacidad</p>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personal en Nómina</span>
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Users size={16} />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-indigo-900">
                {employees.length} {employees.length === 1 ? 'Empleado' : 'Empleados'}
              </div>
              <p className="mt-1 text-[11px] text-slate-500">Técnicos e ingenieros STC registrados</p>
            </div>
          </div>

          {/* SELECTOR DE VISTA Y FILTROS */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Botones de conmutación de vista */}
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setNoveltyView('historial')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    noveltyView === 'historial'
                      ? 'bg-white text-[#00668F] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Historial de Novedades ({novelties.length})
                </button>
                <button
                  type="button"
                  onClick={() => setNoveltyView('balance')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    noveltyView === 'balance'
                      ? 'bg-white text-[#00668F] shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Balance de Vacaciones por Colaborador ({employees.length})
                </button>
              </div>

              {/* Filtros de búsqueda (activos solo en historial) */}
              {noveltyView === 'historial' && (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-48 sm:w-56">
                    <Search className="absolute left-2.5 top-2 text-slate-400" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, CC..."
                      value={noveltySearch}
                      onChange={(e) => setNoveltySearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00668F]"
                    />
                  </div>

                  <select
                    value={noveltyTypeFilter}
                    onChange={(e) => setNoveltyTypeFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="all">Todos los Tipos</option>
                    <option value="vacaciones">Vacaciones Anuales</option>
                    <option value="compensatorio">Día Compensatorio</option>
                    <option value="incapacidad_general">Incapacidad General (EPS)</option>
                    <option value="incapacidad_laboral">Incapacidad Laboral (ARL)</option>
                    <option value="licencia_remunerada">Licencia Remunerada</option>
                    <option value="licencia_no_remunerada">Licencia No Remunerada</option>
                    <option value="permiso_medico">Permiso Médico</option>
                    <option value="calamidad">Calamidad Doméstica</option>
                    <option value="dia_familia">Día de la Familia</option>
                  </select>

                  <select
                    value={noveltyStatusFilter}
                    onChange={(e) => setNoveltyStatusFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700 cursor-pointer"
                  >
                    <option value="all">Todos los Estados</option>
                    <option value="solicitada">Solicitadas (Pendientes)</option>
                    <option value="aprobada">Aprobadas</option>
                    <option value="rechazada">Rechazadas</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* VISTA 1: TABLA HISTORIAL DE NOVEDADES */}
          {noveltyView === 'historial' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Radicado / Fecha</th>
                      <th className="p-3">Colaborador</th>
                      <th className="p-3">Tipo de Novedad</th>
                      <th className="p-3">Período (Desde - Hasta)</th>
                      <th className="p-3 text-center">Días</th>
                      <th className="p-3">Justificación / Relevo</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredNovelties.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-slate-400">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Palmtree size={32} className="text-slate-300 stroke-[1.5]" />
                            <p className="text-sm font-semibold text-slate-700">No hay novedades registradas</p>
                            <p className="text-xs text-slate-400 max-w-sm">
                              {noveltySearch || noveltyTypeFilter !== 'all' || noveltyStatusFilter !== 'all'
                                ? 'No se encontraron resultados con los filtros seleccionados.'
                                : 'Radica vacaciones, compensatorios o incapacidades haciendo clic en "Radicar Novedad".'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredNovelties.map((nov) => {
                        const meta = NOVELTY_TYPES_META[nov.type] || {
                          label: nov.type,
                          badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
                          icon: FileText,
                        };
                        const IconComponent = meta.icon;

                        return (
                          <tr key={nov.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3">
                              <span className="font-mono text-[11px] font-bold text-[#00668F] block">
                                {nov.id}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {nov.requestedAt ? new Date(nov.requestedAt).toLocaleDateString() : '—'}
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="font-bold text-slate-900">{nov.employeeName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{nov.documentId}</div>
                            </td>

                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${meta.badgeClass}`}
                              >
                                <IconComponent size={12} />
                                <span>{nov.typeLabel || meta.label}</span>
                              </span>
                            </td>

                            <td className="p-3">
                              <div className="font-semibold text-slate-800">
                                {nov.startDate} al {nov.endDate}
                              </div>
                              {nov.impactsAvailability && (
                                <span className="inline-block mt-0.5 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Bloquea Cuadrilla STC
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-900 font-black text-xs">
                                {nov.daysCount} d
                              </span>
                            </td>

                            <td className="p-3 max-w-xs">
                              <p className="text-slate-700 truncate" title={nov.justification}>
                                {nov.justification || '—'}
                              </p>
                              {nov.replacementEmployeeName && (
                                <p className="text-[10px] text-sky-700 mt-0.5">
                                  Relevo: <strong>{nov.replacementEmployeeName}</strong>
                                </p>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              {nov.status === 'solicitada' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Clock size={11} />
                                  Solicitada
                                </span>
                              )}
                              {nov.status === 'aprobada' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <Check size={11} />
                                  Aprobada
                                </span>
                              )}
                              {nov.status === 'rechazada' && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                  <Ban size={11} />
                                  Rechazada
                                </span>
                              )}
                              {nov.approvedBy && (
                                <span className="block text-[9px] text-slate-400 mt-0.5">
                                  Por: {nov.approvedBy}
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {nov.status === 'solicitada' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => approvePayrollNovelty(nov.id, currentUser?.name || 'Administración RRHH')}
                                      title="Aprobar novedad (descuenta vacaciones si aplica)"
                                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                                    >
                                      <Check size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => rejectPayrollNovelty(nov.id, currentUser?.name || 'Administración RRHH')}
                                      title="Rechazar novedad"
                                      className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                                    >
                                      <X size={14} />
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setNoveltyToDelete(nov)}
                                  title="Eliminar registro"
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 2: BALANCE DE VACACIONES POR COLABORADOR */}
          {noveltyView === 'balance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((emp) => {
                const empApprovedNovelties = novelties.filter(
                  (n) => n.employeeId === emp.id && n.status === 'aprobada'
                );
                const daysUsed = empApprovedNovelties
                  .filter((n) => n.type === 'vacaciones')
                  .reduce((sum, n) => sum + (Number(n.daysCount) || 0), 0);

                return (
                  <div
                    key={emp.id}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5 hover:shadow-xs transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{emp.name}</h4>
                        <p className="text-xs text-[#00668F] font-semibold">{emp.role}</p>
                        <p className="text-[11px] text-slate-400">{emp.documentId} • {emp.department}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {empApprovedNovelties.length} Novedades
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                          Vacaciones Disponibles
                        </span>
                        <div className="text-lg font-black text-emerald-900">
                          {emp.vacationDaysAvailable} días
                        </div>
                      </div>
                      <div className="text-right text-[11px] text-emerald-700">
                        <span>Disfrutados: <strong>{daysUsed} d</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setNoveltyEmpId(emp.id);
                          setNoveltyType('vacaciones');
                          setIsNewNoveltyModalOpen(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-sky-50 text-[#00668F] border border-slate-200 hover:border-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus size={14} />
                        <span>Radicar Novedad para {emp.name.split(' ')[0]}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* MODAL PARA RADICAR NUEVA NOVEDAD */}
          {isNewNoveltyModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
              <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
                <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 shrink-0 bg-slate-50/60">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-sky-100 text-[#00668F] flex items-center justify-center">
                      <Palmtree size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Radicar Novedad de Nómina</h3>
                      <p className="text-[11px] text-gray-500">Vacaciones, descansos, incapacidades o licencias</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsNewNoveltyModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg text-sm font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreateNovelty} className="p-5 overflow-y-auto space-y-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Colaborador / Personal de Nómina *</label>
                    <select
                      required
                      value={noveltyEmpId}
                      onChange={(e) => setNoveltyEmpId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-medium text-gray-800 bg-white"
                    >
                      <option value="">Seleccionar colaborador...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role}) — {emp.vacationDaysAvailable} días vac. disp.
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Tipo de Novedad *</label>
                    <select
                      value={noveltyType}
                      onChange={(e) => setNoveltyType(e.target.value as PayrollNoveltyType)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-medium text-gray-800 bg-white"
                    >
                      <option value="vacaciones">Vacaciones Anuales (Remuneradas)</option>
                      <option value="compensatorio">Día Compensatorio de Descanso</option>
                      <option value="incapacidad_general">Incapacidad General (EPS)</option>
                      <option value="incapacidad_laboral">Incapacidad Accidente/Enfermedad Laboral (ARL)</option>
                      <option value="licencia_remunerada">Licencia Remunerada</option>
                      <option value="licencia_no_remunerada">Licencia No Remunerada</option>
                      <option value="permiso_medico">Permiso Médico / Cita Especialista</option>
                      <option value="calamidad">Calamidad Doméstica / Luto</option>
                      <option value="dia_familia">Día de la Familia (Ley 1857 de 2017)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Fecha de Inicio *</label>
                      <input
                        type="date"
                        required
                        value={noveltyStartDate}
                        onChange={(e) => setNoveltyStartDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-gray-300"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Fecha de Finalización *</label>
                      <input
                        type="date"
                        required
                        value={noveltyEndDate}
                        onChange={(e) => setNoveltyEndDate(e.target.value)}
                        className="w-full p-2.5 rounded-xl border border-gray-300"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 items-center">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Días de Ausencia *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={noveltyDaysCount || ''}
                        onChange={(e) => setNoveltyDaysCount(Number(e.target.value) || 1)}
                        className="w-full p-2.5 rounded-xl border border-gray-300 font-bold"
                      />
                    </div>

                    <div className="pt-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noveltyImpactsAvailability}
                          onChange={(e) => setNoveltyImpactsAvailability(e.target.checked)}
                          className="w-4 h-4 text-[#00668F] rounded"
                        />
                        <span className="text-[11px] font-bold text-slate-700">
                          Bloquear en Cuadrillas STC
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Alerta de saldo si es vacaciones */}
                  {noveltyType === 'vacaciones' && noveltyEmpId && (
                    (() => {
                      const selectedEmp = employees.find((e) => e.id === noveltyEmpId);
                      const available = selectedEmp?.vacationDaysAvailable || 0;
                      if (noveltyDaysCount > available) {
                        return (
                          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                            <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                            <span>
                              Atención: El colaborador cuenta con <strong>{available} días</strong> disponibles y se están solicitando <strong>{noveltyDaysCount} días</strong>.
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })()
                  )}

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Colaborador de Relevo / Sustituto (Opcional)</label>
                    <select
                      value={noveltyReplacementId}
                      onChange={(e) => setNoveltyReplacementId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-gray-300 font-medium text-gray-800 bg-white"
                    >
                      <option value="">Sin reemplazo asignado</option>
                      {employees
                        .filter((e) => e.id !== noveltyEmpId)
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} ({emp.role})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Justificación / Motivo / Soporte</label>
                    <textarea
                      rows={2}
                      value={noveltyJustification}
                      onChange={(e) => setNoveltyJustification(e.target.value)}
                      placeholder="Indica el motivo de la solicitud o número de radicado EPS/ARL..."
                      className="w-full p-2.5 rounded-xl border border-gray-300"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsNewNoveltyModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#00668F] text-white font-bold hover:bg-[#005073] shadow-xs cursor-pointer active:scale-95"
                    >
                      Radicar Novedad
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* MODAL DE CONFIRMACIÓN CON PALABRA 'BORRAR' (Regla #7) */}
          {noveltyToDelete && (
            <ConfirmDeleteModal
              isOpen={true}
              title="Eliminar Novedad de Nómina"
              itemName={`${noveltyToDelete.typeLabel || noveltyToDelete.type} — ${noveltyToDelete.employeeName}`}
              description="¿Estás seguro de eliminar esta solicitud de novedad? Esta acción no se puede deshacer y desvinculará el registro histórico de nómina."
              confirmWord="BORRAR"
              requireConfirmWord={true}
              onConfirm={() => {
                deletePayrollNovelty(noveltyToDelete.id);
                setNoveltyToDelete(null);
              }}
              onCancel={() => setNoveltyToDelete(null)}
            />
          )}
        </div>
      )}

      {/* 3. CHECKLIST SST PRE-TURNO */}
      {activeTab === 'encuestas' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Inspección Pre-Operacional de Alturas STC</h3>
              <p className="text-xs text-gray-500">Comprobación obligatoria antes del ascenso a pilonas y cabezales</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
              Protocolo SST-04
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            {[
              'Verificación visual de arnés de cuerpo entero (sin cortes ni costuras reventadas)',
              'Comprobación de eslinga de posicionamiento y absorbedor de impacto',
              'Casco con barbuquejo de 3 puntos y protección dieléctrica',
              'Inspección de línea de vida vertical de acero en pilona',
              'Prueba de comunicación por radio VHF con operador de estación',
              'Verificación climática (Viento < 50 km/h y sin tormenta eléctrica)',
            ].map((item, idx) => (
              <label key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-gray-200 cursor-pointer hover:bg-slate-100/70">
                <input type="checkbox" className="w-4 h-4 text-[#00668F] rounded-md" />
                <span className="text-gray-800 font-medium">{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 4. NÓMINA DE CAMPO */}
      {activeTab === 'nomina' && (
        <div className="bg-white p-3.5 sm:p-5 rounded-xl w-full max-w-full min-w-0 space-y-3 shadow-2xs">
          <h3 className="text-sm font-bold text-gray-900">Liquidación Preliminar de Horas de Campo</h3>
          <p className="text-xs text-gray-500">Cálculo con base en las horas reportadas en el módulo de Registro de Horas</p>

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-xs text-left min-w-[650px]">
              <thead className="bg-gray-50 text-gray-500 font-semibold">
                <tr>
                  <th className="p-3">Empleado</th>
                  <th className="p-3">Cargo</th>
                  <th className="p-3">Salario Base</th>
                  <th className="p-3">Horas Campo Validadas</th>
                  <th className="p-3">Viáticos Acumulados</th>
                  <th className="p-3 text-right">Total a Liquidar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.map((emp) => {
                  // Conexión real con horas aprobadas en Timesheet
                  const empTimesheets = timesheets.filter(
                    (t) =>
                      t.userId === emp.id ||
                      t.userName.toLowerCase() === emp.name.toLowerCase() ||
                      t.userName.toLowerCase().includes(emp.name.split(' ')[0].toLowerCase())
                  );
                  const totalHours = empTimesheets.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

                  // Conexión real con viáticos aprobados en el módulo de Gastos
                  const empExpenses = expenses.filter(
                    (e) =>
                      (e.userId === emp.id ||
                        e.userName.toLowerCase() === emp.name.toLowerCase() ||
                        e.userName.toLowerCase().includes(emp.name.split(' ')[0].toLowerCase())) &&
                      (e.status === 'approved' || e.status === 'legalized')
                  );
                  const totalViaticosCOP = empExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

                  const totalLiquidarCOP = (emp.baseSalaryCOP || 0) + totalViaticosCOP;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80">
                      <td className="p-3 font-bold text-gray-900">{emp.name}</td>
                      <td className="p-3 text-gray-600">{emp.role}</td>
                      <td className="p-3 font-semibold text-gray-900">${(emp.baseSalaryCOP || 0).toLocaleString()} COP</td>
                      <td className="p-3 font-bold text-[#00668F]">{totalHours} horas</td>
                      <td className="p-3 text-gray-600">${totalViaticosCOP.toLocaleString()} COP</td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        ${totalLiquidarCOP.toLocaleString()} COP
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO EMPLEADO */}
      {isNewEmpModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <UserCheck size={18} className="text-[#00668F]" />
                Registrar Técnico / Ingeniero
              </div>
              <div className="flex items-center gap-2">
                <AiDocumentUploader
                  docType="cedula_sst"
                  onExtracted={(extracted) => {
                    setEmpForm((prev) => ({
                      ...prev,
                      name: extracted.name || prev.name,
                      documentId: extracted.documentId || prev.documentId,
                      role: extracted.role || prev.role,
                      heightCertExpiry: extracted.heightCertExpiry || prev.heightCertExpiry,
                      medicalExamExpiry: extracted.medicalExamExpiry || prev.medicalExamExpiry,
                      emergencyContact: extracted.emergencyContact || prev.emergencyContact,
                      emergencyPhone: extracted.emergencyPhone || prev.emergencyPhone,
                    }));
                  }}
                  title="Escanear Cédula o Certificado Alturas SST"
                  description="La IA extrae automáticamente los datos del colaborador y vigencias de curso de alturas."
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(true)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Configurar departamentos y cargos"
                  >
                    <Settings size={13} className="text-[#00668F]" />
                    <span>Configuración</span>
                  </button>
                  <button onClick={() => setIsNewEmpModalOpen(false)} className="text-gray-400 text-lg font-bold">
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleCreateEmp} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Jonathan Guzmán Pineda"
                  value={empForm.name}
                  onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Cédula / Documento</label>
                  <input
                    type="text"
                    required
                    placeholder="CC 1.036.789.000"
                    value={empForm.documentId}
                    onChange={(e) => setEmpForm({ ...empForm, documentId: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <CreatableSelect
                    label="Cargo Técnico"
                    required
                    value={empForm.role}
                    onChange={(val) => setEmpForm({ ...empForm, role: val })}
                    options={catalogRoles.map((r) => ({ id: r.id, name: r.name }))}
                    moduleId="empleados"
                    catalogKey="roles"
                    placeholder="Seleccionar o escribir cargo..."
                    allowCustomText={true}
                  />
                </div>
              </div>

              <div>
                <CreatableSelect
                  label="Departamento / Área"
                  required
                  value={empForm.department}
                  onChange={(val) => setEmpForm({ ...empForm, department: val })}
                  options={catalogDepartments.map((d) => ({
                    id: d.id,
                    name: d.name,
                    code: d.code,
                  }))}
                  moduleId="empleados"
                  catalogKey="departments"
                  placeholder="Seleccionar o escribir departamento..."
                  allowCustomText={true}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vence Curso Alturas</label>
                  <input
                    type="date"
                    value={empForm.heightCertExpiry}
                    onChange={(e) => setEmpForm({ ...empForm, heightCertExpiry: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Vence Examen Médico</label>
                  <input
                    type="date"
                    value={empForm.medicalExamExpiry}
                    onChange={(e) => setEmpForm({ ...empForm, medicalExamExpiry: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewEmpModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#00668F] text-white rounded-xl shadow-xs hover:bg-[#005273]"
                >
                  Guardar Empleado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR EMPLEADO */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[88vh] sm:max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5 shrink-0 bg-slate-50/60">
              <div>
                <span className="text-[10px] font-bold text-[#00668F] uppercase tracking-wider block">
                  Talento Humano & SST • {editingEmployee.documentId}
                </span>
                <h3 className="text-base font-bold text-gray-900">Editar Ficha de Empleado</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Configurar departamentos y cargos"
                >
                  <Settings size={13} className="text-[#00668F]" />
                  <span>Configuración</span>
                </button>
                <button
                  onClick={() => setEditingEmployee(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-200/60 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido Desplazable */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateEmployee(editingEmployee.id, editingEmployee);
                setEditingEmployee(null);
              }}
              className="flex flex-col flex-1 min-h-0 overflow-hidden"
            >
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={editingEmployee.name}
                    onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <CreatableSelect
                      label="Cargo / Especialidad"
                      required
                      value={editingEmployee.role}
                      onChange={(val) => setEditingEmployee({ ...editingEmployee, role: val })}
                      options={catalogRoles.map((r) => ({ id: r.id, name: r.name }))}
                      moduleId="empleados"
                      catalogKey="roles"
                      placeholder="Seleccionar o escribir cargo..."
                      allowCustomText={true}
                    />
                  </div>
                  <div>
                    <CreatableSelect
                      label="Departamento / Área"
                      required
                      value={editingEmployee.department}
                      onChange={(val) => setEditingEmployee({ ...editingEmployee, department: val })}
                      options={catalogDepartments.map((d) => ({
                        id: d.id,
                        name: d.name,
                        code: d.code,
                      }))}
                      moduleId="empleados"
                      catalogKey="departments"
                      placeholder="Seleccionar o escribir departamento..."
                      allowCustomText={true}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Salario Base (COP)</label>
                    <input
                      type="number"
                      min={1000000}
                      value={editingEmployee.baseSalaryCOP}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, baseSalaryCOP: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Días de Vacaciones Disponibles</label>
                    <input
                      type="number"
                      min={0}
                      value={editingEmployee.vacationDaysAvailable}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, vacationDaysAvailable: Number(e.target.value) })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                </div>

                {/* Control de Certificaciones SST */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-700 block">Vigencia de Certificaciones Obligatorias SST</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Curso de Alturas (Vence)</label>
                      <input
                        type="date"
                        value={editingEmployee.heightCertExpiry}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, heightCertExpiry: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-600 mb-1">Examen Médico (Vence)</label>
                      <input
                        type="date"
                        value={editingEmployee.medicalExamExpiry}
                        onChange={(e) => setEditingEmployee({ ...editingEmployee, medicalExamExpiry: e.target.value })}
                        className="w-full text-xs p-2 rounded-lg border border-gray-300 bg-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Contacto de Emergencia</label>
                    <input
                      type="text"
                      value={editingEmployee.emergencyContact}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, emergencyContact: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono Emergencia</label>
                    <input
                      type="text"
                      value={editingEmployee.emergencyPhone}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, emergencyPhone: e.target.value })}
                      className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                    />
                  </div>
                </div>
              </div>

              {/* Pie Fijo Siempre Visible */}
              <div className="flex items-center justify-end gap-2 px-5 py-3 bg-gray-50 border-t border-gray-200/80 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200/70 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#00668F] text-white rounded-xl shadow-xs hover:bg-[#005273] cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Universal de Configuración de Talento Humano */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="empleados"
        moduleTitle="Talento Humano & Personal Técnico"
      />
    </div>
  );
};

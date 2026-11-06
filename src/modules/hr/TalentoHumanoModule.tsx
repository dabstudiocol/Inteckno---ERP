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
  Printer,
  DollarSign,
  Send,
  History,
  Sparkles,
  Building2,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { EmployeeRecord, PayrollNovelty, PayrollNoveltyType } from '../../types';
import { AiDocumentUploader } from '../../components/ui/AiDocumentUploader';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { useModuleCatalog, getLaborRates } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { formatCOP } from '../../core/services/trmService';

export interface SstInspectionRecord {
  id: string;
  code: string;
  date: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  itemCode?: string;
  technicianId: string;
  technicianName: string;
  inspectorName: string;
  windSpeedKmh: number;
  checks: {
    arnes: boolean;
    eslinga: boolean;
    casco: boolean;
    lineaVida: boolean;
    radio: boolean;
    clima: boolean;
  };
  verdict: 'aprobado' | 'rechazado';
  observations?: string;
  createdAt: string;
}

const STORAGE_KEY_SST = 'itk_sst_inspections_history';

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
    projects = [],
    users = [],
    activeModuleId,
    novelties = [],
    requestPayrollNovelty,
    approvePayrollNovelty,
    rejectPayrollNovelty,
    deletePayrollNovelty,
    currentUser,
    notify,
    sstInspections: storeSstInspections,
    createSstInspection,
    deleteSstInspection,
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

  // Estados para SST e Inspecciones Pre-Operacionales (Sincronizadas con Cloud Firestore)
  const sstInspections = storeSstInspections || [];

  const [isNewInspectionModalOpen, setIsNewInspectionModalOpen] = useState(false);
  const [inspectionToDelete, setInspectionToDelete] = useState<SstInspectionRecord | null>(null);
  const [sstSubTab, setSstSubTab] = useState<'alturas' | 'clima'>('alturas');
  const [inspDate, setInspDate] = useState(new Date().toISOString().split('T')[0]);
  const [inspProjectId, setInspProjectId] = useState('');
  const [inspItemCode, setInspItemCode] = useState<string>('');

  const availableInspProjectItems = useMemo(() => {
    const proj = projects.find((p) => p.id === inspProjectId);
    if (!proj) return [];
    const items = (((proj as any)?.projectItems || (proj as any)?.items || []) as any[]);
    return items.map((it: any) => ({
      id: it.code,
      name: `${it.code} — ${it.name}`,
      code: it.code,
    }));
  }, [projects, inspProjectId]);

  useEffect(() => {
    if (availableInspProjectItems.length > 0) {
      if (!availableInspProjectItems.some((i) => i.code === inspItemCode)) {
        setInspItemCode(availableInspProjectItems[0]?.code || '');
      }
    } else {
      setInspItemCode('');
    }
  }, [inspProjectId, availableInspProjectItems]);
  const [inspTechnicianId, setInspTechnicianId] = useState('');
  const [inspWindSpeed, setInspWindSpeed] = useState<number>(15);
  const [inspChecks, setInspChecks] = useState({
    arnes: true,
    eslinga: true,
    casco: true,
    lineaVida: true,
    radio: true,
    clima: true,
  });
  const [inspObservations, setInspObservations] = useState('');

  // Encuesta de clima laboral anónima
  const [climateRating, setClimateRating] = useState(5);
  const [climateFeedback, setClimateFeedback] = useState('');

  // Estados para Nómina y Desprendibles (Colillas)
  const [selectedPayrollEmp, setSelectedPayrollEmp] = useState<EmployeeRecord | null>(null);
  const [payrollPeriod, setPayrollPeriod] = useState('1ra Quincena Noviembre 2026');

  // Selección automática de proyecto/técnico si no están seleccionados
  useEffect(() => {
    if (!inspProjectId && projects.length > 0) {
      setInspProjectId(projects[0].id);
    }
    if (!inspTechnicianId && employees.length > 0) {
      setInspTechnicianId(employees[0].id);
    }
  }, [projects, employees, inspProjectId, inspTechnicianId]);

  const handleCreateInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const prj = projects.find((p) => p.id === inspProjectId) || projects[0];
    const tech = employees.find((emp) => emp.id === inspTechnicianId) || employees[0];
    
    // Todos los 6 checks deben ser verdaderos Y viento <= 45 km/h
    const allChecksPassed = Object.values(inspChecks).every(Boolean);
    const windSafe = Number(inspWindSpeed) <= 45;
    const verdict: 'aprobado' | 'rechazado' = allChecksPassed && windSafe ? 'aprobado' : 'rechazado';

    const newRecord: SstInspectionRecord = {
      id: `SST-${Date.now()}`,
      code: `ARO-SST-${new Date().getFullYear()}-${String(sstInspections.length + 1).padStart(3, '0')}`,
      date: inspDate,
      projectId: prj?.id || '',
      projectCode: prj?.code || 'STC-GENERAL',
      projectName: prj?.name || 'Operación General Teleféricos',
      itemCode: inspItemCode || undefined,
      technicianId: tech?.id || currentUser.id,
      technicianName: tech?.name || currentUser.name,
      inspectorName: currentUser.name || 'Inspector SST Inteckno',
      windSpeedKmh: Number(inspWindSpeed) || 0,
      checks: { ...inspChecks },
      verdict,
      observations: inspObservations.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    createSstInspection(newRecord);
    setIsNewInspectionModalOpen(false);
    setInspObservations('');
    notify?.(
      verdict === 'aprobado' ? 'success' : 'warning',
      `Inspección ${newRecord.code} Radicada`,
      verdict === 'aprobado' 
        ? `Autorizado el ascenso en alturas para ${newRecord.technicianName}.`
        : `NO AUTORIZADO: Se detectó riesgo inminente o viento excesivo (${newRecord.windSpeedKmh} km/h).`
    );
  };

  const handleSendClimateSurvey = (e: React.FormEvent) => {
    e.preventDefault();
    notify?.('success', 'Encuesta Registrada', 'Gracias por tu retroalimentación anónima de clima laboral y condiciones de trabajo.');
    setClimateFeedback('');
    setClimateRating(5);
  };

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
    if (!empForm.name.trim() || !empForm.documentId.trim() || !empForm.role.trim()) {
      notify?.('warning', 'Campos Incompletos', 'Nombre, cédula y cargo técnico son obligatorios.');
      return;
    }
    if (!empForm.baseSalaryCOP || empForm.baseSalaryCOP <= 0) {
      notify?.('warning', 'Salario Base Requerido', 'Debe especificar el salario base mensual para liquidar nómina y costo hora.');
      return;
    }
    const isDuplicate = employees.some((emp) => emp.documentId.trim() === empForm.documentId.trim());
    if (isDuplicate) {
      notify?.('urgent', 'Documento Duplicado', `Ya existe un colaborador registrado con la cédula ${empForm.documentId}.`);
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const isHeightValid = empForm.heightCertExpiry ? empForm.heightCertExpiry >= today : false;
    const isExamValid = empForm.medicalExamExpiry ? empForm.medicalExamExpiry >= today : false;

    createEmployee({
      ...empForm,
      hireDate: empForm.hireDate || today,
      heightCertStatus: isHeightValid ? 'vigente' : 'vencido',
      medicalExamStatus: isExamValid ? 'vigente' : 'vencido',
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

          {employees.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-gray-200 space-y-2">
              <Users size={40} className="mx-auto text-[#00668F] opacity-40" />
              <h4 className="text-sm font-bold text-gray-800">No hay colaboradores registrados en el directorio</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Registra ingenieros, supervisores y técnicos especialistas de teleféricos para gestionar sus certificaciones, licencias en alturas y liquidación de nómina.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setIsNewEmpModalOpen(true)}
                  className="px-4 py-2 bg-[#00668F] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#005273] cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus size={15} />
                  <span>Registrar Primer Empleado</span>
                </button>
              </div>
            </div>
          ) : (
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
          )}
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

      {/* 3. CENTRO DE INSPECCIONES SST Y CLIMA LABORAL */}
      {activeTab === 'encuestas' && (
        <div className="space-y-4">
          {/* Sub-navegación interna SST */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSstSubTab('alturas')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sstSubTab === 'alturas'
                    ? 'bg-[#00668F] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <ShieldCheck size={14} />
                <span>Inspecciones de Alturas (ARO / SST-04)</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-white/20 text-[10px]">
                  {sstInspections.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSstSubTab('clima')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  sstSubTab === 'clima'
                    ? 'bg-[#00668F] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <Users size={14} />
                <span>Encuesta de Clima & Bienestar</span>
              </button>
            </div>

            {sstSubTab === 'alturas' && (
              <button
                type="button"
                onClick={() => setIsNewInspectionModalOpen(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Plus size={14} />
                <span>+ Nueva Inspección Pre-Operacional</span>
              </button>
            )}
          </div>

          {sstSubTab === 'alturas' && (
            <div className="space-y-3">
              {/* Tarjeta de Resumen Normativo */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <ShieldCheck size={22} className="text-[#F39200] shrink-0" />
                  <div>
                    <strong className="block font-bold">Protocolo Obligatorio SST-04 (Trabajo Seguro en Alturas):</strong>
                    <span>
                      Ningún técnico puede ascender a pilonas, cabezales o estaciones motrices sin la verificación de los 6 puntos críticos y viento inferior a 45 km/h.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    {sstInspections.filter((i) => i.verdict === 'aprobado').length} Aprobadas
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px]">
                    {sstInspections.filter((i) => i.verdict === 'rechazado').length} Rechazadas
                  </span>
                </div>
              </div>

              {/* Listado de Inspecciones */}
              {sstInspections.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#00668F] flex items-center justify-center mx-auto">
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Sin inspecciones pre-operacionales radicadas</h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                      Crea la primera comprobación técnica de EPP y condiciones de seguridad antes de iniciar la jornada en teleféricos.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewInspectionModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-[#00668F] text-white text-xs font-bold hover:bg-[#005073] cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Radicar Primera Inspección SST</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto w-full">
                    <table className="w-full text-xs text-left min-w-[700px]">
                      <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="p-3">Código / Fecha</th>
                          <th className="p-3">Proyecto / Teleférico</th>
                          <th className="p-3">Técnico Inspeccionado</th>
                          <th className="p-3">Inspector SST</th>
                          <th className="p-3 text-center">Viento</th>
                          <th className="p-3 text-center">Veredicto</th>
                          <th className="p-3 text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {sstInspections.map((insp) => (
                          <tr key={insp.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3">
                              <span className="font-bold text-[#00668F] block font-mono">{insp.code}</span>
                              <span className="text-[11px] text-gray-400">{insp.date}</span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-gray-900 block">{insp.projectCode}</span>
                                {insp.itemCode && (
                                  <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                                    {insp.itemCode}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-gray-500 truncate block max-w-[180px]">{insp.projectName}</span>
                            </td>
                            <td className="p-3 font-semibold text-gray-800">{insp.technicianName}</td>
                            <td className="p-3 text-gray-600">{insp.inspectorName}</td>
                            <td className="p-3 text-center font-bold">
                              <span className={insp.windSpeedKmh > 45 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                {insp.windSpeedKmh} km/h
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  insp.verdict === 'aprobado'
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                    : 'bg-rose-50 text-rose-800 border border-rose-200 animate-pulse'
                                }`}
                              >
                                {insp.verdict === 'aprobado' ? <CheckCircle2 size={11} /> : <AlertTriangle size={11} />}
                                {insp.verdict === 'aprobado' ? 'APTO ASCENSO' : 'NO AUTORIZADO'}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <button
                                type="button"
                                onClick={() => setInspectionToDelete(insp)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar inspección"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {sstSubTab === 'clima' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs max-w-2xl mx-auto space-y-4">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-gray-900">Encuesta Confidencial de Clima & Bienestar Laboral</h3>
                <p className="text-xs text-gray-500">
                  Espacio anónimo para evaluar el liderazgo, la dotación de seguridad y la comunicación de equipo en campo.
                </p>
              </div>

              <form onSubmit={handleSendClimateSurvey} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-gray-700 mb-2">
                    ¿Cómo calificas tu nivel general de satisfacción y respaldo en tu labor en Inteckno? (1 = Mínimo, 5 = Excelente)
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setClimateRating(val)}
                        className={`w-10 h-10 rounded-xl font-bold text-sm transition-all cursor-pointer ${
                          climateRating === val
                            ? 'bg-[#00668F] text-white shadow-xs scale-105'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Comentarios, Sugerencias de Mejora o Necesidades de Dotación / Herramientas
                  </label>
                  <textarea
                    rows={3}
                    value={climateFeedback}
                    onChange={(e) => setClimateFeedback(e.target.value)}
                    placeholder="Escribe libremente cualquier sugerencia sobre descansos, viáticos, herramientas o seguridad..."
                    className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:border-[#00668F]"
                    required
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <Send size={13} />
                    <span>Enviar Encuesta Anónima</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* 4. CENTRO DE LIQUIDACIÓN DE NÓMINA TÉCNICA (LEY 2101/2021) */}
      {activeTab === 'nomina' && (
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl w-full max-w-full min-w-0 space-y-4 shadow-2xs border border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Liquidación de Nómina Técnica de Campo (Ley 2101/2021)</h3>
              <p className="text-xs text-gray-500">
                Consolidación automática de horas reportadas en obra, viáticos de campo legalizados y aportes de ley.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Periodo:</span>
              <select
                value={payrollPeriod}
                onChange={(e) => setPayrollPeriod(e.target.value)}
                className="p-2 rounded-xl border border-gray-300 text-xs font-semibold bg-slate-50 text-slate-800"
              >
                <option value="1ra Quincena Noviembre 2026">1ra Quincena Noviembre 2026</option>
                <option value="2da Quincena Noviembre 2026">2da Quincena Noviembre 2026</option>
                <option value="1ra Quincena Octubre 2026">1ra Quincena Octubre 2026</option>
                <option value="2da Quincena Octubre 2026">2da Quincena Octubre 2026</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto w-full max-w-full">
            <table className="w-full text-xs text-left min-w-[750px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-gray-200">
                <tr>
                  <th className="p-3">Colaborador / C.C.</th>
                  <th className="p-3">Cargo</th>
                  <th className="p-3 text-right">Salario Base</th>
                  <th className="p-3 text-center">Horas Base</th>
                  <th className="p-3 text-right">Extras & Recargos (Ley 2101)</th>
                  <th className="p-3 text-right">Viáticos Campo</th>
                  <th className="p-3 text-right font-bold text-gray-900">Total a Liquidar</th>
                  <th className="p-3 text-right">Desprendible</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-gray-400">
                      <Coins size={36} className="mx-auto mb-2 text-[#00668F] opacity-40" />
                      <p className="text-xs font-bold text-gray-700">Sin colaboradores para liquidar</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Registra el personal técnico para calcular sus aportes de ley y horas extras.
                      </p>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => {
                  const empTimesheets = timesheets.filter(
                    (t) =>
                      t.userId === emp.id ||
                      t.userName.toLowerCase() === emp.name.toLowerCase() ||
                      t.userName.toLowerCase().includes(emp.name.split(' ')[0].toLowerCase())
                  );
                  const totalHours = empTimesheets.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

                  const empExpenses = expenses.filter(
                    (e) =>
                      (e.userId === emp.id ||
                        e.userName.toLowerCase() === emp.name.toLowerCase() ||
                        e.userName.toLowerCase().includes(emp.name.split(' ')[0].toLowerCase())) &&
                      (e.status === 'approved' || e.status === 'legalized')
                  );
                  const totalViaticosCOP = empExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                  const laborRates = getLaborRates();
                  const baseHourlyWorkerWage = (emp.baseSalaryCOP || 0) / (laborRates.divisorMensual || 210);

                  let empOvertimePayCOP = 0;
                  let empOvertimeHoursCount = 0;

                  empTimesheets.forEach((t) => {
                    if (t.hoursBreakdown) {
                      const { hed = 0, rn = 0, hen = 0, dom = 0, hedd = 0, hend = 0 } = t.hoursBreakdown;
                      empOvertimeHoursCount += (hed + hen + hedd + hend);
                      empOvertimePayCOP += Math.round(
                        baseHourlyWorkerWage * (
                          hed * laborRates.hed +
                          rn * laborRates.rn +
                          hen * laborRates.hen +
                          dom * laborRates.dom +
                          hedd * laborRates.hedd +
                          hend * laborRates.hend
                        )
                      );
                    }
                  });

                  const baseQuincenal = Math.round((emp.baseSalaryCOP || 0) / 2);
                  const totalLiquidarCOP = baseQuincenal + empOvertimePayCOP + totalViaticosCOP;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <span className="font-bold text-gray-900 block">{emp.name}</span>
                        <span className="text-[11px] text-gray-400">C.C. {emp.documentId || 'S/N'}</span>
                      </td>
                      <td className="p-3 text-gray-600 font-medium">{emp.role}</td>
                      <td className="p-3 text-right font-semibold text-gray-900">{formatCOP(emp.baseSalaryCOP || 0)}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-50 text-[#00668F] font-bold text-[11px]">
                          {totalHours} h
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {empOvertimePayCOP > 0 ? (
                          <div>
                            <span className="font-bold text-sky-800 block text-xs">{formatCOP(empOvertimePayCOP)}</span>
                            <span className="text-[10px] text-sky-600 font-semibold">{empOvertimeHoursCount} h extras</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs">$0</span>
                        )}
                      </td>
                      <td className="p-3 text-right font-medium text-emerald-700">{formatCOP(totalViaticosCOP)}</td>
                      <td className="p-3 text-right font-bold text-gray-900">
                        {formatCOP(totalLiquidarCOP)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPayrollEmp(emp)}
                          className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#00668F] hover:text-white text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <FileText size={13} />
                          <span>Ver Colilla</span>
                        </button>
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

      {/* MODAL: RADICAR NUEVA INSPECCIÓN SST-04 */}
      {isNewInspectionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <ShieldCheck size={18} className="text-[#00668F]" />
                Nueva Inspección Pre-Operacional de Alturas
              </div>
              <button
                type="button"
                onClick={() => setIsNewInspectionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInspection} className="mt-4 space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Fecha de Inspección</label>
                  <input
                    type="date"
                    value={inspDate}
                    onChange={(e) => setInspDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 bg-white"
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Velocidad del Viento (km/h)</label>
                  <input
                    type="number"
                    value={inspWindSpeed || ''}
                    placeholder="0"
                    onChange={(e) => setInspWindSpeed(Number(e.target.value) || 0)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-bold"
                  />
                  {inspWindSpeed > 45 && (
                    <span className="text-[10px] text-rose-600 font-bold block mt-0.5">
                      ⚠️ ¡Alerta! Supera el límite de 45 km/h. Veredicto será RECHAZADO.
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Proyecto / Sistema STC</label>
                  <select
                    value={inspProjectId}
                    onChange={(e) => setInspProjectId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-medium"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} – {p.name} ({p.clientName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Ítem Contractual (Plan 1)</label>
                  <select
                    value={inspItemCode}
                    onChange={(e) => setInspItemCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-medium"
                    disabled={availableInspProjectItems.length === 0}
                  >
                    <option value="">{availableInspProjectItems.length === 0 ? '-- Sin ítems --' : '-- General del Proyecto --'}</option>
                    {availableInspProjectItems.map((it) => (
                      <option key={it.id} value={it.code}>{it.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Técnico que ascenderá</label>
                <select
                  value={inspTechnicianId}
                  onChange={(e) => setInspTechnicianId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 bg-white font-medium"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 block">
                  Checklist de 6 Puntos Críticos (Obligatorio)
                </span>
                {[
                  { key: 'arnes', label: 'Arnés de cuerpo entero verificado (sin cortes ni costuras sueltas)' },
                  { key: 'eslinga', label: 'Eslinga doble con absorbedor de impacto y mosquetones doble seguro' },
                  { key: 'casco', label: 'Casco de seguridad con barbuquejo de 3 puntos y protección dieléctrica' },
                  { key: 'lineaVida', label: 'Línea de vida vertical en acero de pilona inspeccionada' },
                  { key: 'radio', label: 'Radio VHF operativo con canal de emergencia sintonizado' },
                  { key: 'clima', label: 'Condiciones climáticas seguras (sin tormenta eléctrica en radar)' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 p-2 bg-white rounded-lg border border-gray-200 cursor-pointer hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={(inspChecks as any)[key]}
                      onChange={(e) =>
                        setInspChecks((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="w-4 h-4 text-[#00668F] rounded-md"
                    />
                    <span className="text-gray-800 text-[11px]">{label}</span>
                  </label>
                ))}
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Observaciones / Novedades de Sitio</label>
                <textarea
                  rows={2}
                  value={inspObservations}
                  onChange={(e) => setInspObservations(e.target.value)}
                  placeholder="Observaciones de pilona, condiciones del terreno o equipo especial..."
                  className="w-full p-2.5 rounded-xl border border-gray-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewInspectionModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00668F] text-white font-bold hover:bg-[#005073] shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  <ShieldCheck size={14} />
                  <span>Radicar Inspección Pre-Turno</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN CON PALABRA 'BORRAR' PARA INSPECCIÓN SST */}
      {inspectionToDelete && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Eliminar Inspección SST"
          itemName={`${inspectionToDelete.code} — ${inspectionToDelete.technicianName}`}
          description="¿Estás seguro de eliminar este registro de inspección de alturas? Esta acción borrará el registro de seguridad histórica."
          confirmWord="BORRAR"
          requireConfirmWord={true}
          onConfirm={() => {
            deleteSstInspection(inspectionToDelete.id);
            setInspectionToDelete(null);
            notify?.('info', 'Inspección Eliminada', 'El registro de seguridad ha sido removido.');
          }}
          onCancel={() => setInspectionToDelete(null)}
        />
      )}

      {/* MODAL: DESPRENDIBLE DE NÓMINA (COLILLA DE PAGO OFICIAL) */}
      {selectedPayrollEmp && (() => {
        const empTimesheets = timesheets.filter(
          (t) =>
            t.userId === selectedPayrollEmp.id ||
            t.userName.toLowerCase() === selectedPayrollEmp.name.toLowerCase() ||
            t.userName.toLowerCase().includes(selectedPayrollEmp.name.split(' ')[0].toLowerCase())
        );
        const totalHours = empTimesheets.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

        const empExpenses = expenses.filter(
          (e) =>
            (e.userId === selectedPayrollEmp.id ||
              e.userName.toLowerCase() === selectedPayrollEmp.name.toLowerCase() ||
              e.userName.toLowerCase().includes(selectedPayrollEmp.name.split(' ')[0].toLowerCase())) &&
            (e.status === 'approved' || e.status === 'legalized')
        );
        const totalViaticosCOP = empExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

        const laborRates = getLaborRates();
        const baseHourlyWorkerWage = (selectedPayrollEmp.baseSalaryCOP || 0) / (laborRates.divisorMensual || 210);

        let empOvertimePayCOP = 0;
        let empOvertimeBreakdown = { hed: 0, rn: 0, hen: 0, dom: 0, hedd: 0, hend: 0 };
        let totalOvertimeHours = 0;

        empTimesheets.forEach((t) => {
          if (t.hoursBreakdown) {
            const { hed = 0, rn = 0, hen = 0, dom = 0, hedd = 0, hend = 0 } = t.hoursBreakdown;
            empOvertimeBreakdown.hed += hed;
            empOvertimeBreakdown.rn += rn;
            empOvertimeBreakdown.hen += hen;
            empOvertimeBreakdown.dom += dom;
            empOvertimeBreakdown.hedd += hedd;
            empOvertimeBreakdown.hend += hend;
            totalOvertimeHours += (hed + hen + hedd + hend);
            empOvertimePayCOP += Math.round(
              baseHourlyWorkerWage * (
                hed * laborRates.hed +
                rn * laborRates.rn +
                hen * laborRates.hen +
                dom * laborRates.dom +
                hedd * laborRates.hedd +
                hend * laborRates.hend
              )
            );
          }
        });

        const baseQuincenal = Math.round((selectedPayrollEmp.baseSalaryCOP || 0) / 2);
        const basePrestacionalQuincenal = baseQuincenal + empOvertimePayCOP;
        const deduccionSalud = Math.round(basePrestacionalQuincenal * 0.04);
        const deduccionPension = Math.round(basePrestacionalQuincenal * 0.04);
        const totalDeducciones = deduccionSalud + deduccionPension;
        const totalDevengado = basePrestacionalQuincenal + totalViaticosCOP;
        const netoPagar = totalDevengado - totalDeducciones;

        return (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-lg w-full p-6 animate-in zoom-in-95 duration-150 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center font-bold">
                    ITK
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">Desprendible Oficial de Pago</h4>
                    <p className="text-[11px] text-gray-500">Inteckno S.A.S. • NIT: 901.458.789-2</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPayrollEmp(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Datos del Trabajador */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Colaborador:</span>
                  <span className="font-bold text-gray-900 block">{selectedPayrollEmp.name}</span>
                  <span className="text-[11px] text-gray-500">C.C. {selectedPayrollEmp.documentId || 'S/N'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-bold">Cargo & Periodo:</span>
                  <span className="font-bold text-gray-900 block">{selectedPayrollEmp.role}</span>
                  <span className="text-[11px] text-[#00668F] font-semibold">{payrollPeriod}</span>
                </div>
              </div>

              {/* Desglose de Conceptos */}
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1">
                    (+) Devengados
                  </span>
                  <div className="space-y-1.5 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Sueldo Básico Quincenal (15 días)</span>
                      <span className="font-bold text-gray-900">{formatCOP(baseQuincenal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Horas de Campo ({totalHours} h ordinarias)</span>
                      <span className="font-semibold text-gray-800">Cubiertas en turno base</span>
                    </div>
                    {empOvertimePayCOP > 0 && (
                      <div className="flex justify-between bg-sky-50/80 p-2 rounded-lg border border-sky-100">
                        <div>
                          <span className="font-bold text-[#00668F] block">Horas Extras y Recargos (Ley 2101 / 210h)</span>
                          <span className="text-[10px] text-gray-500">
                            HED: {empOvertimeBreakdown.hed}h • RN: {empOvertimeBreakdown.rn}h • HEN: {empOvertimeBreakdown.hen}h • Dom: {empOvertimeBreakdown.dom}h • HEDD: {empOvertimeBreakdown.hedd}h • HEND: {empOvertimeBreakdown.hend}h
                          </span>
                        </div>
                        <span className="font-bold text-[#00668F] self-center">{formatCOP(empOvertimePayCOP)}</span>
                      </div>
                    )}
                    {totalViaticosCOP > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-700">Viáticos de Alimentación y Transporte Legalizados</span>
                        <span className="font-bold text-emerald-700">{formatCOP(totalViaticosCOP)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-emerald-200/60 font-bold">
                      <span className="text-emerald-900">Total Devengado:</span>
                      <span className="text-emerald-900">{formatCOP(totalDevengado)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block mb-1">
                    (-) Deducciones Legales
                  </span>
                  <div className="space-y-1.5 p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                    <div className="flex justify-between">
                      <span className="text-gray-700">Aporte Obligatorio Salud EPS (4%)</span>
                      <span className="font-semibold text-rose-700">-{formatCOP(deduccionSalud)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-700">Aporte Obligatorio Pensión AFP (4%)</span>
                      <span className="font-semibold text-rose-700">-{formatCOP(deduccionPension)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-rose-200/60 font-bold">
                      <span className="text-rose-900">Total Deducido:</span>
                      <span className="text-rose-900">-{formatCOP(totalDeducciones)}</span>
                    </div>
                  </div>
                </div>

                {/* Gran Total Neto a Pagar */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                      Neto a Consignar en Cuenta
                    </span>
                    <span className="text-xs text-slate-300">Banco de Nómina Registrado</span>
                  </div>
                  <span className="text-lg font-black text-emerald-400">
                    {formatCOP(netoPagar)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimir / PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    notify?.('success', 'Pago Aprobado', `Se generó la orden de transferencia por ${formatCOP(netoPagar)} para ${selectedPayrollEmp.name}.`);
                    setSelectedPayrollEmp(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                >
                  Aprobar Liquidación Quincenal
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
                  <label className="block text-xs font-bold text-gray-700 mb-1">Salario Base Mensual (COP) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={empForm.baseSalaryCOP || ''}
                    onChange={(e) => setEmpForm({ ...empForm, baseSalaryCOP: Number(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 font-semibold focus:border-[#00668F]"
                  />
                  {empForm.baseSalaryCOP > 0 && (
                    <span className="text-[10px] text-gray-500 font-medium mt-0.5 block">
                      {formatCOP(empForm.baseSalaryCOP)}
                    </span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de Ingreso *</label>
                  <input
                    type="date"
                    required
                    value={empForm.hireDate}
                    onChange={(e) => setEmpForm({ ...empForm, hireDate: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Contacto de Emergencia</label>
                  <input
                    type="text"
                    placeholder="Familiar / Contacto"
                    value={empForm.emergencyContact}
                    onChange={(e) => setEmpForm({ ...empForm, emergencyContact: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono Emergencia</label>
                  <input
                    type="tel"
                    placeholder="+57 300 000 0000"
                    value={empForm.emergencyPhone}
                    onChange={(e) => setEmpForm({ ...empForm, emergencyPhone: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
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

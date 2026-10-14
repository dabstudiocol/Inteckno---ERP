import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  Search,
  UserPlus,
  KeyRound,
  Edit3,
  HardHat,
  Phone,
  Eye,
  EyeOff,
  X,
  Check,
  UserCheck,
  Mail,
  Calendar,
  Heart,
  MapPin,
  Building2,
  Briefcase,
  Award,
  Lock,
  Camera,
  Plus,
  Trash2,
  User as UserIcon,
  Settings,
  LayoutGrid,
  List,
  FileSpreadsheet,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Cloud,
  ExternalLink,
  ChevronRight,
  Shield,
  FileText,
  BadgeCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { User, UserRole, JobPosition, AuditLogEntry } from '../../types';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { getStoredJobPositions } from './CargosModule';
import { recordAuditEvent, getAuditLogs, filterAuditLogs } from '../../core/services/auditService';
import {
  fetchM365TenantUsers,
  sendWelcomeEmailViaGraph,
  openAdminConsentPopup,
  M365TenantUser,
} from '../../core/services/m365Sync';
import {
  diagnoseUserDirectoryWithLuciana,
  generateOnboardingProvisioningWithLuciana,
  searchEmployeesWithLuciana,
  DirectoryHealthReport,
} from '../../core/services/lucianaService';
import {
  getAllSystemModules,
  getEffectiveModulePermission,
  saveCustomRbacMatrix,
  getCustomRbacMatrix,
  PermissionLevel,
  ModulePermissionInfo,
} from '../../core/auth/rbac';

// Catálogo maestro de roles del ERP Inteckno
const ROLE_OPTIONS: { role: UserRole; label: string; defaultDept: string }[] = [
  { role: 'admin_sistemas', label: 'Administrador de Sistemas & TI', defaultDept: 'Sistemas y Tecnología' },
  { role: 'gerente_general', label: 'Gerente General', defaultDept: 'Dirección General' },
  { role: 'gerente_administrativa', label: 'Gerente Administrativa', defaultDept: 'Administración y Finanzas' },
  { role: 'coord_administrativo', label: 'Coordinador Administrativo', defaultDept: 'Administración y Finanzas' },
  { role: 'auxiliar_administrativo', label: 'Auxiliar Administrativo', defaultDept: 'Administración y Finanzas' },
  { role: 'contador_externo', label: 'Contador Externo', defaultDept: 'Administración y Finanzas' },
  { role: 'lider_proyectos', label: 'Líder / Coordinador de Proyectos', defaultDept: 'Ingeniería y Proyectos' },
  { role: 'gerente_proyectos', label: 'Gerente de Proyectos STC', defaultDept: 'Ingeniería y Proyectos' },
  { role: 'lider_ingenieria', label: 'Líder de Ingeniería', defaultDept: 'Ingeniería y Proyectos' },
  { role: 'ingeniero_proyectos', label: 'Ingeniero de Proyectos', defaultDept: 'Ingeniería y Proyectos' },
  { role: 'practicante_ingenieria', label: 'Practicante / Estudiante de Ingeniería', defaultDept: 'Ingeniería y Proyectos' },
  { role: 'supervisor_tecnico', label: 'Supervisor Técnico de Campo', defaultDept: 'Operaciones de Campo' },
  { role: 'tecnico_stc', label: 'Técnico Especialista STC', defaultDept: 'Operaciones de Campo' },
  { role: 'auxiliar_tecnico', label: 'Auxiliar Técnico STC', defaultDept: 'Operaciones de Campo' },
  { role: 'conductor', label: 'Conductor de Transporte & Logística', defaultDept: 'Operaciones de Campo' },
  { role: 'coord_comercial', label: 'Coordinador Comercial', defaultDept: 'Gestión Comercial' },
  { role: 'asistente_negocios_internacionales', label: 'Asistente Negocios Internacionales', defaultDept: 'Negocios Internacionales y ERP' },
  { role: 'coord_compras', label: 'Comprador Técnico', defaultDept: 'Cadena de Suministro' },
  { role: 'almacenista', label: 'Almacenista Técnico', defaultDept: 'Cadena de Suministro' },
  { role: 'hseq', label: 'Coordinador HSEQ / SST', defaultDept: 'SST y Sostenibilidad' },
  { role: 'auxiliar_sst', label: 'Auxiliar Técnico SST', defaultDept: 'SST y Sostenibilidad' },
  { role: 'gestor_ambiental', label: 'Gestor Ambiental', defaultDept: 'SST y Sostenibilidad' },
  { role: 'coord_talento_humano', label: 'Coordinador de Talento Humano', defaultDept: 'Talento Humano' },
  { role: 'auxiliar_talento_humano', label: 'Auxiliar de Talento Humano', defaultDept: 'Talento Humano' },
];

export const UserManagementModule: React.FC = () => {
  const {
    users,
    currentUser,
    updateUserProfile,
    resetUserPassword,
    createUserAccount,
    todos,
    projects,
    addTodo,
    notify,
  } = useErp();

  // Control estricto de acceso RBAC al módulo
  const canAccessModule = [
    'admin_sistemas',
    'gerente_general',
    'gerente_administrativa',
    'coord_talento_humano',
  ].includes(currentUser?.role);

  const isFullAdmin = [
    'admin_sistemas',
    'gerente_general',
    'gerente_administrativa',
  ].includes(currentUser?.role);

  // Pestaña activa principal
  const [activeTab, setActiveTab] = useState<'directorio' | 'permisos' | 'auditoria'>('directorio');

  // Modo de vista del directorio: Tabla vs Tarjetas
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Búsqueda y filtros del directorio
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'activa' | 'suspendida' | 'desactivada'>('all');
  const [isAiSearchActive, setIsAiSearchActive] = useState(false);
  const [aiSearchResults, setAiSearchResults] = useState<string[] | null>(null);
  const [aiSearchExplanation, setAiSearchExplanation] = useState<string>('');
  const [isSearchingWithAi, setIsSearchingWithAi] = useState(false);

  // Cargos oficiales disponibles
  const [officialPositions, setOfficialPositions] = useState<JobPosition[]>([]);
  useEffect(() => {
    setOfficialPositions(getStoredJobPositions());
  }, []);

  // Helper para resolver el cargo oficial de un usuario (por jobPosition, jobPositionId o rol)
  const getUserJobPosition = useCallback(
    (u: User): JobPosition | undefined => {
      if (u.jobPosition?.code) return u.jobPosition;
      if (u.jobPositionId) {
        const found = officialPositions.find(
          (p) => p.id === u.jobPositionId || p.code?.toUpperCase() === u.jobPositionId?.toUpperCase()
        );
        if (found) return found;
      }
      return officialPositions.find((p) => p.department === u.department && p.title === u.roleLabel);
    },
    [officialPositions]
  );

  // Catálogos dinámicos
  const catalogDepartments = useModuleCatalog('usuarios-ti', 'departments');
  const departments = useMemo(() => {
    return Array.from(
      new Set([
        ...(catalogDepartments || []).map((d) => d?.name).filter(Boolean),
        ...(users || []).map((u) => u?.department).filter(Boolean),
      ])
    ).filter(Boolean) as string[];
  }, [catalogDepartments, users]);

  // Sincronización con Microsoft Entra ID
  const [m365Users, setM365Users] = useState<M365TenantUser[]>([]);
  const [isSyncingM365, setIsSyncingM365] = useState(false);

  useEffect(() => {
    fetchM365TenantUsers().then((res) => {
      if (res.success) setM365Users(res.users);
    });
  }, []);

  const handleSyncM365Directly = async () => {
    setIsSyncingM365(true);
    try {
      const res = await fetchM365TenantUsers();
      if (res.success) {
        setM365Users(res.users);
        notify('success', 'Microsoft Entra ID Sincronizado', res.message);
        recordAuditEvent({
          action: 'user_updated',
          performedByUserId: currentUser?.id || 'USR-001',
          performedByName: currentUser?.name || 'Administrador TI',
          targetUserId: 'TENANT-M365',
          targetUserName: 'Directorio Microsoft 365',
          details: `Sincronización exitosa con tenant de Azure AD. Total cuentas detectadas: ${res.users.length}.`,
        });
      }
    } catch {
      notify('warning', 'Aviso de Conexión', 'Directorio de Azure AD sincronizado con caché local.');
    } finally {
      setIsSyncingM365(false);
    }
  };

  // Mapeo rápido de cuentas sincronizadas por correo
  const m365EmailMap = useMemo(() => {
    const map = new Map<string, M365TenantUser>();
    m365Users.forEach((u) => {
      if (u.mail) map.set(u.mail.toLowerCase(), u);
      if (u.userPrincipalName) map.set(u.userPrincipalName.toLowerCase(), u);
    });
    return map;
  }, [m365Users]);

  // Auditoría (Audit Logs)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditFilterAction, setAuditFilterAction] = useState('all');
  const [auditFilterUser, setAuditFilterUser] = useState('all');
  const [auditDateFrom, setAuditDateFrom] = useState('');
  const [auditDateTo, setAuditDateTo] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  const refreshAuditLogs = () => {
    setAuditLogs(getAuditLogs());
  };

  useEffect(() => {
    refreshAuditLogs();
  }, []);

  const filteredAuditLogs = useMemo(() => {
    return filterAuditLogs(auditLogs, {
      action: auditFilterAction,
      userId: auditFilterUser,
      dateFrom: auditDateFrom,
      dateTo: auditDateTo,
      search: auditSearch,
    });
  }, [auditLogs, auditFilterAction, auditFilterUser, auditDateFrom, auditDateTo, auditSearch]);

  // Matriz de permisos RBAC
  const systemModules = useMemo(() => getAllSystemModules(), []);
  const [customRbacMatrix, setCustomRbacMatrixState] = useState(getCustomRbacMatrix());

  const handleUpdatePermissionLevel = (role: UserRole, moduleId: string, nextLevel: PermissionLevel) => {
    if (!isFullAdmin) {
      notify('urgent', 'Acceso Denegado', 'Solo el Administrador de Sistemas o Gerencia General pueden editar la matriz de permisos.');
      return;
    }

    const prevLevel = getEffectiveModulePermission(role, moduleId);
    const updated = {
      ...customRbacMatrix,
      [role]: {
        ...(customRbacMatrix[role] || {}),
        [moduleId]: nextLevel,
      },
    };
    setCustomRbacMatrixState(updated);
    saveCustomRbacMatrix(updated);

    recordAuditEvent({
      action: 'permission_changed',
      performedByUserId: currentUser?.id || 'USR-001',
      performedByName: currentUser?.name || 'Administrador TI',
      targetUserId: `ROLE-${role}`,
      targetUserName: `Rol: ${role}`,
      details: `Modificación de gobierno de accesos en módulo "${moduleId}".`,
      previousValue: prevLevel,
      newValue: nextLevel,
    });

    notify('success', 'Permiso Actualizado', `Rol ${role} en módulo ${moduleId}: ${nextLevel.toUpperCase()}`);
  };

  // Estados para vista amigable de Gobierno de Accesos (RBAC)
  const [selectedRbacRole, setSelectedRbacRole] = useState<UserRole>('lider_proyectos');
  const [showRawMatrixTable, setShowRawMatrixTable] = useState(false);
  const [isM365TenantModalOpen, setIsM365TenantModalOpen] = useState(false);

  // Homologar HSEQ según Perfil de Cargo automáticamente (Resolución 4272)
  const handleAutoAlignHseqByJob = () => {
    let alignedCount = 0;
    const officeDepts = [
      'Dirección General',
      'Administración y Finanzas',
      'Gestión Comercial',
      'Sistemas y Tecnología',
      'Talento Humano',
      'HSEQ & Talento Humano',
      'Cadena de Suministro',
      'Negocios Internacionales y ERP',
    ];

    users.forEach((u) => {
      const isOffice = officeDepts.some(
        (od) => u.department?.toLowerCase().includes(od.toLowerCase())
      );
      const isFieldRole = ['tecnico_stc', 'supervisor_tecnico', 'lider_proyectos', 'lider_ingenieria'].includes(u.role);
      const shouldRequireHeights = isFieldRole && !isOffice;

      if (u.canWorkHeights !== shouldRequireHeights) {
        alignedCount++;
        updateUserProfile(u.id, {
          canWorkHeights: shouldRequireHeights,
          hseqStatus: shouldRequireHeights ? (u.hseqExpiresAt ? u.hseqStatus : 'valid') : 'valid',
        });
      }
    });

    notify(
      'success',
      'HSEQ Homologado con Éxito',
      `Se ajustaron las exigencias de alturas según Resolución 4272. Personal de oficina configurado como "No requerido" y personal técnico como "Apto alturas" (${alignedCount} colaboradores verificados).`
    );
  };

  // Diagnóstico de Directorio con LUC-IA-NA
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isDiagnosingDirectory, setIsDiagnosingDirectory] = useState(false);
  const [healthReport, setHealthReport] = useState<DirectoryHealthReport | null>(null);

  const handleRunDirectoryDiagnosis = async () => {
    setIsDiagnosingDirectory(true);
    setIsHealthModalOpen(true);
    try {
      const rep = await diagnoseUserDirectoryWithLuciana(users, officialPositions);
      setHealthReport(rep);
    } catch (err) {
      console.warn('Error diagnosticando directorio:', err);
    } finally {
      setIsDiagnosingDirectory(false);
    }
  };

  // Búsqueda en Lenguaje Natural con LUC-IA-NA
  const handleExecuteAiSearch = async () => {
    if (!searchTerm.trim()) {
      setIsAiSearchActive(false);
      setAiSearchResults(null);
      return;
    }
    setIsSearchingWithAi(true);
    try {
      const res = await searchEmployeesWithLuciana(searchTerm, users);
      setAiSearchResults(res.matchedUserIds);
      setAiSearchExplanation(res.explanation);
      setIsAiSearchActive(true);
    } catch {
      setIsAiSearchActive(false);
      setAiSearchResults(null);
    } finally {
      setIsSearchingWithAi(false);
    }
  };

  const handleClearAiSearch = () => {
    setIsAiSearchActive(false);
    setAiSearchResults(null);
    setAiSearchExplanation('');
    setSearchTerm('');
  };

  // Filtrado de usuarios del directorio
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Si la búsqueda IA está activa
      if (isAiSearchActive && aiSearchResults) {
        if (!aiSearchResults.includes(u.id)) return false;
      } else if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSearch =
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.roleLabel.toLowerCase().includes(term) ||
          u.department.toLowerCase().includes(term) ||
          (u.nationalId && u.nationalId.includes(term));
        if (!matchesSearch) return false;
      }

      if (filterDepartment !== 'all' && u.department !== filterDepartment) {
        return false;
      }

      if (filterStatus !== 'all') {
        const status = u.accountStatus || (u.isActive !== false ? 'activa' : 'desactivada');
        if (status !== filterStatus) return false;
      }

      return true;
    });
  }, [users, isAiSearchActive, aiSearchResults, searchTerm, filterDepartment, filterStatus]);

  // Modal de Restablecer Contraseña
  const [selectedUserForPass, setSelectedUserForPass] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forcePassChangeCheck, setForcePassChangeCheck] = useState(true);

  const handleOpenResetPass = (user: User) => {
    // Si es talento humano y el usuario es directivo, denegar
    if (!isFullAdmin && ['admin_sistemas', 'gerente_general', 'gerente_administrativa'].includes(user.role)) {
      notify('urgent', 'Acceso Restringido', 'No tienes autorización para restablecer credenciales de cargos directivos o administración de sistemas.');
      return;
    }

    setSelectedUserForPass(user);
    setNewPassword('ITK-2026-Secure#');
    setShowNewPassword(false);
    setForcePassChangeCheck(true);
  };

  const handleConfirmResetPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPass) return;

    if (newPassword.length < 6) {
      notify('warning', 'Contraseña Corta', 'La contraseña debe tener mínimo 6 caracteres.');
      return;
    }

    resetUserPassword(selectedUserForPass.id, newPassword);
    updateUserProfile(selectedUserForPass.id, {
      forcePasswordChange: forcePassChangeCheck,
    });

    await recordAuditEvent({
      action: 'password_reset',
      performedByUserId: currentUser?.id || 'USR-001',
      performedByName: currentUser?.name || 'Administrador TI',
      targetUserId: selectedUserForPass.id,
      targetUserName: selectedUserForPass.name,
      details: `Restablecimiento de credenciales con forzado de cambio en próximo login: ${forcePassChangeCheck ? 'Sí' : 'No'}.`,
    });

    refreshAuditLogs();
    notify('success', 'Contraseña Restablecida', `Se ha actualizado la contraseña para ${selectedUserForPass.name}.`);
    setSelectedUserForPass(null);
  };

  // Modal de Edición Completa de Usuario
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editActiveTab, setEditActiveTab] = useState<'personal' | 'cargo' | 'hseq' | 'seguridad'>('personal');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [newCompetencyInput, setNewCompetencyInput] = useState('');
  const editPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleOpenEditUser = (user: User) => {
    const resolvedJob = getUserJobPosition(user);
    setEditingUser({
      ...user,
      jobPositionId: user.jobPositionId || resolvedJob?.id,
      jobPosition: user.jobPosition || resolvedJob,
      password: user.password || 'Inteckno2026*',
      competencies: [...(user.competencies || [])],
    });
    setEditActiveTab('personal');
    setShowEditPassword(false);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const oldUser = users.find((u) => u.id === editingUser.id);
    const roleChanged = oldUser && oldUser.role !== editingUser.role;

    if (roleChanged && !isFullAdmin) {
      notify('urgent', 'Permiso Denegado', 'La coordinación de talento humano no puede modificar roles de seguridad RBAC.');
      return;
    }

    updateUserProfile(editingUser.id, editingUser);

    await recordAuditEvent({
      action: roleChanged ? 'role_changed' : 'user_updated',
      performedByUserId: currentUser?.id || 'USR-001',
      performedByName: currentUser?.name || 'Administrador TI',
      targetUserId: editingUser.id,
      targetUserName: editingUser.name,
      details: roleChanged
        ? `Cambio de rol de "${oldUser?.roleLabel}" a "${editingUser.roleLabel}".`
        : `Actualización de ficha de usuario (Departamento: ${editingUser.department}).`,
      previousValue: oldUser ? `${oldUser.roleLabel} (${oldUser.department})` : undefined,
      newValue: `${editingUser.roleLabel} (${editingUser.department})`,
    });

    refreshAuditLogs();
    notify('success', 'Usuario Actualizado', `Ficha completa de ${editingUser.name} guardada.`);
    setEditingUser(null);
  };

  // Gestión de Estado de Cuenta (Activa / Suspendida / Desactivada) con Verificación de Impacto
  const [deactivationTargetUser, setDeactivationTargetUser] = useState<User | null>(null);
  const [pendingUserTasks, setPendingUserTasks] = useState<any[]>([]);
  const [pendingUserProjects, setPendingUserProjects] = useState<any[]>([]);

  const handleRequestStatusChange = (user: User, targetStatus: 'activa' | 'suspendida' | 'desactivada') => {
    if (user.id === currentUser?.id) {
      notify('warning', 'Acción no Permitida', 'No puedes suspender o desactivar tu propia cuenta de usuario en sesión.');
      return;
    }

    if (targetStatus === 'desactivada' || targetStatus === 'suspendida') {
      // Verificar si tiene tareas o proyectos asignados
      const userTodos = todos.filter((t) => t.assignedToUserId === user.id && !t.completed);
      const userProjects = projects.filter(
        (p) =>
          p.projectLeaderId === user.id ||
          p.supervisorId === user.id ||
          (p.assignedTeamIds && p.assignedTeamIds.includes(user.id))
      );

      if (userTodos.length > 0 || userProjects.length > 0) {
        setDeactivationTargetUser(user);
        setPendingUserTasks(userTodos);
        setPendingUserProjects(userProjects);
        return;
      }
    }

    // Si no tiene tareas o es reactivación directa
    executeStatusChange(user, targetStatus);
  };

  const executeStatusChange = async (user: User, targetStatus: 'activa' | 'suspendida' | 'desactivada') => {
    const isNowActive = targetStatus === 'activa';
    updateUserProfile(user.id, {
      accountStatus: targetStatus,
      isActive: isNowActive,
    });

    await recordAuditEvent({
      action: isNowActive ? 'account_reactivated' : 'account_deactivated',
      performedByUserId: currentUser?.id || 'USR-001',
      performedByName: currentUser?.name || 'Administrador TI',
      targetUserId: user.id,
      targetUserName: user.name,
      details: `Cambio de estado de cuenta a: "${targetStatus.toUpperCase()}".`,
      previousValue: user.accountStatus || (user.isActive ? 'activa' : 'desactivada'),
      newValue: targetStatus,
    });

    refreshAuditLogs();
    notify(
      isNowActive ? 'success' : 'info',
      `Cuenta ${targetStatus.toUpperCase()}`,
      `El usuario ${user.name} ahora se encuentra en estado "${targetStatus}".`
    );
    setDeactivationTargetUser(null);
  };

  // -------------------------------------------------------------
  // WIZARD DE CREACIÓN Y APROVISIONAMIENTO (4 PASOS CON LUC-IA-NA)
  // -------------------------------------------------------------
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createStep, setCreateStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProvisioningAi, setIsProvisioningAi] = useState(false);
  const [provisioningDraft, setProvisioningDraft] = useState<{
    inductionPath: string;
    welcomeActivities: string[];
    welcomeEmailSubject: string;
    summary: string;
  } | null>(null);

  // Formulario del Wizard
  const [newUserData, setNewUserData] = useState({
    name: '',
    nationalId: '',
    email: '',
    phone: '',
    photoUrl: '',
    jobPositionId: '',
    role: 'tecnico_stc' as UserRole,
    roleLabel: 'Técnico Especialista STC',
    department: 'Operaciones de Campo',
    canWorkHeights: false,
    hseqExpiresAt: '2028-12-31',
    bloodType: 'O+',
    birthDate: '1995-01-01',
    address: 'Medellín, Antioquia',
    city: 'Medellín',
    emergencyContactName: '',
    emergencyContactPhone: '',
    password: 'ITK-2026-Secure#',
    forcePasswordChange: true,
    sendM365WelcomeEmail: true,
  });

  const wizardPhotoInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCreateWizard = () => {
    setCreateStep(1);
    setProvisioningDraft(null);
    setNewUserData({
      name: '',
      nationalId: '',
      email: '',
      phone: '',
      photoUrl: '',
      jobPositionId: officialPositions[0]?.id || '',
      role: 'tecnico_stc',
      roleLabel: 'Técnico Especialista STC',
      department: 'Operaciones de Campo',
      canWorkHeights: true,
      hseqExpiresAt: '2027-12-31',
      bloodType: 'O+',
      birthDate: '1995-01-01',
      address: 'Medellín, Antioquia',
      city: 'Medellín',
      emergencyContactName: '',
      emergencyContactPhone: '',
      password: `ITK-2026-${Math.floor(100 + Math.random() * 900)}#`,
      forcePasswordChange: true,
      sendM365WelcomeEmail: true,
    });
    setIsCreatingUser(true);
  };

  // Al seleccionar ficha oficial de cargo en Paso 2
  const handleSelectJobPositionInWizard = (jobId: string) => {
    const job = officialPositions.find((j) => j.id === jobId);
    if (!job) {
      setNewUserData({ ...newUserData, jobPositionId: '' });
      return;
    }

    // Inferir rol sugerido según título de la ficha
    let inferredRole: UserRole = 'tecnico_stc';
    const titleLower = job.title.toLowerCase();
    if (titleLower.includes('gerente de proyecto')) inferredRole = 'gerente_proyectos';
    else if (titleLower.includes('líder') || titleLower.includes('lider')) inferredRole = 'lider_proyectos';
    else if (titleLower.includes('supervisor')) inferredRole = 'supervisor_tecnico';
    else if (titleLower.includes('hseq') || titleLower.includes('sst')) inferredRole = 'hseq';
    else if (titleLower.includes('compras')) inferredRole = 'coord_compras';
    else if (titleLower.includes('almacén') || titleLower.includes('almacen')) inferredRole = 'almacenista';
    else if (titleLower.includes('ingeniero')) inferredRole = 'ingeniero_proyectos';
    else if (titleLower.includes('sistemas') || titleLower.includes('cloud')) inferredRole = 'admin_sistemas';

    const roleOption = ROLE_OPTIONS.find((r) => r.role === inferredRole);

    setNewUserData({
      ...newUserData,
      jobPositionId: job.id,
      role: inferredRole,
      roleLabel: job.title || (roleOption ? roleOption.label : 'Especialista ITK'),
      department: job.department || newUserData.department,
    });
  };

  // Generar contraseña aleatoria de alta entropía
  const handleGenerateRandomPass = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!#$';
    let pass = 'ITK-';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    pass += '#';
    setNewUserData({ ...newUserData, password: pass });
  };

  // Previsualizar aprovisionamiento antes de confirmación en Paso 4
  useEffect(() => {
    if (createStep === 4 && !provisioningDraft && newUserData.name) {
      const selectedJob = officialPositions.find((j) => j.id === newUserData.jobPositionId);
      generateOnboardingProvisioningWithLuciana(
        {
          name: newUserData.name,
          email: newUserData.email,
          role: newUserData.role,
          roleLabel: newUserData.roleLabel,
          department: newUserData.department,
        },
        selectedJob
      ).then((draft) => setProvisioningDraft(draft));
    }
  }, [createStep, newUserData.name, newUserData.jobPositionId, officialPositions, provisioningDraft]);

  // Confirmar y Ejecutar Aprovisionamiento Oficial
  const handleConfirmProvisioning = async () => {
    if (!newUserData.name || !newUserData.email) return;

    setIsProvisioningAi(true);
    try {
      const selectedJob = officialPositions.find((j) => j.id === newUserData.jobPositionId);
      const initials = newUserData.name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase();

      // 1. Crear el usuario en el ERP
      const created = createUserAccount({
        name: newUserData.name.trim(),
        email: newUserData.email.trim().toLowerCase(),
        nationalId: newUserData.nationalId.trim(),
        phone: newUserData.phone.trim(),
        photoUrl: newUserData.photoUrl || undefined,
        role: newUserData.role,
        roleLabel: newUserData.roleLabel,
        department: newUserData.department,
        avatar: initials || 'IT',
        avatarColor: '#00668F',
        password: newUserData.password,
        forcePasswordChange: newUserData.forcePasswordChange,
        accountStatus: 'activa',
        isActive: true,
        canWorkHeights: newUserData.canWorkHeights,
        hseqStatus: newUserData.canWorkHeights ? 'valid' : 'pending',
        hseqExpiresAt: newUserData.hseqExpiresAt,
        bloodType: newUserData.bloodType,
        birthDate: newUserData.birthDate,
        address: newUserData.address,
        city: newUserData.city,
        emergencyContactName: newUserData.emergencyContactName,
        emergencyContactPhone: newUserData.emergencyContactPhone,
        jobPositionId: selectedJob?.id,
        jobPosition: selectedJob,
        inductionPath: provisioningDraft?.inductionPath || 'Inducción Oficial Inteckno STC',
        onboardingCompleted: false,
        competencies: selectedJob?.technicalSkills || ['Inducción General STC'],
      });

      // 2. Asignar actividades automáticas de bienvenida vía addTodo
      const activities = provisioningDraft?.welcomeActivities || [
        'Completar lectura y firma de Política SST y Reglamento Interno.',
        'Entregar documentos de vinculación y certificado de alturas vigente a HSEQ.',
      ];

      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

      addTodo(
        activities[0] || 'Completar lectura y firma de Política SST',
        'alta',
        tomorrow,
        created.id,
        created.name,
        'HSEQ-TRANSVERSAL',
        'Ruta de inducción SST obligatoria para nuevo ingreso a Inteckno S.A.S.'
      );

      if (activities[1]) {
        addTodo(
          activities[1],
          'alta',
          inThreeDays,
          created.id,
          created.name,
          'TALENTO-HUMANO',
          'Entrega de soportes y registro en matriz de aptitud laboral.'
        );
      }

      // 3. Envío de correo de bienvenida vía Microsoft 365 si está habilitado
      if (newUserData.sendM365WelcomeEmail) {
        await sendWelcomeEmailViaGraph(
          newUserData.email,
          newUserData.name,
          newUserData.password,
          newUserData.roleLabel,
          activities
        );
      }

      // 4. Registro en Auditoría
      await recordAuditEvent({
        action: 'user_created',
        performedByUserId: currentUser?.id || 'USR-001',
        performedByName: currentUser?.name || 'Administrador TI',
        targetUserId: created.id,
        targetUserName: created.name,
        details: `Alta oficial de colaborador vinculado a cargo "${newUserData.roleLabel}" (${newUserData.department}). Ruta de inducción asignada y credenciales generadas.`,
        newValue: `Rol: ${newUserData.role} | Cargo: ${newUserData.roleLabel} | Depto: ${newUserData.department}`,
      });

      refreshAuditLogs();
      notify('success', 'Empleado Aprovisionado con Éxito', `Usuario ${newUserData.name} creado y notificado con su ruta de inducción.`);
      setIsCreatingUser(false);
    } catch (err) {
      console.warn('Error en aprovisionamiento:', err);
      notify('urgent', 'Error', 'Ocurrió un problema durante el aprovisionamiento.');
    } finally {
      setIsProvisioningAi(false);
    }
  };

  // Exportar Directorio a CSV / Excel
  const handleExportDirectory = () => {
    const headers = [
      'ID',
      'Cédula / Documento',
      'Nombre Completo',
      'Correo Corporativo',
      'Rol ERP',
      'Cargo Oficial',
      'Departamento',
      'Teléfono',
      'Ciudad',
      'Grupo Sanguíneo',
      'Contacto Emergencia',
      'Tel. Emergencia',
      'Estado Cuenta',
      'Apto Alturas',
      'Vencimiento Alturas',
      'M365 Sincronizado',
    ];

    const rows = users.map((u) => {
      const isM365 = m365EmailMap.has(u.email.toLowerCase()) || u.m365AccountSynced;
      return [
        `"${u.id}"`,
        `"${u.nationalId || ''}"`,
        `"${u.name}"`,
        `"${u.email}"`,
        `"${u.roleLabel}"`,
        `"${u.jobPosition?.title || u.roleLabel}"`,
        `"${u.department}"`,
        `"${u.phone || ''}"`,
        `"${u.city || 'Medellín'}"`,
        `"${u.bloodType || 'O+'}"`,
        `"${u.emergencyContactName || ''}"`,
        `"${u.emergencyContactPhone || ''}"`,
        `"${u.accountStatus || (u.isActive ? 'activa' : 'desactivada')}"`,
        `"${u.canWorkHeights ? 'Sí' : 'No'}"`,
        `"${u.canWorkHeights ? u.hseqExpiresAt || '' : 'N/A'}"`,
        `"${isM365 ? 'Sí' : 'No'}"`,
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Directorio_Corporativo_Inteckno_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('success', 'Directorio Exportado', 'Se descargó el archivo CSV compatible con Excel para licitaciones.');
  };

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Métricas para KPIs superiores
  const totalActiveUsers = users.filter((u) => u.isActive !== false && u.accountStatus !== 'desactivada').length;
  const expiredHeightsUsers = users.filter((u) => {
    if (!u.canWorkHeights) return false;
    return new Date(u.hseqExpiresAt || '2020-01-01').getTime() < Date.now();
  }).length;
  const withoutJobCount = users.filter((u) => !getUserJobPosition(u)).length;

  if (!canAccessModule) {
    return (
      <div className="p-8 text-center max-w-md mx-auto my-12 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
          <ShieldAlert size={24} />
        </div>
        <h2 className="text-base font-bold text-gray-900 mb-1">Módulo de Acceso Restringido</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-4">
          La Consola TI y Gestión de Usuarios está reservada exclusivamente para el Administrador de Sistemas, Gerencia General y Coordinación de Talento Humano.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full max-w-7xl mx-auto pb-16 min-w-0">
      {/* Cabecera Principal y Barra de Navegación de la Consola TI */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
                  Consola TI & Gobierno de Usuarios
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-[#00668F] border border-sky-200">
                  ISO 27001 / RBAC
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Aprovisionamiento automatizado con LUC-IA-NA, sincronización con Microsoft Entra ID y trazabilidad auditada.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunDirectoryDiagnosis}
              className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-[#00668F] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Analizar salud del directorio con inteligencia artificial"
            >
              <Sparkles size={14} />
              <span>Diagnóstico IA</span>
            </button>

            <button
              type="button"
              onClick={handleAutoAlignHseqByJob}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Ajustar automáticamente: roles de oficina como 'No requerido' y campo como 'Apto alturas' (Res. 4272)"
            >
              <HardHat size={13} />
              <span>Homologar HSEQ</span>
            </button>

            <button
              type="button"
              onClick={() => setIsM365TenantModalOpen(true)}
              className="px-3 py-2 bg-sky-50 hover:bg-sky-100 text-[#00668F] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Administrar conexión corporativa con Microsoft 365 / Azure Entra ID"
            >
              <Cloud size={13} />
              <span>Tenant M365</span>
            </button>

            <button
              type="button"
              onClick={handleSyncM365Directly}
              disabled={isSyncingM365}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-60"
              title="Sincronizar cuentas con Microsoft Entra ID (Azure AD)"
            >
              <RefreshCw size={13} className={isSyncingM365 ? 'animate-spin' : ''} />
              <span>{isSyncingM365 ? 'Sincronizando...' : 'Azure AD'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportDirectory}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Exportar archivo CSV compatible con Excel para licitaciones"
            >
              <FileSpreadsheet size={13} className="text-emerald-700" />
              <span>Exportar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Personalizar catálogos del módulo"
            >
              <Settings size={13} />
            </button>

            <button
              type="button"
              onClick={handleOpenCreateWizard}
              className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
            >
              <UserPlus size={14} />
              <span>+ Nuevo Usuario</span>
            </button>
          </div>
        </div>

        {/* Pestañas de la Consola TI */}
        <div className="flex items-center gap-2 border-b border-slate-100 pt-1">
          <button
            type="button"
            onClick={() => setActiveTab('directorio')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'directorio'
                ? 'border-[#00668F] text-[#00668F]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Users size={14} />
            <span>Directorio de Usuarios ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permisos')}
            className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'permisos'
                ? 'border-[#00668F] text-[#00668F]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <Shield size={14} />
            <span>Gobierno de Accesos & Permisos (RBAC)</span>
          </button>

          {isFullAdmin && (
            <button
              type="button"
              onClick={() => setActiveTab('auditoria')}
              className={`pb-2.5 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'auditoria'
                  ? 'border-[#00668F] text-[#00668F]'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              <FileText size={14} />
              <span>Historial de Auditoría ({auditLogs.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* KPIs Superiores del Directorio */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[11px] text-gray-500 font-semibold block truncate">Total Activos</span>
            <span className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5 block">{totalActiveUsers}</span>
            <span className="text-[10px] text-emerald-600 font-semibold block truncate">Acceso autorizado</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center font-bold shrink-0">
            <Users size={18} />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[11px] text-gray-500 font-semibold block truncate">Alturas Vencidas</span>
            <span className={`text-xl sm:text-2xl font-black mt-0.5 block ${expiredHeightsUsers > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
              {expiredHeightsUsers}
            </span>
            <span className={`text-[10px] font-semibold block truncate ${expiredHeightsUsers > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
              {expiredHeightsUsers > 0 ? 'Riesgo operativo HSEQ' : 'Todo al día'}
            </span>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0 ${expiredHeightsUsers > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <HardHat size={18} />
          </div>
        </div>

        <div
          onClick={() => setIsM365TenantModalOpen(true)}
          className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between cursor-pointer hover:border-sky-300 transition-all"
          title="Ver estado de conexión con Microsoft 365 / Azure Entra ID"
        >
          <div className="min-w-0">
            <span className="text-[11px] text-gray-500 font-semibold block truncate">Cuentas Microsoft 365</span>
            <span className="text-xl sm:text-2xl font-black text-[#00668F] mt-0.5 block">
              {users.filter((u) => u.email.toLowerCase().endsWith('@inteckno.com') || m365EmailMap.has(u.email.toLowerCase())).length}
            </span>
            <span className="text-[10px] text-emerald-600 font-semibold block truncate">Tenant inteckno.com activo</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center font-bold shrink-0">
            <Cloud size={18} />
          </div>
        </div>

        <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[11px] text-gray-500 font-semibold block truncate">Sin Ficha Oficial</span>
            <span className={`text-xl sm:text-2xl font-black mt-0.5 block ${withoutJobCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {withoutJobCount}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold block truncate">Requieren vinculación</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <Briefcase size={18} />
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* PESTAÑA 1: DIRECTORIO DE USUARIOS                         */}
      {/* ========================================================= */}
      {activeTab === 'directorio' && (
        <div className="space-y-3">
          {/* Barra de Filtros, Búsqueda y Modos de Vista */}
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex-1 w-full flex items-center gap-2">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim().split(' ').length > 2) {
                      handleExecuteAiSearch();
                    }
                  }}
                  placeholder="Buscar por nombre, cédula, cargo, o escribe en lenguaje natural..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              {searchTerm.trim().length > 3 && (
                <button
                  type="button"
                  onClick={handleExecuteAiSearch}
                  disabled={isSearchingWithAi}
                  className="px-3 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Interpretar consulta con inteligencia artificial"
                >
                  <Sparkles size={13} className={isSearchingWithAi ? 'animate-spin' : ''} />
                  <span className="hidden sm:inline">Búsqueda IA</span>
                </button>
              )}

              {isAiSearchActive && (
                <button
                  type="button"
                  onClick={handleClearAiSearch}
                  className="p-2 text-gray-400 hover:text-rose-600 rounded-xl hover:bg-slate-100 cursor-pointer"
                  title="Quitar filtro de IA"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-medium text-gray-700 focus:bg-white focus:outline-none flex-1 md:flex-none cursor-pointer"
              >
                <option value="all">Todos los Deptos ({departments.length})</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-3 py-2 bg-slate-100 rounded-xl text-xs font-medium text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="all">Todos los Estados</option>
                <option value="activa">Activas</option>
                <option value="suspendida">Suspendidas</option>
                <option value="desactivada">Desactivadas</option>
              </select>

              {/* Selector de Modo de Vista */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'table' ? 'bg-white text-[#00668F] shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-900'
                  }`}
                  title="Vista en Tabla Detallada"
                >
                  <List size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'cards' ? 'bg-white text-[#00668F] shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-900'
                  }`}
                  title="Vista de Tarjetas de Directorio"
                >
                  <LayoutGrid size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Banner de Búsqueda IA si está activa */}
          {isAiSearchActive && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl flex items-center justify-between text-xs text-sky-950">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-[#00668F] shrink-0" />
                <span>
                  <strong>Filtro Inteligente:</strong> {aiSearchExplanation} (Mostrando {filteredUsers.length} resultado(s)).
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearAiSearch}
                className="font-bold text-[#00668F] hover:underline cursor-pointer ml-3"
              >
                Ver todos
              </button>
            </div>
          )}

          {/* ---------------- VISTA EN TABLA ---------------- */}
          {viewMode === 'table' ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Colaborador</th>
                      <th className="py-3 px-4">Cargo & Ficha ITK</th>
                      <th className="py-3 px-4">Contacto & Ciudad</th>
                      <th className="py-3 px-4">Seguridad HSEQ</th>
                      <th className="py-3 px-4 text-center">Estado Cuenta</th>
                      <th className="py-3 px-4 text-center">Azure AD</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-gray-400">
                          No se encontraron usuarios con los criterios de búsqueda seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const isCurrent = u.id === currentUser?.id;
                        const status = u.accountStatus || (u.isActive !== false ? 'activa' : 'desactivada');
                        const isM365Synced = u.email.toLowerCase().endsWith('@inteckno.com') || m365EmailMap.has(u.email.toLowerCase()) || u.m365AccountSynced;
                        const hasHeightExpired = u.canWorkHeights && new Date(u.hseqExpiresAt || '2020-01-01').getTime() < Date.now();

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2.5">
                                {u.photoUrl ? (
                                  <img
                                    src={u.photoUrl}
                                    alt={u.name}
                                    className="w-9 h-9 rounded-full object-cover shrink-0 aspect-square border border-slate-200"
                                  />
                                ) : (
                                  <div
                                    className="w-9 h-9 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 aspect-square"
                                    style={{ backgroundColor: u.avatarColor || '#00668F' }}
                                  >
                                    {u.avatar || 'IT'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="font-bold text-gray-900 flex items-center gap-1.5 truncate">
                                    <span className="truncate">{u.name}</span>
                                    {isCurrent && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold shrink-0">
                                        Tú
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-gray-500 font-mono truncate">{u.email}</div>
                                  {u.nationalId && (
                                    <div className="text-[10px] text-gray-400">CC: {u.nationalId}</div>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              <div className="font-bold text-gray-900 leading-snug">{u.roleLabel}</div>
                              <div className="text-[11px] text-gray-500">{u.department}</div>
                              {(() => {
                                const resolvedJob = getUserJobPosition(u);
                                return resolvedJob?.code ? (
                                  <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 bg-sky-50 text-[#00668F] font-mono rounded font-semibold">
                                    {resolvedJob.code}
                                  </span>
                                ) : (
                                  <span className="inline-block mt-0.5 text-[10px] text-amber-700 italic">
                                    Sin Ficha Vinculada
                                  </span>
                                );
                              })()}
                            </td>

                            <td className="py-3 px-4">
                              <div className="text-gray-800 font-medium flex items-center gap-1.5">
                                <Phone size={12} className="text-emerald-600 shrink-0" />
                                <span className="truncate">{u.phone || 'Sin registrar'}</span>
                              </div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin size={11} className="text-gray-400 shrink-0" />
                                <span>{u.city || 'Medellín'}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4">
                              {u.canWorkHeights ? (
                                !hasHeightExpired ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                    <Check size={10} /> Vigente ({u.hseqExpiresAt})
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                    <AlertTriangle size={10} /> Vencido ({u.hseqExpiresAt})
                                  </span>
                                )
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  <Briefcase size={10} className="text-slate-400" /> No requerido (Oficina)
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  status === 'activa'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : status === 'suspendida'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    status === 'activa'
                                      ? 'bg-emerald-600'
                                      : status === 'suspendida'
                                      ? 'bg-amber-600'
                                      : 'bg-rose-600'
                                  }`}
                                />
                                {status.toUpperCase()}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-center">
                              {isM365Synced ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#00668F] bg-sky-50 px-2 py-0.5 rounded-full">
                                  <Cloud size={11} /> Conectado
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-400 font-medium">
                                  No enlazado
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenResetPass(u)}
                                  title="Restablecer Contraseña"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-sky-100 text-gray-600 hover:text-[#00668F] transition-colors cursor-pointer"
                                >
                                  <KeyRound size={13} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditUser(u)}
                                  title="Editar Ficha del Colaborador"
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-100 text-gray-600 hover:text-amber-800 transition-colors cursor-pointer"
                                >
                                  <Edit3 size={13} />
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextStatus =
                                      status === 'activa'
                                        ? 'suspendida'
                                        : status === 'suspendida'
                                        ? 'desactivada'
                                        : 'activa';
                                    handleRequestStatusChange(u, nextStatus);
                                  }}
                                  disabled={isCurrent}
                                  title={isCurrent ? 'No puedes cambiar tu propio estado' : `Cambiar estado (actual: ${status})`}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-gray-600 hover:text-rose-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  <Lock size={13} />
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
          ) : (
            /* ---------------- VISTA EN TARJETAS (CARDS) ---------------- */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredUsers.length === 0 ? (
                <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-slate-200">
                  No se encontraron colaboradores en la búsqueda.
                </div>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = u.id === currentUser?.id;
                  const status = u.accountStatus || (u.isActive !== false ? 'activa' : 'desactivada');
                  const isM365Synced = u.email.toLowerCase().endsWith('@inteckno.com') || m365EmailMap.has(u.email.toLowerCase()) || u.m365AccountSynced;
                  const hasHeightExpired = u.canWorkHeights && new Date(u.hseqExpiresAt || '2020-01-01').getTime() < Date.now();

                  return (
                    <div
                      key={u.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col justify-between hover:border-slate-300 transition-all space-y-3"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {u.photoUrl ? (
                              <img
                                src={u.photoUrl}
                                alt={u.name}
                                className="w-12 h-12 rounded-full object-cover shrink-0 aspect-square border border-slate-200 shadow-2xs"
                              />
                            ) : (
                              <div
                                className="w-12 h-12 rounded-full text-white text-sm font-bold flex items-center justify-center shrink-0 aspect-square shadow-2xs"
                                style={{ backgroundColor: u.avatarColor || '#00668F' }}
                              >
                                {u.avatar || 'IT'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-bold text-gray-900 text-sm flex items-center gap-1.5 truncate">
                                <span className="truncate">{u.name}</span>
                                {isCurrent && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold shrink-0">
                                    Tú
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 font-medium truncate">{u.roleLabel}</p>
                              <p className="text-[11px] text-gray-400 truncate">{u.department}</p>
                            </div>
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                              status === 'activa'
                                ? 'bg-emerald-100 text-emerald-800'
                                : status === 'suspendida'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {status}
                          </span>
                        </div>

                        {/* Badges de Ficha Oficial, Alturas y M365 */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {(() => {
                            const resolvedJob = getUserJobPosition(u);
                            return resolvedJob?.code ? (
                              <span className="text-[10px] px-2 py-0.5 bg-sky-50 text-[#00668F] font-mono rounded font-bold">
                                {resolvedJob.code}
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-800 rounded font-semibold">
                                Sin Ficha ITK
                              </span>
                            );
                          })()}

                          {u.canWorkHeights ? (
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1 ${
                                !hasHeightExpired ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                              }`}
                            >
                              <HardHat size={10} />
                              {!hasHeightExpired ? `Alturas ${u.hseqExpiresAt}` : 'Alturas Vencidas'}
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-semibold flex items-center gap-1">
                              <Briefcase size={10} className="text-slate-400" /> Rol Oficina
                            </span>
                          )}

                          {isM365Synced && (
                            <span className="text-[10px] px-2 py-0.5 bg-sky-50 text-[#00668F] rounded font-semibold flex items-center gap-1">
                              <Cloud size={10} /> Entra ID
                            </span>
                          )}

                          {u.linkedInUrl && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold flex items-center gap-1">
                              LinkedIn
                            </span>
                          )}
                        </div>

                        {/* Datos de Contacto */}
                        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs text-gray-600">
                          <div className="flex items-center gap-2 truncate">
                            <Mail size={12} className="text-gray-400 shrink-0" />
                            <span className="font-mono text-[11px] truncate">{u.email}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone size={12} className="text-emerald-600 shrink-0" />
                            <span>{u.phone || 'Sin teléfono'}</span>
                          </div>
                          {u.emergencyContactName && (
                            <div className="flex items-center gap-2 text-[11px] text-gray-500">
                              <Heart size={11} className="text-rose-400 shrink-0" />
                              <span className="truncate">Emergencia: {u.emergencyContactName} ({u.emergencyContactPhone || 'S/N'})</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Botones de Acción de la Tarjeta */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenResetPass(u)}
                            className="p-1.5 text-gray-500 hover:text-[#00668F] hover:bg-sky-50 rounded-lg cursor-pointer"
                            title="Restablecer Contraseña"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextStatus =
                                status === 'activa'
                                  ? 'suspendida'
                                  : status === 'suspendida'
                                  ? 'desactivada'
                                  : 'activa';
                              handleRequestStatusChange(u, nextStatus);
                            }}
                            disabled={isCurrent}
                            className="p-1.5 text-gray-500 hover:text-amber-800 hover:bg-amber-50 rounded-lg cursor-pointer disabled:opacity-40"
                            title={`Cambiar estado de la cuenta`}
                          >
                            <Lock size={14} />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenEditUser(u)}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 size={12} />
                          <span>Editar Ficha</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 2: GOBIERNO DE ACCESOS Y PERMISOS (RBAC AVANZADO) */}
      {/* ========================================================= */}
      {/* ========================================================= */}
      {/* PESTAÑA 2: GOBIERNO DE ACCESOS Y PERMISOS (RBAC)           */}
      {/* ========================================================= */}
      {activeTab === 'permisos' && (
        <div className="space-y-4">
          {/* Banner Explicativo Amigable */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#00668F] flex items-center justify-center shrink-0">
                    <Shield size={16} />
                  </div>
                  <h2 className="text-base font-bold text-gray-900">
                    Gobierno de Accesos & Permisos por Cargo
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    Calibración Automática Activa
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  En Inteckno ERP, los permisos de cada usuario se asignan automáticamente según su <strong>Cargo Oficial</strong>. Esto garantiza que el personal de campo solo acceda a tareas operativas, el área comercial a sus cotizaciones y clientes, y que las finanzas y salarios permanezcan protegidos.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowRawMatrixTable(!showRawMatrixTable)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs"
              >
                <SlidersHorizontal size={13} />
                <span>{showRawMatrixTable ? 'Ocultar Matriz Técnica' : 'Ver Matriz Técnica (ISO 27001)'}</span>
              </button>
            </div>

            {/* Tarjetas de Respuestas Rápidas para Tranquilidad del Usuario */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="font-bold text-gray-900 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span>¿Debes configurar algo?</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  <strong>No.</strong> Todo viene preconfigurado de fábrica. Solo debes cambiar un permiso si deseas darle un acceso especial a un rol.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="font-bold text-gray-900 flex items-center gap-1.5">
                  <Lock size={13} className="text-[#00668F]" />
                  <span>¿En qué ayuda esto?</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Evita que se modifiquen reportes o costos contables por error y protege la privacidad de la empresa.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                <div className="font-bold text-gray-900 flex items-center gap-1.5">
                  <Users size={13} className="text-purple-600" />
                  <span>¿Cómo funciona?</span>
                </div>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Al vincular un empleado con su Cargo Oficial, el ERP le entrega de inmediato su llave de acceso a las pantallas que le corresponden.
                </p>
              </div>
            </div>
          </div>

          {/* Selector de Perfil de Cargo (Pestañas de Selección) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
            <div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Selecciona un Cargo para Inspeccionar o Modificar sus Accesos:
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none">
                {ROLE_OPTIONS.map((r) => {
                  const isSelected = selectedRbacRole === r.role;
                  return (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setSelectedRbacRole(r.role)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#00668F] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detalle del Cargo Seleccionado */}
            {(() => {
              const currentRoleInfo = ROLE_OPTIONS.find((r) => r.role === selectedRbacRole);
              const permissions = systemModules.map((mod) => ({
                module: mod,
                level: getEffectiveModulePermission(selectedRbacRole, mod.id),
              }));

              const accessibleCount = permissions.filter((p) => p.level !== 'none').length;
              const adminCount = permissions.filter((p) => p.level === 'admin').length;
              const writeCount = permissions.filter((p) => p.level === 'write').length;
              const readCount = permissions.filter((p) => p.level === 'read').length;

              return (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <div className="font-bold text-gray-900 text-sm">
                        Permisos asignados a: <span className="text-[#00668F]">{currentRoleInfo?.label}</span>
                      </div>
                      <div className="text-[11px] text-gray-500">
                        Departamento habitual: {currentRoleInfo?.defaultDept} • {accessibleCount} de {systemModules.length} módulos habilitados
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900">
                        {adminCount} Total
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900">
                        {writeCount} Edición
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-900">
                        {readCount} Consulta
                      </span>
                    </div>
                  </div>

                  {/* Cuadrícula limpia de módulos para el cargo seleccionado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {permissions.map(({ module: mod, level }) => {
                      const nextMap: Record<PermissionLevel, PermissionLevel> = {
                        none: 'read',
                        read: 'write',
                        write: 'admin',
                        admin: 'none',
                      };

                      return (
                        <div
                          key={mod.id}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                            level === 'none'
                              ? 'bg-slate-50/50 border-slate-200/60 opacity-60'
                              : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                          }`}
                        >
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-gray-900 block truncate">
                              {mod.label}
                            </span>
                            <span className="text-[10px] text-gray-400 block truncate">
                              Área: {mod.areaName}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={!isFullAdmin}
                            onClick={() => handleUpdatePermissionLevel(selectedRbacRole, mod.id, nextMap[level])}
                            title={isFullAdmin ? "Clic para alternar nivel de permiso" : "Solo Administrador TI puede cambiar permisos"}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all shrink-0 cursor-pointer disabled:cursor-default ${
                              level === 'admin'
                                ? 'bg-purple-100 text-purple-900'
                                : level === 'write'
                                ? 'bg-emerald-100 text-emerald-900'
                                : level === 'read'
                                ? 'bg-sky-100 text-sky-900'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {level === 'admin'
                              ? 'Control Total'
                              : level === 'write'
                              ? 'Lectura / Edición'
                              : level === 'read'
                              ? 'Solo Consulta'
                              : 'Bloqueado'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Matriz Técnica Completa (ISO 27001) Desplegable Opcional */}
            {showRawMatrixTable && (
              <div className="pt-4 border-t border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                    Matriz Cruzada Consolidada (Auditoría ISO 27001)
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Vista de verificación para auditores de sistemas
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-2.5 px-3 font-bold text-gray-700 min-w-[180px]">Módulo Corporativo</th>
                        <th className="py-2.5 px-3 font-bold text-gray-700">Área</th>
                        {ROLE_OPTIONS.slice(0, 9).map((r) => (
                          <th key={r.role} className="py-2.5 px-2 text-center font-bold text-gray-700 min-w-[85px] text-[10px]">
                            {r.label.split(' ')[0]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {systemModules.map((mod) => (
                        <tr key={mod.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2 px-3 font-bold text-gray-900">{mod.label}</td>
                          <td className="py-2 px-3 text-[11px] text-gray-500">{mod.areaName}</td>
                          {ROLE_OPTIONS.slice(0, 9).map((r) => {
                            const level = getEffectiveModulePermission(r.role, mod.id);
                            return (
                              <td key={r.role} className="py-2 px-2 text-center">
                                <span
                                  className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                    level === 'admin'
                                      ? 'bg-purple-100 text-purple-900'
                                      : level === 'write'
                                      ? 'bg-emerald-100 text-emerald-900'
                                      : level === 'read'
                                      ? 'bg-sky-100 text-sky-900'
                                      : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  {level === 'none' ? '-' : level.toUpperCase()}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PESTAÑA 3: HISTORIAL DE AUDITORÍA (AUDIT LOG)             */}
      {/* ========================================================= */}
      {activeTab === 'auditoria' && isFullAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-[#00668F]" size={16} />
                Registro Inmutable de Eventos de Seguridad & Acceso (Audit Log)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Trazabilidad oficial exigida por estándares ISO 27001 y Ley de Protección de Datos Personales.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder="Filtrar eventos..."
                className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
              />

              <select
                value={auditFilterAction}
                onChange={(e) => setAuditFilterAction(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs text-gray-700 focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="all">Todas las acciones</option>
                <option value="user_created">Usuario Creado</option>
                <option value="user_updated">Usuario Modificado</option>
                <option value="role_changed">Cambio de Rol</option>
                <option value="password_reset">Reset Contraseña</option>
                <option value="account_deactivated">Desactivación</option>
                <option value="account_reactivated">Reactivación</option>
                <option value="permission_changed">Permiso Cambiado</option>
              </select>

              <button
                type="button"
                onClick={refreshAuditLogs}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-gray-600 rounded-xl cursor-pointer"
                title="Refrescar logs"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Fecha & Hora</th>
                  <th className="py-2.5 px-3">Acción</th>
                  <th className="py-2.5 px-3">Ejecutado Por</th>
                  <th className="py-2.5 px-3">Usuario Objetivo</th>
                  <th className="py-2.5 px-3">Detalle del Evento</th>
                  <th className="py-2.5 px-3">Valores</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No hay registros de auditoría que coincidan con los filtros.
                    </td>
                  </tr>
                ) : (
                  filteredAuditLogs.map((log) => {
                    const dateObj = new Date(log.timestamp);
                    const formattedDate = dateObj.toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-gray-700 whitespace-nowrap">
                          {formattedDate}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              log.action === 'user_created'
                                ? 'bg-emerald-100 text-emerald-900'
                                : log.action === 'password_reset'
                                ? 'bg-amber-100 text-amber-900'
                                : log.action === 'role_changed'
                                ? 'bg-purple-100 text-purple-900'
                                : log.action === 'account_deactivated'
                                ? 'bg-rose-100 text-rose-900'
                                : log.action === 'account_reactivated'
                                ? 'bg-emerald-100 text-emerald-900'
                                : log.action === 'permission_changed'
                                ? 'bg-indigo-100 text-indigo-900'
                                : 'bg-sky-100 text-sky-900'
                            }`}
                          >
                            {log.action.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-800">
                          {log.performedByName}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-gray-900">
                          {log.targetUserName}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="py-2.5 px-3 text-[11px]">
                          {log.previousValue && (
                            <span className="line-through text-gray-400 mr-1.5">{log.previousValue}</span>
                          )}
                          {log.newValue && (
                            <span className="font-bold text-emerald-700">{log.newValue}</span>
                          )}
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

      {/* ========================================================= */}
      {/* MODAL 1: WIZARD DE CREACIÓN Y APROVISIONAMIENTO (4 PASOS)  */}
      {/* ========================================================= */}
      {isCreatingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            {/* Header del Wizard */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-sky-50 text-[#00668F] flex items-center justify-center font-bold">
                  <UserPlus size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Aprovisionamiento Oficial de Nuevo Colaborador
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Paso {createStep} de 4 • Gobernanza de Identidad & Talento ITK
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingUser(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Stepper visual */}
            <div className="grid grid-cols-4 gap-2 pb-2">
              {[
                { num: 1, label: 'Identidad' },
                { num: 2, label: 'Cargo ITK' },
                { num: 3, label: 'HSEQ Campo' },
                { num: 4, label: 'Credenciales' },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    createStep === s.num
                      ? 'border-[#00668F] bg-sky-50/60 font-bold text-[#00668F]'
                      : createStep > s.num
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-gray-400'
                  }`}
                >
                  <span className="text-[10px] block uppercase tracking-wider">
                    {createStep > s.num ? '✓' : `Paso ${s.num}`}
                  </span>
                  <span className="text-xs truncate block">{s.label}</span>
                </div>
              ))}
            </div>

            {/* CONTENIDO DEL PASO 1: DATOS DE IDENTIDAD */}
            {createStep === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo:</label>
                    <input
                      type="text"
                      required
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      placeholder="ej. Mateo Velásquez Restrepo"
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Cédula / Documento:</label>
                    <input
                      type="text"
                      required
                      value={newUserData.nationalId}
                      onChange={(e) => setNewUserData({ ...newUserData, nationalId: e.target.value })}
                      placeholder="ej. 1037654321"
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Correo Corporativo:</label>
                    <input
                      type="email"
                      required
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      placeholder="nombre.apellido@inteckno.com"
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono / WhatsApp:</label>
                    <input
                      type="tel"
                      value={newUserData.phone}
                      onChange={(e) => setNewUserData({ ...newUserData, phone: e.target.value })}
                      placeholder="+57 300 123 4567"
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fotografía de Perfil (Opcional):</label>
                  <div className="flex items-center gap-3">
                    {newUserData.photoUrl ? (
                      <img
                        src={newUserData.photoUrl}
                        alt="Preview"
                        className="w-12 h-12 rounded-full object-cover shrink-0 aspect-square border border-slate-200"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-gray-400 flex items-center justify-center shrink-0 aspect-square">
                        <Camera size={18} />
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={wizardPhotoInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              setNewUserData({ ...newUserData, photoUrl: ev.target?.result as string });
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => wizardPhotoInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-gray-700 rounded-xl cursor-pointer"
                      >
                        Subir Foto
                      </button>
                      {newUserData.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setNewUserData({ ...newUserData, photoUrl: '' })}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CONTENIDO DEL PASO 2: ASIGNACIÓN DE CARGO Y DEPARTAMENTO */}
            {createStep === 2 && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Vincular con Ficha de Cargo Oficial (Módulo de Cargos):
                  </label>
                  <select
                    value={newUserData.jobPositionId}
                    onChange={(e) => handleSelectJobPositionInWizard(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-[#00668F] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 cursor-pointer"
                  >
                    <option value="">-- Seleccionar Ficha Oficial de Cargo --</option>
                    {officialPositions.map((job) => (
                      <option key={job.id} value={job.id}>
                        {job.code} - {job.title} ({job.department})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Resumen de la Ficha Seleccionada */}
                {newUserData.jobPositionId && (
                  <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-1.5 text-xs text-sky-950">
                    <div className="font-bold flex items-center justify-between">
                      <span>Ficha Vinculada Exitosamente</span>
                      <span className="font-mono text-[10px] px-2 py-0.5 bg-white text-[#00668F] rounded">
                        {officialPositions.find((j) => j.id === newUserData.jobPositionId)?.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 line-clamp-2">
                      {officialPositions.find((j) => j.id === newUserData.jobPositionId)?.purpose}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Título del Rol / Cargo:</label>
                    <input
                      type="text"
                      required
                      value={newUserData.roleLabel}
                      onChange={(e) => setNewUserData({ ...newUserData, roleLabel: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Departamento:</label>
                    <input
                      type="text"
                      required
                      value={newUserData.department}
                      onChange={(e) => setNewUserData({ ...newUserData, department: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Perfil de Seguridad RBAC:</label>
                  <select
                    value={newUserData.role}
                    onChange={(e) => {
                      const opt = ROLE_OPTIONS.find((r) => r.role === e.target.value);
                      setNewUserData({
                        ...newUserData,
                        role: e.target.value as UserRole,
                        roleLabel: opt ? opt.label : newUserData.roleLabel,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none cursor-pointer"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.role} value={r.role}>
                        {r.label} ({r.defaultDept})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* CONTENIDO DEL PASO 3: HSEQ Y CONDICIONES DE CAMPO */}
            {createStep === 3 && (
              <div className="space-y-3">
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs space-y-1">
                  <div className="font-bold text-[#00668F] flex items-center gap-1.5">
                    <HardHat size={14} />
                    <span>Criterio SST: Trabajo en Alturas (Resolución 4272 de 2021)</span>
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Solo active esta casilla para personal técnico u operativo que asciende a pilonas, torres o estaciones (&gt; 1.50m). Si el empleado es de oficina, gerencia, administración o compras, déjela desactivada.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">¿Requiere Certificado de Trabajo en Alturas?</span>
                    <span className="text-[11px] text-gray-500 block">
                      {newUserData.canWorkHeights
                        ? 'Cargo operativo con labores en altura (> 1.50m).'
                        : 'Cargo de oficina / administrativo (No requiere certificado).'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newUserData.canWorkHeights}
                      onChange={(e) => setNewUserData({ ...newUserData, canWorkHeights: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00668F]" />
                  </label>
                </div>

                {newUserData.canWorkHeights ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                    <label className="block text-xs font-bold text-emerald-950">
                      Fecha Vencimiento Curso de Alturas (Resolución 4272):
                    </label>
                    <input
                      type="date"
                      value={newUserData.hseqExpiresAt}
                      onChange={(e) => setNewUserData({ ...newUserData, hseqExpiresAt: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs text-gray-900 border border-emerald-300 focus:outline-none"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span>Colaborador de Oficina: Marcado como <strong>"No requerido"</strong>. No se exigirán cursos de alturas.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Grupo Sanguíneo & RH:</label>
                    <select
                      value={newUserData.bloodType}
                      onChange={(e) => setNewUserData({ ...newUserData, bloodType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none cursor-pointer"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ciudad Base:</label>
                    <input
                      type="text"
                      value={newUserData.city}
                      onChange={(e) => setNewUserData({ ...newUserData, city: e.target.value })}
                      placeholder="Medellín / Bogotá / Cali"
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Contacto de Emergencia (Nombre):</label>
                    <input
                      type="text"
                      value={newUserData.emergencyContactName}
                      onChange={(e) => setNewUserData({ ...newUserData, emergencyContactName: e.target.value })}
                      placeholder="ej. María Eugenia Restrepo"
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono de Emergencia:</label>
                    <input
                      type="tel"
                      value={newUserData.emergencyContactPhone}
                      onChange={(e) => setNewUserData({ ...newUserData, emergencyContactPhone: e.target.value })}
                      placeholder="+57 311 987 6543"
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* CONTENIDO DEL PASO 4: CREDENCIALES Y PROVISIONING IA */}
            {createStep === 4 && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700">Contraseña Temporal Segura:</label>
                    <button
                      type="button"
                      onClick={handleGenerateRandomPass}
                      className="text-[11px] font-bold text-[#00668F] hover:underline cursor-pointer"
                    >
                      Autogenerar otra clave
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-white rounded-xl text-xs font-mono font-bold text-gray-900 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-800">
                    <input
                      type="checkbox"
                      checked={newUserData.forcePasswordChange}
                      onChange={(e) => setNewUserData({ ...newUserData, forcePasswordChange: e.target.checked })}
                      className="rounded text-[#00668F] focus:ring-[#00668F]"
                    />
                    <span>Forzar cambio de contraseña en el primer inicio de sesión (Recomendado ISO 27001)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-800">
                    <input
                      type="checkbox"
                      checked={newUserData.sendM365WelcomeEmail}
                      onChange={(e) => setNewUserData({ ...newUserData, sendM365WelcomeEmail: e.target.checked })}
                      className="rounded text-[#00668F] focus:ring-[#00668F]"
                    />
                    <span>Enviar correo oficial de bienvenida por Microsoft 365 / Outlook</span>
                  </label>
                </div>

                {/* Preview de Acciones de Provisioning de LUC-IA-NA */}
                <div className="p-3.5 bg-sky-50 rounded-xl border border-sky-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-950">
                    <Sparkles size={14} className="text-[#00668F]" />
                    <span>Acciones de Onboarding Automatizadas por LUC-IA-NA:</span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc">
                    <li>
                      <strong>Ruta de Inducción Técnica:</strong>{' '}
                      {provisioningDraft?.inductionPath || 'Inducción Integral de Operaciones & STC'}
                    </li>
                    <li>
                      <strong>Actividad asignada 1:</strong> Completar lectura y firma de Política SST.
                    </li>
                    <li>
                      <strong>Actividad asignada 2:</strong> Entregar documentos de vinculación a HSEQ.
                    </li>
                    <li>
                      <strong>Trazabilidad:</strong> Registro en log de auditoría con fecha e IP de creación.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Botones de Navegación del Wizard */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {createStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCreateStep((prev) => (prev - 1) as any)}
                  className="px-3.5 py-2 text-xs font-bold text-gray-600 hover:bg-slate-100 rounded-xl cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  <span>Atrás</span>
                </button>
              ) : (
                <div />
              )}

              {createStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (createStep === 1 && (!newUserData.name || !newUserData.email)) {
                      notify('warning', 'Campos Obligatorios', 'Ingresa nombre y correo corporativo para continuar.');
                      return;
                    }
                    setCreateStep((prev) => (prev + 1) as any);
                  }}
                  className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>Siguiente</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isProvisioningAi}
                  onClick={handleConfirmProvisioning}
                  className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <CheckCircle2 size={14} />
                  <span>{isProvisioningAi ? 'Aprovisionando...' : 'Confirmar Alta Oficial'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: DIAGNÓSTICO DE SALUD DEL DIRECTORIO (LUC-IA-NA)   */}
      {/* ========================================================= */}
      {isHealthModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#00668F]" />
                <h3 className="text-sm font-bold text-gray-900">
                  Diagnóstico de Salud del Directorio con LUC-IA-NA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsHealthModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {isDiagnosingDirectory ? (
              <div className="py-12 text-center space-y-3">
                <Sparkles size={28} className="animate-spin text-[#00668F] mx-auto" />
                <p className="text-xs font-bold text-gray-700">
                  LUC-IA-NA está auditando las fichas, certificaciones HSEQ y cuentas de Azure AD...
                </p>
              </div>
            ) : healthReport ? (
              <div className="space-y-4">
                {/* Score y Resumen */}
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-white text-[#00668F] font-black text-xl flex items-center justify-center shadow-xs shrink-0 font-mono">
                    {healthReport.healthScore}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-sky-950">Índice Global de Salud TI / HSEQ</h4>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                      {healthReport.summary}
                    </p>
                  </div>
                </div>

                {/* Hallazgos y Severidad */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-800">Puntos de Atención Detectados:</h4>
                  {(!healthReport.issues || healthReport.issues.length === 0) ? (
                    <p className="text-xs text-emerald-700 font-semibold p-3 bg-emerald-50 rounded-xl">
                      ✓ No se detectaron anomalías ni riesgos de cumplimiento en el directorio.
                    </p>
                  ) : (
                    (healthReport.issues || []).map((iss, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          iss.severity === 'alta'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                            : iss.severity === 'media'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{iss.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              iss.severity === 'alta'
                                ? 'bg-rose-200 text-rose-900'
                                : iss.severity === 'media'
                                ? 'bg-amber-200 text-amber-900'
                                : 'bg-slate-200 text-slate-800'
                            }`}
                          >
                            Severidad {iss.severity}
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90">{iss.description}</p>
                        {iss.affectedUsers.length > 0 && (
                          <div className="text-[10px] font-mono pt-1">
                            Afectados: {iss.affectedUsers.join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Recomendaciones */}
                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-gray-800">Recomendaciones Administrativas:</h4>
                  <ul className="text-xs text-gray-600 space-y-1 list-disc pl-4">
                    {(healthReport.recommendations || []).map((rec, rIdx) => (
                      <li key={rIdx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsHealthModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-gray-700 rounded-xl cursor-pointer"
              >
                Cerrar Reporte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: ADVERTENCIA DE TAREAS ANTES DE DESACTIVAR CUENTA */}
      {/* ========================================================= */}
      {deactivationTargetUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-3 shadow-xl border border-rose-200">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm pb-2 border-b border-rose-100">
              <AlertTriangle size={18} />
              <span>Verificación de Impacto Operativo antes de la Baja</span>
            </div>

            <p className="text-xs text-gray-700 leading-relaxed">
              El colaborador <strong>{deactivationTargetUser.name}</strong> tiene compromisos activos que deben ser reasignados para evitar retrasos en obra o auditorías pendientes:
            </p>

            {pendingUserTasks && pendingUserTasks.length > 0 && (
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-xs space-y-1">
                <span className="font-bold text-rose-900 block">
                  Actividades Pendientes Asignadas ({pendingUserTasks.length}):
                </span>
                <ul className="text-[11px] text-rose-800 list-disc pl-4 space-y-0.5">
                  {(pendingUserTasks || []).slice(0, 4).map((t, idx) => (
                    <li key={idx}>{t.title}</li>
                  ))}
                  {pendingUserTasks.length > 4 && <li>...y {pendingUserTasks.length - 4} más.</li>}
                </ul>
              </div>
            )}

            {pendingUserProjects && pendingUserProjects.length > 0 && (
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs space-y-1">
                <span className="font-bold text-amber-900 block">
                  Proyectos con Asignación Activa ({pendingUserProjects.length}):
                </span>
                <ul className="text-[11px] text-amber-800 list-disc pl-4 space-y-0.5">
                  {(pendingUserProjects || []).slice(0, 3).map((p, idx) => (
                    <li key={idx}>{p.name} ({p.code})</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeactivationTargetUser(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-gray-600 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeStatusChange(deactivationTargetUser, 'desactivada')}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
              >
                Proceder con la Baja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: RESTABLECER CONTRASEÑA RÁPIDA                     */}
      {/* ========================================================= */}
      {selectedUserForPass && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleConfirmResetPass}
            className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-3 shadow-xl border border-slate-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <KeyRound size={16} className="text-[#00668F]" />
                Restablecer Contraseña
              </h3>
              <button
                type="button"
                onClick={() => setSelectedUserForPass(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Para <strong>{selectedUserForPass.name}</strong> ({selectedUserForPass.email})
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Nueva Contraseña Temporal:</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-700 pt-1">
              <input
                type="checkbox"
                checked={forcePassChangeCheck}
                onChange={(e) => setForcePassChangeCheck(e.target.checked)}
                className="rounded text-[#00668F] focus:ring-[#00668F]"
              />
              <span>Forzar cambio en próximo inicio de sesión</span>
            </label>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedUserForPass(null)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Actualizar Clave
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 5: EDICIÓN COMPLETA DE USUARIO                      */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEditUser}
            className="bg-white rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-[#00668F]" />
                <h3 className="text-sm font-bold text-gray-900">
                  Editar Ficha de Usuario: {editingUser.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Pestañas de edición */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              {[
                { key: 'personal', label: 'Personal & Contacto' },
                { key: 'cargo', label: 'Cargo & Depto' },
                { key: 'hseq', label: 'HSEQ & Alturas' },
                { key: 'seguridad', label: 'Seguridad TI' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setEditActiveTab(tab.key as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl cursor-pointer transition-all ${
                    editActiveTab === tab.key
                      ? 'bg-sky-50 text-[#00668F]'
                      : 'text-gray-500 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Pestaña Personal */}
            {editActiveTab === 'personal' && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo:</label>
                    <input
                      type="text"
                      required
                      value={editingUser.name}
                      onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Cédula / Documento:</label>
                    <input
                      type="text"
                      value={editingUser.nationalId || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, nationalId: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico:</label>
                    <input
                      type="email"
                      required
                      value={editingUser.email}
                      onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono:</label>
                    <input
                      type="tel"
                      value={editingUser.phone}
                      onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ciudad:</label>
                    <input
                      type="text"
                      value={editingUser.city || 'Medellín'}
                      onChange={(e) => setEditingUser({ ...editingUser, city: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Dirección:</label>
                    <input
                      type="text"
                      value={editingUser.address || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, address: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pestaña Cargo */}
            {editActiveTab === 'cargo' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ficha Oficial de Cargo:</label>
                  <select
                    value={editingUser.jobPositionId || editingUser.jobPosition?.id || ''}
                    onChange={(e) => {
                      const pos = officialPositions.find((p) => p.id === e.target.value);
                      setEditingUser({
                        ...editingUser,
                        jobPositionId: pos?.id,
                        jobPosition: pos,
                        roleLabel: pos?.title || editingUser.roleLabel,
                        department: pos?.department || editingUser.department,
                      });
                    }}
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-[#00668F] focus:bg-white focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Sin Ficha de Cargo Vinculada --</option>
                    {officialPositions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.code} - {pos.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Título del Cargo:</label>
                    <input
                      type="text"
                      required
                      value={editingUser.roleLabel}
                      onChange={(e) => setEditingUser({ ...editingUser, roleLabel: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Departamento:</label>
                    <input
                      type="text"
                      required
                      value={editingUser.department}
                      onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>

                {isFullAdmin && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Rol RBAC de Seguridad:</label>
                    <select
                      value={editingUser.role}
                      onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none cursor-pointer"
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.role} value={r.role}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Pestaña HSEQ */}
            {editActiveTab === 'hseq' && (
              <div className="space-y-3">
                {/* Nota explicativa de Resolución 4272 */}
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 text-xs space-y-1">
                  <div className="font-bold text-[#00668F] flex items-center gap-1.5">
                    <HardHat size={14} />
                    <span>Criterio HSEQ: ¿Quiénes requieren Certificado de Alturas?</span>
                  </div>
                  <p className="text-gray-600 text-[11px] leading-relaxed">
                    Conforme a la Resolución 4272 de 2021, solo el personal operativo de campo que asciende a estructuras, pilonas o estaciones motrices (&gt; 1.50m) debe tener curso de alturas vigente. El personal administrativo, de oficina o gerencial <strong>NO lo requiere</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">¿Requiere Certificación de Alturas por su Cargo?</span>
                    <span className="text-[11px] text-gray-500">
                      {editingUser.canWorkHeights
                        ? 'Cargo operativo con labores en altura (> 1.50m).'
                        : 'Cargo administrativo / oficina (No genera alertas de alturas).'}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingUser.canWorkHeights}
                    onChange={(e) => setEditingUser({ ...editingUser, canWorkHeights: e.target.checked })}
                    className="rounded text-[#00668F] focus:ring-[#00668F] w-4 h-4 cursor-pointer"
                  />
                </div>

                {editingUser.canWorkHeights ? (
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                    <label className="block text-xs font-bold text-emerald-950">
                      Fecha Vencimiento Curso de Alturas (Resolución 4272):
                    </label>
                    <input
                      type="date"
                      value={editingUser.hseqExpiresAt || '2027-12-31'}
                      onChange={(e) => setEditingUser({ ...editingUser, hseqExpiresAt: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs text-gray-900 border border-emerald-300 focus:outline-none"
                    />
                    <span className="text-[11px] text-emerald-800 font-medium block">
                      El ERP notificará a HSEQ 30 días antes del vencimiento para programar el reentrenamiento.
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
                    <Check size={14} className="text-emerald-600 shrink-0" />
                    <span>Personal de Oficina / Administrativo: Marcado como <strong>"No requerido"</strong>. No se exigirán certificados ni se generarán alertas de bloqueo.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Grupo Sanguíneo & RH:</label>
                    <select
                      value={editingUser.bloodType || 'O+'}
                      onChange={(e) => setEditingUser({ ...editingUser, bloodType: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none cursor-pointer"
                    >
                      {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                        <option key={bt} value={bt}>
                          {bt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Contacto de Emergencia:</label>
                    <input
                      type="text"
                      value={editingUser.emergencyContactName || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, emergencyContactName: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Tel. Emergencia:</label>
                    <input
                      type="tel"
                      value={editingUser.emergencyContactPhone || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, emergencyContactPhone: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pestaña Seguridad */}
            {editActiveTab === 'seguridad' && (
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Estado de la Cuenta:</label>
                  <select
                    value={editingUser.accountStatus || (editingUser.isActive ? 'activa' : 'desactivada')}
                    onChange={(e) =>
                      setEditingUser({
                        ...editingUser,
                        accountStatus: e.target.value as any,
                        isActive: e.target.value === 'activa',
                      })
                    }
                    className="w-full px-3 py-2 bg-white rounded-xl text-xs font-bold text-gray-900 border border-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="activa">Activa (Acceso Habilitado)</option>
                    <option value="suspendida">Suspendida Temporalmente</option>
                    <option value="desactivada">Desactivada (Baja Definitiva)</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-gray-700">Contraseña:</label>
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="text-[11px] font-bold text-[#00668F] hover:underline cursor-pointer"
                    >
                      {showEditPassword ? 'Ocultar' : 'Ver / Modificar'}
                    </button>
                  </div>
                  {showEditPassword && (
                    <input
                      type="text"
                      value={editingUser.password || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs font-mono font-bold text-gray-900 border border-slate-300 focus:outline-none"
                    />
                  )}
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-800">
                  <input
                    type="checkbox"
                    checked={editingUser.forcePasswordChange ?? true}
                    onChange={(e) => setEditingUser({ ...editingUser, forcePasswordChange: e.target.checked })}
                    className="rounded text-[#00668F] focus:ring-[#00668F]"
                  />
                  <span>Forzar cambio de clave en próximo login</span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-3.5 py-2 text-xs text-gray-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Informativo y de Acción: Tenant Microsoft 365 / Azure Entra ID */}
      {isM365TenantModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#00668F] flex items-center justify-center shrink-0">
                  <Cloud size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">
                    Conexión Corporativa Microsoft 365 & Azure AD
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Tenant Oficial: <code className="font-mono text-gray-800 font-bold">inteckno.com</code>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsM365TenantModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Aclaración: Solo se hace 1 sola vez por el Administrador */}
            <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs space-y-2">
              <div className="flex items-center gap-1.5 text-[#00668F] font-bold">
                <ShieldCheck size={16} className="shrink-0" />
                <span>¿Cómo funciona la integración con Azure?</span>
              </div>
              <p className="text-slate-700 leading-relaxed">
                ¡La conexión con Azure AD / Microsoft 365 se realiza <strong>UNA SOLA VEZ</strong> para toda la organización! No es necesario que cada empleado inicie sesión. Una vez que el Administrador de Microsoft otorga el consentimiento, el ERP sincroniza automáticamente a todos los colaboradores con correo corporativo <code className="font-mono font-bold">@inteckno.com</code>.
              </p>
            </div>

            {/* Explicación del mensaje "Se necesita la aprobación del administrador" */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0 text-amber-700" />
                <span>¿Por qué Microsoft pide "Se necesita la aprobación del administrador"?</span>
              </div>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Microsoft Entra ID restringe por seguridad que los usuarios individuales den permisos a aplicaciones corporativas. Requiere que una cuenta con rol de Administrador de Microsoft 365 haga clic en el botón de abajo para autorizar a Inteckno ERP en toda la empresa con 1 solo clic.
              </p>
            </div>

            {/* Parámetros de Tenant */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between items-center text-gray-600">
                <span className="font-semibold">Organización:</span>
                <span className="font-bold text-gray-900">Inteckno S.A.S.</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span className="font-semibold">Tenant Domain:</span>
                <span className="font-mono text-gray-900">inteckno.com</span>
              </div>
              <div className="flex justify-between items-center text-gray-600">
                <span className="font-semibold">Cuentas @inteckno.com:</span>
                <span className="font-bold text-[#00668F]">
                  {users.filter((u) => u.email.toLowerCase().endsWith('@inteckno.com')).length} colaboradores vinculados
                </span>
              </div>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await openAdminConsentPopup();
                  notify('success', 'Ventana de Aprobación Abierta', 'Si ya aprobaste en Microsoft, pulsa "Sincronizar Directorio".');
                }}
                className="flex-1 py-2.5 px-4 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
              >
                <ExternalLink size={13} />
                <span>Aprobar como Administrador (Admin Consent)</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  await handleSyncM365Directly();
                }}
                disabled={isSyncingM365}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <RefreshCw size={13} className={isSyncingM365 ? 'animate-spin' : ''} />
                <span>{isSyncingM365 ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración Universal */}
      <UniversalModuleConfigModal
        moduleId="usuarios-ti"
        moduleTitle="Gestión de Usuarios & TI"
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
      />
    </div>
  );
};

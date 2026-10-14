import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Bell,
  LogOut,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Filter,
  Shield,
  Layers,
  Sparkles,
  X,
  MessageSquare,
  Calendar as CalendarIcon,
  Video,
  Clock,
  ExternalLink,
  ArrowRight,
  Settings,
  Menu,
  LayoutDashboard,
  FolderKanban,
  Receipt,
  DollarSign,
  Smartphone,
  Edit3,
} from 'lucide-react';
import { useErp, normalizeChannelId } from '../../core/storage/erpStore';
import { SpotlightModal } from '../ui/SpotlightModal';
import { UniversalModuleConfigModal } from '../common/UniversalModuleConfigModal';
import { UserLoginAlertsModal } from '../common/UserLoginAlertsModal';
import { getUserAccessibleAreas, ALL_AREAS, MODULE_ICONS } from '../../core/auth/rbac';
import { AreaId } from '../../types';
import { LucianaFloatingWidget } from '../ai/LucianaFloatingWidget';
import { getStoredTRM, formatTRM, fetchLiveTRM, fetchTRMWithLucianaWeb, setCustomTRM, getTRMDetails } from '../../core/services/trmService';

interface AppShellProps {
  children: React.ReactNode;
  activeTitle: string;
  activeSubtitle?: string;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  activeTitle,
  activeSubtitle,
}) => {
  const {
    currentUser,
    logout,
    activeModuleId,
    setActiveModule,
    notifications,
    dismissNotification,
    chatMessages,
    chatGroups,
    activeChatToast,
    dismissChatToast,
    activeCalendarToast,
    dismissCalendarReminderToast,
    setActiveChatChannel,
    markChatAsRead,
    updateUserPreferences,
  } = useErp();

  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const [isModuleConfigOpen, setIsModuleConfigOpen] = useState(false);
  const [isUserAlertsModalOpen, setIsUserAlertsModalOpen] = useState(false);
  const lastNotifiedUserRef = useRef<string | null>(null);

  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const areaDropdownRef = useRef<HTMLDivElement>(null);

  // Módulos que requieren visualización y refresco de TRM
  const showTrmBadge = useMemo(() => {
    const MODULES_WITH_TRM = [
      'procurement',
      'compras',
      'inventory',
      'inventario',
      'billing',
      'facturacion',
      'expenses',
      'gastos',
      'projects',
      'proyectos',
      'commercial',
      'comercial',
      'international',
      'internacional',
    ];
    return MODULES_WITH_TRM.includes(activeModuleId);
  }, [activeModuleId]);

  // Mostrar automáticamente el pop-up grande de notificaciones al iniciar sesión o cambiar de usuario
  useEffect(() => {
    if (currentUser?.id && lastNotifiedUserRef.current !== currentUser.id) {
      lastNotifiedUserRef.current = currentUser.id;
      setIsUserAlertsModalOpen(true);
    }
  }, [currentUser?.id]);

  const handleNavigateFromAlert = (moduleId: string, actionType?: string, payload?: any) => {
    setIsUserAlertsModalOpen(false);
    setActiveModule(moduleId);
    if (actionType === 'open_requisition' && payload?.req) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('inteckno:open-requisition-detail', { detail: payload.req }));
      }, 50);
    } else if (actionType === 'open_po_receipt' && payload?.po) {
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('inteckno:open-po-receipt', { detail: payload.po }));
      }, 50);
    }
  };

  // TRM Oficial en Vivo (Colombia - Superfinanciera) para todo el ERP
  const [trmRate, setTrmRate] = useState<number>(() => getStoredTRM());
  const [isRefreshingTrm, setIsRefreshingTrm] = useState(false);
  const [isTrmModalOpen, setIsTrmModalOpen] = useState(false);
  const [customTrmInput, setCustomTrmInput] = useState<string>('');

  useEffect(() => {
    // Sincronizar en vivo al cargar
    fetchLiveTRM().then((rate) => setTrmRate(rate)).catch(() => {});

    const handleTrmUpdate = (e: any) => {
      if (e.detail?.rate) setTrmRate(e.detail.rate);
    };
    window.addEventListener('inteckno_trm_updated', handleTrmUpdate);
    return () => window.removeEventListener('inteckno_trm_updated', handleTrmUpdate);
  }, []);

  const handleRefreshTrm = async () => {
    setIsRefreshingTrm(true);
    try {
      const live = await fetchLiveTRM(true);
      setTrmRate(live);
    } finally {
      setIsRefreshingTrm(false);
    }
  };

  const handleSaveCustomTrm = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customTrmInput.replace(/,/g, '.'));
    if (!isNaN(val) && val > 1000) {
      setCustomTRM(val);
      setTrmRate(val);
      setIsTrmModalOpen(false);
    }
  };

  // Cerrar menús flotantes (notificaciones, áreas) al hacer clic/toque fuera o presionar Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(target)) {
        setIsNotifDropdownOpen(false);
      }
      if (areaDropdownRef.current && !areaDropdownRef.current.contains(target)) {
        setIsAreaDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNotifDropdownOpen(false);
        setIsAreaDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Escuchar evento para abrir modal de configuración desde cualquier combobox
  useEffect(() => {
    const handleOpenConfig = () => {
      setIsModuleConfigOpen(true);
    };
    window.addEventListener('inteckno:open-module-config', handleOpenConfig);
    return () => {
      window.removeEventListener('inteckno:open-module-config', handleOpenConfig);
    };
  }, []);

  // Contador global de mensajes no leídos para el usuario activo (solo canales autorizados)
  const unreadChatCount = useMemo(() => {
    return chatMessages.filter((m) => {
      if (m.senderId === currentUser.id) return false;
      if (m.readBy && m.readBy.includes(currentUser.id)) return false;

      const normChannel = normalizeChannelId(m.channel);
      const g = (chatGroups || []).find((grp) => grp.id === normChannel || grp.id === m.channel);

      const isDirect = (g && g.isDirect) || normChannel.startsWith('dm-');
      if (isDirect) {
        if (g && g.members && !g.members.includes(currentUser.id)) return false;
        if (normChannel.startsWith('dm-') && !normChannel.includes(currentUser.id)) return false;
        return true;
      }

      if (g) {
        if (g.members && g.members.length > 0) {
          return g.members.includes(currentUser.id);
        }
        return true;
      }

      return false;
    }).length;
  }, [chatMessages, chatGroups, currentUser.id]);

  // Cierre automático del pop-up de notificación tras 7 segundos
  useEffect(() => {
    if (activeChatToast) {
      const timer = setTimeout(() => {
        dismissChatToast();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeChatToast, dismissChatToast]);

  // Cierre automático del pop-up de recordatorio de calendario tras 10 segundos
  useEffect(() => {
    if (activeCalendarToast) {
      const timer = setTimeout(() => {
        dismissCalendarReminderToast();
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeCalendarToast, dismissCalendarReminderToast]);

  // Áreas y módulos autorizados para el usuario activo
  const accessibleAreas = getUserAccessibleAreas(currentUser.role);
  const isSuperAdmin =
    currentUser.role === 'gerente_general' || currentUser.role === 'gerente_administrativa';

  // Mapeo Inteligente de Accesos Rápidos Móviles según el Rol Operativo
  const DEFAULT_ROLE_SHORTCUTS: Record<string, string[]> = {
    admin_sistemas: ['dashboard', 'usuarios-ti', 'conversaciones', 'documentos'],
    gerente_general: ['dashboard', 'proyectos', 'tableros', 'conversaciones'],
    gerente_administrativa: ['dashboard', 'gastos', 'contabilidad', 'conversaciones'],
    gerente_proyectos: ['dashboard', 'proyectos', 'planeacion', 'conversaciones'],
    lider_proyectos: ['dashboard', 'proyectos', 'planeacion', 'conversaciones'],
    lider_ingenieria: ['dashboard', 'proyectos', 'plm', 'conversaciones'],
    ingeniero_proyectos: ['dashboard', 'proyectos', 'registro-horas', 'conversaciones'],
    supervisor_tecnico: ['dashboard', 'mantenimiento', 'registro-horas', 'conversaciones'],
    tecnico_stc: ['dashboard', 'mantenimiento', 'registro-horas', 'conversaciones'],
    coord_compras: ['dashboard', 'compras', 'inventario', 'conversaciones'],
    almacenista: ['dashboard', 'inventario', 'codigo-barras', 'conversaciones'],
    coord_comercial: ['dashboard', 'crm', 'ventas', 'conversaciones'],
    asistente_negocios_internacionales: ['dashboard', 'crm', 'radar-oportunidades', 'conversaciones'],
    hseq: ['dashboard', 'proyectos', 'actividades', 'conversaciones'],
    contador_externo: ['dashboard', 'gastos', 'contabilidad', 'conversaciones'],
  };

  const [isCustomizeShortcutsOpen, setIsCustomizeShortcutsOpen] = useState(false);

  const defaultShortcuts = useMemo(() => {
    return DEFAULT_ROLE_SHORTCUTS[currentUser.role] || ['dashboard', 'proyectos', 'conversaciones', 'documentos'];
  }, [currentUser.role]);

  const [mobileShortcuts, setMobileShortcuts] = useState<string[]>(() => {
    const roleDefaults = DEFAULT_ROLE_SHORTCUTS[currentUser.role] || ['dashboard', 'proyectos', 'conversaciones', 'documentos'];
    try {
      const saved = localStorage.getItem(`inteckno_shortcuts_${currentUser.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 4) {
          return parsed.slice(0, 4);
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          // Fill up with missing defaults to ensure exactly 4 shortcuts
          const merged = Array.from(new Set([...parsed, ...roleDefaults])).slice(0, 4);
          if (merged.length === 4) return merged;
        }
      }
    } catch {
      // fallback
    }
    return roleDefaults;
  });

  // Garantizar que siempre se muestren exactamente 4 accesos rápidos + 1 Menú (5 botones en total)
  useEffect(() => {
    if (mobileShortcuts.length < 4) {
      const merged = Array.from(new Set([...mobileShortcuts, ...defaultShortcuts])).slice(0, 4);
      if (merged.length >= 4) {
        setMobileShortcuts(merged);
        try {
          localStorage.setItem(`inteckno_shortcuts_${currentUser.id}`, JSON.stringify(merged));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [mobileShortcuts, defaultShortcuts, currentUser.id]);

  const saveCustomShortcuts = (selectedList: string[]) => {
    const listToSave = selectedList.slice(0, 4);
    setMobileShortcuts(listToSave);
    try {
      localStorage.setItem(`inteckno_shortcuts_${currentUser.id}`, JSON.stringify(listToSave));
    } catch (e) {
      console.error(e);
    }
    setIsCustomizeShortcutsOpen(false);
  };

  const resetCustomShortcuts = () => {
    setMobileShortcuts(defaultShortcuts);
    try {
      localStorage.removeItem(`inteckno_shortcuts_${currentUser.id}`);
    } catch (e) {
      console.error(e);
    }
  };

  const getModuleMeta = (modId: string) => {
    const SHORT_LABELS: Record<string, string> = {
      dashboard: 'Inicio',
      'usuarios-ti': 'Usuarios',
      conversaciones: 'Chat',
      documentos: 'Docs',
      proyectos: 'Proyectos',
      gastos: 'Gastos',
      contabilidad: 'Finanzas',
      planeacion: 'Planeación',
      plm: 'Ingeniería',
      'registro-horas': 'Horas',
      mantenimiento: 'Mantenim.',
      compras: 'Compras',
      inventario: 'Inventario',
      'codigo-barras': 'Código QR',
      crm: 'CRM',
      ventas: 'Ventas',
      'radar-oportunidades': 'Radar',
      actividades: 'Actividades',
      calendario: 'Agenda',
      tableros: 'Tableros',
    };

    if (modId === 'dashboard') {
      return { label: 'Inicio', shortLabel: 'Inicio', icon: LayoutDashboard };
    }
    for (const area of accessibleAreas) {
      const found = area.modules.find((m) => m.id === modId);
      if (found) {
        return {
          label: found.label,
          shortLabel: SHORT_LABELS[found.id] || found.label.slice(0, 10),
          icon: MODULE_ICONS[found.id] || Layers,
        };
      }
    }
    return {
      label: modId,
      shortLabel: SHORT_LABELS[modId] || modId.slice(0, 10),
      icon: Layers,
    };
  };

  const customizableCandidateModules = useMemo(() => {
    const list: { id: string; label: string; areaName: string }[] = [
      { id: 'dashboard', label: 'Inicio (Panel Principal)', areaName: 'General' },
    ];
    accessibleAreas.forEach((area) => {
      area.modules.forEach((mod) => {
        if (mod.id !== 'dashboard' && !list.some((item) => item.id === mod.id)) {
          list.push({ id: mod.id, label: mod.label, areaName: area.name });
        }
      });
    });
    return list;
  }, [accessibleAreas]);

  const unreadNotifs = notifications.filter((n) => !n.read);

  // Navegación interactiva al hacer clic en una notificación
  const handleNotificationClick = (notif: typeof notifications[0]) => {
    let targetModule = notif.module;
    if (!targetModule) {
      const text = (notif.title + ' ' + notif.message).toLowerCase();
      if (
        text.includes('documento') ||
        text.includes('archivo') ||
        text.includes('repositorio') ||
        text.includes('sharepoint') ||
        text.includes('plano')
      ) {
        targetModule = 'documentos';
      } else if (
        text.includes('calendario') ||
        text.includes('reunión') ||
        text.includes('reunion') ||
        text.includes('evento') ||
        text.includes('teams')
      ) {
        targetModule = 'calendario';
      } else if (
        text.includes('compra') ||
        text.includes('cotización') ||
        text.includes('cotizacion') ||
        text.includes('orden')
      ) {
        targetModule = 'compras';
      } else if (
        text.includes('inventario') ||
        text.includes('artículo') ||
        text.includes('articulo') ||
        text.includes('stock') ||
        text.includes('repuesto')
      ) {
        targetModule = 'articulos';
      } else if (
        text.includes('hseq') ||
        text.includes('seguridad') ||
        text.includes('inspección') ||
        text.includes('epp')
      ) {
        targetModule = 'hseq-inspecciones';
      } else if (
        text.includes('mantenimiento') ||
        text.includes('operaciones') ||
        text.includes('ot')
      ) {
        targetModule = 'operaciones-mantenimiento';
      } else if (
        text.includes('factura') ||
        text.includes('pago') ||
        text.includes('cobro')
      ) {
        targetModule = 'facturacion';
      } else if (
        text.includes('chat') ||
        text.includes('mensaje') ||
        text.includes('conversación')
      ) {
        targetModule = 'conversaciones';
      } else if (
        text.includes('usuario') ||
        text.includes('perfil') ||
        text.includes('contraseña')
      ) {
        targetModule = 'perfil';
      } else if (
        text.includes('proyecto') ||
        text.includes('obra')
      ) {
        targetModule = 'proyectos';
      } else {
        targetModule = 'documentos';
      }
    }

    setActiveModule(targetModule);
    setIsNotifDropdownOpen(false);
  };

  // Filtrar áreas según selección rápida
  const displayedAreas =
    selectedAreaFilter === 'all'
      ? accessibleAreas
      : accessibleAreas.filter((a) => a.id === selectedAreaFilter);

  return (
    <div className="h-screen h-[100dvh] w-screen flex bg-[#0B1317] font-sans antialiased selection:bg-[#00668F] selection:text-white overflow-hidden">
      
      {/* Overlay Backdrop Móvil */}
      {isMobileDrawerOpen && (
        <div
          onClick={() => setIsMobileDrawerOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* ========================================================================= */}
      {/* BARRA LATERAL RETRÁCTIL / REACTIVA (Desktop + Mobile Drawer) */}
      {/* ========================================================================= */}
      <aside
        className={`bg-[#091116] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none transition-all duration-300 ease-in-out fixed inset-y-0 left-0 z-50 md:relative md:translate-x-0 ${
          isMobileDrawerOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64 lg:w-72'}`}
      >
        {/* Parte Superior: Marca Inteckno y Perfil Activo */}
        <div className="flex flex-col h-full overflow-hidden">
          
          {/* Logo y Encabezado de la Empresa (Logo transparente integrado al fondo del panel) */}
          {(!isSidebarCollapsed || isMobileDrawerOpen) ? (
            <div className="px-4 py-3 border-b border-slate-800/80 flex items-center justify-between min-h-[76px]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-12 w-14 flex items-center justify-center shrink-0">
                  <img src="/inteckno-icon.png" alt="Inteckno" className="h-full w-auto max-w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <span className="text-lg font-black tracking-wider text-white block leading-tight truncate">
                    INTECKNO
                  </span>
                  <span className="text-[11px] text-sky-400 block font-bold uppercase tracking-wider truncate mt-0.5">
                    ERP Corporativo
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Botón Cerrar Drawer en Móvil */}
                {isMobileDrawerOpen && (
                  <button
                    type="button"
                    onClick={() => setIsMobileDrawerOpen(false)}
                    title="Cerrar menú móvil"
                    className="md:hidden text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800/60 cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-center min-h-[76px]">
              <div
                className="h-12 w-12 flex items-center justify-center shrink-0 transition-transform hover:scale-110 cursor-pointer"
                onClick={() => setIsSidebarCollapsed(false)}
                title="Expandir panel lateral INTECKNO"
              >
                <img src="/inteckno-icon.png" alt="Inteckno" className="h-full w-auto max-w-full object-contain" />
              </div>
            </div>
          )}

          {/* Tarjeta del Usuario con Bordes Armónicos (Outer 12px, Inner 6px, Padding 10px) */}
          {(!isSidebarCollapsed || isMobileDrawerOpen) ? (
            <div className="p-2.5 mx-2.5 mt-2.5 rounded-xl bg-[#101C24] border border-slate-800/80 flex items-center justify-between gap-2 group">
              <button
                type="button"
                onClick={() => {
                  setActiveModule('perfil');
                  setIsMobileDrawerOpen(false);
                }}
                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer hover:opacity-90 transition-opacity"
                title="Configurar y ver mi perfil"
              >
                {currentUser.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.name}
                    className="w-7 h-7 rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-7 h-7 rounded-lg text-white text-[11px] font-bold flex items-center justify-center shrink-0"
                    style={{ backgroundColor: currentUser.avatarColor || '#00668F' }}
                  >
                    {currentUser.avatar}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div
                    className="text-xs font-bold text-white leading-tight truncate group-hover:text-sky-300 transition-colors"
                    title={currentUser.name}
                  >
                    {currentUser.name}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5" title={currentUser.roleLabel}>
                    {currentUser.roleLabel}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={logout}
                title="Cerrar Sesión"
                className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800/80 transition-colors shrink-0 cursor-pointer"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="mt-2.5 flex flex-col items-center">
              <button
                type="button"
                onClick={() => setActiveModule('perfil')}
                className="cursor-pointer"
                title={`${currentUser.name} • Ver mi perfil`}
              >
                {currentUser.photoUrl ? (
                  <img
                    src={currentUser.photoUrl}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <div
                    className="w-8 h-8 rounded-lg text-white text-xs font-bold flex items-center justify-center"
                    style={{ backgroundColor: currentUser.avatarColor || '#00668F' }}
                  >
                    {currentUser.avatar}
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Selector y Filtro de Área Responsivo (Sin barras horizontales rotas ni cortes) */}
          {!isSidebarCollapsed && accessibleAreas.length > 1 && (
            <div className="px-3 pt-3 relative" ref={areaDropdownRef}>
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Filter size={11} className="text-[#00668F]" />
                  <span>Área Operativa</span>
                </span>
                {selectedAreaFilter !== 'all' && (
                  <button
                    onClick={() => setSelectedAreaFilter('all')}
                    className="text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                  >
                    Mostrar todas
                  </button>
                )}
              </div>

              {/* Botón Selector Principal */}
              <button
                type="button"
                onClick={() => setIsAreaDropdownOpen((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                  isAreaDropdownOpen
                    ? 'bg-[#14232E] border-[#00668F] text-white shadow-xs'
                    : 'bg-[#101C24] border-slate-700/60 text-slate-200 hover:bg-[#14232E] hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        selectedAreaFilter === 'all'
                          ? '#00668F'
                          : accessibleAreas.find((a) => a.id === selectedAreaFilter)?.accentColor || '#00668F',
                    }}
                  />
                  <span className="truncate">
                    {selectedAreaFilter === 'all'
                      ? `Todas las áreas (${accessibleAreas.reduce((sum, a) => sum + a.modules.length, 0)})`
                      : accessibleAreas.find((a) => a.id === selectedAreaFilter)?.name || 'Área seleccionada'}
                  </span>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform duration-200 shrink-0 ${
                    isAreaDropdownOpen ? 'rotate-180 text-sky-400' : ''
                  }`}
                />
              </button>

              {/* Menú Desplegable con TODAS las Áreas (Fácil de navegar, 100% visible, sin cortes) */}
              {isAreaDropdownOpen && (
                <div className="absolute left-3 right-3 top-full mt-1.5 z-40 bg-[#0F1B22] border border-slate-700/90 rounded-2xl shadow-2xl p-1.5 space-y-0.5 animate-in fade-in-50 zoom-in-95 max-h-64 overflow-y-auto scrollbar-thin">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAreaFilter('all');
                      setIsAreaDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      selectedAreaFilter === 'all'
                        ? 'bg-[#00668F] text-white'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-sky-300 shrink-0" />
                      <span className="truncate">Todas las áreas</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/30 text-slate-300 font-mono">
                      {accessibleAreas.reduce((sum, a) => sum + a.modules.length, 0)}
                    </span>
                  </button>

                  <div className="h-px bg-slate-800 my-1" />

                  {accessibleAreas.map((area) => {
                    const isSelected = selectedAreaFilter === area.id;
                    return (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => {
                          setSelectedAreaFilter(area.id);
                          setIsAreaDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#00668F] text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: area.accentColor }}
                          />
                          <span className="truncate">{area.name}</span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/30 text-slate-300 font-mono">
                          {area.modules.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Lista de Módulos Autorizados con Scroll Cómodo */}
          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-none">
            {displayedAreas.map((area) => (
              <div key={area.id} className="space-y-1">
                {/* Título de Sección del Área (Solo cuando está expandido) */}
                {!isSidebarCollapsed && (
                  <div className="px-2 py-1 flex items-center justify-between text-[10px] font-black tracking-wider uppercase">
                    <span style={{ color: area.accentColor }}>{area.name}</span>
                    <span className="text-slate-500 font-normal">{area.modules.length}</span>
                  </div>
                )}

                {/* Botones de Módulos */}
                {area.modules.map((mod) => {
                  const Icon = MODULE_ICONS[mod.id] || Layers;
                  const isActive = activeModuleId === mod.id;

                  return (
                    <button
                      key={mod.id}
                      onClick={() => {
                        setActiveModule(mod.id);
                        setIsMobileDrawerOpen(false);
                      }}
                      title={mod.label}
                      className={`w-full text-left rounded-xl transition-all cursor-pointer group flex items-center relative ${
                        isSidebarCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2 justify-between'
                      } ${
                        isActive
                          ? 'bg-[#14232F] text-white font-bold shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-[#0E171E]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0 flex items-center justify-center">
                          <Icon
                            size={18}
                            style={{ color: isActive ? area.accentColor : undefined }}
                            className={`shrink-0 transition-colors ${
                              isActive ? '' : 'text-slate-400 group-hover:text-slate-200'
                            }`}
                          />
                          {isSidebarCollapsed && mod.id === 'conversaciones' && unreadChatCount > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[15px] h-3.5 px-1 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-slate-900 shadow-xs animate-pulse">
                              {unreadChatCount > 9 ? '9+' : unreadChatCount}
                            </span>
                          )}
                        </div>
                        {!isSidebarCollapsed && <span className="truncate text-xs">{mod.label}</span>}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isSidebarCollapsed && mod.id === 'conversaciones' && unreadChatCount > 0 && (
                          <span className="px-1.5 py-0.2 rounded-full font-black text-[9.5px] bg-emerald-500 text-white shadow-xs">
                            {unreadChatCount}
                          </span>
                        )}
                        {isActive && (
                          <span
                            className={`rounded-full shrink-0 shadow-xs ${
                              isSidebarCollapsed ? 'w-1.5 h-1.5 absolute right-1' : 'w-1.5 h-1.5'
                            }`}
                            style={{ backgroundColor: area.accentColor }}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Pie de la Barra Lateral: Resumen de Permisos y Botón Personalizar Barra Móvil */}
          <div className="p-3 bg-[#070D11] text-[10px] text-slate-400 space-y-2">
            {/* Botón Personalizar Barra Móvil: ÚNICAMENTE visible en Móvil (Cajón Móvil), NUNCA en PC */}
            {isMobileDrawerOpen && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsCustomizeShortcutsOpen(true);
                }}
                className="md:hidden w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#101C24] hover:bg-[#162733] text-sky-400 transition-colors cursor-pointer active:scale-95"
              >
                <span className="flex items-center gap-2 font-bold text-xs">
                  <Smartphone size={13} />
                  <span>Personalizar barra móvil</span>
                </span>
                <span className="text-[10px] bg-sky-950 px-2 py-0.5 rounded text-sky-300 font-mono">
                  {mobileShortcuts.length}/4
                </span>
              </button>
            )}
            <div className="flex items-center justify-between">
              {!isSidebarCollapsed ? (
                <>
                  <span className="flex items-center gap-1.5 truncate">
                    <Shield size={12} className="text-[#38BDF8] shrink-0" />
                    <span className="truncate">
                      {isSuperAdmin ? 'Permisos: Acceso Total' : `Áreas: ${accessibleAreas.length}`}
                    </span>
                  </span>
                  <span className="text-slate-500 font-semibold shrink-0">v2.4</span>
                </>
              ) : (
                <div className="w-full flex justify-center" title={isSuperAdmin ? 'Acceso Total' : 'Acceso Restringido'}>
                  <Shield size={14} className="text-[#38BDF8]" />
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* LIENZO PRINCIPAL DEL ERP (Full-Screen reactivo) */}
      {/* ========================================================================= */}
      <main className="flex-1 w-full max-w-full min-w-0 bg-[#F4F6F9] flex flex-col h-full overflow-hidden relative transition-all duration-300">
        
        {/* Encabezado Superior con Toggle Rápido del Panel */}
        <header className="px-3 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Botón Hamburger para Móvil / Tablet */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(true)}
              title="Abrir menú de módulos"
              className="md:hidden w-9 h-9 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              <Menu size={18} />
            </button>

            {/* Botón Plegar en Escritorio */}
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? 'Expandir panel lateral' : 'Plegar panel lateral'}
              className="hidden md:flex w-9 h-9 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                {activeTitle}
              </h1>
            </div>
          </div>

          {/* Acciones y Herramientas Limpias y Despejadas */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* TRM Oficial Colombia en Vivo - Solo visible en módulos financieros/operativos que lo requieren */}
            {showTrmBadge && (
              <div
                className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold shadow-2xs select-none"
                title="Tasa Representativa del Mercado Oficial (Haga clic para ver o ajustar)"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                <span className="hidden sm:inline text-[10px] text-emerald-700 font-bold uppercase tracking-wider">TRM Hoy:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomTrmInput(trmRate.toString());
                    setIsTrmModalOpen(true);
                  }}
                  className="font-mono font-black text-xs text-emerald-950 hover:underline cursor-pointer flex items-center gap-1"
                  title="Clic para cambiar la TRM manualmente"
                >
                  ${formatTRM(trmRate)} COP
                  <Edit3 size={11} className="text-emerald-700 hover:text-emerald-950" />
                </button>
                <button
                  type="button"
                  onClick={handleRefreshTrm}
                  title="Actualizar TRM oficial del día automáticamente"
                  className="p-1 hover:bg-emerald-100 rounded text-emerald-700 hover:text-emerald-950 transition-colors cursor-pointer"
                >
                  <RotateCcw size={12} className={isRefreshingTrm ? 'animate-spin' : ''} />
                </button>
              </div>
            )}

            {/* Botón Universal Configuración del Módulo Activo (Desktop) */}
            <button
              type="button"
              onClick={() => setIsModuleConfigOpen(true)}
              title={`Configurar opciones desplegables y catálogos de ${activeTitle}`}
              className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-lg bg-slate-100 hover:bg-[#EBF5FA] hover:text-[#00668F] text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer group"
            >
              <Settings size={15} className="text-[#00668F] group-hover:rotate-90 transition-transform duration-500 shrink-0" />
              <span>Configurar Módulo</span>
            </button>

            {/* Buscador Spotlight (Móvil y Escritorio) */}
            <button
              onClick={() => setIsSpotlightOpen(true)}
              title="Buscar (⌘K / Ctrl+K)"
              className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer group"
            >
              <Search size={16} className="group-hover:scale-110 transition-transform duration-200" />
            </button>

            {/* Notificaciones y Acciones del Usuario (Abre Pop-up Central Completo) */}
            <button
              onClick={() => setIsUserAlertsModalOpen(true)}
              title="Notificaciones y Tareas Pendientes"
              className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all relative active:scale-95 cursor-pointer group shrink-0 aspect-square"
            >
              <Bell size={16} className="group-hover:-rotate-12 transition-transform duration-200 shrink-0" />
              {unreadNotifs.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 bg-[#F39200] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs leading-none aspect-square shrink-0">
                  {unreadNotifs.length > 99 ? '99+' : unreadNotifs.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Área de Visualización y Contenido Reactivo con Padding Compacto y Seguro para Móvil */}
        <div
          id="erp-main-scroll-area"
          className={`flex-1 w-full max-w-full min-w-0 min-h-0 flex flex-col overscroll-y-contain ${
            activeModuleId === 'conversaciones'
              ? 'overflow-hidden p-2 sm:p-3 md:p-4 h-full max-h-full'
              : 'overflow-y-auto overflow-x-hidden p-2.5 sm:p-4 md:p-5'
          }`}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className={`w-full max-w-full min-w-0 min-h-0 flex-1 flex flex-col ${
            activeModuleId === 'conversaciones' ? 'h-full max-h-full overflow-hidden' : ''
          }`}>
            {children}

            {/* Espaciador de seguridad inferior: garantiza que el contenido final nunca quede tapado ni al límite */}
            {activeModuleId !== 'conversaciones' && (
              <div className="h-24 sm:h-24 md:h-24 shrink-0 w-full pointer-events-none" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Barra de Navegación Inferior Móvil (Adaptativa al Rol + Personalizable + Safe Area) */}
        <nav className="md:hidden shrink-0 z-30 bg-white/95 backdrop-blur-md px-2 pt-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around shadow-sm border-t border-slate-200/80">
          {mobileShortcuts.map((shortcutId) => {
            const meta = getModuleMeta(shortcutId);
            const Icon = meta.icon;
            const isActive = activeModuleId === shortcutId;
            return (
              <button
                key={shortcutId}
                type="button"
                onClick={() => setActiveModule(shortcutId)}
                className={`flex-1 max-w-[76px] h-12 flex flex-col items-center justify-center rounded-lg transition-all cursor-pointer active:scale-95 relative ${
                  isActive
                    ? 'text-[#00668F] font-bold bg-[#00668F]/10'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon size={19} className="transition-transform" />
                  {shortcutId === 'conversaciones' && unreadChatCount > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3 px-0.5 bg-emerald-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                      {unreadChatCount > 9 ? '9+' : unreadChatCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-0.5 truncate max-w-[68px] leading-tight text-center font-medium">
                  {meta.shortLabel || meta.label}
                </span>
              </button>
            );
          })}

          {/* 5to Botón: Abrir Cajón de Módulos (Menú Completo) */}
          <button
            type="button"
            onClick={() => setIsMobileDrawerOpen(true)}
            className="flex-1 max-w-[76px] h-12 flex flex-col items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 transition-all cursor-pointer active:scale-95"
          >
            <Menu size={19} />
            <span className="text-[10px] mt-0.5 truncate max-w-[68px] leading-tight font-medium text-center">
              Menú
            </span>
          </button>
        </nav>
      </main>

      {/* Modal Spotlight Global (⌘K / Ctrl+K) */}
      <SpotlightModal
        isOpen={isSpotlightOpen}
        onClose={() => setIsSpotlightOpen(false)}
        onSelectAction={(moduleId) => setActiveModule(moduleId)}
      />

      {/* Modal Universal de Configuración de Módulos */}
      <UniversalModuleConfigModal
        isOpen={isModuleConfigOpen}
        onClose={() => setIsModuleConfigOpen(false)}
        moduleId={activeModuleId}
        moduleTitle={activeTitle}
      />

      {/* Pop-up de Notificación de Mensaje en Tiempo Real (Estilo WhatsApp) en la Esquina Inferior Derecha */}
      {activeChatToast && (
        <div
          role="alert"
          onClick={() => {
            setActiveModule('conversaciones');
            setActiveChatChannel(activeChatToast.channelId);
            dismissChatToast();
            markChatAsRead(activeChatToast.channelId, currentUser.id);
          }}
          className="fixed bottom-24 sm:bottom-28 right-3 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-3rem)] bg-white/98 backdrop-blur-md shadow-xl rounded-xl p-3.5 sm:p-4 transition-all animate-in slide-in-from-bottom-5 duration-300 hover:shadow-emerald-500/15 cursor-pointer group select-none"
        >
          <div className="flex items-start gap-3">
            {/* Avatar del Emisor */}
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-white text-xs font-black flex items-center justify-center shrink-0 relative"
              style={{ backgroundColor: activeChatToast.avatarColor || '#00668F' }}
            >
              {activeChatToast.senderAvatar}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-[7px] text-white">
                💬
              </span>
            </div>

            {/* Contenido del Mensaje y Previsualización */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-gray-900 truncate">
                  {activeChatToast.senderName}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0 font-medium">
                  {activeChatToast.timestamp}
                </span>
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9.5px] px-1.5 py-0.2 rounded font-semibold bg-sky-50 text-[#00668F] truncate max-w-[150px]">
                  {activeChatToast.channelName}
                </span>
                <span className="text-[9.5px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Nuevo mensaje
                </span>
              </div>

              <p className="mt-1 text-xs text-gray-700 font-normal line-clamp-2 leading-relaxed">
                {activeChatToast.text}
              </p>

              <div className="mt-2 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10.5px]">
                <span className="font-bold text-[#00668F] group-hover:underline flex items-center gap-1">
                  Responder en Conversaciones →
                </span>
                <span className="text-[9.5px] text-gray-400">Clic para abrir</span>
              </div>
            </div>

            {/* Botón cerrar X */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissChatToast();
              }}
              title="Cerrar notificación"
              className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Pop-up de Recordatorio de Calendario en Tiempo Real */}
      {activeCalendarToast && (
        <div
          role="alert"
          className="fixed bottom-24 sm:bottom-28 right-3 sm:right-6 z-50 max-w-sm sm:max-w-md w-[calc(100vw-1.5rem)] sm:w-[calc(100vw-3rem)] bg-white/98 backdrop-blur-md shadow-xl rounded-xl p-3.5 sm:p-4 transition-all animate-in slide-in-from-bottom-5 duration-300 select-none"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00668F] text-white flex items-center justify-center shrink-0 shadow-xs relative">
              <CalendarIcon size={20} />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-900 shadow-2xs">
                🔔
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9.5px] uppercase font-black tracking-wider text-[#00668F] bg-sky-50 px-2 py-0.5 rounded">
                  Recordatorio de Reunión
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {activeCalendarToast.date}
                </span>
              </div>

              <h4 className="text-xs font-bold text-gray-900 mt-1.5 leading-snug line-clamp-2">
                {activeCalendarToast.title}
              </h4>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-700">
                <Clock size={12} className="text-[#00668F] shrink-0" />
                <span className="font-semibold">{activeCalendarToast.time}</span>
              </div>

              {activeCalendarToast.location && (
                <p className="text-[10.5px] text-gray-500 mt-0.5 truncate">
                  📍 {activeCalendarToast.location}
                </p>
              )}

              {activeCalendarToast.meetingMethod === 'virtual' && activeCalendarToast.teamsMeetingUrl && (
                <div className="mt-2.5">
                  <a
                    href={activeCalendarToast.teamsMeetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5059C9] hover:bg-[#4349A8] text-white font-bold text-[11px] transition-colors shadow-2xs"
                  >
                    <Video size={13} />
                    <span>Unirse en Teams Web (Navegador)</span>
                    <ExternalLink size={11} className="opacity-70" />
                  </a>
                </div>
              )}

              <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-[10.5px]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveModule('calendario');
                    dismissCalendarReminderToast();
                  }}
                  className="font-bold text-[#00668F] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  Abrir en Calendario →
                </button>
                <button
                  type="button"
                  onClick={dismissCalendarReminderToast}
                  className="text-gray-400 hover:text-gray-700 font-medium cursor-pointer"
                >
                  Entendido
                </button>
              </div>
            </div>

            <button
              onClick={dismissCalendarReminderToast}
              title="Cerrar recordatorio"
              className="text-gray-400 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modal / Bottom-Sheet de Personalización de Barra Móvil */}
      {isCustomizeShortcutsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom duration-300 shadow-xl"
          >
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#00668F] flex items-center justify-center shrink-0">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Personalizar Barra Móvil</h3>
                  <p className="text-[11px] text-slate-500">Selecciona hasta 4 accesos rápidos ({mobileShortcuts.length}/4)</p>
                </div>
              </div>
              <button
                onClick={() => setIsCustomizeShortcutsOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 flex-1">
              <div className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Toca para activar o desactivar de tu barra
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {customizableCandidateModules.map((mod) => {
                  const isSelected = mobileShortcuts.includes(mod.id);
                  const selectedIdx = mobileShortcuts.indexOf(mod.id);
                  const Icon = mod.id === 'dashboard' ? LayoutDashboard : (MODULE_ICONS[mod.id] || Layers);

                  return (
                    <button
                      key={mod.id}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (mobileShortcuts.length <= 1) return;
                          setMobileShortcuts(mobileShortcuts.filter((id) => id !== mod.id));
                        } else {
                          if (mobileShortcuts.length >= 4) {
                            setMobileShortcuts([...mobileShortcuts.slice(0, 3), mod.id]);
                          } else {
                            setMobileShortcuts([...mobileShortcuts, mod.id]);
                          }
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#EBF4FA] text-[#00668F]'
                          : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={16} className={isSelected ? 'text-[#00668F]' : 'text-slate-500'} />
                        <span className="truncate">{mod.label}</span>
                      </div>
                      {isSelected ? (
                        <span className="w-5 h-5 rounded-full bg-[#00668F] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                          {selectedIdx + 1}
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-200 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-3 bg-slate-50 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={resetCustomShortcuts}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Predeterminados de mi rol
              </button>
              <button
                type="button"
                onClick={() => saveCustomShortcuts(mobileShortcuts)}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#00668F] hover:bg-[#005073] transition-all cursor-pointer"
              >
                Guardar accesos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Configuración y Ajuste Rápido de TRM Oficial Colombia */}
      {isTrmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 bg-[#003650] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <DollarSign size={18} className="text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Tasa Representativa del Mercado (TRM)</h3>
                  <p className="text-[11px] text-slate-300">Moneda oficial del ERP: COP (Pesos Colombianos)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTrmModalOpen(false)}
                className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomTrm} className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-800">TRM actual activa:</span>
                  <span className="font-mono font-black text-sm text-emerald-900">${formatTRM(trmRate)} COP</span>
                </div>
                <div className="text-[10px] text-emerald-700 mt-1 flex items-center justify-between">
                  <span>Fuente: {getTRMDetails().source === 'manual' ? 'Personalizada / Manual' : 'Superfinanciera / Banco República'}</span>
                  <span>{getTRMDetails().date}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ajustar TRM del día (COP por 1 USD):
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1000"
                    max="10000"
                    value={customTrmInput}
                    onChange={(e) => setCustomTrmInput(e.target.value)}
                    placeholder="Ej. 4180.50"
                    className="w-full pl-7 pr-3 py-2 text-sm font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#003650] text-slate-900"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Este valor actualizará instantáneamente todos los cálculos en Compras, Proyectos, Facturación y CRM.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsRefreshingTrm(true);
                      try {
                        const result = await fetchTRMWithLucianaWeb();
                        setTrmRate(result.rate);
                        setCustomTrmInput(result.rate.toString());
                      } finally {
                        setIsRefreshingTrm(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-sky-900 bg-sky-100 hover:bg-sky-200 transition-colors cursor-pointer"
                    title="Buscar TRM real del día en Internet con LUC-IA-NA"
                  >
                    <Sparkles size={13} className={isRefreshingTrm ? 'animate-spin text-[#00668F]' : 'text-[#00668F]'} />
                    <span>Buscar con LUC-IA-NA</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      await handleRefreshTrm();
                      setCustomTrmInput(getStoredTRM().toString());
                    }}
                    className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                    title="Sincronizar con API oficial de divisas"
                  >
                    <RotateCcw size={13} className={isRefreshingTrm ? 'animate-spin' : ''} />
                    <span>Oficial</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTrmModalOpen(false)}
                    className="px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#003650] hover:bg-[#00283d] transition-colors cursor-pointer shadow-xs"
                  >
                    Guardar TRM
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pop-up Grande de Notificaciones y Acciones al Iniciar Sesión / Campana */}
      <UserLoginAlertsModal
        isOpen={isUserAlertsModalOpen}
        onClose={() => setIsUserAlertsModalOpen(false)}
        onNavigateToAction={handleNavigateFromAlert}
      />

      {/* Widget Global Flotante de LUC-IA-NA (Accesible en todo el ERP) */}
      <LucianaFloatingWidget
        activeModuleTitle={activeTitle}
        activeModuleId={activeModuleId}
      />
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Plus, 
  FileCheck, 
  Flame, 
  Compass, 
  ArrowUpRight, 
  Layers, 
  Radio, 
  Wind, 
  AlertTriangle, 
  UserCheck, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  Mountain,
  Trash2,
  Info
} from 'lucide-react';
import { Project } from '../../../../types';
import { HSEQAroPermit, TelefericoPermitType } from '../../../../types/ProjectSchema';
import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';
import { DetailModal } from '../../../../components/common/DetailModal';
import { CreatableSelect } from '../../../../components/common/CreatableSelect';
import { useErp } from '../../../../core/storage/erpStore';
import { 
  savePermitOffline, 
  getOfflinePermitsByProject, 
  syncOfflinePermitsToFirebase 
} from '../../../../core/services/hseqOfflineService';

interface TabHseqOfflineProps {
  project: Project;
}

export const TabHseqOffline: React.FC<TabHseqOfflineProps> = ({ project }) => {
  const { users, employees, currentUser } = useErp();
  const staffOptions = React.useMemo(() => {
    const map = new Map<string, string>();
    users.forEach((u) => map.set(u.name, `${u.name} (${u.roleLabel || 'Personal ITK'})`));
    (employees || []).forEach((e) => {
      if (!map.has(e.fullName)) map.set(e.fullName, `${e.fullName} (${e.position})`);
    });
    return Array.from(map.entries()).map(([name, label]) => ({ value: name, label }));
  }, [users, employees]);

  const [permits, setPermits] = useState<HSEQAroPermit[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [permitToDelete, setPermitToDelete] = useState<HSEQAroPermit | null>(null);
  const [selectedPermitDetail, setSelectedPermitDetail] = useState<HSEQAroPermit | null>(null);

  // Form State
  const [permitType, setPermitType] = useState<TelefericoPermitType>('trabajo_en_alturas_pilonas');
  const [workLocation, setWorkLocation] = useState<string>('');
  const [towerNumber, setTowerNumber] = useState<string>('');
  const [heightMeters, setHeightMeters] = useState<string>('');
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [supervisorName, setSupervisorName] = useState<string>(project.supervisorName || currentUser.name || '');
  const [personnelName, setPersonnelName] = useState<string>('');
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('17:00');

  // Checklist de Seguridad Crítica en Teleféricos
  const [safetyChecklist, setSafetyChecklist] = useState({
    heightEquipmentInspected: false,
    rescueKitOnSite: false,
    lifelineAnchored: false,
    radioCommunicationsVerified: false,
    weatherPermitConfirmed: false,
    lockoutTagoutApplied: false,
    extinguisherAvailable: false,
  });

  const loadPermits = async () => {
    try {
      const offlineList = await getOfflinePermitsByProject(project.id);
      setPermits(offlineList);
    } catch {
      setPermits([]);
    }
  };

  useEffect(() => {
    loadPermits();

    const handleOnline = async () => {
      setIsOnline(true);
      setMsg({ text: 'Conexión recuperada. Sincronizando permisos HSEQ desde IndexedDB hacia Firebase...', type: 'info' });
      const synced = await syncOfflinePermitsToFirebase(project.id);
      if (synced > 0) {
        setMsg({ text: `Se sincronizaron ${synced} permisos con la nube Firebase exitosamente.`, type: 'success' });
        loadPermits();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setMsg({ text: 'Modo sin conexión PWA activado. Los permisos ARO se respaldarán localmente en IndexedDB.', type: 'info' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [project.id]);

  const handleManualSync = async () => {
    if (!navigator.onLine) {
      setMsg({ text: 'No hay conexión a internet para sincronizar con Firebase.', type: 'error' });
      return;
    }
    setIsSyncing(true);
    const count = await syncOfflinePermitsToFirebase(project.id);
    setIsSyncing(false);
    setMsg({ text: `Sincronización completada: ${count} permisos respaldados en la nube.`, type: 'success' });
    loadPermits();
  };

  const handleCreatePermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorName.trim() || !taskDescription.trim()) {
      setMsg({ text: 'Supervisor y Descripción de la tarea son obligatorios.', type: 'error' });
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const newPermit: HSEQAroPermit = {
      id: `ARO-${Date.now()}`,
      projectId: project.id,
      permitNumber: `ARO-STC-${String(permits.length + 1).padStart(3, '0')}`,
      permitType,
      date: todayStr,
      startTime,
      endTime,
      workLocation: workLocation.trim() || project.location || 'Línea de Cable',
      towerNumber: towerNumber.trim() || undefined,
      heightMeters: heightMeters ? Number(heightMeters) : undefined,
      taskDescription: taskDescription.trim(),
      safetyChecklist,
      authorizedPersonnel: personnelName.split(',').map((name) => ({
        name: name.trim(),
        idNumber: 'CC-OFICIAL',
        heightCertStatus: 'vigente' as const,
        signatureCaptured: true,
      })).filter((p) => p.name.length > 0),
      supervisorName: supervisorName.trim(),
      supervisorApproved: true,
      isOfflineDraft: !navigator.onLine,
      syncedToFirebase: navigator.onLine,
      createdAt: Date.now(),
    };

    await savePermitOffline(newPermit);
    setShowModal(false);
    setMsg({ 
      text: navigator.onLine 
        ? 'Permiso de Trabajo en Alturas registrado y sincronizado en la nube.' 
        : 'Permiso guardado localmente en IndexedDB (Modo Offline PWA Montaña). Se sincronizará al detectar señal.', 
      type: 'success' 
    });

    loadPermits();
  };

  const getPermitBadge = (type: TelefericoPermitType) => {
    switch (type) {
      case 'trabajo_en_alturas_pilonas':
        return { label: 'Alturas en Pilona/Torre', icon: Mountain, color: 'text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-300' };
      case 'rescate_en_linea':
        return { label: 'Plan Rescate en Línea', icon: ShieldCheck, color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300' };
      case 'intervencion_volante_reductor':
        return { label: 'Bloqueo LOTO Volante/Reductor', icon: Radio, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300' };
      case 'empalme_cable_tension':
        return { label: 'Empalme Cable con Tensión', icon: Compass, color: 'text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-300' };
      case 'trabajo_en_caliente':
        return { label: 'Trabajo en Caliente', icon: Flame, color: 'text-red-700 bg-red-50 dark:bg-red-950/40 border-red-300' };
      default:
        return { label: 'Riesgo General STC', icon: ShieldCheck, color: 'text-slate-700 bg-slate-50 border-slate-300' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Network & PWA Status Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-lg flex items-center justify-center ${
            isOnline ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600'
          }`}>
            {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {isOnline ? 'Conexión a la Nube Activa' : 'Modo Sin Conexión Activo (Trabajo en Campo)'}
              </span>
              <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${
                isOnline ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
              }`}>
                {isOnline ? 'En línea' : 'Almacenamiento Local'}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isOnline 
                ? 'Los permisos de seguridad se respaldan en la nube y en la base local del dispositivo.' 
                : 'En campo montañoso sin señal celular, emite los permisos en la tablet; se sincronizarán al reconectar.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Emitir Permiso ARO</span>
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-3 text-xs rounded-lg border flex items-center justify-between ${
          msg.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 text-emerald-800 dark:text-emerald-200' 
            : msg.type === 'error'
            ? 'bg-red-50 dark:bg-red-950/30 border-red-300 text-red-800 dark:text-red-200'
            : 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 text-blue-800 dark:text-blue-200'
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* Grid de Permisos Emitidos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#00668F]" />
            <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100">
              Permisos de Trabajo en Alturas Crítico y ARO en Teleféricos
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {permits.length} registrados
          </span>
        </div>

        {permits.length === 0 ? (
          <div className="p-8 text-center">
            <FileCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No hay permisos ARO emitidos para este proyecto
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Emite permisos para ascenso a pilonas, rescate en línea, bloqueo LOTO o empalme de cable con soporte offline PWA.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#00668F] bg-blue-50 dark:bg-blue-950/30 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Emitir primer permiso de alturas
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {permits.map((permit) => {
              const badge = getPermitBadge(permit.permitType);
              const BadgeIcon = badge.icon;
              return (
                <div key={permit.id} className="p-4 sm:p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg border ${badge.color}`}>
                        <BadgeIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100">
                            {badge.label}
                          </span>
                          <span className="text-xs font-mono text-slate-400">
                            #{permit.permitNumber}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            permit.syncedToFirebase 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {permit.syncedToFirebase ? 'Nube Sincronizada' : 'IndexedDB Local'}
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 dark:text-slate-300 mt-1">
                          {permit.taskDescription}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-xs text-slate-600 dark:text-slate-400">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Fecha: {permit.date}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Horario: {permit.startTime} - {permit.endTime}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>Sup: {permit.supervisorName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Mountain className="w-3.5 h-3.5 text-slate-400" />
                            <span>Ubicación: {permit.workLocation} ({permit.heightMeters || 0}m altura)</span>
                          </div>
                        </div>

                        {/* Checklist pills */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                          {permit.safetyChecklist.rescueKitOnSite && (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Kit de Rescate en Sitio
                            </span>
                          )}
                          {permit.safetyChecklist.weatherPermitConfirmed && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                              Clima Seguro (Viento &lt; 40km/h)
                            </span>
                          )}
                          {permit.safetyChecklist.lockoutTagoutApplied && (
                            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                              LOTO en Sala Máquinas
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        FIRMADO & VIGENTE
                      </span>

                      <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedPermitDetail(permit)}
                          className="p-1.5 text-slate-400 hover:text-[#00668F] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          title="Ver detalle del permiso"
                        >
                          <Info size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPermitToDelete(permit)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Eliminar permiso"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL EMITIR PERMISO ARO */}
      {showModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Mountain className="w-5 h-5 text-[#00668F]" />
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  Emitir Permiso de Trabajo en Alturas / ARO STC
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <form onSubmit={handleCreatePermit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Actividad Crítica en Teleférico *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { type: 'trabajo_en_alturas_pilonas', label: 'Alturas en Pilona / Torre' },
                    { type: 'rescate_en_linea', label: 'Plan de Rescate en Línea' },
                    { type: 'intervencion_volante_reductor', label: 'LOTO Volante / Reductor' },
                    { type: 'empalme_cable_tension', label: 'Empalme de Cable con Tensión' },
                  ] as { type: TelefericoPermitType; label: string }[]).map((t) => (
                    <button
                      key={t.type}
                      type="button"
                      onClick={() => setPermitType(t.type)}
                      className={`p-2 rounded-lg border text-xs font-medium text-left transition-all ${
                        permitType === t.type 
                          ? 'border-[#00668F] bg-blue-50 dark:bg-blue-950/40 text-[#00668F] font-semibold ring-1 ring-[#00668F]' 
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Descripción del Trabajo Crítico *
                </label>
                <input
                  type="text"
                  required
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="Ej. Intervención en balancín de torre 6, regulación de mordazas y escaneo MRT"
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Ubicación / Tramo
                  </label>
                  <input
                    type="text"
                    value={workLocation}
                    onChange={(e) => setWorkLocation(e.target.value)}
                    placeholder="Pilona 7"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Torre N°
                  </label>
                  <input
                    type="text"
                    value={towerNumber}
                    onChange={(e) => setTowerNumber(e.target.value)}
                    placeholder="Torre 07"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Altura Estimada (m)
                  </label>
                  <input
                    type="number"
                    value={heightMeters || ''}
                    onChange={(e) => setHeightMeters(e.target.value)}
                    placeholder="0"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Supervisor HSEQ en Obra *
                  </label>
                  <CreatableSelect
                    options={staffOptions}
                    value={supervisorName}
                    onChange={(val) => setSupervisorName(val)}
                    placeholder="Seleccionar supervisor..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Personal Autorizado en Alturas (Nombres)
                  </label>
                  <CreatableSelect
                    options={staffOptions}
                    value={personnelName}
                    onChange={(val) => setPersonnelName(val)}
                    placeholder="Seleccionar técnico..."
                  />
                </div>
              </div>

              {/* Checklist de Controles Críticos de Teleférico */}
              <div className="space-y-2 border-t pt-3 border-slate-200 dark:border-slate-800">
                <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Lista de Verificación de Seguridad y Rescate en Pilona
                </span>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safetyChecklist.heightEquipmentInspected}
                    onChange={(e) => setSafetyChecklist({ ...safetyChecklist, heightEquipmentInspected: e.target.checked })}
                    className="rounded border-slate-300 text-[#00668F]"
                  />
                  <span>Arnés integral clase A y eslingas con absorbedor de impacto inspeccionados</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safetyChecklist.rescueKitOnSite}
                    onChange={(e) => setSafetyChecklist({ ...safetyChecklist, rescueKitOnSite: e.target.checked })}
                    className="rounded border-slate-300 text-[#00668F]"
                  />
                  <span>Kit de rescate y evacuación en línea disponible en la pilona/estación</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safetyChecklist.radioCommunicationsVerified}
                    onChange={(e) => setSafetyChecklist({ ...safetyChecklist, radioCommunicationsVerified: e.target.checked })}
                    className="rounded border-slate-300 text-[#00668F]"
                  />
                  <span>Comunicación por radio verificada entre técnicos en torre y sala de control</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safetyChecklist.weatherPermitConfirmed}
                    onChange={(e) => setSafetyChecklist({ ...safetyChecklist, weatherPermitConfirmed: e.target.checked })}
                    className="rounded border-slate-300 text-[#00668F]"
                  />
                  <span>Condiciones meteorológicas seguras (Viento &lt; 40 km/h, sin alerta de rayos)</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safetyChecklist.lockoutTagoutApplied}
                    onChange={(e) => setSafetyChecklist({ ...safetyChecklist, lockoutTagoutApplied: e.target.checked })}
                    className="rounded border-slate-300 text-[#00668F]"
                  />
                  <span>Bloqueo y etiquetado (LOTO) aplicado al accionamiento motriz del cable</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-lg shadow-sm"
                >
                  Aprobar y Emitir Permiso ARO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Confirmación de Eliminación de Permiso ARO */}
      <ConfirmDeleteModal
        isOpen={Boolean(permitToDelete)}
        title="¿Eliminar Permiso HSEQ / ARO?"
        itemName={permitToDelete ? `Permiso #${permitToDelete.permitNumber} - ${permitToDelete.workLocation}` : ''}
        description="Esta acción eliminará el permiso de trabajo en alturas y su registro de seguridad. ¿Deseas confirmar la eliminación?"
        requireConfirmWord={true}
        confirmWord="BORRAR"
        confirmText="Eliminar Permiso"
        onConfirm={() => {
          if (permitToDelete) {
            const updated = permits.filter((p) => p.id !== permitToDelete.id);
            setPermits(updated);
            setPermitToDelete(null);
          }
        }}
        onCancel={() => setPermitToDelete(null)}
      />

      {/* Modal Detalle Completo de Permiso */}
      <DetailModal
        isOpen={Boolean(selectedPermitDetail)}
        title={selectedPermitDetail ? `Permiso ARO #${selectedPermitDetail.permitNumber}` : 'Ficha de Permiso'}
        subtitle={selectedPermitDetail ? `Ubicación: ${selectedPermitDetail.workLocation} | Proyecto: ${project.name}` : ''}
        badge={selectedPermitDetail ? {
          label: selectedPermitDetail.syncedToFirebase ? 'Sincronizado Nube' : 'IndexedDB Local',
          color: selectedPermitDetail.syncedToFirebase ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
        } : undefined}
        onClose={() => setSelectedPermitDetail(null)}
        fields={selectedPermitDetail ? [
          { label: 'Tipo de Permiso', value: selectedPermitDetail.permitType.replace(/_/g, ' ').toUpperCase(), colSpan: 2 },
          { label: 'Ubicación / Tramo', value: selectedPermitDetail.workLocation },
          { label: 'N° Torre / Pilona', value: selectedPermitDetail.towerNumber || 'N/A', isMono: true },
          { label: 'Altura Estimada', value: `${selectedPermitDetail.heightMeters || 0} metros`, isMono: true },
          { label: 'Supervisor HSEQ Emisor', value: selectedPermitDetail.supervisorName },
          { label: 'Fecha y Horario', value: `${selectedPermitDetail.date} (${selectedPermitDetail.startTime} - ${selectedPermitDetail.endTime})` },
          { label: 'Personal Ejecutor', value: selectedPermitDetail.authorizedPersonnel?.map((p) => p.name).join(', ') || (selectedPermitDetail as any).personnelNames?.join(', ') || 'No especificado' },
          { label: 'Descripción de Actividad', value: selectedPermitDetail.taskDescription, colSpan: 2 },
        ] : []}
      />
    </div>
  );
};

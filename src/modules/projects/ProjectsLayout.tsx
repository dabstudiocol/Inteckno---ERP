import React, { useEffect, useState, useTransition } from 'react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  Wrench,
  Layers,
  Calendar,
  DollarSign,
  ShieldAlert,
  FileCheck2,
  Users,
  Plus,
  Compass,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  MapPin,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { getFirebaseDb } from '../../core/services/firebaseClient';
import {
  STCProjectSchema,
  STCProjectType,
  PipingDynamicData,
  StructuresDynamicData,
  TanksDynamicData,
} from './types/ProjectSTCSchema';
import { CreatableSelect } from '../../components/common/CreatableSelect';

export type STCActiveTab = 'dashboard' | 'wbs_gantt' | 'costos' | 'suministros_qc' | 'personal_horas' | 'hseq_offline' | 'addendums';

export const ProjectsLayout: React.FC = () => {
  const [projects, setProjects] = useState<STCProjectSchema[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<STCActiveTab>('dashboard');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Formulario de creación directa a Firestore (Cero Mock Data)
  const [newProjectForm, setNewProjectForm] = useState<{
    code: string;
    name: string;
    client: string;
    projectType: STCProjectType;
    location: string;
    latitude: number;
    longitude: number;
    geofenceRadiusMeters: number;
    contractNumber: string;
    startDate: string;
    endDate: string;
    baselineBudgetUSD: number;
    baselineBudgetCOP: number;
    // Campos dinámicos iniciales según especialidad STC
    pipingDiameterInches: number;
    pipingPressurePSI: number;
    pipingSchedule: 'SCH 10' | 'SCH 40' | 'SCH 80' | 'SCH 160';
    structuresTonnage: number;
    tanksCapacityM3: number;
    tanksStandard: 'API 650' | 'API 620' | 'UL 142';
  }>({
    code: '',
    name: '',
    client: '',
    projectType: 'piping',
    location: 'Planta Industrial STC',
    latitude: 6.2442,
    longitude: -75.5812,
    geofenceRadiusMeters: 300,
    contractNumber: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    baselineBudgetUSD: 0,
    baselineBudgetCOP: 0,
    pipingDiameterInches: 4,
    pipingPressurePSI: 600,
    pipingSchedule: 'SCH 40',
    structuresTonnage: 45,
    tanksCapacityM3: 1500,
    tanksStandard: 'API 650',
  });

  // Suscripción en tiempo real a Cloud Firestore
  useEffect(() => {
    setIsLoading(true);
    setFirestoreError(null);

    const db = getFirebaseDb();
    if (!db) {
      setFirestoreError('Cliente Cloud Firestore no inicializado. Verifique la conexión.');
      setIsLoading(false);
      return;
    }

    try {
      const projectsCol = collection(db, 'stc_projects');
      const q = query(projectsCol, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetched: STCProjectSchema[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            fetched.push({
              id: docSnap.id,
              code: data.code || '',
              name: data.name || '',
              client: data.client || '',
              projectType: data.projectType || 'piping',
              location: data.location || '',
              latitude: data.latitude,
              longitude: data.longitude,
              geofenceRadiusMeters: data.geofenceRadiusMeters || 250,
              contractNumber: data.contractNumber || '',
              startDate: data.startDate || '',
              endDate: data.endDate || '',
              baselineBudgetUSD: Number(data.baselineBudgetUSD) || 0,
              baselineBudgetCOP: Number(data.baselineBudgetCOP) || 0,
              currentBudgetUSD: Number(data.currentBudgetUSD || data.baselineBudgetUSD) || 0,
              currentBudgetCOP: Number(data.currentBudgetCOP || data.baselineBudgetCOP) || 0,
              progressPercent: Number(data.progressPercent) || 0,
              status: data.status || 'planeacion',
              dynamicData: data.dynamicData || {},
              millTestCertificates: data.millTestCertificates || [],
              weldJoints: data.weldJoints || [],
              addendums: data.addendums || [],
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || '',
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || '',
              createdByUserId: data.createdByUserId || 'USR-STC-OPERATIONS',
            });
          });

          startTransition(() => {
            setProjects(fetched);
            if (fetched.length > 0 && !selectedProjectId) {
              setSelectedProjectId(fetched[0].id);
            }
            setIsLoading(false);
          });
        },
        (error) => {
          console.error('Error al escuchar stc_projects en Firestore:', error);
          setFirestoreError(error.message);
          setIsLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Fallo al suscribirse a Firestore:', err);
      setFirestoreError(err.message || 'Error de conexión');
      setIsLoading(false);
    }
  }, []);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || null;

  // Guardar nuevo proyecto directamente en Firestore
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const db = getFirebaseDb();
    if (!db) {
      alert('Error: Base de datos Cloud Firestore no disponible.');
      return;
    }

    if (!newProjectForm.code.trim() || !newProjectForm.name.trim()) {
      alert('El código y nombre del proyecto de ingeniería son obligatorios.');
      return;
    }

    // Armar el dynamicData según la especialidad de STC
    let dynamicDataPayload: Record<string, any> = {};
    if (newProjectForm.projectType === 'piping') {
      const pipingData: PipingDynamicData = {
        nominalDiameterInches: newProjectForm.pipingDiameterInches,
        totalDiameterInchesInch: newProjectForm.pipingDiameterInches * 12,
        designPressurePSI: newProjectForm.pipingPressurePSI,
        testPressurePSI: newProjectForm.pipingPressurePSI * 1.5,
        schedule: newProjectForm.pipingSchedule,
        materialGrade: 'A106-B',
        fluidType: 'vapor',
        isometricSheetNumbers: [],
        ndtTestingRequirement: 'RT_100%',
      };
      dynamicDataPayload = pipingData;
    } else if (newProjectForm.projectType === 'estructuras') {
      const structData: StructuresDynamicData = {
        totalTonnageTon: newProjectForm.structuresTonnage,
        profileTypes: ['W', 'IPE'],
        steelGrade: 'A572-Gr50',
        paintSystem: 'epoxico_poliamida',
        dryFilmThicknessMils: 8,
        torqueInspectionPct: 100,
        craneRequirementTon: 50,
      };
      dynamicDataPayload = structData;
    } else if (newProjectForm.projectType === 'tanques') {
      const tankData: TanksDynamicData = {
        designStandard: newProjectForm.tanksStandard,
        capacityBarrelsOrM3: newProjectForm.tanksCapacityM3,
        diameterMeters: 14.5,
        heightMeters: 12.0,
        shellCoursesCount: 5,
        basePlateMaterial: 'A516-Gr70',
        roofType: 'conico_fijo',
        vacuumBoxBottomTestRequired: true,
      };
      dynamicDataPayload = tankData;
    }

    try {
      const docRef = await addDoc(collection(db, 'stc_projects'), {
        code: newProjectForm.code.trim(),
        name: newProjectForm.name.trim(),
        client: newProjectForm.client.trim(),
        projectType: newProjectForm.projectType,
        location: newProjectForm.location.trim(),
        latitude: newProjectForm.latitude,
        longitude: newProjectForm.longitude,
        geofenceRadiusMeters: newProjectForm.geofenceRadiusMeters,
        contractNumber: newProjectForm.contractNumber.trim(),
        startDate: newProjectForm.startDate,
        endDate: newProjectForm.endDate,
        baselineBudgetUSD: Number(newProjectForm.baselineBudgetUSD) || 0,
        baselineBudgetCOP: Number(newProjectForm.baselineBudgetCOP) || 0,
        currentBudgetUSD: Number(newProjectForm.baselineBudgetUSD) || 0,
        currentBudgetCOP: Number(newProjectForm.baselineBudgetCOP) || 0,
        progressPercent: 0,
        status: 'planeacion',
        dynamicData: dynamicDataPayload,
        millTestCertificates: [],
        weldJoints: [],
        addendums: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdByUserId: 'USR-STC-OPERATIONS',
      });

      setSelectedProjectId(docRef.id);
      setIsCreateModalOpen(false);
      // Limpiar formulario
      setNewProjectForm({
        code: '',
        name: '',
        client: '',
        projectType: 'piping',
        location: 'Planta Industrial STC',
        latitude: 6.2442,
        longitude: -75.5812,
        geofenceRadiusMeters: 300,
        contractNumber: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        baselineBudgetUSD: 0,
        baselineBudgetCOP: 0,
        pipingDiameterInches: 4,
        pipingPressurePSI: 600,
        pipingSchedule: 'SCH 40',
        structuresTonnage: 45,
        tanksCapacityM3: 1500,
        tanksStandard: 'API 650',
      });
    } catch (err: any) {
      alert(`Error al guardar en Firestore: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Barra de Título y Conexión de Estado */}
      <header className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
            <Wrench className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">
                STC Ingeniería Mecánica & Montajes Industriales
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 uppercase tracking-widest font-semibold">
                Firestore En Vivo
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Piping de Alta Presión, Estructuras Pesadas, Tanques API 650 & Trazabilidad QC Inmutable
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Nuevo Proyecto STC
          </button>
        </div>
      </header>

      {/* Alerta de Error Firestore si existe */}
      {firestoreError && (
        <div className="bg-rose-500/10 border-b border-rose-500/30 px-6 py-2.5 flex items-center gap-2 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Error de sincronización con Firestore: {firestoreError}</span>
        </div>
      )}

      {/* Selector de Proyecto y Metadatos de Cabecera */}
      <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Proyecto Activo:</span>
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Cargando desde Firestore...
            </div>
          ) : projects.length === 0 ? (
            <span className="text-xs text-amber-400/90 italic">
              No hay proyectos registrados en Firestore. Crea el primero con el botón superior.
            </span>
          ) : (
            <div className="w-full max-w-md">
              <CreatableSelect
                value={
                  selectedProject
                    ? `[${selectedProject.code}] ${selectedProject.name} - ${selectedProject.client} (${selectedProject.projectType.toUpperCase()})`
                    : ''
                }
                onChange={(val) => {
                  const match = projects.find(
                    (p) => `[${p.code}] ${p.name} - ${p.client} (${p.projectType.toUpperCase()})` === val || p.id === val || p.code === val
                  );
                  if (match) setSelectedProjectId(match.id);
                }}
                options={projects.map((p) => ({
                  id: p.id,
                  name: `[${p.code}] ${p.name} - ${p.client} (${p.projectType.toUpperCase()})`,
                  code: p.code,
                }))}
                placeholder="Seleccionar proyecto activo..."
                allowCustomText={false}
                
                inputClassName="bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>
          )}
        </div>

        {selectedProject && (
          <div className="flex items-center gap-4 text-xs font-mono text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              <span>Tipo: <strong className="text-white uppercase">{selectedProject.projectType}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Geocerca: <strong>{selectedProject.geofenceRadiusMeters}m</strong></span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              <span>Línea Base: <strong>USD ${(selectedProject.currentBudgetUSD || 0).toLocaleString()}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Navegación Modular: Las 7 Pestañas Clave de Ingeniería STC */}
      <nav className="bg-slate-950 border-b border-slate-800 px-6 flex space-x-1 overflow-x-auto scrollbar-thin">
        {[
          { id: 'dashboard', label: 'Resumen General', icon: Layers },
          { id: 'wbs_gantt', label: 'Plan y Cronograma de Actividades', icon: Calendar },
          { id: 'costos', label: 'Costos y Equipos Calibrados', icon: DollarSign },
          { id: 'suministros_qc', label: 'Materiales y Control de Calidad', icon: FileCheck2 },
          { id: 'personal_horas', label: 'Registro de Jornada y Cuadrillas', icon: Users },
          { id: 'hseq_offline', label: 'Seguridad y Salud (SST)', icon: ShieldAlert },
          { id: 'addendums', label: 'Órdenes de Cambio y Adicionales', icon: Flame },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as STCActiveTab)}
              className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                isActive
                  ? 'border-amber-500 text-amber-400 bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Contenedor Principal de la Pestaña Activa */}
      <main className="flex-1 p-6">
        {!selectedProject && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-96 border border-dashed border-slate-800 rounded-2xl p-8 text-center bg-slate-950/40">
            <Wrench className="w-12 h-12 text-slate-700 mb-4" />
            <h3 className="text-base font-bold text-white mb-1">Sin Proyecto STC Seleccionado</h3>
            <p className="text-xs text-slate-400 max-w-md mb-4">
              La base de datos Cloud Firestore está lista. Registra una nueva obra de tuberías, estructuras o tanques para desplegar las herramientas de ingeniería.
            </p>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              Crear Proyecto en Firestore
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visualización Dinámica de Parámetros de Ingeniería Mecánica */}
            {selectedProject && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                      Dynamic Schema Engine: Parámetros Técnicos STC
                    </h2>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    ID Firestore: {selectedProject.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {selectedProject.projectType === 'piping' && (
                    <>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Diámetro Nominal:</span>
                        <span className="font-bold text-white text-sm">
                          {(selectedProject.dynamicData as PipingDynamicData)?.nominalDiameterInches || 'N/A'}" Pulg
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Presión Diseño / Prueba:</span>
                        <span className="font-bold text-amber-400 text-sm">
                          {(selectedProject.dynamicData as PipingDynamicData)?.designPressurePSI || 0} / {(selectedProject.dynamicData as PipingDynamicData)?.testPressurePSI || 0} PSI
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Cédula (Schedule):</span>
                        <span className="font-bold text-white text-sm">
                          {(selectedProject.dynamicData as PipingDynamicData)?.schedule || 'SCH 40'}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Ensayos NDT Requeridos:</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          {(selectedProject.dynamicData as PipingDynamicData)?.ndtTestingRequirement || 'RT_100%'}
                        </span>
                      </div>
                    </>
                  )}

                  {selectedProject.projectType === 'estructuras' && (
                    <>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Tonelaje Total:</span>
                        <span className="font-bold text-white text-sm">
                          {(selectedProject.dynamicData as StructuresDynamicData)?.totalTonnageTon || 0} Toneladas
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Perfiles Principales:</span>
                        <span className="font-bold text-white text-sm">
                          {((selectedProject.dynamicData as StructuresDynamicData)?.profileTypes || []).join(', ') || 'W, IPE'}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Grado de Acero:</span>
                        <span className="font-bold text-amber-400 text-sm">
                          {(selectedProject.dynamicData as StructuresDynamicData)?.steelGrade || 'A572-Gr50'}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Capacidad Grúa Izaje:</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          {(selectedProject.dynamicData as StructuresDynamicData)?.craneRequirementTon || 0} Ton
                        </span>
                      </div>
                    </>
                  )}

                  {selectedProject.projectType === 'tanques' && (
                    <>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Norma de Diseño:</span>
                        <span className="font-bold text-white text-sm">
                          {(selectedProject.dynamicData as TanksDynamicData)?.designStandard || 'API 650'}
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Capacidad:</span>
                        <span className="font-bold text-white text-sm">
                          {(selectedProject.dynamicData as TanksDynamicData)?.capacityBarrelsOrM3 || 0} m³
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Geometría (D x H):</span>
                        <span className="font-bold text-amber-400 text-sm">
                          {(selectedProject.dynamicData as TanksDynamicData)?.diameterMeters || 0}m x {(selectedProject.dynamicData as TanksDynamicData)?.heightMeters || 0}m
                        </span>
                      </div>
                      <div className="bg-slate-900/80 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-400 block text-[10px]">Material Base & Virolas:</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          {(selectedProject.dynamicData as TanksDynamicData)?.basePlateMaterial || 'A516-Gr70'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Espacio para renderizar cada una de las 7 pestañas */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 min-h-[420px]">
              {activeTab === 'dashboard' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    Panel de Control & Indicadores de Ingeniería STC
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block">Avance Físico Ponderado</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-bold text-white">{selectedProject?.progressPercent || 0}%</span>
                        <span className="text-xs text-slate-500">Certificado por Interventoría</span>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block">Certificados Mill Test Aprobados</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-bold text-emerald-400">{selectedProject?.millTestCertificates?.length || 0}</span>
                        <span className="text-xs text-slate-500">Lotes vinculados</span>
                      </div>
                    </div>
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs text-slate-400 block">Juntas de Soldadura Trazadas</span>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-bold text-amber-400">{selectedProject?.weldJoints?.length || 0}</span>
                        <span className="text-xs text-slate-500">Inspeccionadas NDT</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'wbs_gantt' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-400" />
                        Plan de Trabajo y Cronograma de Actividades
                      </h3>
                      <p className="text-xs text-slate-400">
                        Estructura organizada de actividades y cronograma de montaje mecánico.
                      </p>
                    </div>
                  </div>
                  <div className="border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs bg-slate-900/40">
                    Cronograma de actividades STC listo para cargar tareas directamente desde el sistema.
                  </div>
                </div>
              )}

              {activeTab === 'costos' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-amber-400" />
                    Control Financiero, Alquiler de Grúas y Equipos Pesados
                  </h3>
                  <div className="border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs bg-slate-900/40">
                    Matriz de costos reales vs plan original contractual.
                  </div>
                </div>
              )}

              {activeTab === 'suministros_qc' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-amber-400" />
                    Suministros Críticos y Control de Calidad (Certificados de Acería)
                  </h3>
                  <div className="border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs bg-slate-900/40">
                    Gestión obligatoria de certificados de calidad de acería por lote o colada.
                  </div>
                </div>
              )}

              {activeTab === 'personal_horas' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    Registro de Jornada y Calificación de Soldadores
                  </h3>
                  <div className="border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs bg-slate-900/40">
                    Validación cruzada con Talento Humano: Bloqueo de asignación si la calificación de soldador está vencida + Registro en obra.
                  </div>
                </div>
              )}

              {activeTab === 'hseq_offline' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    Permisos de Alto Riesgo, Seguridad y Salud (SST / Trabajo en Alturas)
                  </h3>
                  <div className="border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs bg-slate-900/40">
                    Trabajo en Caliente, Espacios Confinados y Alturas con medición de gases y guardado local sin internet.
                  </div>
                </div>
              )}

              {activeTab === 'addendums' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    Órdenes de Cambio y Modificaciones Contractuales
                  </h3>
                  <div className="border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs bg-slate-900/40">
                    Ajustes de costos y plazos con aprobación del cliente.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Creación de Proyecto STC en Firestore */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Nuevo Proyecto de Ingeniería Mecánica STC</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Código de Proyecto STC *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej: STC-PIP-2026-001"
                    value={newProjectForm.code}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Línea de Negocio / Especialidad *</label>
                  <CreatableSelect
                    value={
                      newProjectForm.projectType === 'piping' ? 'Tuberías de Alta Presión (Piping)' :
                      newProjectForm.projectType === 'estructuras' ? 'Estructuras Metálicas Pesadas' :
                      newProjectForm.projectType === 'tanques' ? 'Tanques de Almacenamiento (API 650)' :
                      'Montaje Industrial Integral'
                    }
                    onChange={(val) => {
                      if (val.includes('Piping')) setNewProjectForm({ ...newProjectForm, projectType: 'piping' });
                      else if (val.includes('Estructuras')) setNewProjectForm({ ...newProjectForm, projectType: 'estructuras' });
                      else if (val.includes('Tanques')) setNewProjectForm({ ...newProjectForm, projectType: 'tanques' });
                      else setNewProjectForm({ ...newProjectForm, projectType: 'montaje_integral' });
                    }}
                    options={[
                      'Tuberías de Alta Presión (Piping)',
                      'Estructuras Metálicas Pesadas',
                      'Tanques de Almacenamiento (API 650)',
                      'Montaje Industrial Integral',
                    ]}
                    placeholder="Especialidad..."
                    allowCustomText={false}
                    
                    inputClassName="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Nombre Descriptivo de la Obra *</label>
                <input
                  type="text"
                  required
                  placeholder="ej: Montaje Sistema de Tuberías de Vapor Refinería"
                  value={newProjectForm.name}
                  onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Cliente Contratante</label>
                  <input
                    type="text"
                    placeholder="ej: Ecopetrol / Argos"
                    value={newProjectForm.client}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, client: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Número de Contrato</label>
                  <input
                    type="text"
                    placeholder="ej: CT-2026-992"
                    value={newProjectForm.contractNumber}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, contractNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              {/* Dynamic Engine Fields según Especialidad */}
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Variables Dinámicas de Ingeniería STC ({newProjectForm.projectType.toUpperCase()})
                </span>

                {newProjectForm.projectType === 'piping' && (
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px]">Diámetro Nominal (Pulg)</label>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={newProjectForm.pipingDiameterInches}
                        onChange={(e) => setNewProjectForm({ ...newProjectForm, pipingDiameterInches: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px]">Presión Diseño (PSI)</label>
                      <input
                        type="number"
                        value={newProjectForm.pipingPressurePSI}
                        onChange={(e) => setNewProjectForm({ ...newProjectForm, pipingPressurePSI: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px]">Cédula (Schedule)</label>
                      <CreatableSelect
                        value={newProjectForm.pipingSchedule}
                        onChange={(val) => setNewProjectForm({ ...newProjectForm, pipingSchedule: (val || 'SCH 40') as any })}
                        options={['SCH 10', 'SCH 40', 'SCH 80', 'SCH 160']}
                        placeholder="Schedule..."
                        allowCustomText={false}
                        
                        inputClassName="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {newProjectForm.projectType === 'estructuras' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px]">Tonelaje Total Estimado (Ton)</label>
                      <input
                        type="number"
                        min="1"
                        value={newProjectForm.structuresTonnage}
                        onChange={(e) => setNewProjectForm({ ...newProjectForm, structuresTonnage: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px]">Perfilería Predominante</label>
                      <input
                        type="text"
                        disabled
                        value="Perfiles W / IPE / ASTM A572 Gr 50"
                        className="w-full bg-slate-900/50 border border-slate-800 rounded px-2.5 py-1.5 text-slate-400"
                      />
                    </div>
                  </div>
                )}

                {newProjectForm.projectType === 'tanques' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px]">Capacidad Volumétrica (m³)</label>
                      <input
                        type="number"
                        value={newProjectForm.tanksCapacityM3}
                        onChange={(e) => setNewProjectForm({ ...newProjectForm, tanksCapacityM3: Number(e.target.value) })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[10px]">Norma Constructiva</label>
                      <CreatableSelect
                        value={
                          newProjectForm.tanksStandard === 'API 650' ? 'API 650 (Tanques Soldados de Petróleo/Agua)' :
                          newProjectForm.tanksStandard === 'API 620' ? 'API 620 (Baja Presión)' :
                          'UL 142 (Tanques Aéreos Combustible)'
                        }
                        onChange={(val) => {
                          if (val.includes('API 650')) setNewProjectForm({ ...newProjectForm, tanksStandard: 'API 650' });
                          else if (val.includes('API 620')) setNewProjectForm({ ...newProjectForm, tanksStandard: 'API 620' });
                          else setNewProjectForm({ ...newProjectForm, tanksStandard: 'UL 142' });
                        }}
                        options={[
                          'API 650 (Tanques Soldados de Petróleo/Agua)',
                          'API 620 (Baja Presión)',
                          'UL 142 (Tanques Aéreos Combustible)',
                        ]}
                        placeholder="Norma..."
                        allowCustomText={false}
                        
                        inputClassName="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white text-[11px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Presupuesto Línea Base (USD)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newProjectForm.baselineBudgetUSD}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, baselineBudgetUSD: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-semibold">Radio de Geocerca (Metros)</label>
                  <input
                    type="number"
                    min="50"
                    max="2000"
                    value={newProjectForm.geofenceRadiusMeters}
                    onChange={(e) => setNewProjectForm({ ...newProjectForm, geofenceRadiusMeters: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg cursor-pointer"
                >
                  Registrar en Firestore
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

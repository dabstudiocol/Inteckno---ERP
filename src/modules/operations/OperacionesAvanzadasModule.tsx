import React, { useState, useEffect, useMemo } from 'react';
import {
  Wrench,
  Hammer,
  Factory,
  Cog,
  FileCode2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Calendar,
  Settings,
  Plus,
  ArrowRight,
  ShieldCheck,
  FileText,
  User,
  Trash2,
  ExternalLink,
  Package,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';


interface OperacionesProps {
  initialSubTab?: 'mantenimiento' | 'reparacion' | 'manufactura' | 'taller' | 'plm';
}

interface WorkOrderOT {
  id: string;
  code: string;
  projectId: string;
  projectCode: string;
  component: string;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  technician: string;
  description: string;
  status: 'diagnostico' | 'en_reparacion' | 'pruebas_banco' | 'completada';
  createdAt: string;
}

interface ManufacturingOrder {
  id: string;
  code: string;
  partName: string;
  material: string;
  quantity: number;
  projectCode: string;
  stage: 'corte' | 'torno_cnc' | 'fresado' | 'tratamiento_termico' | 'listo_almacen';
  createdAt: string;
}

interface BenchTestRecord {
  id: string;
  testCode: string;
  gripSerial: string;
  gripType: string;
  clampingForceKN: number;
  requiredForceKN: number;
  verdict: 'conforme' | 'no_conforme';
  technician: string;
  testDate: string;
}

const STORAGE_KEY_OTS = 'itk_operaciones_ots';
const STORAGE_KEY_MANUF = 'itk_operaciones_manuf';
const STORAGE_KEY_TESTS = 'itk_operaciones_bench_tests';

export const OperacionesAvanzadasModule: React.FC<OperacionesProps> = ({
  initialSubTab = 'mantenimiento',
}) => {
  const {
    maintenancePlans,
    completeMaintenance,
    createMaintenancePlan,
    activeModuleId,
    projects,
    users,
    setActiveModule,
    notify,
    workOrders,
    manufacturingOrders,
    benchTests,
    createWorkOrder,
    updateWorkOrder,
    deleteWorkOrder,
    createManufacturingOrder,
    updateManufacturingOrder,
    deleteManufacturingOrder,
    createBenchTest,
    deleteBenchTest,
    navigateWithContext,
  } = useErp();
  
  const currentTab = (activeModuleId === 'reparacion' || activeModuleId === 'manufactura' || activeModuleId === 'taller' || activeModuleId === 'plm' || activeModuleId === 'mantenimiento')
    ? (activeModuleId as 'mantenimiento' | 'reparacion' | 'manufactura' | 'taller' | 'plm')
    : initialSubTab;

  const [activeTab, setActiveTab] = useState<'mantenimiento' | 'reparacion' | 'manufactura' | 'taller' | 'plm'>(currentTab);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Catálogos dinámicos editables por Inteckno
  const catalogComponents = useModuleCatalog('mantenimiento', 'criticalComponents');
  const catalogFrequencies = useModuleCatalog('mantenimiento', 'frequencies');
  const catalogOtPriorities = useModuleCatalog('mantenimiento', 'otPriorities');

  // Órdenes de Trabajo (OT), Lotes CNC y Ensayos de Banco sincronizados en tiempo real vía Google Cloud Firestore

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    } else if (activeModuleId && ['mantenimiento', 'reparacion', 'manufactura', 'taller', 'plm'].includes(activeModuleId)) {
      setActiveTab(activeModuleId as any);
    }
  }, [initialSubTab, activeModuleId]);

  // Modal Crear Plan de Mantenimiento
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);
  const [planComponent, setPlanComponent] = useState('Pinzas Desembragables');
  const [planProjectCode, setPlanProjectCode] = useState(projects[0]?.code || 'STC-GENERAL');
  const [planSystemName, setPlanSystemName] = useState('Teleférico Monocable Desembragable');
  const [planFrequency, setPlanFrequency] = useState<'Mensual' | 'Trimestral' | 'Semestral' | 'Anual'>('Semestral');
  const [planNextDueDate, setPlanNextDueDate] = useState(
    new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [planTechnician, setPlanTechnician] = useState('');

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    createMaintenancePlan({
      projectCode: planProjectCode,
      systemName: planSystemName,
      component: planComponent as any,
      frequency: planFrequency,
      nextDueDate: planNextDueDate,
      responsibleTechnician: planTechnician || 'Técnico Especialista STC',
    });
    setIsNewPlanModalOpen(false);
  };

  // Modal Crear OT
  const [isOtModalOpen, setIsOtModalOpen] = useState(false);
  const [otProject, setOtProject] = useState(projects[0]?.id || '');
  const [otItemCode, setOtItemCode] = useState<string>('');

  const availableOtProjectItems = React.useMemo(() => {
    const proj = projects.find((p) => p.id === otProject);
    if (!proj) return [];
    const items = (((proj as any)?.projectItems || (proj as any)?.items || []) as any[]);
    const formatted = items.map((it: any) => ({
      id: it.code,
      name: `${it.code} — ${it.name}`,
      code: it.code,
    }));
    return [
      ...formatted,
      { id: 'INDIRECTO', name: '[ Labores Generales de Teleférico ]', code: 'INDIRECTO' },
    ];
  }, [projects, otProject]);

  React.useEffect(() => {
    if (availableOtProjectItems.length > 0) {
      if (!availableOtProjectItems.some((i) => i.code === otItemCode)) {
        setOtItemCode(availableOtProjectItems[0]?.code || '');
      }
    } else {
      setOtItemCode('');
    }
  }, [otProject, availableOtProjectItems]);
  const [otComponent, setOtComponent] = useState('Pinza Desembragable');
  const [otPriority, setOtPriority] = useState<'baja' | 'media' | 'alta' | 'urgente'>('media');
  const [otTechnician, setOtTechnician] = useState('');
  const [otDescription, setOtDescription] = useState('');

  const handleCreateOt = (e: React.FormEvent) => {
    e.preventDefault();
    const prj = projects.find((p) => p.id === otProject) || projects[0];
    const newOt = createWorkOrder({
      code: `OT-${new Date().getFullYear()}-${String(workOrders.length + 1).padStart(3, '0')}`,
      projectId: prj?.id || '',
      projectCode: prj?.code || 'STC-GENERAL',
      itemCode: otItemCode || undefined,
      component: otComponent,
      priority: otPriority,
      technician: otTechnician || 'Técnico Especialista STC',
      description: otDescription || 'Intervención electromecánica programada.',
      status: 'diagnostico',
    });
    setIsOtModalOpen(false);
    setOtDescription('');
    notify?.('success', 'Orden de Trabajo Creada', `Se registró la ${newOt.code} para el componente ${otComponent}.`);
  };

  // Modal Crear Manufactura
  const [isManufModalOpen, setIsManufModalOpen] = useState(false);
  const [manufPartName, setManufPartName] = useState('');
  const [manufMaterial, setManufMaterial] = useState('Acero 4140 Tratado');
  const [manufQty, setManufQty] = useState(1);
  const [manufProjectId, setManufProjectId] = useState(projects[0]?.id || 'STOCK-ITK');
  const [manufItemCode, setManufItemCode] = useState<string>('');

  const availableManufProjectItems = useMemo(() => {
    if (manufProjectId === 'STOCK-ITK') return [];
    const proj = projects.find((p) => p.id === manufProjectId);
    if (!proj) return [];
    const items = (((proj as any)?.projectItems || (proj as any)?.items || []) as any[]);
    return items.map((it: any) => ({
      id: it.code,
      name: `${it.code} — ${it.name}`,
      code: it.code,
    }));
  }, [projects, manufProjectId]);

  useEffect(() => {
    if (availableManufProjectItems.length > 0) {
      if (!availableManufProjectItems.some((i) => i.code === manufItemCode)) {
        setManufItemCode(availableManufProjectItems[0]?.code || '');
      }
    } else {
      setManufItemCode('');
    }
  }, [manufProjectId, availableManufProjectItems]);

  const handleCreateManuf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manufPartName.trim()) return;
    const selProject = projects.find((p) => p.id === manufProjectId);
    const newOrder = createManufacturingOrder({
      code: `OF-${new Date().getFullYear()}-${String(manufacturingOrders.length + 1).padStart(3, '0')}`,
      partName: manufPartName,
      material: manufMaterial,
      quantity: Math.max(1, Number(manufQty) || 1),
      projectId: selProject?.id,
      projectCode: selProject ? selProject.code : 'STOCK-ITK',
      itemCode: manufItemCode || undefined,
      stage: 'corte',
    });
    setIsManufModalOpen(false);
    setManufPartName('');
    notify?.('success', 'Orden de Fabricación Creada', `Se programó el maquinado de ${newOrder.partName}.`);
  };

  // Modal Registrar Ensayo Banco
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testProjectId, setTestProjectId] = useState(projects[0]?.id || '');
  const [testItemCode, setTestItemCode] = useState<string>('');
  const [testSerial, setTestSerial] = useState('');
  const [testGripType, setTestGripType] = useState<string>('');
  const [testForce, setTestForce] = useState<number>(0);
  const [testRequired, setTestRequired] = useState<number>(0);
  const [testTechnician, setTestTechnician] = useState('');

  const availableTestProjectItems = useMemo(() => {
    const proj = projects.find((p) => p.id === testProjectId);
    if (!proj) return [];
    const items = (((proj as any)?.projectItems || (proj as any)?.items || []) as any[]);
    return items.map((it: any) => ({
      id: it.code,
      name: `${it.code} — ${it.name}`,
      code: it.code,
    }));
  }, [projects, testProjectId]);

  useEffect(() => {
    if (availableTestProjectItems.length > 0) {
      if (!availableTestProjectItems.some((i) => i.code === testItemCode)) {
        setTestItemCode(availableTestProjectItems[0]?.code || '');
      }
    } else {
      setTestItemCode('');
    }
  }, [testProjectId, availableTestProjectItems]);

  const handleCreateTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSerial.trim()) return;
    const selPrj = projects.find((p) => p.id === testProjectId);
    const verdict = Number(testForce) >= Number(testRequired) ? 'conforme' : 'no_conforme';
    const newTest = createBenchTest({
      testCode: `ENS-${new Date().getFullYear()}-${String(benchTests.length + 1).padStart(3, '0')}`,
      projectId: selPrj?.id,
      projectCode: selPrj?.code,
      itemCode: testItemCode || undefined,
      gripSerial: testSerial.trim(),
      gripType: testGripType,
      clampingForceKN: Number(testForce),
      requiredForceKN: Number(testRequired),
      verdict,
      technician: testTechnician || 'Ingeniero de Ensayos STC',
      testDate: new Date().toISOString().split('T')[0],
    });
    setIsTestModalOpen(false);
    setTestSerial('');
    notify?.(
      verdict === 'conforme' ? 'success' : 'warning',
      `Ensayo ${newTest.testCode} Registrado`,
      `Fuerza: ${testForce} kN vs Req: ${testRequired} kN. Resultado: ${verdict.toUpperCase()}`
    );
  };

  return (
    <div className="space-y-6">

      {/* 1. MANTENIMIENTO PREVENTIVO */}
      {activeTab === 'mantenimiento' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Planes de Mantenimiento Preventivo por Componente Crítico
              </h3>
              <span className="text-xs text-gray-500">Conforme a Normas EN 1709 / EN 12929</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer"
              >
                <Settings size={14} className="text-[#00668F]" />
                <span>Configurar</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (projects.length > 0) setPlanProjectCode(projects[0].code);
                  setIsNewPlanModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                <Plus size={14} />
                <span>+ Programar Plan de Mantenimiento</span>
              </button>
            </div>
          </div>

          {maintenancePlans.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#00668F] flex items-center justify-center mx-auto">
                <Wrench size={24} />
              </div>
              <h4 className="font-bold text-gray-900 text-sm">Sin planes preventivos programados</h4>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Crea ciclos de inspección periódica para pinzas, cables, grupos motrices o pilonas bajo normas EN 1709 / EN 12929.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (projects.length > 0) setPlanProjectCode(projects[0].code);
                  setIsNewPlanModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#00668F] text-white text-xs font-bold hover:bg-[#005073] cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
              >
                <Plus size={14} />
                <span>Programar Primer Plan</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maintenancePlans.map((plan) => (
              <div key={plan.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#00668F] bg-sky-50 px-2 py-0.5 rounded-md font-mono">
                    {plan.code} • {plan.projectCode}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      plan.status === 'al_dia'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {plan.status === 'al_dia' ? 'Al Día' : 'Próximo a Vencer'}
                  </span>
                </div>

                <h4 className="font-bold text-gray-900 text-sm">{plan.component}</h4>
                <div className="text-xs text-gray-600">{plan.systemName}</div>

                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl">
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Frecuencia:</span>
                    <span className="font-semibold text-gray-800">{plan.frequency}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block font-medium">Próximo Vencimiento:</span>
                    <span className="font-semibold text-gray-800">{plan.nextDueDate}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Responsable: <strong>{plan.responsibleTechnician}</strong>
                  </span>
                  <button
                    onClick={() => completeMaintenance(plan.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <CheckCircle2 size={13} />
                    Registrar Inspección
                  </button>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>
      )}

      {/* 2. REPARACIÓN & ÓRDENES DE TRABAJO */}
      {activeTab === 'reparacion' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Órdenes de Trabajo de Reparación Electromecánica (OT)</h3>
              <p className="text-xs text-gray-500">Gestión de diagnósticos, desmontajes, overhauls y reparaciones mayores de componentes STC.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOtModalOpen(true)}
              className="px-4 py-2 bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>+ Nueva Orden de Trabajo (OT)</span>
            </button>
          </div>

          {workOrders.length === 0 ? (
            <div className="p-10 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <Hammer size={36} className="mx-auto mb-2 text-[#00668F] opacity-40" />
              <p className="text-xs font-bold text-gray-700">No hay órdenes de reparación activas</p>
              <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                Registra una nueva OT para componentes mecánicos o eléctricos asignados a un proyecto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {workOrders.map((ot) => (
                <div key={ot.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        if (ot.projectId) {
                          navigateWithContext('proyectos', 'view_project', { projectId: ot.projectId, tab: 'dashboard' });
                        }
                      }}
                      className="font-mono font-bold text-xs text-[#00668F] bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5 transition-colors cursor-pointer text-left"
                      title={ot.projectId ? `Ir al Proyecto ${ot.projectCode}` : undefined}
                    >
                      <span>{ot.code} • {ot.projectCode}</span>
                      {ot.itemCode && (
                        <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {ot.itemCode}
                        </span>
                      )}
                    </button>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      ot.priority === 'urgente' ? 'bg-rose-100 text-rose-800' :
                      ot.priority === 'alta' ? 'bg-amber-100 text-amber-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {ot.priority}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{ot.component}</h4>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2">{ot.description}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-500 font-medium">Resp: <strong>{ot.technician}</strong></span>
                    <span className={`font-bold text-[10px] px-2 py-0.5 rounded-md ${
                      ot.status === 'completada' ? 'bg-emerald-100 text-emerald-800' :
                      ot.status === 'pruebas_banco' ? 'bg-purple-100 text-purple-800' :
                      'bg-sky-100 text-sky-800'
                    }`}>
                      {ot.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigateWithContext('requisiciones', 'create_req_from_ot', {
                          otId: ot.id,
                          otCode: ot.code,
                          projectId: ot.projectId,
                          projectCode: ot.projectCode,
                          itemCode: ot.itemCode,
                          component: ot.component,
                          justification: `Repuestos y consumibles para Orden Técnica ${ot.code} (${ot.component} - ${ot.projectCode}).`,
                        });
                      }}
                      className="w-full py-1.5 px-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-[#00668F] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      title="Solicitar repuestos o materiales a Compras (SOLPED) para esta OT"
                    >
                      <Package size={13} />
                      <span>Pedir Repuestos (SOLPED)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. MANUFACTURA DE PIEZAS */}
      {activeTab === 'manufactura' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Fabricación y Maquinado Especializado de Componentes STC</h3>
              <p className="text-xs text-gray-500">Trazabilidad de corte, torneado CNC, fresado y tratamientos térmicos para repuestos de teleféricos.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsManufModalOpen(true)}
              className="px-4 py-2 bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>+ Nueva Orden de Fabricación (OF)</span>
            </button>
          </div>

          {manufacturingOrders.length === 0 ? (
            <div className="p-10 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <Cog size={36} className="mx-auto mb-2 text-[#00668F] opacity-40" />
              <p className="text-xs font-bold text-gray-700">No hay lotes de fabricación en curso</p>
              <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                Registra órdenes de maquinado de bujes, rodillos o pines con enlace directo al stock de almacén.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {manufacturingOrders.map((mo) => (
                <div key={mo.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#00668F] bg-sky-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5">
                      <span>{mo.code}</span>
                      {mo.projectCode && mo.projectCode !== 'STOCK-ITK' && (
                        <span className="text-slate-600 font-normal">• {mo.projectCode}</span>
                      )}
                      {mo.itemCode && (
                        <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {mo.itemCode}
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-800">
                      Cant: {mo.quantity} unid
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{mo.partName}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Material: <strong className="text-slate-800">{mo.material}</strong></p>
                    <p className="text-xs text-slate-500">
                      Destino:{' '}
                      {mo.projectId && mo.projectCode !== 'STOCK-ITK' ? (
                        <button
                          type="button"
                          onClick={() => navigateWithContext('proyectos', 'view_project', { projectId: mo.projectId, tab: 'costs' })}
                          className="font-bold text-[#00668F] hover:underline cursor-pointer"
                          title={`Ir al Proyecto ${mo.projectCode}`}
                        >
                          {mo.projectCode}
                        </button>
                      ) : (
                        <strong className="text-slate-800">{mo.projectCode}</strong>
                      )}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-2 py-0.5 rounded uppercase">
                      Fase: {mo.stage.replace('_', ' ')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigateWithContext('inventario', 'view_product', { query: mo.partName });
                        notify?.('info', 'Traspaso a Inventario', `La pieza ${mo.partName} está lista para recepción en Bodega.`);
                      }}
                      className="text-xs font-bold text-[#00668F] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Ingresar a Stock</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. TALLER & BANCO DE PRUEBAS */}
      {activeTab === 'taller' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Banco Hidráulico de Ensayo de Pinzas Desembragables (Norma EN 1709)</h3>
              <p className="text-xs text-gray-500">Calibración de resortes helicoidales, ensayos de fuerza de retención y certificado técnico de mordazas.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsTestModalOpen(true)}
              className="px-4 py-2 bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              <span>+ Registrar Ensayo de Pinza</span>
            </button>
          </div>

          {benchTests.length === 0 ? (
            <div className="p-10 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
              <Factory size={36} className="mx-auto mb-2 text-[#00668F] opacity-40" />
              <p className="text-xs font-bold text-gray-700">Sin ensayos en banco registrados</p>
              <p className="text-[11px] text-gray-500 mt-1 max-w-sm mx-auto">
                Registra las pruebas de fuerza de pinza en banco hidráulico para emisión de certificados de conformidad EN 1709.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
              {benchTests.map((t) => (
                <div key={t.id} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-[#00668F] bg-sky-50 px-2 py-0.5 rounded-md inline-flex items-center gap-1.5">
                      <span>{t.testCode}</span>
                      {t.projectCode && (
                        t.projectId ? (
                          <button
                            type="button"
                            onClick={() => navigateWithContext('proyectos', 'view_project', { projectId: t.projectId, tab: 'dashboard' })}
                            className="text-[#00668F] font-bold hover:underline cursor-pointer"
                            title={`Ir al Proyecto ${t.projectCode}`}
                          >
                            • {t.projectCode}
                          </button>
                        ) : (
                          <span className="text-slate-600 font-normal">• {t.projectCode}</span>
                        )
                      )}
                      {t.itemCode && (
                        <span className="px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 text-[10px] font-bold">
                          {t.itemCode}
                        </span>
                      )}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      t.verdict === 'conforme' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {t.verdict === 'conforme' ? '✓ Conforme EN 1709' : '✗ No Conforme'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Pinza Serial: {t.gripSerial}</h4>
                    <p className="text-xs text-slate-500 mt-0.5">{t.gripType}</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Fuerza Obtenida:</span>
                      <strong className="text-slate-900 font-mono text-sm">{t.clampingForceKN} kN</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Mínimo Exigido:</span>
                      <strong className="text-slate-900 font-mono text-sm">{t.requiredForceKN} kN</strong>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex justify-between pt-1 border-t border-slate-100">
                    <span>Ensayo: {t.testDate}</span>
                    <span>Técnico: <strong>{t.technician}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. PLM & ESPECIFICACIONES TÉCNICAS */}
      {activeTab === 'plm' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Biblioteca PLM & Normativa Técnica Oficial STC</h3>
              <p className="text-xs text-gray-500">Criterios de diseño, tolerancias y especificaciones europeas e internacionales aplicables a Inteckno.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveModule('documentos')}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText size={14} className="text-[#00668F]" />
              <span>Ver Planos y Manuales en Gestor Documental</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md">UNE EN 12927:2019</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">Vigente</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Cables Tractores y Portadores para Transporte de Personas</h4>
              <p className="text-xs text-slate-600">Requisitos de seguridad para empalmes, terminales de cable, ensayos no destructivos magneto-inductivos (MRT) y criterios de descarte por roturas de alambres.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md">EN 1709:2019</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">Vigente</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Pinzas Desembragables y Sistemas de Fijación</h4>
              <p className="text-xs text-slate-600">Cálculo y verificación de fuerza de apriete, control de desgaste en mordazas y protocolos de ensayo en banco hidráulico.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md">EN 12929-1:2015</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">Vigente</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Disposiciones Generales de Seguridad en Teleféricos</h4>
              <p className="text-xs text-slate-600">Geometría de la línea, distancias de gálibo entre vehículos y obstáculos, cargas de viento admisibles y estaciones motrices.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-md">EN 1908:2015</span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">Vigente</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">Grupos Motrices, Volantes y Frenos</h4>
              <p className="text-xs text-slate-600">Requisitos para frenos de servicio y de seguridad que actúan directamente sobre la polea motriz, tiempos de deceleración e inspección.</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear OT */}
      {isOtModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Nueva Orden de Trabajo (OT) de Reparación</h3>
            <form onSubmit={handleCreateOt} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Proyecto Asignado</label>
                  <select
                    value={otProject}
                    onChange={(e) => setOtProject(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Ítem Contractual (Plan 1)</label>
                  <select
                    value={otItemCode}
                    onChange={(e) => setOtItemCode(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  >
                    {availableOtProjectItems.map((it) => (
                      <option key={it.id} value={it.code}>{it.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Componente STC</label>
                <input
                  type="text"
                  value={otComponent}
                  onChange={(e) => setOtComponent(e.target.value)}
                  placeholder="ej. Mordaza, Pilona 4, Balancín de entrada..."
                  className="w-full p-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Prioridad</label>
                  <select
                    value={otPriority}
                    onChange={(e) => setOtPriority(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Técnico Asignado</label>
                  <input
                    type="text"
                    value={otTechnician}
                    onChange={(e) => setOtTechnician(e.target.value)}
                    placeholder="Nombre del técnico..."
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Diagnóstico / Descripción de la Falla</label>
                <textarea
                  value={otDescription}
                  onChange={(e) => setOtDescription(e.target.value)}
                  rows={3}
                  placeholder="Detalla la intervención requerida..."
                  className="w-full p-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOtModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold"
                >
                  Crear Orden de Trabajo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Crear Manufactura */}
      {isManufModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Nueva Orden de Fabricación y Maquinado (OF)</h3>
            <form onSubmit={handleCreateManuf} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Nombre de la Pieza / Repuesto</label>
                <input
                  type="text"
                  value={manufPartName}
                  onChange={(e) => setManufPartName(e.target.value)}
                  placeholder="ej. Buje cónico de bronce para pilona..."
                  className="w-full p-2 border border-slate-300 rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Material</label>
                  <input
                    type="text"
                    value={manufMaterial}
                    onChange={(e) => setManufMaterial(e.target.value)}
                    placeholder="ej. Acero 4140, Bronce..."
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Cantidad (unid)</label>
                  <input
                    type="number"
                    value={manufQty || ''}
                    placeholder="0"
                    onChange={(e) => setManufQty(Number(e.target.value))}
                    min={1}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Proyecto / Destino</label>
                  <select
                    value={manufProjectId}
                    onChange={(e) => setManufProjectId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  >
                    <option value="STOCK-ITK">Bodega Central (Stock Inteckno)</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
                {availableManufProjectItems.length > 0 && (
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Ítem Contractual (Plan 1)</label>
                    <select
                      value={manufItemCode}
                      onChange={(e) => setManufItemCode(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded-xl"
                    >
                      {availableManufProjectItems.map((it) => (
                        <option key={it.id} value={it.code}>{it.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManufModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold"
                >
                  Programar Maquinado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Registrar Ensayo Banco */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">Registrar Ensayo en Banco Hidráulico (EN 1709)</h3>
            <form onSubmit={handleCreateTest} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Proyecto STC Asociado</label>
                  <select
                    value={testProjectId}
                    onChange={(e) => setTestProjectId(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                  >
                    <option value="">-- Sin Proyecto / Taller General --</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Ítem Contractual (Plan 1)</label>
                  <select
                    value={testItemCode}
                    onChange={(e) => setTestItemCode(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                    disabled={availableTestProjectItems.length === 0}
                  >
                    <option value="">{availableTestProjectItems.length === 0 ? '-- Selecciona un proyecto --' : '-- General / Sin Ítem --'}</option>
                    {availableTestProjectItems.map((it) => (
                      <option key={it.id} value={it.code}>{it.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Serial de la Pinza / Mordaza</label>
                <input
                  type="text"
                  value={testSerial}
                  onChange={(e) => setTestSerial(e.target.value)}
                  placeholder="ej. PZ-2026-089..."
                  className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Fuerza Obtenida (kN)</label>
                  <input
                    type="number"
                    value={testForce || ''}
                    placeholder="0"
                    onChange={(e) => setTestForce(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Exigido por Norma (kN)</label>
                  <input
                    type="number"
                    value={testRequired || ''}
                    placeholder="0"
                    onChange={(e) => setTestRequired(Number(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono font-bold"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-600 font-bold mb-1">Técnico Calibrador</label>
                <input
                  type="text"
                  value={testTechnician}
                  onChange={(e) => setTestTechnician(e.target.value)}
                  placeholder="Nombre del técnico o ingeniero..."
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold"
                >
                  Guardar Certificado de Ensayo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

            {/* Modal Crear Plan de Mantenimiento Preventivo (EN 1709 / EN 12929) */}
      {isNewPlanModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Wrench size={18} className="text-[#00668F]" />
                <span>Programar Plan de Mantenimiento Preventivo</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewPlanModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Proyecto STC Asociado *</label>
                  <select
                    value={planProjectCode}
                    onChange={(e) => setPlanProjectCode(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl"
                    required
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.code}>{p.code} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Frecuencia de Inspección *</label>
                  <select
                    value={planFrequency}
                    onChange={(e) => setPlanFrequency(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-medium"
                  >
                    <option value="Mensual">Mensual (30 días)</option>
                    <option value="Trimestral">Trimestral (90 días)</option>
                    <option value="Semestral">Semestral (180 días)</option>
                    <option value="Anual">Anual (360 días)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Componente Crítico Intervenido *</label>
                <CreatableSelect
                  options={[
                    { id: 'Pinzas Desembragables', name: 'Pinzas Desembragables' },
                    { id: 'Balancines y Poleas', name: 'Balancines y Tren de Poleas' },
                    { id: 'Cable Tractor/Portador', name: 'Cable Tractor o Portador' },
                    { id: 'Volante Motriz/Retorno', name: 'Volante Motriz y de Retorno' },
                    { id: 'Reductor Principal', name: 'Reductor Principal y Grupo Motriz' },
                    { id: 'Frenos de Seguridad', name: 'Frenos de Emergencia y Servicio' },
                    { id: 'Cabinas y Suspensión', name: 'Cabinas y Brazo de Suspensión' },
                  ]}
                  value={planComponent}
                  onChange={(val) => setPlanComponent(val)}
                  placeholder="Seleccionar o escribir componente..."
                  allowCustomText={true}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Sistema / Línea de Teleférico *</label>
                <input
                  type="text"
                  required
                  value={planSystemName}
                  onChange={(e) => setPlanSystemName(e.target.value)}
                  placeholder="ej. Metrocable Línea K / Cable Aéreo Manizales"
                  className="w-full p-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Fecha Próximo Vencimiento *</label>
                  <input
                    type="date"
                    required
                    value={planNextDueDate}
                    onChange={(e) => setPlanNextDueDate(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Técnico Responsable STC</label>
                  <CreatableSelect
                    options={users.map((u) => ({ id: u.name, name: u.name }))}
                    value={planTechnician}
                    onChange={(val) => setPlanTechnician(val)}
                    placeholder="Seleccionar técnico..."
                    allowCustomText={true}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewPlanModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} />
                  <span>Guardar Plan Preventivo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="mantenimiento"
        moduleTitle="Mantenimiento & Operaciones Avanzadas"
      />
    </div>
  );
};

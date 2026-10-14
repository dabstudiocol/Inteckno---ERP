import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';

interface OperacionesProps {
  initialSubTab?: 'mantenimiento' | 'reparacion' | 'manufactura' | 'taller' | 'plm';
}

export const OperacionesAvanzadasModule: React.FC<OperacionesProps> = ({
  initialSubTab = 'mantenimiento',
}) => {
  const { maintenancePlans, completeMaintenance, activeModuleId } = useErp();
  
  const currentTab = (activeModuleId === 'reparacion' || activeModuleId === 'manufactura' || activeModuleId === 'taller' || activeModuleId === 'plm' || activeModuleId === 'mantenimiento')
    ? (activeModuleId as 'mantenimiento' | 'reparacion' | 'manufactura' | 'taller' | 'plm')
    : initialSubTab;

  const [activeTab, setActiveTab] = useState<'mantenimiento' | 'reparacion' | 'manufactura' | 'taller' | 'plm'>(currentTab);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Catálogos dinámicos editables por Inteckno
  const catalogComponents = useModuleCatalog('mantenimiento', 'criticalComponents');
  const catalogFrequencies = useModuleCatalog('mantenimiento', 'frequencies');
  const catalogOtPriorities = useModuleCatalog('mantenimiento', 'otPriorities');

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    } else if (activeModuleId && ['mantenimiento', 'reparacion', 'manufactura', 'taller', 'plm'].includes(activeModuleId)) {
      setActiveTab(activeModuleId as any);
    }
  }, [initialSubTab, activeModuleId]);

  return (
    <div className="space-y-6">

      {/* 1. MANTENIMIENTO PREVENTIVO */}
      {activeTab === 'mantenimiento' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Planes de Mantenimiento Preventivo por Componente Crítico
              </h3>
              <span className="text-xs text-gray-500">Conforme a Normas EN 1709 / EN 12929</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {maintenancePlans.map((plan) => (
              <div key={plan.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#00668F] bg-sky-50 px-2 py-0.5 rounded-md">
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
        </div>
      )}

      {/* 2. REPARACIÓN & ÓRDENES DE TRABAJO */}
      {activeTab === 'reparacion' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Órdenes de Trabajo de Reparación Electromecánica (OT)</h3>
              <p className="text-xs text-gray-500">Gestión de reparaciones mayores, bobinados y mantenimiento electromecánico.</p>
            </div>
          </div>
          <div className="p-8 text-center text-gray-400 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
            <Wrench size={32} className="mx-auto mb-2 opacity-40 text-[#00668F]" />
            <p className="text-xs font-bold text-gray-700">No hay órdenes de reparación activas</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Las nuevas órdenes de trabajo de taller o campo se registrarán aquí.</p>
          </div>
        </div>
      )}

      {/* 3. MANUFACTURA DE PIEZAS */}
      {activeTab === 'manufactura' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Fabricación y Maquinado Especializado de Componentes STC</h3>
              <p className="text-xs text-gray-500">Trazabilidad de torneado, fresado y tratamientos térmicos para repuestos.</p>
            </div>
          </div>
          <div className="p-8 text-center text-gray-400 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
            <Cog size={32} className="mx-auto mb-2 opacity-40 text-[#00668F]" />
            <p className="text-xs font-bold text-gray-700">No hay lotes de fabricación en curso</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Los lotes y fichas de maquinado programados se visualizarán en esta sección.</p>
          </div>
        </div>
      )}

      {/* 4. TALLER & BANCO DE PRUEBAS */}
      {activeTab === 'taller' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Banco Hidráulico de Ensayo de Pinzas Desembragables</h3>
              <p className="text-xs text-gray-500">Ensayos destructivos y no destructivos de mordazas y pinzas STC.</p>
            </div>
          </div>
          <div className="p-8 text-center text-gray-400 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
            <Factory size={32} className="mx-auto mb-2 opacity-40 text-[#00668F]" />
            <p className="text-xs font-bold text-gray-700">Sin ensayos en banco programados</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Registra calibraciones y pruebas de fuerza de retención en mordazas cuando se ejecuten.</p>
          </div>
        </div>
      )}

      {/* 5. PLM & ESPECIFICACIONES TÉCNICAS */}
      {activeTab === 'plm' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Ciclo de Vida de Producto y Especificaciones Normativas STC</h3>
              <p className="text-xs text-gray-500">Biblioteca técnica y criterios de diseño según normatividad vigente.</p>
            </div>
          </div>
          <div className="p-8 text-center text-gray-400 bg-slate-50 rounded-2xl border border-dashed border-gray-200">
            <FileCode2 size={32} className="mx-auto mb-2 opacity-40 text-[#00668F]" />
            <p className="text-xs font-bold text-gray-700">Sin especificaciones particulares registradas</p>
            <p className="text-[11px] text-gray-500 mt-0.5">Sube normas de referencia o especificaciones técnicas del fabricante en el Gestor Documental.</p>
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

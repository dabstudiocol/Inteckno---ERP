import React, { useState, useEffect } from 'react';
import { Search, X, FolderKanban, Wrench, Package, Users, Clock, Receipt, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';

interface SpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAction: (actionKey: string, payload?: any) => void;
}

export const SpotlightModal: React.FC<SpotlightModalProps> = ({
  isOpen,
  onClose,
  onSelectAction,
}) => {
  const { projects, products, equipment, partners, currentUser } = useErp();
  const [query, setQuery] = useState('');

  // Manejo de teclado (ESC y teclas)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  // Filtrado de Proyectos
  const matchingProjects = q
    ? projects.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.clientName.toLowerCase().includes(q)
      )
    : projects.slice(0, 3);

  // Filtrado de Productos / Repuestos
  const matchingProducts = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    : products.slice(0, 3);

  // Filtrado de Equipos Calibrados
  const matchingEquipment = q
    ? equipment.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q) ||
          e.serialNumber.toLowerCase().includes(q)
      )
    : equipment.slice(0, 2);

  // Acciones rápidas según el rol
  const quickActions = [
    { id: 'act-timesheet', label: 'Registrar horas de hoy (3 toques)', icon: Clock, module: 'timesheet' },
    { id: 'act-requisition', label: 'Pedir materiales a almacén / obra', icon: Package, module: 'requisitions' },
    { id: 'act-expense', label: 'Subir comprobante de gasto (con foto)', icon: Receipt, module: 'expenses' },
    { id: 'act-ddr', label: 'Completar Reporte Diario de Avance de Obra', icon: FileText, module: 'projects' },
    { id: 'act-hseq', label: 'Consultar liberación de Seguridad y Salud (SST) de cuadrilla', icon: ShieldCheck, module: 'hseq-gate' },
  ].filter((a) => !q || a.label.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Barra de Búsqueda */}
        <div className="relative flex items-center px-5 py-4">
          <Search size={20} className="text-[#00668F] mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar proyectos STC, repuestos, equipos calibrados, personas o acciones..."
            className="w-full text-base bg-transparent text-gray-800 placeholder-gray-400 focus:outline-hidden"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors ml-2"
          >
            <X size={18} />
          </button>
        </div>

        {/* Resultados */}
        <div className="overflow-y-auto p-4 space-y-4">
          {/* Acciones Rápidas */}
          {quickActions.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Acciones Rápidas
              </div>
              <div className="space-y-1">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.id}
                      onClick={() => {
                        onSelectAction(action.module);
                        onClose();
                      }}
                      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#EBF5FA] text-left text-sm text-gray-700 hover:text-[#00668F] transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-gray-100 group-hover:bg-[#00668F]/10 flex items-center justify-center text-gray-600 group-hover:text-[#00668F]">
                          <Icon size={15} />
                        </div>
                        <span className="font-medium">{action.label}</span>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-[#00668F] transition-transform group-hover:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Proyectos */}
          {matchingProjects.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Proyectos STC
              </div>
              <div className="space-y-1">
                {matchingProjects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSelectAction('projects', p.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-[#EBF5FA] text-left text-sm transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#00668F] flex items-center justify-center">
                        <FolderKanban size={15} />
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800 text-xs">
                          {p.code} — <span className="font-normal text-gray-600">{p.name}</span>
                        </div>
                        <div className="text-[11px] text-gray-400">{p.clientName} • {p.lineOfBusiness}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      SPI: {p.spi} | CPI: {p.cpi}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Catálogo y Repuestos */}
          {matchingProducts.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Repuestos e Inventario STC
              </div>
              <div className="space-y-1">
                {matchingProducts.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => {
                      onSelectAction('inventory', prod.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-emerald-50/60 text-left text-sm transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                        <Package size={15} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-xs">{prod.name}</div>
                        <div className="text-[11px] text-gray-500 font-medium">SKU: {prod.sku} • {prod.category}</div>
                      </div>
                    </div>
                    <span className={`text-[11px] font-semibold ${prod.availableStock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {prod.availableStock > 0 ? `${prod.availableStock} disp.` : 'Sin Stock (Auto-PO)'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Equipos Calibrados */}
          {matchingEquipment.length > 0 && (
            <div>
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                Instrumentos Técnicos y Calibraciones
              </div>
              <div className="space-y-1">
                {matchingEquipment.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => {
                      onSelectAction('inventory', eq.id);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-purple-50/60 text-left text-sm transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                        <Wrench size={15} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800 text-xs">{eq.name}</div>
                        <div className="text-[11px] text-gray-400">Serie: {eq.serialNumber} • Calibración: {eq.calibrationExpiry}</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${eq.isCalibrated ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {eq.isCalibrated ? 'Calibrado' : 'Descalibrado'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 flex items-center justify-between text-xs text-gray-400">
          <span>Navega con <kbd className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md font-bold text-[10px]">↑</kbd> <kbd className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md font-bold text-[10px]">↓</kbd></span>
          <span>Presiona <kbd className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md font-bold text-[10px]">ESC</kbd> para cerrar</span>
        </div>
      </div>
    </div>
  );
};

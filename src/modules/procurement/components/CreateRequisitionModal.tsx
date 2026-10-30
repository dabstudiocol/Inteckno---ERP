import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  X,
  Building2,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { useErp } from '../../../core/storage/erpStore';
import { useModuleCatalog } from '../../../core/services/moduleConfigService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface CreateRequisitionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RequisitionItemDraft {
  id: string;
  name: string;
  sku: string;
  qty: number;
  unit: string;
  estimatedPriceCOP?: number;
  availableStockInWarehouse?: number;
}

export const CreateRequisitionModal: React.FC<CreateRequisitionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { projects, products, currentUser, createRequisition } = useErp();

  // Catálogos dinámicos configurables por el usuario para el módulo de requisiciones
  const requisitionTypeOptions = useModuleCatalog('requisitions', 'requisitionTypes');
  const urgencyOptions = useModuleCatalog('requisitions', 'urgencies');

  const [reqType, setReqType] = useState<'project' | 'general'>('project');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [requisitionType, setRequisitionType] = useState<string>('');
  const [priority, setPriority] = useState<string>('');
  const [neededDate, setNeededDate] = useState<string>('');
  const [justification, setJustification] = useState<string>('');
  const [drawingVersion, setDrawingVersion] = useState<string>('');

  // Sincronizar selección inicial de catálogos dinámicos
  useEffect(() => {
    if (!requisitionType && requisitionTypeOptions.length > 0) {
      setRequisitionType(requisitionTypeOptions[0].name);
    }
  }, [requisitionTypeOptions, requisitionType]);

  useEffect(() => {
    if (!priority && urgencyOptions.length > 0) {
      const normalOpt = urgencyOptions.find((u) =>
        u.name.toLowerCase().includes('normal') || u.name.toLowerCase().includes('regular')
      );
      setPriority(normalOpt ? normalOpt.name : urgencyOptions[0].name);
    }
  }, [urgencyOptions, priority]);

  const [items, setItems] = useState<RequisitionItemDraft[]>([
    {
      id: `it-${Date.now()}`,
      name: '',
      sku: '',
      qty: 1,
      unit: 'unid',
    },
  ]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: `it-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: '',
        sku: '',
        qty: 1,
        unit: 'unid',
      },
    ]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((it) => it.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof RequisitionItemDraft, val: any) => {
    setItems(
      items.map((it) => {
        if (it.id === id) {
          return { ...it, [field]: val };
        }
        return it;
      })
    );
  };

  const handleSelectFromCatalog = (id: string, productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setItems(
      items.map((it) => {
        if (it.id === id) {
          return {
            ...it,
            name: prod.name,
            sku: prod.sku,
            unit: prod.unit || 'unid',
            estimatedPriceCOP: prod.costPriceCOP || 0,
            availableStockInWarehouse: prod.availableStock,
          };
        }
        return it;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar ítems
    const validItems = items.filter((it) => it.name.trim().length > 0);
    if (validItems.length === 0) {
      alert('Debes ingresar al menos un ítem o producto en la petición.');
      return;
    }

    const formattedItems = validItems.map((it) => {
      const matchProd = products.find(
        (p) => p.sku.toLowerCase() === it.sku.toLowerCase() || p.name.toLowerCase() === it.name.toLowerCase()
      );
      const inStock = matchProd ? matchProd.availableStock >= it.qty : false;

      return {
        productId: matchProd?.id || `REQ-ITEM-${Date.now()}`,
        productSku: it.sku.trim() || `GEN-${Date.now().toString().slice(-4)}`,
        productName: it.name.trim(),
        qtyRequested: Math.max(1, Number(it.qty) || 1),
        unit: it.unit || 'unid',
        inStock,
        availableStock: matchProd?.availableStock || 0,
      };
    });

    const isProj = reqType === 'project';
    const effectivePriority = priority || (urgencyOptions[0]?.name || 'Normal (Atención en Ventana Regular)');
    const effectiveReqType = requisitionType || (requisitionTypeOptions[0]?.name || 'Repuesto Crítico STC');

    createRequisition({
      requesterId: currentUser?.id || 'USR-01',
      requesterName: currentUser?.name || 'Usuario Inteckno',
      department: isProj ? (selectedProject?.code || 'Proyectos') : department,
      projectId: isProj ? selectedProject?.id : undefined,
      projectCode: isProj ? selectedProject?.code : 'OFICINA-ADMIN',
      projectName: isProj ? selectedProject?.name : `Petición General: ${department}`,
      neededDate,
      priority: effectivePriority,
      requisitionType: effectiveReqType,
      items: formattedItems,
      notes: justification || (isProj ? `Materiales [${effectiveReqType}] para ${selectedProject?.name}` : `Insumos [${effectiveReqType}] para ${department}`),
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Cabecera */}
        <div className="p-4 bg-[#003650] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 text-white">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Nueva Petición de Compra (Requisición Interna)</h3>
              <p className="text-xs text-slate-300">
                Petición formal para compras: materiales de proyectos STC o insumos de oficina y generales.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('inteckno:open-module-config'))}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-2.5"
              title="Configurar opciones de requisiciones"
            >
              <Settings size={15} />
              <span>Configuración</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            
            {/* Tipo de Petición: Proyecto vs General / Oficina */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <label className="font-bold text-slate-800 block text-xs">
                  1. Selecciona el Tipo y Destino de la Petición:
                </label>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setReqType('project')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    reqType === 'project'
                      ? 'bg-sky-50/70 border-[#003650] shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Briefcase size={18} className={reqType === 'project' ? 'text-[#003650]' : 'text-slate-400'} />
                  <div>
                    <strong className="block text-slate-900 text-xs font-bold">Materiales para Proyecto STC</strong>
                    <span className="text-[11px] text-slate-500">Repuestos, cables, componentes técnicos y obra</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setReqType('general')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    reqType === 'general'
                      ? 'bg-sky-50/70 border-[#003650] shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Building2 size={18} className={reqType === 'general' ? 'text-[#003650]' : 'text-slate-400'} />
                  <div>
                    <strong className="block text-slate-900 text-xs font-bold">Insumos de Oficina / Generales</strong>
                    <span className="text-[11px] text-slate-500">Papelería, cafetería, aseo, TI, herramientas de taller</span>
                  </div>
                </button>
              </div>

              {/* Selectores Vinculados a los Catálogos Configurables */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {reqType === 'project' ? (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Proyecto STC Asociado:</label>
                    <CreatableSelect
                      options={projects.map((p) => ({
                        id: p.id,
                        name: `${p.code} — ${p.name}`,
                        code: p.code
                      }))}
                      value={selectedProjectId}
                      onChange={(val) => setSelectedProjectId(val)}
                      placeholder="Seleccionar o buscar proyecto STC..."
                    />
                  </div>
                ) : (
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Área o Departamento Solicitante:</label>
                    <CreatableSelect
                      options={[
                        { id: 'Administración & Gerencia', name: 'Dirección General & Gerencia' },
                        { id: 'Ingeniería & Proyectos', name: 'Ingeniería & Proyectos STC' },
                        { id: 'Operaciones & Mantenimiento', name: 'Operaciones & Mantenimiento' },
                        { id: 'Taller Central Guayabal', name: 'Taller Central Guayabal (Banco de Ensayos & Maquinado)' },
                        { id: 'Sistemas & TI', name: 'Sistemas & TI (Equipos, licencias, consumibles)' },
                        { id: 'Gestión Humana & SST', name: 'Gestión Humana & SST (Dotaciones, botiquín, aseo)' },
                        { id: 'Comercial & Licitaciones', name: 'Comercial & Licitaciones' },
                        { id: 'Cadena de Suministro', name: 'Cadena de Suministro & Almacén' },
                        { id: 'Negocios Internacionales', name: 'Negocios Internacionales & Exportación' },
                      ]}
                      value={department}
                      onChange={(val) => setDepartment(val)}
                      allowCustomText={true}
                      placeholder="Seleccionar o escribir área..."
                    />
                  </div>
                )}

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tipo de Requisición (Catálogo Configurable):
                  </label>
                  <CreatableSelect
                    options={requisitionTypeOptions.length > 0 ? (
                      requisitionTypeOptions.map((opt) => ({ id: opt.name, name: opt.name }))
                    ) : [
                      { id: 'Repuesto Crítico STC', name: 'Repuesto Crítico STC' },
                      { id: 'Herramienta e Instrumentación', name: 'Herramienta e Instrumentación' },
                      { id: 'EPP y Alturas', name: 'EPP y Alturas' },
                      { id: 'Insumo y Consumible Químico', name: 'Insumo y Consumible Químico' },
                      { id: 'Servicio Externo de Taller', name: 'Servicio Externo de Taller' },
                    ]}
                    value={requisitionType}
                    onChange={(val) => setRequisitionType(val)}
                    allowCustomText={true}
                    placeholder="Seleccionar o buscar tipo..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Nivel de Urgencia / Prioridad (Catálogo Configurable):
                  </label>
                  <CreatableSelect
                    options={urgencyOptions.length > 0 ? (
                      urgencyOptions.map((urg) => ({ id: urg.name, name: urg.name }))
                    ) : [
                      { id: 'Inmediata (Parada de Operación STC)', name: 'Inmediata (Parada de Operación STC)' },
                      { id: 'Alta (Requerida ≤ 24 Horas)', name: 'Alta (Requerida ≤ 24 Horas)' },
                      { id: 'Normal (Atención en Ventana Regular)', name: 'Normal (Atención en Ventana Regular)' },
                    ]}
                    value={priority}
                    onChange={(val) => setPriority(val)}
                    allowCustomText={true}
                    placeholder="Seleccionar prioridad..."
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Fecha Estimada de Llegada / Requerida:
                  </label>
                  <input
                    type="date"
                    required
                    value={neededDate}
                    onChange={(e) => setNeededDate(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-900 text-xs focus:outline-hidden focus:border-[#003650]"
                  />
                </div>
              </div>
            </div>

            {/* Listado de Ítems Solicitados */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">
                    2. Ítems Solicitados ({items.length})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Ingresa los productos o materiales que necesitas que el área de compras adquiera.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#003650] font-bold hover:bg-sky-100 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
                >
                  <Plus size={13} />
                  <span>Agregar Ítem</span>
                </button>
              </div>

              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={item.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[11px] text-slate-700">Renglón #{idx + 1}</span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                          title="Eliminar fila"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-6 space-y-1">
                        <input
                          type="text"
                          required
                          placeholder="Descripción del material o producto (Ej: Resma papel carta / Guardacables 1/2)"
                          value={item.name}
                          onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 text-xs focus:outline-hidden"
                        />
                        {products.length > 0 && (
                          <div className="pt-0.5">
                            <CreatableSelect
                              options={products.map((p) => ({
                                id: p.id,
                                name: `${p.sku ? `[${p.sku}] ` : ''}${p.name}`,
                                code: p.sku
                              }))}
                              value=""
                              onChange={(val) => {
                                if (val) handleSelectFromCatalog(item.id, val);
                              }}
                              placeholder="Buscar y cargar desde catálogo..."
                            />
                          </div>
                        )}
                      </div>

                      <div className="sm:col-span-3">
                        <input
                          type="text"
                          placeholder="Código / Ref (Opcional)"
                          value={item.sku}
                          onChange={(e) => handleUpdateItem(item.id, 'sku', e.target.value)}
                          className="w-full h-9 px-2 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:outline-hidden"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.qty}
                          onChange={(e) => handleUpdateItem(item.id, 'qty', Number(e.target.value) || 1)}
                          className="w-full h-9 px-1 text-center font-bold font-mono rounded-lg border border-slate-300 bg-white text-xs focus:outline-hidden"
                          title="Cantidad solicitada"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <CreatableSelect
                          value={item.unit || 'unid'}
                          onChange={(val) => handleUpdateItem(item.id, 'unit', val)}
                          options={[
                            'unid',
                            'm (metros)',
                            'kg',
                            'gal (galón)',
                            'juego / set',
                            'par',
                            'caja',
                            'paquete',
                            'litro',
                          ]}
                          placeholder="Unidad..."
                          allowCustomText={true}
                          inputClassName="w-full h-9 px-1 text-center font-bold rounded-lg border border-slate-300 bg-white text-[11px] focus:outline-hidden"
                        />
                      </div>
                    </div>

                    {/* Alerta Poka-Yoke: Chequeo Previo de Bodega (Canibalización de Stock) */}
                    {item.availableStockInWarehouse !== undefined && item.availableStockInWarehouse > 0 && (
                      <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-medium">
                          <AlertCircle size={14} className="text-amber-600 shrink-0" />
                          <span>
                            Hay <strong>{item.availableStockInWarehouse} {item.unit || 'unid'}</strong> disponibles en bodega principal. ¿Deseas solicitar transferencia en vez de comprar?
                          </span>
                        </div>
                        <span className="font-bold text-amber-950 uppercase text-[9px] bg-amber-200 px-2 py-0.5 rounded">
                          Existencias Disponibles
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Versión de Plano de Ingeniería (BOM Drift Control) */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <label className="font-bold text-slate-800 block text-xs">
                Versión del Plano / Lista de Materiales (BOM Version)
              </label>
              <input
                type="text"
                value={drawingVersion}
                onChange={(e) => setDrawingVersion(e.target.value)}
                placeholder="Ej: Rev-03 (Plano Mecánico Teleférico aprobado por Wilson Alzate)"
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 bg-white text-xs font-mono font-medium"
              />
              <p className="text-[10px] text-slate-500">
                Se asocia a la solicitud para prevenir compras con planos u hojas de despiece desactualizadas.
              </p>
            </div>

            {/* Justificación de la Petición y Alerta Dead-Man Switch */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800 block">
                  Justificación / Motivo de la Petición:
                </label>
                {priority.toLowerCase().includes('urgente') && (
                  <span className="text-[10px] font-bold text-rose-600 flex items-center gap-1">
                    ⚡ Escalamiento Automático: Si no se aprueba en 24h escala a Gerencia General
                  </span>
                )}
              </div>
              <textarea
                rows={2}
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Indica para qué labor o frente se requieren estos materiales..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-slate-900 text-xs focus:outline-hidden focus:border-[#003650]"
              />
            </div>

          </div>

          {/* Pie de Acciones */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              La petición entrará a la bandeja del encargado de compras para cotización.
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-bold cursor-pointer text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-xs text-xs"
              >
                <CheckCircle2 size={15} />
                <span>Enviar Petición de Compra</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

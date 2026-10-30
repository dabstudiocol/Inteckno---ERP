import React, { useState } from 'react';
import {
  Sparkles,
  Building2,
  Calendar,
  DollarSign,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { Opportunity, Partner, CRMContact, User, Project } from '../../../types';
import { formatCOP, formatUSD } from '../../../core/services/trmService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface AwardOpportunityModalProps {
  opportunity: Opportunity;
  partners: Partner[];
  contacts: CRMContact[];
  erpUsers: User[];
  currentTrm: number;
  onClose: () => void;
  onConfirmAward: (oppId: string, projectData: Partial<Project>) => void;
}

export const AwardOpportunityModal: React.FC<AwardOpportunityModalProps> = ({
  opportunity,
  partners,
  contacts,
  erpUsers,
  currentTrm,
  onClose,
  onConfirmAward,
}) => {
  // Buscar coincidencia en el maestro de partners o contactos para auto-rellenar NIT
  const foundPartner = partners.find(
    (p) =>
      p.name.toLowerCase().includes(opportunity.clientName.toLowerCase()) ||
      opportunity.clientName.toLowerCase().includes(p.name.toLowerCase())
  );

  const foundContact = contacts.find(
    (c) =>
      c.company.toLowerCase().includes(opportunity.clientName.toLowerCase()) ||
      c.name.toLowerCase() === (opportunity.clientContactPerson || '').toLowerCase()
  );

  // 1. Datos básicos requeridos (arrastrados de la Oportunidad; el código del proyecto lo define el usuario)
  const [projectCode, setProjectCode] = useState('');
  const [projectName, setProjectName] = useState(opportunity.title);
  const [clientName, setClientName] = useState(opportunity.clientName);
  const [clientNit, setClientNit] = useState(
    foundPartner?.taxId || (foundContact as any)?.nit || ''
  );
  const [clientContact, setClientContact] = useState(
    opportunity.clientContactPerson ||
      foundContact?.name ||
      (opportunity.clientPhone ? `${opportunity.clientPhone}` : '')
  );

  // 2. Encargado del proyecto (según organigrama de operaciones e ingeniería)
  const projectLeaders = erpUsers.filter(
    (u) =>
      u.role === 'lider_proyectos' ||
      u.role === 'ingeniero_proyectos' ||
      u.role === 'lider_ingenieria' ||
      u.role === 'gerente_proyectos' ||
      u.role === 'supervisor_tecnico' ||
      u.role === 'gerente_general'
  );

  const [selectedLeaderId, setSelectedLeaderId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState(opportunity.expectedCloseDate || '');

  // 3. Moneda y Monto dinámico con TRM
  const initialCurrency: 'USD' | 'COP' =
    opportunity.currency === 'USD' ? 'USD' : 'COP';

  const [currency, setCurrency] = useState<'USD' | 'COP'>(initialCurrency);
  
  // Guardamos el valor original de la oportunidad para conversiones precisas
  const baseValueUSD = opportunity.estimatedValueUSD || 0;
  
  const [contractAmount, setContractAmount] = useState<number>(() => {
    if (opportunity.estimatedValue && opportunity.estimatedValue > 0) {
      if (initialCurrency === 'COP') {
        return opportunity.currency === 'COP' ? opportunity.estimatedValue : Math.round(opportunity.estimatedValue * currentTrm);
      } else {
        return opportunity.currency === 'USD' ? opportunity.estimatedValue : Math.round(opportunity.estimatedValue / (currentTrm || 4150));
      }
    }
    if (initialCurrency === 'COP') {
      return Math.round(baseValueUSD * currentTrm);
    }
    return baseValueUSD;
  });

  // 4. Plantilla de Proyecto WBS Inicial (Familias Inteckno - seleccionada por el usuario)
  const [selectedTemplateFamily, setSelectedTemplateFamily] = useState<string>('');

  // Cambio dinámico de moneda: recalcula el monto según la TRM
  const handleCurrencyChange = (newCurrency: 'USD' | 'COP') => {
    if (newCurrency === currency) return;
    setCurrency(newCurrency);
    if (newCurrency === 'COP') {
      // De USD a COP
      setContractAmount(Math.round(contractAmount * currentTrm));
    } else {
      // De COP a USD
      setContractAmount(Math.round(contractAmount / (currentTrm > 0 ? currentTrm : 4000)));
    }
  };

  // Diálogo de confirmación al intentar salir/cancelar
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const handleRequestClose = () => {
    setShowExitConfirm(true);
  };

  const handleConfirmExit = () => {
    setShowExitConfirm(false);
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const chosenLeader = erpUsers.find((u) => u.id === selectedLeaderId);
    const cleanCode = projectCode.trim().toUpperCase() || `PRJ-${Date.now()}`;

    // Transferir partidas de la cotización activa si existen
    const activeQuote = opportunity.quotations?.[0];
    const initialCostMatrix = (activeQuote?.items || []).map((it, idx) => ({
      id: `COST-${Date.now()}-${idx}`,
      category: it.category === 'Ensayos NDT/MRT' ? 'inspeccion_mrt' :
                it.category === 'Repuestos OEM' ? 'repuestos_fabricacion' :
                it.category === 'Viáticos & Logística' ? 'viaticos_transporte' : 'mano_obra_itk',
      concept: it.description,
      unit: 'Unidad',
      plannedQuantity: it.qty,
      plannedUnitCost: it.unitPrice,
      plannedTotal: it.qty * it.unitPrice,
      actualQuantity: 0,
      actualUnitCost: it.unitPrice,
      actualTotal: 0,
      variance: it.qty * it.unitPrice,
    }));

    const projectPayload: Partial<Project> = {
      code: cleanCode,
      name: projectName,
      clientName: clientName,
      clientNit: clientNit,
      quoteCode: activeQuote?.code || `COT-${opportunity.code}-01`,
      contractCode: `TL-OF-${new Date().getFullYear()}-${cleanCode.slice(-3)}`,
      commercialContact: {
        name: clientContact,
        email: opportunity.clientEmail || '',
        phone: opportunity.clientPhone || '',
      },
      projectLeaderId: selectedLeaderId,
      projectLeaderName: chosenLeader?.name || '',
      supervisorId: selectedLeaderId,
      supervisorName: chosenLeader?.name || '',
      startDate,
      endDate,
      contractAmount,
      budgetPV: currency === 'USD' ? contractAmount * currentTrm : contractAmount,
      currency,
      costCenter: `CC-${cleanCode}`,
      location: `${opportunity.country || 'Colombia'}`,
      serviceType: opportunity.cableType,
      templateName: selectedTemplateFamily,
      costMatrix: initialCostMatrix as any,
    };

    onConfirmAward(opportunity.id, projectPayload);
  };

  return (
    <>
      <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full flex flex-col max-h-[90vh] overflow-hidden">
          {/* Cabecera Fija */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-emerald-50/80 to-white shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  Adjudicar Oportunidad a Proyecto
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {opportunity.code}
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Diligencia la información básica para transferir y registrar el proyecto.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRequestClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-sm font-bold"
              title="Cerrar"
            >
              ✕
            </button>
          </div>

          {/* Formulario Conciso y Limpio */}
          <form onSubmit={handleSubmit} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
            {/* Código y Nombre del Proyecto */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="block font-bold text-slate-700 mb-1">
                  Código del Proyecto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                  placeholder="ej. PRJ-2026-MED-01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-[#00668F] focus:bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-slate-700 mb-1">
                  Nombre del Proyecto <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Título descriptivo del proyecto"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#00668F] focus:bg-white"
                />
              </div>
            </div>

            {/* Cliente y NIT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Cliente / Razón Social <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Empresa o entidad cliente"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#00668F] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ID Fiscal / NIT / RUT <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientNit}
                  onChange={(e) => setClientNit(e.target.value)}
                  placeholder="ej. 900.123.456-7"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-[#00668F] focus:bg-white"
                />
              </div>
            </div>

            {/* Contacto del Cliente y Encargado del Proyecto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contacto del Cliente <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  placeholder="Nombre / Teléfono del contacto"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#00668F] focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Encargado del Proyecto (PM) <span className="text-rose-500">*</span>
                </label>
                <CreatableSelect
                  options={projectLeaders.map((u) => ({
                    id: u.id,
                    name: u.name,
                    code: u.id
                  }))}
                  value={selectedLeaderId}
                  onChange={(val) => setSelectedLeaderId(val)}
                  placeholder="Seleccionar líder del proyecto..."
                />
              </div>
            </div>

            {/* Fechas de Inicio y Estimada de Fin */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fecha de Inicio Estimada <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#00668F]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Fecha Estimada de Fin <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#00668F]"
                />
              </div>
            </div>

            {/* Moneda y Monto Dinámico con TRM */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/90 rounded-xl border border-slate-200">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Moneda Contractual <span className="text-rose-500">*</span>
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('USD')}
                    className={`flex-1 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      currency === 'USD'
                        ? 'bg-[#00668F] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    USD ($)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencyChange('COP')}
                    className={`flex-1 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
                      currency === 'COP'
                        ? 'bg-[#00668F] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    COP ($)
                  </button>
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1">
                  TRM actual: <span className="font-bold text-slate-700">${currentTrm.toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Monto del Proyecto <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-normal text-xs pointer-events-none">
                    {currency === 'USD' ? '$' : '$'}
                  </span>
                  <input
                    type="text"
                    required
                    value={contractAmount > 0 ? Number(contractAmount).toLocaleString('es-CO') : ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setContractAmount(raw ? Number(raw) : 0);
                    }}
                    placeholder="0"
                    className="w-full pl-6 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono font-normal text-sm focus:outline-none focus:ring-2 focus:ring-[#00668F]"
                  />
                </div>
                <div className="text-[10px] text-slate-500 font-medium mt-1 truncate">
                  {currency === 'USD'
                    ? `Equiv: ${formatCOP(contractAmount * currentTrm)}`
                    : `Equiv: ${formatUSD(contractAmount / (currentTrm || 4000))}`}
                </div>
              </div>
            </div>

            {/* Plantilla WBS & Estructura Operativa (Las 5 Familias Inteckno) */}
            <div className="p-3.5 bg-sky-50/70 rounded-xl border border-sky-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 text-xs">
                  Plantilla de Fases & Cronograma WBS (Familia Inteckno)
                </label>
                <span className="text-[10px] font-bold text-[#00668F] bg-sky-100 px-2 py-0.5 rounded-full">
                  Auto-estructurado
                </span>
              </div>
              <CreatableSelect
                options={[
                  { id: 'Familia 1: Montaje y Empalme Mayor de Cables (EN 12927)', name: 'Familia 1: Montaje y Empalme Mayor de Cables (EN 12927)' },
                  { id: 'Familia 2: Inspección y Ensayos No Destructivos (END / MRT Cable)', name: 'Familia 2: Inspección y Ensayos No Destructivos (END / MRT Cable)' },
                  { id: 'Familia 3: Mantenimiento Mayor y Desmontaje PLEM', name: 'Familia 3: Mantenimiento Mayor y Desmontaje PLEM' },
                  { id: 'Familia 4: Suministro de Repuestos y Componentes OEM', name: 'Familia 4: Suministro de Repuestos y Componentes OEM' },
                  { id: 'Familia 5: Consultoría, Interventoría y Asistencia Técnica', name: 'Familia 5: Consultoría, Interventoría y Asistencia Técnica' },
                ]}
                value={selectedTemplateFamily}
                onChange={(val) => setSelectedTemplateFamily(val)}
                allowCustomText={true}
                placeholder="Seleccionar plantilla de fases..."
              />
              <p className="text-[10px] text-slate-500 leading-relaxed">
                El proyecto se creará automáticamente con sus fases, tareas críticas, cálculo CPM y matriz de costos inicial transferida desde la oferta comercial.
              </p>
            </div>

            {/* Pie del Formulario */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleRequestClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>Registrar y Adjudicar Proyecto</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Diálogo de Confirmación para Salir / Cancelar */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[99999] bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 space-y-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <AlertTriangle size={20} />
            </div>
            <div className="text-center space-y-1">
              <h4 className="text-sm font-bold text-slate-900">
                ¿Seguro que deseas salir?
              </h4>
              <p className="text-xs text-slate-500">
                Si cancelas, la oportunidad regresará a su etapa anterior y no se creará el proyecto hasta que completes los datos requeridos.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer transition-colors"
              >
                Continuar Editando
              </button>
              <button
                type="button"
                onClick={handleConfirmExit}
                className="flex-1 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                Salir y Regresar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

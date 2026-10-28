import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  DollarSign, 
  Compass, 
  Check, 
  ShieldCheck, 
  Activity, 
  Wrench, 
  Cpu, 
  Radio, 
  BookOpen, 
  GraduationCap,
  Users,
  Briefcase,
  Settings,
} from 'lucide-react';
import { Project, Opportunity, User, Partner } from '../../../types';
import { INTECKNO_PORTFOLIO } from '../../../core/config/portfolioCatalog';
import { INTECKNO_CLIENTES_REALES } from '../../../core/config/intecknoDomainCatalog';
import { formatUSD } from '../../../core/services/trmService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface ProjectDynamicFormProps {
  opportunities: Opportunity[];
  erpUsers: User[];
  partners?: Partner[];
  currentTrm: number;
  initialData?: Partial<Project>;
  onSubmit: (projectData: Partial<Project> & { 
    categoryId: string; 
    serviceId: string; 
    dynamicData: Record<string, any>; 
  }) => void;
  onCancel: () => void;
}

export const ProjectDynamicForm: React.FC<ProjectDynamicFormProps> = ({
  opportunities,
  erpUsers,
  partners = [],
  currentTrm,
  initialData,
  onSubmit,
  onCancel,
}) => {
  // Conexión con CRM: Oportunidades
  const [selectedOppId, setSelectedOppId] = useState<string>('');
  
  // 1. Código de Proyecto y Centro de Costos (1 Proyecto = 1 Centro de Costos)
  const defaultCode = initialData?.code || `P${new Date().getFullYear().toString().slice(-2)}-01`;
  const [code, setCode] = useState(defaultCode);
  const [costCenter, setCostCenter] = useState(initialData?.costCenter || defaultCode);

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setCostCenter(newCode); // Cada proyecto es su propio centro de costos: el código es el mismo
  };

  const [name, setName] = useState(initialData?.name || '');

  // 2. Clientes conectados con catálogo real de Inteckno + Terceros/CRM
  const knownClients = useMemo(() => {
    const map = new Map<string, { name: string; taxId?: string; city?: string }>();

    // 2.1 Clientes oficiales de Inteckno S.A.S. (extraídos de los 195 proyectos reales)
    INTECKNO_CLIENTES_REALES.forEach(c => {
      map.set(c.name.trim().toLowerCase(), {
        name: c.name.trim(),
        city: `${c.city}, ${c.country}`,
        taxId: c.country === 'Colombia' ? '900.000.000-1' : undefined
      });
      map.set(c.shortName.trim().toLowerCase(), {
        name: c.shortName.trim(),
        city: `${c.city}, ${c.country}`
      });
    });

    // 2.2 Terceros registrados tipo cliente o ambos
    partners.forEach(p => {
      if (p.name && (p.type === 'customer' || p.type === 'both' || !p.type)) {
        map.set(p.name.trim().toLowerCase(), {
          name: p.name.trim(),
          taxId: p.taxId,
          city: p.city
        });
      }
    });

    // 2.3 Clientes de oportunidades previas
    opportunities.forEach(opp => {
      if (opp.clientName) {
        const key = opp.clientName.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, { name: opp.clientName.trim() });
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [partners, opportunities]);

  const [clientName, setClientName] = useState(initialData?.clientName || '');
  const [clientNit, setClientNit] = useState((initialData as any)?.clientNit || '');
  const [location, setLocation] = useState(initialData?.location || 'Colombia');

  const handleClientNameChange = (val: string) => {
    setClientName(val);
    const matched = knownClients.find(c => c.name.toLowerCase() === val.trim().toLowerCase());
    if (matched) {
      if (matched.taxId) setClientNit(matched.taxId);
      if (matched.city && (!location || location === 'Colombia')) setLocation(matched.city);
    }
  };

  // 3. Parámetros Contractuales y Financieros Oficiales (ADN Inteckno)
  const [quoteCode, setQuoteCode] = useState(initialData?.quoteCode || '');
  const [contractCode, setContractCode] = useState(initialData?.contractCode || '');
  const [currency, setCurrency] = useState<'COP' | 'USD' | 'EUR'>(initialData?.currency || 'COP');
  const [contractAmount, setContractAmount] = useState<number>(initialData?.contractAmount || initialData?.budgetPV || 0);
  const [advancePaymentPercentage, setAdvancePaymentPercentage] = useState<number>(initialData?.advancePaymentPercentage || 0);
  const [retentionGuaranteePercentage, setRetentionGuaranteePercentage] = useState<number>(initialData?.retentionGuaranteePercentage || 0);
  const [paymentTermsDescription, setPaymentTermsDescription] = useState<string>(
    initialData?.paymentTermsDescription || 'Contra entrega de informe final aprobado a satisfacción'
  );

  // 4. Líder o Director de Proyecto: menú desplegable del personal de la empresa + escribir libremente
  const defaultLeader = initialData?.supervisorName || erpUsers[0]?.name || '';
  const [supervisorName, setSupervisorName] = useState(defaultLeader);

  // 5. Selector en Cascada basado en el Portafolio Oficial Inteckno
  const defaultCategory = INTECKNO_PORTFOLIO[4].category; // "MANTENIMIENTO Y MONTAJE ESPECIALIZADO"
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialData?.categoryId || (initialData as any)?.serviceCategory || defaultCategory
  );
  
  const currentCategoryObj = INTECKNO_PORTFOLIO.find(p => p.category === selectedCategory) || INTECKNO_PORTFOLIO[0];
  const [selectedService, setSelectedService] = useState<string>(
    initialData?.serviceId || initialData?.serviceType || currentCategoryObj.services[0]
  );
  
  const [startDate, setStartDate] = useState(initialData?.startDate || new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(initialData?.endDate || '');
  const [budgetCOP, setBudgetCOP] = useState<number>(initialData?.budgetPV || 0);

  // -------------------------------------------------------------
  // Parámetros Técnicos Específicos según el Servicio Seleccionado
  // -------------------------------------------------------------
  
  // Mantenimiento y Montaje Especializado / Implementación
  const [cableInterventionLengthMeters, setCableInterventionLengthMeters] = useState<number>(
    (initialData?.dynamicData as any)?.cableInterventionLengthMeters || 3100
  );
  const [componentIntervened, setComponentIntervened] = useState<
    'Balancines' | 'Volantes' | 'Reductores' | 'Mordazas' | 'Pilonas_Torres' | 'Cable_Tractor_Portador' | 'Cabinas_Vehiculos'
  >((initialData?.dynamicData as any)?.componentIntervened || 'Balancines');

  // Inspecciones y Mantenimiento Predictivo
  const [applicableStandard, setApplicableStandard] = useState<string>(
    (initialData?.dynamicData as any)?.applicableStandard || 'UNE EN 12927'
  );
  const [measurementEquipmentName, setMeasurementEquipmentName] = useState<string>(
    (initialData?.dynamicData as any)?.measurementEquipmentName || 'Cabezal MRT MH-60 (Rango 30-65mm)'
  );

  // Consultoría / Proyectos Especiales de Herramientas
  const [studyPhase, setStudyPhase] = useState<
    'Prefactibilidad' | 'Factibilidad' | 'Diseño' | 'Supervisión' | 'Interventoría' | 'Implementación'
  >((initialData?.dynamicData as any)?.studyPhase || 'Prefactibilidad');

  // Formación Técnica Especializada
  const [trainingTopic, setTrainingTopic] = useState<string>(
    (initialData?.dynamicData as any)?.trainingTopic || 'Operación Segura y Mantenimiento de Teleféricos'
  );

  const handleCategoryChange = (newCat: string) => {
    setSelectedCategory(newCat);
    const catObj = INTECKNO_PORTFOLIO.find(p => p.category === newCat);
    if (catObj && catObj.services.length > 0) {
      setSelectedService(catObj.services[0]);
    }
  };

  const handleSelectOpportunity = (oppId: string) => {
    setSelectedOppId(oppId);
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp) return;

    setName(opp.title);
    setClientName(opp.clientName);
    if (opp.estimatedValueUSD) {
      setBudgetCOP(Math.round(opp.estimatedValueUSD * currentTrm));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let dynamicData: Record<string, any> = {
      categoryId: selectedCategory,
      serviceId: selectedService,
    };

    if (
      selectedCategory === "MANTENIMIENTO Y MONTAJE ESPECIALIZADO" || 
      selectedCategory === "IMPLEMENTACIÓN DE PROYECTOS EN SISTEMAS DE TRANSPORTE POR CABLE"
    ) {
      dynamicData = {
        ...dynamicData,
        cableInterventionLengthMeters: Number(cableInterventionLengthMeters) || 0,
        componentIntervened,
      };
    } else if (selectedCategory === "INSPECCIONES Y MANTENIMIENTO PREDICTIVO") {
      dynamicData = {
        ...dynamicData,
        applicableStandard: applicableStandard.trim() || 'UNE EN 12927',
        measurementEquipmentName: measurementEquipmentName.trim(),
      };
    } else if (
      selectedCategory === "CONSULTORIA" || 
      selectedCategory === "PROYECTOS ESPECIALES DE HERRAMIENTAS Y EQUIPOS"
    ) {
      dynamicData = {
        ...dynamicData,
        studyPhase,
      };
    } else if (selectedCategory === "FORMACIÓN TÉCNICA ESPECIALIZADA") {
      dynamicData = {
        ...dynamicData,
        trainingTopic: trainingTopic.trim(),
      };
    }

    const finalCode = code.trim();

    const projectPayload: Partial<Project> & { 
      categoryId: string; 
      serviceId: string; 
      dynamicData: Record<string, any>; 
    } = {
      code: finalCode,
      name: name.trim(),
      clientName: clientName.trim(),
      clientNit: clientNit.trim(),
      categoryId: selectedCategory,
      serviceId: selectedService,
      serviceCategory: selectedCategory,
      serviceType: selectedService,
      lineOfBusiness: (
        selectedCategory.includes("CONSULTORIA") || selectedCategory.includes("HERRAMIENTAS") 
          ? 'Consultoría' 
          : selectedCategory.includes("INSPECCIONES") 
          ? 'Diagnóstico' 
          : selectedCategory.includes("IMPLEMENTACIÓN")
          ? 'Montaje'
          : 'Mantenimiento'
      ) as any,
      location: location.trim(),
      costCenter: finalCode, // Cada proyecto es su propio centro de costos con el mismo código
      startDate,
      endDate: endDate || startDate,
      budgetPV: Number(budgetCOP) || 0,
      contractAmount: Number(contractAmount) || Number(budgetCOP) || 0,
      currency,
      quoteCode: quoteCode.trim(),
      contractCode: contractCode.trim(),
      advancePaymentPercentage: Number(advancePaymentPercentage) || 0,
      retentionGuaranteePercentage: Number(retentionGuaranteePercentage) || 0,
      paymentTermsDescription: paymentTermsDescription.trim(),
      actualCostAC: 0,
      earnedValueEV: 0,
      spi: 1.0,
      cpi: 1.0,
      cv: 0,
      status: 'active',
      supervisorName: supervisorName.trim(),
      dynamicData,
    };

    onSubmit(projectPayload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-[#00668F] rounded-xl">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Registrar Proyecto STC (Teleféricos)
            </h2>
            <p className="text-xs text-slate-500">
              Configuración de proyecto, centro de costos y parámetros técnicos del portafolio Inteckno
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('inteckno:open-module-config'))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            title="Personalizar catálogos y opciones de proyectos"
          >
            <Settings size={14} className="text-[#00668F]" />
            <span className="hidden sm:inline">Configurar Opciones</span>
          </button>
        </div>
      </div>

      {/* Precarga desde Oportunidad CRM */}
      {opportunities && opportunities.length > 0 && (
        <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-900/50">
          <label className="block text-xs font-semibold text-[#00668F] mb-1.5">
            Precargar datos desde Oportunidad Adjudicada del CRM (Opcional):
          </label>
          <select
            value={selectedOppId}
            onChange={(e) => handleSelectOpportunity(e.target.value)}
            className="w-full text-xs px-3 py-2 border rounded-lg border-blue-200 dark:border-blue-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="">-- Seleccionar oportunidad comercial adjudicada --</option>
            {opportunities.map(opp => (
              <option key={opp.id} value={opp.id}>
                {opp.title} ({opp.clientName}) - ${Math.round((opp.estimatedValueUSD || 0) * currentTrm).toLocaleString('es-CO')} COP
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Portafolio en Cascada: Categoría Principal -> Servicio */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#00668F] flex items-center gap-2">
          <Compass className="w-4 h-4" />
          Portafolio de Servicios Inteckno S.A.S.
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              1. Categoría Principal *
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full text-xs px-3 py-2.5 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-semibold text-[#00668F] focus:outline-none focus:ring-1 focus:ring-[#00668F]"
            >
              {INTECKNO_PORTFOLIO.map(item => (
                <option key={item.category} value={item.category}>
                  {item.category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              2. Servicio Específico *
            </label>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full text-xs px-3 py-2.5 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#00668F]"
            >
              {currentCategoryObj.services.map(srv => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Información General y Contractual */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-[#00668F]" />
          Información Contractual y General
        </h3>

        {/* Fila 1: Código de Proyecto y Nombre */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Código de Proyecto *
            </label>
            <input
              type="text"
              required
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              placeholder="Ej. PRJ-2026-STC-01"
              className="w-full text-xs font-mono font-bold text-[#00668F] px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00668F]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre descriptivo del Proyecto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Recorte y empalme de cable tractor Línea A"
              className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Fila 2: Cliente con conexión a Base de Datos de Clientes y escritura libre */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <CreatableSelect
              label="Cliente / Razón Social"
              required
              value={clientName}
              onChange={(val) => handleClientNameChange(val)}
              options={knownClients.map(c => ({
                id: c.name,
                name: c.name,
                code: c.taxId ? `NIT: ${c.taxId}` : undefined,
              }))}
              placeholder="Escribe o selecciona cliente (ej. Metro de Medellín)..."
              allowCustomText={true}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              NIT / Identificación Fiscal
            </label>
            <input
              type="text"
              value={clientNit}
              onChange={(e) => setClientNit(e.target.value)}
              placeholder="Ej. 900.123.456-7"
              className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
        </div>

        {/* Fila 3: Líder de Proyecto con desplegable de personal de la empresa + escritura libre, Ubicación y Centro de Costos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <CreatableSelect
              label="Líder / Director del Proyecto"
              required
              value={supervisorName}
              onChange={(val) => setSupervisorName(val)}
              options={erpUsers.map(u => ({
                id: u.id,
                name: u.name,
                code: u.roleLabel || u.department || undefined,
              }))}
              placeholder="Seleccionar o escribir líder..."
              allowCustomText={true}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Ubicación / Ciudad / Sistema
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej. Estación San Javier, Medellín"
              className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Centro de Costos (Mismo Código)
            </label>
            <input
              type="text"
              readOnly
              value={code}
              className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 cursor-not-allowed"
              title="Cada proyecto es un centro de costos con su mismo código."
            />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5 block">
              Sincronizado automáticamente (1 Proyecto = 1 Centro de Costos)
            </span>
          </div>
        </div>

        {/* Fila 4: Fechas y Presupuesto */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Fecha de Inicio *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Fecha Estimada de Entrega *
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Presupuesto Planificado (PV) COP *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">$</span>
              <input
                type="text"
                required
                value={budgetCOP ? budgetCOP.toLocaleString('es-CO') : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setBudgetCOP(raw ? Number(raw) : 0);
                }}
                placeholder="0"
                className="w-full text-xs font-mono pl-7 pr-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00668F]"
              />
            </div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">
              Equivalente: {formatUSD(budgetCOP > 0 ? Math.round(budgetCOP / currentTrm) : 0)} USD (TRM {currentTrm.toLocaleString('es-CO')})
            </span>
          </div>
        </div>

        {/* Bloque Contractual, Facturación y Multidivisa Oficial Inteckno */}
        <div className="p-4 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/60 rounded-xl space-y-3.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#00668F] flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-[#00668F]" />
            Control Contractual, Facturación y Moneda (ADN Inteckno)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Código de Cotización Comercial
              </label>
              <input
                type="text"
                value={quoteCode}
                onChange={(e) => setQuoteCode(e.target.value)}
                placeholder="Ej. ITK-202411-003"
                className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00668F]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                N° Contrato / Orden de Compra Cliente
              </label>
              <input
                type="text"
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value)}
                placeholder="Ej. ADM-TL-086-2022 / OC 6243"
                className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#00668F]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Moneda Contractual
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as any)}
                className="w-full text-xs font-bold px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-[#00668F]"
              >
                <option value="COP">COP ($ Pesos Colombianos)</option>
                <option value="USD">USD ($ Dólares Americanos)</option>
                <option value="EUR">EUR (€ Euros)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                % Anticipo Pactado
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={advancePaymentPercentage}
                  onChange={(e) => setAdvancePaymentPercentage(Number(e.target.value) || 0)}
                  placeholder="Ej. 30"
                  className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                % Retención de Garantía
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={retentionGuaranteePercentage}
                  onChange={(e) => setRetentionGuaranteePercentage(Number(e.target.value) || 0)}
                  placeholder="Ej. 5"
                  className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
                <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Condición / Forma de Pago
              </label>
              <input
                type="text"
                value={paymentTermsDescription}
                onChange={(e) => setPaymentTermsDescription(e.target.value)}
                placeholder="Ej. Anticipo 30% + 70% contra entrega de informe"
                className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Parámetros Técnicos Específicos del Servicio (Amigable y Claro) */}
      <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#00668F] flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Parámetros Técnicos Específicos del Servicio
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Datos técnicos requeridos para la ejecución operativa de este servicio en Inteckno
          </p>
        </div>

        {/* Caso 1: MANTENIMIENTO Y MONTAJE ESPECIALIZADO / IMPLEMENTACIÓN DE PROYECTOS */}
        {(selectedCategory === "MANTENIMIENTO Y MONTAJE ESPECIALIZADO" || 
          selectedCategory === "IMPLEMENTACIÓN DE PROYECTOS EN SISTEMAS DE TRANSPORTE POR CABLE") && (
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-[#00668F]" />
              Detalles Técnicos: Mantenimiento y Montaje Electromecánico STC
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Longitud del Cable Intervenido (m) *
                </label>
                <input
                  type="number"
                  required
                  value={cableInterventionLengthMeters}
                  onChange={(e) => setCableInterventionLengthMeters(Number(e.target.value))}
                  placeholder="3100"
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Componente Afectado / Intervenido *
                </label>
                <select
                  value={componentIntervened}
                  onChange={(e) => setComponentIntervened(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
                >
                  <option value="Balancines">Balancines (Tren de Poleas y Rodillos)</option>
                  <option value="Volantes">Volantes Motrices y de Retorno</option>
                  <option value="Reductores">Reductores y Grupos Motrices</option>
                  <option value="Mordazas">Mordazas de Cabinas</option>
                  <option value="Pilonas_Torres">Pilonas / Torres</option>
                  <option value="Cable_Tractor_Portador">Cable Tractor o Portador</option>
                  <option value="Cabinas_Vehiculos">Cabinas y Suspensión</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Caso 2: INSPECCIONES Y MANTENIMIENTO PREDICTIVO */}
        {selectedCategory === "INSPECCIONES Y MANTENIMIENTO PREDICTIVO" && (
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00668F]" />
              Detalles Técnicos: Ensayos No Destructivos (END / MRT)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Normativa Aplicable *
                </label>
                <input
                  type="text"
                  required
                  value={applicableStandard}
                  onChange={(e) => setApplicableStandard(e.target.value)}
                  placeholder="Ej. UNE EN 12927 / UNE EN 1709 / ISO 4309"
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Equipo de Medición a Utilizar *
                </label>
                <input
                  type="text"
                  required
                  value={measurementEquipmentName}
                  onChange={(e) => setMeasurementEquipmentName(e.target.value)}
                  placeholder="Ej. Cabezal MRT MH-60 / Olympus EPOCH 650"
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
                />
              </div>
            </div>
          </div>
        )}

        {/* Caso 3: CONSULTORIA / PROYECTOS ESPECIALES DE HERRAMIENTAS Y EQUIPOS */}
        {(selectedCategory === "CONSULTORIA" || 
          selectedCategory === "PROYECTOS ESPECIALES DE HERRAMIENTAS Y EQUIPOS") && (
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-[#00668F]" />
              Detalles Técnicos: Fase del Estudio
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Fase del Estudio *
              </label>
              <select
                value={studyPhase}
                onChange={(e) => setStudyPhase(e.target.value as any)}
                className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold"
              >
                <option value="Prefactibilidad">Prefactibilidad</option>
                <option value="Factibilidad">Factibilidad</option>
                <option value="Diseño">Diseño</option>
                <option value="Supervisión">Supervisión</option>
                <option value="Interventoría">Interventoría</option>
                <option value="Implementación">Implementación</option>
              </select>
            </div>
          </div>
        )}

        {/* Caso 4: FORMACIÓN TÉCNICA ESPECIALIZADA */}
        {selectedCategory === "FORMACIÓN TÉCNICA ESPECIALIZADA" && (
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#00668F]" />
              Detalles Técnicos: Contenido de Formación
            </h4>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Tema de Capacitación *
              </label>
              <input
                type="text"
                required
                value={trainingTopic}
                onChange={(e) => setTrainingTopic(e.target.value)}
                placeholder="Ej. Procesos de mantenimiento rutinarios o especiales en componentes electromecánicos"
                className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* Botones de Acción */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
        >
          <Check className="w-4 h-4" />
          <span>Crear Proyecto STC</span>
        </button>
      </div>
    </form>
  );
};

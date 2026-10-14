import React, { useState, useMemo, useEffect } from 'react';
import {
  Calculator,
  Ship,
  Plane,
  Truck,
  Box,
  Globe,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  RefreshCw,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
  Scale,
  Printer,
  FileCheck2,
  Layers,
  HelpCircle,
  Database,
  Coins,
} from 'lucide-react';
import {
  InternationalCalculationState,
  CargoPackage,
  UnitSystem,
  Incoterm,
  CurrencyCode,
  FreightMode,
  PackagingType,
  ContainerType,
  AiPackagingRecommendation,
  AiHsCodeRecommendation,
  ComplianceStandard,
  GlobalOpportunity,
} from '../types';
import {
  calculateCargoMetrics,
  suggestPackagingAndFreight,
  classifyHsCodeAndFta,
  auditComplianceWithAi,
  getDefaultComplianceStandards,
  CONTAINER_SPECS,
} from '../services/internationalAiService';
import { getGeminiApiKey, saveGeminiApiKey, testApiKey } from '../../../core/services/aiVisionExpenseService';
import { calculateQuoteBreakdown } from '../services/costCalculatorEngine';
import { QuotePdfModal } from './QuotePdfModal';
import { AiDataSourceInspector } from './AiDataSourceInspector';
import { fetchLiveExchangeRates, LiveForexResult } from '../services/exchangeRateService';

interface InternationalCalculatorProps {
  initialOpportunity?: GlobalOpportunity | null;
}

export const InternationalCalculator: React.FC<InternationalCalculatorProps> = ({
  initialOpportunity,
}) => {
  // Estado Principal de la Calculadora Internacional
  const [state, setState] = useState<InternationalCalculationState>({
    unitSystem: 'metric',
    packages: [
      {
        id: 'pkg-1',
        description: 'Grupo Motriz STC 450 kW con Reductor Epicicloidal',
        length: 320,
        width: 190,
        height: 210,
        weight: 6800,
        quantity: 1,
        fragile: true,
        moistureSensitive: true,
        stackable: false,
      },
      {
        id: 'pkg-2',
        description: 'Conjunto de Balancines con 8 Poleas y Sensores Inductivos',
        length: 240,
        width: 120,
        height: 110,
        weight: 1450,
        quantity: 2,
        fragile: false,
        moistureSensitive: true,
        stackable: true,
      },
      {
        id: 'pkg-3',
        description: 'Tablero de Control de Potencia con Variador de Frecuencia 690V',
        length: 180,
        width: 90,
        height: 200,
        weight: 750,
        quantity: 1,
        fragile: true,
        moistureSensitive: true,
        stackable: false,
      },
    ],
    originCountry: 'Colombia',
    destinationCountry: 'México',
    destinationCity: 'Ciudad de México (Cablebús)',
    targetPackaging: 'vacio_vci_anticorrosion',
    packagingCostUSD: 1650,
    targetFreightMode: 'maritimo_fcl',
    targetContainer: '20ft',

    // Costos Base
    manufacturingCostUSD: 145000,
    baseMarginPct: 24.0,
    selectedIncoterm: 'DDP',

    // Logística Origen (FCA/FOB)
    inlandFreightOriginUSD: 1200, // Taller a Puerto Buenaventura/Cartagena
    exportCustomsAndThcUSD: 650,

    // Internacional (CFR/CIF)
    internationalFreightUSD: 3800,
    insuranceRatePct: 0.65,
    insuranceMinUSD: 180,

    // Destino (DAP)
    destinationThcAndPortUSD: 850,
    inlandFreightDestinationUSD: 1400,

    // Aduana e Impuestos (DDP)
    hsCode: '8428.60.00.00',
    hsDescription: 'Teleféricos (incluidos los telesquís); mecanismos de tracción para funiculares',
    baseDutyPct: 10.0,
    isFtaApplied: true,
    ftaAgreementName: 'Tratado de Libre Comercio TLC G3 / Alianza del Pacífico',
    destinationCustomsBrokerUSD: 950,
    localTaxesDestPct: 0.0, // Exención arancelaria / crédito fiscal

    // Financiero & Riesgo
    quoteCurrency: 'USD',
    exchangeRates: {
      USD: 1,
      EUR: 0.88,
      COP: 3300,
      MXN: 17.90,
      CLP: 960,
      PEN: 3.42,
      BOB: 12.24,
      CHF: 0.83,
    },
    forexRiskMarginPct: 1.5,
    hasLetterOfCredit: true,
    letterOfCreditCostPct: 1.8,
    hasBankGuarantee: true,
    bankGuaranteeCostUSD: 1200,
    creditTermDays: 60,
    financingAnnualRatePct: 8.5,

    // Compliance
    complianceStandards: getDefaultComplianceStandards('México', 'Teleférico Completo'),
  });

  // Metadatos de la cotización
  const [quoteTitle, setQuoteTitle] = useState('Suministro y Montaje de Grupo Motriz y Balancines STC');
  const [clientName, setClientName] = useState('Servicio de Transportes Eléctricos - Cablebús CDMX');

  // Estados de IA
  const [aiLoadingLogistics, setAiLoadingLogistics] = useState(false);
  const [aiLogisticsResult, setAiLogisticsResult] = useState<AiPackagingRecommendation | null>(null);

  const [aiLoadingCustoms, setAiLoadingCustoms] = useState(false);
  const [aiCustomsQuery, setAiCustomsQuery] = useState('');
  const [aiCustomsResult, setAiCustomsResult] = useState<AiHsCodeRecommendation | null>(null);

  const [aiLoadingCompliance, setAiLoadingCompliance] = useState(false);
  const [aiComplianceSummary, setAiComplianceSummary] = useState<string | null>(null);

  // Gestión de Trazabilidad, Fuentes de Datos y TRMs
  const [forexData, setForexData] = useState<LiveForexResult | null>(null);
  const [isLoadingForex, setIsLoadingForex] = useState(false);
  const [showInspector, setShowInspector] = useState(false);

  // Carga inicial de TRMs oficiales / live API
  useEffect(() => {
    let isMounted = true;
    fetchLiveExchangeRates().then((res) => {
      if (isMounted) {
        setForexData(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshForex = async () => {
    setIsLoadingForex(true);
    try {
      const res = await fetchLiveExchangeRates();
      setForexData(res);
      setState((prev) => ({
        ...prev,
        exchangeRates: res.rates,
      }));
    } catch (e) {
      console.error('Error al actualizar tasas de cambio en vivo:', e);
    } finally {
      setIsLoadingForex(false);
    }
  };

  // Prellenar cotización si proviene del Radar de Oportunidades
  useEffect(() => {
    if (initialOpportunity) {
      setQuoteTitle(initialOpportunity.title);
      setClientName(initialOpportunity.entity);
      handleDestinationCountryChange(initialOpportunity.country);
      setState((prev) => ({
        ...prev,
        destinationCountry: initialOpportunity.country,
        destinationCity: initialOpportunity.city,
        manufacturingCostUSD: Math.round(initialOpportunity.budgetUSD * 0.65),
      }));
    }
  }, [initialOpportunity]);

  // Gestión de API Key de Gemini
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [apiKeyTestResult, setApiKeyTestResult] = useState<{ testing: boolean; valid?: boolean; message?: string }>({ testing: false });
  const hasGeminiApiKey = Boolean(getGeminiApiKey());

  // Modal PDF
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Cálculo en Tiempo Real
  const breakdown = useMemo(() => calculateQuoteBreakdown(state), [state]);
  const cargoMetrics = useMemo(() => calculateCargoMetrics(state.packages, state.unitSystem), [state.packages, state.unitSystem]);

  // Cambio dinámico de País Destino con adaptación automática de TLC y Normas
  const handleDestinationCountryChange = (newCountry: string) => {
    const newStandards = getDefaultComplianceStandards(newCountry, quoteTitle);
    let fta = `Tratado Comercial Bilateral con ${newCountry}`;
    const d = newCountry.toLowerCase();
    if (d.includes('méxico') || d.includes('mexico')) fta = 'Tratado de Libre Comercio TLC G3 / Alianza del Pacífico';
    else if (d.includes('estados unidos') || d.includes('ee.uu') || d.includes('usa')) fta = 'Tratado de Promoción Comercial (TPA) Colombia - EE.UU.';
    else if (d.includes('chile')) fta = 'Acuerdo de Libre Comercio ACE 24 / Alianza del Pacífico';
    else if (d.includes('bolivia') || d.includes('ecuador') || d.includes('perú') || d.includes('peru')) fta = 'Comunidad Andina de Naciones (CAN) - Desgravación 100%';
    else if (d.includes('europa') || d.includes('españa') || d.includes('francia') || d.includes('alemania')) fta = 'Acuerdo Comercial Multipartes Unión Europea - Colombia';

    setState((prev) => ({
      ...prev,
      destinationCountry: newCountry,
      ftaAgreementName: fta,
      complianceStandards: newStandards,
    }));
    setAiComplianceSummary(null);
  };

  // IA: Auditoría de Cumplimiento Técnico
  const handleRunAiCompliance = async () => {
    setAiLoadingCompliance(true);
    try {
      const res = await auditComplianceWithAi(state.destinationCountry, quoteTitle);
      setState((prev) => ({
        ...prev,
        complianceStandards: res.standards,
      }));
      setAiComplianceSummary(res.summary);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoadingCompliance(false);
    }
  };

  const handleSaveApiKey = async () => {
    setApiKeyTestResult({ testing: true });
    const res = await testApiKey(apiKeyInput);
    if (res.valid) {
      saveGeminiApiKey(apiKeyInput);
      setApiKeyTestResult({ testing: false, valid: true, message: '¡API Key de Google Gemini validada y guardada con éxito!' });
      setTimeout(() => setIsApiKeyModalOpen(false), 1200);
    } else {
      setApiKeyTestResult({ testing: false, valid: false, message: res.error || 'Clave de API inválida' });
    }
  };

  // Manejo de cambio de sistema de unidades
  const toggleUnitSystem = (newSystem: UnitSystem) => {
    if (newSystem === state.unitSystem) return;
    const isToImperial = newSystem === 'imperial';

    const convertedPackages = state.packages.map((pkg) => ({
      ...pkg,
      length: isToImperial ? Math.round(pkg.length / 2.54) : Math.round(pkg.length * 2.54),
      width: isToImperial ? Math.round(pkg.width / 2.54) : Math.round(pkg.width * 2.54),
      height: isToImperial ? Math.round(pkg.height / 2.54) : Math.round(pkg.height * 2.54),
      weight: isToImperial ? Math.round(pkg.weight * 2.20462) : Math.round(pkg.weight / 2.20462),
    }));

    setState((prev) => ({
      ...prev,
      unitSystem: newSystem,
      packages: convertedPackages,
    }));
  };

  // Preset rápido
  const handleApplyPreset = (presetKey: string) => {
    if (presetKey === 'mexico_cablebus') {
      setState((prev) => ({
        ...prev,
        destinationCountry: 'México',
        destinationCity: 'Ciudad de México (Cablebús)',
        manufacturingCostUSD: 145000,
        selectedIncoterm: 'DDP',
        hsCode: '8428.60.00.00',
        isFtaApplied: true,
        ftaAgreementName: 'TLC G3 / Alianza del Pacífico (México - Colombia)',
        complianceStandards: getDefaultComplianceStandards('México', 'Teleférico'),
      }));
      setQuoteTitle('Grupo Motriz STC 450 kW y Balancines para Cablebús');
      setClientName('Gobierno de la Ciudad de México - STE');
    } else if (presetKey === 'bolivia_teleferico') {
      setState((prev) => ({
        ...prev,
        destinationCountry: 'Bolivia',
        destinationCity: 'La Paz (Mi Teleférico)',
        manufacturingCostUSD: 95000,
        selectedIncoterm: 'CIF',
        hsCode: '7312.10.90.00',
        isFtaApplied: true,
        ftaAgreementName: 'Comunidad Andina (CAN) - Desgravación 100%',
        complianceStandards: getDefaultComplianceStandards('Bolivia', 'Cable de Acero'),
      }));
      setQuoteTitle('Bobina de Cable Portador-Tractor Compactado 52mm (4.2 km)');
      setClientName('Empresa Estatal de Transporte por Cable Mi Teleférico');
    } else if (presetKey === 'usa_asme') {
      setState((prev) => ({
        ...prev,
        destinationCountry: 'Estados Unidos',
        destinationCity: 'Salt Lake City, Utah (Ski Resort)',
        manufacturingCostUSD: 68000,
        selectedIncoterm: 'DAP',
        hsCode: '8431.39.00.00',
        isFtaApplied: true,
        ftaAgreementName: 'TLC / TPA Colombia - Estados Unidos',
        complianceStandards: getDefaultComplianceStandards('Estados Unidos', 'Mordazas STC'),
      }));
      setQuoteTitle('Juego de 40 Mordazas Desembragables con Resortes Helicoidales');
      setClientName('Wasatch Mountain Lift Operations LLC');
    }
  };

  // IA: Ejecutar Recomendador Logístico
  const handleRunAiLogistics = async () => {
    setAiLoadingLogistics(true);
    try {
      const res = await suggestPackagingAndFreight(state.packages, state.destinationCountry, state.unitSystem);
      setAiLogisticsResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoadingLogistics(false);
    }
  };

  // Aplicar sugerencia de IA a la cotización
  const handleApplyAiLogistics = () => {
    if (!aiLogisticsResult) return;
    setState((prev) => ({
      ...prev,
      targetPackaging: aiLogisticsResult.packagingType,
      packagingCostUSD: aiLogisticsResult.packagingCostUSD,
      targetFreightMode: aiLogisticsResult.freightMode,
      targetContainer: aiLogisticsResult.containerRecommendation,
    }));
  };

  // IA: Clasificación Arancelaria y Detección de TLC
  const handleRunAiCustoms = async () => {
    const textToAnalyze = aiCustomsQuery || quoteTitle || state.packages[0]?.description || 'Maquinaria STC';
    setAiLoadingCustoms(true);
    try {
      const res = await classifyHsCodeAndFta(textToAnalyze, state.destinationCountry, state.originCountry);
      setAiCustomsResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoadingCustoms(false);
    }
  };

  const handleApplyAiCustoms = () => {
    if (!aiCustomsResult) return;
    setState((prev) => ({
      ...prev,
      hsCode: aiCustomsResult.hsCode,
      hsDescription: aiCustomsResult.nomenclatureTitle,
      baseDutyPct: aiCustomsResult.generalDutyPct,
      isFtaApplied: aiCustomsResult.hasFtaAgreement,
      ftaAgreementName: aiCustomsResult.ftaName,
    }));
  };

  // Agregar nuevo bulto de carga
  const handleAddPackage = () => {
    const newPkg: CargoPackage = {
      id: `pkg-${Date.now()}`,
      description: 'Caja de Repuestos y Accesorios de Montaje',
      length: 120,
      width: 80,
      height: 90,
      weight: 350,
      quantity: 1,
      fragile: false,
      moistureSensitive: false,
      stackable: true,
    };
    setState((prev) => ({
      ...prev,
      packages: [...prev.packages, newPkg],
    }));
  };

  const handleRemovePackage = (id: string) => {
    setState((prev) => ({
      ...prev,
      packages: prev.packages.filter((p) => p.id !== id),
    }));
  };

  // Contenedor seleccionado actualmente para métricas
  const currentContainerSpec = CONTAINER_SPECS[state.targetContainer] || CONTAINER_SPECS['20ft'];
  const volumeFitPct = Math.min(100, Math.round((cargoMetrics.totalCBM / currentContainerSpec.maxCBM) * 100));
  const weightFitPct = Math.min(100, Math.round((cargoMetrics.totalGrossWeightKg / currentContainerSpec.maxPayloadKg) * 100));

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-4 sm:space-y-6">
      {/* 1. BARRA SUPERIOR DE HERRAMIENTAS */}
      <div className="bg-white p-3 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Selector de Moneda de Salida */}
          <div className="flex items-center gap-2 bg-slate-100/80 px-3 py-1.5 rounded-xl text-xs">
            <span className="text-slate-500 font-bold">Moneda Cotización:</span>
            <select
              value={state.quoteCurrency}
              onChange={(e) => setState({ ...state, quoteCurrency: e.target.value as CurrencyCode })}
              className="bg-white font-bold text-[#00668F] px-2.5 py-1 rounded-lg border-0 outline-none cursor-pointer shadow-2xs"
            >
              <option value="USD">USD ($ Dólar)</option>
              <option value="EUR">EUR (€ Euro)</option>
              <option value="COP">COP ($ Pesos Col)</option>
              <option value="MXN">MXN ($ Pesos Mex)</option>
              <option value="CLP">CLP ($ Pesos Ch)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón Inspector de Fuentes & Trazabilidad */}
          <button
            type="button"
            onClick={() => setShowInspector(!showInspector)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              showInspector
                ? 'bg-sky-100 text-[#00668F]'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
            title="Mostrar u ocultar el panel de trazabilidad de fuentes y auditoría de la IA"
          >
            <Database size={14} className={showInspector ? 'text-[#00668F]' : 'text-slate-500'} />
            <span>{showInspector ? 'Ocultar Fuentes IA' : '🔍 Fuentes & TRMs IA'}</span>
          </button>

          {/* Indicador y Configuración de IA */}
          <button
            type="button"
            onClick={() => setIsApiKeyModalOpen(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              hasGeminiApiKey
                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
            title="Ver o configurar la clave de Google Gemini API"
          >
            <Sparkles size={14} className={hasGeminiApiKey ? 'text-emerald-600' : 'text-amber-600'} />
            <span>{hasGeminiApiKey ? 'IA Gemini Activa' : 'IA Modo Local'}</span>
          </button>

          {/* Botón de Exportar a PDF */}
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#00668F] hover:bg-[#005073] text-white rounded-xl text-xs font-bold shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Printer size={15} />
            <span>Generar Oferta PDF</span>
          </button>
        </div>
      </div>

      {/* 2. TARJETA KPI EJECUTIVA FLOTANTE (RESUMEN FINANCIERO EN TIEMPO REAL) */}
      <div className="bg-[#0B1E28] text-white p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="whitespace-nowrap inline-flex items-center justify-center text-center leading-none text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full bg-[#00668F] text-white shrink-0">
              Incoterm {state.selectedIncoterm} 2020
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Destino: <strong className="text-white">{state.destinationCountry}</strong> ({state.destinationCity})
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              ${breakdown.selectedIncotermPriceUSD.toLocaleString()}{' '}
              <span className="text-xs sm:text-sm font-normal text-slate-300">USD</span>
            </h2>
            {state.quoteCurrency !== 'USD' && (
              <span className="text-base sm:text-lg font-bold text-emerald-300">
                ≈ {breakdown.selectedIncotermPriceTargetCurrency.toLocaleString()} {state.quoteCurrency}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            Costo Directo Inteckno: ${breakdown.totalCostIntecknoUSD.toLocaleString()} USD
          </p>
        </div>

        {/* Sección Secundaria: Utilidad y Carga (Grid armónico de 2 columnas en móvil y tablet) */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6 pt-3 lg:pt-0 border-t border-slate-700/60 lg:border-t-0 lg:border-l lg:border-slate-700/60 lg:pl-6 text-left">
          <div className="space-y-0.5">
            <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">
              Utilidad Neta Real
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-300">
              +${breakdown.totalProfitIntecknoUSD.toLocaleString()} USD
            </div>
            <span className="text-[10px] text-slate-400 font-medium block">
              +${(breakdown.totalProfitIntecknoCOP / 1_000_000).toFixed(1)}M COP ({breakdown.netMarginPct}% margen)
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-sky-300 font-bold block uppercase tracking-wider">
              Carga Consolidada
            </span>
            <div className="text-xs sm:text-sm font-bold text-white">
              {breakdown.totalGrossWeightKg.toLocaleString()} kg | {breakdown.totalCBM} CBM
            </div>
            <span className="text-[10px] text-slate-400 block font-medium">
              Ocupación: {volumeFitPct}% del {state.targetContainer.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* 2.5 DATOS DEL PROYECTO, CLIENTE Y RUTA INTERNACIONAL */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-sky-50 text-[#00668F] rounded-2xl font-bold">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Datos de la Cotización & Ruta Comercial</h3>
              <p className="text-[11px] text-slate-500">
                Personaliza la máquina o repuestos, la entidad compradora y el país destino
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Nombre del Proyecto / Equipo Cotizado</label>
            <input
              type="text"
              value={quoteTitle}
              onChange={(e) => setQuoteTitle(e.target.value)}
              placeholder="Ej: Grupo Motriz 450 kW con Reductor Epicicloidal..."
              className="w-full h-11 px-3.5 py-0 bg-slate-100 rounded-xl font-semibold text-xs text-slate-800 leading-normal flex items-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00668F]/25"
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Cliente / Entidad Operadora</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Ej: Cablebús CDMX, Mi Teleférico La Paz, etc."
              className="w-full h-11 px-3.5 py-0 bg-slate-100 rounded-xl font-semibold text-xs text-slate-800 leading-normal flex items-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00668F]/25"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">País de Origen (Fabricación)</label>
            <select
              value={state.originCountry}
              onChange={(e) => setState({ ...state, originCountry: e.target.value })}
              className="w-full h-11 px-3.5 py-0 bg-slate-100 rounded-xl font-semibold text-xs text-slate-800 leading-normal focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00668F]/25"
            >
              <option value="Colombia">Colombia (Planta Inteckno - Medellín)</option>
              <option value="Austria">Austria (Doppelmayr HQ)</option>
              <option value="Francia">Francia (Poma / BMF)</option>
              <option value="Suiza">Suiza (Garaventa / Fatzer)</option>
              <option value="China">China (Fabricación Estructuras)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-gray-700 mb-1">País de Destino</label>
            <select
              value={state.destinationCountry}
              onChange={(e) => handleDestinationCountryChange(e.target.value)}
              className="w-full h-11 px-3.5 py-0 bg-slate-100 rounded-xl font-bold text-xs text-[#00668F] leading-normal focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00668F]/25"
            >
              <option value="México">México</option>
              <option value="Bolivia">Bolivia</option>
              <option value="Ecuador">Ecuador</option>
              <option value="Estados Unidos">Estados Unidos</option>
              <option value="Chile">Chile</option>
              <option value="Perú">Perú</option>
              <option value="Colombia">Colombia</option>
              <option value="España">España</option>
              <option value="Suiza">Suiza</option>
              <option value="Panamá">Panamá</option>
            </select>
          </div>

          <div className="lg:col-span-2">
            <label className="block text-[11px] font-bold text-gray-700 mb-1">Ciudad / Puerto / Estación de Destino</label>
            <input
              type="text"
              value={state.destinationCity}
              onChange={(e) => setState({ ...state, destinationCity: e.target.value })}
              placeholder="Ej: Ciudad de México (Cablebús Línea 3)"
              className="w-full h-11 px-3.5 py-0 bg-slate-100 rounded-xl font-semibold text-xs text-slate-800 leading-normal flex items-center focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#00668F]/25"
            />
          </div>
        </div>
      </div>

      {/* 2.8 PANEL DE TRAZABILIDAD, FUENTES OFICIALES & AUDITORÍA DE LA IA */}
      {showInspector && (
        <AiDataSourceInspector
          state={state}
          breakdown={breakdown}
          forexData={forexData}
          onRefreshForex={handleRefreshForex}
          isLoadingForex={isLoadingForex}
          aiLogisticsResult={aiLogisticsResult}
          aiCustomsResult={aiCustomsResult}
          aiComplianceSummary={aiComplianceSummary}
          hasGeminiApiKey={hasGeminiApiKey}
          onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        />
      )}

      {/* 3. GRID CON LOS 5 MÓDULOS DE LA CALCULADORA */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* COLUMNA IZQUIERDA: MÓDULOS TÉCNICOS Y LOGÍSTICOS (7 COLS) */}
        <div className="xl:col-span-7 space-y-6">
          {/* ========================================================= */}
          {/* MÓDULO 1: LOGÍSTICA (PESO, VOLUMEN Y CUBICAJE DE CARGA)   */}
          {/* ========================================================= */}
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-sky-50 text-[#00668F] rounded-2xl font-bold">
                  <Box size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">1. Módulo Logístico (Dimensiones & Cubicaje)</h3>
                  <p className="text-[11px] text-slate-500">
                    Calcula volumen CBM, peso volumétrico y ocupación en contenedor
                  </p>
                </div>
              </div>

              {/* Selector Métrico vs Imperial */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => toggleUnitSystem('metric')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    state.unitSystem === 'metric'
                      ? 'bg-white text-[#00668F] shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Métrico (cm, kg)
                </button>
                <button
                  type="button"
                  onClick={() => toggleUnitSystem('imperial')}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    state.unitSystem === 'imperial'
                      ? 'bg-white text-[#00668F] shadow-xs'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Imperial (in, lbs)
                </button>
              </div>
            </div>

            {/* Lista de Bultos / Componentes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Lista de Carga y Bultos ({state.packages.length} ítems):</span>
                <button
                  type="button"
                  onClick={handleAddPackage}
                  className="flex items-center gap-1 text-[#00668F] hover:text-[#005073] cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Añadir Bulto</span>
                </button>
              </div>

              {state.packages.map((pkg, idx) => (
                <div
                  key={pkg.id}
                  className="p-3 bg-slate-50/80 rounded-xl border border-gray-200/80 space-y-2.5 text-xs transition-all hover:border-gray-300"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-800 text-[11px]">Bulto #{idx + 1}</span>
                    <input
                      type="text"
                      value={pkg.description}
                      onChange={(e) => {
                        const val = e.target.value;
                        setState((prev) => ({
                          ...prev,
                          packages: prev.packages.map((p) => (p.id === pkg.id ? { ...p, description: val } : p)),
                        }));
                      }}
                      className="flex-1 text-xs p-1.5 rounded-lg border border-gray-300 bg-white font-medium focus:outline-none focus:border-[#00668F]"
                      placeholder="Descripción de la pieza o maquinaria..."
                    />
                    {state.packages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePackage(pkg.id)}
                        className="text-gray-400 hover:text-red-600 p-1 cursor-pointer"
                        title="Eliminar bulto"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 block">Largo ({state.unitSystem === 'metric' ? 'cm' : 'in'})</label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.length}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setState((prev) => ({
                            ...prev,
                            packages: prev.packages.map((p) => (p.id === pkg.id ? { ...p, length: val } : p)),
                          }));
                        }}
                        className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block">Ancho ({state.unitSystem === 'metric' ? 'cm' : 'in'})</label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.width}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setState((prev) => ({
                            ...prev,
                            packages: prev.packages.map((p) => (p.id === pkg.id ? { ...p, width: val } : p)),
                          }));
                        }}
                        className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block">Alto ({state.unitSystem === 'metric' ? 'cm' : 'in'})</label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.height}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setState((prev) => ({
                            ...prev,
                            packages: prev.packages.map((p) => (p.id === pkg.id ? { ...p, height: val } : p)),
                          }));
                        }}
                        className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-bold text-center"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block">Peso Unit. ({state.unitSystem === 'metric' ? 'kg' : 'lbs'})</label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.weight}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setState((prev) => ({
                            ...prev,
                            packages: prev.packages.map((p) => (p.id === pkg.id ? { ...p, weight: val } : p)),
                          }));
                        }}
                        className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-bold text-center text-[#00668F]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block">Cantidad</label>
                      <input
                        type="number"
                        min="1"
                        value={pkg.quantity}
                        onChange={(e) => {
                          const val = Math.max(1, Number(e.target.value));
                          setState((prev) => ({
                            ...prev,
                            packages: prev.packages.map((p) => (p.id === pkg.id ? { ...p, quantity: val } : p)),
                          }));
                        }}
                        className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* Badges de características especiales */}
                  <div className="flex items-center gap-3 pt-1 text-[11px] text-gray-600">
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkg.fragile}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setState((prev) => ({
                            ...prev,
                            packages: prev.packages.map((p) => (p.id === pkg.id ? { ...p, fragile: val } : p)),
                          }));
                        }}
                        className="rounded accent-[#00668F]"
                      />
                      <span>⚠️ Frágil</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pkg.moistureSensitive}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setState((prev) => ({
                            ...prev,
                            packages: prev.packages.map((p) => (p.id === pkg.id ? { ...p, moistureSensitive: val } : p)),
                          }));
                        }}
                        className="rounded accent-[#00668F]"
                      />
                      <span>💧 Sensible a Humedad/Salitre</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen de Espacio & Ocupación en Contenedor */}
            <div className="p-4 bg-slate-100/80 rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-bold text-slate-800">Cálculo Automático de Espacio & Capacidad:</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">Contenedor Seleccionado:</span>
                  <select
                    value={state.targetContainer}
                    onChange={(e) => setState({ ...state, targetContainer: e.target.value as ContainerType })}
                    className="p-1 rounded-lg border border-gray-300 bg-white font-bold text-xs"
                  >
                    <option value="20ft">20ft Standard (33.2 m³ / 28 ton)</option>
                    <option value="40ft">40ft Standard (67.7 m³ / 26.6 ton)</option>
                    <option value="40hc">40ft High Cube (76.4 m³ / 26.4 ton)</option>
                    <option value="flat_rack">Flat Rack (Sobredimensionado)</option>
                  </select>
                </div>
              </div>

              {/* Barras de Ocupación */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Ocupación por Volumen (CBM):</span>
                    <span className="font-bold text-[#00668F]">{volumeFitPct}% ({cargoMetrics.totalCBM} m³)</span>
                  </div>
                  <div className="progress-track w-full bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        volumeFitPct > 90 ? 'bg-amber-500' : 'bg-[#00668F]'
                      }`}
                      style={{ width: `${Math.min(100, volumeFitPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Capacidad máxima: {currentContainerSpec.maxCBM} CBM
                  </span>
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Ocupación por Peso (Payload):</span>
                    <span className={`font-bold ${weightFitPct > 90 ? 'text-rose-600' : 'text-emerald-700'}`}>
                      {weightFitPct}% ({cargoMetrics.totalGrossWeightKg.toLocaleString()} kg)
                    </span>
                  </div>
                  <div className="progress-track w-full bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        weightFitPct > 90 ? 'bg-rose-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, weightFitPct)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Carga útil máxima: {currentContainerSpec.maxPayloadKg.toLocaleString()} kg
                  </span>
                </div>
              </div>
            </div>

            {/* 🤖 FUNCIÓN CON IA: RECOMENDADOR INTELIGENTE DE EMBALAJE Y MODALIDAD */}
            <div className="p-4 bg-sky-50/70 rounded-xl border border-sky-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-xs text-[#00668F]">
                  <Sparkles size={16} className="text-[#00668F]" />
                  <span>🤖 Asistente de IA: Recomendador de Embalaje y Modalidad Óptima</span>
                </div>
                <button
                  type="button"
                  onClick={handleRunAiLogistics}
                  disabled={aiLoadingLogistics}
                  className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={12} className={aiLoadingLogistics ? 'animate-spin' : ''} />
                  <span>{aiLoadingLogistics ? 'Analizando carga con IA...' : 'Analizar con IA'}</span>
                </button>
              </div>

              {aiLogisticsResult ? (
                <div className="p-3 bg-white rounded-xl border border-sky-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      📦 {aiLogisticsResult.packagingName}
                    </span>
                    <span className="font-extrabold text-[#00668F]">
                      ${aiLogisticsResult.packagingCostUSD.toLocaleString()} USD
                    </span>
                  </div>

                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    {aiLogisticsResult.rationale}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div>
                      Modalidad sugerida: <strong className="text-emerald-700">{aiLogisticsResult.freightModeName}</strong> ({aiLogisticsResult.containerRecommendation.toUpperCase()})
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyAiLogistics}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      ✓ Aplicar esta sugerencia al presupuesto
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Haz clic en <strong>Analizar con IA</strong> para que nuestro motor industrial examine dimensiones, peso y riesgo de corrosión marítima, sugiriendo el embalaje óptimo (NIMF 15, VCI al vacío, cuna metálica) y la modalidad más económica (FCL, LCL o Aéreo).
                </p>
              )}
            </div>
          </div>

          {/* ========================================================= */}
          {/* MÓDULO 2: COSTOS EN CASCADA (INCOTERMS 2020)              */}
          {/* ========================================================= */}
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-2xl font-bold">
                  <Ship size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">2. Módulo de Costos en Cascada (Incoterms 2020)</h3>
                  <p className="text-[11px] text-slate-500">
                    Acumulación progresiva de costos desde la fábrica (EXW) hasta entrega final (DDP)
                  </p>
                </div>
              </div>
            </div>

            {/* Selector Visual de Incoterm */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">
                Seleccionar Término de Venta Internacional (Incoterm Objetivo):
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {(['EXW', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'] as Incoterm[]).map((inc) => (
                  <button
                    key={inc}
                    type="button"
                    onClick={() => setState({ ...state, selectedIncoterm: inc })}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      state.selectedIncoterm === inc
                        ? 'bg-[#00668F] text-white shadow-xs scale-102 ring-2 ring-[#00668F]/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {inc}
                  </button>
                ))}
              </div>
            </div>

            {/* Cascada de Costos Editable */}
            <div className="space-y-3 pt-2">
              {/* 1. EXW */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">1. Fábrica Inteckno (EXW)</span>
                  <span className="font-extrabold text-[#00668F]">${breakdown.exwPriceUSD.toLocaleString()} USD</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block">Costo Fabricación / Materiales ($ USD)</label>
                    <input
                      type="number"
                      value={state.manufacturingCostUSD}
                      onChange={(e) => setState({ ...state, manufacturingCostUSD: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">Margen Básico Fabricante (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={state.baseMarginPct}
                      onChange={(e) => setState({ ...state, baseMarginPct: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-bold text-emerald-700"
                    />
                  </div>
                </div>
              </div>

              {/* 2. FOB / FCA */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">2. Puesto a Bordo / Aduana Origen (FOB)</span>
                  <span className="font-extrabold text-slate-800">${breakdown.fobPriceUSD.toLocaleString()} USD</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block">Embalaje Expo ($ USD)</label>
                    <input
                      type="number"
                      value={state.packagingCostUSD}
                      onChange={(e) => setState({ ...state, packagingCostUSD: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">Flete Origen a Puerto ($ USD)</label>
                    <input
                      type="number"
                      value={state.inlandFreightOriginUSD}
                      onChange={(e) => setState({ ...state, inlandFreightOriginUSD: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">THC + Aduana Origen ($ USD)</label>
                    <input
                      type="number"
                      value={state.exportCustomsAndThcUSD}
                      onChange={(e) => setState({ ...state, exportCustomsAndThcUSD: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 3. CFR & CIF */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">3. Flete & Seguro Internacional (CIF)</span>
                  <span className="font-extrabold text-slate-800">${breakdown.cifPriceUSD.toLocaleString()} USD</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block">Flete Internacional Marítimo/Aéreo ($ USD)</label>
                    <input
                      type="number"
                      value={state.internationalFreightUSD}
                      onChange={(e) => setState({ ...state, internationalFreightUSD: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">Tasa Seguro Póliza Todo Riesgo (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={state.insuranceRatePct}
                      onChange={(e) => setState({ ...state, insuranceRatePct: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 4. DAP */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">4. Llegada a Destino & Transporte en Destino (DAP)</span>
                  <span className="font-extrabold text-slate-800">${breakdown.dapPriceUSD.toLocaleString()} USD</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block">Gastos Portuarios THC Destino ($ USD)</label>
                    <input
                      type="number"
                      value={state.destinationThcAndPortUSD}
                      onChange={(e) => setState({ ...state, destinationThcAndPortUSD: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">Flete Terrestre a Sitio en Destino ($ USD)</label>
                    <input
                      type="number"
                      value={state.inlandFreightDestinationUSD}
                      onChange={(e) => setState({ ...state, inlandFreightDestinationUSD: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 5. DDP */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">5. Entrega con Derechos Pagados (DDP)</span>
                  <span className="font-extrabold text-[#00668F]">${breakdown.ddpPriceUSD.toLocaleString()} USD</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block">Agente Aduanal Destino ($ USD)</label>
                    <input
                      type="number"
                      value={state.destinationCustomsBrokerUSD}
                      onChange={(e) => setState({ ...state, destinationCustomsBrokerUSD: Number(e.target.value) })}
                      className="w-full p-1.5 rounded-lg border border-gray-300 bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block">Aranceles e Impuestos Destino</label>
                    <div className="p-2 bg-white rounded-lg border border-gray-200 text-xs font-bold text-slate-800">
                      {state.isFtaApplied ? '0% (Exento por TLC)' : `$${breakdown.importDutyUSD.toLocaleString()} USD (${state.baseDutyPct}%)`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: ADUANA, FINANCIERO Y COMPLIANCE (5 COLS) */}
        <div className="xl:col-span-5 space-y-6">
          {/* ========================================================= */}
          {/* MÓDULO 3: ADUANERO E IMPUESTOS (TLC & HS CODE)            */}
          {/* ========================================================= */}
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-50 text-amber-700 rounded-2xl font-bold">
                  <Scale size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">3. Módulo Aduanero e Impuestos</h3>
                  <p className="text-[11px] text-slate-500">
                    Partida arancelaria (HS Code) y beneficios de Tratados de Libre Comercio (TLC)
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Partida Arancelaria (HS Code)</label>
                  <input
                    type="text"
                    value={state.hsCode}
                    onChange={(e) => setState({ ...state, hsCode: e.target.value })}
                    className="w-full p-2 rounded-xl border border-gray-300 bg-white font-mono font-bold text-[#00668F]"
                    placeholder="8428.60.00"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-700 mb-0.5">Arancel General (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={state.baseDutyPct}
                    onChange={(e) => setState({ ...state, baseDutyPct: Number(e.target.value) })}
                    className="w-full p-2 rounded-xl border border-gray-300 bg-white font-bold text-center"
                  />
                </div>
              </div>

              {/* Casilla de TLC */}
              <div className={`p-3 rounded-xl border transition-all ${
                state.isFtaApplied ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-slate-50 border-gray-200 text-gray-700'
              }`}>
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                    <input
                      type="checkbox"
                      checked={state.isFtaApplied}
                      onChange={(e) => setState({ ...state, isFtaApplied: e.target.checked })}
                      className="w-4 h-4 rounded accent-emerald-600"
                    />
                    <span>Activar Beneficio Tratado de Libre Comercio (TLC)</span>
                  </label>
                  {state.isFtaApplied && (
                    <span className="text-[10px] font-extrabold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                      Arancel: 0%
                    </span>
                  )}
                </div>

                {state.isFtaApplied && (
                  <div className="mt-2 text-[10.5px] text-emerald-800 space-y-1">
                    <div className="font-semibold">Acuerdo: {state.ftaAgreementName}</div>
                    <div className="bg-white/80 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5 font-medium">
                      <FileCheck2 size={14} className="text-emerald-700 shrink-0" />
                      <span>
                        Recordatorio: Emitir <strong>Certificado de Origen oficial</strong> con valor agregado nacional antes del zarpe.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 🤖 FUNCIÓN CON IA: ASISTENTE DE CLASIFICACIÓN ARANCELARIA */}
              <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
                <span className="font-bold text-amber-900 text-xs flex items-center gap-1">
                  <Sparkles size={14} className="text-amber-600" />
                  🤖 Asistente de Clasificación Arancelaria con IA
                </span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Describa la pieza (ej: mordaza desembragable, bomba hidráulica)..."
                    value={aiCustomsQuery}
                    onChange={(e) => setAiCustomsQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleRunAiCustoms();
                      }
                    }}
                    className="flex-1 text-xs p-2 rounded-xl border border-gray-300 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleRunAiCustoms}
                    disabled={aiLoadingCustoms}
                    className="px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {aiLoadingCustoms ? 'Buscando...' : 'Clasificar'}
                  </button>
                </div>

                {/* Chips de ejemplos rápidos para probar */}
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-[10px] text-gray-500 font-semibold">Ejemplos rápidos:</span>
                  {[
                    'Bomba hidráulica de tensión',
                    'Mordaza desembragable 10pax',
                    'Bobina cable acero 52mm',
                    'Motor eléctrico 450kW',
                    'Balancín de 8 poleas',
                  ].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => {
                        setAiCustomsQuery(ex);
                      }}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-amber-100/80 hover:bg-amber-200 text-amber-900 font-medium transition-colors cursor-pointer"
                    >
                      {ex}
                    </button>
                  ))}
                </div>

                {aiCustomsResult && (
                  <div className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs space-y-1.5">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-[#00668F] font-mono">HS: {aiCustomsResult.hsCode}</span>
                      <span className="text-emerald-700">TLC: {aiCustomsResult.hasFtaAgreement ? 'Disponible (0%)' : 'No'}</span>
                    </div>
                    <p className="text-[11px] text-gray-700 font-medium">{aiCustomsResult.nomenclatureTitle}</p>
                    <p className="text-[10px] text-gray-500">{aiCustomsResult.rationale}</p>
                    <button
                      type="button"
                      onClick={handleApplyAiCustoms}
                      className="w-full mt-1 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-[11px] cursor-pointer"
                    >
                      ✓ Aplicar Partida y TLC
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MÓDULO 4: FINANCIERO Y GESTIÓN DE RIESGO CAMBIARIO        */}
          {/* ========================================================= */}
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-purple-50 text-purple-700 rounded-2xl font-bold">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">4. Módulo Financiero y Gestión de Riesgo</h3>
                  <p className="text-[11px] text-slate-500">
                    Cobertura cambiaria, cartas de crédito y costo de financiamiento
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              {/* Tasas de Cambio (TRMs Oficiales & Mercado) */}
              <div className="p-3.5 bg-slate-50/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Coins size={14} className="text-[#00668F]" />
                    <span>Tasas de Cambio Oficiales (TRM Activa)</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRefreshForex}
                    disabled={isLoadingForex}
                    className="text-[11px] font-bold text-[#00668F] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw size={11} className={isLoadingForex ? 'animate-spin' : ''} />
                    <span>{isLoadingForex ? 'Actualizando...' : 'Actualizar TRM'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-white p-2 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-bold">USD / COP</span>
                    <span className="text-xs font-black text-slate-900">${state.exchangeRates.COP.toLocaleString()}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-bold">USD / MXN</span>
                    <span className="text-xs font-black text-slate-900">${state.exchangeRates.MXN}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-bold">EUR / USD</span>
                    <span className="text-xs font-black text-slate-900">€{state.exchangeRates.EUR}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl shadow-2xs">
                    <span className="text-[10px] text-slate-400 block font-bold">USD / CLP</span>
                    <span className="text-xs font-black text-slate-900">${state.exchangeRates.CLP.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10.5px] text-slate-500 pt-1">
                  <span>Fuentes: BanRep, Banxico, BCE, BCCh</span>
                  <button
                    type="button"
                    onClick={() => setShowInspector(true)}
                    className="text-[#00668F] font-bold hover:underline"
                  >
                    Ver trazabilidad y fuentes completas →
                  </button>
                </div>
              </div>

              {/* Riesgo Cambiario (Forex Buffer) */}
              <div>
                <div className="flex justify-between font-bold text-gray-700 mb-1">
                  <span>Margen de Cobertura Cambiaria (Forex Buffer):</span>
                  <span className="text-[#00668F]">+{state.forexRiskMarginPct}% (+${breakdown.forexRiskBufferUSD.toLocaleString()} USD)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={state.forexRiskMarginPct}
                  onChange={(e) => setState({ ...state, forexRiskMarginPct: Number(e.target.value) })}
                  className="w-full accent-[#00668F] cursor-pointer"
                />
                <span className="text-[10px] text-gray-400 block">
                  Protege la cotización contra fluctuaciones de TRM durante 30 a 60 días de vigencia de oferta.
                </span>
              </div>

              {/* Cartas de Crédito y Garantías */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                  <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.hasLetterOfCredit}
                      onChange={(e) => setState({ ...state, hasLetterOfCredit: e.target.checked })}
                      className="rounded accent-[#00668F]"
                    />
                    <span>Carta de Crédito (L/C)</span>
                  </label>
                  {state.hasLetterOfCredit && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-gray-500">Costo:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={state.letterOfCreditCostPct}
                        onChange={(e) => setState({ ...state, letterOfCreditCostPct: Number(e.target.value) })}
                        className="w-14 p-1 rounded border border-gray-300 text-center font-bold"
                      />
                      <span className="text-[10px] font-bold text-gray-600">%</span>
                    </div>
                  )}
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl space-y-1">
                  <label className="flex items-center gap-1.5 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.hasBankGuarantee}
                      onChange={(e) => setState({ ...state, hasBankGuarantee: e.target.checked })}
                      className="rounded accent-[#00668F]"
                    />
                    <span>Póliza / Garantía Bancaria</span>
                  </label>
                  {state.hasBankGuarantee && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-gray-500">$ USD:</span>
                      <input
                        type="number"
                        value={state.bankGuaranteeCostUSD}
                        onChange={(e) => setState({ ...state, bankGuaranteeCostUSD: Number(e.target.value) })}
                        className="w-20 p-1 rounded border border-gray-300 text-center font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Financiamiento al Cliente */}
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-slate-800 block">Financiamiento Comercial:</span>
                  <span className="text-[10px] text-gray-500">Plazo de pago diferido a cliente</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={state.creditTermDays}
                    onChange={(e) => setState({ ...state, creditTermDays: Number(e.target.value) as any })}
                    className="p-1.5 rounded-lg border border-gray-300 bg-white font-bold text-xs"
                  >
                    <option value={0}>De contado (0 días)</option>
                    <option value={30}>30 Días</option>
                    <option value={60}>60 Días</option>
                    <option value={90}>90 Días</option>
                    <option value={120}>120 Días</option>
                  </select>
                  {state.creditTermDays > 0 && (
                    <span className="text-xs font-bold text-purple-700">
                      +${breakdown.financingCostUSD.toLocaleString()} USD
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MÓDULO 5: CUMPLIMIENTO TÉCNICO (COMPLIANCE INTERNACIONAL) */}
          {/* ========================================================= */}
          <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-2xl font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">5. Módulo de Cumplimiento Técnico (Compliance)</h3>
                  <p className="text-[11px] text-slate-500">
                    Validación de normativas obligatorias (ASME B77, Marcado CE, NTC 5957, NOM)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunAiCompliance}
                disabled={aiLoadingCompliance}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={aiLoadingCompliance ? 'animate-spin' : ''} />
                <span>{aiLoadingCompliance ? 'Auditando...' : '🤖 Auditar con IA'}</span>
              </button>
            </div>

            {aiComplianceSummary && (
              <div className="p-3 bg-rose-50/80 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-start gap-2">
                <Sparkles size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <div className="font-bold">Dictamen de Auditoría de IA ({state.destinationCountry}):</div>
                  <p className="text-[11px] text-rose-800 leading-relaxed">{aiComplianceSummary}</p>
                </div>
              </div>
            )}

            <div className="space-y-2.5 text-xs">
              {state.complianceStandards.map((std) => (
                <div
                  key={std.id}
                  className={`p-3 rounded-xl border transition-all ${
                    std.selected ? 'bg-sky-50/60 border-sky-300' : 'bg-slate-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={std.selected}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setState((prev) => ({
                            ...prev,
                            complianceStandards: prev.complianceStandards.map((s) =>
                              s.id === std.id ? { ...s, selected: val } : s
                            ),
                          }));
                        }}
                        className="mt-0.5 rounded accent-[#00668F]"
                      />
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{std.code}</span>
                          {std.mandatory && (
                            <span className="text-[9px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-bold uppercase">
                              Obligatoria en {state.destinationCountry}
                            </span>
                          )}
                        </div>
                        <div className="text-[10.5px] text-slate-600 mt-0.5">{std.name}</div>
                      </div>
                    </label>
                    <span className="font-extrabold text-[#00668F] shrink-0">
                      +${std.estimatedCostUSD.toLocaleString()} USD
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 pl-6">{std.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. DESGLOSE VISUAL FINAL DE COSTOS (GRÁFICO DE COMPOSICIÓN & UTILIDAD) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp size={16} className="text-[#00668F]" />
          Desglose Visual de Estructura de Costos & Margen Comercial
        </h3>

        {/* Barra de Distribución Porcentual */}
        <div className="w-full bg-slate-100 h-4 rounded-xl overflow-hidden flex">
          <div
            title="Fabricación Base (EXW)"
            className="bg-[#00668F] h-full"
            style={{ width: `${(breakdown.exwManufacturingUSD / breakdown.selectedIncotermPriceUSD) * 100}%` }}
          />
          <div
            title="Logística, Embalaje & Flete"
            className="bg-sky-400 h-full"
            style={{ width: `${((breakdown.exportPackagingUSD + breakdown.internationalFreightUSD + breakdown.inlandFreightOriginUSD) / breakdown.selectedIncotermPriceUSD) * 100}%` }}
          />
          <div
            title="Aduanas, Impuestos & Seguro"
            className="bg-amber-400 h-full"
            style={{ width: `${((breakdown.importDutyUSD + breakdown.transitInsuranceUSD + breakdown.importBrokerAndFormalitiesUSD) / breakdown.selectedIncotermPriceUSD) * 100}%` }}
          />
          <div
            title="Riesgo Cambiario & Financiero"
            className="bg-purple-500 h-full"
            style={{ width: `${(breakdown.totalFinancialCostUSD / breakdown.selectedIncotermPriceUSD) * 100}%` }}
          />
          <div
            title="Utilidad Real Inteckno"
            className="bg-emerald-500 h-full"
            style={{ width: `${(breakdown.totalProfitIntecknoUSD / breakdown.selectedIncotermPriceUSD) * 100}%` }}
          />
        </div>

        {/* Leyenda de la Barra */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#00668F] shrink-0" />
            <span className="text-gray-600 truncate">Fabricación ({Math.round((breakdown.exwManufacturingUSD / breakdown.selectedIncotermPriceUSD) * 100)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0" />
            <span className="text-gray-600 truncate">Logística & Flete ({Math.round(((breakdown.exportPackagingUSD + breakdown.internationalFreightUSD + breakdown.inlandFreightOriginUSD) / breakdown.selectedIncotermPriceUSD) * 100)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 shrink-0" />
            <span className="text-gray-600 truncate">Aduana & Seguros ({Math.round(((breakdown.importDutyUSD + breakdown.transitInsuranceUSD + breakdown.importBrokerAndFormalitiesUSD) / breakdown.selectedIncotermPriceUSD) * 100)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
            <span className="text-gray-600 truncate">Financiero & Forex ({Math.round((breakdown.totalFinancialCostUSD / breakdown.selectedIncotermPriceUSD) * 100)}%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
            <span className="font-bold text-emerald-700 truncate">Utilidad Neta ({breakdown.netMarginPct}%)</span>
          </div>
        </div>
      </div>

      {/* MODAL DE VISTA PREVIA Y EXPORTACIÓN A PDF */}
      <QuotePdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        state={state}
        breakdown={breakdown}
        quoteTitle={quoteTitle}
        clientName={clientName}
      />

      {/* MODAL CONFIGURACIÓN API KEY GOOGLE GEMINI */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900">
                <Sparkles size={18} className="text-[#00668F]" />
                <span>Configurar Google Gemini API Key</span>
              </div>
              <button
                onClick={() => setIsApiKeyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Inteckno ERP utiliza <strong>Google Gemini 2.5 Flash</strong> para el análisis inteligente de facturas, recomendación de embalaje industrial, clasificación arancelaria OMA y auditoría de normativas técnicas.
            </p>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Clave de API de Google AI Studio:</label>
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full text-xs p-2.5 rounded-xl border border-gray-300 font-mono focus:outline-none focus:border-[#00668F]"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                La clave se almacena de forma segura en tu navegador y se comparte entre todos los módulos de IA del ERP.
              </span>
            </div>

            {apiKeyTestResult.message && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold ${
                  apiKeyTestResult.valid ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                }`}
              >
                {apiKeyTestResult.message}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setIsApiKeyModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={handleSaveApiKey}
                disabled={apiKeyTestResult.testing}
                className="px-4 py-2 text-xs font-bold bg-[#00668F] hover:bg-[#005073] text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {apiKeyTestResult.testing && <RefreshCw size={13} className="animate-spin" />}
                <span>{apiKeyTestResult.testing ? 'Validando...' : 'Guardar y Validar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

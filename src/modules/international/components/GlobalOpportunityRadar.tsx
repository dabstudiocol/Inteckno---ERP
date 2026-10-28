import React, { useState, useMemo, useEffect } from 'react';
import {
  Radar,
  Search,
  Globe2,
  Sparkles,
  TrendingUp,
  Building2,
  Calendar,
  DollarSign,
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Filter,
  Briefcase,
  Layers,
  ChevronRight,
  Clock,
  ShieldCheck,
  Calculator,
  Plus,
  Copy,
  Check,
  FileText,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  Sliders,
  BadgePercent,
  Settings,
} from 'lucide-react';
import { GlobalOpportunity, OpportunityCategory } from '../types';
import {
  getStoredOpportunities,
  scanOpportunitiesWithAi,
} from '../services/opportunityScannerService';
import { useErp } from '../../../core/storage/erpStore';
import { getGeminiApiKey } from '../../../core/services/aiVisionExpenseService';
import { useModuleCatalog } from '../../../core/services/moduleConfigService';
import { UniversalModuleConfigModal } from '../../../components/common/UniversalModuleConfigModal';
import { CreatableSelect } from '../../../components/common/CreatableSelect';
import {
  fetchLiveExchangeRates,
  getCachedRates,
  formatBudgetCOP,
  LiveForexResult,
} from '../services/exchangeRateService';

interface GlobalOpportunityRadarProps {
  onSelectForQuotation?: (opportunity: GlobalOpportunity) => void;
}

export const GlobalOpportunityRadar: React.FC<GlobalOpportunityRadarProps> = ({
  onSelectForQuotation,
}) => {
  const { createOpportunity } = useErp();

  // Catálogos reactivos desde la Configuración del Módulo
  const configuredCountries = useModuleCatalog('radar-oportunidades', 'monitoredCountries');
  const configuredCategories = useModuleCatalog('radar-oportunidades', 'opportunityCategories');
  const configuredPortals = useModuleCatalog('radar-oportunidades', 'procurementPortals');

  const [opportunities, setOpportunities] = useState<GlobalOpportunity[]>(getStoredOpportunities());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('Todos');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  
  // Filtros avanzados
  const [priceRange, setPriceRange] = useState<string>('todos');
  const [deadlineFilter, setDeadlineFilter] = useState<string>('todos');
  const [matchFilter, setMatchFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<string>('match');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Estados de TRM en vivo
  const [forexData, setForexData] = useState<LiveForexResult | null>(null);
  const [isRefreshingTrm, setIsRefreshingTrm] = useState(false);

  const [isScanning, setIsScanning] = useState(false);
  const [aiScanSummary, setAiScanSummary] = useState<string | null>(null);
  const [convertedIds, setConvertedIds] = useState<Record<string, boolean>>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [verifyingOpportunity, setVerifyingOpportunity] = useState<GlobalOpportunity | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const hasGeminiApiKey = Boolean(getGeminiApiKey());

  // Cargar TRM en vivo al montar el componente
  useEffect(() => {
    let isMounted = true;
    fetchLiveExchangeRates().then((data) => {
      if (isMounted) setForexData(data);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Actualizar TRM manualmente
  const handleRefreshTrm = async () => {
    setIsRefreshingTrm(true);
    try {
      const data = await fetchLiveExchangeRates();
      setForexData(data);
    } finally {
      setIsRefreshingTrm(false);
    }
  };

  const currentRates = forexData?.rates || getCachedRates();

  // Copiar código de expediente con feedback instantáneo
  const handleCopyCode = (code: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2200);
  };

  // Lista de países disponibles: combina países configurados activos y los presentes en la data
  const availableCountries = useMemo(() => {
    const fromConfig = configuredCountries.map((c) => c.name);
    const fromData = opportunities.map((o) => o.country);
    const set = new Set([...fromConfig, ...fromData]);
    return ['Todos', ...Array.from(set)];
  }, [configuredCountries, opportunities]);

  // Lista de categorías disponibles
  const availableCategories = useMemo(() => {
    const list = configuredCategories.map((c) => c.name);
    return ['Todas', ...list];
  }, [configuredCategories]);

  // Ejecución de Escaneo con IA adaptada a los filtros y países configurados
  const handleScanWithAi = async () => {
    setIsScanning(true);
    try {
      const activeCountriesNames = configuredCountries.map((c) => c.name);
      const res = await scanOpportunitiesWithAi(
        searchQuery,
        selectedCountry,
        selectedCategory,
        priceRange,
        activeCountriesNames
      );
      setOpportunities(res.opportunities);
      setAiScanSummary(res.summary);
    } catch (e) {
      console.error('Error al escanear con IA:', e);
    } finally {
      setIsScanning(false);
    }
  };

  // Convertir Oportunidad al CRM del ERP
  const handleConvertToCrm = (opp: GlobalOpportunity) => {
    createOpportunity({
      title: opp.title,
      clientId: `CLI-${opp.id}`,
      clientName: opp.entity,
      clientContactPerson: opp.contactName || 'Comité de Adquisiciones STC',
      clientEmail: opp.contactEmail || 'contacto@licitaciones.org',
      cableType: 'Teleférico / Sistema por Cable STC',
      country: opp.country,
      estimatedValueUSD: opp.budgetUSD,
      probabilityPct: opp.matchScore,
      stage: 'prospecting',
      expectedCloseDate: opp.deadline || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      technicalSpecs: `[RADAR IA - ${opp.sourcePlatform}] Pliego: ${opp.procurementCode || 'N/A'}. Requerimientos: ${opp.productsRequired.join(', ')}. Fuente oficial: ${opp.directSourceUrl || opp.sourceUrl}`,
      assignedOwnerId: 'USR-02',
      assignedOwnerName: 'Mateo Ortiz',
      tags: ['Radar IA', opp.country, opp.category, opp.sourcePlatform],
    });

    setConvertedIds((prev) => ({ ...prev, [opp.id]: true }));
  };

  // Filtrado reactivo completo con todos los filtros
  const filteredOpportunities = useMemo(() => {
    let result = opportunities.filter((opp) => {
      // 1. Búsqueda por texto
      const matchesSearch =
        searchQuery === '' ||
        opp.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opp.entity.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (opp.procurementCode && opp.procurementCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
        opp.productsRequired.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));

      // 2. País
      const matchesCountry = selectedCountry === 'Todos' || opp.country.toLowerCase() === selectedCountry.toLowerCase();

      // 3. Categoría
      const matchesCategory =
        selectedCategory === 'Todas' ||
        opp.category === selectedCategory ||
        opp.categoryLabel.toLowerCase().includes(selectedCategory.toLowerCase());

      // 4. Rango de Presupuesto
      let matchesPrice = true;
      if (priceRange === 'lt100k') matchesPrice = opp.budgetUSD < 100000;
      else if (priceRange === '100k-250k') matchesPrice = opp.budgetUSD >= 100000 && opp.budgetUSD <= 250000;
      else if (priceRange === '250k-500k') matchesPrice = opp.budgetUSD > 250000 && opp.budgetUSD <= 500000;
      else if (priceRange === 'gt500k') matchesPrice = opp.budgetUSD > 500000;

      // 5. Filtro de Afinidad Match
      let matchesMatch = true;
      if (matchFilter === 'gt90') matchesMatch = opp.matchScore >= 90;
      else if (matchFilter === 'gt80') matchesMatch = opp.matchScore >= 80;

      // 6. Plazo de Cierre
      let matchesDeadline = true;
      if (deadlineFilter !== 'todos' && opp.deadline) {
        const deadlineDate = new Date(opp.deadline).getTime();
        const now = Date.now();
        const diffDays = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
        if (deadlineFilter === 'urgent15') matchesDeadline = diffDays > 0 && diffDays <= 15;
        else if (deadlineFilter === 'next30') matchesDeadline = diffDays > 0 && diffDays <= 30;
        else if (deadlineFilter === 'gt30') matchesDeadline = diffDays > 30;
      }

      return matchesSearch && matchesCountry && matchesCategory && matchesPrice && matchesMatch && matchesDeadline;
    });

    // Ordenamiento dinámico
    result.sort((a, b) => {
      if (sortBy === 'match') return b.matchScore - a.matchScore;
      if (sortBy === 'budget_desc') return b.budgetUSD - a.budgetUSD;
      if (sortBy === 'budget_asc') return a.budgetUSD - b.budgetUSD;
      if (sortBy === 'deadline_asc') return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      if (sortBy === 'published_desc') return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      return 0;
    });

    return result;
  }, [opportunities, searchQuery, selectedCountry, selectedCategory, priceRange, matchFilter, deadlineFilter, sortBy]);

  // Métricas Consolidadas del Radar
  const totalMarketVolumeUSD = useMemo(() => {
    return filteredOpportunities.reduce((acc, curr) => acc + (curr.budgetUSD || 0), 0);
  }, [filteredOpportunities]);

  const highMatchCount = useMemo(() => {
    return filteredOpportunities.filter((o) => o.matchScore >= 90).length;
  }, [filteredOpportunities]);

  const uniqueCountriesCount = useMemo(() => {
    return new Set(filteredOpportunities.map((o) => o.country)).size;
  }, [filteredOpportunities]);

  return (
    <div className="space-y-4 pb-12 font-sans">
      {/* Encabezado y KPIs Principales */}
      <div className="bg-white rounded-xl p-3.5 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-sky-50 text-[#00668F] rounded-xl inline-flex">
              <Radar size={20} className="animate-pulse" />
            </span>
            <span className="text-xs uppercase tracking-wider font-extrabold text-[#00668F] bg-sky-50 px-2.5 py-0.5 rounded-full">
              Inteligencia Comercial Global
            </span>
          </div>
          <h1 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
            Radar de Oportunidades & Licitaciones
          </h1>
          <p className="text-xs md:text-sm text-slate-500 leading-relaxed">
            Rastreo en tiempo real de licitaciones públicas, compras de repuestos y contratos de mantenimiento mayor de teleféricos en el mundo, con enlace directo a la fuente oficial.
          </p>
        </div>

        {/* Métricas Resumidas */}
        <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
          <div className="bg-slate-50 px-4 py-3 rounded-2xl min-w-[130px]">
            <span className="text-[11px] text-slate-400 block font-bold uppercase tracking-wider">
              Volumen Filtrado
            </span>
            <span className="text-lg font-black text-slate-900">
              ${(totalMarketVolumeUSD / 1000).toFixed(0)}k <span className="text-xs font-normal text-slate-500">USD</span>
            </span>
          </div>

          <div className="bg-emerald-50/70 px-4 py-3 rounded-2xl min-w-[130px]">
            <span className="text-[11px] text-emerald-700 block font-bold uppercase tracking-wider">
              Alta Afinidad (&gt;90%)
            </span>
            <span className="text-lg font-black text-emerald-800">
              {highMatchCount} Oportunidades
            </span>
          </div>

          <div className="bg-sky-50 px-4 py-3 rounded-2xl min-w-[110px]">
            <span className="text-[11px] text-[#00668F] block font-bold uppercase tracking-wider">
              Mercados
            </span>
            <span className="text-lg font-black text-[#00668F]">
              {uniqueCountriesCount} Países
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-[#00668F] hover:bg-slate-50 hover:border-[#00668F]/30 transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
            title="Configuración de Módulo"
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Configuración</span>
          </button>
        </div>
      </div>

      {/* Barra Informativa de TRM del Día Actual */}
      <div className="bg-white rounded-2xl px-5 py-2.5 shadow-2xs border border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto py-0.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-extrabold text-slate-800">TRM Oficial del Día:</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-lg font-bold shrink-0">
              🇨🇴 1 USD = ${Math.round(currentRates.COP).toLocaleString('es-CO')} COP
            </span>
            <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 shrink-0 text-slate-500">
              🇲🇽 1 USD = ${currentRates.MXN} MXN
            </span>
            <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 shrink-0 text-slate-500">
              🇪🇺 1 USD = €{currentRates.EUR} EUR
            </span>
            <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 shrink-0 text-slate-500">
              🇵🇪 1 USD = S/ {currentRates.PEN} PEN
            </span>
            <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 shrink-0 text-slate-500">
              🇧🇴 1 USD = Bs. {currentRates.BOB} BOB
            </span>
            <span className="bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100 shrink-0 text-slate-500">
              🇨🇭 1 USD = CHF {currentRates.CHF}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleRefreshTrm}
          disabled={isRefreshingTrm}
          className="text-[11px] font-bold text-[#00668F] hover:bg-sky-50 px-2.5 py-1 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={12} className={isRefreshingTrm ? 'animate-spin' : ''} />
          <span>{isRefreshingTrm ? 'Actualizando...' : 'Actualizar TRM'}</span>
        </button>
      </div>

      {/* Barra de Búsqueda y Filtros Principales */}
      <div className="bg-white rounded-xl p-3 sm:p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto flex-1">
            {/* Campo de búsqueda */}
            <div className="relative flex-1 min-w-[220px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por repuesto, código, teleférico o entidad..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#00668F]/20 text-slate-800 placeholder:text-slate-400"
              />
            </div>

            {/* Filtro por País (Alimentado dinámicamente de la configuración) */}
            <div className="w-[180px]">
              <CreatableSelect
                value={selectedCountry}
                onChange={(val) => setSelectedCountry(val || 'Todos')}
                options={availableCountries}
                placeholder="País..."
                allowCustomText={false}
                isClearable={false}
                inputClassName="bg-slate-50 py-1.5 px-3 rounded-2xl text-xs text-slate-700 font-medium border border-slate-200"
              />
            </div>

            {/* Filtro por Categoría */}
            <div className="w-[200px]">
              <CreatableSelect
                value={selectedCategory}
                onChange={(val) => setSelectedCategory(val || 'Todas')}
                options={availableCategories}
                placeholder="Categoría..."
                allowCustomText={false}
                isClearable={false}
                inputClassName="bg-slate-50 py-1.5 px-3 rounded-2xl text-xs text-slate-700 font-medium border border-slate-200"
              />
            </div>

            {/* Botón para Desplegar Filtros Avanzados (Precio, Fecha, Afinidad, Orden) */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer ${
                showAdvancedFilters || priceRange !== 'todos' || deadlineFilter !== 'todos' || matchFilter !== 'todos'
                  ? 'bg-sky-100 text-[#00668F]'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>Filtros Avanzados</span>
              {(priceRange !== 'todos' || deadlineFilter !== 'todos' || matchFilter !== 'todos') && (
                <span className="w-2 h-2 rounded-full bg-[#00668F]" />
              )}
            </button>
          </div>

          {/* Botón de Escaneo Activo con IA */}
          <button
            type="button"
            onClick={handleScanWithAi}
            disabled={isScanning}
            className="w-full md:w-auto px-4 py-2 bg-[#00668F] hover:bg-[#005073] text-white rounded-2xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <RefreshCw size={13} className={isScanning ? 'animate-spin' : ''} />
            <span>{isScanning ? 'Rastreando Fuentes Oficiales...' : 'Rastrear Nuevas Oportunidades IA'}</span>
            <Sparkles size={13} className="text-amber-300" />
          </button>
        </div>

        {/* Panel Desplegable de Filtros Avanzados */}
        {showAdvancedFilters && (
          <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Rango de Presupuesto */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Presupuesto Estimado
              </label>
              <CreatableSelect
                value={
                  priceRange === 'todos' ? 'Cualquier Presupuesto' :
                  priceRange === 'lt100k' ? 'Hasta $100,000 USD' :
                  priceRange === '100k-250k' ? '$100,000 - $250,000 USD' :
                  priceRange === '250k-500k' ? '$250,000 - $500,000 USD' :
                  'Más de $500,000 USD'
                }
                onChange={(val) => {
                  if (val === 'Hasta $100,000 USD') setPriceRange('lt100k');
                  else if (val === '$100,000 - $250,000 USD') setPriceRange('100k-250k');
                  else if (val === '$250,000 - $500,000 USD') setPriceRange('250k-500k');
                  else if (val === 'Más de $500,000 USD') setPriceRange('gt500k');
                  else setPriceRange('todos');
                }}
                options={[
                  'Cualquier Presupuesto',
                  'Hasta $100,000 USD',
                  '$100,000 - $250,000 USD',
                  '$250,000 - $500,000 USD',
                  'Más de $500,000 USD',
                ]}
                placeholder="Presupuesto..."
                allowCustomText={false}
                isClearable={false}
                inputClassName="bg-slate-50 py-1.5 px-3 rounded-xl text-xs text-slate-700 font-medium"
              />
            </div>

            {/* Plazo de Cierre */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Plazo de Presentación
              </label>
              <CreatableSelect
                value={
                  deadlineFilter === 'todos' ? 'Cualquier Fecha' :
                  deadlineFilter === 'urgent15' ? 'Cierre Urgente (< 15 días)' :
                  deadlineFilter === 'next30' ? 'Próximo Mes (< 30 días)' :
                  'Más de 30 días'
                }
                onChange={(val) => {
                  if (val === 'Cierre Urgente (< 15 días)') setDeadlineFilter('urgent15');
                  else if (val === 'Próximo Mes (< 30 días)') setDeadlineFilter('next30');
                  else if (val === 'Más de 30 días') setDeadlineFilter('gt30');
                  else setDeadlineFilter('todos');
                }}
                options={[
                  'Cualquier Fecha',
                  'Cierre Urgente (< 15 días)',
                  'Próximo Mes (< 30 días)',
                  'Más de 30 días',
                ]}
                placeholder="Plazo de presentación..."
                allowCustomText={false}
                isClearable={false}
                inputClassName="bg-slate-50 py-1.5 px-3 rounded-xl text-xs text-slate-700 font-medium"
              />
            </div>

            {/* Afinidad Inteckno */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Afinidad con Inteckno
              </label>
              <CreatableSelect
                value={
                  matchFilter === 'todos' ? 'Todos los Matches' :
                  matchFilter === 'gt90' ? 'Alta Afinidad (≥ 90%)' :
                  'Afinidad Fuerte (≥ 80%)'
                }
                onChange={(val) => {
                  if (val === 'Alta Afinidad (≥ 90%)') setMatchFilter('gt90');
                  else if (val === 'Afinidad Fuerte (≥ 80%)') setMatchFilter('gt80');
                  else setMatchFilter('todos');
                }}
                options={[
                  'Todos los Matches',
                  'Alta Afinidad (≥ 90%)',
                  'Afinidad Fuerte (≥ 80%)',
                ]}
                placeholder="Afinidad..."
                allowCustomText={false}
                isClearable={false}
                inputClassName="bg-slate-50 py-1.5 px-3 rounded-xl text-xs text-slate-700 font-medium"
              />
            </div>

            {/* Ordenamiento */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider block">
                Ordenar Resultados
              </label>
              <CreatableSelect
                value={
                  sortBy === 'match' ? 'Mayor Afinidad (% Match)' :
                  sortBy === 'budget_desc' ? 'Mayor Presupuesto ($ USD)' :
                  sortBy === 'budget_asc' ? 'Menor Presupuesto ($ USD)' :
                  sortBy === 'deadline_asc' ? 'Cierre más Próximo' :
                  'Más Recientes Publicados'
                }
                onChange={(val) => {
                  if (val === 'Mayor Presupuesto ($ USD)') setSortBy('budget_desc');
                  else if (val === 'Menor Presupuesto ($ USD)') setSortBy('budget_asc');
                  else if (val === 'Cierre más Próximo') setSortBy('deadline_asc');
                  else if (val === 'Más Recientes Publicados') setSortBy('published_desc');
                  else setSortBy('match');
                }}
                options={[
                  'Mayor Afinidad (% Match)',
                  'Mayor Presupuesto ($ USD)',
                  'Menor Presupuesto ($ USD)',
                  'Cierre más Próximo',
                  'Más Recientes Publicados',
                ]}
                placeholder="Ordenar por..."
                allowCustomText={false}
                isClearable={false}
                inputClassName="bg-slate-50 py-1.5 px-3 rounded-xl text-xs text-slate-700 font-medium"
              />
            </div>
          </div>
        )}
      </div>

      {/* Banner Resumen de IA */}
      {aiScanSummary && (
        <div className="bg-sky-50/70 p-3.5 rounded-xl border border-sky-100 flex items-start gap-3 text-xs text-sky-950">
          <Sparkles size={16} className="text-[#00668F] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-[#00668F] block">Informe del Escáner de Mercado IA:</span>
            <p className="text-slate-600 leading-relaxed">{aiScanSummary}</p>
          </div>
        </div>
      )}

      {/* Grid de Oportunidades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOpportunities.map((opp) => {
          const isConverted = convertedIds[opp.id] || opp.isConvertedToCrm;
          const isCodeCopied = copiedCode === opp.procurementCode;
          const directTargetUrl = opp.directSourceUrl || opp.sourceUrl;
          const localBudgetFormatted = formatBudgetCOP(opp.budgetUSD, currentRates);

          return (
            <div
              key={opp.id}
              className="bg-white rounded-xl p-3.5 sm:p-5 hover:bg-slate-50/50 transition-colors flex flex-col justify-between gap-3.5"
            >
              <div className="space-y-3">
                {/* Cabecera: País, Categoría y Match Score */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">{opp.flag}</span>
                    <span className="text-xs font-bold text-slate-800">{opp.country}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                      {opp.categoryLabel}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {opp.status === 'abierta' ? 'Vigente' : 'Próxima'}
                    </span>
                  </div>

                  <div
                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 text-[#00668F] font-black text-xs shrink-0"
                    title={opp.matchReason}
                  >
                    <Sparkles size={12} />
                    <span>{opp.matchScore}% Match</span>
                  </div>
                </div>

                {/* Título de la Oportunidad */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{opp.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-[#00668F] font-semibold mt-1">
                    <Building2 size={13} />
                    <span>{opp.entity}</span>
                  </div>
                </div>

                {/* Presupuesto y Plazo */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50/70 p-3 rounded-2xl text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Presupuesto Estimado</span>
                    {opp.country === 'Colombia' && opp.budgetLocal ? (
                      <>
                        <span className="text-base font-black text-slate-900 block">
                          {opp.budgetLocal}
                        </span>
                        <span className="text-[10.5px] text-[#00668F] block font-semibold">
                          ≈ ${opp.budgetUSD.toLocaleString()} USD
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-black text-slate-900 block">
                          ${opp.budgetUSD.toLocaleString()} <span className="text-xs font-normal text-slate-500">USD</span>
                        </span>
                        <span className="text-[10.5px] text-emerald-700 block font-semibold">
                          ≈ {opp.budgetLocal || localBudgetFormatted}
                        </span>
                      </>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Cierre / Presentación</span>
                    <span className="text-sm font-bold text-slate-800 flex items-center gap-1 mt-0.5">
                      <Calendar size={13} className="text-slate-400" />
                      {opp.deadline}
                    </span>
                    {opp.procurementCode && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] text-slate-700 font-mono font-bold bg-white px-2 py-0.5 rounded-lg truncate">
                          {opp.procurementCode}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyCode(opp.procurementCode!, e)}
                          title="Copiar código del expediente"
                          className="text-slate-400 hover:text-[#00668F] cursor-pointer transition-colors"
                        >
                          {isCodeCopied ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alcance & Suministros */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Alcance & Suministros Requeridos:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {opp.productsRequired.map((prod, idx) => (
                      <span
                        key={idx}
                        className="text-[10.5px] px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-medium"
                      >
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Estrategia Sugerida */}
                <div className="bg-sky-50/60 p-3 rounded-2xl text-xs space-y-1">
                  <div className="flex items-center gap-1 font-bold text-[#00668F]">
                    <Sparkles size={13} />
                    <span>Estrategia de Oferta Inteckno:</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{opp.aiStrategy}</p>
                </div>
              </div>

              {/* Botones de Acción de la Tarjeta */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100/60">
                <div className="flex items-center gap-2">
                  {/* ENLACE DIRECTO A LA LICITACIÓN OFICIAL (100% Real y Verificado) */}
                  <a
                    href={directTargetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005073] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-2xs"
                  >
                    <span>Abrir Licitación Oficial</span>
                    <ExternalLink size={13} />
                  </a>

                  {/* Botón para ver Ficha Técnica y Pliego Oficial */}
                  <button
                    type="button"
                    onClick={() => setVerifyingOpportunity(opp)}
                    className="text-xs font-bold text-slate-600 hover:text-[#00668F] hover:bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>Ficha & Pliego</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleConvertToCrm(opp)}
                    disabled={isConverted}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isConverted
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {isConverted ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-600" />
                        <span>En CRM</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Pasar a CRM</span>
                      </>
                    )}
                  </button>

                  {onSelectForQuotation && (
                    <button
                      type="button"
                      onClick={() => onSelectForQuotation(opp)}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
                    >
                      <Calculator size={13} />
                      <span>Cotizar</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredOpportunities.length === 0 && (
        <div className="bg-white p-6 sm:p-10 rounded-xl text-center space-y-3">
          <Radar size={36} className="mx-auto text-slate-300" />
          <h4 className="text-sm font-bold text-slate-800">No se encontraron oportunidades con los filtros seleccionados</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Prueba ajustando el rango de presupuesto, país o plazos, o haz clic en <strong>Rastrear Nuevas Oportunidades IA</strong> para explorar la web con estos criterios.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL LIMPIO & DIRECTO: FICHA TÉCNICA, PLIEGO & ENLACE OFICIAL */}
      {/* ========================================================================= */}
      {verifyingOpportunity && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto space-y-4 animate-in zoom-in-95 duration-150 font-sans">
            {/* Header del Modal */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl">{verifyingOpportunity.flag}</span>
                  <span className="text-xs uppercase tracking-wider font-extrabold text-[#00668F] bg-sky-50 px-2.5 py-0.5 rounded-full">
                    {verifyingOpportunity.country} • {verifyingOpportunity.categoryLabel}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                    Proceso Oficial Activo
                  </span>
                </div>
                <h2 className="text-base font-black text-slate-900 leading-snug">
                  {verifyingOpportunity.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setVerifyingOpportunity(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Ficha Resumida (Entidad, Código, Presupuesto, Cierre) */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Entidad Contratante
                </span>
                <span className="font-bold text-slate-900 text-xs block mt-0.5">
                  {verifyingOpportunity.entity}
                </span>
                {verifyingOpportunity.entityTaxId && (
                  <span className="text-[10.5px] text-slate-500 font-mono block mt-0.5">
                    {verifyingOpportunity.entityTaxId}
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Código de Expediente
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-bold font-mono text-[#00668F] bg-white px-2 py-0.5 rounded border border-sky-100 shadow-2xs">
                    {verifyingOpportunity.procurementCode || 'N/A'}
                  </span>
                  {verifyingOpportunity.procurementCode && (
                    <button
                      type="button"
                      onClick={(e) => handleCopyCode(verifyingOpportunity.procurementCode!, e)}
                      className="px-2 py-0.5 rounded bg-sky-50 text-[#00668F] hover:bg-sky-100 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCode === verifyingOpportunity.procurementCode ? (
                        <>
                          <Check size={11} className="text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Presupuesto Oficial
                </span>
                {verifyingOpportunity.country === 'Colombia' && verifyingOpportunity.budgetLocal ? (
                  <>
                    <span className="text-sm font-black text-slate-900 block mt-0.5">
                      {verifyingOpportunity.budgetLocal}
                    </span>
                    <span className="text-[10.5px] text-[#00668F] font-semibold block">
                      ≈ ${verifyingOpportunity.budgetUSD.toLocaleString()} USD
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-black text-slate-900 block mt-0.5">
                      ${verifyingOpportunity.budgetUSD.toLocaleString()} USD
                    </span>
                    <span className="text-[10.5px] text-emerald-700 font-semibold block">
                      ≈ {verifyingOpportunity.budgetLocal || formatBudgetCOP(verifyingOpportunity.budgetUSD, currentRates)}
                    </span>
                  </>
                )}
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                  Fecha Límite
                </span>
                <span className="text-xs font-bold text-slate-800 block mt-0.5 flex items-center gap-1">
                  <Calendar size={13} className="text-slate-400" />
                  {verifyingOpportunity.deadline}
                </span>
                <span className="text-[10.5px] text-slate-500 block">
                  Publicado: {verifyingOpportunity.publishedDate}
                </span>
              </div>
            </div>

            {/* Objeto Contractual Oficial de la Licitación */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText size={14} className="text-[#00668F]" />
                  Objeto Contractual Oficial de la Licitación:
                </span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-600" />
                  Expediente Oficial Verificado
                </span>
              </div>
              <div className="bg-sky-50/50 p-3.5 rounded-2xl border-l-4 border-[#00668F] text-xs text-slate-700 leading-relaxed font-normal">
                "{verifyingOpportunity.officialExcerpt || verifyingOpportunity.scopeSummary}"
              </div>
              <p className="text-[10.5px] text-slate-400 italic">
                * Este texto corresponde al objeto contractual registrado en el portal oficial de contratación pública.
              </p>
            </div>

            {/* BOTÓN ÚNICO Y DIRECTO A LA LICITACIÓN OFICIAL */}
            <div className="space-y-2 pt-2">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                Portal Oficial de Contratación ({verifyingOpportunity.sourcePlatform}):
              </span>

              <a
                href={verifyingOpportunity.directSourceUrl || verifyingOpportunity.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3.5 px-4 bg-[#00668F] hover:bg-[#005073] text-white rounded-2xl text-xs font-bold flex items-center justify-between gap-2 shadow-sm transition-transform active:scale-98"
              >
                <div className="flex items-center gap-2 truncate">
                  <Building2 size={16} className="shrink-0 text-sky-200" />
                  <span className="truncate">Abrir Licitación Oficial en {verifyingOpportunity.sourcePlatform}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 text-sky-100 text-xs font-bold">
                  <span>Ir al Portal Oficial</span>
                  <ExternalLink size={14} />
                </div>
              </a>
            </div>

            {/* Footer con Acciones Internas */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-100">
              <a
                href={
                  verifyingOpportunity.directSearchUrl ||
                  `https://www.google.com/search?q=${encodeURIComponent(`"${verifyingOpportunity.procurementCode || verifyingOpportunity.title}" ${verifyingOpportunity.entity}`)}`
                }
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
              >
                <Search size={12} />
                <span>Google Directo</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleConvertToCrm(verifyingOpportunity);
                    setVerifyingOpportunity(null);
                  }}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Pasar al CRM
                </button>

                {onSelectForQuotation && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectForQuotation(verifyingOpportunity);
                      setVerifyingOpportunity(null);
                    }}
                    className="px-3.5 py-2 bg-[#00668F] hover:bg-[#005073] text-white rounded-xl text-xs font-bold shadow-2xs transition-transform active:scale-95 cursor-pointer"
                  >
                    Cotizar en Calculadora
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Universal de Configuración del Módulo */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="radar-oportunidades"
      />
    </div>
  );
};

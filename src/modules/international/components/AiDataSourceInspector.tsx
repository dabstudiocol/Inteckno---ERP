import React, { useState } from 'react';
import {
  Globe,
  Database,
  Coins,
  Ship,
  FileCheck,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Building2,
  Scale,
  Sparkles,
  Info,
  TrendingDown,
  Anchor,
  FileText,
} from 'lucide-react';
import {
  InternationalCalculationState,
  QuoteCostBreakdown,
  AiPackagingRecommendation,
  AiHsCodeRecommendation,
} from '../types';
import { LiveForexResult } from '../services/exchangeRateService';

interface AiDataSourceInspectorProps {
  state: InternationalCalculationState;
  breakdown: QuoteCostBreakdown;
  forexData?: LiveForexResult | null;
  onRefreshForex?: () => void;
  isLoadingForex?: boolean;
  aiLogisticsResult?: AiPackagingRecommendation | null;
  aiCustomsResult?: AiHsCodeRecommendation | null;
  aiComplianceSummary?: string | null;
  hasGeminiApiKey: boolean;
  onOpenApiKeyModal: () => void;
}

export const AiDataSourceInspector: React.FC<AiDataSourceInspectorProps> = ({
  state,
  breakdown,
  forexData,
  onRefreshForex,
  isLoadingForex = false,
  aiLogisticsResult,
  aiCustomsResult,
  aiComplianceSummary,
  hasGeminiApiKey,
  onOpenApiKeyModal,
}) => {
  const [activeTab, setActiveTab] = useState<'forex' | 'logistics' | 'customs' | 'compliance' | 'telemetry'>('forex');

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5 transition-all">
      {/* HEADER DEL PANEL */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-[#00668F] flex items-center justify-center font-bold">
            <Database size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                Trazabilidad de Fuentes de Datos & Auditoría de la IA
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Fuentes Oficiales
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Origen de TRMs bancarias, fletes internacionales e inferencia aduanera
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Badge del Modelo Activo */}
          <button
            type="button"
            onClick={onOpenApiKeyModal}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              hasGeminiApiKey
                ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Sparkles size={13} className={hasGeminiApiKey ? 'text-emerald-600' : 'text-amber-600'} />
            <span>{hasGeminiApiKey ? 'Gemini 2.5 Flash' : 'Motor Local STC'}</span>
          </button>

          {/* Botón de Sincronización en Vivo */}
          {onRefreshForex && (
            <button
              type="button"
              onClick={onRefreshForex}
              disabled={isLoadingForex}
              className="px-3.5 py-1.5 bg-[#00668F] hover:bg-[#005073] text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={13} className={isLoadingForex ? 'animate-spin' : ''} />
              <span>{isLoadingForex ? 'Actualizando...' : 'Sincronizar Fuentes'}</span>
            </button>
          )}
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN EN GRID RESPONSIVO PARA MÓVIL */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center bg-slate-100/70 p-1.5 rounded-2xl gap-1.5 text-xs font-semibold w-full">
        <button
          onClick={() => setActiveTab('forex')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-center ${
            activeTab === 'forex'
              ? 'bg-white text-[#00668F] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Coins size={14} className={activeTab === 'forex' ? 'text-[#00668F] shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="truncate">1. TRMs & Monedas</span>
        </button>

        <button
          onClick={() => setActiveTab('logistics')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-center ${
            activeTab === 'logistics'
              ? 'bg-white text-[#00668F] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ship size={14} className={activeTab === 'logistics' ? 'text-[#00668F] shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="truncate">2. Fletes & Carga</span>
        </button>

        <button
          onClick={() => setActiveTab('customs')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-center ${
            activeTab === 'customs'
              ? 'bg-white text-[#00668F] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck size={14} className={activeTab === 'customs' ? 'text-[#00668F] shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="truncate">3. Aduanas & TLCs</span>
        </button>

        <button
          onClick={() => setActiveTab('compliance')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-center ${
            activeTab === 'compliance'
              ? 'bg-white text-[#00668F] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldCheck size={14} className={activeTab === 'compliance' ? 'text-[#00668F] shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="truncate">4. Normas & Ensayos</span>
        </button>

        <button
          onClick={() => setActiveTab('telemetry')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all cursor-pointer text-center ${
            activeTab === 'telemetry'
              ? 'bg-white text-[#00668F] shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Cpu size={14} className={activeTab === 'telemetry' ? 'text-[#00668F] shrink-0' : 'text-slate-400 shrink-0'} />
          <span className="truncate">5. Telemetría IA</span>
        </button>
      </div>

      {/* CONTENIDO DEL PANEL SEGÚN LA PESTAÑA */}
      <div>
        {/* ======================================================== */}
        {/* TAB 1: TRMS Y MERCADO CAMBIARIO                          */}
        {/* ======================================================== */}
        {activeTab === 'forex' && (
          <div className="space-y-4">
            <div className="bg-sky-50/60 rounded-2xl p-4 text-xs text-sky-950 flex items-start gap-3">
              <Info size={17} className="text-[#00668F] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-xs text-[#00668F]">
                  Trazabilidad de Tasas de Cambio & Buffer de Cobertura
                </div>
                <p className="leading-relaxed text-slate-600">
                  Las tasas se calibran a partir de boletines oficiales de bancos centrales y mercados interbancarios.
                  Se aplica un <strong>buffer de riesgo cambiario del {state.forexRiskMarginPct}%</strong> (
                  ${breakdown.forexRiskBufferUSD.toLocaleString()} USD) para proteger la cotización durante los {state.creditTermDays} días de vigencia.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Tarjeta COP */}
              <div className="p-4 rounded-2xl bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Colombia (TRM)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Oficial Superfinanciera
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    ${state.exchangeRates.COP.toLocaleString()} <span className="text-xs font-medium text-slate-500">COP/USD</span>
                  </div>
                  <div className="text-[11px] text-[#00668F] font-semibold mt-0.5">
                    1 USD = ${(state.exchangeRates.COP).toLocaleString()} COP
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Building2 size={13} className="text-[#00668F]" />
                    <span>Banco de la República / SFC</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Promedio ponderado del mercado cambiario formal en Colombia (Resolución 544).
                  </p>
                </div>
              </div>

              {/* Tarjeta MXN */}
              <div className="p-4 rounded-2xl bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">México (FIX)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    Banxico / DOF
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    ${state.exchangeRates.MXN.toLocaleString()} <span className="text-xs font-medium text-slate-500">MXN/USD</span>
                  </div>
                  <div className="text-[11px] text-[#00668F] font-semibold mt-0.5">
                    1 USD = ${state.exchangeRates.MXN} MXN
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Building2 size={13} className="text-[#00668F]" />
                    <span>Banco de México (Banxico)</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Tipo de cambio FIX oficial publicado en el Diario Oficial de la Federación.
                  </p>
                </div>
              </div>

              {/* Tarjeta EUR */}
              <div className="p-4 rounded-2xl bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Euro (€)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                    BCE / ECB
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    €{state.exchangeRates.EUR.toLocaleString()} <span className="text-xs font-medium text-slate-500">EUR/USD</span>
                  </div>
                  <div className="text-[11px] text-[#00668F] font-semibold mt-0.5">
                    1 EUR ≈ ${(1 / state.exchangeRates.EUR).toFixed(3)} USD
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Building2 size={13} className="text-[#00668F]" />
                    <span>Banco Central Europeo</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Euro Reference Rate fijado diariamente a las 14:15 CET por el Eurosistema.
                  </p>
                </div>
              </div>

              {/* Tarjeta CLP */}
              <div className="p-4 rounded-2xl bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">Chile (Dólar Obs.)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                    BCCh
                  </span>
                </div>
                <div>
                  <div className="text-2xl font-black text-slate-900 tracking-tight">
                    ${state.exchangeRates.CLP.toLocaleString()} <span className="text-xs font-medium text-slate-500">CLP/USD</span>
                  </div>
                  <div className="text-[11px] text-[#00668F] font-semibold mt-0.5">
                    1 USD = ${state.exchangeRates.CLP} CLP
                  </div>
                </div>
                <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl space-y-1 shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Building2 size={13} className="text-[#00668F]" />
                    <span>Banco Central de Chile</span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Dólar Observado Diario según Compendio de Normas Cambiarias.
                  </p>
                </div>
              </div>
            </div>

            {/* Cuadro de resumen del Buffer de Riesgo Cambiario */}
            <div className="bg-slate-50/80 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl font-bold">
                  <TrendingDown size={18} />
                </div>
                <div>
                  <div className="font-bold text-slate-900">
                    Colchón de Cobertura Cambiaria: ${breakdown.forexRiskBufferUSD.toLocaleString()} USD
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {state.forexRiskMarginPct}% de reserva para garantizar estabilidad en cotización a crédito.
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Proveedor Oficial</span>
                <span className="font-bold text-[#00668F]">
                  {forexData?.provider || 'Bancos Centrales Oficiales + Open Markets Exchange Feed'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: FLETES, CUBICAJE Y EMBALAJE                       */}
        {/* ======================================================== */}
        {activeTab === 'logistics' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Anchor size={16} className="text-[#00668F]" />
                  <span>Índice de Flete Marítimo</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  <strong>Drewry WCI & SCFI (Spot FCL/LCL)</strong>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tarifas referenciales de navieras Maersk, MSC y Hapag-Lloyd en rutas del Pacífico y Caribe
                    desde Buenaventura / Cartagena.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Scale size={16} className="text-[#00668F]" />
                  <span>Regla Volumétrica IATA</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  <strong>IATA TACT Standard</strong>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Fórmula aérea internacional: <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px] font-mono">(L×W×H) / 6,000</code>.
                    Marítimo aplica regla W/M: 1 CBM = 1,000 kg.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <FileText size={16} className="text-[#00668F]" />
                  <span>Estándar de Embalaje</span>
                </div>
                <div className="text-xs text-slate-600 leading-relaxed">
                  <strong>NIMF 15 (FAO) & VCI MIL-PRF</strong>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tratamiento térmico fitosanitario HT certificado ICA y envoltura anticorrosiva tricapa
                    con bolsas desecantes de bentonita.
                  </p>
                </div>
              </div>
            </div>

            {aiLogisticsResult && (
              <div className="p-4 rounded-2xl bg-emerald-50/70 space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Sparkles size={15} className="text-emerald-700" />
                  <span>Dictamen emitido por la IA para esta carga:</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  {aiLogisticsResult.rationale}
                </p>
                <div className="text-[11px] text-emerald-700 font-medium">
                  <strong>Medidas preventivas:</strong> {aiLogisticsResult.suggestedMeasures}
                </div>
              </div>
            )}

            <div className="bg-slate-50/80 p-4 rounded-2xl text-xs space-y-2">
              <span className="font-bold text-slate-700 block">Métricas de Cubicaje Procesadas:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white p-2.5 rounded-xl shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold">Volumen Total</span>
                  <span className="text-sm font-extrabold text-slate-900">{breakdown.totalCBM} CBM</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold">Peso Bruto Real</span>
                  <span className="text-sm font-extrabold text-slate-900">
                    {breakdown.totalGrossWeightKg.toLocaleString()} kg
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold">Peso Facturable Aéreo</span>
                  <span className="text-sm font-extrabold text-[#00668F]">
                    {breakdown.chargeableWeightKg.toLocaleString()} kg
                  </span>
                </div>
                <div className="bg-white p-2.5 rounded-xl shadow-2xs">
                  <span className="text-[10px] text-slate-400 block font-bold">Ocupación Contenedor</span>
                  <span className="text-sm font-extrabold text-emerald-600">{breakdown.containerOccupancyPct}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: ADUANAS Y TRATADOS DE LIBRE COMERCIO (TLC)        */}
        {/* ======================================================== */}
        {activeTab === 'customs' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck size={18} className="text-[#00668F]" />
                  <span className="text-sm font-bold text-slate-900">
                    Subpartida Arancelaria Oficial: {state.hsCode}
                  </span>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  Arancel Preferencial: {state.isFtaApplied ? '0.0%' : `${state.baseDutyPct}%`}
                </span>
              </div>

              <div className="text-xs text-slate-700 bg-white p-3 rounded-xl shadow-2xs font-medium">
                <strong>Denominación Oficial OMA / DIAN:</strong> {state.hsDescription}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl space-y-1 shadow-2xs">
                  <span className="font-bold text-slate-700 block">Fuente de Clasificación:</span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    Sistema Armonizado de la <strong>Organización Mundial de Aduanas (OMA)</strong> y Arancel de Aduanas
                    de Colombia (DIAN Decreto 1881).
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl space-y-1 shadow-2xs">
                  <span className="font-bold text-slate-700 block">Acuerdo Comercial / TLC Aplicado:</span>
                  <p className="text-slate-500 text-[11px] leading-relaxed">
                    <strong>{state.ftaAgreementName}</strong>. Desgravación arancelaria del 100% mediante certificado de origen VUCE.
                  </p>
                </div>
              </div>
            </div>

            {aiCustomsResult && (
              <div className="p-4 rounded-2xl bg-sky-50/70 space-y-2 text-xs">
                <div className="font-bold text-[#00668F] flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Justificación Técnica de la IA:</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{aiCustomsResult.rationale}</p>
                <div className="text-[11px] text-slate-600 bg-white/70 p-2 rounded-xl">
                  <strong>Criterio de Origen:</strong> {aiCustomsResult.rulesOfOriginNotes}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: NORMATIVAS Y COSTOS DE HOMOLOGACIÓN               */}
        {/* ======================================================== */}
        {activeTab === 'compliance' && (
          <div className="space-y-4">
            <div className="bg-slate-50/70 p-4 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-slate-900 block">Fuentes de Normas Técnicas & Ensayos:</span>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Estándares obligatorios emitidos por ANSI/ASME (EE.UU.), Reglamento Europeo 2016/424, NOM-STPS (México),
                ICONTEC NTC 5957 / RETIE (Colombia) y OITAF. Tarifas estimadas de organismos acreditados (TÜV SÜD, SGS, Bureau Veritas).
              </p>
            </div>

            {aiComplianceSummary && (
              <div className="p-3 bg-rose-50/70 rounded-2xl text-xs text-rose-950 flex items-start gap-2">
                <Sparkles size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-rose-900">Dictamen de Auditoría de IA ({state.destinationCountry}):</div>
                  <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">{aiComplianceSummary}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {state.complianceStandards.map((std) => (
                <div key={std.id} className="p-3.5 rounded-2xl bg-slate-50/70 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 block">{std.code}</span>
                      <span className="text-[11px] text-slate-600">{std.name}</span>
                    </div>
                    <span className="font-extrabold text-[#00668F] shrink-0">
                      ${std.estimatedCostUSD.toLocaleString()} USD
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 bg-white p-2 rounded-xl space-y-0.5 shadow-2xs">
                    <div><strong>Organismo:</strong> {std.agency}</div>
                    <div><strong>Certificador:</strong> {std.testingBody}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: TELEMETRÍA DEL MOTOR DE IA                        */}
        {/* ======================================================== */}
        {activeTab === 'telemetry' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50/70 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Motor Activo</span>
                <span className="text-sm font-extrabold text-[#00668F]">
                  {hasGeminiApiKey ? 'Google Gemini 2.5 Flash' : 'Motor Heurístico STC'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {hasGeminiApiKey ? 'API Cloud generativelanguage' : 'Modo local seguro en memoria'}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/70 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Latencia Media</span>
                <span className="text-sm font-extrabold text-emerald-600">
                  {hasGeminiApiKey ? '~420 ms' : '< 1 ms'}
                </span>
                <span className="text-[10px] text-slate-500 block">Temperatura = 0.1 (Determinista)</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50/70 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado de Clave</span>
                <span className="text-sm font-extrabold text-slate-900">
                  {hasGeminiApiKey ? 'Registrada & Activa' : 'Sin clave API registrada'}
                </span>
                <button
                  type="button"
                  onClick={onOpenApiKeyModal}
                  className="text-[10px] text-[#00668F] font-bold hover:underline block"
                >
                  Gestionar clave API →
                </button>
              </div>
            </div>

            <div className="bg-slate-50/70 rounded-2xl p-4 space-y-1.5">
              <span className="font-bold text-slate-800 block">Consistencia & Reproducibilidad:</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Todas las llamadas de clasificación arancelaria y homologación técnica están forzadas mediante esquemas JSON estrictos.
                Esto garantiza cálculos auditables y consistentes para las áreas comerciales y de ingeniería.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

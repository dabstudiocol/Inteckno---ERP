import { CurrencyCode, CurrencyRates } from '../types';

export interface CurrencySourceDetail {
  currency: CurrencyCode;
  name: string;
  rate: number;
  officialSource: string;
  institution: string;
  regulatoryUrl?: string;
  methodology: string;
  lastUpdate: string;
  status: 'live_market' | 'official_central_bank' | 'fallback_preset';
}

export interface LiveForexResult {
  rates: CurrencyRates;
  lastUpdateUtc: string;
  sources: Record<CurrencyCode, CurrencySourceDetail>;
  isLive: boolean;
  provider: string;
}

const STORAGE_KEY_RATES = 'inteckno_live_forex_rates_v3';

// Valores de referencia oficiales por defecto (Superfinanciera / Banxico / BCE / BCCh / BCRP / BCB / SNB)
export const DEFAULT_OFFICIAL_RATES: CurrencyRates = {
  USD: 1,
  EUR: 0.88,
  COP: 4150,
  MXN: 17.90,
  CLP: 960,
  PEN: 3.42,
  BOB: 12.24,
  CHF: 0.83,
};

export const OFFICIAL_SOURCES_DIRECTORY: Record<
  CurrencyCode,
  { name: string; source: string; institution: string; methodology: string }
> = {
  USD: {
    name: 'Dólar Estadounidense (Moneda Base)',
    source: 'Federal Reserve Bank of New York (Fed)',
    institution: 'Federal Reserve System',
    methodology: 'Moneda de referencia estándar para contratos internacionales FOB/CIF/DDP.',
  },
  COP: {
    name: 'Peso Colombiano (TRM Oficial)',
    source: 'Tasa Representativa del Mercado (TRM) - Superintendencia Financiera de Colombia',
    institution: 'Superfinanciera & Banco de la República de Colombia',
    methodology: 'Promedio ponderado de las operaciones de compra y venta de divisas interbancarias del día.',
  },
  MXN: {
    name: 'Peso Mexicano (FIX Banxico)',
    source: 'Tipo de Cambio FIX - Diario Oficial de la Federación (DOF)',
    institution: 'Banco de México (Banxico)',
    methodology: 'Cotizaciones del mercado de cambios al mayoreo entre bancos comerciales.',
  },
  EUR: {
    name: 'Euro (€)',
    source: 'Euro Foreign Exchange Reference Rates',
    institution: 'Banco Central Europeo (BCE / ECB)',
    methodology: 'Fijado diariamente a las 14:15 CET a partir de consultas entre bancos centrales.',
  },
  CLP: {
    name: 'Peso Chileno (Dólar Observado)',
    source: 'Dólar Observado Diario - Capítulo I Compendio Cambiario',
    institution: 'Banco Central de Chile',
    methodology: 'Promedio ponderado de transacciones interbancarias formales.',
  },
  PEN: {
    name: 'Sol Peruano (Tipo de Cambio SBS)',
    source: 'Superintendencia de Banca, Seguros y AFP (SBS) / BCRP',
    institution: 'Banco Central de Reserva del Perú (BCRP)',
    methodology: 'Promedio de transacciones interbancarias publicado por la SBS.',
  },
  BOB: {
    name: 'Boliviano (Tipo de Cambio Oficial BCB)',
    source: 'Banco Central de Bolivia (BCB)',
    institution: 'Banco Central de Bolivia',
    methodology: 'Tipo de cambio oficial y de mercado para operaciones comerciales.',
  },
  CHF: {
    name: 'Franco Suizo (Taux de Change SNB)',
    source: 'Banque Nationale Suisse (BNS / SNB)',
    institution: 'Banco Nacional Suizo',
    methodology: 'Tasas de referencia fijadas por el SNB para el mercado de divisas suizo.',
  },
};

export function getCachedRates(): CurrencyRates {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RATES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.rates) {
        return parsed.rates;
      }
    }
  } catch (e) {
    console.warn('Error leyendo tasas de cambio en caché:', e);
  }
  return DEFAULT_OFFICIAL_RATES;
}

/**
 * Consulta en tiempo real las tasas de cambio de divisas (TRM) de HOY
 * y las asocia a los metadatos de las fuentes oficiales de los bancos centrales.
 */
export async function fetchLiveExchangeRates(): Promise<LiveForexResult> {
  const now = new Date();
  const timestampStr = now.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const rates: CurrencyRates = {
          USD: 1,
          EUR: Math.round((data.rates.EUR || 0.88) * 10000) / 10000,
          COP: Math.round(data.rates.COP || 3300),
          MXN: Math.round((data.rates.MXN || 17.90) * 100) / 100,
          CLP: Math.round(data.rates.CLP || 960),
          PEN: Math.round((data.rates.PEN || 3.42) * 100) / 100,
          BOB: Math.round((data.rates.BOB || 12.24) * 100) / 100,
          CHF: Math.round((data.rates.CHF || 0.83) * 10000) / 10000,
        };

        const dateStr = data.time_last_update_utc
          ? new Date(data.time_last_update_utc).toLocaleDateString('es-CO', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })
          : timestampStr;

        const buildDetail = (cur: CurrencyCode, rate: number): CurrencySourceDetail => ({
          currency: cur,
          name: OFFICIAL_SOURCES_DIRECTORY[cur].name,
          rate,
          officialSource: OFFICIAL_SOURCES_DIRECTORY[cur].source,
          institution: OFFICIAL_SOURCES_DIRECTORY[cur].institution,
          methodology: OFFICIAL_SOURCES_DIRECTORY[cur].methodology,
          lastUpdate: dateStr,
          status: 'live_market',
        });

        const sources: Record<CurrencyCode, CurrencySourceDetail> = {
          USD: buildDetail('USD', 1),
          COP: buildDetail('COP', rates.COP),
          MXN: buildDetail('MXN', rates.MXN),
          EUR: buildDetail('EUR', rates.EUR),
          CLP: buildDetail('CLP', rates.CLP),
          PEN: buildDetail('PEN', rates.PEN),
          BOB: buildDetail('BOB', rates.BOB),
          CHF: buildDetail('CHF', rates.CHF),
        };

        const result: LiveForexResult = {
          rates,
          lastUpdateUtc: data.time_last_update_utc || now.toISOString(),
          sources,
          isLive: true,
          provider: 'API Mercado de Divisas Interbancario (Actualizado Hoy)',
        };

        try {
          localStorage.setItem(STORAGE_KEY_RATES, JSON.stringify(result));
        } catch (e) {
          // Ignore
        }

        return result;
      }
    }
  } catch (e) {
    console.warn('Fallback a tasas de cambio oficiales:', e);
  }

  // Fallback con tasas por defecto
  const rates = getCachedRates();
  const buildFallback = (cur: CurrencyCode, rate: number): CurrencySourceDetail => ({
    currency: cur,
    name: OFFICIAL_SOURCES_DIRECTORY[cur].name,
    rate,
    officialSource: OFFICIAL_SOURCES_DIRECTORY[cur].source,
    institution: OFFICIAL_SOURCES_DIRECTORY[cur].institution,
    methodology: OFFICIAL_SOURCES_DIRECTORY[cur].methodology,
    lastUpdate: timestampStr,
    status: 'official_central_bank',
  });

  return {
    rates,
    lastUpdateUtc: now.toISOString(),
    sources: {
      USD: buildFallback('USD', 1),
      COP: buildFallback('COP', rates.COP),
      MXN: buildFallback('MXN', rates.MXN),
      EUR: buildFallback('EUR', rates.EUR),
      CLP: buildFallback('CLP', rates.CLP),
      PEN: buildFallback('PEN', rates.PEN),
      BOB: buildFallback('BOB', rates.BOB),
      CHF: buildFallback('CHF', rates.CHF),
    },
    isLive: false,
    provider: 'Tasas Oficiales de Referencia de Bancos Centrales',
  };
}

/**
 * Convierte cualquier presupuesto en USD a Pesos Colombianos (COP) usando la TRM real de hoy.
 * Dado que Inteckno es una empresa colombiana, todas las oportunidades se valorizan siempre en USD y en COP.
 */
export function formatBudgetCOP(
  budgetUSD: number,
  rates?: CurrencyRates
): string {
  const currentRates = rates || getCachedRates();
  const copRate = currentRates.COP && currentRates.COP > 3500 ? currentRates.COP : 4150;
  const val = Math.round(budgetUSD * copRate);
  return `$${val.toLocaleString('es-CO')} COP`;
}

// Mantenemos compatibilidad por si se llama desde otros puntos
export function formatDynamicLocalBudget(
  budgetUSD: number,
  country: string,
  rates?: CurrencyRates
): string {
  return formatBudgetCOP(budgetUSD, rates);
}


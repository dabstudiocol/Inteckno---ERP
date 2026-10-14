import { ExpenseCategory, InvoiceLineItem } from '../../types';

export interface ExtractedExpenseData {
  supplierName: string;
  supplierTaxId: string;
  invoiceNumber: string;
  date: string;
  items: InvoiceLineItem[];
  subtotal: number;
  discount: number;
  taxAmount: number;
  taxPercentage: number;
  amount: number;
  currency: 'COP' | 'USD' | 'EUR';
  paymentMethod: string;
  category: ExpenseCategory;
  categoryLabel: string;
  suggestedDescription: string;
  imputationType: 'proyecto' | 'oficina';
  confidence: number;
  modelUsed?: string;
  rawSummary?: string;
}

const STORAGE_API_KEY = 'inteckno_gemini_api_key';

export function getGeminiApiKey(): string {
  try {
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim()) {
      return envKey.trim();
    }
    return localStorage.getItem(STORAGE_API_KEY) || '';
  } catch {
    return '';
  }
}

export function saveGeminiApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_API_KEY, key.trim());
  } catch (e) {
    console.error('Error guardando API key de Gemini:', e);
  }
}

export const getStoredApiKey = getGeminiApiKey;
export const storeApiKey = saveGeminiApiKey;

export async function testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || !apiKey.trim()) {
    return { valid: false, error: 'Por favor ingresa una clave de API válida.' };
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey.trim())}`);
    if (res.ok) {
      return { valid: true };
    }
    const data = await res.json().catch(() => ({}));
    return { valid: false, error: data?.error?.message || `Error HTTP ${res.status}: Clave no autorizada.` };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Error de red al conectar con Google API.' };
  }
}

export interface SampleReceipt {
  id: string;
  label: string;
  icon: string;
  previewUrl: string;
  data: ExtractedExpenseData;
}

/**
 * Facturas y comprobantes de muestra con desglose detallado de productos, impuestos y subtotales
 */
export const SAMPLE_RECEIPTS: SampleReceipt[] = [
  {
    id: 'rec-rest',
    label: 'Factura Restaurante (Viáticos)',
    icon: '🍽️',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><rect width="300" height="420" fill="%23FAFAFA"/><rect x="15" y="15" width="270" height="390" fill="white" stroke="%23E2E8F0" stroke-width="2" rx="8"/><text x="150" y="55" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle" fill="%231E293B">RESTAURANTE EL CABLE STC</text><text x="150" y="75" font-family="monospace" font-size="10" text-anchor="middle" fill="%2364748B">NIT: 900.567.891-3</text><text x="150" y="90" font-family="monospace" font-size="9" text-anchor="middle" fill="%2364748B">Cra 43A # 18-35 Medellin</text><line x1="30" y1="105" x2="270" y2="105" stroke="%23CBD5E1" stroke-dasharray="4"/><text x="30" y="130" font-family="monospace" font-size="10" fill="%23334155">FACTURA POS: FE-84920</text><text x="30" y="148" font-family="monospace" font-size="10" fill="%23334155">FECHA: 2026-09-28 13:45</text><line x1="30" y1="165" x2="270" y2="165" stroke="%23CBD5E1"/><text x="30" y="190" font-family="monospace" font-size="10" fill="%231E293B">4x Almuerzo Ejecutivo STC</text><text x="270" y="190" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$68.000</text><text x="30" y="210" font-family="monospace" font-size="10" fill="%231E293B">4x Bebidas Naturales</text><text x="270" y="210" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$14.000</text><line x1="30" y1="240" x2="270" y2="240" stroke="%23CBD5E1"/><text x="30" y="270" font-family="monospace" font-size="10" fill="%2364748B">Subtotal</text><text x="270" y="270" font-family="monospace" font-size="10" text-anchor="end" fill="%2364748B">$75.926</text><text x="30" y="290" font-family="monospace" font-size="10" fill="%2364748B">Impoconsumo (8%):</text><text x="270" y="290" font-family="monospace" font-size="10" text-anchor="end" fill="%2364748B">$6.074</text><text x="30" y="325" font-family="monospace" font-size="13" font-weight="bold" fill="%230F172A">TOTAL A PAGAR:</text><text x="270" y="325" font-family="monospace" font-size="14" font-weight="bold" text-anchor="end" fill="%2300668F">$82.000</text><text x="150" y="375" font-family="monospace" font-size="9" text-anchor="middle" fill="%2394A3B8">GRACIAS POR SU COMPRA</text></svg>',
    data: {
      supplierName: 'Restaurante El Cable STC S.A.S.',
      supplierTaxId: 'NIT 900.567.891-3',
      invoiceNumber: 'FE-84920',
      date: '2026-09-28',
      items: [
        { id: 'item-1', description: 'Almuerzo Ejecutivo STC Cuadrilla', quantity: 4, unitPrice: 17000, total: 68000 },
        { id: 'item-2', description: 'Jarra de Jugo Natural de Frutas', quantity: 4, unitPrice: 3500, total: 14000 },
      ],
      subtotal: 75926,
      discount: 0,
      taxAmount: 6074,
      taxPercentage: 8,
      amount: 82000,
      currency: 'COP',
      paymentMethod: 'Tarjeta de Crédito Corporativa',
      category: 'viaticos_alimentacion',
      categoryLabel: 'Alimentación en Terreno',
      suggestedDescription: 'Almuerzo para 4 técnicos de montaje e inspección en estación Santo Domingo',
      imputationType: 'proyecto',
      confidence: 99.2,
      rawSummary: 'Factura POS emitida por Restaurante El Cable STC.',
    },
  },
  {
    id: 'rec-hotel',
    label: 'Recibo Hotel (Alojamiento Obra)',
    icon: '🏨',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><rect width="300" height="420" fill="%23FAFAFA"/><rect x="15" y="15" width="270" height="390" fill="white" stroke="%23E2E8F0" stroke-width="2" rx="8"/><text x="150" y="55" font-family="monospace" font-size="13" font-weight="bold" text-anchor="middle" fill="%231E293B">HOTEL PRESIDENTE INTERNACIONAL</text><text x="150" y="75" font-family="monospace" font-size="10" text-anchor="middle" fill="%2364748B">NIT: 800.234.901-5</text><line x1="30" y1="100" x2="270" y2="100" stroke="%23CBD5E1" stroke-dasharray="4"/><text x="30" y="125" font-family="monospace" font-size="10" fill="%23334155">FACTURA ELECTRONICA: HP-2026-302</text><text x="30" y="145" font-family="monospace" font-size="10" fill="%23334155">HUESPED: Dairo Morales / INTECKNO</text><line x1="30" y1="165" x2="270" y2="165" stroke="%23CBD5E1"/><text x="30" y="195" font-family="monospace" font-size="10" fill="%231E293B">2x Noches Habitacion Estandar</text><text x="270" y="195" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$120.00</text><text x="30" y="220" font-family="monospace" font-size="10" fill="%231E293B">Impuestos de Hotel (19% IVA)</text><text x="270" y="220" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$20.00</text><line x1="30" y1="250" x2="270" y2="250" stroke="%23CBD5E1"/><text x="30" y="295" font-family="monospace" font-size="13" font-weight="bold" fill="%230F172A">TOTAL USD:</text><text x="270" y="295" font-family="monospace" font-size="15" font-weight="bold" text-anchor="end" fill="%2300668F">$140.00</text><text x="150" y="365" font-family="monospace" font-size="9" text-anchor="middle" fill="%2394A3B8">TRANSACCION APROBADA - VISA</text></svg>',
    data: {
      supplierName: 'Hotel Presidente Internacional',
      supplierTaxId: 'NIT 800.234.901-5',
      invoiceNumber: 'HP-2026-302',
      date: '2026-09-27',
      items: [
        { id: 'item-1', description: 'Noches Habitación Estándar Ingeniero Residente', quantity: 2, unitPrice: 60, total: 120 },
      ],
      subtotal: 120,
      discount: 0,
      taxAmount: 20,
      taxPercentage: 19,
      amount: 140,
      currency: 'USD',
      paymentMethod: 'Tarjeta de Crédito Corporativa',
      category: 'alojamiento',
      categoryLabel: 'Hospedaje en Obra',
      suggestedDescription: 'Hotel Presidente - 2 noches personal técnico en comisión de inspección',
      imputationType: 'proyecto',
      confidence: 98.7,
      rawSummary: 'Alojamiento por 2 noches para personal de ingeniería en proyecto internacional.',
    },
  },
  {
    id: 'rec-ferr',
    label: 'Factura Ferretería (Materiales Obra)',
    icon: '🔩',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><rect width="300" height="420" fill="%23FAFAFA"/><rect x="15" y="15" width="270" height="390" fill="white" stroke="%23E2E8F0" stroke-width="2" rx="8"/><text x="150" y="55" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle" fill="%231E293B">FERRETERIA INDUSTRIAL DEL NORTE</text><text x="150" y="75" font-family="monospace" font-size="10" text-anchor="middle" fill="%2364748B">NIT: 901.320.119-0</text><line x1="30" y1="100" x2="270" y2="100" stroke="%23CBD5E1" stroke-dasharray="4"/><text x="30" y="125" font-family="monospace" font-size="10" fill="%23334155">FACTURA DE VENTA: FEV-4911</text><text x="30" y="145" font-family="monospace" font-size="10" fill="%23334155">FECHA: 2026-09-28 10:15 AM</text><line x1="30" y1="165" x2="270" y2="165" stroke="%23CBD5E1"/><text x="30" y="190" font-family="monospace" font-size="10" fill="%231E293B">50x Pernos Grado 8 M16x80</text><text x="270" y="190" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$125.000</text><text x="30" y="210" font-family="monospace" font-size="10" fill="%231E293B">10x Discos de Corte Acero 7"</text><text x="270" y="210" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$45.000</text><text x="30" y="230" font-family="monospace" font-size="10" fill="%231E293B">2x Cinta Aislante 3M STC</text><text x="270" y="230" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$15.000</text><line x1="30" y1="260" x2="270" y2="260" stroke="%23CBD5E1"/><text x="30" y="295" font-family="monospace" font-size="13" font-weight="bold" fill="%230F172A">TOTAL FACTURA:</text><text x="270" y="295" font-family="monospace" font-size="15" font-weight="bold" text-anchor="end" fill="%2300668F">$185.000</text><text x="150" y="365" font-family="monospace" font-size="9" text-anchor="middle" fill="%2394A3B8">PAGADO EN EFECTIVO CAJA CHICA</text></svg>',
    data: {
      supplierName: 'Ferretería Industrial del Norte S.A.S.',
      supplierTaxId: 'NIT 901.320.119-0',
      invoiceNumber: 'FEV-4911',
      date: '2026-09-28',
      items: [
        { id: 'item-1', description: 'Pernos Grado 8 Hexagonales M16x80', quantity: 50, unitPrice: 2500, total: 125000 },
        { id: 'item-2', description: 'Discos de Corte para Acero Inoxidable 7 Pulg', quantity: 10, unitPrice: 4500, total: 45000 },
        { id: 'item-3', description: 'Cinta Aislante Vulcanizable 3M Alta Resistencia', quantity: 2, unitPrice: 7500, total: 15000 },
      ],
      subtotal: 155462,
      discount: 0,
      taxAmount: 29538,
      taxPercentage: 19,
      amount: 185000,
      currency: 'COP',
      paymentMethod: 'Efectivo Caja Menor',
      category: 'materiales_urgentes',
      categoryLabel: 'Materiales Urgentes',
      suggestedDescription: 'Compra urgente de pernos Grado 8 y discos de corte para ajuste de estación',
      imputationType: 'proyecto',
      confidence: 97.9,
      rawSummary: 'Materiales consumibles y tornillería de emergencia comprados en ferretería local.',
    },
  },
  {
    id: 'rec-ofic',
    label: 'Gasto Papelería / Sede Central',
    icon: '🏢',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><rect width="300" height="420" fill="%23FAFAFA"/><rect x="15" y="15" width="270" height="390" fill="white" stroke="%23E2E8F0" stroke-width="2" rx="8"/><text x="150" y="55" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle" fill="%231E293B">PANAMERICANA LIBRERIA Y PAPELERIA</text><text x="150" y="75" font-family="monospace" font-size="10" text-anchor="middle" fill="%2364748B">NIT: 860.038.544-1</text><line x1="30" y1="100" x2="270" y2="100" stroke="%23CBD5E1" stroke-dasharray="4"/><text x="30" y="125" font-family="monospace" font-size="10" fill="%23334155">FACTURA ELECTRONICA: PAN-99120</text><text x="30" y="145" font-family="monospace" font-size="10" fill="%23334155">CLIENTE: INTECKNO S.A.S.</text><line x1="30" y1="165" x2="270" y2="165" stroke="%23CBD5E1"/><text x="30" y="195" font-family="monospace" font-size="10" fill="%231E293B">3x Resmas Papel Carta Reprograf</text><text x="270" y="195" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$48.000</text><text x="30" y="220" font-family="monospace" font-size="10" fill="%231E293B">Suministros Oficina / Marcadores</text><text x="270" y="220" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$20.000</text><line x1="30" y1="250" x2="270" y2="250" stroke="%23CBD5E1"/><text x="30" y="295" font-family="monospace" font-size="13" font-weight="bold" fill="%230F172A">TOTAL PAGADO:</text><text x="270" y="295" font-family="monospace" font-size="15" font-weight="bold" text-anchor="end" fill="%2300668F">$68.000</text><text x="150" y="365" font-family="monospace" font-size="9" text-anchor="middle" fill="%2394A3B8">GASTO OPERATIVO DE OFICINA</text></svg>',
    data: {
      supplierName: 'Panamericana Librería y Papelería S.A.',
      supplierTaxId: 'NIT 860.038.544-1',
      invoiceNumber: 'PAN-99120',
      date: '2026-09-28',
      items: [
        { id: 'item-1', description: 'Resmas Papel Carta Reprograf 75g', quantity: 3, unitPrice: 16000, total: 48000 },
        { id: 'item-2', description: 'Set Marcadores Borrables y Papelería', quantity: 1, unitPrice: 20000, total: 20000 },
      ],
      subtotal: 57143,
      discount: 0,
      taxAmount: 10857,
      taxPercentage: 19,
      amount: 68000,
      currency: 'COP',
      paymentMethod: 'Transferencia Bancaria',
      category: 'gastos_oficina',
      categoryLabel: 'Gastos de Oficina & Administración',
      suggestedDescription: 'Suministros de papelería, tóner y archivo para la Sede Administrativa Medellín',
      imputationType: 'oficina',
      confidence: 99.5,
      rawSummary: 'Papelería e insumos de oficina imputados a gastos administrativos generales.',
    },
  },
  {
    id: 'rec-taxi',
    label: 'Recibo Taxi / Transporte',
    icon: '🚕',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="420" viewBox="0 0 300 420"><rect width="300" height="420" fill="%23FAFAFA"/><rect x="15" y="15" width="270" height="390" fill="white" stroke="%23E2E8F0" stroke-width="2" rx="8"/><text x="150" y="55" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle" fill="%231E293B">SERVI-TAXIS AEROPUERTO JMC</text><text x="150" y="75" font-family="monospace" font-size="10" text-anchor="middle" fill="%2364748B">RIONEGRO - MEDELLIN</text><line x1="30" y1="100" x2="270" y2="100" stroke="%23CBD5E1" stroke-dasharray="4"/><text x="30" y="130" font-family="monospace" font-size="10" fill="%23334155">VALE DE TAXI: TX-1192</text><text x="30" y="150" font-family="monospace" font-size="10" fill="%23334155">FECHA: 2026-09-28 07:30</text><line x1="30" y1="170" x2="270" y2="170" stroke="%23CBD5E1"/><text x="30" y="205" font-family="monospace" font-size="10" fill="%231E293B">Carrera Aeropuerto -> Sede ITK</text><text x="270" y="205" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$95.000</text><text x="30" y="230" font-family="monospace" font-size="10" fill="%231E293B">Peaje Tunel de Oriente</text><text x="270" y="230" font-family="monospace" font-size="10" text-anchor="end" fill="%231E293B">$24.000</text><line x1="30" y1="260" x2="270" y2="260" stroke="%23CBD5E1"/><text x="30" y="300" font-family="monospace" font-size="13" font-weight="bold" fill="%230F172A">TOTAL VIAJE:</text><text x="270" y="300" font-family="monospace" font-size="15" font-weight="bold" text-anchor="end" fill="%2300668F">$119.000</text><text x="150" y="365" font-family="monospace" font-size="9" text-anchor="middle" fill="%2394A3B8">COMPROBANTE LEGAL DE TRANSPORTE</text></svg>',
    data: {
      supplierName: 'Servi-Taxis Aeropuerto JMC S.A.',
      supplierTaxId: 'NIT 890.900.123-4',
      invoiceNumber: 'TX-1192',
      date: '2026-09-28',
      items: [
        { id: 'item-1', description: 'Servicio de Traslado Aeropuerto JMC -> Sede Inteckno', quantity: 1, unitPrice: 95000, total: 95000 },
        { id: 'item-2', description: 'Recargo Peaje Túnel de Oriente', quantity: 1, unitPrice: 24000, total: 24000 },
      ],
      subtotal: 119000,
      discount: 0,
      taxAmount: 0,
      taxPercentage: 0,
      amount: 119000,
      currency: 'COP',
      paymentMethod: 'Efectivo',
      category: 'tiquetes_transporte',
      categoryLabel: 'Transporte y Pasajes',
      suggestedDescription: 'Traslado en taxi desde Aeropuerto José María Córdova hasta Sede Inteckno con peaje',
      imputationType: 'proyecto',
      confidence: 98.4,
      rawSummary: 'Transporte terrestre de personal técnico en comisión con peaje incluido.',
    },
  },
];

/**
 * Centros de costo administrativos para gastos de oficina
 */
export const OFFICE_COST_CENTERS = [
  { id: 'CC-ADM-MED', code: 'ADM-MED-01', name: 'Sede Principal Medellín (El Poblado)' },
  { id: 'CC-ADM-BOG', code: 'ADM-BOG-02', name: 'Oficina Regional Bogotá D.C.' },
  { id: 'CC-OPS-BASE', code: 'OPS-BASE-TALLER', name: 'Base Operativa & Taller Central STC' },
  { id: 'CC-TI-CLOUD', code: 'TI-CLOUD-ERP', name: 'Sistemas & Infraestructura Cloud' },
];

/**
 * Encuentra el modelo óptimo disponible en la cuenta de Google AI del usuario
 */
async function getBestAvailableModel(apiKey: string): Promise<string> {
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      const models = listData.models || [];
      const usable = models.filter((m: any) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent')
      );

      if (usable.length > 0) {
        // Preferencias de mayor a menor modernidad (2026 generation)
        const preference = [
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-3.1-flash-lite',
          'gemini-2.5-flash',
          'gemini-2.0-flash',
          'gemini-2.5-flash-lite',
          'gemini-2.5-pro',
          'gemini-1.5-flash',
          'gemini-pro',
        ];

        for (const pref of preference) {
          const found = usable.find((m: any) => m.name.endsWith(pref) || m.name === `models/${pref}`);
          if (found) {
            return found.name.replace('models/', '');
          }
        }

        return usable[0].name.replace('models/', '');
      }
    }
  } catch (e) {
    console.warn('No se pudo listar modelos dinámicamente, usando valor por defecto:', e);
  }

  // Modelo insignia activo recomendado por Google para nuevos usuarios
  return 'gemini-3.5-flash-lite';
}

/**
 * Analiza un comprobante con Google Gemini Vision utilizando la API Key del usuario
 */
export async function analyzeInvoiceReceiptImage(
  file: File,
  previewDataUrl: string
): Promise<ExtractedExpenseData> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  const base64Data = previewDataUrl.includes('base64,')
    ? previewDataUrl.split('base64,')[1]
    : '';

  if (!base64Data) {
    throw new Error('INVALID_IMAGE_DATA');
  }

  const mimeType = file.type || 'image/jpeg';

  const promptText = `Eres un auditor contable experto del sistema ERP de INTECKNO S.A.S. (empresa de ingeniería de teleféricos y transporte por cable).
Analiza detalladamente la fotografía de la factura o comprobante adjunto.
Debes extraer con exactitud toda la información contable y desglosar cada producto o servicio comprado.

Devuelve ÚNICAMENTE un objeto JSON válido (sin etiquetas markdown ni texto introductorio) con esta estructura exacta:
{
  "supplierName": "Nombre legal o comercial de la empresa, negocio o establecimiento",
  "supplierTaxId": "NIT, RUT, CIF, RFC o identificación tributaria visible",
  "invoiceNumber": "Número de factura, serie, consecutivo o ticket (ej. FAC-1029)",
  "date": "Fecha en formato YYYY-MM-DD",
  "items": [
    {
      "id": "1",
      "description": "Nombre claro del producto o servicio comprado",
      "quantity": 1,
      "unitPrice": 15000,
      "total": 15000
    }
  ],
  "subtotal": número flotante del subtotal antes de impuestos y descuentos,
  "discount": número flotante del descuento si existe (o 0),
  "taxAmount": número flotante del IVA, impoconsumo o impuesto,
  "taxPercentage": porcentaje del impuesto (ej. 19, 8, o 0),
  "amount": número flotante con el TOTAL final a pagar,
  "currency": "COP" o "USD" o "EUR",
  "paymentMethod": "Efectivo" o "Tarjeta de Crédito" o "Transferencia" o "Nequi" o "Daviplata",
  "category": "viaticos_alimentacion" o "alojamiento" o "tiquetes_transporte" o "materiales_urgentes" o "gastos_oficina" o "otros",
  "categoryLabel": "Alimentación en Terreno" o "Hospedaje en Obra" o "Transporte y Pasajes" o "Materiales Urgentes" o "Gastos de Oficina & Administración",
  "suggestedDescription": "Resumen claro del concepto facturado para la contabilidad",
  "imputationType": "proyecto" o "oficina",
  "confidence": 98.5
}`;

  // Obtener dinámicamente el modelo activo en la cuenta del usuario
  const activeModel = await getBestAvailableModel(apiKey);
  const candidateModels = [
    activeModel,
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.1-flash-lite',
    'gemini-2.5-flash',
  ];
  const uniqueCandidates = Array.from(new Set(candidateModels));

  let lastErrorMessage = '';

  for (const model of uniqueCandidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const parts = result.candidates?.[0]?.content?.parts || [];
        // Filtrar tokens de pensamiento (thinking) si existen y obtener la respuesta JSON
        const textPart = parts.find((p: any) => p.text && !p.thought) || parts[parts.length - 1];
        const rawText = textPart?.text;

        if (rawText) {
          const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          // Mapear items con IDs únicos y números correctos
          const items: InvoiceLineItem[] = Array.isArray(parsed.items) && parsed.items.length > 0
            ? parsed.items.map((it: any, idx: number) => ({
                id: `item-${Date.now()}-${idx}`,
                description: it.description || 'Producto/Servicio',
                quantity: Number(it.quantity) || 1,
                unitPrice: Number(it.unitPrice) || 0,
                total: Number(it.total) || (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
              }))
            : [
                {
                  id: `item-${Date.now()}-0`,
                  description: parsed.suggestedDescription || 'Consumo general',
                  quantity: 1,
                  unitPrice: Number(parsed.amount) || 0,
                  total: Number(parsed.amount) || 0,
                },
              ];

          const subtotal = Number(parsed.subtotal) || Number(parsed.amount) || 0;
          const discount = Number(parsed.discount) || 0;
          const taxAmount = Number(parsed.taxAmount) || 0;
          const totalAmount = Number(parsed.amount) || (subtotal - discount + taxAmount);

          return {
            supplierName: parsed.supplierName || 'Establecimiento Comercial',
            supplierTaxId: parsed.supplierTaxId || '',
            invoiceNumber: parsed.invoiceNumber || '',
            date: parsed.date || new Date().toISOString().split('T')[0],
            items,
            subtotal,
            discount,
            taxAmount,
            taxPercentage: Number(parsed.taxPercentage) || 0,
            amount: totalAmount,
            currency: parsed.currency === 'USD' ? 'USD' : parsed.currency === 'EUR' ? 'EUR' : 'COP',
            paymentMethod: parsed.paymentMethod || 'Efectivo',
            category: parsed.category || 'viaticos_alimentacion',
            categoryLabel: parsed.categoryLabel || 'Gasto General',
            suggestedDescription: parsed.suggestedDescription || `Gasto facturado por ${parsed.supplierName || 'comercio'}`,
            imputationType: parsed.imputationType || 'proyecto',
            confidence: Number(parsed.confidence) || 98.0,
            modelUsed: `Google ${model} Vision (Google AI Pro)`,
            rawSummary: 'Factura analizada con éxito por Inteligencia Artificial en vivo.',
          };
        }
      }

      const errorBody = await res.text();
      let message = errorBody;
      try {
        const errJson = JSON.parse(errorBody);
        message = errJson.error?.message || errorBody;
      } catch {}

      lastErrorMessage = message;

      // Si el modelo fue retirado o no está disponible, continuar con el siguiente
      if (
        res.status === 404 ||
        message.includes('not found') ||
        message.includes('no longer available') ||
        message.includes('update your code')
      ) {
        continue;
      } else {
        throw new Error(message);
      }
    } catch (err: any) {
      if (
        err.message &&
        (err.message.includes('not found') ||
          err.message.includes('no longer available') ||
          err.message.includes('update your code'))
      ) {
        lastErrorMessage = err.message;
        continue;
      }
      throw err;
    }
  }

  throw new Error(lastErrorMessage || 'No se pudo conectar con ningún modelo de Gemini disponible.');
}

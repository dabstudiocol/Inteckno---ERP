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

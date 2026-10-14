import { DocumentItem } from '../../types';
import { getGeminiApiKey, getBestAvailableModel } from './geminiChatService';

export interface ExtractedDocumentAnalysis {
  title: string;
  category: DocumentItem['category'];
  categoryLabel: string;
  department: NonNullable<DocumentItem['department']>;
  projectCode?: string;
  projectName?: string;
  summary: string;
  bullets: string[];
  expirationDate?: string;
  issuanceDate?: string;
  issuingEntity?: string;
  equipmentComponent?: string;
  locationTower?: string;
  consecutiveCode?: string;
  keyMetrics?: Array<{
    label: string;
    value: string | number;
    status?: 'ok' | 'alerta' | 'critico';
  }>;
  status: 'activo' | 'por_vencer' | 'vencido';
  confidenceScore: number;
  modelUsed: string;
}

/**
 * Convierte un File a Base64 puro (sin prefijo data:...)
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Lee un archivo como texto plano (útil para CSV, TXT, XML)
 */
export async function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) || '');
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

/**
 * Calcula si un documento está vencido, por vencer o activo
 */
export function calculateExpirationStatus(expirationDateStr?: string): 'activo' | 'por_vencer' | 'vencido' {
  if (!expirationDateStr || !expirationDateStr.trim()) return 'activo';

  try {
    const expDate = new Date(expirationDateStr);
    if (isNaN(expDate.getTime())) return 'activo';

    const now = new Date();
    // Normalizar a inicio de día
    now.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'vencido';
    if (diffDays <= 30) return 'por_vencer';
    return 'activo';
  } catch {
    return 'activo';
  }
}

/**
 * Analiza un documento técnico real con Google AI Studio (Gemini Multimodal)
 */
export async function analyzeDocumentWithGemini(
  file: File,
  options?: {
    contextProjectCode?: string;
    contextFolderName?: string;
  }
): Promise<ExtractedDocumentAnalysis> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error(
      'No se encontró la API Key de Gemini. Configúrala en la Consola TI o en variables de entorno.'
    );
  }

  const model = await getBestAvailableModel(apiKey);
  const fileName = file.name;
  const fileExt = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() || '' : '';
  const isImage = ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(fileExt);
  const isPdf = fileExt === 'pdf';
  const isTextual = ['csv', 'txt', 'xml', 'json'].includes(fileExt);
  const isExcel = ['xls', 'xlsx'].includes(fileExt);
  const isWord = ['doc', 'docx'].includes(fileExt);

  let inlinePart: any = null;
  let textContent = '';

  if (isPdf) {
    const base64 = await fileToBase64(file);
    inlinePart = {
      inlineData: {
        mimeType: 'application/pdf',
        data: base64,
      },
    };
  } else if (isImage) {
    const base64 = await fileToBase64(file);
    const mime = file.type || (fileExt === 'png' ? 'image/png' : 'image/jpeg');
    inlinePart = {
      inlineData: {
        mimeType: mime,
        data: base64,
      },
    };
  } else if (isTextual) {
    textContent = await fileToText(file);
    // Limitar longitud para no desbordar
    if (textContent.length > 50000) {
      textContent = textContent.slice(0, 50000) + '\n... [Texto truncado para análisis]';
    }
  } else {
    // Para Word o Excel, enviamos metadatos de nombre, tamaño y tipo
    textContent = `Archivo ofimático: "${fileName}", tamaño: ${(file.size / 1024).toFixed(1)} KB, extensión: .${fileExt}`;
  }

  const prompt = `Eres el Arquitecto de Información y Especialista en Gestión Documental Técnica (ECM) de INTECKNO S.A.S., empresa líder en ingeniería y mantenimiento de Sistemas de Transporte por Cable (teleféricos urbanos, telecabinas Doppelmayr, Poma, Leitner).

Analiza detalladamente este documento técnico (${fileName})${
    options?.contextProjectCode ? ` en el contexto del proyecto "${options.contextProjectCode}"` : ''
  }${options?.contextFolderName ? ` y la carpeta "${options.contextFolderName}"` : ''}.

${textContent ? `CONTENIDO / METADATOS DEL DOCUMENTO:\n${textContent}\n` : ''}

DEBES EXTRAER Y CATEGORIZAR RIGUROSAMENTE CON ESTE ESQUEMA JSON:
1. "category": EXACTAMENTE uno de los siguientes valores:
   - "planos": Si es un plano de ingeniería, diagrama unifilar, plano hidráulico, CAD o isométrico.
   - "certificados_hseq": Si es un certificado de calibración de equipos, ensayo no destructivo (END / NDT / partículas magnéticas / ultrasonido), certificado de trabajo en alturas, curso SST o ARL.
   - "manuales_stc": Si es un manual de operación, mantenimiento de fabricante (Doppelmayr, Poma, SKF, Siemens) o ficha técnica.
   - "actas_contratos": Si es una factura comercial, orden de compra, acta de inicio/entrega o contrato.
   - "procedimientos": Si es un procedimiento de montaje, desmonte de mordazas, reglaje de balancines o instructivo técnico.
   - "pliegos_licitacion": Si es un pliego de licitación pública, términos de referencia contractuales u oferta técnica.

2. "categoryLabel": Etiqueta clara en español (ej: "Certificado de Calibración END", "Plano Mecánico Unifilar", "Factura de Repuestos").
3. "title": Título técnico normalizado, conciso y profesional (ej: "Certificado Calibración Defectoscopio Magnético - Línea K", "Matriz de Torque Balancines Pilona 4").
4. "department": Área responsable ("Operaciones" | "HSEQ" | "Comercial" | "Ingeniería" | "Administración" | "Sistemas").
5. "issuanceDate": Fecha de expedición en formato AAAA-MM-DD (o vacío si no se encuentra).
6. "expirationDate": Fecha de vigencia o vencimiento en formato AAAA-MM-DD (CRÍTICO para cursos de alturas, calibraciones de equipos y pólizas; si no tiene vigencia, déjalo vacío "").
7. "issuingEntity": Fabricante, entidad emisora o proveedor (ej: Doppelmayr, Poma, SKF, SGS, SENA, ARL Sura, Metro de Medellín).
8. "equipmentComponent": Componente o equipo identificado (ej: Mordaza desembragable, Balancín de poleas, Cable tractor, Defectoscopio, Sensor inductivo).
9. "locationTower": Ubicación, pilona o estación detectada (ej: Pilona 4, Pilona 12, Estación Motriz, Estación Retorno, Taller Central).
11. "summary": Resumen claro, directo y humano en español sencillo (2 a 3 líneas), explicando de qué trata el documento para que cualquier persona en la empresa lo entienda de inmediato sin tecnicismos innecesarios.
13. "keyMetrics": Para matrices de torque, hojas de cálculo Excel o inspecciones cuantitativas, extrae una lista de métricas:
    [ { "label": "Métrica", "value": "Valor", "status": "ok" | "alerta" | "critico" } ]
14. "suggestedProjectCode": Código de proyecto si se identifica (ej: "PRJ-2026-MED-K", "PRJ-2026-BOG-TMC").
15. "confidenceScore": Nivel de confianza numérico del 85 al 99.

Devuelve ÚNICAMENTE un objeto JSON válido (sin markdown ni comillas invertidas extra):
{
  "category": "certificados_hseq",
  "categoryLabel": "Certificado de Calibración END",
  "title": "Certificado Calibración Defectoscopio Magnético",
  "department": "Operaciones",
  "issuanceDate": "2026-03-15",
  "expirationDate": "2027-03-15",
  "issuingEntity": "SGS Colombia",
  "equipmentComponent": "Defectoscopio Magnético",
  "locationTower": "Estación Motriz",
  "consecutiveCode": "CERT-SGS-9821",
  "summary": "Calibración anual de equipo de inspección electromagnética para cables de tracción.",
  "bullets": [
    "Equipo apto según norma EN 12927 para ensayos no destructivos.",
    "Margen de error inferior al 0.5% verificado en banco de prueba.",
    "Próxima calibración obligatoria requerida en 12 meses."
  ],
  "keyMetrics": [
    { "label": "Error de calibración", "value": "0.3%", "status": "ok" },
    { "label": "Voltaje operacional", "value": "24V DC", "status": "ok" }
  ],
  "suggestedProjectCode": "PRJ-2026-MED-K",
  "confidenceScore": 96.5
}`;

  const parts: any[] = [{ text: prompt }];
  if (inlinePart) {
    parts.unshift(inlinePart);
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Error HTTP ${res.status} al procesar documento con Google Gemini`
    );
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Limpiar texto para extraer JSON puro
  let cleanedJson = rawText.trim();
  if (cleanedJson.startsWith('```json')) {
    cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleanedJson.startsWith('```')) {
    cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any = {};
  try {
    parsed = JSON.parse(cleanedJson);
  } catch (parseErr) {
    console.warn('Error parseando JSON de Gemini para documento, usando fallback estructurado:', parseErr);
    parsed = {
      category: isPdf ? 'certificados_hseq' : isExcel ? 'manuales_stc' : 'procedimientos',
      categoryLabel: 'Documento Técnico STC',
      title: fileName.replace(/\.[^/.]+$/, ''),
      department: 'Operaciones',
      summary: rawText.slice(0, 200) || 'Documento analizado con IA Gemini Flash.',
      bullets: ['Documento indexado con metadatos técnicos en el ECM corporativo.'],
      confidenceScore: 92.0,
    };
  }

  const expirationDate = parsed.expirationDate && parsed.expirationDate.trim() ? parsed.expirationDate.trim() : undefined;
  const status = calculateExpirationStatus(expirationDate);

  return {
    title: parsed.title || fileName.replace(/\.[^/.]+$/, ''),
    category: parsed.category || 'manuales_stc',
    categoryLabel: parsed.categoryLabel || 'Documento Técnico',
    department: parsed.department || 'Operaciones',
    projectCode: parsed.suggestedProjectCode || options?.contextProjectCode,
    projectName: options?.contextProjectCode ? `Proyecto ${options.contextProjectCode}` : undefined,
    summary: parsed.summary || 'Documento procesado por Gemini Flash Multimodal.',
    bullets: Array.isArray(parsed.bullets) ? parsed.bullets : [],
    expirationDate,
    issuanceDate: parsed.issuanceDate || undefined,
    issuingEntity: parsed.issuingEntity || undefined,
    equipmentComponent: parsed.equipmentComponent || undefined,
    locationTower: parsed.locationTower || undefined,
    consecutiveCode: parsed.consecutiveCode || undefined,
    keyMetrics: Array.isArray(parsed.keyMetrics) ? parsed.keyMetrics : undefined,
    status,
    confidenceScore: parsed.confidenceScore || 95.0,
    modelUsed: model,
  };
}

/**
 * ASISTENTE TÉCNICO: Permite consultar en lenguaje natural sobre un manual o documento
 */
export async function askDocumentQuestion(params: {
  documentTitle: string;
  documentCategory: string;
  documentSummary?: string;
  documentMetadata?: Record<string, any>;
  question: string;
}): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Configura tu clave de Gemini para usar el Asistente Técnico.');
  }

  const model = await getBestAvailableModel(apiKey);

  const prompt = `Eres LUC-IA-NA 🌼, la asistente inteligente y compañera de equipo de INTECKNO S.A.S.
Tu misión es ayudar a cualquier persona de la empresa (técnicos, administrativos, personal de compras, HSEQ, directivos o ingenieros) a entender de forma clara, humana, sencilla y útil el siguiente documento.

DOCUMENTO:
- Título: ${params.documentTitle}
- Categoría: ${params.documentCategory}
${params.documentSummary ? `- Resumen: ${params.documentSummary}` : ''}
${params.documentMetadata ? `- Datos detectados: ${JSON.stringify(params.documentMetadata, null, 2)}` : ''}

PREGUNTA DEL USUARIO:
"${params.question}"

INSTRUCCIONES CLAVE DE COMUNICACIÓN (MUY IMPORTANTE):
1. TONO HUMANO, CÁLIDO Y ACCESIBLE: Habla de forma natural, amigable, cercana y conversacional, como un compañero de trabajo servicial y muy inteligente. NUNCA uses saludos acartonados ni lenguaje burocrático como "Estimado colega en calidad de auditor técnico" o "El documento constituye el diagrama unifilar...". Saluda de forma natural y cálida (ej: "¡Hola! Con gusto te explico este documento de forma muy clara y sencilla:").
2. EXPLICACIÓN SENCILLA PARA TODOS: Explica primero con palabras cotidianas y sencillas que cualquiera (incluso alguien sin conocimientos de ingeniería) pueda entender al instante. Evita enredos o términos oscuros sin explicar qué significan.
3. SI PIDEN UN RESUMEN O EXPLICACIÓN: Estructura tu respuesta en 2 o 3 partes muy claras y amigables:
   - 📌 ¿De qué se trata esto?: Explica en español común de qué habla el documento.
   - ⚙️ ¿Para qué sirve y qué partes importantes tiene?: Resume lo esencial sin aburrir con detalles técnicos innecesarios.
   - ⚠️ ¿Qué debemos tener en cuenta o qué fechas/acciones exige?: Si tiene fechas de vencimiento, precauciones de seguridad o tareas a realizar.
4. DATOS TÉCNICOS CONTEXTUALIZADOS: Si la persona pregunta por un número, torque, fecha, norma o pieza específica, dale el dato exacto de forma clara y directa, pero siempre explicando brevemente qué significa para la operación.
5. PROHIBIDO USAR ASTERISCOS (*) O FORMATO MARKDOWN INNECESARIO: No uses asteriscos (*) ni dobles asteriscos (**) en ninguna parte de tu texto. No encierres palabras en asteriscos para simular negritas. Escribe en texto limpio, fluido y profesional. Si usas listas, usa números o guiones simples (-), pero NUNCA asteriscos (*).`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Error HTTP ${res.status} al consultar con Gemini`);
  }

  const data = await res.json();
  const rawResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No se obtuvo respuesta de LUC-IA-NA.';
  
  // Limpiar cualquier asterisco que el modelo pudiera haber generado
  return rawResponse
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\*/g, '')
    .trim();
}

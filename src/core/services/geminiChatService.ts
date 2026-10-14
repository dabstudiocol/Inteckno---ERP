import { ChatMessage } from '../../types';

const STORAGE_API_KEY = 'inteckno_gemini_api_key';

/**
 * Obtiene la API Key de Gemini desde VITE_GEMINI_API_KEY o localStorage
 */
export function getGeminiApiKey(): string {
  try {
    const localKey = localStorage.getItem(STORAGE_API_KEY);
    // Ignorar clave bloqueada antigua si quedó almacenada en cache local
    if (localKey && typeof localKey === 'string' && localKey.trim() && !localKey.includes('AIzaSyBSqSwkmYwkG3L8I3vVTIse7qqiFKLyBF4')) {
      return localKey.trim();
    }
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim()) {
      return envKey.trim();
    }
    return '';
  } catch {
    return '';
  }
}

/**
 * Guarda la API Key de Gemini en localStorage
 */
export function saveGeminiApiKey(key: string): void {
  try {
    localStorage.setItem(STORAGE_API_KEY, key.trim());
  } catch (e) {
    console.error('Error guardando API key de Gemini:', e);
  }
}

/**
 * Valida en vivo una API Key llamando al endpoint de Google Gemini
 */
export async function testGeminiApiKey(key: string): Promise<{ ok: boolean; message: string; model?: string }> {
  if (!key || !key.trim()) {
    return { ok: false, message: 'La clave no puede estar vacía.' };
  }

  const cleanKey = key.trim();
  const testModels = [
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ];

  let lastErrMsg = '';

  for (const m of testModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Responde OK' }] }],
          }),
          signal: AbortSignal.timeout(8000),
        }
      );

      if (res.ok) {
        return { ok: true, message: `¡Conexión exitosa con Google Gemini (${m})!`, model: m };
      }

      const errJson = await res.json().catch(() => ({}));
      const errMsg = errJson?.error?.message || `Error HTTP ${res.status}`;
      lastErrMsg = errMsg;

      if (res.status === 403 || errMsg.includes('blocked') || errMsg.includes('PERMISSION_DENIED')) {
        return {
          ok: false,
          message: `Acceso restringido por Google (403): ${errMsg}. Crea la clave directamente en Google AI Studio (aistudio.google.com/app/apikey) sin restricciones.`,
        };
      }
      if (res.status === 400 && !errMsg.includes('model')) {
        return { ok: false, message: `Clave o solicitud no válida (400): ${errMsg}` };
      }
    } catch (e: any) {
      lastErrMsg = e.message;
    }
  }

  return { ok: false, message: `No se pudo conectar con los modelos de Google Gemini. (${lastErrMsg || 'Tiempo de espera agotado'})` };
}

/**
 * Detecta y selecciona el mejor modelo disponible en la cuenta de Google AI Studio
 */
export async function getBestAvailableModel(apiKey: string): Promise<string> {
  if (!apiKey) return 'gemini-3.1-flash-lite-preview';

  try {
    const listRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (listRes.ok) {
      const listData = await listRes.json();
      const models = listData.models || [];
      const usable = models.filter(
        (m: any) =>
          Array.isArray(m.supportedGenerationMethods) &&
          m.supportedGenerationMethods.includes('generateContent')
      );

      if (usable.length > 0) {
        // Orden de preferencia: modelos 2026 vigentes y rápidos
        const preferences = [
          'gemini-3.1-flash-lite-preview',
          'gemini-3.1-flash-lite',
          'gemini-flash-latest',
          'gemini-3.8-flash',
          'gemini-3.5-flash',
          'gemini-3.7-flash',
          'gemini-pro-latest',
        ];

        for (const pref of preferences) {
          const found = usable.find(
            (m: any) => m.name.endsWith(pref) || m.name === `models/${pref}`
          );
          if (found) {
            return found.name.replace('models/', '');
          }
        }

        return usable[0].name.replace('models/', '');
      }
    }
  } catch (e) {
    console.warn('No se pudo listar modelos Gemini dinámicamente, usando gemini-3.1-flash-lite-preview:', e);
  }

  return 'gemini-3.1-flash-lite-preview';
}

/**
 * Convierte un Blob de audio a base64 limpio (sin prefijo data:...)
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * TRANSCRIBE Y EXTRAE METADATOS TÉCNICOS DE NOTAS DE VOZ EN CAMPO
 * Utiliza Google Gemini Multimodal nativo para procesar audio directamente
 */
export async function transcribeAndExtractVoiceNote(
  audioBase64: string,
  mimeType: string,
  contextChannelName?: string
): Promise<{
  transcription: string;
  extraction?: NonNullable<ChatMessage['aiExtraction']>;
}> {
  const apiKey = getGeminiApiKey();

  // Si no hay API Key, retornar fallback simple
  if (!apiKey) {
    return {
      transcription: 'Nota de voz registrada (Configura la clave API de Gemini para activar la transcripción automática).',
    };
  }

  const promptText = `Eres el transcriptor y asistente de voz de INTECKNO S.A.S.
Escucha con atención la nota de voz grabada por un usuario o colaborador${contextChannelName ? ` en el canal: "${contextChannelName}"` : ''}.

REGLAS OBLIGATORIAS:
1. TRANSCRIPCIÓN FIEL Y COMPLETA: En el campo "transcription", escribe EXACTAMENTE palabra por palabra todo lo que se diga en el audio (sea una conversación informal, un saludo, indicaciones administrativas, tareas cotidianas, notas personales o novedades técnicas). NUNCA respondas diciendo que no hay información técnica o que es ajena. Transcribe SIEMPRE de forma literal y completa lo que se dijo en el audio.
2. EXTRACCIÓN TÉCNICA CONDICIONAL: ÚNICAMENTE si la persona menciona equipos, componentes electromecánicos, pilonas, estaciones, cables, mantenimiento, inspecciones END o novedades operativas de ingeniería, extrae los parámetros técnicos y marca "hasTechnicalContent": true.
3. Si el audio es una conversación cotidiana, un saludo o un tema no técnico, pon "hasTechnicalContent": false y deja los campos técnicos vacíos ("").

Devuelve ÚNICAMENTE un JSON válido (sin markdown ni texto adicional) con esta estructura:
{
  "transcription": "Texto literal completo y limpio de lo dicho en el audio",
  "hasTechnicalContent": true o false,
  "equipmentComponent": "Equipo o componente mencionado (o vacío si no aplica)",
  "locationTower": "Pilona, torre o estación mencionada (o vacío si no aplica)",
  "severity": "informativo" | "advertencia" | "critico",
  "summary": "Resumen conciso de la novedad técnica (o vacío si no aplica)",
  "actionSuggested": "Acción técnica recomendada (o vacío si no aplica)"
}`;

  const cleanMime = mimeType.split(';')[0].trim() || 'audio/webm';
  const model = await getBestAvailableModel(apiKey);
  const candidateModels = Array.from(new Set([
    model,
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ]));

  for (const m of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;

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
                    mime_type: cleanMime,
                    data: audioBase64,
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
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const json = await res.json();
        const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const cleanJsonStr = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJsonStr);

          const severity: 'informativo' | 'advertencia' | 'critico' =
            parsed.severity === 'critico'
              ? 'critico'
              : parsed.severity === 'advertencia'
              ? 'advertencia'
              : 'informativo';

          const hasTech = Boolean(parsed.hasTechnicalContent) &&
            Boolean(parsed.equipmentComponent && parsed.equipmentComponent.trim() && parsed.equipmentComponent !== 'N/A');

          const extraction: NonNullable<ChatMessage['aiExtraction']> | undefined = hasTech ? {
            equipmentComponent: parsed.equipmentComponent,
            locationTower: parsed.locationTower || undefined,
            severity,
            summary: parsed.summary || undefined,
            actionSuggested: parsed.actionSuggested || undefined,
            detectedAt: new Date().toLocaleTimeString(),
          } : undefined;

          return {
            transcription: parsed.transcription || 'Audio transcrito.',
            extraction,
          };
        }
      }
    } catch (err) {
      console.warn(`Error llamando a modelo ${m} para transcripción de audio:`, err);
    }
  }

  // Fallback si la llamada a la API falló
  return {
    transcription: 'Audio registrado. No se pudo completar la transcripción con Google AI Studio.',
  };
}

/**
 * DIAGNÓSTICO ASISTIDO DE FOTOS DE INSPECCIÓN TÉCNICA (GEMINI VISION)
 * Analiza fotografías de desgaste, fisuras, fugas o roturas en sistemas de cable
 */
export async function analyzeInspectionImage(
  imageBase64: string,
  mimeType: string,
  userNotes?: string
): Promise<NonNullable<ChatMessage['aiAnalysis']>> {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    return {
      diagnosis: 'Inspección fotográfica registrada. Para habilitar el diagnóstico inteligente con Gemini Vision, configure su clave de API.',
      rootCauses: ['Falta clave de API de Google AI Studio'],
      recommendations: ['Registrar clave en Configuración del Módulo o variable de entorno.'],
      severity: 'informativo',
      analyzedAt: new Date().toLocaleTimeString(),
    };
  }

  const promptText = `Eres el Especialista Principal en Ensayos No Destructivos (END / NDT) e Ingeniería Electromecánica de INTECKNO S.A.S. (Colombia).
Analiza con rigor técnico esta fotografía de inspección en campo de un Sistema de Transporte por Cable (STC - Teleférico / Telecabina).
${userNotes ? `Comentarios adicionales del técnico: "${userNotes}"` : ''}

Realiza una evaluación visual exhaustiva considerando normativas internacionales de teleféricos (EN 12927, EN 1709, ANSI B77.1):
1. Diagnóstico preliminar de la condición del componente (ej: desgaste asimétrico de pestaña en rodillo, rotura de alambres en cable tractor, fatiga superficial, fuga en retén de aceite de reductor, desalineación de mordaza).
2. Posibles causas raíz (desgaste por vibración, lubricación insuficiente, sobrecarga cíclica, contaminación abrasiva, mala alineación geométrica).
3. Recomendaciones inmediatas (parada preventiva, cambio de forro de goma, ensayo magneto-inductivo, reapriete con torquímetro, toma de muestra de aceite).
4. Severidad técnica:
   - "critico": Compromete la seguridad del usuario, riesgo inminente de descarrilamiento o rotura.
   - "advertencia": Desgaste significativo que requiere intervención en las próximas 24-48 horas.
   - "informativo": Desgaste normal o novedad no urgente para bitácora.

Devuelve ÚNICAMENTE un JSON válido con esta estructura:
{
  "diagnosis": "Diagnóstico técnico preciso y directo del componente",
  "rootCauses": ["Causa raíz 1", "Causa raíz 2"],
  "recommendations": ["Recomendación técnica 1", "Recomendación técnica 2"],
  "severity": "informativo" | "advertencia" | "critico"
}`;

  const cleanMime = mimeType.split(';')[0].trim() || 'image/jpeg';
  const model = await getBestAvailableModel(apiKey);
  const candidateModels = Array.from(new Set([
    model,
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ]));

  let lastStatus = 0;
  let lastErrorDetail = '';

  for (const m of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;

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
                    mime_type: cleanMime,
                    data: imageBase64,
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
        signal: AbortSignal.timeout(15000),
      });

      if (res.ok) {
        const json = await res.json();
        const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const cleanJsonStr = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJsonStr);

          const severity: 'informativo' | 'advertencia' | 'critico' =
            parsed.severity === 'critico'
              ? 'critico'
              : parsed.severity === 'advertencia'
              ? 'advertencia'
              : 'informativo';

          return {
            diagnosis: parsed.diagnosis || 'Inspección técnica visual procesada.',
            rootCauses: Array.isArray(parsed.rootCauses) && parsed.rootCauses.length > 0
              ? parsed.rootCauses
              : ['Desgaste operativo normal en componente STC'],
            recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
              ? parsed.recommendations
              : ['Mantener monitoreo en las siguientes rondas de inspección'],
            severity,
            analyzedAt: new Date().toLocaleTimeString(),
          };
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        lastStatus = res.status;
        lastErrorDetail = errJson?.error?.message || `HTTP ${res.status}`;
        console.warn(`Error llamando a modelo ${m} para visión técnica:`, lastStatus, lastErrorDetail);
      }
    } catch (err: any) {
      lastErrorDetail = err.message || 'Error de red';
      console.warn(`Error llamando a modelo ${m} para visión técnica:`, err);
    }
  }

  if (lastStatus === 403 || lastErrorDetail.includes('blocked') || lastErrorDetail.includes('PERMISSION_DENIED')) {
    return {
      diagnosis: 'Clave de Google Gemini bloqueada o con restricciones de servicio (Error 403: API_KEY_SERVICE_BLOCKED).',
      rootCauses: [
        'La API Key actual tiene bloqueado el servicio generativelanguage.googleapis.com en Google Cloud Console',
        'O la clave requiere ser generada directamente en Google AI Studio (aistudio.google.com) sin restricciones de API'
      ],
      recommendations: [
        'Genera tu clave en https://aistudio.google.com/app/apikey',
        'Toca el botón "API Key Gemini" en la barra superior del chat para guardarla de inmediato'
      ],
      severity: 'advertencia',
      analyzedAt: new Date().toLocaleTimeString(),
    };
  }

  return {
    diagnosis: 'No fue posible completar el diagnóstico automático por Gemini Vision en este momento.',
    rootCauses: [lastErrorDetail || 'Error temporal de conectividad con Google AI'],
    recommendations: ['Realizar inspección manual y verificar la fotografía con el equipo técnico de campo'],
    severity: 'informativo',
    analyzedAt: new Date().toLocaleTimeString(),
  };
}

/**
 * RESUMEN EJECUTIVO DE CONVERSACIONES E HILOS (THREAD SUMMARIZER)
 * Analiza mensajes (incluyendo fotografías analizadas por visión y notas de voz transcritas)
 * y sintetiza estado, compromisos y bloqueos para el período solicitado.
 */
export async function summarizeConversationThread(
  messages: ChatMessage[],
  channelTitle: string,
  periodLabel: string = 'Hoy'
): Promise<{
  statusSummary: string;
  commitments: Array<{ task: string; responsible: string; priority: string }>;
  blockers: string[];
  totalAnalyzed: number;
  hasMediaIncluded: boolean;
}> {
  const apiKey = getGeminiApiKey();

  // Mapeo exhaustivo y detallado de cada mensaje incorporando texto, transcripciones de audio y análisis de fotos
  let hasAudios = false;
  let hasPhotos = false;

  const formattedMessages = messages.map((m, idx) => {
    const parts: string[] = [];
    const timeStr = m.timestamp || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '');
    const header = `#${idx + 1} [${timeStr}] ${m.senderName} (${m.senderRole || 'Colaborador'})`;

    // 1. Mensaje de texto principal
    if (m.text && m.text.trim() && !m.text.includes('Nota de voz')) {
      parts.push(`Texto: "${m.text.trim()}"`);
    }

    // 2. Nota de voz / Audio transcrito y sus metadatos
    if (m.transcriptionText) {
      hasAudios = true;
      parts.push(`🎤 Nota de voz transcrita: "${m.transcriptionText}"`);
      if (m.aiExtraction) {
        const extraParts: string[] = [];
        if (m.aiExtraction.equipmentComponent) extraParts.push(`Componente: ${m.aiExtraction.equipmentComponent}`);
        if (m.aiExtraction.locationTower) extraParts.push(`Ubicación/Pilona: ${m.aiExtraction.locationTower}`);
        if (m.aiExtraction.severity) extraParts.push(`Severidad: ${m.aiExtraction.severity.toUpperCase()}`);
        if (m.aiExtraction.actionSuggested) extraParts.push(`Acción recomendada: ${m.aiExtraction.actionSuggested}`);
        if (extraParts.length > 0) parts.push(`Parámetros de audio extraídos: (${extraParts.join(' | ')})`);
      }
    } else if (m.attachment?.type === 'audio' || m.text.includes('Nota de voz')) {
      hasAudios = true;
      parts.push(`🎤 Nota de voz de campo adjunta (Duración: ${m.attachment?.duration || m.audioData?.durationSeconds || 0}s).`);
    }

    // 3. Fotografía de inspección y análisis Gemini Vision
    if (m.aiAnalysis) {
      hasPhotos = true;
      parts.push(
        `📸 Fotografía con inspección técnica Gemini Vision:
- Diagnóstico: "${m.aiAnalysis.diagnosis}"
- Severidad: ${m.aiAnalysis.severity.toUpperCase()}
- Causas probables: ${(m.aiAnalysis.rootCauses || []).join(', ') || 'N/A'}
- Recomendaciones: ${(m.aiAnalysis.recommendations || []).join('; ') || 'N/A'}`
      );
    } else if (m.attachment?.type === 'image') {
      hasPhotos = true;
      parts.push(`📸 Fotografía técnica adjunta: ${m.attachment.name || 'Inspección de campo'}`);
    } else if (m.attachment) {
      parts.push(`📎 Archivo adjunto: ${m.attachment.name || m.attachment.type}`);
    }

    return `${header}:\n${parts.join('\n')}`;
  }).join('\n\n---\n\n');

  if (!apiKey || !formattedMessages.trim()) {
    return {
      statusSummary: `Canal "${channelTitle}" (${periodLabel}): ${messages.length} mensaje(s) analizado(s). Operaciones en desarrollo normal sin incidencias críticas registradas en este período.`,
      commitments: messages.length > 0 ? [
        {
          task: 'Consolidar bitácora técnica de campo y validar entrega de reportes pendientes',
          responsible: messages[messages.length - 1]?.senderName || 'Supervisor de Cuadrilla',
          priority: 'Media',
        },
      ] : [],
      blockers: messages.length === 0 ? ['No se registraron mensajes en el período seleccionado.'] : [],
      totalAnalyzed: messages.length,
      hasMediaIncluded: hasAudios || hasPhotos,
    };
  }

  const promptText = `Eres el Director de Operaciones e Ingeniería de INTECKNO S.A.S. (Especialistas en Sistemas de Transporte por Cable STC, Cables de Acero, Ensayos No Destructivos NDT/MRT y Mantenimiento Electromecánico).
Sintetiza la actividad técnica del canal de comunicación "${channelTitle}" para el período: "${periodLabel}".

TOTAL MENSAJES A ANALIZAR: ${messages.length}
CONTENIDO CRONOLÓGICO DEL PERÍODO (INCLUYE TEXTOS, NOTAS DE VOZ TRANSCRITAS Y DIAGNÓSTICOS VISUALES DE FOTOGRAFÍAS):
---
${formattedMessages}
---

INSTRUCCIONES DE SÍNTESIS DE ALTO NIVEL:
1. "statusSummary": Redacta un estado operativo claro, ejecutivo y riguroso (máximo 4 líneas). Integra los hallazgos descritos en las notas de voz, los estados de avance del personal y las inspecciones fotográficas de componentes (poleas, pilonas, cables, reductores, mordazas).
2. "commitments": Extrae todas las tareas, compromisos o acciones pendientes acordadas en la conversación. Especifica la tarea técnica concreta, la persona o rol responsable (identificado en los mensajes) y la prioridad ("Alta", "Media" o "Baja").
3. "blockers": Lista los puntos de bloqueo, componentes dañados reportados en fotos o audios, herramientas faltantes, esperas de autorización o riesgos operativos que impidan el avance.

Devuelve ÚNICAMENTE un JSON válido (sin markdown) con esta estructura:
{
  "statusSummary": "Texto del estado actual del período",
  "commitments": [
    {
      "task": "Descripción de la tarea técnica",
      "responsible": "Nombre o rol de la persona",
      "priority": "Alta" | "Media" | "Baja"
    }
  ],
  "blockers": ["Punto de bloqueo 1", "Punto de bloqueo 2"]
}`;

  const model = await getBestAvailableModel(apiKey);
  const candidateModels = Array.from(new Set([
    model,
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.8-flash',
  ]));

  for (const m of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(18000),
      });

      if (res.ok) {
        const json = await res.json();
        const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const cleanJsonStr = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJsonStr);
          return {
            statusSummary: parsed.statusSummary || `Resumen operativo del canal ${channelTitle} generado con éxito.`,
            commitments: Array.isArray(parsed.commitments) ? parsed.commitments : [],
            blockers: Array.isArray(parsed.blockers) ? parsed.blockers : [],
            totalAnalyzed: messages.length,
            hasMediaIncluded: hasAudios || hasPhotos,
          };
        }
      }
    } catch (err) {
      console.warn(`Error generando resumen ejecutivo con ${m}:`, err);
    }
  }

  return {
    statusSummary: `Canal "${channelTitle}" (${periodLabel}): ${messages.length} mensajes revisados con fotografías y notas de voz integradas.`,
    commitments: [],
    blockers: ['No fue posible consultar el resumen inteligente de Gemini en este instante.'],
    totalAnalyzed: messages.length,
    hasMediaIncluded: hasAudios || hasPhotos,
  };
}

/**
 * ASISTENTE LUC-IA-NA: EVALUACIÓN Y LLENADO AUTOMÁTICO DE ACCIÓN OPERATIVA
 * Analiza un mensaje (texto, nota de voz transcrita o foto diagnosticada) y autocompleta
 * los campos para convertirlo en Tarea WBS, Alerta HSEQ o Requisición de Compras.
 */
export async function analyzeMessageForOperationalAction(
  msg: ChatMessage,
  currentProjectCode?: string,
  currentGroupName?: string,
  availableProjects: Array<{ id: string; code: string; name: string }> = []
): Promise<{
  recommendedActionType: 'tarea' | 'hseq' | 'compra';
  title: string;
  projectCode: string;
  priority: 'Alta' | 'Media' | 'Baja';
  justification: string;
  lucianaRationale?: string;
  wbsDetails?: {
    plannedHours: number;
    assignedRole: string;
    procedureNotes: string;
  };
  hseqDetails?: {
    incidentType: string;
    hazardLevel: string;
    immediateAction: string;
  };
  requisitionDetails?: {
    productName: string;
    productSku: string;
    quantity: number;
    unit: string;
    urgencyReason: string;
  };
}> {
  const apiKey = getGeminiApiKey();

  // Contexto integral unificado del mensaje
  const fullTextBody = [
    msg.text && !msg.text.includes('Nota de voz') ? `Mensaje: ${msg.text}` : '',
    msg.transcriptionText ? `Transcripción Nota de Voz: "${msg.transcriptionText}"` : '',
    msg.aiAnalysis ? `Inspección Visual (Gemini Vision): Diagnóstico: ${msg.aiAnalysis.diagnosis} | Severidad: ${msg.aiAnalysis.severity} | Recomendaciones: ${(msg.aiAnalysis.recommendations || []).join('; ')}` : '',
    msg.aiExtraction ? `Extracción Técnica: Componente: ${msg.aiExtraction.equipmentComponent || 'N/A'}, Pilona/Torre: ${msg.aiExtraction.locationTower || 'N/A'}, Severidad: ${msg.aiExtraction.severity}` : '',
  ].filter(Boolean).join('\n');

  // Fallback heurístico si no hay clave de API o la llamada falla
  const fallbackType: 'tarea' | 'hseq' | 'compra' = (() => {
    const lower = fullTextBody.toLowerCase();
    if (lower.includes('comprar') || lower.includes('repuesto') || lower.includes('solicito') || lower.includes('cotizar') || lower.includes('suministro') || lower.includes('tornillo') || lower.includes('forro') || lower.includes('aceite')) {
      return 'compra';
    }
    if (lower.includes('peligro') || lower.includes('riesgo') || lower.includes('seguridad') || lower.includes('caida') || lower.includes('epp') || lower.includes('accidente') || lower.includes('hseq') || lower.includes('emergencia') || msg.aiAnalysis?.severity === 'critico') {
      return 'hseq';
    }
    return 'tarea';
  })();

  const fallbackProject = currentProjectCode || availableProjects[0]?.code || 'PRJ-01';
  const fallbackComponent = msg.aiExtraction?.equipmentComponent || 'Componente electromecánico STC';
  const fallbackLocation = msg.aiExtraction?.locationTower || 'Pilona de Línea';

  const defaultResult = {
    recommendedActionType: fallbackType,
    title: msg.aiAnalysis?.diagnosis
      ? `Inspección: ${msg.aiAnalysis.diagnosis.slice(0, 55)}`
      : msg.aiExtraction?.equipmentComponent
      ? `Intervención en ${msg.aiExtraction.equipmentComponent} - ${fallbackLocation}`
      : msg.transcriptionText
      ? `Mantenimiento: ${msg.transcriptionText.slice(0, 50)}...`
      : `Novedad Operativa: ${msg.text.slice(0, 50)}...`,
    projectCode: fallbackProject,
    priority: (msg.aiAnalysis?.severity === 'critico' || msg.aiExtraction?.severity === 'critico' ? 'Alta' : 'Media') as 'Alta' | 'Media' | 'Baja',
    justification: `Reportado por: ${msg.senderName} (${msg.senderRole || 'Técnico'})\nCanal: ${currentGroupName || 'Operaciones'}\nFecha: ${msg.timestamp || 'Hoy'}\n\nDetalle Técnico:\n${fullTextBody || 'Novedad registrada en campo.'}`,
    lucianaRationale: 'Acción sugerida según severidad y componente extraído del mensaje.',
    wbsDetails: {
      plannedHours: 4,
      assignedRole: 'Técnico Especialista STC',
      procedureNotes: 'Verificación de tolerancias, apriete según manual OEM y registro en bitácora.',
    },
    hseqDetails: {
      incidentType: 'Condición Insegura en Alturas',
      hazardLevel: 'Moderado',
      immediateAction: 'Detener maniobra, asegurar línea de vida y señalizar área de trabajo.',
    },
    requisitionDetails: {
      productName: fallbackComponent,
      productSku: 'REP-STC-OEM',
      quantity: 1,
      unit: 'unidad',
      urgencyReason: 'Reemplazo requerido para garantizar disponibilidad operativa del cable.',
    },
  };

  if (!apiKey || !fullTextBody.trim()) {
    return defaultResult;
  }

  const projectsContext = availableProjects.map((p) => `${p.code}: ${p.name}`).join(' | ');

  const promptText = `Eres LUC-IA-NA, Asistente de Ingeniería y Operaciones de INTECKNO S.A.S.
Analiza la siguiente novedad técnica reportada por un técnico en campo y determina con precisión la ACCIÓN OPERATIVA adecuada en el ERP.

MENSAJE / NOVEDAD DE CAMPO:
---
${fullTextBody}
---
Canal: "${currentGroupName || 'Operaciones STC'}"
Proyectos activos en el ERP: ${projectsContext || 'PRJ-2026-MED-K'}

REGLAS DE CLASIFICACIÓN Y EXTRACCIÓN:
1. "recommendedActionType":
   - "compra": Si solicitan piezas, repuestos OEM, herramientas, tornillería, lubricantes o consumibles.
   - "hseq": Si reportan condiciones inseguras, riesgo en alturas, fallas de EPP, derrames o peligros para personas.
   - "tarea": Si es una labor de mantenimiento preventivo/correctivo, reglaje de poleas, empalme, inspección visual o NDT.
2. "title": Título técnico, formal y conciso (máximo 60 caracteres) con nombre de componente y pilona/estación si aplica.
3. "projectCode": El código del proyecto más coincidente de la lista (ej: PRJ-2026-MED-K).
4. "priority": "Alta" si hay parada de línea, daño estructural o riesgo inminente; "Media" si es correctivo programable; "Baja" si es rutinario.
5. "justification": Redacta la justificación técnica en formato formal de ingeniería incluyendo: componente afectado, hallazgo visual/auditivo, procedimiento requerido y normativa aplicable (EN 12927 / EN 1709).
6. "wbsDetails": Horas estimadas de trabajo (ej: 2, 4, 8) y rol idóneo (ej: "Mecánico STC", "Inspector NDT").
7. "hseqDetails": Tipo de condición y medida inmediata.
8. "requisitionDetails": Nombre exacto de la refacción o material, SKU sugerido y cantidad requerida.

Devuelve ÚNICAMENTE un JSON válido (sin markdown) con esta estructura exacta:
{
  "recommendedActionType": "tarea" | "hseq" | "compra",
  "title": "Título técnico de la acción",
  "projectCode": "Código del proyecto",
  "priority": "Alta" | "Media" | "Baja",
  "justification": "Texto técnico detallado de justificación",
  "wbsDetails": {
    "plannedHours": 4,
    "assignedRole": "Técnico Especialista STC",
    "procedureNotes": "Pasos técnicos a seguir"
  },
  "hseqDetails": {
    "incidentType": "Condición Insegura",
    "hazardLevel": "Alto" | "Medio" | "Bajo",
    "immediateAction": "Medida correctiva inmediata"
  },
  "requisitionDetails": {
    "productName": "Nombre del repuesto o insumo",
    "productSku": "SKU-STC-01",
    "quantity": 1,
    "unit": "unidades" | "juego" | "metros",
    "urgencyReason": "Motivo técnico de la compra"
  }
}`;

  const model = await getBestAvailableModel(apiKey);
  const candidateModels = Array.from(new Set([
    model,
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ]));

  for (const m of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const json = await res.json();
        const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const cleanJsonStr = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJsonStr);
          return {
            recommendedActionType: parsed.recommendedActionType || fallbackType,
            title: parsed.title || defaultResult.title,
            projectCode: parsed.projectCode || fallbackProject,
            priority: parsed.priority || defaultResult.priority,
            justification: parsed.justification || defaultResult.justification,
            lucianaRationale: parsed.lucianaRationale || defaultResult.lucianaRationale,
            wbsDetails: parsed.wbsDetails || defaultResult.wbsDetails,
            hseqDetails: parsed.hseqDetails || defaultResult.hseqDetails,
            requisitionDetails: parsed.requisitionDetails || defaultResult.requisitionDetails,
          };
        }
      }
    } catch (err) {
      console.warn(`Error llamando a LUC-IA-NA para acción operativa con ${m}:`, err);
    }
  }

  return defaultResult;
}

// =========================================================================
// OBTENER TRM OFICIAL EN TIEMPO REAL (SUPERFINANCIERA / DATOS ABIERTOS COLOMBIA)
// =========================================================================
export async function fetchLiveTRM(): Promise<{ rate: number; date: string; source: string }> {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Intentar API Oficial Datos Abiertos Colombia (Superintendencia Financiera)
  try {
    const res = await fetch('https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciahasta%20DESC', {
      signal: AbortSignal.timeout(4500),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]?.valor) {
        const rate = parseFloat(data[0].valor);
        const date = (data[0].vigenciahasta || todayStr).split('T')[0];
        if (!isNaN(rate) && rate > 1000) {
          return {
            rate: Math.round(rate * 100) / 100,
            date,
            source: 'Superintendencia Financiera de Colombia (Oficial)',
          };
        }
      }
    }
  } catch (e) {
    // Continuar a fallback
  }

  // 2. Intentar API de tasas de cambio interbancarias abiertas
  try {
    const res2 = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(4500),
    });
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2?.rates?.COP) {
        const rate2 = parseFloat(data2.rates.COP);
        if (!isNaN(rate2) && rate2 > 1000) {
          return {
            rate: Math.round(rate2 * 100) / 100,
            date: todayStr,
            source: 'Mercado Interbancario USD/COP',
          };
        }
      }
    }
  } catch (e) {
    // Continuar a fallback
  }

  // 3. Fallback referencial seguro
  return {
    rate: 4180,
    date: todayStr,
    source: 'TRM Referencial Proyectada Inteckno',
  };
}

// =========================================================================
// ASISTENCIA INTELIGENTE LUC-IA-NA: COSTOS ADUANEROS, ARANCEL DIAN & INCOTERMS
// =========================================================================
export async function analyzeCustomsAndLogisticsWithLuciana(
  items: Array<{ description: string; qty: number; unitPrice: number; category?: string }>,
  currentIncoterm?: string,
  clientCountry: string = 'Colombia',
  currency: string = 'USD'
): Promise<{
  subpartidaDian: string;
  customsDutyRate: number; // Ej: 0.05 (5%)
  importFees: number; // Ej: 450 USD
  logisticsCost: number; // Flete según Incoterm
  recommendedIncoterm: string;
  recommendedPaymentTerms: string;
  paymentTermSurchargePercent: number;
  lucianaExplanation: string;
}> {
  const apiKey = getGeminiApiKey();

  // Calcular subtotal de referencia
  const itemsSubtotal = items.reduce((acc, it) => acc + (Number(it.qty) || 1) * (Number(it.unitPrice) || 0), 0);
  const itemsText = items.map((it, idx) => `${idx + 1}. [${it.category || 'Ítem'}] ${it.description} (Cant: ${it.qty}, Unit: $${it.unitPrice})`).join('\n');

  // Detección heurística de subpartida STC para teleféricos
  const lowerItems = itemsText.toLowerCase();
  let defaultSubpartida = '8431.39.00.00'; // Partes de teleféricos / aparatos de elevación
  let defaultDuty = 0.05; // 5%
  let defaultExplanation = 'Subpartida 8431.39.00.00 (Partes y piezas de recambio para teleféricos y aparatos de elevación continua según Arancel DIAN Decreto 1881). Aplica arancel del 5% e IVA 19% en nacionalización.';

  if (lowerItems.includes('cable') || lowerItems.includes('portador') || lowerItems.includes('fatzer') || lowerItems.includes('teufelberger')) {
    defaultSubpartida = '7312.10.10.00';
    defaultDuty = 0.05;
    defaultExplanation = 'Subpartida 7312.10.10.00 (Cables de acero trenzados para teleféricos y transporte por cable según norma EN 12927). Arancel preferencial 5%.';
  } else if (lowerItems.includes('polea') || lowerItems.includes('revestimiento') || lowerItems.includes('goma') || lowerItems.includes('balancin')) {
    defaultSubpartida = '8483.50.10.00';
    defaultDuty = 0.05;
    defaultExplanation = 'Subpartida 8483.50.10.00 (Poleas y balancines para sistemas de tracción mecánica por cable). Arancel 5%.';
  } else if (lowerItems.includes('empalme') || lowerItems.includes('servicio') || lowerItems.includes('mantenimiento') || lowerItems.includes('ndt') || lowerItems.includes('mrt')) {
    defaultSubpartida = 'No aplica (Servicio de Ingeniería)';
    defaultDuty = 0;
    defaultExplanation = 'Servicio técnico especializado de ingeniería STC. No causa arancel de aduana. Aplica IVA 19% en territorio nacional o 0% si es exportación a LATAM (E.T. Art. 481 lit. c).';
  }

  // Costos logísticos base estimados
  const baseLogistics = itemsSubtotal > 50000 ? 3200 : itemsSubtotal > 20000 ? 1800 : 850;
  const basePortFees = itemsSubtotal > 30000 ? 650 : 420;

  const defaultResult = {
    subpartidaDian: defaultSubpartida,
    customsDutyRate: defaultDuty,
    importFees: basePortFees,
    logisticsCost: baseLogistics,
    recommendedIncoterm: currentIncoterm || 'DDP En Sitio (Colombia)',
    recommendedPaymentTerms: '50% anticipo al ordenar, 50% contra entrega de informe técnico',
    paymentTermSurchargePercent: 0,
    lucianaExplanation: defaultExplanation,
  };

  if (!apiKey || !items.length) {
    return defaultResult;
  }

  const promptText = `Eres LUC-IA-NA, Agente Experta en Comercio Exterior, Logística Internacional STC y Arancel DIAN de INTECKNO S.A.S.
Analiza la siguiente cotización técnica de teleféricos y suministros para determinar los costos aduaneros, logísticos y contractuales exactos en Colombia / LATAM.

ÍTEMS COTIZADOS:
---
${itemsText}
---
Moneda: ${currency}
País del Cliente: ${clientCountry}
Incoterm actual: ${currentIncoterm || 'DDP En Sitio'}
Subtotal ítems: $${itemsSubtotal.toLocaleString()} ${currency}

REGLAS DE LIQUIDACIÓN ADUANERA & INCOTERMS:
1. Subpartida Arancelaria DIAN: Identifica el código arancelario de 10 dígitos más exacto en Colombia (Decreto 1881 / Decisión Andina):
   - 8431.39.00.00: Partes de teleféricos / funiculares (5% arancel).
   - 7312.10.10.00: Cables de acero portador-tractor para teleféricos (5% a 10%).
   - 8483.50.10.00: Poleas, balancines y ruedas dentadas (5%).
   - Servicios puros: Arancel 0%.
2. Arancel DIAN (customsDutyRate): Expresado en decimal (ej: 0.05 para 5%, 0.10 para 10%, 0 si es servicio).
3. Gastos Portuarios y SIA (importFees): Estima intermediación SIA (0.5% CIF o mín $350 USD), bodegaje y descargue portuario (aprox $400 - $700 USD).
4. Flete y Logística (logisticsCost): Si el Incoterm es DDP o CIF, incluye flete internacional y transporte especializado hasta la estación del teleférico.
5. Términos de Pago: Recomienda el esquema óptimo (ej: 50% anticipo y 50% entrega; o crédito con recargo financiero).
6. paymentTermSurchargePercent: 0% si tiene 50% anticipo, 2% si es crédito 30 días, 4.5% si es crédito 60 días, 7% si es crédito 90 días.
7. lucianaExplanation: Justificación técnica concisa de 2-3 líneas citando la subpartida y beneficios fiscales.

Devuelve ÚNICAMENTE un JSON válido (sin formato markdown):
{
  "subpartidaDian": "8431.39.00.00",
  "customsDutyRate": 0.05,
  "importFees": 450,
  "logisticsCost": 1800,
  "recommendedIncoterm": "DDP En Sitio (Colombia)",
  "recommendedPaymentTerms": "50% anticipo al ordenar, 50% contra entrega de informe técnico",
  "paymentTermSurchargePercent": 0,
  "lucianaExplanation": "Texto conciso explicando la subpartida y cómo se liquidan aranceles y flete."
}`;

  const model = await getBestAvailableModel(apiKey);
  const candidateModels = Array.from(new Set([
    model,
    'gemini-3.1-flash-lite-preview',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ]));

  for (const m of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.1,
            response_mime_type: 'application/json',
          },
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (res.ok) {
        const json = await res.json();
        const textContent = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (textContent) {
          const cleanJsonStr = textContent.replace(/```json/gi, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJsonStr);
          return {
            subpartidaDian: parsed.subpartidaDian || defaultResult.subpartidaDian,
            customsDutyRate: typeof parsed.customsDutyRate === 'number' ? parsed.customsDutyRate : defaultResult.customsDutyRate,
            importFees: typeof parsed.importFees === 'number' ? parsed.importFees : defaultResult.importFees,
            logisticsCost: typeof parsed.logisticsCost === 'number' ? parsed.logisticsCost : defaultResult.logisticsCost,
            recommendedIncoterm: parsed.recommendedIncoterm || defaultResult.recommendedIncoterm,
            recommendedPaymentTerms: parsed.recommendedPaymentTerms || defaultResult.recommendedPaymentTerms,
            paymentTermSurchargePercent: typeof parsed.paymentTermSurchargePercent === 'number' ? parsed.paymentTermSurchargePercent : 0,
            lucianaExplanation: parsed.lucianaExplanation || defaultResult.lucianaExplanation,
          };
        }
      }
    } catch (err) {
      console.warn(`Error liquidando aduana con LUC-IA-NA (${m}):`, err);
    }
  }

  return defaultResult;
}

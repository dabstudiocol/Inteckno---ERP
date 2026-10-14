import { CalendarEvent, User, Project } from '../../types';
import { getGeminiApiKey, getBestAvailableModel } from './geminiChatService';
import { cleanSpecialChars } from './lucianaService';

export interface ParsedAiCalendarEvent {
  title: string;
  type: CalendarEvent['type'];
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM AM/PM
  endTime: string; // HH:MM AM/PM
  isOvernight?: boolean;
  projectCode?: string;
  projectName?: string;
  location: string;
  attendeeIds: string[];
  attendees: string[];
  meetingMethod: 'presencial' | 'virtual';
  description: string;
  confidenceScore?: number;
}

/**
 * Procesa una instrucción en lenguaje natural o dictado de voz para agendar un evento en Inteckno ERP
 */
export async function parseCalendarEventWithAi(
  userPrompt: string,
  availableUsers: User[],
  availableProjects: Project[],
  referenceDate: string = '2026-10-01'
): Promise<ParsedAiCalendarEvent> {
  const apiKey = getGeminiApiKey();

  const userCatalog = availableUsers.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
  }));

  const projectCatalog = availableProjects.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    location: p.location,
    serviceType: p.serviceType,
  }));

  if (!apiKey) {
    // Fallback heurístico inteligente si no hay API key de Gemini
    return parseHeuristicCalendarEvent(userPrompt, availableUsers, availableProjects, referenceDate);
  }

  const model = await getBestAvailableModel(apiKey);

  const systemInstruction = `Eres el Asistente de Agendamiento Inteligente y Operaciones STC de INTECKNO S.A.S.
Tu misión es interpretar la instrucción del usuario (escrita o dictada por voz) y transformarla en una estructura JSON exacta para la agenda del ERP y Microsoft 365.

FECHA DE REFERENCIA DEL SISTEMA: ${referenceDate} (Año 2026).
- Si dicen "mañana", "el próximo martes", "este viernes", "el 15", calcula la fecha exacta en formato YYYY-MM-DD en base a la fecha de referencia.

CATÁLOGO DE USUARIOS DE LA EMPRESA (mapea los nombres o cargos mencionados a sus IDs exactos):
${JSON.stringify(userCatalog, null, 1)}

CATÁLOGO DE PROYECTOS STC ACTIVOS (asocia el código correspondiente):
${JSON.stringify(projectCatalog, null, 1)}

REGLAS DE INTERPRETACIÓN TÉCNICA:
1. TIPOS DE EVENTOS VÁLIDOS:
   - "parada_tecnica": Paradas programadas, cambio de componentes, mantenimiento nocturno o mayor.
   - "inspeccion_stc": Ensayos no destructivos (END), magneto-inductivo, revisión de cables o balancines.
   - "visita_campo": Salidas a obra, verificación preliminar, levantamiento de información.
   - "entrega_hito": Cobro 48h, actas de recibo con cliente, hitos contractuales.
   - "auditoria_hseq": Seguridad y salud en el trabajo, alturas, certificaciones.
   - "comite_gerencial": Reuniones de coordinación, juntas, seguimiento.

2. VENTANAS OPERATIVAS NOCTURNAS (isOvernight):
   - Si la hora de inicio es en la tarde/noche (ej: 09:00 PM, 10:00 PM, 22:00) y finaliza en la madrugada (ej: 03:00 AM, 04:30 AM), marca "isOvernight": true.

3. MODALIDAD:
   - Si mencionan Teams, reunión virtual, videollamada o coordinación remota, marca "meetingMethod": "virtual". De lo contrario "presencial".

4. FORMATO DE HORAS:
   - Usa formato estándar de 12 horas con dos dígitos: "HH:MM AM" o "HH:MM PM" (ej: "10:00 PM", "03:00 AM", "08:30 AM").

5. CERO ASTERISCOS:
   - Prohibido usar asteriscos (*) en title o description. Texto limpio y profesional.

DEBE DEVOLVER ÚNICAMENTE UN OBJETO JSON VÁLIDO (sin markdown ni comillas extras) con esta forma:
{
  "title": "Título técnico claro y profesional",
  "type": "parada_tecnica" | "inspeccion_stc" | "visita_campo" | "entrega_hito" | "auditoria_hseq" | "comite_gerencial",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM AM/PM",
  "endTime": "HH:MM AM/PM",
  "isOvernight": boolean,
  "projectCode": "código de proyecto o PRJ-2026-MED-K",
  "projectName": "nombre del proyecto",
  "location": "lugar específico (pilona, estación, ciudad)",
  "attendeeIds": ["id1", "id2"],
  "attendees": ["Nombre 1", "Nombre 2"],
  "meetingMethod": "presencial" | "virtual",
  "description": "descripción clara de los objetivos de la intervención",
  "confidenceScore": 95
}`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemInstruction}\n\nINSTRUCCIÓN DEL USUARIO:\n"${userPrompt}"` }],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return parseHeuristicCalendarEvent(userPrompt, availableUsers, availableProjects, referenceDate);
    }

    const data = await res.json();
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let cleaned = rawText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleaned);

    // Mapear nombres de asistentes si solo vinieron IDs
    const matchedAttendees = (parsed.attendeeIds || [])
      .map((id: string) => availableUsers.find((u) => u.id === id)?.name)
      .filter(Boolean);

    return {
      title: cleanSpecialChars(parsed.title || 'Intervención Programada STC'),
      type: parsed.type || 'visita_campo',
      date: parsed.date || referenceDate,
      startTime: parsed.startTime || '08:00 AM',
      endTime: parsed.endTime || '10:00 AM',
      isOvernight: !!parsed.isOvernight,
      projectCode: parsed.projectCode || availableProjects[0]?.code || 'PRJ-2026-MED-K',
      projectName: parsed.projectName || availableProjects[0]?.name,
      location: cleanSpecialChars(parsed.location || 'Sede Inteckno STC'),
      attendeeIds: parsed.attendeeIds?.length ? parsed.attendeeIds : [availableUsers[0]?.id || 'usr-1'],
      attendees: matchedAttendees.length ? matchedAttendees : [availableUsers[0]?.name || 'Carlos Restrepo'],
      meetingMethod: parsed.meetingMethod === 'virtual' ? 'virtual' : 'presencial',
      description: cleanSpecialChars(parsed.description || userPrompt),
      confidenceScore: parsed.confidenceScore || 92,
    };
  } catch (e) {
    console.warn('Error interpretando agenda con Gemini, usando motor heurístico:', e);
    return parseHeuristicCalendarEvent(userPrompt, availableUsers, availableProjects, referenceDate);
  }
}

/**
 * Fallback de procesamiento en lenguaje natural sin conexión externa
 */
function parseHeuristicCalendarEvent(
  userPrompt: string,
  users: User[],
  projects: Project[],
  referenceDate: string
): ParsedAiCalendarEvent {
  const pLower = userPrompt.toLowerCase();

  // Tipo de evento
  let type: CalendarEvent['type'] = 'visita_campo';
  if (pLower.includes('parada') || pLower.includes('nocturn') || pLower.includes('mantenimiento')) {
    type = 'parada_tecnica';
  } else if (pLower.includes('inspeccion') || pLower.includes('end') || pLower.includes('magneto')) {
    type = 'inspeccion_stc';
  } else if (pLower.includes('hito') || pLower.includes('acta') || pLower.includes('cobro')) {
    type = 'entrega_hito';
  } else if (pLower.includes('seguridad') || pLower.includes('hseq') || pLower.includes('altura')) {
    type = 'auditoria_hseq';
  } else if (pLower.includes('comite') || pLower.includes('reunion') || pLower.includes('junta')) {
    type = 'comite_gerencial';
  }

  // Proyecto más probable
  let matchedProject = projects[0];
  for (const prj of projects) {
    if (
      pLower.includes(prj.code.toLowerCase()) ||
      pLower.includes(prj.name.toLowerCase()) ||
      pLower.includes(prj.location?.toLowerCase() || '')
    ) {
      matchedProject = prj;
      break;
    }
  }

  // Detección de participantes
  const matchedUsers = users.filter((u) => {
    const parts = u.name.toLowerCase().split(' ');
    return parts.some((p) => p.length > 2 && pLower.includes(p));
  });

  const attendeeIds = matchedUsers.length > 0 ? matchedUsers.map((u) => u.id) : [users[0].id];
  const attendees = matchedUsers.length > 0 ? matchedUsers.map((u) => u.name) : [users[0].name];

  // Modalidad virtual
  const isVirtual = pLower.includes('teams') || pLower.includes('virtual') || pLower.includes('videollamada');

  // Detección de noche / overnight
  const isNight =
    pLower.includes('pm') ||
    pLower.includes('noche') ||
    pLower.includes('nocturna') ||
    pLower.includes('22:') ||
    pLower.includes('23:');
  const isOvernight = isNight && (pLower.includes('am') || pLower.includes('madrugada') || pLower.includes('3:00'));

  return {
    title: cleanSpecialChars(
      type === 'parada_tecnica'
        ? `Parada Técnica - ${matchedProject.name}`
        : type === 'inspeccion_stc'
        ? `Inspección STC END - ${matchedProject.name}`
        : `Intervención de Campo - ${matchedProject.name}`
    ),
    type,
    date: referenceDate,
    startTime: isNight ? '10:00 PM' : '08:00 AM',
    endTime: isOvernight ? '03:00 AM' : isNight ? '11:00 PM' : '10:00 AM',
    isOvernight,
    projectCode: matchedProject.code,
    projectName: matchedProject.name,
    location: cleanSpecialChars(matchedProject.location ? `Pilonas / Estación ${matchedProject.location}` : 'Sede de Campo'),
    attendeeIds,
    attendees,
    meetingMethod: isVirtual ? 'virtual' : 'presencial',
    description: cleanSpecialChars(userPrompt),
    confidenceScore: 85,
  };
}

import { getGeminiApiKey } from '../../../core/services/aiVisionExpenseService';
import {
  CargoPackage,
  UnitSystem,
  AiPackagingRecommendation,
  AiHsCodeRecommendation,
  ComplianceStandard,
  ContainerType,
  PackagingType,
  FreightMode,
} from '../types';

// Contenedores estándar especificaciones
export const CONTAINER_SPECS: Record<ContainerType, { name: string; maxCBM: number; maxPayloadKg: number; maxLenM: number; maxWidM: number; maxHeiM: number }> = {
  '20ft': { name: 'Contenedor 20ft Standard (Dry Van)', maxCBM: 33.2, maxPayloadKg: 28000, maxLenM: 5.89, maxWidM: 2.35, maxHeiM: 2.39 },
  '40ft': { name: 'Contenedor 40ft Standard (Dry Van)', maxCBM: 67.7, maxPayloadKg: 26600, maxLenM: 12.03, maxWidM: 2.35, maxHeiM: 2.39 },
  '40hc': { name: 'Contenedor 40ft High Cube (HQ)', maxCBM: 76.4, maxPayloadKg: 26400, maxLenM: 12.03, maxWidM: 2.35, maxHeiM: 2.69 },
  'flat_rack': { name: 'Contenedor 40ft Flat Rack (Sobredimensionado STC)', maxCBM: 85.0, maxPayloadKg: 40000, maxLenM: 12.0, maxWidM: 2.4, maxHeiM: 3.5 },
  'open_top': { name: 'Contenedor 40ft Open Top (Carga Superior)', maxCBM: 65.5, maxPayloadKg: 31500, maxLenM: 12.02, maxWidM: 2.35, maxHeiM: 2.35 },
};

/**
 * Convierte medidas a métrico (cm y kg) para cálculos estandarizados
 */
export function normalizeToMetric(pkg: CargoPackage, system: UnitSystem): { lengthCm: number; widthCm: number; heightCm: number; weightKg: number } {
  if (system === 'metric') {
    return {
      lengthCm: pkg.length,
      widthCm: pkg.width,
      heightCm: pkg.height,
      weightKg: pkg.weight,
    };
  }
  // De pulgadas a cm (1 in = 2.54 cm) y de lbs a kg (1 lb = 0.453592 kg)
  return {
    lengthCm: pkg.length * 2.54,
    widthCm: pkg.width * 2.54,
    heightCm: pkg.height * 2.54,
    weightKg: pkg.weight * 0.45359237,
  };
}

/**
 * Calcula volumen CBM, peso volumétrico y peso facturable
 */
export function calculateCargoMetrics(packages: CargoPackage[], system: UnitSystem) {
  let totalCBM = 0;
  let totalGrossWeightKg = 0;
  let totalAirVolumetricKg = 0;
  let maxPackageLengthM = 0;
  let maxPackageHeightM = 0;

  packages.forEach((pkg) => {
    const { lengthCm, widthCm, heightCm, weightKg } = normalizeToMetric(pkg, system);
    const volumePackageCBM = (lengthCm * widthCm * heightCm) / 1_000_000;
    const totalPkgCBM = volumePackageCBM * pkg.quantity;
    const totalPkgGrossKg = weightKg * pkg.quantity;

    // Fórmula IATA Aérea: L(cm) * W(cm) * H(cm) / 6000
    const airVolKg = ((lengthCm * widthCm * heightCm) / 6000) * pkg.quantity;

    totalCBM += totalPkgCBM;
    totalGrossWeightKg += totalPkgGrossKg;
    totalAirVolumetricKg += airVolKg;

    if (lengthCm / 100 > maxPackageLengthM) maxPackageLengthM = lengthCm / 100;
    if (heightCm / 100 > maxPackageHeightM) maxPackageHeightM = heightCm / 100;
  });

  // Marítimo: 1 CBM = 1000 kg (tonelada métrica volumétrica)
  const maritimeVolumetricKg = totalCBM * 1000;
  const chargeableWeightAirKg = Math.max(totalGrossWeightKg, totalAirVolumetricKg);
  const chargeableWeightSeaKg = Math.max(totalGrossWeightKg, maritimeVolumetricKg);

  return {
    totalCBM: Math.round(totalCBM * 100) / 100,
    totalGrossWeightKg: Math.round(totalGrossWeightKg),
    totalAirVolumetricKg: Math.round(totalAirVolumetricKg),
    maritimeVolumetricKg: Math.round(maritimeVolumetricKg),
    chargeableWeightAirKg: Math.round(chargeableWeightAirKg),
    chargeableWeightSeaKg: Math.round(chargeableWeightSeaKg),
    maxPackageLengthM: Math.round(maxPackageLengthM * 10) / 10,
    maxPackageHeightM: Math.round(maxPackageHeightM * 10) / 10,
  };
}

// -------------------------------------------------------------
// 1. RECOMENDADOR INTELIGENTE DE EMBALAJE Y MODALIDAD LOGÍSTICA
// -------------------------------------------------------------
export async function suggestPackagingAndFreight(
  packages: CargoPackage[],
  destinationCountry: string,
  unitSystem: UnitSystem
): Promise<AiPackagingRecommendation> {
  const metrics = calculateCargoMetrics(packages, unitSystem);
  const apiKey = getGeminiApiKey();

  const isOversized = metrics.maxPackageLengthM > 5.8 || metrics.maxPackageHeightM > 2.35;
  const hasMoistureSensitive = packages.some((p) => p.moistureSensitive);
  const hasFragile = packages.some((p) => p.fragile);

  if (apiKey) {
    try {
      const prompt = `Actúa como Director Experto en Logística Internacional y Embalaje Industrial para maquinaria pesada y Sistemas de Transporte por Cable (STC - Teleféricos).
Analiza esta carga:
- Bultos: ${JSON.stringify(packages)}
- Volumen Total: ${metrics.totalCBM} m3
- Peso Bruto: ${metrics.totalGrossWeightKg} kg
- País de Destino: ${destinationCountry}
- Sobredimensionado: ${isOversized ? 'Sí' : 'No'}
- Sensible a corrosión/humedad marítima: ${hasMoistureSensitive ? 'Sí' : 'No'}
- Frágil/Componentes electrónicos o hidráulicos: ${hasFragile ? 'Sí' : 'No'}

Responde ÚNICAMENTE en formato JSON con la siguiente estructura:
{
  "packagingType": "madera_fumigada_nimf15" | "vacio_vci_anticorrosion" | "pallet_reforzado_pesado" | "cuna_metalica_amortiguada" | "huacal_estructural",
  "packagingName": "Nombre legible del embalaje",
  "packagingCostUSD": number_estimado,
  "freightMode": "maritimo_fcl" | "maritimo_lcl" | "aereo_carga" | "aereo_express",
  "freightModeName": "Nombre de modalidad recomendada",
  "containerRecommendation": "20ft" | "40ft" | "40hc" | "flat_rack" | "open_top",
  "rationale": "Explicación técnica de por qué este embalaje y transporte es el más eficiente y seguro",
  "suggestedMeasures": "Recomendaciones específicas (ej: bolsas desecantes, trincaje con eslingas de 5T)"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          const container = CONTAINER_SPECS[parsed.containerRecommendation as ContainerType] || CONTAINER_SPECS['20ft'];
          const volumeFit = Math.min(100, Math.round((metrics.totalCBM / container.maxCBM) * 100));
          const weightFit = Math.min(100, Math.round((metrics.totalGrossWeightKg / container.maxPayloadKg) * 100));

          return {
            packagingType: parsed.packagingType,
            packagingName: parsed.packagingName,
            packagingCostUSD: parsed.packagingCostUSD || (metrics.totalCBM * 120 + 350),
            freightMode: parsed.freightMode,
            freightModeName: parsed.freightModeName,
            containerRecommendation: parsed.containerRecommendation,
            rationale: parsed.rationale,
            cbmTotal: metrics.totalCBM,
            volumetricWeightKg: metrics.totalAirVolumetricKg,
            chargeableWeightKg: metrics.chargeableWeightSeaKg,
            containerOccupancyVolumePct: volumeFit,
            containerOccupancyWeightPct: weightFit,
            suggestedMeasures: parsed.suggestedMeasures,
          };
        }
      }
    } catch (e) {
      console.warn('Fallback a recomendador local de logística STC:', e);
    }
  }

  // Motor de Inferencia Local Experto en Maquinaria STC
  let pkgType: PackagingType = 'madera_fumigada_nimf15';
  let pkgName = 'Caja de Madera Tratada Térmicamente con Sello NIMF 15 / ISPM 15';
  let pkgCost = Math.round(metrics.totalCBM * 140 + 400);
  let rationale = '';
  let freightMode: FreightMode = 'maritimo_fcl';
  let freightName = 'Marítimo FCL (Contenedor Completo Dedicado)';
  let containerType: ContainerType = '20ft';
  let suggestedMeasures = 'Fijación con eslingas de poliéster y tacos de madera antideslizantes.';

  if (hasMoistureSensitive || metrics.totalGrossWeightKg > 1500) {
    pkgType = 'vacio_vci_anticorrosion';
    pkgName = 'Empaque Termosellado al Vacío con Film VCI Anticorrosión + Desecantes';
    pkgCost = Math.round(metrics.totalCBM * 180 + 650);
    rationale = `Debido a la presencia de componentes mecánicos de precisión y riesgo de niebla salina en travesía marítima hacia ${destinationCountry}, se requiere barrera de vapor VCI con desecantes de bentonita.`;
    suggestedMeasures = 'Inclusión de 12 bolsas de arcilla desecante activa por bulto y sellado hermético tricapa.';
  } else if (isOversized) {
    pkgType = 'cuna_metalica_amortiguada';
    pkgName = 'Cuna Estructural de Acero Amortiguada con Puntos de Izaje Certificados';
    pkgCost = Math.round(metrics.totalCBM * 220 + 1200);
    rationale = 'Por exceder el gálibo estándar de un contenedor convencional, la pieza requiere cuna de acero para trincaje sobre plataforma Flat Rack.';
    containerType = 'flat_rack';
    suggestedMeasures = 'Cadenas de trincaje Grado 80 con tensores rachet y topes de seguridad soldados.';
  } else {
    rationale = `Embalaje estándar de exportación con tratamiento fitosanitario NIMF 15 obligatorio para ingreso aduanero a ${destinationCountry}.`;
  }

  // Determinar Modalidad de Transporte
  if (isOversized) {
    freightMode = 'maritimo_fcl';
    containerType = 'flat_rack';
    freightName = 'Marítimo Especial Flat Rack / OOG (Out of Gauge)';
  } else if (metrics.totalCBM > 33.2 || metrics.totalGrossWeightKg > 24000) {
    freightMode = 'maritimo_fcl';
    containerType = metrics.maxPackageHeightM > 2.35 ? '40hc' : '40ft';
    freightName = 'Marítimo FCL 40ft High Cube';
  } else if (metrics.totalCBM > 12) {
    freightMode = 'maritimo_fcl';
    containerType = '20ft';
    freightName = 'Marítimo FCL 20ft Standard';
  } else if (metrics.totalCBM <= 3 && metrics.totalGrossWeightKg < 400) {
    freightMode = 'aereo_carga';
    freightName = 'Carga Aérea Consolidada (Envío Rápido de Repuestos)';
    rationale += ' Al ser una carga de bajo cubicaje y peso reducido, el flete aéreo optimiza tiempos de entrega en parada de teleférico.';
  } else {
    freightMode = 'maritimo_lcl';
    containerType = '20ft';
    freightName = 'Marítimo LCL Consolidado (Grupaje)';
    rationale += ` El volumen de ${metrics.totalCBM} CBM resulta idóneo para carga LCL marítima, pagando únicamente por el espacio ocupado.`;
  }

  const container = CONTAINER_SPECS[containerType];
  const volumeFit = Math.min(100, Math.round((metrics.totalCBM / container.maxCBM) * 100));
  const weightFit = Math.min(100, Math.round((metrics.totalGrossWeightKg / container.maxPayloadKg) * 100));

  return {
    packagingType: pkgType,
    packagingName: pkgName,
    packagingCostUSD: pkgCost,
    freightMode,
    freightModeName: freightName,
    containerRecommendation: containerType,
    rationale,
    cbmTotal: metrics.totalCBM,
    volumetricWeightKg: metrics.totalAirVolumetricKg,
    chargeableWeightKg: metrics.chargeableWeightSeaKg,
    containerOccupancyVolumePct: volumeFit,
    containerOccupancyWeightPct: weightFit,
    suggestedMeasures,
  };
}

// -------------------------------------------------------------
// 2. ASISTENTE INTELIGENTE DE CLASIFICACIÓN ARANCELARIA Y TLC
// -------------------------------------------------------------
export async function classifyHsCodeAndFta(
  description: string,
  destinationCountry: string,
  originCountry: string = 'Colombia'
): Promise<AiHsCodeRecommendation> {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const prompt = `Actúa como Agente de Aduanas y Especialista en Nomenclatura Arancelaria de la Organización Mundial de Aduanas (OMA).
Clasifica este producto para comercio exterior entre ${originCountry} y ${destinationCountry}:
Producto: "${description}"

Determina:
1. Subpartida arancelaria a 6 u 8 dígitos (HS Code).
2. Título de la subpartida oficial.
3. Arancel base de importación general en ${destinationCountry}.
4. Si existe Tratado de Libre Comercio (TLC) o Acuerdo Comercial (ej: TLC Colombia-EE.UU., Alianza del Pacífico, CAN, TLC UE-Colombia, etc.) entre ${originCountry} y ${destinationCountry}.
5. Tasa de arancel preferencial bajo TLC (usualmente 0%).
6. Tipo de Certificado de Origen necesario.
7. Explicación breve del criterio de origen.

Responde ÚNICAMENTE en JSON con esta estructura exacta:
{
  "hsCode": "8431.39.00",
  "nomenclatureTitle": "Partes identificables como destinadas exclusiva o principalmente a aparatos de la partida 84.28 (teleféricos)",
  "generalDutyPct": 10.0,
  "hasFtaAgreement": true,
  "ftaName": "Tratado de Libre Comercio vigente...",
  "preferentialDutyPct": 0.0,
  "certificateOfOriginType": "Certificado de Origen TLC Formato Oficial",
  "rulesOfOriginNotes": "Regla de salto de partida arancelaria o valor de contenido regional (VCR > 40%)",
  "rationale": "Justificación técnica aduanera de por qué clasifica en esta partida"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            hsCode: parsed.hsCode,
            nomenclatureTitle: parsed.nomenclatureTitle,
            generalDutyPct: parsed.generalDutyPct ?? 10.0,
            hasFtaAgreement: parsed.hasFtaAgreement ?? true,
            ftaName: parsed.ftaName ?? `TLC ${originCountry} - ${destinationCountry}`,
            preferentialDutyPct: parsed.preferentialDutyPct ?? 0.0,
            certificateOfOriginType: parsed.certificateOfOriginType ?? 'Certificado de Origen Oficial',
            rulesOfOriginNotes: parsed.rulesOfOriginNotes ?? 'Cumplimiento de origen según desgravación arancelaria.',
            rationale: parsed.rationale ?? 'Clasificación arancelaria validada por sistema.',
          };
        }
      }
    } catch (e) {
      console.warn('Fallback a catálogo arancelario local STC:', e);
    }
  }

  // Motor Local de Clasificación para Teleféricos y Componentes Mecánicos/Eléctricos
  const q = description.toLowerCase();

  if (q.includes('teleferic') || q.includes('funicular') || q.includes('telesilla') || q.includes('cabina') || q.includes('estacion')) {
    return {
      hsCode: '8428.60.00.00',
      nomenclatureTitle: 'Teleféricos (incluidos los telesquís); mecanismos de tracción para funiculares',
      generalDutyPct: 15.0,
      hasFtaAgreement: true,
      ftaName: getFtaName(originCountry, destinationCountry),
      preferentialDutyPct: 0.0,
      certificateOfOriginType: 'Certificado de Origen TLC / Acuerdo de Complementación Económica',
      rulesOfOriginNotes: 'Salto arancelario desde cualquier otra partida fuera del capítulo 84 o VCR mínimo del 35%.',
      rationale: 'Clasificación directa en la partida 84.28 de la OMA para aparatos de elevación y transporte de personas continuo por cable.',
    };
  }

  if (q.includes('mordaza') || q.includes('polea') || q.includes('balancin') || q.includes('pilona') || q.includes('repuesto') || q.includes('pieza')) {
    return {
      hsCode: '8431.39.00.00',
      nomenclatureTitle: 'Partes identificables como destinadas exclusiva o principalmente a aparatos de la partida 84.28',
      generalDutyPct: 10.0,
      hasFtaAgreement: true,
      ftaName: getFtaName(originCountry, destinationCountry),
      preferentialDutyPct: 0.0,
      certificateOfOriginType: 'Certificado de Origen con Declaración Juramentada de Productor',
      rulesOfOriginNotes: 'Cambio de subpartida (CTSH) o valor de contenido regional aplicable al ensamble en planta.',
      rationale: 'Subpartida específica de repuestos y partes constitutivas para teleféricos y transportadores mecánicos pesados.',
    };
  }

  if (q.includes('cable') || q.includes('guaya') || q.includes('acero') || q.includes('alambre')) {
    return {
      hsCode: '7312.10.90.00',
      nomenclatureTitle: 'Cables de acero trenzado sin aislar para uso en transporte por cable e izaje pesado',
      generalDutyPct: 12.0,
      hasFtaAgreement: true,
      ftaName: getFtaName(originCountry, destinationCountry),
      preferentialDutyPct: 0.0,
      certificateOfOriginType: 'Certificado de Fabricante + Certificado de Origen TLC',
      rulesOfOriginNotes: 'Trefilado y cableado dentro de zona de libre comercio o salto arancelario desde alambrón.',
      rationale: 'Capítulo 73 para manufacturas de fundición, hierro o acero; partida 73.12 para cables y torones de alta resistencia.',
    };
  }

  if (q.includes('bomba') || q.includes('hidraul') || q.includes('cilindro') || q.includes('tensor')) {
    return {
      hsCode: '8413.70.21.00',
      nomenclatureTitle: 'Bombas centrífugas y unidades electrohidráulicas de tensión y freno de seguridad',
      generalDutyPct: 5.0,
      hasFtaAgreement: true,
      ftaName: getFtaName(originCountry, destinationCountry),
      preferentialDutyPct: 0.0,
      certificateOfOriginType: 'Certificado de Origen TLC',
      rulesOfOriginNotes: 'Salto arancelario y ensamble técnico con control de calidad acreditado.',
      rationale: 'Subpartida 8413 para bombas para líquidos provistas o no de dispositivo medidor de caudal/presión.',
    };
  }

  if (q.includes('motor') || q.includes('reductor') || q.includes('grupo motriz')) {
    return {
      hsCode: '8501.52.00.00',
      nomenclatureTitle: 'Motores eléctricos trifásicos de corriente alterna de potencia superior a 75 kW pero inferior o igual a 375 kW',
      generalDutyPct: 10.0,
      hasFtaAgreement: true,
      ftaName: getFtaName(originCountry, destinationCountry),
      preferentialDutyPct: 0.0,
      certificateOfOriginType: 'Certificado de Origen Comercial',
      rulesOfOriginNotes: 'Producido enteramente en territorio de una de las partes con componentes certificados.',
      rationale: 'Capítulo 85 para máquinas, aparatos y material eléctrico y sus partes motrices de tracción.',
    };
  }

  // Genérico Maquinaria
  return {
    hsCode: '8479.89.90.00',
    nomenclatureTitle: 'Máquinas y aparatos mecánicos con función propia no expresados ni comprendidos en otra parte',
    generalDutyPct: 8.0,
    hasFtaAgreement: true,
    ftaName: getFtaName(originCountry, destinationCountry),
    preferentialDutyPct: 0.0,
    certificateOfOriginType: 'Certificado de Origen para Exportación',
    rulesOfOriginNotes: 'Criterio de origen de fabricación y salto de partida arancelaria.',
    rationale: 'Partida residual de maquinaria industrial con función específica.',
  };
}

function getFtaName(origin: string, dest: string): string {
  const d = dest.toLowerCase();
  if (d.includes('méxico') || d.includes('mexico')) return 'Tratado de Libre Comercio TLC G3 / Alianza del Pacífico';
  if (d.includes('estados unidos') || d.includes('ee.uu') || d.includes('usa')) return 'Tratado de Promoción Comercial (TPA) Colombia - EE.UU.';
  if (d.includes('chile')) return 'Acuerdo de Libre Comercio ACE 24 / Alianza del Pacífico';
  if (d.includes('perú') || d.includes('peru') || d.includes('ecuador') || d.includes('bolivia')) return 'Comunidad Andina de Naciones (CAN) - Desgravación 100%';
  if (d.includes('europa') || d.includes('españa') || d.includes('francia') || d.includes('alemania')) return 'Acuerdo Comercial Multipartes Unión Europea - Colombia';
  return `Tratado Comercial Bilateral con ${dest}`;
}

// -------------------------------------------------------------
// 3. AUDITOR DE NORMAS TÉCNICAS Y COMPLIANCE INTERNACIONAL
// -------------------------------------------------------------
export function getDefaultComplianceStandards(destinationCountry: string, equipmentType: string): ComplianceStandard[] {
  const d = destinationCountry.toLowerCase();

  const standards: ComplianceStandard[] = [];

  if (d.includes('estados unidos') || d.includes('ee.uu') || d.includes('usa')) {
    standards.push(
      {
        id: 'std-asme-b77',
        code: 'ASME B77.1',
        name: 'Passenger Ropeways - Aerial Tramways, Aerial Lifts, Surface Lifts and Tows',
        agency: 'American National Standards Institute (ANSI / ASME)',
        mandatory: true,
        estimatedCostUSD: 4500,
        testingBody: 'Organismo de Inspección Acreditado ASME / OSHA',
        description: 'Obligatoria para operar teleféricos en jurisdicción de EE. UU. Cubre cálculo de fatiga, factores de seguridad 3.5:1 en cables y pruebas no destructivas (NDT).',
        selected: true,
      },
      {
        id: 'std-ul-nema',
        code: 'UL 508A / NEMA 4X',
        name: 'Industrial Control Panels & Enclosure Weatherproofing',
        agency: 'Underwriters Laboratories (UL)',
        mandatory: true,
        estimatedCostUSD: 2800,
        testingBody: 'Laboratorio de Pruebas UL / Intertek ETL',
        description: 'Certificación de tableros eléctricos de potencia y variadores de frecuencia para intemperie en alta montaña.',
        selected: true,
      }
    );
  } else if (d.includes('europa') || d.includes('francia') || d.includes('españa') || d.includes('alemania') || d.includes('austria') || d.includes('suiza')) {
    standards.push(
      {
        id: 'std-ce-cable',
        code: 'Reglamento (UE) 2016/424',
        name: 'Directiva Europea de Instalaciones de Transporte por Cable y Marcado CE',
        agency: 'Comisión Europea / OITAF',
        mandatory: true,
        estimatedCostUSD: 5200,
        testingBody: 'Organismo Notificado (TÜV SÜD / Bureau Veritas)',
        description: 'Exige análisis de seguridad con matriz de riesgos EN 12929, declaración de conformidad UE y ensayos de fatiga en componentes de seguridad.',
        selected: true,
      },
      {
        id: 'std-en-12930',
        code: 'EN 12930 / EN 1908',
        name: 'Dispositivos de tracción y frenos de emergencia para teleféricos',
        agency: 'CEN - Comité Europeo de Normalización',
        mandatory: true,
        estimatedCostUSD: 3100,
        testingBody: 'TÜV Rheinland / Certifer',
        description: 'Verificación de desaceleración controlada y retención de cable bajo pendientes superiores al 45%.',
        selected: true,
      }
    );
  } else if (d.includes('méxico') || d.includes('mexico')) {
    standards.push(
      {
        id: 'std-nom-stps',
        code: 'NOM-004-STPS & NMX-E',
        name: 'Sistemas de Protección y Dispositivos de Seguridad en Maquinaria Industrial',
        agency: 'Secretaría del Trabajo y Previsión Social (STPS)',
        mandatory: true,
        estimatedCostUSD: 1900,
        testingBody: 'Unidad de Verificación Acreditada (UVA)',
        description: 'Obligatorio en proyectos urbanos Cablebús y Uruapan. Validación de paradas de emergencia categoría 4 según ISO 13849.',
        selected: true,
      },
      {
        id: 'std-mex-cable',
        code: 'NMX-J-RETIE-MEX',
        name: 'Dictamen de Instalación Eléctrica y Puesta a Tierra en Estaciones STC',
        agency: 'CENACE / SENER',
        mandatory: true,
        estimatedCostUSD: 1400,
        testingBody: 'Perito Eléctrico Colegiado',
        description: 'Aprobación de protección contra descargas atmosféricas e impacto de rayos en pilonas intermedias.',
        selected: true,
      }
    );
  } else if (d.includes('colombia')) {
    standards.push(
      {
        id: 'std-ntc-5957',
        code: 'NTC 5957',
        name: 'Norma Técnica Colombiana de Transporte por Cable para Pasajeros',
        agency: 'ICONTEC / Ministerio de Transporte',
        mandatory: true,
        estimatedCostUSD: 2200,
        testingBody: 'ICONTEC / Organismo de Inspección Tipo A',
        description: 'Adoptada para cables aéreos en Medellín, Manizales y Bogotá. Incluye inspección magnetográfica de cables y prueba de frenado a plena carga.',
        selected: true,
      },
      {
        id: 'std-retie',
        code: 'RETIE',
        name: 'Reglamento Técnico de Instalaciones Eléctricas',
        agency: 'Ministerio de Minas y Energía',
        mandatory: true,
        estimatedCostUSD: 1600,
        testingBody: 'Organismo de Certificación RETIE (CIDET / SGS)',
        description: 'Certificado de conformidad de producto para tableros eléctricos, motores y cableado de potencia en estación motriz.',
        selected: true,
      }
    );
  } else {
    // Estándar OITAF Internacional para Latinoamérica (Bolivia, Ecuador, Chile, etc.)
    standards.push(
      {
        id: 'std-oitaf-intl',
        code: 'OITAF / BAV Recomendaciones Técnicas',
        name: 'Normativa Internacional OITAF para Teleféricos Monocables y Bicables',
        agency: 'Organización Internacional de Transporte por Cable (OITAF)',
        mandatory: true,
        estimatedCostUSD: 3500,
        testingBody: 'Peritaje Técnico Internacional de Tercera Parte',
        description: 'Adoptada por Mi Teleférico La Paz y Aerovía Guayaquil para comisionamiento y pruebas de carga dinámicas.',
        selected: true,
      },
      {
        id: 'std-iso-9001-ndt',
        code: 'ISO 9712 / ASNT NDT Nivel II',
        name: 'Ensayos No Destructivos de Soldaduras en Pilonas y Ejes Principales',
        agency: 'ASNT / ISO',
        mandatory: true,
        estimatedCostUSD: 2400,
        testingBody: 'Inspector NDT Nivel II Certificado',
        description: 'Líquidos penetrantes, ultrasonido y partículas magnéticas en elementos sometidos a tracción cíclica.',
        selected: true,
      }
    );
  }

  return standards;
}

export async function auditComplianceWithAi(
  destinationCountry: string,
  equipmentType: string
): Promise<{ standards: ComplianceStandard[]; summary: string }> {
  const apiKey = getGeminiApiKey();

  if (apiKey) {
    try {
      const prompt = `Actúa como Auditor Técnico Internacional de Homologación Industrial y Sistemas de Transporte por Cable (STC - Teleféricos).
Determina qué normas técnicas, directivas y certificaciones de seguridad son OBLIGATORIAS para importar, comisionar y operar en ${destinationCountry} el siguiente equipo:
"${equipmentType}"

Responde ÚNICAMENTE en JSON con la siguiente estructura:
{
  "summary": "Resumen ejecutivo de normativas obligatorias para este destino y equipo",
  "standards": [
    {
      "id": "std-1",
      "code": "Código de la norma (ej: ASME B77.1, EN 12929, NOM-004-STPS, etc)",
      "name": "Nombre completo de la norma",
      "agency": "Organismo emisor (ANSI, CEN, STPS, ICONTEC)",
      "mandatory": true,
      "estimatedCostUSD": 2500,
      "testingBody": "Entidad de certificación de tercera parte (TÜV SÜD, SGS, Bureau Veritas)",
      "description": "Explicación técnica de qué exige la norma para este equipo",
      "selected": true
    }
  ]
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.1 },
          }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed.standards) && parsed.standards.length > 0) {
            return {
              standards: parsed.standards.map((s: any, idx: number) => ({
                id: s.id || `std-${idx}-${Date.now()}`,
                code: s.code || 'Norma Internacional',
                name: s.name || 'Certificación Técnica',
                agency: s.agency || 'Organismo Acreditado',
                mandatory: s.mandatory ?? true,
                estimatedCostUSD: s.estimatedCostUSD || 2000,
                testingBody: s.testingBody || 'TÜV SÜD / Bureau Veritas',
                description: s.description || 'Cumplimiento técnico requerido.',
                selected: true,
              })),
              summary: parsed.summary || `Auditoría completada para ${destinationCountry}.`,
            };
          }
        }
      }
    } catch (e) {
      console.warn('Fallback a base local de normativas:', e);
    }
  }

  const standards = getDefaultComplianceStandards(destinationCountry, equipmentType);
  return {
    standards,
    summary: `Normativas oficiales identificadas para importación y operación en ${destinationCountry} para ${equipmentType}.`,
  };
}


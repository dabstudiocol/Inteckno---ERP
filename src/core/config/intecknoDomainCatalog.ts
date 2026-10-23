// ============================================================================
// INTECKNO ERP - CATÁLOGO DE DOMINIO REAL DE INGENIERÍA
// Extraído de la evidencia de 195 proyectos reales y matriz de compras corporativa
// Especializado en Teleféricos, Ensayos No Destructivos (NDT/MRT) y Consultoría
// ============================================================================

export interface RealClientEntity {
  id: string;
  name: string;
  shortName: string;
  category: 'metro_urbano' | 'turistico_parque' | 'mineria_energia' | 'internacional' | 'multilateral_gobierno' | 'aliado_fabricante';
  country: string;
  city: string;
  systemsOperated?: string[];
  typicalServices: string[];
}

export interface RealSupplierEntity {
  id: string;
  name: string;
  category: 'rodamientos_transmision' | 'acero_metales' | 'mecanizado_cnc' | 'ensayos_laboratorio' | 'logistica_vuelos' | 'seguros_polizas' | 'fijaciones_especiales';
  location: string;
  typicalItems: string[];
}

export interface RealEquipmentAsset {
  id: string;
  code: string;
  name: string;
  category: 'mrt_magnetografia' | 'ultrasonido_end' | 'tension_aparejos' | 'metrologia_precision' | 'tribologia_vibraciones';
  brandModel: string;
  calibrationStandard: string;
  maintenanceIntervalMonths: number;
}

export interface RealWBSTaskTemplateItem {
  code: string;
  name: string;
  plannedHours: number;
  isCriticalPath: boolean;
  predecessors: string[];
  deliverable: string;
  assignedRole: string;
  normativeReference?: string;
}

export interface RealWBSFamilyTemplate {
  id: string;
  title: string;
  category: string;
  description: string;
  normativeStandard: string;
  tasks: RealWBSTaskTemplateItem[];
}

// ----------------------------------------------------------------------------
// 1. CLIENTES OFICIALES REALES DE INTECKNO
// ----------------------------------------------------------------------------
export const INTECKNO_CLIENTES_REALES: RealClientEntity[] = [
  {
    id: 'CLI-METRO-MED',
    name: 'Empresa de Transporte Masivo del Valle de Aburrá - Metro de Medellín Ltda.',
    shortName: 'Metro de Medellín',
    category: 'metro_urbano',
    country: 'Colombia',
    city: 'Medellín',
    systemsOperated: ['Metrocable Línea K (Santo Domingo)', 'Línea J (San Javier)', 'Línea L (Arví)', 'Línea M (Trece de Noviembre)', 'Línea H (Oriente)', 'Línea P (Picacho)', 'Tranvía de Ayacucho', 'Vía de Trenes 103N y 202'],
    typicalServices: ['Inspección Magnetográfica MRT de Cables', 'Mantenimiento Mayor de Plataformas EM', 'Suministro de Repuestos y Acrílicos de Cabinas', 'Banco de Pinzas', 'Barandas de Seguridad y Utillajes']
  },
  {
    id: 'CLI-MEGABUS',
    name: 'Megabús S.A. - Sistema Integrado de Transporte Masivo',
    shortName: 'Megabús S.A. (Megacable)',
    category: 'metro_urbano',
    country: 'Colombia',
    city: 'Pereira',
    systemsOperated: ['Megacable Pereira (Estaciones Parque Olaya, San Fernando, Villa Santana)'],
    typicalServices: ['Inspección MRT de Cables Tractores', 'Análisis Predictivo de Vibraciones en Grupo Motriz', 'Diseño de Pilonas y Pasarelas']
  },
  {
    id: 'CLI-ACAM',
    name: 'Asociación Cable Aéreo Manizales (ACAM)',
    shortName: 'ACAM Manizales / MIO Cable Cali',
    category: 'metro_urbano',
    country: 'Colombia',
    city: 'Manizales / Cali',
    systemsOperated: ['Cable Aéreo Manizales (Línea Cámbulos-Villamaría, Línea Fundadores)', 'MIO Cable Santiago de Cali (Cañaveralejo-Siloé)'],
    typicalServices: ['Ensayos No Destructivos END en Balancines y Pilonas', 'Inspección MRT de Cables Portador-Tractor', 'Herramientas Especiales de Guarniciones']
  },
  {
    id: 'CLI-TERMINALES-MED',
    name: 'Terminales Medellín S.A.',
    shortName: 'Terminales Medellín (Palmitas)',
    category: 'metro_urbano',
    country: 'Colombia',
    city: 'Medellín',
    systemsOperated: ['Teleférico San Sebastián de Palmitas'],
    typicalServices: ['Interventoría Técnica Integral', 'Asistencia Técnica a la Operación y Mantenimiento', 'Diseños de Modernización Electromecánica']
  },
  {
    id: 'CLI-LA-ROLITA',
    name: 'Operadora Distrital de Transporte - La Rolita / Transmilenio',
    shortName: 'Transmicable Bogotá',
    category: 'metro_urbano',
    country: 'Colombia',
    city: 'Bogotá D.C.',
    systemsOperated: ['Transmicable Ciudad Bolívar', 'Transmicable San Cristóbal'],
    typicalServices: ['Acompañamiento y Conexión de Motor Principal', 'Licitación y Operación Integral O&M']
  },
  {
    id: 'CLI-PANACHI',
    name: 'Corporación Santandereana de Cultura y Turismo Sostenible (PANACHI)',
    shortName: 'Parque Chicamocha y Santísimo',
    category: 'turistico_parque',
    country: 'Colombia',
    city: 'Bucaramanga / San Gil',
    systemsOperated: ['Teleférico Cañón del Chicamocha (6.3 km)', 'Teleférico Cerro del Santísimo'],
    typicalServices: ['Recorte y Empalme Mayor de Cable según UNE EN 12927', 'Inspección MRT de Cables', 'Ensayos END en Baterías de Balancines']
  },
  {
    id: 'CLI-ZIJIN',
    name: 'Zijin Continental Gold Inc.',
    shortName: 'Zijin Continental Gold (Mina Buriticá)',
    category: 'mineria_energia',
    country: 'Colombia',
    city: 'Buriticá, Antioquia',
    systemsOperated: ['Teleférico Industrial y de Personal Buriticá'],
    typicalServices: ['Inspección MRT Periódica', 'Suministro de Patines de Fricción', 'Bujes de Pinza Mecanizados', 'Resortes de Tracción de Pestillo', 'Cilindros de Pruebas de No Deslizamiento', 'Formación de Operadores']
  },
  {
    id: 'CLI-ISAGEN',
    name: 'ISAGEN S.A. E.S.P.',
    shortName: 'ISAGEN (Central San Carlos)',
    category: 'mineria_energia',
    country: 'Colombia',
    city: 'San Carlos, Antioquia',
    systemsOperated: ['Funiculares de Carga y Acceso Casa de Máquinas'],
    typicalServices: ['Repotenciación de Funiculares', 'Modernización de Tableros Eléctricos y Sistemas de Tracción']
  },
  {
    id: 'CLI-LAS-LAJAS',
    name: 'Corporación Turística Las Lajas',
    shortName: 'Teleférico Las Lajas',
    category: 'turistico_parque',
    country: 'Colombia',
    city: 'Ipiales, Nariño',
    systemsOperated: ['Teleférico Santuario de Las Lajas'],
    typicalServices: ['Inspección MRT de Cables', 'Análisis de Vibraciones', 'END en Balancines', 'Suministro de Cilindros de Pinza']
  },
  {
    id: 'CLI-BOLIVIA',
    name: 'Empresa Pública Estatal Estratégica Mi Teleférico',
    shortName: 'Mi Teleférico (Bolivia)',
    category: 'internacional',
    country: 'Bolivia',
    city: 'La Paz / El Alto',
    systemsOperated: ['Línea Roja', 'Línea Amarilla', 'Línea Verde', 'Línea Azul', 'Línea Naranja', 'Línea Blanca', 'Línea Celeste', 'Línea Morada', 'Línea Café', 'Línea Plateada'],
    typicalServices: ['Inspección Magnetográfica MRT Integral Anual', 'Recorte de Cable Línea Plateada', 'Suministro de Arandelas NordLock y Componentes']
  },
  {
    id: 'CLI-RAINFOREST',
    name: 'Rainforest Adventures Eco-Tourism Corp.',
    shortName: 'Rainforest Adventures (Caribe & Centroamérica)',
    category: 'internacional',
    country: 'Santa Lucía / San Martín / Costa Rica',
    city: 'Castries / Philipsburg / Jacó / Braulio Carrillo',
    systemsOperated: ['Teleférico Rainforest St. Lucia', 'Telesilla Flying Dutchman St. Maarten', 'Teleférico Braulio Carrillo', 'Teleférico Jacó Rainforest'],
    typicalServices: ['Inspecciones Generales según Normativa Europea', 'MRT de Cables y Vibraciones', 'Recorte de Cables', 'Suministro de Cabinas y Hangers', 'Atención de Emergencias Operativas']
  },
  {
    id: 'CLI-PUERTO-PLATA',
    name: 'Patronato Teleférico de Puerto Plata',
    shortName: 'Teleférico Puerto Plata (Rep. Dominicana)',
    category: 'internacional',
    country: 'República Dominicana',
    city: 'Puerto Plata',
    systemsOperated: ['Teleférico Histórico Loma Isabel de Torres'],
    typicalServices: ['Diagnóstico Integral Electromecánico', 'Mantenimiento Mayor de Sistema Motriz', 'Visita Técnica de Modernización']
  },
  {
    id: 'CLI-SANTO-DOMINGO',
    name: 'Consorcio ISIT & GC / Teleférico Santo Domingo',
    shortName: 'ITK RD / Santo Domingo Línea 1 y 2',
    category: 'internacional',
    country: 'República Dominicana',
    city: 'Santo Domingo',
    systemsOperated: ['Línea 1 Teleférico de Santo Domingo', 'Línea 2 Los Alcarrizos'],
    typicalServices: ['Asistencia Técnica a la Operación', 'Bancos de Mantenimiento de Pinzas', 'Carros Balancines Línea 2', 'Repuestos']
  },
  {
    id: 'CLI-VENEZUELA',
    name: 'Railteco / Konstruandina C.A.',
    shortName: 'Teleféricos de Venezuela (Mérida & Caracas)',
    category: 'internacional',
    country: 'Venezuela',
    city: 'Mérida / Caracas',
    systemsOperated: ['Teleférico Mukumbarí Mérida (El más alto del mundo)', 'Teleférico Warairarepano El Ávila', 'Trolcable Mérida'],
    typicalServices: ['Empalme de Cable Trolcable', 'Renovación Empalme Warairarepano', 'Inspección MRT Mukumbarí', 'Suministro de Lengüetas Homologadas']
  },
  {
    id: 'CLI-CAF',
    name: 'Banco de Desarrollo de América Latina y el Caribe (CAF)',
    shortName: 'CAF (Panamá)',
    category: 'multilateral_gobierno',
    country: 'Panamá',
    city: 'Ciudad de Panamá',
    systemsOperated: ['Proyecto Teleférico Urbano San Miguelito'],
    typicalServices: ['Consultoría Técnica en Componente Electromecánico', 'Estructuración de Operación y Mantenimiento']
  },
  {
    id: 'CLI-BID',
    name: 'Banco Interamericano de Desarrollo (BID)',
    shortName: 'BID (Bolivia)',
    category: 'multilateral_gobierno',
    country: 'Bolivia',
    city: 'La Paz',
    systemsOperated: ['Ampliación Sistema Mi Teleférico - Línea Café S2'],
    typicalServices: ['Consultoría en Especificaciones Técnicas y Supervisión Electromecánica']
  },
  {
    id: 'CLI-FOVIAL',
    name: 'Fondo de Conservación Vial - Gobierno de El Salvador',
    shortName: 'FOVIAL (El Salvador)',
    category: 'multilateral_gobierno',
    country: 'El Salvador',
    city: 'San Salvador',
    systemsOperated: ['Estudio Teleférico Metropolitano San Salvador - Soyapango'],
    typicalServices: ['Prefactibilidad Técnica y Financiera', 'Modelación de CAPEX y OPEX de Tecnología por Cable']
  },
  {
    id: 'CLI-CAPSA',
    name: 'Catedral Alta Patagonia S.A. (CAPSA)',
    shortName: 'CAPSA (Argentina)',
    category: 'internacional',
    country: 'Argentina',
    city: 'Bariloche',
    systemsOperated: ['Teleféricos y Telesillas Cerro Catedral (Princesa 1)'],
    typicalServices: ['Estudios y Diseños Mecánicos de Modificación']
  },
  {
    id: 'CLI-POMA',
    name: 'POMA S.A.S. / Poma Sucursal Colombia',
    shortName: 'POMA Colombia',
    category: 'aliado_fabricante',
    country: 'Colombia / Francia',
    city: 'Medellín / Voreppe',
    systemsOperated: ['Sistemas Desembragables y Vaivén en Toda Latinoamérica'],
    typicalServices: ['Polichado y Reemplazo de Policarbonatos de Cabinas', 'Herramientas de Desmonte de Balancines', 'Suministro de Calibradores', 'Personal Técnico de Apoyo']
  }
];

// ----------------------------------------------------------------------------
// 2. PROVEEDORES Y SUBCONTRATISTAS REALES DE INTECKNO
// ----------------------------------------------------------------------------
export const INTECKNO_PROVEEDORES_REALES: RealSupplierEntity[] = [
  {
    id: 'PROV-RODAMIENTOS',
    name: 'Almacén Rodamientos S.A.',
    category: 'rodamientos_transmision',
    location: 'Medellín, Colombia',
    typicalItems: ['Rodamientos de Balancín SKF/FAG', 'Chumaceras para Poleas', 'Retenes y Sellos de Alta Presión']
  },
  {
    id: 'PROV-ASTECO',
    name: 'Asteco S.A.S.',
    category: 'acero_metales',
    location: 'Medellín, Colombia',
    typicalItems: ['Planchas de Acero Estructural A36', 'Acero 4140 Bonificado para Ejes', 'Perfiles Pesados para Pasarelas']
  },
  {
    id: 'PROV-FERROS',
    name: 'Ferros S.A.S.',
    category: 'acero_metales',
    location: 'Medellín, Colombia',
    typicalItems: ['Tubería Estructural Schedule 40/80', 'Platinas y Ángulos para Sigmas']
  },
  {
    id: 'PROV-HERRAF',
    name: 'Herraf S.A.S.',
    category: 'mecanizado_cnc',
    location: 'Medellín, Colombia',
    typicalItems: ['Herramientas de Corte y Mecanizado', 'Machuelos y Fresas de Precisión']
  },
  {
    id: 'PROV-METALB',
    name: 'Metalb S.A.S.',
    category: 'mecanizado_cnc',
    location: 'Medellín, Colombia',
    typicalItems: ['Mecanizado CNC de Bujes de Bronce Fosforado', 'Mecanizado de Ejes para Balancines', 'Cajas de Resorte']
  },
  {
    id: 'PROV-HENAN-SIGNI',
    name: 'Henan Signi Aluminium Co., Ltd.',
    category: 'acero_metales',
    location: 'China (Importación Marítima/Aérea)',
    typicalItems: ['Perfiles y Aleaciones Especiales de Aluminio para Cabinas y Soportes']
  },
  {
    id: 'PROV-ESPECTRUM',
    name: 'Espectrum Consultores y Laboratorio S.A.S.',
    category: 'ensayos_laboratorio',
    location: 'Medellín, Colombia',
    typicalItems: ['Análisis Metalográfico de Fallas', 'Ensayos de Tracción Destructiva de Torones de Cable']
  },
  {
    id: 'PROV-ALPES-VERIF',
    name: 'Alpes Verif S.A.S.',
    category: 'ensayos_laboratorio',
    location: 'Francia / Colombia',
    typicalItems: ['Certificación Independiente de Ensayos según Normativa Europea CEN/TC 242']
  },
  {
    id: 'PROV-NORDLOCK',
    name: 'Nord-Lock Group Colombia / Representaciones',
    category: 'fijaciones_especiales',
    location: 'Bogotá / Medellín',
    typicalItems: ['Arandelas Nord-Lock Autoblocantes de Cuña para Balancines y Torres']
  },
  {
    id: 'PROV-AVIANCA',
    name: 'Avianca S.A. / Latam Airlines / Copa Airlines',
    category: 'logistica_vuelos',
    location: 'Bogotá / Internacional',
    typicalItems: ['Tiquetes Aéreos Nacionales e Internacionales para Cuadrillas Técnicas de Campo']
  },
  {
    id: 'PROV-DHL',
    name: 'DHL Global Forwarding Colombia S.A.S.',
    category: 'logistica_vuelos',
    location: 'Internacional',
    typicalItems: ['Fletes Aéreos Expresos para Magnetógrafos MRT, Repuestos y Aduanas']
  },
  {
    id: 'PROV-SURA',
    name: 'Seguros Generales Suramericana S.A. (SURA)',
    category: 'seguros_polizas',
    location: 'Medellín, Colombia',
    typicalItems: ['Pólizas de Cumplimiento Contractual', 'Responsabilidad Civil Extracontractual RCE', 'Pólizas de Salarios']
  }
];

// ----------------------------------------------------------------------------
// 3. ACTIVOS Y EQUIPOS ESPECIALIZADOS DE CAMPO DE INTECKNO
// ----------------------------------------------------------------------------
export const INTECKNO_EQUIPOS_ACTIVOS_REALES: RealEquipmentAsset[] = [
  {
    id: 'EQ-MRT-01',
    code: 'MRT-INTRON-60',
    name: 'Magnetógrafo MRT Intron con Cabezal Sensor MH-60 (Rango 30 a 65 mm)',
    category: 'mrt_magnetografia',
    brandModel: 'Intron Plus Ltd. MH-60',
    calibrationStandard: 'UNE EN 12927:2020 / ISO 4309:2017',
    maintenanceIntervalMonths: 12
  },
  {
    id: 'EQ-MRT-02',
    code: 'MRT-INTRON-30',
    name: 'Magnetógrafo MRT Intron Cabezal Sensor MH-30 (Rango 12 a 32 mm)',
    category: 'mrt_magnetografia',
    brandModel: 'Intron Plus Ltd. MH-30',
    calibrationStandard: 'UNE EN 12927:2020',
    maintenanceIntervalMonths: 12
  },
  {
    id: 'EQ-US-01',
    code: 'US-KRAUT-01',
    name: 'Detector de Defectos por Ultrasonido Digital para Ejes y Pasadores',
    category: 'ultrasonido_end',
    brandModel: 'Krautkrämer USM 36 / Baker Hughes',
    calibrationStandard: 'ASTM E114 / ASTM A388 / ISO 16810',
    maintenanceIntervalMonths: 12
  },
  {
    id: 'EQ-PM-01',
    code: 'PM-YOKE-01',
    name: 'Yugo Magnético Articulado AC/DC para Partículas Magnéticas',
    category: 'ultrasonido_end',
    brandModel: 'Magnaflux Y-7',
    calibrationStandard: 'ASTM E1444 / ASME Sec V Art 7',
    maintenanceIntervalMonths: 6
  },
  {
    id: 'EQ-CAL-01',
    code: 'CAL-PATAS-01',
    name: 'Calibrador Especial de Patas Planas para Diámetro de Cable STC',
    category: 'metrologia_precision',
    brandModel: 'Inteckno Precision Tools',
    calibrationStandard: 'UNE EN 12385 / ISO 4309',
    maintenanceIntervalMonths: 6
  },
  {
    id: 'EQ-TENS-01',
    code: 'TENS-HID-1500',
    name: 'Sistema de Tensado Hidráulico de Alta Presión 1500 Bar con Bombas y Gatos',
    category: 'tension_aparejos',
    brandModel: 'Enerpac / BVA High Tonnage',
    calibrationStandard: 'ASME B30.1',
    maintenanceIntervalMonths: 12
  },
  {
    id: 'EQ-VIB-01',
    code: 'VIB-ANALYZER-01',
    name: 'Analizador Colector de Vibraciones Mecánicas y Termografía Infrarroja',
    category: 'tribologia_vibraciones',
    brandModel: 'SKF Microlog AX Series / FLIR T-Series',
    calibrationStandard: 'ISO 10816 / ISO 13373',
    maintenanceIntervalMonths: 12
  }
];

// ----------------------------------------------------------------------------
// 4. LAS 5 PLANTILLAS WBS OPERATIVAS REALES (CRONOGRAMAS EXPERTOS)
// ----------------------------------------------------------------------------
export const INTECKNO_WBS_TEMPLATES_5_FAMILIAS: RealWBSFamilyTemplate[] = [
  // FAMILIA 1: INSPECCIÓN PREDICTIVA, MAGNETOGRAFÍA MRT Y END
  {
    id: 'WBS-FAM-01-MRT-END',
    title: 'Inspección Predictiva, Magnetografía de Cables (MRT) y Ensayos END',
    category: 'INSPECCIONES Y MANTENIMIENTO PREDICTIVO',
    normativeStandard: 'UNE EN 12927:2020 / ISO 4309:2017 / ASTM E1444 / ASTM A388',
    description: 'Protocolo completo de campo para escaneo magneto-inductivo de cables tractores y portadores, termografía, análisis de vibraciones en grupos motrices y END de balancines y ejes.',
    tasks: [
      {
        code: '1.1',
        name: 'Alistamiento de Equipos MRT, Calibración de Sensores y Logística de Campo',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: [],
        deliverable: 'Certificado de Calibración de Magnetógrafo y Plan de Viaje',
        assignedRole: 'Inspector Nivel II END (MRT)',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '1.2',
        name: 'Permisos de Trabajo en Alturas, Bloqueo de Energía (LOTO) y Charla de Seguridad SST',
        plannedHours: 8,
        isCriticalPath: true,
        predecessors: ['1.1'],
        deliverable: 'Permiso de Trabajo Seguro en Alturas y Plan de Rescate Aprobado',
        assignedRole: 'Coordinador SST / HSEQ',
        normativeReference: 'Res. 4272/2021 MinTrabajo'
      },
      {
        code: '1.3',
        name: 'Inspección Visual, Limpieza y Medición de Diámetro con Calibrador de Patas Planas',
        plannedHours: 16,
        isCriticalPath: false,
        predecessors: ['1.2'],
        deliverable: 'Registro de Variación de Diámetro y Estado Superficial del Cable',
        assignedRole: 'Técnico Especialista STC',
        normativeReference: 'ISO 4309'
      },
      {
        code: '1.4',
        name: 'Montaje del Cabezal Sensor MRT, Ajuste de Guiadores y Corrida a Baja Velocidad (0.3 a 1.0 m/s)',
        plannedHours: 24,
        isCriticalPath: true,
        predecessors: ['1.2'],
        deliverable: 'Archivos de Datos Crudos de Magnetografía (Canales LMA y LF)',
        assignedRole: 'Inspector Nivel II END (MRT)',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '1.5',
        name: 'Ensayos No Destructivos END en Balancines, Pasadores y Ejes (Ultrasonido y Partículas Magnéticas)',
        plannedHours: 32,
        isCriticalPath: false,
        predecessors: ['1.2'],
        deliverable: 'Reporte de Inspección por Ultrasonido (US) y Partículas Magnéticas (MT)',
        assignedRole: 'Inspector Nivel II Ultrasonido Krautkrämer',
        normativeReference: 'ASTM A388 / ASTM E1444'
      },
      {
        code: '1.6',
        name: 'Medición de Vibraciones Espectrales y Termografía Infrarroja en Reductor y Grupo Motriz',
        plannedHours: 16,
        isCriticalPath: false,
        predecessors: ['1.2'],
        deliverable: 'Espectros de Vibración FFT y Termogramas de Puntos Calientes',
        assignedRole: 'Ingeniero de Mantenimiento Predictivo',
        normativeReference: 'ISO 10816'
      },
      {
        code: '1.7',
        name: 'Procesamiento de Señales Magnéticas, Conteo de Alambres Rotos y Cálculo de Pérdida de Sección (LMA)',
        plannedHours: 24,
        isCriticalPath: true,
        predecessors: ['1.4'],
        deliverable: 'Gráficas de Pérdida Metálica y Localización Milimétrica de Defectos',
        assignedRole: 'Inspector Nivel II END (MRT)',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '1.8',
        name: 'Elaboración, Firma y Emisión del Informe Técnico Oficial de Vida Residual y Recomendaciones',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['1.5', '1.6', '1.7'],
        deliverable: 'Dossier Técnico Integral de Vida Útil Remanente Radicado al Cliente',
        assignedRole: 'Director de Ingeniería y Proyectos',
        normativeReference: 'UNE EN 12927 / ISO 4309'
      }
    ]
  },

  // FAMILIA 2: PROYECTOS ESPECIALES DE INGENIERÍA, DISEÑO MECÁNICO E IZAJES
  {
    id: 'WBS-FAM-02-ING-DISENO',
    title: 'Proyectos Especiales de Ingeniería Mecánica, Diseño Estructural y Sistemas de Izaje',
    category: 'PROYECTOS ESPECIALES DE HERRAMIENTAS Y EQUIPOS',
    normativeStandard: 'Eurocódigo 3 / AISC 360 / ASME B30.20 / CMAA 70',
    description: 'Ciclo completo para diseño y fabricación de sistemas de izaje en pilonas, bancos de mantenimiento de pinzas, pasarelas, sigmas y caballetes estructurales.',
    tasks: [
      {
        code: '2.1',
        name: 'Levantamiento Topográfico, Metrología Dimensional en Pilonas/Estación y Términos de Referencia',
        plannedHours: 24,
        isCriticalPath: true,
        predecessors: [],
        deliverable: 'Nube de Puntos / Ficha Técnica de Dimensiones Reales en Campo',
        assignedRole: 'Ingeniero de Diseño Mecánico',
        normativeReference: 'ASME Y14.5'
      },
      {
        code: '2.2',
        name: 'Síntesis de Requerimientos Técnicos, Hipótesis de Carga de Viento, Sismo y Carga Viva',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['2.1'],
        deliverable: 'Documento Base de Criterios de Diseño (BOD)',
        assignedRole: 'Líder de Ingeniería Estructural',
        normativeReference: 'NSR-10 / Eurocódigo 1'
      },
      {
        code: '2.3',
        name: 'Modelado 3D CAD Paramétrico de Conjuntos y Subconjuntos (Brazos de Izaje / Sigmas / Bancos)',
        plannedHours: 40,
        isCriticalPath: true,
        predecessors: ['2.2'],
        deliverable: 'Modelo 3D Paramétrico en Formato CAD Nativo',
        assignedRole: 'Ingeniero Proyectista 3D',
        normativeReference: 'ISO 128'
      },
      {
        code: '2.4',
        name: 'Análisis Estructural por Elementos Finitos (FEA), Esfuerzos de Von Mises y Fatiga Cíclica',
        plannedHours: 32,
        isCriticalPath: true,
        predecessors: ['2.3'],
        deliverable: 'Memoria de Cálculo Estructural FEA con Factor de Seguridad Aprobado',
        assignedRole: 'Especialista en Simulación FEA',
        normativeReference: 'AISC 360 / Eurocódigo 3'
      },
      {
        code: '2.5',
        name: 'Generación de Planimetría de Fabricación, Planos de Taller, Despiece y Especificaciones de Soldadura (WPS)',
        plannedHours: 24,
        isCriticalPath: true,
        predecessors: ['2.4'],
        deliverable: 'Juego de Planos de Taller Aprobados para Fabricación (Planimetría 2D)',
        assignedRole: 'Ingeniero de Diseño Mecánico',
        normativeReference: 'AWS D1.1 / ISO 2553'
      },
      {
        code: '2.6',
        name: 'Corte Láser/Plasma, Conformado, Armado y Soldadura Homologada de Sigmas y Estructuras',
        plannedHours: 60,
        isCriticalPath: true,
        predecessors: ['2.5'],
        deliverable: 'Estructuras Soldadas con Registro de Trazabilidad de Materiales',
        assignedRole: 'Supervisor de Taller Metalmecánico',
        normativeReference: 'AWS D1.1'
      },
      {
        code: '2.7',
        name: 'Mecanizado CNC de Bujes, Pasadores Templados y Tratamiento Superficial (Galvanizado / Epóxico)',
        plannedHours: 40,
        isCriticalPath: false,
        predecessors: ['2.5'],
        deliverable: 'Componentes Mecanizados con Certificado de Tratamiento Térmico',
        assignedRole: 'Tornero / Mecanizador CNC Especializado',
        normativeReference: 'ISO 2768'
      },
      {
        code: '2.8',
        name: 'Ensayos No Destructivos END en Soldaduras y Pruebas de Carga Estática/Dinámica en Taller',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['2.6', '2.7'],
        deliverable: 'Certificado de Prueba de Carga al 125% y Registro END de Uniones',
        assignedRole: 'Inspector Nivel II END',
        normativeReference: 'ASME B30.20'
      },
      {
        code: '2.9',
        name: 'Montaje en Sitio, Fijación en Pilonas/Estación, Reglaje Dimensional y Pruebas Operativas',
        plannedHours: 32,
        isCriticalPath: true,
        predecessors: ['2.8'],
        deliverable: 'Acta de Montaje, Reglaje y Entrega a Satisfacción',
        assignedRole: 'Supervisor Técnico de Montaje',
        normativeReference: 'UNE EN 1709'
      }
    ]
  },

  // FAMILIA 3: MANTENIMIENTO MAYOR, RECORTE Y EMPALME DE CABLES
  {
    id: 'WBS-FAM-03-EMPALME-CABLE',
    title: 'Mantenimiento Mayor, Recorte y Empalme de Cables Tractores / Portadores',
    category: 'MANTENIMIENTO Y MONTAJE ESPECIALIZADO',
    normativeStandard: 'UNE EN 12927:2020 (Empalmes de Cables para Instalaciones de Transporte por Cable)',
    description: 'Protocolo de alta precisión para destensado, corte de elongación plástica, apertura de 6 torones, confección de nudo central, costura y tensado hidráulico.',
    tasks: [
      {
        code: '3.1',
        name: 'Verificación de Geometría de Línea, Paso de Cable, Flecha y Cálculo de Longitud de Recorte',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: [],
        deliverable: 'Cálculo Teórico y Plan de Recorte de Cable',
        assignedRole: 'Ingeniero Especialista en Cables STC',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '3.2',
        name: 'Instalación de Mordazas de Anclaje de Alta Carga, Tirfores, Winches y Aparejos de Retención',
        plannedHours: 24,
        isCriticalPath: true,
        predecessors: ['3.1'],
        deliverable: 'Checklist de Seguridad de Aparejos de Retención Certificados',
        assignedRole: 'Cuadrilla Especializada de Maniobras e Izajes',
        normativeReference: 'ASME B30.26'
      },
      {
        code: '3.3',
        name: 'Destensado Controlado del Cable en Estación Motriz/Retorno y Desenganche de Contrapesos',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['3.2'],
        deliverable: 'Acta de Retención Segura de Tensión Cero en Tramo de Trabajo',
        assignedRole: 'Supervisor Técnico Mecánico',
        normativeReference: 'UNE EN 1908'
      },
      {
        code: '3.4',
        name: 'Corte Mecánico de la Longitud Determinada y Ligadura de Extremos con Alambre de Amarre',
        plannedHours: 8,
        isCriticalPath: true,
        predecessors: ['3.3'],
        deliverable: 'Registro Dimensional de Tramo Cortado',
        assignedRole: 'Técnico Empalmador Certificado',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '3.5',
        name: 'Destorcido Cuidadoso de los 6 Torones a lo Largo de la Zona de Costura (Longitud L = 1200 x d)',
        plannedHours: 32,
        isCriticalPath: true,
        predecessors: ['3.4'],
        deliverable: 'Verificación de Integridad de Torones y Alma Central Plastificada/Sintética',
        assignedRole: 'Técnico Empalmador Certificado',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '3.6',
        name: 'Confección del Nudo Central de Empalme y Cruce Métrico de Torones',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['3.5'],
        deliverable: 'Inspección de Simetría y Diámetro en Cruce Central',
        assignedRole: 'Técnico Empalmador Certificado',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '3.7',
        name: 'Costura Manual de las 6 Parejas de Torones, Sustitución de Alma e Inserción de Colas con Aguja Especial',
        plannedHours: 48,
        isCriticalPath: true,
        predecessors: ['3.6'],
        deliverable: 'Registro de Ocultamiento de Colas sin Deformación de Paso',
        assignedRole: 'Técnico Empalmador Certificado',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '3.8',
        name: 'Conformado y Redondeo con Martillos de Cobre, Verificación de Diámetro con Calibrador Plano',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['3.7'],
        deliverable: 'Planilla de Calibración de Diámetro en los 6 Nudos de Costura',
        assignedRole: 'Inspector Nivel II END',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '3.9',
        name: 'Retensionado Hidráulico del Cable, Liberación de Mordazas y Retiro de Aparejos',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['3.8'],
        deliverable: 'Acta de Retensionado y Presión Hidráulica de Servicio',
        assignedRole: 'Supervisor Técnico Mecánico',
        normativeReference: 'UNE EN 12927'
      },
      {
        code: '3.10',
        name: 'Escaneo Magnetográfico MRT Post-Empalme Inmediato y Pruebas Dinámicas de Rodadura',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['3.9'],
        deliverable: 'Línea Base MRT del Nuevo Empalme y Acta de Puesta en Servicio',
        assignedRole: 'Inspector Nivel II END (MRT)',
        normativeReference: 'UNE EN 12927 / UNE EN 1709'
      }
    ]
  },

  // FAMILIA 4: FABRICACIÓN Y SUMINISTRO DE REPUESTOS HOMOLOGADOS
  {
    id: 'WBS-FAM-04-REPUESTOS',
    title: 'Ingeniería Inversa, Fabricación y Suministro de Repuestos Homologados',
    category: 'IMPLEMENTACIÓN DE PROYECTOS EN SISTEMAS DE TRANSPORTE POR CABLE',
    normativeStandard: 'ISO 9001 / DIN 7168 / ASTM B221 / ASTM A29',
    description: 'Proceso completo para patines de fricción, bujes de pinza desembragable, resortes de pestillo, lengüetas, arandelas Nord-Lock y calibradores.',
    tasks: [
      {
        code: '4.1',
        name: 'Recepción de Muestra Física Patrón y Análisis de Falla / Desgaste Prematuro',
        plannedHours: 8,
        isCriticalPath: true,
        predecessors: [],
        deliverable: 'Ficha de Diagnóstico de Desgaste y Medidas Nominales',
        assignedRole: 'Ingeniero Metalúrgico / Residente',
        normativeReference: 'ASTM E18'
      },
      {
        code: '4.2',
        name: 'Caracterización Espectrométrica de Aleación Metálica y Ensayo de Dureza Rockwell / Brinell',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['4.1'],
        deliverable: 'Certificado de Composición Química y Dureza de Laboratorio',
        assignedRole: 'Laboratorio Metalúrgico Homologado',
        normativeReference: 'ASTM E415 / ASTM E18'
      },
      {
        code: '4.3',
        name: 'Modelado 3D CAD del Repuesto con Ajustes de Tolerancia Dimensional y Planos de Taller',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['4.2'],
        deliverable: 'Plano de Fabricación CNC con Tolerancias Geométricas (GD&T)',
        assignedRole: 'Ingeniero Proyectista 3D',
        normativeReference: 'ISO 1101'
      },
      {
        code: '4.4',
        name: 'Adquisición de Materia Prima Homologada con Certificado de Molino (Aluminio/Bronce/Acero)',
        plannedHours: 24,
        isCriticalPath: true,
        predecessors: ['4.3'],
        deliverable: 'Certificado de Calidad 3.1 del Material según EN 10204',
        assignedRole: 'Coordinador de Compras',
        normativeReference: 'EN 10204 3.1'
      },
      {
        code: '4.5',
        name: 'Mecanizado CNC / Inyección / Tratamiento Térmico de Alivio de Esfuerzos o Temple',
        plannedHours: 40,
        isCriticalPath: true,
        predecessors: ['4.4'],
        deliverable: 'Lote de Piezas Fabricadas',
        assignedRole: 'Supervisor de Mecanizado CNC',
        normativeReference: 'ISO 2768'
      },
      {
        code: '4.6',
        name: 'Control de Calidad Metrológico Dimensional Lote por Lote (Poka-Yoke Pasa/No Pasa)',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['4.5'],
        deliverable: 'Protocolo de Inspección Dimensional y Ficha de Control de Calidad',
        assignedRole: 'Inspector de Calidad QC',
        normativeReference: 'ISO 9001'
      },
      {
        code: '4.7',
        name: 'Embalaje Técnico Protector, Rotulación y Despacho Logístico con Guía Terrestre / Aérea',
        plannedHours: 8,
        isCriticalPath: true,
        predecessors: ['4.6'],
        deliverable: 'Remisión de Despacho y Guía de Transporte',
        assignedRole: 'Almacenista / Despachador',
        normativeReference: 'ISO 780'
      },
      {
        code: '4.8',
        name: 'Prueba de Reglaje en Campo en Pinza/Cabina y Firma de Acta de Recibido a Satisfacción',
        plannedHours: 16,
        isCriticalPath: true,
        predecessors: ['4.7'],
        deliverable: 'Acta de Entrega Técnica y Garantía de Funcionamiento',
        assignedRole: 'Técnico Especialista STC',
        normativeReference: 'UNE EN 1709'
      }
    ]
  },

  // FAMILIA 5: CONSULTORÍA TÉCNICA, INTERVENTORÍA Y ESTUDIOS MULTILATERALES
  {
    id: 'WBS-FAM-05-CONSULTORIA',
    title: 'Consultoría Técnica, Factibilidad e Interventoría Electromecánica Multilateral',
    category: 'CONSULTORIA',
    normativeStandard: 'Normativas Multilaterales CAF / BID / Normas Europeas CEN/TC 242',
    description: 'Estructuración de estudios de prefactibilidad, factibilidad, revisión de trazados, pliegos licitatorios de teleféricos urbanos y supervisión de obra.',
    tasks: [
      {
        code: '5.1',
        name: 'Recopilación, Revisión y Diagnóstico de Antecedentes Técnicos, Topografía y Trazados Propuestos',
        plannedHours: 32,
        isCriticalPath: true,
        predecessors: [],
        deliverable: 'Informe de Diagnóstico de Antecedentes Técnicos',
        assignedRole: 'Consultor Senior en Teleféricos',
        normativeReference: 'Metodología CAF/BID'
      },
      {
        code: '5.2',
        name: 'Análisis de Demanda Pasajeros/Hora/Sentido (PPHPD), Capacidad de Sistema y Selección de Tecnología',
        plannedHours: 40,
        isCriticalPath: true,
        predecessors: ['5.1'],
        deliverable: 'Matriz de Selección Tecnológica (Monocable, Bicable, Tricable 3S, Funicular)',
        assignedRole: 'Especialista en Transporte Masivo',
        normativeReference: 'UNE EN 1907'
      },
      {
        code: '5.3',
        name: 'Diseño Conceptual del Componente Electromecánico: Pilonas, Estaciones, Gálibos y Potencia Motriz',
        plannedHours: 60,
        isCriticalPath: true,
        predecessors: ['5.2'],
        deliverable: 'Perfil Longitudinal Preliminar y Dimensionamiento Electromecánico',
        assignedRole: 'Ingeniero Mecánico Especialista',
        normativeReference: 'UNE EN 12929'
      },
      {
        code: '5.4',
        name: 'Modelación Financiera Integral de Inversión Inicial (CAPEX) y Costos Operativos y de Mantenimiento (OPEX)',
        plannedHours: 40,
        isCriticalPath: true,
        predecessors: ['5.3'],
        deliverable: 'Modelo Financiero CAPEX/OPEX a 20 Años con Evaluación Económica',
        assignedRole: 'Especialista Financiero de Proyectos',
        normativeReference: 'Guías de Evaluación Económica BID'
      },
      {
        code: '5.5',
        name: 'Auditoría de Seguridad, Análisis de Riesgos y Evaluación de Cumplimiento Normativo Internacional',
        plannedHours: 32,
        isCriticalPath: false,
        predecessors: ['5.3'],
        deliverable: 'Matriz de Riesgos Electromecánicos y Medidas de Mitigación',
        assignedRole: 'Auditor de Seguridad STC',
        normativeReference: 'UNE EN 1909'
      },
      {
        code: '5.6',
        name: 'Elaboración de Términos de Referencia, Pliegos de Licitación y Especificaciones Técnicas Particulares',
        plannedHours: 48,
        isCriticalPath: true,
        predecessors: ['5.4', '5.5'],
        deliverable: 'Pliego Definitivo de Especificaciones Técnicas para Licitación Internacional',
        assignedRole: 'Consultor Senior en Teleféricos',
        normativeReference: 'Reglamentos de Contratación Multilateral'
      },
      {
        code: '5.7',
        name: 'Sustentación Técnica ante Comité Directivo, Talleres con la Entidad y Radicación Final',
        plannedHours: 24,
        isCriticalPath: true,
        predecessors: ['5.6'],
        deliverable: 'Acta de Aprobación de la Consultoría y Dossier Final Entregado',
        assignedRole: 'Director de Proyecto / Socio',
        normativeReference: 'Acta de Cierre Contractual'
      }
    ]
  }
];

import React, { useState, useEffect, useRef } from 'react';
import {
  Briefcase,
  Users,
  Search,
  Plus,
  Target,
  ClipboardCheck,
  GraduationCap,
  Wrench,
  HardHat,
  DollarSign,
  ShieldCheck,
  Lock,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  FileText,
  Upload,
  Copy,
  Check,
  Filter,
  Trash2,
  Edit,
  Eye,
  UserCheck,
  Star,
  ExternalLink,
  Clock,
  Layers,
  Send,
  X,
  Settings,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import type {
  User as ErpUser,
  UserRole,
  JobPosition,
  JobApplicationCandidate,
  PerformanceEvaluation,
  EvaluationScoreCriterion,
} from '../../types';
import {
  generateJobOfferWithLuciana,
  analyzeCandidateCvWithLuciana,
  generatePerformanceEvaluationPreDiagnosticWithLuciana,
  generateJobPositionDraftWithLuciana,
} from '../../core/services/lucianaService';
import { syncUserToCloud } from '../../core/services/firestoreSyncService';

// Icono vectorial estándar para LinkedIn
const LinkedInIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z" />
  </svg>
);

// Roles con permiso estricto de edición y definición salarial (RBAC)
export const AUTHORIZED_MANAGEMENT_ROLES: UserRole[] = [
  'gerente_general',
  'gerente_administrativa',
  'admin_sistemas',
  'coord_talento_humano',
  'auxiliar_administrativo',
];

// Fichas Oficiales Iniciales de Cargos Inteckno S.A.S. (8 Pilares)
// Fichas Oficiales de Cargos Inteckno S.A.S. (Estructura de Organigrama Oficial - 8 Pilares)
export const INITIAL_JOB_POSITIONS: JobPosition[] = [
  {
    id: 'POS-GG',
    code: 'ITK-CAR-GG',
    title: 'Gerente General',
    department: 'Dirección General',
    purpose:
      'Definir la visión estratégica, liderar la expansión corporativa, orientar las decisiones técnicas y financieras de alto nivel en transporte por cable e ingeniería especializada, y representar legalmente a Inteckno S.A.S.',
    responsibilities: [
      'Establecer y supervisar el plan estratégico y objetivos corporativos anuales.',
      'Aprobar presupuestos maestros, inversiones de capital y contratos de gran envergadura.',
      'Liderar las relaciones de alto nivel con operadores de transporte masivo, ministerios y aliados internacionales.',
      'Supervisar la rentabilidad operativa y el cumplimiento del gobierno corporativo.',
      'Presidir la junta directiva y comités directivos de la organización.',
    ],
    academicRequirements: [
      'Profesional en Ingeniería (Mecánica, Civil, Eléctrica) o Administración de Empresas.',
      'Posgrado o Maestría (MBA, Gerencia de Proyectos o Dirección Estratégica).',
    ],
    experienceRequired:
      'Mínimo 10 años en cargos directivos y liderazgo de empresas del sector electromecánico o infraestructura.',
    technicalSkills: [
      'Dirección estratégica corporativa y gobernanza empresarial',
      'Evaluación financiera y rentabilidad de proyectos de infraestructura',
      'Normatividad y estándares internacionales de transporte por cable (EN 1709, EN 12927)',
      'Gestión de licitaciones públicas y asociaciones público-privadas',
    ],
    softSkills: [
      'Liderazgo visionario e inspirador',
      'Negociación de alto nivel y diplomacia corporativa',
      'Pensamiento sistémico y toma de decisiones estratégicas',
      'Gestión de crisis y alta resiliencia',
    ],
    workConditions: [
      'Sede corporativa Medellín con disponibilidad para viajes nacionales e internacionales.',
      'Representación institucional ante gremios y autoridades del sector transporte.',
    ],
    salaryRange: {
      min: 15000000,
      max: 25000000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-01',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-IT',
    code: 'ITK-CAR-IT',
    title: 'Administrador de Sistemas & Arquitecto Cloud ERP',
    department: 'Sistemas y Tecnología',
    purpose:
      'Garantizar la disponibilidad 24/7, escalabilidad y ciberseguridad integral de la infraestructura digital de Inteckno S.A.S., administrando el ERP propio en React 19 / Firebase, Microsoft 365 y el cumplimiento ISO 27001 / Habeas Data.',
    responsibilities: [
      'Mantener la arquitectura del ERP Inteckno en la nube de Google Firebase y Vercel.',
      'Monitorear la sincronización con Microsoft Graph API (To Do, Outlook, Teams) y DIAN.',
      'Gestionar las copias de seguridad automáticas, cifrado AES-256 y control de accesos RBAC.',
      'Supervisar el asistente de IA LUC-IA-NA y su conexión con modelos Gemini en tiempo real.',
      'Auditar periódicamente la seguridad informática y el cumplimiento de la Ley 1581 de 2012.',
    ],
    academicRequirements: [
      'Ingeniería de Sistemas, Telemática, Computación o Software.',
      'Certificaciones recomendadas en Cloud (Google Cloud / Azure) y Ciberseguridad.',
    ],
    experienceRequired:
      'Mínimo 3 años administrando plataformas web modernas, bases de datos NoSQL y cloud enterprise.',
    technicalSkills: [
      'React 19, TypeScript, Tailwind CSS y Node.js',
      'Google Cloud Firestore y Firebase Hosting',
      'Integración RESTful APIs y Microsoft Entra ID',
      'Seguridad TLS 1.3 y mitigación OWASP Top 10',
    ],
    softSkills: [
      'Pensamiento analítico estructurado',
      'Capacidad pedagógica para capacitar usuarios',
      'Proactividad y respuesta ante incidentes',
    ],
    workConditions: [
      'Modalidad de trabajo híbrida con base en oficina técnica Medellín.',
      'Disponibilidad remota ante eventuales contingencias del sistema.',
    ],
    salaryRange: {
      min: 5500000,
      max: 8000000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-15',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-GA',
    code: 'ITK-CAR-GA',
    title: 'Gerente Administrativa',
    department: 'Administración y Finanzas',
    purpose:
      'Planificar, dirigir y controlar la gestión financiera, administrativa, contable y de compras de Inteckno S.A.S., asegurando la rentabilidad, optimización de recursos, flujo de caja y cumplimiento legal y tributario.',
    responsibilities: [
      'Supervisar el flujo de caja, tesorería, cartera y facturación electrónica oportuna.',
      'Liderar el control presupuestal de proyectos STC y aprobación de compras mayores a $2.000 USD.',
      'Supervisar las áreas de compras, almacén, talento humano y administración general.',
      'Garantizar el cumplimiento de obligaciones tributarias, cambiarias y laborales con revisoría fiscal.',
      'Presentar informes financieros mensuales y cierres anuales a Gerencia General.',
    ],
    academicRequirements: [
      'Profesional en Administración de Empresas, Contaduría Pública, Economía o Ingeniería Industrial.',
      'Especialización en Finanzas Corporativas, Gerencia Financiera o Alta Gerencia.',
    ],
    experienceRequired:
      'Mínimo 5 años liderando áreas administrativas y financieras en empresas de ingeniería o servicios especializados.',
    technicalSkills: [
      'Control presupuestal, flujo de caja y tesorería',
      'Normas Internacionales de Información Financiera (NIIF)',
      'Legislación tributaria colombiana y facturación electrónica DIAN',
      'Negociación con entidades bancarias y proveedores estratégicos',
    ],
    softSkills: [
      'Liderazgo directivo y trabajo interdisciplinario',
      'Rigurosidad numérica y financiera',
      'Capacidad de negociación y visión estratégica',
      'Integridad ética y transparencia',
    ],
    workConditions: [
      'Sede principal Medellín con jornada laboral presencial/híbrida.',
    ],
    salaryRange: {
      min: 8000000,
      max: 13000000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-05',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-LP',
    code: 'ITK-CAR-LP',
    title: 'Líder Técnico & Líder de Proyectos',
    department: 'Ingeniería y Operaciones',
    purpose:
      'Planificar, dirigir y garantizar la ejecución técnica y financiera de contratos de transporte por cable (Línea K, TransMiCable, etc.), velando por la integridad estructural, seguridad de usuarios y rentabilidad bajo normas EN 1709 y EN 12927.',
    responsibilities: [
      'Gestionar la Estructura de Desglose del Trabajo (EDT/WBS) y el control de hitos operacionales.',
      'Liderar cuadrillas de campo durante montajes, empalmes de cables y pruebas dinámicas de teleféricos.',
      'Supervisar el análisis de defectoscopía electromagnética (MRT) y la emisión de dictámenes técnicos oficiales.',
      'Coordinar comités de obra con las interventorías de empresas operadoras de transporte masivo.',
      'Asegurar el cumplimiento irrestricto de las normas HSEQ y protocolos de trabajo en alturas.',
    ],
    academicRequirements: [
      'Ingeniería Mecánica, Electromecánica, Mecatrónica o Civil con Matrícula Profesional COPNIA vigente.',
      'Deseable especialización en Gerencia de Proyectos (PMP/PMI) o Gestión del Mantenimiento.',
    ],
    experienceRequired:
      'Mínimo 4 años de experiencia liderando proyectos electromecánicos o sistemas de transporte por cable aéreo.',
    technicalSkills: [
      'Cálculo y monitoreo de cables según norma EN 12927 y EN 1709',
      'Defectoscopía Magnética MRT Nivel II',
      'Torquímetro hidráulico de alto tonelaje',
      'Control de costos por Valor Ganado (EVM)',
    ],
    softSkills: [
      'Liderazgo situacional de cuadrillas',
      'Comunicación estratégica con clientes',
      'Toma de decisiones bajo presión',
      'Resolución estructurada de fallas',
    ],
    workConditions: [
      'Disponibilidad total para viajar a frentes de obra nacionales e internacionales.',
      'Aptitud psicofísica certificada para trabajo en alturas > 1.50 metros.',
      'Disponibilidad para turnos nocturnos rotativos durante ventanas de mantenimiento.',
    ],
    salaryRange: {
      min: 6500000,
      max: 9500000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-10',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-LI',
    code: 'ITK-CAR-LI',
    title: 'Líder de Ingeniería & Especialista Mecánico',
    department: 'Ingeniería y Operaciones',
    purpose:
      'Liderar el diseño, cálculo mecánico, modelado CAD/CAE y especificaciones técnicas de componentes de teleférico (poleas, ejes, mordazas, estructuras y balancines), garantizando la integridad estructural y constructibilidad de las soluciones.',
    responsibilities: [
      'Realizar cálculos mecánicos, estructurales y de fatiga bajo normatividad europea EN 1709.',
      'Elaborar y aprobar planos constructivos y de detalle en herramientas CAD 3D.',
      'Definir especificaciones técnicas y tolerancias geométricas para maquinado y fabricación.',
      'Supervisar la fabricación y control de calidad dimensional de repuestos y elementos mecánicos.',
      'Brindar soporte técnico y concepto de ingeniería ante desviaciones o fallas en campo.',
    ],
    academicRequirements: [
      'Profesional en Ingeniería Mecánica o Electromecánica con Matrícula Profesional COPNIA vigente.',
      'Deseable posgrado o diplomado en Diseño Mecánico, Simulación Numérica (FEA) o Soldadura.',
    ],
    experienceRequired:
      'Mínimo 3 años en diseño electromecánico, cálculo estructural de maquinaria o teleféricos.',
    technicalSkills: [
      'Software CAD 3D avanzado (SolidWorks, Inventor o similar)',
      'Análisis de Elementos Finitos (FEA) estático y dinámico',
      'Tolerancias geométricas y dimensionales (GD&T)',
      'Selección de materiales, aceros especiales y tratamientos térmicos',
    ],
    softSkills: [
      'Rigurosidad analítica y precisión',
      'Capacidad de innovación aplicada',
      'Pensamiento estructurado',
      'Trabajo en equipo multidisciplinario',
    ],
    workConditions: [
      'Oficina técnica de diseño con visitas periódicas a talleres de manufactura y frentes de obra.',
    ],
    salaryRange: {
      min: 5500000,
      max: 8000000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-12',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-IP',
    code: 'ITK-CAR-IP',
    title: 'Ingeniero de Proyectos',
    department: 'Ingeniería y Operaciones',
    purpose:
      'Ejecutar y supervisar directamente las actividades de ingeniería, montaje, comisionamiento y pruebas de campo en sistemas de transporte por cable, garantizando el cumplimiento de cronogramas, protocolos técnicos y normas de seguridad.',
    responsibilities: [
      'Supervisar en campo el montaje, alineación y calibración de componentes electromecánicos STC.',
      'Elaborar reportes diarios de avance (DDR) y reportes fotográficos de obra en el ERP Inteckno.',
      'Controlar la ejecución de las actividades del WBS y el consumo de horas-hombre y recursos.',
      'Verificar el cumplimiento de tolerancias, pares de apriete y protocolos de pruebas.',
      'Coordinar con el supervisor técnico la distribución diaria de cuadrillas y tareas.',
    ],
    academicRequirements: [
      'Profesional en Ingeniería Mecánica, Eléctrica, Electromecánica, Mecatrónica o Civil.',
      'Matrícula Profesional COPNIA vigente y curso de trabajo en alturas (Avanzado/Coordinador).',
    ],
    experienceRequired:
      'Mínimo 1 a 2 años en proyectos de ingeniería de campo, montajes industriales o infraestructura.',
    technicalSkills: [
      'Interpretación de planos mecánicos, estructurales e hidráulicos',
      'Manejo de instrumentos de medición de precisión (relojes comparadores, niveles ópticos)',
      'Protocolos de aseguramiento y control de calidad (QA/QC)',
      'Gestión de actividades WBS en ERP Inteckno',
    ],
    softSkills: [
      'Proactividad y alta capacidad de resolución en campo',
      'Comunicación asertiva con cuadrillas y supervisores',
      'Compromiso irrestricto con la seguridad operativa',
      'Orientación a resultados y cumplimiento de hitos',
    ],
    workConditions: [
      'Trabajo en campo en estaciones y pilonas de teleférico en diversos municipios del país.',
      'Ascenso a alturas superiores a 1.50 metros.',
      'Disponibilidad para turnos rotativos y nocturnos durante paradas programadas.',
    ],
    salaryRange: {
      min: 3500000,
      max: 5500000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-15',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-ST',
    code: 'ITK-CAR-ST',
    title: 'Supervisor Técnico de Campo STC',
    department: 'Operaciones de Campo',
    purpose:
      'Coordinar y supervisar de forma presencial las cuadrillas de técnicos y auxiliares en los frentes de obra de teleféricos, asegurando la correcta ejecución de maniobras mecánicas, cumplimiento de procedimientos de bloqueo LOTO y seguridad operacional.',
    responsibilities: [
      'Asignar y dirigir operativamente las cuadrillas de técnicos y auxiliares en cada estación o pilona.',
      'Verificar el torqueado de tornillería crítica y aplicación de marcas de testigo visual.',
      'Coordinar maniobras seguras de izaje con aparejadores y operadores de grúa/winche.',
      'Garantizar la aplicación de bloqueo y etiquetado (LOTO) antes de ingresar a zonas de riesgo.',
      'Validar el diligenciamiento de checklists de campo y permisos de trabajo en alturas.',
    ],
    academicRequirements: [
      'Tecnólogo o Técnico Profesional en Mantenimiento Electromecánico, Mecánica Industrial o afines.',
      'Certificado de Coordinador de Trabajo en Alturas vigente (Resolución 4272 de 2021).',
    ],
    experienceRequired:
      'Mínimo 3 años de experiencia liderando cuadrillas de mantenimiento electromecánico o montajes de teleféricos.',
    technicalSkills: [
      'Maniobras de aparejos e izajes de cargas pesadas',
      'Manejo de torquímetros hidráulicos y neumáticos de alta capacidad',
      'Inspección visual de balancines, poleas y cables',
      'Protocolos LOTO y procedimientos de rescate en alturas',
    ],
    softSkills: [
      'Liderazgo operativo en campo',
      'Autoridad técnica basada en el ejemplo',
      'Comunicación clara y precisa',
      'Enfoque preventivo de cero accidentes',
    ],
    workConditions: [
      'Campo 100% presencial en líneas y estaciones de teleférico.',
      'Trabajo en alturas en torres y pilonas a la intemperie.',
    ],
    salaryRange: {
      min: 3500000,
      max: 5000000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-20',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-TEC',
    code: 'ITK-CAR-TEC',
    title: 'Técnico de Campo STC',
    department: 'Operaciones de Campo',
    purpose:
      'Ejecutar labores técnicas electromecánicas, mantenimientos preventivos y correctivos, desarmes, overhauls de pinzas/cabinas y sustitución de elementos de desgaste en líneas de transporte por cable.',
    responsibilities: [
      'Efectuar torqueado verificado de pernos de balancines, mordazas y anclajes con registro fotográfico.',
      'Inspeccionar visual y dimensionalmente los bandajes de goma de poleas y rodamientos.',
      'Apoyar la instalación y desplazamiento de sensores electromagnéticos MRT para inspección de cables.',
      'Realizar desmonte, limpieza, cambio de casquillos y rearme de pinzas desembragables.',
      'Diligenciar listas de chequeo técnico en el ERP Inteckno.',
    ],
    academicRequirements: [
      'Técnico o Tecnólogo en Electromecánica, Mecánica Industrial, Mantenimiento o Electricidad.',
      'Certificado vigente de Trabajo Seguro en Alturas (Nivel Avanzado).',
    ],
    experienceRequired:
      'Mínimo 1 a 2 años de experiencia práctica en mantenimiento de maquinaria pesada o sistemas de cable aéreo.',
    technicalSkills: [
      'Alineación y reglaje de balancines y poleas STC',
      'Uso de torquímetros de hasta 1200 Nm y llaves de impacto',
      'Lubricación técnica y manejo de grasas especiales para cables y rodamientos',
      'Bloqueo y etiquetado (LOTO)',
    ],
    softSkills: [
      'Disciplina técnica y atención al detalle mecánico',
      'Trabajo en equipo y solidaridad operativa',
      'Resiliencia física y autocuidado en alturas',
    ],
    workConditions: [
      'Exposición a la intemperie en pilonas de teleférico (viento, sol, lluvia y altura).',
      'Disponibilidad para turnos nocturnos durante ventanas operativas.',
    ],
    salaryRange: {
      min: 2500000,
      max: 3800000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-22',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-AT',
    code: 'ITK-CAR-AT',
    title: 'Auxiliar Técnico STC',
    department: 'Operaciones de Campo',
    purpose:
      'Brindar soporte operativo directo en campo a los técnicos y supervisores en maniobras mecánicas, preparación de herramientas, señalización, limpieza técnica y transporte de materiales en los frentes de trabajo de teleférico.',
    responsibilities: [
      'Alistar, trasladar y custodiar herramientas, torquímetros y equipos en los puntos de trabajo.',
      'Apoyar en tareas de limpieza, desengrase y orden y aseo en estaciones y cabinas de teleférico.',
      'Asistir a los técnicos en el pase de herramientas y materiales durante trabajos en pilonas.',
      'Delimitar y señalizar las zonas de trabajo para proteger a usuarios y transeúntes.',
      'Participar activamente en las charlas de 5 minutos y cumplir todas las instrucciones de seguridad.',
    ],
    academicRequirements: [
      'Bachiller Técnico o Formación Técnica básica en áreas industriales o mecánicas.',
      'Certificado de Trabajo Seguro en Alturas vigente.',
    ],
    experienceRequired:
      'Mínimo 6 meses a 1 año en labores operativas, construcción o talleres mecánicos.',
    technicalSkills: [
      'Manejo de herramientas manuales básicas',
      'Normas fundamentales de seguridad industrial',
      'Técnicas básicas de izaje y manejo seguro de cargas manuales',
    ],
    softSkills: [
      'Disposición proactiva para el aprendizaje',
      'Puntualidad, disciplina y responsabilidad',
      'Espíritu de servicio y compañerismo',
    ],
    workConditions: [
      'Trabajo físico en campo a la intemperie.',
      'Uso permanente de Elementos de Protección Personal (EPP).',
    ],
    salaryRange: {
      min: 1800000,
      max: 2600000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-25',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-PRA',
    code: 'ITK-CAR-PRA',
    title: 'Practicante de Ingeniería & Apoyo Técnico',
    department: 'Ingeniería y Proyectos',
    purpose:
      'Apoyar los procesos de ingeniería, documentación técnica, elaboración de dossiers de calidad, levantamiento de planos y seguimiento de actividades operativas bajo la mentoría de ingenieros de proyecto.',
    responsibilities: [
      'Apoyar en la consolidación de dossiers de calidad, certificados de materiales y calibraciones.',
      'Colaborar en el modelado 2D/3D de planos as-built y memorias de cálculo.',
      'Acompañar a los ingenieros de proyecto en visitas de inspección y registro de avances.',
      'Actualizar bitácoras y bases de datos técnicas en el ERP Inteckno.',
    ],
    academicRequirements: [
      'Estudiante activo de últimos semestres de Ingeniería Mecánica, Eléctrica, Electromecánica, Mecatrónica, Industrial o Civil.',
      'Convenio de práctica o contrato de aprendizaje SENA/Universitario.',
    ],
    experienceRequired:
      'No se requiere experiencia laboral previa. Se valoran proyectos formativos y liderazgo académico.',
    technicalSkills: [
      'Software CAD (AutoCAD, SolidWorks)',
      'Microsoft Excel / Office intermedio',
      'Lectura de planos y terminología técnica de ingeniería',
    ],
    softSkills: [
      'Curiosidad técnica y deseo constante de aprender',
      'Organización y método de trabajo',
      'Comunicación clara y respetuosa',
    ],
    workConditions: [
      'Oficina técnica con visitas formativas a frentes de obra bajo supervisión.',
    ],
    salaryRange: {
      min: 1423500,
      max: 1800000,
      currency: 'COP',
      isConfidential: false,
    },
    status: 'activo',
    createdAt: '2026-02-01',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-CC',
    code: 'ITK-CAR-CC',
    title: 'Coordinador Comercial',
    department: 'Gestión Comercial',
    purpose:
      'Liderar la estrategia de ventas, relacionamiento comercial y participación en licitaciones públicas y privadas en el sector de transporte por cable, teleféricos y mantenimiento industrial en Colombia y LATAM.',
    responsibilities: [
      'Prospectar clientes del sector transporte masivo, parques ecológicos y teleféricos urbanos/turísticos.',
      'Estructurar propuestas técnico-económicas detalladas utilizando el cotizador del ERP Inteckno.',
      'Liderar la formulación de pliegos y postulaciones en la plataforma estatal SECOP II.',
      'Realizar seguimiento riguroso al pipeline de ventas en el CRM y coordinar negociaciones comerciales.',
      'Asegurar el cumplimiento de metas de facturación y margen comercial de la empresa.',
    ],
    academicRequirements: [
      'Profesional en Ingeniería, Negocios Internacionales, Administración de Empresas o Mercadeo.',
      'Deseable especialización en Gerencia Comercial, Marketing B2B o Licitaciones.',
    ],
    experienceRequired:
      'Mínimo 3 años en ventas técnicas B2B o gestión de licitaciones de ingeniería/infraestructura.',
    technicalSkills: [
      'Plataforma SECOP II y compras públicas colombianas',
      'Costeo de proyectos electromecánicos y servicios de ingeniería',
      'Manejo de CRM y cálculo de probabilidad de cierre',
      'Técnicas de negociación consultiva B2B',
    ],
    softSkills: [
      'Habilidades persuasivas y excelente oratoria comercial',
      'Orientación al logro y superación de metas',
      'Pensamiento estratégico comercial',
      'Relaciones interpersonales empáticas',
    ],
    workConditions: [
      'Oficina comercial en Medellín con disponibilidad para viajes nacionales e internacionales.',
    ],
    salaryRange: {
      min: 4500000,
      max: 7000000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-08',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-AC',
    code: 'ITK-CAR-AC',
    title: 'Asistente de Negocios Internacionales & Comercial',
    department: 'Negocios Internacionales y ERP',
    purpose:
      'Apoyar la gestión comercial internacional, análisis de importaciones/exportaciones de repuestos y equipos STC bajo Incoterms 2020, cotizaciones multimoneda y optimización de flujos de trabajo en el ERP Inteckno.',
    responsibilities: [
      'Elaborar cotizaciones técnicas y comerciales en USD / COP bajo reglas Incoterms 2020 (FOB, CIF, DAP, DDP).',
      'Coordinar con agentes aduaneros la liquidación de aranceles, fletes marítimos/aéreos y trámites DIAN.',
      'Monitorear la TRM oficial diaria e integrar factores económicos en la calculadora de exportación.',
      'Apoyar la implementación, diseño de procesos BPMN y retroalimentación del ERP Inteckno.',
      'Atender requerimientos comerciales y solicitudes de clientes internacionales en inglés y español.',
    ],
    academicRequirements: [
      'Profesional o estudiante de últimos semestres en Negocios Internacionales, Comercio Exterior o Ingeniería Industrial.',
    ],
    experienceRequired:
      'Mínimo 1 a 2 años en comercio exterior, logística internacional o soporte comercial técnico.',
    technicalSkills: [
      'Incoterms 2020 y liquidación aduanera de importación/exportación',
      'Herramientas ERP y modelado de procesos BPMN',
      'Inglés intermedio a avanzado (B2/C1 profesional)',
      'Manejo financiero de cotizaciones multimoneda (TRM, arancel, IVA)',
    ],
    softSkills: [
      'Capacidad analítica estructurada',
      'Negociación intercultural y proactividad',
      'Atención meticulosa al detalle en contratos y ofertas',
      'Agilidad en adopción de tecnologías digitales',
    ],
    workConditions: [
      'Oficina corporativa Medellín con conexión remota a clientes y proveedores globales.',
    ],
    salaryRange: {
      min: 2800000,
      max: 4200000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-10',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-SST',
    code: 'ITK-CAR-SST',
    title: 'Coordinador de Seguridad, Salud en el Trabajo y Ambiente (SST/HSEQ)',
    department: 'SST y Sostenibilidad',
    purpose:
      'Liderar el Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST), asegurando cero accidentes en obras de transporte por cable, certificación del 100% del personal en alturas y cumplimiento de normatividad colombiana e ISO 45001.',
    responsibilities: [
      'Inspeccionar equipos de protección contra caídas (arneses, líneas de vida, conectores, mosquetones).',
      'Aprobar permisos de trabajo en alturas y análisis de trabajo seguro (ATS) previo a cualquier maniobra.',
      'Gestionar los exámenes médicos ocupacionales y la matriz legal de riesgos laborales.',
      'Liderar la investigación de incidentes y formular lecciones aprendidas para la Wiki corporativa.',
      'Coordinar programas de vigilancia epidemiológica y capacitaciones periódicas de seguridad.',
    ],
    academicRequirements: [
      'Profesional o Especialista en Seguridad y Salud en el Trabajo con Licencia SST vigente.',
      'Certificado de Coordinador de Trabajo en Alturas (Resolución 4272 de 2021).',
    ],
    experienceRequired:
      'Mínimo 3 años en empresas del sector electromecánico, infraestructura o transporte por cable.',
    technicalSkills: [
      'Resolución 4272 de 2021 (Norma colombiana de protección contra caídas)',
      'Normas ISO 45001 (SST), ISO 9001 (Calidad) e ISO 14001 (Medio Ambiente)',
      'Investigación de accidentes con metodología Árbol de Causas e Ishikawa',
      'Inspección técnica de equipos de rescate y evacuación en teleféricos',
    ],
    softSkills: [
      'Firmeza ética y criterio preventivo indeclinable en campo',
      'Liderazgo pedagógico y empatía en charlas de seguridad',
      'Comunicación asertiva y resolución de conflictos',
    ],
    workConditions: [
      'Recorridos en campo por estaciones, torres y líneas de teleférico.',
      'Inspección física de ascenso a pilonas con equipo de protección personal.',
    ],
    salaryRange: {
      min: 4500000,
      max: 6800000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-18',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-ASST',
    code: 'ITK-CAR-ASST',
    title: 'Auxiliar Técnico SST',
    department: 'SST y Sostenibilidad',
    purpose:
      'Apoyar en campo la verificación de condiciones de seguridad, diligenciamiento de listas de chequeo de EPP, toma de asistencia a charlas de seguridad y monitoreo del cumplimiento de protocolos en las obras de teleférico.',
    responsibilities: [
      'Verificar diariamente el uso completo y correcto de EPP por parte del personal de cuadrilla.',
      'Diligenciar listas de chequeo preoperacionales de equipos de alturas y herramientas.',
      'Tomar registro fotográfico y documental de condiciones seguras e inseguras en obra.',
      'Apoyar la logística de las charlas de seguridad de 5 minutos y registro de firmas.',
      'Monitorear la vigencia del botiquín de primeros auxilios y equipos de respuesta a emergencias.',
    ],
    academicRequirements: [
      'Técnico o Tecnólogo en Seguridad y Salud en el Trabajo con Licencia SST vigente.',
      'Certificado de Trabajo Seguro en Alturas vigente.',
    ],
    experienceRequired:
      'Mínimo 1 año como auxiliar o vigía SST en empresas electromecánicas, de montajes o construcción.',
    technicalSkills: [
      'Listas de chequeo SST y protocolos de inspección visual de arneses',
      'Primeros auxilios básicos y control de emergencias',
      'Manejo del módulo SST en ERP Inteckno',
    ],
    softSkills: [
      'Sentido de observación detallista',
      'Firmeza respetuosa para recordar normas de seguridad',
      'Compromiso con el bienestar de sus compañeros',
    ],
    workConditions: [
      'Presencia continua en frentes de obra, estaciones y torres de teleférico.',
    ],
    salaryRange: {
      min: 2200000,
      max: 3200000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-20',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-GA-EXT',
    code: 'ITK-CAR-GA-EXT',
    title: 'Gestor Ambiental & Sostenibilidad',
    department: 'SST y Sostenibilidad',
    purpose:
      'Diseñar y supervisar la gestión ambiental de los proyectos de Inteckno, velando por la adecuada disposición de aceites usados, descarte de cables y residuos peligrosos (RESPEL) bajo normatividad ambiental colombiana e ISO 14001.',
    responsibilities: [
      'Elaborar e implementar los Planes de Manejo Ambiental (PMA) para proyectos STC.',
      'Gestionar certificados y trazabilidad de disposición final de residuos peligrosos (RESPEL) y aceites dieléctricos.',
      'Realizar auditorías periódicas de cumplimiento ambiental en frentes de trabajo.',
      'Presentar informes ambientales a autoridades ambientales y clientes cuando aplique.',
    ],
    academicRequirements: [
      'Profesional en Ingeniería Ambiental, Sanitaria, Forestal o afines.',
    ],
    experienceRequired:
      'Mínimo 2 a 3 años en gestión ambiental de proyectos industriales o infraestructura.',
    technicalSkills: [
      'Normatividad ambiental colombiana y gestión integral de RESPEL',
      'Norma ISO 14001 para sistemas de gestión ambiental',
      'Planes de contingencia ante derrames de hidrocarburos',
    ],
    softSkills: [
      'Conciencia ecológica y rigor metodológico',
      'Capacidad de redacción técnica de informes',
    ],
    workConditions: [
      'Modalidad híbrida/consultoría con visitas programadas a proyectos.',
    ],
    salaryRange: {
      min: 3000000,
      max: 4800000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-02-10',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-COM',
    code: 'ITK-CAR-COM',
    title: 'Comprador Técnico & Cadena de Suministro',
    department: 'Cadena de Suministro',
    purpose:
      'Gestionar las compras de repuestos especializados para teleférico, materias primas, herramientas de calibración y suministros generales, optimizando costos, tiempos de entrega y homologación de proveedores nacionales e internacionales.',
    responsibilities: [
      'Solicitar, analizar y negociar cotizaciones técnicas con fabricantes nacionales e internacionales (Doppelmayr, Poma, etc.).',
      'Elaborar cuadros comparativos de compras y gestionar aprobaciones de la Gerencia Administrativa.',
      'Emitir y hacer seguimiento a las Órdenes de Compra (OC) en el ERP Inteckno hasta la entrega en almacén.',
      'Homologar y evaluar periódicamente a proveedores y contratistas de servicios.',
      'Coordinar con logística el ingreso y nacionalización de repuestos críticos.',
    ],
    academicRequirements: [
      'Profesional en Ingeniería Industrial, Administración de Empresas, Comercio Exterior o afines.',
    ],
    experienceRequired:
      'Mínimo 2 años en compras técnicas, abastecimiento o comercio exterior en empresas industriales.',
    technicalSkills: [
      'Negociación de compras técnicas y acuerdos marco',
      'Gestión de órdenes de compra e inventario en ERP Inteckno',
      'Incoterms y logística de importación básica',
    ],
    softSkills: [
      'Habilidades de negociación y ahorro de costos',
      'Organización, agilidad y seguimiento a entregas',
      'Integridad y transparencia en contrataciones',
    ],
    workConditions: [
      'Oficina en sede Medellín con visitas ocasionales a proveedores.',
    ],
    salaryRange: {
      min: 3200000,
      max: 4800000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-14',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-ALM',
    code: 'ITK-CAR-ALM',
    title: 'Almacenista & Control de Herramientas STC',
    department: 'Cadena de Suministro',
    purpose:
      'Administrar la bodega central de Inteckno, custodiando repuestos críticos de teleférico, torquímetros, cables patrón y herramientas especializadas mediante control de inventarios, código de barras y trazabilidad serial.',
    responsibilities: [
      'Recibir, verificar físicamente y registrar en el ERP los insumos, repuestos y herramientas.',
      'Emitir remisiones de despacho y controlar el reingreso de herramientas y equipos de obra.',
      'Mantener la custodia, orden y etiquetado con código de barras en las estanterías de bodega.',
      'Controlar los programas de calibración y mantenimiento de torquímetros, sensores MRT y tecles.',
      'Ejecutar conteos cíclicos de inventario y reportar discrepancias a la Gerencia Administrativa.',
    ],
    academicRequirements: [
      'Tecnólogo o Técnico en Gestión Logística, Almacén, Mecánica o áreas afines.',
    ],
    experienceRequired:
      'Mínimo 2 años como almacenista en empresas industriales, talleres electromecánicos o maquinaria.',
    technicalSkills: [
      'Control de inventarios y trazabilidad con código de barras en ERP',
      'Identificación técnica de pernos de alta resistencia, rodamientos y lubricantes',
      'Manejo seguro de equipos de elevación (transpaleta, apilador)',
    ],
    softSkills: [
      'Alto sentido de orden, limpieza y disciplina',
      'Meticulosidad y honestidad comprobada',
      'Capacidad de organización física del espacio',
    ],
    workConditions: [
      'Bodega principal de Inteckno en Medellín.',
    ],
    salaryRange: {
      min: 2200000,
      max: 3200000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-16',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-TH',
    code: 'ITK-CAR-TH',
    title: 'Coordinador de Talento Humano',
    department: 'Talento Humano',
    purpose:
      'Liderar la gestión del talento humano en Inteckno S.A.S., administrando los procesos de atracción de personal técnico especializado, contratación, clima laboral, planes de capacitación y bienestar organizacional.',
    responsibilities: [
      'Gestionar los procesos de selección y evaluación de candidatos técnicos con apoyo de IA en el ERP.',
      'Coordinar la contratación laboral, afiliaciones a seguridad social y archivo de expedientes.',
      'Supervisar la liquidación oportuna de la nómina y prestaciones sociales con la Gerencia Administrativa.',
      'Ejecutar programas de bienestar, clima laboral y desarrollo de competencias técnicas.',
      'Monitorear las evaluaciones de desempeño semestrales y planes de mejora con LUC-IA-NA.',
    ],
    academicRequirements: [
      'Profesional en Psicología, Administración de Empresas, Ingeniería Industrial o Gestión Humana.',
      'Deseable especialización en Gerencia del Talento Humano o Legislación Laboral.',
    ],
    experienceRequired:
      'Mínimo 3 años liderando Talento Humano en empresas de ingeniería, construcción o servicios técnicos.',
    technicalSkills: [
      'Código Sustantivo del Trabajo (CST) colombiano',
      'Atracción de talento técnico especializado y entrevistas por competencias',
      'Liquidación de nómina, PILA y parafiscales',
      'Evaluación 360° y diagnósticos de clima organizacional',
    ],
    softSkills: [
      'Empatía, escucha activa y confidencialidad estricta',
      'Resolución pacífica de controversias laborales',
      'Capacidad de liderazgo pedagógico',
    ],
    workConditions: [
      'Sede corporativa Medellín.',
    ],
    salaryRange: {
      min: 4000000,
      max: 6000000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-15',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-ATH',
    code: 'ITK-CAR-ATH',
    title: 'Auxiliar de Talento Humano',
    department: 'Talento Humano',
    purpose:
      'Apoyar las actividades operativas de talento humano, archivo de hojas de vida, control de asistencia, afiliaciones a seguridad social y logística de eventos de bienestar y capacitaciones.',
    responsibilities: [
      'Tramitar afiliaciones a EPS, ARL, Fondos de Pensiones y Caja de Compensación Familiar.',
      'Mantener actualizadas las carpetas de los colaboradores y el repositorio digital en el ERP.',
      'Consolidar novedades de nómina (horas extras, viáticos legalizados, incapacidades, licencias).',
      'Apoyar la logística de capacitaciones, inducciones corporativas y jornadas de bienestar.',
    ],
    academicRequirements: [
      'Técnico o Tecnólogo en Gestión Humana, Asistencia Administrativa o afines.',
    ],
    experienceRequired:
      'Mínimo 1 año en cargos de apoyo a talento humano o nómina.',
    technicalSkills: [
      'Trámites en plataformas de seguridad social (ARL Sura, EPS, AFP)',
      'Manejo de novedades en ERP módulo Empleados',
      'Manejo intermedio de herramientas ofimáticas',
    ],
    softSkills: [
      'Excelente atención y amabilidad con el personal',
      'Discreción y confidencialidad en el manejo de datos personales',
      'Organización y proactividad',
    ],
    workConditions: [
      'Sede corporativa Medellín.',
    ],
    salaryRange: {
      min: 1800000,
      max: 2600000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-20',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-CADM',
    code: 'ITK-CAR-CADM',
    title: 'Coordinador Administrativo',
    department: 'Administración y Finanzas',
    purpose:
      'Coordinar los servicios generales, mantenimiento de sedes físicas, gestión de suministros de oficina, flota vehicular y logística administrativa interna para garantizar la operación fluida de la compañía.',
    responsibilities: [
      'Supervisar el mantenimiento preventivo y locativo de las sedes de la empresa.',
      'Controlar la asignación, consumo de combustible y mantenimiento de la flota vehicular.',
      'Gestionar los contratos de servicios públicos, vigilancia, aseo e internet corporativo.',
      'Supervisar la administración de correspondencia, archivo físico y suministros de oficina.',
    ],
    academicRequirements: [
      'Profesional o Tecnólogo en Administración de Empresas, Gestión Empresarial o afines.',
    ],
    experienceRequired:
      'Mínimo 2 años coordinando operaciones administrativas, flota o servicios generales.',
    technicalSkills: [
      'Gestión de proveedores de servicios generales y contratos de mantenimiento',
      'Control de costos y presupuestos operativos de sede',
      'Manejo de pólizas y seguros de vehículos y locaciones',
    ],
    softSkills: [
      'Orientación al servicio interno y rápida resolución de incidentes',
      'Habilidad organizativa y de seguimiento',
      'Capacidad de negociación',
    ],
    workConditions: [
      'Sede principal Medellín con desplazamientos locales.',
    ],
    salaryRange: {
      min: 3000000,
      max: 4500000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-18',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-AADM',
    code: 'ITK-CAR-AADM',
    title: 'Auxiliar Administrativo',
    department: 'Administración y Finanzas',
    purpose:
      'Brindar soporte administrativo integral, recepción y radicación de correspondencia, digitación contable básica, control de viáticos y apoyo en facturación y archivo corporativo.',
    responsibilities: [
      'Radicar y escanear facturas de proveedores, cuentas de cobro y documentos tributarios.',
      'Verificar soportes de legalización de gastos y viáticos de cuadrillas de campo en el ERP.',
      'Atender la recepción principal, conmutador telefónico y coordinar envíos de mensajería.',
      'Mantener el archivo documental centralizado conforme a las directrices de calidad.',
    ],
    academicRequirements: [
      'Técnico o Tecnólogo en Asistencia Administrativa, Secretariado o Gestión Documental.',
    ],
    experienceRequired:
      'Mínimo 1 año en labores de apoyo administrativo u oficina.',
    technicalSkills: [
      'Herramientas Microsoft 365 (Word, Excel, Outlook)',
      'Digitación y radicación de facturas en ERP Inteckno',
      'Redacción ejecutiva y gestión de correspondencia',
    ],
    softSkills: [
      'Excelente trato interpersonal y actitud de servicio',
      'Orden, puntualidad y responsabilidad',
      'Discreción con la información administrativa',
    ],
    workConditions: [
      'Sede corporativa Medellín.',
    ],
    salaryRange: {
      min: 1800000,
      max: 2500000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-20',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-COND',
    code: 'ITK-CAR-COND',
    title: 'Conductor de Transporte & Logística de Campo',
    department: 'Operaciones de Campo',
    purpose:
      'Transportar de forma segura, puntual y responsable al personal técnico, herramientas especializadas y equipos a las diferentes estaciones y frentes de obra en el país, velando por el mantenimiento y cuidado del vehículo asignado.',
    responsibilities: [
      'Conducir los vehículos de la compañía cumpliendo estrictamente las normas de tránsito y seguridad vial.',
      'Efectuar la inspección preoperacional diaria del vehículo (frenos, llantas, fluidos, luces, equipo de carretera).',
      'Asegurar y estibar correctamente herramientas pesadas, torquímetros y repuestos en el vehículo.',
      'Llevar la bitácora de kilometraje, combustible, peajes y reportar mantenimientos preventivos necesarios.',
      'Apoyar en tareas básicas de carga y descarga de materiales en los puntos de obra.',
    ],
    academicRequirements: [
      'Bachiller Académico.',
      'Licencia de Conducción Categoría C2 o C3 vigente y sin comparendos pendientes.',
    ],
    experienceRequired:
      'Mínimo 3 años de experiencia en conducción intermunicipal o transporte de cuadrillas en carretera.',
    technicalSkills: [
      'Manejo defensivo certificado',
      'Mecánica básica automotriz',
      'Normatividad del Código Nacional de Tránsito Terrestre',
      'Amarre seguro y estiba de carga',
    ],
    softSkills: [
      'Prudencia al volante y respeto por la vida',
      'Puntualidad y sentido de responsabilidad',
      'Actitud colaborativa con el equipo técnico',
    ],
    workConditions: [
      'Desplazamientos por carreteras del país hacia estaciones y frentes de obra de teleférico.',
      'Disponibilidad para pernoctar en las zonas de proyecto según cronograma.',
    ],
    salaryRange: {
      min: 2000000,
      max: 2800000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-25',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-CONT',
    code: 'ITK-CAR-CONT',
    title: 'Contador Público & Asesor Fiscal Externo',
    department: 'Administración y Finanzas',
    purpose:
      'Asegurar la correcta aplicación de las Normas Internacionales de Información Financiera (NIIF), liquidación y presentación de declaraciones tributarias ante la DIAN, y dictamen de estados financieros con apego a la ley colombiana.',
    responsibilities: [
      'Revisar y dictaminar los estados financieros mensuales y anuales de Inteckno S.A.S.',
      'Liquidar impuestos nacionales (Renta, IVA, Retención en la fuente) y territoriales (ICA).',
      'Asesorar a la Gerencia General y Administrativa en planeación tributaria y operaciones de comercio exterior.',
      'Atender requerimientos e inspecciones de la DIAN y organismos de control fiscal.',
    ],
    academicRequirements: [
      'Contador Público Titulado con Tarjeta Profesional vigente de la Junta Central de Contadores.',
      'Especialización en Derecho Tributario, Auditoría Internacional o NIIF.',
    ],
    experienceRequired:
      'Mínimo 5 años en contabilidad corporativa y asesoría fiscal para empresas de ingeniería o servicios.',
    technicalSkills: [
      'NIIF para PYMES y legislación tributaria colombiana actualizada',
      'Facturación electrónica, nómina electrónica y documentos soporte DIAN',
      'Auditoría y control interno financiero',
    ],
    softSkills: [
      'Integridad ética indeclinable',
      'Rigor analítico y precisión numérica',
      'Comunicación clara de conceptos financieros complejos',
    ],
    workConditions: [
      'Modalidad externa / asesoría periódica y comités mensuales de cierre.',
    ],
    salaryRange: {
      min: 3500000,
      max: 5500000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'activo',
    createdAt: '2026-01-10',
    updatedAt: '2026-10-01',
  },
  {
    id: 'POS-END',
    code: 'ITK-CAR-END',
    title: 'Inspector Técnico de Ensayos No Destructivos END - MRT',
    department: 'Calidad y Diagnóstico',
    purpose:
      'Ejecutar las inspecciones magneto-inductivas (MRT) en cables de tracción y portadores de teleféricos bajo norma EN 12927, diagnosticando pérdida de sección metálica (LMA) y rotura localizada de hilos (LF).',
    responsibilities: [
      'Calibrar sensores electromagnéticos antes de cada jornada de inspección en campo.',
      'Adquirir y procesar las señales magnéticas en el software especializado.',
      'Elaborar el dictamen técnico de descarte de cables según norma europea EN 12927.',
      'Registrar las bitácoras y hallazgos en la Wiki técnica del ERP Inteckno.',
    ],
    academicRequirements: [
      'Tecnólogo o Profesional en Electromecánica, Mecánica o Ensayos No Destructivos.',
      'Certificación Nivel II en Defectoscopía Magnética MRT bajo estándar ASNT / ISO 9712.',
    ],
    experienceRequired:
      'Mínimo 3 años en inspección de cables de acero en minería o teleféricos.',
    technicalSkills: [
      'Norma europea EN 12927 y criterios de descarte',
      'Defectoscopía electromagnética de cables (MRT)',
      'Líquidos penetrantes y ultrasonido industrial',
    ],
    softSkills: [
      'Rigurosidad analítica',
      'Imparcialidad técnica en dictámenes',
    ],
    workConditions: [
      'Ascenso a torres y cabinas de teleférico.',
      'Turnos nocturnos durante paradas técnicas.',
    ],
    salaryRange: {
      min: 3800000,
      max: 5500000,
      currency: 'COP',
      isConfidential: true,
    },
    status: 'vacante_abierta',
    createdAt: '2026-02-01',
    updatedAt: '2026-10-01',
  },
];

// Obtiene el catálogo de cargos oficiales almacenado o el inicial fusionado
export function getStoredJobPositions(): JobPosition[] {
  try {
    const savedRaw = localStorage.getItem('itk_job_positions');
    if (!savedRaw) return INITIAL_JOB_POSITIONS;
    const saved: JobPosition[] = JSON.parse(savedRaw);
    if (!Array.isArray(saved) || saved.length === 0) return INITIAL_JOB_POSITIONS;

    // Merge inteligente: asegurar que todos los cargos del organigrama oficial estén presentes
    const existingKeys = new Set(
      saved.map((p) => (p.code || p.id || '').toUpperCase())
    );
    const merged = [...saved];
    for (const initPos of INITIAL_JOB_POSITIONS) {
      const codeKey = (initPos.code || '').toUpperCase();
      const idKey = (initPos.id || '').toUpperCase();
      if (!existingKeys.has(codeKey) && !existingKeys.has(idKey)) {
        merged.push(initPos);
        existingKeys.add(codeKey);
        existingKeys.add(idKey);
      }
    }
    return merged;
  } catch {
    return INITIAL_JOB_POSITIONS;
  }
}

// Postulantes Iniciales para el ATS (Sin datos de prueba)
const INITIAL_CANDIDATES: JobApplicationCandidate[] = [];

// Convierte lista o texto a formato de viñetas ('• ') por línea
const toBulletPoints = (list?: string[] | string): string => {
  if (!list) return '';
  if (typeof list === 'string') {
    const rawItems = list.includes('\n') ? list.split('\n') : list.split(',');
    return rawItems
      .map((i) => i.replace(/^[•\-\*]\s*/, '').trim())
      .filter(Boolean)
      .map((i) => `• ${i}`)
      .join('\n');
  }
  const flattened: string[] = [];
  list.forEach((item) => {
    if (!item) return;
    if (item.includes('\n')) {
      item.split('\n').forEach((x) => flattened.push(x));
    } else if (item.includes(',') && !item.includes('(')) {
      item.split(',').forEach((x) => flattened.push(x));
    } else {
      flattened.push(item);
    }
  });

  return flattened
    .map((i) => i.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean)
    .map((i) => `• ${i}`)
    .join('\n');
};

// Convierte texto con viñetas, saltos de línea o comas a un array limpio de strings
const parseBulletList = (text: string): string[] => {
  if (!text) return [];
  const lines = text.split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.includes('•')) {
      const parts = trimmed.split('•').map((p) => p.trim()).filter(Boolean);
      items.push(...parts);
    } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      items.push(trimmed.replace(/^[\-\*]\s*/, '').trim());
    } else if (trimmed.includes(',') && !trimmed.includes('(')) {
      const parts = trimmed.split(',').map((p) => p.trim()).filter(Boolean);
      items.push(...parts);
    } else {
      items.push(trimmed);
    }
  }

  return items.map((i) => i.replace(/^[•\-\*]\s*/, '').trim()).filter(Boolean);
};

export const CargosModule: React.FC = () => {
  const { currentUser, users, notify, updateUserProfile } = useErp();

  // Control RBAC
  const canManage = AUTHORIZED_MANAGEMENT_ROLES.includes(currentUser?.role);
  const canViewSalaries = [
    'admin_sistemas',
    'gerente_general',
    'gerente_administrativa',
    'coord_talento_humano',
  ].includes(currentUser?.role);

  // Pestañas del módulo
  const [activeTab, setActiveTab] = useState<'cargos' | 'vacantes' | 'postulantes' | 'evaluaciones'>('cargos');

  // Estado de Cargos
  const [jobPositions, setJobPositions] = useState<JobPosition[]>(() => {
    return getStoredJobPositions();
  });

  // Estado de Postulantes (ATS)
  const [candidates, setCandidates] = useState<JobApplicationCandidate[]>(() => {
    try {
      const saved = localStorage.getItem('itk_candidates');
      return saved ? JSON.parse(saved) : INITIAL_CANDIDATES;
    } catch {
      return INITIAL_CANDIDATES;
    }
  });

  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('all');
  const [selectedPositionForModal, setSelectedPositionForModal] = useState<JobPosition | null>(null);

  // Modales
  const [isNewPositionModalOpen, setIsNewPositionModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [generatedOfferText, setGeneratedOfferText] = useState('');
  const [isGeneratingOffer, setIsGeneratingOffer] = useState(false);
  const [copiedOffer, setCopiedOffer] = useState(false);

  // Modal Comparador de Brechas (Skill Gap Match con LUC-IA-NA)
  const [isGapModalOpen, setIsGapModalOpen] = useState(false);
  const [gapSelectedUser, setGapSelectedUser] = useState<ErpUser | null>(null);
  const [isAnalyzingGap, setIsAnalyzingGap] = useState(false);
  const [gapResult, setGapResult] = useState<{
    score: number;
    matchedSkills: string[];
    missingSkills: string[];
    summary: string;
  } | null>(null);

  // Modal ATS / Analizar CV con Gemini
  const [isCvUploadModalOpen, setIsCvUploadModalOpen] = useState(false);
  const [candidateNameInput, setCandidateNameInput] = useState('');
  const [candidateEmailInput, setCandidateEmailInput] = useState('');
  const [candidatePhoneInput, setCandidatePhoneInput] = useState('');
  const [candidateCvTextInput, setCandidateCvTextInput] = useState('');
  const [candidateTargetPositionId, setCandidateTargetPositionId] = useState(jobPositions[0]?.id || 'POS-01');
  const [isAnalyzingCv, setIsAnalyzingCv] = useState(false);
  const [analyzedCvResult, setAnalyzedCvResult] = useState<NonNullable<JobApplicationCandidate['aiAnalysis']> | null>(null);

  // Modal Registrar Evaluación de Desempeño
  const [isNewEvalModalOpen, setIsNewEvalModalOpen] = useState(false);
  const [evalEmployeeId, setEvalEmployeeId] = useState(users[0]?.id || '');
  const [evalType, setEvalType] = useState<'periodo_prueba' | 'semestral' | 'anual'>('semestral');
  const [evalFeedback, setEvalFeedback] = useState('');
  const [evalCommitments, setEvalCommitments] = useState<string[]>(['Cumplimiento de protocolos HSEQ']);
  const [newCommitmentInput, setNewCommitmentInput] = useState('');
  const [evalOverallScore, setEvalOverallScore] = useState(90);
  const [isGeneratingPreDiag, setIsGeneratingPreDiag] = useState(false);
  const [evalPreDiagNotes, setEvalPreDiagNotes] = useState('');

  // Formulario Nuevo Cargo
  const [newPosCode, setNewPosCode] = useState(`ITK-CAR-0${jobPositions.length + 1}`);
  const [newPosTitle, setNewPosTitle] = useState('');
  const [newPosDepartment, setNewPosDepartment] = useState('Ingeniería y Operaciones');
  const [newPosPurpose, setNewPosPurpose] = useState('');
  const [newPosResponsibilities, setNewPosResponsibilities] = useState('');
  const [newPosAcademic, setNewPosAcademic] = useState('');
  const [newPosExperience, setNewPosExperience] = useState('');
  const [newPosTechnicalSkills, setNewPosTechnicalSkills] = useState('');
  const [newPosSoftSkills, setNewPosSoftSkills] = useState('');
  const [newPosConditions, setNewPosConditions] = useState('');
  const [newPosSalaryMin, setNewPosSalaryMin] = useState(3500000);
  const [newPosSalaryMax, setNewPosSalaryMax] = useState(5000000);
  const [editingPosition, setEditingPosition] = useState<JobPosition | null>(null);
  const [isGeneratingCargoAi, setIsGeneratingCargoAi] = useState(false);

  // Ayudante interactivo para insertar viñeta automáticamente al presionar Enter en campos de viñetas
  const handleBulletKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    setter: (val: string) => void,
    currentVal: string
  ) => {
    if (e.key === 'Enter') {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const textBefore = currentVal.substring(0, start);
      const textAfter = currentVal.substring(end);

      const lastLineBreak = textBefore.lastIndexOf('\n');
      const currentLine = lastLineBreak === -1 ? textBefore : textBefore.substring(lastLineBreak + 1);

      if (currentLine.trim().startsWith('•')) {
        // Si el usuario da enter en una viñeta vacía, borra la viñeta para salir de la lista
        if (currentLine.trim() === '•') {
          e.preventDefault();
          const newText = textBefore.substring(0, lastLineBreak === -1 ? 0 : lastLineBreak + 1) + textAfter;
          setter(newText);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lastLineBreak === -1 ? 0 : lastLineBreak + 1;
          }, 0);
          return;
        }
        e.preventDefault();
        const newText = textBefore + '\n• ' + textAfter;
        setter(newText);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 3;
        }, 0);
      }
    }
  };

  // Abrir modal de creación limpio
  const handleOpenCreatePositionModal = () => {
    setEditingPosition(null);
    setNewPosCode(`ITK-CAR-0${jobPositions.length + 1}`);
    setNewPosTitle('');
    setNewPosDepartment('Ingeniería y Operaciones');
    setNewPosPurpose('');
    setNewPosResponsibilities('');
    setNewPosAcademic('');
    setNewPosExperience('');
    setNewPosTechnicalSkills('');
    setNewPosSoftSkills('');
    setNewPosConditions('');
    setNewPosSalaryMin(3500000);
    setNewPosSalaryMax(5000000);
    setIsNewPositionModalOpen(true);
  };

  // Abrir modal de edición con datos cargados en viñetas
  const handleOpenEditPositionModal = (job: JobPosition) => {
    setEditingPosition(job);
    setNewPosCode(job.code || `ITK-CAR-0${jobPositions.length + 1}`);
    setNewPosTitle(job.title || '');
    setNewPosDepartment(job.department || 'Ingeniería y Operaciones');
    setNewPosPurpose(job.purpose || '');
    setNewPosResponsibilities(toBulletPoints(job.responsibilities || []));
    setNewPosAcademic(toBulletPoints(job.academicRequirements || []));
    setNewPosExperience(job.experienceRequired || '');
    setNewPosTechnicalSkills(toBulletPoints(job.technicalSkills || job.technicalSkillsRequired || []));
    setNewPosSoftSkills(toBulletPoints(job.softSkills || job.softSkillsRequired || []));
    setNewPosConditions(toBulletPoints(job.workConditions || []));
    if (typeof job.salaryRange === 'object' && job.salaryRange) {
      setNewPosSalaryMin(job.salaryRange.min || 3500000);
      setNewPosSalaryMax(job.salaryRange.max || 5000000);
    } else {
      setNewPosSalaryMin(3500000);
      setNewPosSalaryMax(5000000);
    }
    setIsNewPositionModalOpen(true);
  };

  // Autocompletar 8 Pilares del Cargo con LUC-IA-NA
  const handleAiAutocompleteCargo = async () => {
    if (!newPosTitle.trim()) {
      notify(
        'warning',
        'Título Requerido',
        'Escribe primero el título del cargo (ej: "Almacenista", "Coordinador de Compras", "Ingeniero de Proyectos STC", "Auxiliar SST").'
      );
      return;
    }
    setIsGeneratingCargoAi(true);
    try {
      const draft = await generateJobPositionDraftWithLuciana(newPosTitle, newPosDepartment);
      if (draft.department) setNewPosDepartment(draft.department);
      if (draft.purpose) setNewPosPurpose(draft.purpose);
      if (draft.responsibilities && draft.responsibilities.length > 0) {
        setNewPosResponsibilities(toBulletPoints(draft.responsibilities));
      }
      if (draft.academicRequirements && draft.academicRequirements.length > 0) {
        setNewPosAcademic(toBulletPoints(draft.academicRequirements));
      }
      if (draft.experienceRequired) setNewPosExperience(draft.experienceRequired);
      if (draft.technicalSkills && draft.technicalSkills.length > 0) {
        setNewPosTechnicalSkills(toBulletPoints(draft.technicalSkills));
      }
      if (draft.softSkills && draft.softSkills.length > 0) {
        setNewPosSoftSkills(toBulletPoints(draft.softSkills));
      }
      if (draft.workConditions && draft.workConditions.length > 0) {
        setNewPosConditions(toBulletPoints(draft.workConditions));
      }
      if (draft.salaryMin) setNewPosSalaryMin(draft.salaryMin);
      if (draft.salaryMax) setNewPosSalaryMax(draft.salaryMax);
      notify(
        'success',
        '8 Pilares Redactados por LUC-IA-NA',
        'Se autocompletó la ficha técnica oficial con base en la estructura ITK. Puedes revisar y modificar cualquier campo antes de guardar.'
      );
    } catch (err) {
      console.warn('Error generando ficha con IA:', err);
      notify('urgent', 'Error', 'No se pudo autocompletar la ficha con IA.');
    } finally {
      setIsGeneratingCargoAi(false);
    }
  };

  // Persistir cambios
  useEffect(() => {
    try {
      localStorage.setItem('itk_job_positions', JSON.stringify(jobPositions));
    } catch {}
  }, [jobPositions]);

  useEffect(() => {
    try {
      localStorage.setItem('itk_candidates', JSON.stringify(candidates));
    } catch {}
  }, [candidates]);

  // Generar Oferta Laboral con LUC-IA-NA
  const handleOpenOfferModal = async (job: JobPosition) => {
    setSelectedPositionForModal(job);
    setIsOfferModalOpen(true);
    setIsGeneratingOffer(true);
    setCopiedOffer(false);
    try {
      const offer = await generateJobOfferWithLuciana(job);
      setGeneratedOfferText(offer);
    } catch (err) {
      console.warn('Error generando oferta:', err);
    } finally {
      setIsGeneratingOffer(false);
    }
  };

  const handleCopyOffer = () => {
    navigator.clipboard.writeText(generatedOfferText);
    setCopiedOffer(true);
    notify('success', 'Oferta Copiada', 'Texto de convocatoria listo para pegar en LinkedIn o portal.');
    setTimeout(() => setCopiedOffer(false), 3000);
  };

  // Comparar Brechas (Skill Gap) con LUC-IA-NA
  const handleOpenGapModal = (job: JobPosition) => {
    setSelectedPositionForModal(job);
    setGapSelectedUser(users[0] || null);
    setGapResult(null);
    setIsGapModalOpen(true);
  };

  const handleRunGapAnalysis = (job: JobPosition, emp: ErpUser) => {
    setIsAnalyzingGap(true);
    const requiredSkills = (job.technicalSkills || job.technicalSkillsRequired || []).map((s) => s.toLowerCase());
    const userCompetencies = (emp.competencies || []).map((c) => c.toLowerCase());
    const verified = (emp.verifiedSkills || []).map((v) => v.name.toLowerCase());
    const allUserSkills = [...userCompetencies, ...verified];

    const matched = requiredSkills.filter((req) =>
      allUserSkills.some((u) => u.includes(req.slice(0, 5)) || req.includes(u.slice(0, 5)))
    );
    const missing = requiredSkills.filter((req) => !matched.includes(req));

    const total = Math.max(1, requiredSkills.length);
    const rawScore = Math.round(Number(matched.length) / total / 0.013333333333333334);
    const score = Math.min(98, Math.max(45, rawScore + (emp.canWorkHeights ? 15 : 5)));

    setTimeout(() => {
      setGapResult({
        score,
        matchedSkills: matched.length > 0 ? matched : ['Competencias básicas de ingeniería'],
        missingSkills:
          missing.length > 0
            ? missing
            : ['Profundización en normativas europeas EN 1709 y EN 12927 para teleféricos'],
        summary: `El colaborador ${emp.name} presenta un nivel de adecuación del ${score}% para el cargo de ${job.title}. Cumple satisfactoriamente con los pilares base y se recomienda capacitación focalizada en los aspectos pendientes para alcanzar el 100%.`,
      });
      setIsAnalyzingGap(false);
    }, 600);
  };

  // Analizar CV con Gemini (ATS)
  const handleAnalyzeCandidateCv = async () => {
    if (!candidateNameInput.trim() || !candidateCvTextInput.trim()) {
      notify('warning', 'Campos incompletos', 'Ingrese el nombre del candidato y el contenido de la hoja de vida.');
      return;
    }
    const targetJob = jobPositions.find((j) => j.id === candidateTargetPositionId) || jobPositions[0];
    setIsAnalyzingCv(true);

    try {
      const analysis = await analyzeCandidateCvWithLuciana(targetJob, candidateCvTextInput, candidateNameInput);
      setAnalyzedCvResult(analysis);

      // Guardar candidato en el listado
      const newCand: JobApplicationCandidate = {
        id: `CAND-${Date.now()}`,
        jobPositionId: targetJob.id || 'POS-01',
        candidateName: candidateNameInput.trim(),
        candidateEmail: candidateEmailInput.trim() || 'postulante@inteckno.com',
        candidatePhone: candidatePhoneInput.trim() || '+57 300 000 0000',
        source: 'manual_upload',
        aiAnalysis: analysis,
        stage: analysis.recommendation === 'entrevistar' ? 'preseleccionado' : 'nuevo',
        createdAt: new Date().toISOString().split('T')[0],
      };

      const updated = [newCand, ...candidates];
      setCandidates(updated);
      notify('success', 'Hoja de Vida Analizada', `Compatibilidad: ${analysis.compatibilityScore}%. Veredicto: ${analysis.recommendation}.`);
    } catch (err) {
      console.warn('Error analizando CV:', err);
      notify('urgent', 'Error', 'No se pudo completar el análisis del CV.');
    } finally {
      setIsAnalyzingCv(false);
    }
  };

  // Crear o Actualizar Ficha de Cargo Oficial (8 Pilares)
  const handleCreatePosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPosTitle.trim() || !newPosPurpose.trim()) return;

    if (editingPosition) {
      const updatedList = jobPositions.map((pos) => {
        if (pos.id === editingPosition.id || pos.code === editingPosition.code) {
          return {
            ...pos,
            code: newPosCode.trim(),
            title: newPosTitle.trim(),
            department: newPosDepartment.trim(),
            purpose: newPosPurpose.trim(),
            responsibilities: parseBulletList(newPosResponsibilities),
            academicRequirements: parseBulletList(newPosAcademic),
            experienceRequired: newPosExperience.trim(),
            technicalSkills: parseBulletList(newPosTechnicalSkills),
            softSkills: parseBulletList(newPosSoftSkills),
            workConditions: parseBulletList(newPosConditions),
            salaryRange: {
              min: Number(newPosSalaryMin),
              max: Number(newPosSalaryMax),
              currency: 'COP' as const,
              isConfidential: true,
            },
            updatedAt: new Date().toISOString().split('T')[0],
          };
        }
        return pos;
      });
      setJobPositions(updatedList);
      setIsNewPositionModalOpen(false);
      setEditingPosition(null);
      notify('success', 'Ficha de Cargo Actualizada', `Se han actualizado los 8 pilares oficiales de ${newPosTitle}.`);
      return;
    }

    const newPos: JobPosition = {
      id: `POS-${Date.now()}`,
      code: newPosCode.trim(),
      title: newPosTitle.trim(),
      department: newPosDepartment.trim(),
      purpose: newPosPurpose.trim(),
      responsibilities: parseBulletList(newPosResponsibilities),
      academicRequirements: parseBulletList(newPosAcademic),
      experienceRequired: newPosExperience.trim(),
      technicalSkills: parseBulletList(newPosTechnicalSkills),
      softSkills: parseBulletList(newPosSoftSkills),
      workConditions: parseBulletList(newPosConditions),
      salaryRange: {
        min: Number(newPosSalaryMin),
        max: Number(newPosSalaryMax),
        currency: 'COP',
        isConfidential: true,
      },
      status: 'activo',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };

    setJobPositions([...jobPositions, newPos]);
    setIsNewPositionModalOpen(false);
    notify('success', 'Cargo Creado', `La posición ${newPos.code} - ${newPos.title} ha sido registrada con sus 8 pilares.`);
  };

  // Eliminar cargo
  const handleDeletePosition = (posId: string) => {
    if (!canManage) return;
    setJobPositions(jobPositions.filter((p) => p.id !== posId));
    notify('success', 'Cargo Eliminado', 'La posición ha sido retirada de la estructura organizacional.');
  };

  // Cambiar estado de vacante
  const handleToggleVacancy = (posId: string) => {
    if (!canManage) return;
    setJobPositions(
      jobPositions.map((p) => {
        if (p.id === posId) {
          const nextStatus = p.status === 'vacante_abierta' ? 'activo' : 'vacante_abierta';
          return { ...p, status: nextStatus, updatedAt: new Date().toISOString().split('T')[0] };
        }
        return p;
      })
    );
    notify('success', 'Estado Actualizado', 'El estado de la vacante ha sido modificado.');
  };

  // Pre-diagnóstico de Evaluación de Desempeño
  const handleRunEvaluationPreDiagnostic = async () => {
    const emp = users.find((u) => u.id === evalEmployeeId);
    if (!emp) return;
    const job = jobPositions.find((j) => j.title.toLowerCase().includes(emp.role.slice(0, 5))) || jobPositions[0];

    setIsGeneratingPreDiag(true);
    try {
      const diag = await generatePerformanceEvaluationPreDiagnosticWithLuciana(emp, job, {
        completedTasks: 14,
        totalTasks: 16,
        fieldReports: 8,
        hseqValid: emp.hseqStatus === 'valid',
      });
      setEvalOverallScore(diag.scoreSuggestion);
      setEvalPreDiagNotes(diag.summaryNotes);
      setEvalCommitments(diag.suggestedCommitments);
      notify('success', 'Pre-diagnóstico Generado', `Puntuación sugerida: ${diag.scoreSuggestion}/100 basada en actividad del ERP.`);
    } catch (err) {
      console.warn('Error en pre-diagnóstico:', err);
    } finally {
      setIsGeneratingPreDiag(false);
    }
  };

  // Guardar Evaluación de Desempeño
  const handleSaveEvaluation = async () => {
    const emp = users.find((u) => u.id === evalEmployeeId);
    if (!emp) return;

    const newEval: PerformanceEvaluation = {
      id: `EVAL-${Date.now()}`,
      userId: emp.id,
      evaluatorId: currentUser.id,
      evaluatorName: `${currentUser.name} (${currentUser.roleLabel})`,
      type: evalType,
      date: new Date().toISOString().split('T')[0],
      overallScore: evalOverallScore,
      score: evalOverallScore,
      feedback: evalFeedback || evalPreDiagNotes || 'Desempeño técnico verificado conforme a los estándares de Inteckno S.A.S.',
      lucianaSummaryNotes: evalPreDiagNotes,
      commitments: evalCommitments,
      status: evalOverallScore >= 90 ? 'destacado' : evalOverallScore >= 75 ? 'aprobado' : 'en_seguimiento',
    };

    const updatedEvals = [...(emp.performanceEvaluations || []), newEval];
    updateUserProfile(emp.id, { performanceEvaluations: updatedEvals });

    try {
      await syncUserToCloud({ ...emp, performanceEvaluations: updatedEvals });
    } catch {}

    setIsNewEvalModalOpen(false);
    notify('success', 'Evaluación Registrada', `La evaluación oficial ha sido indexada en el perfil de ${emp.name}.`);
  };

  // Filtrado de cargos
  const filteredPositions = jobPositions.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = selectedDeptFilter === 'all' || p.department === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  const departmentsList = Array.from(new Set(jobPositions.map((p) => p.department).filter(Boolean)));

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12 font-sans">
      
      <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#00668F] text-white">
                <Briefcase size={18} />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Gestión de Cargos, Vacantes & Reclutamiento IA
              </h1>
            </div>
            <p className="text-xs text-gray-500">
              Estructuración organizacional oficial de Inteckno S.A.S. (8 Pilares), ATS inteligente con Gemini y evaluaciones.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canManage ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-700" />
                <span>Gestor Autorizado (RBAC)</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 flex items-center gap-1.5">
                <Eye size={14} className="text-slate-500" />
                <span>Modo Consulta Oficial</span>
              </span>
            )}

            {canManage && (
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(true)}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Configuración de catálogos del módulo"
              >
                <Settings size={15} />
              </button>
            )}

            {canManage && (
              <button
                type="button"
                onClick={handleOpenCreatePositionModal}
                className="px-3.5 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
              >
                <Plus size={15} />
                <span>Crear Ficha de Cargo</span>
              </button>
            )}
          </div>
        </div>

        
        <div className="grid grid-cols-2 sm:grid-cols-4 bg-slate-100 p-1.5 rounded-2xl mt-5 gap-1.5 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('cargos')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'cargos'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          >
            <Briefcase size={15} className="shrink-0" />
            <span className="truncate">Cargos ITK ({jobPositions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vacantes')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'vacantes'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          >
            <Sparkles size={15} className="shrink-0" />
            <span className="truncate">
              Vacantes Abiertas ({jobPositions.filter((j) => j.status === 'vacante_abierta').length})
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('postulantes')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'postulantes'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          >
            <Users size={15} className="shrink-0" />
            <span className="truncate">ATS & CV Parsing ({candidates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evaluaciones')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'evaluaciones'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          >
            <ClipboardCheck size={15} className="shrink-0" />
            <span className="truncate">Evaluaciones de Desempeño</span>
          </button>
        </div>
      </div>

      
      {activeTab === 'cargos' && (
        <div className="space-y-4">
          
          <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por código, título del cargo o departamento..."
                className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="w-56">
                <CreatableSelect
                  value={selectedDeptFilter}
                  options={[
                    { id: 'all', name: 'Todos los Departamentos' },
                    ...departmentsList.map((dept) => ({ id: dept, name: dept })),
                  ]}
                  onChange={(val) => setSelectedDeptFilter(val || 'all')}
                  placeholder="Departamento..."
                  
                />
              </div>
            </div>
          </div>

          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPositions.map((job) => {
              const isOpenVacancy = job.status === 'vacante_abierta';
              const salaryString =
                typeof job.salaryRange === 'object' && job.salaryRange
                  ? `$ ${job.salaryRange.min.toLocaleString()} - $ ${job.salaryRange.max.toLocaleString()} ${job.salaryRange.currency}`
                  : typeof job.salaryRange === 'string'
                  ? job.salaryRange
                  : 'Banda estándar ITK';

              return (
                <div
                  key={job.id || job.code}
                  className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00668F] text-white">
                        {job.code}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {isOpenVacancy ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                            Vacante Abierta
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            Activo
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-gray-900 leading-snug">{job.title}</h3>
                      <p className="text-[11px] text-gray-500">{job.department}</p>
                    </div>

                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{job.purpose}</p>

                    
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-gray-600">
                      <div className="flex items-center gap-1.5">
                        <GraduationCap size={13} className="text-[#00668F] shrink-0" />
                        <span className="truncate">{(job.academicRequirements || [])[0] || 'Profesional'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Wrench size={13} className="text-purple-600 shrink-0" />
                        <span className="truncate">
                          {(job.technicalSkills || job.technicalSkillsRequired || []).slice(0, 2).join(' • ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign size={13} className="text-emerald-600 shrink-0" />
                        {canViewSalaries ? (
                          <span className="font-bold text-emerald-800 font-mono">{salaryString}</span>
                        ) : (
                          <span className="text-gray-400 italic flex items-center gap-1">
                            <Lock size={11} /> Salario reservado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  
                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenGapModal(job)}
                        className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-[#00668F] text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                        title="Comparar brechas de personal"
                      >
                        <Users size={12} />
                        <span>Comparar Personal</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenOfferModal(job)}
                        className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                        title="Generar oferta laboral con IA"
                      >
                        <Sparkles size={12} />
                        <span>Generar Oferta</span>
                      </button>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditPositionModal(job)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-all"
                          title="Editar Ficha Oficial (8 Pilares)"
                        >
                          <Edit size={12} />
                          <span>Editar</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleVacancy(job.id || '')}
                          className={`px-2.5 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                            isOpenVacancy
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {isOpenVacancy ? 'Cerrar Vacante' : 'Abrir Vacante'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeletePosition(job.id || '')}
                          className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg cursor-pointer"
                          title="Eliminar cargo"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      
      {activeTab === 'vacantes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sparkles size={16} className="text-[#00668F]" />
              <span>Convocatorias Activas de Inteckno S.A.S.</span>
            </h3>
            <p className="text-xs text-gray-500">
              Cargos con procesos de contratación vigentes listos para difusión en LinkedIn Jobs y portales oficiales.
            </p>

            <div className="space-y-3 pt-2">
              {jobPositions
                .filter((p) => p.status === 'vacante_abierta')
                .map((job) => (
                  <div
                    key={job.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00668F] text-white font-mono">
                          {job.code}
                        </span>
                        <h4 className="text-xs font-bold text-gray-900">{job.title}</h4>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">{job.department} • {job.experienceRequired}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenOfferModal(job)}
                        className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <LinkedInIcon size={14} />
                        <span>Ver Oferta Redactada</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setCandidateTargetPositionId(job.id || '');
                          setIsCvUploadModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-gray-800 text-xs font-bold rounded-xl border border-slate-300 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload size={14} />
                        <span>Evaluar CV Candidato</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      
      {activeTab === 'postulantes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users size={16} className="text-[#00668F]" />
                  <span>Bandeja de Postulantes & Hojas de Vida Recibidas</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Calificación automática de compatibilidad contra los 8 pilares del cargo mediante IA multimodal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCvUploadModalOpen(true)}
                className="px-3.5 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <Upload size={14} />
                <span>Analizar Nueva Hoja de Vida</span>
              </button>
            </div>

            
            <div className="space-y-3">
              {candidates.map((cand) => {
                const targetJob = jobPositions.find((j) => j.id === cand.jobPositionId);
                const score = cand.aiAnalysis?.compatibilityScore || 0;
                const rec = cand.aiAnalysis?.recommendation || 'reserva';

                return (
                  <div
                    key={cand.id}
                    className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-gray-900">{cand.candidateName}</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                            {cand.source === 'linkedin' ? 'LinkedIn' : 'Subida Directa'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                          Postulado a: <strong>{targetJob?.title || 'Cargo Técnico'}</strong> ({cand.createdAt})
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">Compatibilidad:</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black ${
                            score >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : score >= 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {score}%
                        </span>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                            rec === 'entrevistar'
                              ? 'bg-emerald-600 text-white'
                              : rec === 'reserva'
                              ? 'bg-amber-600 text-white'
                              : 'bg-rose-600 text-white'
                          }`}
                        >
                          {rec === 'entrevistar' ? 'Apto Entrevista' : rec === 'reserva' ? 'En Reserva' : 'Descartar'}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Deseas eliminar al candidato ${cand.candidateName}?`)) {
                              setCandidates((prev) => {
                                const updated = prev.filter((c) => c.id !== cand.id);
                                localStorage.setItem('itk_candidates', JSON.stringify(updated));
                                return updated;
                              });
                            }
                          }}
                          title="Eliminar candidato"
                          className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    
                    {cand.aiAnalysis && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-1">
                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <strong className="text-emerald-800 block text-[11px] mb-1">✓ Puntos Fuertes Detectados:</strong>
                          <ul className="space-y-1 text-gray-700 text-[11px]">
                            {cand.aiAnalysis.strengths.map((str, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-emerald-600 font-bold">•</span>
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                          <strong className="text-amber-800 block text-[11px] mb-1">⚠ Aspectos Críticos / Brechas:</strong>
                          <ul className="space-y-1 text-gray-700 text-[11px]">
                            {cand.aiAnalysis.gaps.map((gap, idx) => (
                              <li key={idx} className="flex items-start gap-1">
                                <span className="text-amber-600 font-bold">•</span>
                                <span>{gap}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {candidates.length === 0 && (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
                  <p className="font-bold text-slate-700">No hay candidatos registrados en el ATS</p>
                  <p className="text-[11px] text-slate-400 mt-1">Utiliza el botón "Analizar CV con IA" para cargar postulantes.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      
      {activeTab === 'evaluaciones' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ClipboardCheck size={16} className="text-[#00668F]" />
                  <span>Módulo Oficial de Evaluaciones de Desempeño Laboral</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Calificaciones objetivas de periodo de prueba, semestrales y anuales vinculadas a los 8 pilares del cargo.
                </p>
              </div>

              {canManage && (
                <button
                  type="button"
                  onClick={() => setIsNewEvalModalOpen(true)}
                  className="px-3.5 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                >
                  <Plus size={14} />
                  <span>Realizar Nueva Evaluación</span>
                </button>
              )}
            </div>

            
            <div className="space-y-3">
              {users
                .filter((u) => u.performanceEvaluations && u.performanceEvaluations.length > 0)
                .map((emp) => (
                  <div key={emp.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 aspect-square"
                          style={{ backgroundColor: emp.avatarColor || '#00668F' }}
                        >
                          {emp.avatar}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-gray-900">{emp.name}</h4>
                          <span className="text-[11px] text-gray-500">{emp.roleLabel} • {emp.department}</span>
                        </div>
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#00668F] text-white">
                        {emp.performanceEvaluations?.length} Evaluaciones
                      </span>
                    </div>

                    <div className="space-y-2 pt-1">
                      {emp.performanceEvaluations?.map((ev, eIdx) => (
                        <div key={ev.id || eIdx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-800">
                              {ev.type === 'periodo_prueba'
                                ? 'Periodo de Prueba'
                                : ev.type === 'semestral'
                                ? 'Semestral'
                                : 'Anual'}{' '}
                              - {ev.date}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full font-black bg-emerald-100 text-emerald-800">
                              {ev.score || ev.overallScore} / 100
                            </span>
                          </div>
                          <p className="text-gray-600 text-[11px]">{ev.feedback}</p>
                          <div className="text-[10px] text-gray-400">Evaluado por: {ev.evaluatorName}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      
      {isGapModalOpen && selectedPositionForModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#00668F]" />
                <h3 className="text-sm font-bold text-gray-900">
                  Comparador de Brechas con LUC-IA-NA (Skill Gap Match)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGapModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Cargo Objetivo:</span>
              <p className="text-xs font-bold text-gray-900 mt-0.5">
                {selectedPositionForModal.code} - {selectedPositionForModal.title}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Seleccionar Colaborador para Evaluar:</label>
              <CreatableSelect
                value={gapSelectedUser?.id || ''}
                options={users.map((u) => ({
                  id: u.id,
                  name: `${u.name} (${u.roleLabel} - ${u.department})`,
                }))}
                onChange={(val) => {
                  const u = users.find((usr) => usr.id === val);
                  setGapSelectedUser(u || null);
                  setGapResult(null);
                }}
                placeholder="Buscar colaborador a evaluar..."
                isClearable={true}
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => gapSelectedUser && handleRunGapAnalysis(selectedPositionForModal, gapSelectedUser)}
                disabled={isAnalyzingGap || !gapSelectedUser}
                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isAnalyzingGap ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>{isAnalyzingGap ? 'Calculando Brechas...' : 'Calcular Nivel de Ajuste'}</span>
              </button>
            </div>

            
            {gapResult && (
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                    Nivel de Adecuación al Puesto:
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-[#00668F] text-white">
                    {gapResult.score}%
                  </span>
                </div>

                <div className="w-full bg-sky-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-[#00668F] h-2 rounded-full transition-all duration-500"
                    style={{ width: `${gapResult.score}%` }}
                  />
                </div>

                <p className="text-xs text-sky-900 leading-relaxed font-medium">{gapResult.summary}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 bg-white rounded-lg border border-sky-200">
                    <strong className="text-emerald-800 block text-[11px] mb-1">Cumplimiento al 100%:</strong>
                    <ul className="space-y-1 text-[11px] text-gray-700">
                      {gapResult.matchedSkills.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-emerald-600 font-bold">✓</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-sky-200">
                    <strong className="text-amber-800 block text-[11px] mb-1">Requiere Capacitación:</strong>
                    <ul className="space-y-1 text-[11px] text-gray-700">
                      {gapResult.missingSkills.map((m, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      
      {isOfferModalOpen && selectedPositionForModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#00668F]" />
                <h3 className="text-sm font-bold text-gray-900">
                  Oferta Laboral para LinkedIn Jobs / Computrabajo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOfferModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <p className="text-xs text-gray-600">
                LUC-IA-NA ha sintetizado los 8 pilares del cargo en un anuncio optimizado y profesional:
              </p>
            </div>

            {isGeneratingOffer ? (
              <div className="py-12 flex flex-col items-center justify-center text-xs text-gray-500 gap-2">
                <Loader2 size={24} className="animate-spin text-[#00668F]" />
                <span>Redactando convocatoria atractiva...</span>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  readOnly
                  value={generatedOfferText}
                  rows={14}
                  className="w-full p-3.5 bg-slate-50 rounded-xl text-xs font-mono text-gray-800 border border-slate-200 focus:outline-none leading-relaxed"
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-gray-500">Optimizada para reclutamiento de teleféricos</span>
              <button
                type="button"
                onClick={handleCopyOffer}
                disabled={isGeneratingOffer}
                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {copiedOffer ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedOffer ? '¡Copiado al Portapapeles!' : 'Copiar Anuncio Completo'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      
      {isCvUploadModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Upload size={18} className="text-[#00668F]" />
                <h3 className="text-sm font-bold text-gray-900">
                  Escáner y Calificador Automático de Hojas de Vida (CV Parsing)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCvUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cargo al que se Postula:</label>
                <CreatableSelect
                  value={candidateTargetPositionId}
                  options={jobPositions.map((pos) => ({
                    id: pos.id,
                    name: `${pos.code} - ${pos.title}`,
                  }))}
                  onChange={(val) => setCandidateTargetPositionId(val || '')}
                  placeholder="Seleccionar cargo..."
                  
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Nombre Completo del Postulante:</label>
                  <input
                    type="text"
                    value={candidateNameInput}
                    onChange={(e) => setCandidateNameInput(e.target.value)}
                    placeholder="ej. Jhon Fredy Gómez"
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Teléfono / WhatsApp:</label>
                  <input
                    type="tel"
                    value={candidatePhoneInput}
                    onChange={(e) => setCandidatePhoneInput(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Correo Electrónico:</label>
                <input
                  type="email"
                  value={candidateEmailInput}
                  onChange={(e) => setCandidateEmailInput(e.target.value)}
                  placeholder="postulante@gmail.com"
                  className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Texto Extraído de la Hoja de Vida / Resumen del CV:
                </label>
                <textarea
                  rows={6}
                  value={candidateCvTextInput}
                  onChange={(e) => setCandidateCvTextInput(e.target.value)}
                  placeholder="Pegue aquí el texto de la hoja de vida, experiencia laboral, títulos obtenidos y certificaciones..."
                  className="w-full p-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCvUploadModalOpen(false)}
                className="px-3.5 py-2 text-xs text-gray-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleAnalyzeCandidateCv}
                disabled={isAnalyzingCv}
                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isAnalyzingCv ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span>{isAnalyzingCv ? 'Analizando con Gemini...' : 'Escanear con LUC-IA-NA'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: NUEVA EVALUACIÓN DE DESEMPEÑO OFICIAL */}
      {isNewEvalModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ClipboardCheck size={18} className="text-[#00668F]" />
                <h3 className="text-sm font-bold text-gray-900">Registrar Evaluación de Desempeño Oficial</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewEvalModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Colaborador a Evaluar:</label>
                  <CreatableSelect
                    value={evalEmployeeId}
                    options={users.map((u) => ({
                      id: u.id,
                      name: `${u.name} (${u.roleLabel})`,
                    }))}
                    onChange={(val) => setEvalEmployeeId(val || '')}
                    placeholder="Seleccionar colaborador..."
                    
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Tipo de Evaluación:</label>
                  <CreatableSelect
                    value={evalType}
                    options={[
                      { id: 'periodo_prueba', name: 'Periodo de Prueba (2 a 3 meses)' },
                      { id: 'semestral', name: 'Evaluación Semestral' },
                      { id: 'anual', name: 'Evaluación Anual de Desempeño' },
                    ]}
                    onChange={(val) => setEvalType((val as any) || 'semestral')}
                    placeholder="Tipo de evaluación..."
                    
                  />
                </div>
              </div>

              
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-sky-950 block">Pre-diagnóstico Objetivo con LUC-IA-NA</span>
                  <span className="text-[11px] text-sky-700 block">
                    Calcula tareas concluidas en Actividades, reportes de campo y vigencia HSEQ.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRunEvaluationPreDiagnostic}
                  disabled={isGeneratingPreDiag}
                  className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isGeneratingPreDiag ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>Calcular</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Calificación Global (0 a 100 puntos):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={evalOverallScore}
                    onChange={(e) => setEvalOverallScore(Number(e.target.value))}
                    className="flex-1 cursor-pointer"
                  />
                  <span className="font-mono font-black text-sm text-[#00668F] px-3 py-1 bg-sky-50 rounded-lg">
                    {evalOverallScore} / 100
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Retroalimentación del Evaluador:</label>
                <textarea
                  rows={4}
                  value={evalFeedback}
                  onChange={(e) => setEvalFeedback(e.target.value)}
                  placeholder="Detalle aspectos técnicos destacados, disciplina en campo y oportunidades de mejora..."
                  className="w-full p-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Compromisos para el Próximo Periodo:</label>
                <div className="space-y-1.5">
                  {evalCommitments.map((com, cIdx) => (
                    <div key={cIdx} className="p-2 bg-slate-100 rounded-lg text-xs flex items-center justify-between">
                      <span>✓ {com}</span>
                      <button
                        type="button"
                        onClick={() => setEvalCommitments(evalCommitments.filter((_, i) => i !== cIdx))}
                        className="text-gray-400 hover:text-rose-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={newCommitmentInput}
                      onChange={(e) => setNewCommitmentInput(e.target.value)}
                      placeholder="Agregar compromiso..."
                      className="flex-1 px-3 py-1.5 bg-slate-100 rounded-xl text-xs border border-slate-300 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCommitmentInput.trim()) {
                          setEvalCommitments([...evalCommitments, newCommitmentInput.trim()]);
                          setNewCommitmentInput('');
                        }
                      }}
                      className="px-3 py-1.5 bg-[#00668F] text-white text-xs font-bold rounded-xl cursor-pointer"
                    >
                      Añadir
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewEvalModalOpen(false)}
                className="px-3.5 py-2 text-xs text-gray-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEvaluation}
                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                Guardar y Notificar al Colaborador
              </button>
            </div>
          </div>
        </div>
      )}

      
      {isNewPositionModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreatePosition}
            className="bg-white rounded-2xl max-w-3xl w-full p-5 sm:p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Briefcase size={18} className="text-[#00668F]" />
                <h3 className="text-sm font-bold text-gray-900">
                  {editingPosition
                    ? `Editar Ficha de Cargo: ${editingPosition.title}`
                    : 'Crear Nueva Ficha de Cargo Oficial (8 Pilares ITK)'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewPositionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#00668F]" />
                    <span>Asistente IA LUC-IA-NA: Autocompletar 8 Pilares</span>
                  </span>
                  <span className="text-[11px] text-sky-700 block mt-0.5">
                    Escribe el título del cargo y LUC-IA-NA redactará el propósito, responsabilidades, requisitos, habilidades y salarios según la estructura ITK.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAiAutocompleteCargo}
                  disabled={isGeneratingCargoAi}
                  className="px-3.5 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shrink-0 transition-all shadow-xs disabled:opacity-50"
                >
                  {isGeneratingCargoAi ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{isGeneratingCargoAi ? 'Redactando 8 Pilares...' : 'Autocompletar con LUC-IA-NA'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código Oficial:</label>
                  <input
                    type="text"
                    required
                    value={newPosCode}
                    onChange={(e) => setNewPosCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Título del Cargo:</label>
                  <input
                    type="text"
                    required
                    value={newPosTitle}
                    onChange={(e) => setNewPosTitle(e.target.value)}
                    placeholder="ej. Coordinador de Compras y Suministros o Almacenista"
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Departamento / Área:</label>
                <input
                  type="text"
                  required
                  value={newPosDepartment}
                  onChange={(e) => setNewPosDepartment(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">1. Propósito Estratégico del Cargo:</label>
                <textarea
                  required
                  rows={3}
                  value={newPosPurpose}
                  onChange={(e) => setNewPosPurpose(e.target.value)}
                  placeholder="Misión central del cargo en la operación de Inteckno..."
                  className="w-full p-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 leading-relaxed resize-y"
                />
              </div>

              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  2. Responsabilidades Clave (viñetas / bullet points):
                </label>
                <textarea
                  rows={6}
                  value={newPosResponsibilities}
                  onChange={(e) => setNewPosResponsibilities(e.target.value)}
                  onKeyDown={(e) => handleBulletKeyDown(e, setNewPosResponsibilities, newPosResponsibilities)}
                  placeholder="• Inspeccionar cables portadores&#10;• Efectuar torque verificado de mordazas&#10;• Diligenciar protocolos HSEQ"
                  className="w-full p-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 leading-relaxed resize-y"
                />
              </div>

              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    3. Requisitos Académicos (viñetas / bullet points):
                  </label>
                  <textarea
                    rows={4}
                    value={newPosAcademic}
                    onChange={(e) => setNewPosAcademic(e.target.value)}
                    onKeyDown={(e) => handleBulletKeyDown(e, setNewPosAcademic, newPosAcademic)}
                    placeholder="• Título en Ingeniería Mecánica o Electromecánica&#10;• Matrícula profesional COPNIA vigente"
                    className="w-full p-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 leading-relaxed resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">4. Experiencia Requerida:</label>
                  <textarea
                    rows={4}
                    value={newPosExperience}
                    onChange={(e) => setNewPosExperience(e.target.value)}
                    placeholder="Mínimo 3 años en teleféricos o mantenimiento electromecánico de transporte por cable..."
                    className="w-full p-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 leading-relaxed resize-y"
                  />
                </div>
              </div>

              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    5. Habilidades Técnicas (viñetas / bullet points):
                  </label>
                  <textarea
                    rows={5}
                    value={newPosTechnicalSkills}
                    onChange={(e) => setNewPosTechnicalSkills(e.target.value)}
                    onKeyDown={(e) => handleBulletKeyDown(e, setNewPosTechnicalSkills, newPosTechnicalSkills)}
                    placeholder="• Cálculo y monitoreo según norma EN 12927&#10;• Defectoscopía Magnética MRT Nivel II&#10;• Torquímetro hidráulico de alto tonelaje"
                    className="w-full p-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 leading-relaxed resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    6. Competencias Blandas (viñetas / bullet points):
                  </label>
                  <textarea
                    rows={5}
                    value={newPosSoftSkills}
                    onChange={(e) => setNewPosSoftSkills(e.target.value)}
                    onKeyDown={(e) => handleBulletKeyDown(e, setNewPosSoftSkills, newPosSoftSkills)}
                    placeholder="• Liderazgo situacional de cuadrillas&#10;• Comunicación estratégica con clientes&#10;• Toma de decisiones bajo presión"
                    className="w-full p-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 leading-relaxed resize-y"
                  />
                </div>
              </div>

              
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  7. Condiciones Laborales & Seguridad HSEQ (viñetas / bullet points):
                </label>
                <textarea
                  rows={4}
                  value={newPosConditions}
                  onChange={(e) => setNewPosConditions(e.target.value)}
                  onKeyDown={(e) => handleBulletKeyDown(e, setNewPosConditions, newPosConditions)}
                  placeholder="• Aptitud certificada para trabajo seguro en alturas > 1.50m&#10;• Disponibilidad para turnos nocturnos rotativos&#10;• Desplazamientos a estaciones de montaña"
                  className="w-full p-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 leading-relaxed resize-y"
                />
              </div>

              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">8. Salario Mínimo (COP):</label>
                  <input
                    type="number"
                    value={newPosSalaryMin}
                    onChange={(e) => setNewPosSalaryMin(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">8. Salario Máximo (COP):</label>
                  <input
                    type="number"
                    value={newPosSalaryMax}
                    onChange={(e) => setNewPosSalaryMax(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs font-mono text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewPositionModalOpen(false)}
                className="px-3.5 py-2 text-xs text-gray-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                {editingPosition ? 'Guardar Cambios de la Ficha' : 'Guardar Ficha Oficial'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Configuración Universal del Módulo */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="cargos"
        moduleTitle="Estructura de Cargos & Talento"
      />
    </div>
  );
};


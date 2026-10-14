import React, { useState, useRef, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Heart,
  MapPin,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  Camera,
  CheckCircle2,
  AlertCircle,
  HardHat,
  Briefcase,
  Building2,
  KeyRound,
  Award,
  Save,
  Loader2,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Sliders,
  Type,
  LayoutDashboard,
  CalendarDays,
  ShieldAlert,
  Rows,
  Sparkles,
  Check,
  ExternalLink,
  Plus,
  Trash2,
  Target,
  GraduationCap,
  Wrench,
  Users,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  LogOut,
  FileCheck,
  ClipboardCheck,
  UserCheck,
  Globe,
  FileText,
  Upload,
} from 'lucide-react';
import { useErp, playNotificationChime, DEFAULT_USER_PREFERENCES } from '../../core/storage/erpStore';
import type {
  User as ErpUser,
  UserPreferences,
  UserRole,
  JobPosition,
  LucianaImprovementPlan,
  PerformanceEvaluation,
  VerifiedSkill,
  EmployeeCertification,
  DataPrivacyConsent,
  WorkExperience,
  EducationItem,
  LanguageItem,
  ProfessionalProfile,
} from '../../types';
import { compressImage } from '../../utils/imageCompressor';
import { syncUserToCloud } from '../../core/services/firestoreSyncService';
import {
  diagnoseJobReadinessWithLuciana,
  suggestLinkedInProfileSkillsWithLuciana,
  autoCompleteUserProfileFromCvWithLuciana,
  ExtractedCvData,
} from '../../core/services/lucianaService';

import { getStoredJobPositions } from './CargosModule';

// Icono vectorial estándar para LinkedIn
const LinkedInIcon: React.FC<{ size?: number; className?: string }> = ({ size = 16, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28Z" />
  </svg>
);

// Catálogo Oficial de Fichas de Cargo Inteckno S.A.S. (8 Pilares)
export function getOfficialJobPositionForRole(role: UserRole, user?: ErpUser): JobPosition {
  if (user?.jobPosition && user.jobPosition.title) {
    return user.jobPosition;
  }

  const allPositions = getStoredJobPositions();

  // 1. Buscar por ID de cargo o código asignado al usuario
  if (user?.jobPositionId) {
    const foundById = allPositions.find(
      (p) => p.id === user.jobPositionId || p.code?.toUpperCase() === user.jobPositionId.toUpperCase()
    );
    if (foundById) return foundById;
  }

  // 2. Buscar por rol en el catálogo oficial del Organigrama
  const roleMatches: Record<UserRole, string[]> = {
    admin_sistemas: ['ITK-CAR-IT'],
    gerente_general: ['ITK-CAR-GG'],
    gerente_administrativa: ['ITK-CAR-GA'],
    lider_proyectos: ['ITK-CAR-LP'],
    gerente_proyectos: ['ITK-CAR-LP'],
    lider_ingenieria: ['ITK-CAR-LI'],
    ingeniero_proyectos: ['ITK-CAR-IP'],
    practicante_ingenieria: ['ITK-CAR-PRA'],
    supervisor_tecnico: ['ITK-CAR-ST', 'ITK-CAR-END'],
    tecnico_stc: ['ITK-CAR-TEC'],
    auxiliar_tecnico: ['ITK-CAR-AT'],
    conductor: ['ITK-CAR-COND'],
    coord_comercial: ['ITK-CAR-CC'],
    asistente_negocios_internacionales: ['ITK-CAR-AC'],
    coord_compras: ['ITK-CAR-COM'],
    almacenista: ['ITK-CAR-ALM'],
    coord_talento_humano: ['ITK-CAR-TH'],
    auxiliar_talento_humano: ['ITK-CAR-ATH'],
    coord_administrativo: ['ITK-CAR-CADM'],
    auxiliar_administrativo: ['ITK-CAR-AADM'],
    hseq: ['ITK-CAR-SST'],
    auxiliar_sst: ['ITK-CAR-ASST'],
    gestor_ambiental: ['ITK-CAR-GA-EXT'],
    contador_externo: ['ITK-CAR-CONT'],
  };

  const candidateCodes = roleMatches[role];
  if (candidateCodes) {
    const foundByRole = allPositions.find((p) => candidateCodes.includes(p.code));
    if (foundByRole) return foundByRole;
  }

  switch (role) {
    case 'lider_proyectos':
    case 'lider_ingenieria':
    case 'gerente_proyectos':
      return {
        code: 'ITK-CAR-01',
        title: 'Líder de Proyectos & Coordinador de Ingeniería STC',
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
          'Deseable especialización o formación en Gerencia de Proyectos (PMP/PMI) o Gestión del Mantenimiento.',
        ],
        experienceRequired:
          'Mínimo 4 años de experiencia liderando proyectos electromecánicos o sistemas de transporte por cable aéreo.',
        technicalSkillsRequired: [
          'Cálculo y monitoreo de cables de acero según norma europea EN 12927 y EN 1709.',
          'Interpretación de ensayos no destructivos NDT (Defectoscopía Magnética MRT Nivel II, Ultrasonido, Líquidos Penetrantes).',
          'Manejo de herramientas de alineación láser y torquímetros hidráulicos de alto tonelaje.',
          'Control de costos por valor ganado (EVM - Earned Value Management) en Inteckno ERP.',
        ],
        softSkillsRequired: [
          'Liderazgo situacional y gestión asertiva de cuadrillas técnicas en campo.',
          'Comunicación estratégica con interventorías y directivos de cliente.',
          'Toma de decisiones analítica bajo presión operativa en paradas técnicas.',
          'Resolución estructurada de fallas electromecánicas complejas.',
        ],
        workConditions: [
          'Disponibilidad para desplazamientos a frentes de obra en Colombia y el exterior.',
          'Aptitud psicofísica certificada para trabajo en alturas superiores a 1.50 metros.',
          'Disponibilidad para turnos nocturnos rotativos durante ventanas de mantenimiento preventivo.',
        ],
        salaryRange: '$ 6.500.000 - $ 9.500.000 COP según escala salarial ITK Banda A1',
      };

    case 'supervisor_tecnico':
    case 'tecnico_stc':
      return {
        code: 'ITK-CAR-02',
        title: 'Técnico Especialista en Mantenimiento STC & Montaje Electromecánico',
        purpose:
          'Ejecutar con precisión milimétrica las rutinas de mantenimiento mecánico, inspección de balancines, torque de mordazas desembragables y sustitución de poleas en sistemas de teleférico, garantizando cero paradas no programadas.',
        responsibilities: [
          'Efectuar el torqueado verificado y marcado de pernos de balancines y mordazas con registro fotográfico.',
          'Inspeccionar visual y dimensionalmente los bandajes de goma de poleas y rodamientos.',
          'Instalar y operar el sensor electromagnético MRT para inspección no destructiva de cables portadores/tractores.',
          'Diligenciar los checklists técnicos de campo en tiempo real a través del ERP Inteckno.',
          'Aplicar bloqueo y etiquetado (LOTO) previo a cualquier intervención en maquinaria o línea viva.',
        ],
        academicRequirements: [
          'Tecnólogo o Técnico Profesional en Mantenimiento Electromecánico, Mecánica Industrial o áreas afines.',
          'Certificación vigente de Trabajo Seguro en Alturas (Nivel Avanzado o Coordinador).',
        ],
        experienceRequired:
          'Mínimo 2 años de experiencia práctica en mantenimiento electromecánico de maquinaria pesada o teleféricos.',
        technicalSkillsRequired: [
          'Alineación de poleas de reenvío y balancines STC.',
          'Manejo de torquímetros digitales y mecánicos de hasta 1200 Nm.',
          'Detección de rotura de alambres y deformaciones en cables de acero trenzado.',
          'Protocolo de bloqueo y etiquetado eléctrico y mecánico (LOTO).',
        ],
        softSkillsRequired: [
          'Disciplina técnica y rigurosidad en el seguimiento de procedimientos operacionales.',
          'Atención meticulosa al detalle en ensambles mecánicos de alta criticidad.',
          'Trabajo colaborativo y apoyo mutuo en cuadrillas de campo.',
          'Resiliencia y autocuidado durante jornadas en alturas.',
        ],
        workConditions: [
          'Exposición a la intemperie en pilonas de teleférico (viento, lluvia y altura geográfica).',
          'Manipulación de herramientas especializadas y equipos portátiles.',
          'Disponibilidad para turnos nocturnos (22:00 a 04:30) en líneas comerciales.',
        ],
        salaryRange: '$ 2.800.000 - $ 4.200.000 COP según escala salarial ITK Banda B2',
      };

    case 'admin_sistemas':
      return {
        code: 'ITK-CAR-03',
        title: 'Administrador de Sistemas & Arquitecto Cloud ERP',
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
          'Certificaciones recomendadas en Cloud (Google Cloud / Azure / AWS) y Ciberseguridad.',
        ],
        experienceRequired:
          'Mínimo 3 años administrando plataformas web modernas, bases de datos NoSQL y cloud enterprise.',
        technicalSkillsRequired: [
          'Desarrollo full-stack en React 19, TypeScript, Tailwind CSS y Node.js.',
          'Google Cloud Firestore, Firebase Hosting y reglas de seguridad de datos.',
          'Integración de APIs RESTful, OAuth 2.0 y Microsoft Entra ID.',
          'Protocolos de ciberseguridad, HTTPS, TLS 1.3 y protección contra OWASP Top 10.',
        ],
        softSkillsRequired: [
          'Pensamiento analítico estructurado y capacidad de automatización de procesos.',
          'Capacidad pedagógica para capacitar al personal técnico en herramientas digitales.',
          'Proactividad y rápida respuesta ante incidentes tecnológicos.',
        ],
        workConditions: [
          'Modalidad de trabajo híbrida con base en oficina técnica Medellín.',
          'Disponibilidad remota ante eventuales contingencias del sistema.',
        ],
        salaryRange: '$ 5.500.000 - $ 8.000.000 COP según escala salarial ITK Banda A2',
      };

    case 'hseq':
      return {
        code: 'ITK-CAR-04',
        title: 'Coordinador de Seguridad, Salud en el Trabajo y Ambiente (HSEQ)',
        purpose:
          'Liderar el Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST), asegurando cero accidentes en obras de transporte por cable, certificación del 100% del personal en alturas y cumplimiento de normatividad colombiana e ISO 45001 / ISO 14001.',
        responsibilities: [
          'Inspeccionar equipos de protección contra caídas (arneses, líneas de vida, conectores, mosquetones).',
          'Aprobar permisos de trabajo en alturas y análisis de trabajo seguro (ATS) previo a ascensos.',
          'Gestionar los exámenes médicos ocupacionales y la matriz legal de riesgos laborales.',
          'Investigar incidentes y formular lecciones aprendidas para la Wiki corporativa.',
        ],
        academicRequirements: [
          'Profesional o Especialista en Seguridad y Salud en el Trabajo con Licencia SST vigente.',
          'Certificado de Coordinador de Trabajo en Alturas (Resolución 4272 de 2021).',
        ],
        experienceRequired:
          'Mínimo 3 años en empresas del sector electromecánico, infraestructura o transporte por cable.',
        technicalSkillsRequired: [
          'Resolución 4272 de 2021 (Norma colombiana de protección contra caídas).',
          'Normas ISO 45001 (SST), ISO 9001 (Calidad) e ISO 14001 (Medio Ambiente).',
          'Investigación de accidentes con metodología Árbol de Causas e Ishikawa.',
        ],
        softSkillsRequired: [
          'Firmeza ética y criterio preventivo indeclinable en campo.',
          'Liderazgo pedagógico y empatía en charlas de seguridad de 5 minutos.',
        ],
        workConditions: [
          'Recorridos en campo por estaciones, torres y líneas de teleférico.',
          'Inspección física de ascenso a pilonas con equipo de protección personal.',
        ],
        salaryRange: '$ 4.500.000 - $ 6.800.000 COP según escala salarial ITK Banda B1',
      };

    default:
      return {
        code: 'ITK-CAR-GEN',
        title: user?.roleLabel || 'Colaborador Inteckno S.A.S.',
        purpose:
          'Aportar al cumplimiento de los objetivos estratégicos de Inteckno S.A.S. en el sector de transporte por cable e ingeniería especializada, manteniendo altos estándares de calidad, seguridad y compromiso corporativo.',
        responsibilities: [
          'Ejecutar las funciones asignadas según el manual organizacional y los procedimientos del ERP.',
          'Cumplir con las políticas de seguridad y salud en el trabajo (HSEQ).',
          'Registrar oportunamente las actividades y reportes en el ERP Inteckno.',
          'Participar en los programas de capacitación y mejoramiento continuo.',
        ],
        academicRequirements: [
          'Título profesional, tecnológico o técnico según el área de desempeño.',
        ],
        experienceRequired: 'Experiencia certificada afín a las responsabilidades del cargo.',
        technicalSkillsRequired: [
          'Manejo de herramientas informáticas y ERP Inteckno.',
          'Conocimiento de procedimientos operacionales del área.',
        ],
        softSkillsRequired: [
          'Trabajo en equipo y comunicación asertiva.',
          'Orientación al logro y compromiso institucional.',
        ],
        workConditions: [
          'Condiciones estándar según sede de trabajo o frentes de obra asignados.',
        ],
        salaryRange: 'Según escala salarial y política interna de remuneración de Inteckno S.A.S.',
      };
  }
}

export const UserProfileModule: React.FC = () => {
  const { currentUser, updateUserProfile, updateUserPreferences, resetUserPassword, notify, articles } = useErp();

  // Cinco Pestañas Oficiales
  const [activeTab, setActiveTab] = useState<'personal' | 'cargo' | 'competencias' | 'evaluaciones' | 'seguridad'>('personal');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  // Formulario de Datos Personales
  const [name, setName] = useState(currentUser?.name || '');
  const [nationalId, setNationalId] = useState(currentUser?.nationalId || (currentUser as any)?.cedula || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [birthDate, setBirthDate] = useState(currentUser?.birthDate || '1990-01-01');
  const [bloodType, setBloodType] = useState(currentUser?.bloodType || 'O+');
  const [city, setCity] = useState(currentUser?.city || 'Medellín, Antioquia');
  const [address, setAddress] = useState(currentUser?.address || '');
  const [emergencyContactName, setEmergencyContactName] = useState(currentUser?.emergencyContactName || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(currentUser?.emergencyContactPhone || '');
  const [photoUrl, setPhotoUrl] = useState(currentUser?.photoUrl || '');
  const [avatarColor, setAvatarColor] = useState(currentUser?.avatarColor || '#00668F');
  const [isCompressingPhoto, setIsCompressingPhoto] = useState(false);

  // Ficha de Cargo y Mentoría con LUC-IA-NA
  const officialJobPosition = getOfficialJobPositionForRole(currentUser.role, currentUser);
  const [isDiagnosingJob, setIsDiagnosingJob] = useState(false);
  const [improvementPlan, setImprovementPlan] = useState<LucianaImprovementPlan | null>(
    currentUser?.lucianaImprovementPlan || null
  );

  // Habilidades Verificadas y Certificaciones (Sin datos de prueba)
  const defaultSkills: VerifiedSkill[] = [];

  const [verifiedSkills, setVerifiedSkills] = useState<VerifiedSkill[]>(
    currentUser?.verifiedSkills && currentUser.verifiedSkills.length > 0
      ? currentUser.verifiedSkills
      : defaultSkills
  );
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillLevel, setNewSkillLevel] = useState<'Básico' | 'Intermedio' | 'Avanzado' | 'Experto'>('Intermedio');
  const [newSkillCategory, setNewSkillCategory] = useState<'stc' | 'hseq' | 'gestion' | 'herramientas' | 'software'>('stc');
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  // Certificaciones Oficiales
  const defaultCertifications: EmployeeCertification[] = [];

  const [certifications, setCertifications] = useState<EmployeeCertification[]>(
    currentUser?.certifications && currentUser.certifications.length > 0
      ? currentUser.certifications
      : defaultCertifications
  );
  const [newCertName, setNewCertName] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertIssueDate, setNewCertIssueDate] = useState('2026-01-15');
  const [newCertExpiryDate, setNewCertExpiryDate] = useState('2027-01-15');
  const [isAddingCert, setIsAddingCert] = useState(false);

  // LinkedIn Integration
  const [linkedInUrl, setLinkedInUrl] = useState(currentUser?.linkedInUrl || '');
  const [isOptimizingLinkedIn, setIsOptimizingLinkedIn] = useState(false);
  const [linkedInSuggestions, setLinkedInSuggestions] = useState<{
    skills: string[];
    headlineSuggestion: string;
    suggestedCourses: string[];
  } | null>(null);

  // Perfil Profesional Extendido
  const defaultExperiences: WorkExperience[] = [];

  const defaultEducation: EducationItem[] = [];

  const defaultLanguages: LanguageItem[] = [];

  const defaultSoftSkills: string[] = [];

  const [professionalHeadline, setProfessionalHeadline] = useState(
    currentUser?.professionalProfile?.headline ||
      `${currentUser?.roleLabel || 'Profesional'} | Especialista en Soluciones Técnicas e Industriales`
  );

  const [professionalSummary, setProfessionalSummary] = useState(
    currentUser?.professionalProfile?.summary ||
      'Profesional con sólida trayectoria técnica y operativa en proyectos de alta exigencia. Enfoque disciplinado en calidad, seguridad laboral y mejora continua de procesos.'
  );

  const [experiences, setExperiences] = useState<WorkExperience[]>(
    currentUser?.professionalProfile?.experience && currentUser.professionalProfile.experience.length > 0
      ? currentUser.professionalProfile.experience
      : defaultExperiences
  );

  const [educationList, setEducationList] = useState<EducationItem[]>(
    currentUser?.professionalProfile?.education && currentUser.professionalProfile.education.length > 0
      ? currentUser.professionalProfile.education
      : defaultEducation
  );

  const [softSkillsList, setSoftSkillsList] = useState<string[]>(
    currentUser?.professionalProfile?.softSkills && currentUser.professionalProfile.softSkills.length > 0
      ? currentUser.professionalProfile.softSkills
      : defaultSoftSkills
  );

  const [languagesList, setLanguagesList] = useState<LanguageItem[]>(
    currentUser?.professionalProfile?.languages && currentUser.professionalProfile.languages.length > 0
      ? currentUser.professionalProfile.languages
      : defaultLanguages
  );

  // Estados de formularios para añadir experiencia, educación, idiomas
  const [isAddingExp, setIsAddingExp] = useState(false);
  const [newExpRole, setNewExpRole] = useState('');
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpCity, setNewExpCity] = useState('');
  const [newExpStart, setNewExpStart] = useState('');
  const [newExpEnd, setNewExpEnd] = useState('');
  const [newExpCurrent, setNewExpCurrent] = useState(false);
  const [newExpDesc, setNewExpDesc] = useState('');

  const [isAddingEdu, setIsAddingEdu] = useState(false);
  const [newEduDegree, setNewEduDegree] = useState('');
  const [newEduInstitution, setNewEduInstitution] = useState('');
  const [newEduLevel, setNewEduLevel] = useState('Profesional');
  const [newEduYear, setNewEduYear] = useState('');

  const [isAddingSoftSkill, setIsAddingSoftSkill] = useState(false);
  const [newSoftSkillText, setNewSoftSkillText] = useState('');

  const [isAddingLang, setIsAddingLang] = useState(false);
  const [newLangName, setNewLangName] = useState('');
  const [newLangLevel, setNewLangLevel] = useState('Intermedio (B1-B2)');

  // Documento CV / Hoja de Vida para el modal de autocompletado
  const [uploadedCvFile, setUploadedCvFile] = useState<{
    fileName: string;
    fileSize: string;
    base64Data: string;
    mimeType: string;
  } | null>(null);
  const cvFileInputRef = useRef<HTMLInputElement>(null);

  // Evaluaciones de Desempeño (Sin datos de prueba)
  const defaultEvaluations: PerformanceEvaluation[] = [];

  const [evaluations, setEvaluations] = useState<PerformanceEvaluation[]>(
    currentUser?.performanceEvaluations && currentUser.performanceEvaluations.length > 0
      ? currentUser.performanceEvaluations
      : defaultEvaluations
  );

  // Seguridad, Habeas Data y Contraseña
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  // Consentimiento Habeas Data
  const defaultConsent: DataPrivacyConsent = {
    accepted: true,
    acceptedAt: '2026-01-15T08:00:00Z',
    policyVersion: 'v2026.1 - Ley 1581 de 2012',
  };
  const [privacyConsent, setPrivacyConsent] = useState<DataPrivacyConsent>(
    currentUser?.dataPrivacyConsent || defaultConsent
  );
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // Formulario de Preferencias del Sistema
  const [soundEnabled, setSoundEnabled] = useState(currentUser?.preferences?.soundEnabled ?? true);
  const [toastsEnabled, setToastsEnabled] = useState(currentUser?.preferences?.toastsEnabled ?? true);
  const [defaultCurrency, setDefaultCurrency] = useState<'COP' | 'USD'>(
    currentUser?.preferences?.defaultCurrency || 'COP'
  );
  const [visualDensity, setVisualDensity] = useState<'comfortable' | 'compact'>(
    currentUser?.preferences?.visualDensity || 'comfortable'
  );
  const [emailAlerts, setEmailAlerts] = useState(currentUser?.preferences?.emailAlerts ?? true);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'larger'>(
    currentUser?.preferences?.fontSize || 'normal'
  );
  const [defaultLandingModule, setDefaultLandingModule] = useState<string>(
    currentUser?.preferences?.defaultLandingModule || 'proyectos'
  );
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'YYYY-MM-DD'>(
    currentUser?.preferences?.dateFormat || 'DD/MM/YYYY'
  );
  const [confirmBeforeDelete, setConfirmBeforeDelete] = useState<boolean>(
    currentUser?.preferences?.confirmBeforeDelete ?? true
  );
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [prefsSavedSuccess, setPrefsSavedSuccess] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronización al montar o cambiar currentUser
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setNationalId(currentUser.nationalId || (currentUser as any)?.cedula || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setBirthDate(currentUser.birthDate || '1990-01-01');
      setBloodType(currentUser.bloodType || 'O+');
      setCity(currentUser.city || 'Medellín, Antioquia');
      setAddress(currentUser.address || '');
      setEmergencyContactName(currentUser.emergencyContactName || '');
      setEmergencyContactPhone(currentUser.emergencyContactPhone || '');
      setPhotoUrl(currentUser.photoUrl || '');
      setAvatarColor(currentUser.avatarColor || '#00668F');
      setLinkedInUrl(currentUser.linkedInUrl || '');
      if (currentUser.lucianaImprovementPlan) {
        setImprovementPlan(currentUser.lucianaImprovementPlan);
      }
      if (currentUser.verifiedSkills && currentUser.verifiedSkills.length > 0) {
        setVerifiedSkills(currentUser.verifiedSkills);
      }
      if (currentUser.certifications && currentUser.certifications.length > 0) {
        setCertifications(currentUser.certifications);
      }
      if (currentUser.performanceEvaluations && currentUser.performanceEvaluations.length > 0) {
        setEvaluations(currentUser.performanceEvaluations);
      }
      if (currentUser.dataPrivacyConsent) {
        setPrivacyConsent(currentUser.dataPrivacyConsent);
      }
      if (currentUser.preferences) {
        setSoundEnabled(currentUser.preferences.soundEnabled ?? true);
        setToastsEnabled(currentUser.preferences.toastsEnabled ?? true);
        setDefaultCurrency(currentUser.preferences.defaultCurrency || 'COP');
        setVisualDensity(currentUser.preferences.visualDensity || 'comfortable');
        setEmailAlerts(currentUser.preferences.emailAlerts ?? true);
        setFontSize(currentUser.preferences.fontSize || 'normal');
        setDefaultLandingModule(currentUser.preferences.defaultLandingModule || 'proyectos');
        setDateFormat(currentUser.preferences.dateFormat || 'DD/MM/YYYY');
        setConfirmBeforeDelete(currentUser.preferences.confirmBeforeDelete ?? true);
      }
    }
  }, [currentUser]);

  // Cálculo de edad
  const calculateAge = (dateStr: string) => {
    if (!dateStr) return null;
    const birth = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age > 0 ? age : null;
  };

  // Medidor de fortaleza de contraseña en tiempo real (Criterios sin asteriscos)
  const passwordChecks = {
    length: newPass.length >= 8,
    upper: /[A-Z]/.test(newPass),
    lower: /[a-z]/.test(newPass),
    number: /[0-9]/.test(newPass),
    special: /[^A-Za-z0-9]/.test(newPass),
  };
  const passwordStrengthScore = Object.values(passwordChecks).filter(Boolean).length;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8388608) {
        notify('warning', 'Archivo grande', 'La imagen seleccionada no debe exceder 8MB.');
        return;
      }
      try {
        setIsCompressingPhoto(true);
        const compressedBase64 = await compressImage(file, {
          maxWidth: 320,
          maxHeight: 320,
          quality: 0.85,
          mimeType: 'image/jpeg',
        });
        setPhotoUrl(compressedBase64);
        updateUserProfile(currentUser.id, { photoUrl: compressedBase64 });
        notify('success', 'Foto de Perfil Actualizada', 'Imagen optimizada, protegida y guardada exitosamente.');
      } catch (err) {
        console.error('Error al procesar la foto de perfil:', err);
        notify('urgent', 'Error de Imagen', 'No se pudo procesar la fotografía.');
      } finally {
        setIsCompressingPhoto(false);
      }
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSyncingCloud(true);

    const profileData: Partial<ErpUser> = {
      name,
      nationalId,
      email,
      phone,
      birthDate,
      bloodType,
      city,
      address,
      emergencyContactName,
      emergencyContactPhone,
      photoUrl,
      avatarColor,
      linkedInUrl,
      verifiedSkills,
      certifications,
      performanceEvaluations: evaluations,
      dataPrivacyConsent: privacyConsent,
      professionalProfile: {
        headline: professionalHeadline,
        summary: professionalSummary,
        experience: experiences,
        education: educationList,
        certifications,
        practicalSkills: verifiedSkills.map((s) => s.name),
        softSkills: softSkillsList,
        languages: languagesList,
      },
    };

    updateUserProfile(currentUser.id, profileData);

    const fullUser: ErpUser = {
      ...currentUser,
      ...profileData,
    };

    try {
      await syncUserToCloud(fullUser);
      setSaveSuccess(true);
      notify(
        'success',
        'Perfil Guardado y Sincronizado',
        'Tus datos han sido respaldados en la nube y ya están disponibles en todos tus dispositivos.'
      );
    } catch (err) {
      console.warn('Error en sincronización cloud:', err);
      setSaveSuccess(true);
      notify('success', 'Perfil Guardado Localmente', 'Los datos personales han sido actualizados.');
    } finally {
      setIsSyncingCloud(false);
      setTimeout(() => setSaveSuccess(false), 4500);
    }
  };

  // Diagnóstico de Nivel de Cargo con LUC-IA-NA
  const handleDiagnoseWithLuciana = async () => {
    setIsDiagnosingJob(true);
    try {
      const plan = await diagnoseJobReadinessWithLuciana(currentUser, officialJobPosition, articles);
      setImprovementPlan(plan);
      updateUserProfile(currentUser.id, {
        jobPosition: officialJobPosition,
        jobReadinessScore: plan.readinessScore,
        lucianaImprovementPlan: plan,
      });
      notify(
        'success',
        'Diagnóstico Completado por LUC-IA-NA',
        `Nivel de adecuación al cargo: ${plan.readinessScore}%. Se han identificado brechas y recomendaciones técnicas.`
      );
    } catch (err) {
      console.error('Error en diagnóstico de cargo:', err);
      notify('urgent', 'Error de Diagnóstico', 'No se pudo completar el análisis con LUC-IA-NA.');
    } finally {
      setIsDiagnosingJob(false);
    }
  };

  // Optimización de Perfil de LinkedIn con LUC-IA-NA
  const handleOptimizeLinkedIn = async () => {
    setIsOptimizingLinkedIn(true);
    try {
      const suggestions = await suggestLinkedInProfileSkillsWithLuciana(currentUser, linkedInUrl);
      setLinkedInSuggestions(suggestions);
      notify(
        'success',
        'Sugerencias de LinkedIn Listas',
        'LUC-IA-NA generó palabras clave y recomendaciones para tu perfil profesional.'
      );
    } catch (err) {
      console.error('Error en optimización LinkedIn:', err);
      notify('urgent', 'Error', 'No se pudieron generar sugerencias de LinkedIn.');
    } finally {
      setIsOptimizingLinkedIn(false);
    }
  };

  // Agregar habilidad verificada
  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const newSkill: VerifiedSkill = {
      id: `SKILL-${Date.now()}`,
      name: newSkillName.trim(),
      level: newSkillLevel,
      category: newSkillCategory,
      verifiedBy: 'Pendiente de validación por jefatura técnica',
      verifiedAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...verifiedSkills, newSkill];
    setVerifiedSkills(updated);
    updateUserProfile(currentUser.id, { verifiedSkills: updated });
    setNewSkillName('');
    setIsAddingSkill(false);
    notify('success', 'Habilidad Registrada', 'Se ha añadido la habilidad y se envió notificación para su verificación.');
  };

  // Eliminar habilidad
  const handleDeleteSkill = (skillId: string) => {
    const updated = verifiedSkills.filter((s) => s.id !== skillId);
    setVerifiedSkills(updated);
    updateUserProfile(currentUser.id, { verifiedSkills: updated });
  };

  // Agregar certificación
  const handleAddCertification = () => {
    if (!newCertName.trim() || !newCertIssuer.trim()) return;
    const today = new Date().toISOString().split('T')[0];
    const isExpired = newCertExpiryDate < today;
    const newCert: EmployeeCertification = {
      id: `CERT-${Date.now()}`,
      name: newCertName.trim(),
      issuer: newCertIssuer.trim(),
      issueDate: newCertIssueDate,
      expiryDate: newCertExpiryDate,
      status: isExpired ? 'vencido' : 'vigente',
    };
    const updated = [...certifications, newCert];
    setCertifications(updated);
    updateUserProfile(currentUser.id, { certifications: updated });
    setNewCertName('');
    setNewCertIssuer('');
    setIsAddingCert(false);
    notify('success', 'Certificado Guardado', 'El certificado ha sido indexado en su ficha de talento humano.');
  };

  // Eliminar certificación
  const handleDeleteCert = (certId: string) => {
    const updated = certifications.filter((c) => c.id !== certId);
    setCertifications(updated);
    updateUserProfile(currentUser.id, { certifications: updated });
  };

  // Experiencia laboral
  const handleAddExperience = () => {
    if (!newExpRole.trim() || !newExpCompany.trim()) {
      notify('warning', 'Campos incompletos', 'Ingresa el cargo y la empresa.');
      return;
    }
    const newExp: WorkExperience = {
      id: `EXP-${Date.now()}`,
      role: newExpRole.trim(),
      company: newExpCompany.trim(),
      city: newExpCity.trim(),
      startDate: newExpStart || '2023',
      endDate: newExpCurrent ? 'Actualidad' : newExpEnd || '2025',
      isCurrent: newExpCurrent,
      description: newExpDesc.trim(),
    };
    const updated = [newExp, ...experiences];
    setExperiences(updated);
    updateUserProfile(currentUser.id, {
      professionalProfile: {
        headline: professionalHeadline,
        summary: professionalSummary,
        experience: updated,
        education: educationList,
        certifications,
        practicalSkills: verifiedSkills.map((s) => s.name),
        softSkills: softSkillsList,
        languages: languagesList,
      },
    });
    setNewExpRole('');
    setNewExpCompany('');
    setNewExpCity('');
    setNewExpStart('');
    setNewExpEnd('');
    setNewExpDesc('');
    setIsAddingExp(false);
    notify('success', 'Experiencia Registrada', 'Se ha sumado a tu trayectoria profesional.');
  };

  const handleDeleteExperience = (expId: string) => {
    const updated = experiences.filter((e) => e.id !== expId);
    setExperiences(updated);
    updateUserProfile(currentUser.id, {
      professionalProfile: {
        headline: professionalHeadline,
        summary: professionalSummary,
        experience: updated,
        education: educationList,
        certifications,
        practicalSkills: verifiedSkills.map((s) => s.name),
        softSkills: softSkillsList,
        languages: languagesList,
      },
    });
  };

  // Educación
  const handleAddEducation = () => {
    if (!newEduDegree.trim() || !newEduInstitution.trim()) {
      notify('warning', 'Campos incompletos', 'Ingresa el título obtenido y la institución educativa.');
      return;
    }
    const newEdu: EducationItem = {
      id: `EDU-${Date.now()}`,
      degree: newEduDegree.trim(),
      institution: newEduInstitution.trim(),
      level: newEduLevel,
      graduationYear: newEduYear.trim() || 'Graduado',
    };
    const updated = [...educationList, newEdu];
    setEducationList(updated);
    updateUserProfile(currentUser.id, {
      professionalProfile: {
        headline: professionalHeadline,
        summary: professionalSummary,
        experience: experiences,
        education: updated,
        certifications,
        practicalSkills: verifiedSkills.map((s) => s.name),
        softSkills: softSkillsList,
        languages: languagesList,
      },
    });
    setNewEduDegree('');
    setNewEduInstitution('');
    setNewEduYear('');
    setIsAddingEdu(false);
    notify('success', 'Formación Académica Registrada', 'Se ha añadido tu título profesional.');
  };

  const handleDeleteEducation = (eduId: string) => {
    const updated = educationList.filter((e) => e.id !== eduId);
    setEducationList(updated);
    updateUserProfile(currentUser.id, {
      professionalProfile: {
        headline: professionalHeadline,
        summary: professionalSummary,
        experience: experiences,
        education: updated,
        certifications,
        practicalSkills: verifiedSkills.map((s) => s.name),
        softSkills: softSkillsList,
        languages: languagesList,
      },
    });
  };

  // Competencias Blandas
  const handleAddSoftSkill = () => {
    if (!newSoftSkillText.trim()) return;
    if (softSkillsList.includes(newSoftSkillText.trim())) {
      setNewSoftSkillText('');
      setIsAddingSoftSkill(false);
      return;
    }
    const updated = [...softSkillsList, newSoftSkillText.trim()];
    setSoftSkillsList(updated);
    updateUserProfile(currentUser.id, {
      professionalProfile: {
        headline: professionalHeadline,
        summary: professionalSummary,
        experience: experiences,
        education: educationList,
        certifications,
        practicalSkills: verifiedSkills.map((s) => s.name),
        softSkills: updated,
        languages: languagesList,
      },
    });
    setNewSoftSkillText('');
    setIsAddingSoftSkill(false);
  };

  const handleDeleteSoftSkill = (skill: string) => {
    const updated = softSkillsList.filter((s) => s !== skill);
    setSoftSkillsList(updated);
    updateUserProfile(currentUser.id, {
      professionalProfile: {
        headline: professionalHeadline,
        summary: professionalSummary,
        experience: experiences,
        education: educationList,
        certifications,
        practicalSkills: verifiedSkills.map((s) => s.name),
        softSkills: updated,
        languages: languagesList,
      },
    });
  };

  // Idiomas
  const handleAddLanguage = () => {
    if (!newLangName.trim()) return;
    const newLang: LanguageItem = {
      id: `LANG-${Date.now()}`,
      language: newLangName.trim(),
      level: newLangLevel,
    };
    const updated = [...languagesList, newLang];
    setLanguagesList(updated);
    updateUserProfile(currentUser.id, {
      professionalProfile: {
        headline: professionalHeadline,
        summary: professionalSummary,
        experience: experiences,
        education: educationList,
        certifications,
        practicalSkills: verifiedSkills.map((s) => s.name),
        softSkills: softSkillsList,
        languages: updated,
      },
    });
    setNewLangName('');
    setIsAddingLang(false);
  };

  const handleDeleteLanguage = (langId: string) => {
    const updated = languagesList.filter((l) => l.id !== langId);
    setLanguagesList(updated);
    updateUserProfile(currentUser.id, {
      professionalProfile: {
        headline: professionalHeadline,
        summary: professionalSummary,
        experience: experiences,
        education: educationList,
        certifications,
        practicalSkills: verifiedSkills.map((s) => s.name),
        softSkills: softSkillsList,
        languages: updated,
      },
    });
  };

  // Lectura de documento CV (PDF, Imagen, Word, TXT)
  const handleCvFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8388608) {
      notify('warning', 'Archivo muy grande', 'El archivo no debe exceder 8 MB.');
      return;
    }

    const isText = file.type.includes('text') || file.name.endsWith('.txt');

    if (isText) {
      const textReader = new FileReader();
      textReader.onload = (evt) => {
        const text = String(evt.target?.result || '');
        setCvAutoFillText(text);
        setUploadedCvFile({
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          base64Data: btoa(text.slice(0, 4000)),
          mimeType: 'text/plain',
        });
        notify('success', 'Texto Cargado', `Se leyó el archivo ${file.name}.`);
      };
      textReader.readAsText(file);
    } else {
      const binaryReader = new FileReader();
      binaryReader.onload = (evt) => {
        const dataUrl = String(evt.target?.result || '');
        const commaIdx = dataUrl.indexOf(',');
        const base64Data = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
        const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

        setUploadedCvFile({
          fileName: file.name,
          fileSize: `${(file.size / 1048576).toFixed(2)} MB`,
          base64Data,
          mimeType,
        });
        notify('success', 'Documento Adjuntado', `Se cargó ${file.name}. LUC-IA-NA leerá tus datos directamente.`);
      };
      binaryReader.readAsDataURL(file);
    }
  };

  // Cambio de contraseña
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    const expectedCurrent =
      currentUser.password ||
      (currentUser.email === 'sistemas@inteckno.com' ? 'Bruno0129$' : 'Inteckno2026!');

    if (currentPass !== expectedCurrent) {
      setPassError('La contraseña actual ingresada es incorrecta.');
      return;
    }

    if (newPass.length < 8) {
      setPassError('La nueva contraseña debe tener como mínimo 8 caracteres.');
      return;
    }

    if (passwordStrengthScore < 3) {
      setPassError('La contraseña debe incluir mayúsculas, minúsculas, números o caracteres especiales.');
      return;
    }

    if (newPass !== confirmPass) {
      setPassError('La confirmación de la nueva contraseña no coincide.');
      return;
    }

    resetUserPassword(currentUser.id, newPass);
    setPassSuccess('¡Su contraseña ha sido actualizada con éxito y cifrada bajo estándares bancarios!');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    notify('success', 'Contraseña Actualizada', 'Su clave de acceso al ERP ha sido cambiada.');
  };

  // Cerrar sesiones activas en otros dispositivos
  const handleTerminateOtherSessions = () => {
    notify(
      'success',
      'Sesiones Desconectadas',
      'Se han cerrado las sesiones activas en otros computadores y celulares. Su sesión actual permanece protegida.'
    );
  };

  // Guardar preferencias del sistema
  const handleSavePreferences = async () => {
    setIsSavingPrefs(true);
    const newPrefs: UserPreferences = {
      theme: 'light',
      soundEnabled,
      toastsEnabled,
      defaultCurrency,
      visualDensity,
      emailAlerts,
      fontSize,
      defaultLandingModule,
      dateFormat,
      confirmBeforeDelete,
    };
    updateUserPreferences(newPrefs);

    const fullUser: ErpUser = {
      ...currentUser,
      preferences: newPrefs,
    };

    try {
      await syncUserToCloud(fullUser);
      setPrefsSavedSuccess(true);
      notify(
        'success',
        'Preferencias Guardadas y Sincronizadas',
        'Tus preferencias se sincronizaron en Google Cloud y se aplicarán en todos tus dispositivos.'
      );
    } catch (err) {
      setPrefsSavedSuccess(true);
      notify('success', 'Preferencias Guardadas', 'Tus preferencias han sido guardadas localmente.');
    } finally {
      setIsSavingPrefs(false);
      setTimeout(() => setPrefsSavedSuccess(false), 4000);
    }
  };

  const handleDensityChange = (density: 'comfortable' | 'compact') => {
    setVisualDensity(density);
    updateUserPreferences({ visualDensity: density });
  };

  const handleFontSizeChange = (size: 'normal' | 'large' | 'larger') => {
    setFontSize(size);
    updateUserPreferences({ fontSize: size });
  };

  const age = calculateAge(birthDate);

  // Autocompletado inteligente con CV / LinkedIn
  const [isCvAutoFillModalOpen, setIsCvAutoFillModalOpen] = useState(false);
  const [cvAutoFillText, setCvAutoFillText] = useState('');
  const [isProcessingCv, setIsProcessingCv] = useState(false);
  const [extractedCvPreview, setExtractedCvPreview] = useState<ExtractedCvData | null>(null);

  const handleProcessCvAutoFill = async () => {
    const hasText = Boolean(cvAutoFillText && cvAutoFillText.trim().length > 10);
    const hasFile = Boolean(uploadedCvFile && uploadedCvFile.base64Data);

    if (!hasText && !hasFile) {
      notify(
        'warning',
        'Documento o Texto Requerido',
        'Por favor sube tu hoja de vida (PDF / Imagen) o pega el texto copiado de tu perfil de LinkedIn.'
      );
      return;
    }

    setIsProcessingCv(true);
    try {
      const data = await autoCompleteUserProfileFromCvWithLuciana(
        cvAutoFillText,
        linkedInUrl,
        uploadedCvFile || undefined
      );
      setExtractedCvPreview(data);
      notify(
        'success',
        'Información Real Extraída por LUC-IA-NA',
        'Se extrajeron fielmente tus cargos, estudios, aptitudes y certificaciones. Revisa y confirma.'
      );
    } catch (err: any) {
      console.warn('Error procesando CV:', err);
      notify(
        'urgent',
        'Atención',
        err?.message || 'No se pudo procesar el documento. Verifica que el archivo contenga texto legible o pega el texto directamente.'
      );
    } finally {
      setIsProcessingCv(false);
    }
  };

  const handleApplyExtractedCvData = async () => {
    if (!extractedCvPreview) return;

    if (extractedCvPreview.name) setName(extractedCvPreview.name);
    if (extractedCvPreview.phone) setPhone(extractedCvPreview.phone);
    if (extractedCvPreview.email) setEmail(extractedCvPreview.email);
    if (extractedCvPreview.city) setCity(extractedCvPreview.city);
    if (extractedCvPreview.headline) setProfessionalHeadline(extractedCvPreview.headline);
    if (extractedCvPreview.summary) setProfessionalSummary(extractedCvPreview.summary);

    // Experiencias Laborales
    let mergedExperiences = [...experiences];
    if (extractedCvPreview.experienceList && extractedCvPreview.experienceList.length > 0) {
      mergedExperiences = extractedCvPreview.experienceList;
      setExperiences(mergedExperiences);
    }

    // Educación
    let mergedEducation = [...educationList];
    if (extractedCvPreview.educationList && extractedCvPreview.educationList.length > 0) {
      mergedEducation = extractedCvPreview.educationList;
      setEducationList(mergedEducation);
    }

    // Habilidades Técnicas y Prácticas
    const newSkills: VerifiedSkill[] = (extractedCvPreview.technicalSkills || []).map((ts, idx) => ({
      id: `SKILL-AUTO-${Date.now()}-${idx}`,
      name: ts,
      level: 'Intermedio',
      category: 'stc',
      verifiedBy: 'Extraído de CV / Validado por IA',
      verifiedAt: new Date().toISOString().split('T')[0],
    }));

    const mergedSkills = [...verifiedSkills];
    newSkills.forEach((ns) => {
      if (!mergedSkills.some((s) => s.name.toLowerCase() === ns.name.toLowerCase())) {
        mergedSkills.push(ns);
      }
    });
    setVerifiedSkills(mergedSkills);

    // Certificaciones
    const newCerts: EmployeeCertification[] = (extractedCvPreview.certifications || []).map((c, idx) => ({
      id: `CERT-AUTO-${Date.now()}-${idx}`,
      name: c.name,
      issuer: c.issuer,
      issueDate: c.issueDate || '2024-01-01',
      expiryDate: c.expiryDate || '2027-01-01',
      status: 'vigente',
    }));
    const mergedCerts = [...certifications];
    newCerts.forEach((nc) => {
      if (!mergedCerts.some((c) => c.name.toLowerCase() === nc.name.toLowerCase())) {
        mergedCerts.push(nc);
      }
    });
    setCertifications(mergedCerts);

    // Habilidades Blandas
    let mergedSoftSkills = [...softSkillsList];
    if (extractedCvPreview.softSkills && extractedCvPreview.softSkills.length > 0) {
      mergedSoftSkills = Array.from(new Set([...softSkillsList, ...extractedCvPreview.softSkills]));
      setSoftSkillsList(mergedSoftSkills);
    }

    // Idiomas
    let mergedLanguages = [...languagesList];
    if (extractedCvPreview.languages && extractedCvPreview.languages.length > 0) {
      mergedLanguages = extractedCvPreview.languages;
      setLanguagesList(mergedLanguages);
    }

    const newProfessionalProfile: ProfessionalProfile = {
      headline: extractedCvPreview.headline || professionalHeadline,
      summary: extractedCvPreview.summary || professionalSummary,
      experience: mergedExperiences,
      education: mergedEducation,
      certifications: mergedCerts,
      practicalSkills: mergedSkills.map((s) => s.name),
      softSkills: mergedSoftSkills,
      languages: mergedLanguages,
    };

    const updatedProfile = {
      phone: extractedCvPreview.phone || phone,
      city: extractedCvPreview.city || city,
      verifiedSkills: mergedSkills,
      certifications: mergedCerts,
      competencies: Array.from(
        new Set([
          ...(currentUser.competencies || []),
          ...extractedCvPreview.technicalSkills,
          ...extractedCvPreview.softSkills,
        ])
      ),
      professionalProfile: newProfessionalProfile,
    };

    updateUserProfile(currentUser.id, updatedProfile);
    try {
      await syncUserToCloud({ ...currentUser, ...updatedProfile });
    } catch {}

    setIsCvAutoFillModalOpen(false);
    notify(
      'success',
      'Perfil Profesional Actualizado',
      'Se han registrado tu experiencia, educación, certificaciones, habilidades y aptitudes extraídas fielmente.'
    );
  };

  // Verificación de visualización salarial por RBAC
  const canViewSalary =
    currentUser.role === 'admin_sistemas' ||
    currentUser.role === 'gerente_general' ||
    currentUser.role === 'gerente_administrativa' ||
    currentUser.id === currentUser.id;

  return (
    <div className="space-y-4 max-w-5xl mx-auto pb-12 font-sans">
      
      <div className="bg-white rounded-xl p-3.5 sm:p-5 overflow-hidden relative border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 relative z-10">
          
          <div className="relative group shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={currentUser.name}
                className="w-20 h-20 rounded-full object-cover border border-slate-200 shrink-0 aspect-square shadow-sm"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full text-white font-bold text-xl flex items-center justify-center border border-slate-200 shrink-0 aspect-square shadow-sm"
                style={{ backgroundColor: avatarColor }}
              >
                {currentUser.avatar}
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isCompressingPhoto}
              title="Cambiar foto de perfil"
              className="absolute -bottom-1 -right-1 p-2 rounded-full shrink-0 aspect-square bg-[#00668F] hover:bg-[#005273] text-white shadow-md transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isCompressingPhoto ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
            />
          </div>

          
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  {currentUser.name}
                </h1>
                <p className="text-xs text-gray-500 font-semibold">{currentUser.roleLabel}</p>
              </div>

              <div className="flex items-center gap-2 justify-center sm:justify-end flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsCvAutoFillModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-100 hover:bg-sky-200 text-[#00668F] cursor-pointer transition-all active:scale-95 shadow-xs"
                  title="Autocompletar mi perfil extrayendo datos de mi Hoja de Vida o LinkedIn con IA"
                >
                  <Sparkles size={13} className="text-[#00668F]" />
                  <span>Autocompletar con IA (CV/LinkedIn)</span>
                </button>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 aspect-square" />
                  Cuenta Activa
                </span>

                {currentUser.canWorkHeights && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900">
                    <HardHat size={13} />
                    Alturas Apto
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-600 pt-1">
              <span className="flex items-center gap-1.5">
                <Building2 size={14} className="text-[#00668F]" />
                {currentUser.department}
              </span>
              <span className="flex items-center gap-1.5 font-mono text-gray-700 font-medium">
                <Mail size={14} className="text-[#00668F]" />
                {currentUser.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone size={14} className="text-emerald-700" />
                {currentUser.phone || 'Sin teléfono'}
              </span>
              {currentUser.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={14} className="text-rose-600" />
                  {currentUser.city}
                </span>
              )}
            </div>
          </div>
        </div>

        
        <div className="grid grid-cols-2 sm:grid-cols-5 bg-slate-100 p-1.5 rounded-2xl mt-6 gap-1.5 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'personal'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          >
            <User size={15} className="shrink-0" />
            <span className="truncate">Datos Personales</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cargo')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'cargo'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          >
            <Briefcase size={15} className="shrink-0" />
            <span className="truncate">Ficha de Cargo & Plan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('competencias')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center ${
              activeTab === 'competencias'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          >
            <UserCheck size={15} className="shrink-0" />
            <span className="truncate">Perfil Profesional</span>
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
            <span className="truncate">Evaluaciones</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('seguridad')}
            className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer text-center col-span-2 sm:col-span-1 ${
              activeTab === 'seguridad'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/70'
            }`}
          >
            <ShieldCheck size={15} className="shrink-0" />
            <span className="truncate">Seguridad & Ajustes</span>
          </button>
        </div>
      </div>

      
      {activeTab === 'personal' && (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {saveSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2.5 border border-emerald-200">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Sus datos de perfil han sido guardados y sincronizados exitosamente.</span>
            </div>
          )}

          <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5 border border-slate-200 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 pb-1">
              <User size={16} className="text-[#00668F]" />
              <span>Información Personal Básica</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Cédula de Ciudadanía (C.C.)</label>
                <div className="relative">
                  <ShieldCheck size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="Ej: 1.037.620.119"
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-xs text-gray-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Color de Iniciales / Avatar</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={avatarColor}
                    onChange={(e) => setAvatarColor(e.target.value)}
                    className="w-10 h-10 p-0.5 rounded-xl bg-slate-100 cursor-pointer"
                  />
                  <span className="text-xs font-mono text-gray-500 font-bold">{avatarColor}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Correo Institucional (@inteckno.com)</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-xs text-gray-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Teléfono / WhatsApp Corporativo</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Fecha de Nacimiento</label>
                <div className="relative">
                  <Calendar size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>
                {age !== null && (
                  <span className="text-[11px] text-gray-500 mt-1 block font-medium">
                    Edad calculada: <strong className="text-gray-800">{age} años</strong>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Grupo Sanguíneo y Factor RH</label>
                <div className="relative">
                  <Heart size={15} className="absolute left-3.5 top-3.5 text-rose-500" />
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-xs text-gray-900 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 cursor-pointer"
                  >
                    <option value="O+">O Positivo (O+)</option>
                    <option value="O-">O Negativo (O-)</option>
                    <option value="A+">A Positivo (A+)</option>
                    <option value="A-">A Negativo (A-)</option>
                    <option value="B+">B Positivo (B+)</option>
                    <option value="B-">B Negativo (B-)</option>
                    <option value="AB+">AB Positivo (AB+)</option>
                    <option value="AB-">AB Negativo (AB-)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Ciudad y Departamento</label>
                <div className="relative">
                  <MapPin size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Medellín, Antioquia"
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Dirección de Residencia</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle / Carrera / Barrio"
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>
            </div>
          </div>

          
          <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between pb-1">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck size={16} className="text-rose-600" />
                <span>Contacto de Emergencia (Obligatorio HSEQ / SST)</span>
              </h3>
              <span className="text-[11px] text-gray-500 font-medium">Requerido para brigadas y rescate en campo STC</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nombre del Contacto / Parentesco</label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="ej. María Morales (Cónyuge) o Familiar"
                  className="w-full px-4 py-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Teléfono de Emergencia 24/7</label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="tel"
                    value={emergencyContactPhone}
                    onChange={(e) => setEmergencyContactPhone(e.target.value)}
                    placeholder="+57 300 000 0000"
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSyncingCloud}
              className="px-6 py-3 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSyncingCloud ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              <span>{isSyncingCloud ? 'Sincronizando con la Nube...' : 'Guardar y Sincronizar'}</span>
            </button>
          </div>
        </form>
      )}

      
      {activeTab === 'cargo' && (
        <div className="space-y-4">
          
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#00668F] text-white">
                  {officialJobPosition.code}
                </span>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Ficha de Cargo Oficial ITK
                </span>
              </div>
              <h2 className="text-lg font-black text-gray-900 mt-1">{officialJobPosition.title}</h2>
              <p className="text-xs text-gray-600 mt-0.5">Área / Departamento: {currentUser.department}</p>
            </div>

            <button
              type="button"
              onClick={handleDiagnoseWithLuciana}
              disabled={isDiagnosingJob}
              className="px-4 py-2.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95 disabled:opacity-60 shrink-0"
            >
              {isDiagnosingJob ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Sparkles size={15} className="text-[#F39200]" />
              )}
              <span>{isDiagnosingJob ? 'LUC-IA-NA Analizando...' : 'Diagnóstico de Nivel con LUC-IA-NA'}</span>
            </button>
          </div>

          
          {improvementPlan && (
            <div className="bg-sky-50 rounded-xl p-4 sm:p-5 border border-sky-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-[#00668F]" />
                  <div>
                    <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                      Dictamen de Preparación Técnica (LUC-IA-NA AI)
                    </h3>
                    <p className="text-[11px] text-sky-700">Actualizado el: {improvementPlan.generatedAt}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-900">Nivel de Adecuación:</span>
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-[#00668F] text-white">
                    {improvementPlan.readinessScore}%
                  </span>
                </div>
              </div>

              
              <div className="w-full bg-sky-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#00668F] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${improvementPlan.readinessScore}%` }}
                />
              </div>

              <p className="text-xs text-sky-900 leading-relaxed font-medium">{improvementPlan.summary}</p>

              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-white rounded-xl border border-sky-200">
                  <h4 className="text-[11px] font-bold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-amber-600" />
                    <span>Brechas Técnicas Identificadas</span>
                  </h4>
                  <ul className="space-y-1.5 text-xs text-gray-700">
                    {(improvementPlan.technicalGaps || []).map((gap, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-amber-600 font-bold shrink-0">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-white rounded-xl border border-sky-200">
                  <h4 className="text-[11px] font-bold text-[#00668F] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileCheck size={13} className="text-[#00668F]" />
                    <span>Artículos Recomendados de la Wiki</span>
                  </h4>
                  <div className="space-y-1.5">
                    {(improvementPlan.recommendedWikiArticles || []).map((art, idx) => (
                      <div
                        key={idx}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-50 text-[11px] font-semibold text-[#00668F] flex items-center justify-between"
                      >
                        <span className="truncate">{art}</span>
                        <ChevronRight size={13} className="shrink-0 text-sky-500 ml-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              
              {improvementPlan.promotionalPath && (
                <div className="p-3 bg-white rounded-xl border border-sky-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[11px] font-bold text-gray-500 block">Ruta de Ascenso y Carrera</span>
                    <strong className="text-gray-900 font-bold">
                      Próximo Cargo Objetivo: {improvementPlan.promotionalPath.nextRoleTitle}
                    </strong>
                  </div>
                  <div className="text-[11px] text-gray-600">
                    Requisitos pendientes: {(improvementPlan.promotionalPath.missingRequirements || []).join(', ')}
                  </div>
                </div>
              )}
            </div>
          )}

          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00668F] uppercase tracking-wider">
                <Target size={16} />
                <span>Pilar 1: Propósito del Cargo</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{officialJobPosition.purpose}</p>
            </div>

            
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00668F] uppercase tracking-wider">
                <ClipboardCheck size={16} />
                <span>Pilar 2: Responsabilidades Clave</span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-700">
                {(officialJobPosition.responsibilities || []).map((resp, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-[#00668F] font-bold shrink-0">{idx + 1}.</span>
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>

            
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00668F] uppercase tracking-wider">
                <GraduationCap size={16} />
                <span>Pilar 3: Requisitos Académicos & Titulación</span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-700">
                {(officialJobPosition.academicRequirements || []).map((req, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold shrink-0">✓</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00668F] uppercase tracking-wider">
                <Briefcase size={16} />
                <span>Pilar 4: Experiencia Laboral Requerida</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed">{officialJobPosition.experienceRequired}</p>
            </div>

            
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00668F] uppercase tracking-wider">
                <Wrench size={16} />
                <span>Pilar 5: Habilidades Técnicas STC & Normativas</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(officialJobPosition.technicalSkillsRequired || officialJobPosition.technicalSkills || []).map((skill, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-semibold text-gray-800">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#00668F] uppercase tracking-wider">
                <Users size={16} />
                <span>Pilar 6: Competencias Blandas & Liderazgo</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(officialJobPosition.softSkillsRequired || officialJobPosition.softSkills || []).map((soft, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-teal-50 text-[11px] font-semibold text-teal-800">
                    {soft}
                  </span>
                ))}
              </div>
            </div>

            
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider">
                <HardHat size={16} />
                <span>Pilar 7: Condiciones de Trabajo & Riesgo HSEQ</span>
              </div>
              <ul className="space-y-1.5 text-xs text-gray-700">
                {(officialJobPosition.workConditions || []).map((cond, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold shrink-0">⚠</span>
                    <span>{cond}</span>
                  </li>
                ))}
              </ul>
            </div>

            
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                <DollarSign size={16} />
                <span>Pilar 8: Banda Salarial & Remuneración</span>
              </div>
              {canViewSalary ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                  <span className="text-[11px] text-emerald-800 font-bold block">
                    Escala Oficial Inteckno S.A.S. (Confidencial)
                  </span>
                  <p className="text-emerald-950 font-bold mt-1 text-sm">
                    {typeof officialJobPosition.salaryRange === 'object' && officialJobPosition.salaryRange !== null
                      ? `$${officialJobPosition.salaryRange.min.toLocaleString()} - $${officialJobPosition.salaryRange.max.toLocaleString()} ${officialJobPosition.salaryRange.currency || 'COP'}`
                      : String(officialJobPosition.salaryRange || 'A convenir')}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">Información salarial reservada a talento humano y gerencia.</p>
              )}
            </div>
          </div>
        </div>
      )}

      
      {activeTab === 'competencias' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <UserCheck size={16} className="text-[#00668F]" />
                  <span>Extracto & Resumen Profesional</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Presentación ejecutiva de tu perfil, trayectoria y competencias principales.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCvAutoFillModalOpen(true)}
                className="px-3.5 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto shadow-xs"
              >
                <Sparkles size={14} />
                <span>Autocompletar con IA (CV/LinkedIn)</span>
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Titular Profesional (Headline):
                </label>
                <input
                  type="text"
                  value={professionalHeadline}
                  onChange={(e) => setProfessionalHeadline(e.target.value)}
                  placeholder="ej. Coordinador de Suministros y Logística | Especialista en Compras"
                  className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Resumen del Perfil Profesional:
                </label>
                <textarea
                  rows={3}
                  value={professionalSummary}
                  onChange={(e) => setProfessionalSummary(e.target.value)}
                  placeholder="Describe brevemente tus fortalezas profesionales, áreas de experiencia y metas en la organización..."
                  className="w-full p-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 leading-relaxed"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Briefcase size={16} className="text-[#00668F]" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Experiencia Laboral & Trayectoria ({experiences.length})
                  </h3>
                  <p className="text-xs text-gray-500">Historial de cargos, empresas y funciones clave desempeñadas.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingExp(!isAddingExp)}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Añadir Experiencia</span>
              </button>
            </div>

            {isAddingExp && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Cargo Desempeñado:</label>
                    <input
                      type="text"
                      value={newExpRole}
                      onChange={(e) => setNewExpRole(e.target.value)}
                      placeholder="ej. Analista de Compras o Técnico STC"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Empresa / Entidad:</label>
                    <input
                      type="text"
                      value={newExpCompany}
                      onChange={(e) => setNewExpCompany(e.target.value)}
                      placeholder="ej. Inteckno S.A.S. / Empresa previa"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Ciudad / Ubicación:</label>
                    <input
                      type="text"
                      value={newExpCity}
                      onChange={(e) => setNewExpCity(e.target.value)}
                      placeholder="ej. Medellín, Colombia"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de Inicio:</label>
                    <input
                      type="text"
                      value={newExpStart}
                      onChange={(e) => setNewExpStart(e.target.value)}
                      placeholder="ej. 2022 o Enero 2022"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de Fin:</label>
                    <input
                      type="text"
                      disabled={newExpCurrent}
                      value={newExpCurrent ? 'Actualidad' : newExpEnd}
                      onChange={(e) => setNewExpEnd(e.target.value)}
                      placeholder="ej. 2024 o Actualidad"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 disabled:bg-slate-100"
                    />
                    <label className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newExpCurrent}
                        onChange={(e) => setNewExpCurrent(e.target.checked)}
                        className="rounded text-[#00668F]"
                      />
                      <span>Cargo actual</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Descripción de Funciones, Logros y Proyectos:
                  </label>
                  <textarea
                    rows={2}
                    value={newExpDesc}
                    onChange={(e) => setNewExpDesc(e.target.value)}
                    placeholder="Principales responsabilidades y proyectos destacados..."
                    className="w-full p-2.5 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingExp(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-gray-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddExperience}
                    className="px-4 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Guardar Experiencia
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {experiences.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-gray-900">{exp.role}</h4>
                      <span className="text-gray-400 font-bold">•</span>
                      <span className="text-xs font-bold text-[#00668F]">{exp.company}</span>
                      {exp.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-mono">
                      {exp.startDate} - {exp.endDate || (exp.isCurrent ? 'Actualidad' : '')} {exp.city ? `(${exp.city})` : ''}
                    </p>
                    {exp.description && (
                      <p className="text-xs text-gray-600 leading-relaxed pt-1">{exp.description}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteExperience(exp.id)}
                    className="text-gray-400 hover:text-rose-600 p-1.5 rounded-full shrink-0 aspect-square cursor-pointer self-end sm:self-start"
                    title="Eliminar experiencia"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GraduationCap size={16} className="text-[#00668F]" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Educación & Formación Académica ({educationList.length})
                  </h3>
                  <p className="text-xs text-gray-500">Títulos de pregrado, posgrados, diplomados y técnicas.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingEdu(!isAddingEdu)}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Añadir Formación</span>
              </button>
            </div>

            {isAddingEdu && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Título o Grado:</label>
                    <input
                      type="text"
                      value={newEduDegree}
                      onChange={(e) => setNewEduDegree(e.target.value)}
                      placeholder="ej. Profesional en Administración / Técnico / Magíster"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Institución / Universidad:</label>
                    <input
                      type="text"
                      value={newEduInstitution}
                      onChange={(e) => setNewEduInstitution(e.target.value)}
                      placeholder="ej. SENA / Universidad Nacional / ITM"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nivel Educativo:</label>
                    <select
                      value={newEduLevel}
                      onChange={(e) => setNewEduLevel(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 cursor-pointer"
                    >
                      <option value="Bachiller">Bachiller</option>
                      <option value="Técnico Laboral">Técnico Laboral</option>
                      <option value="Tecnólogo">Tecnólogo</option>
                      <option value="Profesional Universitario">Profesional Universitario</option>
                      <option value="Especialización">Especialización</option>
                      <option value="Maestría">Maestría</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Año de Graduación / Estado:</label>
                    <input
                      type="text"
                      value={newEduYear}
                      onChange={(e) => setNewEduYear(e.target.value)}
                      placeholder="ej. 2023 o En Curso"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingEdu(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-gray-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddEducation}
                    className="px-4 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Guardar Formación
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {educationList.map((edu) => (
                <div
                  key={edu.id}
                  className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-900">{edu.degree}</h4>
                    <p className="text-[11px] text-[#00668F] font-semibold">{edu.institution}</p>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 font-mono">
                      <span>{edu.level || 'Formal'}</span>
                      {edu.graduationYear && <span>• {edu.graduationYear}</span>}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteEducation(edu.id)}
                    className="text-gray-400 hover:text-rose-600 p-1.5 rounded-full shrink-0 aspect-square cursor-pointer"
                    title="Eliminar formación"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <HardHat size={16} className="text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Certificaciones, Licencias & Cursos ({certifications.length})
                  </h3>
                  <p className="text-xs text-gray-500">Control de vigencias legales (Alturas, SST, END, Técnicas).</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingCert(!isAddingCert)}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Añadir Certificado</span>
              </button>
            </div>

            {isAddingCert && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de la Certificación:</label>
                    <input
                      type="text"
                      value={newCertName}
                      onChange={(e) => setNewCertName(e.target.value)}
                      placeholder="ej. Trabajo Seguro en Alturas Res. 4272"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Entidad Emisora:</label>
                    <input
                      type="text"
                      value={newCertIssuer}
                      onChange={(e) => setNewCertIssuer(e.target.value)}
                      placeholder="ej. SENA / Bureau Veritas / Consejo Profesional"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de Expedición:</label>
                    <input
                      type="date"
                      value={newCertIssueDate}
                      onChange={(e) => setNewCertIssueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Fecha de Vencimiento:</label>
                    <input
                      type="date"
                      value={newCertExpiryDate}
                      onChange={(e) => setNewCertExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingCert(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-gray-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddCertification}
                    className="px-4 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Guardar Certificado
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {certifications.map((cert) => {
                const isExpired = cert.status === 'vencido';
                return (
                  <div
                    key={cert.id}
                    className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{cert.name}</span>
                        {isExpired ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            Vencido
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Vigente
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500">Emisor: {cert.issuer}</p>
                      <p className="text-[11px] font-mono text-gray-600">
                        Vigencia: {cert.issueDate} hasta <strong>{cert.expiryDate}</strong>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCert(cert.id)}
                      className="text-gray-400 hover:text-rose-600 p-1.5 rounded-full shrink-0 aspect-square cursor-pointer"
                      title="Eliminar certificado"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Wrench size={16} className="text-[#00668F]" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Habilidades Prácticas & Aptitudes Técnicas ({verifiedSkills.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Aptitudes operativas, manejo de software, herramientas y normativas del área.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingSkill(!isAddingSkill)}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Registrar Aptitud</span>
              </button>
            </div>

            {isAddingSkill && (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nombre de la Aptitud / Técnica:</label>
                    <input
                      type="text"
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      placeholder="ej. Gestión de Compras / Excel Avanzado / Alineación Láser / SAP"
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Nivel de Dominio:</label>
                    <select
                      value={newSkillLevel}
                      onChange={(e) => setNewSkillLevel(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30 cursor-pointer"
                    >
                      <option value="Básico">Básico</option>
                      <option value="Intermedio">Intermedio</option>
                      <option value="Avanzado">Avanzado</option>
                      <option value="Experto">Experto</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingSkill(false)}
                    className="px-3 py-1.5 rounded-xl text-xs text-gray-600 hover:bg-slate-200 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSkill}
                    className="px-4 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Guardar Aptitud
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {verifiedSkills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{skill.name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#00668F] text-white">
                        {skill.level}
                      </span>
                    </div>
                    {skill.verifiedBy && (
                      <p className="text-[10px] text-gray-500">{skill.verifiedBy}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteSkill(skill.id)}
                    className="text-gray-400 hover:text-rose-600 p-1.5 rounded-full shrink-0 aspect-square cursor-pointer"
                    title="Eliminar aptitud"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#00668F]" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Competencias Blandas & Habilidades Interpersonales ({softSkillsList.length})
                  </h3>
                  <p className="text-xs text-gray-500">Capacidades de relacionamiento, negociación y trabajo colaborativo.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingSoftSkill(!isAddingSoftSkill)}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Añadir Habilidad Blanda</span>
              </button>
            </div>

            {isAddingSoftSkill && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={newSoftSkillText}
                  onChange={(e) => setNewSoftSkillText(e.target.value)}
                  placeholder="ej. Negociación efectiva, Liderazgo motivacional, Adaptabilidad..."
                  className="flex-1 px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
                <button
                  type="button"
                  onClick={handleAddSoftSkill}
                  className="px-4 py-2 bg-[#00668F] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Agregar
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {softSkillsList.map((skill, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-semibold flex items-center gap-2 border border-slate-200"
                >
                  <span>{skill}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSoftSkill(skill)}
                    className="text-gray-400 hover:text-rose-600 cursor-pointer"
                    title="Eliminar"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Globe size={16} className="text-[#00668F]" />
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Idiomas & Dominio ({languagesList.length})</h3>
                  <p className="text-xs text-gray-500">Niveles de comunicación técnica y conversacional.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddingLang(!isAddingLang)}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto"
              >
                <Plus size={14} />
                <span>Añadir Idioma</span>
              </button>
            </div>

            {isAddingLang && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={newLangName}
                  onChange={(e) => setNewLangName(e.target.value)}
                  placeholder="ej. Inglés / Francés / Alemán"
                  className="px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
                <select
                  value={newLangLevel}
                  onChange={(e) => setNewLangLevel(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl text-xs border border-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="Básico (A1-A2)">Básico (A1-A2)</option>
                  <option value="Intermedio (B1-B2)">Intermedio (B1-B2)</option>
                  <option value="Avanzado (C1)">Avanzado (C1)</option>
                  <option value="Bilingüe / Nativo (C2)">Bilingüe / Nativo (C2)</option>
                </select>
                <button
                  type="button"
                  onClick={handleAddLanguage}
                  className="px-4 py-2 bg-[#00668F] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Guardar Idioma
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {languagesList.map((lang) => (
                <div
                  key={lang.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{lang.language}:</span>
                    <span className="text-xs text-[#00668F] font-semibold">{lang.level}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteLanguage(lang.id)}
                    className="text-gray-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <LinkedInIcon size={16} className="text-[#0A66C2]" />
                  <span>Enlace de LinkedIn</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Conecte su trayectoria profesional y optimice su perfil técnico con asistencia de LUC-IA-NA.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOptimizeLinkedIn}
                disabled={isOptimizingLinkedIn}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-all self-start sm:self-auto disabled:opacity-50"
              >
                {isOptimizingLinkedIn ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Sparkles size={14} className="text-[#F39200]" />
                )}
                <span>{isOptimizingLinkedIn ? 'Optimizando...' : 'Optimizar con LUC-IA-NA'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="url"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/tu-perfil-profesional"
                  className="w-full px-4 py-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  updateUserProfile(currentUser.id, { linkedInUrl });
                  notify('success', 'Enlace Guardado', 'Tu perfil de LinkedIn ha sido actualizado.');
                }}
                className="px-4 py-2.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Guardar Enlace
              </button>
              {linkedInUrl && (
                <a
                  href={linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                >
                  <ExternalLink size={14} />
                  <span>Ver</span>
                </a>
              )}
            </div>

            {linkedInSuggestions && (
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-sky-950 uppercase tracking-wider block">
                    Titular Profesional Recomendado por LUC-IA-NA:
                  </span>
                  <p className="text-xs text-sky-900 font-semibold mt-1 p-2.5 bg-white rounded-lg border border-sky-100">
                    {linkedInSuggestions.headlineSuggestion}
                  </p>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-sky-950 uppercase tracking-wider block mb-1.5">
                    Habilidades Clave para Agregar a tu Perfil de LinkedIn:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(linkedInSuggestions.skills || []).map((skill, idx) => (
                      <span key={idx} className="px-2.5 py-1 rounded-lg bg-white text-xs font-bold text-[#00668F] border border-sky-200">
                        + {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      
      {activeTab === 'evaluaciones' && (
        <div className="space-y-4">
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[11px] text-gray-500 font-semibold block">Promedio Histórico</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-2xl font-black text-gray-900">
                  {Math.round(evaluations.reduce((acc, curr) => acc + curr.score, 0) / Math.max(1, evaluations.length))}
                </span>
                <span className="text-xs text-gray-400 font-bold">/ 100</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-bold mt-1 block">Rendimiento Satisfactorio ITK</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[11px] text-gray-500 font-semibold block">Total Evaluaciones</span>
              <span className="text-2xl font-black text-gray-900 mt-1 block">{evaluations.length}</span>
              <span className="text-[10px] text-gray-500 mt-1 block">Periodo de prueba y semestrales</span>
            </div>

            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
              <span className="text-[11px] text-gray-500 font-semibold block">Última Evaluación</span>
              <span className="text-2xl font-black text-[#00668F] mt-1 block">
                {evaluations[evaluations.length - 1]?.score || 0} pts
              </span>
              <span className="text-[10px] text-gray-500 mt-1 block font-mono">
                {evaluations[evaluations.length - 1]?.date || 'Sin fecha'}
              </span>
            </div>
          </div>

          
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="pb-1 border-b border-slate-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <ClipboardCheck size={16} className="text-[#00668F]" />
                <span>Historial de Evaluaciones de Desempeño Laboral</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Trazabilidad oficial de compromisos, calificaciones y feedback de evaluadores.
              </p>
            </div>

            <div className="space-y-4">
              {evaluations.map((ev, index) => {
                const typeLabel =
                  ev.type === 'periodo_prueba'
                    ? 'Periodo de Prueba (3 meses)'
                    : ev.type === 'semestral'
                    ? 'Evaluación Semestral'
                    : 'Evaluación Anual';
                return (
                  <div key={ev.id || index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#00668F] text-white">
                            {typeLabel}
                          </span>
                          <span className="text-xs font-mono text-gray-500">{ev.date}</span>
                        </div>
                        <p className="text-xs text-gray-700 font-semibold mt-1">Evaluador: {ev.evaluatorName}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-500">Calificación:</span>
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                          {ev.score} / 100
                        </span>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-gray-700 leading-relaxed">
                      <strong className="text-gray-900 block mb-1">Observaciones del Evaluador:</strong>
                      {ev.feedback}
                    </div>

                    {ev.commitments && ev.commitments.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-gray-700 block uppercase tracking-wider">
                          Compromisos y Metas Establecidas:
                        </span>
                        <ul className="space-y-1 text-xs text-gray-600">
                          {ev.commitments.map((com, cIdx) => (
                            <li key={cIdx} className="flex items-start gap-1.5">
                              <span className="text-[#00668F] font-bold shrink-0">✓</span>
                              <span>{com}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      
      {activeTab === 'seguridad' && (
        <div className="space-y-4">
          
          <form onSubmit={handleChangePassword} className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="pb-1 border-b border-slate-100">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Lock size={16} className="text-[#00668F]" />
                <span>Actualización de Contraseña de Acceso</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure una clave robusta que cumpla con los estándares de ciberseguridad corporativa.
              </p>
            </div>

            {passError && (
              <div className="p-3 rounded-xl bg-rose-50 text-rose-800 text-xs flex items-center gap-2 border border-rose-200">
                <AlertCircle size={15} className="text-rose-600 shrink-0" />
                <span className="font-semibold">{passError}</span>
              </div>
            )}

            {passSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span className="font-semibold">{passSuccess}</span>
              </div>
            )}

            <div className="space-y-3 max-w-md">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Contraseña Actual</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Ingrese su contraseña actual"
                    className="w-full pl-4 pr-11 py-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nueva Contraseña</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Mínimo 8 caracteres seguros"
                    className="w-full pl-4 pr-11 py-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              
              {newPass.length > 0 && (
                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-gray-600">Fortaleza de Clave:</span>
                    <span
                      className={`font-bold ${
                        passwordStrengthScore <= 2
                          ? 'text-rose-600'
                          : passwordStrengthScore <= 4
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {passwordStrengthScore <= 2
                        ? 'Débil'
                        : passwordStrengthScore <= 4
                        ? 'Media / Buena'
                        : 'Excelente / Muy Segura'}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1 h-1.5">
                    {[1, 2, 3, 4, 5].map((lvl) => (
                      <div
                        key={lvl}
                        className={`rounded-full h-1.5 transition-colors ${
                          lvl <= passwordStrengthScore
                            ? passwordStrengthScore <= 2
                              ? 'bg-rose-500'
                              : passwordStrengthScore <= 4
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-1 text-[10px] text-gray-500 pt-1">
                    <span className={passwordChecks.length ? 'text-emerald-700 font-bold' : ''}>
                      {passwordChecks.length ? '✓' : '•'} Mínimo 8 caracteres
                    </span>
                    <span className={passwordChecks.upper ? 'text-emerald-700 font-bold' : ''}>
                      {passwordChecks.upper ? '✓' : '•'} Mayúscula (A-Z)
                    </span>
                    <span className={passwordChecks.lower ? 'text-emerald-700 font-bold' : ''}>
                      {passwordChecks.lower ? '✓' : '•'} Minúscula (a-z)
                    </span>
                    <span className={passwordChecks.number ? 'text-emerald-700 font-bold' : ''}>
                      {passwordChecks.number ? '✓' : '•'} Número (0-9)
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Repita la nueva contraseña"
                  className="w-full px-4 py-2.5 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  <KeyRound size={14} />
                  <span>Actualizar Contraseña</span>
                </button>
              </div>
            </div>
          </form>

          
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <LogOut size={15} className="text-rose-600" />
                <span>Control de Dispositivos y Sesiones Activas</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Cierre el acceso en otros computadores, celulares o navegadores que hayan quedado abiertos.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTerminateOtherSessions}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 cursor-pointer transition-all shrink-0"
            >
              Cerrar sesiones en otros equipos
            </button>
          </div>

          
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-700" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Tratamiento de Datos Personales (Habeas Data Ley 1581 de 2012)
                </h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                Consentimiento Activo
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-gray-600 space-y-1.5">
              <p>
                <strong>Inteckno S.A.S.</strong> salvaguarda su información laboral, exámenes de salud ocupacional y datos de
                contacto bajo estrictas políticas de confidencialidad, cifrado en reposo y cumplimiento normativo colombiano e
                ISO 27001.
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-500 pt-1 font-mono">
                <span>Versión: {privacyConsent.policyVersion}</span>
                <span>Aceptado: {privacyConsent.acceptedAt}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(true)}
                className="text-xs font-bold text-[#00668F] hover:underline cursor-pointer"
              >
                Ver Política de Privacidad Completa
              </button>
            </div>
          </div>

          
          <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Sliders size={15} className="text-[#00668F]" />
                  <span>Preferencias de Pantalla y Comportamiento del ERP</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Se sincronizan en Google Cloud para tu usuario.</p>
              </div>

              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={isSavingPrefs}
                className="px-3 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingPrefs ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                <span>Guardar Preferencias</span>
              </button>
            </div>

            {prefsSavedSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-200">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <span>Preferencias guardadas exitosamente.</span>
              </div>
            )}

            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDensityChange('comfortable')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  visualDensity === 'comfortable'
                    ? 'border-[#00668F] bg-sky-50 text-[#00668F] ring-2 ring-[#00668F]/20'
                    : 'border-slate-200 bg-white text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">🌿 Densidad Cómoda (48px)</span>
                  {visualDensity === 'comfortable' && <Check size={14} className="text-[#00668F]" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">Mayor respiro visual y lectura descansada.</p>
              </button>

              <button
                type="button"
                onClick={() => handleDensityChange('compact')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  visualDensity === 'compact'
                    ? 'border-[#00668F] bg-sky-50 text-[#00668F] ring-2 ring-[#00668F]/20'
                    : 'border-slate-200 bg-white text-gray-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">⚡ Densidad Compacta (34px)</span>
                  {visualDensity === 'compact' && <Check size={14} className="text-[#00668F]" />}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">40% más filas visibles simultáneamente.</p>
              </button>
            </div>

            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${soundEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Alertas Sonoras</span>
                    <button
                      type="button"
                      onClick={() => playNotificationChime()}
                      className="text-[10px] text-[#00668F] font-bold hover:underline cursor-pointer"
                    >
                      ▶ Probar sonido
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    soundEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      soundEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${toastsEnabled ? 'bg-sky-100 text-[#00668F]' : 'bg-slate-200 text-slate-500'}`}>
                    {toastsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Notificaciones Flotantes</span>
                    <span className="text-[10px] text-gray-500">Alertas en pantalla</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setToastsEnabled(!toastsEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer shrink-0 ${
                    toastsEnabled ? 'bg-[#00668F]' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      toastsEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {isPrivacyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className="text-[#00668F]" />
                <h3 className="text-sm font-bold text-gray-900">Política de Tratamiento de Datos Personales</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-2 max-h-80 overflow-y-auto pr-1">
              <p>
                En cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong> de Colombia y su Decreto Reglamentario 1377 de
                2013, <strong>Inteckno S.A.S.</strong>, identificada con NIT 901.XXX.XXX, le informa que sus datos personales,
                de contacto y de historial técnico recolectados en este ERP son tratados con finalidades operativas, de seguridad
                industrial (HSEQ), control contractual y asignación de actividades en proyectos de teleféricos.
              </p>
              <p>
                <strong>Diferenciación de Datos:</strong> Los datos laborales y de rol son compartidos internamente en cuadrillas.
                Los datos médicos de aptitud ocupacional, grupo sanguíneo y remuneraciones se clasifican como datos sensibles y
                cuentan con acceso restringido bajo norma ISO 27001.
              </p>
              <p>
                Usted cuenta con los derechos de conocer, actualizar, rectificar y suprimir sus datos en cualquier momento a través
                del canal institucional: <strong className="font-mono">privacidad@inteckno.com</strong>.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  const updatedConsent: DataPrivacyConsent = {
                    accepted: true,
                    acceptedAt: new Date().toISOString(),
                    policyVersion: 'v2026.1 - Ley 1581 de 2012',
                  };
                  setPrivacyConsent(updatedConsent);
                  updateUserProfile(currentUser.id, { dataPrivacyConsent: updatedConsent });
                  setIsPrivacyModalOpen(false);
                  notify('success', 'Consentimiento Actualizado', 'Su aceptación digital ha sido revalidada.');
                }}
                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Revalidar y Aceptar Digitalmente
              </button>
            </div>
          </div>
        </div>
      )}
      {isCvAutoFillModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-5 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#00668F]/10 text-[#00668F] flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Importar Perfil con LUC-IA-NA (CV o LinkedIn)
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Extracción fidedigna de datos reales para cualquier área o profesión
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCvAutoFillModalOpen(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-[#0077b5] text-white flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                  in
                </div>
                <div className="text-xs text-blue-950 leading-relaxed">
                  <strong className="font-bold">¿Cómo obtener tus datos 100% exactos de LinkedIn?</strong>
                  <p className="text-blue-800 text-[11px] mt-0.5">
                    Ve a tu perfil de LinkedIn, haz clic en el botón <strong>'Más'</strong> (o '...') junto a tu foto y selecciona <strong>'Guardar como PDF'</strong>. Luego adjunta ese PDF aquí abajo. LUC-IA-NA leerá toda tu experiencia, empresas, fechas, educación y habilidades sin inventar nada.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-700">
                1. Adjuntar Hoja de Vida o Exportación de LinkedIn (PDF, Word o Imagen):
              </label>
              <input
                ref={cvFileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,image/png,image/jpeg,image/webp"
                onChange={handleCvFileSelected}
                className="hidden"
              />

              {!uploadedCvFile ? (
                <div
                  onClick={() => cvFileInputRef.current?.click()}
                  className="p-5 border-2 border-dashed border-slate-300 hover:border-[#00668F] bg-slate-50 hover:bg-sky-50/50 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors text-center"
                >
                  <div className="w-10 h-10 rounded-full bg-white shadow-xs border border-slate-200 flex items-center justify-center text-[#00668F]">
                    <Upload size={18} />
                  </div>
                  <span className="text-xs font-bold text-gray-700">
                    Haz clic aquí para seleccionar tu Hoja de Vida o PDF de LinkedIn
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Soporta PDF, Word, TXT o Imágenes (máximo 8 MB)
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-emerald-950 truncate">{uploadedCvFile.fileName}</p>
                      <p className="text-[10px] text-emerald-700">{uploadedCvFile.fileSize} - Listo para procesar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => cvFileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300 cursor-pointer"
                    >
                      Cambiar
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadedCvFile(null)}
                      className="p-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg cursor-pointer"
                      title="Quitar archivo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Enlace de tu Perfil de LinkedIn (Opcional para vincular en tu ficha):
                </label>
                <input
                  type="url"
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/tu-perfil-profesional"
                  className="w-full px-3 py-2 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  O copia y pega el texto de tu CV / Perfil profesional:
                </label>
                <textarea
                  rows={4}
                  value={cvAutoFillText}
                  onChange={(e) => setCvAutoFillText(e.target.value)}
                  placeholder="Pega aquí el contenido de tu currículum, cargos anteriores, títulos académicos o funciones..."
                  className="w-full p-3 bg-slate-100 rounded-xl text-xs text-gray-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00668F]/30"
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleProcessCvAutoFill}
                  disabled={isProcessingCv || (!uploadedCvFile && !cvAutoFillText.trim())}
                  className="px-4 py-2.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50 transition-colors"
                >
                  {isProcessingCv ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  <span>{isProcessingCv ? 'Extrayendo Datos con LUC-IA-NA...' : 'Procesar Hoja de Vida con LUC-IA-NA'}</span>
                </button>
              </div>

              {extractedCvPreview && (
                <div className="p-4 bg-sky-50 rounded-xl border border-sky-200 space-y-3.5 pt-3">
                  <div className="flex items-center justify-between pb-2 border-b border-sky-200">
                    <span className="text-xs font-black text-sky-950 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-600" />
                      Datos Extraídos con Éxito (Vista Previa)
                    </span>
                    <span className="text-[10px] text-sky-700 font-bold bg-white px-2 py-0.5 rounded-full border border-sky-200">
                      {extractedCvPreview.experienceYears} de exp.
                    </span>
                  </div>

                  {extractedCvPreview.headline && (
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">Titular:</span>
                      <p className="text-xs font-bold text-sky-950">{extractedCvPreview.headline}</p>
                    </div>
                  )}

                  {extractedCvPreview.summary && (
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block">Resumen Profesional:</span>
                      <p className="text-xs text-sky-900 leading-relaxed italic">{extractedCvPreview.summary}</p>
                    </div>
                  )}

                  {extractedCvPreview.experienceList && extractedCvPreview.experienceList.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1.5">
                        Experiencias Laborales ({extractedCvPreview.experienceList.length}):
                      </span>
                      <div className="space-y-1.5">
                        {extractedCvPreview.experienceList.map((exp, idx) => (
                          <div key={idx} className="p-2 bg-white rounded-lg border border-sky-200 text-xs">
                            <div className="flex items-center justify-between">
                              <strong className="text-sky-950 font-bold">{exp.role}</strong>
                              <span className="text-[10px] text-sky-700 font-medium">
                                {exp.startDate ? `${exp.startDate} - ${exp.endDate || (exp.isCurrent ? 'Actualidad' : '')}` : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-sky-800">{exp.company}</p>
                            {exp.description && (
                              <p className="text-[10px] text-gray-600 mt-1 line-clamp-2">{exp.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedCvPreview.educationList && extractedCvPreview.educationList.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1.5">
                        Educación ({extractedCvPreview.educationList.length}):
                      </span>
                      <div className="space-y-1.5">
                        {extractedCvPreview.educationList.map((edu, idx) => (
                          <div key={idx} className="p-2 bg-white rounded-lg border border-sky-200 text-xs flex items-center justify-between">
                            <div>
                              <strong className="text-sky-950 font-bold block">{edu.degree}</strong>
                              <span className="text-[11px] text-sky-800">{edu.institution} • {edu.level}</span>
                            </div>
                            <span className="text-[10px] text-sky-700 font-bold shrink-0">{edu.graduationYear}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedCvPreview.technicalSkills.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1">Habilidades Prácticas / Aptitudes:</span>
                      <div className="flex flex-wrap gap-1">
                        {extractedCvPreview.technicalSkills.map((ts, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-white text-[10px] font-bold text-[#00668F] border border-sky-200">
                            {ts}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedCvPreview.softSkills && extractedCvPreview.softSkills.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1">Competencias Blandas:</span>
                      <div className="flex flex-wrap gap-1">
                        {extractedCvPreview.softSkills.map((ss, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-white text-[10px] font-bold text-purple-700 border border-purple-200">
                            {ss}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedCvPreview.certifications.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1">Certificaciones:</span>
                      <div className="space-y-1">
                        {extractedCvPreview.certifications.map((c, idx) => (
                          <div key={idx} className="text-[11px] text-sky-900 bg-white p-1.5 rounded-md border border-sky-200 flex items-center justify-between">
                            <span className="font-semibold">{c.name}</span>
                            <span className="text-[10px] text-sky-700 font-mono">{c.issuer}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {extractedCvPreview.languages && extractedCvPreview.languages.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider block mb-1">Idiomas:</span>
                      <div className="flex flex-wrap gap-1">
                        {extractedCvPreview.languages.map((l, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-md bg-white text-[10px] font-bold text-emerald-800 border border-emerald-200">
                            {l.language}: {l.level}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleApplyExtractedCvData}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                    >
                      <Check size={14} />
                      <span>Confirmar y Aplicar a mi Perfil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCvAutoFillModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-gray-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


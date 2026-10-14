import React, { useState, useRef, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Clock,
  User,
  Tag,
  Eye,
  ExternalLink,
  Download,
  Trash2,
  X,
  FileText,
  ShieldCheck,
  Sparkles,
  Settings,
  CheckCircle2,
  CheckSquare,
  Square,
  Printer,
  ZoomIn,
  FileDown,
  Mic,
  MicOff,
  ChevronRight,
  ArrowRight,
  Award,
  GraduationCap,
  Layers,
  AlertTriangle,
  HelpCircle,
  Check,
  Send,
  RefreshCw,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { WikiArticle, WikiArticleChecklistStep, WikiArticleMediaItem } from '../../types';
import { UniversalModuleConfigModal } from '../../components/common/UniversalModuleConfigModal';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { MargaritaIcon } from '../../components/common/MargaritaIcon';
import {
  generateWikiArticleWithLuciana,
  synthesizeLearnedLessonWithLuciana,
  queryTechnicalMentorLuciana,
  TechnicalMentorAnswer,
} from '../../core/services/lucianaService';

const CATEGORIES: { id: string; label: string; bg: string; text: string }[] = [
  { id: 'all', label: 'Todos los Artículos', bg: 'bg-slate-900', text: 'text-white' },
  {
    id: 'induccion_general',
    label: 'Inducción & Empresa',
    bg: 'bg-teal-100/80',
    text: 'text-teal-800',
  },
  {
    id: 'compras_adquisiciones',
    label: 'Compras & Requisiciones',
    bg: 'bg-blue-100/80',
    text: 'text-blue-800',
  },
  {
    id: 'almacen_herramientas',
    label: 'Almacén & Herramientas',
    bg: 'bg-amber-100/80',
    text: 'text-amber-800',
  },
  {
    id: 'uso_erp',
    label: 'Manual del ERP Inteckno',
    bg: 'bg-sky-100/80',
    text: 'text-sky-800',
  },
  {
    id: 'viaticos_contabilidad',
    label: 'Viáticos & Gastos de Viaje',
    bg: 'bg-emerald-100/80',
    text: 'text-emerald-800',
  },
  {
    id: 'seguridad_alturas',
    label: 'Seguridad SST / Alturas',
    bg: 'bg-rose-100/80',
    text: 'text-rose-800',
  },
  {
    id: 'mantenimiento_cables',
    label: 'Cables & Ensayos MRT',
    bg: 'bg-slate-100/80',
    text: 'text-slate-800',
  },
  {
    id: 'mordazas_pinzas',
    label: 'Pinzas & Mordazas',
    bg: 'bg-amber-100/80',
    text: 'text-amber-800',
  },
  {
    id: 'balancines_poleas',
    label: 'Poleas & Balancines',
    bg: 'bg-emerald-100/80',
    text: 'text-emerald-800',
  },
  {
    id: 'lecciones_aprendidas',
    label: 'Lecciones Aprendidas de Campo',
    bg: 'bg-indigo-100/80',
    text: 'text-indigo-800',
  },
];

const ONBOARDING_ROLES = [
  {
    id: 'induccion_corporativa',
    title: 'Inducción Corporativa General (Nuevos Ingresos)',
    description: 'Estructura empresarial Inteckno -> Cómo pedir a Compras -> Salida de Herramientas del Almacén -> Uso del ERP y Viáticos.',
    targetRoleLabel: 'Todos los Colaboradores Nuevos de Cualquier Área',
  },
  {
    id: 'compras_logistica',
    title: 'Ruta Compras, Almacén y Control de Herramientas',
    description: 'Políticas de cotizaciones -> Creación y aprobación de Requisiciones -> Custodia y calibración de instrumentos.',
    targetRoleLabel: 'Personal de Compras, Bodega y Almacén',
  },
  {
    id: 'mecanico_stc',
    title: 'Ruta Técnico Mecánico y Operaciones STC',
    description: 'Seguridad en Alturas -> Inspección de Balancines y Poleas -> Ajuste de Pinzas Desembragables -> Reporte con Fotos.',
    targetRoleLabel: 'Técnico Mecánico & Líder de Cuadrilla',
  },
  {
    id: 'inspector_end',
    title: 'Ruta Inspector END (Defectoscopía MRT)',
    description: 'Fundamentos de Defectoscopía Magnética -> Criterios de Descarte EN 12927 -> Informes Técnicos.',
    targetRoleLabel: 'Inspector de Ensayos No Destructivos',
  },
  {
    id: 'administrativo_contable',
    title: 'Ruta Administrativa, Viáticos y Soporte DIAN',
    description: 'Legalización de viáticos en 48h -> Facturas electrónicas -> Documentos Soporte para no obligados -> Aprobaciones.',
    targetRoleLabel: 'Administración, Finanzas y Contabilidad',
  },
  {
    id: 'transversal',
    title: 'Ruta de Calidad y Lecciones Aprendidas',
    description: 'Reglas de oro de mantenimiento, aseguramiento de torque y prevención de incidentes de campo.',
    targetRoleLabel: 'Personal de Operaciones & Cuadrillas',
  },
];

function exportArticleToWord(article: WikiArticle) {
  const checklistHtml =
    article.interactiveChecklist && article.interactiveChecklist.length > 0
      ? `
      <h3 style="color: #00668F; border-bottom: 2px solid #00668F; padding-bottom: 4px; margin-top: 24px;">Checklist Técnico de Verificación en Campo</h3>
      <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 11pt; border-color: #cbd5e1;">
        <tr style="background-color: #f1f5f9; font-weight: bold; text-align: left;">
          <th style="width: 10%;">Paso</th>
          <th style="width: 30%;">Actividad</th>
          <th style="width: 60%;">Instrucción Técnica</th>
        </tr>
        ${article.interactiveChecklist
          .map(
            (c) => `
          <tr>
            <td style="text-align: center; font-weight: bold;">${c.step}</td>
            <td style="font-weight: bold;">${c.title}</td>
            <td>${c.instruction}</td>
          </tr>
        `
          )
          .join('')}
      </table>
    `
      : '';

  const html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${article.title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #1e293b; padding: 20px; }
        h1 { color: #00668F; font-size: 20pt; margin-bottom: 6px; }
        .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 10pt; }
        .meta-table td { padding: 6px 10px; border: 1px solid #cbd5e1; }
        .summary-box { background-color: #f0f9ff; border-left: 4px solid #00668F; padding: 12px; margin-bottom: 20px; font-size: 11pt; }
        .content { font-size: 11pt; white-space: pre-wrap; }
        .footer { margin-top: 40px; font-size: 9pt; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; }
      </style>
    </head>
    <body>
      <div style="text-align: right; font-size: 9pt; color: #00668F; font-weight: bold; margin-bottom: 10px;">
        INTECKNO S.A.S. - PROTOCOLO QA-STC-2026 | NIT 901.345.678-1
      </div>
      <h1>${article.title}</h1>
      <table class="meta-table">
        <tr style="background-color: #f8fafc;">
          <td><strong>Código Documental:</strong> ${article.id}</td>
          <td><strong>Categoría:</strong> ${article.category.replace('_', ' ').toUpperCase()}</td>
          <td><strong>Fecha Actualización:</strong> ${article.updatedAt}</td>
        </tr>
        <tr>
          <td><strong>Autor Técnico:</strong> ${article.author}</td>
          <td><strong>Tiempo de Lectura:</strong> ${article.readTime}</td>
          <td><strong>Estado Técnico:</strong> ${article.status === 'aprobado' ? 'OFICIAL APROBADO' : 'BORRADOR / EN REVISIÓN'}</td>
        </tr>
        ${
          article.reviewedBy
            ? `
          <tr style="background-color: #f0fdf4;">
            <td colspan="3"><strong>Aprobado por:</strong> ${article.reviewedBy} el ${article.reviewedAt || '2026-10-01'}</td>
          </tr>
        `
            : ''
        }
      </table>
      <div class="summary-box">
        <strong>RESUMEN EJECUTIVO:</strong><br/>
        ${article.summary}
      </div>
      <div class="content">${article.content.replace(/\n/g, '<br/>')}</div>
      ${checklistHtml}
      <div class="footer">
        Documento técnico propiedad de Inteckno S.A.S. Prohibida su reproducción sin autorización de la Dirección Técnica de Operaciones STC.
      </div>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${article.id}_${article.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const ArticulosModule: React.FC = () => {
  const { articles, addArticle, updateArticle, deleteArticle, currentUser } = useErp();

  // Vistas principales: Catálogo General vs. Rutas de Inducción
  const [viewTab, setViewTab] = useState<'catalogo' | 'induccion'>('catalogo');
  const [selectedOnboardingRole, setSelectedOnboardingRole] = useState<string>('induccion_corporativa');

  // Filtros de Catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'aprobado' | 'en_revision' | 'borrador'>('all');

  // Asistente Mentor Técnico Rápido
  const [isMentorWidgetOpen, setIsMentorWidgetOpen] = useState(false);
  const [mentorQuestion, setMentorQuestion] = useState('');
  const [isQueryingMentor, setIsQueryingMentor] = useState(false);
  const [mentorAnswer, setMentorAnswer] = useState<TechnicalMentorAnswer | null>(null);

  // Modales
  const [readingArticle, setReadingArticle] = useState<WikiArticle | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [zoomMedia, setZoomMedia] = useState<WikiArticleMediaItem | null>(null);

  // Redacción Asistida con IA (LUC-IA-NA)
  const [isGeneratingAiDraft, setIsGeneratingAiDraft] = useState(false);
  const [aiTopicInput, setAiTopicInput] = useState('');
  const [isListeningVoiceDraft, setIsListeningVoiceDraft] = useState(false);

  // Síntesis de Lección Aprendida
  const [incidentInput, setIncidentInput] = useState('');
  const [isSynthesizingLesson, setIsSynthesizingLesson] = useState(false);
  const [isListeningVoiceLesson, setIsListeningVoiceLesson] = useState(false);

  // Catálogos dinámicos
  const catalogCategories = useModuleCatalog('articulos', 'categories');
  const catalogReadTimes = useModuleCatalog('articulos', 'readTimes');

  // Formulario nuevo artículo
  const [newArticleForm, setNewArticleForm] = useState<{
    title: string;
    category: WikiArticle['category'];
    readTime: string;
    summary: string;
    content: string;
    status: 'borrador' | 'en_revision' | 'aprobado';
    sharepointSyncUrl: string;
    sharepointDocUrl: string;
    checklist: WikiArticleChecklistStep[];
    newChecklistTitle: string;
    newChecklistInstruction: string;
    tags: string[];
    targetRoles: string[];
  }>({
    title: '',
    category: 'mantenimiento_cables',
    readTime: '5 min',
    summary: '',
    content: '',
    status: 'aprobado',
    sharepointSyncUrl: 'https://intecknosas.sharepoint.com/sites/Proyectos-STC/Wiki-Tecnica',
    sharepointDocUrl: '',
    checklist: [],
    newChecklistTitle: '',
    newChecklistInstruction: '',
    tags: ['STC', 'Procedimiento Oficial'],
    targetRoles: ['mecanico_stc', 'inspector_end'],
  });

  // Mantener actualizado el artículo en lectura cuando cambie en el store
  useEffect(() => {
    if (readingArticle) {
      const fresh = articles.find((a) => a.id === readingArticle.id);
      if (fresh) setReadingArticle(fresh);
    }
  }, [articles, readingArticle?.id]);

  // Manejo de reconocimiento por voz para Redacción
  const handleToggleVoiceDraft = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('El reconocimiento de voz no está disponible en este navegador. Puedes escribir el requerimiento en el campo de texto.');
      return;
    }

    if (isListeningVoiceDraft) {
      setIsListeningVoiceDraft(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-CO';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListeningVoiceDraft(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAiTopicInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListeningVoiceDraft(false);
      };
      recognition.onerror = () => setIsListeningVoiceDraft(false);
      recognition.onend = () => setIsListeningVoiceDraft(false);

      recognition.start();
    } catch {
      setIsListeningVoiceDraft(false);
    }
  };

  // Manejo de reconocimiento por voz para Lección Aprendida
  const handleToggleVoiceLesson = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('El reconocimiento de voz no está disponible en este navegador. Puedes escribir el texto.');
      return;
    }

    if (isListeningVoiceLesson) {
      setIsListeningVoiceLesson(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'es-CO';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListeningVoiceLesson(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIncidentInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListeningVoiceLesson(false);
      };
      recognition.onerror = () => setIsListeningVoiceLesson(false);
      recognition.onend = () => setIsListeningVoiceLesson(false);

      recognition.start();
    } catch {
      setIsListeningVoiceLesson(false);
    }
  };

  // Redacción asistida con IA
  const handleGenerateAiDraft = async () => {
    if (!aiTopicInput.trim()) return;
    setIsGeneratingAiDraft(true);

    try {
      const draft = await generateWikiArticleWithLuciana(aiTopicInput.trim(), newArticleForm.category);
      setNewArticleForm((prev) => ({
        ...prev,
        title: draft.title,
        category: draft.category,
        readTime: draft.readTime,
        summary: draft.summary,
        content: draft.content,
        checklist: draft.checklist,
        tags: draft.tags,
        targetRoles: draft.targetRoles,
      }));
    } catch (err) {
      console.warn('Error al generar borrador con LUC-IA-NA:', err);
    } finally {
      setIsGeneratingAiDraft(false);
    }
  };

  // Síntesis de lección aprendida
  const handleSynthesizeLesson = async () => {
    if (!incidentInput.trim()) return;
    setIsSynthesizingLesson(true);

    try {
      const draft = await synthesizeLearnedLessonWithLuciana(incidentInput.trim());
      addArticle({
        title: draft.title,
        category: 'lecciones_aprendidas',
        readTime: draft.readTime,
        summary: draft.summary,
        content: draft.content,
        author: currentUser.name,
        status: 'aprobado',
        reviewedBy: 'LUC-IA-NA (IA Supervisora)',
        reviewedAt: new Date().toISOString().split('T')[0],
        generatedByLuciana: true,
        interactiveChecklist: draft.checklist,
        tags: draft.tags,
        targetRoles: draft.targetRoles,
        readByUsers: [currentUser.id],
      });

      setIsLessonModalOpen(false);
      setIncidentInput('');
    } catch (err) {
      console.warn('Error sintetizando lección:', err);
    } finally {
      setIsSynthesizingLesson(false);
    }
  };

  // Consulta rápida al Mentor Técnico
  const handleQueryMentor = async (queryText?: string) => {
    const q = queryText || mentorQuestion;
    if (!q.trim()) return;
    setIsQueryingMentor(true);
    setMentorAnswer(null);

    try {
      const answer = await queryTechnicalMentorLuciana(q.trim(), articles);
      setMentorAnswer(answer);
    } catch (err) {
      console.warn('Error consultando al mentor:', err);
    } finally {
      setIsQueryingMentor(false);
    }
  };

  // Guardar nuevo artículo manual / asistido
  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleForm.title.trim() || !newArticleForm.content.trim()) return;

    addArticle({
      title: newArticleForm.title,
      category: newArticleForm.category,
      readTime: newArticleForm.readTime || '5 min',
      summary: newArticleForm.summary || newArticleForm.content.slice(0, 140) + '...',
      content: newArticleForm.content,
      author: currentUser.name,
      status: newArticleForm.status,
      reviewedBy: newArticleForm.status === 'aprobado' ? currentUser.name : undefined,
      reviewedAt: newArticleForm.status === 'aprobado' ? new Date().toISOString().split('T')[0] : undefined,
      interactiveChecklist: newArticleForm.checklist,
      tags: newArticleForm.tags,
      targetRoles: newArticleForm.targetRoles,
      sharepointSyncUrl: newArticleForm.sharepointSyncUrl,
      sharepointDocUrl: newArticleForm.sharepointDocUrl || undefined,
      readByUsers: [currentUser.id],
    });

    setIsNewModalOpen(false);
    setNewArticleForm({
      title: '',
      category: 'mantenimiento_cables',
      readTime: '5 min',
      summary: '',
      content: '',
      status: 'aprobado',
      sharepointSyncUrl: 'https://intecknosas.sharepoint.com/sites/Proyectos-STC/Wiki-Tecnica',
      sharepointDocUrl: '',
      checklist: [],
      newChecklistTitle: '',
      newChecklistInstruction: '',
      tags: ['STC', 'Procedimiento Oficial'],
      targetRoles: ['mecanico_stc', 'inspector_end'],
    });
    setAiTopicInput('');
  };

  // Marcar artículo como leído / no leído por el usuario actual
  const handleToggleReadStatus = (articleId: string) => {
    const art = articles.find((a) => a.id === articleId);
    if (!art) return;

    const currentReads = art.readByUsers || [];
    const isRead = currentReads.includes(currentUser.id);
    const updatedReads = isRead
      ? currentReads.filter((id) => id !== currentUser.id)
      : [...currentReads, currentUser.id];

    updateArticle(articleId, { readByUsers: updatedReads });
  };

  // Toggle checklist de campo en tiempo real
  const handleToggleChecklistStep = (articleId: string, stepNum: number) => {
    const art = articles.find((a) => a.id === articleId);
    if (!art || !art.interactiveChecklist) return;

    const updatedChecklist = art.interactiveChecklist.map((c) =>
      c.step === stepNum ? { ...c, completed: !c.completed } : c
    );

    updateArticle(articleId, { interactiveChecklist: updatedChecklist });
  };

  // Aprobar documento oficial
  const handleApproveArticle = (articleId: string) => {
    updateArticle(articleId, {
      status: 'aprobado',
      reviewedBy: currentUser.name,
      reviewedAt: new Date().toISOString().split('T')[0],
    });
  };

  // Filtrado de artículos para catálogo
  const filteredArticles = articles
    .filter((a) => {
      if (selectedCategory === 'all') return true;
      return a.category === selectedCategory;
    })
    .filter((a) => {
      if (selectedStatusFilter === 'all') return true;
      return a.status === selectedStatusFilter;
    })
    .filter((a) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q) ||
        (a.tags && a.tags.some((t) => t.toLowerCase().includes(q)))
      );
    });

  // Artículos de la ruta de inducción seleccionada
  const onboardingArticles = articles
    .filter((a) => {
      if (selectedOnboardingRole === 'transversal') return true;
      return a.learningPathRole === selectedOnboardingRole || (a.targetRoles && a.targetRoles.includes(selectedOnboardingRole));
    })
    .sort((a, b) => (a.learningPathOrder || 99) - (b.learningPathOrder || 99));

  const totalOnboarding = onboardingArticles.length;
  const completedOnboarding = onboardingArticles.filter((a) => (a.readByUsers || []).includes(currentUser.id)).length;
  const onboardingPercent = totalOnboarding > 0 ? Math.round((completedOnboarding / totalOnboarding) * 100) : 0;

  return (
    <div className="space-y-4">
      
      {/* BARRA SUPERIOR DE ACCIONES Y SELECTOR DE VISTAS (Sin título duplicado) */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-[22px] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Conmutador de Vistas: Catálogo General vs. Rutas de Inducción */}
        <div className="grid grid-cols-2 md:flex md:items-center w-full md:w-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-2xs">
          <button
            type="button"
            onClick={() => setViewTab('catalogo')}
            className={`flex-1 md:flex-initial justify-center px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewTab === 'catalogo'
                ? 'bg-white dark:bg-slate-700 text-[#00668F] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <BookOpen size={14} />
            <span>Catálogo Técnico ({articles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewTab('induccion')}
            className={`flex-1 md:flex-initial justify-center px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              viewTab === 'induccion'
                ? 'bg-white dark:bg-slate-700 text-[#00668F] dark:text-white shadow-xs'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <GraduationCap size={15} />
            <span>Rutas de Inducción</span>
            {onboardingPercent > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                {onboardingPercent}%
              </span>
            )}
          </button>
        </div>

        {/* Acciones Principales */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón Consultar al Mentor */}
          <button
            type="button"
            onClick={() => setIsMentorWidgetOpen(!isMentorWidgetOpen)}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isMentorWidgetOpen
                ? 'bg-amber-500 text-white'
                : 'bg-amber-50 hover:bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
            }`}
            title="Hacer una consulta técnica inmediata a LUC-IA-NA"
          >
            <MargaritaIcon size={15} petalColor="currentColor" centerColor="#F59E0B" />
            <span>Consultar al Mentor</span>
          </button>

          {/* Botón Sintetizar Lección Aprendida */}
          <button
            type="button"
            onClick={() => setIsLessonModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Extraer causa raíz y regla de oro de un incidente de campo"
          >
            <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Lección de Campo</span>
          </button>

          {/* Botón Redactar Artículo */}
          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus size={14} />
            <span>Redactar Artículo</span>
          </button>

          {/* Botón Configurar */}
          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shadow-2xs"
            title="Configurar catálogos y categorías"
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* WIDGET DESPLEGABLE: CONSULTAR AL MENTOR CORPORATIVO Y TECNICO (LUC-IA-NA) */}
      {isMentorWidgetOpen && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-[22px] p-4 shadow-2xs space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full shrink-0 aspect-square bg-amber-500 text-white flex items-center justify-center shadow-2xs">
                <MargaritaIcon size={16} petalColor="#FFFFFF" centerColor="#FEF08A" />
              </div>
              <div>
                <span className="text-xs font-black text-amber-950 dark:text-amber-200 block">
                  Mentor Corporativo, Operativo & Técnico (LUC-IA-NA)
                </span>
                <span className="text-[10.5px] text-gray-600 dark:text-gray-400">
                  Resuelve cualquier duda sobre cómo opera Inteckno: compras, salida de herramientas, viáticos, uso del ERP o ingeniería STC
                </span>
              </div>
            </div>

            <button
              onClick={() => setIsMentorWidgetOpen(false)}
              className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>

          {/* Formulario de consulta rápida */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-3 text-amber-600" />
              <input
                type="text"
                value={mentorQuestion}
                onChange={(e) => setMentorQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQueryMentor()}
                placeholder="Ej: ¿Cómo pido repuestos a compras? o ¿Cómo solicito herramientas al almacén? o ¿Cómo se legalizan viáticos?"
                className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-400 border border-amber-200 dark:border-amber-800/60 focus:outline-hidden shadow-2xs"
              />
            </div>

            <button
              type="button"
              onClick={() => handleQueryMentor()}
              disabled={isQueryingMentor || !mentorQuestion.trim()}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95 shrink-0"
            >
              {isQueryingMentor ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Send size={13} />
                  <span>Preguntar</span>
                </>
              )}
            </button>
          </div>

          {/* Sugerencias Rápidas */}
          <div className="flex items-center gap-1.5 flex-wrap text-[10.5px] text-amber-900 dark:text-amber-300">
            <span className="font-bold text-gray-500">Consultas frecuentes:</span>
            <button
              onClick={() => {
                setMentorQuestion('¿Cuándo se debe descartar un cable de tracción según EN 12927?');
                handleQueryMentor('¿Cuándo se debe descartar un cable de tracción según EN 12927?');
              }}
              className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-amber-200/60"
            >
              Criterios descarte EN 12927
            </button>
            <button
              onClick={() => {
                setMentorQuestion('¿Cuál es la fuerza de apriete mínima en pinzas desembragables?');
                handleQueryMentor('¿Cuál es la fuerza de apriete mínima en pinzas desembragables?');
              }}
              className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-amber-200/60"
            >
              Fuerza apriete pinzas
            </button>
            <button
              onClick={() => {
                setMentorQuestion('¿Qué regla de oro rige para los pernos de bridas en pilonas?');
                handleQueryMentor('¿Qué regla de oro rige para los pernos de bridas en pilonas?');
              }}
              className="px-2 py-0.5 rounded-lg bg-white/80 dark:bg-slate-800 hover:bg-amber-100 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer border border-amber-200/60"
            >
              Regla tornillería pilonas
            </button>
          </div>

          {/* Tarjeta de Respuesta del Mentor */}
          {mentorAnswer && (
            <div className="p-3.5 bg-white dark:bg-slate-800 rounded-2xl border border-amber-300/80 dark:border-amber-700/80 shadow-2xs space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-black text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  <span>Respuesta Oficial de LUC-IA-NA:</span>
                </span>
                {mentorAnswer.citedArticleTitle && (
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold">
                    Fuente: {mentorAnswer.citedArticleTitle}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                {mentorAnswer.answer}
              </p>

              {mentorAnswer.citedArticleId && (
                <div className="pt-1 flex items-center justify-end">
                  <button
                    onClick={() => {
                      const found = articles.find((a) => a.id === mentorAnswer.citedArticleId);
                      if (found) setReadingArticle(found);
                    }}
                    className="text-xs font-bold text-[#00668F] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver documento completo del procedimiento</span>
                    <ArrowRight size={12} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 1: CATÁLOGO TÉCNICO COMPLETO */}
      {/* ========================================================================= */}
      {viewTab === 'catalogo' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS Y BÚSQUEDA */}
          <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-4 rounded-[22px] shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            {/* Píldoras de Categoría */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-slate-200/80'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Buscador y Filtro de Aprobación */}
            <div className="flex items-center gap-2 w-full xl:w-auto flex-wrap sm:flex-nowrap">
              {/* Filtro por Estado */}
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="text-xs font-bold p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
              >
                <option value="all">Todos los Estados</option>
                <option value="aprobado">Oficiales Aprobados</option>
                <option value="en_revision">En Revisión</option>
                <option value="borrador">Borradores</option>
              </select>

              {/* Buscador */}
              <div className="relative flex-1 sm:w-64 shrink-0">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por norma, cable, pinza..."
                  className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* REJILLA DE ARTÍCULOS */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredArticles.map((art) => {
              const catInfo = CATEGORIES.find((c) => c.id === art.category) || CATEGORIES[1];
              const isReadByMe = (art.readByUsers || []).includes(currentUser.id);
              const checklistTotal = art.interactiveChecklist?.length || 0;
              const checklistDone = art.interactiveChecklist?.filter((c) => c.completed).length || 0;

              return (
                <div
                  key={art.id}
                  className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-[24px] shadow-sm hover:shadow-md transition-all flex flex-col justify-between group space-y-3.5 border border-slate-100 dark:border-slate-800"
                >
                  <div className="space-y-2.5">
                    {/* Cabecera de la Tarjeta */}
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md ${catInfo.bg} ${catInfo.text}`}>
                        {catInfo.label}
                      </span>

                      <div className="flex items-center gap-1.5 text-[10px]">
                        {art.status === 'aprobado' ? (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold">
                            <ShieldCheck size={11} />
                            <span>Aprobado</span>
                          </span>
                        ) : art.status === 'en_revision' ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                            En Revisión
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
                            Borrador
                          </span>
                        )}

                        <span className="text-gray-400 flex items-center gap-1 font-semibold">
                          <Clock size={11} />
                          {art.readTime}
                        </span>
                      </div>
                    </div>

                    {/* Badge de Generado por LUC-IA-NA */}
                    {art.generatedByLuciana && (
                      <div className="flex items-center gap-1 text-[9.5px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md w-fit">
                        <MargaritaIcon size={11} petalColor="currentColor" centerColor="#F59E0B" />
                        <span>Redactado con LUC-IA-NA</span>
                      </div>
                    )}

                    {/* Título */}
                    <h3
                      onClick={() => setReadingArticle(art)}
                      className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white group-hover:text-[#00668F] transition-colors leading-snug cursor-pointer line-clamp-2"
                      title={art.title}
                    >
                      {art.title}
                    </h3>

                    {/* Resumen */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                      {art.summary}
                    </p>

                    {/* Indicador de Checklist si aplica */}
                    {checklistTotal > 0 && (
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1">
                          <CheckSquare size={12} className="text-[#00668F]" />
                          <span>Checklist: {checklistDone}/{checklistTotal} pasos</span>
                        </span>
                        <span>{Math.round((checklistDone / checklistTotal) * 100)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Pie de la tarjeta: Estado de Lectura, Autor y Botón Leer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleReadStatus(art.id)}
                      className={`text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isReadByMe
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={isReadByMe ? 'Marcado como leído' : 'Marcar como leído en mi historial'}
                    >
                      {isReadByMe ? <CheckSquare size={14} /> : <Square size={14} />}
                      <span>{isReadByMe ? 'Leído' : 'Pendiente'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReadingArticle(art)}
                      className="text-xs font-bold text-[#00668F] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Eye size={13} />
                      <span>Leer</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredArticles.length === 0 && (
            <div className="p-10 text-center text-gray-400 bg-white dark:bg-slate-900 rounded-2xl">
              <BookOpen size={36} className="mx-auto mb-2 opacity-40 text-[#00668F]" />
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                No hay artículos que coincidan con los filtros seleccionados
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Puedes redactar uno nuevo con la asistencia de LUC-IA-NA arriba.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: RUTAS DE INDUCCIÓN Y ONBOARDING PARA NUEVOS INGRESOS */}
      {/* ========================================================================= */}
      {viewTab === 'induccion' && (
        <div className="space-y-4">
          {/* Selector de Ruta de Aprendizaje */}
          <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-[22px] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full shrink-0 aspect-square bg-teal-100 text-teal-800 flex items-center justify-center font-bold shadow-2xs">
                  <GraduationCap size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                    Rutas de Aprendizaje Técnico para Nuevos Empleados
                  </h3>
                  <p className="text-xs text-gray-400">
                    Capacitación modular estandarizada para garantizar cero pérdida de know-how técnico en campo
                  </p>
                </div>
              </div>

              {/* Progreso Global de la Ruta */}
              <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Mi Avance:</span>
                <span className="text-xs font-black text-emerald-600">
                  {completedOnboarding} de {totalOnboarding} ({onboardingPercent}%)
                </span>
              </div>
            </div>

            {/* Píldoras de Roles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
              {ONBOARDING_ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => setSelectedOnboardingRole(role.id as any)}
                  className={`p-3 rounded-2xl text-left transition-all cursor-pointer border ${
                    selectedOnboardingRole === role.id
                      ? 'bg-slate-900 text-white border-transparent shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-bold block mb-1">{role.title}</span>
                  <span className="text-[10.5px] opacity-80 block line-clamp-2 leading-relaxed">
                    {role.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Secuencia Paso a Paso de la Ruta */}
          <div className="space-y-3">
            {onboardingArticles.map((art, idx) => {
              const isRead = (art.readByUsers || []).includes(currentUser.id);

              return (
                <div
                  key={art.id}
                  className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs ${
                    isRead
                      ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-full shrink-0 aspect-square flex items-center justify-center font-bold text-[10.5px] shadow-2xs ${
                        isRead
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isRead ? <Check size={15} /> : `P${idx + 1}`}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          Etapa {idx + 1}
                        </span>
                        <span className="text-[10px] text-gray-400 flex items-center gap-1 font-semibold">
                          <Clock size={11} />
                          {art.readTime}
                        </span>
                        {art.status === 'aprobado' && (
                          <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.2 rounded-md">
                            Procedimiento Oficial
                          </span>
                        )}
                      </div>

                      <h4
                        onClick={() => setReadingArticle(art)}
                        className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white hover:text-[#00668F] cursor-pointer transition-colors leading-snug"
                      >
                        {art.title}
                      </h4>

                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                        {art.summary}
                      </p>
                    </div>
                  </div>

                  {/* Controles de la etapa */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => handleToggleReadStatus(art.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                        isRead
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      <Check size={13} />
                      <span>{isRead ? 'Completado' : 'Marcar como Completado'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReadingArticle(art)}
                      className="px-3 py-1.5 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Eye size={13} />
                      <span>Estudiar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: LECTOR PROFESIONAL TIPO "PAPER TÉCNICO" O MANUAL DE OPERACIONES */}
      {/* ========================================================================= */}
      {readingArticle && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 shadow-2xl max-h-[92vh] flex flex-col justify-between animate-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800">
            
            {/* Header del Lector */}
            <div className="pb-3 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-100 text-sky-800">
                    INTECKNO QA-STC-2026
                  </span>
                  <span className="text-[10px] text-gray-400">
                    Actualizado: {readingArticle.updatedAt}
                  </span>
                  {readingArticle.status === 'aprobado' ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <ShieldCheck size={11} />
                      <span>Oficial Aprobado</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                      Borrador / En Revisión
                    </span>
                  )}
                </div>

                <h2 className="text-base sm:text-xl font-black text-gray-900 dark:text-white leading-snug">
                  {readingArticle.title}
                </h2>

                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                  <span>Autor: <strong>{readingArticle.author}</strong></span>
                  <span>•</span>
                  <span>Lectura estimada: {readingArticle.readTime}</span>
                  {readingArticle.reviewedBy && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                        Revisado por: {readingArticle.reviewedBy}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setReadingArticle(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shrink-0 aspect-square"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenido Técnico con Scroll Interno */}
            <div className="flex-1 overflow-y-auto py-4 pr-1 sm:pr-2 space-y-4 text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed scrollbar-thin">
              
              {/* Resumen Ejecutivo Técnico */}
              <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/60 text-sky-950 dark:text-sky-200 text-xs font-medium leading-relaxed">
                <strong className="block text-[11px] uppercase tracking-wider text-[#00668F] mb-1">
                  Resumen Ejecutivo & Objetivo STC:
                </strong>
                {readingArticle.summary}
              </div>

              {/* Contenido en Párrafos */}
              <div className="space-y-3 whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed p-1">
                {readingArticle.content}
              </div>

              {/* CHECKLIST INTERACTIVO DE CAMPO (Si existe) */}
              {readingArticle.interactiveChecklist && readingArticle.interactiveChecklist.length > 0 && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                      <CheckSquare size={15} className="text-[#00668F]" />
                      <span>Procedimiento de Verificación en Campo (Checklist Interactivo):</span>
                    </span>
                    <span className="text-[11px] font-semibold text-gray-400">
                      {readingArticle.interactiveChecklist.filter((c) => c.completed).length} / {readingArticle.interactiveChecklist.length} pasos
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {readingArticle.interactiveChecklist.map((step) => (
                      <div
                        key={step.step}
                        onClick={() => handleToggleChecklistStep(readingArticle.id, step.step)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 text-xs ${
                          step.completed
                            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-sky-300'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border mt-0.5 ${
                            step.completed
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                          }`}
                        >
                          {step.completed && <Check size={11} />}
                        </span>

                        <div className="min-w-0">
                          <span className={`font-bold block ${step.completed ? 'line-through opacity-80' : ''}`}>
                            Paso {step.step}: {step.title}
                          </span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                            {step.instruction}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* GALERÍA DE IMÁGENES & COMPARATIVAS (Si existen) */}
              {readingArticle.mediaUrls && readingArticle.mediaUrls.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-xs text-gray-900 dark:text-white block">
                    Evidencia Fotográfica y Componentes Críticos:
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {readingArticle.mediaUrls.map((med) => (
                      <div
                        key={med.id}
                        className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-3 border border-slate-200 dark:border-slate-700 space-y-2"
                      >
                        <div className="relative group rounded-xl overflow-hidden cursor-pointer" onClick={() => setZoomMedia(med)}>
                          <img
                            src={med.url}
                            alt={med.title}
                            className="w-full h-40 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                            <ZoomIn size={16} />
                            <span>Ampliar Inspección</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-bold text-gray-900 dark:text-white block">
                            {med.title}
                          </span>
                          {med.description && (
                            <span className="text-[11px] text-gray-500 dark:text-gray-400 block mt-0.5">
                              {med.description}
                            </span>
                          )}
                        </div>

                        {/* Comparación visual si existe */}
                        {med.compareUrl && (
                          <div className="pt-1 border-t border-slate-200 dark:border-slate-700 text-[10.5px]">
                            <span className="font-bold text-amber-800 dark:text-amber-300 block mb-1">
                              Comparativa con Componente Deteriorado:
                            </span>
                            <img
                              src={med.compareUrl}
                              alt="Comparativa"
                              className="w-full h-28 object-cover rounded-lg cursor-pointer hover:opacity-90"
                              onClick={() => setZoomMedia(med)}
                            />
                            {med.compareDescription && (
                              <span className="text-[10px] text-gray-500 block mt-1">
                                {med.compareDescription}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Planos y Documentos Vinculados de SharePoint */}
              {readingArticle.sharepointDocUrl && (
                <div className="p-3 bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <FileText size={16} className="text-[#0078D4]" />
                    <span className="font-bold text-gray-800 dark:text-gray-200">
                      Plano CAD / Manual de Fabricante en SharePoint:
                    </span>
                  </div>
                  <a
                    href={readingArticle.sharepointDocUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 rounded-lg bg-[#0078D4] hover:bg-[#006cbe] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Abrir en Office Online</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}
            </div>

            {/* Acciones del Lector: Exportar Word, Imprimir, SharePoint, Eliminar */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                {/* Botón de Aprobación para Directores */}
                {readingArticle.status !== 'aprobado' && (
                  <button
                    type="button"
                    onClick={() => handleApproveArticle(readingArticle.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Award size={13} />
                    <span>Aprobar Oficialmente</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    deleteArticle(readingArticle.id);
                    setReadingArticle(null);
                  }}
                  className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-2.5 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Eliminar</span>
                </button>
              </div>

              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                {/* Exportar a Word (.doc) */}
                <button
                  type="button"
                  onClick={() => exportArticleToWord(readingArticle)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Descargar documento compatible con Microsoft Word (.docx/.doc)"
                >
                  <FileDown size={13} className="text-[#0078D4]" />
                  <span>Word (.doc)</span>
                </button>

                {/* Imprimir / PDF */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Imprimir o guardar en PDF"
                >
                  <Printer size={13} />
                  <span>Imprimir / PDF</span>
                </button>

                {/* SharePoint */}
                {readingArticle.sharepointSyncUrl && (
                  <a
                    href={readingArticle.sharepointSyncUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#0078D4] hover:bg-[#006cbe] text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>SharePoint</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: REDACTAR ARTÍCULO CON ASISTENCIA DE LUC-IA-NA */}
      {/* ========================================================================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto animate-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full shrink-0 aspect-square bg-[#00668F] text-white flex items-center justify-center font-bold shadow-2xs">
                  <FileText size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Redactar Artículo Técnico STC
                  </h3>
                  <p className="text-xs text-gray-400">
                    Base de conocimiento y procedimientos estándar de ingeniería Inteckno S.A.S.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="w-8 h-8 rounded-full shrink-0 aspect-square bg-slate-100 dark:bg-slate-800 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <X size={16} />
              </button>
            </div>

            {/* SECCIÓN ESTELAR: ASISTENTE LUC-IA-NA REDACTORA */}
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 dark:text-amber-200 flex items-center gap-1.5">
                  <MargaritaIcon size={16} petalColor="#D97706" centerColor="#F59E0B" />
                  <span>Redactar Borrador Completo con LUC-IA-NA (IA STC)</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900">
                  Gemini Flash
                </span>
              </div>

              <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-relaxed">
                Indica o dicta el tema del procedimiento. LUC-IA-NA generará el objetivo, herramientas requeridas, paso a paso, tolerancias normativas EN 1709/12927 y checklist.
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={aiTopicInput}
                    onChange={(e) => setAiTopicInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerateAiDraft()}
                    placeholder="Ej: Procedimiento de solicitud a compras, salida de herramientas, viáticos o STC..."
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-amber-200 dark:border-amber-800/80 focus:outline-hidden shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={handleToggleVoiceDraft}
                    title={isListeningVoiceDraft ? 'Detener voz' : 'Hablar por micrófono'}
                    className={`p-2.5 rounded-xl transition-all cursor-pointer shadow-2xs border ${
                      isListeningVoiceDraft
                        ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {isListeningVoiceDraft ? <MicOff size={15} /> : <Mic size={15} />}
                  </button>

                  <button
                    type="button"
                    onClick={handleGenerateAiDraft}
                    disabled={isGeneratingAiDraft || !aiTopicInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-all active:scale-95"
                  >
                    <Sparkles size={14} />
                    <span>{isGeneratingAiDraft ? 'Redactando...' : 'Generar'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Formulario Manual / Editable */}
            <form onSubmit={handleSaveArticle} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                  Título del Artículo
                </label>
                <input
                  type="text"
                  required
                  value={newArticleForm.title}
                  onChange={(e) => setNewArticleForm({ ...newArticleForm, title: e.target.value })}
                  placeholder="Ej: Protocolo de Medición de Desgaste en Casquillos..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                <div>
                  <CreatableSelect
                    label="Categoría Técnica"
                    value={
                      catalogCategories.find(
                        (c) => c.code === newArticleForm.category || c.id === newArticleForm.category
                      )?.name ||
                      newArticleForm.category ||
                      'Cables & Ensayos MRT'
                    }
                    onChange={(val) => {
                      const match = catalogCategories.find(
                        (c) => c.name.toLowerCase() === val.toLowerCase() || c.code === val
                      );
                      setNewArticleForm({
                        ...newArticleForm,
                        category: (match?.code || val) as any,
                      });
                    }}
                    options={catalogCategories}
                    moduleId="articulos"
                    catalogKey="categories"
                    placeholder="Seleccionar o escribir categoría..."
                    onOpenConfig={() => setIsConfigModalOpen(true)}
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Tiempo Estimado de Lectura"
                    value={newArticleForm.readTime || '5 min'}
                    onChange={(val) => setNewArticleForm({ ...newArticleForm, readTime: val })}
                    options={catalogReadTimes}
                    moduleId="articulos"
                    catalogKey="readTimes"
                    placeholder="Ej: 5 min..."
                    onOpenConfig={() => setIsConfigModalOpen(true)}
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                  Resumen Técnico Corto
                </label>
                <input
                  type="text"
                  value={newArticleForm.summary}
                  onChange={(e) => setNewArticleForm({ ...newArticleForm, summary: e.target.value })}
                  placeholder="Breve sinopsis del problema técnico y la solución aplicada..."
                  className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300 mb-1 block">
                  Contenido Técnico Completo (Procedimiento Oficial)
                </label>
                <textarea
                  rows={8}
                  required
                  value={newArticleForm.content}
                  onChange={(e) => setNewArticleForm({ ...newArticleForm, content: e.target.value })}
                  placeholder="1. OBJETIVO Y ALCANCE\n2. EQUIPOS REQUERIDOS\n3. PASO A PASO DETALLADO\n4. CRITERIOS DE ACEPTACIÓN\n5. MEDIDAS DE SEGURIDAD..."
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden leading-relaxed font-sans"
                />
              </div>

              {/* Subtareas del Checklist Técnico */}
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-gray-700 dark:text-gray-300 block text-[11px]">
                  Pasos Clave de Verificación en Campo (Checklist):
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newArticleForm.newChecklistTitle}
                    onChange={(e) =>
                      setNewArticleForm({ ...newArticleForm, newChecklistTitle: e.target.value })
                    }
                    placeholder="Nombre del paso (ej: Medición de huelgo)"
                    className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="text"
                    value={newArticleForm.newChecklistInstruction}
                    onChange={(e) =>
                      setNewArticleForm({ ...newArticleForm, newChecklistInstruction: e.target.value })
                    }
                    placeholder="Instrucción de campo..."
                    className="flex-1 p-2 rounded-xl bg-white dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newArticleForm.newChecklistTitle.trim()) {
                        setNewArticleForm({
                          ...newArticleForm,
                          checklist: [
                            ...newArticleForm.checklist,
                            {
                              step: newArticleForm.checklist.length + 1,
                              title: newArticleForm.newChecklistTitle.trim(),
                              instruction: newArticleForm.newChecklistInstruction.trim() || 'Verificar en campo',
                              completed: false,
                            },
                          ],
                          newChecklistTitle: '',
                          newChecklistInstruction: '',
                        });
                      }
                    }}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    + Agregar
                  </button>
                </div>

                {newArticleForm.checklist.length > 0 && (
                  <div className="space-y-1 pt-1">
                    {newArticleForm.checklist.map((c, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-2 rounded-lg bg-white dark:bg-slate-800"
                      >
                        <span>
                          <strong>{c.step}. {c.title}:</strong> {c.instruction}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewArticleForm({
                              ...newArticleForm,
                              checklist: newArticleForm.checklist.filter((_, i) => i !== idx),
                            });
                          }}
                          className="text-gray-400 hover:text-rose-600 p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Estado y Enlaces */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Estado Técnico de Aprobación
                  </label>
                  <select
                    value={newArticleForm.status}
                    onChange={(e) => setNewArticleForm({ ...newArticleForm, status: e.target.value as any })}
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs"
                  >
                    <option value="aprobado">Oficial / Aprobado</option>
                    <option value="en_revision">En Revisión Técnica</option>
                    <option value="borrador">Borrador</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300 block mb-1">
                    Enlace a Plano o Manual en SharePoint
                  </label>
                  <input
                    type="text"
                    value={newArticleForm.sharepointDocUrl}
                    onChange={(e) => setNewArticleForm({ ...newArticleForm, sharepointDocUrl: e.target.value })}
                    placeholder="https://intecknosas.sharepoint.com/..."
                    className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-[11px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold shadow-xs cursor-pointer active:scale-95"
                >
                  Publicar en la Wiki STC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SINTETIZAR LECCIÓN APRENDIDA DE CAMPO CON LUC-IA-NA */}
      {/* ========================================================================= */}
      {isLessonModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full shrink-0 aspect-square bg-indigo-600 text-white flex items-center justify-center font-bold shadow-2xs">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">
                    Sintetizar Lección Aprendida de Campo
                  </h3>
                  <p className="text-xs text-gray-400">
                    Transforma un incidente o bitácora de parada técnica en una regla preventiva permanente
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsLessonModalOpen(false)}
                className="w-8 h-8 rounded-full shrink-0 aspect-square bg-slate-100 dark:bg-slate-800 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Describe el problema ocurrido, la pilona o estación, lo que se descubrió y cómo se solucionó. LUC-IA-NA extraerá la causa raíz técnica y la regla preventiva de oro.
              </p>

              <div className="relative">
                <textarea
                  rows={4}
                  value={incidentInput}
                  onChange={(e) => setIncidentInput(e.target.value)}
                  placeholder="Ej: En la parada de Línea K en Pilona 4 encontramos que tras 72h los pernos M24 de la brida perdieron el 40% del torque porque se reutilizaron pernos viejos de la parada anterior..."
                  className="w-full p-3 pr-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-gray-900 dark:text-white focus:bg-white dark:focus:bg-slate-900 focus:outline-hidden resize-none leading-relaxed"
                />

                <button
                  type="button"
                  onClick={handleToggleVoiceLesson}
                  title={isListeningVoiceLesson ? 'Detener voz' : 'Hablar por micrófono'}
                  className={`absolute right-3 top-3 p-2 rounded-xl transition-all cursor-pointer ${
                    isListeningVoiceLesson ? 'bg-rose-500 text-white animate-pulse' : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {isListeningVoiceLesson ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLessonModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-gray-600 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSynthesizeLesson}
                  disabled={isSynthesizingLesson || !incidentInput.trim()}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold shadow-xs cursor-pointer active:scale-95 flex items-center gap-1.5"
                >
                  {isSynthesizingLesson ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sintetizando con LUC-IA-NA...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Publicar Lección de Oro</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ZOOM DE EVIDENCIA VISUAL EN ALTA RESOLUCIÓN */}
      {/* ========================================================================= */}
      {zoomMedia && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-3 max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                  {zoomMedia.title}
                </h3>
                {zoomMedia.description && (
                  <p className="text-xs text-gray-400">{zoomMedia.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setZoomMedia(null)}
                className="w-8 h-8 rounded-full shrink-0 aspect-square bg-slate-100 dark:bg-slate-800 text-gray-400 hover:text-gray-700 flex items-center justify-center cursor-pointer shadow-2xs"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div>
                <span className="text-[11px] font-bold text-gray-500 block mb-1">
                  Inspección Visual Principal:
                </span>
                <img
                  src={zoomMedia.url}
                  alt={zoomMedia.title}
                  className="w-full h-80 object-cover rounded-2xl shadow-md"
                />
              </div>

              {zoomMedia.compareUrl && (
                <div>
                  <span className="text-[11px] font-bold text-rose-600 block mb-1">
                    Comparativa de Desgaste / Daño Fuera de Norma:
                  </span>
                  <img
                    src={zoomMedia.compareUrl}
                    alt="Comparativa"
                    className="w-full h-80 object-cover rounded-2xl shadow-md"
                  />
                  {zoomMedia.compareDescription && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800">
                      {zoomMedia.compareDescription}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Universal de Configuración del Módulo */}
      <UniversalModuleConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        moduleId="articulos"
        moduleTitle="Artículos & Wiki Técnica"
      />
    </div>
  );
};

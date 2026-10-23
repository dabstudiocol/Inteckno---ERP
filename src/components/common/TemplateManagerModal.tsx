import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Edit2,
  Eye,
  Check,
  X,
  Clock,
  ShieldCheck,
  FileText,
  Search,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Save,
} from 'lucide-react';
import {
  templateManagerService,
  IntecknoWBSTemplate,
  WBSTemplateTask,
} from '../../core/services/templateManagerService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApplyTemplate?: (template: IntecknoWBSTemplate) => void;
  activeProjectName?: string;
  currentUserName?: string;
}

export const TemplateManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onApplyTemplate,
  activeProjectName,
  currentUserName,
}) => {
  const [templates, setTemplates] = useState<IntecknoWBSTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Formulario de edición
  const [editForm, setEditForm] = useState<IntecknoWBSTemplate | null>(null);

  // Cargar plantillas
  const reloadTemplates = () => {
    const list = templateManagerService.getWbsTemplates();
    setTemplates(list);
    if (list.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(list[0].id);
    }
  };

  useEffect(() => {
    if (isOpen) {
      reloadTemplates();
      setMode('view');
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const selectedTemplate = useMemo(() => {
    return templates.find((t) => t.id === selectedTemplateId) || templates[0];
  }, [templates, selectedTemplateId]);

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const q = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.normativeStandard.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.tasks.some((task) => task.name.toLowerCase().includes(q))
    );
  }, [templates, searchQuery]);

  const handleStartEdit = (tpl: IntecknoWBSTemplate) => {
    setEditForm(JSON.parse(JSON.stringify(tpl)));
    setMode('edit');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    templateManagerService.saveWbsTemplate(editForm);
    reloadTemplates();
    setSelectedTemplateId(editForm.id);
    setMode('view');
    showToast(`Plantilla "${editForm.title}" guardada exitosamente.`);
  };

  const handleDuplicate = (tpl: IntecknoWBSTemplate) => {
    try {
      const duplicated = templateManagerService.duplicateWbsTemplate(tpl.id, currentUserName);
      reloadTemplates();
      setSelectedTemplateId(duplicated.id);
      setEditForm(JSON.parse(JSON.stringify(duplicated)));
      setMode('edit');
      showToast(`Plantilla duplicada como "${duplicated.title}". Ya puedes adaptarla.`);
    } catch (e: any) {
      showToast(e.message || 'Error al duplicar plantilla');
    }
  };

  const handleDelete = (tpl: IntecknoWBSTemplate) => {
    if (tpl.isOfficial && !tpl.isCustom) {
      alert('Las plantillas maestras oficiales de Inteckno están blindadas. Si deseas modificarla, utiliza el botón "Duplicar" para crear una versión adaptada.');
      return;
    }
    if (confirm(`¿Eliminar la plantilla personalizada "${tpl.title}"?`)) {
      const res = templateManagerService.deleteWbsTemplate(tpl.id);
      if (res.success) {
        reloadTemplates();
        setMode('view');
        showToast('Plantilla eliminada.');
      }
    }
  };

  const handleAddTaskToEditForm = () => {
    if (!editForm) return;
    const nextCode = `${editForm.tasks.length + 1}.0`;
    const newTask: WBSTemplateTask = {
      code: nextCode,
      name: 'Nueva Actividad Técnica de Campo',
      plannedHours: 16,
      isCriticalPath: false,
      predecessors: editForm.tasks.length > 0 ? [editForm.tasks[editForm.tasks.length - 1].code] : [],
      deliverable: 'Registro Técnico / Protocolo de Calidad',
      assignedRole: 'Técnico Especialista STC',
      normativeReference: editForm.normativeStandard,
    };
    setEditForm({
      ...editForm,
      tasks: [...editForm.tasks, newTask],
    });
  };

  const handleRemoveTaskFromEditForm = (idx: number) => {
    if (!editForm) return;
    const updated = editForm.tasks.filter((_, i) => i !== idx);
    setEditForm({ ...editForm, tasks: updated });
  };

  const handleTaskFieldChange = (idx: number, field: keyof WBSTemplateTask, value: any) => {
    if (!editForm) return;
    const updatedTasks = [...editForm.tasks];
    updatedTasks[idx] = { ...updatedTasks[idx], [field]: value };
    setEditForm({ ...editForm, tasks: updatedTasks });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] p-2 sm:p-4 md:p-6 overflow-y-auto flex items-center justify-center bg-slate-900/65 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* Cabecera Corporativa */}
        <div className="px-5 py-4 bg-[#003650] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Biblioteca de Plantillas WBS & Cronogramas STC
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-400 text-slate-950">
                  {templates.length} Plantillas
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Visualiza, edita o duplica cronogramas para adaptarlos libremente a tus proyectos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
            title="Cerrar modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Notificación Toast interna */}
        {toastMessage && (
          <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-bold text-center animate-in slide-in-from-top duration-200">
            {toastMessage}
          </div>
        )}

        {/* Contenedor Principal en 2 Columnas (Lateral de Selección + Detalle/Edición) */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden text-xs">
          
          {/* PANEL IZQUIERDO: LISTA DE PLANTILLAS */}
          <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-200">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar plantilla o norma..."
                  className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs focus:outline-hidden focus:border-[#00668F]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {filteredTemplates.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                const totalHours = tpl.tasks.reduce((sum, t) => sum + (Number(t.plannedHours) || 0), 0);
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      if (mode === 'edit') setMode('view');
                    }}
                    className={`w-full text-left p-3 rounded-2xl transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#00668F] shadow-sm ring-1 ring-[#00668F]'
                        : 'bg-white/70 hover:bg-white border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5 mb-1">
                      {tpl.isCustom ? (
                        <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Adaptada
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-bold bg-sky-100 text-[#00668F] border border-sky-200">
                          Oficial ITK
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-slate-400">
                        {tpl.tasks.length} tareas
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900 leading-tight line-clamp-2">
                      {tpl.title}
                    </h4>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                      <span className="truncate max-w-[130px] font-semibold text-emerald-700">
                        {tpl.normativeStandard}
                      </span>
                      <span className="font-mono font-bold text-slate-700 shrink-0">
                        {totalHours} HH
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="p-3 border-t border-slate-200 bg-white">
              <button
                type="button"
                onClick={() => {
                  const newTpl: IntecknoWBSTemplate = {
                    id: `WBS-TPL-NEW-${Date.now()}`,
                    title: 'Nueva Plantilla WBS Personalizada',
                    category: 'PROYECTOS ESPECIALES STC',
                    normativeStandard: 'Norma Técnica STC',
                    description: 'Cronograma especializado creado por el usuario.',
                    isOfficial: false,
                    isCustom: true,
                    authorName: currentUserName || 'Usuario Inteckno',
                    createdAt: new Date().toISOString().split('T')[0],
                    updatedAt: new Date().toISOString().split('T')[0],
                    tasks: [
                      {
                        code: '1.0',
                        name: 'Fase Inicial de Alistamiento y Logística',
                        plannedHours: 16,
                        isCriticalPath: true,
                        predecessors: [],
                        deliverable: 'Plan de Trabajo',
                        assignedRole: 'Líder de Proyecto',
                      },
                    ],
                  };
                  templateManagerService.saveWbsTemplate(newTpl);
                  reloadTemplates();
                  setSelectedTemplateId(newTpl.id);
                  setEditForm(newTpl);
                  setMode('edit');
                  showToast('Nueva plantilla creada en blanco. Procede a editarla.');
                }}
                className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-sky-50 hover:text-[#00668F] font-bold text-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Plus size={14} />
                <span>Crear Plantilla desde Cero</span>
              </button>
            </div>
          </div>

          {/* PANEL DERECHO: VISTA O EDICIÓN */}
          <div className="flex-1 min-h-0 flex flex-col bg-white overflow-hidden">
            
            {/* MODO VISTA */}
            {mode === 'view' && selectedTemplate && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header de la plantilla seleccionada */}
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-start justify-between gap-3 shrink-0">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center gap-2">
                      {selectedTemplate.isCustom ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                          Plantilla Adaptada
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-[#00668F]">
                          Plantilla Maestra Inteckno S.A.S.
                        </span>
                      )}
                      <span className="text-slate-400 font-mono text-[11px]">
                        ID: {selectedTemplate.id}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {selectedTemplate.title}
                    </h3>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      {selectedTemplate.description}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500">
                      <span>Norma: <strong className="text-emerald-700">{selectedTemplate.normativeStandard}</strong></span>
                      <span>•</span>
                      <span>Total: <strong>{selectedTemplate.tasks.reduce((s, t) => s + (Number(t.plannedHours) || 0), 0)} Horas-Hombre</strong></span>
                    </div>
                  </div>

                  {/* Acciones de la Plantilla */}
                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDuplicate(selectedTemplate)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Duplicar para crear una versión modificable"
                    >
                      <Copy size={13} />
                      <span>Duplicar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(selectedTemplate)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#00668F] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      title="Editar título, actividades u horas"
                    >
                      <Edit2 size={13} />
                      <span>Editar</span>
                    </button>

                    {selectedTemplate.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedTemplate)}
                        className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Eliminar plantilla adaptada"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    {onApplyTemplate && (
                      <button
                        type="button"
                        onClick={() => {
                          onApplyTemplate(selectedTemplate);
                          onClose();
                        }}
                        className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                      >
                        <ArrowRight size={14} />
                        <span>Aplicar a {activeProjectName ? activeProjectName : 'Proyecto'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Desglose de Actividades */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center justify-between pb-1 px-1">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                      Fases y Actividades de la Plantilla ({selectedTemplate.tasks.length})
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Extracción técnica de mejores prácticas STC
                    </span>
                  </div>

                  <div className="space-y-2">
                    {selectedTemplate.tasks.map((task, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-2xl border border-slate-200 hover:border-slate-300 bg-white transition-colors flex items-start justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <span className="px-2 py-0.5 rounded-lg bg-sky-100 text-[#003650] font-mono font-bold text-xs shrink-0 mt-0.5">
                            {task.code}
                          </span>
                          <div className="space-y-1 min-w-0 flex-1">
                            <h5 className="font-bold text-xs text-slate-900 leading-snug">
                              {task.name}
                            </h5>
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                              <span>Rol: <strong className="text-slate-700">{task.assignedRole}</strong></span>
                              <span>•</span>
                              <span>Entregable: <strong className="text-slate-700">{task.deliverable}</strong></span>
                              {task.normativeReference && (
                                <>
                                  <span>•</span>
                                  <span className="text-emerald-700 font-semibold">{task.normativeReference}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-black text-xs text-slate-900">
                            {task.plannedHours} HH
                          </div>
                          {task.isCriticalPath && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800 text-[9px] font-bold">
                              Ruta Crítica
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MODO EDICIÓN */}
            {mode === 'edit' && editForm && (
              <form onSubmit={handleSaveEdit} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-200 bg-sky-50/60 flex items-center justify-between gap-3 shrink-0">
                  <div>
                    <h3 className="font-bold text-sm text-[#00668F]">
                      Editando Plantilla: {editForm.title}
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Modifica nombres, añade o quita actividades y ajusta horas planificadas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMode('view')}
                      className="px-3 py-1.5 rounded-xl text-slate-600 hover:bg-slate-200 font-bold transition-colors cursor-pointer text-xs"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer text-xs active:scale-95"
                    >
                      <Save size={14} />
                      <span>Guardar Plantilla</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
                  {/* Campos Principales */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <div className="sm:col-span-2">
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">
                        Nombre / Título de la Plantilla *
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 text-xs focus:outline-hidden focus:border-[#00668F]"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">
                        Norma o Estándar Aplicable *
                      </label>
                      <input
                        type="text"
                        required
                        value={editForm.normativeStandard}
                        onChange={(e) => setEditForm({ ...editForm, normativeStandard: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-hidden focus:border-[#00668F]"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-bold text-slate-700 text-[11px] mb-1">
                        Descripción y Alcance Técnico
                      </label>
                      <textarea
                        rows={2}
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:outline-hidden focus:border-[#00668F]"
                      />
                    </div>
                  </div>

                  {/* Tabla de Actividades Editables */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs uppercase tracking-wider text-slate-600">
                        Actividades Técnicas ({editForm.tasks.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleAddTaskToEditForm}
                        className="px-3 py-1.5 rounded-xl bg-sky-50 text-[#00668F] font-bold hover:bg-sky-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Plus size={13} />
                        <span>Agregar Actividad</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {editForm.tasks.map((task, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl border border-slate-200 bg-white space-y-2.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <input
                                type="text"
                                value={task.code}
                                onChange={(e) => handleTaskFieldChange(idx, 'code', e.target.value)}
                                className="w-16 px-2 py-1 rounded-lg border border-slate-300 font-mono font-bold text-center text-xs"
                                placeholder="1.0"
                              />
                              <input
                                type="text"
                                value={task.name}
                                onChange={(e) => handleTaskFieldChange(idx, 'name', e.target.value)}
                                className="flex-1 px-3 py-1 rounded-lg border border-slate-300 font-bold text-xs text-slate-900"
                                placeholder="Nombre de la actividad"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveTaskFromEditForm(idx)}
                              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
                              title="Eliminar fila"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px]">
                            <div>
                              <label className="text-[10px] text-slate-400 block font-bold">Horas (HH):</label>
                              <input
                                type="number"
                                min={1}
                                value={task.plannedHours}
                                onChange={(e) => handleTaskFieldChange(idx, 'plannedHours', Number(e.target.value))}
                                className="w-full px-2 py-1 rounded-lg border border-slate-300 font-mono font-bold"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block font-bold">Rol Asignado:</label>
                              <input
                                type="text"
                                value={task.assignedRole}
                                onChange={(e) => handleTaskFieldChange(idx, 'assignedRole', e.target.value)}
                                className="w-full px-2 py-1 rounded-lg border border-slate-300"
                                placeholder="Inspector / Técnico"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] text-slate-400 block font-bold">Entregable:</label>
                              <input
                                type="text"
                                value={task.deliverable}
                                onChange={(e) => handleTaskFieldChange(idx, 'deliverable', e.target.value)}
                                className="w-full px-2 py-1 rounded-lg border border-slate-300"
                                placeholder="Informe / Certificado"
                              />
                            </div>

                            <div className="flex items-center gap-2 pt-3">
                              <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={task.isCriticalPath}
                                  onChange={(e) => handleTaskFieldChange(idx, 'isCriticalPath', e.target.checked)}
                                  className="rounded text-[#00668F] cursor-pointer"
                                />
                                <span>Ruta Crítica</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </form>
            )}

          </div>

        </div>

      </div>
    </div>
  );
};

import React, { useState } from 'react';
import {
  MessageSquare,
  FileText,
  Calendar,
  CheckSquare,
  BookOpen,
  Send,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  Clock,
  MapPin,
  Users,
  Paperclip,
  Tag,
  ExternalLink,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { ChatMessage, DocumentItem, TodoItem, CalendarEvent } from '../../types';

interface IntecknoTransversalModuleProps {
  initialSubTab?: 'conversaciones' | 'documentos' | 'calendario' | 'actividades' | 'articulos';
}

export const IntecknoTransversalModule: React.FC<IntecknoTransversalModuleProps> = ({
  initialSubTab = 'conversaciones',
}) => {
  const {
    chatMessages,
    addChatMessage,
    documents,
    addDocument,
    todos,
    addTodo,
    toggleTodo,
    calendarEvents,
    createCalendarEvent,
    articles,
    currentUser,
  } = useErp();

  const [activeTab, setActiveTab] = useState<'conversaciones' | 'documentos' | 'calendario' | 'actividades' | 'articulos'>(
    initialSubTab
  );

  // Chat
  const [activeChannel, setActiveChannel] = useState<ChatMessage['channel']>('general');
  const [chatInput, setChatInput] = useState('');

  // Documentos
  const [docFilter, setDocFilter] = useState('all');
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    code: '',
    category: 'planos' as DocumentItem['category'],
    projectCode: 'PRJ-2026-MED-K',
    fileSize: '4.5 MB',
    fileType: 'PDF / CAD',
  });

  // Actividades To-Do
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<TodoItem['priority']>('media');
  const [newTodoDueDate, setNewTodoDueDate] = useState('2026-09-30');

  // Calendario
  const [isNewEventModalOpen, setIsNewEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    date: '2026-10-05',
    time: '08:00 - 12:00',
    type: 'visita_campo' as CalendarEvent['type'],
    location: '',
    projectCode: 'PRJ-2026-MED-K',
  });

  // Artículos
  const [articleSearch, setArticleSearch] = useState('');

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    addChatMessage(activeChannel, chatInput);
    setChatInput('');
  };

  const handleCreateDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title || !docForm.code) return;
    addDocument({
      ...docForm,
      categoryLabel:
        docForm.category === 'planos'
          ? 'Planos y Esquemas CAD'
          : docForm.category === 'certificados_hseq'
          ? 'Certificaciones HSEQ / SST'
          : docForm.category === 'manuales_stc'
          ? 'Manuales y Protocolos STC'
          : 'Procedimientos Técnicos',
      uploadedBy: currentUser.name,
    });
    setIsNewDocModalOpen(false);
    setDocForm({
      title: '',
      code: '',
      category: 'planos',
      projectCode: 'PRJ-2026-MED-K',
      fileSize: '4.5 MB',
      fileType: 'PDF / CAD',
    });
  };

  const handleAddTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoText.trim()) return;
    addTodo(newTodoText, newTodoPriority, newTodoDueDate, 'actividades');
    setNewTodoText('');
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.location) return;
    createCalendarEvent({
      ...eventForm,
      attendees: [currentUser.name, 'Equipo STC'],
    });
    setIsNewEventModalOpen(false);
    setEventForm({
      title: '',
      date: '2026-10-05',
      time: '08:00 - 12:00',
      type: 'visita_campo',
      location: '',
      projectCode: 'PRJ-2026-MED-K',
    });
  };

  const filteredChat = chatMessages.filter((m) => m.channel === activeChannel);

  const filteredDocs = documents.filter((d) => {
    if (docFilter === 'all') return true;
    return d.category === docFilter;
  });

  const filteredArticles = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(articleSearch.toLowerCase()) ||
      a.summary.toLowerCase().includes(articleSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Subnavegación de los Módulos INTECKNO en Grid Responsivo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-2 pb-2 w-full">
        <button
          onClick={() => setActiveTab('conversaciones')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-center ${
            activeTab === 'conversaciones' ? 'bg-[#00668F] text-white shadow-xs' : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
          }`}
        >
          <MessageSquare size={14} className="shrink-0" />
          <span className="truncate">Conversaciones</span>
        </button>
        <button
          onClick={() => setActiveTab('documentos')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-center ${
            activeTab === 'documentos' ? 'bg-[#00668F] text-white shadow-xs' : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
          }`}
        >
          <FileText size={14} className="shrink-0" />
          <span className="truncate">Documentos ({documents.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('calendario')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-center ${
            activeTab === 'calendario' ? 'bg-[#00668F] text-white shadow-xs' : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
          }`}
        >
          <Calendar size={14} className="shrink-0" />
          <span className="truncate">Calendario</span>
        </button>
        <button
          onClick={() => setActiveTab('actividades')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-center ${
            activeTab === 'actividades' ? 'bg-[#00668F] text-white shadow-xs' : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
          }`}
        >
          <CheckSquare size={14} className="shrink-0" />
          <span className="truncate">Actividades ({todos.filter((t) => !t.completed).length})</span>
        </button>
        <button
          onClick={() => setActiveTab('articulos')}
          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-colors text-center ${
            activeTab === 'articulos' ? 'bg-[#00668F] text-white shadow-xs' : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
          }`}
        >
          <BookOpen size={14} className="shrink-0" />
          <span className="truncate">Artículos & Wiki</span>
        </button>
      </div>

      {/* 1. CONVERSACIONES / CHAT INTERNO */}
      {activeTab === 'conversaciones' && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden grid grid-cols-1 md:grid-cols-4 h-[600px] shadow-xs">
          {/* Canales */}
          <div className="p-4 border-r border-gray-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
                Canales de Equipo STC
              </div>
              <div className="space-y-1">
                {[
                  { id: 'general', label: '# general-inteckno', desc: 'Comunicaciones de toda la empresa' },
                  { id: 'proyectos', label: '# operaciones-campo', desc: 'Coordinación técnica y cuadrillas' },
                  { id: 'hseq', label: '# compuerta-hseq', desc: 'Seguridad en alturas y permisos' },
                  { id: 'compras', label: '# abastecimiento-oc', desc: 'Requisiciones y repuestos' },
                ].map((ch) => (
                  <button
                    key={ch.id}
                    onClick={() => setActiveChannel(ch.id as any)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-colors ${
                      activeChannel === ch.id
                        ? 'bg-[#00668F] text-white font-bold'
                        : 'text-gray-700 hover:bg-gray-200/60 font-medium'
                    }`}
                  >
                    <div>{ch.label}</div>
                    <div
                      className={`text-[10px] mt-0.5 truncate ${
                        activeChannel === ch.id ? 'text-sky-100' : 'text-gray-400'
                      }`}
                    >
                      {ch.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-gray-200 text-xs">
              <span className="text-[10px] text-gray-400 block font-bold">TU IDENTIDAD ACTIVA:</span>
              <div className="font-bold text-gray-800 mt-0.5">{currentUser.name}</div>
              <div className="text-[10px] text-gray-500">{currentUser.roleLabel}</div>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="md:col-span-3 flex flex-col justify-between h-full bg-white">
            {/* Header del Canal */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">#{activeChannel}</h3>
                <p className="text-[11px] text-gray-500">Historial de mensajes e instrucciones operativas</p>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                ● En Vivo
              </span>
            </div>

            {/* Mensajes con scroll */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {filteredChat.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-xs"
                    style={{ backgroundColor: msg.avatarColor || '#00668F' }}
                  >
                    {msg.senderName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-gray-100 max-w-xl">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-900">{msg.senderName}</span>
                        <span className="text-[10px] text-gray-400 font-medium">({msg.senderRole})</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{msg.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input para Escribir y Enviar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Escribe un mensaje en #${activeChannel}...`}
                className="flex-1 text-xs p-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-hidden focus:border-[#00668F]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              >
                <Send size={14} />
                Enviar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 2. REPOSITORIO DE DOCUMENTOS */}
      {activeTab === 'documentos' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {['all', 'planos', 'certificados_hseq', 'manuales_stc'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDocFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                    docFilter === cat ? 'bg-[#00668F] text-white font-bold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat === 'all'
                    ? 'Todos los Documentos'
                    : cat === 'certificados_hseq'
                    ? 'HSEQ & Alturas'
                    : cat === 'manuales_stc'
                    ? 'Manuales STC'
                    : cat}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsNewDocModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95"
            >
              <Plus size={15} />
              Subir Documento Técnico
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <span className="text-[10px] font-mono font-bold text-[#00668F] bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                    {doc.code}
                  </span>
                  <span className="text-[10px] text-gray-400">{doc.date}</span>
                </div>

                <h4 className="font-bold text-gray-900 text-xs leading-snug line-clamp-2">{doc.title}</h4>

                <div className="text-[11px] text-gray-500 bg-slate-50 p-2 rounded-lg space-y-0.5">
                  <div>📁 Categoría: <span className="font-medium text-gray-700">{doc.categoryLabel}</span></div>
                  <div>👤 Subido por: <span className="font-medium text-gray-700">{doc.uploadedBy}</span></div>
                  <div>📄 Formato: <span className="font-medium text-gray-700">{doc.fileType} ({doc.fileSize})</span></div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold text-gray-400">Verificado ITK</span>
                  <button className="flex items-center gap-1 text-[#00668F] font-bold hover:underline">
                    <Download size={13} />
                    Descargar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. CALENDARIO DE OPERACIONES */}
      {activeTab === 'calendario' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Agenda de Visitas a Campo, Hitos e Inspecciones STC</h3>
            <button
              onClick={() => setIsNewEventModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#00668F] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#005273]"
            >
              <Plus size={15} />
              Agendar Evento
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {calendarEvents.map((evt) => (
              <div key={evt.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                    {evt.type.toUpperCase().replace('_', ' ')}
                  </span>
                  <span className="text-xs font-bold text-gray-800">{evt.date}</span>
                </div>

                <h4 className="font-bold text-gray-900 text-xs">{evt.title}</h4>

                <div className="text-[11px] text-gray-600 bg-slate-50 p-2.5 rounded-lg space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />
                    <span>{evt.time}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={12} className="text-gray-400" />
                    <span>{evt.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-gray-400" />
                    <span className="truncate">{evt.attendees.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ACTIVIDADES PENDIENTES (TO-DOS) */}
      {activeTab === 'actividades' && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Añadir Nueva Tarea o Compromiso
            </h3>
            <form onSubmit={handleAddTodo} className="flex gap-2">
              <input
                type="text"
                placeholder="Ej: Revisar torque de tornillería en cabezal pilona 5..."
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                className="flex-1 text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
              />
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as any)}
                className="text-xs p-2 rounded-xl border border-gray-300 bg-white"
              >
                <option value="baja">Baja</option>
                <option value="media">Media</option>
                <option value="alta">Alta</option>
              </select>
              <button
                type="submit"
                className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Añadir
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
            <h4 className="text-xs font-bold text-gray-900 mb-2">Mis Compromisos Operativos ({todos.length})</h4>
            {todos.map((todo) => (
              <div
                key={todo.id}
                onClick={() => toggleTodo(todo.id)}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                  todo.completed
                    ? 'bg-gray-50 border-gray-200 text-gray-400 line-through'
                    : 'bg-white border-gray-200 hover:border-[#00668F] text-gray-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                      todo.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                    }`}
                  >
                    {todo.completed && <CheckCircle2 size={14} />}
                  </div>
                  <span className="text-xs font-medium">{todo.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      todo.priority === 'alta'
                        ? 'bg-rose-100 text-rose-700'
                        : todo.priority === 'media'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {todo.priority.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-gray-400">{todo.dueDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ARTÍCULOS WIKI & PROCEDIMIENTOS STC */}
      {activeTab === 'articulos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900">Base de Conocimiento y Procedimientos Técnicos STC</h3>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por norma o componente..."
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredArticles.map((art) => (
              <div key={art.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span className="font-bold text-[#00668F] uppercase">{art.category.replace('_', ' ')}</span>
                  <span>{art.readTime} lectura</span>
                </div>

                <h4 className="font-bold text-gray-900 text-sm leading-snug">{art.title}</h4>

                <p className="text-xs text-gray-600 leading-relaxed bg-slate-50 p-3 rounded-xl">
                  {art.summary}
                </p>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>Autor: <strong className="text-gray-800">{art.author}</strong></span>
                  <button className="text-[#00668F] font-bold hover:underline flex items-center gap-1">
                    Leer Procedimiento <ExternalLink size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: SUBIR DOCUMENTO */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <FileText size={18} className="text-[#00668F]" />
                Registrar Documento Técnico
              </div>
              <button onClick={() => setIsNewDocModalOpen(false)} className="text-gray-400 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDoc} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Título del Documento</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Plano Estación Retorno - Cablebús"
                  value={docForm.title}
                  onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Código Identificador</label>
                  <input
                    type="text"
                    required
                    placeholder="PLN-2026-009"
                    value={docForm.code}
                    onChange={(e) => setDocForm({ ...docForm, code: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Categoría</label>
                  <select
                    value={docForm.category}
                    onChange={(e) => setDocForm({ ...docForm, category: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  >
                    <option value="planos">Planos CAD / DWG</option>
                    <option value="certificados_hseq">Certificado HSEQ / Alturas</option>
                    <option value="manuales_stc">Manual / Protocolo STC</option>
                    <option value="procedimientos">Procedimiento Técnico</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#00668F] text-white rounded-xl shadow-xs hover:bg-[#005273]"
                >
                  Guardar Documento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGENDAR EVENTO */}
      {isNewEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Calendar size={18} className="text-[#00668F]" />
                Agendar Evento / Visita STC
              </div>
              <button onClick={() => setIsNewEventModalOpen(false)} className="text-gray-400 text-lg font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Evento</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Inspección Pilona 12 Metrocable"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-300 focus:outline-hidden focus:border-[#00668F]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Ubicación</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Estación Acevedo"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-gray-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsNewEventModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-[#00668F] text-white rounded-xl shadow-xs hover:bg-[#005273]"
                >
                  Agendar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

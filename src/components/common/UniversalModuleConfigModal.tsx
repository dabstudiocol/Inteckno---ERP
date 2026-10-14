import React, { useState, useEffect } from 'react';
import {
  Settings,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Search,
  Sparkles,
  Layers,
  CheckCircle2,
  Key,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import {
  getModuleCatalogs,
  saveModuleCatalogs,
  resetModuleCatalogs,
  ModuleConfigGroup,
  CatalogItem,
  getResolvedModuleId,
} from '../../core/services/moduleConfigService';
import {
  getStoredApiKey,
  storeApiKey,
  testApiKey,
} from '../../core/services/aiVisionExpenseService';

interface UniversalModuleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  moduleId: string;
  moduleTitle?: string;
  extraActions?: React.ReactNode;
}

export const UniversalModuleConfigModal: React.FC<UniversalModuleConfigModalProps> = ({
  isOpen,
  onClose,
  moduleId,
  moduleTitle,
  extraActions,
}) => {
  const resolvedId = getResolvedModuleId(moduleId);
  const [config, setConfig] = useState<ModuleConfigGroup>(() => getModuleCatalogs(resolvedId));
  const [activeCatalogKey, setActiveCatalogKey] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  // Nuevo item form
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');

  // Item edit form
  const [editItemName, setEditItemName] = useState('');
  const [editItemCode, setEditItemCode] = useState('');

  // Feedback toast
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Estado para pestaña de IA Gemini si es gastos
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiTestStatus, setGeminiTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [geminiErrorMsg, setGeminiErrorMsg] = useState('');

  // Sincronizar cuando cambia moduleId o se abre el modal
  useEffect(() => {
    if (isOpen) {
      const fresh = getModuleCatalogs(resolvedId);
      setConfig(fresh);
      const catalogKeys = Object.keys(fresh.catalogs);
      if (catalogKeys.length > 0 && (!activeCatalogKey || !fresh.catalogs[activeCatalogKey])) {
        setActiveCatalogKey(catalogKeys[0]);
      }
      setIsAddingNew(false);
      setEditingItemId(null);
      setSearchQuery('');
      setFeedbackMessage(null);

      if (resolvedId === 'gastos') {
        const storedKey = getStoredApiKey();
        setGeminiApiKey(storedKey || '');
      }
    }
  }, [isOpen, resolvedId]);

  if (!isOpen) return null;

  const currentCatalog = config.catalogs[activeCatalogKey];
  const catalogKeys = Object.keys(config.catalogs);

  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3500);
  };

  const handleToggleItemActive = (catalogKey: string, itemId: string) => {
    const updatedCatalogs = { ...config.catalogs };
    const cat = updatedCatalogs[catalogKey];
    if (!cat) return;

    cat.items = cat.items.map((it) =>
      it.id === itemId ? { ...it, isActive: !it.isActive } : it
    );

    const updatedConfig = { ...config, catalogs: updatedCatalogs };
    setConfig(updatedConfig);
    saveModuleCatalogs(resolvedId, updatedConfig);
    showToast('Estado de opción actualizado correctamente');
  };

  const handleDeleteItem = (catalogKey: string, itemId: string) => {
    const cat = config.catalogs[catalogKey];
    if (!cat) return;
    const item = cat.items.find((i) => i.id === itemId);
    if (!window.confirm(`¿Seguro que deseas eliminar la opción "${item?.name || 'seleccionada'}"?`)) {
      return;
    }

    const updatedCatalogs = { ...config.catalogs };
    updatedCatalogs[catalogKey].items = updatedCatalogs[catalogKey].items.filter(
      (it) => it.id !== itemId
    );

    const updatedConfig = { ...config, catalogs: updatedCatalogs };
    setConfig(updatedConfig);
    saveModuleCatalogs(resolvedId, updatedConfig);
    showToast('Opción eliminada del catálogo');
  };

  const handleStartEdit = (item: CatalogItem) => {
    setEditingItemId(item.id);
    setEditItemName(item.name);
    setEditItemCode(item.code || '');
  };

  const handleSaveEdit = (catalogKey: string, itemId: string) => {
    if (!editItemName.trim()) return;

    const updatedCatalogs = { ...config.catalogs };
    updatedCatalogs[catalogKey].items = updatedCatalogs[catalogKey].items.map((it) =>
      it.id === itemId
        ? { ...it, name: editItemName.trim(), code: editItemCode.trim() || undefined }
        : it
    );

    const updatedConfig = { ...config, catalogs: updatedCatalogs };
    setConfig(updatedConfig);
    saveModuleCatalogs(resolvedId, updatedConfig);
    setEditingItemId(null);
    showToast('Opción guardada y actualizada');
  };

  const handleAddNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !activeCatalogKey) return;

    const newItem: CatalogItem = {
      id: `${activeCatalogKey}-${Date.now()}`,
      name: newItemName.trim(),
      code: newItemCode.trim() || undefined,
      isActive: true,
    };

    const updatedCatalogs = { ...config.catalogs };
    updatedCatalogs[activeCatalogKey].items = [
      ...updatedCatalogs[activeCatalogKey].items,
      newItem,
    ];

    const updatedConfig = { ...config, catalogs: updatedCatalogs };
    setConfig(updatedConfig);
    saveModuleCatalogs(resolvedId, updatedConfig);
    setNewItemName('');
    setNewItemCode('');
    setIsAddingNew(false);
    showToast(`✓ Opción "${newItem.name}" agregada con éxito`);
  };

  const handleResetDefaults = () => {
    if (
      !window.confirm(
        `¿Restablecer todas las opciones de este módulo a los valores predeterminados de fábrica? Se perderán las personalizaciones.`
      )
    ) {
      return;
    }

    const reset = resetModuleCatalogs(resolvedId);
    setConfig(reset);
    showToast('Configuración restablecida a valores originales');
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiApiKey.trim()) {
      storeApiKey('');
      showToast('Clave API eliminada');
      return;
    }
    setGeminiTestStatus('testing');
    setGeminiErrorMsg('');
    try {
      const res = await testApiKey(geminiApiKey.trim());
      if (res.valid) {
        storeApiKey(geminiApiKey.trim());
        setGeminiTestStatus('success');
        showToast('✓ Clave API de Gemini validada y guardada');
      } else {
        setGeminiTestStatus('error');
        setGeminiErrorMsg(res.error || 'La clave API no es válida o expiró.');
      }
    } catch (e: any) {
      setGeminiTestStatus('error');
      setGeminiErrorMsg(e?.message || 'Error de conexión con Google Gemini.');
    }
  };

  const filteredItems = currentCatalog
    ? currentCatalog.items.filter((it) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          it.name.toLowerCase().includes(q) ||
          (it.code && it.code.toLowerCase().includes(q))
        );
      })
    : [];

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* ENCABEZADO */}
        <div className="px-6 py-4.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00668F] text-white flex items-center justify-center shadow-xs">
              <Settings size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#00668F] bg-sky-100/80 px-2 py-0.5 rounded-full">
                  Personalización Inteckno
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {config.moduleId}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Configuración del Módulo: {moduleTitle || config.moduleName}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs shrink-0 aspect-square"
            title="Cerrar configuración"
          >
            <X size={16} />
          </button>
        </div>

        {/* FEEDBACK TOAST */}
        {feedbackMessage && (
          <div className="px-6 py-2 bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* NAVEGACIÓN POR PESTAÑAS (CATÁLOGOS DEL MÓDULO) CON AJUSTE FLEXIBLE */}
        <div className="px-4 sm:px-6 pt-3 pb-1 bg-white flex flex-wrap items-center gap-2 shrink-0 w-full">
          {catalogKeys.map((key) => {
            const cat = config.catalogs[key];
            const isSelected = activeCatalogKey === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setActiveCatalogKey(key);
                  setIsAddingNew(false);
                  setEditingItemId(null);
                  setSearchQuery('');
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                  isSelected
                    ? 'bg-[#00668F] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                <span className="truncate">{cat.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md shrink-0 ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {cat.items.length}
                </span>
              </button>
            );
          })}

          {/* Pestaña especial IA Gemini si es gastos */}
          {resolvedId === 'gastos' && (
            <button
              onClick={() => {
                setActiveCatalogKey('gemini_ai_tab');
                setIsAddingNew(false);
                setEditingItemId(null);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-center ${
                activeCatalogKey === 'gemini_ai_tab'
                  ? 'bg-[#00668F] text-white shadow-xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
              }`}
            >
              <Sparkles size={13} className="shrink-0" />
              <span className="truncate">IA Gemini (OCR)</span>
            </button>
          )}
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          
          {/* VISTA ESPECIAL: PESTAÑA GEMINI IA EN GASTOS */}
          {activeCatalogKey === 'gemini_ai_tab' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-indigo-50/60 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-sm">
                  <Key size={16} />
                  <span>Conexión de IA para Lectura Automática de Facturas</span>
                </div>
                <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                  Inteckno ERP utiliza <strong>Google Gemini 3.5 Flash</strong> para digitalizar facturas y comprobantes al instante. Ingrese su API Key obtenida en Google AI Studio para activar la extracción inteligente en vivo.
                </p>
              </div>

              <div className="bg-slate-50 p-4.5 rounded-2xl space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Google Gemini API Key
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => {
                      setGeminiApiKey(e.target.value);
                      setGeminiTestStatus('idle');
                    }}
                    placeholder="AIzaSy..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono focus:outline-hidden focus:border-[#00668F]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveGeminiKey}
                    disabled={geminiTestStatus === 'testing'}
                    className="px-4 py-2.5 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {geminiTestStatus === 'testing' ? (
                      <span>Validando...</span>
                    ) : (
                      <>
                        <ShieldCheck size={14} />
                        <span>Guardar & Probar</span>
                      </>
                    )}
                  </button>
                </div>

                {geminiTestStatus === 'success' && (
                  <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold bg-emerald-50 p-2.5 rounded-xl">
                    <CheckCircle2 size={15} />
                    <span>Conexión con Gemini 3.5 establecida con éxito. Listo para escanear facturas.</span>
                  </div>
                )}

                {geminiTestStatus === 'error' && (
                  <div className="flex items-start gap-2 text-rose-700 text-xs font-bold bg-rose-50 p-2.5 rounded-xl">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{geminiErrorMsg}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VISTA NORMAL: CATÁLOGO SELECCIONADO */}
          {currentCatalog && activeCatalogKey !== 'gemini_ai_tab' && (
            <div className="space-y-3.5">
              
              {/* DESCRIPCIÓN & ACCIÓN RÁPIDA DE AÑADIR */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">
                    {currentCatalog.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {currentCatalog.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddingNew(!isAddingNew)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all self-start sm:self-auto cursor-pointer shadow-xs ${
                    isAddingNew
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-[#00668F] hover:bg-[#005273] text-white'
                  }`}
                >
                  {isAddingNew ? <X size={14} /> : <Plus size={14} />}
                  <span>{isAddingNew ? 'Cancelar' : 'Añadir Opción'}</span>
                </button>
              </div>

              {/* FORMULARIO AGREGAR NUEVA OPCIÓN */}
              {isAddingNew && (
                <form
                  onSubmit={handleAddNewItem}
                  className="p-4 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="font-bold text-xs text-[#00668F] flex items-center gap-1.5">
                    <Plus size={14} />
                    <span>Nueva opción para {currentCatalog.title}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div className={currentCatalog.hasCode ? 'sm:col-span-2' : 'sm:col-span-3'}>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Nombre o Etiqueta Visible en Desplegables *
                      </label>
                      <input
                        type="text"
                        required
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Ej: Sede Central / Nuevo Rubro / 45 días..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs focus:outline-hidden focus:border-[#00668F]"
                        autoFocus
                      />
                    </div>

                    {currentCatalog.hasCode && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          {currentCatalog.codeLabel || 'Código / Sigla'}
                        </label>
                        <input
                          type="text"
                          value={newItemCode}
                          onChange={(e) => setNewItemCode(e.target.value)}
                          placeholder="Ej: ADM-01 / 45D"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-mono focus:outline-hidden focus:border-[#00668F]"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingNew(false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>Guardar en Lista</span>
                    </button>
                  </div>
                </form>
              )}

              {/* BUSCADOR DE OPCIONES */}
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Buscar en ${currentCatalog.items.length} opciones...`}
                    className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>

                <div className="text-[11px] text-slate-400 font-semibold shrink-0">
                  {currentCatalog.items.filter((i) => i.isActive).length} de{' '}
                  {currentCatalog.items.length} activas
                </div>
              </div>

              {/* LISTA DE OPCIONES */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {filteredItems.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                    No se encontraron opciones para "{searchQuery}".
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isEditing = editingItemId === item.id;

                    if (isEditing) {
                      return (
                        <div
                          key={item.id}
                          className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-200 flex items-center gap-2 animate-in fade-in-50 duration-100"
                        >
                          <input
                            type="text"
                            value={editItemName}
                            onChange={(e) => setEditItemName(e.target.value)}
                            className="flex-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-medium focus:outline-hidden focus:border-[#00668F]"
                            autoFocus
                          />
                          {currentCatalog.hasCode && (
                            <input
                              type="text"
                              value={editItemCode}
                              onChange={(e) => setEditItemCode(e.target.value)}
                              placeholder="Código"
                              className="w-24 px-2 py-1 rounded-lg bg-white border border-slate-200 text-xs font-mono focus:outline-hidden focus:border-[#00668F]"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(activeCatalogKey, item.id)}
                            className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs"
                            title="Guardar cambios"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItemId(null)}
                            className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-600 cursor-pointer"
                            title="Cancelar"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={item.id}
                        className={`px-3 py-2 rounded-xl flex items-center justify-between gap-3 transition-colors ${
                          item.isActive
                            ? 'bg-slate-50 hover:bg-slate-100/80 text-slate-800'
                            : 'bg-slate-100/50 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              item.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          <span
                            className={`text-xs font-medium truncate ${
                              !item.isActive ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {item.name}
                          </span>
                          {item.code && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200/70 text-slate-600 shrink-0">
                              {item.code}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Botón Activar / Desactivar */}
                          <button
                            type="button"
                            onClick={() => handleToggleItemActive(activeCatalogKey, item.id)}
                            title={
                              item.isActive
                                ? 'Desactivar (ocultar de desplegables)'
                                : 'Activar (mostrar en desplegables)'
                            }
                            className={`px-2 py-0.8 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              item.isActive
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {item.isActive ? 'Activo' : 'Inactivo'}
                          </button>

                          {/* Botón Editar */}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(item)}
                            title="Editar nombre / código"
                            className="p-1 rounded-lg text-slate-400 hover:text-[#00668F] hover:bg-slate-200/60 cursor-pointer transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(activeCatalogKey, item.id)}
                            title="Eliminar opción"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* PIE DE PÁGINA CON RESTABLECER Y LISTO */}
        <div className="px-6 py-3.5 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              title="Restablecer opciones predeterminadas de Inteckno"
            >
              <RotateCcw size={13} />
              <span>Restablecer Fábrica</span>
            </button>
            {extraActions}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Listo</span>
          </button>
        </div>

      </div>
    </div>
  );
};

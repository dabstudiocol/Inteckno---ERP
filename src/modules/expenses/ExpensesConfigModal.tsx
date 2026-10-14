import React, { useState } from 'react';
import {
  X,
  Building,
  CreditCard,
  Tag,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  RotateCcw,
  Check,
  Save,
  Key,
  ExternalLink,
  Info,
  Shield,
} from 'lucide-react';
import {
  ExpensesModuleConfig,
  OfficeCostCenterConfig,
  PaymentMethodConfig,
  ExpenseCategoryConfig,
  saveExpensesModuleConfig,
  resetExpensesModuleConfig,
} from '../../core/services/moduleConfigService';
import { getGeminiApiKey, saveGeminiApiKey } from '../../core/services/aiVisionExpenseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  config: ExpensesModuleConfig;
  onConfigUpdated: (newConfig: ExpensesModuleConfig) => void;
}

export const ExpensesConfigModal: React.FC<Props> = ({
  isOpen,
  onClose,
  config: initialConfig,
  onConfigUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'offices' | 'payments' | 'categories' | 'ai'>('offices');
  const [config, setConfig] = useState<ExpensesModuleConfig>(initialConfig);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Estados para agregar nuevos elementos
  const [newOfficeName, setNewOfficeName] = useState('');
  const [newOfficeCode, setNewOfficeCode] = useState('');

  const [newPaymentName, setNewPaymentName] = useState('');

  const [newCategoryLabel, setNewCategoryLabel] = useState('');

  // IA Key
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [apiKeySavedSuccess, setApiKeySavedSuccess] = useState(false);

  if (!isOpen) return null;

  // --- Manejadores de Sedes ---
  const handleAddOffice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficeName.trim()) return;

    const newOffice: OfficeCostCenterConfig = {
      id: `off-${Date.now()}`,
      name: newOfficeName.trim(),
      code: newOfficeCode.trim() || `ADM-${Math.floor(100 + Math.random() * 900)}`,
      isActive: true,
    };

    const updated = {
      ...config,
      offices: [...config.offices, newOffice],
    };
    setConfig(updated);
    saveExpensesModuleConfig(updated);
    onConfigUpdated(updated);
    setNewOfficeName('');
    setNewOfficeCode('');
  };

  const handleUpdateOffice = (id: string, field: keyof OfficeCostCenterConfig, value: any) => {
    const updatedOffices = config.offices.map((off) =>
      off.id === id ? { ...off, [field]: value } : off
    );
    const updated = { ...config, offices: updatedOffices };
    setConfig(updated);
    saveExpensesModuleConfig(updated);
    onConfigUpdated(updated);
  };

  const handleDeleteOffice = (id: string) => {
    if (config.offices.length <= 1) {
      alert('Debe existir al menos una sede configurada.');
      return;
    }
    const updatedOffices = config.offices.filter((off) => off.id !== id);
    const updated = { ...config, offices: updatedOffices };
    setConfig(updated);
    saveExpensesModuleConfig(updated);
    onConfigUpdated(updated);
  };

  // --- Manejadores de Métodos de Pago ---
  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPaymentName.trim()) return;

    const newPayment: PaymentMethodConfig = {
      id: `pay-${Date.now()}`,
      name: newPaymentName.trim(),
      isActive: true,
    };

    const updated = {
      ...config,
      paymentMethods: [...config.paymentMethods, newPayment],
    };
    setConfig(updated);
    saveExpensesModuleConfig(updated);
    onConfigUpdated(updated);
    setNewPaymentName('');
  };

  const handleUpdatePayment = (id: string, field: keyof PaymentMethodConfig, value: any) => {
    const updatedPayments = config.paymentMethods.map((p) =>
      p.id === id ? { ...p, [field]: value } : p
    );
    const updated = { ...config, paymentMethods: updatedPayments };
    setConfig(updated);
    saveExpensesModuleConfig(updated);
    onConfigUpdated(updated);
  };

  const handleDeletePayment = (id: string) => {
    if (config.paymentMethods.length <= 1) {
      alert('Debe existir al menos un método de pago configurado.');
      return;
    }
    const updatedPayments = config.paymentMethods.filter((p) => p.id !== id);
    const updated = { ...config, paymentMethods: updatedPayments };
    setConfig(updated);
    saveExpensesModuleConfig(updated);
    onConfigUpdated(updated);
  };

  // --- Manejadores de Categorías ---
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryLabel.trim()) return;

    const key = newCategoryLabel
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    const newCategory: ExpenseCategoryConfig = {
      id: `cat-${Date.now()}`,
      key: key || `cat_${Date.now()}`,
      label: newCategoryLabel.trim(),
      isActive: true,
    };

    const updated = {
      ...config,
      categories: [...config.categories, newCategory],
    };
    setConfig(updated);
    saveExpensesModuleConfig(updated);
    onConfigUpdated(updated);
    setNewCategoryLabel('');
  };

  const handleUpdateCategory = (id: string, field: keyof ExpenseCategoryConfig, value: any) => {
    const updatedCategories = config.categories.map((c) =>
      c.id === id ? { ...c, [field]: value } : c
    );
    const updated = { ...config, categories: updatedCategories };
    setConfig(updated);
    saveExpensesModuleConfig(updated);
    onConfigUpdated(updated);
  };

  const handleDeleteCategory = (id: string) => {
    if (config.categories.length <= 1) {
      alert('Debe existir al menos una categoría contable configurada.');
      return;
    }
    const updatedCategories = config.categories.filter((c) => c.id !== id);
    const updated = { ...config, categories: updatedCategories };
    setConfig(updated);
    saveExpensesModuleConfig(updated);
    onConfigUpdated(updated);
  };

  // Restablecer valores originales
  const handleResetDefaults = () => {
    if (confirm('¿Deseas restaurar los menús desplegables a los valores predeterminados de fábrica?')) {
      const def = resetExpensesModuleConfig();
      setConfig(def);
      onConfigUpdated(def);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    saveGeminiApiKey(apiKeyInput.trim());
    setApiKeySavedSuccess(true);
    setTimeout(() => setApiKeySavedSuccess(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Building size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Personalización del Módulo de Gastos</h3>
              <p className="text-xs text-gray-500 font-medium">
                Edita, agrega o elimina las opciones de los menús desplegables a la medida de tu empresa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors shrink-0 aspect-square cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Pestañas de Configuración en Grid Responsivo */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 pb-1 w-full">
          <button
            type="button"
            onClick={() => setActiveTab('offices')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer ${
              activeTab === 'offices'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
            }`}
          >
            <Building size={14} className="shrink-0" />
            <span className="truncate">Sedes ({config.offices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer ${
              activeTab === 'payments'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
            }`}
          >
            <CreditCard size={14} className="shrink-0" />
            <span className="truncate">Métodos Pago ({config.paymentMethods.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-[#00668F] text-white shadow-xs'
                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
            }`}
          >
            <Tag size={14} className="shrink-0" />
            <span className="truncate">Rubros ({config.categories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
            }`}
          >
            <Sparkles size={14} className="shrink-0" />
            <span className="truncate">IA Gemini</span>
          </button>
        </div>

        {/* CONTENIDO DE PESTAÑA: SEDES Y OFICINAS */}
        {activeTab === 'offices' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-gray-900">Catálogo de Sedes y Centros de Costo</h4>
                <p className="text-[11px] text-gray-500">
                  Estas son las opciones que aparecerán en el desplegable "Asignar a Sede / Oficina Administrativa".
                </p>
              </div>
            </div>

            {/* Formulario Agregar Nueva Sede */}
            <form onSubmit={handleAddOffice} className="bg-slate-50 p-3 rounded-2xl flex flex-col sm:flex-row gap-2 items-center">
              <input
                type="text"
                required
                value={newOfficeName}
                onChange={(e) => setNewOfficeName(e.target.value)}
                placeholder="Nombre de la nueva sede (ej. Sede Cali / Bodega Manizales)"
                className="flex-1 p-2 rounded-xl bg-white text-xs font-medium text-gray-900 shadow-2xs focus:outline-hidden w-full"
              />
              <input
                type="text"
                value={newOfficeCode}
                onChange={(e) => setNewOfficeCode(e.target.value)}
                placeholder="Código Centro de Costos (ej. ADM-CLO-03)"
                className="w-full sm:w-56 p-2 rounded-xl bg-white text-xs font-mono font-medium text-gray-900 shadow-2xs focus:outline-hidden"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus size={14} />
                <span>Agregar Sede</span>
              </button>
            </form>

            {/* Lista Editable de Sedes */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {config.offices.map((off) => (
                <div key={off.id} className="p-3 bg-white border border-gray-100 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    <input
                      type="text"
                      value={off.name}
                      onChange={(e) => handleUpdateOffice(off.id, 'name', e.target.value)}
                      className="p-1.5 rounded-lg bg-slate-50 text-xs font-semibold text-gray-900 focus:outline-hidden"
                    />
                    <input
                      type="text"
                      value={off.code}
                      onChange={(e) => handleUpdateOffice(off.id, 'code', e.target.value)}
                      className="p-1.5 rounded-lg bg-slate-50 text-xs font-mono text-gray-700 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={off.isActive}
                        onChange={(e) => handleUpdateOffice(off.id, 'isActive', e.target.checked)}
                        className="rounded-sm text-[#00668F]"
                      />
                      <span>Visible</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteOffice(off.id)}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                      title="Eliminar opción"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO DE PESTAÑA: MÉTODOS DE PAGO */}
        {activeTab === 'payments' && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h4 className="text-xs font-bold text-gray-900">Catálogo de Métodos de Pago</h4>
              <p className="text-[11px] text-gray-500">
                Estas son las opciones que aparecerán en el desplegable "Método de Pago" al registrar facturas.
              </p>
            </div>

            {/* Formulario Agregar Nuevo Método */}
            <form onSubmit={handleAddPayment} className="bg-slate-50 p-3 rounded-2xl flex gap-2 items-center">
              <input
                type="text"
                required
                value={newPaymentName}
                onChange={(e) => setNewPaymentName(e.target.value)}
                placeholder="Nombre del nuevo método de pago (ej. Tarjeta Visa Davivienda, Caja Menor Obra...)"
                className="flex-1 p-2 rounded-xl bg-white text-xs font-medium text-gray-900 shadow-2xs focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} />
                <span>Agregar</span>
              </button>
            </form>

            {/* Lista Editable de Métodos de Pago */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {config.paymentMethods.map((pay) => (
                <div key={pay.id} className="p-3 bg-white border border-gray-100 rounded-2xl shadow-2xs flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={pay.name}
                    onChange={(e) => handleUpdatePayment(pay.id, 'name', e.target.value)}
                    className="flex-1 p-1.5 rounded-lg bg-slate-50 text-xs font-semibold text-gray-900 focus:outline-hidden"
                  />

                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pay.isActive}
                        onChange={(e) => handleUpdatePayment(pay.id, 'isActive', e.target.checked)}
                        className="rounded-sm text-[#00668F]"
                      />
                      <span>Visible</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeletePayment(pay.id)}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                      title="Eliminar método"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO DE PESTAÑA: RUBROS Y CATEGORÍAS */}
        {activeTab === 'categories' && (
          <div className="space-y-4 animate-in fade-in">
            <div>
              <h4 className="text-xs font-bold text-gray-900">Catálogo de Rubros y Categorías Contables</h4>
              <p className="text-[11px] text-gray-500">
                Estas son las opciones que aparecerán en el desplegable "Rubro / Categoría".
              </p>
            </div>

            {/* Formulario Agregar Nueva Categoría */}
            <form onSubmit={handleAddCategory} className="bg-slate-50 p-3 rounded-2xl flex gap-2 items-center">
              <input
                type="text"
                required
                value={newCategoryLabel}
                onChange={(e) => setNewCategoryLabel(e.target.value)}
                placeholder="Nombre del nuevo rubro (ej. Mantenimiento EPP, Gastos Legales y Notaría...)"
                className="flex-1 p-2 rounded-xl bg-white text-xs font-medium text-gray-900 shadow-2xs focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold shadow-2xs flex items-center gap-1.5 shrink-0"
              >
                <Plus size={14} />
                <span>Agregar Rubro</span>
              </button>
            </form>

            {/* Lista Editable de Categorías */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {config.categories.map((cat) => (
                <div key={cat.id} className="p-3 bg-white border border-gray-100 rounded-2xl shadow-2xs flex items-center justify-between gap-3">
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={cat.label}
                      onChange={(e) => handleUpdateCategory(cat.id, 'label', e.target.value)}
                      className="flex-1 p-1.5 rounded-lg bg-slate-50 text-xs font-semibold text-gray-900 focus:outline-hidden"
                    />
                    <span className="text-[10px] text-gray-400 font-mono flex items-center px-1.5">
                      Clave: {cat.key}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cat.isActive}
                        onChange={(e) => handleUpdateCategory(cat.id, 'isActive', e.target.checked)}
                        className="rounded-sm text-[#00668F]"
                      />
                      <span>Visible</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors"
                      title="Eliminar rubro"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CONTENIDO DE PESTAÑA: IA GEMINI */}
        {activeTab === 'ai' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-sky-50/60 p-4 rounded-2xl text-xs text-gray-700 space-y-2">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                <Sparkles size={16} className="text-[#00668F]" />
                Conexión Multimodal con Google Gemini (Google AI Pro)
              </h4>
              <p>
                Tu cuenta de Google AI Pro permite escanear facturas en vivo con los modelos más recientes de visión artificial (Gemini 3.5 Flash Lite).
              </p>
            </div>

            <form onSubmit={handleSaveApiKey} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full p-2.5 rounded-xl bg-slate-50 font-mono text-gray-900 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden"
                />
              </div>

              {apiKeySavedSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> ¡Clave guardada con éxito!
                </div>
              )}

              <div className="pt-2 flex justify-between items-center">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-[#00668F] hover:underline flex items-center gap-1"
                >
                  <span>Abrir Google AI Studio</span>
                  <ExternalLink size={12} />
                </a>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold shadow-2xs flex items-center gap-1.5"
                >
                  <Save size={14} />
                  <span>Guardar Clave</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Footer y Restaurar Valores */}
        <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-gray-500 hover:text-gray-800 font-semibold flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={13} />
            <span>Restablecer valores predeterminados</span>
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                <CheckCircle2 size={13} /> Opciones sincronizadas
              </span>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-full bg-[#00668F] hover:bg-[#005073] text-white font-bold shadow-xs active:scale-95 flex items-center gap-1.5"
            >
              <Check size={14} />
              <span>Listo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

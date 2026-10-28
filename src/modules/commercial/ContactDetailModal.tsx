import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  User,
  Tag,
  Globe,
  FileText,
  CreditCard,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Landmark,
  QrCode,
  Users,
  Link2,
  CheckSquare,
  Square,
  Save,
  Briefcase,
  Sparkles,
  Loader2,
  Settings,
} from 'lucide-react';
import { useModuleCatalog } from '../../core/services/moduleConfigService';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import {
  CRMContact,
  RelatedContactPerson,
  ContactBankAccount,
  User as ErpUser,
} from '../../types';
import { enrichContactWithAI } from '../../core/services/lucianaService';

interface ContactDetailModalProps {
  contact: CRMContact;
  allContacts?: CRMContact[];
  erpUsers?: ErpUser[];
  onClose: () => void;
  onSave: (updatedContact: CRMContact) => void;
}

// Las 5 obligaciones y responsabilidades tributarias oficiales DIAN
const DIAN_RESPONSIBILITIES_PRESETS = [
  { code: 'O-13', label: 'Gran contribuyente' },
  { code: 'O-15', label: 'Autorretenedor' },
  { code: 'O-23', label: 'Agente de retención IVA' },
  { code: 'O-47', label: 'Régimen simple de tributación' },
  { code: 'R-99-PN', label: 'No responsable' },
];

// Opciones de Régimen Fiscal
const FISCAL_REGIME_OPTIONS = ['IVA', 'No aplica', 'IC', 'IVA e IC'];

const INDUSTRIES_PRESETS = [
  'Transporte por Cable / STC',
  'Tecnología & Telecomunicaciones',
  'Infraestructura & Construcción',
  'Gobierno & Sector Público',
  'Agro & Agroindustria',
  'Educación & Academia',
  'Minería & Energía',
  'Manufactura & Industria Pesada',
  'Servicios & Consultoría',
];

const INCOTERMS_PRESETS = [
  { code: 'EXW', name: 'EXW - En Fábrica (Ex Works)' },
  { code: 'FCA', name: 'FCA - Franco Porteador (Free Carrier)' },
  { code: 'CPT', name: 'CPT - Transporte Pagado Hasta' },
  { code: 'CIP', name: 'CIP - Transporte y Seguro Pagados' },
  { code: 'DAP', name: 'DAP - Entregado en Lugar' },
  { code: 'DPU', name: 'DPU - Entregado en Lugar Descargado' },
  { code: 'DDP', name: 'DDP - Entregado Derechos Pagados' },
  { code: 'FAS', name: 'FAS - Franco al Costado del Buque' },
  { code: 'FOB', name: 'FOB - Franco a Bordo' },
  { code: 'CFR', name: 'CFR - Coste y Flete' },
  { code: 'CIF', name: 'CIF - Coste, Seguro y Flete' },
];

const PAYMENT_TERMS_PRESETS = [
  'Pago Inmediato',
  '15 días',
  '21 días',
  '30 días',
  '45 días',
  '60 días',
  '90 días',
  '50% Anticipo / 50% Contra Entrega',
  '30% Anticipo / 60% Avance / 10% Retención',
];

const TAG_COLOR_PALETTES = [
  'bg-sky-100 text-sky-800',
  'bg-emerald-100 text-emerald-800',
  'bg-amber-100 text-amber-800',
  'bg-purple-100 text-purple-800',
  'bg-rose-100 text-rose-800',
  'bg-indigo-100 text-indigo-800',
];

export const ContactDetailModal: React.FC<ContactDetailModalProps> = ({
  contact,
  allContacts = [],
  erpUsers = [],
  onClose,
  onSave,
}) => {
  const catalogCountries = useModuleCatalog('crm', 'countries');
  const catalogCurrencies = useModuleCatalog('crm', 'currencies');
  const catalogPaymentTerms = useModuleCatalog('crm', 'paymentTerms');
  const catalogPaymentMethods = useModuleCatalog('crm', 'paymentMethods');

  const [activeTab, setActiveTab] = useState<
    'contactos' | 'ventas_compras' | 'facturacion' | 'notas' | 'dian'
  >('contactos');

  // Estado editable local con TODOS los campos editables
  const [formData, setFormData] = useState<CRMContact>({
    ...contact,
    name: contact.name || '',
    company: contact.company || '',
    role: contact.role || '',
    stcSystem: contact.stcSystem || '',
    email: contact.email || '',
    phone: contact.phone || '',
    country: contact.country || 'Colombia',
    notes: contact.notes || '',
    tags: contact.tags || [],
    nit: contact.nit || '',
    dunsId: contact.dunsId || '',
    website: contact.website || '',
    relatedContacts: contact.relatedContacts || [],
    linkedContactIds: contact.linkedContactIds || [],
    salesPurchases: {
      assignedSalespersonId: contact.salesPurchases?.assignedSalespersonId || erpUsers?.[0]?.id || '',
      assignedSalespersonName: contact.salesPurchases?.assignedSalespersonName || erpUsers?.[0]?.name || '',
      priceListCurrency: contact.salesPurchases?.priceListCurrency || 'USD',
      paymentTermsSales: contact.salesPurchases?.paymentTermsSales || '30 días',
      paymentMethodSales: contact.salesPurchases?.paymentMethodSales || 'Transferencia Bancaria',
      incoterm: contact.salesPurchases?.incoterm || 'DDP',
      incotermLocation: contact.salesPurchases?.incotermLocation || '',
      paymentTermsPurchases: contact.salesPurchases?.paymentTermsPurchases || '30 días',
      paymentMethodPurchases: contact.salesPurchases?.paymentMethodPurchases || 'Transferencia Bancaria',
      fiscalPosition: contact.salesPurchases?.fiscalPosition || 'Régimen Ordinario / Común',
      internalReference: contact.salesPurchases?.internalReference || `REF-${contact.id}`,
      industry: contact.salesPurchases?.industry || 'Transporte por Cable / STC',
    },
    billing: {
      bankAccounts: contact.billing?.bankAccounts || [],
      qrCodePaymentUrl: contact.billing?.qrCodePaymentUrl || '',
      routingId: contact.billing?.routingId || '',
    },
    internalNotes: contact.internalNotes || contact.notes || '',
    dianBilling: {
      responsibilities: contact.dianBilling?.responsibilities || ['O-13'],
      fiscalRegime: contact.dianBilling?.fiscalRegime || 'IVA',
      isLargeTaxpayer: contact.dianBilling?.isLargeTaxpayer ?? false,
      commercialName: contact.dianBilling?.commercialName || contact.company || '',
    },
  });

  // Inputs auxiliares
  const [newTagInput, setNewTagInput] = useState('');
  const [newRelatedPerson, setNewRelatedPerson] = useState<Omit<RelatedContactPerson, 'id'>>({
    name: '',
    role: '',
    email: '',
    phone: '',
    isPrimary: false,
  });
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);

  const [newBankAccount, setNewBankAccount] = useState<Omit<ContactBankAccount, 'id'>>({
    bankName: '',
    accountType: 'Corriente',
    accountNumber: '',
    holderName: formData.company || '',
    currency: 'USD',
  });
  const [showAddBankForm, setShowAddBankForm] = useState(false);

  // Manejo de etiquetas
  const handleAddTag = (tagToAdd?: string) => {
    const tag = (tagToAdd || newTagInput).trim();
    if (!tag) return;
    if (!formData.tags?.includes(tag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tagToRemove) || [],
    }));
  };

  // Manejo de personas relacionadas
  const handleAddRelatedPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRelatedPerson.name.trim()) return;
    const person: RelatedContactPerson = {
      ...newRelatedPerson,
      id: `RC-${Date.now()}`,
    };
    setFormData((prev) => ({
      ...prev,
      relatedContacts: [...(prev.relatedContacts || []), person],
    }));
    setNewRelatedPerson({
      name: '',
      role: '',
      email: '',
      phone: '',
      isPrimary: false,
    });
    setShowAddPersonForm(false);
  };

  const handleRemoveRelatedPerson = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      relatedContacts: prev.relatedContacts?.filter((p) => p.id !== id) || [],
    }));
  };

  // Manejo de cuentas bancarias
  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankAccount.bankName.trim() || !newBankAccount.accountNumber.trim()) return;
    const account: ContactBankAccount = {
      ...newBankAccount,
      id: `BA-${Date.now()}`,
    };
    setFormData((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        bankAccounts: [...(prev.billing?.bankAccounts || []), account],
      },
    }));
    setNewBankAccount({
      bankName: '',
      accountType: 'Corriente',
      accountNumber: '',
      holderName: formData.company || '',
      currency: 'USD',
    });
    setShowAddBankForm(false);
  };

  const handleRemoveBankAccount = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      billing: {
        ...prev.billing,
        bankAccounts: prev.billing?.bankAccounts?.filter((a) => a.id !== id) || [],
      },
    }));
  };

  // Toggle de responsabilidades DIAN (sólo las 5 oficiales)
  const toggleDianResponsibility = (code: string) => {
    const current = formData.dianBilling?.responsibilities || [];
    const exists = current.includes(code);
    const updated = exists ? current.filter((c) => c !== code) : [...current, code];
    
    // Si selecciona O-13 (Gran Contribuyente), sincronizar también el checkbox
    const isLarge = code === 'O-13' ? !exists : formData.dianBilling?.isLargeTaxpayer;

    setFormData((prev) => ({
      ...prev,
      dianBilling: {
        ...prev.dianBilling,
        responsibilities: updated,
        isLargeTaxpayer: isLarge,
      },
    }));
  };

  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichNotification, setEnrichNotification] = useState<string | null>(null);

  const handleEnrichWithLuciana = async () => {
    setIsEnriching(true);
    try {
      const suggestions = await enrichContactWithAI(formData);
      setFormData((prev) => ({
        ...prev,
        stcSystem: prev.stcSystem || suggestions.stcSystem || '',
        country: prev.country || suggestions.country || 'Colombia',
        tags: suggestions.tags || prev.tags,
        notes: suggestions.notes || prev.notes,
        salesPurchases: {
          ...prev.salesPurchases,
          fiscalPosition: suggestions.salesPurchases?.fiscalPosition || prev.salesPurchases?.fiscalPosition,
          paymentTermsSales: suggestions.salesPurchases?.paymentTermsSales || prev.salesPurchases?.paymentTermsSales,
          priceListCurrency: suggestions.salesPurchases?.priceListCurrency || prev.salesPurchases?.priceListCurrency,
          incoterm: suggestions.salesPurchases?.incoterm || prev.salesPurchases?.incoterm,
        },
      }));
      setEnrichNotification('¡Ficha enriquecida exitosamente con LUC-IA-NA!');
      setTimeout(() => setEnrichNotification(null), 4000);
    } catch (err) {
      console.error('Error enriqueciendo contacto:', err);
    } finally {
      setIsEnriching(false);
    }
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm flex flex-col min-h-[600px] overflow-hidden">
      {/* ========================================================================= */}
      {/* CABECERA CON COLOR SÓLIDO (Sin gradientes, sin bordes pesados) */}
      {/* ========================================================================= */}
      <div className="bg-[#00668F] text-white px-6 py-4 shrink-0 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/15 hover:bg-black/25 text-white text-xs font-bold transition-colors cursor-pointer"
            title="Volver al Directorio"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Volver</span>
          </button>
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
            <User size={20} />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-200 block">
              Ficha de Contacto
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-white truncate">
              {formData.name || formData.company || 'Nuevo Contacto'}
            </h2>
            {formData.company && (
              <span className="text-xs text-sky-100 block truncate">
                {formData.company} {formData.role ? `• ${formData.role}` : ''}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('inteckno:open-module-config', { detail: { moduleId: 'crm' } }))}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
            title="Personalizar catálogos y opciones comerciales (Países, Monedas, Términos de Pago)"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">Configurar Opciones</span>
          </button>
          <button
            type="button"
            onClick={handleEnrichWithLuciana}
            disabled={isEnriching}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition-transform active:scale-95 cursor-pointer disabled:opacity-60"
            title="Enriquecer ficha técnica y comercial con LUC-IA-NA"
          >
            {isEnriching ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span className="hidden md:inline">Enriquecer con IA</span>
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-white/90 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-transform active:scale-95 cursor-pointer"
          >
            <Save size={15} />
            <span>Guardar Ficha</span>
          </button>
        </div>
      </div>

      {enrichNotification && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-2.5 flex items-center gap-2 text-emerald-800 text-xs font-semibold animate-fadeIn">
          <Sparkles size={15} className="text-emerald-600" />
          <span>{enrichNotification}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DATOS PRINCIPALES DEL CONTACTO - 100% EDITABLES */}
      {/* ========================================================================= */}
      <div className="bg-slate-50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Información Principal de la Entidad y Contacto
          </h3>
          <span className="text-[11px] text-gray-500 font-mono">
            ID: {formData.id}
          </span>
        </div>

        {/* Fila 1: Empresa, Nombre Contacto, Cargo/Puesto */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Empresa / Operador STC <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              placeholder="Ej: Metro de Medellín Ltda."
              className="w-full text-xs p-2.5 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F] text-gray-900 font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nombre de Contacto Principal <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Ing. Carlos Mendoza"
              className="w-full text-xs p-2.5 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F] text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Cargo / Puesto
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="Ej: Gerente de Mantenimiento Cables"
              className="w-full text-xs p-2.5 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F] text-gray-900"
            />
          </div>
        </div>

        {/* Fila 2: Sistema STC, Email, Teléfono, País */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Sistema STC / Teleférico
            </label>
            <input
              type="text"
              value={formData.stcSystem}
              onChange={(e) => setFormData({ ...formData, stcSystem: e.target.value })}
              placeholder="Ej: Metrocable Líneas K, J, L, H, M, P"
              className="w-full text-xs p-2.5 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F] text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email Corporativo
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="cmendoza@metrodemedellin.gov.co"
              className="w-full text-xs p-2.5 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F] text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Teléfono / Celular
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+57 310 456 7890"
              className="w-full text-xs p-2.5 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F] text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              País
            </label>
            <CreatableSelect
              value={formData.country || 'Colombia'}
              onChange={(val) => setFormData({ ...formData, country: val })}
              options={catalogCountries.map((c) => ({ id: c.id, name: c.name, code: c.code }))}
              placeholder="Seleccionar o escribir país..."
              moduleId="crm"
              catalogKey="countries"
              allowCustomText={true}
              inputClassName="bg-white"
            />
          </div>
        </div>

        {/* Fila 3: NIT, DUNS, Sitio Web Oficial */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              NIT / Identificación Tributaria
            </label>
            <input
              type="text"
              value={formData.nit || ''}
              onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
              placeholder="Ej: 890.905.211-1"
              className="w-full text-xs p-2.5 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F] font-mono text-gray-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              DUNS / ID Empresa
            </label>
            <input
              type="text"
              value={formData.dunsId || ''}
              onChange={(e) => setFormData({ ...formData, dunsId: e.target.value })}
              placeholder="Ej: 85-234-9871"
              className="w-full text-xs p-2.5 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F] font-mono text-gray-900"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700">
                Sitio Web Oficial
              </label>
              {formData.website && (
                <a
                  href={formData.website.startsWith('http') ? formData.website : `https://${formData.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#00668F] hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Visitar</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Globe size={15} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={formData.website || ''}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://www.metrodemedellin.gov.co"
                className="w-full text-xs p-2.5 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#00668F] text-gray-900"
              />
            </div>
          </div>
        </div>

        {/* Fila 4: Etiquetas / Tags dinámicos */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
              <Tag size={13} className="text-[#00668F]" />
              Etiquetas de Clasificación
            </label>
            <span className="text-[11px] text-gray-400">
              {formData.tags?.length || 0} asignadas
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {formData.tags?.map((tag, idx) => (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                  TAG_COLOR_PALETTES[idx % TAG_COLOR_PALETTES.length]
                }`}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="hover:text-red-700 ml-1 text-xs font-black cursor-pointer"
                  title="Eliminar etiqueta"
                >
                  ×
                </button>
              </span>
            ))}

            <div className="flex items-center gap-1">
              <input
                type="text"
                placeholder="Añadir etiqueta..."
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="text-xs px-2.5 py-1 bg-white rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#00668F] w-36"
              />
              <button
                type="button"
                onClick={() => handleAddTag()}
                className="px-2.5 py-1 bg-[#00668F] text-white rounded-lg text-xs font-bold hover:bg-[#005273] cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MENÚ DE PESTAÑAS MODULAR (Colores sólidos, limpio) */}
      {/* ========================================================================= */}
      <div className="bg-white px-3 sm:px-6 shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:flex lg:items-center gap-2 pt-3 w-full">
        <button
          onClick={() => setActiveTab('contactos')}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${
            activeTab === 'contactos'
              ? 'bg-[#00668F] text-white shadow-xs'
              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
          }`}
        >
          <Users size={14} className="shrink-0" />
          <span className="truncate">Contactos ({formData.relatedContacts?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('ventas_compras')}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${
            activeTab === 'ventas_compras'
              ? 'bg-[#00668F] text-white shadow-xs'
              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
          }`}
        >
          <Briefcase size={14} className="shrink-0" />
          <span className="truncate">Ventas y Compras</span>
        </button>

        <button
          onClick={() => setActiveTab('facturacion')}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${
            activeTab === 'facturacion'
              ? 'bg-[#00668F] text-white shadow-xs'
              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
          }`}
        >
          <CreditCard size={14} className="shrink-0" />
          <span className="truncate">Facturación & Bancos</span>
        </button>

        <button
          onClick={() => setActiveTab('notas')}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${
            activeTab === 'notas'
              ? 'bg-[#00668F] text-white shadow-xs'
              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
          }`}
        >
          <FileText size={14} className="shrink-0" />
          <span className="truncate">Notas Internas</span>
        </button>

        <button
          onClick={() => setActiveTab('dian')}
          className={`py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-center ${
            activeTab === 'dian'
              ? 'bg-[#00668F] text-white shadow-xs'
              : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
          }`}
        >
          <Landmark size={14} className="shrink-0" />
          <span className="truncate">Facturación DIAN</span>
          {formData.dianBilling?.isLargeTaxpayer && (
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0"></span>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CONTENIDO DE CADA PESTAÑA */}
      {/* ========================================================================= */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 1: CONTACTOS RELACIONADOS & VÍNCULOS */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'contactos' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Users size={16} className="text-[#00668F]" />
                  Directorio de Personas y Enlaces de la Entidad
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Contactos directos, supervisores, directores de compras o técnicos vinculados a {formData.company}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPersonForm(!showAddPersonForm)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00668F] text-white text-xs font-semibold rounded-xl hover:bg-[#005273] transition-colors cursor-pointer shadow-xs"
              >
                <Plus size={14} />
                <span>{showAddPersonForm ? 'Cerrar Formulario' : 'Agregar Contacto Relacionado'}</span>
              </button>
            </div>

            {/* Formulario de Agregar Persona */}
            {showAddPersonForm && (
              <form
                onSubmit={handleAddRelatedPerson}
                className="bg-white p-5 rounded-2xl shadow-sm space-y-4"
              >
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                  Nuevo Contacto Relacionado
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Ing. Jorge Restrepo"
                      value={newRelatedPerson.name}
                      onChange={(e) => setNewRelatedPerson({ ...newRelatedPerson, name: e.target.value })}
                      className="w-full p-2 bg-slate-50 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Cargo / Especialidad</label>
                    <input
                      type="text"
                      placeholder="Ej: Supervisor Electromecánico"
                      value={newRelatedPerson.role}
                      onChange={(e) => setNewRelatedPerson({ ...newRelatedPerson, role: e.target.value })}
                      className="w-full p-2 bg-slate-50 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="jrestrepo@entidad.com"
                      value={newRelatedPerson.email}
                      onChange={(e) => setNewRelatedPerson({ ...newRelatedPerson, email: e.target.value })}
                      className="w-full p-2 bg-slate-50 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-semibold mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="+57 300 123 4567"
                      value={newRelatedPerson.phone}
                      onChange={(e) => setNewRelatedPerson({ ...newRelatedPerson, phone: e.target.value })}
                      className="w-full p-2 bg-slate-50 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRelatedPerson.isPrimary}
                      onChange={(e) =>
                        setNewRelatedPerson({ ...newRelatedPerson, isPrimary: e.target.checked })
                      }
                      className="rounded text-[#00668F]"
                    />
                    <span>Es el contacto principal para contrataciones y licitaciones</span>
                  </label>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#00668F] hover:bg-[#005273] text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Guardar Contacto
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Contactos Relacionados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {(formData.relatedContacts || []).map((person) => (
                <div
                  key={person.id}
                  className="bg-white p-4 rounded-2xl shadow-xs space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-xs font-bold text-gray-900">{person.name}</span>
                      {person.isPrimary && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          Principal
                        </span>
                      )}
                    </div>
                    {person.role && <p className="text-[11px] text-[#00668F] font-semibold">{person.role}</p>}
                    {person.email && <p className="text-[11px] text-gray-500">✉️ {person.email}</p>}
                    {person.phone && <p className="text-[11px] text-gray-500">📞 {person.phone}</p>}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveRelatedPerson(person.id)}
                      className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                      title="Eliminar contacto"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Vincular Otros Contactos / Aliados del ERP */}
            <div className="bg-white p-5 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                <Link2 size={16} className="text-[#00668F]" />
                <span>Vincular Otros Contactos / Aliados del ERP</span>
              </div>
              <p className="text-xs text-gray-500">
                Asocia entidades que participan en compras conjuntas, convenios interadministrativos o licitaciones compartidas.
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                {(allContacts || [])
                  .filter((c) => c.id !== formData.id)
                  .map((other) => {
                    const isLinked = formData.linkedContactIds?.includes(other.id);
                    return (
                      <button
                        key={other.id}
                        type="button"
                        onClick={() => {
                          const current = formData.linkedContactIds || [];
                          const updated = isLinked
                            ? current.filter((id) => id !== other.id)
                            : [...current, other.id];
                          setFormData({ ...formData, linkedContactIds: updated });
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                          isLinked
                            ? 'bg-sky-100 text-[#00668F]'
                            : 'bg-slate-100 text-gray-600 hover:bg-slate-200'
                        }`}
                      >
                        {isLinked ? <CheckSquare size={13} /> : <Square size={13} />}
                        <span>{other.company}</span>
                        <span className="text-[10px] text-gray-400">({other.country})</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 2: VENTAS Y COMPRAS */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'ventas_compras' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* VENTAS */}
            <div className="bg-white p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-[#00668F] flex items-center justify-center font-bold">
                  <Briefcase size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Configuración Comercial de Ventas</h4>
                  <p className="text-xs text-gray-500">Parámetros de cotización, listas de precios e Incoterms para este cliente.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <CreatableSelect
                    label="Vendedor Asignado"
                    value={formData.salesPurchases?.assignedSalespersonName || ''}
                    onChange={(val) => {
                      const user = erpUsers.find((u) => u.name.toLowerCase() === val.toLowerCase() || u.id === val);
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          assignedSalespersonId: user?.id || val,
                          assignedSalespersonName: user?.name || val,
                        },
                      });
                    }}
                    options={erpUsers.map((u) => ({
                      id: u.id,
                      name: u.name,
                      code: u.role,
                    }))}
                    placeholder="Seleccionar o escribir vendedor..."
                    allowCustomText={true}
                    inputClassName="bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Lista de Precios / Moneda</label>
                  <CreatableSelect
                    value={formData.salesPurchases?.priceListCurrency || 'USD'}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          priceListCurrency: val,
                        },
                      })
                    }
                    options={
                      catalogCurrencies.length > 0
                        ? catalogCurrencies.map((c) => ({ id: c.code || c.id, name: c.name, code: c.code }))
                        : [
                            { id: 'USD', name: 'USD ($ - Dólar Estadounidense)', code: 'USD' },
                            { id: 'COP', name: 'COP ($ - Peso Colombiano)', code: 'COP' },
                            { id: 'EUR', name: 'EUR (€ - Euro Europeo)', code: 'EUR' },
                            { id: 'MXN', name: 'MXN ($ - Peso Mexicano)', code: 'MXN' },
                            { id: 'BOB', name: 'BOB (Bs - Boliviano)', code: 'BOB' },
                            { id: 'CLP', name: 'CLP ($ - Peso Chileno)', code: 'CLP' },
                            { id: 'PEN', name: 'PEN (S/ - Sol Peruano)', code: 'PEN' },
                            { id: 'CHF', name: 'CHF (Fr - Franco Suizo)', code: 'CHF' },
                          ]
                    }
                    placeholder="Buscar o escribir moneda..."
                    moduleId="crm"
                    catalogKey="currencies"
                    allowCustomText={true}
                    inputClassName="bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Términos de Pago (Ventas)</label>
                  <CreatableSelect
                    value={formData.salesPurchases?.paymentTermsSales || '30 días'}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          paymentTermsSales: val,
                        },
                      })
                    }
                    options={
                      catalogPaymentTerms.length > 0
                        ? catalogPaymentTerms.map((pt) => ({ id: pt.id, name: pt.name, code: pt.code }))
                        : PAYMENT_TERMS_PRESETS.map((p) => ({ id: p, name: p }))
                    }
                    placeholder="Seleccionar o escribir término de pago..."
                    moduleId="crm"
                    catalogKey="paymentTerms"
                    allowCustomText={true}
                    inputClassName="bg-slate-50"
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Método de Pago (Ventas)"
                    value={formData.salesPurchases?.paymentMethodSales || 'Transferencia Bancaria Electrónica'}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          paymentMethodSales: val,
                        },
                      })
                    }
                    options={
                      catalogPaymentMethods.length > 0
                        ? catalogPaymentMethods.map((pm) => ({ id: pm.id, name: pm.name, code: pm.code }))
                        : [
                            { id: 'TRANSF', name: 'Transferencia Bancaria Electrónica', code: 'TRANSF' },
                            { id: 'CONSIG', name: 'Consignación Bancaria Directa', code: 'CONSIG' },
                            { id: 'CHEQUE', name: 'Cheque de Gerencia / Cruzado', code: 'CHEQUE' },
                            { id: 'LC-STBY', name: 'Carta de Crédito Standby (Internacional)', code: 'LC-STBY' },
                            { id: 'SWIFT', name: 'Giro Internacional (SWIFT / ACH)', code: 'SWIFT' },
                          ]
                    }
                    placeholder="Seleccionar o escribir método de pago..."
                    moduleId="crm"
                    catalogKey="paymentMethods"
                    allowCustomText={true}
                    inputClassName="bg-slate-50"
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Incoterm Internacional"
                    value={formData.salesPurchases?.incoterm || 'DDP'}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          incoterm: val,
                        },
                      })
                    }
                    options={INCOTERMS_PRESETS.map((inc) => ({
                      id: inc.code,
                      name: inc.name,
                      code: inc.code,
                    }))}
                    placeholder="Seleccionar Incoterm..."
                    allowCustomText={true}
                    inputClassName="bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Ubicación Incoterm</label>
                  <input
                    type="text"
                    placeholder="Ej: Estación Acevedo / Puerto Buenaventura"
                    value={formData.salesPurchases?.incotermLocation || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          incotermLocation: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
                  />
                </div>
              </div>
            </div>

            {/* COMPRAS */}
            <div className="bg-white p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CreditCard size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Condiciones de Compras & Proveeduría</h4>
                  <p className="text-xs text-gray-500">Aplica cuando la entidad opera también como proveedor de repuestos o servicios.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <CreatableSelect
                    label="Términos de Pago (Compras)"
                    value={formData.salesPurchases?.paymentTermsPurchases || '30 días fecha factura (30 F/F)'}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          paymentTermsPurchases: val,
                        },
                      })
                    }
                    options={
                      catalogPaymentTerms.length > 0
                        ? catalogPaymentTerms.map((pt) => ({ id: pt.id, name: pt.name, code: pt.code }))
                        : PAYMENT_TERMS_PRESETS.map((p) => ({ id: p, name: p }))
                    }
                    placeholder="Seleccionar o escribir término de pago compras..."
                    moduleId="crm"
                    catalogKey="paymentTerms"
                    allowCustomText={true}
                    inputClassName="bg-slate-50"
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Método de Pago (Compras)"
                    value={formData.salesPurchases?.paymentMethodPurchases || 'Transferencia Bancaria Electrónica'}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          paymentMethodPurchases: val,
                        },
                      })
                    }
                    options={
                      catalogPaymentMethods.length > 0
                        ? catalogPaymentMethods.map((pm) => ({ id: pm.id, name: pm.name, code: pm.code }))
                        : [
                            { id: 'TRANSF', name: 'Transferencia Bancaria Electrónica', code: 'TRANSF' },
                            { id: 'CONSIG', name: 'Consignación Bancaria Directa', code: 'CONSIG' },
                            { id: 'CHEQUE', name: 'Cheque de Gerencia / Cruzado', code: 'CHEQUE' },
                          ]
                    }
                    placeholder="Seleccionar o escribir método de pago compras..."
                    moduleId="crm"
                    catalogKey="paymentMethods"
                    allowCustomText={true}
                    inputClassName="bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* INFORMACIÓN FISCAL & VARIOS */}
            <div className="bg-white p-6 rounded-2xl shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Información Fiscal & Clasificación Sectorial</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <CreatableSelect
                    label="Posición Fiscal"
                    value={formData.salesPurchases?.fiscalPosition || 'Régimen Ordinario / Común'}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          fiscalPosition: val,
                        },
                      })
                    }
                    options={[
                      { id: 'reg-ord', name: 'Régimen Ordinario / Común' },
                      { id: 'reg-simp', name: 'Régimen Simple de Tributación (RST)' },
                      { id: 'gran-cont', name: 'Gran Contribuyente' },
                      { id: 'autoretenedor', name: 'Autorretenedor' },
                      { id: 'no-responsable', name: 'Persona Natural No Responsable de IVA' },
                      { id: 'extranjero', name: 'Extranjero / No Residente Fiscal' },
                    ]}
                    placeholder="Seleccionar o escribir posición fiscal..."
                    allowCustomText={true}
                    inputClassName="bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">Referencia / Código Interno</label>
                  <input
                    type="text"
                    value={formData.salesPurchases?.internalReference || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          internalReference: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-[#00668F] font-mono"
                  />
                </div>

                <div>
                  <CreatableSelect
                    label="Industria / Sector"
                    value={formData.salesPurchases?.industry || 'Transporte por Cable / STC'}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        salesPurchases: {
                          ...formData.salesPurchases,
                          industry: val,
                        },
                      })
                    }
                    options={INDUSTRIES_PRESETS.map((ind) => ({ id: ind, name: ind }))}
                    placeholder="Seleccionar o escribir sector..."
                    allowCustomText={true}
                    inputClassName="bg-slate-50"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 3: FACTURACIÓN & BANCOS */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'facturacion' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Cuentas Bancarias */}
            <div className="bg-white p-6 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Cuentas Bancarias Oficiales</h4>
                  <p className="text-xs text-gray-500">Cuentas registradas para pagos y transferencias interbancarias.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddBankForm(!showAddBankForm)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00668F] text-white text-xs font-semibold rounded-xl hover:bg-[#005273] transition-colors cursor-pointer"
                >
                  <Plus size={14} />
                  <span>{showAddBankForm ? 'Cerrar' : 'Añadir Cuenta Bancaria'}</span>
                </button>
              </div>

              {/* Formulario Nueva Cuenta */}
              {showAddBankForm && (
                <form
                  onSubmit={handleAddBankAccount}
                  className="bg-slate-50 p-4 rounded-xl space-y-3 text-xs"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <CreatableSelect
                        label="Banco"
                        required
                        placeholder="Ej: Bancolombia / BBVA"
                        value={newBankAccount.bankName}
                        onChange={(val) => setNewBankAccount({ ...newBankAccount, bankName: val })}
                        options={[
                          { id: 'bancolombia', name: 'Bancolombia', code: 'COL' },
                          { id: 'davivienda', name: 'Davivienda', code: 'COL' },
                          { id: 'bogota', name: 'Banco de Bogotá', code: 'COL' },
                          { id: 'bbva', name: 'BBVA Colombia', code: 'COL' },
                          { id: 'occidente', name: 'Banco de Occidente', code: 'COL' },
                          { id: 'popular', name: 'Banco Popular', code: 'COL' },
                          { id: 'chase', name: 'JPMorgan Chase (USD)', code: 'USA' },
                          { id: 'bofa', name: 'Bank of America (USD)', code: 'USA' },
                          { id: 'wells', name: 'Wells Fargo (USD)', code: 'USA' },
                          { id: 'mercantil', name: 'Banco Mercantil Santa Cruz', code: 'BOL' },
                          { id: 'bisa', name: 'Banco BISA', code: 'BOL' },
                          { id: 'bpd', name: 'Banco Popular Dominicano', code: 'DOM' },
                          { id: 'banreservas', name: 'Banreservas', code: 'DOM' },
                        ]}
                        allowCustomText={true}
                        inputClassName="bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Tipo de Cuenta</label>
                      <select
                        value={newBankAccount.accountType}
                        onChange={(e) =>
                          setNewBankAccount({
                            ...newBankAccount,
                            accountType: e.target.value as ContactBankAccount['accountType'],
                          })
                        }
                        className="w-full p-2 bg-white rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
                      >
                        <option value="Corriente">Corriente</option>
                        <option value="Ahorros">Ahorros</option>
                        <option value="Internacional">Internacional (USD)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Número de Cuenta *</label>
                      <input
                        type="text"
                        required
                        placeholder="000-000000-00"
                        value={newBankAccount.accountNumber}
                        onChange={(e) => setNewBankAccount({ ...newBankAccount, accountNumber: e.target.value })}
                        className="w-full p-2 bg-white rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#00668F] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 font-semibold mb-1">Moneda</label>
                      <select
                        value={newBankAccount.currency}
                        onChange={(e) =>
                          setNewBankAccount({
                            ...newBankAccount,
                            currency: e.target.value as ContactBankAccount['currency'],
                          })
                        }
                        className="w-full p-2 bg-white rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
                      >
                        <option value="COP">COP ($)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Registrar Cuenta
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de cuentas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(formData.billing?.bankAccounts || []).length > 0 ? (
                  formData.billing!.bankAccounts!.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-4 bg-slate-50 rounded-xl flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-900">{acc.bankName}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-100 text-[#00668F]">
                            {acc.currency}
                          </span>
                        </div>
                        <p className="text-xs font-mono font-bold text-gray-700">{acc.accountNumber}</p>
                        <p className="text-[11px] text-gray-500">{acc.accountType}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBankAccount(acc.id)}
                        className="text-gray-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Eliminar cuenta"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center py-5 text-gray-400 text-xs italic bg-slate-50 rounded-xl">
                    No hay cuentas bancarias registradas.
                  </div>
                )}
              </div>
            </div>

            {/* Facturas Cliente: QR y Routing */}
            <div className="bg-white p-6 rounded-2xl shadow-xs space-y-4">
              <h4 className="text-sm font-bold text-gray-900">Pasarelas de Pago & Enrutamiento de Facturas</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Código QR de Pago (URL o Enlace)
                  </label>
                  <input
                    type="text"
                    placeholder="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=..."
                    value={formData.billing?.qrCodePaymentUrl || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billing: {
                          ...formData.billing,
                          qrCodePaymentUrl: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
                  />
                  {formData.billing?.qrCodePaymentUrl && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-xl flex items-center gap-3">
                      <img
                        src={formData.billing.qrCodePaymentUrl}
                        alt="QR Pago"
                        className="w-16 h-16 rounded-lg bg-white p-1"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                      <div className="text-[11px] text-gray-600">
                        <p className="font-bold text-gray-800">Previsualización de Código QR</p>
                        <p className="text-gray-500">Se imprimirá en anexos de facturación comercial.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    ID de Enrutamiento (SWIFT / BIC / ACH / Routing ID)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: COLBCOBM / BBVAMXMM"
                    value={formData.billing?.routingId || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        billing: {
                          ...formData.billing,
                          routingId: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-[#00668F] font-mono uppercase"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Identificador de compensación interbancaria nacional o internacional.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 4: NOTAS INTERNAS & BITÁCORA */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'notas' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <FileText size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Bitácora Técnica & Notas Internas Confidenciales</h4>
                  <p className="text-xs text-gray-500">
                    Información interna para el equipo comercial, técnico y directivo de INTECKNO.
                  </p>
                </div>
              </div>

              <textarea
                rows={8}
                placeholder="Escribe acuerdos clave, observaciones sobre el teleférico, calendarios de paradas de mantenimiento o historial de negociaciones..."
                value={formData.internalNotes || ''}
                onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })}
                className="w-full p-4 rounded-xl bg-slate-50 text-xs text-gray-800 leading-relaxed focus:outline-hidden focus:ring-1 focus:ring-[#00668F]"
              />

              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Visible únicamente para usuarios internos autorizados.</span>
                <span>{formData.internalNotes?.length || 0} caracteres</span>
              </div>
            </div>
          </div>
        )}

        {/* --------------------------------------------------------------------- */}
        {/* PESTAÑA 5: FACTURACIÓN DIAN (COLOMBIA) */}
        {/* --------------------------------------------------------------------- */}
        {activeTab === 'dian' && (
          <div className="space-y-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-2xl shadow-xs space-y-6">
              <div className="flex items-center gap-3 pb-2">
                <div className="w-9 h-9 rounded-full shrink-0 aspect-square bg-sky-100 text-[#00668F] flex items-center justify-center font-bold shadow-2xs">
                  <Landmark size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">Facturación Electrónica DIAN & Responsabilidades</h4>
                  <p className="text-xs text-gray-500">
                    RUT y datos fiscales obligatorios para emisión y recepción de facturas en Colombia.
                  </p>
                </div>
              </div>

              {/* Nombre Comercial y Régimen Fiscal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Nombre Comercial Registrado</label>
                  <input
                    type="text"
                    placeholder="Ej: Metrocable / Cablebús Línea 1"
                    value={formData.dianBilling?.commercialName || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dianBilling: {
                          ...formData.dianBilling,
                          commercialName: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-[#00668F] font-semibold text-gray-900"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Nombre comercial o de operación ante el público.
                  </p>
                </div>

                <div>
                  <CreatableSelect
                    label="Régimen Fiscal (IVA, No aplica, IC, IVA e IC)"
                    value={formData.dianBilling?.fiscalRegime || 'IVA'}
                    onChange={(val) =>
                      setFormData({
                        ...formData,
                        dianBilling: {
                          ...formData.dianBilling,
                          fiscalRegime: val,
                        },
                      })
                    }
                    options={FISCAL_REGIME_OPTIONS.map((regime) => ({ id: regime, name: regime }))}
                    placeholder="Seleccionar régimen fiscal..."
                    allowCustomText={true}
                    inputClassName="bg-slate-50 font-semibold"
                  />
                  <p className="text-[11px] text-gray-500 mt-1">
                    Régimen de impuesto sobre las ventas e impuesto nacional al consumo.
                  </p>
                </div>
              </div>

              {/* Gran Contribuyente Checkbox */}
              <div className="bg-amber-50 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.dianBilling?.isLargeTaxpayer || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const current = formData.dianBilling?.responsibilities || [];
                      const updated = checked
                        ? (current.includes('O-13') ? current : [...current, 'O-13'])
                        : current.filter((c) => c !== 'O-13');

                      setFormData({
                        ...formData,
                        dianBilling: {
                          ...formData.dianBilling,
                          isLargeTaxpayer: checked,
                          responsibilities: updated,
                        },
                      });
                    }}
                    className="w-5 h-5 rounded text-[#00668F] focus:ring-[#00668F] cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Calidad de Gran Contribuyente (DIAN - Código O-13)
                    </span>
                    <span className="text-[11px] text-amber-900/80 block">
                      Aplica retención en la fuente especial según resolución oficial de la DIAN.
                    </span>
                  </div>
                </label>
              </div>

              {/* 5 OBLIGACIONES Y RESPONSABILIDADES TRIBUTARIAS DIAN */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-gray-800 uppercase tracking-wide">
                    Obligaciones y Responsabilidades Tributarias DIAN (5 Oficiales)
                  </label>
                  <span className="text-[11px] text-gray-500">
                    {formData.dianBilling?.responsibilities?.length || 0} seleccionadas
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {DIAN_RESPONSIBILITIES_PRESETS.map((resp) => {
                    const isSelected = formData.dianBilling?.responsibilities?.includes(resp.code);
                    return (
                      <button
                        key={resp.code}
                        type="button"
                        onClick={() => toggleDianResponsibility(resp.code)}
                        className={`flex items-center justify-between p-3.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#00668F] text-white font-semibold'
                            : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                              isSelected ? 'bg-white/20 text-white' : 'bg-white text-gray-800'
                            }`}
                          >
                            {resp.code}
                          </span>
                          <span>{resp.label}</span>
                        </div>
                        {isSelected && <Check size={16} className="text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PIE FIJO CON ACCIONES */}
      {/* ========================================================================= */}
      <div className="bg-white px-6 py-3.5 shrink-0 flex items-center justify-between">
        <div className="text-xs text-gray-500 hidden sm:block">
          Contacto: <span className="font-semibold text-gray-800">{formData.name}</span> {formData.company && <span className="text-gray-400">({formData.company})</span>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Volver sin Guardar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00668F] hover:bg-[#005273] text-white text-xs font-bold rounded-xl shadow-xs transition-transform active:scale-95 cursor-pointer"
          >
            <Save size={15} />
            <span>Guardar Ficha</span>
          </button>
        </div>
      </div>
    </div>
  );
};

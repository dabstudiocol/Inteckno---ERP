import React, { useState, useRef } from 'react';
import {
  Receipt,
  Camera,
  CheckCircle2,
  DollarSign,
  Plus,
  Building2,
  FileImage,
  Upload,
  Sparkles,
  AlertCircle,
  Eye,
  X,
  Key,
  Info,
  RefreshCw,
  Building,
  Briefcase,
  FileText,
  ExternalLink,
  Trash2,
  Edit3,
  CreditCard,
  Hash,
  Calendar,
  Layers,
  Check,
  Settings,
  Wallet,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { ExpenseEntry, ExpenseCategory, InvoiceLineItem } from '../../types';
import { LightTable } from '../../components/ui/LightTable';
import {
  analyzeInvoiceReceiptImage,
  getGeminiApiKey,
  saveGeminiApiKey,
  ExtractedExpenseData,
} from '../../core/services/aiVisionExpenseService';
import {
  getExpensesModuleConfig,
  ExpensesModuleConfig,
} from '../../core/services/moduleConfigService';
import { ExpensesConfigModal } from './ExpensesConfigModal';
import { ConfirmDeleteModal } from '../../components/common/ConfirmDeleteModal';
import { CreatableSelect } from '../../components/common/CreatableSelect';
import { TabPettyCash } from './components/TabPettyCash';

export const ExpensesModule: React.FC = () => {
  const { expenses, projects, users, employees, currentUser, submitExpense, approveExpense, deleteExpense } = useErp();

  // Pestaña Activa: Comprobantes Generales vs Caja Menor
  const [activeTab, setActiveTab] = useState<'comprobantes' | 'caja_menor'>('comprobantes');

  // Configuración dinámica del módulo (Sedes, Métodos de Pago, Rubros)
  const [moduleConfig, setModuleConfig] = useState<ExpensesModuleConfig>(getExpensesModuleConfig());
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseEntry | null>(null);

  // Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingExpense, setViewingExpense] = useState<ExpenseEntry | null>(null);

  // Responsable / Técnico del Gasto (Interconexión RRHH)
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.id);

  // Lista unificada de colaboradores (Usuarios de sistema + Personal registrado en Talento Humano)
  const collaboratorsList = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; role: string }>();
    users.forEach((u) => {
      map.set(u.id, {
        id: u.id,
        name: u.name,
        role: u.roleLabel || u.department || 'Colaborador ITK',
      });
    });
    employees.forEach((emp) => {
      if (!map.has(emp.id)) {
        map.set(emp.id, {
          id: emp.id,
          name: emp.name,
          role: emp.role || emp.department || 'Técnico de Campo',
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [users, employees]);

  // Estado del Formulario
  const [imputationType, setImputationType] = useState<'proyecto' | 'oficina'>('proyecto');
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '');
  const [selectedOfficeId, setSelectedOfficeId] = useState(
    moduleConfig.offices[0]?.id || ''
  );
  const [category, setCategory] = useState<string>(
    moduleConfig.categories[0]?.key || 'viaticos_alimentacion'
  );

  // Datos Contables de la Factura
  const [supplierName, setSupplierName] = useState<string>('');
  const [supplierTaxId, setSupplierTaxId] = useState<string>('');
  const [invoiceNumber, setInvoiceNumber] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>(
    moduleConfig.paymentMethods[0]?.name || 'Efectivo'
  );

  // Líneas de detalle de la factura (Productos / Servicios)
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);

  // Desglose de totales
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discount, setDiscount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<'COP' | 'USD' | 'EUR'>('COP');
  const [description, setDescription] = useState<string>('');

  // Estado de Imagen y Análisis IA
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isScanningAi, setIsScanningAi] = useState<boolean>(false);
  const [aiConfidence, setAiConfidence] = useState<number | null>(null);
  const [aiEngineUsed, setAiEngineUsed] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [formUnlocked, setFormUnlocked] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];
  const selectedOffice =
    moduleConfig.offices.find((o) => o.id === selectedOfficeId) || moduleConfig.offices[0];

  // Limpiar y resetear el modal al abrir
  const handleOpenNewExpenseModal = () => {
    setReceiptImage(null);
    setUploadedFile(null);
    setSupplierName('');
    setSupplierTaxId('');
    setInvoiceNumber('');
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod(moduleConfig.paymentMethods.find((p) => p.isActive)?.name || 'Efectivo');
    setLineItems([]);
    setSubtotal(0);
    setDiscount(0);
    setTaxAmount(0);
    setAmount(0);
    setCurrency('COP');
    setDescription('');
    setAiConfidence(null);
    setAiEngineUsed(null);
    setAiError(null);
    setFormUnlocked(false);
    setIsModalOpen(true);
  };

  // Aplicar datos extraídos por IA o de un ejemplo
  const applyExtractedData = (data: ExtractedExpenseData, previewUrl: string, modelName?: string) => {
    setReceiptImage(previewUrl);
    setSupplierName(data.supplierName || '');
    setSupplierTaxId(data.supplierTaxId || '');
    setInvoiceNumber(data.invoiceNumber || '');
    setExpenseDate(data.date || new Date().toISOString().split('T')[0]);
    if (data.paymentMethod) setPaymentMethod(data.paymentMethod);
    setLineItems(data.items && data.items.length > 0 ? data.items : []);
    setSubtotal(data.subtotal || 0);
    setDiscount(data.discount || 0);
    setTaxAmount(data.taxAmount || 0);
    setAmount(data.amount || 0);
    setCurrency(data.currency || 'COP');
    if (data.category) setCategory(data.category);
    setDescription(data.suggestedDescription || '');
    if (data.imputationType) {
      setImputationType(data.imputationType);
    }
    setAiConfidence(data.confidence);
    setAiEngineUsed(modelName || 'Google Gemini 3.5 Flash Lite (Google AI Pro)');
    setAiError(null);
    setFormUnlocked(true);
  };

  // Manejador cuando el usuario selecciona un archivo
  const handleFileSelected = (file: File) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen válida (JPG, PNG o WebP).');
      return;
    }

    setUploadedFile(file);
    setAiError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setReceiptImage(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Ejecutar el análisis con IA (Google Gemini Vision)
  const handleRunAiAnalysis = async () => {
    if (!uploadedFile && !receiptImage) {
      alert('Primero debes subir o tomar una foto de la factura.');
      return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      setAiError('No has configurado tu Gemini API Key. Ingresa tu clave para que la IA lea la factura o agrégala a mano.');
      return;
    }

    setIsScanningAi(true);
    setAiError(null);

    try {
      const dummyFile = uploadedFile || new File(['sample'], 'factura.jpg', { type: 'image/jpeg' });
      const result = await analyzeInvoiceReceiptImage(dummyFile, receiptImage!);
      applyExtractedData(result, receiptImage!, result.modelUsed || 'Google Gemini 3.5 Flash Lite (Google AI Pro)');
    } catch (err: any) {
      console.error('Error al analizar factura con Gemini:', err);
      if (err.message === 'MISSING_API_KEY') {
        setAiError('Ingresa tu Gemini API Key en "Configuración del Módulo" para leer la factura en vivo.');
      } else {
        setAiError(`Error al conectar con Google Gemini: ${err.message || 'Verifica tu clave y conexión.'}`);
      }
    } finally {
      setIsScanningAi(false);
    }
  };

  // Activar modo manual (el usuario escribe todo a mano)
  const handleUnlockManualForm = () => {
    setFormUnlocked(true);
    if (lineItems.length === 0) {
      setLineItems([
        {
          id: `item-${Date.now()}-1`,
          description: '',
          quantity: 1,
          unitPrice: 0,
          total: 0,
        },
      ]);
    }
  };

  // Control de líneas de la factura
  const handleAddLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: `item-${Date.now()}-${lineItems.length + 1}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleUpdateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    const updated = lineItems.map((item) => {
      if (item.id === id) {
        const next = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = field === 'quantity' ? Number(value) || 0 : item.quantity;
          const price = field === 'unitPrice' ? Number(value) || 0 : item.unitPrice;
          next.total = qty * price;
        }
        return next;
      }
      return item;
    });

    setLineItems(updated);
    const newSubtotal = updated.reduce((acc, it) => acc + (it.total || 0), 0);
    setSubtotal(newSubtotal);
    setAmount(newSubtotal - discount + taxAmount);
  };

  const handleRemoveLineItem = (id: string) => {
    const updated = lineItems.filter((it) => it.id !== id);
    setLineItems(updated);
    const newSubtotal = updated.reduce((acc, it) => acc + (it.total || 0), 0);
    setSubtotal(newSubtotal);
    setAmount(newSubtotal - discount + taxAmount);
  };

  const handleSubtotalChange = (val: number) => {
    setSubtotal(val);
    setAmount(val - discount + taxAmount);
  };

  const handleDiscountChange = (val: number) => {
    setDiscount(val);
    setAmount(subtotal - val + taxAmount);
  };

  const handleTaxChange = (val: number) => {
    setTaxAmount(val);
    setAmount(subtotal - discount + val);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const getCategoryLabel = (catKey: string): string => {
    const found = moduleConfig.categories.find((c) => c.key === catKey);
    return found ? found.label : 'Gasto Operativo';
  };

  // Radicar el gasto en el store del ERP
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplierName) {
      alert('Por favor ingresa el nombre de la empresa, negocio o establecimiento.');
      return;
    }

    if (amount <= 0) {
      alert('El monto total de la factura debe ser mayor a cero.');
      return;
    }

    const isProject = imputationType === 'proyecto';
    const costCenter = isProject ? selectedProject?.costCenter || 'CC-PROY' : selectedOffice?.code || 'ADM-MED-01';

    const respCollab = collaboratorsList.find((c) => c.id === selectedUserId) || {
      id: currentUser.id,
      name: currentUser.name,
    };

    submitExpense({
      userId: respCollab.id,
      userName: respCollab.name,
      imputationType,
      projectId: isProject ? selectedProject?.id : undefined,
      projectCode: isProject ? selectedProject?.code : undefined,
      costCenter,
      date: expenseDate || new Date().toISOString().split('T')[0],
      category: category as ExpenseCategory,
      categoryLabel: getCategoryLabel(category),
      amount: Number(amount),
      currency,
      receiptPhotoUrl: receiptImage || undefined,
      supplierName: supplierName || undefined,
      supplierTaxId: supplierTaxId || undefined,
      invoiceNumber: invoiceNumber || undefined,
      subtotal,
      discount,
      taxAmount,
      paymentMethod,
      items: lineItems,
      aiExtracted: Boolean(aiConfidence),
      description: description || `Gasto en ${supplierName} imputado a ${isProject ? selectedProject?.code : selectedOffice?.name}.`,
    });

    setIsModalOpen(false);
  };

  const isFinanceOrLeader =
    currentUser.role === 'gerente_administrativa' ||
    currentUser.role === 'gerente_general' ||
    currentUser.role === 'lider_proyectos';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Encabezado y Acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Control de Gastos y Viáticos con IA</h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#00668F] text-white text-[10px] font-extrabold shadow-2xs">
              <Sparkles size={11} /> Google Gemini 3.5
            </span>
          </div>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Escanea cualquier factura, extrae el detalle de productos, impuestos y asigna a Proyecto STC o Gasto de Oficina.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenNewExpenseModal}
            className="px-4 py-2 rounded-full bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 active:scale-95"
          >
            <Camera size={16} />
            <span>Subir Factura / Gasto</span>
          </button>
        </div>
      </div>

      {/* Selector de Pestañas: Comprobantes Generales vs Caja Menor & Gastos Menores */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('comprobantes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'comprobantes'
              ? 'border-[#00668F] text-[#00668F] bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FileText size={15} />
          <span>Comprobantes & Facturas ({expenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('caja_menor')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'caja_menor'
              ? 'border-[#00668F] text-[#00668F] bg-sky-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Wallet size={15} />
          <span>Caja Menor & Gastos Menores</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
            Base $1M
          </span>
        </button>
      </div>

      {activeTab === 'caja_menor' ? (
        <TabPettyCash
          expenses={expenses}
          projects={projects}
          currentUser={currentUser}
          onSubmitExpense={submitExpense}
          onApproveExpense={approveExpense}
          onDeleteExpense={(id) => {
            const exp = expenses.find((e) => e.id === id);
            if (exp) setExpenseToDelete(exp);
          }}
        />
      ) : (
        /* Historial de Gastos y Facturas Radicadas */
        <div className="bg-white rounded-xl p-3.5 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Comprobantes Radicados ({expenses.length})</h3>
              <p className="text-xs text-slate-500">Revisión contable y legalización por Gerencia Administrativa (Clemencia García)</p>
            </div>
          </div>

        <LightTable
          data={expenses}
          keyExtractor={(exp) => exp.id}
          columns={[
            {
              key: 'date',
              header: 'Fecha / Solicitante',
              render: (exp) => (
                <div>
                  <div className="font-bold text-xs text-gray-900">{exp.userName}</div>
                  <div className="text-[11px] text-gray-400">
                    {exp.date} • Centro de Costos: <span className="font-semibold text-gray-600">{exp.costCenter}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'imputation',
              header: 'Destino / Imputación',
              render: (exp) => {
                const isOficina = exp.imputationType === 'oficina' || !exp.projectCode;
                return (
                  <div className="space-y-0.5">
                    {isOficina ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        <Building size={11} className="text-[#00668F]" /> Gasto Oficina / Sede
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-50 text-[#00668F] text-[10px] font-bold">
                        <Briefcase size={11} /> {exp.projectCode}
                      </span>
                    )}
                    <div className="text-[11px] text-gray-500 font-medium">{exp.categoryLabel}</div>
                  </div>
                );
              },
            },
            {
              key: 'supplier',
              header: 'Establecimiento / Factura',
              render: (exp) => (
                <div>
                  <div className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                    <span>{exp.supplierName || 'Comercio Local'}</span>
                    {exp.aiExtracted && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-50 text-amber-800 text-[9px] font-extrabold" title="Procesado con Inteligencia Artificial">
                        <Sparkles size={9} /> IA
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {exp.invoiceNumber ? `Fac: ${exp.invoiceNumber}` : 'Ticket'}
                    {exp.supplierTaxId ? ` • ${exp.supplierTaxId}` : ''}
                  </div>
                </div>
              ),
            },
            {
              key: 'description',
              header: 'Artículos / Concepto',
              render: (exp) => (
                <div>
                  <div className="text-xs text-gray-800 font-medium line-clamp-1">{exp.description}</div>
                  {exp.items && exp.items.length > 0 && (
                    <div className="text-[10px] text-gray-400 font-medium">
                      {exp.items.length} producto(s) desglosado(s)
                    </div>
                  )}
                </div>
              ),
            },
            {
              key: 'receiptPhotoUrl',
              header: 'Comprobante',
              align: 'center',
              render: (exp) => {
                const hasReceipt = Boolean(exp.receiptPhotoUrl);
                return (
                  <button
                    onClick={() => {
                      if (hasReceipt) setViewingExpense(exp);
                    }}
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                      hasReceipt
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 cursor-pointer shadow-2xs active:scale-95'
                        : 'bg-gray-50 text-gray-300 cursor-default'
                    }`}
                  >
                    <FileImage size={13} className={hasReceipt ? 'text-[#00668F]' : 'text-gray-300'} />
                    <span>{hasReceipt ? 'Ver Factura' : 'Sin Foto'}</span>
                  </button>
                );
              },
            },
            {
              key: 'amount',
              header: 'Total Factura',
              align: 'right',
              render: (exp) => (
                <div className="text-right">
                  <div className="font-black text-xs text-gray-900">
                    {exp.currency} ${Number(exp.amount).toLocaleString()}
                  </div>
                  {exp.taxAmount ? (
                    <div className="text-[10px] text-gray-400">IVA: ${Number(exp.taxAmount).toLocaleString()}</div>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Estado',
              align: 'center',
              render: (exp) => (
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    exp.status === 'approved'
                      ? 'bg-emerald-50 text-emerald-800'
                      : 'bg-amber-50 text-amber-800'
                  }`}
                >
                  {exp.status === 'approved' ? 'Legalizado' : 'Pendiente V.B.'}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Acción',
              align: 'right',
              render: (exp) => {
                return (
                  <div className="flex items-center justify-end gap-2">
                    {exp.status === 'pending' && isFinanceOrLeader && (
                      <button
                        onClick={() => approveExpense(exp.id)}
                        className="px-3 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-2xs transition-all active:scale-95"
                      >
                        Legalizar
                      </button>
                    )}
                    <button
                      onClick={() => setExpenseToDelete(exp)}
                      title="Eliminar Gasto"
                      className="p-1 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              },
            },
          ]}
        />
      </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REGISTRO Y ESCANEO DE FACTURAS CON IA                   */}
      {/* ============================================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-[28px] p-6 shadow-2xl space-y-5 my-8 animate-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header del Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#00668F] text-white flex items-center justify-center shadow-xs">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Registro de Factura y Comprobante</h3>
                  <p className="text-xs text-gray-500 font-medium">
                    Sube la foto para que la IA extraiga los datos automáticamente o añade la información a mano
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Configurar sedes, rubros y métodos de pago"
                >
                  <Settings size={13} className="text-[#00668F]" />
                  <span>Configuración</span>
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors shrink-0 aspect-square cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* PASO 1: SUBIR O TOMAR LA FOTO */}
            <div className="space-y-3">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative p-5 rounded-2xl cursor-pointer transition-all border-2 border-dashed ${
                  isDragging
                    ? 'border-[#00668F] bg-sky-50'
                    : receiptImage
                    ? 'border-emerald-300 bg-slate-50'
                    : 'border-gray-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {receiptImage ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden shadow-2xs bg-white shrink-0">
                      <img src={receiptImage} alt="Comprobante" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-white shadow-2xs flex items-center justify-center text-[#00668F] shrink-0">
                      <Camera size={30} />
                    </div>
                  )}

                  <div className="text-center sm:text-left flex-1">
                    <span className="font-bold text-gray-900 block text-sm">
                      {receiptImage ? '✓ Foto de factura cargada con éxito' : 'Tomar foto o arrastrar factura'}
                    </span>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {receiptImage
                        ? 'Haz clic si deseas cambiar la imagen o usa los botones de abajo para procesarla.'
                        : 'Soporta fotos tomadas con el celular en campo, recibos escaneados en JPG o PNG.'}
                    </p>
                    {aiConfidence && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 size={14} /> Factura leída por {aiEngineUsed} (Confianza: {aiConfidence}%)
                      </div>
                    )}
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 rounded-full bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload size={14} className="text-[#00668F]" />
                      <span>{receiptImage ? 'Cambiar Foto' : 'Examinar Foto'}</span>
                    </button>
                  </div>
                </div>

                {/* Spinner de procesamiento IA */}
                {isScanningAi && (
                  <div className="absolute inset-0 bg-[#00668F]/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-white p-4 animate-in fade-in">
                    <div className="flex items-center gap-2.5 font-bold text-sm">
                      <RefreshCw size={18} className="animate-spin" />
                      <span>✨ Google Gemini Vision leyendo factura y desglosando productos...</span>
                    </div>
                    <p className="text-xs text-sky-100 mt-1">Identificando empresa, NIT, ítems, IVA y total...</p>
                    <div className="w-56 h-1.5 bg-white/30 rounded-full mt-3 overflow-hidden">
                      <div className="h-full bg-white rounded-full animate-pulse w-3/4"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Mensaje de Error si la IA falló o falta clave */}
              {aiError && (
                <div className="p-3 rounded-2xl bg-amber-50 text-amber-900 text-xs font-medium flex items-start justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Aviso de Conexión IA</span>
                      <span>{aiError}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(true)}
                    className="shrink-0 px-3 py-1 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs"
                  >
                    Configurar Clave
                  </button>
                </div>
              )}

              {/* BOTONES DE DECISIÓN: ¿LEER CON IA O AÑADIR A MANO? */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRunAiAnalysis}
                  disabled={!receiptImage || isScanningAi}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                    !receiptImage
                      ? 'bg-slate-100 text-gray-400 cursor-not-allowed'
                      : 'bg-[#00668F] hover:bg-[#005073] text-white active:scale-95'
                  }`}
                >
                  <Sparkles size={16} />
                  <span>✨ Leer Factura con IA (Google Gemini)</span>
                </button>

                <button
                  type="button"
                  onClick={handleUnlockManualForm}
                  className={`py-3 px-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs ${
                    formUnlocked
                      ? 'bg-slate-200 text-gray-800'
                      : 'bg-white hover:bg-slate-100 text-gray-700 active:scale-95'
                  }`}
                >
                  <Edit3 size={15} />
                  <span>✍️ Añadir información a mano</span>
                </button>
              </div>
            </div>

            {/* PASO 2: FORMULARIO DETALLADO (SE DESBLOQUEA AL LEER CON IA O AÑADIR A MANO) */}
            {formUnlocked ? (
              <form onSubmit={handleCreateExpense} className="space-y-4 text-xs pt-3 border-t border-gray-100 animate-in fade-in">
                
                {/* SELECTOR DE IMPUTACIÓN (PROYECTO O GASTO DE OFICINA) */}
                <div className="bg-slate-50 p-3.5 rounded-2xl space-y-2.5">
                  <label className="block font-bold text-gray-800 text-[11px] uppercase tracking-wide">
                    Destino del Gasto (Imputación Contable)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImputationType('proyecto');
                        if (category === 'gastos_oficina') {
                          setCategory(moduleConfig.categories[0]?.key || 'viaticos_alimentacion');
                        }
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs ${
                        imputationType === 'proyecto'
                          ? 'bg-[#00668F] text-white'
                          : 'bg-white text-gray-600 hover:bg-slate-100'
                      }`}
                    >
                      <Briefcase size={14} />
                      <span>Proyecto STC (Obra/Campo)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setImputationType('oficina');
                        const ofCat = moduleConfig.categories.find((c) => c.key === 'gastos_oficina');
                        if (ofCat) setCategory('gastos_oficina');
                      }}
                      className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs ${
                        imputationType === 'oficina'
                          ? 'bg-[#00668F] text-white'
                          : 'bg-white text-gray-600 hover:bg-slate-100'
                      }`}
                    >
                      <Building size={14} />
                      <span>Gasto General de Oficina / Sede</span>
                    </button>
                  </div>

                  {imputationType === 'proyecto' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <CreatableSelect
                          label="Asignar al Proyecto STC"
                          required
                          value={selectedProject ? `${selectedProject.code} — ${selectedProject.name}` : ''}
                          onChange={(val) => {
                            const match = projects.find((p) => `${p.code} — ${p.name}`.toLowerCase() === val.toLowerCase() || p.id === val);
                            if (match) setSelectedProjectId(match.id);
                          }}
                          options={projects.map((p) => ({
                            id: p.id,
                            name: `${p.code} — ${p.name}`,
                            code: p.costCenter,
                          }))}
                          placeholder="Buscar o seleccionar proyecto..."
                          inputClassName="bg-white"
                        />
                      </div>
                      <div>
                        <CreatableSelect
                          label="Colaborador Responsable del Gasto"
                          required
                          value={selectedUserId}
                          onChange={(val) => setSelectedUserId(val)}
                          options={collaboratorsList.map((collab) => ({
                            id: collab.id,
                            name: `${collab.name} (${collab.role})`,
                            code: collab.role,
                          }))}
                          placeholder="Seleccionar colaborador de campo..."
                          inputClassName="bg-white"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <CreatableSelect
                          label="Asignar a Sede / Oficina Administrativa"
                          required
                          value={selectedOffice ? `${selectedOffice.name} — Código: ${selectedOffice.code}` : ''}
                          onChange={(val) => {
                            const match = moduleConfig.offices.find(
                              (o) => `${o.name} — Código: ${o.code}`.toLowerCase() === val.toLowerCase() || o.id === val || o.name.toLowerCase() === val.toLowerCase()
                            );
                            if (match) setSelectedOfficeId(match.id);
                          }}
                          options={moduleConfig.offices
                            .filter((o) => o.isActive)
                            .map((o) => ({
                              id: o.id,
                              name: `${o.name} — Código: ${o.code}`,
                              code: o.code,
                            }))}
                          placeholder="Buscar o seleccionar sede..."
                          inputClassName="bg-white"
                        />
                      </div>
                      <div>
                        <CreatableSelect
                          label="Colaborador Responsable del Gasto"
                          required
                          value={selectedUserId}
                          onChange={(val) => setSelectedUserId(val)}
                          options={collaboratorsList.map((collab) => ({
                            id: collab.id,
                            name: `${collab.name} (${collab.role})`,
                            code: collab.role,
                          }))}
                          placeholder="Seleccionar colaborador administrativo..."
                          inputClassName="bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* DATOS DEL ESTABLECIMIENTO Y FACTURA */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">
                      Empresa, Negocio o Establecimiento *
                    </label>
                    <input
                      type="text"
                      required
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                      placeholder="Ej. Restaurante El Cable S.A.S. o Ferretería Central"
                      className="w-full p-2.5 rounded-xl bg-slate-50 font-medium text-gray-900 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      NIT / Identificación Fiscal
                    </label>
                    <input
                      type="text"
                      value={supplierTaxId}
                      onChange={(e) => setSupplierTaxId(e.target.value)}
                      placeholder="Ej. 900.567.891-3"
                      className="w-full p-2.5 rounded-xl bg-slate-50 font-medium text-gray-900 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      N° Factura / Consecutivo / Ticket
                    </label>
                    <input
                      type="text"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Ej. FE-84920"
                      className="w-full p-2.5 rounded-xl bg-slate-50 font-medium text-gray-900 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-1">
                      Fecha Factura *
                    </label>
                    <input
                      type="date"
                      required
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-50 font-medium text-gray-900 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <CreatableSelect
                      label="Método de Pago"
                      required
                      value={paymentMethod}
                      onChange={(val) => setPaymentMethod(val)}
                      options={moduleConfig.paymentMethods
                        .filter((p) => p.isActive)
                        .map((p) => ({ id: p.id, name: p.name }))}
                      placeholder="Seleccionar o escribir método de pago..."
                      allowCustomText={true}
                      inputClassName="bg-slate-50"
                    />
                  </div>
                </div>

                {/* TABLA DE PRODUCTOS / SERVICIOS (LÍNEAS DE LA FACTURA) */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-gray-800 text-xs flex items-center gap-1.5">
                        <Layers size={14} className="text-[#00668F]" />
                        <span>Detalle de Productos / Servicios Facturados ({lineItems.length})</span>
                      </h4>
                      <p className="text-[10px] text-gray-400">Desglose de cantidades, precios unitarios e importes</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddLineItem}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#00668F] hover:text-white text-slate-700 text-[11px] font-bold shadow-2xs transition-all flex items-center gap-1 active:scale-95"
                    >
                      <Plus size={13} />
                      <span>Agregar Producto</span>
                    </button>
                  </div>

                  {lineItems.length === 0 ? (
                    <div className="text-center py-4 bg-white rounded-xl text-gray-400 text-xs">
                      No hay líneas registradas. Haz clic en "Agregar Producto" o sube la factura para que la IA las extraiga.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* VISTA MÓVIL: TARJETAS RESPONSIVAS PARA LÍNEAS DE GASTO */}
                      <div className="md:hidden space-y-2.5">
                        {lineItems.map((item, idx) => (
                          <div key={item.id} className="bg-white p-3 rounded-2xl shadow-xs space-y-2">
                            <div className="flex items-center justify-between gap-2 pb-1 border-b border-slate-100">
                              <span className="text-[11px] font-bold text-slate-500">Línea #{idx + 1}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Eliminar fila"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-slate-500 block mb-1">Descripción</label>
                              <input
                                type="text"
                                value={item.description}
                                onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                                placeholder="Descripción del producto..."
                                className="w-full h-10 px-3 rounded-xl bg-slate-100 text-xs font-medium text-gray-900"
                              />
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <label className="text-[10px] font-bold text-[#00668F] block mb-1">Cant.</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateLineItem(item.id, 'quantity', e.target.value)}
                                  className="w-full h-10 px-2 rounded-xl bg-slate-100 text-xs font-bold text-center text-gray-900"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">Precio Unit.</label>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitPrice}
                                  onChange={(e) => handleUpdateLineItem(item.id, 'unitPrice', e.target.value)}
                                  className="w-full h-10 px-2 rounded-xl bg-slate-100 text-xs font-bold text-right text-gray-900"
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 block mb-1">Importe</label>
                                <div className="h-10 flex items-center justify-end font-bold text-xs text-gray-900 pr-1">
                                  ${item.total.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* VISTA DESKTOP: TABLA CON SEGURIDAD HORIZONTAL */}
                      <div className="hidden md:block space-y-1.5">
                        <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-500 px-2 uppercase">
                          <span className="col-span-6">Producto / Servicio</span>
                          <span className="col-span-2 text-center">Cant.</span>
                          <span className="col-span-2 text-right">Precio Unit.</span>
                          <span className="col-span-2 text-right">Importe</span>
                        </div>

                        {lineItems.map((item) => (
                          <div key={item.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-xl shadow-2xs">
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => handleUpdateLineItem(item.id, 'description', e.target.value)}
                              placeholder="Descripción del producto..."
                              className="col-span-6 h-9 px-2 rounded-lg bg-slate-50 text-xs font-medium text-gray-900"
                            />
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateLineItem(item.id, 'quantity', e.target.value)}
                              className="col-span-2 h-9 px-2 rounded-lg bg-slate-50 text-xs font-bold text-center text-gray-900"
                            />
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) => handleUpdateLineItem(item.id, 'unitPrice', e.target.value)}
                              className="col-span-2 h-9 px-2 rounded-lg bg-slate-50 text-xs font-bold text-right text-gray-900"
                            />
                            <div className="col-span-2 flex items-center justify-end gap-1.5 pr-1">
                              <span className="font-bold text-xs text-gray-900">
                                ${item.total.toLocaleString()}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLineItem(item.id)}
                                className="w-6 h-6 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer"
                                title="Eliminar fila"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* DESGLOSE FINANCIERO: SUBTOTAL, DESCUENTO, IVA Y TOTAL */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl">
                  <div>
                    <label className="block font-bold text-gray-600 mb-1 text-[11px]">
                      Subtotal
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={subtotal}
                      onChange={(e) => handleSubtotalChange(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 rounded-xl bg-white font-bold text-gray-900 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden text-right"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-600 mb-1 text-[11px]">
                      Descuento (-)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 rounded-xl bg-white font-bold text-rose-700 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden text-right"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-600 mb-1 text-[11px]">
                      IVA / Impuestos (+)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={taxAmount}
                      onChange={(e) => handleTaxChange(parseFloat(e.target.value) || 0)}
                      className="w-full p-2.5 rounded-xl bg-white font-bold text-sky-800 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden text-right"
                    />
                  </div>

                    <div>
                      <label className="block font-bold text-gray-900 mb-1 text-[11px]">
                        Total Factura *
                      </label>
                      <div className="flex gap-1.5">
                        <div className="w-24 shrink-0">
                          <CreatableSelect
                            value={currency}
                            onChange={(val) => {
                              if (val) setCurrency(val as any);
                            }}
                            options={[
                              { id: 'COP', name: 'COP', code: 'COP' },
                              { id: 'USD', name: 'USD', code: 'USD' },
                              { id: 'EUR', name: 'EUR', code: 'EUR' },
                              { id: 'MXN', name: 'MXN', code: 'MXN' },
                            ]}
                            placeholder="Divisa..."
                            allowCustomText={false}
                            isClearable={false}
                            inputClassName="p-2.5 rounded-xl bg-white font-bold text-gray-900 shadow-2xs"
                          />
                        </div>
                        <input
                          type="number"
                          min="1"
                          required
                          value={amount}
                          onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                          className="w-full p-2.5 rounded-xl bg-white font-black text-gray-900 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden text-right"
                        />
                      </div>
                    </div>
                </div>

                {/* CATEGORÍA Y DESCRIPCIÓN */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <CreatableSelect
                      label="Rubro / Categoría"
                      required
                      value={moduleConfig.categories.find((c) => c.key === category)?.label || category}
                      onChange={(val) => {
                        const match = moduleConfig.categories.find(
                          (c) => c.label.toLowerCase() === val.toLowerCase() || c.key.toLowerCase() === val.toLowerCase()
                        );
                        setCategory((match?.key || val) as any);
                      }}
                      options={moduleConfig.categories
                        .filter((c) => c.isActive)
                        .map((c) => ({ id: c.key, name: c.label }))}
                      placeholder="Seleccionar o escribir categoría..."
                      allowCustomText={true}
                      inputClassName="bg-slate-50"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-gray-700 mb-1">
                      Concepto o Justificación del Gasto
                    </label>
                    <input
                      type="text"
                      required
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Ej. Almuerzo técnico de cuadrilla en montaje estación..."
                      className="w-full p-2.5 rounded-xl bg-slate-50 font-medium text-gray-900 shadow-2xs focus:ring-2 focus:ring-[#00668F] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="pt-3 flex items-center justify-between border-t border-gray-100">
                  <span className="text-[11px] text-gray-400">
                    {imputationType === 'proyecto'
                      ? `Destino: ${selectedProject?.code} (${selectedProject?.costCenter})`
                      : `Destino: ${selectedOffice?.name} (${selectedOffice?.code})`}
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-gray-600 font-semibold shadow-2xs transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-full bg-[#00668F] hover:bg-[#005073] text-white font-bold shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      <Check size={14} />
                      <span>Radicar Factura</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : null}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: VISOR DE FACTURA COMPLETA Y DETALLES                   */}
      {/* ============================================================== */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="w-full max-w-xl bg-white rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-xl space-y-4 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileImage size={18} className="text-[#00668F]" />
                <h3 className="text-sm font-bold text-slate-900">Detalle Contable de la Factura</h3>
              </div>
              <button
                onClick={() => setViewingExpense(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Imagen del Comprobante */}
            <div className="w-full h-56 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
              {viewingExpense.receiptPhotoUrl ? (
                <img
                  src={viewingExpense.receiptPhotoUrl}
                  alt="Comprobante de Gasto"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-gray-400 text-xs font-semibold">Sin imagen adjunta</div>
              )}
            </div>

            {/* Metadatos y Datos del Emisor */}
            <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-500 font-medium">Establecimiento / Empresa:</span>
                <span className="font-bold text-gray-900">{viewingExpense.supplierName || 'Comercio Local'}</span>
              </div>

              {viewingExpense.supplierTaxId && (
                <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                  <span className="text-gray-500 font-medium">NIT / Identificación:</span>
                  <span className="font-semibold text-gray-700">{viewingExpense.supplierTaxId}</span>
                </div>
              )}

              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-500 font-medium">N° de Factura:</span>
                <span className="font-bold text-[#00668F]">{viewingExpense.invoiceNumber || 'Ticket POS'}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-gray-200/60">
                <span className="text-gray-500 font-medium">Imputación Contable:</span>
                <span className="font-bold text-gray-900">
                  {viewingExpense.imputationType === 'oficina'
                    ? '🏢 Gastos de Oficina / Sede'
                    : `🏗️ Proyecto STC ${viewingExpense.projectCode}`}
                </span>
              </div>

              {/* Lista de productos desglosados si existen */}
              {viewingExpense.items && viewingExpense.items.length > 0 && (
                <div className="pt-2 pb-2 border-b border-gray-200/60 space-y-1.5">
                  <span className="font-bold text-gray-700 block text-[11px]">Productos / Servicios:</span>
                  <div className="space-y-1 bg-white p-2.5 rounded-xl shadow-2xs">
                    {viewingExpense.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[11px]">
                        <span className="text-gray-700 font-medium">
                          {it.quantity}x {it.description}
                        </span>
                        <span className="font-bold text-gray-900">${it.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Subtotal, IVA y Total */}
              <div className="space-y-1 pt-1">
                {viewingExpense.subtotal ? (
                  <div className="flex justify-between items-center text-gray-500">
                    <span>Subtotal:</span>
                    <span>${viewingExpense.subtotal.toLocaleString()}</span>
                  </div>
                ) : null}

                {viewingExpense.taxAmount ? (
                  <div className="flex justify-between items-center text-gray-500">
                    <span>IVA / Impuestos:</span>
                    <span>+${viewingExpense.taxAmount.toLocaleString()}</span>
                  </div>
                ) : null}

                <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                  <span className="text-gray-700 font-bold">Total Factura:</span>
                  <span className="font-black text-sm text-gray-900">
                    {viewingExpense.currency} ${Number(viewingExpense.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setViewingExpense(null)}
                className="px-4 py-2 rounded-full bg-[#00668F] text-white text-xs font-bold hover:bg-[#005073] shadow-2xs"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL DE CONFIGURACIÓN DEL MÓDULO (SEDES, PAGOS, CATEGORÍAS, IA)*/}
      {/* ============================================================== */}
      <ExpensesConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        config={moduleConfig}
        onConfigUpdated={(newCfg) => setModuleConfig(newCfg)}
      />

      {/* ============================================================== */}
      {/* MODAL BLINDADO POKA-YOKE: CONFIRMACIÓN DE ELIMINACIÓN DE GASTO */}
      {/* ============================================================== */}
      <ConfirmDeleteModal
        isOpen={Boolean(expenseToDelete)}
        title="¿Eliminar Registro de Gasto / Factura?"
        itemName={expenseToDelete ? `${expenseToDelete.categoryLabel || expenseToDelete.description} ($${Number(expenseToDelete.amount).toLocaleString()} COP)` : ''}
        description="Esta acción eliminará el gasto registrado de los libros y de la imputación financiera. Se recomienda verificar si ya fue legalizado o pagado."
        confirmText="Eliminar Gasto"
        onConfirm={() => {
          if (expenseToDelete) {
            deleteExpense(expenseToDelete.id);
            setExpenseToDelete(null);
          }
        }}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
};

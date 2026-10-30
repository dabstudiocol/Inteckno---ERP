import React, { useState } from 'react';
import {
  Layers,
  Wrench,
  Zap,
  UploadCloud,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  Send,
  Eye,
  FileCheck2,
  FileText,
  DollarSign,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { useErp } from '../../../core/storage/erpStore';
import { Project, Product, InternalRequisition, InternalRequisitionItem } from '../../../types';
import { extractBOMFromPdfWithLuciana } from '../../../core/services/lucianaService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface EngineeringBomFunnelProps {
  project: Project;
}

export const EngineeringBomFunnel: React.FC<EngineeringBomFunnelProps> = ({ project }) => {
  const {
    products,
    requisitions,
    createRequisition,
    updateRequisition,
    currentUser,
    notify,
  } = useErp();

  // Sub-pestañas de ingeniería
  const [activeArea, setActiveArea] = useState<'diseno' | 'electrico'>('diseno');

  // Formulario de Carga y Extracción
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [neededDate, setNeededDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);
  const [documentMimeType, setDocumentMimeType] = useState('application/pdf');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Lista de ítems en borrador
  const [items, setItems] = useState<InternalRequisitionItem[]>([]);

  // Ítem manual nuevo
  const [newItem, setNewItem] = useState({
    description: '',
    measures: '',
    quantity: 1,
    unit: 'unid',
    unitCostUSD: 10,
  });

  // Requisición activa seleccionada para el embudo de aprobación
  const projectRequisitions = requisitions.filter(
    (r) => r.projectId === project.id && (r.engineeringArea === activeArea || !r.engineeringArea)
  );

  const [selectedReqId, setSelectedReqId] = useState<string | null>(null);
  const activeReq = requisitions.find((r) => r.id === selectedReqId) || projectRequisitions[0];

  // Manejar subida de archivo para extracción con IA
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentName(file.name);
    setDocumentMimeType(file.type || 'application/pdf');
    const reader = new FileReader();
    reader.onload = () => {
      setDocumentBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Ejecutar extracción con IA
  const handleExtractBOM = async () => {
    if (!documentBase64) return;
    setIsAnalyzing(true);
    try {
      const res = await extractBOMFromPdfWithLuciana(documentBase64, documentMimeType, products);
      const mappedItems: InternalRequisitionItem[] = res.extractedItems.map((it, idx) => ({
        id: `bom-item-${Date.now()}-${idx}`,
        productId: it.matchedProductId || it.skuSuggested || `ITK-GEN-${idx}`,
        productSku: it.skuSuggested || 'ITK-GEN',
        productName: it.name,
        description: it.name,
        measures: it.skuSuggested ? `Ref: ${it.skuSuggested}` : 'Estándar STC',
        qtyRequested: it.quantityRequired,
        unit: it.unit || 'unid',
        inStock: (it.availableInErpStock || 0) > 0,
        availableStock: it.availableInErpStock || 0,
        qtyToPurchase: it.missingQuantity,
        unitCostUSD: it.unitCostEstimatedUSD,
      }));
      setItems(mappedItems);
      notify('success', 'Lista Extraída con Éxito', `LUC-IA-NA extrajo ${mappedItems.length} ítems del documento.`);
    } catch (err) {
      console.warn('Error en extracción de lista de materiales:', err);
      notify('warning', 'Aviso de Lectura', 'Se extrajeron ítems con parámetros por defecto.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Añadir ítem manual
  const handleAddManualItem = () => {
    if (!newItem.description.trim()) return;
    const matchedProd = products.find(
      (p) =>
        p.name.toLowerCase().includes(newItem.description.toLowerCase()) ||
        p.sku.toLowerCase().includes(newItem.description.toLowerCase())
    );
    const stock = matchedProd ? matchedProd.availableStock : 0;
    const qty = Number(newItem.quantity) || 1;
    const qtyToPurchase = Math.max(0, qty - stock);

    const created: InternalRequisitionItem = {
      id: `manual-item-${Date.now()}`,
      productId: matchedProd ? matchedProd.id : `MAN-${Date.now()}`,
      productSku: matchedProd ? matchedProd.sku : 'MAN-ITK',
      productName: newItem.description.trim(),
      description: newItem.description.trim(),
      measures: newItem.measures.trim() || 'Según especificación técnica',
      qtyRequested: qty,
      unit: newItem.unit,
      inStock: stock > 0,
      availableStock: stock,
      qtyToPurchase,
      unitCostUSD: Number(newItem.unitCostUSD) || 10,
    };

    setItems([...items, created]);
    setNewItem({
      description: '',
      measures: '',
      quantity: 1,
      unit: 'unid',
      unitCostUSD: 10,
    });
  };

  // Enviar Lista al Embudo (Petición de Compra Inicial)
  const handleSubmitEngineeringRequisition = () => {
    if (items.length === 0) {
      notify('urgent', 'Lista Vacía', 'Debes cargar o extraer al menos un ítem de ingeniería.');
      return;
    }

    const created = createRequisition({
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      requesterId: currentUser.id,
      requesterName: currentUser.name,
      department:
        activeArea === 'diseno' ? 'Diseño Mecánico' : 'Ingeniería Eléctrica',
      engineeringArea: activeArea,
      submissionDate,
      neededDate,
      priority: 'normal',
      sourceDocumentName: documentName || 'Especificación Técnica',
      notes: `Lista de materiales para ${project.name} (${activeArea === 'diseno' ? 'Diseño Mecánico' : 'Ingeniería Eléctrica'}). ${notes}`,
      status: 'submitted',
      items: items.map((it) => ({
        id: it.id,
        productId: it.productId,
        productSku: it.productSku,
        productName: it.productName,
        description: it.description,
        measures: it.measures,
        qtyRequested: it.qtyRequested,
        unit: it.unit,
        inStock: it.inStock,
        availableStock: it.availableStock,
        qtyToPurchase: it.qtyToPurchase,
        unitCostUSD: it.unitCostUSD,
      })),
    });

    if (created && created.requisition) {
      setSelectedReqId(created.requisition.id);
    }
    setItems([]);
    setDocumentName('');
    setDocumentBase64(null);
    notify('success', 'Petición Radicada', 'La lista de materiales inició el embudo de compras.');
  };

  // Acciones del Comprador
  const handleBuyerHomologateItem = (itemId: string, sku: string, name: string) => {
    if (!activeReq) return;
    const updated = activeReq.items.map((it) =>
      it.id === itemId
        ? {
            ...it,
            isHomologated: true,
            homologatedWithSku: sku,
            homologatedWithName: name,
            homologationNotes: 'Homologado por compras con existencia o sustituto comercial.',
          }
        : it
    );
    updateRequisition(activeReq.id, { items: updated });
    notify('info', 'Ítem Homologado', `Se asoció homologación a ${name}.`);
  };

  const handleBuyerRemoveItem = (itemId: string) => {
    if (!activeReq) return;
    const updated = activeReq.items.filter((it) => it.id !== itemId);
    updateRequisition(activeReq.id, { items: updated });
  };

  const handleBuyerForwardToWilson = () => {
    if (!activeReq) return;
    updateRequisition(activeReq.id, {
      status: 'pending_wilson_approval',
      buyerReviewedBy: currentUser.name,
      buyerReviewedAt: new Date().toISOString(),
    });
    notify('success', 'Enviado a Wilson Alzate', 'Lista enviada al Coordinador de Proyectos para Visto Bueno.');
  };

  // Aprobación de Wilson Alzate (Coordinador)
  const handleWilsonApprove = () => {
    if (!activeReq) return;
    updateRequisition(activeReq.id, {
      status: 'approved_for_quotation',
    });
    notify('success', 'Aprobado por Wilson Alzate', 'Lista aprobada. El comprador puede iniciar cotizaciones.');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Selector de Área de Ingeniería: Mecánica vs Eléctrica */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 text-[#00668F]">
            <Layers size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Listas de Materiales y Embudo de Aprobación BOM
            </h3>
            <p className="text-xs text-slate-500">
              Proyecto: <strong>{project.code}</strong> — {project.name}
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveArea('diseno')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeArea === 'diseno'
                ? 'bg-white text-[#00668F] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench size={13} />
            <span>Diseño Mecánico</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveArea('electrico')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeArea === 'electrico'
                ? 'bg-white text-[#00668F] shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Zap size={13} />
            <span>Ingeniería Eléctrica</span>
          </button>
        </div>
      </div>

      {/* Panel Principal: Formulario de Subida + Embudo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Columna Izquierda: Carga de Planos/Documentos y Creación de Lista */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-slate-900 flex items-center gap-1.5">
                <UploadCloud size={16} className="text-[#00668F]" />
                <span>Documento Técnico ({activeArea === 'diseno' ? 'Mecánico' : 'Eléctrico'})</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                PDF / PLANO / ESPECIFICACIÓN
              </span>
            </div>

            {/* Zona de Arrastrar o Seleccionar Archivo */}
            <div className="p-3.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-[#00668F] bg-slate-50 text-center transition-colors">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.dwg"
                onChange={handleFileUpload}
                id="engineering-file-input"
                className="hidden"
              />
              <label htmlFor="engineering-file-input" className="cursor-pointer block space-y-1.5">
                <FileText size={22} className="mx-auto text-slate-400" />
                <div className="font-bold text-slate-800 text-xs">
                  {documentName || 'Haz clic para seleccionar plano o ficha técnica'}
                </div>
                <p className="text-[11px] text-slate-500">Lectura multimodal de materiales y medidas</p>
              </label>
            </div>

            {documentBase64 && (
              <button
                type="button"
                onClick={handleExtractBOM}
                disabled={isAnalyzing}
                className="w-full py-2.5 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                <Sparkles size={14} className={isAnalyzing ? 'animate-spin' : ''} />
                <span>{isAnalyzing ? 'Extrayendo con IA...' : 'Extraer Lista Automáticamente'}</span>
              </button>
            )}

            {/* Fechas Obligatorias */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha de Envío</label>
                <input
                  type="date"
                  value={submissionDate}
                  onChange={(e) => setSubmissionDate(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Fecha Requerida en Sitio</label>
                <input
                  type="date"
                  value={neededDate}
                  onChange={(e) => setNeededDate(e.target.value)}
                  className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Observaciones Técnicas</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Indica tolerancias, marcas sugeridas o prioridad en montaje..."
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200"
              />
            </div>
          </div>

          {/* Formulario Manual de Agregar Ítems */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3 text-xs">
            <span className="font-bold text-slate-900 block pb-1 border-b border-slate-100">
              Añadir Ítem con Medidas Específicas
            </span>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nombre / Descripción (ej: Rodamiento oscilante SKF)"
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200"
              />
              <input
                type="text"
                placeholder="Medidas específicas (ej: Diám. Int: 170mm, Ext: 310mm, Ancho: 110mm)"
                value={newItem.measures}
                onChange={(e) => setNewItem({ ...newItem, measures: e.target.value })}
                className="w-full p-2 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px]"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min="1"
                  placeholder="Cantidad"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center font-bold"
                />
                <input
                  type="text"
                  placeholder="Unidad (unid, m, kg)"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center"
                />
                <input
                  type="number"
                  placeholder="USD Est."
                  value={newItem.unitCostUSD}
                  onChange={(e) => setNewItem({ ...newItem, unitCostUSD: parseFloat(e.target.value) || 0 })}
                  className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center font-bold"
                />
              </div>
              <button
                type="button"
                onClick={handleAddManualItem}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Plus size={13} />
                <span>Agregar Ítem a la Lista</span>
              </button>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Tabla de Borrador y Embudo de Aprobación */}
        <div className="lg:col-span-7 space-y-4">
          {/* Si hay ítems en borrador listos para enviar */}
          {items.length > 0 && (
            <div className="bg-white rounded-2xl p-4 border border-sky-200 shadow-2xs space-y-3 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">
                    Borrador de Lista: {items.length} ítems
                  </h4>
                  <p className="text-slate-500 text-[11px]">Cruce reactivo con el inventario actual</p>
                </div>
                <button
                  type="button"
                  onClick={handleSubmitEngineeringRequisition}
                  className="px-4 py-2 rounded-xl bg-[#008A4B] hover:bg-[#00703C] text-white font-bold cursor-pointer shadow-2xs flex items-center gap-1.5"
                >
                  <Send size={13} />
                  <span>Enviar Petición de Compra</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Ítem & Medidas</th>
                      <th className="p-2 text-center">Req.</th>
                      <th className="p-2 text-center">En Stock</th>
                      <th className="p-2 text-center">Por Comprar</th>
                      <th className="p-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {items.map((it) => (
                      <tr key={it.id} className="hover:bg-slate-50/60">
                        <td className="p-2">
                          <span className="font-bold block">{it.description}</span>
                          <span className="font-mono text-[10px] text-slate-500 block">{it.measures}</span>
                        </td>
                        <td className="p-2 text-center font-bold">
                          {it.qtyRequested} {it.unit}
                        </td>
                        <td className="p-2 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              (it.availableStock || 0) >= it.qtyRequested
                                ? 'bg-emerald-100 text-emerald-800'
                                : (it.availableStock || 0) > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {it.availableStock || 0} {it.unit}
                          </span>
                        </td>
                        <td className="p-2 text-center font-mono font-bold text-rose-700">
                          {it.qtyToPurchase || it.qtyRequested} {it.unit}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setItems(items.filter((x) => x.id !== it.id))}
                            className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Embudo de Aprobación Interactivo de Requisiciones Existentes */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-2">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Embudo de Aprobación & Compras ({activeArea === 'diseno' ? 'Diseño Mecánico' : 'Eléctrico'})
                </h4>
                <p className="text-slate-500 text-[11px]">
                  Flujo: Radicado -&gt; Revisión Comprador -&gt; Aprobación Wilson -&gt; Cotización
                </p>
              </div>

              {projectRequisitions.length > 0 && (
                <div className="w-64">
                  <CreatableSelect
                    value={activeReq ? `${activeReq.reqNumber} (${activeReq.items.length} ítems - ${activeReq.status})` : ''}
                    onChange={(val) => {
                      const found = projectRequisitions.find(
                        (r) => `${r.reqNumber} (${r.items.length} ítems - ${r.status})` === val || r.id === val || r.reqNumber === val
                      );
                      if (found) setSelectedReqId(found.id);
                    }}
                    options={projectRequisitions.map((r) => ({
                      id: r.id,
                      name: `${r.reqNumber} (${r.items.length} ítems - ${r.status})`,
                      code: r.reqNumber,
                    }))}
                    placeholder="Seleccionar requisición..."
                    allowCustomText={false}
                    
                    inputClassName="p-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-xs"
                  />
                </div>
              )}
            </div>

            {activeReq ? (
              <div className="space-y-3.5">
                {/* Visualizador del Embudo de Estados */}
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl text-center text-[10px] font-bold">
                  <div
                    className={`p-2 rounded-lg ${
                      ['submitted', 'draft'].includes(activeReq.status)
                        ? 'bg-sky-600 text-white shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    1. Radicada
                  </div>
                  <div
                    className={`p-2 rounded-lg ${
                      activeReq.status === 'buyer_review'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : ['pending_wilson_approval', 'approved_for_quotation', 'approved'].includes(activeReq.status)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-slate-600'
                    }`}
                  >
                    2. Revisión Comprador
                  </div>
                  <div
                    className={`p-2 rounded-lg ${
                      activeReq.status === 'pending_wilson_approval'
                        ? 'bg-purple-600 text-white shadow-2xs'
                        : ['approved_for_quotation', 'approved'].includes(activeReq.status)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'text-slate-600'
                    }`}
                  >
                    3. Aprobación Wilson
                  </div>
                  <div
                    className={`p-2 rounded-lg ${
                      ['approved_for_quotation', 'approved'].includes(activeReq.status)
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'text-slate-600'
                    }`}
                  >
                    4. Cotizaciones
                  </div>
                </div>

                {/* Datos de la Requisición */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Solicitante:</span>
                    <span className="font-semibold text-slate-800">{activeReq.requesterName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Fecha Envío:</span>
                    <span className="font-semibold text-slate-800">{activeReq.submissionDate || activeReq.createdAt}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Fecha Requerida:</span>
                    <span className="font-semibold text-slate-800">{activeReq.neededDate || 'Inmediata'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Documento Base:</span>
                    <span className="font-semibold text-slate-800 truncate block">{activeReq.sourceDocumentName || 'Plano Técnico'}</span>
                  </div>
                </div>

                {/* Tabla de Artículos con Capacidad de Homologación y Edición del Comprador */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Ítem y Medidas</th>
                        <th className="p-2.5 text-center">Cant.</th>
                        <th className="p-2.5 text-center">En Stock</th>
                        <th className="p-2.5 text-center">Por Comprar</th>
                        <th className="p-2.5 text-right">Acciones Comprador</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {activeReq.items.map((it) => (
                        <tr key={it.id} className="hover:bg-slate-50/60">
                          <td className="p-2.5">
                            <span className="font-bold text-slate-900 block">{it.description || it.productName}</span>
                            <span className="font-mono text-[10px] text-slate-500 block">{it.measures}</span>
                            {it.isHomologated && (
                              <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
                                ✓ Homologado: {it.homologatedWithName} ({it.homologatedWithSku})
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            {it.qtyRequested} {it.unit}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {it.availableStock || 0} {it.unit}
                            </span>
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-rose-700">
                            {it.qtyToPurchase || it.qtyRequested} {it.unit}
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {!it.isHomologated && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleBuyerHomologateItem(
                                      it.id,
                                      'HOM-ITK-01',
                                      'Referencia Homologada Certificada STC'
                                    )
                                  }
                                  title="Homologar producto con sustituto"
                                  className="px-2 py-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold cursor-pointer"
                                >
                                  Homologar
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleBuyerRemoveItem(it.id)}
                                title="Quitar ítem"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Acciones del Embudo */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  {/* Botón Comprador para pasar a Wilson */}
                  {['submitted', 'draft', 'buyer_review'].includes(activeReq.status) && (
                    <button
                      type="button"
                      onClick={handleBuyerForwardToWilson}
                      className="px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <ArrowRight size={13} />
                      <span>Enviar a Wilson Alzate (Coordinador)</span>
                    </button>
                  )}

                  {/* Botón de Visto Bueno de Wilson */}
                  {activeReq.status === 'pending_wilson_approval' && (
                    <button
                      type="button"
                      onClick={handleWilsonApprove}
                      className="px-4 py-2 rounded-xl bg-[#008A4B] hover:bg-[#00703C] text-white font-bold text-xs cursor-pointer shadow-2xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={13} />
                      <span>Aprobar Lista (Visto Bueno de Wilson)</span>
                    </button>
                  )}

                  {/* Estado Listo para Cotizaciones */}
                  {['approved_for_quotation', 'approved'].includes(activeReq.status) && (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                        <Check size={14} />
                        <span>Aprobado por Wilson • Listo para Cotizaciones</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-xs py-6 text-center">
                No hay peticiones de compra registradas para {activeArea === 'diseno' ? 'Diseño Mecánico' : 'Ingeniería Eléctrica'} en este proyecto.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

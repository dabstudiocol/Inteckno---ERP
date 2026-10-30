import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Upload, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Trash2, 
  Info,
  Download,
  BookOpen
} from 'lucide-react';
import { Project } from '../../../../types';
import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';
import { DetailModal } from '../../../../components/common/DetailModal';
import { CreatableSelect } from '../../../../components/common/CreatableSelect';

export interface DeliverableDocument {
  id: string;
  code: string;
  title: string;
  category: 'memoria_calculo' | 'plano' | 'informe_tecnico' | 'especificacion';
  version: string;
  status: 'en_elaboracion' | 'en_revision' | 'aprobado' | 'entregado';
  author: string;
  deliveryDate?: string;
  fileUrl?: string;
  comments?: string;
}

interface TabDocumentosEntregablesProps {
  project: Project;
  onUpdateProject?: (updates: Partial<Project>) => void;
}

export const TabDocumentosEntregables: React.FC<TabDocumentosEntregablesProps> = ({
  project,
  onUpdateProject,
}) => {
  const [documents, setDocuments] = useState<DeliverableDocument[]>(() => {
    return (project.dynamicData?.deliverables as DeliverableDocument[]) || [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<DeliverableDocument | null>(null);
  const [selectedDocDetail, setSelectedDocDetail] = useState<DeliverableDocument | null>(null);

  const [form, setForm] = useState({
    code: '',
    title: '',
    category: 'informe_tecnico' as DeliverableDocument['category'],
    version: '',
    status: 'en_elaboracion' as DeliverableDocument['status'],
    author: project.supervisorName || '',
    deliveryDate: '',
    fileUrl: '',
    comments: '',
  });

  const handleSaveDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const newDoc: DeliverableDocument = {
      id: `doc_${Date.now()}`,
      code: form.code.trim(),
      title: form.title.trim(),
      category: form.category,
      version: form.version.trim() || 'Rev. 0',
      status: form.status,
      author: form.author.trim(),
      deliveryDate: form.deliveryDate,
      fileUrl: form.fileUrl.trim(),
      comments: form.comments.trim(),
    };

    const updated = [newDoc, ...documents];
    setDocuments(updated);

    if (onUpdateProject) {
      onUpdateProject({
        dynamicData: {
          ...(project.dynamicData || {}),
          deliverables: updated,
        },
      });
    }

    setIsModalOpen(false);
    setForm({
      code: '',
      title: '',
      category: 'informe_tecnico',
      version: '',
      status: 'en_elaboracion',
      author: project.supervisorName || '',
      deliveryDate: '',
      fileUrl: '',
      comments: '',
    });
  };

  const handleDeleteDoc = () => {
    if (!docToDelete) return;
    const updated = documents.filter(d => d.id !== docToDelete.id);
    setDocuments(updated);

    if (onUpdateProject) {
      onUpdateProject({
        dynamicData: {
          ...(project.dynamicData || {}),
          deliverables: updated,
        },
      });
    }
    setDocToDelete(null);
  };

  const getStatusBadge = (status: DeliverableDocument['status']) => {
    switch (status) {
      case 'en_elaboracion':
        return { label: 'En elaboración', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'en_revision':
        return { label: 'En revisión técnica', color: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'aprobado':
        return { label: 'Aprobado', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'entregado':
        return { label: 'Entregado al Cliente', color: 'bg-purple-50 text-purple-700 border-purple-200' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-[#00668F] rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Entregables de Consultoría y Documentos de Ingeniería
            </h3>
            <p className="text-xs text-slate-500">
              Control de memorias de cálculo, informes técnicos, planos y peritajes de transporte por cable
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-xl transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Entregable</span>
        </button>
      </div>

      {/* Grid de Documentos */}
      {documents.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No hay entregables documentales registrados
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Registra los informes, cálculos o planos contractuales de esta consultoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map(doc => {
            const badge = getStatusBadge(doc.status);
            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono font-bold text-[#00668F] bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                      {doc.code}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1 truncate">
                      {doc.title}
                    </h4>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>

                <div className="text-xs text-slate-500 space-y-1">
                  <p>Versión: <span className="font-semibold text-slate-700 dark:text-slate-300">{doc.version}</span></p>
                  <p>Autor: <span className="font-medium text-slate-700 dark:text-slate-300">{doc.author || 'Sin autor'}</span></p>
                  {doc.deliveryDate && (
                    <p>Fecha estimada: <span className="font-medium text-slate-700 dark:text-slate-300">{doc.deliveryDate}</span></p>
                  )}
                </div>

                {doc.comments && (
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg line-clamp-2">
                    {doc.comments}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedDocDetail(doc)}
                    className="p-1.5 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg flex items-center gap-1"
                  >
                    <Info className="w-3.5 h-3.5 text-[#00668F]" />
                    <span>Ver Ficha</span>
                  </button>

                  <button
                    onClick={() => setDocToDelete(doc)}
                    className="p-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Entregable */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-y-auto p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Registrar Nuevo Entregable de Ingeniería
            </h3>

            <form onSubmit={handleSaveDoc} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Código del Documento *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Categoría *
                  </label>
                  <CreatableSelect
                    options={[
                      { id: 'informe_tecnico', name: 'Informe Técnico' },
                      { id: 'memoria_calculo', name: 'Memoria de Cálculo' },
                      { id: 'plano', name: 'Plano de Trazado / Montaje' },
                      { id: 'especificacion', name: 'Especificación Técnica' },
                    ]}
                    value={form.category}
                    onChange={(val) => setForm({ ...form, category: val as any })}
                    placeholder="Seleccionar categoría..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Título del Entregable *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej. Memoria de Cálculo de Esfuerzos en Pilona 4"
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Versión
                  </label>
                  <input
                    type="text"
                    value={form.version}
                    onChange={(e) => setForm({ ...form, version: e.target.value })}
                    placeholder="Rev. 0"
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Estado *
                  </label>
                  <CreatableSelect
                    options={[
                      { id: 'en_elaboracion', name: 'En elaboración' },
                      { id: 'en_revision', name: 'En revisión' },
                      { id: 'aprobado', name: 'Aprobado' },
                      { id: 'entregado', name: 'Entregado' },
                    ]}
                    value={form.status}
                    onChange={(val) => setForm({ ...form, status: val as any })}
                    placeholder="Seleccionar estado..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Fecha Entrega
                  </label>
                  <input
                    type="date"
                    value={form.deliveryDate}
                    onChange={(e) => setForm({ ...form, deliveryDate: e.target.value })}
                    className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enlace / Archivo en la Nube (Opcional)
                </label>
                <input
                  type="text"
                  value={form.fileUrl}
                  onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                  placeholder="https://inteckno.sharepoint.com/..."
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Observaciones Técnicas
                </label>
                <textarea
                  rows={2}
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                  placeholder="Notas sobre revisiones, firma del ingeniero o cliente..."
                  className="w-full text-xs px-3 py-2 border rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-[#00668F] hover:bg-[#005273] rounded-lg"
                >
                  Guardar Entregable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle */}
      {selectedDocDetail && (
        <DetailModal
          isOpen={true}
          title={`Entregable: ${selectedDocDetail.title}`}
          subtitle={`Código: ${selectedDocDetail.code}`}
          fields={[
            { label: 'Código', value: selectedDocDetail.code, isMono: true },
            { label: 'Título', value: selectedDocDetail.title },
            { label: 'Categoría', value: selectedDocDetail.category },
            { label: 'Versión', value: selectedDocDetail.version },
            { label: 'Estado', value: selectedDocDetail.status },
            { label: 'Autor / Responsable', value: selectedDocDetail.author },
            { label: 'Fecha de Entrega', value: selectedDocDetail.deliveryDate || 'No definida' },
            { label: 'Enlace de Documento', value: selectedDocDetail.fileUrl || 'Sin archivo adjunto' },
            { label: 'Observaciones', value: selectedDocDetail.comments || 'Sin observaciones', colSpan: 2 },
          ]}
          onClose={() => setSelectedDocDetail(null)}
        />
      )}

      {/* Modal Confirmar Eliminación */}
      {docToDelete && (
        <ConfirmDeleteModal
          isOpen={true}
          title="Eliminar Entregable"
          itemName={`${docToDelete.code} - ${docToDelete.title}`}
          description="¿Estás seguro de que deseas eliminar este documento de la lista de entregables? Esta acción no se puede deshacer."
          requireConfirmWord={true}
          confirmWord="BORRAR"
          onConfirm={handleDeleteDoc}
          onCancel={() => setDocToDelete(null)}
        />
      )}
    </div>
  );
};

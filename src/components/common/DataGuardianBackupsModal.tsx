import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  X,
  RefreshCw,
  Download,
  Eye,
  Database,
  Cloud,
  HardDrive,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import {
  DataBackupSnapshot,
  getLatestBackups,
  createSystemBackup,
} from '../../core/services/backupService';
import { useErp } from '../../core/storage/erpStore';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DataGuardianBackupsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    projects,
    opportunities,
    purchaseOrders,
    requisitions,
    products,
    expenses,
    milestones,
    employees,
    notify,
  } = useErp();

  const [backups, setBackups] = useState<DataBackupSnapshot[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<DataBackupSnapshot | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const list = await getLatestBackups(20);
      setBackups(list);
    } catch (err) {
      console.warn('Error cargando respaldos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBackups();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateManualBackup = async () => {
    setCreatingBackup(true);
    try {
      const fullSnapshot = {
        projectsCount: projects.length,
        opportunitiesCount: opportunities.length,
        purchaseOrdersCount: purchaseOrders.length,
        requisitionsCount: requisitions.length,
        productsCount: products.length,
        expensesCount: expenses.length,
        milestonesCount: milestones.length,
        employeesCount: employees.length,
        summary: {
          projects: projects.map((p) => ({ id: p.id, code: p.code, name: p.name, status: p.status, budgetPV: p.budgetPV })),
          opportunities: opportunities.map((o) => ({ id: o.id, title: o.title, stage: o.stage, estimatedValueUSD: o.estimatedValueUSD })),
          purchaseOrders: purchaseOrders.map((po) => ({ id: po.id, orderNumber: po.orderNumber, status: po.status, totalCOP: po.totalAmountCOP })),
          milestones: milestones.map((m) => ({ id: m.id, title: m.title, amountCOP: m.amountCOP, isPaid: m.isPaid })),
        },
      };

      const success = await createSystemBackup(
        'manual_checkpoint',
        `Respaldo manual instantáneo del sistema por ${currentUser.name}`,
        fullSnapshot,
        currentUser.id,
        currentUser.name
      );

      if (success) {
        notify('success', 'Respaldo Completado', 'Instantánea guardada exitosamente en Firestore y almacenamiento local.');
        await fetchBackups();
      } else {
        notify('warning', 'Respaldo Local Guardado', 'Se guardó en almacenamiento local pero la conexión a Firestore no respondió.');
      }
    } catch (err) {
      console.error('Error generando respaldo:', err);
      notify('urgent', 'Error en Respaldo', 'No se pudo generar la instantánea de seguridad.');
    } finally {
      setCreatingBackup(false);
    }
  };

  const downloadJson = (snapshot: DataBackupSnapshot) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(snapshot, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${snapshot.id}_${snapshot.module}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Cabecera del Modal */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Guardián de Datos & Respaldos Continuos
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Regla 14 ITK
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Instantáneas de seguridad automáticas en Google Cloud Firestore e IndexedDB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tarjetas de Métricas de Respaldo */}
        <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Database size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Instantáneas</p>
              <p className="text-lg font-extrabold text-slate-800">{backups.length} Disponibles</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Cloud size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Persistencia</p>
              <p className="text-xs font-bold text-slate-800 truncate">Firestore & IndexedDB</p>
              <p className="text-[10px] text-emerald-600 font-medium">Replicación Activa</p>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Crear Punto de Control</p>
              <p className="text-[10px] text-slate-500">Respaldo manual inmediato</p>
            </div>
            <button
              onClick={handleCreateManualBackup}
              disabled={creatingBackup}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
            >
              <RefreshCw size={13} className={creatingBackup ? 'animate-spin' : ''} />
              <span>{creatingBackup ? 'Guardando...' : 'Respaldar'}</span>
            </button>
          </div>
        </div>

        {/* Contenido Principal: Lista de Respaldos */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Historial de Instantáneas Recientes
            </h4>
            <button
              onClick={fetchBackups}
              disabled={loading}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              <span>Actualizar</span>
            </button>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RefreshCw size={24} className="animate-spin text-emerald-600" />
              <p className="text-xs font-medium">Consultando registros del Guardián de Datos...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <HardDrive size={32} className="text-slate-300 mb-1" />
              <p className="text-sm font-bold text-slate-600">No hay respaldos previos en este navegador</p>
              <p className="text-xs text-slate-400 max-w-sm text-center mt-1">
                Haz clic en el botón "Respaldar" superior para crear el primer punto de control manual de tu información.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {backups.map((bck) => {
                const dateObj = new Date(bck.timestamp);
                const dateStr = !isNaN(dateObj.getTime())
                  ? dateObj.toLocaleString('es-CO', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : bck.timestamp;

                return (
                  <div
                    key={bck.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-sm transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {bck.id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            bck.module === 'projects'
                              ? 'bg-blue-100 text-blue-800'
                              : bck.module === 'procurement'
                              ? 'bg-amber-100 text-amber-800'
                              : bck.module === 'billing'
                              ? 'bg-emerald-100 text-emerald-800'
                              : bck.module === 'expenses'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {bck.module}
                        </span>
                        <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar size={11} />
                          {dateStr}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 truncate">{bck.description}</p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <User size={11} />
                        Autor: <span className="font-medium text-slate-600">{bck.userName || 'Sistema'}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => setSelectedSnapshot(bck)}
                        className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Eye size={13} />
                        <span>Ver</span>
                      </button>
                      <button
                        onClick={() => downloadJson(bck)}
                        className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Download size={13} />
                        <span>JSON</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Visor de Snapshot Seleccionado (Submodal) */}
        {selectedSnapshot && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <FileCode size={18} className="text-blue-400" />
                  <span className="font-mono text-xs font-bold">{selectedSnapshot.id}</span>
                  <span className="text-xs text-slate-400">• {selectedSnapshot.description}</span>
                </div>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-auto bg-slate-950 text-emerald-400 font-mono text-[11px] leading-relaxed">
                <pre>{JSON.stringify(selectedSnapshot.data, null, 2)}</pre>
              </div>
              <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-between items-center">
                <button
                  onClick={() => downloadJson(selectedSnapshot)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Download size={14} />
                  <span>Descargar Archivo JSON</span>
                </button>
                <button
                  onClick={() => setSelectedSnapshot(null)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pie de modal */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <CheckCircle2 size={13} className="text-emerald-600" />
            Garantía de no sobrescritura destructiva (Deep Merge Protection)
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

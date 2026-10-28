import React, { useState } from 'react';
import {
  Search,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { InventoryAuditLog, Product } from '../../../types';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface InventoryForensicsTabProps {
  logs: InventoryAuditLog[];
  products: Product[];
}

export const InventoryForensicsTab: React.FC<InventoryForensicsTabProps> = ({ logs, products: _products }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSource, setSelectedSource] = useState<string>('todos');
  const [anomalyFilter, setAnomalyFilter] = useState<'todos' | 'anomalias_solamente'>('todos');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.projectCode && log.projectCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      log.reason.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSource = selectedSource === 'todos' || log.source === selectedSource;
    const matchesAnomaly = anomalyFilter === 'todos' || log.flaggedAsAnomaly;

    return matchesSearch && matchesSource && matchesAnomaly;
  });

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Tabla de Movimientos y Filtros - Ancho Completo */}
      <div className="w-full bg-white rounded-2xl p-4 shadow-2xs border border-slate-200/90 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 text-xs">
            <div>
              <h4 className="font-bold text-sm text-slate-900">Historial Detallado de Movimientos</h4>
              <p className="text-slate-500 text-[11px]">Control cronológico por código, responsable y origen</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnomalyFilter(anomalyFilter === 'todos' ? 'anomalias_solamente' : 'todos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  anomalyFilter === 'anomalias_solamente'
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <AlertTriangle size={13} />
                <span>Solo Variaciones Inusuales</span>
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-2 text-xs">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por código, repuesto, usuario, proyecto o motivo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs focus:bg-white focus:outline-hidden focus:border-[#00668F]"
              />
            </div>
            <div className="w-56 shrink-0">
              <CreatableSelect
                value={
                  selectedSource === 'todos' ? 'Todos los orígenes' :
                  selectedSource === 'erp_web' ? 'ERP Web Oficial' :
                  selectedSource === 'm365_excel_online' ? 'Excel Online' :
                  selectedSource === 'qr_scanner_movil' ? 'Escáner Móvil' :
                  selectedSource
                }
                onChange={(val) => {
                  if (val === 'Todos los orígenes' || !val) setSelectedSource('todos');
                  else if (val === 'ERP Web Oficial') setSelectedSource('erp_web');
                  else if (val === 'Excel Online') setSelectedSource('m365_excel_online');
                  else if (val === 'Escáner Móvil') setSelectedSource('qr_scanner_movil');
                  else setSelectedSource(val);
                }}
                options={[
                  'Todos los orígenes',
                  'ERP Web Oficial',
                  'Excel Online',
                  'Escáner Móvil',
                ]}
                placeholder="Origen..."
                isClearable={false}
                allowCustomText={false}
                inputClassName="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold focus:outline-hidden"
              />
            </div>
          </div>

          {/* Tabla de Logs */}
          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold text-[11px] sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="p-2.5">Fecha</th>
                  <th className="p-2.5">Artículo</th>
                  <th className="p-2.5 text-center">Variación</th>
                  <th className="p-2.5 text-center">Saldos</th>
                  <th className="p-2.5">Responsable</th>
                  <th className="p-2.5">Canal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.length > 0 ? (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="font-mono text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleDateString('es-CO')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </div>
                      </td>

                      <td className="p-2.5">
                        <div className="font-bold text-slate-900">{log.productName}</div>
                        <div className="text-[10px] font-mono text-[#00668F]">{log.productSku}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[200px]" title={log.reason}>
                          {log.reason}
                        </div>
                      </td>

                      <td className="p-2.5 text-center">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            log.delta > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.delta < 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {log.delta > 0 ? (
                            <ArrowUpRight size={12} />
                          ) : log.delta < 0 ? (
                            <ArrowDownRight size={12} />
                          ) : null}
                          <span>{log.delta > 0 ? `+${log.delta}` : log.delta}</span>
                        </span>
                      </td>

                      <td className="p-2.5 text-center font-mono text-[11px]">
                        <span className="text-slate-400">{log.previousStock}</span>
                        <span className="text-slate-300 mx-1">→</span>
                        <span className="font-bold text-slate-900">{log.newStock}</span>
                      </td>

                      <td className="p-2.5 whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-[11px]">
                          {log.userName || (log.source === 'm365_excel_online' ? 'Excel Online (Sincronización)' : 'Almacén ITK')}
                        </div>
                        {log.projectCode && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded font-mono">
                            {log.projectCode}
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.source === 'm365_excel_online'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : log.source === 'qr_scanner_movil'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200'
                              : 'bg-sky-50 text-[#00668F] border border-sky-200'
                          }`}
                        >
                          {log.source === 'm365_excel_online'
                            ? 'Excel Online'
                            : log.source === 'qr_scanner_movil'
                            ? 'Escáner QR'
                            : 'ERP Web'}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No se encontraron movimientos con los filtros aplicados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
};

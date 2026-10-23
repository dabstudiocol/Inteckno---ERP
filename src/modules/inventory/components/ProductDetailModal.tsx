import React, { useState } from 'react';
import {
  X,
  Package,
  Layers,
  MapPin,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ShieldAlert,
  Calendar,
  Activity,
  QrCode,
  Pencil,
  ExternalLink,
  Flame,
  Droplets,
  Boxes,
  Wind,
  Info,
  Clock,
  Scissors,
  CheckSquare,
  Truck,
  RotateCcw,
} from 'lucide-react';
import { Product, PhysicalCableSegment, ChemicalLotFEFO, KitComponentItem, EquipmentCheckEvent } from '../../../types';
import { formatCOP, formatUSD, formatTRM, getStoredTRM } from '../../../core/services/trmService';
import { getCalibrationStatus } from '../../../utils/calibrationUtils';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onGenerateQr: (product: Product) => void;
  onRequestWriteOff?: (product: Product, tramo?: PhysicalCableSegment) => void;
}

type TabType = 'tecnica' | 'hseq' | 'trazabilidad' | 'dimensional' | 'kit';

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onEdit,
  onGenerateQr,
  onRequestWriteOff,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('tecnica');

  if (!isOpen || !product) return null;

  const currentTrm = getStoredTRM();
  const operativeStock = product.availableStock ?? ((product.stockFisico ?? product.realStock ?? 0) - (product.stockReservado ?? product.reservedStock ?? 0));
  const isLowStock = operativeStock <= (product.minStock || 0);

  // Total valorizado
  const totalValueCOP = operativeStock * (product.costPriceCOP || 0);
  const totalValueUSD = operativeStock * (product.costPriceUSD || 0);

  const isCableDimensional = Boolean(
    product.isDimensional ||
    product.category?.toLowerCase().includes('cable') ||
    product.category?.toLowerCase().includes('telef') ||
    (product.segmentosFisicos && product.segmentosFisicos.length > 0)
  );

  const isKitInspection = Boolean(
    product.isKit ||
    (product.kitItems && product.kitItems.length > 0) ||
    product.category?.toLowerCase().includes('kit')
  );

  const isChemicalOrLubricant = Boolean(
    product.isChemicalEND ||
    product.category?.toLowerCase().includes('quím') ||
    product.category?.toLowerCase().includes('quim') ||
    product.category?.toLowerCase().includes('lubric') ||
    product.physicalState === 'liquido' ||
    (product.lotesFEFO && product.lotesFEFO.length > 0)
  );

  // Icono según estado físico
  const getPhysicalStateBadge = (state?: string) => {
    if (!state) return null;
    const s = state.toLowerCase();
    if (s.includes('liq') || s.includes('líq')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Droplets size={13} /> Líquido
        </span>
      );
    }
    if (s.includes('gas') || s.includes('vapor')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <Wind size={13} /> Gas / Vapor
        </span>
      );
    }
    if (s.includes('sol') || s.includes('sól')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Boxes size={13} /> Sólido
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        <Package size={13} /> {state}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* ENCABEZADO CON COLOR SÓLIDO CORPORATIVO */}
        <div className="p-4 sm:p-5 bg-[#003650] text-white flex items-start justify-between relative shrink-0">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black px-2.5 py-0.5 rounded-md bg-white/20 text-white tracking-wider">
                {product.sku}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-sky-500/30 text-sky-100 font-semibold truncate">
                {product.category}
              </span>
              {product.isCriticalSpare && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black px-2 py-0.5 rounded-md bg-rose-500 text-white animate-pulse">
                  <Flame size={12} /> REPUESTO CRÍTICO STC
                </span>
              )}
              {product.trackingType === 'SERIALIZADO' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/30 text-indigo-100 border border-indigo-400/40">
                  ACTIVO SERIALIZADO
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold mt-2 text-white leading-tight">
              {product.name}
            </h2>
            <div className="mt-2 flex items-center gap-2 flex-wrap text-xs text-slate-300">
              {getPhysicalStateBadge(product.physicalState)}
              <span>
                Unidad: <strong className="text-white font-mono">{product.unit}</strong>
              </span>
              {product.locationName && (
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin size={12} /> {product.locationName} {product.shelf ? `(${product.shelf})` : ''}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer shrink-0"
            title="Cerrar ventana"
          >
            <X size={20} />
          </button>
        </div>

        {/* RESUMEN RÁPIDO: STOCK OPERATIVO VS FÍSICO */}
        <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Disponible Operativo</span>
              <span className="text-sm font-black text-[#00668F]">
                {operativeStock} {product.unit}
              </span>
            </div>
            <div className="border-l border-slate-300 pl-4">
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Físico en Bodega</span>
              <span className="text-sm font-bold text-gray-700">
                {product.stockFisico ?? product.realStock ?? 0} {product.unit}
              </span>
            </div>
            <div className="border-l border-slate-300 pl-4">
              <span className="text-gray-500 block text-[10px] uppercase font-bold">Reservado Proyectos</span>
              <span className="text-sm font-bold text-amber-600">
                {product.stockReservado ?? product.reservedStock ?? 0} {product.unit}
              </span>
            </div>
          </div>

          <div>
            {isLowStock ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                <AlertTriangle size={12} /> Stock Crítico
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Nivel Óptimo
              </span>
            )}
          </div>
        </div>

        {/* SELECTOR DE PESTAÑAS (TABS) */}
        <div className="flex items-center border-b border-gray-200 bg-white px-4 overflow-x-auto shrink-0 gap-1">
          <button
            onClick={() => setActiveTab('tecnica')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'tecnica'
                ? 'border-[#00668F] text-[#00668F]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText size={14} /> Ficha Técnica & Costos
          </button>
          
          <button
            onClick={() => setActiveTab('hseq')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'hseq'
                ? 'border-[#00668F] text-[#00668F]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Activity size={14} /> Seguridad (SST) & Calibración
          </button>

          <button
            onClick={() => setActiveTab('trazabilidad')}
            className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'trazabilidad'
                ? 'border-[#00668F] text-[#00668F]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Clock size={14} /> Trazabilidad & Vencimiento (FEFO)
          </button>

          {isCableDimensional && (
            <button
              onClick={() => setActiveTab('dimensional')}
              className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'dimensional'
                  ? 'border-[#00668F] text-[#00668F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Scissors size={14} /> Tramos de Cable
            </button>
          )}

          {isKitInspection && (
            <button
              onClick={() => setActiveTab('kit')}
              className={`py-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'kit'
                  ? 'border-[#00668F] text-[#00668F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CheckSquare size={14} /> Maletín de Inspección END
            </button>
          )}
        </div>

        {/* CONTENIDO SCROLLEABLE POR PESTAÑAS */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-gray-800 flex-1">
          
          {/* PESTAÑA 1: TÉCNICA Y COSTOS */}
          {activeTab === 'tecnica' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Costos Oficiales COP / USD */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                    <DollarSign size={15} className="text-emerald-600" /> Valorización Oficial (COP / USD)
                  </h3>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                    TRM: ${formatTRM(currentTrm)} COP / USD
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <span className="text-[11px] font-bold text-gray-500 block uppercase">
                      Costo Unitario
                    </span>
                    <div className="mt-1">
                      <span className="text-xl font-black text-emerald-700 block">
                        {formatCOP(product.costPriceCOP)}
                      </span>
                      <span className="text-xs font-mono font-semibold text-gray-500 block mt-0.5">
                        ≈ {formatUSD(product.costPriceUSD)} USD
                      </span>
                    </div>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                    <span className="text-[11px] font-bold text-gray-500 block uppercase">
                      Valor Total en Stock ({operativeStock} {product.unit})
                    </span>
                    <div className="mt-1">
                      <span className="text-xl font-black text-gray-900 block">
                        {formatCOP(totalValueCOP)}
                      </span>
                      <span className="text-xs font-mono font-semibold text-gray-500 block mt-0.5">
                        ≈ {formatUSD(totalValueUSD)} USD
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Especificaciones Técnicas */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-3">
                  <FileText size={15} className="text-[#00668F]" /> Parámetros Técnicos y Documentales
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-gray-400 font-medium block text-[11px]">Grupo / Familia de Repuesto:</span>
                    <span className="font-bold text-[#00668F] text-sm mt-0.5 block">
                      {product.category || 'General'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-gray-400 font-medium block text-[11px] flex items-center gap-1">
                      <Calendar size={12} /> Año de Compra / Adquisición:
                    </span>
                    <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                      {product.purchaseYear || (product.purchaseDate ? product.purchaseDate.split('-')[0] : 'No registrado')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-gray-400 font-medium block text-[11px] flex items-center gap-1">
                      <Truck size={12} className="text-emerald-600" /> Histórico de Entradas a Bodega:
                    </span>
                    <span className="font-bold font-mono text-emerald-700 text-sm mt-0.5 block">
                      {product.totalEntradas !== undefined ? `${product.totalEntradas} ${product.unit}` : 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-gray-400 font-medium block text-[11px] flex items-center gap-1">
                      <RotateCcw size={12} className="text-amber-600" /> Histórico de Salidas / Despachos:
                    </span>
                    <span className="font-bold font-mono text-amber-700 text-sm mt-0.5 block">
                      {product.totalSalidas !== undefined ? `${product.totalSalidas} ${product.unit}` : 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-gray-400 font-medium block text-[11px]">Proveedor Registrado:</span>
                    <span className="font-bold text-gray-800 text-sm mt-0.5 block">
                      {product.providerName || 'Proveedor homologado Inteckno'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-gray-400 font-medium block text-[11px]">Número de Serie / Lote Padre:</span>
                    <span className="font-mono font-bold text-gray-800 text-sm mt-0.5 block">
                      {product.serialNumber || 'N/A (Lote agregado)'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 sm:col-span-2">
                    <span className="text-gray-400 font-medium block text-[11px]">Regla de Conversión de Unidad de Medida:</span>
                    <span className="font-semibold text-gray-800 text-sm mt-0.5 block">
                      {product.uomConversion ? (
                        `1 ${product.uomConversion.unidadDeCompra} = ${product.uomConversion.factorDeConversion} ${product.uomConversion.unidadDeConsumo}`
                      ) : (
                        `Unidad estándar: ${product.unit}`
                      )}
                    </span>
                  </div>

                  {/* Enlace Ficha Técnica */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 sm:col-span-2">
                    <span className="text-gray-400 font-medium block text-[11px] flex items-center gap-1">
                      <FileText size={12} className="text-[#00668F]" /> Ficha Técnica Oficial:
                    </span>
                    {product.technicalDataSheetUrl ? (
                      <div className="mt-1 flex items-center gap-2">
                        {product.technicalDataSheetUrl.startsWith('http') ? (
                          <a
                            href={product.technicalDataSheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors"
                          >
                            Abrir Ficha Técnica <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded text-xs">
                            {product.technicalDataSheetUrl}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic block mt-0.5">
                        Sin ficha técnica adjunta
                      </span>
                    )}
                  </div>

                  {/* Enlace MSDS */}
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 sm:col-span-2">
                    <span className="text-gray-400 font-medium block text-[11px] flex items-center gap-1">
                      <ShieldAlert size={12} className="text-amber-600" /> Hoja de Datos de Seguridad de Materiales:
                    </span>
                    {product.safetyDataSheetUrl ? (
                      <div className="mt-1 flex items-center gap-2">
                        {product.safetyDataSheetUrl.startsWith('http') ? (
                          <a
                            href={product.safetyDataSheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 transition-colors"
                          >
                            Abrir Hoja de Seguridad <ExternalLink size={13} />
                          </a>
                        ) : (
                          <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-1 rounded text-xs">
                            {product.safetyDataSheetUrl}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic block mt-0.5">
                        Sin hoja de seguridad registrada
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Observaciones */}
              {product.observations && (
                <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-3.5">
                  <span className="text-[11px] font-bold text-amber-800 block uppercase">
                    Observaciones y Notas Técnicas:
                  </span>
                  <p className="text-xs text-amber-950 mt-1 whitespace-pre-wrap">
                    {product.observations}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: HSEQ & CALIBRACIÓN */}
          {activeTab === 'hseq' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-3">
                  <Activity size={15} className="text-[#00668F]" /> Estado Metrológico & Calibración de Equipos END
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-gray-400 font-medium block text-[11px]">Vigencia de Calibración:</span>
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800 text-sm">
                        {product.calibrationInfo || product.calibracionFechaVencimiento || 'No calibrable / Consumible'}
                      </span>
                      {product.calibrationInfo && (
                        (() => {
                          const cal = getCalibrationStatus(product.calibrationInfo);
                          return (
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold inline-flex items-center gap-1 ${cal.badgeClass}`}>
                              {cal.label}
                            </span>
                          );
                        })()
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-gray-400 font-medium block text-[11px]">Certificado de Laboratorio Acreditado:</span>
                    {product.calibracionCertificadoUrl ? (
                      <a
                        href={product.calibracionCertificadoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-md border border-sky-200"
                      >
                        Ver Certificado <ExternalLink size={12} />
                      </a>
                    ) : (
                      <span className="font-medium text-gray-500 block mt-1">Sin certificado digital enlazado</span>
                    )}
                  </div>
                </div>

                <div className="mt-4 p-3 bg-sky-50 border border-sky-100 rounded-lg text-xs text-sky-950 flex items-start gap-2">
                  <Info size={15} className="text-sky-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Regla de Seguridad y Salud (SST) para Equipos END (Yugos, Ultrasonido, Detectores):</strong>
                    Los equipos cuya calibración esté vencida quedan bloqueados automáticamente en el ERP y no pueden ser despachados a proyectos de teleféricos o cables hasta renovación del certificado.
                  </div>
                </div>
              </div>

              {/* Historial de Inspección y Retorno de Campo (Check-in / Check-out) */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5 mb-2">
                  <RotateCcw size={14} className="text-indigo-600" /> Registro de Retorno de Campo e Inspección Física
                </h4>
                {product.checkEvents && product.checkEvents.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {product.checkEvents.map((event) => (
                      <div key={event.id} className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs flex items-center justify-between">
                        <div>
                          <span className="font-bold text-gray-800">{event.fecha} — {event.tecnicoNombre}</span>
                          <span className="block text-[11px] text-gray-500">Proyecto: {event.codigoProyecto}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          event.estadoEquipo === 'OPERATIVO'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {event.estadoEquipo}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic p-3 bg-slate-50 rounded-lg border border-slate-100">
                    No hay eventos de retorno o daños reportados en campo para este activo.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 3: TRAZABILIDAD & FEFO */}
          {activeTab === 'trazabilidad' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Clock size={15} className="text-[#00668F]" /> Control de Lotes y Despacho (Primero en Vencer, Primero en Salir - FEFO)
                  </h3>
                  <span className="text-[11px] bg-slate-100 px-2.5 py-0.5 rounded-full font-bold text-slate-700">
                    Aplica a Tintas, Partículas, Acoplantes y Lubricantes
                  </span>
                </div>

                {product.lotesFEFO && product.lotesFEFO.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-gray-100 rounded-lg overflow-hidden">
                      <thead className="bg-slate-50 text-gray-600 font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5">Número de Lote</th>
                          <th className="p-2.5">Vencimiento</th>
                          <th className="p-2.5">Disponible</th>
                          <th className="p-2.5">Estado Sanitario</th>
                          <th className="p-2.5 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {product.lotesFEFO.map((lote) => {
                          const isExpired = new Date(lote.fechaVencimiento) <= new Date();
                          return (
                            <tr key={lote.numeroLote} className="hover:bg-slate-50/50">
                              <td className="p-2.5 font-mono font-bold text-gray-800">{lote.numeroLote}</td>
                              <td className="p-2.5 font-semibold text-gray-700">{lote.fechaVencimiento}</td>
                              <td className="p-2.5 font-bold text-gray-900">{lote.cantidadDisponible} {lote.unidad}</td>
                              <td className="p-2.5">
                                {isExpired || lote.estado === 'CUARENTENA' ? (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                                    CUARENTENA / VENCIDO
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                    VIGENTE (PRIORIDAD DE SALIDA)
                                  </span>
                                )}
                              </td>
                              <td className="p-2.5 text-right">
                                {(isExpired || lote.estado === 'CUARENTENA') && onRequestWriteOff && (
                                  <button
                                    onClick={() => onRequestWriteOff(product)}
                                    className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 px-2 py-1 rounded cursor-pointer"
                                  >
                                    Solicitar Baja
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-xs text-gray-500">
                    No hay sub-lotes FEFO individualizados cargados. El producto opera con lote general de inventario.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 4: TRAMOS DIMENSIONALES (CABLES) */}
          {activeTab === 'dimensional' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                      <Scissors size={15} className="text-[#00668F]" /> Control de Tramos Físicos de Cable (STC / Teleféricos)
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Despacho por tramo continuo exacto. Los retazos sobrantes deben darse de baja si no son reutilizables.
                    </p>
                  </div>
                </div>

                {product.segmentosFisicos && product.segmentosFisicos.length > 0 ? (
                  <div className="space-y-2">
                    {product.segmentosFisicos.map((tramo) => (
                      <div
                        key={tramo.idTramo}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-gray-800 text-sm">{tramo.idTramo}</span>
                            <span className="bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              {tramo.longitudMetros} metros
                            </span>
                            {tramo.diametroMm && (
                              <span className="text-gray-500 font-medium text-[11px]">
                                Ø {tramo.diametroMm} mm
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-gray-500 mt-1">
                            Carrete: <strong className="text-gray-700">{tramo.carreteNumero || 'S/N'}</strong> — Ubicación: {tramo.ubicacionBodega || 'Bodega Central'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            tramo.estado === 'DISPONIBLE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {tramo.estado}
                          </span>

                          {onRequestWriteOff && (
                            <button
                              onClick={() => onRequestWriteOff(product, tramo)}
                              className="text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 border border-rose-200 px-2 py-1 rounded cursor-pointer"
                              title="Dar de baja este retazo"
                            >
                              Baja de Retazo
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-xs text-gray-500">
                    No hay tramos físicos individualizados para este cable. El inventario se mide por metros lineales globales ({operativeStock} m).
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PESTAÑA 5: KITTING (KITS DE INSPECCIÓN END) */}
          {activeTab === 'kit' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5 mb-2">
                  <CheckSquare size={15} className="text-[#00668F]" /> Componentes Requeridos del Maletín de Inspección END
                </h3>
                <p className="text-[11px] text-gray-400 mb-3">
                  Al despachar este maletín, los consumibles se descuentan de las existencias globales y los equipos quedan en préstamo temporal.
                </p>

                {product.kitItems && product.kitItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border border-gray-100 rounded-lg">
                      <thead className="bg-slate-50 text-gray-600 font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5">Código de Artículo</th>
                          <th className="p-2.5">Componente / Insumo</th>
                          <th className="p-2.5">Cantidad</th>
                          <th className="p-2.5">Naturaleza</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {product.kitItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-2.5 font-mono font-bold text-gray-800">{item.productSku}</td>
                            <td className="p-2.5 font-medium text-gray-800">{item.productName}</td>
                            <td className="p-2.5 font-bold text-gray-900">{item.quantityRequired} {item.unit}</td>
                            <td className="p-2.5">
                              {item.isConsumable ? (
                                <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2 py-0.5 rounded">
                                  Consumible (Gasto Obra)
                                </span>
                              ) : (
                                <span className="bg-sky-100 text-sky-800 font-bold text-[10px] px-2 py-0.5 rounded">
                                  Activo Fijo (Retornable)
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg text-xs text-gray-500">
                    No se han registrado componentes hijos para este kit de inspección.
                  </div>
                )}
              </div>
            </div>
          )}

        </div>

        {/* PIE CON ACCIONES ADAPTADAS */}
        <div className="p-3 sm:p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                onClose();
                onGenerateQr(product);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <QrCode size={14} /> Etiqueta QR
            </button>
            <button
              onClick={() => {
                onClose();
                onEdit(product);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Pencil size={14} /> Editar Artículo
            </button>
            {onRequestWriteOff && (
              <button
                onClick={() => {
                  onClose();
                  onRequestWriteOff(product);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
              >
                <Scissors size={14} /> Solicitar Baja
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold transition-colors cursor-pointer ml-auto"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};

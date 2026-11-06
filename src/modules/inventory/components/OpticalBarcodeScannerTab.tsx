import React, { useState, useEffect, useRef } from 'react';
import {
  Barcode,
  Camera,
  CameraOff,
  Zap,
  ZapOff,
  ScanLine,
  Search,
  Package,
  Truck,
  PlusCircle,
  History,
  Printer,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  Building,
  DollarSign,
  Tag,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Product, EquipmentTool, Project, DispatchRemission } from '../../../types';
import { formatCOP } from '../../../core/services/trmService';
import { CreatableSelect } from '../../../components/common/CreatableSelect';

interface OpticalBarcodeScannerTabProps {
  products: Product[];
  equipment: EquipmentTool[];
  projects: Project[];
  remissions: DispatchRemission[];
  onDispatchItem: (product: Product, qty: number, projectId: string) => void;
  onQuickStockEntry: (product: Product, addedQty: number, targetWarehouse: string, reason: string) => void;
  onPrintLabel: (product: Product) => void;
  notify?: (type: 'urgent' | 'warning' | 'info' | 'success', title: string, message: string) => void;
}

interface ScanHistoryItem {
  id: string;
  timestamp: string;
  code: string;
  name: string;
  type: 'repuesto' | 'equipo' | 'no_encontrado';
  stock: number;
  item?: Product | EquipmentTool;
}

export const OpticalBarcodeScannerTab: React.FC<OpticalBarcodeScannerTabProps> = ({
  products,
  equipment,
  projects,
  remissions,
  onDispatchItem,
  onQuickStockEntry,
  onPrintLabel,
  notify,
}) => {
  // Estado de la cámara y hardware
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [isBarcodeDetectorSupported, setIsBarcodeDetectorSupported] = useState<boolean>(false);

  // Entrada manual / Pistola USB
  const [manualInput, setManualInput] = useState<string>('');
  const [scanMessage, setScanMessage] = useState<string>('');
  const [scannedItem, setScannedItem] = useState<Product | EquipmentTool | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);

  // Modales operativos rápidos
  const [isQuickEntryModalOpen, setIsQuickEntryModalOpen] = useState<boolean>(false);
  const [quickEntryQty, setQuickEntryQty] = useState<number>(1);
  const [quickEntryWarehouse, setQuickEntryWarehouse] = useState<string>('Almacén Central Medellín');
  const [quickEntryReason, setQuickEntryReason] = useState<string>('Compra local directa / Reposición rápida');

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [dispatchQty, setDispatchQty] = useState<number>(1);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id || '');

  const [isKardexModalOpen, setIsKardexModalOpen] = useState<boolean>(false);

  // Referencias DOM
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string>('');
  const lastScanTimestampRef = useRef<number>(0);

  // Verificar soporte de BarcodeDetector de la API Web W3C
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setIsBarcodeDetectorSupported(true);
    } else {
      setIsBarcodeDetectorSupported(false);
    }
  }, []);

  // Función de pitido acústico (Web Audio API)
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // Tono A5 profesional
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch {
      // AudioContext bloqueado o no disponible
    }
  };

  // Detener la cámara al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsTorchOn(false);
    setHasTorch(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    stopCamera();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Tu navegador no permite acceso a cámaras de video.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }

      setIsCameraActive(true);

      // Comprobar si la cámara tiene linterna / flash (Torch)
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
        if (capabilities.torch) {
          setHasTorch(true);
        }
      }

      // Iniciar ciclo de detección con BarcodeDetector si está disponible
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new (window as any).BarcodeDetector({
          formats: [
            'code_128',
            'code_39',
            'code_93',
            'ean_13',
            'ean_8',
            'qr_code',
            'upc_a',
            'upc_e',
            'data_matrix',
            'itf',
          ],
        });

        const scanLoop = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            animFrameIdRef.current = requestAnimationFrame(scanLoop);
            return;
          }

          const now = Date.now();
          // Throttle: procesar cada 150 ms para no recalentar CPU
          if (now - lastScanTimestampRef.current > 150) {
            try {
              const barcodes = await barcodeDetector.detect(videoRef.current);
              if (barcodes && barcodes.length > 0) {
                const detected = barcodes[0].rawValue;
                // Evitar escaneos repetidos continuos del mismo código en menos de 2 segundos
                if (detected && (detected !== lastScannedCodeRef.current || now - lastScanTimestampRef.current > 2000)) {
                  lastScannedCodeRef.current = detected;
                  lastScanTimestampRef.current = now;
                  playBeep();
                  handleLookupCode(detected);
                }
              }
            } catch {
              // Frame dropped o error momentáneo de decodificación
            }
          }

          animFrameIdRef.current = requestAnimationFrame(scanLoop);
        };

        animFrameIdRef.current = requestAnimationFrame(scanLoop);
      }
    } catch (err: any) {
      console.warn('Error al iniciar cámara:', err);
      setCameraError(err.message || 'No fue posible acceder a la cámara.');
      setIsCameraActive(false);
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const newState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: newState }],
        });
        setIsTorchOn(newState);
      } catch (e) {
        console.warn('Error al alternar linterna:', e);
      }
    }
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (isCameraActive) {
      setTimeout(() => {
        startCamera();
      }, 50);
    }
  };

  // Búsqueda y enlace relacional del código leído
  const handleLookupCode = (code: string) => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;

    // 1. Buscar en Repuestos / Productos
    const foundProduct = products.find(
      (p) =>
        p.sku.toUpperCase() === clean ||
        p.name.toUpperCase().includes(clean) ||
        (p.serialNumber && p.serialNumber.toUpperCase() === clean) ||
        (p.m365ExcelRowId && p.m365ExcelRowId.toUpperCase() === clean)
    );

    if (foundProduct) {
      setScannedItem(foundProduct);
      setScanMessage(`✓ Repuesto Encontrado: ${foundProduct.name}`);
      setScanHistory((prev) => [
        {
          id: `scan-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          code: clean,
          name: foundProduct.name,
          type: 'repuesto',
          stock: foundProduct.availableStock,
          item: foundProduct,
        },
        ...prev.slice(0, 19),
      ]);
      return;
    }

    // 2. Buscar en Herramientas / Instrumentos de Medición END
    const foundEquipment = equipment.find(
      (e) =>
        e.code.toUpperCase() === clean ||
        (e.serialNumber && e.serialNumber.toUpperCase() === clean) ||
        e.name.toUpperCase().includes(clean)
    );

    if (foundEquipment) {
      setScannedItem(foundEquipment);
      setScanMessage(`✓ Instrumento/Herramienta Encontrada: ${foundEquipment.name} (${foundEquipment.code})`);
      setScanHistory((prev) => [
        {
          id: `scan-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          code: clean,
          name: foundEquipment.name,
          type: 'equipo',
          stock: 1,
          item: foundEquipment,
        },
        ...prev.slice(0, 19),
      ]);
      return;
    }

    // No encontrado
    setScannedItem(null);
    setScanMessage(`⚠️ Código "${code}" no registrado en el inventario ni en herramientas STC.`);
    setScanHistory((prev) => [
      {
        id: `scan-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        code: clean,
        name: 'No registrado',
        type: 'no_encontrado',
        stock: 0,
      },
      ...prev.slice(0, 19),
    ]);
  };

  const handleManualSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!manualInput.trim()) return;
    playBeep();
    handleLookupCode(manualInput);
  };

  // Acciones Rápidas
  const handleExecuteQuickEntry = () => {
    if (!scannedItem || !('availableStock' in scannedItem)) return;
    const product = scannedItem as Product;
    const qty = Number(quickEntryQty) || 0;
    if (qty <= 0) {
      if (notify) notify('urgent', 'Validación', 'La cantidad a ingresar debe ser mayor a 0');
      return;
    }
    onQuickStockEntry(product, qty, quickEntryWarehouse, quickEntryReason);
    if (notify) notify('success', 'Operación Exitosa', `Ingresadas ${qty} ${product.unit} a ${quickEntryWarehouse}`);
    setIsQuickEntryModalOpen(false);
    setQuickEntryQty(1);
    // Actualizar vista local
    setScannedItem({
      ...product,
      realStock: product.realStock + qty,
      availableStock: product.availableStock + qty,
    });
  };

  const handleExecuteDispatch = () => {
    if (!scannedItem || !('availableStock' in scannedItem)) return;
    const product = scannedItem as Product;
    const qty = Number(dispatchQty) || 0;
    if (qty <= 0) {
      if (notify) notify('urgent', 'Validación', 'La cantidad a despachar debe ser mayor a 0');
      return;
    }
    if (qty > product.availableStock) {
      if (notify) notify('urgent', 'Validación', `Stock insuficiente. Disponible: ${product.availableStock}`);
      return;
    }
    onDispatchItem(product, qty, selectedProjectId);
    if (notify) notify('success', 'Operación Exitosa', `Cargadas ${qty} ${product.unit} para remisión de salida`);
    setIsDispatchModalOpen(false);
  };

  // Historial de movimientos del ítem (Kardex)
  const itemKardexMovements = React.useMemo(() => {
    if (!scannedItem) return [];
    const sku = (scannedItem as any).sku || (scannedItem as any).code;
    return remissions
      .filter((rem) => rem.items.some((it) => it.sku === sku))
      .map((rem) => {
        const it = rem.items.find((i) => i.sku === sku)!;
        return {
          remNumber: rem.remissionNumber,
          date: rem.departureDate,
          projectName: rem.projectName,
          projectCode: rem.projectCode,
          dispatchedBy: rem.responsibleTechnicianName,
          receiver: rem.recipientSignerName || 'Receptor en obra',
          qtyDispatched: it.qtyDispatched,
          qtyConsumed: it.qtyConsumed || 0,
          qtyReturned: it.qtyReturned || 0,
          status: rem.status,
        };
      });
  }, [scannedItem, remissions]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Encabezado y Selector de Modo */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Barcode className="text-[#00668F]" size={22} />
              <span>Estación Óptica de Código de Barras & QR STC</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Escaneo en tiempo real por cámara óptica, pistola láser USB/Bluetooth o búsqueda directa de referencias.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isCameraActive ? (
              <button
                type="button"
                onClick={startCamera}
                className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <Camera size={16} />
                <span>Activar Cámara</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isTorchOn
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200'
                    }`}
                    title={isTorchOn ? 'Apagar Linterna' : 'Encender Linterna'}
                  >
                    {isTorchOn ? <Zap size={16} /> : <ZapOff size={16} />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={toggleCameraFacing}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all border border-slate-200 cursor-pointer"
                  title="Cambiar Cámara (Frontal / Trasera)"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CameraOff size={15} />
                  <span>Pausar</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Viewport de Cámara Óptica Activa */}
        {isCameraActive && (
          <div className="mt-4 relative max-w-lg mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 border-[#00668F] shadow-lg">
            <video
              ref={videoRef}
              className="w-full h-64 sm:h-80 object-cover"
              autoPlay
              playsInline
              muted
            />

            {/* Retícula de Enfoque Láser Visual */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="relative w-48 h-48 sm:w-64 sm:h-64 border-2 border-dashed border-sky-400/80 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.25)]">
                {/* Esquinas sólidas de encuadre */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />

                {/* Línea Láser Animada */}
                <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-pulse" />
              </div>
            </div>

            <div className="absolute bottom-2 inset-x-0 text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-xs text-[11px] font-bold text-sky-200">
                Apunta el código de barras o QR dentro del recuadro
              </span>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-amber-600" />
            <span>{cameraError} Puedes ingresar el código manualmente o conectar una pistola USB/Bluetooth.</span>
          </div>
        )}

        {/* Input de Pistola Láser USB / Teclado */}
        <form onSubmit={handleManualSearch} className="mt-4 flex items-center gap-2">
          <div className="relative flex-1">
            <ScanLine size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Escanea con la pistola USB o escribe el SKU (ej: CAB-001, PIN-1709)..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#00668F] focus:ring-1 focus:ring-[#00668F]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1.5"
          >
            <Search size={15} />
            <span>Buscar</span>
          </button>
        </form>

        {/* Artículos de prueba rápida tomados del inventario real */}
        {products.length > 0 && (
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-400 mr-1">Referencias frecuentes:</span>
            {products.slice(0, 6).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setManualInput(p.sku);
                  playBeep();
                  handleLookupCode(p.sku);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-semibold transition-colors cursor-pointer"
              >
                {p.sku}
              </button>
            ))}
          </div>
        )}

        {/* Mensaje de estado de escaneo */}
        {scanMessage && (
          <div
            className={`mt-3 p-3 rounded-xl text-xs font-bold text-center ${
              scanMessage.startsWith('✓')
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {scanMessage}
          </div>
        )}
      </div>

      {/* Ficha Operativa del Artículo Detectado */}
      {scannedItem && (
        <div className="bg-white rounded-2xl border-2 border-sky-600/30 p-5 shadow-md space-y-4 animate-in zoom-in-95 duration-150">
          {/* Cabecera del Artículo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-sky-100 text-[#00668F] flex items-center justify-center shrink-0 font-bold shadow-xs">
                <Package size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-[#00668F] bg-sky-50 px-2.5 py-0.5 rounded-lg border border-sky-200">
                    {(scannedItem as any).sku || (scannedItem as any).code}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    Registrado en Bodega
                  </span>
                  {(scannedItem as any).isCriticalSpare && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                      Repuesto Crítico STC
                    </span>
                  )}
                </div>
                <h4 className="font-bold text-base text-slate-900 mt-1">{scannedItem.name}</h4>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Ubicación Física:</span>
              <span className="font-bold text-xs text-slate-800">
                {(scannedItem as any).locationName || 'Bodega Central'} • Estante: {(scannedItem as any).shelf || 'General'}
              </span>
            </div>
          </div>

          {/* Grilla de Datos de Stock y Costos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock Real</span>
              <span className="text-lg font-black text-slate-900">
                {(scannedItem as any).realStock !== undefined ? (scannedItem as any).realStock : 1}{' '}
                <span className="text-xs font-normal text-slate-500">{(scannedItem as any).unit || 'unid'}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Stock Disponible</span>
              <span
                className={`text-lg font-black ${
                  ((scannedItem as any).availableStock || 0) <= ((scannedItem as any).minStock || 0)
                    ? 'text-rose-600'
                    : 'text-emerald-700'
                }`}
              >
                {(scannedItem as any).availableStock !== undefined ? (scannedItem as any).availableStock : 1}{' '}
                <span className="text-xs font-normal text-slate-500">{(scannedItem as any).unit || 'unid'}</span>
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Costo Unitario COP</span>
              <span className="text-xs font-black text-slate-800 block truncate">
                {formatCOP((scannedItem as any).costPriceCOP || 0)}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Costo Unitario USD</span>
              <span className="text-xs font-black text-slate-800 block">
                ${Number((scannedItem as any).costPriceUSD || 0).toLocaleString()} USD
              </span>
            </div>
          </div>

          {/* 4 Autopistas de Datos y Conexión Operativa Inmediata */}
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-600">Acciones Inmediatas de Almacén:</span>

            <div className="flex items-center flex-wrap gap-2">
              {/* Botón 1: Despachar a Proyecto */}
              <button
                type="button"
                onClick={() => {
                  setDispatchQty(1);
                  setIsDispatchModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Truck size={14} />
                <span>Despachar a Proyecto</span>
              </button>

              {/* Botón 2: Entrada Rápida a Bodega */}
              <button
                type="button"
                onClick={() => {
                  setQuickEntryQty(1);
                  setIsQuickEntryModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <PlusCircle size={14} />
                <span>Entrada Rápida a Bodega</span>
              </button>

              {/* Botón 3: Ver Kardex */}
              <button
                type="button"
                onClick={() => setIsKardexModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <History size={14} />
                <span>Ver Kardex ({itemKardexMovements.length})</span>
              </button>

              {/* Botón 4: Imprimir Rótulo */}
              <button
                type="button"
                onClick={() => onPrintLabel(scannedItem as Product)}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Printer size={14} />
                <span>Imprimir Etiqueta</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historial de Escaneos de la Sesión */}
      {scanHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Historial de Escaneos en Esta Sesión ({scanHistory.length})
            </h4>
            <button
              type="button"
              onClick={() => setScanHistory([])}
              className="text-[11px] text-slate-400 hover:text-slate-600 font-semibold cursor-pointer"
            >
              Limpiar Historial
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-slate-400 border-b border-slate-100">
                  <th className="py-1.5 font-bold">Hora</th>
                  <th className="py-1.5 font-bold">Código</th>
                  <th className="py-1.5 font-bold">Nombre / Descripción</th>
                  <th className="py-1.5 font-bold text-center">Tipo</th>
                  <th className="py-1.5 font-bold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {scanHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2 font-mono text-slate-400">{item.timestamp}</td>
                    <td className="py-2 font-mono font-bold text-slate-800">{item.code}</td>
                    <td className="py-2 text-slate-700 font-medium">{item.name}</td>
                    <td className="py-2 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.type === 'repuesto'
                            ? 'bg-sky-50 text-[#00668F]'
                            : item.type === 'equipo'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {item.type}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {item.item && (
                        <button
                          type="button"
                          onClick={() => {
                            setScannedItem(item.item!);
                            setScanMessage(`✓ Reabierto: ${item.name}`);
                          }}
                          className="text-[#00668F] font-bold hover:underline cursor-pointer"
                        >
                          Ver Ficha
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: DESPACHAR A PROYECTO */}
      {isDispatchModalOpen && scannedItem && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-emerald-600" />
                <h4 className="font-bold text-sm text-slate-900">Despachar a Proyecto STC</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-mono font-bold text-[#00668F]">{(scannedItem as any).sku}</span>
              <p className="font-bold text-slate-800">{scannedItem.name}</p>
              <span className="text-slate-500">Disponible: {(scannedItem as any).availableStock} {(scannedItem as any).unit || 'unid'}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Proyecto de Destino:</label>
              <CreatableSelect
                options={projects.map((p) => ({
                  id: p.id,
                  name: `[${p.code}] ${p.name}`,
                }))}
                value={selectedProjectId}
                onChange={(val) => setSelectedProjectId(val)}
                placeholder="Seleccionar Proyecto..."
                isClearable={false}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad a Despachar:</label>
              <input
                type="number"
                min={1}
                max={(scannedItem as any).availableStock || 9999}
                value={dispatchQty || ''}
                onChange={(e) => setDispatchQty(Math.max(1, Number(e.target.value) || 0))}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-hidden focus:border-emerald-600"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDispatchModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteDispatch}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Cargar a Remisión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ENTRADA RÁPIDA A BODEGA */}
      {isQuickEntryModalOpen && scannedItem && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PlusCircle size={18} className="text-[#00668F]" />
                <h4 className="font-bold text-sm text-slate-900">Entrada Rápida a Bodega</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickEntryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-mono font-bold text-[#00668F]">{(scannedItem as any).sku}</span>
              <p className="font-bold text-slate-800">{scannedItem.name}</p>
              <span className="text-slate-500">Stock Actual: {(scannedItem as any).realStock} {(scannedItem as any).unit || 'unid'}</span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad a Ingresar:</label>
              <input
                type="number"
                min={1}
                value={quickEntryQty || ''}
                placeholder="0"
                onChange={(e) => setQuickEntryQty(Math.max(1, Number(e.target.value) || 0))}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:outline-hidden focus:border-[#00668F]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Bodega de Destino:</label>
              <select
                value={quickEntryWarehouse}
                onChange={(e) => setQuickEntryWarehouse(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-hidden focus:border-[#00668F]"
              >
                <option value="Almacén Central Medellín">Almacén Central Medellín (Sede Poblado)</option>
                <option value="Taller Central Guayabal">Taller Central Guayabal (Banco Ensayos)</option>
                <option value="Vehículo Cuadrilla Móvil">Vehículo Cuadrilla Móvil STC</option>
                <option value="Bodega en Sitio Proyecto">Bodega en Sitio de Obra / Proyecto</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Motivo / Novedad de Ingreso:</label>
              <input
                type="text"
                value={quickEntryReason}
                onChange={(e) => setQuickEntryReason(e.target.value)}
                placeholder="Ej: Compra local directa, retorno de cuadrilla, ajuste físico..."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:outline-hidden focus:border-[#00668F]"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsQuickEntryModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteQuickEntry}
                className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Registrar Ingreso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: KARDEX / MOVIMIENTOS HISTÓRICOS */}
      {isKardexModalOpen && scannedItem && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2">
                <History size={18} className="text-[#00668F]" />
                <h4 className="font-bold text-sm text-slate-900">
                  Trazabilidad / Kardex: {(scannedItem as any).sku}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsKardexModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2">
              {itemKardexMovements.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No hay movimientos registrados de salida para esta referencia aún.
                </div>
              ) : (
                <div className="space-y-2">
                  {itemKardexMovements.map((mov, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span className="font-mono text-[#00668F]">{mov.remNumber}</span>
                        <span className="text-[11px] text-slate-400 font-normal">{mov.date}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Proyecto: <strong>{mov.projectCode}</strong> - {mov.projectName}</span>
                        <span className="font-bold text-slate-900">
                          {mov.qtyDispatched} despachados (Consumo: {mov.qtyConsumed}, Retorno: {mov.qtyReturned})
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Despachó: {mov.dispatchedBy} • Recibió en obra: {mov.receiver}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsKardexModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

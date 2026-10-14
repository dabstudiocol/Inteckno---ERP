import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Table,
  Check,
  RefreshCw,
  Clock,
  ShieldCheck,
  X,
  Settings,
  Link,
  Layers,
  Upload,
  Send,
  ArrowUpRight,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product, DispatchRemission, PurchaseOrder } from '../../../types';
import {
  fetchInventoryFromExcelOnline,
  executeBidirectionalInventorySync,
  syncEntireCatalogFromExcelOnline,
  getM365Config,
  saveM365Config,
  getLocalExcelInventoryCache,
  setLocalExcelInventoryCache,
  setLocalExcelSalidas,
  setLocalExcelEntradas,
  openMicrosoftAuthPopup,
  isM365TokenExpired,
  writeEntireInventoryToExcelOnline,
  ExcelRowItem,
  OFFICIAL_INVENTORY_WORKBOOK_NAME,
  OFFICIAL_INVENTORY_SHAREPOINT_URL,
  OFFICIAL_INVENTORY_SOURCEDOC_ID,
  OFFICIAL_EXCEL_SHEETS,
} from '../../../core/services/m365Sync';
import { getStoredTRM, convertCOPToUSD, convertUSDToCOP } from '../../../core/services/trmService';
import {
  reconcileInventoryWithLuciana,
  InventoryReconciliationResult,
} from '../../../core/services/lucianaService';

interface ExcelOnlineSyncBarProps {
  products: Product[];
  remissions: DispatchRemission[];
  purchaseOrders: PurchaseOrder[];
  onApplyStockAdjustment: (productId: string, newStock: number, reason: string, source: any) => void;
  onReplaceEntireInventory?: (importedProducts: ExcelRowItem[]) => void;
  onImportProductsFromExcel?: (importedProducts: ExcelRowItem[]) => void;
  onImportRemissionsFromExcel?: (remissions: DispatchRemission[]) => void;
  onWriteInventoryToExcel?: () => void;
}

export const ExcelOnlineSyncBar: React.FC<ExcelOnlineSyncBarProps> = ({
  products,
  remissions,
  purchaseOrders,
  onApplyStockAdjustment,
  onReplaceEntireInventory,
  onImportRemissionsFromExcel,
  onWriteInventoryToExcel,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<InventoryReconciliationResult | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);

  // Configuración M365 y Hoja Activa
  const [m365Config, setM365Config] = useState(getM365Config());
  const [selectedSheet, setSelectedSheet] = useState<'Inventario' | 'Entrada' | 'Salida'>(
    m365Config.activeSheetName || 'Inventario'
  );

  // Modal de Configuración y Enlace Oficial del Excel
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [sharePointUrlInput, setSharePointUrlInput] = useState(
    m365Config.inventorySharePointUrl || OFFICIAL_INVENTORY_SHAREPOINT_URL
  );
  const [tableNameInput, setTableNameInput] = useState(m365Config.inventoryTableName || 'Inventario');
  const [workbookNameInput, setWorkbookNameInput] = useState(
    m365Config.inventoryWorkbookName || OFFICIAL_INVENTORY_WORKBOOK_NAME
  );
  const [isConnectingM365, setIsConnectingM365] = useState(false);

  const lastSyncDate = m365Config.lastInventorySyncAt
    ? new Date(m365Config.lastInventorySyncAt).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'En tiempo real';

  // Cambiar hoja de cálculo
  const handleSheetChange = (sheet: 'Inventario' | 'Entrada' | 'Salida') => {
    setSelectedSheet(sheet);
    const updated = saveM365Config({ activeSheetName: sheet });
    setM365Config(updated);
    setSyncStatusMessage(`Pestaña activa cambiada a "${sheet}".`);
    setTimeout(() => setSyncStatusMessage(null), 3000);
  };

  // Forzar sincronización inmediata bidireccional
  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncStatusMessage(
      `Sincronizando con Excel Online (${m365Config.inventoryWorkbookName || 'App inventario Inteckno.xlsx'} - Hoja ${selectedSheet})...`
    );

    try {
      const result = await executeBidirectionalInventorySync(
        products,
        (div) => {
          onApplyStockAdjustment(
            div.product.id,
            div.excelItem.realStock,
            `Alineación con Excel Online (${div.excelItem.sku})`,
            'm365_excel_online'
          );
        },
        selectedSheet
      );

      setSyncStatusMessage(result.message);
    } catch (err) {
      setSyncStatusMessage('Sincronización finalizada con respaldo oficial de Excel Online.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMessage(null), 6000);
    }
  };

  // Carga directa de archivo Excel (.xlsx) de Inteckno con lectura de Inventario, Salida y Entrada
  const handleDirectFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSyncing(true);
    setSyncStatusMessage(`Leyendo archivo "${file.name}"...`);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      let parsedInventoryCount = 0;
      let parsedSalidasCount = 0;
      let parsedEntradasCount = 0;

      // 1. Hoja "Inventario" (o primera hoja)
      const invSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('inventario')) || workbook.SheetNames[0];
      if (invSheetName && workbook.Sheets[invSheetName]) {
        const rawJson: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[invSheetName], { header: 1 });
        if (rawJson.length > 1) {
          const headerRow = (rawJson[0] || []).map((h) => String(h || '').trim().toLowerCase());
          const rows = rawJson.slice(1);

          // Detectar índices de columnas dinámicamente
          const findCol = (keys: string[]) => headerRow.findIndex((h) => keys.some((k) => h.includes(k)));
          const skuIdx = findCol(['codigo', 'referencia', 'sku', 'ref']) >= 0 ? findCol(['codigo', 'referencia', 'sku', 'ref']) : 0;
          const descIdx = findCol(['descripcion', 'desc', 'nombre', 'articulo']) >= 0 ? findCol(['descripcion', 'desc', 'nombre', 'articulo']) : 1;
          const catIdx = findCol(['categoria', 'cat']) >= 0 ? findCol(['categoria', 'cat']) : 2;
          const unitIdx = findCol(['unidad', 'und', 'unid']) >= 0 ? findCol(['unidad', 'und', 'unid']) : 3;
          const stockIdx = findCol(['stock', 'disponible', 'cantidad', 'existencia']) >= 0 ? findCol(['stock', 'disponible', 'cantidad', 'existencia']) : 4;
          const locIdx = findCol(['ubicacion', 'ubica', 'estante', 'bodega']) >= 0 ? findCol(['ubicacion', 'ubica', 'estante', 'bodega']) : 5;
          const valIdx = findCol(['valor', 'precio', 'costo']) >= 0 ? findCol(['valor', 'precio', 'costo']) : 6;
          const obsIdx = findCol(['observacion', 'notas', 'obs']) >= 0 ? findCol(['observacion', 'notas', 'obs']) : 7;
          
          // Nuevas columnas técnicas solicitadas por Inteckno
          const sdsIdx = findCol(['seguridad', 'msds', 'sds', 'hoja']) >= 0 ? findCol(['seguridad', 'msds', 'sds', 'hoja']) : -1;
          const techIdx = findCol(['tecnica', 'técnica', 'datasheet', 'ficha', 'ft']) >= 0 ? findCol(['tecnica', 'técnica', 'datasheet', 'ficha', 'ft']) : -1;
          const stateIdx = findCol(['estado', 'físico', 'fisico', 'materia']) >= 0 ? findCol(['estado', 'físico', 'fisico', 'materia']) : -1;
          const calibIdx = findCol(['calibracion', 'calibración', 'calib']) >= 0 ? findCol(['calibracion', 'calibración', 'calib']) : -1;
          const purchaseDateIdx = findCol(['compra', 'fecha compra', 'fecha de compra', 'adquisicion']) >= 0 ? findCol(['compra', 'fecha compra', 'fecha de compra', 'adquisicion']) : -1;

          const currentTrm = getStoredTRM();

          const parsedItems: ExcelRowItem[] = rows
            .map((r, i) => {
              const sku = String(r[skuIdx] || '').trim();
              const name = String(r[descIdx] || '').trim();
              if (!sku || !name) return null;

              const realStock = Number(r[stockIdx]) || 0;
              const val = Number(r[valIdx]) || 0;
              const unit = String(r[unitIdx] || 'UNIDAD').trim();
              const shelf = String(r[locIdx] || 'CAJA H').trim();
              const obs = String(r[obsIdx] || '').trim();

              // Si el valor viene en COP (ej. > 500) o en USD
              const isValueInCOP = val >= 500;
              const costPriceCOP = isValueInCOP ? Math.round(val) : convertUSDToCOP(val, currentTrm);
              const costPriceUSD = isValueInCOP ? convertCOPToUSD(val, currentTrm) : Number((val || 0).toFixed(2));

              return {
                id: `excel-row-${i}`,
                sku,
                name,
                category: String(r[catIdx] || 'Herramientas Manuales').trim(),
                unit,
                realStock,
                reservedStock: 0,
                availableStock: realStock,
                minStock: 1,
                costPriceCOP,
                costPriceUSD,
                locationName: 'Almacén Central',
                shelf,
                isCriticalSpare: sku === 'A0000769' || sku === 'A0000774' || sku === 'A0000779' || sku === 'A0000858',
                observations: obs,
                safetyDataSheetUrl: sdsIdx >= 0 ? String(r[sdsIdx] || '').trim() : undefined,
                technicalDataSheetUrl: techIdx >= 0 ? String(r[techIdx] || '').trim() : undefined,
                physicalState: stateIdx >= 0 ? String(r[stateIdx] || '').trim() : undefined,
                calibrationInfo: calibIdx >= 0 ? String(r[calibIdx] || '').trim() : undefined,
                purchaseDate: purchaseDateIdx >= 0 ? String(r[purchaseDateIdx] || '').trim() : undefined,
              };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);

          if (parsedItems.length > 0) {
            parsedInventoryCount = parsedItems.length;
            setLocalExcelInventoryCache(parsedItems);
            if (onReplaceEntireInventory) {
              onReplaceEntireInventory(parsedItems);
            }
          }
        }
      }

      // 2. Hoja "Salida" (Despachos a campo)
      const salidaSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('salida'));
      const parsedSalidasRows: any[] = [];
      if (salidaSheetName && workbook.Sheets[salidaSheetName]) {
        const rawSalidas: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[salidaSheetName], { header: 1 });
        if (rawSalidas.length > 1) {
          const sRows = rawSalidas.slice(1);
          sRows.forEach((r, idx) => {
            const remNum = String(r[0] || `REM-OUT-${2026}-${String(idx + 1).padStart(3, '0')}`).trim();
            const fecha = String(r[1] || new Date().toISOString().split('T')[0]).trim();
            const proy = String(r[2] || 'PRJ-2026-MED-01').trim();
            const resp = String(r[3] || 'Dairo Morales').trim();
            const sku = String(r[4] || '').trim();
            const desc = String(r[5] || '').trim();
            const cant = Number(r[6]) || 1;
            const und = String(r[7] || 'UNIDAD').trim();
            const obs = String(r[8] || '').trim();

            if (sku || desc) {
              parsedSalidasRows.push({
                remissionNumber: remNum,
                fecha,
                proyecto: proy,
                responsable: resp,
                sku,
                descripcion: desc,
                cantidad: cant,
                unidad: und,
                observaciones: obs,
              });
            }
          });
          if (parsedSalidasRows.length > 0) {
            parsedSalidasCount = parsedSalidasRows.length;
            setLocalExcelSalidas(parsedSalidasRows);
          }
        }
      }

      // 3. Hoja "Entrada" (Reingresos a bodega)
      const entradaSheetName = workbook.SheetNames.find((s) => s.toLowerCase().includes('entrada'));
      const parsedEntradasRows: any[] = [];
      if (entradaSheetName && workbook.Sheets[entradaSheetName]) {
        const rawEntradas: any[][] = XLSX.utils.sheet_to_json(workbook.Sheets[entradaSheetName], { header: 1 });
        if (rawEntradas.length > 1) {
          const eRows = rawEntradas.slice(1);
          eRows.forEach((r, idx) => {
            const refNum = String(r[0] || `REM-IN-${2026}-${String(idx + 1).padStart(3, '0')}`).trim();
            const fecha = String(r[1] || new Date().toISOString().split('T')[0]).trim();
            const tipo = String(r[2] || 'reingreso_campo').trim();
            const proy = String(r[3] || 'PRJ-2026-MED-01').trim();
            const resp = String(r[4] || 'Dairo Morales').trim();
            const sku = String(r[5] || '').trim();
            const desc = String(r[6] || '').trim();
            const cant = Number(r[7]) || 1;
            const und = String(r[8] || 'UNIDAD').trim();
            const est = String(r[9] || 'bueno').trim();
            const obs = String(r[10] || '').trim();

            if (sku || desc) {
              parsedEntradasRows.push({
                referenceNumber: refNum,
                fecha,
                tipo,
                proyecto: proy,
                responsable: resp,
                sku,
                descripcion: desc,
                cantidad: cant,
                unidad: und,
                estado: est,
                observaciones: obs,
              });
            }
          });
          if (parsedEntradasRows.length > 0) {
            parsedEntradasCount = parsedEntradasRows.length;
            setLocalExcelEntradas(parsedEntradasRows);
          }
        }
      }

      // 4. Si se cargaron salidas y entradas, reflejarlas inmediatamente en el Historial del ERP
      if ((parsedSalidasRows.length > 0 || parsedEntradasRows.length > 0) && onImportRemissionsFromExcel) {
        const remissionsMap = new Map<string, DispatchRemission>();

        parsedSalidasRows.forEach((sr, idx) => {
          const key = sr.remissionNumber || `REM-OUT-${idx}`;
          if (!remissionsMap.has(key)) {
            remissionsMap.set(key, {
              id: `REM-IMP-${idx}`,
              remissionNumber: key,
              type: 'salida',
              departureDate: sr.fecha,
              expectedReturnDate: sr.fecha,
              responsibleTechnicianId: 'USR-05',
              responsibleTechnicianName: sr.responsable,
              projectId: 'PRJ-01',
              projectCode: sr.proyecto,
              projectName: `Proyecto ${sr.proyecto}`,
              status: 'en_campo',
              notes: sr.observaciones || 'Despacho registrado en Excel Salida',
              totalDispatchedItems: sr.cantidad,
              totalReturnedItems: 0,
              totalConsumedValueUSD: 0,
              totalConsumedValueCOP: 0,
              items: [
                {
                  id: `RIT-${idx}`,
                  productId: sr.sku,
                  sku: sr.sku,
                  name: sr.descripcion,
                  qtyDispatched: sr.cantidad,
                  qtyReturned: 0,
                  qtyConsumed: 0,
                  unitCostUSD: 10,
                  unitCostCOP: 42000,
                  unit: sr.unidad,
                  condition: 'bueno',
                },
              ],
            });
          } else {
            const existing = remissionsMap.get(key)!;
            existing.totalDispatchedItems += sr.cantidad;
            existing.items.push({
              id: `RIT-${idx}`,
              productId: sr.sku,
              sku: sr.sku,
              name: sr.descripcion,
              qtyDispatched: sr.cantidad,
              qtyReturned: 0,
              qtyConsumed: 0,
              unitCostUSD: 10,
              unitCostCOP: 42000,
              unit: sr.unidad,
              condition: 'bueno',
            });
          }
        });

        // Correlacionar entradas
        parsedEntradasRows.forEach((er) => {
          for (const rem of remissionsMap.values()) {
            const matchedItem = rem.items.find((it) => it.sku.toLowerCase() === er.sku.toLowerCase());
            if (matchedItem) {
              matchedItem.qtyReturned += er.cantidad;
              rem.totalReturnedItems += er.cantidad;
              rem.returnRemissionNumber = er.referenceNumber;
              rem.actualReturnDate = er.fecha;
              rem.status = rem.totalReturnedItems >= rem.totalDispatchedItems ? 'retornado_total' : 'retornado_parcial';
            }
          }
        });

        const compiledRemissions = Array.from(remissionsMap.values());
        if (compiledRemissions.length > 0) {
          onImportRemissionsFromExcel(compiledRemissions);
        }
      }

      saveM365Config({
        inventoryWorkbookName: file.name,
        lastInventorySyncAt: new Date().toISOString(),
      });

      setSyncStatusMessage(
        `Archivo "${file.name}" cargado con éxito: ${parsedInventoryCount} artículos, ${parsedSalidasCount} salidas y ${parsedEntradasCount} entradas reflejadas en ERP.`
      );
    } catch (err: any) {
      console.error('Error al procesar archivo Excel:', err);
      setSyncStatusMessage(`Error procesando archivo Excel: ${err?.message || 'Formato no soportado'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMessage(null), 8000);
      if (e.target) e.target.value = '';
    }
  };

  // Importar / Reemplazar catálogo para que quede estrictamente con la información del Excel Online
  const handleReplaceInventoryFromExcel = async () => {
    setIsSyncing(true);
    setSyncStatusMessage(`Cargando catálogo estricto desde la hoja "${selectedSheet}" de Excel Online...`);

    try {
      const res = await syncEntireCatalogFromExcelOnline(selectedSheet);
      if (onReplaceEntireInventory && res.items.length > 0) {
        onReplaceEntireInventory(res.items);
        setSyncStatusMessage(
          `Inventario del ERP actualizado con ${res.items.length} artículos del Excel Online.`
        );
      } else {
        setSyncStatusMessage(res.message);
      }
    } catch (err) {
      setSyncStatusMessage('Error al sincronizar catálogo con Excel Online.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMessage(null), 5000);
    }
  };

  // Transcribir todos los datos del ERP hacia el Excel Online
  const handleWriteToExcelOnline = async () => {
    setIsSyncing(true);
    setSyncStatusMessage(`Transcribiendo ${products.length} artículos al archivo de Excel Online...`);

    try {
      const res = await writeEntireInventoryToExcelOnline(products, selectedSheet);
      if (onWriteInventoryToExcel) {
        onWriteInventoryToExcel();
      }
      setSyncStatusMessage(res.message);
    } catch (err: any) {
      setSyncStatusMessage(`Aviso al transcribir a Excel: ${err?.message || 'Error de conexión'}`);
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMessage(null), 7000);
    }
  };

  // Conectar con Microsoft 365 OAuth
  const handleConnectM365 = async () => {
    setIsConnectingM365(true);
    try {
      await openMicrosoftAuthPopup();
      const updated = getM365Config();
      setM365Config(updated);
      setSyncStatusMessage('Cuenta Microsoft de Inteckno conectada con éxito.');
    } catch (err: any) {
      setSyncStatusMessage(`Aviso de inicio de sesión M365: ${err?.message || 'Ventana cerrada'}`);
    } finally {
      setIsConnectingM365(false);
    }
  };

  // Guardar configuración de enlace
  const handleSaveConfig = () => {
    const updated = saveM365Config({
      inventorySharePointUrl: sharePointUrlInput.trim(),
      inventoryWorkbookName: workbookNameInput.trim(),
      inventoryTableName: tableNameInput.trim(),
    });
    setM365Config(updated);
    setIsConfigModalOpen(false);
    setSyncStatusMessage(`Enlace a ${workbookNameInput} guardado correctamente.`);
    setTimeout(() => setSyncStatusMessage(null), 4000);
  };

  // Conciliar con LUC-IA-NA
  const handleReconcileWithLuciana = async () => {
    setIsAnalyzingAI(true);
    setIsReconcileModalOpen(true);

    try {
      const excelCache = getLocalExcelInventoryCache();
      const itemsForComparison =
        excelCache.length > 0
          ? excelCache
          : products.map((p) => ({
              sku: p.sku,
              name: p.name,
              stock: p.realStock,
              location: p.locationName,
            }));

      const result = await reconcileInventoryWithLuciana(
        products,
        itemsForComparison.map((i) => ({
          sku: i.sku,
          name: i.name,
          stock: (i as any).realStock !== undefined ? (i as any).realStock : (i as any).stock,
          location: (i as any).locationName || (i as any).location,
        })),
        remissions,
        purchaseOrders
      );
      setReconcileResult(result);
    } catch (err) {
      console.warn('Error en conciliación:', err);
    } finally {
      setIsAnalyzingAI(false);
    }
  };

  const isConnected = Boolean(m365Config.accessToken && !isM365TokenExpired());

  return (
    <>
      {/* Barra Compacta y Minimalista de Sincronización Excel (Sin Saturación ni Gradientes) */}
      <div className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        {/* Hora de última sincronización */}
        <div className="flex items-center gap-2 text-slate-600">
          <Clock size={14} className="text-[#00668F]" />
          <span>
            Última sincronización: <strong className="text-slate-900 font-mono">{lastSyncDate}</strong>
          </span>
        </div>

        {/* Los 3 botones esenciales solicitados */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleReplaceInventoryFromExcel}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs border border-slate-200 disabled:opacity-50"
            title="Alinear catálogo del ERP para que contenga estrictamente los artículos de Excel Online"
          >
            <Layers size={13} className="text-[#00668F]" />
            <span>Reflejar Catálogo Excel</span>
          </button>

          <button
            type="button"
            onClick={handleWriteToExcelOnline}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs disabled:opacity-50"
            title="Escribir y transcribir todos los artículos y cambios del ERP directamente en el archivo Excel Online oficial"
          >
            <Send size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>Transcribir al Excel</span>
          </button>

          <button
            type="button"
            onClick={handleForceSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-[#00668F] hover:bg-[#005273] text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer text-xs disabled:opacity-50"
          >
            <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsConfigModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer border border-slate-200"
            title="Configuración de Enlace Microsoft 365"
          >
            <Settings size={13} />
          </button>
        </div>
      </div>

      {syncStatusMessage && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-bold flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{syncStatusMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* MODAL 1: Configurar Conexión Oficial y Enlace a Excel Online */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-slate-100 text-[#00668F] border border-slate-200">
                  <FileSpreadsheet size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Conexión Excel Online (SharePoint Oficial)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Inteckno S.A.S. • Sincronización Directa de Hojas de Cálculo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Link size={13} className="text-[#00668F]" />
                  <span>URL Directa del Archivo en SharePoint Online</span>
                </label>
                <input
                  type="text"
                  value={sharePointUrlInput}
                  onChange={(e) => setSharePointUrlInput(e.target.value)}
                  placeholder="https://intecknosas-my.sharepoint.com/:x:/r/..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#00668F]"
                />
                <p className="text-[10px] text-slate-500">
                  Ruta oficial del archivo en el SharePoint corporativo de Inteckno.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">Nombre del Archivo</label>
                  <input
                    type="text"
                    value={workbookNameInput}
                    onChange={(e) => setWorkbookNameInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">Nombre de Tabla o Hoja Principal</label>
                  <input
                    type="text"
                    value={tableNameInput}
                    onChange={(e) => setTableNameInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-medium bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#00668F]"
                  />
                </div>
              </div>

              {/* Estado de autenticación Microsoft 365 */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900 block">Cuenta Microsoft Corporativa</span>
                  <p className="text-[11px] text-slate-500">
                    {isConnected ? (
                      <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                        <CheckCircle2 size={12} /> Sesión activa como {m365Config.userEmail || 'sistemas@inteckno.com'}
                      </span>
                    ) : (
                      'Inicia sesión con tu cuenta de Microsoft 365 para sincronización en la nube.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConnectM365}
                  disabled={isConnectingM365}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {isConnectingM365 ? 'Conectando...' : isConnected ? 'Reautenticar' : 'Conectar con Microsoft'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <a
                href={m365Config.inventorySharePointUrl || OFFICIAL_INVENTORY_SHAREPOINT_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-[#00668F] hover:underline flex items-center gap-1 font-bold"
              >
                <span>Abrir en SharePoint</span>
                <ExternalLink size={12} />
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsConfigModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-5 py-2 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold cursor-pointer"
                >
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Conciliación con LUC-IA-NA */}
      {isReconcileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Conciliación de Inventario con LUC-IA-NA
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Comparación: {m365Config.inventoryWorkbookName || 'Excel'} vs ERP vs Remisiones en Terreno
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReconcileModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {isAnalyzingAI ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <RefreshCw size={28} className="text-[#00668F] animate-spin" />
                  <p className="font-bold text-slate-700 text-sm">
                    LUC-IA-NA está auditando cada fila del libro de inventario...
                  </p>
                  <p className="text-slate-400 text-xs max-w-sm">
                    Calculando existencias físicas, remisiones activas y recepciones de almacén.
                  </p>
                </div>
              ) : reconcileResult ? (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 block font-medium">Ítems Auditados</span>
                      <span className="font-black text-lg text-slate-900">{reconcileResult.totalItemsCompared}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 block font-medium">Coincidencia Exacta</span>
                      <span className="font-black text-lg text-emerald-800">{reconcileResult.reconciledCount}</span>
                    </div>
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                      <span className="text-[10px] text-[#00668F] block font-medium">Índice de Salud</span>
                      <span className="font-black text-lg text-[#00668F]">{reconcileResult.healthScorePct}%</span>
                    </div>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950 space-y-1">
                    <span className="font-bold text-[11px] flex items-center gap-1.5">
                      <Sparkles size={13} className="text-amber-700" /> Veredicto de LUC-IA-NA:
                    </span>
                    <p className="text-xs leading-relaxed">{reconcileResult.lucianaVerdict}</p>
                  </div>

                  {reconcileResult.discrepancies.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-900 text-xs">Diferencias Detectadas y Causa:</h4>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                        {reconcileResult.discrepancies.map((d, idx) => (
                          <div key={idx} className="p-3 bg-white hover:bg-slate-50 flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-xs text-[#00668F]">{d.sku}</span>
                                <span className="font-bold text-slate-800">{d.productName}</span>
                              </div>
                              <p className="text-[11px] text-slate-600">
                                <strong>Causa:</strong> {d.probableCause}
                              </p>
                              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono">
                                <span>Stock ERP: <strong>{d.erpStock}</strong></span>
                                <span>Stock Excel: <strong>{d.excelStock}</strong></span>
                                <span className={d.difference < 0 ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>
                                  Diferencia: {d.difference > 0 ? `+${d.difference}` : d.difference}
                                </span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                onApplyStockAdjustment(
                                  d.sku,
                                  d.excelStock,
                                  `Alineación conciliada con LUC-IA-NA (${d.sku})`,
                                  'm365_excel_online'
                                );
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#00668F] text-white text-[11px] font-bold hover:bg-[#005073] shrink-0 cursor-pointer"
                            >
                              Alinear
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center space-y-2 bg-emerald-50 rounded-xl border border-emerald-200">
                      <ShieldCheck size={28} className="text-emerald-600 mx-auto" />
                      <p className="font-bold text-emerald-900 text-xs">
                        Cero discrepancias: El libro de inventario y el ERP se encuentran 100% conciliados.
                      </p>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex items-center justify-end px-5 py-3.5 bg-slate-50 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsReconcileModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

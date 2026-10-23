import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  FileCheck2,
  Table,
  Layers,
  ArrowRight,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../../../types';
import { getStoredTRM, convertCOPToUSD, convertUSDToCOP } from '../../../core/services/trmService';

interface InventoryExcelUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportProducts: (products: Product[], isReplace: boolean, fileName: string) => Promise<void> | void;
}

interface ParsedPreviewItem {
  sku: string;
  name: string;
  unit: string;
  realStock: number;
  shelf: string;
  totalEntradas: number;
  totalSalidas: number;
  costPriceCOP: number;
  costPriceUSD: number;
  purchaseYear: string;
  category: string;
  observations: string;
  isCriticalSpare: boolean;
}

function normalizeHeader(str: any): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function cleanNumericValue(val: any): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace(/[$ \s]/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export const InventoryExcelUploadModal: React.FC<InventoryExcelUploadModalProps> = ({
  isOpen,
  onClose,
  onImportProducts,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [parsedItems, setParsedItems] = useState<ParsedPreviewItem[]>([]);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await processFile(selectedFile);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (!droppedFile) return;
    await processFile(droppedFile);
  };

  const processFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      setSheetNames(workbook.SheetNames);

      const preferredSheet =
        workbook.SheetNames.find((s) => s.toLowerCase().includes('inventario')) ||
        workbook.SheetNames[0];

      setSelectedSheet(preferredSheet);
      parseSheet(workbook, preferredSheet);
    } catch (err: any) {
      console.error('Error al leer Excel:', err);
      setErrorMessage('No se pudo procesar el archivo. Verifica que sea un archivo Excel válido (.xlsx o .xls).');
      setParsedItems([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return;

    const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (rawJson.length < 2) {
      setErrorMessage(`La hoja "${sheetName}" no contiene filas de datos.`);
      setParsedItems([]);
      return;
    }

    // 1. Detectar automáticamente la fila donde comienzan los encabezados (dentro de las primeras 10 filas)
    let headerRowIndex = 0;
    for (let r = 0; r < Math.min(rawJson.length, 10); r++) {
      const rowStrings = (rawJson[r] || []).map((c) => normalizeHeader(c));
      const hasKeyHeaders = rowStrings.some((s) =>
        s.includes('codigo') || s.includes('columna1') || s.includes('descripcion') || s.includes('stock') || s.includes('unidad')
      );
      if (hasKeyHeaders) {
        headerRowIndex = r;
        break;
      }
    }

    const headerRow = (rawJson[headerRowIndex] || []).map((h) => normalizeHeader(h));
    const rows = rawJson.slice(headerRowIndex + 1);

    const findCol = (keys: string[]): number => {
      for (let i = 0; i < headerRow.length; i++) {
        const h = headerRow[i];
        if (keys.some((k) => h === k || h.includes(k))) {
          return i;
        }
      }
      return -1;
    };

    // Estructura exacta requerida del Excel Inteckno:
    // 0: CODIGO
    // 1: Columna1(Descripcion)
    // 2: UNIDAD MEDIDA
    // 3: STOCK ACTUAL
    // 4: UBICACIÓN
    // 5: ENTRADAS
    // 6: SALIDAS
    // 7: VALOR
    // 8: AÑO COMPRA
    // 9: GRUPO
    // 10: OBSERVACIONES

    const skuIdx = findCol(['codigo', 'referencia', 'sku', 'ref']) >= 0 ? findCol(['codigo', 'referencia', 'sku', 'ref']) : 0;
    const descIdx = findCol(['columna1', 'descripcion', 'desc', 'articulo', 'nombre']) >= 0 ? findCol(['columna1', 'descripcion', 'desc', 'articulo', 'nombre']) : 1;
    const unitIdx = findCol(['unidad medida', 'unidad de medida', 'unidad', 'und', 'uom', 'medida']) >= 0 ? findCol(['unidad medida', 'unidad de medida', 'unidad', 'und', 'uom', 'medida']) : 2;
    const stockIdx = findCol(['stock actual', 'stock', 'existencias', 'existencia', 'cantidad', 'cant actual', 'cant']) >= 0 ? findCol(['stock actual', 'stock', 'existencias', 'existencia', 'cantidad', 'cant actual', 'cant']) : 3;
    const locIdx = findCol(['ubicacion', 'ubica', 'estante', 'bodega', 'pasillo', 'almacen']) >= 0 ? findCol(['ubicacion', 'ubica', 'estante', 'bodega', 'pasillo', 'almacen']) : 4;
    const inIdx = findCol(['entradas', 'entrada', 'ingresos']) >= 0 ? findCol(['entradas', 'entrada', 'ingresos']) : 5;
    const outIdx = findCol(['salidas', 'salida', 'despachos']) >= 0 ? findCol(['salidas', 'salida', 'despachos']) : 6;
    const valIdx = findCol(['valor', 'precio', 'costo', 'unitario']) >= 0 ? findCol(['valor', 'precio', 'costo', 'unitario']) : 7;
    const yearIdx = findCol(['ano compra', 'ano de compra', 'ano']) >= 0 ? findCol(['ano compra', 'ano de compra', 'ano']) : 8;
    const catIdx = findCol(['grupo', 'categoria', 'familia', 'linea']) >= 0 ? findCol(['grupo', 'categoria', 'familia', 'linea']) : 9;
    const obsIdx = findCol(['observaciones', 'observacion', 'notas', 'obs', 'comentarios']) >= 0 ? findCol(['observaciones', 'observacion', 'notas', 'obs', 'comentarios']) : 10;

    const currentTrm = getStoredTRM();

    const items: ParsedPreviewItem[] = rows
      .map((r, i) => {
        const rawSku = r[skuIdx];
        const rawName = r[descIdx];
        if (rawSku === undefined && rawName === undefined) return null;

        const sku = String(rawSku || '').trim();
        const name = String(rawName || '').trim();
        // Omitir filas enteramente vacías
        if (!sku && !name) return null;

        const unit = String(r[unitIdx] || 'UNIDAD').trim();
        const realStock = cleanNumericValue(r[stockIdx]);
        const shelf = String(r[locIdx] || 'Bodega Central').trim();
        const totalEntradas = cleanNumericValue(r[inIdx]);
        const totalSalidas = cleanNumericValue(r[outIdx]);
        const valCOP = cleanNumericValue(r[valIdx]);
        const costPriceCOP = Math.round(valCOP);
        const costPriceUSD = convertCOPToUSD(costPriceCOP, currentTrm);

        const rawYear = String(r[yearIdx] || '').trim();
        const yearMatch = rawYear.match(/\b(19\d{2}|20\d{2})\b/);
        const purchaseYear = yearMatch ? yearMatch[1] : rawYear;

        const category = String(r[catIdx] || 'Repuestos y Componentes').trim();
        const observations = String(r[obsIdx] || '').trim();

        return {
          sku: sku || `ITK-${i + 1}`,
          name: name || sku || `Artículo ${i + 1}`,
          unit,
          realStock,
          shelf,
          totalEntradas,
          totalSalidas,
          costPriceCOP,
          costPriceUSD,
          purchaseYear,
          category: category || 'Repuestos y Componentes',
          observations,
          isCriticalSpare: sku === 'A0000769' || sku === 'A0000774' || sku === 'A0000779' || sku === 'A0000858',
        };
      })
      .filter((item): item is ParsedPreviewItem => item !== null);

    setParsedItems(items);
    if (items.length === 0) {
      setErrorMessage('No se pudieron extraer artículos válidos. Revisa que las columnas del archivo correspondan al formato oficial de Inteckno S.A.S.');
    }
  };

  const handleConfirmImport = async () => {
    if (parsedItems.length === 0 || !file) return;
    setIsUploading(true);

    try {
      const finalProducts: Product[] = parsedItems.map((item, idx) => ({
        id: `PRD-${item.sku.replace(/\s+/g, '_')}-${idx}`,
        sku: item.sku,
        name: item.name,
        category: item.category || 'Repuestos y Componentes',
        unit: item.unit || 'UNIDAD',
        costPriceUSD: item.costPriceUSD || 0,
        costPriceCOP: item.costPriceCOP || 0,
        realStock: item.realStock || 0,
        reservedStock: 0,
        availableStock: item.realStock || 0,
        minStock: Math.max(1, Math.round((item.realStock || 0) * 0.1)),
        totalEntradas: item.totalEntradas || 0,
        totalSalidas: item.totalSalidas || 0,
        purchaseYear: item.purchaseYear || '',
        purchaseDate: item.purchaseYear ? `${item.purchaseYear}-01-01` : new Date().toISOString().split('T')[0],
        isCriticalSpare: item.isCriticalSpare,
        isHomologatedITK: true,
        locationName: item.shelf || 'Sin ubicación',
        shelf: item.shelf || '',
        observations: item.observations || '',
        physicalState: 'solido',
        safetyDataSheetUrl: '',
        technicalDataSheetUrl: '',
        calibrationInfo: '',
      }));

      await onImportProducts(finalProducts, isReplaceMode, file.name);
      onClose();
    } catch (err) {
      console.error('Error al importar productos:', err);
      setErrorMessage('Ocurrió un error al guardar los productos en la base de datos.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] p-3 sm:p-6 overflow-y-auto flex items-center justify-center bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#003650] text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center">
              <FileSpreadsheet size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">
                Cargar Archivo Excel de Inventario
              </h3>
              <p className="text-[11px] text-slate-300">
                Sube tu archivo .xlsx una sola vez para inicializar el catálogo en el ERP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors"
            title="Cerrar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* Zona de Arrastrar y Soltar / Selector */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 hover:border-[#00668F] bg-slate-50/60 hover:bg-sky-50/30 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1">
              <Upload size={24} />
            </div>
            <p className="font-bold text-slate-800 text-sm">
              {file ? file.name : 'Haz clic o arrastra aquí tu archivo Excel (.xlsx / .xls)'}
            </p>
            <p className="text-slate-500 text-[11px]">
              Formato compatible con el inventario de Inteckno S.A.S. (columnas de Código, Descripción, Categoría, Stock, etc.)
            </p>
          </div>

          {/* Mensajes de error */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Resumen del Archivo Procesado */}
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>
                    Se identificaron <strong className="font-mono text-emerald-950 font-black text-sm">{parsedItems.length.toLocaleString('es-CO')} artículos</strong> listos para el ERP.
                  </span>
                </div>
                <span className="text-[11px] text-emerald-700 font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200 font-bold">
                  Hoja: {selectedSheet}
                </span>
              </div>

              {/* Modo de Incorporación */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="font-bold text-slate-800 block">Modo de Importación:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    onClick={() => setIsReplaceMode(true)}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      isReplaceMode
                        ? 'border-[#00668F] bg-sky-50/50 text-[#003650]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={isReplaceMode}
                      onChange={() => setIsReplaceMode(true)}
                      className="mt-0.5 text-[#00668F]"
                    />
                    <div>
                      <p className="font-bold text-xs">Carga Limpia (Reemplazar Todo)</p>
                      <p className="text-[10px] text-slate-500">
                        Sustituye el catálogo actual por los {parsedItems.length} artículos del Excel.
                      </p>
                    </div>
                  </label>

                  <label
                    onClick={() => setIsReplaceMode(false)}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      !isReplaceMode
                        ? 'border-[#00668F] bg-sky-50/50 text-[#003650]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="importMode"
                      checked={!isReplaceMode}
                      onChange={() => setIsReplaceMode(false)}
                      className="mt-0.5 text-[#00668F]"
                    />
                    <div>
                      <p className="font-bold text-xs">Agregar y Actualizar</p>
                      <p className="text-[10px] text-slate-500">
                        Combina los nuevos artículos con los que ya existan en el ERP.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Previsualización de Primeros Artículos con las 11 columnas */}
              <div className="space-y-1.5">
                <p className="font-bold text-slate-700 flex items-center justify-between text-[11px]">
                  <span>Muestra de verificación de columnas (primeros 5 de {parsedItems.length} artículos):</span>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    ✓ 11 columnas reconocidas
                  </span>
                </p>
                <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-56 overflow-y-auto">
                  <table className="w-full text-left text-[11px] min-w-[850px] border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0 text-[10px]">
                      <tr>
                        <th className="p-2 whitespace-nowrap">Código</th>
                        <th className="p-2 whitespace-nowrap">Descripción</th>
                        <th className="p-2 whitespace-nowrap">Grupo</th>
                        <th className="p-2 text-center whitespace-nowrap">Unidad</th>
                        <th className="p-2 text-center whitespace-nowrap">Stock Actual</th>
                        <th className="p-2 whitespace-nowrap">Ubicación</th>
                        <th className="p-2 text-center whitespace-nowrap">Entradas</th>
                        <th className="p-2 text-center whitespace-nowrap">Salidas</th>
                        <th className="p-2 text-right whitespace-nowrap">Valor COP</th>
                        <th className="p-2 text-center whitespace-nowrap">Año Compra</th>
                        <th className="p-2 whitespace-nowrap">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {parsedItems.slice(0, 5).map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 text-[11px]">
                          <td className="p-2 font-mono font-bold text-slate-800 whitespace-nowrap">{it.sku}</td>
                          <td className="p-2 font-medium text-slate-900 max-w-xs truncate" title={it.name}>{it.name}</td>
                          <td className="p-2 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 text-[10px] font-semibold">
                              {it.category}
                            </span>
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 whitespace-nowrap">{it.unit}</td>
                          <td className="p-2 text-center font-bold font-mono text-emerald-700 whitespace-nowrap">{it.realStock}</td>
                          <td className="p-2 text-slate-600 whitespace-nowrap">{it.shelf}</td>
                          <td className="p-2 text-center font-mono text-slate-600 whitespace-nowrap">{it.totalEntradas}</td>
                          <td className="p-2 text-center font-mono text-slate-600 whitespace-nowrap">{it.totalSalidas}</td>
                          <td className="p-2 text-right font-mono text-slate-800 font-semibold whitespace-nowrap">
                            ${it.costPriceCOP.toLocaleString('es-CO')}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600 whitespace-nowrap">{it.purchaseYear || '-'}</td>
                          <td className="p-2 text-slate-500 max-w-xs truncate text-[10px]" title={it.observations}>
                            {it.observations || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isUploading}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-200 text-xs cursor-pointer transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={parsedItems.length === 0 || isUploading || isProcessing}
            onClick={handleConfirmImport}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all ${
              parsedItems.length > 0 && !isUploading && !isProcessing
                ? 'bg-[#003650] hover:bg-[#00283c] text-white active:scale-95'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Guardando en ERP...</span>
              </>
            ) : (
              <>
                <FileCheck2 size={16} />
                <span>Incorporar {parsedItems.length} Artículos al ERP</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

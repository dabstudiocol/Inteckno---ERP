import React, { useRef } from 'react';
import { QrCode, Printer, X, Download, ShieldCheck, Tag } from 'lucide-react';
import { Product } from '../../../types';

interface AllocationQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  projectCode?: string;
  projectName?: string;
  batchNumber?: string;
}

export const AllocationQrModal: React.FC<AllocationQrModalProps> = ({
  isOpen,
  onClose,
  product,
  projectCode = 'PRJ-2026-MED-K',
  projectName = 'Overhaul Metrocable Línea K',
  batchNumber = 'LOTE-ITK-2026-09',
}) => {
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const allocationData = JSON.stringify({
    allocationId: `ALC-${Date.now()}`,
    sku: product.sku,
    name: product.name,
    projectCode,
    batchNumber,
    centerCost: 'CC-ING-STC',
    date: new Date().toISOString().split('T')[0],
  });

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    allocationData
  )}`;

  const handlePrintZebra = () => {
    const printContent = printAreaRef.current;
    if (!printContent) return;

    const win = window.open('', '', 'width=450,height=350');
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Etiqueta Zebra 50x30mm - ${product.sku}</title>
          <style>
            @page {
              size: 50mm 30mm;
              margin: 0;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0;
              padding: 2mm;
              box-sizing: border-box;
              display: flex;
              flex-direction: row;
              align-items: center;
              justify-content: space-between;
              background: #fff;
              color: #000;
            }
            .qr-col {
              width: 24mm;
              height: 24mm;
            }
            .qr-col img {
              width: 100%;
              height: 100%;
            }
            .info-col {
              width: 22mm;
              display: flex;
              flex-direction: column;
              justify-content: center;
              font-size: 6pt;
              line-height: 1.1;
              overflow: hidden;
            }
            .sku {
              font-size: 8pt;
              font-weight: 900;
              margin-bottom: 1mm;
            }
            .project {
              font-size: 6.5pt;
              font-weight: bold;
              color: #000;
            }
            .batch {
              font-size: 5pt;
              color: #333;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="qr-col">
            <img src="${qrImageUrl}" />
          </div>
          <div class="info-col">
            <div class="sku">${product.sku}</div>
            <div style="font-weight:bold; font-size: 5.5pt; margin-bottom: 1mm;">${product.name.slice(0, 30)}</div>
            <div class="project">PROY: ${projectCode}</div>
            <div class="batch">LOTE: ${batchNumber}</div>
            <div style="font-size: 5pt; margin-top: 1mm;">INTECKNO S.A.S.</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-50 text-[#F39200]">
              <QrCode size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">QR de Asignación por Proyecto</h3>
              <p className="text-[11px] text-gray-500">Cross-Docking & Stock Comprometido 4.0</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenido Visual */}
        <div className="p-5 space-y-4 text-xs" ref={printAreaRef}>
          <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50/40 flex flex-col items-center justify-center text-center space-y-3">
            <div className="p-2.5 bg-white rounded-xl shadow-xs border border-amber-100 inline-block">
              <img
                src={qrImageUrl}
                alt={`QR Asignación ${product.sku}`}
                className="w-40 h-40 object-contain rounded"
              />
            </div>

            <div>
              <span className="font-mono font-black text-sm text-[#00668F] block">
                {product.sku}
              </span>
              <p className="font-bold text-gray-800 text-xs mt-0.5 max-w-xs">{product.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 w-full text-left bg-white p-3 rounded-xl border border-amber-100 text-[11px]">
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">Proyecto Asignado</span>
                <span className="font-bold text-[#00668F]">{projectCode}</span>
                <p className="text-[10px] text-gray-500 truncate">{projectName}</p>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block font-medium">Lote y Trazabilidad</span>
                <span className="font-bold text-gray-800">{batchNumber}</span>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={11} /> Reservado en ERP
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-slate-800">
              <Tag size={13} className="text-[#00668F]" />
              <span>Compatibilidad de Impresión</span>
            </div>
            <p>
              Diseñado para etiquetadoras térmicas industriales <strong>Zebra (50x30mm)</strong> y hojas de etiquetas estándar en PDF.
            </p>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-200/60 cursor-pointer"
          >
            Cerrar
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintZebra}
              className="px-4 py-2 rounded-xl bg-[#00668F] hover:bg-[#005073] text-white font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir Zebra (50x30mm)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, X, ShieldCheck } from 'lucide-react';

interface BiometricSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signatureData: {
    signatureUrl: string;
    signerName: string;
    signerDoc: string;
    timestamp: string;
  }) => void;
  title?: string;
  subtitle?: string;
  defaultSignerName?: string;
  defaultSignerDoc?: string;
}

export const BiometricSignatureModal: React.FC<BiometricSignatureModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title = 'Firma del Responsable de lo que sale',
  subtitle = 'Estampe de firma biométrica para autorización y custodia oficial de equipos o materiales.',
  defaultSignerName = '',
  defaultSignerDoc = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerDoc, setSignerDoc] = useState(defaultSignerDoc);

  useEffect(() => {
    if (defaultSignerName) setSignerName(defaultSignerName);
    if (defaultSignerDoc) setSignerDoc(defaultSignerDoc);
  }, [defaultSignerName, defaultSignerDoc, isOpen]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#005273';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;

    const dataUrl = canvas.toDataURL('image/png');
    onSave({
      signatureUrl: dataUrl,
      signerName: signerName.trim() || 'Técnico Responsable',
      signerDoc: signerDoc.trim() || 'C.C. Registrada',
      timestamp: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden max-h-[90vh] flex flex-col overflow-y-auto animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-50 text-[#00668F]">
              <PenTool size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{title}</h3>
              <p className="text-[11px] text-gray-500">{subtitle}</p>
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

        {/* Cuerpo */}
        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Nombre del Responsable de lo que sale</label>
              <input
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Ej. Jorge Luis Orozco Genez"
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#00668F]"
              />
            </div>
            <div>
              <label className="font-bold text-gray-700 block mb-1">Documento de Identidad (C.C.)</label>
              <input
                type="text"
                required
                value={signerDoc}
                onChange={(e) => setSignerDoc(e.target.value)}
                placeholder="Ej. C.C. 1.037.620.119"
                className="w-full p-2.5 rounded-xl border border-gray-200 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-[#00668F]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-gray-700 flex items-center gap-1.5">
                <span>Firma en Pantalla (Táctil o Mouse)</span>
                {hasDrawn && (
                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                    <ShieldCheck size={11} /> Capturada
                  </span>
                )}
              </label>
              <button
                type="button"
                onClick={clearCanvas}
                className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw size={12} />
                <span>Borrar trazo</span>
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden bg-slate-50 relative touch-none">
              <canvas
                ref={canvasRef}
                width={460}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 cursor-crosshair bg-white"
              />
              {!hasDrawn && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-gray-300 font-medium text-xs">
                  Firma aquí con el dedo o stylus...
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 italic">
              Esta firma se registrará con sello de tiempo UTC e identificación del usuario en la bitácora forense de Inteckno S.A.S.
            </p>
          </div>
        </div>

        {/* Pie */}
        <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 bg-gray-50 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-600 font-bold hover:bg-gray-200/60 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!hasDrawn || !signerName.trim()}
            onClick={handleSave}
            className={`px-5 py-2 rounded-xl text-white font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
              hasDrawn && signerName.trim()
                ? 'bg-[#00668F] hover:bg-[#005073]'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <Check size={14} />
            <span>Confirmar y Estampar Firma</span>
          </button>
        </div>
      </div>
    </div>
  );
};

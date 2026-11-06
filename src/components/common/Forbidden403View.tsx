import React from 'react';
import { ShieldAlert, ArrowLeft, Lock, FileWarning } from 'lucide-react';

interface Forbidden403ViewProps {
  moduleName?: string;
  userRole?: string;
  onGoBack?: () => void;
}

export const Forbidden403View: React.FC<Forbidden403ViewProps> = ({
  moduleName = 'Módulo Financiero / Confidencial',
  userRole = 'Operador',
  onGoBack,
}) => {
  return (
    <div
      className="min-h-[70vh] flex items-center justify-center p-4 sm:p-8 animate-in fade-in zoom-in-95 duration-200"
      style={{ fontFamily: "'SF Pro Display', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif" }}
    >
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-rose-200 p-6 sm:p-8 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-inner">
          <ShieldAlert size={36} />
        </div>

        <div className="space-y-1.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
            <Lock size={11} /> 403 • ACCESO DENEGADO
          </span>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Restricción de Seguridad
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tu perfil actual (<strong className="text-slate-700">{userRole}</strong>) no cuenta con autorización de gobierno de datos para acceder a:
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs font-bold text-rose-700">
            {moduleName}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left text-[11px] text-amber-900 space-y-1">
          <div className="flex items-center gap-1 font-bold text-amber-800">
            <FileWarning size={13} />
            <span>Auditoría Práctica Parte 6 (Segregación de Roles)</span>
          </div>
          <p className="text-amber-700 text-[10px]">
            Este intento de navegación directa ha sido registrado en el log inmutable de auditoría del ERP. Las métricas de costos, nómina y márgenes están reservadas exclusivamente a la Gerencia General (USR-07) y Gerencia Administrativa (USR-04).
          </p>
        </div>

        {onGoBack && (
          <button
            type="button"
            onClick={onGoBack}
            className="w-full py-2.5 px-4 rounded-xl bg-[#00668F] hover:bg-[#005273] text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <ArrowLeft size={14} /> Regresar a mi Módulo Principal
          </button>
        )}
      </div>
    </div>
  );
};

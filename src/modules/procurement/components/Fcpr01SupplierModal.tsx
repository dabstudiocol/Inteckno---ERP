import React from 'react';
import { X, Building2, Phone, Mail, MapPin, User, FileText, CheckCircle2, ShieldCheck, Printer, Calendar } from 'lucide-react';
import { Partner } from '../../../types';

interface Fcpr01SupplierModalProps {
  supplier: Partner | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateSupplier?: (id: string, updates: Partial<Partner>) => void;
}

export const Fcpr01SupplierModal: React.FC<Fcpr01SupplierModalProps> = ({
  supplier,
  isOpen,
  onClose,
  onUpdateSupplier,
}) => {
  if (!isOpen || !supplier) return null;

  const handlePrint = () => {
    window.print();
  };

  const isHomologated = supplier.isHomologatedLegal && supplier.isHomologatedTechnical;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Cabecera Oficial FCPR01 */}
        <div className="bg-[#003650] text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md bg-amber-400 text-slate-900">
                  ITK-FCPR01-00 • Versión 2
                </span>
                <span className="text-[10px] text-slate-300 font-mono">
                  {supplier.qualityFormatNo || 'FCPR01-23-01'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-bold text-white mt-0.5">
                Formato de Calidad: Creación e Identificación de Proveedores
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="Imprimir o Exportar PDF"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            >
              <Printer size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Contenido Imprimible de la Ficha FCPR01 */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
          {/* SECCIÓN 1: ANTECEDENTES DEL PROVEEDOR */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <span className="font-black text-[11px] uppercase tracking-wider text-slate-700">
                1. Antecedentes del Proveedor
              </span>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                isHomologated ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {isHomologated ? '✓ Homologado Calidad' : '⚠️ Pendiente Homologación'}
              </span>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Razón Social</span>
                <div className="font-bold text-sm text-slate-900 mt-0.5">{supplier.name}</div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">NIT / RUT</span>
                <div className="font-mono font-bold text-sm text-slate-900 mt-0.5">{supplier.taxId}</div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Ciudad / Ubicación</span>
                <div className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <MapPin size={13} className="text-[#00668F]" />
                  <span>{supplier.city}, {supplier.country}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Dirección Sede / Taller</span>
                <div className="font-medium text-slate-800 mt-0.5">
                  {supplier.address || 'No registrada en ficha inicial'}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Teléfono Principal</span>
                <div className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <Phone size={13} className="text-[#00668F]" />
                  <span>{supplier.phone || 'N/A'}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Correo Electrónico</span>
                <div className="font-medium text-slate-800 mt-0.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-[#00668F]" />
                  <span>{supplier.email || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CONTACTO COMERCIAL / TÉCNICO */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
              <span className="font-black text-[11px] uppercase tracking-wider text-slate-700">
                2. Contacto Comercial & Condiciones Comerciales
              </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Contacto Directo</span>
                <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-1.5">
                  <User size={13} className="text-[#00668F]" />
                  <span>{supplier.contactPerson || 'Por designar'}</span>
                </div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Cargo</span>
                <div className="font-medium text-slate-800 mt-0.5">{supplier.contactRole || 'Asesor Comercial / Ingeniero de Ventas'}</div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Condiciones de Pago</span>
                <div className="font-bold text-[#00668F] mt-0.5">{supplier.paymentTerms || '30 días'}</div>
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Área de Trabajo / Categoría</span>
                <div className="font-semibold text-slate-800 mt-0.5">{supplier.category || 'Proveedor General'}</div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: ESPECIALIDAD Y CLASIFICACIÓN DE CALIDAD */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
              <span className="font-black text-[11px] uppercase tracking-wider text-slate-700">
                3. Actividad - Especialidad & Homologación Técnica
              </span>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase">Actividad / Especialidad</span>
                <p className="mt-1 p-3 bg-slate-50 rounded-xl border border-slate-100 text-slate-800 font-medium leading-relaxed">
                  {supplier.specialtyActivity || 'Suministro de componentes mecánicos, estructurales y repuestos para teleféricos y transporte por cable.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Homologación Legal (Administración)</span>
                  <div className="font-black text-xs text-emerald-900 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 size={13} className="text-emerald-600" />
                    <span>{supplier.isHomologatedLegal ? 'Aprobada (Clemencia García)' : 'Pendiente RUT / Certificación Bancaria'}</span>
                  </div>
                </div>

                <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl">
                  <span className="text-[10px] font-bold text-[#00668F] uppercase block">Homologación Técnica (Ingeniería)</span>
                  <div className="font-black text-xs text-slate-900 mt-0.5 flex items-center gap-1">
                    <ShieldCheck size={13} className="text-[#00668F]" />
                    <span>{supplier.isHomologatedTechnical ? 'Aprobada (Wilson Alzate)' : 'Pendiente Fichas Técnicas / Mill Test'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie del Modal */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 font-medium">
            Inteckno S.A.S. • Sistema de Gestión de Calidad ISO 9001
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#003650] hover:bg-[#00283c] text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
};

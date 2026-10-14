import React, { useState } from 'react';
import {
  Palette,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  Package,
  Layers,
  Sliders,
} from 'lucide-react';
import { PastelMetricCard } from '../../components/ui/PastelMetricCard';
import { DarkActionCard } from '../../components/ui/DarkActionCard';

export const DesignSystemModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tokens' | 'components'>('tokens');

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Sistema de Diseño Inteckno (Apple Style)</h2>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Fuente de verdad visual: Tokens, pasteles corporativos, marco tipo dispositivo y componentes atómicos.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-full self-start overflow-x-auto max-w-full min-w-0">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              activeTab === 'tokens' ? 'bg-white text-[#00668F] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Tokens de Marca
          </button>
          <button
            onClick={() => setActiveTab('components')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold shrink-0 transition-all ${
              activeTab === 'components' ? 'bg-white text-[#00668F] shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Componentes & Estados
          </button>
        </div>
      </div>

      {activeTab === 'tokens' ? (
        /* TOKENS VISUALES */
        <div className="space-y-6">
          {/* Paleta Principal de Marca */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              1. Colores Oficiales Inteckno (Extraídos del Logo)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#00668F] text-white space-y-2">
                <div className="text-xs font-bold opacity-80">Azul Petróleo (Primario)</div>
                <div className="text-lg font-mono font-bold">#00668F</div>
                <div className="text-[11px] opacity-70">Acciones clave, cabeceras, botones primarios.</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#F39200] text-white space-y-2">
                <div className="text-xs font-bold opacity-80">Naranja / Ámbar (Acento)</div>
                <div className="text-lg font-mono font-bold">#F39200</div>
                <div className="text-[11px] opacity-70">Uso con moderación: avisos, acentos, alertas.</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#0B1317] text-white space-y-2">
                <div className="text-xs font-bold opacity-80">Barra Lateral (Casi Negro)</div>
                <div className="text-lg font-mono font-bold">#0B1317</div>
                <div className="text-[11px] opacity-70">Sidebar del dispositivo y tarjeta oscura CTA.</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#EEF2F6] text-gray-800 border border-gray-200 space-y-2">
                <div className="text-xs font-bold text-gray-500">Superficie Base (Gris Hielo)</div>
                <div className="text-lg font-mono font-bold">#EEF2F6</div>
                <div className="text-[11px] text-gray-400">Fondo relajante y descansado para la vista.</div>
              </div>
            </div>
          </div>

          {/* Pasteles Corporativos de Métricas (Inspirado en la imagen de referencia) */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              2. Pasteles Corporativos de Métricas (Dashboard Style)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-[#EBF5FA] border border-[#D4E8F5] text-[#085579] space-y-1">
                <span className="text-xs font-bold">Pastel Azul Petróleo</span>
                <div className="text-xs font-mono">bg: #EBF5FA • border: #D4E8F5</div>
                <p className="text-[11px] text-gray-500">Métricas de proyectos activos y SPI.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#F2EEFD] border border-[#DFD6FA] text-[#4E3596] space-y-1">
                <span className="text-xs font-bold">Pastel Lavanda Suave</span>
                <div className="text-xs font-mono">bg: #F2EEFD • border: #DFD6FA</div>
                <p className="text-[11px] text-gray-500">Métricas de costos y valor ganado (EV).</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#EBF7EE] border border-[#CFEED5] text-[#186635] space-y-1">
                <span className="text-xs font-bold">Pastel Menta Verde</span>
                <div className="text-xs font-mono">bg: #EBF7EE • border: #CFEED5</div>
                <p className="text-[11px] text-gray-500">Tiempos de cuadrilla y registros aprobados.</p>
              </div>
              <div className="p-4 rounded-2xl bg-[#FFF7EB] border border-[#FEE5BF] text-[#8A4C00] space-y-1">
                <span className="text-xs font-bold">Pastel Ámbar Dorado</span>
                <div className="text-xs font-mono">bg: #FFF7EB • border: #FEE5BF</div>
                <p className="text-[11px] text-gray-500">Cuenta regresiva de 48 horas y alertas.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* COMPONENTES DE INTERFAZ */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-xs space-y-6">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Componentes Atómicos Estilo Apple
            </h3>

            {/* Botones */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-600 block">1. Botones Tipo Píldora</span>
              <div className="flex flex-wrap items-center gap-3">
                <button className="px-5 py-2.5 rounded-full bg-[#00668F] hover:bg-[#005073] text-white text-xs font-bold shadow-md">
                  Primario Inteckno
                </button>
                <button className="px-5 py-2.5 rounded-full bg-[#F39200] hover:bg-[#D98200] text-white text-xs font-bold shadow-md">
                  Acento de Acción
                </button>
                <button className="px-5 py-2.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold">
                  Secundario Suave
                </button>
                <button className="px-5 py-2.5 rounded-full bg-slate-200/80 hover:bg-slate-300 text-gray-800 text-xs font-bold">
                  Terciario Neutro
                </button>
              </div>
            </div>

            {/* Chips de Estado */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-gray-600 block">2. Chips y Badges Semánticos</span>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100/70 text-emerald-800">
                  <CheckCircle2 size={13} /> Aprobado / Vigente
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100/70 text-amber-800">
                  <Clock size={13} /> Cuenta Regresiva 48h
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100/70 text-rose-800">
                  <AlertTriangle size={13} /> Bloqueado Preventivo
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100/70 text-purple-800">
                  <Sparkles size={13} /> Auto-PO Conectada
                </span>
              </div>
            </div>

            {/* Muestra de Tarjetas de Métricas */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-600 block">3. Tarjetas Pastel de Métricas con Micrográfica</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <PastelMetricCard
                  color="blue"
                  label="Ejemplo Métrica"
                  value="$ 48 900 USD"
                  subtitle="Valor Ganado del Proyecto"
                  icon={<TrendingUp size={16} className="text-[#00668F]" />}
                  badgeText="+6% SPI"
                />
                <PastelMetricCard
                  color="amber"
                  label="Ejemplo Plazo"
                  value="30 Horas"
                  subtitle="Regla de Facturación 48h"
                  icon={<Clock size={16} className="text-[#F39200]" />}
                  badgeText="Urgente"
                  badgePositive={false}
                />
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

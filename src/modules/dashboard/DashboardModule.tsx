import React, { useState } from 'react';
import {
  FolderKanban,
  Clock,
  ShoppingCart,
  Package,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  FileText,
  ShieldAlert,
  ArrowUpRight,
  ShieldCheck,
  Receipt,
  Sparkles,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { PastelMetricCard } from '../../components/ui/PastelMetricCard';
import { DarkActionCard } from '../../components/ui/DarkActionCard';
import { LightTable } from '../../components/ui/LightTable';
import { BusinessRulesEngine } from '../../core/rules/businessRules';

export const DashboardModule: React.FC = () => {
  const {
    currentUser,
    projects,
    purchaseOrders,
    timesheets,
    milestones,
    requisitions,
    equipment,
    setActiveModule,
    approveTimesheet,
    approvePurchaseOrderGM,
    signMilestoneAct,
  } = useErp();

  // Métricas calculadas en tiempo real
  const activeProjects = projects.filter((p) => p.status === 'active');
  const pendingTimesheets = timesheets.filter((t) => t.status === 'submitted');
  const pendingGmPOs = purchaseOrders.filter((p) => p.status === 'pending_gm_approval');
  const countdownMilestones = milestones.filter(
    (m) => m.acceptanceActSigned && !m.invoiceIssued && m.invoiceDeadlineTimestamp
  );

  // Salud general de la cartera de proyectos
  const avgSpi = (
    projects.reduce((acc, p) => acc + p.spi, 0) / (projects.length || 1)
  ).toFixed(2);
  const avgCpi = (
    projects.reduce((acc, p) => acc + p.cpi, 0) / (projects.length || 1)
  ).toFixed(2);

  // Acción principal destacada para la Tarjeta Oscura (CTA) según el rol
  const getContextualCTA = () => {
    switch (currentUser.role) {
      case 'tecnico_stc':
        return {
          title: 'Registrar Jornada de Campo',
          subtitle: `Estás asignado a "${activeProjects[0]?.name || 'Servicio STC'}". Reporta tus horas en 3 toques.`,
          buttonText: 'Registrar Horas Ahora',
          action: () => setActiveModule('timesheet'),
          tag: 'Mi Tarea Principal',
        };
      case 'gerente_general':
        return {
          title: pendingGmPOs.length > 0
            ? `${pendingGmPOs.length} Compra(s) sobre Umbral USD $2.000`
            : 'Revisión Estratégica STC',
          subtitle: pendingGmPOs.length > 0
            ? `La orden ${pendingGmPOs[0].orderNumber} (${pendingGmPOs[0].supplierName}) por USD $${pendingGmPOs[0].totalAmountUSD.toLocaleString()} requiere tu Visto Bueno.`
            : 'Todos los proyectos operan dentro de los márgenes previstos (SPI promedio 1.06).',
          buttonText: pendingGmPOs.length > 0 ? 'Revisar y Autorizar Compra' : 'Ver Panel de Proyectos',
          action: () => setActiveModule(pendingGmPOs.length > 0 ? 'procurement' : 'projects'),
          tag: 'Dirección General',
        };
      case 'gerente_administrativa':
        return {
          title: countdownMilestones.length > 0
            ? 'Facturación Oportuna: Cuenta 48h Activa'
            : 'Flujo de Caja y Cartera',
          subtitle: countdownMilestones.length > 0
            ? `El Hito "${countdownMilestones[0].title}" tiene el acta firmada por el cliente. Emite la factura antes del límite.`
            : 'No hay actas vencidas pendientes de facturación en el sistema.',
          buttonText: countdownMilestones.length > 0 ? 'Ver Cuenta Regresiva' : 'Revisar Hitos',
          action: () => setActiveModule('billing'),
          tag: 'Procedimiento 2.4',
        };
      case 'hseq':
        return {
          title: 'Control de Liberaciones HSEQ',
          subtitle: 'Verifica vigencia de ARL, EPS y cursos de alturas antes de que los técnicos suban a pilonas.',
          buttonText: 'Verificar Cuadrilla',
          action: () => setActiveModule('hseq-gate'),
          tag: 'Política Cero Tolerancia',
        };
      default:
        return {
          title: pendingTimesheets.length > 0
            ? `${pendingTimesheets.length} Reportes de Horas por Validar`
            : 'Reporte Diario de Avances (DDR)',
          subtitle: pendingTimesheets.length > 0
            ? 'Valida las horas reportadas por la cuadrilla de campo para acreditar el avance físico (EV).'
            : 'Revisa el avance de los proyectos y las curvas de valor ganado.',
          buttonText: pendingTimesheets.length > 0 ? 'Aprobar Horas de Cuadrilla' : 'Ver Proyectos',
          action: () => setActiveModule(pendingTimesheets.length > 0 ? 'timesheet' : 'projects'),
          tag: 'Jefatura de Proyectos',
        };
    }
  };

  const cta = getContextualCTA();

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-in fade-in duration-200">
      
      {/* Saludo Personalizado y Resumen de Estado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#1D1D1F] tracking-tight">
            Hola, {currentUser.name.split(' ')[0]} 👋
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {currentUser.roleLabel} • Aquí está tu panorama y prioridades para hoy.
          </p>
        </div>

        {/* Chip de Única Fuente de Verdad */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold self-start sm:self-auto">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Única Fuente de Verdad Conectada</span>
        </div>
      </div>

      {/* FILA 1: Tarjetas con Colores Pastel Suaves (Rejilla 2x2 en móvil, 4 columnas en desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Tarjeta 1: Proyectos Activos (Pastel Azul) */}
        <PastelMetricCard
          color="blue"
          label="Proyectos Activos"
          value={activeProjects.length}
          subtitle="STC en Medellín, Bogotá, Manizales y Bolivia"
          icon={<FolderKanban size={17} className="text-[#00668F]" />}
          badgeText={`SPI ${avgSpi}`}
          trendData={[40, 50, 48, 55, 62, 60, 68, 72, 75]}
          onClick={() => setActiveModule('projects')}
        />

        {/* Tarjeta 2: Eficiencia de Costo (Pastel Lavanda) */}
        <PastelMetricCard
          color="purple"
          label="Eficiencia de Costos"
          value={`CPI ${avgCpi}`}
          subtitle="Generando $1.09 de valor por $1 gastado"
          icon={<TrendingUp size={17} className="text-purple-600" />}
          badgeText="+9% Ahorro"
          trendData={[30, 35, 45, 40, 50, 60, 65, 70, 78]}
          onClick={() => setActiveModule('projects')}
        />

        {/* Tarjeta 3: Horas & Avances (Pastel Menta) */}
        <PastelMetricCard
          color="green"
          label="Horas por Validar"
          value={`${pendingTimesheets.length} Pend.`}
          subtitle="Reportes de técnicos de campo listos"
          icon={<Clock size={17} className="text-emerald-600" />}
          badgeText="Al Día"
          trendData={[20, 25, 22, 28, 35, 30, 40, 42, 45]}
          onClick={() => setActiveModule('timesheet')}
        />

        {/* Tarjeta 4: Facturación 48h (Pastel Ámbar / Crema) */}
        <PastelMetricCard
          color="amber"
          label="Regla 48h Facturación"
          value={countdownMilestones.length > 0 ? '1 Activa' : '0 Vencidas'}
          subtitle={
            countdownMilestones.length > 0
              ? 'Quedan 30h para facturar Hito 2'
              : 'Cumplimiento normativo 100%'
          }
          icon={<FileText size={17} className="text-[#F39200]" />}
          badgeText={countdownMilestones.length > 0 ? '30h Restantes' : 'Excelente'}
          badgePositive={countdownMilestones.length === 0}
          trendData={[50, 55, 60, 65, 70, 75, 80, 85, 90]}
          onClick={() => setActiveModule('billing')}
        />
      </div>

      {/* FILA 2: Proyectos en Curso (Tabla Ligera) + Tarjeta Oscura de Acento CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 items-start">
        
        {/* Columna Izquierda (2/3): Proyectos Clave STC con Semáforos */}
        <div className="lg:col-span-2 bg-white rounded-xl p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Cartera de Proyectos STC (Avance y Salud)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Seguimiento por Valor Ganado (EV), SPI, CPI y Margen Real.
              </p>
            </div>
            <button
              onClick={() => setActiveModule('projects')}
              className="text-xs font-semibold text-[#00668F] hover:underline flex items-center gap-1"
            >
              <span>Ver todos</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {/* Tabla Ligera Sin Bordes Pesados */}
          <LightTable
            data={projects.slice(0, 4)}
            keyExtractor={(p) => p.id}
            onRowClick={() => setActiveModule('projects')}
            columns={[
              {
                key: 'name',
                header: 'Proyecto / Cliente',
                render: (p) => (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#0B1317] text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                      {p.code.split('-')[2] || 'STC'}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-xs line-clamp-1">{p.name}</div>
                      <div className="text-[11px] text-gray-400">{p.clientName}</div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'serviceType',
                header: 'Línea de Servicio',
                render: (p) => (
                  <span className="text-xs text-gray-600 font-medium">{p.lineOfBusiness}</span>
                ),
              },
              {
                key: 'spi',
                header: 'SPI (Tiempo)',
                align: 'center',
                render: (p) => (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      p.spi >= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {p.spi} {p.spi >= 1 ? '↑' : '↓'}
                  </span>
                ),
              },
              {
                key: 'cpi',
                header: 'CPI (Costo)',
                align: 'center',
                render: (p) => (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      p.cpi >= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {p.cpi}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Estado',
                align: 'right',
                render: (p) => (
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      p.status === 'active'
                        ? 'bg-blue-50 text-[#00668F]'
                        : p.status === 'in_closing'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {p.status === 'active' ? 'En Ejecución' : p.status === 'in_closing' ? 'Cierre Técnico' : p.status}
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Columna Derecha (1/3): Tarjeta Oscura de Acento CTA (Inspirado en la imagen de referencia) */}
        <div className="space-y-3 sm:space-y-4">
          <DarkActionCard
            tag={cta.tag}
            title={cta.title}
            subtitle={cta.subtitle}
            buttonText={cta.buttonText}
            onButtonClick={cta.action}
          />

          {/* Tarjeta de Alertas y Notificaciones Rápidas */}
          <div className="bg-white rounded-xl p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Compuertas de Calidad Activas
              </span>
              <ShieldCheck size={16} className="text-[#00668F]" />
            </div>

            <div className="space-y-1.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Compuerta HSEQ Personal</span>
                <span className="font-bold text-emerald-600">10 / 11 Vigentes</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Calibración Equipos END</span>
                <span className="font-bold text-emerald-600">3 / 4 Calibrados</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Proveedores Homologados</span>
                <span className="font-bold text-emerald-600">4 / 5 Aprobados</span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

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
import { getStoredTRM } from '../../core/services/trmService';
import { calculateProjectFinancials } from '../../core/services/projectFinancialEngine';
import { DataGuardianBackupsModal } from '../../components/common/DataGuardianBackupsModal';

export const DashboardModule: React.FC = () => {
  const [isBackupsModalOpen, setIsBackupsModalOpen] = useState(false);
  const {
    currentUser,
    projects,
    purchaseOrders,
    timesheets,
    milestones,
    requisitions,
    equipment,
    employees,
    partners,
    users,
    setActiveModule,
    approveTimesheet,
    approvePurchaseOrderGM,
    signMilestoneAct,
    navigateWithContext,
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

  const numericCpi = parseFloat(avgCpi);
  const cpiSavings = !isNaN(numericCpi) && numericCpi > 1
    ? `+${Math.round((numericCpi - 1) * 100)}% Ahorro`
    : numericCpi < 1
    ? `-${Math.round((1 - numericCpi) * 100)}% Desviación`
    : 'Presupuestado';

  const firstCountdown = countdownMilestones[0];
  const firstCountdownRemaining = firstCountdown
    ? BusinessRulesEngine.calculateInvoiceCountdown(
        firstCountdown.acceptanceActSigned,
        firstCountdown.invoiceDeadlineTimestamp ? firstCountdown.invoiceDeadlineTimestamp - 48 * 3600 * 1000 : undefined
      )
    : null;

  // Compuertas de Calidad con datos reales
  const totalStaffCount = (employees && employees.length > 0) ? employees.length : 0;
  const validStaffCount = (employees && employees.length > 0)
    ? employees.filter((e) => e.heightCertStatus !== 'vencido' && e.medicalExamStatus !== 'vencido').length
    : 0;

  const totalEquipCount = equipment.length;
  const validEquipCount = equipment.filter(
    (e) => e.isCalibrated && (!e.calibrationExpiry || new Date(e.calibrationExpiry).getTime() > Date.now())
  ).length;

  const totalPartnersCount = partners.length;
  const approvedPartnersCount = partners.filter((p) => p.type === 'supplier' || p.type === 'both').length;

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
            : `Todos los proyectos operan dentro de los márgenes previstos (SPI promedio ${avgSpi}).`,
          buttonText: pendingGmPOs.length > 0 ? 'Revisar y Autorizar Compra' : 'Ver Panel de Proyectos',
          action: () => setActiveModule(pendingGmPOs.length > 0 ? 'procurement' : 'projects'),
          tag: 'Dirección General',
        };
      case 'gerente_administrativa':
        return {
          title: countdownMilestones.length > 0
            ? 'Facturación Oportuna: Cuenta 48h Activa'
            : 'Flujo de Caja y Cartera',
          subtitle: firstCountdown
            ? `El Hito "${firstCountdown.title}" tiene el acta firmada por el cliente. Quedan ${firstCountdownRemaining?.hoursRemaining || 0}h para facturar.`
            : 'No hay actas pendientes de facturación en el sistema.',
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
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Única Fuente de Verdad Conectada</span>
          </div>

          <button
            onClick={() => setIsBackupsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Ver instantáneas de respaldo y puntos de control (Regla 14)"
          >
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Guardián de Datos</span>
          </button>
        </div>
      </div>

      {/* FILA 1: Tarjetas con Colores Pastel Suaves (Rejilla 2x2 en móvil, 4 columnas en desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        {/* Tarjeta 1: Proyectos Activos (Pastel Azul) */}
        <PastelMetricCard
          color="blue"
          label="Proyectos Activos"
          value={activeProjects.length}
          subtitle={activeProjects.length > 0 ? `${activeProjects.length} proyecto(s) en ejecución activa` : 'Sin proyectos activos en ejecución'}
          icon={<FolderKanban size={17} className="text-[#00668F]" />}
          badgeText={`SPI ${avgSpi}`}
          trendData={projects.length > 0 ? [] : [0, 0, 0]}
          onClick={() => setActiveModule('projects')}
        />

        {/* Tarjeta 2: Eficiencia de Costo (Pastel Lavanda) */}
        <PastelMetricCard
          color="purple"
          label="Eficiencia de Costos"
          value={`CPI ${avgCpi}`}
          subtitle={projects.length > 0 ? `Generando $${avgCpi} de valor por $1 gastado` : 'Sin registros de costos'}
          icon={<TrendingUp size={17} className="text-purple-600" />}
          badgeText={projects.length > 0 ? cpiSavings : 'N/D'}
          trendData={projects.length > 0 ? [] : [0, 0, 0]}
          onClick={() => setActiveModule('projects')}
        />

        {/* Tarjeta 3: Horas & Avances (Pastel Menta) */}
        <PastelMetricCard
          color="green"
          label="Horas por Validar"
          value={`${pendingTimesheets.length} Pend.`}
          subtitle={pendingTimesheets.length > 0 ? `${pendingTimesheets.length} reporte(s) de campo por aprobar` : 'Todas las horas al día'}
          icon={<Clock size={17} className="text-emerald-600" />}
          badgeText={pendingTimesheets.length > 0 ? 'Pendiente' : 'Al Día'}
          trendData={timesheets.length > 0 ? [] : [0, 0, 0]}
          onClick={() => setActiveModule('timesheet')}
        />

        {/* Tarjeta 4: Facturación 48h (Pastel Ámbar / Crema) */}
        <PastelMetricCard
          color="amber"
          label="Regla 48h Facturación"
          value={countdownMilestones.length > 0 ? `${countdownMilestones.length} Activa(s)` : '0 Pendientes'}
          subtitle={
            firstCountdown
              ? `Quedan ${firstCountdownRemaining?.hoursRemaining || 0}h para facturar ${firstCountdown.title}`
              : 'Cumplimiento normativo 100%'
          }
          icon={<FileText size={17} className="text-[#F39200]" />}
          badgeText={firstCountdown ? `${firstCountdownRemaining?.hoursRemaining || 0}h Restantes` : 'Al Día'}
          badgePositive={countdownMilestones.length === 0}
          trendData={milestones.length > 0 ? [] : [0, 0, 0]}
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
            onRowClick={(p) => navigateWithContext('proyectos', 'view_project', { projectId: p.id, tab: 'dashboard' })}
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
                render: (p) => {
                  const fin = calculateProjectFinancials(p, (p as any).wbsTasks || []);
                  return (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        fin.spi >= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {fin.spi} {fin.spi >= 1 ? '↑' : '↓'}
                    </span>
                  );
                },
              },
              {
                key: 'cpi',
                header: 'CPI (Costo)',
                align: 'center',
                render: (p) => {
                  const fin = calculateProjectFinancials(p, (p as any).wbsTasks || []);
                  if (fin.actualCostAC === 0) {
                    return (
                      <span className="text-[11px] text-gray-400 font-medium" title="Sin costos reales ejecutados">
                        N/D
                      </span>
                    );
                  }
                  return (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        fin.cpi >= 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {fin.cpi}
                    </span>
                  );
                },
              },
              {
                key: 'realMargin',
                header: 'Margen Real',
                align: 'center',
                render: (p) => {
                  const fin = calculateProjectFinancials(p, (p as any).wbsTasks || []);
                  if (fin.projectedMarginPct === null || fin.contractValue <= 0 || fin.actualCostAC === 0) {
                    return (
                      <span className="text-[11px] text-gray-400 font-medium" title="Sin costos reales ejecutados">
                        N/D
                      </span>
                    );
                  }

                  const marginPct = Math.round(fin.projectedMarginPct);

                  return (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        marginPct >= 20 ? 'bg-emerald-50 text-emerald-700' : marginPct >= 10 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                      }`}
                    >
                      {marginPct}%
                    </span>
                  );
                },
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
                <span className="text-slate-600 font-medium">Compuerta de Seguridad y Salud (SST) Personal</span>
                <span className={`font-bold ${totalStaffCount === 0 ? 'text-slate-400' : validStaffCount === totalStaffCount ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {totalStaffCount > 0 ? `${validStaffCount} / ${totalStaffCount} Vigentes` : '0 / 0 Registrados'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Calibración Equipos END</span>
                <span className={`font-bold ${totalEquipCount === 0 ? 'text-slate-400' : validEquipCount === totalEquipCount ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {totalEquipCount > 0 ? `${validEquipCount} / ${totalEquipCount} Calibrados` : '0 / 0 Registrados'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 flex items-center justify-between">
                <span className="text-slate-600 font-medium">Proveedores Homologados</span>
                <span className={`font-bold ${totalPartnersCount === 0 ? 'text-slate-400' : approvedPartnersCount === totalPartnersCount ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {totalPartnersCount > 0 ? `${approvedPartnersCount} / ${totalPartnersCount} Aprobados` : '0 / 0 Registrados'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    
      {/* Modal de Respaldos Continuos del Guardián de Datos (Regla 14) */}
      <DataGuardianBackupsModal
        isOpen={isBackupsModalOpen}
        onClose={() => setIsBackupsModalOpen(false)}
      />
    </div>
  );
};

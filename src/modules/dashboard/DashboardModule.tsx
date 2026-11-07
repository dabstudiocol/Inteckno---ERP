import React, { useState, useMemo } from 'react';
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
  Coins,
  DollarSign,
  PieChart,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useErp } from '../../core/storage/erpStore';
import { PastelMetricCard } from '../../components/ui/PastelMetricCard';
import { DarkActionCard } from '../../components/ui/DarkActionCard';
import { LightTable } from '../../components/ui/LightTable';
import { BusinessRulesEngine } from '../../core/rules/businessRules';
import { getStoredTRM, formatCOP, formatUSD } from '../../core/services/trmService';
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
    expenses = [],
    setActiveModule,
    approveTimesheet,
    approvePurchaseOrderGM,
    signMilestoneAct,
    navigateWithContext,
  } = useErp();

  // =========================================================================
  // MOTOR FINANCIERO: EBITDA CORPORATIVO Y CASCADA DE RENTABILIDAD OPERACIONAL
  // =========================================================================
  const trm = getStoredTRM() || 4150.0;

  // 1. Ingresos Operacionales (Hitos con Factura Emitida + Contratos en Curso Devengados)
  const totalInvoicedRevenueCOP = useMemo(() => {
    return (milestones || [])
      .filter((m) => m.invoiceIssued)
      .reduce((acc, m) => acc + (Number(m.amountCOP) || 0), 0);
  }, [milestones]);

  const totalContractRevenueCOP = useMemo(() => {
    return (projects || []).reduce((acc, p) => acc + (Number(p.contractAmount) || Number(p.budgetPV) || 0), 0);
  }, [projects]);

  const effectiveRevenueCOP = totalInvoicedRevenueCOP > 0 ? totalInvoicedRevenueCOP : totalContractRevenueCOP;

  // 2. Costo de Ventas (COGS - Costos Directos de Obra Ejecutados)
  const totalDirectCostsCOP = useMemo(() => {
    return (projects || []).reduce((acc, p) => {
      const directs = ((p as any).costMatrix?.directCosts || (p as any).directCosts || []) as any[];
      return acc + directs.reduce((sum, d) => sum + (Number(d.executedAmount || d.amountCOP || d.subtotal || d.total) || 0), 0);
    }, 0);
  }, [projects]);

  // 3. Utilidad Bruta Operacional (Gross Profit)
  const grossProfitCOP = effectiveRevenueCOP - totalDirectCostsCOP;
  const grossMarginPercent = effectiveRevenueCOP > 0 ? (grossProfitCOP / effectiveRevenueCOP) * 100 : 0;

  // 4. Gastos Operacionales (OPEX - Indirectos + Gastos Administrativos / Oficina)
  const totalIndirectCostsCOP = useMemo(() => {
    return (projects || []).reduce((acc, p) => {
      const indirects = ((p as any).costMatrix?.indirectCosts || (p as any).indirectCosts || []) as any[];
      return acc + indirects.reduce((sum, i) => sum + (Number(i.executedAmount || i.amountCOP || i.subtotal || i.total) || 0), 0);
    }, 0);
  }, [projects]);

  const totalAdminExpensesCOP = useMemo(() => {
    return (expenses || [])
      .filter((e) => e.status === 'approved' && (!e.projectId || e.imputationType === 'oficina'))
      .reduce((acc, e) => {
        const amt = Number(e.amount) || 0;
        return acc + (e.currency === 'USD' ? amt * trm : amt);
      }, 0);
  }, [expenses, trm]);

  const totalOperatingExpensesCOP = totalIndirectCostsCOP + totalAdminExpensesCOP;

  // 5. EBITDA Consolidado (Utilidad Operacional Antes de Impuestos, Depreciaciones y Amortizaciones)
  const ebitdaCOP = grossProfitCOP - totalOperatingExpensesCOP;
  const ebitdaMarginPercent = effectiveRevenueCOP > 0 ? (ebitdaCOP / effectiveRevenueCOP) * 100 : 0;
  const ebitdaUSD = Math.round(ebitdaCOP / trm);

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
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
      
      {/* Saludo Personalizado y Resumen de Estado en Isla Blanca */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-[#050C1A] tracking-tight">
            Hola, {currentUser.name.split(' ')[0]} 👋
          </h2>
          <p className="text-xs sm:text-sm text-[#334155] font-bold mt-0.5">
            {currentUser.roleLabel} • Aquí está tu panorama y prioridades operativas para hoy.
          </p>
        </div>

        {/* Chip de Única Fuente de Verdad */}
        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#DCF5E6] text-[#0D5C31] text-xs font-extrabold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Única Fuente de Verdad Conectada</span>
          </div>

          <button
            onClick={() => setIsBackupsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-gradient-to-r from-[#041022] to-[#0284C7] text-white hover:opacity-95 text-xs font-extrabold transition-all cursor-pointer"
            title="Ver instantáneas de respaldo y puntos de control (Regla 14)"
          >
            <ShieldCheck size={15} className="text-cyan-300" />
            <span>Guardián de Datos</span>
          </button>
        </div>
      </div>

      {/* SECCIÓN EJECUTIVA: EBITDA CORPORATIVO Y CASCADA DE RENTABILIDAD */}
      <div className="bg-gradient-to-br from-[#041022] via-[#071D3B] to-[#026AA7] text-white rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/15 text-cyan-300">
              <Coins size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-base sm:text-xl font-black tracking-tight text-white">EBITDA & Desempeño Operacional</h3>
                <span className="text-[10.5px] font-black px-3 py-1 rounded-full bg-emerald-400 text-[#041022]">
                  Margen {ebitdaMarginPercent.toFixed(1)}%
                </span>
              </div>
              <p className="text-xs font-semibold text-sky-200 mt-0.5">
                Utilidad Operacional antes de impuestos, depreciaciones y amortizaciones consolidada en tiempo real.
              </p>
            </div>
          </div>

          <div className="text-right bg-black/25 px-3.5 py-2 rounded-2xl self-start sm:self-auto">
            <span className="text-[11px] text-sky-200 block font-bold">TRM Aplicada: {formatCOP(trm)}</span>
            <span className="text-xs text-emerald-300 font-black">1 USD = ${trm.toLocaleString('es-CO')} COP</span>
          </div>
        </div>

        {/* Rejilla de Métricas EBITDA */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white/10 space-y-1">
            <span className="text-[11px] font-extrabold text-sky-200 uppercase tracking-wider block">EBITDA Consolidado</span>
            <div className="text-lg sm:text-2xl font-black text-white">{formatCOP(ebitdaCOP)}</div>
            <div className="text-xs text-emerald-300 font-extrabold">{formatUSD(ebitdaUSD)}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 space-y-1">
            <span className="text-[11px] font-extrabold text-sky-200 uppercase tracking-wider block">Ingresos Operacionales</span>
            <div className="text-lg sm:text-2xl font-black text-cyan-300">{formatCOP(effectiveRevenueCOP)}</div>
            <div className="text-[11px] font-semibold text-sky-200">
              {totalInvoicedRevenueCOP > 0 ? 'Facturación expedida DIAN' : 'Base contractual proyectos'}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 space-y-1">
            <span className="text-[11px] font-extrabold text-sky-200 uppercase tracking-wider block">Costos Directos (COGS)</span>
            <div className="text-lg sm:text-2xl font-black text-rose-300">{formatCOP(totalDirectCostsCOP)}</div>
            <div className="text-[11px] font-semibold text-sky-200">Materiales + M.O. Ley 2101 + Equipos</div>
          </div>

          <div className="p-4 rounded-2xl bg-white/10 space-y-1">
            <span className="text-[11px] font-extrabold text-sky-200 uppercase tracking-wider block">Utilidad Bruta ({grossMarginPercent.toFixed(1)}%)</span>
            <div className="text-lg sm:text-2xl font-black text-amber-300">{formatCOP(grossProfitCOP)}</div>
            <div className="text-[11px] font-semibold text-sky-200">OPEX: -{formatCOP(totalOperatingExpensesCOP)}</div>
          </div>
        </div>

        {/* Cascada de Margen Operacional (Waterfall Bridge) */}
        <div className="p-4 rounded-2xl bg-black/25 space-y-2.5">
          <span className="text-[11px] font-black text-cyan-200 uppercase tracking-widest block">
            Cascada Financiera de Margen (Waterfall Bridge)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center text-xs">
            <div className="p-2.5 rounded-2xl bg-sky-950/80">
              <span className="text-[10px] text-sky-300 font-extrabold block">1. Ingresos</span>
              <span className="font-black text-white text-xs">{formatCOP(effectiveRevenueCOP)}</span>
              <span className="text-[9.5px] text-sky-400 font-bold block mt-0.5">100.0%</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-rose-950/80">
              <span className="text-[10px] text-rose-300 font-extrabold block">2. (-) COGS Directo</span>
              <span className="font-black text-rose-200 text-xs">-{formatCOP(totalDirectCostsCOP)}</span>
              <span className="text-[9.5px] text-rose-400 font-bold block mt-0.5">
                {effectiveRevenueCOP > 0 ? `-${((totalDirectCostsCOP / effectiveRevenueCOP) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-amber-950/80">
              <span className="text-[10px] text-amber-300 font-extrabold block">3. (=) Utilidad Bruta</span>
              <span className="font-black text-amber-200 text-xs">{formatCOP(grossProfitCOP)}</span>
              <span className="text-[9.5px] text-amber-400 font-bold block mt-0.5">{grossMarginPercent.toFixed(1)}%</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-purple-950/80">
              <span className="text-[10px] text-purple-300 font-extrabold block">4. (-) Gastos OPEX</span>
              <span className="font-black text-purple-200 text-xs">-{formatCOP(totalOperatingExpensesCOP)}</span>
              <span className="text-[9.5px] text-purple-400 font-bold block mt-0.5">
                {effectiveRevenueCOP > 0 ? `-${((totalOperatingExpensesCOP / effectiveRevenueCOP) * 100).toFixed(1)}%` : '0%'}
              </span>
            </div>
            <div className="p-2.5 rounded-2xl bg-emerald-950/80 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-emerald-300 font-extrabold block">5. (=) EBITDA</span>
              <span className="font-black text-emerald-200 text-xs">{formatCOP(ebitdaCOP)}</span>
              <span className="text-[9.5px] text-emerald-400 block mt-0.5 font-black">{ebitdaMarginPercent.toFixed(1)}%</span>
            </div>
          </div>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        
        {/* Columna Izquierda (2/3): Proyectos Clave STC con Semáforos */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-4 sm:p-5 space-y-3.5">
          <div className="flex items-center justify-between pb-1">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#050C1A] tracking-tight">
                Cartera de Proyectos STC (Avance y Salud)
              </h3>
              <p className="text-xs text-[#334155] font-bold mt-0.5">
                Seguimiento por Valor Ganado (EV), SPI, CPI y Margen Real.
              </p>
            </div>
            <button
              onClick={() => setActiveModule('projects')}
              className="px-3.5 py-2 rounded-2xl bg-[#E0F2FE] hover:bg-[#0284C7] text-[#0369A1] hover:text-white text-xs font-extrabold flex items-center gap-1 transition-all cursor-pointer"
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
          <div className="bg-white rounded-3xl p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-[#050C1A] uppercase tracking-wider">
                Compuertas de Calidad Activas
              </span>
              <div className="w-8 h-8 rounded-2xl bg-[#E0F2FE] text-[#0284C7] flex items-center justify-center">
                <ShieldCheck size={16} />
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-2xl bg-[#EBF2FA] flex items-center justify-between">
                <span className="text-[#050C1A] font-extrabold">Compuerta SST Personal</span>
                <span className={`font-black px-2.5 py-1 rounded-full text-[11px] ${totalStaffCount === 0 ? 'bg-white text-[#334155]' : validStaffCount === totalStaffCount ? 'bg-[#DCF5E6] text-[#0D5C31]' : 'bg-[#FEF0D6] text-[#854400]'}`}>
                  {totalStaffCount > 0 ? `${validStaffCount} / ${totalStaffCount} Vigentes` : '0 / 0 Registrados'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#EBF2FA] flex items-center justify-between">
                <span className="text-[#050C1A] font-extrabold">Calibración Equipos END</span>
                <span className={`font-black px-2.5 py-1 rounded-full text-[11px] ${totalEquipCount === 0 ? 'bg-white text-[#334155]' : validEquipCount === totalEquipCount ? 'bg-[#DCF5E6] text-[#0D5C31]' : 'bg-[#FEF0D6] text-[#854400]'}`}>
                  {totalEquipCount > 0 ? `${validEquipCount} / ${totalEquipCount} Calibrados` : '0 / 0 Registrados'}
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#EBF2FA] flex items-center justify-between">
                <span className="text-[#050C1A] font-extrabold">Proveedores Homologados</span>
                <span className={`font-black px-2.5 py-1 rounded-full text-[11px] ${totalPartnersCount === 0 ? 'bg-white text-[#334155]' : approvedPartnersCount === totalPartnersCount ? 'bg-[#DCF5E6] text-[#0D5C31]' : 'bg-[#FEF0D6] text-[#854400]'}`}>
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

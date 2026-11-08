import React from 'react';
import { ErpProvider, useErp } from './core/storage/erpStore';
import { AppShell } from './components/layout/AppShell';
import { LoginView } from './components/auth/LoginView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Módulos Especializados con Code-Splitting Dinámico (React.lazy) para Carga Instantánea en Firebase Hosting
const CrmModule = React.lazy(() => import('./modules/commercial/CrmModule').then((m) => ({ default: m.CrmModule })));
const ConversacionesModule = React.lazy(() => import('./modules/inteckno/ConversacionesModule').then((m) => ({ default: m.ConversacionesModule })));
const DocumentosModule = React.lazy(() => import('./modules/inteckno/DocumentosModule').then((m) => ({ default: m.DocumentosModule })));
const CalendarioModule = React.lazy(() => import('./modules/inteckno/CalendarioModule').then((m) => ({ default: m.CalendarioModule })));
const ActividadesModule = React.lazy(() => import('./modules/inteckno/ActividadesModule').then((m) => ({ default: m.ActividadesModule })));
const InternationalModule = React.lazy(() => import('./modules/international/InternationalModule').then((m) => ({ default: m.InternationalModule })));
const TalentoHumanoModule = React.lazy(() => import('./modules/hr/TalentoHumanoModule').then((m) => ({ default: m.TalentoHumanoModule })));
const ProjectsModule = React.lazy(() => import('./modules/projects/ProjectsModule').then((m) => ({ default: m.ProjectsModule })));
const ProcurementModule = React.lazy(() => import('./modules/procurement/ProcurementModule').then((m) => ({ default: m.ProcurementModule })));
const InventoryModule = React.lazy(() => import('./modules/inventory/InventoryModule').then((m) => ({ default: m.InventoryModule })));
const TimesheetModule = React.lazy(() => import('./modules/timesheet/TimesheetModule').then((m) => ({ default: m.TimesheetModule })));
const ExpensesModule = React.lazy(() => import('./modules/expenses/ExpensesModule').then((m) => ({ default: m.ExpensesModule })));
const BillingModule = React.lazy(() => import('./modules/billing/BillingModule').then((m) => ({ default: m.BillingModule })));
const DashboardModule = React.lazy(() => import('./modules/dashboard/DashboardModule').then((m) => ({ default: m.DashboardModule })));
const UserProfileModule = React.lazy(() => import('./modules/inteckno/UserProfileModule').then((m) => ({ default: m.UserProfileModule })));
const UserManagementModule = React.lazy(() => import('./modules/inteckno/UserManagementModule').then((m) => ({ default: m.UserManagementModule })));
const CargosModule = React.lazy(() => import('./modules/inteckno/CargosModule').then((m) => ({ default: m.CargosModule })));
const RequisitionsModule = React.lazy(() => import('./modules/requisitions/RequisitionsModule').then((m) => ({ default: m.RequisitionsModule })));

import { Forbidden403View } from './components/common/Forbidden403View';
import { canUserAccessModule } from './core/auth/rbac';

const MainContent: React.FC = () => {
  const { activeModuleId, isAuthenticated, currentUser, setActiveModule } = useErp();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Auditoría Práctica Parte 6: Blindaje de Roles y Guardián de Rutas (Route Guard)
  // Previene 'Security by Obscurity' si un usuario digita o fuerza la URL de costos, nómina o tableros
  const role = currentUser?.role || 'tecnico_stc';
  const isAuthorized = canUserAccessModule(role, activeModuleId);

  if (!isAuthorized) {
    return (
      <AppShell activeTitle="403 Acceso Denegado" activeSubtitle="Violación de Control de Acceso RBAC">
        <Forbidden403View
          moduleName={activeModuleId.toUpperCase()}
          userRole={currentUser?.roleLabel || role}
          onGoBack={() => setActiveModule('proyectos')}
        />
      </AppShell>
    );
  }

  const getModuleInfo = () => {
    switch (activeModuleId) {
      // 1. MÓDULOS INTECKNO (TRANSVERSALES)
      case 'conversaciones':
      case 'chat':
      case 'mensajes':
        return {
          title: 'Conversaciones Internas',
          subtitle: 'Canales de comunicación directa de equipo STC',
          component: <ConversacionesModule />,
        };
      case 'documentos':
      case 'documents':
      case 'archivos':
        return {
          title: 'Gestión Documental & Planos',
          subtitle: 'Planos CAD, manuales STC, certificados HSEQ y carpetas por proyecto',
          component: <DocumentosModule />,
        };
      case 'calendario':
      case 'calendar':
        return {
          title: 'Calendario de Operaciones',
          subtitle: 'Cronograma mensual de visitas a campo, paradas programadas e hitos',
          component: <CalendarioModule />,
        };
      case 'actividades':
      case 'tasks':
      case 'todos':
        return {
          title: 'Actividades Pendientes',
          subtitle: 'Control de compromisos, tareas operativas, To-Dos y asignación',
          component: <ActividadesModule />,
        };
      case 'cargos':
      case 'positions':
        return {
          title: 'Gestión de Cargos, Vacantes & Reclutamiento IA',
          subtitle: 'Estructuración organizacional, fichas de 8 pilares, evaluación de CVs con LUC-IA-NA y evaluaciones de desempeño',
          component: <CargosModule />,
        };
      case 'perfil':
      case 'profile':
        return {
          title: 'Mi Perfil & Configuración de Cuenta',
          subtitle: 'Datos personales, contraseña, foto corporativa y registros de seguridad',
          component: <UserProfileModule />,
        };
      case 'requisiciones':
      case 'requisitions':
      case 'solped':
        return {
          title: 'Peticiones de Compra y Solicitudes de Materiales',
          subtitle: 'Creación y seguimiento de solicitudes de materiales de proyectos y oficinas para Abastecimiento',
          component: <RequisitionsModule />,
        };
      case 'usuarios-ti':
      case 'users':
      case 'usuarios':
        return {
          title: 'Administración de Usuarios TI',
          subtitle: 'Control de accesos, creación de cuentas y reseteo de contraseñas de personal',
          component: <UserManagementModule />,
        };

      // 2. LA GESTIÓN COMERCIAL
      case 'crm':
      case 'commercial':
      case 'comercial':
      case 'pipeline':
        return {
          title: 'CRM - Pipeline de Oportunidades & Licitaciones',
          subtitle: 'Seguimiento por etapas a propuestas y contratos para sistemas de cable STC',
          component: <CrmModule activeTab="pipeline" />,
        };
      case 'contactos':
      case 'contacts':
      case 'clientes':
        return {
          title: 'Directorio de Contactos Comerciales',
          subtitle: 'Directorio de operadores, clientes estratégicos y aliados de teleféricos',
          component: <CrmModule activeTab="contactos" />,
        };
      // 3. INGENIERÍA Y OPERACIONES EN CAMPO
      case 'proyectos':
      case 'projects':
        return {
          title: 'Proyectos STC y Control Operativo',
          subtitle: 'Maestro de proyectos, gestión por Valor Ganado (EVM) y reportes diarios DDR',
          component: <ProjectsModule initialView="list" />,
        };
      case 'planeacion':
      case 'planning':
      case 'gantt':
      case 'wbs':
        return {
          title: 'Planeación & Cronograma Gantt',
          subtitle: 'Diagrama de Gantt interactivo, ruta crítica WBS y dependencias de ingeniería',
          component: <ProjectsModule initialView="gantt" />,
        };
      case 'registro-horas':
      case 'timesheet':
      case 'horas':
      case 'timesheets':
        return {
          title: 'Registro de Horas de Campo',
          subtitle: 'Control de Horas-Hombre (HH) con imputación a proyectos',
          component: <TimesheetModule />,
        };
      // 4. ABASTECIMIENTO Y LOGÍSTICA
      case 'compras':
      case 'procurement':
      case 'orders':
      case 'purchase-orders':
        return {
          title: 'Compras y Proveedores',
          subtitle: 'Órdenes de compra homologadas y regla de aprobación GM > USD $2.000',
          component: <ProcurementModule />,
        };
      case 'inventario':
      case 'inventory':
      case 'almacen':
      case 'stock':
      case 'bodega':
        return {
          title: 'Inventario Técnico & Repuestos STC',
          subtitle: 'Stock en bodega, control de mínimos y trazabilidad de piezas',
          component: <InventoryModule initialTab="unified" />,
        };
      case 'codigo-barras':
      case 'barcode':
        return {
          title: 'Lector & Escáner de Códigos de Barras',
          subtitle: 'Escaneo óptico de SKU, seriales y números de lote STC',
          component: <InventoryModule initialTab="barcode" />,
        };

      // 5. SOPORTE TRANSVERSAL: TALENTO HUMANO Y SST
      case 'empleados':
      case 'employees':
      case 'hr':
      case 'talento-humano':
        return {
          title: 'Personal Técnico & Certificaciones',
          subtitle: 'Fichas técnicas, licencias de trabajo en alturas y exámenes médicos',
          component: <TalentoHumanoModule initialTab="empleados" />,
        };
      case 'vacaciones':
      case 'vacations':
        return {
          title: 'Control de Vacaciones',
          subtitle: 'Programación de descansos y solicitudes de personal técnico',
          component: <TalentoHumanoModule initialTab="vacaciones" />,
        };
      case 'encuestas':
      case 'sst':
      case 'hseq':
      case 'hseq-gate':
        return {
          title: 'Inspecciones SST & Clima Laboral',
          subtitle: 'Checklists de seguridad y condiciones de trabajo en campo',
          component: <TalentoHumanoModule initialTab="encuestas" />,
        };
      case 'nomina':
      case 'payroll':
        return {
          title: 'Nómina Técnica de Campo',
          subtitle: 'Cálculo de horas, recargos y asignaciones salariales por proyecto',
          component: <TalentoHumanoModule initialTab="nomina" />,
        };

      // 6. GESTIÓN ADMINISTRATIVA Y FINANCIERA
      case 'contabilidad':
      case 'billing':
      case 'facturacion':
      case 'invoices':
        return {
          title: 'Facturación y Contabilidad (Regla 48h)',
          subtitle: 'Hitos contractuales cumplidos, actas de recibo y facturación DIAN',
          component: <BillingModule initialView="invoices" />,
        };
      case 'firma-electronica':
      case 'signatures':
      case 'acts':
      case 'actas':
        return {
          title: 'Firma Electrónica & Actas de Recibo',
          subtitle: 'Actas de entrega, hitos firmados digitalmente y validez jurídica',
          component: <BillingModule initialView="acts" />,
        };
      case 'gastos':
      case 'expenses':
      case 'viaticos':
      case 'caja-menor':
        return {
          title: 'Gastos y Viáticos de Campo',
          subtitle: 'Legalización con comprobante fotográfico y centros de costos',
          component: <ExpensesModule />,
        };
      case 'tableros':
      case 'dashboard':
      case 'kpis':
      case 'indicadores':
        return {
          title: 'Tableros de Control & EBITDA',
          subtitle: 'EBITDA, rentabilidad de proyectos y métricas de desempeño',
          component: <DashboardModule />,
        };

      // 7. NEGOCIOS INTERNACIONALES
      case 'calculadora-precios':
      case 'international':
      case 'calculator':
      case 'calculadora':
        return {
          title: 'Calculadora de Exportación & Incoterms',
          subtitle: 'Cotizaciones técnicas y financieras en USD con Incoterms 2020 y aranceles',
          component: <InternationalModule initialView="calculadora" />,
        };
      case 'radar-oportunidades':
      case 'leads-internacionales':
      case 'radar':
      case 'licitaciones':
        return {
          title: 'Radar de Oportunidades & Licitaciones Globales',
          subtitle: 'Inteligencia artificial explorando licitaciones, compras de repuestos y proyectos STC en todo el mundo',
          component: <InternationalModule initialView="radar" />,
        };

      default:
        return {
          title: 'Proyectos STC y Operaciones',
          subtitle: 'Panorama general de proyectos activos en teleféricos',
          component: <ProjectsModule />,
        };
    }
  };

  const current = getModuleInfo();

  return (
    <AppShell activeTitle={current.title} activeSubtitle={current.subtitle}>
      <ErrorBoundary fallbackTitle={`Error en ${current.title}`}>
        <React.Suspense
          fallback={
            <div className="flex items-center justify-center py-20 text-xs font-semibold text-slate-500">
              Cargando módulo {current.title}...
            </div>
          }
        >
          {current.component}
        </React.Suspense>
      </ErrorBoundary>
    </AppShell>
  );
};

export function App() {
  return (
    <ErrorBoundary fallbackTitle="Error al inicializar Inteckno ERP">
      <ErpProvider>
        <ErrorBoundary fallbackTitle="Error en vista principal">
          <MainContent />
        </ErrorBoundary>
      </ErpProvider>
    </ErrorBoundary>
  );
}

export default App;

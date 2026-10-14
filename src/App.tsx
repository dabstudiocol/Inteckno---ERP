import React from 'react';
import { ErpProvider, useErp } from './core/storage/erpStore';
import { AppShell } from './components/layout/AppShell';
import { LoginView } from './components/auth/LoginView';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Módulos Especializados
import { CrmModule } from './modules/commercial/CrmModule';
import { ConversacionesModule } from './modules/inteckno/ConversacionesModule';
import { DocumentosModule } from './modules/inteckno/DocumentosModule';
import { CalendarioModule } from './modules/inteckno/CalendarioModule';
import { ActividadesModule } from './modules/inteckno/ActividadesModule';
import { ArticulosModule } from './modules/inteckno/ArticulosModule';
import { InternationalModule } from './modules/international/InternationalModule';
import { TalentoHumanoModule } from './modules/hr/TalentoHumanoModule';
import { OperacionesAvanzadasModule } from './modules/operations/OperacionesAvanzadasModule';
import { ProjectsModule } from './modules/projects/ProjectsModule';
import { ProcurementModule } from './modules/procurement/ProcurementModule';
import { InventoryModule } from './modules/inventory/InventoryModule';
import { TimesheetModule } from './modules/timesheet/TimesheetModule';
import { ExpensesModule } from './modules/expenses/ExpensesModule';
import { BillingModule } from './modules/billing/BillingModule';
import { DashboardModule } from './modules/dashboard/DashboardModule';
import { UserProfileModule } from './modules/inteckno/UserProfileModule';
import { UserManagementModule } from './modules/inteckno/UserManagementModule';
import { CargosModule } from './modules/inteckno/CargosModule';
import { RequisitionsModule } from './modules/requisitions/RequisitionsModule';

const MainContent: React.FC = () => {
  const { activeModuleId, isAuthenticated } = useErp();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const getModuleInfo = () => {
    switch (activeModuleId) {
      // 1. MÓDULOS INTECKNO (TRANSVERSALES)
      case 'conversaciones':
        return {
          title: 'Conversaciones Internas',
          subtitle: 'Canales de comunicación directa de equipo STC',
          component: <ConversacionesModule />,
        };
      case 'documentos':
        return {
          title: 'Gestión Documental & Planos',
          subtitle: 'Planos CAD, manuales STC, certificados HSEQ y carpetas por proyecto',
          component: <DocumentosModule />,
        };
      case 'calendario':
        return {
          title: 'Calendario de Operaciones',
          subtitle: 'Cronograma mensual de visitas a campo, paradas programadas e hitos',
          component: <CalendarioModule />,
        };
      case 'actividades':
        return {
          title: 'Actividades Pendientes',
          subtitle: 'Control de compromisos, tareas operativas, To-Dos y asignación',
          component: <ActividadesModule />,
        };
      case 'articulos':
        return {
          title: 'Artículos & Wiki Técnica',
          subtitle: 'Procedimientos y estándares normativos EN 1709 / EN 12929',
          component: <ArticulosModule />,
        };
      case 'cargos':
        return {
          title: 'Gestión de Cargos, Vacantes & Reclutamiento IA',
          subtitle: 'Estructuración organizacional, fichas de 8 pilares, evaluación de CVs con LUC-IA-NA y evaluaciones de desempeño',
          component: <CargosModule />,
        };
      case 'perfil':
        return {
          title: 'Mi Perfil & Configuración de Cuenta',
          subtitle: 'Datos personales, contraseña, foto corporativa y registros de seguridad',
          component: <UserProfileModule />,
        };
      case 'requisiciones':
        return {
          title: 'Peticiones de Compra y Solicitudes de Materiales',
          subtitle: 'Creación y seguimiento de solicitudes de materiales de proyectos y oficinas para Abastecimiento',
          component: <RequisitionsModule />,
        };
      case 'usuarios-ti':
        return {
          title: 'Administración de Usuarios TI',
          subtitle: 'Control de accesos, creación de cuentas y reseteo de contraseñas de personal',
          component: <UserManagementModule />,
        };

      // 2. LA GESTIÓN COMERCIAL
      case 'crm':
        return {
          title: 'CRM - Pipeline de Oportunidades & Licitaciones',
          subtitle: 'Seguimiento por etapas a propuestas y contratos para sistemas de cable STC',
          component: <CrmModule activeTab="pipeline" />,
        };
      case 'contactos':
        return {
          title: 'Directorio de Contactos Comerciales',
          subtitle: 'Directorio de operadores, clientes estratégicos y aliados de teleféricos',
          component: <CrmModule activeTab="contactos" />,
        };
      case 'ventas':
        return {
          title: 'Ventas & Cotizaciones STC',
          subtitle: 'Historial de propuestas técnico-económicas y conversión a proyectos',
          component: <CrmModule activeTab="ventas" />,
        };
      case 'whatsapp':
        return {
          title: 'WhatsApp Comercial',
          subtitle: 'Canal de mensajería directa y solicitudes de auxilio técnico STC',
          component: <CrmModule activeTab="whatsapp" />,
        };

      // 3. INGENIERÍA Y OPERACIONES EN CAMPO
      case 'proyectos':
        return {
          title: 'Proyectos STC y Control Operativo',
          subtitle: 'Maestro de proyectos, gestión por Valor Ganado (EVM) y reportes diarios DDR',
          component: <ProjectsModule initialView="list" />,
        };
      case 'planeacion':
        return {
          title: 'Planeación & Cronograma Gantt',
          subtitle: 'Diagrama de Gantt interactivo, ruta crítica WBS y dependencias de ingeniería',
          component: <ProjectsModule initialView="gantt" />,
        };
      case 'registro-horas':
        return {
          title: 'Registro de Horas de Campo',
          subtitle: 'Control de Horas-Hombre (HH) con imputación a proyectos',
          component: <TimesheetModule />,
        };
      case 'mantenimiento':
        return {
          title: 'Mantenimiento Preventivo STC',
          subtitle: 'Planes preventivos por componente crítico según normas EN 1709 / EN 12929',
          component: <OperacionesAvanzadasModule initialSubTab="mantenimiento" />,
        };
      case 'reparacion':
        return {
          title: 'Reparación & Órdenes Técnicas (OT)',
          subtitle: 'Gestión de fallas correctivas, diagnósticos e inspección especializada',
          component: <OperacionesAvanzadasModule initialSubTab="reparacion" />,
        };
      case 'manufactura':
        return {
          title: 'Manufactura de Piezas',
          subtitle: 'Maquinado y fabricación de componentes mecánicos para teleféricos',
          component: <OperacionesAvanzadasModule initialSubTab="manufactura" />,
        };
      case 'taller':
        return {
          title: 'Taller & Banco de Pruebas',
          subtitle: 'Pruebas de carga, ensayos hidráulicos y calibración de instrumentos',
          component: <OperacionesAvanzadasModule initialSubTab="taller" />,
        };
      case 'plm':
        return {
          title: 'PLM & Especificaciones STC',
          subtitle: 'Gestión del ciclo de vida y especificaciones técnicas normativas',
          component: <OperacionesAvanzadasModule initialSubTab="plm" />,
        };

      // 4. ABASTECIMIENTO Y LOGÍSTICA
      case 'compras':
        return {
          title: 'Compras y Proveedores',
          subtitle: 'Órdenes de compra homologadas y regla de aprobación GM > USD $2.000',
          component: <ProcurementModule />,
        };
      case 'inventario':
        return {
          title: 'Inventario Técnico & Repuestos STC',
          subtitle: 'Stock en bodega, control de mínimos y trazabilidad de piezas',
          component: <InventoryModule initialTab="unified" />,
        };
      case 'codigo-barras':
        return {
          title: 'Lector & Escáner de Códigos de Barras',
          subtitle: 'Escaneo óptico de SKU, seriales y números de lote STC',
          component: <InventoryModule initialTab="barcode" />,
        };

      // 5. SOPORTE TRANSVERSAL: TALENTO HUMANO Y SST
      case 'empleados':
        return {
          title: 'Personal Técnico & Certificaciones',
          subtitle: 'Fichas técnicas, licencias de trabajo en alturas y exámenes médicos',
          component: <TalentoHumanoModule initialTab="empleados" />,
        };
      case 'vacaciones':
        return {
          title: 'Control de Vacaciones',
          subtitle: 'Programación de descansos y solicitudes de personal técnico',
          component: <TalentoHumanoModule initialTab="vacaciones" />,
        };
      case 'encuestas':
        return {
          title: 'Inspecciones SST & Clima Laboral',
          subtitle: 'Checklists de seguridad y condiciones de trabajo en campo',
          component: <TalentoHumanoModule initialTab="encuestas" />,
        };
      case 'nomina':
        return {
          title: 'Nómina Técnica de Campo',
          subtitle: 'Cálculo de horas, recargos y asignaciones salariales por proyecto',
          component: <TalentoHumanoModule initialTab="nomina" />,
        };

      // 6. GESTIÓN ADMINISTRATIVA Y FINANCIERA
      case 'contabilidad':
        return {
          title: 'Facturación y Contabilidad (Regla 48h)',
          subtitle: 'Hitos contractuales cumplidos, actas de recibo y facturación DIAN',
          component: <BillingModule initialView="invoices" />,
        };
      case 'firma-electronica':
        return {
          title: 'Firma Electrónica & Actas de Recibo',
          subtitle: 'Actas de entrega, hitos firmados digitalmente y validez jurídica',
          component: <BillingModule initialView="acts" />,
        };
      case 'gastos':
        return {
          title: 'Gastos y Viáticos de Campo',
          subtitle: 'Legalización con comprobante fotográfico y centros de costos',
          component: <ExpensesModule />,
        };
      case 'tableros':
        return {
          title: 'Tableros de Control & KPIs',
          subtitle: 'EBITDA, rentabilidad de proyectos y métricas de desempeño',
          component: <DashboardModule />,
        };

      // 7. NEGOCIOS INTERNACIONALES
      case 'calculadora-precios':
        return {
          title: 'Calculadora de Exportación & Incoterms',
          subtitle: 'Cotizaciones técnicas y financieras en USD con Incoterms 2020 y aranceles',
          component: <InternationalModule initialView="calculadora" />,
        };
      case 'radar-oportunidades':
      case 'leads-internacionales':
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
        {current.component}
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

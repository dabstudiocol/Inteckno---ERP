import { useState, useEffect } from 'react';
import { ExpenseCategory } from '../../types';

export interface CatalogItem {
  id: string;
  name: string;
  code?: string;
  category?: string;
  isActive: boolean;
}

export interface ModuleCatalogDef {
  key: string;
  title: string;
  description: string;
  icon?: string;
  hasCode?: boolean;
  codeLabel?: string;
  items: CatalogItem[];
}

export interface ModuleConfigGroup {
  moduleId: string;
  moduleName: string;
  catalogs: Record<string, ModuleCatalogDef>;
}

// ============================================================================
// CONFIGURACIÓN LEGACY & COMPATIBILIDAD CON GASTOS
// ============================================================================
export interface OfficeCostCenterConfig {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  isActive: boolean;
}

export interface ExpenseCategoryConfig {
  id: string;
  key: string;
  label: string;
  isActive: boolean;
}

export interface ExpensesModuleConfig {
  offices: OfficeCostCenterConfig[];
  paymentMethods: PaymentMethodConfig[];
  categories: ExpenseCategoryConfig[];
  defaultCurrency: 'COP' | 'USD' | 'EUR';
}

const STORAGE_PREFIX = 'ITK_MODULE_CONFIG_';
const STORAGE_KEY_EXPENSES_CONFIG = 'ITK_EXPENSES_MODULE_CONFIG_V1';

// ============================================================================
// CATÁLOGOS POR DEFECTO PARA CADA MÓDULO DEL ERP INTECKNO S.A.S.
// ============================================================================

export const DEFAULT_MODULE_CONFIGS: Record<string, ModuleConfigGroup> = {
  // 1. INVENTARIO & ALMACÉN
  inventario: {
    moduleId: 'inventario',
    moduleName: 'Inventario & Almacén STC',
    catalogs: {
      warehouses: {
        key: 'warehouses',
        title: 'Sedes y Bodegas de Almacenamiento',
        description: 'Bodegas principales, talleres y contenedores móviles en obra.',
        hasCode: true,
        items: [
          { id: 'wh-1', name: 'Almacén Central Medellín (Sede Poblado)', code: 'BOD-MED-01', isActive: true },
          { id: 'wh-2', name: 'Taller Central Guayabal (Banco de Ensayos & Maquinado)', code: 'TAL-GBL-02', isActive: true },
          { id: 'wh-3', name: 'Bodega de Campo Metro de Medellín (Patios Bello / Línea K)', code: 'BOD-METRO-03', isActive: true },
          { id: 'wh-4', name: 'Bodega Internacional Mi Teleférico La Paz (Bolivia)', code: 'BOD-BOL-04', isActive: true },
          { id: 'wh-5', name: 'Bodega Internacional Inteckno RD (Santo Domingo)', code: 'BOD-RD-05', isActive: true },
          { id: 'wh-6', name: 'Contenedor Móvil de Obra (Sistemas de Cable)', code: 'BOD-MOV-06', isActive: true },
        ],
      },
      categories: {
        key: 'categories',
        title: 'Categorías de Repuestos y Materiales',
        description: 'Clasificación técnica para inventario y stock mínimo.',
        hasCode: false,
        items: [
          { id: 'cat-1', name: 'Repuestos y Componentes', isActive: true },
          { id: 'cat-2', name: 'Herramientas e Instrumentos', isActive: true },
          { id: 'cat-3', name: 'EPP y Alturas', isActive: true },
          { id: 'cat-4', name: 'Insumos y Consumibles', isActive: true },
          { id: 'cat-5', name: 'Cables Portadores y Tractores', isActive: true },
          { id: 'cat-6', name: 'Lubricantes y Químicos Especiales', isActive: true },
        ],
      },
      units: {
        key: 'units',
        title: 'Unidades de Medida',
        description: 'Unidades de conteo y fraccionamiento para piezas técnicas.',
        hasCode: true,
        codeLabel: 'Símbolo',
        items: [
          { id: 'u-1', name: 'Metros', code: 'm', isActive: true },
          { id: 'u-2', name: 'Centímetros', code: 'cm', isActive: true },
          { id: 'u-3', name: 'Metros Lineales', code: 'ml', isActive: true },
          { id: 'u-4', name: 'Pulgadas', code: 'pulg', isActive: true },
          { id: 'u-5', name: 'Unidades', code: 'unid', isActive: true },
          { id: 'u-6', name: 'Kilogramos', code: 'kg', isActive: true },
          { id: 'u-7', name: 'Litros', code: 'lt', isActive: true },
          { id: 'u-8', name: 'Juego / Kit', code: 'kit', isActive: true },
        ],
      },
      shelves: {
        key: 'shelves',
        title: 'Estantes y Racks de Ubicación',
        description: 'Ubicaciones físicas dentro de cada almacén.',
        hasCode: false,
        items: [
          { id: 'sh-1', name: 'Estante A-01 (Componentes Críticos)', isActive: true },
          { id: 'sh-2', name: 'Estante B-02 (Electrónica & Sensores)', isActive: true },
          { id: 'sh-3', name: 'Gaveta C-03 (Tornillería Grado 8)', isActive: true },
          { id: 'sh-4', name: 'Rack D-04 (Tambores de Cable)', isActive: true },
          { id: 'sh-5', name: 'Zona Segura (EPP & Líneas de Vida)', isActive: true },
        ],
      },
    },
  },

  // 2. COMPRAS Y PROVEEDORES
  compras: {
    moduleId: 'compras',
    moduleName: 'Compras y Proveedores',
    catalogs: {
      supplierCategories: {
        key: 'supplierCategories',
        title: 'Líneas y Categorías de Proveedores',
        description: 'Tipos de bienes o servicios suministrados a Inteckno.',
        hasCode: false,
        items: [
          { id: 'sc-1', name: 'Repuestos & Cables STC', isActive: true },
          { id: 'sc-2', name: 'Herramientas y Equipos Especializados', isActive: true },
          { id: 'sc-3', name: 'Servicios de Maquinado & Taller', isActive: true },
          { id: 'sc-4', name: 'Equipos de Protección Personal (EPP)', isActive: true },
          { id: 'sc-5', name: 'Transporte y Carga Pesada', isActive: true },
          { id: 'sc-6', name: 'Laboratorios de Calibración & Ensayos NDT', isActive: true },
        ],
      },
      paymentTerms: {
        key: 'paymentTerms',
        title: 'Condiciones de Pago Homologadas',
        description: 'Términos comerciales acordados en órdenes de compra.',
        hasCode: true,
        codeLabel: 'Días',
        items: [
          { id: 'pt-1', name: 'Contado Comercial (Anticipado)', code: '0D', isActive: true },
          { id: 'pt-2', name: '15 días fecha factura (15 F/F)', code: '15D', isActive: true },
          { id: 'pt-3', name: '30 días fecha factura (30 F/F)', code: '30D', isActive: true },
          { id: 'pt-4', name: '60 días fecha factura (60 F/F)', code: '60D', isActive: true },
          { id: 'pt-5', name: '50% Anticipo - 50% Contra Entrega', code: 'ANT-50', isActive: true },
          { id: 'pt-6', name: 'Contra Entrega en Bodega', code: 'C-ENT', isActive: true },
        ],
      },
      criticalityLevels: {
        key: 'criticalityLevels',
        title: 'Niveles de Criticidad de Proveedor',
        description: 'Clasificación de riesgo de suministro según HSEQ.',
        hasCode: false,
        items: [
          { id: 'crit-1', name: 'Alta (Fabricante OEM o Exclusivo)', isActive: true },
          { id: 'crit-2', name: 'Media (Distribuidor Calificado)', isActive: true },
          { id: 'crit-3', name: 'Baja (Insumos Estándar de Ferretería)', isActive: true },
        ],
      },
    },
  },

  // 3. REGISTRO DE HORAS / TIMESHEET
  'registro-horas': {
    moduleId: 'registro-horas',
    moduleName: 'Registro de Horas de Campo',
    catalogs: {
      laborTypes: {
        key: 'laborTypes',
        title: 'Tipos de Labor / Actividad Técnica',
        description: 'Actividades que el personal técnico imputa en campo.',
        hasCode: true,
        codeLabel: 'Código Labor',
        items: [
          { id: 'lt-1', name: 'Inspección y Mantenimiento de Campo', code: 'LAB-INSP', isActive: true },
          { id: 'lt-2', name: 'Montaje Electromecánico en Pilonas', code: 'LAB-MONT', isActive: true },
          { id: 'lt-3', name: 'Ensayos NDT por Ultrasonido / Partículas', code: 'LAB-NDT', isActive: true },
          { id: 'lt-4', name: 'Desembornamiento y Regulación de Pinzas', code: 'LAB-REG', isActive: true },
          { id: 'lt-5', name: 'Soldadura Estructural Calificada', code: 'LAB-SOLD', isActive: true },
          { id: 'lt-6', name: 'Supervisión Residente & HSEQ', code: 'LAB-SUPV', isActive: true },
          { id: 'lt-7', name: 'Diagnóstico Hidráulico y Eléctrico', code: 'LAB-DIAG', isActive: true },
          { id: 'lt-8', name: 'Trabajo y Pruebas en Taller Central', code: 'LAB-TALL', isActive: true },
        ],
      },
      shifts: {
        key: 'shifts',
        title: 'Turnos y Modalidades de Jornada',
        description: 'Horarios de trabajo para cómputo de recargos.',
        hasCode: true,
        codeLabel: 'Horas Base',
        items: [
          { id: 'sh-1', name: 'Turno Diurno Ordinario (06:00 - 14:00)', code: '8h', isActive: true },
          { id: 'sh-2', name: 'Turno Mixto / Extendido (07:00 - 17:00)', code: '9h', isActive: true },
          { id: 'sh-3', name: 'Turno Nocturno con Parada de Teleférico (22:00 - 05:00)', code: '7h', isActive: true },
          { id: 'sh-4', name: 'Jornada Dominical / Festiva en Ventana', code: '8h', isActive: true },
        ],
      },
    },
  },

  // 4. FACTURACIÓN Y CONTABILIDAD
  contabilidad: {
    moduleId: 'contabilidad',
    moduleName: 'Facturación y Contabilidad',
    catalogs: {
      banks: {
        key: 'banks',
        title: 'Cuentas Bancarias Receptoras',
        description: 'Cuentas para consignación de clientes y recaudo.',
        hasCode: true,
        codeLabel: 'Número Cuenta',
        items: [
          { id: 'bnk-1', name: 'Bancolombia - Cta Corriente Empresarial', code: '031-998822-11', isActive: true },
          { id: 'bnk-2', name: 'Davivienda - Cta Corriente Corporativa', code: '104-554433-22', isActive: true },
          { id: 'bnk-3', name: 'Banco de Bogotá - Recaudos Especiales', code: '087-112233-44', isActive: true },
          { id: 'bnk-4', name: 'JPMorgan Chase (USD International)', code: 'US-778899-SWIFT', isActive: true },
        ],
      },
      paymentTerms: {
        key: 'paymentTerms',
        title: 'Términos de Cobro a Clientes',
        description: 'Plazos de vencimiento asignados en facturas electrónicas.',
        hasCode: true,
        codeLabel: 'Plazo',
        items: [
          { id: 'cp-1', name: 'Contado Comercial (Inmediato)', code: '0 días', isActive: true },
          { id: 'cp-2', name: '15 días calendario', code: '15 días', isActive: true },
          { id: 'cp-3', name: '30 días fecha de factura', code: '30 días', isActive: true },
          { id: 'cp-4', name: '45 días fecha de factura', code: '45 días', isActive: true },
          { id: 'cp-5', name: '60 días fecha de factura', code: '60 días', isActive: true },
        ],
      },
      milestoneTypes: {
        key: 'milestoneTypes',
        title: 'Tipos de Hitos Contractuales',
        description: 'Conceptos de cobro según contratos de interventoría y obra.',
        hasCode: false,
        items: [
          { id: 'mt-1', name: 'Anticipo Contractual Inicial (10% - 30%)', isActive: true },
          { id: 'mt-2', name: 'Acta de Avance de Obra Parcial', isActive: true },
          { id: 'mt-3', name: 'Suministro y Arribo de Materiales Críticos', isActive: true },
          { id: 'mt-4', name: 'Pruebas de Carga y Puesta en Servicio', isActive: true },
          { id: 'mt-5', name: 'Liquidación Final y Entrega Definitiva', isActive: true },
        ],
      },
    },
  },

  // 5. CRM Y GESTIÓN COMERCIAL
  crm: {
    moduleId: 'crm',
    moduleName: 'CRM y Pipeline Comercial',
    catalogs: {
      cableTypes: {
        key: 'cableTypes',
        title: 'Tipos de Sistema STC / Teleférico',
        description: 'Tecnologías de transporte por cable ofertadas.',
        hasCode: true,
        codeLabel: 'Sigla',
        items: [
          { id: 'ct-1', name: 'Aéreo Monocable Desembragable (Cabinas 8-10 Pax)', code: 'MGD', isActive: true },
          { id: 'ct-2', name: 'Teleférico Vaivén Bicable / Tricable', code: 'ATW/3S', isActive: true },
          { id: 'ct-3', name: 'Funicular Terrestre sobre Rieles', code: 'FUN', isActive: true },
          { id: 'ct-4', name: 'Telesilla de Pinza Fija (Turismo & Nieve)', code: 'CLF', isActive: true },
          { id: 'ct-5', name: 'Teleférico de Carga & Materiales Pesados', code: 'CARGA', isActive: true },
        ],
      },
      leadSources: {
        key: 'leadSources',
        title: 'Orígenes y Fuentes de Oportunidad',
        description: 'Canales por donde ingresan los prospectos comerciales.',
        hasCode: false,
        items: [
          { id: 'ls-1', name: 'Licitación Pública (SECOP II / Mercado Público)', isActive: true },
          { id: 'ls-2', name: 'Recomendación de Operador Teleférico', isActive: true },
          { id: 'ls-3', name: 'Contacto Directo / Networking Técnico', isActive: true },
          { id: 'ls-4', name: 'Feria o Congreso Internacional (OITAF / UITP)', isActive: true },
          { id: 'ls-5', name: 'Portal Web Inteckno / Campaña Digital', isActive: true },
        ],
      },
      countries: {
        key: 'countries',
        title: 'Países y Mercados Objetivo',
        description: 'Jurisdicciones globales donde Inteckno presenta propuestas técnicas y comerciales.',
        hasCode: true,
        codeLabel: 'Código ISO',
        items: [
          { id: 'cy-1', name: 'Colombia', code: 'COL', isActive: true },
          { id: 'cy-2', name: 'Bolivia', code: 'BOL', isActive: true },
          { id: 'cy-3', name: 'República Dominicana', code: 'DOM', isActive: true },
          { id: 'cy-4', name: 'Costa Rica', code: 'CRI', isActive: true },
          { id: 'cy-5', name: 'San Martín (SXM)', code: 'SXM', isActive: true },
          { id: 'cy-6', name: 'Santa Lucía', code: 'LCA', isActive: true },
          { id: 'cy-7', name: 'Panamá', code: 'PAN', isActive: true },
          { id: 'cy-8', name: 'Venezuela', code: 'VEN', isActive: true },
          { id: 'cy-9', name: 'El Salvador', code: 'SLV', isActive: true },
          { id: 'cy-10', name: 'México', code: 'MEX', isActive: true },
          { id: 'cy-11', name: 'Ecuador', code: 'ECU', isActive: true },
          { id: 'cy-12', name: 'Perú', code: 'PER', isActive: true },
          { id: 'cy-13', name: 'Chile', code: 'CHL', isActive: true },
          { id: 'cy-14', name: 'Brasil', code: 'BRA', isActive: true },
          { id: 'cy-15', name: 'Argentina', code: 'ARG', isActive: true },
          { id: 'cy-16', name: 'Guatemala', code: 'GTM', isActive: true },
          { id: 'cy-17', name: 'Honduras', code: 'HND', isActive: true },
          { id: 'cy-18', name: 'Nicaragua', code: 'NIC', isActive: true },
          { id: 'cy-19', name: 'Paraguay', code: 'PRY', isActive: true },
          { id: 'cy-20', name: 'Uruguay', code: 'URY', isActive: true },
          { id: 'cy-21', name: 'Estados Unidos', code: 'USA', isActive: true },
          { id: 'cy-22', name: 'España', code: 'ESP', isActive: true },
          { id: 'cy-23', name: 'Suiza', code: 'CHE', isActive: true },
          { id: 'cy-24', name: 'Francia', code: 'FRA', isActive: true },
          { id: 'cy-25', name: 'Austria', code: 'AUT', isActive: true },
          { id: 'cy-26', name: 'Italia', code: 'ITA', isActive: true },
          { id: 'cy-27', name: 'Alemania', code: 'DEU', isActive: true },
          { id: 'cy-28', name: 'Canadá', code: 'CAN', isActive: true },
        ],
      },
      currencies: {
        key: 'currencies',
        title: 'Monedas y Listas de Precios',
        description: 'Monedas de negociación para cotizaciones y contratos comerciales.',
        hasCode: true,
        codeLabel: 'Código',
        items: [
          { id: 'cur-1', name: 'USD ($ - Dólar Estadounidense)', code: 'USD', isActive: true },
          { id: 'cur-2', name: 'COP ($ - Peso Colombiano)', code: 'COP', isActive: true },
          { id: 'cur-3', name: 'EUR (€ - Euro Europeo)', code: 'EUR', isActive: true },
          { id: 'cur-4', name: 'MXN ($ - Peso Mexicano)', code: 'MXN', isActive: true },
          { id: 'cur-5', name: 'BOB (Bs - Boliviano)', code: 'BOB', isActive: true },
          { id: 'cur-6', name: 'CLP ($ - Peso Chileno)', code: 'CLP', isActive: true },
          { id: 'cur-7', name: 'PEN (S/ - Sol Peruano)', code: 'PEN', isActive: true },
          { id: 'cur-8', name: 'CHF (Fr - Franco Suizo)', code: 'CHF', isActive: true },
          { id: 'cur-9', name: 'CAD ($ - Dólar Canadiense)', code: 'CAD', isActive: true },
          { id: 'cur-10', name: 'BRL (R$ - Real Brasileño)', code: 'BRL', isActive: true },
          { id: 'cur-11', name: 'GBP (£ - Libra Esterlina)', code: 'GBP', isActive: true },
        ],
      },
      paymentTerms: {
        key: 'paymentTerms',
        title: 'Términos de Pago Comercial (Ventas)',
        description: 'Plazos de pago habituales acordados con clientes.',
        hasCode: true,
        codeLabel: 'Días',
        items: [
          { id: 'pt-v1', name: 'Pago Inmediato (Contado)', code: '0D', isActive: true },
          { id: 'pt-v2', name: '15 días fecha factura (15 F/F)', code: '15D', isActive: true },
          { id: 'pt-v3', name: '30 días fecha factura (30 F/F)', code: '30D', isActive: true },
          { id: 'pt-v4', name: '45 días fecha factura (45 F/F)', code: '45D', isActive: true },
          { id: 'pt-v5', name: '60 días fecha factura (60 F/F)', code: '60D', isActive: true },
          { id: 'pt-v6', name: '90 días fecha factura (90 F/F)', code: '90D', isActive: true },
          { id: 'pt-v7', name: '50% Anticipo / 50% Contra Entrega', code: '50-50', isActive: true },
          { id: 'pt-v8', name: '30% Anticipo / 60% Avance / 10% Retención', code: '30-60-10', isActive: true },
        ],
      },
      dealScoreCriteria: {
        key: 'dealScoreCriteria',
        title: 'Criterios de Probabilidad Deal Score',
        description: 'Factores que ponderan la probabilidad de cierre de cada oportunidad comercial.',
        hasCode: true,
        codeLabel: 'Impacto %',
        items: [
          { id: 'dsc-1', name: 'Especialidad Core Inteckno (Sistemas de Cable STC)', code: '+15%', isActive: true },
          { id: 'dsc-2', name: 'Sede Central e Infraestructura en Colombia', code: '+15%', isActive: true },
          { id: 'dsc-3', name: 'Presencia Operativa en LATAM (México, Ecuador, Bolivia)', code: '+10%', isActive: true },
          { id: 'dsc-4', name: 'Rango de Presupuesto Óptimo ($30k - $500k USD)', code: '+15%', isActive: true },
          { id: 'dsc-5', name: 'Lead Calificado (Licitación o Referido Directo)', code: '+10%', isActive: true },
          { id: 'dsc-6', name: 'Mapa de Decisión Completo (Decisor Económico Asignado)', code: '+10%', isActive: true },
          { id: 'dsc-7', name: 'Alerta de Inactividad Comercial (> 15 días sin gestión)', code: '-5%', isActive: true },
          { id: 'dsc-8', name: 'Riesgo Crítico de Estancamiento (> 45 días sin gestión)', code: '-15%', isActive: true },
        ],
      },
    },
  },

  // 6. TALENTO HUMANO Y SST
  empleados: {
    moduleId: 'empleados',
    moduleName: 'Talento Humano & Personal Técnico',
    catalogs: {
      departments: {
        key: 'departments',
        title: 'Departamentos y Áreas Funcionales',
        description: 'Estructura organizacional interna de Inteckno.',
        hasCode: true,
        codeLabel: 'Código',
        items: [
          { id: 'dep-1', name: 'Ingeniería y Proyectos', code: 'ING-PRJ', isActive: true },
          { id: 'dep-2', name: 'Operaciones & Mantenimiento STC', code: 'OPS-MNT', isActive: true },
          { id: 'dep-3', name: 'HSEQ & Trabajo Seguro en Alturas', code: 'HSEQ-SST', isActive: true },
          { id: 'dep-4', name: 'Taller & Banco de Pruebas', code: 'TAL-ENS', isActive: true },
          { id: 'dep-5', name: 'Comercial & Licitaciones', code: 'COM-LIC', isActive: true },
          { id: 'dep-6', name: 'Administración & Financiera', code: 'ADM-FIN', isActive: true },
        ],
      },
      roles: {
        key: 'roles',
        title: 'Cargos y Especialidades Técnicas',
        description: 'Perfiles ocupacionales requeridos para trabajos en cables.',
        hasCode: false,
        items: [
          { id: 'rl-1', name: 'Ingeniero Residente STC (Especialista en Cables)', isActive: true },
          { id: 'rl-2', name: 'Técnico Liniero de Alturas Nivel 3', isActive: true },
          { id: 'rl-3', name: 'Especialista en Hidráulica y Reductores', isActive: true },
          { id: 'rl-4', name: 'Inspector HSEQ / Coordinador de Alturas', isActive: true },
          { id: 'rl-5', name: 'Técnico Electromecánico de Campo', isActive: true },
          { id: 'rl-6', name: 'Soldador Estructural Calificado AWS', isActive: true },
          { id: 'rl-7', name: 'Coordinador de Compras y Almacén', isActive: true },
        ],
      },
      leaveTypes: {
        key: 'leaveTypes',
        title: 'Tipos de Permisos y Novedades',
        description: 'Conceptos de ausencia autorizada y vacaciones.',
        hasCode: false,
        items: [
          { id: 'lt-1', name: 'Vacaciones de Ley Programadas', isActive: true },
          { id: 'lt-2', name: 'Incapacidad Médica (EPS / ARL)', isActive: true },
          { id: 'lt-3', name: 'Calamidad Doméstica Comprobada', isActive: true },
          { id: 'lt-4', name: 'Permiso de Capacitación Técnica Externa', isActive: true },
          { id: 'lt-5', name: 'Licencia No Remunerada', isActive: true },
        ],
      },
    },
  },

  // 7. PROYECTOS Y PLANEACIÓN
  proyectos: {
    moduleId: 'proyectos',
    moduleName: 'Proyectos STC y Planeación',
    catalogs: {
      linesOfBusiness: {
        key: 'linesOfBusiness',
        title: 'Líneas de Negocio Contractuales',
        description: 'División del portafolio técnico de la empresa.',
        hasCode: true,
        codeLabel: 'Prefijo',
        items: [
          { id: 'lob-1', name: 'Mantenimiento Preventivo & Correctivo STC', code: 'MNT', isActive: true },
          { id: 'lob-2', name: 'Montaje Electromecánico de Teleféricos', code: 'MNTJ', isActive: true },
          { id: 'lob-3', name: 'Overhaul Mayor de Cables y Mordazas', code: 'OVH', isActive: true },
          { id: 'lob-4', name: 'Consultoría e Interventoría Normativa EN 1709', code: 'CNS', isActive: true },
          { id: 'lob-5', name: 'Auditoría Técnica y Certificación HSEQ', code: 'AUD', isActive: true },
        ],
      },
      serviceTypes: {
        key: 'serviceTypes',
        title: 'Tipos de Servicio Técnico Específico',
        description: 'Alcances técnicos habituales en ofertas y contratos.',
        hasCode: false,
        items: [
          { id: 'st-1', name: 'Inspección Magneto-inductiva (MRT) de Cables', isActive: true },
          { id: 'st-2', name: 'Regulación y Ensayos No Destructivos (NDT) de Mordazas', isActive: true },
          { id: 'st-3', name: 'Alineación Láser de Poleas y Balancines', isActive: true },
          { id: 'st-4', name: 'Empalme y Tensionamiento de Cable Portador-Tractor', isActive: true },
          { id: 'st-5', name: 'Mantenimiento Integral de Reductores Principales', isActive: true },
          { id: 'st-6', name: 'Calibración de Sensores y Freno de Emergencia', isActive: true },
        ],
      },
      cities: {
        key: 'cities',
        title: 'Ciudades y Ubicaciones Frecuentes',
        description: 'Lugares de ejecución de contratos y proyectos.',
        hasCode: false,
        items: [
          { id: 'cty-1', name: 'Medellín / Antioquia (Líneas K, J, L, M, H, P - Metro)', isActive: true },
          { id: 'cty-2', name: 'La Paz / El Alto, Bolivia (Mi Teleférico - 10 Líneas)', isActive: true },
          { id: 'cty-3', name: 'Santo Domingo, República Dominicana (Teleférico L1 & L2)', isActive: true },
          { id: 'cty-4', name: 'Buriticá / Antioquia (Zijin Continental Gold)', isActive: true },
          { id: 'cty-5', name: 'San Martín (SXM) / Philipsburg (Rainforest Adventures)', isActive: true },
          { id: 'cty-6', name: 'Castries, Santa Lucía (Rainforest Adventures)', isActive: true },
          { id: 'cty-7', name: 'Braulio Carrillo & Jacó, Costa Rica (Rainforest Adventures)', isActive: true },
          { id: 'cty-8', name: 'San Miguelito / Panamá (CAF / Metro de Panamá)', isActive: true },
          { id: 'cty-9', name: 'Pereira / Risaralda (Megacable)', isActive: true },
          { id: 'cty-10', name: 'Manizales / Caldas (Líneas 1 y 2 Cable Aéreo)', isActive: true },
          { id: 'cty-11', name: 'Chicamocha & Cerro del Santísimo / Santander (PANACHI)', isActive: true },
          { id: 'cty-12', name: 'Ipiales / Nariño (Santuario Las Lajas)', isActive: true },
          { id: 'cty-13', name: 'Mérida / Caracas, Venezuela (Mukumbarí / Warairarepano)', isActive: true },
          { id: 'cty-14', name: 'San Salvador / Soyapango, El Salvador (FOVIAL / MOP)', isActive: true },
          { id: 'cty-15', name: 'Bogotá D.C. (TransMiCable Ciudad Bolívar / San Cristóbal)', isActive: true },
          { id: 'cty-16', name: 'Bariloche, Argentina (CAPSA Cerro Catedral)', isActive: true },
        ],
      },
      directCostCategories: {
        key: 'directCostCategories',
        title: 'Rubros de Costos Directos (Control de Proyecto)',
        description: 'Estructura de costos según la hoja oficial de control de Inteckno.',
        hasCode: true,
        codeLabel: 'Código',
        items: [
          { id: 'dcc-1', name: 'Mano de Obra Técnica Inteckno (HH)', code: 'mano_obra_itk', isActive: true },
          { id: 'dcc-2', name: 'Mano de Obra Externa / Especialistas', code: 'mano_obra_externa', isActive: true },
          { id: 'dcc-3', name: 'Transporte & Viáticos de Campo', code: 'viaticos_transporte', isActive: true },
          { id: 'dcc-4', name: 'Consumibles de Taller & EPP', code: 'consumibles_taller', isActive: true },
          { id: 'dcc-5', name: 'Inspección Electromagnética de Cables (MRT)', code: 'inspeccion_mrt', isActive: true },
          { id: 'dcc-6', name: 'Ensayos No Destructivos (END / NDT)', code: 'ensayos_end', isActive: true },
          { id: 'dcc-7', name: 'Análisis de Vibraciones & Tribología', code: 'analisis_vibraciones', isActive: true },
          { id: 'dcc-8', name: 'Termografía Infrarroja', code: 'termografia', isActive: true },
          { id: 'dcc-9', name: 'Materiales, Repuestos & Fabricación Mecánica', code: 'repuestos_fabricacion', isActive: true },
          { id: 'dcc-10', name: 'Subcontratos Especializados / Grúas e Izajes', code: 'subcontratos_gruas', isActive: true },
          { id: 'dcc-11', name: 'Imprevistos & Contingencia de Campo', code: 'imprevistos_contingencia', isActive: true },
        ],
      },
      deliverables: {
        key: 'deliverables',
        title: 'Entregables Clave de Ingeniería',
        description: 'Documentos, informes y actas entregables en actividades WBS.',
        hasCode: true,
        codeLabel: 'Tipo',
        items: [
          { id: 'del-1', name: 'Informe de Inspección Magneto-inductiva (MRT)', code: 'INF-MRT', isActive: true },
          { id: 'del-2', name: 'Certificado de Ensayo No Destructivo (END)', code: 'CERT-END', isActive: true },
          { id: 'del-3', name: 'Acta de Montaje y Alineación de Balancines', code: 'ACT-ALIN', isActive: true },
          { id: 'del-4', name: 'Registro de Empalme y Tensión de Cable Tractor', code: 'REG-EMP', isActive: true },
          { id: 'del-5', name: 'Dossier de Calidad y Calibración de Equipos', code: 'DOS-CAL', isActive: true },
          { id: 'del-6', name: 'Plan de Trabajo Seguro en Alturas (ARO/ATS)', code: 'ARO-ALT', isActive: true },
          { id: 'del-7', name: 'Informe de Diagnóstico y Plan de Mantenimiento', code: 'INF-MNT', isActive: true },
          { id: 'del-8', name: 'Acta de Entrega y Puesta en Marcha', code: 'ACT-FIN', isActive: true },
        ],
      },
      priorities: {
        key: 'priorities',
        title: 'Niveles de Prioridad Técnica',
        description: 'Clasificación de urgencia y criticidad operativa.',
        hasCode: true,
        codeLabel: 'Nivel',
        items: [
          { id: 'pri-1', name: 'Prioridad Alta (Crítica)', code: 'ALTA', isActive: true },
          { id: 'pri-2', name: 'Prioridad Media (Normal)', code: 'MEDIA', isActive: true },
          { id: 'pri-3', name: 'Prioridad Baja (Rutinaria)', code: 'BAJA', isActive: true },
        ],
      },
      resources: {
        key: 'resources',
        title: 'Recursos Técnicos y Cuadrillas Especializadas',
        description: 'Mano de obra certificada, herramientas y equipos asignables.',
        hasCode: true,
        codeLabel: 'Categoría',
        items: [
          { id: 'rec-1', name: 'Inspector Nivel II END (MRT / Ultrasonido)', code: 'PERSONAL', isActive: true },
          { id: 'rec-2', name: 'Técnico Especialista en Empalme de Cables STC', code: 'PERSONAL', isActive: true },
          { id: 'rec-3', name: 'Cuadrilla de Montaje y Mantenimiento en Alturas', code: 'CUADRILLA', isActive: true },
          { id: 'rec-4', name: 'Supervisor Técnico Mecánico de Teleféricos', code: 'LIDERAZGO', isActive: true },
          { id: 'rec-5', name: 'Ingeniero Residente de Proyecto', code: 'LIDERAZGO', isActive: true },
          { id: 'rec-6', name: 'Gestor HSEQ y Coordinador de Alturas', code: 'SEGURIDAD', isActive: true },
          { id: 'rec-7', name: 'Magnetógrafo MRT Intron con Cabezal Sensor', code: 'EQUIPO', isActive: true },
          { id: 'rec-8', name: 'Detector de Defectos por Ultrasonido Krautkrämer', code: 'EQUIPO', isActive: true },
          { id: 'rec-9', name: 'Tirfor y Equipo de Tracción de Cable', code: 'HERRAMIENTA', isActive: true },
          { id: 'rec-10', name: 'Prensa Hidráulica y Mordazas de Tensión', code: 'HERRAMIENTA', isActive: true },
          { id: 'rec-11', name: 'Kit de Rescate y Evacuación en Línea', code: 'SEGURIDAD', isActive: true },
        ],
      },
    },
  },

  // 8. MANTENIMIENTO Y OPERACIONES AVANZADAS
  mantenimiento: {
    moduleId: 'mantenimiento',
    moduleName: 'Mantenimiento y Operaciones Avanzadas',
    catalogs: {
      criticalComponents: {
        key: 'criticalComponents',
        title: 'Componentes Críticos de Cable (Normas EN 1709 / EN 12929)',
        description: 'Elementos de seguridad crítica sujetos a planes preventivos.',
        hasCode: true,
        codeLabel: 'Subsistema',
        items: [
          { id: 'cc-1', name: 'Cable Portador-Tractor (Empalme & Almas)', code: 'LINEA', isActive: true },
          { id: 'cc-2', name: 'Pinzas / Mordazas Desembragables (Resortes & Levas)', code: 'VEHICULO', isActive: true },
          { id: 'cc-3', name: 'Balancines de Apoyo & Poleas de Guía', code: 'PILONA', isActive: true },
          { id: 'cc-4', name: 'Reductor Mecánico Principal & Corona Dentada', code: 'ESTACION', isActive: true },
          { id: 'cc-5', name: 'Motor Diésel Auxiliar de Evacuación', code: 'RESPALDO', isActive: true },
          { id: 'cc-6', name: 'Freno de Emergencia Hidráulico sobre Polea Motriz', code: 'SEGURIDAD', isActive: true },
          { id: 'cc-7', name: 'Circuito de Seguridad Eléctrico & Parada de Emergencia', code: 'AUTOMACION', isActive: true },
        ],
      },
      frequencies: {
        key: 'frequencies',
        title: 'Frecuencias de Inspección Programadas',
        description: 'Periodicidad de rutinas técnicas según manuales STC.',
        hasCode: false,
        items: [
          { id: 'fq-1', name: 'Diaria / Antes de Apertura al Público (8h)', isActive: true },
          { id: 'fq-2', name: 'Semanal / Rutina Básica (50h)', isActive: true },
          { id: 'fq-3', name: 'Mensual / Lubricación y Ajustes (200h)', isActive: true },
          { id: 'fq-4', name: 'Trimestral / Verificación NDT (500h)', isActive: true },
          { id: 'fq-5', name: 'Semestral / Revisión Mayor de Pilonas (1.000h)', isActive: true },
          { id: 'fq-6', name: 'Anual / Parada Mayor Normativa (2.000h)', isActive: true },
        ],
      },
      otPriorities: {
        key: 'otPriorities',
        title: 'Prioridades de Órdenes de Trabajo (OT)',
        description: 'Niveles de urgencia para atención en taller y campo.',
        hasCode: false,
        items: [
          { id: 'otp-1', name: 'Crítica (Parada de Operación o Riesgo Alto)', isActive: true },
          { id: 'otp-2', name: 'Alta (Atención requerida ≤ 24 Horas)', isActive: true },
          { id: 'otp-3', name: 'Media (Programable en Ventana Nocturna)', isActive: true },
          { id: 'otp-4', name: 'Baja (Mantenimiento Estándar)', isActive: true },
        ],
      },
    },
  },

  // 9. GESTIÓN DOCUMENTAL
  documentos: {
    moduleId: 'documentos',
    moduleName: 'Gestión Documental & Planos',
    catalogs: {
      categories: {
        key: 'categories',
        title: 'Categorías Documentales',
        description: 'Tipos de archivos para el archivo técnico de proyectos.',
        hasCode: true,
        codeLabel: 'Prefijo',
        items: [
          { id: 'doc-1', name: 'Planos CAD / As-Built y Memorias de Cálculo', code: 'PLN', isActive: true },
          { id: 'doc-2', name: 'Certificados de Calidad de Materiales y Cables', code: 'CERT', isActive: true },
          { id: 'doc-3', name: 'Protocolos de Prueba y Ensayos NDT', code: 'PRT', isActive: true },
          { id: 'doc-4', name: 'Manuales de Operación & Fabricante OEM', code: 'MAN', isActive: true },
          { id: 'doc-5', name: 'Informes HSEQ, ATS y Permisos de Alturas', code: 'SST', isActive: true },
          { id: 'doc-6', name: 'Actas de Recibo Parcial y Contratos', code: 'ACT', isActive: true },
        ],
      },
      departments: {
        key: 'departments',
        title: 'Áreas Responsables / Departamentos',
        description: 'Departamentos para asignación de carpetas y archivos.',
        hasCode: false,
        items: [
          { id: 'dd-1', name: 'Operaciones', isActive: true },
          { id: 'dd-2', name: 'HSEQ', isActive: true },
          { id: 'dd-3', name: 'Comercial', isActive: true },
          { id: 'dd-4', name: 'Ingeniería', isActive: true },
          { id: 'dd-5', name: 'Administración', isActive: true },
          { id: 'dd-6', name: 'Sistemas', isActive: true },
        ],
      },
      scopes: {
        key: 'scopes',
        title: 'Ámbitos de Almacenamiento',
        description: 'Nivel de visibilidad y acceso de las carpetas.',
        hasCode: false,
        items: [
          { id: 'sc-1', name: 'Empresa', isActive: true },
          { id: 'sc-2', name: 'Mi Unidad (Personal)', isActive: true },
          { id: 'sc-3', name: 'Compartido', isActive: true },
        ],
      },
      fileTypes: {
        key: 'fileTypes',
        title: 'Tipos y Extensiones de Archivo',
        description: 'Formatos admitidos para planos y documentación técnica.',
        hasCode: true,
        codeLabel: 'Extensión',
        items: [
          { id: 'ft-1', name: 'PDF / CAD y Memorias Técnicas', code: 'PDF', isActive: true },
          { id: 'ft-2', name: 'DWG / DXF / Modelos BIM', code: 'DWG', isActive: true },
          { id: 'ft-3', name: 'Hoja de Cálculo Excel / Matriz', code: 'XLSX', isActive: true },
          { id: 'ft-4', name: 'Informe Técnico Word / Doc', code: 'DOCX', isActive: true },
          { id: 'ft-5', name: 'Paquete Comprimido ZIP / RAR', code: 'ZIP', isActive: true },
          { id: 'ft-6', name: 'Registro Fotográfico / JPG / PNG', code: 'IMG', isActive: true },
        ],
      },
    },
  },

  // 10. CALENDARIO DE OPERACIONES
  calendario: {
    moduleId: 'calendario',
    moduleName: 'Calendario de Operaciones',
    catalogs: {
      eventTypes: {
        key: 'eventTypes',
        title: 'Tipos de Evento y Reunión',
        description: 'Clasificación de actividades en la agenda de teleféricos.',
        hasCode: true,
        codeLabel: 'Clave',
        items: [
          { id: 'evt-1', name: 'Visita de Campo', code: 'visita_campo', isActive: true },
          { id: 'evt-2', name: 'Inspección STC', code: 'inspeccion_stc', isActive: true },
          { id: 'evt-3', name: 'Entrega de Hito (Cobro 48h)', code: 'entrega_hito', isActive: true },
          { id: 'evt-4', name: 'Parada Programada', code: 'parada_tecnica', isActive: true },
          { id: 'evt-5', name: 'Comité Gerencial', code: 'comite_gerencial', isActive: true },
          { id: 'evt-6', name: 'Auditoría HSEQ', code: 'auditoria_hseq', isActive: true },
          { id: 'evt-7', name: 'Capacitación Técnica SST', code: 'capacitacion_sst', isActive: true },
        ],
      },
      modalities: {
        key: 'modalities',
        title: 'Modalidades de Reunión',
        description: 'Formato de asistencia presencial o virtual.',
        hasCode: false,
        items: [
          { id: 'mod-1', name: 'Presencial en Campo / Estación', isActive: true },
          { id: 'mod-2', name: 'Microsoft Teams', isActive: true },
          { id: 'mod-3', name: 'Google Meet / Zoom', isActive: true },
          { id: 'mod-4', name: 'Híbrida (Presencial + Teams)', isActive: true },
        ],
      },
      reminderTimes: {
        key: 'reminderTimes',
        title: 'Alertas de Recordatorio',
        description: 'Tiempos de anticipación para avisos y notificaciones.',
        hasCode: true,
        codeLabel: 'Minutos',
        items: [
          { id: 'rem-0', name: 'Sin recordatorio', code: '0', isActive: true },
          { id: 'rem-5', name: '5 minutos antes', code: '5', isActive: true },
          { id: 'rem-15', name: '15 minutos antes', code: '15', isActive: true },
          { id: 'rem-30', name: '30 minutos antes', code: '30', isActive: true },
          { id: 'rem-60', name: '1 hora antes', code: '60', isActive: true },
          { id: 'rem-120', name: '2 horas antes', code: '120', isActive: true },
          { id: 'rem-1440', name: '1 día antes', code: '1440', isActive: true },
          { id: 'rem-10080', name: '1 semana antes', code: '10080', isActive: true },
        ],
      },
      meetingRooms: {
        key: 'meetingRooms',
        title: 'Salas y Ubicaciones Frecuentes',
        description: 'Puntos físicos y virtuales de encuentro.',
        hasCode: false,
        items: [
          { id: 'mr-1', name: 'Sala de Juntas Principal (Medellín)', isActive: true },
          { id: 'mr-2', name: 'Sala Técnica de Ingeniería STC', isActive: true },
          { id: 'mr-3', name: 'Estación de Teleférico (En Sitio)', isActive: true },
          { id: 'mr-4', name: 'Base Operativa de Obra', isActive: true },
          { id: 'mr-5', name: 'Taller Central & Banco de Ensayos', isActive: true },
        ],
      },
    },
  },

  // 11. ACTIVIDADES PENDIENTES
  actividades: {
    moduleId: 'actividades',
    moduleName: 'Actividades & Tareas Operativas',
    catalogs: {
      categories: {
        key: 'categories',
        title: 'Categorías de Compromisos',
        description: 'Clasificación de actividades para seguimiento.',
        hasCode: false,
        items: [
          { id: 'ac-1', name: 'Operativa de Campo', isActive: true },
          { id: 'ac-2', name: 'Revisión y Firma de Planos', isActive: true },
          { id: 'ac-3', name: 'Compras y Cotizaciones Urgentes', isActive: true },
          { id: 'ac-4', name: 'Seguridad HSEQ y Certificaciones', isActive: true },
          { id: 'ac-5', name: 'Administrativa y Financiera', isActive: true },
        ],
      },
      priorities: {
        key: 'priorities',
        title: 'Niveles de Prioridad',
        description: 'Urgencia de entrega de tareas.',
        hasCode: false,
        items: [
          { id: 'pr-1', name: 'Urgente / Inmediata', isActive: true },
          { id: 'pr-2', name: 'Alta', isActive: true },
          { id: 'pr-3', name: 'Media', isActive: true },
          { id: 'pr-4', name: 'Baja', isActive: true },
        ],
      },
    },
  },

  // 12. ARTÍCULOS & WIKI TÉCNICA
  articulos: {
    moduleId: 'articulos',
    moduleName: 'Artículos & Wiki Técnica',
    catalogs: {
      categories: {
        key: 'categories',
        title: 'Categorías Técnicas de la Wiki',
        description: 'Temáticas especializadas en transporte por cable y normas EN/ISO.',
        hasCode: true,
        codeLabel: 'Clave',
        items: [
          { id: 'wk-1', name: 'Cables & Ensayos MRT', code: 'mantenimiento_cables', isActive: true },
          { id: 'wk-2', name: 'Pinzas & Mordazas Desembragables', code: 'mordazas_pinzas', isActive: true },
          { id: 'wk-3', name: 'Poleas & Balancines', code: 'balancines_poleas', isActive: true },
          { id: 'wk-4', name: 'Seguridad en Alturas SST', code: 'seguridad_alturas', isActive: true },
          { id: 'wk-5', name: 'Normativa EN 1709 / EN 12929', code: 'normativa_stc', isActive: true },
          { id: 'wk-6', name: 'Procedimientos Operativos Estándar (POE)', code: 'procedimientos_poe', isActive: true },
        ],
      },
      readTimes: {
        key: 'readTimes',
        title: 'Tiempos Estimados de Lectura',
        description: 'Duración promedio de consulta del artículo técnico.',
        hasCode: false,
        items: [
          { id: 'rt-1', name: '3 min', isActive: true },
          { id: 'rt-2', name: '5 min', isActive: true },
          { id: 'rt-3', name: '10 min', isActive: true },
          { id: 'rt-4', name: '15 min', isActive: true },
          { id: 'rt-5', name: '30 min', isActive: true },
        ],
      },
    },
  },

  // 13. USUARIOS TI & PERFILES
  'usuarios-ti': {
    moduleId: 'usuarios-ti',
    moduleName: 'Administración de Usuarios TI & Accesos',
    catalogs: {
      departments: {
        key: 'departments',
        title: 'Departamentos Organizacionales',
        description: 'Áreas a las que pertenece el personal de la empresa.',
        hasCode: false,
        items: [
          { id: 'uti-d1', name: 'Operaciones de Campo', isActive: true },
          { id: 'uti-d2', name: 'Ingeniería y Proyectos', isActive: true },
          { id: 'uti-d3', name: 'Gestión Comercial', isActive: true },
          { id: 'uti-d4', name: 'Cadena de Suministro', isActive: true },
          { id: 'uti-d5', name: 'Administración y Finanzas', isActive: true },
          { id: 'uti-d6', name: 'SST y Sostenibilidad', isActive: true },
          { id: 'uti-d7', name: 'Sistemas y Tecnología', isActive: true },
          { id: 'uti-d8', name: 'Negocios Internacionales y ERP', isActive: true },
        ],
      },
      roles: {
        key: 'roles',
        title: 'Roles y Perfiles de Acceso',
        description: 'Nivel de permisos y visibilidad dentro del ERP.',
        hasCode: true,
        codeLabel: 'Código Rol',
        items: [
          { id: 'uti-r1', name: 'Gerente General', code: 'gerente_general', isActive: true },
          { id: 'uti-r2', name: 'Gerente Administrativa', code: 'gerente_administrativa', isActive: true },
          { id: 'uti-r3', name: 'Líder / Coordinador de Proyectos', code: 'lider_proyectos', isActive: true },
          { id: 'uti-r4', name: 'Gerente de Proyectos STC', code: 'gerente_proyectos', isActive: true },
          { id: 'uti-r5', name: 'Líder de Ingeniería', code: 'lider_ingenieria', isActive: true },
          { id: 'uti-r6', name: 'Ingeniero de Proyectos', code: 'ingeniero_proyectos', isActive: true },
          { id: 'uti-r7', name: 'Supervisor Técnico de Campo', code: 'supervisor_tecnico', isActive: true },
          { id: 'uti-r8', name: 'Técnico Especialista STC', code: 'tecnico_stc', isActive: true },
          { id: 'uti-r9', name: 'Coordinador Comercial', code: 'coord_comercial', isActive: true },
          { id: 'uti-r10', name: 'Comprador Técnico', code: 'coord_compras', isActive: true },
          { id: 'uti-r11', name: 'Almacenista Técnico', code: 'almacenista', isActive: true },
          { id: 'uti-r12', name: 'Coordinadora HSEQ / SST', code: 'hseq', isActive: true },
          { id: 'uti-r13', name: 'Asistente Negocios Internacionales', code: 'asistente_negocios_internacionales', isActive: true },
          { id: 'uti-r14', name: 'Contador Externo', code: 'contador_externo', isActive: true },
          { id: 'uti-r15', name: 'Administrador de Sistemas & TI', code: 'admin_sistemas', isActive: true },
        ],
      },
    },
  },

  // 14. CONVERSACIONES INTERNAS
  conversaciones: {
    moduleId: 'conversaciones',
    moduleName: 'Conversaciones Internas',
    catalogs: {
      channelTypes: {
        key: 'channelTypes',
        title: 'Tipos de Canal de Comunicación',
        description: 'Clasificación de canales para el equipo.',
        hasCode: false,
        items: [
          { id: 'ct-1', name: 'Canal Público de Área', isActive: true },
          { id: 'ct-2', name: 'Grupo de Proyecto Específico', isActive: true },
          { id: 'ct-3', name: 'Canal de Alertas Técnicas & Monitoreo', isActive: true },
          { id: 'ct-4', name: 'Comité de Dirección', isActive: true },
        ],
      },
      purposes: {
        key: 'purposes',
        title: 'Finalidades del Canal',
        description: 'Objetivo de comunicación del grupo.',
        hasCode: false,
        items: [
          { id: 'cp-1', name: 'Coordinación Operativa de Campo', isActive: true },
          { id: 'cp-2', name: 'Soporte de Emergencia STC', isActive: true },
          { id: 'cp-3', name: 'Seguridad HSEQ e Incidentes', isActive: true },
          { id: 'cp-4', name: 'General & Anuncios Corporativos', isActive: true },
        ],
      },
    },
  },

  // 15. REQUISICIONES DE MATERIALES
  requisitions: {
    moduleId: 'requisitions',
    moduleName: 'Requisiciones y Pedidos Internos',
    catalogs: {
      requisitionTypes: {
        key: 'requisitionTypes',
        title: 'Tipos de Requisición',
        description: 'Clasificación de solicitudes desde obra o almacén.',
        hasCode: false,
        items: [
          { id: 'req-1', name: 'Repuesto Crítico STC', isActive: true },
          { id: 'req-2', name: 'Herramienta e Instrumentación', isActive: true },
          { id: 'req-3', name: 'EPP y Alturas', isActive: true },
          { id: 'req-4', name: 'Insumo y Consumible Químico', isActive: true },
          { id: 'req-5', name: 'Servicio Externo de Taller', isActive: true },
        ],
      },
      urgencies: {
        key: 'urgencies',
        title: 'Niveles de Urgencia de Despacho',
        description: 'Prioridad de atención por parte de compras.',
        hasCode: false,
        items: [
          { id: 'urg-1', name: 'Inmediata (Parada de Operación STC)', isActive: true },
          { id: 'urg-2', name: 'Alta (Requerida ≤ 24 Horas)', isActive: true },
          { id: 'urg-3', name: 'Normal (Atención en Ventana Regular)', isActive: true },
        ],
      },
    },
  },

  // 16. HSEQ Y SEGURIDAD
  'hseq-gate': {
    moduleId: 'hseq-gate',
    moduleName: 'Control de Seguridad HSEQ & SST',
    catalogs: {
      inspectionTypes: {
        key: 'inspectionTypes',
        title: 'Tipos de Inspección y Permisos HSEQ',
        description: 'Checklists de control y permisos de trabajo.',
        hasCode: false,
        items: [
          { id: 'hseq-1', name: 'Permiso de Trabajo Seguro en Alturas', isActive: true },
          { id: 'hseq-2', name: 'Verificación de Líneas de Vida y Arneses', isActive: true },
          { id: 'hseq-3', name: 'Bloqueo y Etiquetado LOTO', isActive: true },
          { id: 'hseq-4', name: 'Inspección Pre-operacional de Equipos', isActive: true },
          { id: 'hseq-5', name: 'Análisis de Trabajo Seguro (ATS)', isActive: true },
        ],
      },
      riskLevels: {
        key: 'riskLevels',
        title: 'Niveles de Riesgo Evaluado',
        description: 'Clasificación de severidad y medidas preventivas.',
        hasCode: false,
        items: [
          { id: 'risk-1', name: 'Bajo (Controlado con EPP Básico)', isActive: true },
          { id: 'risk-2', name: 'Medio (Requiere Permiso Específico)', isActive: true },
          { id: 'risk-3', name: 'Alto (Parada Preventiva hasta Mitigar)', isActive: true },
          { id: 'risk-4', name: 'Crítico / Inminente', isActive: true },
        ],
      },
    },
  },

  // 17. NEGOCIOS INTERNACIONALES
  international: {
    moduleId: 'international',
    moduleName: 'Negocios Internacionales STC',
    catalogs: {
      incoterms: {
        key: 'incoterms',
        title: 'Términos de Comercio Incoterms',
        description: 'Condiciones de entrega para importaciones y exportaciones.',
        hasCode: true,
        codeLabel: 'Incoterm',
        items: [
          { id: 'inc-1', name: 'CIF (Cost, Insurance and Freight)', code: 'CIF', isActive: true },
          { id: 'inc-2', name: 'FOB (Free on Board)', code: 'FOB', isActive: true },
          { id: 'inc-3', name: 'EXW (Ex Works Fábrica)', code: 'EXW', isActive: true },
          { id: 'inc-4', name: 'DDP (Delivered Duty Paid)', code: 'DDP', isActive: true },
          { id: 'inc-5', name: 'CIP (Carriage and Insurance Paid)', code: 'CIP', isActive: true },
        ],
      },
      latamMarkets: {
        key: 'latamMarkets',
        title: 'Mercados y Países Objetivo LATAM',
        description: 'Países con proyectos activos o licitaciones de teleféricos.',
        hasCode: true,
        codeLabel: 'Código País',
        items: [
          { id: 'lm-1', name: 'Colombia', code: 'COL', isActive: true },
          { id: 'lm-2', name: 'Ecuador', code: 'ECU', isActive: true },
          { id: 'lm-3', name: 'México', code: 'MEX', isActive: true },
          { id: 'lm-4', name: 'Bolivia', code: 'BOL', isActive: true },
          { id: 'lm-5', name: 'Chile', code: 'CHL', isActive: true },
          { id: 'lm-6', name: 'Perú', code: 'PER', isActive: true },
        ],
      },
      currencies: {
        key: 'currencies',
        title: 'Monedas de Negociación',
        description: 'Divisas para cotizaciones y contratos.',
        hasCode: true,
        codeLabel: 'Símbolo',
        items: [
          { id: 'cur-1', name: 'USD - Dólar Americano', code: 'USD', isActive: true },
          { id: 'cur-2', name: 'EUR - Euro', code: 'EUR', isActive: true },
          { id: 'cur-3', name: 'COP - Peso Colombiano', code: 'COP', isActive: true },
        ],
      },
    },
  },

  // 17.B RADAR DE OPORTUNIDADES & LICITACIONES GLOBALES
  'radar-oportunidades': {
    moduleId: 'radar-oportunidades',
    moduleName: 'Radar de Oportunidades & Licitaciones Globales',
    catalogs: {
      monitoredCountries: {
        key: 'monitoredCountries',
        title: 'Países y Mercados Monitoreados',
        description: 'Mercados globales donde el Radar y la IA rastrean licitaciones de sistemas por cable (STC).',
        hasCode: true,
        codeLabel: 'Código País',
        items: [
          { id: 'cnt-1', name: 'Colombia', code: 'COL', isActive: true },
          { id: 'cnt-2', name: 'México', code: 'MEX', isActive: true },
          { id: 'cnt-3', name: 'Bolivia', code: 'BOL', isActive: true },
          { id: 'cnt-4', name: 'Perú', code: 'PER', isActive: true },
          { id: 'cnt-5', name: 'Chile', code: 'CHL', isActive: true },
          { id: 'cnt-6', name: 'Ecuador', code: 'ECU', isActive: true },
          { id: 'cnt-7', name: 'Estados Unidos', code: 'USA', isActive: true },
          { id: 'cnt-8', name: 'Suiza', code: 'CHE', isActive: true },
          { id: 'cnt-9', name: 'Austria', code: 'AUT', isActive: true },
          { id: 'cnt-10', name: 'Francia', code: 'FRA', isActive: true },
          { id: 'cnt-11', name: 'Italia', code: 'ITA', isActive: true },
          { id: 'cnt-12', name: 'España', code: 'ESP', isActive: true },
          { id: 'cnt-13', name: 'Brasil', code: 'BRA', isActive: true },
          { id: 'cnt-14', name: 'República Dominicana', code: 'DOM', isActive: true },
          { id: 'cnt-15', name: 'Panamá', code: 'PAN', isActive: true },
          { id: 'cnt-16', name: 'Costa Rica', code: 'CRI', isActive: true },
          { id: 'cnt-17', name: 'Argentina', code: 'ARG', isActive: true },
          { id: 'cnt-18', name: 'Canadá', code: 'CAN', isActive: true },
        ],
      },
      opportunityCategories: {
        key: 'opportunityCategories',
        title: 'Categorías de Contratación STC',
        description: 'Líneas técnicas y contractuales que la IA prioriza en el rastreo de compras.',
        hasCode: false,
        items: [
          { id: 'cat-1', name: 'Licitación Pública Internacional', isActive: true },
          { id: 'cat-2', name: 'Suministro de Repuestos y Mordazas', isActive: true },
          { id: 'cat-3', name: 'Mantenimiento Mayor STC & NDT', isActive: true },
          { id: 'cat-4', name: 'Fabricación de Balancines y Poleas', isActive: true },
          { id: 'cat-5', name: 'Proyectos Nuevos STC & Funiculares', isActive: true },
          { id: 'cat-6', name: 'Modernización de Motores y Tracción', isActive: true },
          { id: 'cat-7', name: 'Inspección Magneto-inductiva de Cables', isActive: true },
        ],
      },
      procurementPortals: {
        key: 'procurementPortals',
        title: 'Portales y Fuentes de Búsqueda',
        description: 'Plataformas estatales y gremiales conectadas al escáner de IA.',
        hasCode: false,
        items: [
          { id: 'port-1', name: 'SECOP II & Metro de Medellín (Colombia)', isActive: true },
          { id: 'port-2', name: 'CompraNet & Tianguis STE CDMX (México)', isActive: true },
          { id: 'port-3', name: 'SICOES & Portal Mi Teleférico (Bolivia)', isActive: true },
          { id: 'port-4', name: 'Mercado Público & Parquemet (Chile)', isActive: true },
          { id: 'port-5', name: 'SEACE & Plan COPESCO (Perú)', isActive: true },
          { id: 'port-6', name: 'SERCOP & Aerovía Guayaquil (Ecuador)', isActive: true },
          { id: 'port-7', name: 'SAM.gov Federal & NSAA (Estados Unidos)', isActive: true },
          { id: 'port-8', name: 'SIMAP Suiza & TED Europa', isActive: true },
        ],
      },
    },
  },

  // 18. GASTOS Y VIÁTICOS (CONFIGURACIÓN INTEGRADA)
  gastos: {
    moduleId: 'gastos',
    moduleName: 'Gastos y Viáticos de Campo',
    catalogs: {
      offices: {
        key: 'offices',
        title: 'Sedes y Centros de Costos Administrativos',
        description: 'Sedes u oficinas a las que se asignan gastos generales.',
        hasCode: true,
        codeLabel: 'Código Centro',
        items: [
          { id: 'off-1', name: 'Sede Principal Medellín (El Poblado)', code: 'ADM-MED-01', isActive: true },
          { id: 'off-2', name: 'Oficina Regional Bogotá D.C.', code: 'ADM-BOG-02', isActive: true },
          { id: 'off-3', name: 'Base Operativa & Taller Central STC', code: 'OPS-BASE-TALLER', isActive: true },
          { id: 'off-4', name: 'Sistemas & Infraestructura Cloud', code: 'TI-CLOUD-ERP', isActive: true },
        ],
      },
      paymentMethods: {
        key: 'paymentMethods',
        title: 'Métodos y Cuentas de Pago',
        description: 'Formas de pago utilizadas para compras y viáticos.',
        hasCode: false,
        items: [
          { id: 'pay-1', name: 'Efectivo', isActive: true },
          { id: 'pay-2', name: 'Tarjeta de Crédito Corporativa', isActive: true },
          { id: 'pay-3', name: 'Tarjeta Débito', isActive: true },
          { id: 'pay-4', name: 'Transferencia Bancolombia', isActive: true },
          { id: 'pay-5', name: 'Nequi / Daviplata', isActive: true },
          { id: 'pay-6', name: 'Caja Menor de Obra', isActive: true },
        ],
      },
      categories: {
        key: 'categories',
        title: 'Rubros Contables de Gasto',
        description: 'Categorías contables para legalización de comprobantes.',
        hasCode: false,
        items: [
          { id: 'cat-1', name: 'Alimentación en Terreno', code: 'viaticos_alimentacion', isActive: true },
          { id: 'cat-2', name: 'Transporte / Taxis / Combustible', code: 'tiquetes_transporte', isActive: true },
          { id: 'cat-3', name: 'Hospedaje en Obra', code: 'alojamiento', isActive: true },
          { id: 'cat-4', name: 'Materiales y Repuestos Urgentes', code: 'materiales_urgentes', isActive: true },
          { id: 'cat-5', name: 'Gastos Administrativos / Sede', code: 'gastos_oficina', isActive: true },
          { id: 'cat-6', name: 'Otros Gastos Operativos', code: 'otros', isActive: true },
        ],
      },
    },
  },

  // 19. CARGOS, ORGANIGRAMA Y RECLUTAMIENTO IA
  cargos: {
    moduleId: 'cargos',
    moduleName: 'Gestión de Cargos, Vacantes & Reclutamiento IA',
    catalogs: {
      departments: {
        key: 'departments',
        title: 'Departamentos Organizacionales',
        description: 'Áreas de la estructura corporativa de Inteckno.',
        hasCode: true,
        codeLabel: 'Sigla',
        items: [
          { id: 'cd-1', name: 'Dirección General', code: 'DG', isActive: true },
          { id: 'cd-2', name: 'Ingeniería y Proyectos', code: 'ING', isActive: true },
          { id: 'cd-3', name: 'Operaciones y Mantenimiento', code: 'OPS', isActive: true },
          { id: 'cd-4', name: 'Comercial y Licitaciones', code: 'COM', isActive: true },
          { id: 'cd-5', name: 'Cadena de Suministro', code: 'SUM', isActive: true },
          { id: 'cd-6', name: 'Administración y Finanzas', code: 'ADM', isActive: true },
          { id: 'cd-7', name: 'Talento Humano y SST', code: 'TH', isActive: true },
          { id: 'cd-8', name: 'Sistemas y TI', code: 'TI', isActive: true },
        ],
      },
      vacancyStatuses: {
        key: 'vacancyStatuses',
        title: 'Estados de Vacante',
        description: 'Condición del puesto en el proceso de reclutamiento.',
        hasCode: false,
        items: [
          { id: 'vs-1', name: 'Cargo Ocupado', isActive: true },
          { id: 'vs-2', name: 'Vacante Abierta', isActive: true },
          { id: 'vs-3', name: 'En Convocatoria / Reclutamiento', isActive: true },
          { id: 'vs-4', name: 'Congelado / Futura Expansión', isActive: true },
        ],
      },
      salaryBands: {
        key: 'salaryBands',
        title: 'Bandas Salariales y Niveles',
        description: 'Jerarquía de compensación para estructuración de nómina.',
        hasCode: true,
        codeLabel: 'Nivel',
        items: [
          { id: 'sb-1', name: 'Directivo / Gerencial ($12M - $18M COP)', code: 'NIVEL-1', isActive: true },
          { id: 'sb-2', name: 'Profesional Senior / Especialista ($6M - $10M COP)', code: 'NIVEL-2', isActive: true },
          { id: 'sb-3', name: 'Técnico Especialista STC / Inspector END ($3.5M - $5.5M COP)', code: 'NIVEL-3', isActive: true },
          { id: 'sb-4', name: 'Asistencial / Operativo de Campo ($2M - $3M COP)', code: 'NIVEL-4', isActive: true },
        ],
      },
    },
  },
};

// Aliases para submódulos relacionados que comparten configuración
export const MODULE_ALIASES: Record<string, string> = {
  // Proyectos e Ingeniería
  planeacion: 'proyectos',
  projects: 'proyectos',
  // Inventario & Abastecimiento
  'codigo-barras': 'inventario',
  inventory: 'inventario',
  procurement: 'compras',
  // CRM & Comercial
  contactos: 'crm',
  ventas: 'crm',
  whatsapp: 'crm',
  commercial: 'crm',
  // Talento Humano & Personal
  vacaciones: 'empleados',
  encuestas: 'empleados',
  nomina: 'empleados',
  // Administración & Financiera
  'firma-electronica': 'contabilidad',
  tableros: 'contabilidad',
  billing: 'contabilidad',
  facturacion: 'contabilidad',
  expenses: 'gastos',
  timesheet: 'registro-horas',
  dashboard: 'contabilidad',
  // Mantenimiento & Operaciones
  reparacion: 'mantenimiento',
  manufactura: 'mantenimiento',
  taller: 'mantenimiento',
  plm: 'mantenimiento',
  // Internacional
  'calculadora-precios': 'international',
  'leads-internacionales': 'radar-oportunidades',
  'radar-oportunidades': 'radar-oportunidades',
  // Transversales
  perfil: 'usuarios-ti',
  hseq: 'hseq-gate',
  requisiciones: 'requisitions',
};

// ============================================================================
// FUNCIONES NÚCLEO DE ACCESO Y PERSISTENCIA POR MÓDULO
// ============================================================================

export function getResolvedModuleId(moduleId: string): string {
  return MODULE_ALIASES[moduleId] || moduleId;
}

export function getModuleCatalogs(moduleId: string): ModuleConfigGroup {
  const resolvedId = getResolvedModuleId(moduleId);
  const defaultConfig = DEFAULT_MODULE_CONFIGS[resolvedId];

  if (!defaultConfig) {
    // Si es un módulo nuevo no listado, devolver configuración genérica
    return {
      moduleId: resolvedId,
      moduleName: `Módulo ${resolvedId}`,
      catalogs: {
        options: {
          key: 'options',
          title: 'Opciones Generales del Módulo',
          description: 'Opciones personalizadas para este módulo.',
          hasCode: true,
          codeLabel: 'Código',
          items: [
            { id: 'gen-1', name: 'Opción General 1', code: 'OPT-01', isActive: true },
            { id: 'gen-2', name: 'Opción General 2', code: 'OPT-02', isActive: true },
          ],
        },
      },
    };
  }

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${resolvedId.toUpperCase()}`);
    if (!raw) return defaultConfig;
    const parsed = JSON.parse(raw);
    return {
      moduleId: resolvedId,
      moduleName: parsed.moduleName || defaultConfig.moduleName,
      catalogs: { ...defaultConfig.catalogs, ...(parsed.catalogs || {}) },
    };
  } catch (e) {
    console.error(`Error cargando configuración para el módulo ${resolvedId}:`, e);
    return defaultConfig;
  }
}

export function saveModuleCatalogs(moduleId: string, config: ModuleConfigGroup): void {
  const resolvedId = getResolvedModuleId(moduleId);
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${resolvedId.toUpperCase()}`, JSON.stringify(config));
    // Notificar a todos los componentes que escuchan cambios en tiempo real
    window.dispatchEvent(
      new CustomEvent('inteckno:module-config-updated', {
        detail: { moduleId: resolvedId },
      })
    );
  } catch (e) {
    console.error(`Error guardando configuración para el módulo ${resolvedId}:`, e);
  }
}

export function resetModuleCatalogs(moduleId: string): ModuleConfigGroup {
  const resolvedId = getResolvedModuleId(moduleId);
  const defaultConfig = DEFAULT_MODULE_CONFIGS[resolvedId] || getModuleCatalogs(resolvedId);
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${resolvedId.toUpperCase()}`);
    window.dispatchEvent(
      new CustomEvent('inteckno:module-config-updated', {
        detail: { moduleId: resolvedId },
      })
    );
    return defaultConfig;
  } catch (e) {
    console.error(`Error restableciendo configuración para el módulo ${resolvedId}:`, e);
    return defaultConfig;
  }
}

export function getCatalogItems(moduleId: string, catalogKey: string): CatalogItem[] {
  const group = getModuleCatalogs(moduleId);
  const catalog = group.catalogs[catalogKey];
  return catalog ? catalog.items : [];
}

/**
 * Agrega un nuevo ítem a un catálogo específico de un módulo en tiempo de ejecución.
 * Persiste automáticamente en localStorage y notifica a todos los desplegables.
 */
export function addCatalogItem(
  moduleId: string,
  catalogKey: string,
  itemName: string,
  itemCode?: string
): CatalogItem {
  const resolvedId = getResolvedModuleId(moduleId);
  const config = getModuleCatalogs(resolvedId);
  const cat = config.catalogs[catalogKey];

  const newItem: CatalogItem = {
    id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    name: itemName.trim(),
    code: itemCode ? itemCode.trim() : undefined,
    isActive: true,
  };

  if (!cat) {
    config.catalogs[catalogKey] = {
      key: catalogKey,
      title: catalogKey,
      description: 'Opciones personalizadas',
      items: [newItem],
    };
  } else {
    // Si ya existe por nombre exacto, simplemente aseguramos que esté activo
    const existing = cat.items.find(
      (it) => it.name.trim().toLowerCase() === itemName.trim().toLowerCase()
    );
    if (existing) {
      if (!existing.isActive) {
        existing.isActive = true;
        saveModuleCatalogs(resolvedId, config);
      }
      return existing;
    }
    cat.items.push(newItem);
  }

  saveModuleCatalogs(resolvedId, config);
  return newItem;
}

// ============================================================================
// FUNCIONES ESPECÍFICAS DE COMPATIBILIDAD CON GASTOS (LEGACY)
// ============================================================================

export const DEFAULT_EXPENSES_CONFIG: ExpensesModuleConfig = {
  offices: DEFAULT_MODULE_CONFIGS.gastos.catalogs.offices.items.map((i) => ({
    id: i.id,
    name: i.name,
    code: i.code || '',
    isActive: i.isActive,
  })),
  paymentMethods: DEFAULT_MODULE_CONFIGS.gastos.catalogs.paymentMethods.items.map((i) => ({
    id: i.id,
    name: i.name,
    isActive: i.isActive,
  })),
  categories: DEFAULT_MODULE_CONFIGS.gastos.catalogs.categories.items.map((i) => ({
    id: i.id,
    key: i.code || i.id,
    label: i.name,
    isActive: i.isActive,
  })),
  defaultCurrency: 'COP',
};

export function getExpensesModuleConfig(): ExpensesModuleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EXPENSES_CONFIG);
    if (!raw) return DEFAULT_EXPENSES_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      offices: parsed.offices || DEFAULT_EXPENSES_CONFIG.offices,
      paymentMethods: parsed.paymentMethods || DEFAULT_EXPENSES_CONFIG.paymentMethods,
      categories: parsed.categories || DEFAULT_EXPENSES_CONFIG.categories,
      defaultCurrency: parsed.defaultCurrency || 'COP',
    };
  } catch (e) {
    console.error('Error cargando configuración del módulo de gastos:', e);
    return DEFAULT_EXPENSES_CONFIG;
  }
}

export function saveExpensesModuleConfig(config: ExpensesModuleConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_EXPENSES_CONFIG, JSON.stringify(config));
    window.dispatchEvent(
      new CustomEvent('inteckno:module-config-updated', {
        detail: { moduleId: 'gastos' },
      })
    );
  } catch (e) {
    console.error('Error guardando configuración del módulo de gastos:', e);
  }
}

export function resetExpensesModuleConfig(): ExpensesModuleConfig {
  try {
    localStorage.setItem(STORAGE_KEY_EXPENSES_CONFIG, JSON.stringify(DEFAULT_EXPENSES_CONFIG));
    window.dispatchEvent(
      new CustomEvent('inteckno:module-config-updated', {
        detail: { moduleId: 'gastos' },
      })
    );
    return DEFAULT_EXPENSES_CONFIG;
  } catch (e) {
    console.error('Error restableciendo configuración:', e);
    return DEFAULT_EXPENSES_CONFIG;
  }
}

/**
 * Hook reactivo para obtener los ítems activos de cualquier catálogo de cualquier módulo.
 * Se actualiza de manera inmediata ante cualquier cambio en el modal de configuración sin recargar la página.
 */
export function useModuleCatalog(moduleId: string, catalogKey: string): CatalogItem[] {
  const resolvedId = getResolvedModuleId(moduleId);
  const [items, setItems] = useState<CatalogItem[]>(() => {
    return getCatalogItems(resolvedId, catalogKey).filter((it) => it.isActive);
  });

  useEffect(() => {
    const handleUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail || !detail.moduleId || detail.moduleId === resolvedId) {
        const fresh = getCatalogItems(resolvedId, catalogKey).filter((it) => it.isActive);
        setItems(fresh);
      }
    };

    window.addEventListener('inteckno:module-config-updated', handleUpdate);
    return () => {
      window.removeEventListener('inteckno:module-config-updated', handleUpdate);
    };
  }, [resolvedId, catalogKey]);

  return items;
}


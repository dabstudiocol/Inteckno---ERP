/**
 * InventorySchema.ts
 * Arquitectura de Inventario Especializado para Inteckno S.A.S.
 * Transporte por Cable (Teleféricos, Sistemas STC) y Ensayos No Destructivos (END / NDT / MRT)
 */

export type TrackingType = 'SERIALIZADO' | 'AGREGADO';

export type PhysicalMatterState = 'solido' | 'liquido' | 'gas_vapor' | 'otro';

export type ChemicalComplianceStatus = 'VIGENTE' | 'POR_VENCER' | 'CUARENTENA' | 'NO_APLICA';

export type EquipmentInspectionReturnState = 'OPERATIVO' | 'GOLPEADO_DAÑADO' | 'REQUIERE_CALIBRACION' | 'INCOMPLETO';

export type InventoryWriteOffReason = 
  | 'RETAZO_INUTILIZABLE' 
  | 'OBSOLESCENCIA' 
  | 'DAÑO_MONTAÑA' 
  | 'CADUCIDAD_QUIMICO'
  | 'DESGASTE_NORMAL';

export type InventoryWriteOffStatus = 
  | 'PENDIENTE_APROBACION_GERENCIA' 
  | 'APROBADO_GERENCIA' 
  | 'RECHAZADO_GERENCIA';

export type WarehouseLocationType = 
  | 'BODEGA_PRINCIPAL' 
  | 'TALLER_CENTRAL' 
  | 'VEHICULO_CUADRILLA' 
  | 'ESTACION_MONTAÑA' 
  | 'CUARENTENA';

// ----------------------------------------------------------------------------
// A. MOTOR DIMENSIONAL (CABLES Y CONDUCTORES STC)
// ----------------------------------------------------------------------------
export interface PhysicalCableSegment {
  idTramo: string; // ej. TRAMO-CAB-01-A
  longitudMetros: number; // Longitud exacta en metros
  diametroMm?: number; // ej. 48mm, 52mm
  tipoCable?: string; // ej. Portante, Tractor, Señalización, Contrapeso
  fabricante?: string; // ej. Fatzer, Teufelberger, Redaelli
  carreteNumero?: string; // Número de carrete / tambor
  estado: 'DISPONIBLE' | 'RESERVADO' | 'RETACEADO_INUTILIZABLE' | 'CONSUMIDO';
  ubicacionBodega?: string;
  codigoProyectoDestino?: string;
  fechaIngreso?: string;
  observaciones?: string;
}

// ----------------------------------------------------------------------------
// B. KITTING (KITS DE INSPECCIÓN END / NDT)
// ----------------------------------------------------------------------------
export interface KitComponentItem {
  productId: string;
  productSku: string;
  productName: string;
  quantityRequired: number;
  unit: string;
  isConsumable: boolean; // Si es consumible (aerosol, paño) se descuenta permanentemente; si es equipo (yugo) sale a préstamo
}

// ----------------------------------------------------------------------------
// F. CONVERSIÓN DINÁMICA DE UNIDADES (UoM)
// ----------------------------------------------------------------------------
export interface UnitConversionRule {
  unidadDeCompra: string; // ej. Galón, Caneca 55 Gal, Tambor
  unidadDeConsumo: string; // ej. Litro, Mililitro, Onza, Gramo
  factorDeConversion: number; // Multiplicador para pasar de unidad de compra a unidad de consumo (ej. 1 Gal = 3785.41 ml)
}

// ----------------------------------------------------------------------------
// G. LOTES Y FEFO PARA QUÍMICOS Y LUBRICANTES END
// ----------------------------------------------------------------------------
export interface ChemicalLotFEFO {
  numeroLote: string;
  fechaFabricacion?: string;
  fechaVencimiento: string; // ISO Date YYYY-MM-DD
  cantidadDisponible: number;
  unidad: string;
  estado: ChemicalComplianceStatus;
  certificadoCalidadUrl?: string;
  temperaturaAlmacenamientoMin?: number; // °C
  temperaturaAlmacenamientoMax?: number; // °C
}

// ----------------------------------------------------------------------------
// E. HISTORIAL CHECK-IN / CHECK-OUT DE ACTIVOS FIJOS Y EQUIPOS END
// ----------------------------------------------------------------------------
export interface EquipmentCheckEvent {
  id: string;
  fecha: string;
  tipo: 'DESPACHO_OBRA' | 'RETORNO_OBRA';
  tecnicoId: string;
  tecnicoNombre: string;
  codigoProyecto: string;
  estadoEquipo: EquipmentInspectionReturnState;
  nivelBateriaPct?: number;
  accesoriosCompletos: boolean;
  danosReportados?: string;
  inspeccionVisualOk: boolean;
  fotosEstadoUrl?: string[];
}

// ----------------------------------------------------------------------------
// PASO 3: KARDEX TRANSACCIONAL DE BAJAS DE INVENTARIO (MERMAS, RETAZOS, DAÑOS)
// ----------------------------------------------------------------------------
export interface InventoryWriteOffRequest {
  id: string;
  codigoSolicitud: string; // ej. BAJA-2026-001
  fechaSolicitud: string;
  solicitanteId: string;
  solicitanteNombre: string;
  solicitanteCargo: string;
  
  productId: string;
  productSku: string;
  productName: string;
  
  // Si aplica a cable dimensional
  idTramo?: string;
  longitudMetros?: number;

  cantidad: number;
  unidad: string;
  valorEstimadoCOP: number;

  motivo: InventoryWriteOffReason;
  descripcionDetallada: string;
  centroCostosProyectoId?: string;
  centroCostosProyectoCodigo: string; // Regla de negocio: Todo proyecto es su centro de costos

  estado: InventoryWriteOffStatus;
  aprobadoPorId?: string;
  aprobadoPorNombre?: string;
  fechaAprobacion?: string;
  motivoRechazo?: string;
  
  evidenciaFotosUrl?: string[];
  actaBajaFirmadaUrl?: string;
}

// ----------------------------------------------------------------------------
// EXTENSIÓN INTEGRAL DEL PRODUCTO PARA INTECKNO S.A.S.
// ----------------------------------------------------------------------------
export interface IntecknoProductExtended {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  costPriceCOP: number;
  costPriceUSD: number;

  // C. Stock Físico vs Operativo
  stockFisico: number; // Conteo real en bodega
  stockReservado: number; // Apartado para mantenimientos / proyectos
  availableStock: number; // Stock Operativo Disponible = stockFisico - stockReservado
  realStock?: number; // Alias para compatibilidad con código existente
  minStock: number;

  // H. Clasificación
  trackingType: TrackingType; // SERIALIZADO (Equipos MRT/UT) vs AGREGADO (Consumibles)
  serialNumber?: string;
  placaActivoFijo?: string;

  // A. Motor Dimensional (Cables de Teleférico)
  isDimensional?: boolean;
  segmentosFisicos?: PhysicalCableSegment[];

  // B. Kitting (Kits de Inspección)
  isKit?: boolean;
  kitItems?: KitComponentItem[];

  // D. Bodegas Móviles y Ubicación
  locationType?: WarehouseLocationType;
  locationName: string;
  shelf: string;
  vehiculoCuadrillaId?: string; // En caso de estar asignado a una camioneta de cuadrilla

  // E. Equipos END / MRT y Calibración
  calibrationInfo?: string;
  isCalibrated?: boolean;
  calibrationDate?: string;
  calibrationExpiry?: string;
  calibrationCertNumber?: string;
  equipmentCondition?: EquipmentInspectionReturnState;
  checkEvents?: EquipmentCheckEvent[];

  // F. UoM Conversion
  uomConversion?: UnitConversionRule;

  // G. Químicos y FEFO
  isChemicalEND?: boolean;
  lotesFEFO?: ChemicalLotFEFO[];

  // Atributos generales
  isCriticalSpare: boolean;
  isHomologatedITK: boolean;
  physicalState?: PhysicalMatterState | string;
  purchaseDate?: string;
  safetyDataSheetUrl?: string;
  technicalDataSheetUrl?: string;
  observations?: string;
  supplierName?: string;
  supplierNit?: string;
}

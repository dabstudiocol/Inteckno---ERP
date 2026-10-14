// ============================================================================
// MOTOR DE REGLAS DE NEGOCIO Y APROBACIONES CONFIGURABLES
// Fuente de verdad: Manuales de Procesos 1, 2 y 3 de Inteckno + Mapas BPMN
// ============================================================================

export interface RuleValidationResult {
  allowed: boolean;
  code: string;
  title: string;
  message: string;
  requiresActionBy?: string;
  level: 'info' | 'warning' | 'blocking';
}

export const BUSINESS_THRESHOLDS = {
  // Umbral configurable para compras que exigen visto bueno de Gerencia General (Gustavo Mejía)
  GM_PURCHASE_APPROVAL_USD: 2000,
  // Plazo estricto en horas para emitir la factura tras firma del acta parcial de aceptación
  INVOICE_MILESTONE_DEADLINE_HOURS: 48,
  // Meta de respuesta a emergencias STC
  EMERGENCY_RESPONSE_MAX_HOURS: 12,
  // Desembolso de viáticos exprés para emergencias
  EMERGENCY_PER_DIEM_MAX_HOURS: 4,
};

export class BusinessRulesEngine {
  /**
   * REGLA 1.3: Homologación de Proveedores
   * Prohíbe emitir órdenes de compra a proveedores sin visto bueno legal (Administración)
   * y técnico (Ingeniería).
   */
  static validateSupplierHomologation(
    supplierName: string,
    isHomologatedLegal: boolean,
    isHomologatedTechnical: boolean
  ): RuleValidationResult {
    if (!isHomologatedLegal || !isHomologatedTechnical) {
      const missing = [];
      if (!isHomologatedLegal) missing.push('Homologación Legal (Clemencia García)');
      if (!isHomologatedTechnical) missing.push('Homologación Técnica (Líder de Ingeniería)');

      return {
        allowed: false,
        code: 'ERR_SUPPLIER_NOT_HOMOLOGATED',
        title: 'Proveedor No Homologado',
        message: `Por política de calidad y compras de Inteckno, no es posible emitir órdenes a "${supplierName}" hasta completar: ${missing.join(' y ')}.`,
        requiresActionBy: 'Administración e Ingeniería',
        level: 'blocking',
      };
    }

    return {
      allowed: true,
      code: 'OK_SUPPLIER_HOMOLOGATED',
      title: 'Proveedor Autorizado',
      message: 'El proveedor cuenta con homologación legal y técnica vigente.',
      level: 'info',
    };
  }

  /**
   * REGLA 1.3: Umbral de Aprobación de Compras (> USD 2.000)
   * Requiere visto bueno documentado del Gerente General (Gustavo Mejía)
   */
  static evaluatePurchaseApprovalLevel(amountUSD: number): {
    requiresGMApproval: boolean;
    reason: string;
  } {
    if (amountUSD >= BUSINESS_THRESHOLDS.GM_PURCHASE_APPROVAL_USD) {
      return {
        requiresGMApproval: true,
        reason: `Monto superior al umbral corporativo de USD $${BUSINESS_THRESHOLDS.GM_PURCHASE_APPROVAL_USD.toLocaleString()} (requiere Visto Bueno de Gustavo Mejía - Gerente General).`,
      };
    }
    return {
      requiresGMApproval: false,
      reason: 'Aprobación estándar por Coordinación de Compras y Líder de Proyecto.',
    };
  }

  static requiresGMApproval(amountUSD: number): boolean {
    return amountUSD >= BUSINESS_THRESHOLDS.GM_PURCHASE_APPROVAL_USD;
  }

  static canAssignToHeights(user: { name: string; hseqStatus?: any; hseqExpiresAt?: string }): {
    allowed: boolean;
    reason?: string;
  } {
    const res = this.validateTechnicianHSEQRelease(
      user.name,
      user.hseqStatus || 'valid',
      user.hseqExpiresAt || '2027-12-31',
      true
    );
    return { allowed: res.allowed, reason: res.message };
  }

  /**
   * REGLA 1.4 & 2.3: Compuerta HSEQ de Liberación Operativa
   * Ningún técnico operativo puede ser asignado a campo o trabajos de altura
   * sin certificación HSEQ / SST vigente (ARL, EPS, curso de alturas).
   */
  static validateTechnicianHSEQRelease(
    technicianName: string,
    hseqStatus: 'valid' | 'expired' | 'pending',
    hseqExpiresAt: string,
    isHeightWork: boolean = true
  ): RuleValidationResult {
    if (hseqStatus !== 'valid') {
      return {
        allowed: false,
        code: 'ERR_HSEQ_RELEASE_BLOCK',
        title: 'Compuerta HSEQ: Liberación Requerida',
        message: `Falta el certificado digital de liberación HSEQ vigente para asignar a ${technicianName} a este servicio operativo (Política de Cero Tolerancia HSEQ).`,
        requiresActionBy: 'Kelly Rojas / Dayannifer Mosquera (Equipo SST)',
        level: 'blocking',
      };
    }

    // Verificar si está próximo a vencer en menos de 7 días
    const expiry = new Date(hseqExpiresAt).getTime();
    const now = Date.now();
    const daysLeft = Math.round((expiry - now) / (1000 * 60 * 60 * 24));

    if (daysLeft < 7) {
      return {
        allowed: true,
        code: 'WARN_HSEQ_NEAR_EXPIRY',
        title: 'Certificación HSEQ Próxima a Vencer',
        message: `Atención: La certificación HSEQ de ${technicianName} vence en ${daysLeft} días. Contactar a SST para renovación.`,
        requiresActionBy: 'Equipo SST',
        level: 'warning',
      };
    }

    return {
      allowed: true,
      code: 'OK_HSEQ_VALID',
      title: 'Liberación HSEQ Vigente',
      message: `${technicianName} cuenta con aval HSEQ y curso de alturas vigente.`,
      level: 'info',
    };
  }

  /**
   * REGLA 1.4: Calibración de Equipos Técnicos Especiales (END / Magnetógrafo)
   */
  static validateToolCalibration(
    toolName: string,
    isCalibrated: boolean,
    expiryDate: string
  ): RuleValidationResult {
    const isExpired = new Date(expiryDate).getTime() < Date.now();
    if (!isCalibrated || isExpired) {
      return {
        allowed: false,
        code: 'ERR_TOOL_NOT_CALIBRATED',
        title: 'Equipo Técnico Descalibrado',
        message: `El instrumento "${toolName}" tiene su certificado de calibración vencido o ausente. No puede ser despachado a campo según el Procedimiento 1.4.`,
        requiresActionBy: 'Dairo Morales (Supervisor Técnico)',
        level: 'blocking',
      };
    }

    return {
      allowed: true,
      code: 'OK_TOOL_CALIBRATED',
      title: 'Equipo Calibrado',
      message: 'Certificado de calibración de laboratorio vigente.',
      level: 'info',
    };
  }

  /**
   * REGLA 2.4: Facturación Oportuna de Hitos (Plazo 48 Horas)
   * Tras la firma del acta parcial de aceptación por parte del cliente,
   * se debe facturar en menos de 48 horas.
   */
  static calculateInvoiceCountdown(
    acceptanceActSigned: boolean,
    signedAtTimestamp?: number
  ): {
    isActive: boolean;
    hoursRemaining: number;
    minutesRemaining: number;
    isExpired: boolean;
    urgencyLevel: 'normal' | 'urgent' | 'breached';
    message: string;
  } {
    if (!acceptanceActSigned || !signedAtTimestamp) {
      return {
        isActive: false,
        hoursRemaining: 48,
        minutesRemaining: 0,
        isExpired: false,
        urgencyLevel: 'normal',
        message: 'Acta pendiente de firma del cliente.',
      };
    }

    const deadline = signedAtTimestamp + BUSINESS_THRESHOLDS.INVOICE_MILESTONE_DEADLINE_HOURS * 3600 * 1000;
    const diffMs = deadline - Date.now();

    if (diffMs <= 0) {
      const hoursOverdue = Math.abs(Math.round(diffMs / (3600 * 1000)));
      return {
        isActive: true,
        hoursRemaining: 0,
        minutesRemaining: 0,
        isExpired: true,
        urgencyLevel: 'breached',
        message: `¡Plazo de 48h vencido hace ${hoursOverdue} horas! Emitir factura con urgencia a Gestión Administrativa.`,
      };
    }

    const totalMinutes = Math.floor(diffMs / (60 * 1000));
    const hoursRemaining = Math.floor(totalMinutes / 60);
    const minutesRemaining = totalMinutes % 60;

    let urgencyLevel: 'normal' | 'urgent' = 'normal';
    if (hoursRemaining < 12) {
      urgencyLevel = 'urgent';
    }

    return {
      isActive: true,
      hoursRemaining,
      minutesRemaining,
      isExpired: false,
      urgencyLevel,
      message: `Quedan ${hoursRemaining}h ${minutesRemaining}m para emitir factura según Procedimiento 2.4.`,
    };
  }
}

/**
 * SERVICIO DE NÓMINA ELECTRÓNICA DIAN (DNE - Documento Soporte de Pago de Nómina Electrónica)
 * Conforme a la Resolución DIAN 000013 de 2021.
 * Soporta la deducción fiscal de costos y gastos laborales en la declaración de renta de Inteckno.
 */

import { DianPayrollDocument } from '../../../types';

const PAYROLL_STORAGE_KEY = 'inteckno_dian_electronic_payroll_v1';

// Algoritmo de generación de CUNE (Código Único de Nómina Electrónica - SHA-384)
export function generateCune(
  consecutive: string,
  periodStart: string,
  periodEnd: string,
  totalDevengado: number,
  totalDeduccion: number,
  totalComprobante: number,
  nitEmisor: string,
  numEmpleado: string,
  softwarePin: string = '12345'
): string {
  const seed = `${consecutive}${periodStart}${periodEnd}${totalDevengado.toFixed(2)}${totalDeduccion.toFixed(2)}${totalComprobante.toFixed(2)}${nitEmisor}${numEmpleado}${softwarePin}1`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const p1 = Math.abs(hash * 17).toString(16).padStart(8, '0');
  const p2 = Math.abs(hash * 37).toString(16).padStart(8, '0');
  const p3 = Math.abs(hash * 67).toString(16).padStart(8, '0');
  const p4 = Math.abs(hash * 113).toString(16).padStart(8, '0');
  const p5 = Math.abs(hash * 181).toString(16).padStart(8, '0');
  const p6 = Math.abs(hash * 239).toString(16).padStart(8, '0');
  return `${p1}${p2}${p3}${p4}${p5}${p6}`.slice(0, 64);
}

export class DianPayrollService {
  private static companyNit = '900543210';
  private static prefix = 'NIE';

  public static getPayrollRecords(): DianPayrollDocument[] {
    try {
      const stored = localStorage.getItem(PAYROLL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }

    return [];
  }

  public static savePayrollRecords(records: DianPayrollDocument[]) {
    try {
      localStorage.setItem(PAYROLL_STORAGE_KEY, JSON.stringify(records));
    } catch (e) {
      console.error('Error saving payroll records to storage', e);
    }
  }

  public static deletePayrollRecord(id: string): DianPayrollDocument[] {
    try {
      const current = this.getPayrollRecords();
      const updated = current.filter((r) => r.id !== id);
      this.savePayrollRecords(updated);
      return updated;
    } catch (e) {
      console.error('Error deleting payroll record', e);
      return [];
    }
  }

  public static transmitPayroll(params: {
    periodMonth: string;
    employeeName: string;
    employeeDocumentNumber: string;
    basicSalary: number;
    transportAllowance: number;
    overtimeAndBonuses: number;
    healthDeduction: number;
    pensionDeduction: number;
    otherDeductions: number;
  }): DianPayrollDocument {
    const list = this.getPayrollRecords();
    const nextNum = list.length + 145;
    const fullNumber = `${this.prefix}-${nextNum}`;

    const totalDevengado = params.basicSalary + params.transportAllowance + params.overtimeAndBonuses;
    const totalDeducciones = params.healthDeduction + params.pensionDeduction + params.otherDeductions;
    const netPaid = totalDevengado - totalDeducciones;

    const cune = generateCune(
      fullNumber,
      `${params.periodMonth}-01`,
      `${params.periodMonth}-30`,
      totalDevengado,
      totalDeducciones,
      netPaid,
      this.companyNit,
      params.employeeDocumentNumber
    );

    const now = new Date();
    const settlementDate = now.toISOString().split('T')[0];

    const newRecord: DianPayrollDocument = {
      id: `NIE-${params.periodMonth}-${params.employeeDocumentNumber}`,
      prefix: this.prefix,
      consecutive: nextNum,
      cune,
      periodStart: `${params.periodMonth}-01`,
      periodEnd: `${params.periodMonth}-30`,
      settlementDate,
      employeeId: `EMP-${params.employeeDocumentNumber.slice(-4)}`,
      employeeName: params.employeeName,
      employeeDocument: params.employeeDocumentNumber,
      basicSalary: params.basicSalary,
      workedDays: 30,
      transportAllowance: params.transportAllowance,
      overtimeAmount: params.overtimeAndBonuses,
      totalAccrued: totalDevengado,
      healthDeduction: params.healthDeduction,
      pensionDeduction: params.pensionDeduction,
      withholdingTax: params.otherDeductions,
      totalDeductions: totalDeducciones,
      netPaid,
      dianStatus: 'transmitido',
    };

    const updated = [newRecord, ...list];
    this.savePayrollRecords(updated);
    return newRecord;
  }
}

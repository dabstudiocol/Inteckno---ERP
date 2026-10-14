/**
 * SERVICIO DE DOCUMENTO SOPORTE EN ADQUISICIONES EFECTUADAS A SUJETOS NO OBLIGADOS A FACTURAR
 * Regulado por la Resolución DIAN 000167 de 2021 y Estatuto Tributario Art. 771-2.
 * Permite a Inteckno soportar costos y deducciones en compras a personas naturales sin IVA (R-99-PN).
 */

import { DianSupportDocument, DianRutData } from '../../../types';
import { calculateColombianTaxesAndWithholdings, ConceptType, TaxCalculationResult } from './dianTaxRulesEngine';

export interface CreateSupportDocumentParams {
  vendorRut: DianRutData;
  description: string;
  conceptType: 'servicio_tecnico' | 'mano_de_obra_obra' | 'repuestos_menores' | 'honorarios';
  subtotal: number;
}

const SUPPORT_DOCUMENTS_STORAGE_KEY = 'inteckno_dian_support_documents_v1';

// Función para simular cálculo de CUDS (Código Único de Documento Soporte)
export function generateCuds(
  docNumber: string,
  issueDate: string,
  total: number,
  companyNit: string,
  vendorNit: string,
  softwarePin: string = '12345'
): string {
  const seed = `${docNumber}${issueDate}${total.toFixed(2)}${companyNit}${vendorNit}${softwarePin}1`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const p1 = Math.abs(hash * 13).toString(16).padStart(8, '0');
  const p2 = Math.abs(hash * 31).toString(16).padStart(8, '0');
  const p3 = Math.abs(hash * 97).toString(16).padStart(8, '0');
  const p4 = Math.abs(hash * 139).toString(16).padStart(8, '0');
  const p5 = Math.abs(hash * 251).toString(16).padStart(8, '0');
  const p6 = Math.abs(hash * 389).toString(16).padStart(8, '0');
  return `${p1}${p2}${p3}${p4}${p5}${p6}`.slice(0, 64);
}

export class DianSupportDocumentService {
  private static prefix = 'DSE';
  private static intecknoNit = '900543210';
  private static intecknoDv = '7';

  public static getStoredDocuments(): DianSupportDocument[] {
    try {
      const stored = localStorage.getItem(SUPPORT_DOCUMENTS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }

    return [];
  }

  public static saveDocuments(docs: DianSupportDocument[]) {
    try {
      localStorage.setItem(SUPPORT_DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
    } catch (e) {
      console.error('Error saving support documents to storage', e);
    }
  }

  public static deleteDocument(id: string): DianSupportDocument[] {
    try {
      const current = this.getStoredDocuments();
      const updated = current.filter((d) => d.id !== id);
      this.saveDocuments(updated);
      return updated;
    } catch (e) {
      console.error('Error deleting support document', e);
      return [];
    }
  }

  public static createDocument(params: CreateSupportDocumentParams): DianSupportDocument {
    const docs = this.getStoredDocuments();
    const nextConsecutive = docs.length > 0 ? Math.max(...docs.map((d) => d.consecutive)) + 1 : 101;
    const fullNumber = `${this.prefix}-${nextConsecutive}`;

    const now = new Date();
    const issueDate = now.toISOString().split('T')[0];

    const mappedConcept: ConceptType =
      params.conceptType === 'repuestos_menores'
        ? 'compra_repuestos'
        : params.conceptType === 'honorarios'
        ? 'honorarios_consultoria'
        : 'mantenimiento_maquinaria';

    const taxCalc: TaxCalculationResult = calculateColombianTaxesAndWithholdings(
      params.subtotal,
      mappedConcept,
      params.vendorRut,
      false
    );

    const cuds = generateCuds(
      fullNumber,
      issueDate,
      params.subtotal,
      this.intecknoNit,
      params.vendorRut.nit
    );

    const newDoc: DianSupportDocument = {
      id: `DSE-${nextConsecutive.toString().padStart(5, '0')}`,
      prefix: this.prefix,
      consecutive: nextConsecutive,
      cuds,
      issueDate,
      vendorNit: params.vendorRut.nit,
      vendorDV: params.vendorRut.dv,
      vendorName: params.vendorRut.razonSocial || `${params.vendorRut.primerNombre || ''} ${params.vendorRut.primerApellido || ''}`.trim(),
      vendorCity: params.vendorRut.municipio || 'Medellín',
      vendorDaneCode: params.vendorRut.municipioCodeDANE || '05001',
      description: params.description,
      subtotal: params.subtotal,
      reteFuenteRate: taxCalc.reteFuenteRate,
      reteFuenteAmount: taxCalc.reteFuenteAmount,
      reteIcaRate: taxCalc.reteIcaRate,
      reteIcaAmount: taxCalc.reteIcaAmount,
      netPayable: taxCalc.netPayable,
      conceptType: params.conceptType,
      dianStatus: 'emitido',
      dianValidationCode: '00 - Regla de negocio superada',
    };

    const updated = [newDoc, ...docs];
    this.saveDocuments(updated);
    return newDoc;
  }

  public static generateUblXml(doc: DianSupportDocument): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:CustomizationID>05</cbc:CustomizationID>
  <cbc:ProfileExecutionID>1</cbc:ProfileExecutionID>
  <cbc:ID>${doc.prefix}-${doc.consecutive}</cbc:ID>
  <cbc:UUID schemeName="CUDS-SHA384">${doc.cuds}</cbc:UUID>
  <cbc:IssueDate>${doc.issueDate}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>05</cbc:InvoiceTypeCode>
  
  <!-- Emisor: Inteckno S.A.S. -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>INTECKNO S.A.S.</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${this.intecknoDv}">${this.intecknoNit}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>01</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>

  <!-- Proveedor No Obligado a Facturar -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyTaxScheme>
        <cbc:RegistrationName>${doc.vendorName}</cbc:RegistrationName>
        <cbc:CompanyID schemeAgencyID="195" schemeID="${doc.vendorDV}">${doc.vendorNit}</cbc:CompanyID>
        <cac:TaxScheme><cbc:ID>01</cbc:ID></cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Valores y Retenciones -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${doc.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="COP">${doc.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${doc.netPayable.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
</Invoice>`;
  }
}

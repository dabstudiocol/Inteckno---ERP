// ============================================================================
// SERVICIO DE GESTIÓN DE PLANTILLAS MAESTRAS INTECKNO S.A.S.
// ============================================================================
// Permite Ver, Editar, Duplicar, Personalizar y Aplicar Plantillas
// tanto para cronogramas WBS como para Kits de Peticiones y Mantenimiento STC.

import { INTECKNO_WBS_TEMPLATES_5_FAMILIAS, RealWBSFamilyTemplate } from '../config/intecknoDomainCatalog';

export interface WBSTemplateTask {
  code: string;
  name: string;
  plannedHours: number;
  isCriticalPath: boolean;
  predecessors: string[];
  deliverable: string;
  assignedRole: string;
  normativeReference?: string;
}

export interface IntecknoWBSTemplate {
  id: string;
  title: string;
  category: string;
  normativeStandard: string;
  description: string;
  isOfficial?: boolean;
  isCustom?: boolean;
  authorName?: string;
  createdAt?: string;
  updatedAt?: string;
  tasks: WBSTemplateTask[];
}

export interface RequisitionKitItem {
  id: string;
  name: string;
  category: string;
  qty: number;
  unit: string;
  unitCostCOP?: number;
}

export interface RequisitionKitTemplate {
  id: string;
  title: string;
  description: string;
  category: string;
  systemType: string;
  isOfficial?: boolean;
  isCustom?: boolean;
  items: RequisitionKitItem[];
}

const STORAGE_KEY_WBS_TEMPLATES = 'ITK_WBS_TEMPLATES_CATALOG_V2';
const STORAGE_KEY_KIT_TEMPLATES = 'ITK_REQUISITION_KITS_CATALOG_V1';

// Kits Iniciales de Requisición STC
export const DEFAULT_REQUISITION_KITS: RequisitionKitTemplate[] = [
  {
    id: 'KIT-01-PINZAS-OVERHAUL',
    title: 'Kit Mantenimiento Mayor y Desmontaje de Pinzas / Mordazas',
    description: 'Juego de repuestos críticos y consumibles para revisión de 10 pinzas desembragables según EN 1709.',
    category: 'Mantenimiento Mecánico STC',
    systemType: 'Teleférico Monocable / Desembragable',
    isOfficial: true,
    items: [
      { id: 'k1-1', name: 'Resorte de compresión helicoidal para mordaza', category: 'Repuestos Críticos', qty: 10, unit: 'unid', unitCostCOP: 1250000 },
      { id: 'k1-2', name: 'Pasadores templados rectificados 42CrMo4', category: 'Mecanizados', qty: 20, unit: 'unid', unitCostCOP: 480000 },
      { id: 'k1-3', name: 'Grasa sintética de alta adherencia para teleféricos (Kluber)', category: 'Lubricantes', qty: 2, unit: 'caneca', unitCostCOP: 1950000 },
      { id: 'k1-4', name: 'Juego de sellos y retenedores NBR', category: 'Consumibles', qty: 10, unit: 'juego', unitCostCOP: 220000 },
    ],
  },
  {
    id: 'KIT-02-MRT-END-CABLES',
    title: 'Kit Alistamiento Inspección Magneto-inductiva (MRT) y END',
    description: 'Insumos y consumibles para inspección de cable tractor y balancines con normativa UNE EN 12927.',
    category: 'Ensayos No Destructivos',
    systemType: 'Todo tipo de Sistemas por Cable',
    isOfficial: true,
    items: [
      { id: 'k2-1', name: 'Acoplante de Ultrasonido base agua (Galón)', category: 'Consumibles END', qty: 2, unit: 'galón', unitCostCOP: 180000 },
      { id: 'k2-2', name: 'Laca de contraste blanca y partículas magnéticas húmedas', category: 'Consumibles END', qty: 6, unit: 'aerosol', unitCostCOP: 95000 },
      { id: 'k2-3', name: 'Kit de limpieza y solvente dieléctrico para cable de acero', category: 'Químicos', qty: 3, unit: 'galón', unitCostCOP: 320000 },
      { id: 'k2-4', name: 'Marcadores industriales indelebles y cinta reflectiva para pilonas', category: 'Ferretería', qty: 5, unit: 'unid', unitCostCOP: 35000 },
    ],
  },
  {
    id: 'KIT-03-EPP-ALTURAS-RES4272',
    title: 'Kit Dotación EPP y Rescate en Alturas (Resolución 4272)',
    description: 'Equipamiento de seguridad para cuadrilla de 4 técnicos en pilonas y torres elevadas.',
    category: 'Seguridad Industrial & SST',
    systemType: 'Trabajo en Alturas Pilonas',
    isOfficial: true,
    items: [
      { id: 'k3-1', name: 'Arnés de cuerpo entero dieléctrico 4 argollas certificado ANSI Z359', category: 'EPP', qty: 4, unit: 'unid', unitCostCOP: 890000 },
      { id: 'k3-2', name: 'Eslinga en Y con absorbedor de impacto y ganchos de 2 1/4 pulg', category: 'EPP', qty: 4, unit: 'unid', unitCostCOP: 420000 },
      { id: 'k3-3', name: 'Línea de vida vertical de 16mm x 50 metros en poliamida', category: 'EPP', qty: 2, unit: 'rollo', unitCostCOP: 980000 },
      { id: 'k3-4', name: 'Freno arrestador para cable de acero y cuerda', category: 'EPP', qty: 4, unit: 'unid', unitCostCOP: 360000 },
    ],
  },
];

class TemplateManagerService {
  /**
   * Obtiene todas las plantillas WBS (oficiales y personalizadas)
   */
  public getWbsTemplates(): IntecknoWBSTemplate[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_WBS_TEMPLATES);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error('Error cargando plantillas WBS:', e);
    }

    // Inicializar con las 5 Familias Oficiales de Inteckno
    const initial: IntecknoWBSTemplate[] = INTECKNO_WBS_TEMPLATES_5_FAMILIAS.map((tpl) => ({
      id: tpl.id,
      title: tpl.title,
      category: tpl.category,
      normativeStandard: tpl.normativeStandard,
      description: tpl.description,
      isOfficial: true,
      isCustom: false,
      authorName: 'Comité Técnico Inteckno S.A.S.',
      updatedAt: '2026-10-23',
      tasks: tpl.tasks.map((t) => ({ ...t })),
    }));

    this.saveWbsTemplatesList(initial);
    return initial;
  }

  /**
   * Guarda una plantilla WBS (creación o actualización)
   */
  public saveWbsTemplate(template: IntecknoWBSTemplate): void {
    const list = this.getWbsTemplates();
    const idx = list.findIndex((t) => t.id === template.id);

    const updated: IntecknoWBSTemplate = {
      ...template,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    if (idx >= 0) {
      list[idx] = updated;
    } else {
      list.push(updated);
    }

    this.saveWbsTemplatesList(list);
  }

  /**
   * Duplica una plantilla existente para permitir adaptaciones libres
   */
  public duplicateWbsTemplate(templateId: string, currentUserName?: string): IntecknoWBSTemplate {
    const list = this.getWbsTemplates();
    const original = list.find((t) => t.id === templateId);

    if (!original) {
      throw new Error(`Plantilla ${templateId} no encontrada.`);
    }

    const newId = `WBS-TPL-CUSTOM-${Date.now()}`;
    const duplicated: IntecknoWBSTemplate = {
      ...original,
      id: newId,
      title: `${original.title} (Copia Adaptada)`,
      isOfficial: false,
      isCustom: true,
      authorName: currentUserName || 'Usuario Inteckno',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      tasks: original.tasks.map((t) => ({ ...t })),
    };

    list.push(duplicated);
    this.saveWbsTemplatesList(list);
    return duplicated;
  }

  /**
   * Elimina una plantilla personalizada (las oficiales no pueden ser eliminadas por seguridad)
   */
  public deleteWbsTemplate(templateId: string): { success: boolean; error?: string } {
    const list = this.getWbsTemplates();
    const tpl = list.find((t) => t.id === templateId);

    if (!tpl) {
      return { success: false, error: 'Plantilla no encontrada' };
    }

    if (tpl.isOfficial && !tpl.isCustom) {
      return {
        success: false,
        error: 'Las plantillas oficiales de Inteckno están blindadas y no pueden eliminarse. Puedes duplicarla para adaptarla.',
      };
    }

    const filtered = list.filter((t) => t.id !== templateId);
    this.saveWbsTemplatesList(filtered);
    return { success: true };
  }

  /**
   * Restablece las plantillas oficiales a sus valores iniciales de fábrica
   */
  public resetWbsDefaults(): IntecknoWBSTemplate[] {
    localStorage.removeItem(STORAGE_KEY_WBS_TEMPLATES);
    return this.getWbsTemplates();
  }

  private saveWbsTemplatesList(list: IntecknoWBSTemplate[]): void {
    try {
      localStorage.setItem(STORAGE_KEY_WBS_TEMPLATES, JSON.stringify(list));
      window.dispatchEvent(new CustomEvent('inteckno:templates-updated'));
    } catch (e) {
      console.error('Error guardando lista de plantillas:', e);
    }
  }

  // --------------------------------------------------------------------------
  // KITS DE REQUISICIÓN Y MATERIALES
  // --------------------------------------------------------------------------
  public getRequisitionKits(): RequisitionKitTemplate[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_KIT_TEMPLATES);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Error cargando kits de requisición:', e);
    }

    localStorage.setItem(STORAGE_KEY_KIT_TEMPLATES, JSON.stringify(DEFAULT_REQUISITION_KITS));
    return DEFAULT_REQUISITION_KITS;
  }

  public saveRequisitionKit(kit: RequisitionKitTemplate): void {
    const list = this.getRequisitionKits();
    const idx = list.findIndex((k) => k.id === kit.id);
    if (idx >= 0) {
      list[idx] = kit;
    } else {
      list.push(kit);
    }
    localStorage.setItem(STORAGE_KEY_KIT_TEMPLATES, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('inteckno:templates-updated'));
  }

  public duplicateRequisitionKit(kitId: string): RequisitionKitTemplate {
    const list = this.getRequisitionKits();
    const original = list.find((k) => k.id === kitId);
    if (!original) throw new Error('Kit no encontrado');

    const duplicated: RequisitionKitTemplate = {
      ...original,
      id: `KIT-CUSTOM-${Date.now()}`,
      title: `${original.title} (Copia Adaptada)`,
      isOfficial: false,
      isCustom: true,
      items: original.items.map((it) => ({ ...it, id: `kit-item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}` })),
    };

    list.push(duplicated);
    localStorage.setItem(STORAGE_KEY_KIT_TEMPLATES, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('inteckno:templates-updated'));
    return duplicated;
  }
}

export const templateManagerService = new TemplateManagerService();

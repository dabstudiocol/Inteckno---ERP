import fs from 'fs';

let content = fs.readFileSync('src/modules/projects/components/tabs/TabCostosPresupuesto.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Importar DataOriginTooltip
const targetImport = "import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';";
const replaceImport = `import { ConfirmDeleteModal } from '../../../../components/common/ConfirmDeleteModal';
import { DataOriginTooltip, DataOriginTrace } from '../../../../components/common/DataOriginTooltip';`;

// 2. Colocar DataOriginTooltip junto al concepto del costo en la tabla de costos directos
const targetConceptDirect = `<td className="py-2.5 px-4 font-bold text-slate-800">
                              {c.concept}
                            </td>`;

const replaceConceptDirect = `<td className="py-2.5 px-4 font-bold text-slate-800">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span>{c.concept}</span>
                                <DataOriginTooltip
                                  trace={{
                                    sourceModule: c.id.startsWith('cost-ts-')
                                      ? 'Planilla de Horas (Timesheets) • RRHH'
                                      : c.id.startsWith('cost-po-')
                                      ? 'Abastecimiento • Orden de Compra (OC)'
                                      : c.id.startsWith('cost-rem-')
                                      ? 'Bodega Central • Remisión de Salida'
                                      : c.id.startsWith('cost-tool-')
                                      ? 'Control Metrológico / Activos HSEQ'
                                      : 'Imputación Directa de Obra',
                                    sourceEntityId: c.id,
                                    sourceUser: c.observations || 'Supervisor Técnico Registrado',
                                    sourceTimestamp: c.date,
                                    targetModule: \`Matriz de Costos • Proyecto \${project.code}\`,
                                    calculationLogic: \`Valor Imputado: \${formatCOP(valDirecto)} COP (IVA \${projectTaxRate.label})\`,
                                    status: 'verified',
                                  }}
                                />
                              </div>
                            </td>`;

let count = 0;
if (content.includes(targetImport)) {
  content = content.replace(targetImport, replaceImport);
  count++;
}
if (content.includes(targetConceptDirect)) {
  content = content.replace(targetConceptDirect, replaceConceptDirect);
  count++;
}

if (count === 2) {
  fs.writeFileSync('src/modules/projects/components/tabs/TabCostosPresupuesto.tsx', content, 'utf8');
  console.log('✅ DataOriginTooltip integrado exitosamente en TabCostosPresupuesto.tsx!');
} else {
  console.error('❌ Targets en TabCostosPresupuesto no encontrados, count = ' + count);
}

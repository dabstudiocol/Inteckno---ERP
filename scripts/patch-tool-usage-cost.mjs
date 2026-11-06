import fs from 'fs';

let content = fs.readFileSync('src/core/storage/erpStore.tsx', 'utf8').replace(/\r\n/g, '\n');

const targetEquipmentReturn = `        // Reintegrar equipos
        const updatedEquipment = prev.equipment.map((eq) => {
          const retItem = updatedItems.find((it) => it.productId === eq.id || it.sku === eq.code);
          if (retItem && retItem.qtyReturned > 0) {
            return {
              ...eq,
              status: 'available' as const,
              assignedProjectId: undefined,
              assignedProjectCode: undefined,
              assignedUserId: undefined,
              assignedUserName: undefined,
            };
          }
          return eq;
        });`;

const replacementEquipmentReturn = `        // Reintegrar equipos y calcular costo por uso / depreciación inyectado al proyecto (Eje 5)
        let totalEquipmentUsageCostCOP = 0;
        const equipmentUsageCostItems: any[] = [];

        const updatedEquipment = prev.equipment.map((eq) => {
          const retItem = updatedItems.find((it) => it.productId === eq.id || it.sku === eq.code);
          if (retItem && retItem.qtyReturned > 0) {
            // Calcular días de permanencia en obra
            const departureMs = remission.departureDate ? new Date(remission.departureDate).getTime() : Date.now();
            const returnMs = returnDate ? new Date(returnDate).getTime() : Date.now();
            const daysUsed = Math.max(1, Math.ceil((returnMs - departureMs) / (1000 * 60 * 60 * 24)));
            const dailyRate = eq.dailyUsageCostCOP || 25000;
            const toolUsageCOP = daysUsed * dailyRate;

            totalEquipmentUsageCostCOP += toolUsageCOP;
            equipmentUsageCostItems.push({
              id: \`cost-tool-\${eq.code}-\${Date.now()}\`,
              category: 'alquiler_equipos' as const,
              concept: \`Depreciación / Uso de Equipo: \${eq.name} (\${eq.code}) - \${daysUsed} días @ $\${dailyRate.toLocaleString('es-CO')}/día\`,
              unit: 'Días',
              plannedQuantity: daysUsed,
              plannedUnitCost: dailyRate,
              plannedTotal: toolUsageCOP,
              actualQuantity: daysUsed,
              actualUnitCost: dailyRate,
              actualTotal: toolUsageCOP,
              variance: 0,
              costType: 'directo' as const,
              date: returnDate,
              observations: \`Liquidado al retorno de Remisión \${remission.remissionNumber} (Retorno \${returnNumber}). Eje 5 HSEQ.\`,
            });

            return {
              ...eq,
              status: 'available' as const,
              assignedProjectId: undefined,
              assignedProjectCode: undefined,
              assignedUserId: undefined,
              assignedUserName: undefined,
            };
          }
          return eq;
        });`;

if (content.includes(targetEquipmentReturn)) {
  content = content.replace(targetEquipmentReturn, replacementEquipmentReturn);
  // Además sumamos totalEquipmentUsageCostCOP a newAC en la actualización del proyecto
  const targetNewAC = `newAC = Math.max(0, (prj.actualCostAC || 0) - previousDispatchCOP + consumedCostCOP);`;
  const replaceNewAC = `newAC = Math.max(0, (prj.actualCostAC || 0) - previousDispatchCOP + consumedCostCOP + totalEquipmentUsageCostCOP);`;
  if (content.includes(targetNewAC)) {
    content = content.replace(targetNewAC, replaceNewAC);
  }

  const targetFallbackAC = `newAC = (prj.actualCostAC || 0) + consumedCostCOP;`;
  const replaceFallbackAC = `newAC = (prj.actualCostAC || 0) + consumedCostCOP + totalEquipmentUsageCostCOP;`;
  if (content.includes(targetFallbackAC)) {
    content = content.replace(targetFallbackAC, replaceFallbackAC);
  }

  // Y agregamos equipmentUsageCostItems a newCostMatrix
  const targetCostMatrixArray = `costMatrix: newCostMatrix,`;
  const replaceCostMatrixArray = `costMatrix: [...newCostMatrix, ...equipmentUsageCostItems],`;
  if (content.includes(targetCostMatrixArray)) {
    content = content.replace(targetCostMatrixArray, replaceCostMatrixArray);
  }

  fs.writeFileSync('src/core/storage/erpStore.tsx', content, 'utf8');
  console.log('✅ Depreciación y costo por uso de herramientas inyectado a costMatrix!');
} else {
  console.error('❌ Snippet de reingreso de equipos no coincide');
}

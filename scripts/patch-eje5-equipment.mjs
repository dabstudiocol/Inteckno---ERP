import fs from 'fs';

let content = fs.readFileSync('src/core/storage/erpStore.tsx', 'utf8').replace(/\r\n/g, '\n');

const targetSnippet = `        return {
          ...prev,
          products: [...updatedProducts, ...newProductsToAdd],
          purchaseOrders: prev.purchaseOrders.map((p) =>
            p.id === poId ? { ...p, status: 'received', deliveryStatus: 'entregado', physicalReceiptDone: true, technicalQualityInspectionDone: true } : p
          ),
          requisitions: prev.requisitions.map((r) =>
            r.id === po.originRequisitionId ? { ...r, status: 'fulfilled' as const } : r
          ),
          projects: updatedProjects,
        };`;

const replacementSnippet = `        // Coreografía de Trazabilidad: Eje 5 (Mantenimiento, Activos y HSEQ)
        // Si la OC compra una herramienta costosa/activo (ej. torquímetro), se registra en equipment con nextDueDate
        // y se programa plan preventivo a 30 días antes con notificación HSEQ
        const newEquipmentTools: EquipmentTool[] = [];
        const newMaintenancePlans: any[] = [];
        const newNotifications: any[] = [];

        po.items.forEach((it, idx) => {
          const isHighPrecision = /torquimetro|torqumetro|laser|lser|alineador|multimetro|multmetro|ensayo|end|ndt|vibrac/i.test(\`\${it.name} \${it.sku}\`);
          if (isHighPrecision || po.isEquipmentPurchase) {
            const today = new Date();
            const calibMonths = po.equipmentCalibPeriodMonths || 12;
            const nextDue = new Date(today.getTime() + calibMonths * 30 * 24 * 60 * 60 * 1000);
            const nextDueDateStr = nextDue.toISOString().split('T')[0];
            const eqCode = \`EQ-\${it.sku || 'TOOL'}-\${Date.now().toString().slice(-4)}\`;

            newEquipmentTools.push({
              id: \`EQ-\${Date.now()}-\${idx}\`,
              code: eqCode,
              name: it.name || 'Herramienta de Precisión',
              serialNumber: \`SN-\${Date.now().toString().slice(-6)}\`,
              type: 'herramienta_especial',
              calibrationDate: today.toISOString().split('T')[0],
              calibrationExpiry: nextDueDateStr,
              nextDueDate: nextDueDateStr,
              isCalibrated: true,
              calibrationCertNumber: \`CAL-\${Date.now().toString().slice(-5)}\`,
              status: 'available',
              dailyUsageCostCOP: Math.round((it.unitPriceCOP || 100000) * 0.03), // 3% depreciación/uso diario
            });

            // 30 días antes de nextDueDate -> Generar maintenancePlan preventivo automático y notificar HSEQ
            const advanceAlertDate = new Date(nextDue.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            newMaintenancePlans.push({
              id: \`MP-AUTO-\${Date.now()}-\${idx}\`,
              code: \`MP-CAL-\${eqCode}\`,
              projectCode: po.projectCode || 'TALLER-CENTRAL',
              systemName: \`Metrología y Calibración NDT (\${it.name})\`,
              component: 'Pinzas Desembragables',
              equipmentCode: eqCode,
              maintenanceType: 'preventivo',
              scheduledDate: advanceAlertDate,
              status: 'programado',
              observations: \`Alerta preventiva generada automáticamente: Re-calibración obligatoria antes de \${nextDueDateStr} según Eje 5 HSEQ.\`,
            });

            newNotifications.push({
              id: \`notif-eq-\${Date.now()}-\${idx}\`,
              type: 'urgent',
              title: 'Metrología y Calibración HSEQ',
              message: \`Herramienta de precisión recibida: \${it.name} (\${eqCode}). Próxima calibración obligatoria: \${nextDueDateStr}. Plan preventivo programado.\`,
              targetRole: 'hseq',
              timestamp: new Date().toISOString(),
              read: false,
            });
          }
        });

        return {
          ...prev,
          products: [...updatedProducts, ...newProductsToAdd],
          equipment: [...prev.equipment, ...newEquipmentTools],
          maintenancePlans: [...(prev.maintenancePlans || []), ...newMaintenancePlans],
          notifications: [...prev.notifications, ...newNotifications],
          purchaseOrders: prev.purchaseOrders.map((p) =>
            p.id === poId ? { ...p, status: 'received', deliveryStatus: 'entregado', physicalReceiptDone: true, technicalQualityInspectionDone: true } : p
          ),
          requisitions: prev.requisitions.map((r) =>
            r.id === po.originRequisitionId ? { ...r, status: 'fulfilled' as const } : r
          ),
          projects: updatedProjects,
        };`;

if (content.includes(targetSnippet)) {
  content = content.replace(targetSnippet, replacementSnippet);
  fs.writeFileSync('src/core/storage/erpStore.tsx', content, 'utf8');
  console.log('✅ Eje 5: Trazabilidad Metrológica e inyección de equipment y maintenancePlan preventivo integrada!');
} else {
  console.error('❌ Snippet de receivePurchaseOrder no coincide');
}

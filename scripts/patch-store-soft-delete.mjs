import fs from 'fs';

let content = fs.readFileSync('src/core/storage/erpStore.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Soft-Delete en deletePurchaseOrder
const targetDeletePO = `        return {
          ...prev,
          purchaseOrders: prev.purchaseOrders.filter((po) => po.id !== id),
          projects: updatedProjects,
        };`;

const replaceDeletePO = `        // Auditoría Práctica Parte 6: Soft-Delete obligatorio en órdenes de compra (Papelera intocable)
        return {
          ...prev,
          purchaseOrders: prev.purchaseOrders.map((po) =>
            po.id === id
              ? {
                  ...po,
                  isDeleted: true,
                  deletedAt: new Date().toISOString(),
                  deletedBy: prev.currentUser?.id || 'USR-SYSTEM',
                }
              : po
          ),
          projects: updatedProjects,
        };`;

// 2. Soft-Delete en deleteRequisition
const targetDeleteReq = `        return {
          ...prev,
          requisitions: prev.requisitions.filter((r) => r.id !== id),
        };`;

const replaceDeleteReq = `        // Auditoría Práctica Parte 6: Soft-Delete obligatorio en requisiciones (SOLPED)
        return {
          ...prev,
          requisitions: prev.requisitions.map((r) =>
            r.id === id
              ? {
                  ...r,
                  isDeleted: true,
                  deletedAt: new Date().toISOString(),
                  deletedBy: prev.currentUser?.id || 'USR-SYSTEM',
                }
              : r
          ),
        };`;

// 3. Soft-Delete en deleteTimesheet
const targetDeleteTS = `  const deleteTimesheet = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        timesheets: prev.timesheets.filter((t) => t.id !== id),
      }));
      notify('info', 'Registro Eliminado', 'La planilla de horas ha sido retirada.');
    },
    [notify]
  );`;

const replaceDeleteTS = `  const deleteTimesheet = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        timesheets: prev.timesheets.map((t) =>
          t.id === id
            ? {
                ...t,
                isDeleted: true,
                deletedAt: new Date().toISOString(),
                deletedBy: prev.currentUser?.id || 'USR-SYSTEM',
              }
            : t
        ),
      }));
      notify('info', 'Registro Archivado (Soft-Delete)', 'La planilla de horas ha sido archivada con trazabilidad inmutable.');
    },
    [notify]
  );`;

let modified = 0;
if (content.includes(targetDeletePO)) {
  content = content.replace(targetDeletePO, replaceDeletePO);
  modified++;
}
if (content.includes(targetDeleteReq)) {
  content = content.replace(targetDeleteReq, replaceDeleteReq);
  modified++;
}
if (content.includes(targetDeleteTS)) {
  content = content.replace(targetDeleteTS, replaceDeleteTS);
  modified++;
}

if (modified === 3) {
  fs.writeFileSync('src/core/storage/erpStore.tsx', content, 'utf8');
  console.log('✅ Soft-Delete obligatorio integrado en erpStore (POs, Requisitions, Timesheets)!');
} else {
  console.error('❌ Solo se encontraron ' + modified + ' de 3 targets en erpStore');
}

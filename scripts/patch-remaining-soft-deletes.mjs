import fs from 'fs';

let content = fs.readFileSync('src/core/storage/erpStore.tsx', 'utf8').replace(/\r\n/g, '\n');

// 1. Soft-Delete en deleteRequisition
const targetReq = `      setState((prev) => ({
        ...prev,
        requisitions: prev.requisitions.filter((r) => r.id !== id),
      }));`;

const replaceReq = `      setState((prev) => ({
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
      }));`;

// 2. Soft-Delete en deleteTimesheet
const targetTS = `        return {
          ...prev,
          timesheets: prev.timesheets.filter((t) => t.id !== id),
          tasks: updatedTasks,
          projects: updatedProjects,
        };`;

const replaceTS = `        return {
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
          tasks: updatedTasks,
          projects: updatedProjects,
        };`;

let count = 0;
if (content.includes(targetReq)) {
  content = content.replace(targetReq, replaceReq);
  count++;
}
if (content.includes(targetTS)) {
  content = content.replace(targetTS, replaceTS);
  count++;
}

if (count === 2) {
  fs.writeFileSync('src/core/storage/erpStore.tsx', content, 'utf8');
  console.log('✅ Requisitions y Timesheets actualizados con Soft-Delete!');
} else {
  console.error('❌ Targets restantes no encontrados, count = ' + count);
}

import fs from 'fs';

let content = fs.readFileSync('src/modules/procurement/ProcurementModule.tsx', 'utf8').replace(/\r\n/g, '\n');

const target1 = "const safePOs = Array.isArray(purchaseOrders) ? purchaseOrders : [];";
const replace1 = "const safePOs = (Array.isArray(purchaseOrders) ? purchaseOrders : []).filter((po) => !po.isDeleted);";

const target2 = "const safeReqs = Array.isArray(requisitions) ? requisitions : [];";
const replace2 = "const safeReqs = (Array.isArray(requisitions) ? requisitions : []).filter((r) => !r.isDeleted);";

if (content.includes(target1) && content.includes(target2)) {
  content = content.replace(target1, replace1).replace(target2, replace2);
  fs.writeFileSync('src/modules/procurement/ProcurementModule.tsx', content, 'utf8');
  console.log('✅ Soft-Delete filter integrado en ProcurementModule (safePOs y safeReqs)!');
} else {
  console.error('❌ Targets en ProcurementModule no encontrados');
}

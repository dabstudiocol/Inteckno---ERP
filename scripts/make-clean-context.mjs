import fs from 'fs';

const snap = JSON.parse(fs.readFileSync('INTECKNO_ERP_RADIOGRAFIA_VIVA.json', 'utf8'));

let md = '# INTECKNO ERP - BASE DE DATOS Y CONTEXTO VIVO\n\n';
md += '> **Entorno:** Google Cloud Firestore (`inteckno-erp`)\n';
md += '> **Estado:** 100% Sincronizado, IDs Relacionales Inmutables y Cero Mock Data\n\n';

md += '## 1. RESUMEN DE ENTIDADES\n';
md += '- **Proyectos:** ' + (snap.projects?.items?.length || 0) + '\n';
md += '- **Usuarios / Colaboradores:** ' + (snap.users?.items?.length || 0) + '\n';
md += '- **Terceros (Clientes y Proveedores):** ' + (snap.partners?.items?.length || 0) + '\n';
md += '- **Productos en Inventario:** ' + (snap.productsSample?.items?.length || 0) + ' de ' + (snap.productsSample?.totalInDatabase || 0) + '\n\n';

md += '## 2. PROYECTOS Y CARPETAS CONTRACTUALES (WBS)\n';
for (const p of (snap.projects?.items || [])) {
  md += `### [${p.id}] ${p.title || p.name}\n`;
  md += `- **Código / Centro de Costos:** ${p.code}\n`;
  md += `- **Cliente:** [${p.clientId}] ${p.clientName}\n`;
  md += `- **Categoría:** ${p.categoryId} | **Servicio:** ${p.serviceTypeId || p.serviceId}\n`;
  md += `- **Supervisor:** [${p.supervisorId}] ${p.supervisorName}\n`;
  md += `- **Términos de Pago:** ${p.paymentTermId}\n`;
  md += `- **Carpetas Contractuales (projectItems):**\n`;
  for (const it of (p.projectItems || [])) {
    md += `  * [${it.id}] ${it.itemCode}: ${it.description} (Presupuesto: $${(it.budgetCOP || 0).toLocaleString('es-CO')} COP)\n`;
  }
  md += `- **Matriz de Costos Imputados (costMatrix):**\n`;
  for (const cm of (p.costMatrix || [])) {
    md += `  * [${cm.id}] Carpeta Vinculada: ${cm.projectItemId} | Ítem: ${cm.itemCode} | Concepto: ${cm.concept} | Total: $${(cm.totalWithTax || cm.amount || 0).toLocaleString('es-CO')} COP\n`;
  }
  md += '\n';
}

md += '## 3. USUARIOS Y EQUIPO DE TRABAJO\n';
for (const u of (snap.users?.items || [])) {
  const cargo = typeof u.jobPosition === 'string' ? u.jobPosition : (u.jobPosition?.title || 'N/D');
  md += `- **[${u.id}]** ${u.name} | Rol: \`${u.role}\` | Dept: \`${u.departmentId}\` | Cargo: \`${u.jobPositionId}\` (${cargo})\n`;
  if (u.certifications && u.certifications.length > 0) {
    for (const c of u.certifications) {
      md += `  * Cert: [${c.certificationId}] ${c.name} - Vence: ${c.expiryDate}\n`;
    }
  }
}

md += '\n## 4. TERCEROS (CLIENTES Y PROVEEDORES)\n';
for (const pt of (snap.partners?.items || [])) {
  md += `- **[${pt.id}]** ${pt.name} | Tipo: \`${pt.type}\` | NIT: ${pt.taxId || pt.nit || 'N/D'}\n`;
}

md += '\n## 5. MUESTRA DE BODEGA Y UBICACIONES\n';
for (const pr of (snap.productsSample?.items || []).slice(0, 30)) {
  md += `- **[${pr.id}]** SKU: \`${pr.sku}\` | ${pr.name} | Bodega: \`${pr.locationId}\` | Estante: \`${pr.shelfId}\` | Stock: ${pr.stock} ${pr.unit || ''}\n`;
}

fs.writeFileSync('INTECKNO_ERP_CONTEXTO_COMPLETO.md', md, 'utf8');
console.log('✅ Archivo INTECKNO_ERP_CONTEXTO_COMPLETO.md generado con éxito, tamaño:', md.length);

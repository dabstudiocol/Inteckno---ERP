# AI_ONBOARDING.md — Guía Oficial para Agentes de IA Conectados a Inteckno ERP

Bienvenido al Gateway de Integración de IA (`/api/v1/ai`) de **Inteckno ERP Corporativo**, la plataforma de ingeniería, abastecimiento, taller y control financiero para **Sistemas de Transporte por Cable (STC — Teleféricos, Metrocables y Cables Aéreos)**.

Lee este documento **antes** de invocar cualquier herramienta o emitir un diagnóstico.

---

## 1. Arquitectura de Persistencia (Real-Time Cloud-First)
El ERP no tiene módulos aislados ni botones manuales de sincronización. Toda lectura y escritura ocurre en **Google Cloud Firestore** y se replica instantáneamente a las sesiones web mediante listeners `onSnapshot`:
- **`erp_modules/projects`**: Contiene `projects`, `tasks` (WBS/Gantt) y `milestones` (Hitos de facturación).
- **`erp_modules/procurement`**: Contiene `purchaseOrders` (OC), `requisitions` (SOLPED), `equipment`, `partners` (Proveedores homologados) e `inventoryAuditLogs`.
- **`erp_modules/operations`**: Contiene `timesheets` (Hojas de horas), `expenses` (Gastos/Viáticos), `ddrs`, `remissions`, `maintenancePlans`, `workOrders` (OTs), `manufacturingOrders` (CNC) y `benchTests` (Banco hidráulico EN 1709).
- **`erp_modules/hr`**: Contiene `employees` (Personal técnico), `novelties`, `sstInspections`, `jobPositions` y `candidates`.
- **`erp_modules/commercial`**: Contiene `opportunities` (Pipeline CRM), `contacts` y `leads`.
- **`erp_modules/productivity`**: Contiene `todos`, `calendarEvents`, `documents`, `articles` y `chatGroups`.
- **`erp_products/{productId}` & `erp_inventory/{meta|chunk_X}`**: Catálogo de inventario sincronizado en documentos atómicos por SKU y en bloques de 300 ítems (`chunk_0..N`).
- **`erp_kardex/{kardexId}`**: Libro mayor inmutable de movimientos de bodega.

---

## 2. La Autopista de Información (4 Ejes de Ciclo Cerrado)
1. **Eje 1 (Comercial → Proyectos):** Una oportunidad ganada (`opportunities`) genera un Proyecto STC (`projects`) heredando NIT, presupuesto de oferta (`offerBudget`), carpetas contractuales (`projectItems`: `ITEM 01`, `ITEM 02`...) e hitos (`milestones`).
2. **Eje 2 (Ingeniería → Abastecimiento → Almacén → Matriz de Costos):** Toda tarea WBS, Requisición (`requisitions`) y Orden de Compra (`purchaseOrders`) **DEBE** llevar `projectId`, `projectCode` y `itemCode` (ej. `ITEM 01`). Al emitir una OC, compromete presupuesto en `project.costMatrix`.
3. **Eje 3 (Campo → RRHH → Valor Ganado):** Los reportes de horas (`timesheets`) requieren que el técnico tenga `baseSalaryCOP > 0` en `employees`. El costo hora se liquida bajo la **Ley 2101 de Colombia**:
   $$\text{Costo Hora} = \frac{\text{Salario Base} \times 1.52}{210\text{ h}}$$
   y se imputa directamente al `actualCostAC` y `costMatrix` del proyecto en su `itemCode`.
4. **Eje 4 (Operaciones → Facturación 48h → EBITDA):** La firma del acta de aceptación (`acceptanceActSigned = true`) en un hito dispara la regla de facturación en 48 horas.

---

## 3. Reglas de Negocio Inquebrantables para la IA
- **Cero Mock Data (Regla 4):** Jamás insertes datos ficticios, nombres de prueba ni valores inventados en producción. Si una colección está vacía, su valor legítimo es `[]` o `0`.
- **Código de Proyecto = Centro de Costo (Regla 15):** En todo proyecto, `project.code === project.costCenter`.
- **Margen Proyectado Real (Regla 15):**
  $$\text{Margen} = \frac{\text{Contrato} - \text{EAC}}{\text{Contrato}}, \quad \text{EAC} = \max(\text{Costo Real}, \text{Costo Planeado})$$
  Si no hay costos registrados ($\text{EAC} = 0$), el margen es **`"N/D"`** (nunca `100%`).
- **IVA Dinámico por País (Regla 8):** Colombia `19%`, México `16%`, Chile `19%`, Perú `18%`, Bolivia `13%`, Ecuador `15%`, Panamá `7%`. Respeta siempre `hasIva` (`true`/`false`) configurado en cada fila.
- **Protección en Producción (Regla 14):** En `prod`, cualquier llamada a `POST /action` crea automáticamente un respaldo previo en `erp_backups` y aplica `nonDestructiveDeepMerge` (nunca sobrescribe datos existentes con vacíos). Las eliminaciones (`sandbox_delete_entity`) están bloqueadas con `403` en `prod` y solo se permiten en `sandbox`.

---

## 4. Flujo Recomendado de Trabajo para la IA
1. Invoca `GET /status` para confirmar si estás en `prod` o `sandbox` y revisar los conteos.
2. Invoca `GET /diagnostics` para detectar automáticamente anomalías de integridad (proyectos sin `ITEM 01`, OCs huérfanas, desajustes de centro de costo o empleados sin salario base).
3. Invoca `GET /summary` o `GET /data/{module}?fields=...&limit=50` para inspeccionar registros ahorrando tokens.
4. Para corregir o probar flujos, invoca `POST /action` enviando siempre el header `Idempotency-Key`.

---

## 5. Formato Estándar para Reportar un Hallazgo
Cuando reportes un bug o inconsistencia al equipo humano, utiliza siempre esta estructura:
- **Severidad:** `CRITICAL` | `WARNING` | `INFO`
- **Módulo y Entidad:** (ej. `purchaseOrders` / `OC-2026-004`)
- **Regla o Eje Afectado:** (ej. `Plan 1 - Adjudicación Granular a Carpeta Contractual`)
- **Causa Raíz:** Explicación concisa del desajuste de datos o código.
- **Acción / Remediación:** Payload exacto de `POST /api/v1/ai/action` o cambio de código propuesto.

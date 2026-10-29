---
always_on: true
glob: "**/*"
---

# CONSTITUCIÓN OPERATIVA E INMUTABLE DEL AGENTE - INTECKNO ERP
# Empresa: Inteckno S.A.S. | Especialidad: Sistemas de Transporte por Cable (STC / Teleféricos) & END
# Entorno: Web App de Producción (https://inteckno.web.app) | Stack: React 19 + TypeScript + Firebase Firestore

Este documento contiene la memoria central, las directrices de ingeniería, reglas de negocio y preferencias inmutables de desarrollo para el ERP de Inteckno S.A.S.
Todo agente que trabaje en esta base de código DEBE obedecer estrictamente estos principios sin excepción alguna.

---

## 1. PRINCIPIOS DE SINCRONIZACIÓN Y PERSISTENCIA (GOOGLE CLOUD FIRESTORE)

1.1. **Cero Botones Manuales de Carga / Descarga:**
- Queda estrictamente prohibido colocar botones, switches o modales que le pidan al usuario "Subir a la nube", "Descargar de la nube", "Sincronizar Firestore" o similares.
- El usuario final nunca debe ser responsable de sincronizar los datos de la empresa de forma manual. Toda persistencia debe ser 100% silenciosa y automática.

1.2. **Persistencia y Carga Cloud-First Automática:**
- Al arrancar o recargar el ERP en cualquier navegador, perfil, ventana de incógnito o dispositivo, la aplicación debe consultar y poblar automáticamente el estado desde Google Cloud Firestore (`loadAllModulesFromCloud`) antes de mostrar módulos vacíos.
- Si un cliente tiene datos locales válidos (por ejemplo, importados previamente desde Excel en `IndexedDB`), el sistema los reconcilia y los transmite a la nube de manera silenciosa y automática en segundo plano.

1.3. **Escucha y Replicación Reactiva en Tiempo Real:**
- Cualquier cambio (creación, edición, borrado o remisión) realizado por cualquier colaborador debe persistirse en Firestore de forma transparente y distribuirse instantáneamente a todas las demás sesiones activas mediante listeners reactivos (`onSnapshot`).
- Las colecciones pesadas (como el catálogo masivo de inventario) deben particionarse internamente en bloques seguros (chunks de 300 productos, <1MB) sin exponer complejidad al usuario.

1.4. **Saneamiento Obligatorio de Objetos (Cero `undefined`):**
- Firestore rechaza cualquier objeto con propiedades `undefined`. Todo payload debe sanearse con `JSON.parse(JSON.stringify(data))` o sanearse explícitamente antes de llamar a `setDoc`.

---

## 2. FILOSOFÍA CORE DEL ERP (ESTRELLA POLAR)

2.1. **Facilidad y Armonía (User-Centric):**
- El ERP debe ser extremadamente fácil de usar y entender. La tecnología debe facilitar el trabajo y reducir el estrés administrativo, creando armonía en la empresa.

2.2. **Interconexión Profunda:**
- Ningún módulo es una isla. La información fluye automáticamente:
  - CRM adjudica oportunidad ➔ Pasa a Proyectos (mismo código = mismo centro de costos) ➔ Solicita inventario de Compras ➔ Valida certificados y aptitud en Talento Humano / SST.

2.3. **Alineación Literal y Nicho Estricto:**
- Todo catálogo, opción o flujo debe reflejar fielmente la operación real de Inteckno S.A.S. (Teleféricos, Sistemas de Cable, Ensayos No Destructivos END/MRT, trabajo en alturas, equipos calibrados).
- **Pertinencia Absoluta al Nicho:** Prohibido inventar procesos genéricos de manufactura pesada que Inteckno no realiza (no construyen vigas, no rastrean coladas de fundición, etc.).

2.4. **Cero Datos de Prueba (Cero Mock Data):**
- NUNCA insertar datos ficticios, proyectos de ejemplo, gastos inventados o registros 'placeholder' en la base de datos o en el código fuente.
- Un estado vacío (`[]`) es un estado legítimo y limpio del usuario; nunca re-sembrar datos de prueba automáticamente cuando una colección esté vacía.

2.5. **Literalidad Absoluta en Catálogos:**
- Cuando el usuario proporcione una lista de servicios, líneas de negocio o categorías, está estrictamente prohibido resumir con "etc." o agrupar términos. Deben ingresarse de forma 100% literal y exhaustiva.

---

## 3. ESTÁNDAR UNIVERSAL DE INTERFAZ DE USUARIO (UI / UX PIXEL-PERFECT)

3.1. **Estándar Universal para Opciones Desplegables (Selectores Interactivos):**
- **Botón 'X' y Limpieza Inmediata:** Todo selector desplegable interactivo en cualquier módulo o modal del ERP debe contar con el botón 'X' (limpiar). Al hacer clic en la 'X', se borra el valor actual, el campo toma el foco de inmediato y se despliega automáticamente la lista completa de opciones disponibles para elegir sin pasos adicionales.
- **Filtrado Dinámico en Tiempo Real:** Todos los selectores deben permitir escribir libremente en el campo de texto e ir filtrando interactivamente la lista de opciones en pantalla.
- **Prohibición de `isClearable={false}`:** Queda estrictamente prohibido desactivar la 'X' de limpieza (`isClearable={false}`) en los selectores interactivos del sistema.

3.2. **Formato Monetario Universal y Alineación de Columnas:**
- **Formato de Dinero:** Cualquier valor monetario (costos, subtotales, totales, utilidades, presupuestos o ejecuciones) debe proyectarse siempre con formato monetario legible (`formatCOP(...)` o `$ X.XXX.XXX`), tanto en celdas de lectura como debajo o junto a inputs numéricos editables. Prohibido dejar números crudos (ej. `5000000`).
- **Alineación Vertical Pixel-Perfect en Tablas:**
  - Las tablas deben estructurarse con `table-fixed` y `<colgroup>` explícito para garantizar anchos de columna idénticos entre `<thead>`, `<tbody>` y `<tfoot>`.
  - Prohibido aplicar clases flexbox (`flex`, `items-center`) directamente a `<td>`. Cualquier contenedor flexbox debe ir en un `<div>` interior.
  - Los inputs numéricos y los textos de totales en la misma columna deben compartir el mismo contenedor alineado a la derecha (`flex flex-col items-end` o `flex justify-end`), garantizando que la cifra o el input queden perfectamente encolumnados verticalmente.

3.3. **Simetría Visual y Alineación en Cuadrículas de Formularios:**
- Todos los modales y formularios deben estructurarse en cuadrículas consistentes (habitualmente pares de 2 columnas `grid-cols-2` o bloques simétricos uniformes).
- Prohibido mezclar campos con etiquetas de diferente altura en una misma fila si esto provoca que los inputs queden a diferentes alturas o desfasados visualmente.

3.4. **Cero Filas Redundantes o Duplicadas en Tablas:**
- Cuando una tabla de datos contenga un solo registro (`length <= 1`), nunca se debe mostrar una fila de "Consolidados / Totales" al pie con exactamente los mismos números e información duplicada que la única fila existente. Los consolidados de pie de tabla solo se proyectan cuando existen 2 o más registros (`length > 1`).

3.5. **Cero Duplicación de Cifras en Filas de Resumen:**
- En filas resumen de totales (como *Utilidad Total Presupuestada* o *Costos Totales*), nunca se debe colocar una etiqueta de dinero debajo del input si repite exactamente la misma cifra ingresada.

3.6. **Contención Elástica y Responsividad:**
- En Flexbox y Grids, todo contenedor hijo principal DEBE llevar `min-w-0` para permitir que el contenido se encoja fluidamente sin romper el ancho de pantalla al expandir o colapsar el menú lateral.
- En encabezados con pestañas y botones de acción, las pestañas deben usar scroll horizontal deslizante (`overflow-x-auto min-w-0`) y los botones de acción deben usar `flex-wrap gap-2 shrink-0`. Prohibido fijar filas rígidas que recorten botones contra el borde de la pantalla.
- Todo modal debe ser elástico y contenido: `max-w-2xl max-h-[90vh] overflow-hidden` con cuerpo interior `overflow-y-auto flex-1`. Cero controles inaccesibles con cualquier nivel de zoom (80% a 150%).

---

## 4. REGLAS DE NEGOCIO, SEGURIDAD Y POKA-YOKE

4.1. **Confirmación Escrita Obligatoria ('BORRAR') para Eliminación Crítica:**
- Queda estrictamente prohibido permitir la eliminación directa con un solo clic de ITEMS, rubros presupuestales, facturas o registros operativos críticos sin validación textual.
- Todo modal de eliminación (`ConfirmDeleteModal`) debe contar con `requireConfirmWord={true}` y requerir que el usuario escriba explícitamente `BORRAR` para habilitar el botón de confirmación definitiva.

4.2. **Tratamiento de Impuestos e Inmutabilidad de IVA:**
- Toda liquidación de IVA en matrices de costos, órdenes de compra y facturación debe consultar la tasa impositiva correspondiente al país de ejecución del proyecto (ej. Colombia 19%, México 16%, Chile 19%, Perú 18%, etc.) y disponer de selector explícito "Con IVA" / "Sin IVA".
- Las opciones de IVA configuradas por el usuario son datos contractuales fijos. Toda normalización o sincronización debe respetar y preservar explícitamente el valor `hasIva: it.hasIva` sin asumir valores por defecto que reactiven el IVA.

4.3. **Inputs Numéricos Limpios:**
- Todo campo numérico de moneda o cantidad debe usar la convención `value={val || ''}` con `placeholder="0"` para permitir borrado total sin retener el dígito `0` obstinado en pantalla.
- La casilla de Gran Total (Subtotal + IVA + Retención) debe ser un elemento visual de solo lectura no interactivo.

4.4. **Un Proyecto = Un Centro de Costos:**
- En todo el ERP, cada proyecto representa su propio centro de costos. El código del proyecto y el código del centro de costos deben ser idénticos y mantenerse 100% sincronizados en tiempo real.

4.5. **Separación Estricta entre Presupuesto de Oferta y Matriz de Costos por ITEM:**
- El presupuesto estimado se formula previamente como el "Consolidado de Oferta" a nivel global.
- La creación de ITEMS, carpetas contractuales y rubros directos/indirectos corresponde a la ejecución real de obra. Prohibido mezclar selectores de presupuesto vs reproceso dentro del modal de gastos operativos del proyecto.

---

## 5. MANDATO DE 100% ESPAÑOL DE COLOMBIA (CERO ANGLICISMOS EN UI)

Todo texto, etiqueta, opción, mensaje o término visible al usuario final DEBE estar 100% en español profesional, directo, intuitivo y amigable de Colombia. Prohibido usar anglicismos de gestión o programación en la interfaz.

*   **Glosario Obligatorio:**
    - `SKU` ➔ **Código de Artículo / Referencia**
    - `Stock` ➔ **Existencias en Bodega / Cantidad Disponible**
    - `PO` ➔ **Orden de Compra (OC)**
    - `PR` ➔ **Solicitud de Compra**
    - `RFQ` ➔ **Cotización a Proveedores**
    - `UoM` ➔ **Unidad de Medida**
    - `BOM` ➔ **Lista de Materiales y Repuestos**
    - `Lead Time` ➔ **Tiempo de Entrega del Proveedor**
    - `ETA / ETD` ➔ **Fecha Estimada de Llegada / Fecha de Despacho**
    - `FIFO / FEFO` ➔ **Primero en Vencer, Primero en Salir**
    - `Batch / Lot` ➔ **Lote de Fabricación**
    - `Packing List` ➔ **Lista de Empaque / Guía de Remisión**
    - `Scrap / Waste` ➔ **Merma / Retazo Inservible**
    - `Kitting / Kit` ➔ **Paquete de Herramientas / Maletín de Inspección**
    - `Soft Allocation` ➔ **Apartado Previo / Material Reservado**
    - `Inbound / Outbound` ➔ **Entradas a Bodega / Salidas a Obra**
    - `WBS / Gantt` ➔ **Plan de Trabajo / Cronograma de Actividades**
    - `Milestone` ➔ **Meta Clave / Hito**
    - `Deadline` ➔ **Fecha Límite de Entrega**
    - `ASAP` ➔ **Prioridad Inmediata / Urgente**
    - `KPI / KPIs` ➔ **Indicadores de Avance / Métricas de Gestión**
    - `Backlog` ➔ **Tareas Pendientes**
    - `WIP` ➔ **Trabajo en Curso / En Ejecución**
    - `Deliverable` ➔ **Entregable / Documento Final**
    - `Check-in / Check-out` ➔ **Préstamo y Devolución de Equipos**
    - `Overhaul` ➔ **Mantenimiento Mayor Integral**
    - `NDT` ➔ **Ensayos No Destructivos (END)** *(Siempre usar END)*
    - `MRT` ➔ **Inspección Magneto-Inductiva de Cables (MRT)**
    - `Timesheet` ➔ **Hoja de Horas / Registro de Jornada**
    - `HSEQ / HSE` ➔ **Seguridad y Salud en el Trabajo (SST / Calidad)**
    - `PPE` ➔ **Elementos de Protección Personal (EPP)**
    - `Dashboard` ➔ **Panel de Control / Resumen General**
    - `Modal` ➔ **Ventana Emergente**
    - `Dropdown` ➔ **Lista Desplegable**
    - `Tooltip` ➔ **Mensaje de Ayuda**
    - `Audit Log` ➔ **Registro de Cambios / Historial de Movimientos**

---

## 6. PROTOCOLO OBLIGATORIO DE DESPLIEGUE Y CALIDAD (CERO `LOCALHOST`)

6.1. **Prohibición de `localhost`:**
- Todo trabajo se realiza directamente sobre el entorno oficial. No se hacen pruebas locales en `localhost` ni se piden cambios que no se desplieguen a producción.

6.2. **Verificación Estricta de Tipos Pre-Despliegue (`tsc --noEmit`):**
- Antes de cada despliegue, es MANDATORIO ejecutar:
  ```powershell
  npx tsc --noEmit
  ```
  Si existe un solo error de TypeScript, importación faltante o propiedad inexistente, debe resolverse antes de continuar.

6.3. **Compilación y Despliegue Oficial:**
  ```powershell
  npm run build
  npx firebase-tools deploy --only hosting
  ```
- Entorno oficial verificado: `https://inteckno.web.app` (y espejo `https://inteckno-erp.web.app`).

6.4. **Obligación de Commit y Push a GitHub Master:**
- Cada cambio terminado debe confirmarse y publicarse en GitHub:
  ```powershell
  git add .
  git commit -m "[tipo](módulo): descripción clara en español"
  git push origin master
  ```

---

## 7. MAPA ARQUITECTÓNICO DEL PROYECTO (EDICIÓN QUIRÚRGICA)

Para ahorrar tokens y trabajar con máxima precisión, no escanees directorios masivamente. Ve directamente al módulo objetivo:
*   `src/modules/`:
    *   `inventory/`: Inventario general, trazabilidad por tramos físicos de cable, bajas y mermas.
    *   `procurement/`: Compras, órdenes de compra, evaluación de proveedores y recepción de mercancía.
    *   `requisitions/`: Solicitudes internas de compra y repuestos.
    *   `projects/`: Control de proyectos, WBS, matrices de costos directos/indirectos, entregables y facturación.
    *   `operations/`: Hoja de horas (`timesheet`), gastos en campo, reportes diarios (`ddrs`), remisiones.
    *   `commercial/`: CRM de oportunidades, clientes y seguimiento de licitaciones.
    *   `hr/`: Talento humano, competencias, evaluación de desempeño y HSEQ.
    *   `inteckno/`: Gestión de usuarios, roles y perfiles corporativos.
*   `src/core/`:
    *   `storage/erpStore.tsx`: Estado global unificado y sincronizador reactivo con Firestore.
    *   `services/firestoreSyncService.ts`: Servicios de sincronización y particionamiento en Cloud Firestore.
    *   `services/trmService.ts`: Cotización oficial de TRM (Dólar / COP) en tiempo real.
    *   `services/lucianaService.ts`: Lógica del motor de Inteligencia Artificial LUC-IA-NA.
*   `src/types/`: Definición de tipos relacionales TypeScript (`index.ts`, `ProjectSchema.ts`, `InventorySchema.ts`).
*   `src/components/common/`: Componentes universales (`CreatableSelect`, `ConfirmDeleteModal`, `LightTable`).

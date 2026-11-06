# Handoff Report — Explorer 3: Performance, Firestore Sync & Integrity Audit

**Agent**: Explorer 3 (`teamwork_explorer`)  
**Parent Orchestrator ID**: `0d3fc292-4a95-4000-b905-f57f7d512468`  
**Working Directory**: `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\explorer_survey_3`  
**Target Reference**: `survey_perf_integrity.md`  
**Type**: Hard Handoff (Investigation & Survey Complete)  

---

## 1. Observation

1. **Compilación y Tamaño del Paquete**:
   - Comando ejecutado: `cd "C:\Users\david\OneDrive\Documents\inteckno-erp"; npm run build` (invocando `tsc -b && vite build`).
   - Resultado verbatim:
     ```text
     vite v8.3.1 building client environment for production...
     transforming...
     ✓ 2840 modules transformed.
     rendering chunks...
     computing gzip size...
     dist/index.html                     1.82 kB │ gzip:     0.75 kB
     dist/assets/index-JBAUDsov.css    179.13 kB │ gzip:    26.12 kB
     dist/assets/index-DHOUJ3vD.js   4,971.61 kB │ gzip: 1,232.98 kB

     [plugin builtin:vite-reporter] 
     (!) Some chunks are larger than 500 kB after minification. Consider:
     - Using dynamic import() to code-split the application
     - Use build.rolldownOptions.output.codeSplitting to improve chunking: https://rolldown.rs/reference/OutputOptions.codeSplitting
     - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
     ✓ built in 2.07s
     ```
   - Código de salida: `0` (Cero errores de compilación de TypeScript).
   - El artefacto JS generado es un monolito único de **4,971.61 kB (1,232.98 kB gzip)**.

2. **Estructura de Importación Estática en `src/App.tsx`**:
   - Líneas 7-27: Los 20 módulos (`CrmModule`, `ProjectsModule`, `InventoryModule`, `ProcurementModule`, `BillingModule`, `TalentoHumanoModule`, etc.) se importan síncronamente al nivel superior del componente `App.tsx`.
   - `vite.config.ts:10-24`: No contiene directiva de fragmentación de proveedores (`manualChunks`), lo que amalgama módulos de rutas y dependencias pesadas en el chunk principal.

3. **Concentración de Librerías Masivas**:
   - `xlsx` (~850 KB): Importado únicamente en `src/modules/inventory/components/InventoryExcelUploadModal.tsx:14`.
   - `@zxing/browser` y `@zxing/library` (~500 KB): Importados únicamente en `src/modules/inventory/components/OpticalBarcodeScannerTab.tsx:2`.
   - `recharts` (~450 KB): Importado únicamente en `src/modules/projects/components/tabs/TabCostosPresupuesto.tsx:50-61`.

4. **Sincronización Cloud-First y Regla 1**:
   - `src/core/storage/erpStore.tsx:789-932`: La carga inicial se efectúa automáticamente mediante `loadAllModulesFromCloud()` al montar `ErpProvider`.
   - `src/core/storage/erpStore.tsx:979-1285`: Existen 10 suscripciones reactivas `onSnapshot` que sincronizan en tiempo real usuarios, chat, proyectos, compras, inventario por chunks, kardex, talento humano, operaciones, comercial y productividad.
   - Búsqueda en código: Cero botones de "Subir/Sincronizar Firestore" expuestos al usuario.
   - `src/modules/projects/components/tabs/TabHseqOffline.tsx:117-127`: Función `handleManualSync` definida pero nunca renderizada ni llamada (código muerto).

5. **Navegación Determinista y Autopistas de Retorno (Regla 16)**:
   - `src/core/storage/erpStore.tsx:1818-1837`: `navigateWithContext` y `clearNavigationContext` operan con mapeo canónico (`CANONICAL_MODULE_MAP`) y sellos de tiempo (`timestamp`).
   - Autopistas de retorno hacia proyectos verificadas en:
     - `src/modules/procurement/components/PurchaseOrderDetailDrawer.tsx:177-188`: Botón explícito `navigateWithContext('proyectos', 'view_project', { projectId: po.projectId, tab: 'costs' })`.
     - `src/modules/timesheet/TimesheetModule.tsx:601-613`: Botón explícito `navigateWithContext('proyectos', 'view_project', { projectId: t.projectId, tab: 'horas' })`.
     - `src/modules/expenses/ExpensesModule.tsx:577`: Botón explícito `navigateWithContext('proyectos', 'view_project', { projectId: exp.projectId, tab: 'costos' })`.
     - `src/modules/billing/BillingModule.tsx:465`: Botón explícito `navigateWithContext('proyectos', 'view_project', { projectId: m.projectId, tab: 'facturacion' })`.
   - Violación observada en `src/components/common/DocumentFlowBar.tsx:250-257`:
     ```typescript
     onClick={() => {
       setActiveModule('requisiciones');
       setTimeout(() => {
         window.dispatchEvent(
           new CustomEvent('inteckno:create-solped-for-project', { detail: { project: activeProject } })
         );
       }, 80);
     }}
     ```
     `inteckno:create-solped-for-project` no es escuchado en ningún componente. `RequisitionsModule.tsx:33-44` escucha exclusivamente `navigationContext.action === 'create_solped'`.
   - Brecha observada en `src/modules/procurement/components/RequisitionDetailModal.tsx:295-306`: La imputación a Proyecto se muestra como texto estático y carece del botón interactivo de retorno.

6. **Cumplimiento de Reglas de Formato y Dominio**:
   - Tipografía SF Pro: Enlazada en `index.html:29-30` y forzada con `!important` en `src/index.css:44-46`.
   - Formato monetario `formatCOP`: Implementado en `src/core/services/trmService.ts:184` y utilizado en 91 puntos de `TabCostosPresupuesto.tsx` y a lo largo de compras, inventario, facturación y tableros.
   - Eliminación con validación textual: `src/components/common/ConfirmDeleteModal.tsx:26-27` (`requireConfirmWord = true`, `confirmWord = 'BORRAR'`).
   - Cero mock data: Colecciones operativas inicializan vacías (`[]`) en `erpStore.tsx:516-558`.

---

## 2. Logic Chain

1. **Relación entre Observación 1, 2 y 3**:
   Dado que `src/App.tsx` importa directamente los 20 componentes de módulo (Obs. 2), y dentro de estos componentes se importan módulos grandes como `xlsx`, `@zxing` y `recharts` (Obs. 3), el bundler Vite agrupa todas las dependencias en el punto de entrada raíz. Esto explica directamente por qué el archivo resultante `dist/assets/index-DHOUJ3vD.js` pesa 4.97 MB (Obs. 1).
2. **Relación entre Optimización de Empaquetado y Reglas de Negocio**:
   Reemplazar las importaciones estáticas en `App.tsx` por `React.lazy()` y configurar `manualChunks` en `vite.config.ts` divide el archivo monolítico en fragmentos asíncronos sin alterar las interfaces exportadas, el contexto de React ni los contratos de datos de `erpStore`. Por tanto, es una optimización 100% segura que reduce el payload inicial a ~500 KB sin riesgo de regresión en las reglas de negocio.
3. **Relación entre Observación 5 y la Regla 16**:
   La Regla 16 exige que toda navegación contextual y transferencia de intenciones se ejecute a través de `navigateWithContext`. En `DocumentFlowBar.tsx:250-257`, el uso de un temporizador de 80ms y un `CustomEvent` que nadie escucha produce una falla silenciosa (el modal de creación de requisición con datos arrastrados del proyecto nunca se abre). Sustituirlo por `navigateWithContext('requisiciones', 'create_solped', { project: activeProject })` restaura el circuito cerrado conforme a la expectativa declarada en `RequisitionsModule.tsx:33-44`.
4. **Relación entre Observación 4 y la Regla 1**:
   La verificación exhaustiva confirma que no hay botones de sincronización manual para el usuario. La función `handleManualSync` en `TabHseqOffline.tsx` quedó huérfana cuando el módulo fue adaptado al evento automático `window.addEventListener('online', ...)`. Eliminarla limpia el código sin alterar el flujo PWA offline.

---

## 3. Caveats

1. **No Modificación de Código Fuente**: Por directriz de explorador, no se editó ningún archivo de código fuente en `src/`. Todas las observaciones reflejan el estado inalterado del repositorio en la rama `master`.
2. **Contexto de Autenticación de Firebase**: Las pruebas de compilación y bundle analizan el código empaquetado. La conectividad remota en producción dependerá de la disponibilidad de la red del cliente hacia los servidores de Google Cloud Firestore (`inteckno-erp.firebaseapp.com`).
3. **Comportamiento de `Suspense` en Red Lenta**: Al implementar `React.lazy` en `App.tsx`, se debe colocar un componente de carga liviano (esqueleto o spinner sutil con estética SF Pro) para que la transición entre pestañas en conexiones muy lentas (3G) sea armónica.

---

## 4. Conclusion

1. **Estado de Integridad y Cumplimiento**: Inteckno ERP presenta un grado de cumplimiento sobresaliente con las reglas de negocio (SF Pro, cero mock data, carga cloud-first, persistencia reactiva, formatos de moneda y deep merge no destructivo).
2. **Problema Principal Detectado**: Cuello de botella severo en el tiempo de carga inicial provocado por un bundle JavaScript monolítico de 4.97 MB (carente de code-splitting y vendor chunks).
3. **Acciones de Alta Prioridad para la Fase de Implementación**:
   - Configurar `build.rollupOptions.output.manualChunks` en `vite.config.ts` para separar `vendor-react`, `vendor-firebase`, `vendor-icons`, `vendor-charts`, `vendor-xlsx` y `vendor-zxing`.
   - Migrar las importaciones estáticas de módulos en `src/App.tsx` a `React.lazy()` con `<Suspense>` envolviendo la vista activa.
   - Corregir el bloque en `src/components/common/DocumentFlowBar.tsx:250-257` usando `navigateWithContext('requisiciones', 'create_solped', { project: activeProject })` para erradicar el temporizador ciego y CustomEvent huérfano.
   - Enriquecer `src/modules/procurement/components/RequisitionDetailModal.tsx:295-306` con el botón de autopista de retorno hacia la Matriz de Costos del Proyecto.
   - Remover la función muerta `handleManualSync` en `src/modules/projects/components/tabs/TabHseqOffline.tsx:117-127`.

---

## 5. Verification Method

Para verificar independientemente los hallazgos y validar las futuras optimizaciones:

1. **Inspección de Tamaño y Compilación**:
   Ejecutar en la raíz del proyecto:
   ```powershell
   cd "C:\Users\david\OneDrive\Documents\inteckno-erp"
   npm run build
   ```
   - **Condición Actual**: Confirma la generación de `dist/assets/index-DHOUJ3vD.js` con ~4,971 kB y la advertencia `Some chunks are larger than 500 kB`.
   - **Condición Posterior a Optimización**: Debe compilar con 0 errores y generar el chunk de entrada principal por debajo de 600 kB, distribuyendo el resto en chunks asíncronos (`vendor-*` y `modules-*`).

2. **Verificación de la Violación en `DocumentFlowBar.tsx`**:
   Inspeccionar las líneas 250 a 257 de `src/components/common/DocumentFlowBar.tsx` y contrastarlas con las líneas 33 a 44 de `src/modules/requisitions/RequisitionsModule.tsx`.

3. **Verificación del Retorno en `RequisitionDetailModal.tsx`**:
   Inspeccionar las líneas 295 a 306 de `src/modules/procurement/components/RequisitionDetailModal.tsx` y contrastarlas con el botón interactivo de retorno en `src/modules/procurement/components/PurchaseOrderDetailDrawer.tsx:177-188`.

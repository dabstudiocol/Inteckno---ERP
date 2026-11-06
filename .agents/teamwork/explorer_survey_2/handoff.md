# Handoff Report — Explorer 2: Auditoría de Código Muerto, Dependencias y Salud de Compilación

**Emisor:** Explorer 2 (`teamwork_explorer`)  
**Destinatario:** Parent Orchestrator (`0d3fc292-4a95-4000-b905-f57f7d512468`)  
**Fecha:** 2026-11-06  
**Directorio de Trabajo:** `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\explorer_survey_2`  
**Documento Detallado:** `C:\Users\david\OneDrive\Documents\inteckno-erp\.agents\teamwork\explorer_survey_2\survey_deadcode_build.md`

---

## 1. Observation (Observaciones Directas)

### 1.1 Dependencias y Empaquetado (`package.json`, `vite build`)
- **Comando:** `npm run build` (`tsc -b && vite build`)
  - **Resultado:** Código de salida 0 en 2.91s.
  - **Métricas:** 2,840 módulos transformados.
  - **Bundle:** `dist/assets/index-DHOUJ3vD.js` con un tamaño de **4,971.61 kB (1,232.98 kB gzip)** en un único chunk monolítico.
  - **Advertencia:** `(!) Some chunks are larger than 500 kB after minification.`
- **Dependencias no importadas:**
  - `clsx`: 0 importaciones en `src/`.
  - `tailwind-merge`: 0 importaciones en `src/`.
  - `scheduler`: 0 importaciones en `src/`.
  - `@zxing/library`: 0 importaciones directas en `src/`. Se confirmó en `node_modules/@zxing/browser/package.json` que es una `peerDependency` declarada (`"@zxing/library": "^0.23.0"`).
- **Dependencia pesada estática:**
  - `xlsx` (`^0.18.5`) solo se importa en `src/modules/inventory/components/InventoryExcelUploadModal.tsx:14`. Al ser una importación estática en un modal importado estáticamente en `InventoryModule`, infla el bundle inicial con casi 1 MB.

### 1.2 Compilador TypeScript (`tsconfig.app.json`)
- Líneas 14-18 de `tsconfig.app.json`:
  ```json
  "noEmit": true,
  "strict": false,
  "noUnusedLocals": false,
  "noUnusedParameters": false,
  "noFallthroughCasesInSwitch": true
  ```
- **Prueba estricta `npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals`:**
  - 720 errores (TS6133 y TS6196) a lo largo de 86 archivos.
  - Desglose verificado:
    - 447 iconos no leídos de `lucide-react` (ej. `Sparkles`, `AlertTriangle`, `CheckCircle2`, `ChevronDown`, `Calendar`).
    - 74 tipos e interfaces importados o declarados sin uso.
    - 54 variables de estado / setters huérfanos (ej. `setActSignerRole`, `setMsDueDate`, `setNewCompetencyInput`).
    - 18 constantes `SEED_*` importadas en `src/core/storage/erpStore.tsx` (líneas 75-98) desde `src/seed/intecknoData.ts`.
    - 18 manejadores de eventos huérfanos (ej. `handleManualSync` en `TabHseqOffline.tsx:117`, `handleGenerateWBS` en `TabWbsGantt.tsx:817`).
    - 109 helpers y constantes no utilizados (ej. `formatUSD`, `formatTRM`, `INTECKNO_PORTFOLIO`).
- **Prueba estricta `npx tsc -p tsconfig.app.json --noEmit --noUnusedParameters`:**
  - 29 errores TS6133 de parámetros declarados pero nunca leídos en 18 archivos.

### 1.3 Archivos Huérfanos (100% Código Muerto)
El análisis del grafo de dependencias de los 138 archivos `.ts`/`.tsx` reveló exactamente 6 archivos que nunca son importados por ningún otro archivo:
1. `src/components/chat/RecordChatter.tsx` (479 líneas)
2. `src/components/common/DocumentFlowBar.tsx` (369 líneas)
3. `src/components/ui/GanttChart.tsx` (363 líneas)
4. `src/core/registry/moduleRegistry.ts` (68 líneas)
5. `src/modules/projects/types/ProjectSTCSchema.ts` (203 líneas)
6. `src/utils/rfqOptimizer.ts` (111 líneas)
**Total de código muerto en archivos huérfanos:** 1,593 líneas.

### 1.4 Incumplimientos de las Reglas Maestras de Inteckno ERP
- **Regla 6 (Prohibición de `isClearable={false}`):**  
  `src/modules/inventory/components/OpticalBarcodeScannerTab.tsx:788`:
  ```tsx
  isClearable={false}
  ```
- **Regla 4 (Cero Mock Data):**  
  - `src/core/services/aiVisionExpenseService.ts:78-228`: Contiene la constante exportada `SAMPLE_RECEIPTS` con 150 líneas de recibos y facturas simuladas con gráficos SVG codificados en base64 (`Restaurante El Cable STC`, `Hotel Presidente Internacional`). No se importa en ningún otro archivo.
  - `src/modules/operations/OperacionesAvanzadasModule.tsx:124, 126, 175, 202`: Valores de texto preescritos en formularios de creación (`useState('Pinzas Desembragables')`, `useState('Teleférico Monocable Desembragable')`, `useState('Pinza Desembragable')`, `useState('Acero 4140 Tratado')`).
  - `src/modules/billing/BillingModule.tsx:162`: `useState('Interventor de Obra / Supervisor STC')`.
  - `src/core/storage/erpStore.tsx:75-98`: 18 colecciones de prueba importadas desde `src/seed/intecknoData.ts` (archivo de 180 KB / 4,777 líneas).
- **Regla 15 (Tipografía SF Pro):**  
  `src/index.css:5, 44-46` impone `'SF Pro Display', 'SF Pro Text', 'SF Pro'` con `!important` en todos los selectores. Se verificó cumplimiento.

### 1.5 Duplicidad y Residuos de Debugging
- `src/modules/projects/components/tabs/TabWbsGantt.tsx:92` redefine localmente `formatCOP` en lugar de importarlo de `src/core/services/trmService.ts`.
- `src/modules/projects/components/tabs/TabCostosPresupuesto.tsx:290-291` ejecuta un import y export de `getProjectTaxRate` a mitad del archivo (línea 290).
- Se detectaron 8 sentencias `console.log/debug` en todo el repositorio (2 de subida en `firestoreSyncService.ts:503, 639`, 2 en `erpStore.tsx:922, 949`, 1 en `main.tsx:18`, 1 en `eventBus.ts:25`, 1 en `BillingModule.tsx:1164`, 1 en `sound.ts:47`).
- 0 sentencias `debugger;`.
- 0 bloques de código comentados.

---

## 2. Logic Chain (Cadena Lógica)

1. **Premisa:** El proyecto build actualmente (`tsc -b && vite build`) sin errores aparentes porque las comprobaciones estrictas de TypeScript (`noUnusedLocals`, `noUnusedParameters`) están desactivadas en `tsconfig.app.json` (Observación 1.2).
2. **Deducción de Código Muerto:** Al ejecutar `tsc` activando estas banderas, se demostró que existen 720 declaraciones muertas y 29 parámetros no leídos que han ido acumulándose silenciosamente (Observación 1.2).
3. **Deducción de Archivos Huérfanos:** El análisis de resolución de rutas demostró que 6 archivos completos (1,593 líneas) carecen de consumidores en el árbol de módulos (Observación 1.3). Entre ellos, `GanttChart.tsx` fue sustituido por `TabWbsGantt.tsx`, `moduleRegistry.ts` fue sustituido por `rbac.ts`, y `ProjectSTCSchema.ts` es un duplicado no conectado de `ProjectSchema.ts`.
4. **Deducción del Peso del Bundle:** El bundle de producción mide casi 5 MB (Observación 1.1) porque todos los módulos y librerías pesadas (`xlsx`, `recharts`, `lucide-react` con cientos de iconos sin uso, y `intecknoData.ts` con 180 KB de semillas) se importan sincrónicamente sin división de código.
5. **Deducción de Reglas Inteckno:** Existen transgresiones directas documentadas a la Regla 6 (`isClearable={false}`) y a la Regla 4 (`SAMPLE_RECEIPTS` y valores iniciales de `useState`) que violan el contrato de producción de Inteckno ERP (Observación 1.4).
6. **Conclusión Lógica:** Para sanear el repositorio de forma segura y duradera, se debe:
   - Eliminar los 6 archivos huérfanos.
   - Purgar los 720 imports y variables muertas.
   - Eliminar las dependencias npm inactivas (`clsx`, `tailwind-merge`, `scheduler`).
   - Corregir las violaciones a las reglas (Regla 6 y Regla 4).
   - Unificar funciones duplicadas (`formatCOP`).
   - Cargar `xlsx` dinámicamente y aplicar `React.lazy` a los módulos en `AppShell.tsx`.
   - Activar `noUnusedLocals: true` y `noUnusedParameters: true` en `tsconfig.app.json` garantizando 0 errores.

---

## 3. Caveats (Advertencias y Supuestos)

1. **`@zxing/library` no debe eliminarse de `package.json`:** Aunque no se importa directamente en `src/`, es una `peerDependency` declarada de `@zxing/browser`. Borrarla provocaría advertencias o fallas en instalaciones limpias de `npm install`.
2. **Imports con efectos secundarios (CSS):** La importación `@import "tailwindcss";` en `src/index.css` y `import './index.css'` en `src/main.tsx` no deben tocarse porque contienen los estilos globales y la tipografía SF Pro obligatoria.
3. **Archivos huérfanos y posibles intenciones futuras:** `rfqOptimizer.ts` contiene lógica matemática de optimización de compras y detección de inflación que podría ser valiosa a futuro. Si el usuario desea conservarla como funcionalidad pendiente, debe integrarse activamente en `ProcurementModule.tsx` en vez de permanecer como archivo muerto desconectado.
4. **Alcance de Solo Lectura:** Como Explorer 2, no se modificó ningún archivo de código fuente del proyecto (`src/`, `package.json`, etc.). Toda la investigación fue estrictamente de lectura y diagnóstico.

---

## 4. Conclusion (Conclusión y Plan de Acción)

El estado del código base es funcionalmente operativo pero acumula **1,593 líneas de código muerto en 6 archivos huérfanos**, **720 imports y variables sin uso**, **3 dependencias innecesarias**, un **bundle inflado a 4.97 MB** y **4 violaciones específicas de las Reglas Maestras de Inteckno ERP**.

### Hoja de Ruta para el Agente Implementador:

| Paso | Acción Concreta | Archivos / Componentes Afectados |
|---|---|---|
| **1** | Eliminar 6 archivos huérfanos | `src/components/chat/RecordChatter.tsx`, `src/components/common/DocumentFlowBar.tsx`, `src/components/ui/GanttChart.tsx`, `src/core/registry/moduleRegistry.ts`, `src/modules/projects/types/ProjectSTCSchema.ts`, `src/utils/rfqOptimizer.ts` |
| **2** | Corregir violación a Regla 6 | Cambiar `isClearable={false}` a `isClearable={true}` en `src/modules/inventory/components/OpticalBarcodeScannerTab.tsx:788` |
| **3** | Corregir violaciones a Regla 4 (Mock Data) | Eliminar `SAMPLE_RECEIPTS` en `src/core/services/aiVisionExpenseService.ts:78-228`; vaciar valores en `useState` en `OperacionesAvanzadasModule.tsx` y `BillingModule.tsx:162`; limpiar los 18 `SEED_*` no usados en `erpStore.tsx` |
| **4** | Corregir duplicidad de `formatCOP` | En `src/modules/projects/components/tabs/TabWbsGantt.tsx:92`, eliminar la función local y usar `import { formatCOP } from '../../../../core/services/trmService'` |
| **5** | Corregir re-export anómalo | En `src/modules/projects/components/tabs/TabCostosPresupuesto.tsx:290-291`, remover el import y export de `getProjectTaxRate` a mitad de archivo |
| **6** | Desinstalar dependencias no utilizadas | Remover de `package.json`: `clsx`, `tailwind-merge`, `scheduler` |
| **7** | Limpiar los 720 imports y variables muertas | Purgar los 447 iconos no renderizados de `lucide-react`, 74 tipos no leídos, 54 variables/setters muertos y 18 handlers huérfanos en los 86 archivos |
| **8** | Optimizar bundle con carga dinámica | En `InventoryExcelUploadModal.tsx`, cambiar `import * as XLSX from 'xlsx'` por `const XLSX = await import('xlsx')`. En `AppShell.tsx`, envolver módulos secundarios en `React.lazy()` |
| **9** | Endurecer TypeScript | En `tsconfig.app.json`, cambiar `noUnusedLocals: true` y `noUnusedParameters: true` |

---

## 5. Verification Method (Método de Verificación Independiente)

Para verificar independientemente que el saneamiento sea completo y no rompa la compilación ni la ejecución:

1. **Verificar que no queden imports o variables huérfanas con el compilador TypeScript estricto:**
   ```powershell
   cd "C:\Users\david\OneDrive\Documents\inteckno-erp"
   npx tsc -p tsconfig.app.json --noEmit --noUnusedLocals --noUnusedParameters
   ```
   *Criterio de Aprobación:* Salida vacía (0 errores, código de retorno 0).

2. **Verificar compilación limpia de producción:**
   ```powershell
   cd "C:\Users\david\OneDrive\Documents\inteckno-erp"
   npm run build
   ```
   *Criterio de Aprobación:* `tsc -b && vite build` termina con código de salida 0. El tamaño del bundle `dist/assets/index-*.js` debe reducirse significativamente respecto a los 4,971 kB actuales.

3. **Verificar cumplimiento de Regla 6 (Cero `isClearable={false}`):**
   ```powershell
   cd "C:\Users\david\OneDrive\Documents\inteckno-erp"
   Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts | Select-String -Pattern 'isClearable=\{false\}'
   ```
   *Criterio de Aprobación:* 0 coincidencias.

4. **Verificar eliminación de `SAMPLE_RECEIPTS` (Cero Mock Data):**
   ```powershell
   cd "C:\Users\david\OneDrive\Documents\inteckno-erp"
   Get-ChildItem -Path src -Recurse -Include *.tsx,*.ts | Select-String -Pattern 'SAMPLE_RECEIPTS'
   ```
   *Criterio de Aprobación:* 0 coincidencias.

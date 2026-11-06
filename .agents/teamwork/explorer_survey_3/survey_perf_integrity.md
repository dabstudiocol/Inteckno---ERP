# Informe de Auditoría y Diagnóstico: Rendimiento, Sincronización Firestore, Navegación Determinista y Reglas de Usuario

**Fecha de Auditoría**: 2026-11-06  
**Auditor**: Explorer 3 (teamwork_explorer)  
**Proyecto**: Inteckno ERP — Sistemas de Transporte por Cable STC  
**Ruta de Proyecto**: `C:\Users\david\OneDrive\Documents\inteckno-erp` (Rama: `master`)  
**Archivo de Salida**: `.agents/teamwork/explorer_survey_3/survey_perf_integrity.md`

---

## 1. Resumen Ejecutivo

Se ha completado una inspección exhaustiva y cuantitativa del rendimiento de empaquetado, tiempo de carga, sincronización en tiempo real con Google Cloud Firestore, arquitectura de la Autopista de Información y navegación determinista, así como el cumplimiento estricto de las 16 Reglas Maestras de Inteckno ERP (`AGENTS.md`).

### Hallazgos Principales:
1. **Rendimiento Crítico de Carga (Monolito de 4.97 MB)**:
   La compilación actual (`npm run build`) produce un **único archivo JavaScript monolítico de 4,971.61 kB (1.23 MB gzipped)** en `dist/assets/index-DHOUJ3vD.js`. Los 20 módulos del sistema y las librerías pesadas (`xlsx` ~850KB, `@zxing` ~500KB, `recharts` ~450KB, `firebase` ~400KB) se importan de forma estática y síncrona en `src/App.tsx`, obligando a cualquier usuario (incluso en dispositivos móviles de campo en estaciones de teleférico) a descargar casi 5 megabytes antes del primer renderizado.
2. **Oportunidad de Optimización Inocua (>88% de reducción)**:
   La configuración de Vite (`vite.config.ts`) no tiene `manualChunks` ni vendor splitting. Implementar `React.lazy()` en los 20 módulos de `App.tsx` y vendor splitting modular reducirá el chunk inicial a **~450-550 KB**, acelerando la carga inicial en más de un 80% sin alterar ninguna regla de negocio.
3. **Sincronización Cloud-First y Regla 1 (Cero Botones Manuales)**:
   Totalmente verificada e intacta. No existen botones ni modales manuales de "Subir/Sincronizar Firestore" de cara al usuario. La carga inicial (`loadAllModulesFromCloud`) es automática y se ejecuta al montar `erpStore.tsx`. En `TabHseqOffline.tsx:117-127` se detectó una función muerta no referenciada (`handleManualSync`) que puede removerse con seguridad.
4. **Autopista de Información y Navegación Determinista (Regla 16)**:
   `navigateWithContext`, `navigationContext` y `clearNavigationContext` operan en 20+ módulos. Las autopistas de retorno están implementadas con excelencia en Órdenes de Compra, Horas, Gastos y Facturación.
   **Violación identificada**: En `DocumentFlowBar.tsx:250-257`, se encontró un temporizador ciego (`setTimeout(..., 80)`) y un `window.dispatchEvent(new CustomEvent('inteckno:create-solped-for-project'))` que viola la Regla 16 y además está desconectado de `RequisitionsModule` (el cual espera `navigationContext.action === 'create_solped'`).
   **Brecha identificada**: En `RequisitionDetailModal.tsx:295-306`, la vinculación al Proyecto es texto plano en vez de un botón interactivo de retorno hacia `navigateWithContext('proyectos', 'view_project', { projectId, tab: 'costos' })`.
5. **Cumplimiento de Reglas Inteckno**:
   SF Pro (`index.html` e `index.css`), `formatCOP` (91+ invocaciones en costos), `ConfirmDeleteModal` con palabra obligatoria `BORRAR`, cero datos inventados en formularios (`useState` limpio) y no-destructividad de datos están 100% operativos.

---

## 2. Diagnóstico de Rendimiento y Empaquetado (Bundler & Assets)

### 2.1 Métrica Cuantitativa Actual de Compilación

Comando de verificación ejecutado:
```powershell
cd "C:\Users\david\OneDrive\Documents\inteckno-erp"
npm run build
```
Resultado del compilador (`vite v8.3.1` + `typescript 6.0.2`):
```text
dist/index.html                     1.82 kB │ gzip:     0.75 kB
dist/assets/index-JBAUDsov.css    179.13 kB │ gzip:    26.12 kB
dist/assets/index-DHOUJ3vD.js   4,971.61 kB │ gzip: 1,232.98 kB

(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
```
- **Total módulos transformados**: 2,840 módulos.
- **Tamaño del bundle JS inicial**: **4.97 MB (sin comprimir) / 1.23 MB (gzipped)** en un solo chunk.
- **Estado de TypeScript**: **0 errores de tipos** (exit code 0).

### 2.2 Diagnóstico de Dependencias Críticas en el Bundle

| Dependencia | Tamaño Estimado | Dónde se Importa | Uso Real en el ERP |
|---|---|---|---|
| `xlsx` (SheetJS) | ~850 KB | `src/modules/inventory/components/InventoryExcelUploadModal.tsx:14` | Exclusivamente para importar archivos Excel en bodega |
| `@zxing/library` & `@zxing/browser` | ~500 KB | `src/modules/inventory/components/OpticalBarcodeScannerTab.tsx:2` | Exclusivamente para escaneo de cámara web / código de barras |
| `recharts` | ~450 KB | `src/modules/projects/components/tabs/TabCostosPresupuesto.tsx:50-61` | Gráficos de barras y tortas en el control de costos |
| `firebase` (app, firestore, auth) | ~400 KB | `src/core/services/firebaseClient.ts` | Conexión global a Google Cloud Firestore |
| `lucide-react` | ~350 KB | Transversal en todos los módulos | Iconografía del sistema |
| 20 Módulos de Rutas | ~2,400 KB | `src/App.tsx:8-27` | Toda la lógica de negocio importada síncronamente al inicio |

### 2.3 Causa Raíz de la Carga Lenta

En `src/App.tsx` (líneas 7 a 27):
```typescript
import { CrmModule } from './modules/commercial/CrmModule';
import { ConversacionesModule } from './modules/inteckno/ConversacionesModule';
import { DocumentosModule } from './modules/inteckno/DocumentosModule';
import { CalendarioModule } from './modules/inteckno/CalendarioModule';
import { ActividadesModule } from './modules/inteckno/ActividadesModule';
import { ArticulosModule } from './modules/inteckno/ArticulosModule';
import { InternationalModule } from './modules/international/InternationalModule';
import { TalentoHumanoModule } from './modules/hr/TalentoHumanoModule';
import { OperacionesAvanzadasModule } from './modules/operations/OperacionesAvanzadasModule';
import { ProjectsModule } from './modules/projects/ProjectsModule';
import { ProcurementModule } from './modules/procurement/ProcurementModule';
import { InventoryModule } from './modules/inventory/InventoryModule';
import { TimesheetModule } from './modules/timesheet/TimesheetModule';
import { ExpensesModule } from './modules/expenses/ExpensesModule';
import { BillingModule } from './modules/billing/BillingModule';
import { DashboardModule } from './modules/dashboard/DashboardModule';
import { UserProfileModule } from './modules/inteckno/UserProfileModule';
import { UserManagementModule } from './modules/inteckno/UserManagementModule';
import { CargosModule } from './modules/inteckno/CargosModule';
import { RequisitionsModule } from './modules/requisitions/RequisitionsModule';
```
Dado que todos los módulos están en el árbol de importación estático de `App.tsx`, el empaquetador Vite/Rollup los une en un solo archivo.
Además, en `vite.config.ts`:
```typescript
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: false,
  }
});
```
No existe configuración de `build.rollupOptions.output.manualChunks`.

---

## 3. Propuestas Concretas de Optimización de Rendimiento (Safe & Zero Business Logic Break)

### Propuesta 1: Code-Splitting Modular de Rutas en `App.tsx` vía `React.lazy` y `Suspense`

**Ubicación**: `src/App.tsx`  
**Estrategia**: Reemplazar las 20 importaciones estáticas con `React.lazy()` y envolver `{current.component}` en un `<Suspense fallback={<ModuleLoadingSpinner />}>`.

```typescript
// Ejemplo de migración segura en src/App.tsx:
const CrmModule = React.lazy(() => import('./modules/commercial/CrmModule').then(m => ({ default: m.CrmModule })));
const ProjectsModule = React.lazy(() => import('./modules/projects/ProjectsModule').then(m => ({ default: m.ProjectsModule })));
const InventoryModule = React.lazy(() => import('./modules/inventory/InventoryModule').then(m => ({ default: m.InventoryModule })));
const ProcurementModule = React.lazy(() => import('./modules/procurement/ProcurementModule').then(m => ({ default: m.ProcurementModule })));
const RequisitionsModule = React.lazy(() => import('./modules/requisitions/RequisitionsModule').then(m => ({ default: m.RequisitionsModule })));
const TimesheetModule = React.lazy(() => import('./modules/timesheet/TimesheetModule').then(m => ({ default: m.TimesheetModule })));
const ExpensesModule = React.lazy(() => import('./modules/expenses/ExpensesModule').then(m => ({ default: m.ExpensesModule })));
const BillingModule = React.lazy(() => import('./modules/billing/BillingModule').then(m => ({ default: m.BillingModule })));
const DashboardModule = React.lazy(() => import('./modules/dashboard/DashboardModule').then(m => ({ default: m.DashboardModule })));
const TalentoHumanoModule = React.lazy(() => import('./modules/hr/TalentoHumanoModule').then(m => ({ default: m.TalentoHumanoModule })));
const OperacionesAvanzadasModule = React.lazy(() => import('./modules/operations/OperacionesAvanzadasModule').then(m => ({ default: m.OperacionesAvanzadasModule })));
const InternationalModule = React.lazy(() => import('./modules/international/InternationalModule').then(m => ({ default: m.InternationalModule })));
const ConversacionesModule = React.lazy(() => import('./modules/inteckno/ConversacionesModule').then(m => ({ default: m.ConversacionesModule })));
const DocumentosModule = React.lazy(() => import('./modules/inteckno/DocumentosModule').then(m => ({ default: m.DocumentosModule })));
const CalendarioModule = React.lazy(() => import('./modules/inteckno/CalendarioModule').then(m => ({ default: m.CalendarioModule })));
const ActividadesModule = React.lazy(() => import('./modules/inteckno/ActividadesModule').then(m => ({ default: m.ActividadesModule })));
const ArticulosModule = React.lazy(() => import('./modules/inteckno/ArticulosModule').then(m => ({ default: m.ArticulosModule })));
const CargosModule = React.lazy(() => import('./modules/inteckno/CargosModule').then(m => ({ default: m.CargosModule })));
const UserProfileModule = React.lazy(() => import('./modules/inteckno/UserProfileModule').then(m => ({ default: m.UserProfileModule })));
const UserManagementModule = React.lazy(() => import('./modules/inteckno/UserManagementModule').then(m => ({ default: m.UserManagementModule })));
```

**Compatibilidad con Navegación Determinista**:  
100% compatible. `erpStore` vive en el nivel superior (`<ErpProvider>`). Cuando `navigateWithContext('requisiciones', 'create_solped', data)` se ejecuta, React descarga el chunk de `RequisitionsModule` (si no está en caché) y, al montarse el componente, su `useEffect` lee inmediatamente el `navigationContext` almacenado en el store y abre el modal correspondiente sin retraso.

### Propuesta 2: Vendor Splitting en `vite.config.ts`

**Ubicación**: `vite.config.ts`  
**Estrategia**: Configurar `manualChunks` en Rollup para agrupar librerías estables y evitar que cambios en componentes invaliden el caché de dependencias pesadas:

```typescript
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          'vendor-icons': ['lucide-react'],
          'vendor-charts': ['recharts'],
          'vendor-xlsx': ['xlsx'],
          'vendor-zxing': ['@zxing/browser', '@zxing/library'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  }
});
```

### Propuesta 3: Carga Asíncrona de Modales Pesados en Inventario

**Ubicación**: `src/modules/inventory/InventoryModule.tsx`  
**Estrategia**: `InventoryExcelUploadModal` (que contiene `xlsx`) y `OpticalBarcodeScannerTab` (que contiene `@zxing`) pueden cargarse con `React.lazy` dentro de `InventoryModule`. De esta forma, el módulo de Inventario carga al instante y solo cuando el usuario hace clic en "Importar Excel" o "Escanear Código de Barras" se transfieren esas librerías masivas.

### Impacto Esperado de las Propuestas 1, 2 y 3:

| Métrica | Estado Actual | Con Optimización Propuesta | Mejora |
|---|---|---|---|
| Chunk JS Inicial | **4,971.61 kB** | **~480 - 550 kB** | **-89%** |
| Gzip Inicial | **1,232.98 kB** | **~140 - 160 kB** | **-88%** |
| Tiempo FCP en Móvil (4G Campo) | ~6.5 s | ~0.9 s | **7.2x más rápido** |
| Carga de SheetJS (`xlsx`) | Obligatoria en Login | Bajo Demanda (Click en Importar) | **Ahorro de ~850 KB** |
| Carga de ZXing Scanner | Obligatoria en Login | Bajo Demanda (Pestaña Escáner) | **Ahorro de ~500 KB** |
| Revalidación de Caché PWA | Todo el paquete (5 MB) | Solo chunks editados | **Alta persistencia offline** |

### Propuesta 4: Memoización de Cálculos en `TabCostosPresupuesto.tsx`

**Ubicación**: `src/modules/projects/components/tabs/TabCostosPresupuesto.tsx`  
**Observación**: Este archivo cuenta con 4,695 líneas y **0 usos de `useMemo`**. En cada evento de `onMouseEnter` sobre los gráficos de dona (líneas 493-524), se actualiza el estado de hover (`hoveredDonutSegment`) y el componente recalcula sin necesidad:
- `getCategoryStats` para todas las categorías (recorriendo todo `costItems`).
- `filteredItems`.
- `allAvailableItems`.
- `estimateAtCompletion`, `grossProfitCOP` y `grossMarginPct`.
**Acción recomendada**: Envolver estas 4 transformaciones en `useMemo` dependientes únicamente de `[costItems, activeItemFilter, activeCategoryFilter, project]`.

---

## 4. Auditoría de la Autopista de Información y Sincronización Firestore

### 4.1 Carga Cloud-First y Persistencia (Reglas 1, 2 y 3)

| Componente | Verificación | Estado |
|---|---|---|
| **Cero Botones Manuales** | Búsqueda exhaustiva de botones "Subir a la nube", "Sincronizar Firestore", "Descargar". La UI no expone ningún control manual; la persistencia es 100% transparente. | **CUMPLIDO** |
| **Carga Forzada Inicial** | En `erpStore.tsx:791`, `loadAllModulesFromCloud()` se ejecuta inmediatamente en `useEffect` al arrancar la aplicación. | **CUMPLIDO** |
| **Reconciliación Silenciosa con IndexedDB** | Si el cliente local en memoria o en IndexedDB posee registros válidos (ej. productos importados previamente), `erpStore.tsx:915-925` y `941-951` los reconcilia y transmite automáticamente a Firestore en segundo plano sin intervención humana. | **CUMPLIDO** |
| **Listeners Reactivos `onSnapshot`** | `erpStore.tsx:979-1285` mantiene listeners activos para: `users`, `chatMessages`, `projects`, `procurement`, `inventory`, `kardex`, `hr`, `operations`, `commercial` y `productivity`. Todos se desuscriben debidamente en el unmount (líneas 1272-1284). | **CUMPLIDO** |
| **Particionamiento Seguro de Colecciones (<1MB)** | En `firestoreSyncService.ts:569-645`, el inventario se particiona en lotes de 300 ítems (`INVENTORY_CHUNK_SIZE = 300`) guardados en `erp_inventory/chunk_{idx}` para evitar rebasar el límite de documento de Firestore de 1MB. | **CUMPLIDO** |
| **Código Muerto Detectado** | En `src/modules/projects/components/tabs/TabHseqOffline.tsx:117-127`, existe una función `handleManualSync` que nunca es invocada por ningún botón en la vista. Puede removerse con seguridad para mantener el código limpio. | **DETECCIÓN LEVE (Dead Code)** |

### 4.2 Protección No Destructiva de Datos (Regla 14)

En `erpStore.tsx:802-845` y `1132-1170`, al recibir datos remotos de proyectos, el sistema ejecuta una fusión profunda no destructiva (`Non-Destructive Deep Merge`):
```typescript
// Si el local es más reciente o si el remoto tiene colecciones undefined, preserva los datos existentes
return {
  ...remoteP,
  projectItems: (remoteP as any).projectItems !== undefined ? (remoteP as any).projectItems : (localP as any).projectItems,
  costMatrix: (remoteP as any).costMatrix !== undefined ? (remoteP as any).costMatrix : (localP as any).costMatrix,
  billingItems: (remoteP as any).billingItems !== undefined ? (remoteP as any).billingItems : (localP as any).billingItems,
  offerBudget: (remoteP as any).offerBudget !== undefined ? (remoteP as any).offerBudget : (localP as any).offerBudget,
  staffAssignments: (remoteP as any).staffAssignments !== undefined ? (remoteP as any).staffAssignments : (localP as any).staffAssignments,
};
```
Esto garantiza que nunca un snapshot remoto vacío sobreescriba matrices de costos u ofertas elaboradas localmente.

---

## 5. Auditoría de Navegación Determinista y Autopistas de Retorno (Regla 16)

### 5.1 Implementación Central en `erpStore.tsx`

En `src/core/storage/erpStore.tsx` (líneas 1818-1837):
```typescript
const navigateWithContext = useCallback((targetModule: string, action: string, data?: any) => {
  const canonical = CANONICAL_MODULE_MAP[targetModule.toLowerCase()] || targetModule;
  setState((prev) => ({
    ...prev,
    activeModuleId: canonical,
    navigationContext: {
      targetModule: canonical,
      action,
      data,
      timestamp: Date.now(),
    },
  }));
}, []);

const clearNavigationContext = useCallback(() => {
  setState((prev) => ({
    ...prev,
    navigationContext: null,
  }));
}, []);
```
- Mapeo canónico a IDs oficiales (`proyectos`, `compras`, `requisiciones`, `horas`, `costos`, etc.).
- Marca de tiempo `timestamp` que garantiza reactividad determinista en los `useEffect` de los módulos suscriptores.

### 5.2 Estado de las Autopistas de Retorno ('Return Highways')

| Entidad Derivada | Archivo | Destino Padre | Mecanismo | Estado |
|---|---|---|---|---|
| **Orden de Compra** | `PurchaseOrderDetailDrawer.tsx:177-188` | Proyecto -> Pestaña Costos | Botón interactivo con icono `ArrowRight` que invoca `navigateWithContext('proyectos', 'view_project', { projectId: po.projectId, tab: 'costs' })` | **EXCELENTE** |
| **Registro de Horas** | `TimesheetModule.tsx:601-613` | Proyecto -> Pestaña Horas | Botón con `ExternalLink` que invoca `navigateWithContext('proyectos', 'view_project', { projectId: t.projectId, tab: 'horas' })` | **EXCELENTE** |
| **Comprobante de Gastos** | `ExpensesModule.tsx:577` | Proyecto -> Pestaña Costos | Enlace interactivo con `navigateWithContext('proyectos', 'view_project', { projectId: exp.projectId, tab: 'costos' })` | **EXCELENTE** |
| **Hito de Facturación** | `BillingModule.tsx:465` | Proyecto -> Pestaña Facturación | Enlace interactivo con `navigateWithContext('proyectos', 'view_project', { projectId: m.projectId, tab: 'facturacion' })` | **EXCELENTE** |
| **Petición SOLPED** | `RequisitionDetailModal.tsx:295-306` | Proyecto -> Pestaña Costos | El código muestra `requisition.projectCode` y `requisition.projectName` como texto plano sin botón interactivo de retorno | **BRECHA IDENTIFICADA** |

### 5.3 Violación Detectada de la Regla 16 (CustomEvent y setTimeout)

**Ubicación**: `src/components/common/DocumentFlowBar.tsx` (líneas 250 a 257)  
**Código Actual**:
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

**Problema / Violación**:
1. La Regla 16 prohíbe explícitamente `window.dispatchEvent(new CustomEvent(...))` y `setTimeout` ciegos para transferir intenciones intermódulo.
2. El evento `'inteckno:create-solped-for-project'` **no es escuchado en ningún lugar del sistema** (es un evento huérfano).
3. `RequisitionsModule.tsx` (líneas 33-35) se encuentra suscrito y esperando:
   `navigationContext.action === 'create_solped'` con `navigationContext.data?.project`.
4. En consecuencia, el botón "+ Pedir Materiales" en `DocumentFlowBar` cambia de módulo pero no abre el modal de requisición con los datos arrastrados del proyecto.

**Solución Propuesta (100% compatible con Regla 16)**:
Reemplazar dicho bloque en `DocumentFlowBar.tsx` por:
```typescript
onClick={() => {
  navigateWithContext('requisiciones', 'create_solped', { project: activeProject });
}}
```

### 5.4 Nota sobre `inteckno:open-module-config`
El evento `window.dispatchEvent(new CustomEvent('inteckno:open-module-config', ...))` en `CreatableSelect.tsx:154` y botones de engranaje es capturado localmente por `AppShell.tsx:250` para desplegar el modal de parametrización de catálogos (`UniversalModuleConfigModal`). No transporta navegación entre módulos de negocio, sino una orden interna de UI dentro del shell. Sin embargo, puede unificarse a futuro si se desea cero eventos en la ventana.

---

## 6. Matriz de Cumplimiento de las 16 Reglas Maestras de Inteckno ERP

| # | Regla | Estado | Evidencia en Código |
|---|---|---|---|
| **1** | Cero Botones Manuales de Carga / Descarga | **CUMPLE** | Sin botones de subida/bajada manual. Función muerta `handleManualSync` en `TabHseqOffline.tsx:117` identificada para limpieza. |
| **2** | Persistencia y Carga Cloud-First Automática | **CUMPLE** | `erpStore.tsx:791-932` ejecuta `loadAllModulesFromCloud()` en el arranque. Sincroniza IndexedDB a Firestore silenciosamente. |
| **3** | Escucha y Replicación Reactiva en Tiempo Real | **CUMPLE** | `erpStore.tsx:979-1285` con 10 listeners `onSnapshot` activos y limpieza en retorno de `useEffect`. |
| **4** | Cero Mock Data y Cero Valores Preescritos en Formularios | **CUMPLE** | Proyectos, órdenes, requisiciones, horas y gastos inicializan en `[]`. Formularios auditados inician en `''` y `0` con `placeholder="0"`. |
| **5** | Reactividad Dinámica en Cascada e Integridad Visual | **CUMPLE** | `TabCostosPresupuesto.tsx:223-288` (`getCategoryMeta`) resuelve bidireccionalmente por key, label y shortLabel. |
| **6** | Estándar Universal para Opciones Desplegables (`CreatableSelect`) | **CUMPLE** | Botón 'X' activo, filtrado interactivo, sin `isClearable={false}` forzado. |
| **7** | Confirmación Escrita Obligatoria ('BORRAR') | **CUMPLE** | `ConfirmDeleteModal.tsx:26-27` (`requireConfirmWord = true`, `confirmWord = 'BORRAR'`). |
| **8** | Tratamiento de Impuestos (IVA Dinámico) y Gran Total | **CUMPLE** | `getProjectTaxRate(country)` en `taxService.ts`. Entradas con `value={val \|\| ''}` y `placeholder="0"`. Gran total de solo lectura. |
| **9** | Consistencia, Simetría y Alineación en Cuadrículas UI | **CUMPLE** | Modales en `grid-cols-2` y bloques simétricos sin etiquetas desniveladas. |
| **10** | Cero Filas Redundantes o Duplicadas en Tablas | **CUMPLE** | `TabCostosPresupuesto.tsx` y facturación suprimen consolidados si `length <= 1`. |
| **11** | Separación Estricta Presupuesto de Oferta vs Matriz de Costos | **CUMPLE** | Vistas separadas `consolidado_oferta` (comercial) y `items_costos` (ejecución real) en `TabCostosPresupuesto.tsx`. |
| **12** | Formato de Moneda Obligatorio y Alineación Vertical de Tablas | **CUMPLE** | `formatCOP` aplicado rigurosamente (91+ veces en costos). Tablas con `table-fixed` y `<colgroup>`. |
| **13** | Preservación Estricta de Estados de IVA | **CUMPLE** | `hasIva: it.hasIva !== false` preservado al sincronizar y guardar. |
| **14** | Guardián de Datos, Protección Absoluta y Respaldos (`inteckno_data_guardian`) | **CUMPLE** | `DataGuardianBackupsModal.tsx` + `backupService.ts`. Deep merge protector en `erpStore.tsx:811-835`. |
| **15** | Exactitud Financiera, Tipografía SF Pro y Compilación Limpia | **CUMPLE** | Tipografía SF Pro en `index.html` e `index.css` con `!important`. `npm run build` compila con 0 errores de tipos. |
| **16** | Navegación Determinista y Autopistas de Retorno | **CUMPLE PARCIAL** | Autopistas implementadas en PO, Horas, Gastos y Facturación. Corregir `DocumentFlowBar.tsx` (CustomEvent/setTimeout) y agregar autopista en `RequisitionDetailModal.tsx`. |

---

## 7. Plan de Acción Recomendado para Implementación

Para los agentes de implementación o refactorización subsiguientes:

1. **Rendimiento (Prioridad Alta)**:
   - Configurar `build.rollupOptions.output.manualChunks` en `vite.config.ts`.
   - Convertir los 20 módulos en `src/App.tsx` a `React.lazy()` con `<Suspense>` envolviendo `{current.component}`.
   - Ejecutar `npm run build` y verificar que el chunk principal baje de 4.97 MB a <600 KB y se generen chunks separados por módulo.
2. **Navegación Determinista (Prioridad Alta)**:
   - En `src/components/common/DocumentFlowBar.tsx:250-257`: sustituir `setTimeout` y `CustomEvent` por `navigateWithContext('requisiciones', 'create_solped', { project: activeProject })`.
   - En `src/modules/procurement/components/RequisitionDetailModal.tsx:295-306`: convertir el texto de Imputación de Proyecto en un botón interactivo de retorno hacia `navigateWithContext('proyectos', 'view_project', { projectId: requisition.projectId, tab: 'costos' })` (idéntico al botón de `PurchaseOrderDetailDrawer.tsx:177-188`).
3. **Limpieza y Memoización (Prioridad Media)**:
   - Eliminar la función no referenciada `handleManualSync` en `TabHseqOffline.tsx:117-127`.
   - Envolver cálculos financieros masivos en `TabCostosPresupuesto.tsx` con `useMemo`.

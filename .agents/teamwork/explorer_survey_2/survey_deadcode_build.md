# Auditoría Integral de Código Muerto, Dependencias, TypeScript y Salud de Compilación
**Proyecto:** Inteckno ERP (`C:\Users\david\OneDrive\Documents\inteckno-erp`)  
**Fecha de Auditoría:** 2026-11-06  
**Investigador:** Explorer 2 (teamwork_explorer)  
**Rango de Alcance:** `src/`, `package.json`, `tsconfig*.json`, `vite.config.ts`

---

## 1. Resumen Ejecutivo

Inteckno ERP compila actualmente sin errores mediante `npm run build` (`tsc -b && vite build`) en aproximadamente 2.9 segundos. Sin embargo, esta aparente "salud" se debe a que la configuración del compilador TypeScript (`tsconfig.app.json`) tiene deshabilitadas las directivas de detección de código muerto (`noUnusedLocals: false`, `noUnusedParameters: false`, `strict: false`).

Al someter el repositorio a un análisis estricto de uso de símbolos, imports, exports y reglas de negocio, se descubrió:
- **720 elementos no utilizados** (imports muertos, variables no leídas y setters huérfanos) distribuidos a lo largo de **86 archivos** de código fuente.
- **6 archivos 100% huérfanos (código muerto total)** que suman **1,593 líneas** sin referencia alguna en el árbol de dependencias.
- **3 dependencias npm no utilizadas** en código (`clsx`, `tailwind-merge`, `scheduler`) y 1 dependencia pesada (`xlsx` ~1MB) que se empaqueta sincrónicamente.
- **Un paquete de producción monolítico de 4.97 MB** (`dist/assets/index-DHOUJ3vD.js`) generado sin división de código (*code-splitting* ni `React.lazy`).
- **Incumplimientos puntuales de las Reglas Maestras de Inteckno ERP**, incluyendo:
  - 1 violación estricta de la **Regla 6** (`isClearable={false}` en `OpticalBarcodeScannerTab.tsx:788`).
  - 3 violaciones de la **Regla 4 (Cero Mock Data)**: una colección de 150 líneas de recibos y facturas simuladas con gráficos SVG en `src/core/services/aiVisionExpenseService.ts` (`SAMPLE_RECEIPTS`), valores preescritos en formularios de `OperacionesAvanzadasModule.tsx` y `BillingModule.tsx`, y 18 colecciones de prueba importadas en `erpStore.tsx` desde `src/seed/intecknoData.ts` (archivo de 180 KB / 4,777 líneas).
  - Lógica duplicada en formateo de moneda (`formatCOP` re-implementado localmente en `TabWbsGantt.tsx`).

---

## 2. Auditoría de Dependencias (`package.json`)

### 2.1 Dependencias de Producción (`dependencies`)

| Dependencia | Versión | Estado de Uso | Hallazgo y Recomendación |
|---|---|---|---|
| `clsx` | `^2.1.1` | **No utilizada** | 0 ocurrencias en `src/`. Seguro de eliminar de `package.json` para aligerar `node_modules`. |
| `tailwind-merge` | `^3.7.0` | **No utilizada** | 0 ocurrencias en `src/`. Seguro de eliminar de `package.json`. |
| `scheduler` | `^0.28.0` | **No utilizada** | 0 importaciones directas en `src/`. React la incluye internamente si la requiere; no debe estar en `dependencies` directas. |
| `@zxing/library` | `^0.23.0` | **No importada directamente** | Es `peerDependency` requerida por `@zxing/browser`. Debe conservarse para evitar advertencias de gestores de paquetes, pero se documenta que no se importa en código. |
| `@zxing/browser` | `^0.2.1` | **Activa** | Importada en `src/modules/inventory/components/OpticalBarcodeScannerTab.tsx`. |
| `firebase` | `^12.19.0` | **Activa** | Núcleo de persistencia y listeners reactivos (`firebaseClient.ts`, `firestoreSyncService.ts`). |
| `lucide-react` | `^1.47.0` | **Activa con exceso de imports** | Usada en toda la UI, pero contiene **447 iconos importados que nunca se renderizan**. |
| `react` | `^19.2.8` | **Activa** | Framework central. |
| `react-dom` | `^19.2.8` | **Activa** | Punto de entrada ReactDOM. |
| `recharts` | `^3.10.1` | **Activa** | Usada en `DashboardModule`, `ProcurementReportsDashboard` y `TabCostosPresupuesto`. Candidata prioritaria a carga perezosa (`React.lazy`). |
| `xlsx` | `^0.18.5` | **Activa (Impacto Crítico en Bundle)** | Usada exclusivamente en `src/modules/inventory/components/InventoryExcelUploadModal.tsx`. Por estar importada estáticamente, infla el chunk principal con casi 1 MB de código minificado. Debe importarse dinámicamente (`import('xlsx')`). |

### 2.2 Dependencias de Desarrollo (`devDependencies`)

| Paquete | Versión | Estado |
|---|---|---|
| `@tailwindcss/vite` | `^4.3.3` | Activo en `vite.config.ts`. |
| `@types/node` | `^24.13.3` | Activo para resolución de rutas y scripts Node. |
| `@types/react` | `^19.2.18` | Tipado React 19. |
| `@types/react-dom` | `^19.2.7` | Tipado ReactDOM 19. |
| `@vitejs/plugin-react` | `^6.1.1` | Plugin oficial React en `vite.config.ts`. |
| `tailwindcss` | `^4.3.3` | Motor Tailwind CSS v4. |
| `typescript` | `~6.0.2` | Compilador TypeScript del proyecto. |
| `vite` | `^8.3.0` | Bundler y servidor de desarrollo. |

---

## 3. Salud de Compilación y Configuración TypeScript

### 3.1 Análisis de `tsconfig.json` y `tsconfig.app.json`

En `tsconfig.app.json`:
```json
{
  "compilerOptions": {
    "composite": true,
    "strict": false,
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "moduleResolution": "bundler"
  }
}
```

**Diagnóstico:**
- `noUnusedLocals: false` oculta **720 advertencias/errores** de imports y variables huérfanas.
- `noUnusedParameters: false` oculta **29 parámetros** declarados en funciones y componentes que nunca se leen.
- `strict: false` permite tipos implícitos y anula la rigurosidad requerida para producción de alta estabilidad.
- **Objetivo de Saneamiento:** Al limpiar los 720 imports y parámetros muertos, `noUnusedLocals: true` y `noUnusedParameters: true` deben activarse permanentemente sin que `npm run build` falle.

### 3.2 Análisis del Bundle de Producción (`vite build`)

Resultado de `npm run build`:
```text
dist/index.html                     1.82 kB │ gzip:     0.75 kB
dist/assets/index-JBAUDsov.css    179.13 kB │ gzip:    26.12 kB
dist/assets/index-DHOUJ3vD.js   4,971.61 kB │ gzip: 1,232.98 kB

(!) Some chunks are larger than 500 kB after minification.
```

**Causas del Bundle Monolítico (~5 MB):**
1. **Cero División de Código (*Code Splitting*):** `AppShell.tsx` importa directamente de forma estática los 14 módulos del sistema (`ProjectsModule`, `CrmModule`, `InventoryModule`, `BillingModule`, `ExpensesModule`, `TalentoHumanoModule`, etc.).
2. **Empaquetado Estático de Librerías Masivas:** Librerías de gran tamaño como `xlsx` (SheetJS) y `recharts` están incluidas en el bundle inicial que el usuario debe descargar antes de ver el login o el dashboard.
3. **Inclusión de Datos Semilla Masivos:** `src/seed/intecknoData.ts` (180 KB) se procesa por Vite porque `erpStore.tsx` importa de él.

---

## 4. Archivos Huérfanos (100% Código Muerto en el Repositorio)

Mediante análisis de grafo de dependencias sobre los 138 archivos `.ts`/`.tsx` en `src/`, se identificaron **6 archivos huérfanos** que no son importados ni directa ni indirectamente por ningún otro archivo del proyecto:

| # | Archivo Huérfano | Líneas | Tamaño | Diagnóstico y Acción Recomendada |
|---|---|---|---|---|
| 1 | `src/components/chat/RecordChatter.tsx` | 479 | 19.0 KB | Componente de chat por registro/audio. Ningún módulo lo importa. Candidato a eliminación o archivo. |
| 2 | `src/components/common/DocumentFlowBar.tsx` | 369 | 16.9 KB | Barra de flujo documental interactiva. Reemplazada o abandonada en la UI. 0 imports en todo el repositorio. Seguro de eliminar. |
| 3 | `src/components/ui/GanttChart.tsx` | 363 | 12.8 KB | Componente visual de diagrama de Gantt antiguo. El ERP utiliza oficialmente `TabWbsGantt.tsx` para WBS y Gantt. 0 imports. Seguro de eliminar. |
| 4 | `src/core/registry/moduleRegistry.ts` | 68 | 1.7 KB | Registro modular descontinuado. El sistema oficial de control de acceso y navegación es `rbac.ts` y `erpStore.tsx`. Seguro de eliminar. |
| 5 | `src/modules/projects/types/ProjectSTCSchema.ts` | 203 | 7.9 KB | Definición duplicada de esquemas STC (`PipingDynamicData`, `StructuresDynamicData`, `TanksDynamicData`). Ningún módulo importa este archivo; el proyecto usa `src/types/ProjectSchema.ts` y `src/types/index.ts`. Seguro de eliminar. |
| 6 | `src/utils/rfqOptimizer.ts` | 111 | 4.1 KB | Funciones de consolidación de compras por volumen (`groupRequisitionsForVolumePurchasing`, `detectPriceInflation`). 0 referencias en todo el proyecto. Posee variables muertas internas (`safeProducts`, `safePartners`). Seguro de eliminar o mover a servicio de abastecimiento si se requiere a futuro. |

**Total de código huérfano identificado:** **1,593 líneas** (62.4 KB de código fuente no funcional).

---

## 5. Auditoría de Imports No Utilizados y Variables Muertas (720 Casos)

Al auditar con `tsc --noEmit --noUnusedLocals`, se registraron **720 elementos no leídos** en **86 archivos**.

### 5.1 Clasificación de los 720 Elementos Muertos

```
Total elementos no utilizados: 720
├── Iconos no renderizados de lucide-react : 447 (62.1%)
├── Tipos / Interfaces importadas sin uso :  74 (10.3%)
├── Variables de estado / Setters huérfanos:  54 ( 7.5%)
├── Arrays de datos semilla (SEED_*)      :  18 ( 2.5%)
├── Manejadores / Handlers descolgados    :  18 ( 2.5%)
└── Constantes / Funciones / Helpers      : 109 (15.1%)
```

### 5.2 Los 25 Archivos con Mayor Concentración de Imports y Código Muerto

| # | Archivo | Cantidad | Elementos Clave No Utilizados |
|---|---|---|---|
| 1 | `src/modules/procurement/ProcurementModule.tsx` | 32 | `AlertTriangle`, `FileCheck`, `ShieldAlert`, `DollarSign`, `Download`, `Sparkles`, `Package`, `Layers`, `Upload`, `Check`, `RotateCcw`, `AiDocumentUploader`, `formatTRM`, `currentUser`, `approvePurchaseOrderGM`, `receivePurchaseOrderPartial`, `updateRequisition`, `poOrderNumber`, `setPoOrderNumber`, `customSupplierTaxId`, `setSelectedSupplierId`, `setDestinationType`, `setSelectedProjectId`, `setGeneralArea`, `setPoDate`, `pendingReceiptPOs`, `addItemRow`, `updateItemRow`, `handleSelectCatalogItem`, `removeItemRow`, `handleAiExtracted`, `handleRegisterPo` |
| 2 | `src/modules/projects/components/tabs/TabCostosPresupuesto.tsx` | 32 | `AlertCircle`, `Briefcase`, `ShieldCheck`, `Gauge`, `Flame`, `Clock`, `CheckCircle2`, `ChevronDown`, `Calculator`, `Save`, `Eye`, `Edit`, `Edit2`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `CartesianGrid`, `formatUSD`, `setActiveModule`, `offerBudgetSavedMessage`, `setOfferBudgetSavedMessage`, `showFinancialCharts`, `setShowFinancialCharts`, `setActiveItemFilter`, `totalTimesheetHours`, `estimatedTimesheetCostCOP`, `totalVariance`, `filteredItems`, `advanceAmount` |
| 3 | `src/modules/inteckno/DocumentosModule.tsx` | 31 | `Download`, `Plus`, `Share2`, `Link`, `HardDrive`, `FileUp`, `HelpCircle`, `Calendar`, `MessageSquare`, `Clock`, `Maximize2`, `Filter`, `getAdminConsentUrl`, `users`, `navigateWithContext`, `activeMenuFolderId`, `activeMenuDocId`, `catalogCategories`, `catalogDepartments`, `catalogScopes`, `catalogFileTypes`, `uploadMode`, `setUploadMode`, `selectedBatchFiles`, `batchScope`, `batchDepartment`, `batchFolderName`, `batchLinksText`, `setAzureTenantId`, `isAuthenticatingM365`, `setIsAuthenticatingM365` |
| 4 | `src/modules/inventory/InventoryModule.tsx` | 29 | `useEffect`, `useMemo`, `useRef`, `Wrench`, `AlertTriangle`, `Calendar`, `ShieldAlert`, `FileCheck2`, `Layers`, `Sparkles`, `Droplets`, `Boxes`, `Wind`, `HardHat`, `ScanLine`, `Cpu`, `Printer`, `Send`, `Loader2`, `InventoryAuditLog`, `LightTable`, `setAllRemissions`, `adjustProductStock`, `setActiveModule`, `scannedResult`, `scanMessage`, `uniqueLocations`, `handleBarcodeScan`, `isLowStock` |
| 5 | `src/core/storage/erpStore.tsx` | 23 | `SEED_PROJECTS`, `SEED_TASKS`, `SEED_PRODUCTS`, `SEED_PURCHASE_ORDERS`, `SEED_REQUISITIONS`, `SEED_BILLING_MILESTONES`, `SEED_TIMESHEETS`, `SEED_EXPENSES`, `SEED_DDRS`, `SEED_OPPORTUNITIES`, `SEED_CHAT_MESSAGES`, `SEED_DOCUMENTS`, `SEED_TODOS`, `SEED_CALENDAR_EVENTS`, `SEED_INTERNATIONAL_LEADS`, `SEED_EMPLOYEES`, `SEED_REMISSIONS`, `SEED_INVENTORY_AUDIT_LOGS`, `domainEventBus`, `clearIdb`, `loadUsersFromCloud`, `SupportedCollection`, `projectTrmForCost` |
| 6 | `src/modules/international/components/InternationalCalculator.tsx` | 20 | `Calculator`, `Plane`, `Truck`, `ShieldAlert`, `FileText`, `Percent`, `Check`, `ChevronDown`, `ChevronUp`, `AlertTriangle`, `Info`, `Layers`, `HelpCircle`, `FreightMode`, `PackagingType`, `ContainerType`, `ComplianceStandard`, `setActiveModule`, `configuredCurrencies`, `handleApplyPreset` |
| 7 | `src/modules/projects/components/tabs/TabDashboard.tsx` | 20 | `AlertTriangle`, `CheckCircle2`, `Calendar`, `Compass`, `Zap`, `Wrench`, `Cpu`, `Clock`, `ShoppingCart`, `Receipt`, `FileText`, `Users`, `Sun`, `CloudRain`, `Wind`, `Check`, `MessageSquare`, `formatUSD`, `setActiveModule`, `navigateWithContext` |
| 8 | `src/modules/dashboard/DashboardModule.tsx` | 18 | `ShoppingCart`, `Package`, `AlertCircle`, `CheckCircle`, `ShieldAlert`, `Receipt`, `Sparkles`, `Calendar`, `AlertTriangle`, `DollarSign`, `PieChart`, `Layers`, `ArrowRight`, `requisitions`, `users`, `approveTimesheet`, `approvePurchaseOrderGM`, `signMilestoneAct` |
| 9 | `src/modules/billing/BillingModule.tsx` | 17 | `FileText`, `AlertTriangle`, `Send`, `Building2`, `Sparkles`, `DianRutData`, `formatUSD`, `isNewMilestoneModalOpen`, `setMsPercentage`, `setMsDueDate`, `setActSignerRole`, `handleUsdChange`, `handleCopChange`, `handleCreateMilestoneSubmit`, `handleSignActSubmit`, `isFinance`, `prj` |
| 10 | `src/modules/inteckno/CalendarioModule.tsx` | 17 | `Mail`, `Settings2`, `Send`, `Sparkles`, `Mic`, `MicOff`, `Sun`, `RefreshCw`, `Layers`, `Key`, `User`, `parseCalendarEventWithAi`, `MargaritaIcon`, `isSyncingApi`, `handleConnectMicrosoftAccount`, `handleSyncSingleEventToGraph`, `style` |
| 11 | `src/modules/inteckno/CargosModule.tsx` | 16 | `useRef`, `Target`, `HardHat`, `CheckCircle2`, `AlertTriangle`, `ChevronRight`, `FileText`, `Filter`, `UserCheck`, `Star`, `ExternalLink`, `Clock`, `Layers`, `Send`, `EvaluationScoreCriterion`, `analyzedCvResult` |
| 12 | `src/modules/inteckno/UserManagementModule.tsx` | 16 | `UserCheck`, `Calendar`, `Building2`, `Award`, `Plus`, `Trash2`, `UserIcon`, `ChevronRight`, `BadgeCheck`, `ModulePermissionInfo`, `setAuditFilterUser`, `setAuditDateFrom`, `setAuditDateTo`, `newCompetencyInput`, `setNewCompetencyInput`, `editPhotoInputRef` |
| 13 | `src/modules/international/components/GlobalOpportunityRadar.tsx` | 16 | `Globe2`, `TrendingUp`, `DollarSign`, `ArrowRight`, `Filter`, `Briefcase`, `Layers`, `ChevronRight`, `Clock`, `ShieldCheck`, `ArrowUpDown`, `Sliders`, `BadgePercent`, `OpportunityCategory`, `configuredPortals`, `hasGeminiApiKey` |
| 14 | `src/components/layout/AppShell.tsx` | 15 | `CheckCircle2`, `AlertTriangle`, `MessageSquare`, `ArrowRight`, `FolderKanban`, `Receipt`, `ALL_AREAS`, `SYSTEM_HUBS`, `SystemHub`, `AreaId`, `dismissNotification`, `updateUserPreferences`, `isNotifDropdownOpen`, `handleNotificationClick`, `displayedAreas` |
| 15 | `src/modules/commercial/CrmModule.tsx` | 15 | `TrendingUp`, `MessageCircle`, `DollarSign`, `Filter`, `AlertCircle`, `Tag`, `Settings`, `FileSpreadsheet`, `UserPlus`, `Target`, `Globe`, `OpportunityPliegoAnalysis`, `newItemCurrency`, `setNewItemCurrency`, `setPliegoFileName` |
| 16 | `src/modules/operations/OperacionesAvanzadasModule.tsx` | 15 | `FileCode2`, `AlertTriangle`, `Clock`, `Sparkles`, `Calendar`, `ShieldCheck`, `User`, `ExternalLink`, `WorkOrderOT`, `ManufacturingOrder`, `BenchTestRecord`, `catalogComponents`, `catalogFrequencies`, `catalogOtPriorities`, `setTestGripType` |
| 17 | `src/components/ai/LucianaFloatingWidget.tsx` | 13 | `Sparkles`, `ChevronDown`, `Info`, `MicOff`, `Square`, `Calendar`, `Download`, `downloadIcsFile`, `getM365Config`, `isM365TokenExpired`, `hasUnreadNotification`, `isConnectingM365`, `handleConnectAndSyncInChat` |
| 18 | `src/modules/timesheet/TimesheetModule.tsx` | 11 | `XCircle`, `Plus`, `Calendar`, `Sparkles`, `Building2`, `TrendingUp`, `UserCheck`, `ChevronDown`, `ChevronUp`, `DollarSign`, `FolderTree` |
| 19 | `src/modules/projects/components/tabs/TabWbsGantt.tsx` | 11 | `useEffect`, `Clock`, `RefreshCw`, `DollarSign`, `Flag`, `Settings2`, `Check`, `X`, `Copy`, `isGeneratingWBS`, `handleGenerateWBS` |
| 20 | `src/modules/procurement/components/ProcurementReportsDashboard.tsx` | 11 | `BarChart3`, `TrendingUp`, `Calendar`, `CheckCircle2`, `Clock`, `AlertTriangle`, `ArrowUpRight`, `Download`, `Filter`, `PackageCheck`, `formatTRM` |
| 21 | `src/modules/inteckno/ActividadesModule.tsx` | 11 | `AlertTriangle`, `ExternalLink`, `Send`, `Share2`, `Globe`, `FileText`, `AlertCircle`, `getMicrosoftToDoWebUrl`, `getOutlookTodoAlertUrl`, `navigateWithContext`, `totalInReview` |
| 22 | `src/modules/inteckno/ConversacionesModule.tsx` | 11 | `AtSign`, `User`, `Square`, `Cpu`, `Layers`, `Volume2`, `Flame`, `MoreHorizontal`, `Bookmark`, `updateProject`, `isProcessingVoice` |
| 23 | `src/modules/inteckno/UserProfileModule.tsx` | 11 | `Heart`, `Award`, `Type`, `LayoutDashboard`, `CalendarDays`, `ShieldAlert`, `Rows`, `RefreshCw`, `DEFAULT_USER_PREFERENCES`, `setNewSkillCategory`, `handleFontSizeChange` |
| 24 | `src/modules/expenses/ExpensesModule.tsx` | 10 | `Receipt`, `DollarSign`, `Building2`, `Eye`, `Key`, `Info`, `CreditCard`, `Hash`, `Calendar`, `saveGeminiApiKey` |
| 25 | `src/modules/projects/components/tabs/TabCuadrilla.tsx` | 10 | `Clock`, `Briefcase`, `Filter`, `CheckCircle2`, `Sparkles`, `ChevronLeft`, `ChevronRight`, `Building`, `UserCheck`, `User` |

---

## 6. Auditoría de Parámetros No Utilizados (29 Casos)

Con `tsc --noEmit --noUnusedParameters`, se registraron 29 parámetros que se reciben en funciones o props pero nunca se leen:
1. `src/components/common/DocumentFlowBar.tsx:27`: `'compact'` (prop recibida y no renderizada).
2. `src/components/layout/AppShell.tsx:55`: `'activeSubtitle'`.
3. `src/components/ui/GanttChart.tsx:29`: `'projectName'`.
4. `src/components/ui/PastelMetricCard.tsx:64`: `'badgePositive'`.
5. `src/core/rules/businessRules.ts:107`: `'isHeightWork'`.
6. `src/core/services/lucianaService.ts:3334`: `'jobs'`, line 4536: `'purchaseOrders'`.
7. `src/core/services/m365Sync.ts:1877`: `'currentProducts'`.
8. `src/modules/expenses/components/TabPettyCash.tsx:43`: `'onDeleteExpense'`.
9. `src/modules/inteckno/ActividadesModule.tsx`: `onSyncM365`, `onProjectCalendar`, `onDelete` (líneas 1951-1953).
10. `src/modules/international/services/exchangeRateService.ts:242`: `'country'`.
11. `src/modules/international/services/internationalAiService.ts`: `'origin'` (línea 401), `'equipmentType'` (línea 414).
12. `src/modules/international/services/opportunityScannerService.ts`: `'priceRange'`, `'activeCountriesList'` (líneas 351-352).
13. `src/modules/inventory/components/NameplateVisionModal.tsx:31`: `'onSelectProductOrEquipment'`.
14. `src/modules/procurement/components/CreateRequisitionModal.tsx:41`: `'initialCategory'`.
15. `src/modules/procurement/components/Fcpr01SupplierModal.tsx:16`: `'onUpdateSupplier'`.
16. `src/modules/procurement/components/ProcurementCorporateMatrixTab.tsx:33`: `'partners'`.
17. `src/modules/procurement/components/ProcurementPayablesTab.tsx`: `'partners'`, `'projects'` (líneas 34-35).
18. `src/modules/procurement/components/ProcurementPendingDeliveryTab.tsx`: `'partners'`, `'projects'` (líneas 32-33).
19. `src/modules/procurement/components/ProcurementReportsDashboard.tsx:36`: `'partners'`.
20. `src/modules/procurement/components/PurchaseOrderDetailDrawer.tsx:40`: `'project'`.
21. `src/modules/projects/components/tabs/TabDashboard.tsx`: `'currentTrm'`, `'onNavigateTab'` (líneas 60-61).

---

## 7. Cumplimiento de las Reglas Maestras de Inteckno ERP

| Regla | Descripción | Estado de Cumplimiento | Detalle del Hallazgo |
|---|---|:---:|---|
| **Regla 1** | Cero Botones Manuales de Carga / Descarga | **CUMPLE** | No existen botones en UI. Se detectó `handleManualSync` y `isSyncing` en `TabHseqOffline.tsx:117` como código muerto sobrante tras remover el botón, el cual debe borrarse. |
| **Regla 2** | Persistencia y Carga Cloud-First Automática | **CUMPLE** | `erpStore.tsx` inicializa con `loadAllModulesFromCloud` y escucha en tiempo real. |
| **Regla 3** | Escucha y Replicación Reactiva en Tiempo Real | **CUMPLE** | Suscripciones Firestore activas (`onSnapshot`). |
| **Regla 4** | Cero Información de Prueba (Cero Mock Data) y Cero Valores Preescritos en Formularios | **VIOLADA (3 casos)** | **Caso 1:** `SAMPLE_RECEIPTS` en `src/core/services/aiVisionExpenseService.ts` (150 líneas de recibos y facturas ficticias con SVGs hardcodeados).<br>**Caso 2:** Valores de texto preescritos en formularios de creación en `OperacionesAvanzadasModule.tsx` (`Pinzas Desembragables`, `Acero 4140 Tratado`, etc.) y `BillingModule.tsx:162` (`Interventor de Obra...`). Deben inicializarse en `''` con `placeholder`.<br>**Caso 3:** 18 constantes `SEED_*` importadas en `erpStore.tsx` desde `src/seed/intecknoData.ts` (archivo de 180 KB de datos ficticios). |
| **Regla 5** | Reactividad Dinámica en Cascada e Integridad Visual | **CUMPLE** | Catálogos resuelven por clave y etiqueta sin duplicidad en badges adyacentes. |
| **Regla 6** | Estándar Universal para Opciones Desplegables: Prohibición de `isClearable={false}` | **VIOLADA (1 caso)** | `src/modules/inventory/components/OpticalBarcodeScannerTab.tsx:788` contiene explícitamente `isClearable={false}`. Debe cambiarse a `isClearable={true}`. |
| **Regla 7** | Confirmación Escrita Obligatoria ('BORRAR') para Eliminación Crítica | **CUMPLE** | `ConfirmDeleteModal` tiene `requireConfirmWord = true` por defecto y exige escribir `BORRAR`. 0 instancias desactivan esta validación. |
| **Regla 8** | IVA Dinámico, Entradas Numéricas Limpias (`value={val \|\| ''}`) | **CUMPLE** | Los inputs de tipo numérico respetan la convención limpia de borrado total. `getProjectTaxRate(country)` gobierna el IVA dinámico. |
| **Regla 9** | Simetría Visual en Cuadrículas (`grid-cols-2`) | **CUMPLE** | Modales estructurados en pares simétricos. |
| **Regla 10** | Cero Filas Redundantes en Tablas (`length > 1`) | **CUMPLE** | Se ocultan consolidados con registros unitarios. |
| **Regla 11** | Separación Presupuesto Oferta vs Costos Reales | **CUMPLE** | Respetada en `TabCostosPresupuesto`. |
| **Regla 12** | Formato de Moneda Universal y Alineación Vertical | **CUMPLE** | Uso consistente de `formatCOP`, celdas con `table-fixed`. |
| **Regla 13** | Inmutabilidad de IVA y Cero Repetición en Resúmenes | **CUMPLE** | Preservación de `hasIva`. |
| **Regla 14** | Guardián de Datos y Respaldos Continuos | **CUMPLE** | Respaldos en `erp_backups` Firestore e IndexedDB. |
| **Regla 15** | Tipografía Oficial Única: SF Pro | **CUMPLE** | Configurada a nivel `!important` en `src/index.css` sobre todos los elementos de la interfaz. |
| **Regla 16** | Navegación Determinista (`navigateWithContext`) | **CUMPLE** | Módulos escuchan `navigationContext` centralmente en `erpStore.tsx`. |

---

## 8. Duplicidad de Lógica y Desorden Arquitectónico Identificado

1. **Re-implementación de `formatCOP`:**  
   `src/modules/projects/components/tabs/TabWbsGantt.tsx:92` redefine una función local `formatCOP` en vez de importar la función oficial desde `src/core/services/trmService.ts`.
2. **Re-exportación anómala a mitad de archivo:**  
   `src/modules/projects/components/tabs/TabCostosPresupuesto.tsx:290-291` ejecuta:
   ```ts
   import { getProjectTaxRate } from '../../../../core/services/taxService';
   export { getProjectTaxRate };
   ```
   Esta importación/exportación a mitad de un componente de 4,695 líneas es anómala y ningún otro archivo la consume desde ese tab.
3. **Exports locales no consumidos externamente:**  
   En `TabCostosPresupuesto.tsx`: `getCategoryMeta`, `getItemDisplayName`, `formatThousands`, `parseThousands` están exportados pero solo se usan dentro del mismo archivo.
4. **Residuos de Debugging:**  
   Se detectaron 8 sentencias `console.log/debug`, de las cuales 2 corresponden a depuración de subida de inventario (`firestoreSyncService.ts:503, 639`) y 1 a depuración de RUT en `BillingModule.tsx:1164`.

---

## 9. Plan de Acción Recomendado para Implementación

### Fase 1: Eliminación Segura de Archivos Huérfanos
Eliminar los 6 archivos que tienen 0 referencias en el proyecto:
- `src/components/chat/RecordChatter.tsx`
- `src/components/common/DocumentFlowBar.tsx`
- `src/components/ui/GanttChart.tsx`
- `src/core/registry/moduleRegistry.ts`
- `src/modules/projects/types/ProjectSTCSchema.ts`
- `src/utils/rfqOptimizer.ts`

### Fase 2: Corrección de Violaciones a las Reglas de Inteckno
1. **Regla 6:** En `src/modules/inventory/components/OpticalBarcodeScannerTab.tsx:788`, remover `isClearable={false}` o establecer `isClearable={true}`.
2. **Regla 4 (Mock Data):** Eliminar la constante `SAMPLE_RECEIPTS` y su interfaz `SampleReceipt` en `src/core/services/aiVisionExpenseService.ts:67-228`.
3. **Regla 4 (Valores Preescritos):** Limpiar los `useState` en `OperacionesAvanzadasModule.tsx` (líneas 124, 126, 175, 202) y `BillingModule.tsx` (línea 162), inicializándolos en `''`.
4. **Regla 4 (Seed Data):** Limpiar los 18 imports de `SEED_*` no utilizados en `src/core/storage/erpStore.tsx` y evaluar el adelgazamiento de `src/seed/intecknoData.ts`.

### Fase 3: Saneamiento de Imports y Parámetros Muertos (720 Casos)
- Limpiar los 447 iconos no leídos de `lucide-react` en los 25 archivos principales.
- Remover los tipos importados y no referenciados (74 casos).
- Eliminar los manejadores y setters muertos (18 handlers y 54 variables de estado huérfanas).
- Unificar la importación de `formatCOP` en `TabWbsGantt.tsx` desde `trmService.ts`.
- Remover el import/export anómalo a mitad de archivo en `TabCostosPresupuesto.tsx:290-291`.

### Fase 4: Limpieza de Dependencias en `package.json`
- Ejecutar desinstalación o remoción en `package.json` de: `clsx`, `tailwind-merge`, `scheduler`.

### Fase 5: Optimización de Rendimiento y Empaquetado (*Code-Splitting*)
- Implementar `React.lazy` y `Suspense` en `AppShell.tsx` para los módulos pesados (`ProjectsModule`, `InventoryModule`, `BillingModule`, `TalentoHumanoModule`, etc.).
- Convertir la importación de `xlsx` en `InventoryExcelUploadModal.tsx` en carga dinámica (`const XLSX = await import('xlsx');`) para reducir el chunk inicial de 4.97 MB a menos de 1.5 MB.

### Fase 6: Fortalecimiento del Compilador TypeScript
- En `tsconfig.app.json`, activar:
  ```json
  "noUnusedLocals": true,
  "noUnusedParameters": true
  ```
- Ejecutar `npm run build` y verificar **0 errores** con build limpio.

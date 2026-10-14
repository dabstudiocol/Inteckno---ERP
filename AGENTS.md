---
always_on: true
glob: "**/*"
---

# REGLAS ESTRICTAS DEL AGENTE (FAST MODE & REGLAS INMUTABLES) - ¡NO IGNORAR!

Estás trabajando en el entorno de desarrollo local para el ERP de Inteckno S.A.S. Debido al gran tamaño de este proyecto, si escaneas directorios grandes quemarás todos tus tokens de contexto y causarás errores ("Prefix cleared"). 

Para evitar eso y trabajar rápido, DEBES obedecer estrictamente las siguientes reglas:

1. **PROHIBIDO ESCANEAR DIRECTORIOS PESADOS:** 
   No leas NUNCA, bajo NINGUNA circunstancia, las carpetas `.gemini/`, `dist/`, `build/`, `node_modules/`, `artifacts/`, `.next/` ni cualquier carpeta de dependencias o de historial.
2. **MODO RÁPIDO Y PRECISO:** 
   Busca y lee únicamente los archivos específicos de los módulos en los que estás trabajando. No escanees toda la base de código ni listes directorios masivamente.
3. **LÍMITE DE PROCESAMIENTO ("THINKING PROCESS"):** 
   Limita tus bloques de pensamiento interno (Thinking Process) a máximo 3 líneas. Ve directo a la solución y escribe el código.
4. **NO HAGAS CAMBIOS DESTRUCTIVOS:** 
   Solo edita los archivos estrictamente necesarios para cumplir el objetivo que el humano te pidió. No inventes estilos CSS globales ni alteres la paleta de colores. CERO mock data.
5. **ARQUITECTURA CLIENTE-SIDE:**
   Recuerda que usamos una arquitectura 100% frontend (React 19, Firebase web, Microsoft Graph API). No hay backend de Node.js ni Cloud Functions (plan gratuito). No crees lógica de servidor.
6. **PRINCIPIO DE REACTIVIDAD, ADAPTABILIDAD Y DISEÑO ARMÓNICO UNIVERSAL:**
   Todo elemento del ERP (casillas, botones, textos, números, ítems, pop-ups, alertas, opciones, menús, tarjetas, tablas y paneles) DEBE ser 100% reactivo y adaptable para PC, tablets y móviles, sin importar si el panel lateral (sidebar) está expandido (288px) o colapsado (80px).
   - **CONTENCIÓN ELÁSTICA CON `min-w-0` OBLIGATORIO:** En Flexbox y Grids, todo contenedor hijo principal DEBE llevar `min-w-0` para permitir que el contenido se encoja fluidamente sin romper el ancho de pantalla ni empujar elementos hacia afuera cuando el menú lateral se expanda o se contraiga.
   - **CUADRÍCULAS RESPONSIVAS LIMPIAS:** Prohibido usar columnas rígidas fijas (`grid-cols-3` o `grid-cols-4` sin prefijo móvil). Usa siempre cuadrículas adaptativas: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4`.
   - **CERO TEXTOS SUPERPUESTOS O CAJAS DESFASADAS:** Elimina cualquier altura fija rígida en tarjetas o cajas (`h-32`, `h-40`, etc.). Usa siempre alturas mínimas elásticas (`min-h-[...]`, `flex flex-col justify-between`) y agrega `break-words` o `truncate` en títulos largos para que JAMÁS se monten sobre botones, viñetas o bordes.
   - **ALINEACIÓN EN RENGLONES HOMOGÉNEOS Y PROPORCIONALES:** En todos los formularios y modales, los campos, fechas y horas deben compartir renglones limpios y simétricos (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`). Prohibido colocar casillas flotantes o desfasadas verticalmente.
   - **TABLAS CONTENIDAS (CERO DESBORDE LATERAL):** Toda tabla de datos debe estar encapsulada dentro de un contenedor elástico: `<div className="w-full overflow-x-auto rounded-lg border border-gray-200">`. Prohibido que las tablas estiren la página entera hacia los lados.
   - **MODALES TOTALMENTE ADAPTABLES Y CERO DESBORDES CON CUALQUIER ZOOM:** Todo modal, formulario emergente o panel DEBE diseñarse con contención estricta: `fixed inset-0 z-[9999] p-2 sm:p-4 overflow-y-auto flex items-center justify-center` con contenedor interior `w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden` y cuerpo de scroll fluido `overflow-y-auto flex-1`. Queda terminantemente prohibido que los controles, botones de acción o casillas se salgan de la pantalla o queden inaccesibles sin importar el zoom (80% a 150%) o el dispositivo (PC, tablet o móvil).
   - **BARRAS DE PESTAÑAS Y BOTONES DE ACCIÓN (CERO RECORTES EN EL BORDE DERECHO):** En encabezados de módulos donde convivan pestañas y botones de acción (ej. Inventario, Proyectos, Compras), el bloque de pestañas DEBE usar contención deslizante (`flex items-center gap-1.5 overflow-x-auto max-w-full min-w-0` con botones `shrink-0`), y el bloque de botones de acción DEBE usar `flex items-center flex-wrap gap-2 shrink-0`. PROHIBIDO forzar pestañas y botones en una sola fila rígida con `lg:flex-row` sin envoltorio porque el menú lateral consume 288px y corta los botones derechos contra el borde de la pantalla. Usa siempre `flex-col 2xl:flex-row` o contenedores con salto de línea (`flex-wrap`).
   - **MENÚS Y POPOVERS FLOTANTES:** Todo menú desplegable (por botón o clic derecho) debe clampearse dinámicamente con márgenes seguros dentro del viewport (`fixed z-[9999]`), impidiendo que se recorte contra el sidebar o los bordes de la pantalla.
   - **FORMATOS Y ARMONÍA:** Valores monetarios y numéricos deben usar formato de moneda estándar sin saturación de negrillas, garantizando alta legibilidad y jerarquía visual armoniosa.
7. **REGLAS DE NEGOCIO Y FORMULARIOS (PROYECTOS, TERCEROS Y FINANZAS):**
   - **UN PROYECTO = UN CENTRO DE COSTOS:** En todo el ERP, cada proyecto representa su propio centro de costos. El código del proyecto y el código del centro de costos deben ser idénticos y mantenerse 100% sincronizados en tiempo real.
   - **CAMPOS HÍBRIDOS (DATALIST / COMBOBOX INTELIGENTE):** Los campos de asignación (Líder/Director de Proyecto, Clientes, Proveedores) deben conectarse a la base de datos existente (Usuarios/RRHH o Terceros/CRM) con menú desplegable de autocompletado y auto-llenado de datos asociados (NIT, Ciudad), permitiendo SIEMPRE escribir texto libre si se trata de una persona, tercero o cliente nuevo.
   - **MÁXIMA ESPECIFICIDAD PARA INTECKNO S.A.S. (CERO OPCIONES GENÉRICAS):** Prohibido crear opciones, rubros o campos abstractos o genéricos. Cada catálogo, cuadrilla, recurso o entregable debe corresponder exactamente a la operación real de Inteckno S.A.S. (Teleféricos, Sistemas de Cable, Ensayos No Destructivos END/MRT, trabajo crítico en alturas, equipos calibrados).
   - **PERSONALIZACIÓN TOTAL DE CATÁLOGOS Y OPCIONES:** Ninguna lista desplegable (entregables, recursos, equipos, rubros) puede ser estática o parecer inventada. Todo módulo debe incluir la opción de personalizar y editar sus catálogos para adaptarse permanentemente a Inteckno S.A.S.
8. **MANDATO DE 100% ESPAÑOL, CERO ANGLICISMOS Y LENGUAJE CLARO PARA TODO EL ERP:**
   Todo texto, etiqueta, opción, mensaje o término visible al usuario final DEBE estar 100% en español profesional, directo, intuitivo y amigable de Colombia. Prohibido usar anglicismos de gestión, siglas crípticas en inglés o términos de programación en la interfaz.
   *   **Glosario Obligatorio de Reemplazo:**
       - `SKU` ➔ **Código de Artículo / Referencia**
       - `Stock` ➔ **Existencias en Bodega / Cantidad Disponible**
       - `PO` ➔ **Orden de Compra (OC)**
       - `PR` ➔ **Solicitud de Compra**
       - `RFQ` ➔ **Cotización a Proveedores**
       - `UoM` ➔ **Unidad de Medida**
       - `BOM` ➔ **Lista de Materiales y Repuestos**
       - `Lead Time` ➔ **Tiempo de Entrega del Proveedor**
       - `ETA` / `ETD` ➔ **Fecha Estimada de Llegada / Fecha de Despacho**
       - `FIFO` / `FEFO` ➔ **Primero en Vencer, Primero en Salir**
       - `Batch` / `Lot` ➔ **Lote de Fabricación**
       - `Packing List` ➔ **Lista de Empaque / Guía de Remisión**
       - `Scrap` / `Waste` ➔ **Merma / Retazo Inservible**
       - `Kitting` / `Kit` ➔ **Paquete de Herramientas / Maletín de Inspección**
       - `Soft Allocation` ➔ **Apartado Previo / Material Reservado**
       - `Inbound` / `Outbound` ➔ **Entradas a Bodega / Salidas a Obra**
       - `WBS` / `Gantt` ➔ **Plan de Trabajo / Cronograma de Actividades**
       - `Milestone` ➔ **Meta Clave / Hito**
       - `Deadline` ➔ **Fecha Límite de Entrega**
       - `ASAP` ➔ **Prioridad Inmediata / Urgente**
       - `KPI` / `KPIs` ➔ **Indicadores de Avance / Métricas de Gestión**
       - `Backlog` ➔ **Tareas Pendientes**
       - `WIP` ➔ **Trabajo en Curso / En Ejecución**
       - `Deliverable` ➔ **Entregable / Documento Final**
       - `Baseline` ➔ **Línea Base / Plan Original Aprobado**
       - `Lag` ➔ **Tiempo de Espera / Días de Holgura**
       - `FS / SS / FF / SF` ➔ **Fin a Comienzo, Comienzo a Comienzo, etc.**
       - `Check-in / Check-out` ➔ **Préstamo y Devolución de Equipos**
       - `Overhaul` ➔ **Mantenimiento Mayor Integral**
       - `NDT` ➔ **Ensayos No Destructivos (END)** *(Siempre usar END)*
       - `MRT` ➔ **Inspección Magneto-Inductiva de Cables (MRT)**
       - `Timesheet` ➔ **Hoja de Horas / Registro de Jornada**
       - `HSEQ` / `HSE` ➔ **Seguridad y Salud en el Trabajo (SST / Calidad)**
       - `PPE` ➔ **Elementos de Protección Personal (EPP)**
       - `Dashboard` ➔ **Panel de Control / Resumen General**
       - `Drawer` ➔ **Panel Lateral de Detalle**
       - `Modal` ➔ **Ventana Emergente**
       - `Dropdown` ➔ **Lista Desplegable**
       - `Tooltip` ➔ **Mensaje de Ayuda**
       - `Audit Log` / `History` ➔ **Registro de Cambios / Historial de Movimientos**
       - *Términos de software en UI:* Prohibido mostrar "Campos Dinámicos", "Data Schema", "Payload" o "Mutación". Usa siempre: **"Parámetros Técnicos del Servicio"**, **"Especificaciones Técnicas"** o **"Detalles del Proyecto"**.

Si necesitas leer un archivo, lee EXACTAMENTE ese archivo. **NO HAGAS BÚSQUEDAS EN BUCLE NI ESCANEOS COMPLETOS DE DIRECTORIO.**

---

## MAPA DEL PROYECTO Y ARQUITECTURA (Para que no tengas que buscar a ciegas)

Para evitar que gastes tokens escaneando, aquí tienes la estructura exacta del proyecto. Ve directamente a estas carpetas cuando necesites editar algo:

*   `src/modules/`: Aquí están las pantallas y lógica específica de cada módulo. 
    *   Módulos actuales: `billing`, `commercial`, `dashboard`, `expenses`, `hr`, `inventory`, `operations`, `procurement`, `projects`, `requisitions`, `timesheet`, `international`, etc.
*   `src/components/`: Componentes reutilizables.
    *   `ui/`: Componentes visuales básicos (botones, inputs, tablas).
    *   `layout/`: Estructura de la página, menús, headers.
    *   `ai/`: Componentes relacionados con la interfaz de LUC-IA-NA.
    *   `common/`: Componentes compartidos entre módulos.
*   `src/core/`: El "corazón" del sistema.
    *   `services/`: Servicios principales (Firebase, Microsoft Graph, `lucianaService.ts`).
    *   `auth/`: Lógica de autenticación.
    *   `events/` y `rules/`: Manejo de reglas de negocio y eventos.
*   `src/types/`: Tipos de TypeScript e interfaces (muy importante revisar aquí para los modelos de datos).
*   `src/utils/`: Funciones de ayuda generales.

**REGLA DE EDICIÓN:** Si el usuario te pide editar el módulo de "Compras", ve directamente a `src/modules/procurement` o `src/modules/requisitions` y a `src/types`. No escanees la carpeta raíz.

# INTECKNO ERP - BASE DE DATOS Y CONTEXTO VIVO

> **Entorno:** Google Cloud Firestore (`inteckno-erp`)
> **Estado:** 100% Sincronizado, IDs Relacionales Inmutables y Cero Mock Data

## 1. RESUMEN DE ENTIDADES
- **Proyectos:** 1
- **Usuarios / Colaboradores:** 31
- **Terceros (Clientes y Proveedores):** 0
- **Productos en Inventario:** 30 de 0

## 2. PROYECTOS Y CARPETAS CONTRACTUALES (WBS)
### [PRJ-1793367181536] DESCRIPTIVO PRUEBA
- **Código / Centro de Costos:** CODIGO PROYECTO PRUEBA
- **Cliente:** [CLI-88231] CLIENTE PRUEBA S.A.S.
- **Categoría:** CAT-001 | **Servicio:** SRV-005
- **Supervisor:** [USR-07] Gustavo Alberto Mejía Tobón
- **Términos de Pago:** PT-CR-SAT
- **Carpetas Contractuales (projectItems):**
  * [ITEM-1793374163278] undefined: undefined (Presupuesto: $0 COP)
  * [ITEM-1793386958665] undefined: undefined (Presupuesto: $0 COP)
- **Matriz de Costos Imputados (costMatrix):**
  * [COST-1793387007211] Carpeta Vinculada: ITEM-1793386958665 | Ítem: ITEM PRUEBA 2 | Concepto: CONCEPTO PRUEBA 3 | Total: $0 COP
  * [COST-1793375513688] Carpeta Vinculada: ITEM-1793374163278 | Ítem: ITEM PRUEBA 1 | Concepto: CONCEPTO PRUEBA 2 | Total: $0 COP
  * [COST-1793374221664] Carpeta Vinculada: ITEM-1793374163278 | Ítem: ITEM PRUEBA 1 | Concepto: CONCEPTO PRUEBA | Total: $0 COP
  * [cost-ts-TS-2026-DH01] Carpeta Vinculada: ITEM-1793374163278 | Ítem: ITEM PRUEBA 1 | Concepto: Mano de Obra ITK - David Hurtado (10h @ $27.505/h - Supervisión en Obra ITEM PRUEBA 1) | Total: $0 COP

## 3. USUARIOS Y EQUIPO DE TRABAJO
- **[USR-02]** Alejandro Hoyos Correa | Rol: `coord_comercial` | Dept: `DEP-07` | Cargo: `POS-COM-01` (Coordinador Comercial y Licitaciones LATAM)
- **[USR-04]** Clemencia García Moncada | Rol: `gerente_administrativa` | Dept: `DEP-02` | Cargo: `POS-GA-01` (Gerente Administrativa y Financiera)
- **[USR-05]** Dairo Antonio Morales Fuenmayor | Rol: `supervisor_tecnico` | Dept: `DEP-05` | Cargo: `POS-SUP-01` (Supervisor Técnico de Campo STC)
  * Cert: [CERT-ALT-4272] Certificación Trabajo Seguro en Alturas (Res. 4272/2021) - Vence: 2027-08-20
- **[USR-07]** Gustavo Alberto Mejía Tobón | Rol: `gerente_general` | Dept: `DEP-01` | Cargo: `POS-GG-01` (Gerente General)
- **[USR-12]** Kelly Johana Rojas Torres | Rol: `hseq` | Dept: `DEP-06` | Cargo: `POS-HSEQ-01` (Coordinador HSEQ y Seguridad Industrial)
- **[USR-16]** Sebastián Ruiz Agudelo | Rol: `lider_proyectos` | Dept: `DEP-04` | Cargo: `POS-LP-01` (Líder de Proyectos STC)
  * Cert: [CERT-ALT-4272] Certificación Trabajo Seguro en Alturas (Res. 4272/2021) - Vence: 2027-05-15
- **[USR-17]** Sebastián Vélez Yépez | Rol: `coord_compras` | Dept: `DEP-08` | Cargo: `POS-PUR-01` (Coordinador de Compras y Abastecimiento)
- **[USR-18]** Wilson Albeiro Alzate Correa | Rol: `lider_proyectos` | Dept: `DEP-04` | Cargo: `POS-LP-01` (Líder de Proyectos STC)
  * Cert: [CERT-ALT-4272] Certificación Trabajo Seguro en Alturas (Res. 4272/2021) - Vence: 2027-06-30
- **[USR-19]** Alejandro Díaz Cadamil | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-20]** Carlos Eduardo Pérez | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-21]** Francisco Javier Giraldo Arcila | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-22]** Jefferson Galeano Peña | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-23]** José Leonel Hernández Estrada | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-24]** Jonathan Estiven Guzmán | Rol: `tecnico_stc` | Dept: `DEP-05` | Cargo: `POS-TEC-03` (Técnico Especialista Electromecánico STC)
  * Cert: [CERT-ALT-4272] Certificación Trabajo Seguro en Alturas (Res. 4272/2021) - Vence: 2027-04-10
- **[USR-25]** Yohan Daniel Franco Yépez | Rol: `tecnico_stc` | Dept: `DEP-05` | Cargo: `POS-AT` (Técnico Operativo de Montaje y Alturas)
- **[USR-26]** Juan Pablo Castellanos Cadena | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-27]** Rubén Darío Arcos Ordóñez | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-28]** Santiago Arbeláez | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-29]** Nencer Camilo Solano Mora | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-30]** Hernando Gelves | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-31]** Javier Andrés Ocampo | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-32]** Gabriel Jair Chatelain Naranjo | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-33]** Guendy Vanessa Mancego Villegas | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-34]** Mauricio Llanos Loaiza | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-35]** Glorymanelys Martínez Santos | Rol: `ingeniero_proyectos` | Dept: `DEP-04` | Cargo: `POS-IP` (Ingeniero de Proyectos STC)
- **[USR-36]** Sebastián Duque Sánchez | Rol: `lider_ingenieria` | Dept: `DEP-04` | Cargo: `POS-LI-01` (Líder de Ingeniería y Diseño)
  * Cert: [CERT-ALT-4272] Certificación Trabajo Seguro en Alturas (Res. 4272/2021) - Vence: 2027-12-31
- **[USR-39]** Herson Guerrero Rúa | Rol: `tecnico_stc` | Dept: `DEP-05` | Cargo: `POS-AT` (Técnico Operativo de Montaje y Alturas)
  * Cert: [CERT-ALT-4272] Certificación Trabajo Seguro en Alturas (Res. 4272/2021) - Vence: 2027-05-22
- **[USR-40]** David Hurtado Yépez | Rol: `asistente_negocios_internacionales` | Dept: `DEP-09` | Cargo: `POS-ANI-01` (Especialista de Negocios Internacionales)
- **[USR-41]** Martín Suescún | Rol: `tecnico_stc` | Dept: `DEP-05` | Cargo: `POS-AT` (Técnico Operativo de Montaje y Alturas)
  * Cert: [CERT-ALT-4272] Certificación Trabajo Seguro en Alturas (Res. 4272/2021) - Vence: 2027-06-18
- **[USR-99]** David Hurtado Yepes | Rol: `admin_sistemas` | Dept: `DEP-03` | Cargo: `POS-SIS-01` (Administrador de Sistemas y Arquitectura ERP)
  * Cert: [CERT-ALT-4272] Certificación Trabajo Seguro en Alturas (Res. 4272/2021) - Vence: 2027-12-31
- **[user-gustavo-mejia]** Gustavo Adolfo Mejía | Rol: `gerente_general` | Dept: `DEP-04` | Cargo: `POS-GG-01` (Gerente General)

## 4. TERCEROS (CLIENTES Y PROVEEDORES)

## 5. MUESTRA DE BODEGA Y UBICACIONES
- **[PRD-0-1940]** SKU: `0` | PRODUCTO GENERICO | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000067-2291]** SKU: `A0000067` | GUARDACABLE DE 1/2 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000100-2640]** SKU: `A0000100` | BOTAS TIPO INGENIERO CAFE | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000108-1864]** SKU: `A0000108` | RODAMIENTO 6020.2RSC3 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-03D` | Stock: undefined UNIDAD
- **[PRD-A000011-1867]** SKU: `A000011` | RIDUZIONE ADAT.D3/8-TUBO D1/4 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000110-2672]** SKU: `A0000110` | BARRA HERRAGRO  18 LIBRAS | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000111-2095]** SKU: `A0000111` | PALA HERRAGRO | Bodega: `LOC-CENTRAL` | Estante: `SHLF-PATIO` | Stock: undefined UNIDAD
- **[PRD-A0000112-2589]** SKU: `A0000112` | CABO PARA PALA | Bodega: `LOC-CENTRAL` | Estante: `SHLF-AP` | Stock: undefined UNIDAD
- **[PRD-A0000113-1958]** SKU: `A0000113` | POLICHADORA DE 7". 1300W STANLEY | Bodega: `LOC-CENTRAL` | Estante: `SHLF-02D` | Stock: undefined UNIDAD
- **[PRD-A0000114-2506]** SKU: `A0000114` | CINTA BANDIT 1/2 30 METROS | Bodega: `LOC-CENTRAL` | Estante: `SHLF-03D` | Stock: undefined UNIDAD
- **[PRD-A0000115-2756]** SKU: `A0000115` | ALICATE AISLADO DE 8 1/2" TIPO CRESCENT | Bodega: `LOC-CENTRAL` | Estante: `SHLF-TB2` | Stock: undefined UNIDAD
- **[PRD-A0000116-2415]** SKU: `A0000116` | DESTORNILLADOR DE PALA 1/4 X 4" SATA ST65109EM | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000117-2158]** SKU: `A0000117` | LLAVE HEXAGONA IRWIN IW10606 -5MMLARGA | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000118-2678]** SKU: `A0000118` | BALDE PLÁSTICO PARA CONSTRUCCIÓN 9 LITROS APROXIMADAMENTE" | Bodega: `LOC-CENTRAL` | Estante: `SHLF-08A` | Stock: undefined UNIDAD
- **[PRD-A0000119-998]** SKU: `A0000119` | TORNILLO HEXAGONAL M22 X 2,5 X 110 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A000012-1921]** SKU: `A000012` | RACOR RECTO MACHO CILÍNDRICO DE 1/4 A 8MM | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000120-1860]** SKU: `A0000120` | RODAMIENTO 6308.2RSC3 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-03D` | Stock: undefined UNIDAD
- **[PRD-A0000121-1863]** SKU: `A0000121` | RODAMIENTO 6210.RSC3 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-03D` | Stock: undefined UNIDAD
- **[PRD-A0000122-1861]** SKU: `A0000122` | RODAMIENTO 6211.2RSC3 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-03D` | Stock: undefined UNIDAD
- **[PRD-A0000123-2431]** SKU: `A0000123` | CORREA CON TRINQUETE | Bodega: `LOC-CENTRAL` | Estante: `SHLF-01A` | Stock: undefined UNIDAD
- **[PRD-A0000125-1959]** SKU: `A0000125` | POLEA PIÑÓN - POLEA 2F - ITK-TTC-POL-P36 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000126-2110]** SKU: `A0000126` | MOSQUETON 3/8 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-AP` | Stock: undefined UNIDAD
- **[PRD-A0000127-2387]** SKU: `A0000127` | EMBOQUILLADOR EXPA CORTA TUBO RACHE | Bodega: `LOC-CENTRAL` | Estante: `SHLF-04B` | Stock: undefined JUEGO
- **[PRD-A0000128-2390]** SKU: `A0000128` | DOBLADORA TUBOS 1/2 | Bodega: `LOC-CENTRAL` | Estante: `SHLF-04D` | Stock: undefined UNIDAD
- **[PRD-A0000129-259]** SKU: `A0000129` | TUBERIA RIGIDA COBRE TIPO L | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A000013-1788]** SKU: `A000013` | TERMINAL VCP HEMBRA VTFC-FB250 16-14 AZUL NYLON | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000130-2454]** SKU: `A0000130` | COPA HEXAGONAL  3/4 41MM WURTH | Bodega: `LOC-CENTRAL` | Estante: `SHLF-04C` | Stock: undefined UNIDAD
- **[PRD-A0000131-1819]** SKU: `A0000131` | TALADRO PERC DW RECARG DCD7781D 1/2" 20V | Bodega: `LOC-CENTRAL` | Estante: `SHLF-04G` | Stock: undefined UNIDAD
- **[PRD-A0000132-2488]** SKU: `A0000132` | CONDENSADORES DE MARCHA 370 VAC 50/60HZ 35MFD +/- 5% | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD
- **[PRD-A0000133-2489]** SKU: `A0000133` | CONDENSADORES DE ARRANQUE 330 VAC 50/60HZ 189-227 MFD | Bodega: `LOC-CENTRAL` | Estante: `SHLF-CENTRAL` | Stock: undefined UNIDAD

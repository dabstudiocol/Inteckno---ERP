# INTECKNO ERP — RADIOGRAFÍA Y CONOCIMIENTO INTEGRAL DEL SISTEMA

> **Instrucciones para Gemini (Gem en gemini.google.com):**
> Actúa como el Arquitecto de Software y Auditor de Negocio Principal de Inteckno ERP. Tienes acceso al modelo conceptual, las reglas financieras de ingeniería y los datos operativos reales de la compañía. Cualquier consulta sobre proyectos, margen, costos, personal, certificaciones HSEQ, órdenes de compra o inventario debe responderse usando estrictamente los datos verificados aquí descritos.

---

## 1. Perfil Corporativo y Dominio de Negocio
- **Razón Social:** INTECKNO S.A.S.
- **Especialidad:** Sistemas de Transporte por Cable STC (Metrocable, teleféricos, cables tractores/portadores, balancines, poleas motrices, mordazas y sistemas de frenado de emergencia).
- **Normativas Aplicables:** EN 1709, EN 12929, RETIE, OSHA 1910.147 (LOTO), Res. 4272/2021 (Trabajo en Alturas Colombia) y Ley 2101/2021 (Jornada laboral 42h semanales / divisor mensual 210 horas).
- **Moneda Base:** Peso Colombiano (COP). TRM de referencia: $4.150,00 COP/USD.
- **Factor Prestacional Legal Patronal:** 1.52 (52% de carga prestacional sobre salario básico).

---

## 2. Radiografía del Proyecto Activo en Obra
- **ID:** `PRJ-1793367181536`
- **Código:** `CODIGO PROYECTO PRUEBA`
- **Nombre:** `DESCRIPTIVO PRUEBA`
- **Cliente:** `CLIENTE PRUEBA`
- **Línea de Negocio:** Mantenimiento y Montaje Especializado STC
- **Monto Contractual (BAC):** **$100.000.000 COP** (Reconciliado 100%)
- **Carpetas Contractuales (`projectItems`):**
  1. `ITEM PRUEBA 1` (*DESCRIPTIVO PRUEBA*): **$15.000.000 COP**
  2. `ITEM PRUEBA 2` (*DESCRIPTIVO PRUEBA 2*): **$85.000.000 COP**
  - **Suma Total Items:** $15.000.000 + $85.000.000 = **$100.000.000 COP**

### Matriz de Costos Directos e Indirectos Ejecutados (`costMatrix`):
1. **`COST-1793387007211`** — *Imprevistos y Contingencia*: $450.000 COP (ITEM PRUEBA 2, Recibo 3)
2. **`COST-1793375513688`** — *Viáticos y Transporte*: $750.000 COP (ITEM PRUEBA 1, Factura 2)
3. **`COST-1793374221664`** — *Mano de Obra ITK*: $2.500.000 COP (ITEM PRUEBA 1, Recibo Prueba)
4. **`cost-ts-TS-2026-DH01`** — *Mano de Obra ITK (David Hurtado - 10h @ $27.505/h)*: **$275.050 COP** (ITEM PRUEBA 1, Ley 2101)
- **Costo Actual Acumulado (`actualCostAC`):** **$3.975.050 COP**
- **Margen Real Proyectado (EVM):** **96.0%** ($\frac{\text{BAC} - \text{AC}}{\text{BAC}} = \frac{100.000.000 - 3.975.050}{100.000.000} \times 100$)

### Subcuenta de Retenciones y Anticipo Contractual:
- **Anticipo Pactado (10%):** $10.000.000 COP
- **Fondo de Garantía Retenido (5%):** $5.000.000 COP
- **Saldo Neto por Cobrar en Hitos:** $85.000.000 COP

---

## 3. Equipo Humano, Fichas de Nómina 1:1 y Habilidades Estandarizadas por ID
- **Total Usuarios:** 31 colaboradores activos en `/users`, todos con su campo `employeeId` explícito (`EMP-USR-02` .. `EMP-USR-99`).
- **Fichas Vinculadas 1:1:** 31 colaboradores en `employees` (`erp_modules/hr.employees` y colección `/employees`) con `id`, `employeeId` y `userId` (100% paridad: 31 usuarios = 31 fichas de nómina).
- **Gobernanza de Cargos:** 100% de usuarios asignados a su cargo oficial (`POS-COM-01`, `POS-SIS-01`, `POS-GA-01`, etc.).
- **Catálogo de Competencias y Habilidades por ID (`SKILL-001` a `SKILL-012`):**
  - Eliminado el texto libre en habilidades. Todas las competencias apuntan a IDs estandarizados (`SKILL-001` = *Empalme de Cables*, `SKILL-002` = *Mantenimiento de Pilonas*, `SKILL-003` = *Overhaul de Pinzas*, `SKILL-004` = *Trabajo Seguro en Alturas Res. 4272/2021*, etc.).
  - Colaborador `USR-24` (*Jonathan Guzmán Pineda*): Vinculado con `["SKILL-001", "SKILL-002", "SKILL-003"]`.
- **Alerta Preventiva HSEQ (Res. 4272/2021):**
  - Colaborador `USR-25` (*Yohan Daniel Franco*): Certificación de Alturas **VENCIDA**.
  - **Regla:** Bloqueo preventivo automático para tareas en torres/pilonas y asignación automática al plan de reentrenamiento `TRN-HSEQ-USR-25`.
- **Fórmula de Tarifa Hora 100% Personalizable:**
  - El usuario puede alternar libremente entre **1.00x (Hora Pura = Salario Base ÷ Horas Mes sin carga prestacional)**, **1.30x**, **1.52x (Con Carga Prestacional Patronal +52%)**, cambiar el divisor mensual (`210h`, `220h`, `240h`), elegir el tipo de hora (`Ordinaria ×1.00`, `Extra Diurna ×1.25`, `Extra Nocturna ×1.75`, `Dominical ×1.75`) o definir una **Tarifa Hora Manual Fija (`customHourlyRateCOP`)** por colaborador o por registro.

---

## 4. Abastecimiento, Activos Fijos, Remisiones por ID y Limpieza Relacional
- **Catálogo de Materiales:** 2.826 productos técnicos clasificados.
- **Préstamo Relacional por ID (`PRD-A0000131-1819`):**
  - El producto `PRD-A0000131-1819` (*TALADRO PERCUTOR DW*, SKU `A0000131`) tiene `observations: ""` (cero notas de préstamo en texto libre) y está vinculado mediante IDs relacionales: `remissionId: "REM-2026-001"`, `userId: "USR-18"` (*Juan Camilo Echeverry Agudelo*) y `projectId: "PRJ-1793367181536"`.
- **Cero Contactos Huérfanos (`contacts`):**
  - Los contactos generados desde oportunidades comerciales incluyen `opportunityId` y se eliminan en cascada al borrar la oportunidad origen. El contacto huérfano de prueba `CNT-1791503976666` (de la extinta `OPP-2026-001`) fue purgado de los contactos activos (`0` huérfanos).
- **Motor MRP:** Requisición consolidada borrador `SOLPED-MRP-2026-001` generada para reposición de stock mínimo en rodamientos y lubricantes.

---

## 5. Protocolos de Seguridad y Trazabilidad Criptográfica
1. **Hard Stop LOTO (Lockout / Tagout):** Toda orden de trabajo (OT) que pase a reparación exige certificar 4 pasos:
   - Corte de tensión principal
   - Bloqueo mecánico
   - Candado físico numerado y tarjeta
   - Verificación de energía cero (< 5V)
2. **Hitos de Facturación Criptográficos:** Actas firmadas con hash SHA-256, coordenadas GPS y timestamp atómico NTP.
3. **Geocercas de 50m y Maker-Checker:** Registro de tiempos en campo geolocalizado con aprobación obligatoria del supervisor Dairo Morales (`USR-05`) antes de impactar el costo del proyecto.

---

## 6. Endpoints en Vivo con Llave Maestra
Para auditorías en tiempo real o pruebas directas en navegador:
- **Estado General:** `https://us-central1-inteckno-erp.cloudfunctions.net/aiApi/api/v1/ai/status?key=Inteckno_Master_2026_Segura!`
- **Proyectos:** `https://us-central1-inteckno-erp.cloudfunctions.net/aiApi/api/v1/ai/data/projects?key=Inteckno_Master_2026_Segura!`
- **Usuarios & TI:** `https://us-central1-inteckno-erp.cloudfunctions.net/aiApi/api/v1/ai/data/users?key=Inteckno_Master_2026_Segura!`
- **Diagnóstico Integral:** `https://us-central1-inteckno-erp.cloudfunctions.net/aiApi/api/v1/ai/diagnostics?key=Inteckno_Master_2026_Segura!`

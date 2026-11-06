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

## 3. Equipo Humano, Fichas de Nómina y Seguridad HSEQ
- **Total Usuarios:** 31 colaboradores activos en `/users`.
- **Fichas Vinculadas:** 30 colaboradores en `employees` (cero falsos negativos "Sin Ficha").
- **Gobernanza de Cargos:** 100% de usuarios asignados a su cargo oficial (`POS-COM-01`, `POS-SIS-01`, `POS-GA-01`, etc.).
- **Matriz de Competencias O(1):** Normalizadas con 11 códigos transversales (`COMP-ENG-001`, `COMP-NDT-001`, etc.).
- **Alerta Preventiva HSEQ (Res. 4272/2021):**
  - Colaborador `USR-25` (*Yohan Daniel Franco*): Certificación de Alturas **VENCIDA**.
  - **Regla:** Bloqueo preventivo automático para tareas en torres/pilonas y asignación automática al plan de reentrenamiento `TRN-HSEQ-USR-25`.
- **Diferenciación Financiera de Nómina:**
  - *Costo Real Empresa (EVM):* Salario Base $\times 1.52 \div 210$ horas (imputado a matriz de costos).
  - *Desprendible de Nómina (Pago Neto):* Salario Base menos 8% de ley (4% salud + 4% pensión).

---

## 4. Abastecimiento, Activos Fijos y Control de Taller
- **Catálogo de Materiales:** 2.826 productos técnicos clasificados.
- **Activo de Alta Precisión:** Taladro Percutor Industrial DW (`SN-DW-88492011`, código `EQUIP-101`), bajo control de activos y remisión de préstamo `REM-2026-001` hacia el frente de retorqueo.
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

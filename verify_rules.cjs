// Script de verificación automatizada de reglas de negocio críticas
const assert = require('assert');

// 1. Umbrales
const GM_THRESHOLD = 2000;
const INVOICE_HOURS = 48;

function validateSupplier(legal, tech) {
  if (!legal || !tech) {
    return { allowed: false, message: 'Proveedor no homologado' };
  }
  return { allowed: true };
}

function checkGmThreshold(amountUSD) {
  return amountUSD >= GM_THRESHOLD;
}

function validateHseq(status) {
  return status === 'valid';
}

function calculateCountdown(signedAtTimestamp) {
  const deadline = signedAtTimestamp + INVOICE_HOURS * 3600 * 1000;
  return deadline - Date.now();
}

console.log('--- EJECUTANDO SUITE DE PRUEBAS DE REGLAS DE NEGOCIO INTECKNO ---');

// Test 1: Homologación
console.log('1. Verificando bloqueo de proveedor no homologado...');
const supplierTest = validateSupplier(false, true);
assert.strictEqual(supplierTest.allowed, false, 'El proveedor sin homologación legal debe ser bloqueado');
console.log('   ✓ Bloqueo a proveedor no homologado funciona correctamente.');

// Test 2: Umbral USD 2.000
console.log('2. Verificando umbral de aprobación de Gerencia General (USD 2.000)...');
assert.strictEqual(checkGmThreshold(1999), false, 'Menor a 2000 no debe exigir visto bueno');
assert.strictEqual(checkGmThreshold(2000), true, 'Monto igual o mayor a 2000 debe exigir visto bueno de Gustavo Mejía');
assert.strictEqual(checkGmThreshold(4900), true, 'Monto de 4900 debe exigir visto bueno');
console.log('   ✓ Regla de umbral USD 2.000 validada.');

// Test 3: Compuerta HSEQ de Alturas
console.log('3. Verificando compuerta HSEQ de Cero Tolerancia...');
assert.strictEqual(validateHseq('expired'), false, 'Técnico con certificado vencido debe ser bloqueado');
assert.strictEqual(validateHseq('valid'), true, 'Técnico con aval HSEQ puede ser asignado');
console.log('   ✓ Compuerta HSEQ validada.');

// Test 4: Cuenta regresiva de 48 horas
console.log('4. Verificando cálculo de cuenta regresiva de 48 horas...');
const signed18hAgo = Date.now() - 18 * 3600 * 1000;
const remainingMs = calculateCountdown(signed18hAgo);
const remainingHours = Math.round(remainingMs / (3600 * 1000));
assert.strictEqual(remainingHours, 30, 'Deben restar aproximadamente 30 horas');
console.log('   ✓ Cuenta regresiva de 48 horas calculada con precisión.');

console.log('\n=======================================================');
console.log('¡TODAS LAS PRUEBAS DE REGLAS DE NEGOCIO PASARON (4/4)!');
console.log('=======================================================');

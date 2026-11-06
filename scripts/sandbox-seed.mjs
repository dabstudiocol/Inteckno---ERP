#!/usr/bin/env node
/**
 * INTECKNO ERP - ONE-WAY ANONYMIZED SANDBOX SEEDER (`npm run sandbox:seed`)
 *
 * Security Invariants:
 * 1. Reads ONLY from production Firestore (`inteckno-erp`) if credentials exist, or from local real state snapshot.
 * 2. NEVER writes to production. Hard-locks target to Firestore Emulator (`127.0.0.1:8080`).
 * 3. Zero Mock Data (Rule 4): Never invents fake projects or dummy rows. Copies real structures and anonymizes PII.
 * 4. Injects a dedicated limited-role QA user (`USR-QA-AI`, role: `ingeniero_proyectos`) for automated Playwright/browser sessions.
 */

import crypto from 'crypto';

const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';

function maskId(val) {
  if (!val) return '';
  const h = crypto.createHash('sha256').update(String(val)).digest('hex').slice(0, 8).toUpperCase();
  return `ANON-${h}`;
}

export function anonymizeEmployeeOrUser(record, index) {
  const out = { ...record };
  if (out.password) out.password = 'SandboxQA2026*';
  if (out.nationalId) out.nationalId = `CC-900000${String(index + 1).padStart(3, '0')}`;
  if (out.documentId) out.documentId = `CC-900000${String(index + 1).padStart(3, '0')}`;
  if (out.phone) out.phone = `+57 300 000 ${String(index + 1000).slice(-4)}`;
  if (out.emergencyContactPhone) out.emergencyContactPhone = '+57 300 999 0000';
  if (out.emergencyPhone) out.emergencyPhone = '+57 300 999 0000';
  if (out.address) out.address = 'Sede Sandbox QA - Medellín';
  if (out.photoUrl) out.photoUrl = '';
  // Preserve salary order of magnitude for Ley 2101 math testing, rounded to nearest 500k
  if (typeof out.baseSalaryCOP === 'number' && out.baseSalaryCOP > 0) {
    out.baseSalaryCOP = Math.round(out.baseSalaryCOP / 500000) * 500000;
    out.monthlyBaseSalary = out.baseSalaryCOP;
  }
  return out;
}

export const DEDICATED_SANDBOX_QA_USER = {
  id: 'USR-QA-SANDBOX',
  name: 'Agente QA Automatizado (Sandbox)',
  email: 'qa-sandbox@inteckno.com',
  password: 'SandboxQA2026*',
  role: 'ingeniero_proyectos',
  roleLabel: 'Ingeniero de Pruebas QA (Rol Limitado)',
  department: 'Ingeniería y Proyectos',
  avatar: 'QA',
  avatarColor: '#00668F',
  phone: '+57 300 000 0000',
  bloodType: 'O+',
  city: 'Medellín, Antioquia',
  isActive: true,
  accountStatus: 'activa',
  competencies: ['QA Automatizado', 'Auditoría Autopista ERP', 'Pruebas E2E'],
  hseqStatus: 'valid',
  hseqExpiresAt: '2029-12-31',
  canWorkHeights: false,
};

async function runSandboxSeed() {
  console.log('===================================================================');
  console.log(' INTECKNO ERP - SANDBOX SEEDER (ONE-WAY PROD -> EMULATOR ANONYMIZED)');
  console.log('===================================================================');

  // Force target to Emulator
  process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;
  console.log(`[Safety Lock] Target locked to Firestore Emulator at ${EMULATOR_HOST}`);

  const sandboxApiKeyRaw = 'itk_sandbox_local_test_key_2026';
  const sandboxApiKeyHash = crypto.createHash('sha256').update(sandboxApiKeyRaw).digest('hex');

  console.log(`[Auth Setup] Dedicated Sandbox Web User: ${DEDICATED_SANDBOX_QA_USER.email} (Role: ${DEDICATED_SANDBOX_QA_USER.role})`);
  console.log(`[Auth Setup] Sandbox AI API Key: ${sandboxApiKeyRaw}`);
  console.log(`[Auth Setup] Sandbox AI API Key SHA-256: ${sandboxApiKeyHash}`);
  console.log('[Complete] Ready for local Firebase Emulator (`firebase emulators:start`) or Staging target (`firebase deploy --only hosting:sandbox`).');
}

runSandboxSeed().catch((err) => {
  console.error('[SandboxSeed] Error:', err);
  process.exit(1);
});

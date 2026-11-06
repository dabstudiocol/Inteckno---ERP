#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const base = 'https://us-central1-inteckno-erp.cloudfunctions.net/aiApi/api/v1/ai';
const key = 'Inteckno_Master_2026_Segura!';

async function get(p) {
  const url = `${base}${p}${p.includes('?') ? '&' : '?'}apiKey=${key}`;
  const res = await fetch(url);
  return res.json();
}

async function run() {
  const snapshot = {
    generatedAt: new Date().toISOString(),
    status: await get('/status'),
    schema: await get('/schema'),
    diagnostics: await get('/diagnostics'),
    summary: await get('/summary'),
    projects: await get('/data/projects?limit=100'),
    users: await get('/data/users?limit=100'),
    employees: await get('/data/employees?limit=100'),
    careerProfiles: await get('/data/careerProfiles?limit=100'),
    competenciesCatalog: await get('/data/competenciesCatalog?limit=100'),
    jobPositions: await get('/data/jobPositions?limit=100'),
    hseqAlerts: await get('/data/hseqAlerts?limit=100'),
    retentionFunds: await get('/data/retentionFunds?limit=100'),
    mrpDrafts: await get('/data/mrpDrafts?limit=100'),
    equipment: await get('/data/equipment?limit=100'),
    remissions: await get('/data/remissions?limit=100'),
    opportunities: await get('/data/opportunities?limit=100'),
    contacts: await get('/data/contacts?limit=100'),
    purchaseOrders: await get('/data/purchaseOrders?limit=100'),
    requisitions: await get('/data/requisitions?limit=100'),
    productsSample: await get('/data/products?limit=30'),
  };

  const outPath = path.resolve(__dirname, '../INTECKNO_ERP_RADIOGRAFIA_VIVA.json');
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`✅ Archivo generado en: ${outPath}`);
}

run();

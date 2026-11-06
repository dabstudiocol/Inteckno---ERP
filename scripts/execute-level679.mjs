import admin from '../functions/node_modules/firebase-admin/lib/index.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin (uses ADC or project default)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'inteckno-erp',
  });
}

const db = admin.firestore();

async function run() {
  console.log('🚀 Iniciando ejecución de Arquitectura Niveles 6, 7 y 9 en Google Cloud Firestore...');

  const now = new Date().toISOString();

  // 1. Obtener proyecto PRJ-1793367181536
  const projModuleRef = db.collection('erp_modules').doc('projects');
  const projSnap = await projModuleRef.get();
  const projData = projSnap.data() || {};
  const projects = Array.isArray(projData.projects) ? [...projData.projects] : [];

  const targetIdx = projects.findIndex(p => p.id === 'PRJ-1793367181536' || p.code === 'CODIGO PROYECTO PRUEBA');
  if (targetIdx === -1) {
    throw new Error('Proyecto PRJ-1793367181536 no encontrado en erp_modules/projects');
  }

  const prj = { ...projects[targetIdx] };
  const costMatrix = Array.isArray(prj.costMatrix) ? [...prj.costMatrix] : [];

  const dhCostItem = {
    id: 'cost-ts-TS-2026-DH01',
    itemCode: 'ITEM PRUEBA 1',
    itemName: 'DESCRIPTIVO PRUEBA',
    category: 'mano_obra_itk',
    costType: 'directo',
    concept: 'Mano de Obra ITK - David Hurtado (10h @ $27.505/h - Supervisión en Obra ITEM PRUEBA 1)',
    unit: 'Horas',
    plannedQuantity: 10,
    plannedUnitCost: 27505,
    plannedTotal: 275050,
    actualQuantity: 10,
    actualUnitCost: 27505,
    actualTotal: 275050,
    variance: 0,
    spendingNature: 'PRESUPUESTO',
    date: '2026-11-06',
    observations: 'Horas de nómina contabilizadas bajo Ley 2101 (factor 1.52 patronal / 210h divisor legal). Visto bueno supervisor Dairo Morales.',
    invoiceNumber: 'NOMI-2026-11-01',
    hasIva: false,
    ivaAmount: 0,
    retentionAmount: 0,
    splitPercentage: 100,
  };

  const existingCostIdx = costMatrix.findIndex(c => c.id === 'cost-ts-TS-2026-DH01');
  if (existingCostIdx >= 0) {
    costMatrix[existingCostIdx] = dhCostItem;
  } else {
    costMatrix.push(dhCostItem);
  }

  const totalActual = costMatrix.reduce((sum, item) => sum + (Number(item.actualTotal) || 0), 0);
  prj.costMatrix = costMatrix;
  prj.actualCostAC = totalActual; // 3,700,000 + 275,050 = 3,975,050 COP
  prj.computedEAC = totalActual;
  prj.computedMarginPct = Number((((Number(prj.contractAmount || 100000000) - totalActual) / Number(prj.contractAmount || 100000000)) * 100).toFixed(1));
  prj.lastUpdated = now;
  prj.updatedAt = now;

  projects[targetIdx] = prj;

  // 2. Timesheet de David Hurtado
  const dhTimesheet = {
    id: 'TS-2026-DH01',
    userId: 'USR-99',
    userName: 'David Hurtado Yepes',
    userRole: 'admin_sistemas',
    projectId: 'PRJ-1793367181536',
    projectCode: prj.code || 'CODIGO PROYECTO PRUEBA',
    projectName: prj.name || 'DESCRIPTIVO PRUEBA',
    itemCode: 'ITEM PRUEBA 1',
    taskName: 'Supervisión Técnica y Despliegue de Arquitectura en Obra',
    date: '2026-11-06',
    hours: 10,
    hourlyRateCOP: 27505,
    totalCostCOP: 275050,
    status: 'approved',
    approvedBy: 'USR-05',
    approvedByName: 'Dairo Antonio Morales Fuenmayor',
    approvedAt: now,
    supervisorNotes: 'Aprobación Maker-Checker completada conforme a Nivel 7 y Ley 2101.',
    geofenceVerified: true,
    geofenceDistanceMeters: 14.2,
    origin: 'talento_humano',
    createdAt: now,
  };

  // 3. Configuraciones de LOTO, Geocercas y Criptografía
  const lotoProtocolConfig = {
    enforceLotoHardStop: true,
    protocolVersion: '2026.1 - RETIE / OSHA 1910.147',
    checklist: [
      {
        id: 'LOTO-STEP-01',
        code: 'CORTE_TENSION',
        label: '1. Corte de Tensión Principal',
        description: 'Seccionador o disyuntor de potencia principal accionado a posición OFF / CERO y comprobada ausencia de arco.',
        required: true,
      },
      {
        id: 'LOTO-STEP-02',
        code: 'BLOQUEO_MECANICO',
        label: '2. Bloqueo Mecánico de Accionamiento',
        description: 'Traba física o perno pasador insertado en volante, polea motriz o tambor de cable para evitar movimiento inercial.',
        required: true,
      },
      {
        id: 'LOTO-STEP-03',
        code: 'CANDADO_TARJETA',
        label: '3. Instalación de Candado Físico y Tarjeta de Identificación',
        description: 'Candado de seguridad rojo Master Lock colocado con llave única y tarjeta rotulada con nombre del técnico y fecha.',
        required: true,
      },
      {
        id: 'LOTO-STEP-04',
        code: 'ENERGIA_CERO',
        label: '4. Verificación de Energía Cero (Voltímetro / Manómetro)',
        description: 'Comprobación instrumental con multímetro calibrado (< 5V AC/DC) y purga de circuitos hidráulicos/neumáticos residuales.',
        required: true,
      },
    ],
    mandatoryForStatuses: ['en_reparacion', 'pruebas_banco'],
    lastUpdated: now,
  };

  const cryptographicMilestonesConfig = {
    enabled: true,
    hashAlgorithm: 'SHA-256',
    mandatoryFields: ['milestoneId', 'projectId', 'signerUserId', 'timestampNTP', 'gpsCoordinates'],
    payloadStructure: {
      format: 'HEX_STRING_64_CHAR',
      salt: 'inteckno-cryptographic-hseq-2026',
    },
    lastUpdated: now,
  };

  const geofencesConfig = {
    enforceGeofence: true,
    maxAllowedRadiusMeters: 50,
    activeSites: [
      {
        id: 'STC-SITE-01',
        code: 'STC-EST-SAN-JAVIER',
        name: 'Estación San Javier - Sistema Teleférico',
        coordinates: { lat: 6.251842, lng: -75.612519 },
        radiusMeters: 50,
      },
      {
        id: 'STC-SITE-02',
        code: 'STC-PIL-04',
        name: 'Pilona 04 Tramo Línea J',
        coordinates: { lat: 6.25412, lng: -75.61488 },
        radiusMeters: 50,
      },
      {
        id: 'STC-SITE-PRJ',
        code: 'STC-PRJ-PRUEBA',
        name: 'Obra Principal PRJ-1793367181536 (Medellín)',
        coordinates: { lat: 6.20851, lng: -75.56782 },
        radiusMeters: 50,
      },
    ],
    makerCheckerWorkflow: {
      requireSupervisorApproval: true,
      authorizedSupervisors: ['USR-05', 'USR-07'],
      defaultSupervisorId: 'USR-05',
      supervisorName: 'Dairo Antonio Morales Fuenmayor',
      timesheetInitialStatus: 'pending_approval',
    },
    lastUpdated: now,
  };

  // Guardar en Firestore
  await Promise.all([
    projModuleRef.set({ projects, lastUpdated: now }, { merge: true }),
    db.collection('timesheets').doc('TS-2026-DH01').set(dhTimesheet, { merge: true }),
    db.collection('erp_modules').doc('hr').set({ timesheets: [dhTimesheet], lastUpdated: now }, { merge: true }),
    db.collection('erp_modules').doc('operations').set({ lotoProtocols: lotoProtocolConfig, geofences: geofencesConfig, lastUpdated: now }, { merge: true }),
    db.collection('erp_modules').doc('finances').set({ cryptographicAudit: cryptographicMilestonesConfig, lastUpdated: now }, { merge: true }),
  ]);

  console.log('✅ Firestore actualizado con éxito:');
  console.log(`   - PRJ-1793367181536 actualCostAC: $${prj.actualCostAC.toLocaleString('es-CO')} COP`);
  console.log(`   - 10h David Hurtado: $${dhTimesheet.totalCostCOP.toLocaleString('es-CO')} COP bajo ITEM PRUEBA 1`);
  console.log(`   - Protocolo LOTO: 4 pasos configurados`);
  console.log(`   - Geocercas: 50m y Maker-Checker Dairo Morales`);
  console.log(`   - Criptografía: SHA-256 en Hitos`);
}

run().catch((err) => {
  console.error('❌ Error ejecutando script:', err);
  process.exit(1);
});

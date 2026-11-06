#!/usr/bin/env node
/**
 * ============================================================================
 * INTECKNO ERP - CONECTOR DIRECTO CON GEMINI (FUNCTION CALLING EN VIVO)
 * ============================================================================
 * Este script conecta a Gemini directamente con la API de Inteckno ERP
 * (/api/v1/ai) usando las herramientas declaradas en:
 * functions/openapi/ai-tools-definitions.json
 *
 * Uso:
 *   $env:GEMINI_API_KEY="tu_clave_de_google_ai_studio"
 *   $env:INTECKNO_API_KEY="tu_clave_secreta_del_erp"
 *   npm run ai:gemini
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const INTECKNO_API_KEY = process.env.INTECKNO_API_KEY || 'Inteckno_Master_2026_Segura!';
const ERP_BASE_URL = (process.env.ERP_BASE_URL || 'https://us-central1-inteckno-erp.cloudfunctions.net/aiApi/api/v1/ai').replace(/\/$/, '');
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-flash-latest';

if (!GEMINI_API_KEY || !INTECKNO_API_KEY) {
  console.log('\n====================================================================');
  console.log('⚠️  FALTAN TUS CLAVES PARA INICIAR EL AGENTE GEMINI DE INTECKNO ERP');
  console.log('====================================================================');
  console.log('Por favor ejecuta estos dos comandos en tu terminal antes de iniciar:\n');
  console.log('  $env:GEMINI_API_KEY="pega_aqui_tu_clave_de_gemini"');
  console.log('  $env:INTECKNO_API_KEY="pega_aqui_tu_clave_del_erp"');
  console.log('  npm run ai:gemini\n');
  process.exit(1);
}

// Cargar las definiciones oficiales de herramientas para Gemini y el manual AI_ONBOARDING.md
const toolsPath = path.resolve(__dirname, '../functions/openapi/ai-tools-definitions.json');
const onboardingPath = path.resolve(__dirname, '../AI_ONBOARDING.md');

const toolsJson = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
const systemInstruction = fs.existsSync(onboardingPath)
  ? fs.readFileSync(onboardingPath, 'utf8')
  : 'Eres el Arquitecto y Auditor IA conectado en vivo a Inteckno ERP.';

const geminiTools = [{ functionDeclarations: toolsJson.gemini_function_declarations }];

/**
 * Ejecuta la herramienta que Gemini decidió invocar contra la API real de Inteckno ERP
 */
async function callIntecknoErpTool(name, args = {}) {
  console.log(`\n🔌 [Gemini -> Inteckno ERP] Ejecutando herramienta: ${name}`, JSON.stringify(args));

  let url = ERP_BASE_URL;
  let method = 'GET';
  let body = undefined;
  const headers = {
    'X-API-Key': INTECKNO_API_KEY,
    'Content-Type': 'application/json',
  };

  if (name === 'getErpStatus' || name === 'inteckno_get_status') {
    url = `${ERP_BASE_URL}/status`;
  } else if (name === 'getErpSchema' || name === 'inteckno_get_schema') {
    url = `${ERP_BASE_URL}/schema`;
  } else if (name === 'runErpDiagnostics' || name === 'inteckno_get_diagnostics') {
    url = `${ERP_BASE_URL}/diagnostics`;
  } else if (name === 'getErpSummary' || name === 'inteckno_get_summary') {
    const params = new URLSearchParams();
    if (args.projectCode) params.set('projectCode', args.projectCode);
    url = `${ERP_BASE_URL}/summary${params.toString() ? `?${params.toString()}` : ''}`;
  } else if (name === 'getErpModuleData' || name === 'inteckno_get_module_data') {
    const mod = encodeURIComponent(args.module || 'projects');
    const params = new URLSearchParams();
    if (args.fields) params.set('fields', args.fields);
    if (args.filter) params.set('filter', args.filter);
    if (args.limit) params.set('limit', String(args.limit));
    if (args.cursor) params.set('cursor', args.cursor);
    url = `${ERP_BASE_URL}/data/${mod}${params.toString() ? `?${params.toString()}` : ''}`;
  } else if (name === 'executeErpAction' || name === 'inteckno_execute_action') {
    url = `${ERP_BASE_URL}/action`;
    method = 'POST';
    headers['Idempotency-Key'] = args.idempotencyKey || `gemini-${Date.now()}`;
    body = JSON.stringify({
      action: args.action,
      reason: args.reason || 'Acción solicitada desde sesión interactiva Gemini',
      payload: args.payload || {},
    });
  } else {
    return { error: `Herramienta desconocida: ${name}` };
  }

  try {
    const response = await fetch(url, { method, headers, body });
    const data = await response.json();
    return data;
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * Envía el historial de conversación a Gemini API y resuelve automáticamente las llamadas a herramientas
 */
async function sendToGemini(contents) {
  const modelsToTry = [
    GEMINI_MODEL,
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-flash-lite-latest',
  ];

  while (true) {
    let data = null;
    let lastError = '';

    for (const modelName of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          tools: geminiTools,
        }),
      });

      if (res.ok) {
        data = await res.json();
        break;
      }

      lastError = `(${res.status}) ${await res.text()}`;
      if (res.status !== 503 && res.status !== 429 && res.status !== 404) {
        throw new Error(`Error de Gemini API ${lastError}`);
      }
    }

    if (!data) {
      throw new Error(`Error de Gemini API tras reintentar modelos: ${lastError}`);
    }
    const candidate = data.candidates?.[0];
    const modelContent = candidate?.content;
    if (!modelContent) return 'Sin respuesta del modelo.';

    contents.push(modelContent);

    // Revisar si Gemini pidió llamar una o más herramientas del ERP
    const functionCalls = (modelContent.parts || []).filter((p) => p.functionCall);
    if (functionCalls.length === 0) {
      const textParts = (modelContent.parts || [])
        .map((p) => p.text)
        .filter(Boolean)
        .join('\n');
      return textParts;
    }

    // Ejecutar todas las herramientas solicitadas por Gemini y devolverle los resultados
    const functionResponseParts = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      const result = await callIntecknoErpTool(name, args);
      functionResponseParts.push({
        functionResponse: {
          name,
          response: { result },
        },
      });
    }

    contents.push({
      role: 'user',
      parts: functionResponseParts,
    });
  }
}

async function main() {
  const cliPrompt = process.argv.slice(2).join(' ').trim();
  if (cliPrompt) {
    const history = [{ role: 'user', parts: [{ text: cliPrompt }] }];
    const reply = await sendToGemini(history);
    console.log(`\n🤖 Gemini:\n${reply}`);
    return;
  }

  console.log('\n====================================================================');
  console.log('🤖 AGENTE GEMINI CONECTADO EN VIVO A INTECKNO ERP');
  console.log(`🌐 Endpoint ERP : ${ERP_BASE_URL}`);
  console.log(`🧠 Modelo Gemini: ${GEMINI_MODEL}`);
  console.log('====================================================================');
  console.log('Ejemplos de lo que puedes pedirle:');
  console.log('  - "Revisa el estado del ERP y dime cuántos registros hay en cada módulo"');
  console.log('  - "Corre el diagnóstico de integridad y dime qué fallos encontraste"');
  console.log('  - "Muéstrame todos los proyectos y revisa por qué no salen los ITEMs"');
  console.log('Escribe "salir" para terminar.\n');

  const history = [];
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question('\n👤 Tú: ', async (input) => {
      const trimmed = input.trim();
      if (!trimmed) return askQuestion();
      if (trimmed.toLowerCase() === 'salir' || trimmed.toLowerCase() === 'exit') {
        rl.close();
        process.exit(0);
      }

      history.push({ role: 'user', parts: [{ text: trimmed }] });
      try {
        const reply = await sendToGemini(history);
        console.log(`\n🤖 Gemini:\n${reply}`);
      } catch (err) {
        console.error('\n❌ Error:', err.message);
      }
      askQuestion();
    });
  };

  askQuestion();
}

main();

import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import express from 'express';
import cors from 'cors';
import { aiRouter } from './routes/aiRoutes';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const app = express();

// Strict payload size limit (256kb) to prevent DoS
app.use(express.json({ limit: '256kb' }));

// Restricted CORS for authorized origins & AI agent gateways
const ALLOWED_ORIGINS = [
  'https://inteckno.web.app',
  'https://inteckno-erp.web.app',
  'https://inteckno-sandbox.web.app',
  'http://localhost:5173',
  'http://localhost:5000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server AI tool calls (no browser Origin header) or whitelisted web origins
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS origin not allowed by Inteckno ERP Security Policy'));
      }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'Idempotency-Key'],
  })
);

// Mount AI Gateway under both `/api/v1/ai` (via Hosting rewrite) and `/` (direct function invocation)
app.use('/api/v1/ai', aiRouter);
app.use('/', aiRouter);

/**
 * Cloud Functions 2nd Gen HTTP Endpoint
 * Bound to Secret Manager secrets `INTECKNO_AI_MASTER_KEY` and `INTECKNO_AI_KEYS_JSON`
 */
export const aiApi = onRequest(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 10,
    secrets: ['INTECKNO_AI_MASTER_KEY', 'INTECKNO_AI_KEYS_JSON'],
  },
  app
);

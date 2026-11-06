import * as admin from 'firebase-admin';
import { ValidatedAiContext } from '../middleware/security';

export interface AiAuditRecord {
  id: string;
  timestamp: string;
  keyId: string;
  keyHashPrefix: string;
  environment: 'prod' | 'sandbox';
  clientIp: string;
  method: string;
  path: string;
  action?: string;
  idempotencyKey?: string;
  statusCode: number;
  backupId?: string;
  summary: string;
}

/**
 * Records an immutable audit entry in `ai_audit_log` (blocked from web clients in firestore.rules)
 */
export async function recordAiAuditLog(params: {
  ctx: ValidatedAiContext;
  method: string;
  path: string;
  statusCode: number;
  action?: string;
  idempotencyKey?: string;
  backupId?: string;
  summary: string;
}): Promise<void> {
  try {
    const db = admin.firestore();
    const id = `AIAUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const entry: AiAuditRecord = {
      id,
      timestamp: new Date().toISOString(),
      keyId: params.ctx.keyId,
      keyHashPrefix: params.ctx.keyHash,
      environment: params.ctx.environment,
      clientIp: params.ctx.clientIp,
      method: params.method,
      path: params.path,
      action: params.action,
      idempotencyKey: params.idempotencyKey,
      statusCode: params.statusCode,
      backupId: params.backupId,
      summary: params.summary,
    };
    await db.collection('ai_audit_log').doc(id).set(JSON.parse(JSON.stringify(entry)));
  } catch (err) {
    console.warn('[AiAuditLog] Failed to write audit entry:', err);
  }
}

/**
 * Rule 14: Continuous Automated Backup (`erp_backups`) BEFORE any write in prod
 */
export async function createPreWriteBackup(params: {
  moduleOrCollection: string;
  action: string;
  previousState: any;
  ctx: ValidatedAiContext;
}): Promise<string> {
  const db = admin.firestore();
  const backupId = `BKP-AI-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  await db.collection('erp_backups').doc(backupId).set({
    id: backupId,
    createdAt: new Date().toISOString(),
    trigger: 'ai_api_pre_write',
    keyId: params.ctx.keyId,
    environment: params.ctx.environment,
    moduleOrCollection: params.moduleOrCollection,
    action: params.action,
    snapshot: JSON.parse(JSON.stringify(params.previousState ?? {})),
  });
  return backupId;
}

/**
 * Checks and stores Idempotency-Key in `ai_idempotency_keys/{key}` to prevent duplicate mutations
 */
export async function checkIdempotencyKey(
  idempotencyKey: string | undefined,
  keyId: string
): Promise<{ hit: boolean; cachedResponse?: any }> {
  if (!idempotencyKey || !idempotencyKey.trim()) {
    return { hit: false };
  }
  const db = admin.firestore();
  const docId = `${keyId}_${idempotencyKey.trim().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const snap = await db.collection('ai_idempotency_keys').doc(docId).get();
  if (snap.exists) {
    const data = snap.data()!;
    return { hit: true, cachedResponse: data.responsePayload };
  }
  return { hit: false };
}

export async function saveIdempotencyKey(
  idempotencyKey: string | undefined,
  keyId: string,
  responsePayload: any
): Promise<void> {
  if (!idempotencyKey || !idempotencyKey.trim()) return;
  const db = admin.firestore();
  const docId = `${keyId}_${idempotencyKey.trim().replace(/[^a-zA-Z0-9_-]/g, '')}`;
  await db.collection('ai_idempotency_keys').doc(docId).set({
    id: docId,
    keyId,
    createdAt: new Date().toISOString(),
    responsePayload: JSON.parse(JSON.stringify(responsePayload)),
  });
}

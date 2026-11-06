"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordAiAuditLog = recordAiAuditLog;
exports.createPreWriteBackup = createPreWriteBackup;
exports.checkIdempotencyKey = checkIdempotencyKey;
exports.saveIdempotencyKey = saveIdempotencyKey;
const admin = __importStar(require("firebase-admin"));
/**
 * Records an immutable audit entry in `ai_audit_log` (blocked from web clients in firestore.rules)
 */
async function recordAiAuditLog(params) {
    try {
        const db = admin.firestore();
        const id = `AIAUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const entry = {
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
    }
    catch (err) {
        console.warn('[AiAuditLog] Failed to write audit entry:', err);
    }
}
/**
 * Rule 14: Continuous Automated Backup (`erp_backups`) BEFORE any write in prod
 */
async function createPreWriteBackup(params) {
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
async function checkIdempotencyKey(idempotencyKey, keyId) {
    if (!idempotencyKey || !idempotencyKey.trim()) {
        return { hit: false };
    }
    const db = admin.firestore();
    const docId = `${keyId}_${idempotencyKey.trim().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const snap = await db.collection('ai_idempotency_keys').doc(docId).get();
    if (snap.exists) {
        const data = snap.data();
        return { hit: true, cachedResponse: data.responsePayload };
    }
    return { hit: false };
}
async function saveIdempotencyKey(idempotencyKey, keyId, responsePayload) {
    if (!idempotencyKey || !idempotencyKey.trim())
        return;
    const db = admin.firestore();
    const docId = `${keyId}_${idempotencyKey.trim().replace(/[^a-zA-Z0-9_-]/g, '')}`;
    await db.collection('ai_idempotency_keys').doc(docId).set({
        id: docId,
        keyId,
        createdAt: new Date().toISOString(),
        responsePayload: JSON.parse(JSON.stringify(responsePayload)),
    });
}
//# sourceMappingURL=auditAndBackupService.js.map
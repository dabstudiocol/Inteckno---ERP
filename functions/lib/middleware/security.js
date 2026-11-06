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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256Hex = sha256Hex;
exports.getRuntimeEnvironment = getRuntimeEnvironment;
exports.rateLimitMiddleware = rateLimitMiddleware;
exports.authenticateAiKey = authenticateAiKey;
exports.requireScope = requireScope;
const crypto_1 = __importDefault(require("crypto"));
const admin = __importStar(require("firebase-admin"));
/**
 * Constant-time string comparison using crypto.timingSafeEqual
 */
function safeCompare(a, b) {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) {
        // Compare against itself to keep constant timing before returning false
        crypto_1.default.timingSafeEqual(bufA, bufA);
        return false;
    }
    return crypto_1.default.timingSafeEqual(bufA, bufB);
}
function sha256Hex(raw) {
    return crypto_1.default.createHash('sha256').update(raw, 'utf8').digest('hex');
}
/**
 * Determines if current execution is sandbox (emulator or staging) vs prod
 */
function getRuntimeEnvironment() {
    if (process.env.FUNCTIONS_EMULATOR === 'true' ||
        process.env.FIRESTORE_EMULATOR_HOST ||
        process.env.INTECKNO_ENV === 'sandbox') {
        return 'sandbox';
    }
    return 'prod';
}
/**
 * In-memory sliding window Rate Limiter (per API key hash + IP)
 * Default: 60 requests per 60 seconds
 */
const rateBuckets = new Map();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQ = 60;
function rateLimitMiddleware(req, res, next) {
    const rawKey = req.header('X-API-Key') || 'anon';
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    const bucketKey = `${sha256Hex(rawKey).slice(0, 16)}:${ip}`;
    const now = Date.now();
    const entry = rateBuckets.get(bucketKey);
    if (!entry || now >= entry.resetAt) {
        rateBuckets.set(bucketKey, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQ));
        res.setHeader('X-RateLimit-Remaining', String(RATE_LIMIT_MAX_REQ - 1));
        next();
        return;
    }
    if (entry.count >= RATE_LIMIT_MAX_REQ) {
        const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({
            error: 'TOO_MANY_REQUESTS',
            message: `Rate limit exceeded (${RATE_LIMIT_MAX_REQ} req/min). Retry after ${retryAfterSec}s.`,
            retryAfterSeconds: retryAfterSec,
        });
        return;
    }
    entry.count += 1;
    res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQ));
    res.setHeader('X-RateLimit-Remaining', String(RATE_LIMIT_MAX_REQ - entry.count));
    next();
}
/**
 * Validates X-API-Key against:
 * 1) Secret Manager JSON config `INTECKNO_AI_KEYS_JSON` (format: [{"id":"k1","hash":"<sha256>","scopes":["read","write_prod_safe"],"revoked":false}])
 *    or raw fallback secret `INTECKNO_AI_MASTER_KEY`
 * 2) Firestore `ai_api_keys/{keyHash}` collection (supports instant rotation/revocation without redeploying)
 */
async function authenticateAiKey(req, res, next) {
    const queryKey = typeof req.query.apiKey === 'string' ? req.query.apiKey : (typeof req.query.key === 'string' ? req.query.key : undefined);
    const rawKey = req.header('X-API-Key') || queryKey;
    if (!rawKey || rawKey.trim().length < 16) {
        res.status(401).json({
            error: 'UNAUTHORIZED',
            message: 'Missing or malformed X-API-Key header or ?apiKey= parameter.',
        });
        return;
    }
    const incomingHash = sha256Hex(rawKey.trim());
    const env = getRuntimeEnvironment();
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
    try {
        let matchedKey = null;
        // 1. Check Secret Manager JSON list if configured
        const secretsJson = process.env.INTECKNO_AI_KEYS_JSON;
        if (secretsJson) {
            try {
                const parsed = JSON.parse(secretsJson);
                for (const candidate of parsed) {
                    if (candidate.hash && safeCompare(candidate.hash.toLowerCase(), incomingHash.toLowerCase())) {
                        matchedKey = candidate;
                        break;
                    }
                }
            }
            catch {
                // Ignore malformed JSON and continue to master key / Firestore check
            }
        }
        // 2. Check Master Key from Secret Manager (`INTECKNO_AI_MASTER_KEY`)
        const masterSecret = process.env.INTECKNO_AI_MASTER_KEY;
        if (!matchedKey && masterSecret && masterSecret.length >= 16) {
            const masterHash = sha256Hex(masterSecret.trim());
            if (safeCompare(masterHash, incomingHash)) {
                matchedKey = {
                    id: 'master-secret-key',
                    scopes: ['read', 'write_sandbox', 'write_prod_safe', 'pii'],
                    revoked: false,
                };
            }
        }
        // 3. Check Firestore `ai_api_keys/{incomingHash}` for rotatable/revocable keys
        const db = admin.firestore();
        const keyDoc = await db.collection('ai_api_keys').doc(incomingHash).get();
        if (keyDoc.exists) {
            const data = keyDoc.data();
            if (data.revoked === true) {
                res.status(403).json({
                    error: 'FORBIDDEN_KEY_REVOKED',
                    message: 'This API Key has been revoked.',
                });
                return;
            }
            if (data.keyHash && safeCompare(String(data.keyHash), incomingHash)) {
                matchedKey = {
                    id: data.id || keyDoc.id.slice(0, 12),
                    scopes: Array.isArray(data.scopes) ? data.scopes : ['read'],
                    revoked: Boolean(data.revoked),
                };
            }
        }
        // 4. Local Emulator Sandbox default key support (only when running in local emulator)
        if (!matchedKey && env === 'sandbox' && process.env.FUNCTIONS_EMULATOR === 'true') {
            const sandboxDefaultHash = sha256Hex('itk_sandbox_local_test_key_2026');
            if (safeCompare(sandboxDefaultHash, incomingHash)) {
                matchedKey = {
                    id: 'local-emulator-sandbox-key',
                    scopes: ['read', 'write_sandbox', 'pii'],
                    revoked: false,
                };
            }
        }
        if (!matchedKey) {
            res.status(401).json({
                error: 'UNAUTHORIZED',
                message: 'Invalid X-API-Key.',
            });
            return;
        }
        if (matchedKey.revoked) {
            res.status(403).json({
                error: 'FORBIDDEN',
                message: 'API Key is revoked.',
            });
            return;
        }
        req.aiContext = {
            keyId: matchedKey.id,
            keyHash: incomingHash.slice(0, 16),
            scopes: matchedKey.scopes,
            environment: env,
            clientIp,
        };
        next();
    }
    catch (err) {
        res.status(500).json({
            error: 'AUTH_INTERNAL_ERROR',
            message: err?.message || 'Authentication verification failed',
        });
    }
}
/**
 * Scope Guard Middleware
 */
function requireScope(required) {
    return (req, res, next) => {
        const ctx = req.aiContext;
        if (!ctx) {
            res.status(401).json({ error: 'UNAUTHORIZED', message: 'No authenticated AI context.' });
            return;
        }
        if (!ctx.scopes.includes(required)) {
            res.status(403).json({
                error: 'FORBIDDEN_INSUFFICIENT_SCOPE',
                message: `This endpoint requires scope '${required}'. Active scopes: [${ctx.scopes.join(', ')}]`,
            });
            return;
        }
        next();
    };
}
//# sourceMappingURL=security.js.map
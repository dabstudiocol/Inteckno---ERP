import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';

export type ApiKeyScope = 'read' | 'write_sandbox' | 'write_prod_safe' | 'pii';

export interface ValidatedAiContext {
  keyId: string;
  keyHash: string;
  scopes: ApiKeyScope[];
  environment: 'prod' | 'sandbox';
  clientIp: string;
}

declare global {
  namespace Express {
    interface Request {
      aiContext?: ValidatedAiContext;
    }
  }
}

/**
 * Constant-time string comparison using crypto.timingSafeEqual
 */
function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) {
    // Compare against itself to keep constant timing before returning false
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function sha256Hex(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

/**
 * Determines if current execution is sandbox (emulator or staging) vs prod
 */
export function getRuntimeEnvironment(): 'prod' | 'sandbox' {
  if (
    process.env.FUNCTIONS_EMULATOR === 'true' ||
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.INTECKNO_ENV === 'sandbox'
  ) {
    return 'sandbox';
  }
  return 'prod';
}

/**
 * In-memory sliding window Rate Limiter (per API key hash + IP)
 * Default: 60 requests per 60 seconds
 */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQ = 60;

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const rawKey = req.header('X-API-Key') || 'anon';
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
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
export async function authenticateAiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
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
  const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';

  try {
    let matchedKey: { id: string; scopes: ApiKeyScope[]; revoked?: boolean } | null = null;

    // 1. Check Secret Manager JSON list if configured
    const secretsJson = process.env.INTECKNO_AI_KEYS_JSON;
    if (secretsJson) {
      try {
        const parsed = JSON.parse(secretsJson) as Array<{
          id: string;
          hash: string;
          scopes: ApiKeyScope[];
          revoked?: boolean;
        }>;
        for (const candidate of parsed) {
          if (candidate.hash && safeCompare(candidate.hash.toLowerCase(), incomingHash.toLowerCase())) {
            matchedKey = candidate;
            break;
          }
        }
      } catch {
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
      const data = keyDoc.data()!;
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
  } catch (err: any) {
    res.status(500).json({
      error: 'AUTH_INTERNAL_ERROR',
      message: err?.message || 'Authentication verification failed',
    });
  }
}

/**
 * Scope Guard Middleware
 */
export function requireScope(required: ApiKeyScope) {
  return (req: Request, res: Response, next: NextFunction): void => {
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

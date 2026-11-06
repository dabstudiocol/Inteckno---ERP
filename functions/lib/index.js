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
exports.aiApi = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const aiRoutes_1 = require("./routes/aiRoutes");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
const app = (0, express_1.default)();
// Strict payload size limit (256kb) to prevent DoS
app.use(express_1.default.json({ limit: '256kb' }));
// Restricted CORS for authorized origins & AI agent gateways
const ALLOWED_ORIGINS = [
    'https://inteckno.web.app',
    'https://inteckno-erp.web.app',
    'https://inteckno-sandbox.web.app',
    'http://localhost:5173',
    'http://localhost:5000',
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow server-to-server AI tool calls (no browser Origin header) or whitelisted web origins
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('CORS origin not allowed by Inteckno ERP Security Policy'));
        }
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'Idempotency-Key'],
}));
// Mount AI Gateway under both `/api/v1/ai` (via Hosting rewrite) and `/` (direct function invocation)
app.use('/api/v1/ai', aiRoutes_1.aiRouter);
app.use('/', aiRoutes_1.aiRouter);
/**
 * Cloud Functions 2nd Gen HTTP Endpoint
 * Bound to Secret Manager secrets `INTECKNO_AI_MASTER_KEY` and `INTECKNO_AI_KEYS_JSON`
 */
exports.aiApi = (0, https_1.onRequest)({
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 10,
    secrets: ['INTECKNO_AI_MASTER_KEY', 'INTECKNO_AI_KEYS_JSON'],
}, app);
//# sourceMappingURL=index.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiRouter = void 0;
const express_1 = require("express");
const security_1 = require("../middleware/security");
const aiController_1 = require("../controllers/aiController");
exports.aiRouter = (0, express_1.Router)();
// Apply Rate Limiting and Constant-Time X-API-Key Authentication to all routes
exports.aiRouter.use(security_1.rateLimitMiddleware);
exports.aiRouter.use(security_1.authenticateAiKey);
// Read endpoints (require 'read' scope)
exports.aiRouter.get('/status', (0, security_1.requireScope)('read'), aiController_1.getStatusController);
exports.aiRouter.get('/schema', (0, security_1.requireScope)('read'), aiController_1.getSchemaController);
exports.aiRouter.get('/data/:module', (0, security_1.requireScope)('read'), aiController_1.getModuleDataController);
exports.aiRouter.get('/summary', (0, security_1.requireScope)('read'), aiController_1.getSummaryController);
exports.aiRouter.get('/diagnostics', (0, security_1.requireScope)('read'), aiController_1.getDiagnosticsController);
// Write / Action endpoint (validates write_sandbox or write_prod_safe inside controller)
exports.aiRouter.post('/action', aiController_1.postActionController);
//# sourceMappingURL=aiRoutes.js.map
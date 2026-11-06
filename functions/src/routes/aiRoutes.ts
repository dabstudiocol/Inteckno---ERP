import { Router } from 'express';
import {
  authenticateAiKey,
  rateLimitMiddleware,
  requireScope,
} from '../middleware/security';
import {
  getDiagnosticsController,
  getModuleDataController,
  getSchemaController,
  getStatusController,
  getSummaryController,
  postActionController,
} from '../controllers/aiController';

export const aiRouter = Router();

// Apply Rate Limiting and Constant-Time X-API-Key Authentication to all routes
aiRouter.use(rateLimitMiddleware);
aiRouter.use(authenticateAiKey);

// Read endpoints (require 'read' scope)
aiRouter.get('/status', requireScope('read'), getStatusController);
aiRouter.get('/schema', requireScope('read'), getSchemaController);
aiRouter.get('/data/:module', requireScope('read'), getModuleDataController);
aiRouter.get('/summary', requireScope('read'), getSummaryController);
aiRouter.get('/diagnostics', requireScope('read'), getDiagnosticsController);

// Write / Action endpoint (validates write_sandbox or write_prod_safe inside controller)
aiRouter.post('/action', postActionController);

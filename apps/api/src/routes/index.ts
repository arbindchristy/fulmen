import { Router } from 'express';

import type { AuditService } from '@fulmen/audit';
import type { GuardAgent } from '@fulmen/guard-agent';
import type { Orchestrator } from '@fulmen/orchestrator';

import { createAuditRouter } from '../audit/audit-router.js';

interface RouteDependencies {
  auditService: AuditService;
  guardAgent: GuardAgent;
  orchestrator: Orchestrator;
}

export function createRoutes(dependencies: RouteDependencies): Router {
  const router = Router();

  router.get('/api/v1/system/summary', (_request, response) => {
    response.json({
      mode: 'governed-preview',
      services: {
        audit: typeof dependencies.auditService.record === 'function',
        guardAgent:
          typeof dependencies.guardAgent.validateStructuredPlan === 'function',
        orchestrator: typeof dependencies.orchestrator.preview === 'function',
      },
    });
  });

  router.use(createAuditRouter());

  return router;
}

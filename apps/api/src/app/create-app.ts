import express from 'express';
import { ZodError } from 'zod';

import { createAuditService, LocalEvidenceStore } from '@fulmen/audit';
import { createGuardAgent } from '@fulmen/guard-agent';
import { createDefaultOrchestrator } from '@fulmen/orchestrator';
import { createPolicyDecisionService } from '@fulmen/policy-engine';

import { createDevAuthMiddleware } from '../auth/dev-auth.js';
import { PostgresAuditEventStore } from '../audit/postgres-audit-event-store.js';
import { createChangeRequestsRouter } from '../change-requests/change-requests-router.js';
import { PostgresChangeRequestRepository } from '../change-requests/change-request-repository.js';
import { createChangeRequestService } from '../change-requests/change-request-service.js';
import type { AppEnv } from '../config/env.js';
import { createDatabasePool } from '../db/client.js';
import { createHealthRouter } from '../health/health-router.js';
import { createRoutes } from '../routes/index.js';
import { createLocalDevCorsMiddleware } from './local-dev-cors.js';

export function createApp(env: AppEnv) {
  const app = express();
  const pool = createDatabasePool(env.databaseUrl);
  const auditService = createAuditService(new PostgresAuditEventStore(pool));
  const guardAgent = createGuardAgent();
  const policyDecisionService = createPolicyDecisionService();
  const changeRequestRepository = new PostgresChangeRequestRepository(pool);

  const evidenceStore = new LocalEvidenceStore({
    rootPath: env.evidenceDir,
  });

  const orchestrator = createDefaultOrchestrator({
    auditService,
    guardAgent,
    policyDecisionService,
  });
  const changeRequestService = createChangeRequestService({
    auditService,
    changeRequestRepository,
    orchestrator,
  });

  app.disable('x-powered-by');
  app.use(express.json());

  if (env.environment === 'development') {
    app.use(createLocalDevCorsMiddleware(env.webOrigin));
  }

  app.use(
    createDevAuthMiddleware({
      role: env.defaultRole,
      tenantId: env.defaultTenantId,
      userId: env.defaultUserId,
    }),
  );

  app.use(createHealthRouter(env));
  app.use(
    createRoutes({
      auditService,
      guardAgent,
      orchestrator,
    }),
  );
  app.use(createChangeRequestsRouter(changeRequestService));

  app.get('/', (_request, response) => {
    response.json({
      name: 'fulmen-api',
      status: 'bootstrapped',
      evidenceRoot: evidenceStore.getRootPath(),
    });
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, next: express.NextFunction) => {
    void next;

    if (error instanceof ZodError) {
      response.status(400).json({
        message: 'Request validation failed.',
        issues: error.issues,
      });

      return;
    }

    console.error(error);
    response.status(500).json({
      message: 'Internal server error.',
    });
  });

  return app;
}
